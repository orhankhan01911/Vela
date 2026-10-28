import type { Drawing, Projector, DrawingStyle, Box, TrendLine, TextLabel, Ellipse } from '../../../core/drawings';
import { SegmentDrawing, FibRatios, RadialFib, FibSpiral, GannSquare, GANN_SQUARE_ARCS, DedekindTessellation, MachFigure, MeasureBox, PositionTool, PatternDrawing, CalloutBase, Callout, Comment, PriceNote, Signpost, SIGNPOST_R, Note, NOTE_PIN, PriceLabel, ArrowMark, GlyphStamp, RegressionChannel, AnchoredVwap, FixedRangeVolumeProfile, FixedRangeTpoProfile, tpoLetter, PriceAlert, ALERT_STUB_PX, Magnifier, magnifierTimeframeLabel, lineSegmentIntersection, effectiveFillColor, VALID_FILL, INVALID_FILL, DEFAULT_DRAWING_COLOR, shownOnBarMs, statsOf, anyStats, lineStatsRows, Forecast, BarsPattern, GhostFeed, TableDrawing, ImageDrawing, XPostDrawing, safeRelayPath } from '../../../core/drawings';
import type { VelaTheme } from '../../../core/options';
import { contrastColor, dashPattern, extendEndpoints, namedFontSize, labelLineHeight, TEXT_FRAME_INSET, TEXT_FRAME_RISE, uprightLineAngle } from '../../shared/drawing-geometry';
import { BEARISH, BULLISH, NEUTRAL, SLATE, SLATE_DEEP, XPOST_DARK, XPOST_LIGHT } from '../../../core/palette';
import { withAlpha } from '../../../core/color';
import { barTransformFor } from '../../../core/price-styles/BarTransform';
import type { OHLCV } from '../../../core/model/ohlcv';
import { valueDecimals, formatTimeStamp } from '../chrome/ticks';
import { layoutAxisChips } from './axis-chips';

const HANDLE_RADIUS = 4.5; // px radius of the round drag handles
/** Handle chrome is fixed (not the drawing's line color) so tools with atypical accents —
 *  e.g. regression gray / FRVP green — still match every other drawing's anchors. */
const HANDLE_BORDER = DEFAULT_DRAWING_COLOR;
const HANDLE_FILL = withAlpha(NEUTRAL, 0.55);
const GHOST_ALPHA = 0.7;
/** Price-chip text size without a renderer (`axisLabel` null): the chart's default axis size. */
const AXIS_CHIP_FONT_PX = 12;
/** Info badges (regression R², measure deltas) float over CHART CONTENT of any color, so
 *  they keep a fixed dark plate instead of a themed surface. */
const BADGE_FILL = SLATE_DEEP;
const BADGE_STROKE = SLATE;
/** The frame a text label wears when it's the target: firm once clicked, a hint under the cursor.
 *  (Its box is the shared TEXT_FRAME inset/rise, so it coincides with the inline editor's border.) */
const TEXT_FRAME_ALPHA = { selected: 0.3, hovered: 0.12 };
/** Tools whose text can sit ON the line (vertical "middle"); the line breaks around it there. */
const ON_LINE_LABEL_TYPES: ReadonlySet<string> = new Set(['hline', 'hray', 'trendline', 'ray', 'extendedline', 'infoline', 'trendangle', 'arrow']);
/** Clear space between on-line text and where its line resumes, each side (TradingView's ~4 px). */
const LABEL_GAP_PX = 4;

function labelFont(text: NonNullable<Drawing['text']>, fs: number, theme: VelaTheme): string {
    return `${text.bold ? 'bold ' : ''}${text.italic ? 'italic ' : ''}${fs}px ${theme.fontFamily}`;
}

/**
 * Paints user drawings onto the L1.5 canvas. The caller has already applied the DPR
 * transform + cleared, so everything here is in media px. Dispatches by `type`;
 * geometry comes from each drawing's pure `handlePoints`/anchors via the
 * {@link Projector}. Strokes/fonts reuse the shared Pine-drawing helpers so user
 * drawings match engine-drawn ones exactly.
 */
/** The frame's transient interaction state, as the painter needs it: handles show for the
 *  selected, dragged, and hovered drawings; a targeted text label wears its frame; a label owned
 *  by an open inline editor is left unpainted so the two don't draw on top of each other. */
export interface PaintTargets {
    selected?: ReadonlySet<string>;
    hovered?: string | null;
    dragged?: string | null;
    mutedLabel?: string | null;
}

/** The ids whose handles show for `targets`: selected ∪ dragged ∪ hovered, minus the muted
 *  label — while an inline editor owns the label the user is typing, not dragging, so the
 *  anchor grip on the editor's corner would read as a resize handle on a floating window. */
export function handleIdsFor(targets: PaintTargets): ReadonlySet<string> {
    const ids = new Set(targets.selected);
    if (targets.dragged) ids.add(targets.dragged);
    if (targets.hovered) ids.add(targets.hovered);
    if (targets.mutedLabel) ids.delete(targets.mutedLabel);
    return ids;
}

/** How far past the plot edge (into the price axis) a price-alert chip may paint. */
const ALERT_AXIS_OVERFLOW_PX = 120;

export class DrawingPainter {
    /** The current `paintAll` call's interaction state, visible to the per-type painters. */
    private targets: PaintTargets = {};

    /** The chart's active series LOOK — style + resolved series colors — pushed by the
     *  controller before each paint. The magnifier's inset mirrors both: candles/bars/line/
     *  area restyle the paint (bar-transform styles like Heikin Ashi transform the fetched
     *  bars; unknown/custom styles fall back to candles), and the colors default to the main
     *  series' own so the inset reads as a finer copy of the chart. */
    /** The chart's bar duration (ms): drawings limited to other timeframes (Visibility tab) are skipped. 0 = show all. */
    barMs = 0;
    /** Load image drawings from https links. Off by default: a drawing shared or pasted from someone else would make
     *  every viewer's browser fetch its link (a tracking pixel). Inline image data always shows. */
    allowRemoteImages = false;
    /** Called when an image drawing's picture finishes loading, so the layer repaints with it. */
    onAssetLoaded: (() => void) | null = null;
    private readonly images = new Map<string, { img: HTMLImageElement; state: 'loading' | 'ok' | 'error' }>();
    /** The chart's timezone (axis time labels read like the crosshair's time chip). */
    timeZone = 'UTC';
    seriesLook: { style: string; upColor: string; downColor: string; lineColor: string } = {
        style: 'candles',
        upColor: BULLISH,
        downColor: BEARISH,
        lineColor: BULLISH,
    };

    /** Price-scale chip centre per drawing id, set by {@link layoutAxisChips} before the top-canvas paint. */
    private axisChipY = new Map<string, number>();

    /** The renderer's price-axis formatter (text + font of the axis numbers on that pane); set by the controller
     *  before each paint. Null (no renderer): grouped magnitude decimals in the theme face. */
    axisLabel: ((paneId: string, price: number) => { text: string; font: string } | null) | null = null;

    /** Lay out the price-scale chips (alerts, horizontal-line prices) of every pane so none covers the
     *  current-price label (`priceBlock`, on its pane) or another chip. */
    layoutAxisChips(
        drawings: readonly Drawing[],
        proj: Projector,
        priceBlock: { paneId: string; price: number; above: number; below: number } | null,
    ): void {
        const byPane = new Map<string, Array<{ id: string; y: number }>>();
        for (const d of drawings) {
            if (!d.visible || !shownOnBarMs(d.intervals, this.barMs) || !(d instanceof PriceAlert || showsAxisPrice(d))) continue;
            const a = d.anchors[0];
            const y = a ? proj.yOf(a.price, d.paneId) : null;
            if (y == null) continue;
            const list = byPane.get(d.paneId);
            if (list) list.push({ id: d.id, y });
            else byPane.set(d.paneId, [{ id: d.id, y }]);
        }
        this.axisChipY = new Map();
        this.axisChipYsByPane = new Map();
        for (const [paneId, chips] of byPane) {
            const by = priceBlock && priceBlock.paneId === paneId ? proj.yOf(priceBlock.price, paneId) : null;
            const block = priceBlock && by != null ? { top: by - priceBlock.above, bottom: by + priceBlock.below } : null;
            const ys: number[] = [];
            for (const [id, y] of layoutAxisChips(chips, block)) {
                this.axisChipY.set(id, y);
                ys.push(y);
            }
            this.axisChipYsByPane.set(paneId, ys);
        }
    }

    /** Chip centres per pane from the last {@link layoutAxisChips}: the price axis skips the numbers under them. */
    private axisChipYsByPane = new Map<string, number[]>();
    get axisChipYs(): ReadonlyMap<string, readonly number[]> {
        return this.axisChipYsByPane;
    }

    /** Paint every visible drawing, then selection handles for the targeted ones.
     *  Each drawing is clipped to its own pane's rect (and skipped entirely while that pane
     *  is hidden — collapsed, or zeroed by another pane's maximize) so panes stay separated. */
    paintAll(
        ctx: CanvasRenderingContext2D,
        drawings: readonly Drawing[],
        proj: Projector,
        theme: VelaTheme,
        targets: PaintTargets = {},
    ): void {
        this.targets = targets;
        for (const d of drawings) {
            if (!d.visible || !shownOnBarMs(d.intervals, this.barMs)) continue;
            this.paintClipped(ctx, d, proj, () => this.paintOne(ctx, d, proj, theme));
        }
        this.targets = {};
        this.paintHighlights(ctx, drawings, proj, handleIdsFor(targets));
    }

    /** Selection handles alone, for drawings whose body was painted elsewhere: the ones sent
     *  behind the series paint on the layer under the data, and handles left down there would be
     *  buried under the candles — you could not see what you had grabbed. */
    paintHighlights(ctx: CanvasRenderingContext2D, drawings: readonly Drawing[], proj: Projector, highlightIds: ReadonlySet<string>): void {
        if (highlightIds.size === 0) return;
        for (const d of drawings) {
            if (d.visible && highlightIds.has(d.id)) {
                this.paintClipped(ctx, d, proj, () => this.paintHandles(ctx, d.handlePoints(proj)));
            }
        }
    }

    /** Run `paint` clipped to the drawing's pane rect; a hidden pane (height 0) paints nothing. */
    private paintClipped(ctx: CanvasRenderingContext2D, d: Drawing, proj: Projector, paint: () => void): void {
        if (!proj.paneRect) { paint(); return; } // projector exposes no pane geometry → unclipped
        const rect = proj.paneRect(d.paneId);
        if (!rect || rect.height <= 0) return; // pane gone or hidden → nothing to paint
        ctx.save();
        ctx.beginPath();
        // The alert marker's price chip sits on the axis strip, right of the plot edge.
        ctx.rect(0, rect.top, d instanceof PriceAlert ? proj.width + ALERT_AXIS_OVERFLOW_PX : proj.width, rect.height);
        ctx.clip();
        paint();
        ctx.restore();
    }

    /** Paint the in-progress drawing (during placing) at reduced opacity. */
    paintGhost(ctx: CanvasRenderingContext2D, ghost: Drawing, proj: Projector, theme: VelaTheme): void {
        ctx.globalAlpha = GHOST_ALPHA;
        // Two-time-anchor tools (regression channel, fixed-range VP) preview their TIME SPAN while
        // placing (two vertical guides + a connecting line) rather than the finished shape.
        if (ghost instanceof RegressionChannel || ghost instanceof FixedRangeVolumeProfile || ghost instanceof FixedRangeTpoProfile || ghost.placementPreview() === 'timespan') {
            this.paintTimeSpanGhost(ctx, ghost, proj);
        } else if (ghost instanceof Magnifier) {
            // Outline only while dragging — the finished shape fetches series data, and a
            // placement preview must never kick fetches on every cursor move.
            this.paintMagnifierGhost(ctx, ghost, proj, theme);
        } else this.paintOne(ctx, ghost, proj, theme);
        ctx.globalAlpha = 1;
    }

