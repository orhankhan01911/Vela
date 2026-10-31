import type { DrawingPoint, Projector } from '../geometry';
import { pointInBox } from '../hittest';
import { FibRatios, type FibEntryLine, type FibLevel } from './FibRatios';
import { fibLevels, LEVEL_BLUE, LEVEL_GREEN, LEVEL_ORANGE, LEVEL_RED, LEVEL_TEAL, LEVEL_UNITY } from '../levelPalette';
import { timeBetween } from '../futureAnchors';

/** The H/V grid subdivisions (editable, like GannBox), applied to both the price + time axes. */
const GRID_LEVELS = fibLevels([0, 0.25, 0.382, 0.5, 0.618, 0.75, 1].map((ratio) => ({ ratio, label: String(ratio) })));

/** The Gann angle fan, all from the origin corner p1. `x` = time units, `y` = price units. */
const FAN: ReadonlyArray<{ label: string; x: number; y: number; color: string }> = [
    { label: '3x1', x: 3, y: 1, color: LEVEL_RED },
    { label: '2x1', x: 2, y: 1, color: LEVEL_ORANGE },
    { label: '1x1', x: 1, y: 1, color: LEVEL_UNITY },
    { label: '1x2', x: 1, y: 2, color: LEVEL_TEAL },
    { label: '1x3', x: 1, y: 3, color: LEVEL_BLUE },
];

/** Concentric quarter-ellipse arc radii (as a fraction of the box), centered on p1. */
export const GANN_SQUARE_ARCS: ReadonlyArray<{ k: number; color: string }> = [
    { k: 0.25, color: LEVEL_RED },
    { k: 0.5, color: LEVEL_ORANGE },
    { k: 0.75, color: LEVEL_GREEN },
    { k: 1, color: LEVEL_TEAL },
];

/** One of TradingView's fan lines or arcs: its x:y ratio, colour, width and whether it is shown. */
export interface GannRatioLine {
    x: number;
    y: number;
    color: string;
    enabled: boolean;
    lineWidth: number;
}

const TV_GS_GRAY = '#808080'; // palette-exempt: TradingView's cold-gray-500
const TV_GS_ORANGE = '#FF9800'; // palette-exempt: TradingView's tan-orange-500
const TV_GS_SKY = '#00BCD4'; // palette-exempt: TradingView's sky-blue-500
const TV_GS_IGUANA = '#4CAF50'; // palette-exempt: TradingView's iguana-green-500
const TV_GS_MINTY = '#089981'; // palette-exempt: TradingView's minty-green-500
const TV_GS_BLUE = '#2962FF'; // palette-exempt: TradingView's tv-blue-500
const TV_GS_RED = '#F23645'; // palette-exempt: TradingView's ripe-red-500
const TV_GS_DEEP200 = '#B39DDB'; // palette-exempt: TradingView's deep-blue-200
const TV_GS_DEEP300 = '#9575CD'; // palette-exempt: TradingView's deep-blue-300

/** TradingView's 6 grid levels (module 675635): at 0, 1/5 … 1 of the box, all shown, 2 px. */
export const TV_GANN_SQUARE_LEVELS: readonly FibLevel[] = [TV_GS_GRAY, TV_GS_ORANGE, TV_GS_SKY, TV_GS_IGUANA, TV_GS_MINTY, TV_GS_GRAY].map((color, i) => ({ ratio: i / 5, color, enabled: true, lineWidth: 2 }));

/** TradingView's 11 fan lines: 2x1, 1x1 and 1x2 shown. */
export const TV_GANN_SQUARE_FANS: readonly GannRatioLine[] = (
    [
        [8, 1, TV_GS_DEEP200, false], [5, 1, TV_GS_RED, false], [4, 1, TV_GS_GRAY, false], [3, 1, TV_GS_ORANGE, false], [2, 1, TV_GS_SKY, true],
        [1, 1, TV_GS_IGUANA, true], [1, 2, TV_GS_MINTY, true], [1, 3, TV_GS_MINTY, false], [1, 4, TV_GS_BLUE, false], [1, 5, TV_GS_DEEP300, false], [1, 8, TV_GS_DEEP200, false],
    ] as const
).map(([x, y, color, enabled]) => ({ x, y, color, enabled, lineWidth: 2 }));

/** TradingView's 11 arcs, all shown. */
export const TV_GANN_SQUARE_ARCS: readonly GannRatioLine[] = (
    [
        [1, 0, TV_GS_ORANGE], [1, 1, TV_GS_ORANGE], [1.5, 0, TV_GS_ORANGE], [2, 0, TV_GS_SKY], [2, 1, TV_GS_SKY], [3, 0, TV_GS_IGUANA],
        [3, 1, TV_GS_IGUANA], [4, 0, TV_GS_MINTY], [4, 1, TV_GS_MINTY], [5, 0, TV_GS_BLUE], [5, 1, TV_GS_BLUE],
    ] as const
).map(([x, y, color]) => ({ x, y, color, enabled: true, lineWidth: 2 }));

/** A ratio line list read back from props (bad entries dropped). */
function readRatioLines(v: unknown): GannRatioLine[] | null {
    if (!Array.isArray(v)) return null;
    const out = v
        .filter((e): e is GannRatioLine => !!e && typeof e === 'object' && typeof (e as GannRatioLine).x === 'number' && typeof (e as GannRatioLine).y === 'number' && typeof (e as GannRatioLine).color === 'string')
        .map((e) => ({ x: e.x, y: e.y, color: e.color, enabled: e.enabled !== false, lineWidth: typeof e.lineWidth === 'number' && Number.isFinite(e.lineWidth) ? Math.min(10, Math.max(1, e.lineWidth)) : 2 }));
    return out.length ? out : null;
}

/** TradingView's square in pixels: where the levels count from (`sx`, `sy`) and the box's signed size. */
export interface GannSquareFrame {
    sx: number;
    sy: number;
    rx: number;
    ry: number;
    left: number;
    top: number;
    right: number;
    bot: number;
}

interface GannBox {
    ox: number;
    oy: number;
    bx: number;
    py: number;
    left: number;
    top: number;
    right: number;
    bot: number;
}

/**
 * A Gann square: a price/time box with an H/V fib grid, the Gann angle fan emanating from the
 * origin corner (p1), and concentric quarter-ellipse arcs centered on p1. The grid + fan are
 * straight {@link FibEntryLine}s (the shared fib painter); the arcs get a dedicated paint branch.
 *
 * A new one is TradingView's (modules 79240, 675635, 977036): a grid at fifths of the box, 11 fan lines and 11 arcs
 * (quarter ellipses from the first point toward the second, clipped to the box, the rings between them filled), the
 * price range, bar range and price/bar ratio printed at the corners, Reverse, and the price/bar ratio that keeps the
 * box square: the second point's price is the first's ± bars × ratio (the chart's own at placement, then the dialog's).
 */
export class GannSquare extends FibRatios {
    // The fixed square (GannSquareFixed) is this drawing on a box of its own.
    readonly type: 'gannsquare' | 'gannsquarefixed' = 'gannsquare';
    /** TradingView's look (new drawings). */
    declare tv?: boolean;
    declare fanLines?: GannRatioLine[];
    declare arcs?: GannRatioLine[];
    declare reverse?: boolean;
    /** Price per bar that keeps the box square; fixed when placed, editable in the dialog. */
    declare scaleRatio?: number;
    /** One bar's length in ms when it was placed (keeps the square after a handle drag). */
    declare msPerBar?: number;
    declare fontSize?: number;
    declare labelBold?: boolean;
    declare labelItalic?: boolean;
    // `!` (no initializer): the base constructor runs readProps first; the constructor fills the defaults.
    /** TradingView's arcs background: the rings between neighbouring arcs filled (on by default). */
    background!: boolean;
    fillOpacity!: number;
    showLabels!: boolean;