    /** Placement preview for two time-anchor tools: a full-height dashed vertical guide at each
     *  anchor (the left/right time bounds) + a line from the first anchor to the cursor. */
    private paintTimeSpanGhost(ctx: CanvasRenderingContext2D, d: Drawing, proj: Projector): void {
        const a = d.anchors[0];
        const b = d.anchors[1];
        if (!a) return;
        // Neutral gray guides (same as the regression channel midline) — not the tool's accent color.
        const color = d instanceof RegressionChannel ? d.reg?.midColor || NEUTRAL : NEUTRAL;
        const guide = (time: number): void => {
            const x = proj.xOf(time);
            ctx.save();
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.6 * ctx.globalAlpha;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, proj.height);
            ctx.stroke();
            ctx.restore();
        };
        guide(a.time);
        if (b) guide(b.time);
        const ya = proj.yOf(a.price, d.paneId);
        const yb = b ? proj.yOf(b.price, d.paneId) : null;
        const pts: Array<[number, number]> = [];
        if (ya != null) pts.push([proj.xOf(a.time), ya]);
        if (b && yb != null) {
            // the connecting line (first anchor → cursor)
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(proj.xOf(a.time), ya ?? yb);
            ctx.lineTo(proj.xOf(b.time), yb);
            ctx.stroke();
            ctx.restore();
            pts.push([proj.xOf(b.time), yb]);
        }
        this.paintHandles(ctx, pts);
    }

    /** The selection box a Ctrl/Cmd-drag on the empty plot sweeps: a faint fill in the handle
     *  accent under a thin dashed outline. */
    paintMarquee(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }): void {
        ctx.save();
        ctx.fillStyle = withAlpha(HANDLE_BORDER, 0.08);
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = HANDLE_BORDER;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w, rect.h);
        ctx.restore();
    }

    /** A hollow ring marking the candle point the magnet (Ctrl) will snap the next anchor to. */
    paintSnapRing(ctx: CanvasRenderingContext2D, x: number, y: number, theme: VelaTheme): void {
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = theme.textColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    private paintOne(ctx: CanvasRenderingContext2D, d: Drawing, proj: Projector, theme: VelaTheme): void {
        // A host-registered type that paints its own body (Drawing.paintSelf): its look replaces the built-in one.
        if (d.paintSelf(ctx, proj, theme)) return;
        if (d.type === 'highlighter' && d instanceof SegmentDrawing) {
            this.paintHighlighter(ctx, d, proj);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof ImageDrawing) {
            this.paintImage(ctx, d, proj, theme);
            return;
        }
        if (d instanceof XPostDrawing) {
            this.paintXPost(ctx, d, proj, theme);
            return;
        }
        if (d instanceof TableDrawing) {
            this.paintTable(ctx, d, proj, theme);
            return;
        }
        if (d instanceof GhostFeed) {
            this.paintGhostFeed(ctx, d, proj);
            return;
        }
        if (d instanceof SegmentDrawing) {
            this.paintSegments(ctx, d, proj);
            if (d.type === 'path') {
                const pts = d.handlePoints(proj); // a path ends in an arrowhead along its last segment
                if (pts.length >= 2) this.paintArrowhead(ctx, pts[pts.length - 2]!, pts[pts.length - 1]!, d.style);
            }
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof ArrowMark) {
            this.paintArrowMark(ctx, d, proj);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof GlyphStamp) {
            this.paintGlyphStamp(ctx, d, proj, theme);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof RadialFib) {
            this.paintRadialFib(ctx, d, proj, theme);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof FibSpiral) {
            this.paintFibSpiral(ctx, d, proj);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof DedekindTessellation) {
            this.paintDedekind(ctx, d, proj);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof MachFigure) {
            this.paintMachFigure(ctx, d, proj, theme);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof GannSquare) {
            this.paintFibRatios(ctx, d, proj, theme); // grid + Gann angle fan (straight entry lines)
            this.paintGannArcs(ctx, d, proj); // concentric quarter-ellipse arcs from the origin corner
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof FibRatios) {
            this.paintFibRatios(ctx, d, proj, theme);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof MeasureBox) {
            this.paintMeasureBox(ctx, d, proj, theme);
            return;
        }
        if (d instanceof Forecast) {
            this.paintForecast(ctx, d, proj, theme);
            return;
        }
        if (d instanceof BarsPattern) {
            this.paintBarsPattern(ctx, d, proj, theme);
            return;
        }
        if (d instanceof PositionTool) {
            this.paintPosition(ctx, d, proj, theme);
            return;
        }
        if (d instanceof RegressionChannel) {
            this.paintRegressionChannel(ctx, d, proj, theme);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof AnchoredVwap) {
            this.paintAnchoredVwap(ctx, d, proj);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof FixedRangeVolumeProfile) {
            this.paintFixedRangeVp(ctx, d, proj, theme);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof PriceAlert) {
            this.paintPriceAlert(ctx, d, proj, theme);
            return;
        }
        if (d instanceof FixedRangeTpoProfile) {
            this.paintFixedRangeTpo(ctx, d, proj, theme);
            this.paintLabel(ctx, d, proj, theme);
            return;
        }
        if (d instanceof Magnifier) {
            this.paintMagnifier(ctx, d, proj, theme);
            return;
        }
        if (d instanceof PatternDrawing) {
            this.paintPattern(ctx, d, proj, theme);
            return;
        }
        if (d instanceof Comment) {
            this.paintComment(ctx, d, proj, theme);
            return;
        }
        if (d instanceof PriceNote) {
            this.paintPriceNote(ctx, d, proj, theme);
            return;
        }
        if (d instanceof Signpost) {
            this.paintSignpost(ctx, d, proj, theme);
            return;
        }
        if (d instanceof Callout) {
            this.paintCallout(ctx, d, proj, theme);
            return;
        }
        if (d instanceof Note) {
            this.paintNote(ctx, d, proj, theme);
            return;
        }
        if (d instanceof PriceLabel) {
            this.paintPriceLabel(ctx, d, proj, theme);
            return;
        }
        // TradingView cuts the line where its text sits on it ("middle"), so the text never has a stroke through it.
        const gap = this.labelGap(ctx, d, proj, theme);
        if (gap) this.withGaps(ctx, [gap], () => this.paintBasic(ctx, d, proj, theme));
        else this.paintBasic(ctx, d, proj, theme);
        this.paintLabel(ctx, d, proj, theme); // every drawing can carry an optional label
    }

    /** The plain line and shape tools: geometry only, their label is painted by the caller. */
    private paintBasic(ctx: CanvasRenderingContext2D, d: Drawing, proj: Projector, theme: VelaTheme): void {
        switch (d.type) {
            case 'hline': {
                const pts = d.handlePoints(proj);
                if (pts.length === 0) return;
                this.stroke(ctx, d.style, () => {
                    ctx.moveTo(0, pts[0]![1]);
                    ctx.lineTo(proj.width, pts[0]![1]);
                });
                break;
            }
            case 'trendline':
            case 'arrow': {
                const pts = d.handlePoints(proj);
                if (pts.length < 2) return;
                // A trend line may extend past either point (TradingView); the arrow tool never does.
                const tl = d.type === 'trendline' ? (d as TrendLine) : null;
                const seg = tl?.drawnPixels(proj) ?? [pts[0]![0], pts[0]![1], pts[1]![0], pts[1]![1]];
                this.stroke(ctx, d.style, () => {
                    ctx.moveTo(seg[0], seg[1]);
                    ctx.lineTo(seg[2], seg[3]);
                });
                // An end's arrow sits on its point, unless the line carries on past that point.
                const firstIsLeft = pts[0]![0] <= pts[1]![0];
                const firstExtended = !!tl && (firstIsLeft ? tl.extendLeft : tl.extendRight);
                const secondExtended = !!tl && (firstIsLeft ? tl.extendRight : tl.extendLeft);
                if (d.style.arrowRight && !secondExtended) this.paintArrowhead(ctx, pts[0]!, pts[1]!, d.style);
                if (d.style.arrowLeft && !firstExtended) this.paintArrowhead(ctx, pts[1]!, pts[0]!, d.style);
                break;
            }
            case 'ellipse': {
                const o = (d as Ellipse).oval(proj);
                if (!o || o.rx < 0.5) return;
                if (d.style.fillColor) {
                    ctx.save();
                    ctx.fillStyle = d.style.fillColor; // alpha lives in the fill color itself
                    ctx.beginPath();
                    ctx.ellipse(o.cx, o.cy, o.rx, Math.max(0.5, o.ry), o.rot, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                this.applyStroke(ctx, d.style);
                ctx.beginPath();
                ctx.ellipse(o.cx, o.cy, o.rx, Math.max(0.5, o.ry), o.rot, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
            }
            case 'ray': {
                const pts = d.handlePoints(proj);
                if (pts.length < 2) return;
                const [ex1, ey1, ex2, ey2] = extendEndpoints(pts[0]![0], pts[0]![1], pts[1]![0], pts[1]![1], 'right', proj.width, proj.height);
                this.stroke(ctx, d.style, () => {
                    ctx.moveTo(ex1, ey1);
                    ctx.lineTo(ex2, ey2);
                });
                break;
            }
            case 'extendedline': {
                const pts = d.handlePoints(proj);
                if (pts.length < 2) return;
                const [ex1, ey1, ex2, ey2] = extendEndpoints(pts[0]![0], pts[0]![1], pts[1]![0], pts[1]![1], 'both', proj.width, proj.height);
                this.stroke(ctx, d.style, () => {
                    ctx.moveTo(ex1, ey1);
                    ctx.lineTo(ex2, ey2);
                });
                break;
            }
            case 'vline': {
                const pts = d.handlePoints(proj);
                if (pts.length === 0) return;
                this.stroke(ctx, d.style, () => {
                    ctx.moveTo(pts[0]![0], 0);
                    ctx.lineTo(pts[0]![0], proj.height);
                });
                break;
            }
            case 'hray': {
                const pts = d.handlePoints(proj);
                if (pts.length === 0) return;
                this.stroke(ctx, d.style, () => {
                    ctx.moveTo(pts[0]![0], pts[0]![1]);
                    ctx.lineTo(proj.width, pts[0]![1]);
                });
                break;
            }
            case 'crossline': {
                const pts = d.handlePoints(proj);
                if (pts.length === 0) return;
                this.stroke(ctx, d.style, () => {
                    ctx.moveTo(0, pts[0]![1]); // horizontal arm — full width
                    ctx.lineTo(proj.width, pts[0]![1]);
                    ctx.moveTo(pts[0]![0], 0); // vertical arm — full height
                    ctx.lineTo(pts[0]![0], proj.height);
                });
                break;
            }
            case 'infoline':
                this.paintInfoLine(ctx, d, proj);
                break;
            case 'trendangle':
                this.paintTrendAngle(ctx, d, proj, theme);
                break;
            case 'circle': {
                const pts = d.handlePoints(proj);
                if (pts.length < 2) return;
                const cx = pts[0]![0];
                const cy = pts[0]![1];
                const r = Math.hypot(pts[1]![0] - cx, pts[1]![1] - cy);
                if (r < 1) return;
                if (d.style.fillColor) {
                    ctx.save();
                    ctx.fillStyle = d.style.fillColor; // alpha lives in the fill color itself
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                this.applyStroke(ctx, d.style);
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
            }
            case 'box': {
                const pts = d.handlePoints(proj);
                if (pts.length < 2) return;
                // TradingView's rectangle: a side can extend to the pane edge (that side has no border then).
                const bx = d as Box;
                const span = bx.spanX(proj) ?? { x1: Math.min(pts[0]![0], pts[1]![0]), x2: Math.max(pts[0]![0], pts[1]![0]) };
                const x = span.x1;
                const y = Math.min(pts[0]![1], pts[1]![1]);
                const w = span.x2 - span.x1;
                const h = Math.abs(pts[1]![1] - pts[0]![1]);
                if (d.style.fillColor) {
                    ctx.save();
                    ctx.fillStyle = d.style.fillColor; // alpha lives in the fill color itself

                    ctx.fillRect(x, y, w, h);
                    ctx.restore();
                }
                this.applyStroke(ctx, d.style);
                if (!bx.extendLeft && !bx.extendRight) ctx.strokeRect(x, y, w, h);
                else {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + w, y);
                    ctx.moveTo(x, y + h);
                    ctx.lineTo(x + w, y + h);
                    if (!bx.extendLeft) { ctx.moveTo(x, y); ctx.lineTo(x, y + h); }
                    if (!bx.extendRight) { ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); }
                    ctx.stroke();
                }
                ctx.setLineDash([]);
                if (bx.middleLine) {
                    ctx.save();
                    this.applyStroke(ctx, { ...d.style, lineStyle: 'dashed', lineWidth: 1 });
                    ctx.beginPath();
                    ctx.moveTo(x, y + h / 2);
                    ctx.lineTo(x + w, y + h / 2);
                    ctx.stroke();
                    ctx.restore();
                }
                break;
            }
            default:
                break; // text has no geometry — its label is drawn by the caller
        }
    }

    /** Where an on-line label (vertical "middle" on a line tool, "on" for a vertical line) covers its line: the
     *  text's box plus a margin, as four corners in plot px (rotated with the text), or null when there is none. */
    private labelGap(ctx: CanvasRenderingContext2D, d: Drawing, proj: Projector, theme: VelaTheme): Array<[number, number]> | null {
        const text = d.text;
        if (!text || !text.value || d.id === this.targets.mutedLabel) return null;
        const on = ON_LINE_LABEL_TYPES.has(d.type) ? text.vAlign === 'center' : d.type === 'vline' && text.hAlign === 'center';
        if (!on) return null;
        const layout = labelLayout(d, proj);
        if (!layout) return null;
        const fs = namedFontSize(text.size);
        const lines = text.value.split('\n');
        ctx.save();
        ctx.font = labelFont(text, fs, theme);
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
        ctx.restore();
        const left = layout.align === 'center' ? layout.x - w / 2 : layout.align === 'right' || layout.align === 'end' ? layout.x - w : layout.x;
        const top = layout.top - 1;
        const bottom = layout.top + lines.length * labelLineHeight(fs) + 1;
        const box: Array<[number, number]> = [
            [left - LABEL_GAP_PX, top],
            [left + w + LABEL_GAP_PX, top],
            [left + w + LABEL_GAP_PX, bottom],
            [left - LABEL_GAP_PX, bottom],
        ];
        const r = layout.rotate;
        if (!r) return box;
        const cos = Math.cos(r.angle);
        const sin = Math.sin(r.angle);
        return box.map(([x, y]) => [r.cx + x * cos - y * sin, r.cy + x * sin + y * cos]);
    }

    /** Paint with holes cut where text sits on the strokes: an even-odd clip of the whole plot minus each box. */
    private withGaps(ctx: CanvasRenderingContext2D, gaps: ReadonlyArray<ReadonlyArray<readonly [number, number]>>, paint: () => void): void {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-1e5, -1e5, 2e5, 2e5);
        for (const q of gaps) {
            ctx.moveTo(q[0]![0], q[0]![1]);
            for (let i = 1; i < q.length; i += 1) ctx.lineTo(q[i]![0], q[i]![1]);
            ctx.closePath();
        }
        ctx.clip('evenodd');
        paint();
        ctx.restore();
    }

    /** Draw a drawing's optional text label at a type-appropriate anchor (multi-line aware).
     *  Two-point line tools rotate the glyphs to follow the segment, kept upright. */
    private paintLabel(ctx: CanvasRenderingContext2D, d: Drawing, proj: Projector, theme: VelaTheme): void {
        const text = d.text;
        if (!text || !text.value || d.id === this.targets.mutedLabel) return;
        const layout = labelLayout(d, proj);
        if (!layout) return;
        const fs = namedFontSize(text.size);
        ctx.save();
        if (layout.rotate) {
            ctx.translate(layout.rotate.cx, layout.rotate.cy);
            ctx.rotate(layout.rotate.angle);
        }
        ctx.font = labelFont(text, fs, theme);
        ctx.textBaseline = 'top';
        ctx.textAlign = layout.align;
        ctx.fillStyle = text.color ?? theme.textColor;
        const lh = labelLineHeight(fs);
        const tl = d.type === 'text' || d.type === 'anchoredtext' ? (d as TextLabel) : null;
        const wrap = tl?.wrapPx() ?? null;
        const lines = wrap == null ? text.value.split('\n') : wrapLines(ctx, text.value, wrap);
        if (tl && (tl.background || tl.border)) {
            // TradingView's text background / border: a plate around the lines, the frame's own inset.
            const w = Math.max(8, wrap ?? 0, ...lines.map((l) => ctx.measureText(l).width));
            const bx = layout.x - TEXT_FRAME_INSET;
            const by = layout.top - (lh - fs) / 2 - TEXT_FRAME_RISE;
            const bw = (wrap ?? w) + TEXT_FRAME_INSET * 2;
            const bh = lines.length * lh + TEXT_FRAME_RISE * 2;
            const ink = text.color ?? theme.textColor;
            ctx.save();
            ctx.setLineDash([]);
            roundRect(ctx, bx, by, bw, bh, 4);
            if (tl.background) {
                ctx.fillStyle = tl.backgroundColor ?? withAlpha(DEFAULT_DRAWING_COLOR, 0.3);
                ctx.fill();
            }
            if (tl.border) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = tl.borderColor ?? ink;
                ctx.stroke();
            }
            ctx.restore();
            ctx.fillStyle = ink;
        }
        lines.forEach((line, i) => ctx.fillText(line, layout.x, layout.top + i * lh));
        if (tl) this.paintTextFrame(ctx, d.id, layout.x, layout.top, lines, fs, theme);
        ctx.restore();
    }

    /** Frame a plain text label while it is the target, so the text reads as a clickable object even
     *  though it has no shape of its own: a firm frame once selected, a fainter one under the cursor.
     *  Placed to coincide with the inline editor's frame — clicking into the text doesn't shift it. */
    private paintTextFrame(ctx: CanvasRenderingContext2D, id: string, x: number, top: number, lines: readonly string[], fs: number, theme: VelaTheme): void {
        const t = this.targets;
        const alpha = t.selected?.has(id) ? TEXT_FRAME_ALPHA.selected : t.hovered === id ? TEXT_FRAME_ALPHA.hovered : 0;
        if (alpha === 0) return;
        const lh = labelLineHeight(fs);
        const w = Math.max(8, ...lines.map((l) => ctx.measureText(l).width));
        ctx.save();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = withAlpha(theme.textColor, alpha);
        roundRect(ctx, x - TEXT_FRAME_INSET, top - (lh - fs) / 2 - TEXT_FRAME_RISE, w + TEXT_FRAME_INSET * 2, lines.length * lh + TEXT_FRAME_RISE * 2, 4);
        ctx.stroke();
        ctx.restore();
    }

    /** Paint any Fibonacci tool from its resolved entry lines: optional fill bands, then each
     *  colored line with its auto-number + optional centered custom label (both per-tool sized). */
    private paintFibRatios(ctx: CanvasRenderingContext2D, d: FibRatios, proj: Projector, theme: VelaTheme): void {
        const lines = d.entryLines(proj);
        if (!lines || lines.length === 0) return;
        const fo = (d as unknown as { fillOpacity?: unknown }).fillOpacity;
        const fillAlpha = typeof fo === 'number' ? fo : 0.06;
        for (const band of d.fillBands(proj)) {
            ctx.save();
            ctx.globalAlpha = fillAlpha * ctx.globalAlpha;
            ctx.fillStyle = band.color;
            ctx.fillRect(band.x, band.y, band.w, band.h);
            ctx.restore();
        }
        for (const poly of d.fillPolygons(proj)) {
            if (poly.pts.length < 3) continue;
            ctx.save();
            ctx.globalAlpha = fillAlpha * ctx.globalAlpha;
            ctx.fillStyle = poly.color;
            ctx.beginPath();
            ctx.moveTo(poly.pts[0]![0], poly.pts[0]![1]);
            for (let i = 1; i < poly.pts.length; i += 1) ctx.lineTo(poly.pts[i]![0], poly.pts[i]![1]);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        if ((d as { trendline?: unknown }).trendline === true) {
            // TradingView's optional trend line: the swing the levels measure, dashed between the two anchors.
            const pts = d.handlePoints(proj);
            if (pts.length === 2) {
                this.stroke(ctx, { ...d.style, lineColor: theme.textColor, lineStyle: 'dashed', lineWidth: 1 }, () => {
                    ctx.moveTo(pts[0]![0], pts[0]![1]);
                    ctx.lineTo(pts[1]![0], pts[1]![1]);
                });
            }
        }
        ctx.textBaseline = 'middle';
        const numFont = `${namedFontSize(d.numbersSize)}px ${theme.fontFamily}`;
        const lblFont = `${namedFontSize(d.labelsSize)}px ${theme.fontFamily}`;
        for (const l of lines) {
            // A level's text set on the line (vertical "middle") breaks the line around it, like TradingView.
            const gaps: Array<Array<[number, number]>> = [];
            if (l.y1 === l.y2) {
                const onLine = (text: string | undefined, font: string, x: number, y: number, align: CanvasTextAlign): void => {
                    if (!text || Math.abs(y - l.y1) > 0.5) return;
                    ctx.font = font;
                    const w = ctx.measureText(text).width;
                    const left = align === 'center' ? x - w / 2 : align === 'right' || align === 'end' ? x - w : x;
                    const half = parseFloat(font) / 2 + 1;
                    gaps.push([[left - LABEL_GAP_PX, y - half], [left + w + LABEL_GAP_PX, y - half], [left + w + LABEL_GAP_PX, y + half], [left - LABEL_GAP_PX, y + half]]);
                };
                onLine(l.numberText, numFont, l.numberX, l.numberY, l.numberAlign);
                onLine(l.label, lblFont, l.labelX, l.labelY, 'center');
            }
            const line = (): void => this.stroke(ctx, { ...d.style, lineColor: l.color }, () => {
                ctx.moveTo(l.x1, l.y1);
                ctx.lineTo(l.x2, l.y2);
            });
            if (gaps.length) this.withGaps(ctx, gaps, line);
            else line();
            ctx.fillStyle = l.color;
            ctx.font = numFont;
            ctx.textAlign = l.numberAlign;
            if (l.numberText) ctx.fillText(l.numberText, l.numberX, l.numberY);
            if (l.label) {
                ctx.font = lblFont;
                ctx.textAlign = 'center';
                ctx.fillText(l.label, l.labelX, l.labelY);
            }
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    /** TradingView's price label for horizontal lines / rays / cross lines: each one's price in a chip of its line
     *  color on the price scale, right of the plot (the alert marker's chip). Its own pass on the top canvas, for
     *  every visible drawing: one painted under the candles lives on a plot-sized layer that cannot reach the axis. */
    paintAxisPrices(ctx: CanvasRenderingContext2D, drawings: readonly Drawing[], proj: Projector, theme: VelaTheme): void {
        for (const d of drawings) {
            if (!d.visible || !shownOnBarMs(d.intervals, this.barMs) || !showsAxisPrice(d)) continue;
            const a = d.anchors[0];
            const y = a ? proj.yOf(a.price, d.paneId) : null;
            const rect = proj.paneRect?.(d.paneId);
            if (!a || y == null || (rect && (rect.height <= 0 || y < rect.top || y > rect.top + rect.height))) continue;
            this.paintAxisPrice(ctx, d, this.axisChipY.get(d.id) ?? y, proj, theme);
        }
        // TradingView's time label for vertical lines / cross lines: the time in a chip of the line color on the time axis.
        for (const d of drawings) {
            if (!d.visible || !shownOnBarMs(d.intervals, this.barMs) || !showsAxisTime(d)) continue;
            const a = d.anchors[0];
            const x = a ? proj.xOf(a.time) : null;
            if (!a || x == null || x < 0 || x > proj.width) continue;
            const ink = d.style.lineColor || theme.textColor;
            const label = formatTimeStamp(a.time, this.timeZone, this.barMs || 60_000);
            ctx.save();
            ctx.setLineDash([]);
            ctx.font = `600 11px ${theme.fontFamily}`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            const w = ctx.measureText(label).width + 14;
            const cx = Math.max(w / 2 + 1, Math.min(proj.width - w / 2 - 1, x));
            roundRect(ctx, cx - w / 2, proj.height + 2, w, 18, 4);
            ctx.fillStyle = ink;
            ctx.fill();
            ctx.fillStyle = contrastColor(ink);
            ctx.fillText(label, cx, proj.height + 11.5);
            ctx.restore();
        }
    }

    /** TradingView's image: the picture stretched over its box (loaded once per URL, CORS-clean so chart snapshots
     *  still work); a dashed box with a short note while it loads or when it cannot be shown. */
    private paintImage(ctx: CanvasRenderingContext2D, d: ImageDrawing, proj: Projector, theme: VelaTheme): void {
        const b = d.bounds(proj);
        if (!b) return;
        const raw = d.imageUrl();
        const remote = !!raw && !raw.startsWith('data:');
        const url = remote && !this.allowRemoteImages ? null : raw;
        let entry = url ? this.images.get(url) : undefined;
        if (url && !entry && typeof Image !== 'undefined') {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // a picture without CORS fails here instead of tainting the canvas
            entry = { img, state: 'loading' };
            this.images.set(url, entry);
            const e = entry;
            img.onload = () => {
                e.state = 'ok';
                this.onAssetLoaded?.();
            };
            img.onerror = () => {
                e.state = 'error';
                this.onAssetLoaded?.();
            };
            img.src = url;
        }
        if (entry?.state === 'ok' && b.w >= 1 && b.h >= 1) {
            ctx.save();
            ctx.globalAlpha *= d.opacity ?? 1;
            ctx.drawImage(entry.img, b.x, b.y, b.w, b.h);
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = withAlpha(theme.textColor, 0.5);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
        ctx.setLineDash([]);
        ctx.fillStyle = withAlpha(theme.textColor, 0.7);
        ctx.font = `12px ${theme.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const note = remote && !url ? 'Image links are off on this chart' : !url ? 'Add an image in settings' : entry?.state === 'error' ? 'This image cannot be shown here' : 'Loading image…';
        // Wrapped to the box and clipped by it: a narrow box (a phone) must not spill the note over the candles.
        ctx.beginPath();
        ctx.rect(b.x, b.y, b.w, b.h);
        ctx.clip();
        const lines: string[] = [];
        for (const word of note.split(' ')) {
            const last = lines[lines.length - 1];
            if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= b.w - 8) lines[lines.length - 1] = `${last} ${word}`;
            else lines.push(word);
        }
        lines.forEach((line, i) => ctx.fillText(line, b.x + b.w / 2, b.y + b.h / 2 + (i - (lines.length - 1) / 2) * 15));
        ctx.restore();
    }

    /** TradingView's table: a grid of cells from the pinned corner, header row bold, each column as wide as its
     *  widest cell, on the background color with a border between cells. */
    /** A same-origin picture (the host's relay), loaded once and shared; null until it has loaded. */
    private relayImage(path: string): HTMLImageElement | null {
        const url = safeRelayPath(path);
        if (!url || typeof Image === 'undefined') return null;
        let e = this.images.get(url);
        if (!e) {
            const img = new Image();
            const entry: { img: HTMLImageElement; state: 'loading' | 'ok' | 'error' } = { img, state: 'loading' };
            this.images.set(url, entry);
            img.onload = () => {
                entry.state = 'ok';
                this.onAssetLoaded?.();
            };
            img.onerror = () => {
                entry.state = 'error';
            };
            img.src = url;
            e = entry;
        }
        return e.state === 'ok' ? e.img : null;
    }

    /** An X post's card as TradingView's own renderer draws it (its `TweetRenderer`, read from TradingView's code):
     *  the line to the post's bar first, then the card over it: picture, name, @handle, the post's text wrapped at
     *  320 px, "Link to X post", a rule and the date. The card is as wide as its text needs. */
    private paintXPost(ctx: CanvasRenderingContext2D, d: XPostDrawing, proj: Projector, theme: VelaTheme): void {
        const p = d.post;
        const font = theme.fontFamily;
        const c = xpostColors(theme.background);
        ctx.save();
        // -- measure (TradingView's `_precalculate`) --
        ctx.font = `14px ${font}`;
        const lines = wrapPost(ctx, p ? p.text : 'This post is not available', 320).slice(0, 40);
        const textW = Math.max(0, ...lines.map((l) => ctx.measureText(l).width)) + 32;
        const linkW = ctx.measureText(XPOST_LINK).width + 32;
        ctx.font = `12px ${font}`;
        const handle = p?.handle ? `@${p.handle}` : '';
        const date = p ? xpostDate(p.t, proj.timeZone) : '';
        const handleW = ctx.measureText(handle).width;
        const dateW = ctx.measureText(date).width + 32;
        ctx.font = `bold 14px ${font}`;
        const name = p?.name || p?.handle || 'X';
        const nameW = ctx.measureText(name).width;
        d.cardW = Math.ceil(Math.max(textW, linkW, Math.max(handleW, nameW) + 76, dateW));
        d.cardH = Math.ceil(14 * (lines.length + 2) * 1.2 + 58 + 41);
        const l = d.layout(proj);
        if (!l) {
            ctx.restore();
            return;
        }
        const { x, y, w, h } = l.card;
        // -- the line to the post's bar, under the card --
        this.paintXPostLine(ctx, x + w / 2, y + h / 2, h / 2, d.barPoints(proj), theme.background, c.line);
        // -- the card --
        const rx = Math.round(x);
        const ry = Math.round(y);
        ctx.fillStyle = c.back;
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 1;
        roundRect(ctx, rx + 0.5, ry + 0.5, w, h, 8);
        ctx.fill();
        ctx.stroke();
        // author picture, a 36 px circle
        const av = p?.avatar ? this.relayImage(p.avatar) : null;
        if (av) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(rx + 16 + 18, ry + 13 + 18, 18, 0, Math.PI * 2);
            ctx.clip();
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(av, rx + 16, ry + 13, 36, 36);
            ctx.restore();
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `bold 14px ${font}`;
        ctx.fillStyle = c.name;
        ctx.fillText(name, rx + 60, ry + 15.5);
        ctx.font = `12px ${font}`;
        ctx.fillStyle = c.muted;
        ctx.fillText(handle, rx + 60, ry + 34.5);
        // the post's text, then the link after one empty line
        ctx.font = `14px ${font}`;
        ctx.fillStyle = c.text;
        lines.forEach((t, i) => ctx.fillText(t, rx + 16, ry + 58 + i * 16.8));
        if (p) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(rx + 16, ry + 58 + (lines.length + 1) * 16.8, w - 32, 14);
            ctx.clip();
            ctx.fillStyle = c.url;
            ctx.fillText(XPOST_LINK, rx + 16, ry + 58 + (lines.length + 1) * 16.8);
            ctx.restore();
        }
        // the rule and the date
        ctx.fillStyle = c.border;
        ctx.fillRect(rx + 16, ry + h - 33, w - 32, 1);
        ctx.textBaseline = 'middle';
        ctx.font = `12px ${font}`;
        ctx.fillStyle = c.muted;
        ctx.fillText(date, rx + 16, ry + h - 33 + 16.5);
        ctx.restore();
    }

    /** TradingView's connector (`_drawConnector`): from the card's top or bottom edge to the nearer end of the post's
     *  bar, as an elbow through the half-way height, stopping 2 px short of the bar; a plain horizontal line when the
     *  half-way height falls inside the card. Drawn twice, a 3 px stroke in the chart's background under a 1 px one,
     *  so it stays readable over candles. */
    private paintXPostLine(ctx: CanvasRenderingContext2D, cx: number, cy: number, m: number, pts: Array<[number, number]>, bg: string, color: string): void {
        let best: [number, number] | null = null;
        let dist = Infinity;
        for (const pt of pts) {
            const dd = Math.hypot(pt[0] - cx, pt[1] - cy);
            if (dd < dist) {
                dist = dd;
                best = pt;
            }
        }
        if (!best) return;
        const below = best[1] > cy;
        const from = Math.round(cy + (below ? m : -m)) + 0.5;
        const to = Math.round(best[1]) + (below ? -2 : 2) + 0.5;
        const bx = Math.round(best[0]) + 0.5;
        const ax = Math.round(cx) + 0.5;
        const mid = Math.round((to + from) / 2) + 0.5;
        ctx.save();
        ctx.lineCap = 'square';
        for (const [stroke, lw] of [[bg, 3], [color, 1]] as const) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lw;
            ctx.beginPath();
            if (Math.abs(cx - best[0]) < 1) {
                ctx.moveTo(bx, from);
                ctx.lineTo(bx, to);
            } else if (mid > cy - m && mid < cy + m) {
                ctx.moveTo(ax, to);
                ctx.lineTo(bx, to);
            } else {
                ctx.moveTo(ax, from);
                ctx.lineTo(ax, mid);
                ctx.lineTo(bx, mid);
                ctx.lineTo(bx, to);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    private paintTable(ctx: CanvasRenderingContext2D, d: TableDrawing, proj: Projector, theme: VelaTheme): void {
        const pts = d.handlePoints(proj);
        if (!pts.length) return;
        const [x0, y0] = pts[0]!;
        const fs = namedFontSize(d.text?.size ?? 'normal');
        const font = (bold: boolean): string => `${bold || d.text?.bold ? '600 ' : ''}${d.text?.italic ? 'italic ' : ''}${fs}px ${theme.fontFamily}`;
        const cells = d.cells();
        const rowH = labelLineHeight(fs) + 8;
        const widths = cells[0]!.map((_, c) =>
            Math.max(...cells.map((r, ri) => {
                ctx.font = font(ri === 0);
                return ctx.measureText(r[c]!).width;
            })) + 16,
        );
        const w = widths.reduce((a, b) => a + b, 0);
        const h = cells.length * rowH;
        const ink = d.text?.color ?? theme.textColor;
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = d.backgroundColor ?? theme.background;
        ctx.fillRect(x0, y0, w, h);
        ctx.strokeStyle = d.borderColor ?? withAlpha(ink, 0.35);
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
        ctx.beginPath();
        for (let r = 1; r < cells.length; r += 1) {
            ctx.moveTo(x0, Math.round(y0 + r * rowH) + 0.5);
            ctx.lineTo(x0 + w, Math.round(y0 + r * rowH) + 0.5);
        }
        let x = x0;
        for (let c = 0; c < widths.length - 1; c += 1) {
            x += widths[c]!;
            ctx.moveTo(Math.round(x) + 0.5, y0);
            ctx.lineTo(Math.round(x) + 0.5, y0 + h);
        }
        ctx.stroke();
        ctx.fillStyle = ink;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        cells.forEach((row, ri) => {
            ctx.font = font(ri === 0);
            let cx = x0;
            row.forEach((cell, ci) => {
                ctx.fillText(cell, cx + 8, y0 + ri * rowH + rowH / 2);
                cx += widths[ci]!;
            });
        });
        ctx.restore();
    }

    /** TradingView's ghost feed: made-up candles along the clicked path, in the chart's own candle colors, faded. */
    private paintGhostFeed(ctx: CanvasRenderingContext2D, d: GhostFeed, proj: Projector): void {
        const candles = d.ghostCandles(proj);
        if (!candles.length) {
            this.paintSegments(ctx, d, proj); // still placing the first leg
            return;
        }
        const step = candles.length > 1 ? Math.abs(candles[1]!.x - candles[0]!.x) : 8;
        const half = Math.max(1, Math.min(8, step * 0.35));
        ctx.save();
        ctx.setLineDash([]);
        ctx.globalAlpha *= 0.6;
        ctx.lineWidth = 1;
        for (const c of candles) {
            const up = c.close <= c.open; // pixel y grows down
            const col = up ? this.seriesLook.upColor : this.seriesLook.downColor;
            const x = Math.round(c.x) + 0.5;
            ctx.strokeStyle = col;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(x, c.high);
            ctx.lineTo(x, c.low);
            ctx.stroke();
            ctx.fillRect(x - half, Math.min(c.open, c.close), half * 2, Math.max(1, Math.abs(c.close - c.open)));
        }
        ctx.restore();
    }

    /** TradingView's bars pattern: the copied bars in the tool's color (down bars filled, up bars hollow), as candles,
     *  HL bars or a close line; a dashed span marks the range while nothing is copied yet. */
    private paintBarsPattern(ctx: CanvasRenderingContext2D, d: BarsPattern, proj: Projector, theme: VelaTheme): void {
        const ink = d.style.lineColor || theme.textColor;
        const bars = d.patternBars(proj);
        if (!bars.length) {
            const b = d.bounds(proj);
            if (b) this.stroke(ctx, { ...d.style, lineStyle: 'dashed' }, () => ctx.rect(b.x, b.y, b.w, b.h));
            return;
        }
        const step = bars.length > 1 ? Math.abs(bars[1]!.x - bars[0]!.x) : 8;
        const half = Math.max(1, Math.min(8, step * 0.35));
        ctx.save();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = ink;
        ctx.fillStyle = ink;
        if (d.mode === 'line') {
            ctx.beginPath();
            bars.forEach((b, i) => (i ? ctx.lineTo(b.x, b.close) : ctx.moveTo(b.x, b.close)));
            ctx.lineWidth = Math.max(1, d.style.lineWidth);
            ctx.stroke();
            ctx.restore();
            return;
        }
        for (const b of bars) {
            const x = Math.round(b.x) + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, b.high);
            ctx.lineTo(x, b.low);
            if (d.mode === 'bars') {
                ctx.moveTo(x - half, b.open);
                ctx.lineTo(x, b.open);
                ctx.moveTo(x, b.close);
                ctx.lineTo(x + half, b.close);
                ctx.stroke();
                continue;
            }
            ctx.stroke();
            const top = Math.min(b.open, b.close);
            const h = Math.max(1, Math.abs(b.close - b.open));
            if (b.close > b.open) ctx.fillRect(x - half, top, half * 2, h); // pixel y grows down: a down bar
            else {
                ctx.fillStyle = theme.background;
                ctx.fillRect(x - half, top, half * 2, h);
                ctx.fillStyle = ink;
                ctx.strokeRect(x - half, top, half * 2, h);
            }
        }
        ctx.restore();
    }

    /** TradingView's forecast: the curve, a plate under the source (price, time), the change above the target and,
     *  once known, SUCCESS (green) or FAILURE (red) above that. */
    private paintForecast(ctx: CanvasRenderingContext2D, d: Forecast, proj: Projector, theme: VelaTheme): void {
        const c = d.curve(proj);
        if (c.length < 2) return;
        const ink = d.style.lineColor || theme.textColor;
        this.stroke(ctx, d.style, () => {
            ctx.moveTo(c[0]![0], c[0]![1]);
            for (let i = 1; i < c.length; i += 1) ctx.lineTo(c[i]![0], c[i]![1]);
        });
        const pts = d.handlePoints(proj);
        const a = d.anchors[0];
        if (pts.length < 2 || !a) return;
        const plate = (lines: string[], cx: number, top: number, fill: string): number => {
            ctx.font = `12px ${theme.fontFamily}`;
            const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
            const h = lines.length * 16 + 8;
            ctx.save();
            ctx.setLineDash([]);
            roundRect(ctx, cx - w / 2, top, w, h, 3);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.fillStyle = contrastColor(fill);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            lines.forEach((l, i) => ctx.fillText(l, cx, top + 4 + 8 + i * 16));
            ctx.restore();
            return h;
        };
        const [sx, sy] = pts[0]!;
        const [tx, ty] = pts[1]!;
        plate([formatPriceTag(a.price), formatTimeStamp(a.time, this.timeZone, this.barMs || 60_000)], sx, sy + 8, ink);
        const h = plate([d.changeLabel()], tx, ty - 8 - 24, ink);
        const st = d.status(proj);
        if (st !== 'pending') plate([st === 'success' ? 'SUCCESS' : 'FAILURE'], tx, ty - 8 - h - 4 - 24, st === 'success' ? VALID_FILL : INVALID_FILL);
    }

    /** TradingView's line stats (trend line, ray, extended line, info line): a box of price range, percent, bars,
     *  time span, distance and angle by the first point, the middle or the second point, below and right of it. Its own
     *  pass on the top canvas like the axis prices, so the candles never cover it. */
    paintLineStats(ctx: CanvasRenderingContext2D, drawings: readonly Drawing[], proj: Projector, theme: VelaTheme): void {
        for (const d of drawings) {
            if (!d.visible || !shownOnBarMs(d.intervals, this.barMs)) continue;
            const s = statsOf(d as Drawing & { stats?: unknown });
            const a = d.anchors[0];
            const b = d.anchors[1];
            if (!s || !anyStats(s) || !a || !b) continue;
            const pts = d.handlePoints(proj);
            if (pts.length < 2) continue;
            const p: [number, number, number, number] = [pts[0]![0], pts[0]![1], pts[1]![0], pts[1]![1]];
            const rows = lineStatsRows(s, a, b, p, proj);
            if (rows.length === 0) continue;
            const ax = s.position === 'left' ? p[0] : s.position === 'right' ? p[2] : (p[0] + p[2]) / 2;
            const ay = s.position === 'left' ? p[1] : s.position === 'right' ? p[3] : (p[1] + p[3]) / 2;
            const rect = proj.paneRect?.(d.paneId) ?? { top: 0, height: proj.height };
            if (ay < rect.top || ay > rect.top + rect.height || ax < 0 || ax > proj.width) continue;
            ctx.save();
            ctx.setLineDash([]);
            ctx.font = `12px ${theme.fontFamily}`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            const padX = 12;
            const rowH = 22;
            const w = Math.ceil(Math.max(...rows.map((r) => ctx.measureText(r).width))) + padX * 2;
            const h = rows.length * rowH + 10;
            // Below and right of the point, flipped back inside the pane near its right or bottom edge.
            let x = ax + 12;
            let y = ay + 12;
            if (x + w > proj.width - 2) x = ax - 12 - w;
            if (y + h > rect.top + rect.height - 2) y = ay - 12 - h;
            x = Math.max(2, x);
            y = Math.max(rect.top + 2, y);
            roundRect(ctx, x, y, w, h, 4);
            ctx.fillStyle = STATS_FILL;
            ctx.fill();
            ctx.fillStyle = STATS_TEXT;
            rows.forEach((r, i) => ctx.fillText(r, x + padX, y + 5 + rowH * i + rowH / 2));
            ctx.restore();
        }
    }

    private paintAxisPrice(ctx: CanvasRenderingContext2D, d: Drawing, y: number, proj: Projector, theme: VelaTheme): void {
        ctx.save();
        ctx.setLineDash([]);
        this.paintAxisChip(ctx, d, y, proj, theme, d.style.lineColor || theme.textColor);
        ctx.restore();
    }

    /**
     * A drawing's price chip on the price scale (horizontal line / ray / cross line, alert line). Text, decimals and
     * font come from the renderer's axis formatter (`axisLabel`), the one the axis numbers and the crosshair chip use,
     * so the chip reads like the scale beside it (`80,120.61` in the axis face, not a bolder 11 px face with its own
     * decimals). Box and baseline sit on whole device pixels: a fractional y smears the glyphs over two pixel rows.
     */
    private paintAxisChip(ctx: CanvasRenderingContext2D, d: Drawing, y: number, proj: Projector, theme: VelaTheme, ink: string): void {
        const a = d.anchors[0]!;
        const W = proj.width;
        const label = this.axisLabel?.(d.paneId, a.price) ?? null;
        const priceStr = label?.text || formatPriceTag(a.price);
        ctx.font = label?.font ?? `${AXIS_CHIP_FONT_PX}px ${theme.fontFamily}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const dpr = ctx.getTransform?.().a || 1;
        const snap = (v: number): number => Math.round(v * dpr) / dpr;
        const cy = snap(y);
        const chipW = Math.ceil(Math.max(54, ctx.measureText(priceStr).width + 14));
        roundRect(ctx, snap(W + 1), snap(cy - 9.5), chipW, 19, 4);
        ctx.fillStyle = ink;
        ctx.fill();
        ctx.fillStyle = contrastColor(ink);
        ctx.fillText(priceStr, snap(W + 8), cy);
    }

    /** Paint a concentric-ring fib tool (circles / arcs / wedge): each enabled level as an arc of
     *  radius R0·ratio over the tool's angular sweep, plus any bounding lines + a ratio label per ring. */
    private paintRadialFib(ctx: CanvasRenderingContext2D, d: RadialFib, proj: Projector, theme: VelaTheme): void {
        const g = d.radial(proj);
        if (g && g.R0 >= 1) {
            const font = `${namedFontSize(d.numbersSize)}px ${theme.fontFamily}`;
            const mid = (g.a0 + g.a1) / 2;
            ctx.textBaseline = 'middle';
            for (const lv of d.levels) {
                if (!lv.enabled) continue;
                const r = g.R0 * lv.ratio;
                if (r < 0.5) continue;
                this.applyStroke(ctx, { ...d.style, lineColor: lv.color });
                const sy = g.sy ?? 1;
                ctx.beginPath();
                if (sy === 1) ctx.arc(g.cx, g.cy, r, g.a0, g.a1);
                else ctx.ellipse(g.cx, g.cy, r, r * sy, 0, g.a0, g.a1);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = lv.color;
                ctx.font = font;
                ctx.textAlign = 'left';
                ctx.fillText(String(lv.ratio), g.cx + Math.cos(mid) * r + 3, g.cy + Math.sin(mid) * r * sy);
            }
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
        }
        for (const b of d.boundingLines(proj)) {
            this.stroke(ctx, d.style, () => {
                ctx.moveTo(b[0], b[1]);
                ctx.lineTo(b[2], b[3]);
            });
        }
    }

    /** Paint a Gann square's concentric quarter-ellipse arcs, centered on the origin corner and
     *  sized as fractions of the box (so they match its pixel aspect). */
    private paintGannArcs(ctx: CanvasRenderingContext2D, d: GannSquare, proj: Projector): void {
        const g = d.arcGeom(proj);
        if (!g || Math.abs(g.bx) < 1 || Math.abs(g.py) < 1) return;
        const N = 24; // samples per quarter
        for (const arc of GANN_SQUARE_ARCS) {
            this.applyStroke(ctx, { ...d.style, lineColor: arc.color });
            ctx.beginPath();
            for (let i = 0; i <= N; i += 1) {
                const t = (i / N) * (Math.PI / 2);
                const x = g.ox + arc.k * g.bx * Math.cos(t);
                const y = g.oy + arc.k * g.py * Math.sin(t);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);
    }

    /** Paint a Fibonacci spiral as a sampled polyline. */
    private paintFibSpiral(ctx: CanvasRenderingContext2D, d: FibSpiral, proj: Projector): void {
        const pts = d.spiralPoints(proj);
        if (!pts || pts.length < 2) return;
        this.stroke(ctx, d.style, () => {
            ctx.moveTo(pts[0]![0], pts[0]![1]);
            for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]![0], pts[i]![1]);
        });
    }

    /** Paint a Mach wavefront figure (sonic wall or supersonic cone) + the Huygens circles. */
    private paintMachFigure(ctx: CanvasRenderingContext2D, d: MachFigure, proj: Projector, theme: VelaTheme): void {
        const g = d.geom(proj);
        if (!g) return;
        for (const c of g.circles) {
            this.applyStroke(ctx, { ...d.style, lineColor: c.color });
            ctx.beginPath();
            ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Envelope (shock wall or Mach-cone generators) slightly stronger, in the line color.
        this.applyStroke(ctx, d.style);
        ctx.lineWidth = d.style.lineWidth + 0.5;
        for (const r of g.rays) {
            ctx.beginPath();
            ctx.moveTo(r[0], r[1]);
            ctx.lineTo(r[2], r[3]);
            ctx.stroke();
        }
        // Nose marker
        ctx.beginPath();
        ctx.arc(g.noseX, g.noseY, Math.max(2.5, d.style.lineWidth + 1.5), 0, Math.PI * 2);
        ctx.fillStyle = d.style.lineColor;
        ctx.fill();
        ctx.setLineDash([]);
        // Ratio labels sit just outside each circle along the expansion direction.
        if (d.showRatios !== false) {
            const font = `${namedFontSize('small')}px ${theme.fontFamily}`;
            ctx.font = font;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            for (const c of g.circles) {
                const lx = c.cx + g.fx * c.r + 4;
                const ly = c.cy + g.fy * c.r;
                ctx.fillStyle = c.color;
                ctx.fillText(formatMachRatio(c.ratio), lx, ly);
            }
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
        }
    }

    /** Paint a Dedekind tessellation: box border + clipped semicircles/verticals (modular tiling). */
    private paintDedekind(ctx: CanvasRenderingContext2D, d: DedekindTessellation, proj: Projector): void {
        const box = d.box(proj);
        const geoms = d.geodesics(proj);
        if (!box || !geoms) return;
        const { left, right, top, bot } = box;
        // Light border so the user-defined range stays visible.
        ctx.save();
        this.applyStroke(ctx, d.style);
        ctx.globalAlpha *= 0.45;
        ctx.strokeRect(left, top, right - left, bot - top);
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.rect(left, top, right - left, bot - top);
        ctx.clip();
        this.applyStroke(ctx, d.style);
        for (const g of geoms) {
            ctx.beginPath();
            if (g.kind === 'vline') {
                ctx.moveTo(g.x, g.y0);
                ctx.lineTo(g.x, g.y1);
            } else {
                // Clockwise π→0 on a y-down canvas sweeps the upper semicircle (into the box).
                ctx.arc(g.cx, g.cy, g.r, Math.PI, 0, false);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
    }

    /** Paint a measurement box: a direction-tinted (green up / red down) shaded rect with a
     *  centered, multi-line label of the computed price/time deltas. */
    private paintMeasureBox(ctx: CanvasRenderingContext2D, d: MeasureBox, proj: Projector, theme: VelaTheme): void {
        const pts = d.handlePoints(proj);
        if (pts.length < 2) return;
        const [x1, y1] = pts[0]!;
        const [x2, y2] = pts[1]!;
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);
        // TradingView's ranges: the date range in its line color, the price and date & price ranges blue up / red down.
        const color = d.type === 'daterange' ? d.style.lineColor || theme.textColor : d.isUp() ? BULLISH : BEARISH;
        ctx.save();
        ctx.globalAlpha = 0.12 * ctx.globalAlpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
        const line = (ax: number, ay: number, bx: number, by: number): void =>
            this.stroke(ctx, { ...d.style, lineColor: color }, () => {
                ctx.moveTo(ax, ay);
                ctx.lineTo(bx, by);
            });
        const arrow = (ax: number, ay: number, bx: number, by: number): void => {
            line(ax, ay, bx, by);
            if (Math.hypot(bx - ax, by - ay) > 12) this.paintArrowhead(ctx, [ax, ay], [bx, by], { ...d.style, lineColor: color });
        };
        const showTime = d.type !== 'pricerange';
        const showPriceAxis = d.type !== 'daterange';
        if (d.type === 'daterange') {
            line(x, y, x, y + h); // the two time edges
            line(x + w, y, x + w, y + h);
        } else if (d.type === 'pricerange') {
            line(x, y, x + w, y); // the two price edges
            line(x, y + h, x + w, y + h);
        } else {
            ctx.setLineDash(dashPattern(d.style.lineStyle, d.style.lineWidth));
            ctx.strokeStyle = color;
            ctx.lineWidth = d.style.lineWidth;
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
        }
        if (showTime) arrow(x1, y + h / 2, x2, y + h / 2); // across, pointing the way time ran
        if (showPriceAxis) arrow(x + w / 2, y1, x + w / 2, y2); // up or down, the way price moved
        const lines = d.measureLabel(proj);
        if (!lines.length) return;
        // The plate: outside the box, past the end the price moved to (below a fall, above a rise).
        const fs = namedFontSize(d.text?.size ?? 'normal');
        ctx.font = `${fs}px ${theme.fontFamily}`;
        const lh = Math.round(fs * 1.35);
        const pw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
        const ph = lines.length * lh + 8;
        const below = d.type === 'daterange' ? false : !d.isUp();
        const py = below ? y + h + 6 : y - 6 - ph;
        roundRect(ctx, x + w / 2 - pw / 2, py, pw, ph, 4);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = d.text?.color ?? contrastColor(color);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((l, i) => ctx.fillText(l, x + w / 2, py + 4 + lh / 2 + i * lh));
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    /** Paint a position tool the way TradingView does: a reward zone (entry↔target) + risk
     *  zone (entry↔stop) in the tool's own zone colors, the three level lines, and solid label
     *  boxes with white text: target stats just outside the reward zone, stop stats just
     *  outside the risk zone, and the size + Risk/Reward ratio centred on the entry line.
     *  The box fill is the zone color darkened until white text reaches 4.5:1 contrast, so a
     *  bright custom color stays readable. Text size follows `text.size`; showText hides all. */
    private paintPosition(ctx: CanvasRenderingContext2D, d: PositionTool, proj: Projector, theme: VelaTheme): void {
        const L = d.layout(proj);
        if (!L) return;
        const { x1, x2, ey, sy, ty } = L;
        const w = x2 - x1;
        const zone = (yA: number, yB: number, color: string): void => {
            ctx.save();
            ctx.globalAlpha = 0.2 * ctx.globalAlpha;
            ctx.fillStyle = color;
            ctx.fillRect(x1, Math.min(yA, yB), w, Math.abs(yB - yA));
            ctx.restore();
        };
        zone(ey, ty, d.profitColor); // reward
        zone(ey, sy, d.lossColor); // risk
        const line = (y: number, color: string): void =>
            this.stroke(ctx, { ...d.style, lineColor: color }, () => {
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
            });
        line(ty, d.profitColor);
        line(sy, d.lossColor);
        line(ey, d.style.lineColor); // entry — accent
        if (!d.showText) return;
        // TradingView: the stats show while the tool is hovered, selected or dragged, unless "Always show stats".
        if (!d.alwaysShowStats && !handleIdsFor(this.targets).has(d.id)) return;
        const fs = namedFontSize(d.text?.size ?? 'normal');
        const ink = d.text?.color ?? '#ffffff'; // palette-exempt: TradingView-style white label text
        ctx.font = `${fs}px ${theme.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const cx = x1 + w / 2;
        const padX = 6;
        const lh = Math.round(fs * 1.3);
        const gap = 3;
        /** A solid rounded box of `lines`, centred on cx; `top` is its top edge. */
        const box = (lines: string[], top: number, fill: string): void => {
            if (lines.length === 0) return;
            const tw = Math.max(...lines.map((t) => ctx.measureText(t).width));
            const bw = Math.ceil(tw + padX * 2);
            const bh = lines.length * lh + 6;
            ctx.save();
            roundRect(ctx, Math.round(cx - bw / 2), Math.round(top), bw, bh, 3);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = ink;
            lines.forEach((t, i) => ctx.fillText(t, cx, top + 3 + lh / 2 + i * lh));
        };
        const boxH = lh + 6;
        // Target and stop boxes sit outside the box, on their own level line (above it when the
        // level is the top edge, below when it is the bottom edge).
        const outside = (y: number): number => (y <= ey ? y - gap - boxH : y + gap);
        if (d.showTargetLabel) box([d.targetBoxLabel()], outside(ty), labelFill(d.profitColor));
        if (d.showStopLabel) box([d.stopBoxLabel()], outside(sy), labelFill(d.lossColor));
        const mid = d.centerBoxLines();
        if (mid.length > 0) box(mid, ey - (mid.length * lh + 6) / 2, POSITION_CENTER_FILL);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    /** Paint a linear-regression channel: the two shaded bands (mid→upper, mid→lower), the three
     *  lines (upper/mid/lower, each with its own color + dash), and the R² readout at the start. */
    private paintRegressionChannel(ctx: CanvasRenderingContext2D, d: RegressionChannel, proj: Projector, theme: VelaTheme): void {
        const L = d.layout(proj);
        if (!L) return;
        const s = d.reg;
        const quad = (color: string, y0: number, y1: number, yy0: number, yy1: number): void => {
            ctx.save();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(L.x0, y0);
            ctx.lineTo(L.x1, y1);
            ctx.lineTo(L.x1, yy1);
            ctx.lineTo(L.x0, yy0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        };
        quad(s.upperFill, L.midY0, L.midY1, L.upperY0, L.upperY1); // mid → upper (green by default)
        quad(s.lowerFill, L.midY0, L.midY1, L.lowerY0, L.lowerY1); // mid → lower (red by default)
        const line = (color: string, lineStyle: RegressionChannel['reg']['midStyle'], y0: number, y1: number): void =>
            this.stroke(ctx, { lineColor: color, lineWidth: d.style.lineWidth, lineStyle }, () => {
                ctx.moveTo(L.x0, y0);
                ctx.lineTo(L.x1, y1);
            });
        line(s.upperColor, s.upperStyle, L.upperY0, L.upperY1);
        line(s.lowerColor, s.lowerStyle, L.lowerY0, L.lowerY1);
        line(s.midColor, s.midStyle, L.midY0, L.midY1);
        if (L.showR2) {
            const txt = `R² ${Math.round(L.r2 * 100)}%`;
            ctx.font = `11px ${theme.fontFamily}`;
            const tw = ctx.measureText(txt).width;
            const pad = 5;
            const gap = 4;
            const boxW = tw + pad * 2;
            const bx = L.x0 - gap - boxW; // badge sits left of the channel start, not inside it
            const by = L.midY0 - 9;
            ctx.save();
            ctx.globalAlpha = 0.9 * ctx.globalAlpha;
            roundRect(ctx, bx, by - 8, boxW, 16, 3);
        ctx.fillStyle = BADGE_FILL;
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = theme.textColor;
        ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(txt, bx + pad, by);
            ctx.textBaseline = 'alphabetic';
        }
    }

    /** Placement preview for the magnifier: a dashed rectangle outline only — no backdrop and
     *  no series read, so dragging the area open never kicks a fetch per cursor move. */
    private paintMagnifierGhost(ctx: CanvasRenderingContext2D, d: Magnifier, proj: Projector, theme: VelaTheme): void {
        const r = d.rect(proj);
        if (!r) return;
        ctx.save();
        ctx.strokeStyle = d.style.lineColor || contrastColor(theme.background);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(Math.min(r.x1, r.x2), Math.min(r.y1, r.y2), Math.abs(r.x2 - r.x1), Math.abs(r.y2 - r.y1));
        ctx.restore();
    }

    /** Paint a magnifier: an opaque theme-background inset whose interior shows the chart's
     *  market at a finer timeframe — candles at their true time/price positions, clipped to
     *  the rectangle. Bars come through `Projector.seriesInRange` (cache read; `loading` and
     *  `unavailable` states paint a short notice instead). The lower-timeframe candles shift
     *  half a chart bar LEFT of their raw time pixel so each chart candle's visual cell —
     *  centered on its open time — subdivides in place. */
    private paintMagnifier(ctx: CanvasRenderingContext2D, d: Magnifier, proj: Projector, theme: VelaTheme): void {
        const r = d.rect(proj);
        const a = d.anchors[0];
        const b = d.anchors[1];
        if (!r || !a || !b) return;
        const x0 = Math.min(r.x1, r.x2);
        const x1 = Math.max(r.x1, r.x2);
        const y0 = Math.min(r.y1, r.y2);
        const y1 = Math.max(r.y1, r.y2);
        const w = x1 - x0;
        const h = y1 - y0;

        // Opaque backdrop: the finer candles must read on their own, not blend over the base ones.
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = theme.background;
        ctx.fillRect(x0, y0, w, h);
        ctx.restore();

        const from = Math.min(a.time, b.time);
        const to = Math.max(a.time, b.time);
        // One chart bar in ms, recovered through the projector (drawings know no bar pitch).
        const chartBars = proj.barsBetween ? proj.barsBetween(from, to) : 0;
        const chartMs = chartBars > 0 ? (to - from) / chartBars : 0;
        // The request extends one chart bar right: the half-pitch left shift below pulls
        // bars from just past the right edge INTO the rectangle.
        const res =
            proj.seriesInRange && chartMs > 0 && w > 1 && h > 1
                ? proj.seriesInRange(d.magnifier.timeframe, from, to + chartMs)
                : undefined;

        // `loading` may carry best-effort partial bars (previously fetched overlapping
        // windows) — paint them so a resize keeps its content while the widened fetch runs.
        let seriesBars = res?.state === 'ready' || res?.state === 'loading' ? (res.bars ?? []) : [];
        if (res && (res.state === 'ready' || res.state === 'loading') && seriesBars.length > 0) {
            // The inset mirrors the CHART's series look: bar-transform styles (Heikin Ashi,
            // and any registered type that declares one) transform the raw fetched bars;
            // line/area/bars restyle the paint; unknown/custom styles fall back to candles.
            // Colors default to the main series' own; a user-picked color wins.
            const look = this.seriesLook;
            const transform = look.style !== 'candles' ? barTransformFor(look.style) : null;
            if (transform) seriesBars = transform.full(seriesBars as readonly OHLCV[]);
            const mode: 'candles' | 'bars' | 'line' | 'area' =
                look.style === 'bars' ? 'bars' : look.style === 'line' || look.style === 'baseline' ? 'line' : look.style === 'area' ? 'area' : 'candles';
            const halfPitch = (proj.xOf(from + chartMs) - proj.xOf(from)) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x0, y0, w, h);
            ctx.clip();
            if (mode === 'line' || mode === 'area') {
                this.paintMagnifierLine(ctx, d, proj, seriesBars, res.barMs, halfPitch, y1, mode === 'area', d.magnifier.upColor || look.lineColor);
            } else {
                this.paintMagnifierBars(ctx, d, proj, seriesBars, res.barMs, halfPitch, x0, x1, mode, d.magnifier.upColor || look.upColor, d.magnifier.downColor || look.downColor);
            }
            ctx.restore();
        } else if (res) {
            const notice =
                res.state === 'loading'
                    ? 'Loading…'
                    : res.state === 'ready'
                      ? 'No lower-timeframe data'
                      : res.reason === 'too-wide'
                        ? 'Area too wide for this timeframe'
                        : res.reason === 'none-lower'
                          ? 'No lower timeframe available'
                          : res.reason === 'not-lower'
                            ? 'Pick a timeframe below the chart'
                            : 'No data source';
            this.paintMagnifierNotice(ctx, notice, x0, y0, w, h, theme);
        }

        // Border on top of the inset content. An unset border color means the theme's
        // contrast ink (white on dark, black on light), resolved per paint so it follows
        // theme switches live — a user-picked color always wins.
        ctx.save();
        ctx.strokeStyle = d.style.lineColor || contrastColor(theme.background);
        ctx.lineWidth = d.style.lineWidth || 1;
        ctx.setLineDash(dashPattern(d.style.lineStyle, d.style.lineWidth || 1));
        ctx.strokeRect(x0, y0, w, h);
        ctx.restore();

        // Timeframe chip: OUTSIDE the inset, riding the bottom-left corner (inside the
        // bottom edge only when the rectangle touches the pane's bottom and there is no room
        // below). Chart-background fill so it reads as chrome, not as data. The chip is a
        // live dropdown trigger — a caret marks it clickable, and its painted rect is stored
        // on the drawing for the interaction layer to hit-test.
        if (w > 44) {
            const label = magnifierTimeframeLabel(res?.state === 'ready' || res?.state === 'loading' ? res.timeframe : d.magnifier.timeframe);
            const chipH = 17;
            const gap = 4;
            const pane = proj.paneRect?.(d.paneId);
            const paneBottom = pane ? pane.top + pane.height : proj.height;
            const below = y1 + gap + chipH <= paneBottom;
            const chipY = below ? y1 + gap : y1 - gap - chipH;
            ctx.save();
            ctx.font = `10px ${theme.fontFamily}`;
            const tw = ctx.measureText(label).width;
            const caretW = 11; // room for the dropdown caret after the label
            const chipW = tw + 12 + caretW;
            roundRect(ctx, x0, chipY, chipW, chipH, 3);
            ctx.fillStyle = theme.background;
            ctx.fill();
            ctx.strokeStyle = withAlpha(theme.textColor, 0.28);
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.stroke();
            ctx.fillStyle = theme.textColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x0 + 6, chipY + chipH / 2 + 0.5);
            // Caret: a small ∨ chevron marking the chip as a dropdown.
            const cxr = x0 + 6 + tw + 5;
            const cyr = chipY + chipH / 2;
            ctx.strokeStyle = withAlpha(theme.textColor, 0.7);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cxr, cyr - 1.5);
            ctx.lineTo(cxr + 2.5, cyr + 1.5);
            ctx.lineTo(cxr + 5, cyr - 1.5);
            ctx.stroke();
            ctx.restore();
            d.chipRect = { x: x0, y: chipY, w: chipW, h: chipH };
        } else {
            d.chipRect = null;
        }
    }

    /** The magnifier's candle/bar loop: each bar's cell spans its open→close time (shifted left
     *  by half a chart bar). Candles: wick always, body once the cell is wide enough to carry
     *  one. OHLC bars: the high–low spine with open/close ticks once the cell has the room. */
    private paintMagnifierBars(
        ctx: CanvasRenderingContext2D,
        d: Magnifier,
        proj: Projector,
        bars: ReadonlyArray<{ time: number; open: number; high: number; low: number; close: number }>,
        barMs: number,
        halfPitch: number,
        x0: number,
        x1: number,
        mode: 'candles' | 'bars',
        upColor: string,
        downColor: string,
    ): void {
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        for (const bar of bars) {
            const cx0 = proj.xOf(bar.time) - halfPitch;
            const cx1 = proj.xOf(bar.time + barMs) - halfPitch;
            if (cx1 < x0 || cx0 > x1) continue;
            const yHigh = proj.yOf(bar.high, d.paneId);
            const yLow = proj.yOf(bar.low, d.paneId);
            const yOpen = proj.yOf(bar.open, d.paneId);
            const yClose = proj.yOf(bar.close, d.paneId);
            if (yHigh == null || yLow == null || yOpen == null || yClose == null) continue;
            const color = bar.close >= bar.open ? upColor : downColor;
            const cellW = cx1 - cx0;
            const cx = (cx0 + cx1) / 2;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(cx, yHigh);
            ctx.lineTo(cx, yLow);
            ctx.stroke();
            if (cellW < 3) continue; // too narrow for a body / ticks — the spine carries the bar
            if (mode === 'bars') {
                const tick = Math.max(1, cellW * 0.35);
                ctx.beginPath();
                ctx.moveTo(cx - tick, yOpen);
                ctx.lineTo(cx, yOpen);
                ctx.moveTo(cx, yClose);
                ctx.lineTo(cx + tick, yClose);
                ctx.stroke();
            } else {
                const bw = Math.max(1, cellW * 0.7);
                ctx.fillStyle = color;
                ctx.fillRect(cx - bw / 2, Math.min(yOpen, yClose), bw, Math.max(1, Math.abs(yClose - yOpen)));
            }
        }
    }

    /** The magnifier's line/area rendering: a close polyline through each cell's center (same
     *  half-chart-bar shift as the candles), with an optional translucent fill down to the
     *  rectangle's bottom edge for the area style. Colored like the chart's own line series. */
    private paintMagnifierLine(
        ctx: CanvasRenderingContext2D,
        d: Magnifier,
        proj: Projector,
        bars: ReadonlyArray<{ time: number; close: number }>,
        barMs: number,
        halfPitch: number,
        yBottom: number,
        area: boolean,
        color: string,
    ): void {
        const pts: Array<[number, number]> = [];
        for (const bar of bars) {
            const y = proj.yOf(bar.close, d.paneId);
            if (y == null) continue;
            pts.push([proj.xOf(bar.time + barMs / 2) - halfPitch, y]);
        }
        if (pts.length < 2) return;
        if (area) {
            ctx.beginPath();
            ctx.moveTo(pts[0]![0], yBottom);
            for (const [px, py] of pts) ctx.lineTo(px, py);
            ctx.lineTo(pts[pts.length - 1]![0], yBottom);
            ctx.closePath();
            ctx.fillStyle = withAlpha(color, 0.15);
            ctx.fill();
        }
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]![0], pts[i]![1]);
        ctx.stroke();
    }

    /** Centered muted notice inside the magnifier rect (loading / unavailable states). */
    private paintMagnifierNotice(
        ctx: CanvasRenderingContext2D,
        text: string,
        x0: number,
        y0: number,
        w: number,
        h: number,
        theme: VelaTheme,
    ): void {
        if (w < 60 || h < 20) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, w, h);
        ctx.clip();
        ctx.font = `11px ${theme.fontFamily}`;
        ctx.fillStyle = withAlpha(theme.textColor, 0.55);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x0 + w / 2, y0 + h / 2);
        ctx.restore();
    }

    /** A bottom-center pill prompting the armed tool's placement gesture (e.g. the magnifier's
     *  "drag an area"). Painted by the drawings layer while the tool is armed and no placement
     *  is in progress; chart-background fill so it reads as chrome over any content. */
    paintPlacementHint(ctx: CanvasRenderingContext2D, text: string, theme: VelaTheme, width: number, height: number): void {
        ctx.save();
        ctx.font = `11px ${theme.fontFamily}`;
        const tw = ctx.measureText(text).width;
        const pillW = tw + 24;
        const pillH = 24;
        const x = (width - pillW) / 2;
        const y = height - pillH - 14;
        roundRect(ctx, x, y, pillW, pillH, pillH / 2);
        ctx.fillStyle = theme.background;
        ctx.fill();
        ctx.strokeStyle = withAlpha(theme.textColor, 0.28);
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.fillStyle = theme.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, y + pillH / 2 + 0.5);
        ctx.restore();
    }

    /** Paint a fixed-range volume profile: horizontal histogram rows (up/down split) anchored to
     *  the left or right of the time span, optional VAH / VAL / POC levels across the range, and
     *  optional developing POC / VA polylines. Recomputes from the two anchors on every paint. */
    private paintFixedRangeVp(ctx: CanvasRenderingContext2D, d: FixedRangeVolumeProfile, proj: Projector, theme: VelaTheme): void {
        const L = d.layout(proj);
        if (!L) return;
        const s = d.frvp;
        const { profile, maxW, anchorX, grow, yEdges } = L;
        if (profile.maxTotal <= 0 || maxW <= 0) return;

        for (let k = 0; k < profile.rows.length; k += 1) {
            const row = profile.rows[k]!;
            const total = row.up + row.down;
            if (total <= 0) continue;
            // yEdges[k] = lower price bound; canvas y grows downward so the top edge is the higher index.
            const yA = yEdges[k]!;
            const yB = yEdges[k + 1]!;
            const yTop = Math.min(yA, yB);
            const h = profileRowHeight(Math.abs(yB - yA));
            const w = (total / profile.maxTotal) * maxW;
            const upW = (row.up / total) * w;
            const inVa = k >= profile.vaFrom && k <= profile.vaTo;
            const upColor = inVa ? s.vaUpColor : s.upColor;
            const downColor = inVa ? s.vaDownColor : s.downColor;
            const x0 = grow === 1 ? anchorX : anchorX - w;
            if (upW > 0) {
                ctx.fillStyle = upColor;
                ctx.fillRect(x0, yTop, upW, h);
            }
            if (w - upW > 0) {
                ctx.fillStyle = downColor;
                ctx.fillRect(x0 + upW, yTop, w - upW, h);
            }
        }

        const w = d.style.lineWidth;
        const hLine = (show: boolean, color: string, style: DrawingStyle['lineStyle'], y: number | null): void => {
            if (!show || y == null || isTransparent(color)) return;
            this.stroke(ctx, { lineColor: color, lineWidth: w, lineStyle: style }, () => {
                ctx.moveTo(L.x0, y);
                ctx.lineTo(L.x1, y);
            });
        };
        hLine(s.showVah, s.vahColor, s.vahStyle, L.vahY);
        hLine(s.showVal, s.valColor, s.valStyle, L.valY);
        // No explicit POC ink ⇒ the theme's contrast color, resolved per paint so the line
        // follows theme switches live (white on dark, black on light).
        hLine(s.showPoc, s.pocColor ?? contrastColor(theme.background), s.pocStyle, L.pocY);

        // Developing levels sit on top of the histogram so they stay readable.
        const devW = Math.max(1, w);
        if (s.showDevelopingPoc) {
            this.strokePolyline(ctx, L.developingPoc, {
                lineColor: s.developingPocColor,
                lineWidth: devW,
                lineStyle: s.developingPocStyle,
            });
        }
        if (s.showDevelopingVa) {
            const devStyle = { lineColor: s.developingVaColor, lineWidth: devW, lineStyle: s.developingVaStyle };
            this.strokePolyline(ctx, L.developingVaHigh, devStyle);
            this.strokePolyline(ctx, L.developingVaLow, devStyle);
        }
    }

    /** Paint a fixed-range TPO profile: one letter per period stacked left-to-right in every price
     *  row the period traded through (or solid blocks when the rows / letters get too small), the
     *  value-area rows in their own color, and VAH / VAL / POC lines across the range. */
    private paintFixedRangeTpo(ctx: CanvasRenderingContext2D, d: FixedRangeTpoProfile, proj: Projector, theme: VelaTheme): void {
        const L = d.layout(proj);
        if (!L) return;
        const s = d.frtpo;
        const { profile, maxW, anchorX, grow, yEdges } = L;
        if (profile.maxCount <= 0 || maxW <= 0) return;

        const rowPx = Math.abs(yEdges[1]! - yEdges[0]!);
        const pocInk = s.pocColor ?? contrastColor(theme.background);

        // Letters need a cell wide enough for the widest glyph in EVERY row, so the font shrinks
        // until the fullest row fits the width; below a legible size (or when the rows are too
        // short) the profile falls back to solid blocks.
        let fontPx = Math.min(12, Math.floor(rowPx) - 1);
        let cellW = 0;
        if (s.display === 'letters' && fontPx >= 7) {
            ctx.font = `${fontPx}px ${theme.fontFamily}`;
            const em = ctx.measureText('W').width / fontPx;
            fontPx = Math.min(fontPx, Math.floor(maxW / profile.maxCount / em));
            if (fontPx >= 7) cellW = em * fontPx;
        }
        const asLetters = cellW > 0;

        ctx.save();
        if (asLetters) {
            ctx.font = `${fontPx}px ${theme.fontFamily}`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
        }
        for (let k = 0; k < profile.rows.length; k += 1) {
            const row = profile.rows[k]!;
            const n = row.periods.length;
            if (n <= 0) continue;
            const yTop = Math.min(yEdges[k]!, yEdges[k + 1]!);
            const h = profileRowHeight(Math.abs(yEdges[k + 1]! - yEdges[k]!));
            const inVa = k >= profile.vaFrom && k <= profile.vaTo;
            ctx.fillStyle = k === profile.poc && s.showPoc ? pocInk : inVa ? s.vaColor : s.color;
            if (asLetters) {
                for (let j = 0; j < n; j += 1) {
                    const x = grow === 1 ? anchorX + (j + 0.5) * cellW : anchorX - (j + 0.5) * cellW;
                    ctx.fillText(tpoLetter(row.periods[j]!), x, yTop + h / 2);
                }
            } else {
                const w = (n / profile.maxCount) * maxW;
                ctx.fillRect(grow === 1 ? anchorX : anchorX - w, yTop, w, h);
            }
        }
        ctx.restore();

        const w = d.style.lineWidth;
        const hLine = (show: boolean, color: string, style: DrawingStyle['lineStyle'], y: number | null): void => {
            if (!show || y == null || isTransparent(color)) return;
            this.stroke(ctx, { lineColor: color, lineWidth: w, lineStyle: style }, () => {
                ctx.moveTo(L.x0, y);
                ctx.lineTo(L.x1, y);
            });
        };
        hLine(s.showVah, s.vahColor, s.vahStyle, L.vahY);
        hLine(s.showVal, s.valColor, s.valStyle, L.valY);
        hLine(s.showPoc, pocInk, s.pocStyle, L.pocY);
    }

    /** Paint an anchored VWAP: the shaded band between the upper/lower σ curves, the two band
     *  edges (transparent by default), then the VWAP midline on top. All three are polylines that
     *  recompute from the anchor time forward, so the shape follows the bars live. */
    private paintAnchoredVwap(ctx: CanvasRenderingContext2D, d: AnchoredVwap, proj: Projector): void {
        const L = d.layout(proj);
        if (!L) return;
        const s = d.vwap;
        const w = d.style.lineWidth;
        if (L.upper.length >= 2 && s.bandFill) {
            ctx.save();
            ctx.fillStyle = s.bandFill; // opacity lives in the fill color's own alpha
            ctx.beginPath();
            ctx.moveTo(L.upper[0]![0], L.upper[0]![1]);
            for (let i = 1; i < L.upper.length; i += 1) ctx.lineTo(L.upper[i]![0], L.upper[i]![1]);
            for (let i = L.lower.length - 1; i >= 0; i -= 1) ctx.lineTo(L.lower[i]![0], L.lower[i]![1]);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        this.strokePolyline(ctx, L.upper, { lineColor: s.upperColor, lineWidth: w, lineStyle: s.upperStyle });
        this.strokePolyline(ctx, L.lower, { lineColor: s.lowerColor, lineWidth: w, lineStyle: s.lowerStyle });
        this.strokePolyline(ctx, L.mid, { lineColor: s.midColor, lineWidth: w, lineStyle: s.midStyle });
    }

    /** Stroke a connected polyline with a line style (dash + width + color). Skips fully-transparent
     *  colors so the default (hidden) band edges cost nothing. */
    private strokePolyline(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<[number, number]>, style: DrawingStyle): void {
        if (pts.length < 2 || isTransparent(style.lineColor)) return;
        this.stroke(ctx, style, () => {
            ctx.moveTo(pts[0]![0], pts[0]![1]);
            for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]![0], pts[i]![1]);
        });
    }

    /** Paint a callout as a speech bubble: a rounded text box with a tapered triangular tail
     *  flush on the box edge facing the target, its apex at the target point. */
    private paintCallout(ctx: CanvasRenderingContext2D, d: Callout, proj: Projector, theme: VelaTheme): void {
        this.paintBubble(ctx, d, proj, theme, 5); // squared-off corners
    }

    /** TradingView's comment: a rounded bubble standing on its point, the bottom-left corner the sharp tip on it.
     *  An old two-point comment keeps its balloon with a tail. */
    private paintComment(ctx: CanvasRenderingContext2D, d: Comment, proj: Projector, theme: VelaTheme): void {
        if (d.tailed) {
            this.paintBubble(ctx, d, proj, theme, 999); // clamped to min(w,h)/2 → a rounded balloon
            return;
        }
        const p = d.points(proj);
        if (!p) return;
        const [ax, ay] = p[0];
        const { lines, tw, lh } = this.measureText(ctx, d, theme, 'Comment');
        const padX = 14;
        const padY = 10;
        const w = tw + padX * 2;
        const h = lines.length * lh + padY * 2;
        const x = ax;
        const y = ay - h;
        const r = Math.min(h / 2, 18);
        const path = (): void => {
            ctx.beginPath();
            ctx.moveTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.arcTo(x + w, y, x + w, y + r, r);
            ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x, y + h); // the sharp tip on the point
            ctx.closePath();
        };
        const fill = effectiveFillColor(d, theme) ?? d.style.lineColor;
        ctx.save();
        ctx.fillStyle = fill;
        path();
        ctx.fill();
        ctx.restore();
        if (d.style.lineColor && d.style.lineColor !== fill) {
            this.applyStroke(ctx, d.style);
            path();
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.fillStyle = d.text?.color ?? contrastColor(fill);
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        lines.forEach((line, i) => ctx.fillText(line, x + padX, y + padY + i * lh));
    }

    private paintBubble(ctx: CanvasRenderingContext2D, d: CalloutBase, proj: Projector, theme: VelaTheme, maxRadius: number): void {
        const p = d.points(proj);
        if (!p) return;
        const tx = p[0][0];
        const ty = p[0][1];
        const cx = p[1][0];
        const cy = p[1][1];
        const text = d.text;
        const fs = namedFontSize(text?.size ?? 'normal');
        ctx.font = `${text?.bold ? 'bold ' : ''}${text?.italic ? 'italic ' : ''}${fs}px ${theme.fontFamily}`;
        const lines = (text?.value ?? '').split('\n');
        const tw = Math.max(8, ...lines.map((l) => ctx.measureText(l).width));
        const padX = 9;
        const padY = 6;
        const lh = labelLineHeight(fs);
        const w = tw + padX * 2;
        const h = lines.length * lh + padY * 2;
        const x = cx - w / 2;
        const y = cy - h / 2;
        const hw = w / 2;
        const hh = h / 2;
        const dx = tx - cx;
        const dy = ty - cy;
        const r = Math.min(maxRadius, w / 2, h / 2);

        // The tail: which box edge it exits, where along that edge, and its apex at the target —
        // only when the target is outside the box.
        let tail: { edge: 'top' | 'right' | 'bottom' | 'left'; at: number; apex: [number, number]; half: number } | null = null;
        if (Math.abs(dx) > hw || Math.abs(dy) > hh) {
            const half = Math.max(6, Math.min(w, h) * 0.18);
            if (Math.abs(dx) / hw >= Math.abs(dy) / hh) {
                const ex = dx > 0 ? x + w : x;
                const at = Math.max(y + r + half, Math.min(y + h - r - half, cy + (dy * (ex - cx)) / (dx || 1)));
                tail = { edge: dx > 0 ? 'right' : 'left', at, apex: [tx, ty], half };
            } else {
                const ey = dy > 0 ? y + h : y;
                const at = Math.max(x + r + half, Math.min(x + w - r - half, cx + (dx * (ey - cy)) / (dy || 1)));
                tail = { edge: dy > 0 ? 'bottom' : 'top', at, apex: [tx, ty], half };
            }
        }

        // One continuous outline for the box + tail, so the border never crosses the tail base
        // (the pointer side is "open" — the path detours out to the apex and back).
        ctx.save();
        ctx.fillStyle = effectiveFillColor(d, theme) ?? theme.background; // alpha lives in the fill color itself
        calloutBubblePath(ctx, x, y, w, h, r, tail);
        ctx.fill();
        ctx.restore();
        this.applyStroke(ctx, d.style);
        calloutBubblePath(ctx, x, y, w, h, r, tail);
        ctx.stroke();
        ctx.setLineDash([]);

        // No explicit ink ⇒ auto-contrast against the plate the text actually sits on
        // (the safety net for documents that predate the creation-time ink fixation).
        ctx.fillStyle = text?.color ?? contrastColor(effectiveFillColor(d, theme) ?? theme.background);
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        lines.forEach((line, i) => ctx.fillText(line, x + padX, y + padY + i * lh));
    }

    /** Shared text-box body for the note/signpost plates: a rounded filled+stroked rect with
     *  multi-line text, anchored at (x, y) top-left. Returns nothing. */
    private paintTextPlate(ctx: CanvasRenderingContext2D, d: Drawing, theme: VelaTheme, x: number, y: number, w: number, h: number, lines: string[], lh: number, padX: number, padY: number): void {
        ctx.save();
        ctx.fillStyle = effectiveFillColor(d, theme) ?? theme.background;
        roundRect(ctx, x, y, w, h, 5);
        ctx.fill();
        ctx.restore();
        this.applyStroke(ctx, d.style);
        roundRect(ctx, x, y, w, h, 5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = d.text?.color ?? contrastColor(effectiveFillColor(d, theme) ?? theme.background);
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        lines.forEach((line, i) => ctx.fillText(line, x + padX, y + padY + i * lh));
    }

    /** Measure a drawing's text into wrapped lines + a box size at its named font. */
    private measureText(ctx: CanvasRenderingContext2D, d: Drawing, theme: VelaTheme, fallback: string): { lines: string[]; tw: number; fs: number; lh: number } {
        const text = d.text;
        const fs = namedFontSize(text?.size ?? 'normal');
        ctx.font = `${text?.bold ? 'bold ' : ''}${text?.italic ? 'italic ' : ''}${fs}px ${theme.fontFamily}`;
        const lines = (text?.value || fallback).split('\n');
        const tw = Math.max(8, ...lines.map((l) => ctx.measureText(l).width));
        return { lines, tw, fs, lh: labelLineHeight(fs) };
    }

    /** TradingView's note: a map pin with its tip on the point; the text shows in a plate above the pin while it is
     *  hovered or selected (or always, with `showText`). */
    private paintNote(ctx: CanvasRenderingContext2D, d: Note, proj: Projector, theme: VelaTheme): void {
        const pts = d.handlePoints(proj);
        if (!pts.length) return;
        const [ax, ay] = pts[0]!;
        const ink = d.style.lineColor || theme.textColor;
        const { r, h } = NOTE_PIN;
        const cy = ay - h + r; // the head's centre
        ctx.save();
        ctx.setLineDash([]);
        ctx.beginPath();
        // The head's circle, closed by two tangents meeting at the tip.
        const tipD = ay - cy;
        const half = Math.acos(r / tipD);
        ctx.arc(ax, cy, r, Math.PI / 2 + half, Math.PI / 2 - half);
        ctx.lineTo(ax, ay);
        ctx.closePath();
        ctx.fillStyle = ink;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ax, cy, r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = theme.background;
        ctx.fill();
        ctx.restore();
        if (!d.showText && !handleIdsFor(this.targets).has(d.id)) return;
        const { lines, tw, lh } = this.measureText(ctx, d, theme, 'Note');
        const padX = 10;
        const padY = 7;
        const w = tw + padX * 2;
        const bh = lines.length * lh + padY * 2;
        this.paintTextPlate(ctx, d, theme, ax - w / 2, ay - h - 6 - bh, w, bh, lines, lh, padX, padY);
    }

    /** A Price Note: a box joined to the pinned point by a leader + a dot, showing that point's
     *  auto-formatted price (not free text). */
    private paintPriceNote(ctx: CanvasRenderingContext2D, d: PriceNote, proj: Projector, theme: VelaTheme): void {
        const p = d.points(proj);
        const a = d.anchors[0];
        if (!p || !a) return;
        const [tx, ty] = p[0];
        const [cx, cy] = p[1];
        const priceStr = formatPriceTag(a.price);
        const text = d.text;
        const fs = namedFontSize(text?.size ?? 'normal');
        ctx.font = `${text?.bold ? 'bold ' : ''}${text?.italic ? 'italic ' : ''}${fs}px ${theme.fontFamily}`;
        const padX = 9;
        const padY = 6;
        const w = ctx.measureText(priceStr).width + padX * 2;
        const h = labelLineHeight(fs) + padY * 2;
        const x = cx - w / 2;
        const y = cy - h / 2;
        this.stroke(ctx, d.style, () => {
            ctx.moveTo(tx, ty);
            ctx.lineTo(cx, cy);
        });
        ctx.fillStyle = d.style.lineColor;
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.fillStyle = effectiveFillColor(d, theme) ?? theme.background;
        roundRect(ctx, x, y, w, h, 5);
        ctx.fill();
        ctx.restore();
        this.applyStroke(ctx, d.style);
        roundRect(ctx, x, y, w, h, 5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = text?.color ?? contrastColor(effectiveFillColor(d, theme) ?? theme.background);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(priceStr, cx, cy + 0.5);
    }

    /** TradingView's signpost: a thin pole from the bar up (or down) to a round badge with a flag, its label in a plate
     *  above the badge. */
    private paintSignpost(ctx: CanvasRenderingContext2D, d: Signpost, proj: Projector, theme: VelaTheme): void {
        const p = d.points(proj);
        if (!p) return;
        const [bx, by] = p[0];
        const [sx, sy] = p[1];
        const ink = d.style.lineColor || theme.textColor;
        const R = SIGNPOST_R;
        if (Math.abs(sy - by) > R) {
            this.stroke(ctx, { ...d.style, lineWidth: 1 }, () => {
                ctx.moveTo(bx, by);
                ctx.lineTo(sx, sy + (by > sy ? R : -R));
            });
        }
        ctx.save();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(sx, sy, R, 0, Math.PI * 2);
        ctx.fillStyle = ink;
        ctx.fill();
        // The flag: a pole and a pennant, in the badge's contrast ink.
        const fg = contrastColor(ink);
        ctx.strokeStyle = fg;
        ctx.fillStyle = fg;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx - 4.5, sy + 7);
        ctx.lineTo(sx - 4.5, sy - 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - 4.5, sy - 7);
        ctx.lineTo(sx + 6, sy - 3.5);
        ctx.lineTo(sx - 4.5, sy);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (!d.text?.value) return;
        const { lines, tw, lh } = this.measureText(ctx, d, theme, '');
        const padX = 9;
        const padY = 5;
        const w = tw + padX * 2;
        const h = lines.length * lh + padY * 2;
        this.paintTextPlate(ctx, d, theme, sx - w / 2, sy - R - 6 - h, w, h, lines, lh, padX, padY);
    }

    /** A price alert: dashed stub + ring at the plot edge, a chip with the price on the axis, and
     *  (when hovered/selected/dragged) a pill with the condition text and a trash button. */
    private paintPriceAlert(ctx: CanvasRenderingContext2D, d: PriceAlert, proj: Projector, theme: VelaTheme): void {
        const a = d.anchors[0];
        const y = a ? proj.yOf(a.price, d.paneId) : null;
        d.pillRect = null;
        d.trashRect = null;
        if (!a || y == null) return;
        const W = proj.width;
        const ink = d.style.lineColor || theme.textColor;
        const engaged = handleIdsFor(this.targets).has(d.id);
        ctx.save();
        ctx.globalAlpha *= d.alert.active ? 1 : 0.5;
        // dashed stub + solid dot with a background halo (reads on any candle behind it)
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(W - ALERT_STUB_PX, y + 0.5);
        ctx.lineTo(W - 10, y + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(W - 6, y + 0.5, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = theme.background;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(W - 6, y + 0.5, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = ink;
        ctx.fill();
        // axis chip: solid, price only, in the axis format and face (reads like the scale beside it)
        const priceStr = this.axisLabel?.(d.paneId, a.price)?.text || formatPriceTag(a.price);
        const cy = this.axisChipY.get(d.id) ?? y; // moved off the current-price label / another chip
        this.paintAxisChip(ctx, d, cy, proj, theme, ink);
        // hover pill: [bell] label  price | [trash]
        if (engaged) {
            const label = d.alert.label;
            const padL = 10;
            const bellW = 14;
            const gap = 7;
            ctx.font = `500 12px ${theme.fontFamily}`;
            const lw = label ? ctx.measureText(label).width : 0;
            ctx.font = `700 12px ${theme.fontFamily}`;
            const pwTxt = ctx.measureText(priceStr).width;
            const trashW = 30;
            const pw = padL + bellW + gap + (label ? lw + gap : 0) + pwTxt + 8 + trashW;
            const ph = 28;
            const px = W - ALERT_STUB_PX - pw; // flush with the stub: the tag sits ON the level (TradingView)
            const py = y + 0.5 - ph / 2;
            const my = py + ph / 2;
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 2;
            roundRect(ctx, px, py, pw, ph, 7);
            ctx.fillStyle = theme.background;
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha *= 0.9;
            ctx.strokeStyle = ink;
            ctx.lineWidth = 1;
            roundRect(ctx, px + 0.5, py + 0.5, pw - 1, ph - 1, 7);
            ctx.stroke();
            ctx.globalAlpha /= 0.9;
            // bell
            const bx = px + padL;
            ctx.strokeStyle = ink;
            ctx.lineWidth = 1.3;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(bx + 2.5, my + 3.5);
            ctx.lineTo(bx + 11.5, my + 3.5);
            ctx.lineTo(bx + 10.3, my + 1.6);
            ctx.lineTo(bx + 10.3, my - 1.6);
            ctx.arc(bx + 7, my - 1.6, 3.3, 0, Math.PI, true);
            ctx.lineTo(bx + 3.7, my + 1.6);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bx + 5.8, my + 5.6);
            ctx.lineTo(bx + 8.2, my + 5.6);
            ctx.stroke();
            // text
            let tx = bx + bellW + gap;
            ctx.fillStyle = ink;
            if (label) {
                ctx.font = `500 12px ${theme.fontFamily}`;
                ctx.globalAlpha *= 0.75;
                ctx.fillText(label, tx, my + 0.5);
                ctx.globalAlpha /= 0.75;
                tx += lw + gap;
            }
            ctx.font = `700 12px ${theme.fontFamily}`;
            ctx.fillText(priceStr, tx, my + 0.5);
            // divider + trash
            const dx = px + pw - trashW;
            ctx.globalAlpha *= 0.35;
            ctx.beginPath();
            ctx.moveTo(dx + 0.5, py + 6);
            ctx.lineTo(dx + 0.5, py + ph - 6);
            ctx.stroke();
            ctx.globalAlpha /= 0.35;
            const cx = dx + trashW / 2;
            ctx.beginPath();
            ctx.moveTo(cx - 5, my - 3);
            ctx.lineTo(cx + 5, my - 3);
            ctx.moveTo(cx - 1.8, my - 3);
            ctx.lineTo(cx - 1.8, my - 5);
            ctx.lineTo(cx + 1.8, my - 5);
            ctx.lineTo(cx + 1.8, my - 3);
            ctx.moveTo(cx - 3.6, my - 3);
            ctx.lineTo(cx - 3, my + 5);
            ctx.lineTo(cx + 3, my + 5);
            ctx.lineTo(cx + 3.6, my - 3);
            ctx.stroke();
            // Hit area = pill + the stub to the plot edge, so the pointer can travel from the dot
            // to the trash button without losing the hover.
            d.pillRect = { x: px, y: py, w: W - px, h: ph };
            d.trashRect = { x: dx, y: py, w: trashW, h: ph };
        }
        ctx.restore();
    }

    /** A Price Label: a left-pointing tag at the anchor showing the auto-formatted price. */
    private paintPriceLabel(ctx: CanvasRenderingContext2D, d: PriceLabel, proj: Projector, theme: VelaTheme): void {
        const pts = d.handlePoints(proj);
        const a = d.anchors[0];
        if (!pts.length || !a) return;
        const [ax, ay] = pts[0]!;
        const priceStr = formatPriceTag(a.price);
        const text = d.text;
        const fs = namedFontSize(text?.size ?? 'normal');
        ctx.font = `${text?.bold ? 'bold ' : ''}${text?.italic ? 'italic ' : ''}${fs}px ${theme.fontFamily}`;
        const tw = ctx.measureText(priceStr).width;
        const padX = 8;
        const padY = 4;
        const ptr = 6; // left pointer width
        const w = tw + padX * 2;
        const h = labelLineHeight(fs) + padY * 2;
        const y = ay - h / 2;
        const fill = effectiveFillColor(d, theme) ?? theme.background;
        ctx.save();
        ctx.fillStyle = fill;
        ctx.beginPath(); // pointer triangle from the anchor pixel
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + ptr, ay - 5);
        ctx.lineTo(ax + ptr, ay + 5);
        ctx.closePath();
        ctx.fill();
        roundRect(ctx, ax + ptr, y, w, h, 4);
        ctx.fill();
        ctx.restore();
        this.applyStroke(ctx, d.style);
        roundRect(ctx, ax + ptr, y, w, h, 4);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = text?.color ?? contrastColor(fill);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(priceStr, ax + ptr + padX, ay + 0.5);
    }

    /** Paint a pattern: optional tinted body triangles, the labelled polyline, an extended
     *  neckline (head & shoulders), and consecutive-leg ratios (harmonic patterns). */
    private paintPattern(ctx: CanvasRenderingContext2D, d: PatternDrawing, proj: Projector, theme: VelaTheme): void {
        const pts = d.handlePoints(proj);
        if (pts.length < 2) return;
        const valid = d.valid(); // harmonic validity (null for plain patterns)
        // shared resolution (so the settings swatch matches): explicit fillColor wins, else the
        // validity tint / line-color wash. The user color carries its own alpha; the wash stays light.
        const fillColor = effectiveFillColor(d, theme) ?? d.style.lineColor;
        const fillAlpha = d.style.fillColor ? 1 : 0.1;
        // Head & shoulders: the outer shoulders close on the neckline where the outer legs cross it.
        const nlFill = d.necklineIndices();
        const neck = (end: 'left' | 'right'): [number, number] | null => {
            if (!nlFill) return null;
            const a = pts[nlFill[0]];
            const b = pts[nlFill[1]];
            const n = pts.length;
            if (!a || !b || n < 2) return null;
            const [p, q] = end === 'left' ? [pts[0]!, pts[1]!] : [pts[n - 2]!, pts[n - 1]!];
            return lineSegmentIntersection(a[0], a[1], b[0], b[1], p[0], p[1], q[0], q[1]);
        };
        const lastIdx = pts.length - 1;
        for (const [i, j, k] of d.fillTriangles()) {
            const a = i === 0 ? (neck('left') ?? pts[i]) : pts[i];
            const b = pts[j];
            const c = k === lastIdx && nlFill ? (neck('right') ?? pts[k]) : pts[k];
            if (!a || !b || !c) continue;
            ctx.save();
            ctx.globalAlpha = fillAlpha * ctx.globalAlpha;
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.lineTo(c[0], c[1]);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        this.stroke(ctx, d.style, () => {
            ctx.moveTo(pts[0]![0], pts[0]![1]);
            for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]![0], pts[i]![1]);
        });
        const nl = d.necklineIndices();
        if (nl) {
            const a = pts[nl[0]];
            const b = pts[nl[1]];
            const n = pts.length;
            if (a && b && n >= 2) {
                // clip the neckline to where it crosses the first (start→LS) and last (RS→end) legs,
                // falling back to the troughs themselves when a leg doesn't reach the neckline.
                const left = lineSegmentIntersection(a[0], a[1], b[0], b[1], pts[0]![0], pts[0]![1], pts[1]![0], pts[1]![1]) ?? a;
                const right = lineSegmentIntersection(a[0], a[1], b[0], b[1], pts[n - 2]![0], pts[n - 2]![1], pts[n - 1]![0], pts[n - 1]![1]) ?? b;
                this.stroke(ctx, { ...d.style, lineStyle: 'dashed' }, () => {
                    ctx.moveTo(left[0], left[1]);
                    ctx.lineTo(right[0], right[1]);
                });
            }
        }
        const labels = d.vertexLabels();
        const plates = d.labelPlates();
        ctx.fillStyle = theme.textColor;
        ctx.font = plates ? `12px ${theme.fontFamily}` : `bold 12px ${theme.fontFamily}`;
        ctx.textAlign = 'center';
        pts.forEach((p, i) => {
            const lbl = labels[i];
            if (!lbl) return;
            const ny = ((pts[i - 1]?.[1] ?? p[1]) + (pts[i + 1]?.[1] ?? p[1])) / 2;
            const above = p[1] <= ny; // a local peak → label above, a trough → below
            ctx.textBaseline = above ? 'bottom' : 'top';
            if (plates) {
                // TradingView's head & shoulders labels: the name on a plate of the line color.
                const w = ctx.measureText(lbl).width + 12;
                const h = 20;
                const y = above ? p[1] - 8 - h : p[1] + 8;
                ctx.save();
                ctx.setLineDash([]);
                roundRect(ctx, p[0] - w / 2, y, w, h, 3);
                ctx.fillStyle = d.style.lineColor || theme.textColor;
                ctx.fill();
                ctx.fillStyle = contrastColor(d.style.lineColor || theme.textColor);
                ctx.textBaseline = 'middle';
                ctx.fillText(lbl, p[0], y + h / 2 + 0.5);
                ctx.restore();
                return;
            }
            ctx.fillText(lbl, p[0], above ? p[1] - 7 : p[1] + 7);
        });
        if (d.legRatios()) {
            ctx.font = `11px ${theme.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            for (let i = 2; i < pts.length; i += 1) {
                const r = d.ratioAt(i);
                const a = pts[i - 1];
                const b = pts[i];
                if (r == null || !a || !b) continue;
                const ok = d.ratioOk(i); // green in-band / red out / theme color when no rule
                ctx.fillStyle = ok === true ? VALID_FILL : ok === false ? INVALID_FILL : theme.textColor;
                ctx.fillText(r.toFixed(3), (a[0] + b[0]) / 2 + 6, (a[1] + b[1]) / 2);
            }
        }
        const name = d.patternName(); // harmonic name + ✓/✗ badge at the completion point (D)
        if (name && pts.length >= 2) {
            const dPt = pts[pts.length - 1]!;
            const prev = pts[pts.length - 2];
            const above = prev ? dPt[1] <= prev[1] : false; // D a peak → label above, else below
            ctx.font = `bold 12px ${theme.fontFamily}`;
            ctx.fillStyle = valid === false ? INVALID_FILL : VALID_FILL;
            ctx.textAlign = 'center';
            ctx.textBaseline = above ? 'bottom' : 'top';
            ctx.fillText(`${name} ${valid ? '✓' : '✗'}`, dPt[0], above ? dPt[1] - 22 : dPt[1] + 22);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    /** Paint a highlighter: the captured path as ONE wide, round-capped translucent swath. Drawing
     *  it as a single continuous stroke (not per-segment) keeps a stroke's overlaps from compounding
     *  alpha, so it reads as one even highlight — the see-through comes from the color's own alpha. */
    private paintHighlighter(ctx: CanvasRenderingContext2D, d: SegmentDrawing, proj: Projector): void {
        const g = d.geometry(proj);
        if (!g || g.segments.length === 0) return;
        ctx.save();
        ctx.strokeStyle = d.style.lineColor; // alpha lives in the color itself
        ctx.lineWidth = d.style.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        ctx.beginPath();
        const first = g.segments[0]!;
        ctx.moveTo(first[0], first[1]);
        for (const s of g.segments) ctx.lineTo(s[2], s[3]);
        ctx.stroke();
        ctx.restore();
    }

    /** Paint a multi-line drawing (channel/pitchfork): optional fill polygon, then each line. */
    private paintSegments(ctx: CanvasRenderingContext2D, d: SegmentDrawing, proj: Projector): void {
        const g = d.geometry(proj);
        if (!g) return;
        if (g.fill && g.fill.length >= 3 && d.style.fillColor) {
            ctx.save();
            ctx.fillStyle = d.style.fillColor; // alpha lives in the fill color itself
            ctx.beginPath();
            ctx.moveTo(g.fill[0]![0], g.fill[0]![1]);
            for (let i = 1; i < g.fill.length; i += 1) ctx.lineTo(g.fill[i]![0], g.fill[i]![1]);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        for (const f of g.fills ?? []) {
            if (f.pts.length < 3) continue;
            ctx.save();
            ctx.globalAlpha = (g.fillAlpha ?? 0.2) * ctx.globalAlpha;
            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.moveTo(f.pts[0]![0], f.pts[0]![1]);
            for (let i = 1; i < f.pts.length; i += 1) ctx.lineTo(f.pts[i]![0], f.pts[i]![1]);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        for (const { seg: s, color } of g.colored ?? []) {
            this.stroke(ctx, { ...d.style, lineColor: color }, () => {
                ctx.moveTo(s[0], s[1]);
                ctx.lineTo(s[2], s[3]);
            });
        }
        for (const s of g.segments) {
            this.stroke(ctx, d.style, () => {
                ctx.moveTo(s[0], s[1]);
                ctx.lineTo(s[2], s[3]);
            });
        }
        for (const s of g.dashed ?? []) {
            this.stroke(ctx, { ...d.style, lineStyle: 'dashed', lineWidth: 1 }, () => {
                ctx.moveTo(s[0], s[1]);
                ctx.lineTo(s[2], s[3]);
            });
        }
    }

    /** Paint an info line's segment; its stats box is painted on top of the candles by `paintLineStats`. */
    private paintInfoLine(ctx: CanvasRenderingContext2D, d: Drawing, proj: Projector): void {
        const pts = d.handlePoints(proj);
        if (pts.length < 2) return;
        const [x1, y1] = pts[0]!;
        const [x2, y2] = pts[1]!;
        this.stroke(ctx, d.style, () => {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        });
    }

    /** Paint a trend angle: the segment + a faint dashed baseline, an arc, and a degree readout at
     *  the start anchor. The angle is the on-screen (pixel) inclination, so it changes with zoom. */
    private paintTrendAngle(ctx: CanvasRenderingContext2D, d: Drawing, proj: Projector, theme: VelaTheme): void {
        const pts = d.handlePoints(proj);
        if (pts.length < 2) return;
        const [x1, y1] = pts[0]!;
        const [x2, y2] = pts[1]!;
        this.stroke(ctx, d.style, () => {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        });
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angleRad = Math.atan2(-dy, dx); // screen Y is inverted → negate for a natural angle
        const angleDeg = angleRad * (180 / Math.PI);
        const arcR = Math.min(30, Math.hypot(dx, dy) * 0.3);
        const color = d.style.lineColor;
        // faint dashed horizontal baseline (the 0° reference)
        ctx.save();
        ctx.globalAlpha = 0.4 * ctx.globalAlpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.max(Math.abs(dx), arcR + 20), y1);
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);
        // the angle arc, swept from the baseline to the line
        if (arcR > 1) {
            const end = -angleRad; // canvas-space angle of the line
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x1, y1, arcR, Math.min(0, end), Math.max(0, end));
            ctx.stroke();
        }
        ctx.fillStyle = color;
        ctx.font = `11px ${theme.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`${angleDeg.toFixed(1)}°`, x1 + arcR + 6, y1 + (dy < 0 ? -14 : 2));
    }

    /** Paint a fixed-size arrow marker as a filled glyph at its anchor. */
    private paintArrowMark(ctx: CanvasRenderingContext2D, d: ArrowMark, proj: Projector): void {
        const g = d.glyphPoints(proj);
        if (!g || g.length < 3) return;
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = d.style.lineColor;
        ctx.beginPath();
        ctx.moveTo(g[0]![0], g[0]![1]);
        for (let i = 1; i < g.length; i += 1) ctx.lineTo(g[i]![0], g[i]![1]);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /** A glyph/icon stamp: a fixed-pixel unicode symbol centered on the anchor (tints with the
     *  stamp color; emoji render in their own color). */
    private paintGlyphStamp(ctx: CanvasRenderingContext2D, d: GlyphStamp, proj: Projector, theme: VelaTheme): void {
        const c = d.center(proj);
        if (!c) return;
        ctx.save();
        ctx.setLineDash([]);
        ctx.font = `${d.sizePx()}px ${theme.fontFamily}`;
        ctx.fillStyle = d.style.lineColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.glyph, c[0], c[1]);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    /** A filled triangular arrowhead at `to`, pointing along the `from`→`to` direction. */
    private paintArrowhead(ctx: CanvasRenderingContext2D, from: readonly [number, number], to: readonly [number, number], style: DrawingStyle): void {
        const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
        const len = Math.max(9, style.lineWidth * 3.5);
        const spread = Math.PI / 7;
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = style.lineColor;
        ctx.beginPath();
        ctx.moveTo(to[0], to[1]);
        ctx.lineTo(to[0] - len * Math.cos(ang - spread), to[1] - len * Math.sin(ang - spread));
        ctx.lineTo(to[0] - len * Math.cos(ang + spread), to[1] - len * Math.sin(ang + spread));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /** Stroke a path with the drawing's line style (dash + width + color), then reset the dash. */
    private stroke(ctx: CanvasRenderingContext2D, style: DrawingStyle, path: () => void): void {
        this.applyStroke(ctx, style);
        ctx.beginPath();
        path();
        ctx.stroke();
        ctx.setLineDash([]);
    }

    private applyStroke(ctx: CanvasRenderingContext2D, style: DrawingStyle): void {
        ctx.strokeStyle = style.lineColor;
        ctx.lineWidth = style.lineWidth;
        ctx.setLineDash(dashPattern(style.lineStyle, style.lineWidth));
    }

    /** Round selection/placement handles — blue ring + gray fill (shared chrome, not the
     *  drawing's line color). */
    paintHandles(ctx: CanvasRenderingContext2D, points: ReadonlyArray<readonly [number, number]>): void {
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
        for (const [x, y] of points) {
            ctx.beginPath();
            ctx.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = HANDLE_FILL;
            ctx.fill();
            ctx.strokeStyle = HANDLE_BORDER;
            ctx.stroke();
        }
    }
}

/** Painted height of one profile row `rowPx` tall: a 1 px gap separates rows only while they are tall enough to read
 *  as rows; thinner rows fill their whole height (a gap on 1-2 px rows striped the profile into a hatch). */
export function profileRowHeight(rowPx: number): number {
    return rowPx >= 4 ? rowPx - 1 : rowPx;
}

/** True when a color is fully transparent (8-digit hex `…00` or an `rgba(…,0)`) — so we can
 *  skip stroking hidden band edges entirely. */
function isTransparent(color: string): boolean {
    const c = color.trim().toLowerCase();
    if (/^#[0-9a-f]{8}$/.test(c)) return c.endsWith('00');
    const m = /rgba?\([^)]*,\s*([\d.]+)\s*\)$/.exec(c);
    return m ? parseFloat(m[1]!) === 0 : false;
}

/** Format a price for a Price Label tag — decimals scaled to the magnitude, with grouping. */
/** A horizontal line / ray / cross line whose price label is on (TradingView's default: absent ⇒ on). */
function showsAxisPrice(d: Drawing): boolean {
    return (d.type === 'hline' || d.type === 'hray' || d.type === 'crossline') && (d as { showPrice?: boolean }).showPrice !== false;
}

/** A vertical line / cross line whose time label is on (TradingView's default: absent ⇒ on). */
function showsAxisTime(d: Drawing): boolean {
    return (d.type === 'vline' || d.type === 'crossline') && (d as { showTime?: boolean }).showTime !== false;
}

function formatPriceTag(p: number): string {
    const d = valueDecimals(p);
    return p.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Split text into lines no wider than `width` px at the context's current font, breaking at spaces (a single word
 *  longer than the width keeps its own line); explicit newlines still break. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
    const out: string[] = [];
    for (const para of text.split('\n')) {
        let line = '';
        for (const word of para.split(' ')) {
            const next = line ? `${line} ${word}` : word;
            if (line && ctx.measureText(next).width > width) {
                out.push(line);
                line = word;
            } else line = next;
        }
        out.push(line);
    }
    return out;
}

/** Begin a rounded-rectangle path (arcTo-based, no `ctx.roundRect` dependency). */
/** TradingView's line stats box: a translucent neutral grey with light text, the same on light and dark charts. */
const STATS_FILL = 'rgba(80, 84, 94, 0.92)'; // palette-exempt: neutral stats box like TradingView's
const STATS_TEXT = '#f2f4f8'; // palette-exempt: ~7:1 on STATS_FILL

/** Neutral fill of the position tool's centre (size + ratio) box; white text on it is ~9:1. */
const POSITION_CENTER_FILL = '#4c525e'; // palette-exempt: neutral position-tool centre label box

/** A label fill derived from a zone color: the same hue, darkened until white text on it
 *  reaches 4.5:1 (WCAG AA). Unparseable colors are returned unchanged. */
function labelFill(color: string): string {
    const rgb = parseRgb(color);
    if (!rgb) return color;
    let [r, g, b] = rgb;
    const lum = (): number => {
        const ch = (v: number): number => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    for (let i = 0; i < 30 && 1.05 / (lum() + 0.05) < 4.5; i++) {
        r *= 0.92;
        g *= 0.92;
        b *= 0.92;
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/** `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` or `rgba()` to [r, g, b]; null for anything else. */
function parseRgb(color: string): [number, number, number] | null {
    const c = color.trim();
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
    if (hex) {
        const h = hex[1]!;
        if (h.length === 3) return [parseInt(h[0]! + h[0]!, 16), parseInt(h[1]! + h[1]!, 16), parseInt(h[2]! + h[2]!, 16)];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(c);
    return fn ? [Number(fn[1]), Number(fn[2]), Number(fn[3])] : null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

/** Where a drawing's label sits: first-line top-left + horizontal alignment, per type. */
/**
 * Trace a callout's speech-bubble outline as ONE continuous path: the rounded rectangle, but on
 * the tail's edge the path detours out to the apex and back — so the border never crosses the
 * tail's base (the pointer side stays open). Used for both the fill and the stroke.
 */
function calloutBubblePath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    tail: { edge: 'top' | 'right' | 'bottom' | 'left'; at: number; apex: [number, number]; half: number } | null,
): void {
    const seg = (edge: 'top' | 'right' | 'bottom' | 'left', ex: number, ey: number): void => {
        if (tail && tail.edge === edge) {
            const [ax, ay] = tail.apex;
            if (edge === 'top') {
                ctx.lineTo(tail.at - tail.half, y);
                ctx.lineTo(ax, ay);
                ctx.lineTo(tail.at + tail.half, y);
            } else if (edge === 'bottom') {
                ctx.lineTo(tail.at + tail.half, y + h);
                ctx.lineTo(ax, ay);
                ctx.lineTo(tail.at - tail.half, y + h);
            } else if (edge === 'right') {
                ctx.lineTo(x + w, tail.at - tail.half);
                ctx.lineTo(ax, ay);
                ctx.lineTo(x + w, tail.at + tail.half);
            } else {
                ctx.lineTo(x, tail.at + tail.half);
                ctx.lineTo(ax, ay);
                ctx.lineTo(x, tail.at - tail.half);
            }
        }
        ctx.lineTo(ex, ey);
    };
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    seg('top', x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    seg('right', x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    seg('bottom', x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    seg('left', x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

/** Compact ratio text for Mach circle labels (trim trailing zeros). */
function formatMachRatio(ratio: number): string {
    if (!Number.isFinite(ratio)) return '';
    const rounded = Math.round(ratio * 1000) / 1000;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/** Where a drawing's label paints. With `rotate`, the canvas is rotated by `angle`
 *  around `(cx, cy)` first, and `x`/`top` are in that rotated frame. */
export function labelLayout(d: Drawing, proj: Projector): {
    x: number;
    top: number;
    align: CanvasTextAlign;
    rotate?: { angle: number; cx: number; cy: number };
} | null {
    const text = d.text;
    if (!text) return null;
    const pts = d.handlePoints(proj);
    const lines = text.value.split('\n').length;
    const lh = labelLineHeight(namedFontSize(text.size));
    switch (d.type) {
        case 'text':
        case 'anchoredtext':
            return pts[0] ? { x: pts[0][0] + 2, top: pts[0][1] + 2, align: 'left' } : null;
        case 'hline': {
            // TradingView's horizontal-line text: left / center / right across the plot, and above / on / below the line.
            if (!pts[0]) return null;
            const y = pts[0][1];
            const h = lh * lines;
            const ha = text.hAlign ?? 'left';
            const x = ha === 'right' ? proj.width - 8 : ha === 'center' ? proj.width / 2 : 8;
            const top = text.vAlign === 'bottom' ? y + 4 : text.vAlign === 'center' ? y - h / 2 : y - 4 - h;
            return { x, top, align: ha };
        }
        case 'hray': {
            // From the anchor to the right edge: left = just past the anchor, center = halfway, right = the edge.
            if (!pts[0]) return null;
            const [ax, y] = pts[0];
            const h = lh * lines;
            const ha = text.hAlign ?? 'left';
            const x = ha === 'right' ? proj.width - 8 : ha === 'center' ? (ax + proj.width) / 2 : ax + 8;
            const top = text.vAlign === 'bottom' ? y + 4 : text.vAlign === 'center' ? y - h / 2 : y - 4 - h;
            return { x, top, align: ha };
        }
        case 'vline': {
            // TradingView's vertical-line text: left of / on / right of the line, at the top / middle / bottom of the pane.
            if (!pts[0]) return null;
            const x0 = pts[0][0];
            const rect = proj.paneRect?.(d.paneId) ?? { top: 0, height: proj.height };
            const h = lh * lines;
            const ha = text.hAlign ?? 'left';
            if ((d as { textVertical?: boolean }).textVertical) {
                // Up the line: rotated a quarter turn around the line at the chosen height; left / right = which side.
                const cy = text.vAlign === 'bottom' ? rect.top + rect.height - 8 : text.vAlign === 'center' ? rect.top + rect.height / 2 : rect.top + 8;
                const along: CanvasTextAlign = text.vAlign === 'bottom' ? 'left' : text.vAlign === 'center' ? 'center' : 'right';
                const off = ha === 'left' ? -6 - h : ha === 'right' ? 6 : -h / 2;
                return { x: 0, top: off, align: along, rotate: { angle: -Math.PI / 2, cx: x0, cy } };
            }
            const x = ha === 'left' ? x0 - 6 : ha === 'right' ? x0 + 6 : x0;
            const top = text.vAlign === 'bottom' ? rect.top + rect.height - 8 - h : text.vAlign === 'center' ? rect.top + (rect.height - h) / 2 : rect.top + 8;
            return { x, top, align: ha === 'left' ? 'right' : ha === 'right' ? 'left' : 'center' };
        }
        case 'trendline':
        case 'ray':
        case 'extendedline':
        case 'infoline':
        case 'trendangle':
        case 'arrow': {
            // Along the segment between the anchors (left end / middle / right end, as seen on screen) and above /
            // on / below it; the glyphs follow the segment, kept upright.
            if (pts.length < 2) return null;
            const [x1, y1] = pts[0]!;
            const [x2, y2] = pts[1]!;
            const half = Math.hypot(x2 - x1, y2 - y1) / 2;
            const h = lh * lines;
            const ha = text.hAlign ?? 'center';
            return {
                x: ha === 'left' ? -half : ha === 'right' ? half : 0,
                top: text.vAlign === 'bottom' ? 6 : text.vAlign === 'center' ? -h / 2 : -6 - h,
                align: ha,
                rotate: { angle: uprightLineAngle(x1, y1, x2, y2), cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 },
            };
        }
        case 'box': {
            // TradingView's rectangle text: inside the box, at its left / center / right and top / middle / bottom.
            if (pts.length < 2) return null;
            // An extended side moves that edge to the pane edge.
            const span = (d as Box).spanX?.(proj);
            const x1 = span?.x1 ?? Math.min(pts[0]![0], pts[1]![0]);
            const x2 = span?.x2 ?? Math.max(pts[0]![0], pts[1]![0]);
            const y1 = Math.min(pts[0]![1], pts[1]![1]);
            const y2 = Math.max(pts[0]![1], pts[1]![1]);
            const h = lh * lines;
            const pad = 4;
            const ha = text.hAlign ?? 'center';
            const x = ha === 'left' ? x1 + pad : ha === 'right' ? x2 - pad : (x1 + x2) / 2;
            const top = text.vAlign === 'top' ? y1 + pad : text.vAlign === 'bottom' ? y2 - pad - h : (y1 + y2) / 2 - h / 2;
            return { x, top, align: ha };
        }
        default:
            return pts[0] ? { x: pts[0][0], top: pts[0][1], align: 'left' } : null;
    }
}

/** The card's link text, TradingView's. */
const XPOST_LINK = 'Link to X post';

/** TradingView's card colours for the chart's background. */
export function xpostColors(background: string): { back: string; border: string; name: string; text: string; muted: string; line: string; url: string } {
    return isDarkColor(background) ? XPOST_DARK : XPOST_LIGHT;
}

/** True for a dark colour; a colour it cannot read (a gradient, a variable) counts as dark. */
function isDarkColor(c: string): boolean {
    const rgb = parseRgb(c);
    return !rgb || 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] < 128;
}

/** The post's text wrapped to `max` px as TradingView wraps it: its own line breaks kept, words kept whole, a word
 *  wider than the card (a long link) broken by characters. */
function wrapPost(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
    const lines: string[] = [];
    for (const para of text.split(/\r?\n|\r/)) {
        const words = para.split(' ').filter(Boolean);
        if (!words.length) {
            lines.push('');
            continue;
        }
        let cur = '';
        for (const word of words) {
            let wd = word;
            while (ctx.measureText(wd).width > max && wd.length > 1) {
                let k = wd.length - 1;
                while (k > 1 && ctx.measureText(wd.slice(0, k)).width > max) k--;
                if (cur) lines.push(cur);
                lines.push(wd.slice(0, k));
                cur = '';
                wd = wd.slice(k);
            }
            if (cur && ctx.measureText(`${cur} ${wd}`).width > max) {
                lines.push(cur);
                cur = wd;
            } else cur = cur ? `${cur} ${wd}` : wd;
        }
        if (cur) lines.push(cur);
    }
    return lines;
}

/** TradingView's date on a post card, `24 Oct '26 · 08:35 PM`, in the chart's time zone (UTC when it has none). */
export function xpostDate(ms: number, timeZone = 'UTC'): string {
    let parts: Intl.DateTimeFormatPart[];
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true };
    try {
        parts = new Intl.DateTimeFormat('en-US', { ...opts, timeZone }).formatToParts(ms);
    } catch {
        parts = new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).formatToParts(ms);
    }
    const v = (t: string): string => parts.find((x) => x.type === t)?.value ?? '';
    const hh = v('hour').padStart(2, '0');
    return `${v('day')} ${v('month')} '${v('year')} · ${hh}:${v('minute')} ${v('dayPeriod').toUpperCase()}`;
}