    constructor(init: ConstructorParameters<typeof FibRatios>[0]) {
        super(init);
        if (this.background === undefined) this.background = true;
        if (this.fillOpacity === undefined) this.fillOpacity = 0.2;
        if (this.showLabels === undefined) this.showLabels = true;
        if (!init.props) {
            this.tv = true;
            this.levels = TV_GANN_SQUARE_LEVELS.map((l) => ({ ...l }));
            this.fanLines = TV_GANN_SQUARE_FANS.map((l) => ({ ...l }));
            this.arcs = TV_GANN_SQUARE_ARCS.map((l) => ({ ...l }));
            this.style = { ...this.style, lineWidth: 2, lineStyle: 'solid' };
            this.background = true;
            this.fillOpacity = 0.2;
            this.showLabels = true;
            this.reverse = false;
            this.fontSize = 12;
            this.labelBold = false;
            this.labelItalic = false;
        }
    }

    /** The chart's price per bar that shows the box square, and one bar's length (from the live projector). */
    private chartRatio(proj: Projector, at: DrawingPoint): { ratio: number; msPerBar: number } | null {
        const span = 30 * 24 * 3_600_000; // any span covering bars; only the per-bar rate is kept
        const bars = proj.barsBetween?.(at.time, at.time + span) ?? 0;
        const y0 = proj.yOf(at.price, this.paneId);
        const y1 = proj.yOf(at.price + 1, this.paneId);
        if (!(bars > 0) || y0 == null || y1 == null || y0 === y1) return null;
        const pxPerBar = Math.abs(proj.xOf(at.time + span) - proj.xOf(at.time)) / bars;
        return { ratio: pxPerBar / Math.abs(y1 - y0), msPerBar: span / bars };
    }

    /** The points as TradingView draws them: the moving one (the second, or the first with Reverse) put at the other's
     *  price ± its bar distance × the ratio. */
    private squared(proj: Projector | null): [DrawingPoint, DrawingPoint] | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        if (!this.tv) return [a, b];
        const live = proj && (this.scaleRatio === undefined || this.msPerBar === undefined) ? this.chartRatio(proj, a) : null;
        const ratio = this.scaleRatio ?? live?.ratio;
        const msPerBar = this.msPerBar ?? live?.msPerBar;
        if (ratio === undefined || !msPerBar) return [a, b];
        const [fixed, moving] = this.reverse ? [b, a] : [a, b];
        const bars = Math.round(Math.abs(moving.time - fixed.time) / msPerBar);
        const dir = Math.sign(moving.price - fixed.price) || 1;
        const moved = { ...moving, price: fixed.price + dir * bars * ratio };
        return this.reverse ? [moved, b] : [a, moved];
    }

    /** Placed: fix the chart's price/bar ratio (TradingView takes it from the chart) and square the second point. */
    override onPlaced(proj: Projector): void {
        if (!this.tv) return;
        const a = this.anchors[0];
        if (!a) return;
        const live = this.chartRatio(proj, a);
        if (!live) return;
        if (this.scaleRatio === undefined) this.scaleRatio = live.ratio;
        this.msPerBar = live.msPerBar;
        const sq = this.squared(null);
        if (sq) this.anchors = [sq[0], sq[1]];
    }

    /** A handle drag keeps the square (TradingView corrects the moved point's price). */
    override constrainHandleDrag(): void {
        const sq = this.tv ? this.squared(null) : null;
        if (sq) this.anchors = [sq[0], sq[1]];
    }

    /** A new price/bar ratio from the dialog re-squares the box; the bar's colour and width set every line. */
    override applySettings(patch: Record<string, unknown>): void {
        super.applySettings(patch);
        if (!this.tv) return;
        const c = patch['style.lineColor'];
        if (typeof c === 'string') for (const l of [...this.levels, ...(this.fanLines ?? []), ...(this.arcs ?? [])]) l.color = c;
        const w = patch['style.lineWidth'];
        if (typeof w === 'number') for (const l of [...this.levels, ...(this.fanLines ?? []), ...(this.arcs ?? [])]) l.lineWidth = w;
        if ('scaleRatio' in patch || 'reverse' in patch) this.constrainHandleDrag();
    }

    /** TradingView's frame in pixels (null until both points are set). */
    tvFrame(proj: Projector): GannSquareFrame | null {
        const sq = this.squared(proj);
        if (!sq) return null;
        const [p, q] = this.reverse ? [sq[1], sq[0]] : sq;
        const py = proj.yOf(p.price, this.paneId);
        const qy = proj.yOf(q.price, this.paneId);
        if (py == null || qy == null) return null;
        const px = proj.xOf(p.time);
        const qx = proj.xOf(q.time);
        return { sx: px, sy: py, rx: qx - px, ry: qy - py, left: Math.min(px, qx), top: Math.min(py, qy), right: Math.max(px, qx), bot: Math.max(py, qy) };
    }

    /** The shown arcs as fractions of the box (√(x² + y²) / 5), each with the previous shown one's (0 for the first). */
    tvArcs(): Array<{ k: number; prevK: number; color: string; lineWidth: number }> {
        const out: Array<{ k: number; prevK: number; color: string; lineWidth: number }> = [];
        let prev = 0;
        for (const a of this.arcs ?? []) {
            if (!a.enabled) continue;
            const k = Math.hypot(a.x, a.y) / 5;
            out.push({ k, prevK: prev, color: a.color, lineWidth: a.lineWidth });
            prev = k;
        }
        return out;
    }

    /** TradingView's grid, fan lines and the three corner labels. */
    private tvLines(proj: Projector): FibEntryLine[] | null {
        const f = this.tvFrame(proj);
        if (!f) return null;
        const none = { numberText: '', numberX: 0, numberY: 0, numberAlign: 'left' as const, labelX: 0, labelY: 0 };
        const out: FibEntryLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const x = f.sx + lv.ratio * f.rx;
            const y = f.sy + lv.ratio * f.ry;
            out.push({ color: lv.color, x1: x, y1: f.sy, x2: x, y2: f.sy + f.ry, ...none, lineWidth: lv.lineWidth });
            out.push({ color: lv.color, x1: f.sx, y1: y, x2: f.sx + f.rx, y2: y, ...none, lineWidth: lv.lineWidth });
        }
        for (const fan of this.fanLines ?? []) {
            if (!fan.enabled) continue;
            // Shallow ones end on the far side at y/x of the height, steep ones on the far top/bottom at x/y of the width.
            const [ex, ey] = fan.x > fan.y ? [f.sx + f.rx, f.sy + (fan.y / fan.x) * f.ry] : [f.sx + (fan.x / fan.y) * f.rx, f.sy + f.ry];
            out.push({ color: fan.color, x1: f.sx, y1: f.sy, x2: ex, y2: ey, ...none, lineWidth: fan.lineWidth });
        }
        if (this.showLabels !== false) out.push(...this.cornerLabels(proj, f));
        return out;
    }

    /** TradingView's labels: the price range beside the first point's time at the second's price, the bar range at the
     *  second's time and the first's price, the price/bar ratio at the second point; in the last level's colour. */
    private cornerLabels(proj: Projector, f: GannSquareFrame): FibEntryLine[] {
        const sq = this.squared(proj);
        if (!sq) return [];
        const [a, b] = sq;
        const priceDiff = (b.price - a.price) * (this.reverse ? -1 : 1);
        const barSpan = proj.barsBetween ? Math.round(proj.barsBetween(a.time, b.time)) : this.msPerBar ? Math.round(Math.abs(b.time - a.time) / this.msPerBar) : 0;
        const barDiff = Math.sign(b.time - a.time) * barSpan * (this.reverse ? -1 : 1);
        const color = this.levels[this.levels.length - 1]?.color ?? TV_GS_GRAY;
        const half = (this.fontSize ?? 12) / 2;
        const up = priceDiff > 0;
        const right = barDiff > 0;
        // Points in TradingView's order (the first and second as drawn, Reverse swapping them).
        const p1 = { x: f.sx, y: f.sy };
        const p2 = { x: f.sx + f.rx, y: f.sy + f.ry };
        const at = (x: number, y: number, text: string, alignLeftOfPoint: boolean, above: boolean, offAbove: number, offBelow: number): FibEntryLine => ({
            color,
            x1: x,
            y1: y,
            x2: x,
            y2: y,
            numberText: text,
            numberX: alignLeftOfPoint ? x - 10 : x + 10,
            numberY: above ? y - offAbove - half : y + offBelow + half,
            numberAlign: alignLeftOfPoint ? 'right' : 'left',
            labelX: x,
            labelY: y,
        });
        const fmt = (n: number): string => n.toLocaleString('en-US', { maximumFractionDigits: Math.abs(n) >= 100 ? 2 : 6 });
        const ratio = barDiff !== 0 ? Math.abs(priceDiff / barDiff) : null;
        const out = [at(p1.x, p2.y, fmt(priceDiff), right, up, 8, 10), at(p2.x, p1.y, String(barDiff), !right, !up, 8, 10)];
        if (ratio !== null) out.push(at(p2.x, p2.y, String(Number(ratio.toPrecision(7))), !right, up, 8, 10));
        return out;
    }

    protected override writeProps(): Record<string, unknown> {
        return {
            ...super.writeProps(),
            background: this.background,
            fillOpacity: this.fillOpacity,
            showLabels: this.showLabels,
            ...(this.tv
                ? {
                      tv: true,
                      fanLines: (this.fanLines ?? []).map((l) => ({ ...l })),
                      arcs: (this.arcs ?? []).map((l) => ({ ...l })),
                      reverse: this.reverse === true,
                      ...(this.scaleRatio !== undefined ? { scaleRatio: this.scaleRatio } : {}),
                      ...(this.msPerBar !== undefined ? { msPerBar: this.msPerBar } : {}),
                      fontSize: this.fontSize,
                      labelBold: this.labelBold === true,
                      labelItalic: this.labelItalic === true,
                  }
                : {}),
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (typeof props.background === 'boolean') this.background = props.background;
        if (typeof props.fillOpacity === 'number') this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
        if (typeof props.showLabels === 'boolean') this.showLabels = props.showLabels;
        if (props.tv === true) this.tv = true;
        const fans = readRatioLines(props.fanLines);
        if (fans) this.fanLines = fans;
        const arcs = readRatioLines(props.arcs);
        if (arcs) this.arcs = arcs;
        for (const k of ['reverse', 'labelBold', 'labelItalic'] as const) if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        if (typeof props.scaleRatio === 'number' && Number.isFinite(props.scaleRatio) && props.scaleRatio > 0) this.scaleRatio = props.scaleRatio;
        if (typeof props.msPerBar === 'number' && Number.isFinite(props.msPerBar) && props.msPerBar > 0) this.msPerBar = props.msPerBar;
        if (typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
    }

    /** The ring between each arc and the one inside it (the innermost reaches the origin), in the outer arc's color. */
    override fillPolygons(proj: Projector): Array<{ color: string; pts: Array<[number, number]> }> {
        if (this.tv) return []; // TradingView's rings are painted with the arcs, clipped to the box
        const g = this.background ? this.arcGeom(proj) : null;
        if (!g || Math.abs(g.bx) < 1 || Math.abs(g.py) < 1) return [];
        const N = 24;
        const quarter = (k: number): Array<[number, number]> =>
            Array.from({ length: N + 1 }, (_, i) => {
                const t = (i / N) * (Math.PI / 2);
                return [g.ox + k * g.bx * Math.cos(t), g.oy + k * g.py * Math.sin(t)] as [number, number];
            });
        const out: Array<{ color: string; pts: Array<[number, number]> }> = [];
        let inner: Array<[number, number]> = [[g.ox, g.oy]];
        for (const arc of GANN_SQUARE_ARCS) {
            const outer = quarter(arc.k);
            out.push({ color: arc.color, pts: [...outer, ...[...inner].reverse()] });
            inner = outer;
        }
        return out;
    }

    defaultLevels(): readonly FibLevel[] {
        return GRID_LEVELS;
    }

    // Placed click-move-click (the inherited 'click' mode): first click sets a corner, the second
    // sets the opposite one — matching the plain Rectangle tool.

    private box(proj: Projector): GannBox | null {
        const c1 = this.anchors[0];
        const c2 = this.anchors[1];
        if (!c1 || !c2) return null;
        const oy = proj.yOf(c1.price, this.paneId);
        const ey = proj.yOf(c2.price, this.paneId);
        if (oy == null || ey == null) return null;
        const ox = proj.xOf(c1.time);
        const ex = proj.xOf(c2.time);
        return { ox, oy, bx: ex - ox, py: ey - oy, left: Math.min(ox, ex), top: Math.min(oy, ey), right: Math.max(ox, ex), bot: Math.max(oy, ey) };
    }

    /** The origin corner + box pixel deltas, consumed by the arc painter. */
    arcGeom(proj: Projector): { ox: number; oy: number; bx: number; py: number } | null {
        const b = this.box(proj);
        return b ? { ox: b.ox, oy: b.oy, bx: b.bx, py: b.py } : null;
    }

    entryLines(proj: Projector): FibEntryLine[] | null {
        if (this.tv) return this.tvLines(proj);
        const b = this.box(proj);
        if (!b) return null;
        const c1 = this.anchors[0]!;
        const c2 = this.anchors[1]!;
        const out: FibEntryLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const hy = proj.yOf(c1.price + lv.ratio * (c2.price - c1.price), this.paneId); // horizontal (price) line
            if (hy != null) {
                out.push({ color: lv.color, x1: b.left, y1: hy, x2: b.right, y2: hy, numberText: this.showLabels === false ? '' : lv.label ?? String(lv.ratio), numberX: b.left - 5, numberY: hy, numberAlign: 'right', labelX: b.left, labelY: hy });
            }
            const vx = proj.xOf(timeBetween(proj, c1.time, c2.time, lv.ratio)); // vertical (time) line — unlabelled
            out.push({ color: lv.color, x1: vx, y1: b.top, x2: vx, y2: b.bot, numberText: '', numberX: vx, numberY: b.top, numberAlign: 'center', labelX: vx, labelY: b.top });
        }
        for (const f of FAN) {
            let u: number;
            let v: number;
            if (f.x > f.y) {
                u = b.ox + b.bx; // shallow → reaches the far vertical edge at fraction y/x of the height
                v = b.oy + (f.y / f.x) * b.py;
            } else {
                v = b.oy + b.py; // steep → reaches the far horizontal edge at fraction x/y of the width
                u = b.ox + (f.x / f.y) * b.bx;
            }
            out.push({ color: f.color, x1: b.ox, y1: b.oy, x2: u, y2: v, numberText: this.showLabels === false ? '' : f.label, numberX: u + 4, numberY: v, numberAlign: 'left', labelX: u + 4, labelY: v });
        }
        return out;
    }

    /** TradingView: the handles sit on the squared points. */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const sq = this.tv ? this.squared(proj) : null;
        if (!sq) return super.handlePoints(proj);
        const out: Array<[number, number]> = [];
        for (const p of sq) {
            const y = proj.yOf(p.price, this.paneId);
            if (y == null) return [];
            out.push([proj.xOf(p.time), y]);
        }
        return out;
    }

    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        if (this.tv) {
            const f = this.tvFrame(proj);
            return f != null && pointInBox(px, py, f.left, f.top, f.right, f.bot, tol);
        }
        const b = this.box(proj);
        return b != null && pointInBox(px, py, b.left, b.top, b.right, b.bot, tol); // grabbable anywhere inside
    }

    priceRange(): { min: number; max: number } | null {
        const c1 = this.anchors[0];
        const c2 = this.anchors[1];
        if (!c1 || !c2) return null;
        return { min: Math.min(c1.price, c2.price), max: Math.max(c1.price, c2.price) };
    }
}
