import type { VelaTheme } from '../../../core/options';
import type {
    Drawing,
    DrawingIntent,
    DrawingMode,
    DrawingPoint,
    DrawingSeriesGateway,
    DrawingTypeKey,
    IDrawingsRendererPort,
    Projector,
    SerializedDrawing,
    SnapMode,
    ToolbarDefinition,
} from '../../../core/drawings';
import { createDrawing, deserializeDrawing, getDrawingType, resetDrawingSettings, shownOnBarMs, resolveAnchors, writeAnchor, Callout, CALLOUT_RADIUS, CALLOUT_MARGIN, Note, Magnifier, PriceAlert, TextLabel, TableDrawing, TV_TABLE, setTableActiveCell, tableActiveCell, type BarAxis, type TableOp } from '../../../core/drawings';
import type { Unsubscribe } from '../../../core/util/types';
import { contrastColor, namedFontSize, labelLineHeight, safeCssColor, safeCssPx, TEXT_FRAME_INSET, TEXT_FRAME_RISE } from '../../shared/drawing-geometry';
import { withAlpha } from '../core/chartConfig';
import { blendOver, splitColor } from '../../../ui/components/color-picker';
import { DrawingPainter, handleIdsFor, noteTooltip, wrapLines, type PaintTargets } from './DrawingPainter';
import { DrawingInteraction } from './DrawingInteraction';
import { DrawingSettingsPopup, type PopupAnchor } from './DrawingSettingsPopup';
import { DrawingToolbar, TOOLBAR_WIDTH, TOOLBAR_COLLAPSED_WIDTH } from './DrawingToolbar';
import { MeasureOverlay } from './MeasureOverlay';
import { topDrawingAt, deletableSelection, deleteTargets, HIT_TOLERANCE } from './DrawingHitTester';
import { keyToDrawingAction, isEditingText } from './DrawingKeys';
import type { DrawingSlice } from '../core/SceneGraph';
import type { IndicatorDialogRow, InputsUIChange } from '../../shared/IndicatorInputsDialog';

/** How far up a pasted copy lands (TradingView's paste, px). */
const PASTE_SHIFT = 40;

/** Shown in the inline editor while a label carries no text yet. */
const TEXT_PLACEHOLDER = 'Enter Text';
/** Extra width past the measured glyphs so the caret has somewhere to sit. */
const CARET_ROOM = 8;
/** The editor's border weight; its padding is the shared TEXT_FRAME inset/rise minus this, so the
 *  border lands exactly on the frame the painter draws — the box doesn't move when editing starts. */
const EDITOR_BORDER = 1;

/** The drawings whose text is typed straight onto the chart rather than through the settings popup. */
type InlineEditable = Callout | TextLabel | Note;

function isInlineEditable(d: Drawing | null | undefined): d is InlineEditable {
    return d instanceof Callout || d instanceof TextLabel || (d instanceof Note && d.tv === true); // TradingView's note types in its tooltip
}

/** What the controller needs from the native renderer (coords + theme + dpr). */
export interface UserDrawingDeps {
    projector(): Projector;
    dpr(): number;
    theme(): VelaTheme;
    /** Ask the renderer to recompute per-pane autoscale (series + Pine drawings; user drawings do not fold in). */
    requestScaleUpdate(): void;
    /** The pane's series z keys (candles + indicators), ascending — the boundaries a drawing's
     *  z is slotted against to decide which interleave layer (if any) it paints on. */
    seriesBoundaries(paneId: string): readonly number[];
    /** The candles' own z key, or null off the price pane — a new drawing starts just under it. */
    priceZ(paneId: string): number | null;
    /** Ask the renderer for a data-layer repaint — needed when a drawing that paints INSIDE the
     *  series stack changed, since its pixels live in the backend composite, not on this layer. */
    requestDataPaint(): void;
    /** The chart's active series look — price style plus the RESOLVED series colors — so
     *  content that mirrors the series (the magnifier's inset) matches it exactly. */
    seriesLook(): { style: string; upColor: string; downColor: string; lineColor: string };
    /** One chart bar in ms (the chart's own timeframe) — pickers drop choices at/above it. */
    chartBarMs(): number;
    /** The chart is a tick or a range chart (its chart type's `barKind`), else null. Optional. */
    chartBarKind?(): 'ticks' | 'ranges' | null;
    /** The chart's timezone — axis time labels on vertical lines match the crosshair's time chip. */
    timeZone?(): string;
    /** Open the renderer's indicator inputs dialog on a drawing's inputs (Drawing.inputsDialog). Optional. */
    openInputsDialog?(row: IndicatorDialogRow, onChange: (c: InputsUIChange) => void): void;
    /** Snap a data point to the nearest candle (time + OHLC), per magnet `mode` + the cursor pixel. */
    snap(point: DrawingPoint, paneId: string, mode: SnapMode, cursorPx?: { x: number; y: number }): DrawingPoint;
    /** Set the sticky magnet mode (driven by the toolbar's 3-state button). */
    setSnapMode(mode: SnapMode): void;
    /** Reserve `px` of left gutter for the docked toolbar (0 releases it) — the plot insets to its right. */
    setToolbarGutter(px: number): void;
    /** The current-price label block on the price scale (`above`/`below` its price, px), or null when it is not
     *  shown: drawing chips on the scale stack clear of it. */
    priceBlock?(): { paneId: string; price: number; above: number; below: number } | null;
    /** A price as the pane's scale prints it (grouping, decimals, percent mode) and the axis font: the drawings'
     *  price chips use it so they read like the axis numbers and the crosshair chip. Null when the pane is gone. */
    axisLabel?(paneId: string, price: number): { text: string; font: string } | null;
    /** The x of the bar centre nearest to `x` (the Zoom In box and the ruler run from bar to bar). */
    zoomSnapX?(x: number): number;
    /** Zoom to the box between two points (bars across, the first point's pane's prices up and down). Returns the
     *  view to go back to, or null when nothing changed (both ends on one bar). */
    zoomToBox?(x0: number, y0: number, x1: number, y1: number): ZoomSnapshot | null;
    /** Put back a view {@link zoomToBox} left. */
    restoreZoom?(snap: ZoomSnapshot): void;
}

/** One entry of the Zoom Out stack: the view before a Zoom In. */
export interface ZoomSnapshot {
    viewport: { barSpacing: number; rightOffset: number };
    paneId: string;
    /** The pane's manual price window then, or null when it was autoscaled. */
    manual: { min: number; max: number; log?: boolean; invert?: boolean } | null;
}

/** TradingView's zoom box: its blue at 30 % inside, 80 % on the 1 px border (module 649873). */
const ZOOM_BOX_FILL = 'rgba(41, 98, 255, 0.3)';
const ZOOM_BOX_LINE = 'rgba(41, 98, 255, 0.8)';

/** No interaction targets on the interleave layers — handles always paint in front. */
const EMPTY_TARGETS: PaintTargets = {};

/**
 * Which interleave layer a drawing belongs to: the first series boundary at-or-above its z —
 * the slice painted just before that series, so a drawing TYING a series' z paints under it.
 * Null when the drawing clears every boundary and belongs on the top canvas instead.
 */
export function sliceKeyFor(zIndex: number, boundaries: readonly number[]): number | null {
    if (boundaries.length === 0 || zIndex > boundaries[boundaries.length - 1]!) return null;
    return boundaries.find((b) => b >= zIndex)!;
}

/**
 * The native renderer's implementation of {@link IDrawingsRendererPort}. Owns the top
 * drawings canvas (L1.5, over the series) plus the INTERLEAVE layers — prepainted
 * plot-sized canvases handed to the geometry backend for the drawings whose z puts
 * them under a series (below the candles, between two indicators) — the interaction
 * state machine (place/select), the settings popup, and hit-testing. The core
 * `DrawingController` is the source of truth — this projects its `syncDrawings`
 * snapshots and reports gestures back as intents. It never holds authoritative
 * state beyond the current projection.
 */
/** Id of the ruler's stand-in when its span is marked on the axes (never stored). */
const RULER_ID = '__ruler';

/** TradingView's "Anchor drawing" toggle: each text / note and its screen-pinned twin. */
const ANCHOR_TWIN: Readonly<Record<string, DrawingTypeKey>> = Object.fromEntries(
    ([['text', 'anchoredtext'], ['note', 'anchorednote']] as const).flatMap(([a, b]) => [[a, b], [b, a]]),
);

export class UserDrawingController implements IDrawingsRendererPort {
    private ctx: CanvasRenderingContext2D | null = null;
    private drawings: Drawing[] = [];
    /** Ids painted on an interleave layer this frame — the top canvas paints only their handles. */
    private sliced = new Set<string>();
    /** Interleaved drawings mid-drag: painted on the top canvas, left out of their slice. */
    private lifted = new Set<string>();
    /** Cached slice canvases, keyed `paneId|beforeZ`, reused across frames to avoid churn. */
    private readonly sliceCache = new Map<string, HTMLCanvasElement>();
    /** Series boundaries per pane as of the last `prepareSlices` — lets a repaint between data
     *  frames split front/interleaved consistently instead of flickering a drawing onto the
     *  wrong layer for a frame. */
    private lastBounds = new Map<string, readonly number[]>();
    /** Set by pointerDown when the current press landed on a price alert (see clearTransient). */
    private alertPressedOn = false;
    private selectedIds = new Set<string>(); // selected drawings (handles shown); [first] drives the popup
    private hoveredId: string | null = null; // the drawing under the cursor (its handles show)
    private activeTool: DrawingTypeKey | null = null;
    private activeToolStyle: SerializedDrawing['style'] | undefined; // last-used style for the armed tool (seeds the placement ghost)
    private intentCb: ((i: DrawingIntent) => void) | null = null;
    /** Another chart's in-progress placement, mirrored here as a ghost (drawings sync). */
    private externalGhost: Drawing | null = null;
    /** The chart's bar axis when its x counts bars, else null (see core `futureAnchors`). */
    private barAxis: BarAxis | null = null;
    /** Core-pushed series gateway (finer-timeframe bars for data-driven drawings). */
    private seriesGw: DrawingSeriesGateway | null = null;
    private seriesGwUnsub: Unsubscribe | null = null;
    /** Last draft fingerprint reported upstream — gates the per-render emission to actual changes. */
    private lastDraftKey: string | null = null;
    private readonly measure = new MeasureOverlay(); // transient ruler — not a persistent drawing
    private toolbarVisible = false; // mirrors showToolbar (drives the gutter reservation)
    private toolbarCollapsed = false; // the bar is a slim expand-strip (narrower gutter)
    /** Mobile chrome: the docked bar is suppressed (the shell provides its own tool
     *  picker) while `toolbarVisible` keeps the host's INTENT for a later desktop flip. */
    private mobileLayout = false;
    /** Self-serve Ctrl+Z / Ctrl+Y as drawing undo/redo. A host that owns a UNIFIED
     *  history (drawings + app ops in one timeline) turns this off so the chords
     *  bubble to its keymap instead — see the renderer's `historyChords` feature. */
    historyChords = true;
    private measureMode = false; // the ruler is armed (placing a measurement)
    private zoomMode = false; // Zoom In is armed
    /** The Zoom In press: `x` snapped to a bar centre, `px` where the pointer was. */
    private zoomStart: { x: number; y: number; px: number } | null = null;
    private zoomCursor: { x: number; y: number } | null = null;
    /** Zoom Out goes back through these, newest last (TradingView's zoom stack). */
    private readonly zoomStack: ZoomSnapshot[] = [];
    /** Drawing types the host can put an alert on (their toolbar shows Add Alert). */
    private alertTypes: ReadonlySet<string> = new Set();
    private eraserMode = false; // click/drag over a drawing deletes it
    private erasing = false; // a button is held during eraser mode (so a drag erases multiple)
    // The inline on-chart text editor: its element, the id of the drawing it edits, the text it
    // opened with (so Escape can put it back), and the text the core currently holds (so an edit is
    // reported exactly when it actually changes).
    private textEditor: { el: HTMLTextAreaElement; id: string; initial: string; stored: string; css: string } | null = null;
    /** TradingView's table: the cell being typed in (one at a time, over the cell). */
    private tableEditor: { el: HTMLTextAreaElement; id: string; cell: [number, number]; initial: string; css: string } | null = null;

    private readonly painter = new DrawingPainter();
    private readonly interaction: DrawingInteraction;
    private readonly popup: DrawingSettingsPopup;
    /** The open popup is the multi-selection bar (vs one drawing's own) — decides what a
     *  shrinking selection does with it. */
    private popupMulti = false;
    private readonly toolbar: DrawingToolbar;

    constructor(
        private readonly toolbarHost: HTMLElement, // the left gutter (docked toolbar)
        private readonly overlayHost: HTMLElement, // the inset plot (settings popup + inline editor float over drawings)
        private readonly canvas: HTMLCanvasElement,
        private readonly deps: UserDrawingDeps,
    ) {
        this.ctx = canvas.getContext('2d');
        this.popup = new DrawingSettingsPopup(overlayHost, deps.theme(), () => deps.chartBarMs());
        this.painter.axisLabel = (paneId, price) => deps.axisLabel?.(paneId, price) ?? null;
        // An image drawing's picture arrives later: repaint both layers (it may sit under the candles) once it has.
        this.painter.onAssetLoaded = () => {
            this.render();
            this.deps.requestDataPaint();
        };
        this.toolbar = new DrawingToolbar(
            toolbarHost,
            deps.theme(),
            (type) => this.emit({ kind: 'arm', type }),
            (mode) => {
                this.deps.setSnapMode(mode);
                this.emit({ kind: 'snap-mode', mode }); // keep the core mirror (+ external toolbars) in sync
            },
            () => this.withModeIntent(() => this.toggleMeasure()),
            () => this.withModeIntent(() => this.toggleEraser()),
            (type, on) => this.emit({ kind: 'favorite', type, on }),
            (on) => this.emit({ kind: 'stay-mode', on }),
            {
                onZoom: () => this.withModeIntent(() => this.toggleZoom()),
                onZoomOut: () => this.zoomOut(),
                onCollapse: (collapsed) => {
                    this.toolbarCollapsed = collapsed;
                    this.syncToolbarGutter();
                },
            },
        );
        this.interaction = new DrawingInteraction({
            projector: () => this.deps.projector(),
            activeTool: () => this.activeTool,
            drawings: () => this.shownDrawings(),
            hoveredId: () => this.hoveredId,
            selectedIds: () => this.selectedIds,
            emit: (i) => this.emit(i),
            changed: () => {
                this.syncLift(); // a live drag paints its drawing on top, out of the series stack
                this.render();
            },
            openSettings: (id, x, y) => this.openSettingsById(id, x, y),
            snap: (pt, paneId, mode, cursorPx) => this.deps.snap(pt, paneId, mode, cursorPx),
            lastStyle: () => this.activeToolStyle,
        });
    }

    // ── IDrawingsRendererPort (commands down) ──
    setToolbar(def: ToolbarDefinition): void {
        this.toolbar.setDefinition(def);
    }

    showToolbar(visible: boolean): void {
        this.toolbarVisible = visible;
        this.toolbar.setVisible(visible && !this.mobileLayout);
        this.syncToolbarGutter(); // reserve/release the left gutter so the bar never overlaps the plot
    }

    /** Mobile suppresses the docked toolbar (hover flyouts don't work with touch; the
     *  shell's own drawer picks tools instead) and releases its gutter; flipping back
     *  to desktop restores whatever `showToolbar` last asked for. */
    setLayoutMode(mode: 'mobile' | 'desktop'): void {
        this.mobileLayout = mode === 'mobile';
        this.toolbar.setVisible(this.toolbarVisible && !this.mobileLayout);
        this.syncToolbarGutter();
    }

    /** The gutter follows the bar's current footprint: hidden 0, collapsed a slim strip, else full width. */
    private syncToolbarGutter(): void {
        const shown = this.toolbarVisible && !this.mobileLayout;
        this.deps.setToolbarGutter(shown ? (this.toolbarCollapsed ? TOOLBAR_COLLAPSED_WIDTH : TOOLBAR_WIDTH) : 0);
    }

    /** Core push: the series gateway data-driven drawings read finer-timeframe bars
     *  through (surfaced to them as `Projector.seriesInRange`). A landed background
     *  fetch repaints both this layer and the interleave slices under the series. */
    setSeriesGateway(gateway: DrawingSeriesGateway): void {
        this.seriesGwUnsub?.();
        this.seriesGw = gateway;
        this.seriesGwUnsub = gateway.onUpdate(() => {
            this.invalidateSlices();
            this.render();
            this.deps.requestDataPaint();
        });
    }

    /** Core push: the app object drawings read as `Projector.host`. */
    setHost(host: unknown): void {
        this.hostObj = host;
    }

    /** What `setHost` attached (undefined before). */
    get host(): unknown {
        return this.hostObj;
    }
    private hostObj: unknown = undefined;

    /** Repaint this layer and the interleave slices under the series: a drawing's background data landed. */
    repaint(): void {
        this.invalidateSlices();
        this.render();
        this.deps.requestDataPaint();
    }

    /** The pushed series gateway, or null before the core provides one. */
    get seriesGateway(): DrawingSeriesGateway | null {
        return this.seriesGw;
    }

    /** Core push: mirror (or clear) another chart's in-progress placement as a ghost. */
    setExternalGhost(doc: SerializedDrawing | null): void {
        this.externalGhost = doc ? deserializeDrawing(doc) : null;
        this.render();
    }

    /**
     * Place anchors kept as "n bars after a bar" for the chart's axis: at their bar on a chart whose x counts bars,
     * at their saved time on a time chart (`null`). The renderer calls it whenever it builds the projector.
     */
    applyBarAxis(axis: BarAxis | null): void {
        this.barAxis = axis;
        for (const d of this.drawings) {
            d.barAxis = axis;
            resolveAnchors(d.anchors, axis);
        }
        if (this.externalGhost) resolveAnchors(this.externalGhost.anchors, axis);
    }

    syncDrawings(docs: readonly SerializedDrawing[]): void {
        this.drawings = docs.map((d) => deserializeDrawing(d)).filter((d): d is Drawing => d != null);
        this.applyBarAxis(this.barAxis);
        // The edited drawing can vanish from under the editor (deleted, erased, undone) — take the
        // editor with it instead of leaving a live textarea over nothing.
        if (this.textEditor && !this.editedDrawing(this.textEditor.id)) this.closeTextEditor();
        if (this.tableEditor && !this.tableById(this.tableEditor.id)) this.finishTableEditor(false);
        this.invalidateSlices();
        this.render();
        this.deps.requestScaleUpdate();
    }

    /** The pane's series stack in z terms — how the core places a new drawing (just under
     *  `price`) and computes "front of everything" / "behind everything" for the reorders. */
    stackRange(paneId: string): { front: number; back: number; price?: number } {
        const b = this.deps.seriesBoundaries(paneId);
        return { front: Math.max(0, ...b), back: Math.min(0, ...b), price: this.deps.priceZ(paneId) ?? undefined };
    }

    plotClientRect(): { left: number; top: number; width: number; height: number } | null {
        const r = this.overlayHost.getBoundingClientRect();
        return r.width > 0 && r.height > 0 ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
    }

    pointAtClient(clientX: number, clientY: number): { time: number; price: number; paneId: string } | null {
        const r = this.plotClientRect();
        if (!r) return null;
        const x = clientX - r.left;
        const y = clientY - r.top;
        if (x < 0 || y < 0 || x > r.width || y > r.height) return null;
        const proj = this.deps.projector();
        const paneId = proj.paneIdAtY(y);
        if (!paneId) return null;
        return { ...proj.pxToPoint(x, y, paneId), paneId };
    }

    /**
     * Union of the visible drawings' price ranges on `paneId` whose time extent
     * intersects [fromTime, toTime]. Hidden drawings and full-width references
     * (hline → null extent) are handled too. Kept as the seam for a future
     * per-drawing autoscale opt-in — the renderer does not fold this in today.
     */
    priceRangeForPane(paneId: string, fromTime: number, toTime: number): { min: number; max: number } | null {
        let lo = Infinity;
        let hi = -Infinity;
        for (const d of this.drawings) {
            if (!d.visible || d.paneId !== paneId) continue;
            const ext = d.timeExtent();
            if (ext && (ext.max < fromTime || ext.min > toTime)) continue; // off-screen in time
            const pr = d.priceRange();
            if (!pr) continue;
            if (pr.min < lo) lo = pr.min;
            if (pr.max > hi) hi = pr.max;
        }
        return lo <= hi ? { min: lo, max: hi } : null;
    }

    setActiveTool(type: DrawingTypeKey | null, lastStyle?: SerializedDrawing['style']): void {
        if (type != null) {
            this.finishTextEditor(true); // arming a real tool ends an open inline edit (keeping the text)
            // Picking a drawing tool cancels the ruler and the eraser — a mutual-exclusion
            // side effect the core (and any external toolbar) learns via the mode intent.
            this.withModeIntent(() => {
                if (this.measureMode) this.exitMeasure();
                if (this.eraserMode) this.exitEraser();
                if (this.zoomMode) this.exitZoom();
            });
        }
        this.activeTool = type;
        this.activeToolStyle = lastStyle; // seeds the placement ghost so it matches the last-used color
        this.toolbar.setActiveTool(type);
        if (type == null) this.interaction.onToolCleared();
        else this.clearSelection(); // arming a tool dismisses an open settings popup + selection
        this.render();
    }

    /** Core push: the armed tool's remembered style changed; the next placement preview draws in it. */
    setActiveToolStyle(lastStyle: SerializedDrawing['style'] | undefined): void {
        this.activeToolStyle = lastStyle;
    }

    /** Core push: the favorite tool set changed — reflect the flyout stars. */
    setFavorites(types: readonly DrawingTypeKey[]): void {
        this.toolbar.setFavorites(types);
    }

    /** Core push: per-tool shortcut hints (display strings) shown in the toolbar flyouts. */
    setToolShortcuts(map: Readonly<Partial<Record<DrawingTypeKey, string>>>): void {
        this.toolbar.setShortcuts(map);
    }

    /** Core push: set the sticky magnet mode. Applies to the renderer + reflects on the
     *  in-chart toolbar WITHOUT notifying back (the caller already holds the value). */
    setSnapMode(mode: SnapMode): void {
        this.deps.setSnapMode(mode);
        this.toolbar.setMagnetMode(mode);
    }

    /** Core push: stay-in-drawing-mode — reflect on the toolbar without notifying back. */
    setStayMode(on: boolean): void {
        this.toolbar.setStayMode(on);
    }

    /** Core push: enter/exit measure or eraser (`null` = none). Reuses the toolbar
     *  toggles so the mutual exclusion (and the button highlights) stay in one place;
     *  any ACTUAL change is reported back through the mode intent. */
    setMode(mode: DrawingMode): void {
        this.withModeIntent(() => {
            if (mode === 'measure') {
                if (!this.measureMode) this.toggleMeasure();
            } else if (mode === 'eraser') {
                if (!this.eraserMode) this.toggleEraser();
            } else if (mode === 'zoom') {
                if (!this.zoomMode) this.toggleZoom();
            } else {
                if (this.measureMode) this.exitMeasure();
                if (this.eraserMode) this.exitEraser();
                if (this.zoomMode) this.exitZoom();
            }
        });
    }

    /** The current renderer-local mode (measure/eraser/none). */
    private modeOf(): DrawingMode {
        return this.measureMode ? 'measure' : this.eraserMode ? 'eraser' : this.zoomMode ? 'zoom' : null;
    }

    /** Run a state transition and report the mode ONCE if it actually changed — the
     *  single choke point that keeps toggles, mutual exclusions, and core pushes from
     *  double-emitting (an equal-value intent is dropped core-side anyway). */
    private withModeIntent(fn: () => void): void {
        const before = this.modeOf();
        fn();
        const after = this.modeOf();
        if (after !== before) this.emit({ kind: 'mode', mode: after });
    }

    /** TradingView pastes a copy 40 px above its source. A card or a picture that moves on the screen moves the
     *  same way here; everything else by price. */
    shiftForPaste(docs: readonly SerializedDrawing[]): SerializedDrawing[] {
        const proj = this.deps.projector();
        return docs.map((doc) => {
            const d = deserializeDrawing(doc);
            if (!d) return doc;
            const px = d.translateBodyPx(0, -PASTE_SHIFT, d.anchors, proj);
            const anchors =
                px ??
                d.anchors.map((a) => {
                    const y = proj.yOf(a.price, d.paneId);
                    return y == null ? { ...a } : { ...a, price: proj.pxToPoint(proj.xOf(a.time), y - PASTE_SHIFT, d.paneId).price };
                });
            return { ...doc, anchors };
        });
    }

    setSelection(ids: readonly string[]): void {
        // A table that is no longer selected keeps no active cell (TradingView).
        for (const d of this.drawings) if (d instanceof TableDrawing && !ids.includes(d.id) && tableActiveCell(d.id)) {
            if (this.tableEditor?.id === d.id) this.finishTableEditor(true);
            setTableActiveCell(d.id, null);
        }
        this.selectedIds = new Set(ids);
        // A multi-selection gets ONE bar for all of its drawings; when it shrinks back to a single
        // drawing that drawing's own bar takes over, and an emptied selection takes the bar away.
        if (ids.length >= 2) this.openSettingsForSelection(ids);
        else if (this.popupMulti) {
            this.popupMulti = false;
            this.popup.close();
            if (ids.length === 1) this.openSettingsById(ids[0]!, 0, 0);
        }
        this.render();
    }

    /** Programmatic twin of clicking the drawing: highlight it + float its settings popup. */
    openSettings(id: string): void {
        this.openSettingsById(id, 0, 0);
    }

    onDrawingIntent(cb: (intent: DrawingIntent) => void): Unsubscribe {
        this.intentCb = cb;
        return () => {
            if (this.intentCb === cb) this.intentCb = null;
        };
    }

    // ── pointer/keyboard entry points (driven by InputController/KeyboardController) ──
    /** Should the drawing layer win this press (vs pan)? */
    claim(x: number, y: number): boolean {
        if (this.measureMode || this.eraserMode || this.zoomMode) return true; // these modes capture their clicks (no pan)
        if (this.magnifierChipAt(x, y)) return true; // the chip is a dropdown trigger, never a pan start
        if (this.activeTool == null && this.alertTrashAt(x, y)) return true; // trash button: a click, never a pan
        return this.interaction.claim(x, y);
    }

    /** Should the drawing layer win a press that lands on an axis strip (price or time scale)? Only what lives in
     *  the gutter: the magnifier chip, the alert trash button and a price alert's tag. A tool's own handle or edge
     *  that reaches the gutter (a position box runs to the scale) must not grab the press, or the scale can't be
     *  dragged. An armed tool, the ruler and the eraser leave the axis to the scale as well. */
    claimOnAxis(x: number, y: number): boolean {
        if (this.magnifierChipAt(x, y)) return true;
        if (this.activeTool == null && this.alertTrashAt(x, y)) return true;
        if (this.activeTool != null || this.measureMode || this.eraserMode || this.zoomMode) return false;
        return this.interaction.claimOnly(x, y, (d) => d instanceof PriceAlert);
    }

    /** The topmost visible (unlocked) magnifier whose timeframe chip contains (x, y) —
     *  the chip's rect is what the painter measured last frame. */
    private magnifierChipAt(x: number, y: number): Magnifier | null {
        for (let i = this.drawings.length - 1; i >= 0; i -= 1) {
            const d = this.drawings[i]!;
            if (!(d instanceof Magnifier) || !d.visible || d.locked) continue;
            const r = d.chipRect;
            if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return d;
        }
        return null;
    }

    /** Open the on-chart chip's timeframe menu; the pick patches the drawing like a
     *  settings-popup edit (same intent, same undo step). */
    private openMagnifierChipMenu(drawing: Magnifier): void {
        const rect = drawing.chipRect;
        if (!rect) return;
        const id = drawing.id;
        this.popup.openMagnifierTimeframeMenu(rect, drawing.magnifier.timeframe, (value) => {
            const d = this.drawings.find((x) => x.id === id);
            if (!(d instanceof Magnifier)) return;
            d.applySettings({ 'magnifier.timeframe': value });
            this.render();
            this.emit({ kind: 'edit', doc: d.serialize() });
        });
    }

    /** Delete the (unlocked) drawing under the cursor. True when one was removed.
     *  Shared by the eraser (click + drag) and the middle-click shortcut; the latter passes
     *  `withSelection` so a hit on a member of a multi-selection removes the selection's
     *  unlocked members — whichever member was hit, locked or not. */
    deleteAt(x: number, y: number, withSelection = false): boolean {
        const hit = topDrawingAt(this.shownDrawings(), x, y, this.deps.projector(), HIT_TOLERANCE);
        if (!hit) return false;
        const ids = deleteTargets(hit, this.selectedIds, this.drawings, withSelection);
        if (ids.length === 0) return false;
        this.popup.close();
        this.emit({ kind: 'delete', ids });
        return true;
    }

    /** Shift+press on the empty plot: arm the measure ruler AND start it at (x, y) in one
     *  gesture — the equivalent of clicking the toolbar's Measure button, then pressing.
     *  `snap` is the effective magnet (sticky mode, or Ctrl/Cmd-forced strong). Returns
     *  false when a mode/tool is already active (the normal press path owns it). */
    beginMeasureAt(x: number, y: number, snap: SnapMode = 'off'): boolean {
        if (this.measureMode || this.eraserMode || this.zoomMode || this.activeTool != null) return false;
        this.withModeIntent(() => this.toggleMeasure());
        const g = this.rulerPoint(x, y, snap);
        this.measure.down(x, y, g.x, g.y);
        this.render();
        return true;
    }

    /** A press landed on the chart: a finished transient measurement clears (the ruler vanishes on the
     *  next press / pan / zoom), and an open inline edit ends. This runs for EVERY press, including the
     *  ones the drawings layer doesn't claim — a press on empty chart is a pan, and the editor may not
     *  hold focus (the settings popup can), so neither `pointerDown` nor blur would end the edit. */
    clearTransient(): void {
        if (this.textEditor) this.finishTextEditor(true); // clicking off the text keeps what was typed
        if (this.measure.isFinished()) {
            this.measure.clear();
            this.render();
        }
        // A price alert has no settings popup to dismiss on an outside press, so its hover/selected pill
        // would stay forever (touch has no hover to retire it). Every press runs through here first; a press
        // that lands ON the alert re-engages it in pointerDown. The repaint is deferred so the drawings
        // hit-test of THIS press still sees last frame's pill/trash rects.
        const isAlert = (id: string | null): boolean => id != null && this.drawings.find((d) => d.id === id) instanceof PriceAlert;
        if (isAlert(this.hoveredId) || [...this.selectedIds].some((id) => isAlert(id))) {
            this.alertPressedOn = false;
            queueMicrotask(() => {
                if (this.alertPressedOn) return; // the press grabbed the alert (pill / trash / stub): keep it engaged
                if (isAlert(this.hoveredId)) this.hoveredId = null;
                if ([...this.selectedIds].some((id) => isAlert(id))) this.clearSelection();
                else this.render();
            });
        }
    }

    /** Ctrl/Cmd+press on the empty plot: sweep a selection box (adds the drawings it touches to
     *  the selection). Returns false when a mode/tool is active (the normal press path owns it). */
    beginMarqueeAt(x: number, y: number): boolean {
        if (this.measureMode || this.eraserMode || this.zoomMode || !this.interaction.beginMarquee(x, y)) return false;
        this.render();
        return true;
    }

    pointerDown(x: number, y: number, snap: SnapMode = 'off', shift = false, mod = false): void {
        if (this.zoomMode) {
            // TradingView: the first press starts the box, a second press (after a click) ends it.
            if (this.zoomStart) this.finishZoom(x, y);
            else {
                this.zoomStart = { x: this.deps.zoomSnapX?.(x) ?? x, y, px: x };
                this.zoomCursor = { x, y };
                this.render();
            }
            return;
        }
        if (this.eraserMode) {
            this.erasing = true; // hold to drag-erase across multiple drawings
            this.deleteAt(x, y);
            return;
        }
        if (this.measureMode) {
            const g = this.rulerPoint(x, y, snap);
            this.measure.down(x, y, g.x, g.y);
            // 2nd click finishes → disarm (reported as a mode change), keep the ruler shown.
            if (this.measure.isFinished()) this.withModeIntent(() => this.exitMeasure(false));
            this.render();
            return;
        }
        // The magnifier's timeframe chip swallows its press: it opens the pick menu instead
        // of selecting/dragging the drawing under it (no tool armed — placement wins then).
        if (this.activeTool == null) {
            const chipOwner = this.magnifierChipAt(x, y);
            if (chipOwner) {
                this.openMagnifierChipMenu(chipOwner);
                return;
            }
        }
        // A price alert's trash button deletes it instead of starting a drag.
        if (this.activeTool == null) {
            const doomed = this.alertTrashAt(x, y);
            if (doomed) {
                this.popup.close();
                this.emit({ kind: 'delete', ids: [doomed.id] });
                return;
            }
        }
        // A tap lands with no preceding pointermove (touch), so refresh the hover target for THIS press.
        if (this.activeTool == null) {
            if (topDrawingAt(this.shownDrawings(), x, y, this.deps.projector(), HIT_TOLERANCE) instanceof PriceAlert) this.alertPressedOn = true;
            this.updateHover(x, y);
        }
        this.interaction.down(x, y, snap, shift, mod); // the popup self-dismisses on any outside press
    }

    /** True while (x, y) is on a price alert's hover tag (only set while the tag is showing).
     *  The crosshair steps aside there so its line does not strike through the tag. */
    overAlertTag(x: number, y: number): boolean {
        for (let i = this.drawings.length - 1; i >= 0; i -= 1) {
            const d = this.drawings[i]!;
            if (!(d instanceof PriceAlert) || !d.visible) continue;
            const r = d.pillRect;
            if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
        }
        return false;
    }

    /** The topmost visible, unlocked price alert whose trash button contains (x, y) (the rect the
     *  painter measured last frame; only set while the alert's pill is showing). */
    private alertTrashAt(x: number, y: number): PriceAlert | null {
        for (let i = this.drawings.length - 1; i >= 0; i -= 1) {
            const d = this.drawings[i]!;
            if (!(d instanceof PriceAlert) || !d.visible || d.locked) continue;
            const r = d.trashRect;
            if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return d;
        }
        return null;
    }

    pointerMove(x: number, y: number, snap: SnapMode = 'off', shift = false, mod = false): void {
        if (this.zoomMode) {
            if (this.zoomStart) {
                this.zoomCursor = { x, y };
                this.render();
            }
            return;
        }
        if (this.eraserMode) {
            if (this.erasing) this.deleteAt(x, y); // erase only while the button is held (not on hover)
            return;
        }
        if (this.measureMode) {
            const g = this.rulerPoint(x, y, snap);
            this.measure.move(g.x, g.y); // click-move-click: the cursor sizes the ruler with no button down
            this.render();
            return;
        }
        this.interaction.move(x, y, snap, shift);
        this.updateHover(x, y, mod); // show handles for the drawing under the cursor
    }

    /** Track which drawing is hovered so its handles appear on hover (and only then). While
     *  Ctrl/Cmd is held the cursor is picking a selection — handles then mark only what IS
     *  selected, so a hovered candidate doesn't already read as selected. */
    private updateHover(x: number, y: number, mod = false): void {
        let id: string | null = null;
        if (!mod && this.activeTool == null && !this.interaction.isPlacing() && !this.interaction.isDragging()) {
            id = topDrawingAt(this.shownDrawings(), x, y, this.deps.projector(), HIT_TOLERANCE)?.id ?? null;
        }
        if (id !== this.hoveredId) {
            this.hoveredId = id;
            this.render();
        }
    }

    /** Drop the hover (its handles) — the pointer no longer reaches the drawings. */
    clearHover(): void {
        if (this.hoveredId == null) return;
        this.hoveredId = null;
        this.render();
    }

    pointerUp(x: number, y: number, snap: SnapMode = 'off'): void {
        if (this.zoomMode) {
            // A press-drag-release zooms in one gesture; a click leaves the box open for the second click.
            const s = this.zoomStart;
            if (s && (Math.abs(x - s.px) > 3 || Math.abs(y - s.y) > 3)) this.finishZoom(x, y);
            return;
        }
        if (this.eraserMode) {
            this.erasing = false;
            return;
        }
        if (this.measureMode) {
            const g = this.rulerPoint(x, y, snap);
            this.measure.up(x, y, g.x, g.y); // press-drag-release finishes the ruler in one gesture
            if (this.measure.isFinished()) this.withModeIntent(() => this.exitMeasure(false));
            this.render();
            return;
        }
        // A drag of a SELECTED drawing dismissed its bar on the press (but kept the selection —
        // see onPopupDismissed); once the drag lands, bring the bar back over the moved drawings.
        const dragged = this.interaction.isDragging() ? this.interaction.pressedId() : null;
        this.interaction.up(x, y); // commit a drag, or open settings on a no-move click
        if (dragged && this.selectedIds.has(dragged) && !this.popup.isOpen()) {
            if (this.selectedIds.size >= 2) this.openSettingsForSelection(this.selectionIds());
            else this.openSettingsById(dragged, x, y);
        }
    }

    /** A ruler end: the magnet's point, its x on the bar centre (TradingView measures from bar to bar). */
    private rulerPoint(x: number, y: number, snap: SnapMode): { x: number; y: number } {
        const g = this.interaction.snapCursor(x, y, snap);
        return { x: this.deps.zoomSnapX?.(g.x) ?? g.x, y: g.y };
    }

    /** Toggle the transient ruler. Arming it clears any drawing tool + selection. */
    private toggleMeasure(): void {
        if (this.measureMode) {
            this.exitMeasure();
            return;
        }
        if (this.eraserMode) this.exitEraser(); // only one renderer-local mode at a time
        if (this.zoomMode) this.exitZoom();
        this.measure.clear();
        this.measureMode = true;
        this.emit({ kind: 'arm', type: null }); // clear any armed drawing tool (core-authoritative)
        this.clearSelection();
        this.toolbar.setMeasureActive(true);
        this.render();
    }

    /** Toggle the eraser: click/drag over a drawing to delete it. Mutually exclusive with the
     *  ruler + any armed drawing tool. */
    private toggleEraser(): void {
        if (this.eraserMode) {
            this.exitEraser();
            return;
        }
        if (this.measureMode) this.exitMeasure();
        if (this.zoomMode) this.exitZoom();
        this.eraserMode = true;
        this.erasing = false;
        this.emit({ kind: 'arm', type: null }); // drop any armed drawing tool
        this.clearSelection();
        this.toolbar.setEraserActive(true);
        this.render();
    }

    /** Arm or disarm Zoom In (the toolbar button). Arming drops any other tool or mode, like the ruler. */
    private toggleZoom(): void {
        if (this.zoomMode) {
            this.exitZoom();
            return;
        }
        if (this.measureMode) this.exitMeasure();
        if (this.eraserMode) this.exitEraser();
        this.emit({ kind: 'arm', type: null });
        this.clearSelection();
        this.zoomMode = true;
        this.toolbar.setZoomActive(true);
        this.render();
    }

    /** Leave Zoom In, dropping an unfinished box (TradingView's `cancelZoom` plus the cursor tool). */
    private exitZoom(): void {
        this.zoomMode = false;
        this.zoomStart = null;
        this.zoomCursor = null;
        this.toolbar.setZoomActive(false);
        this.render();
    }

    /** End the box at (x, y): zoom to it (unless both ends are on one bar), then back to the cursor, as TradingView. */
    private finishZoom(x: number, y: number): void {
        const s = this.zoomStart;
        if (!s) return;
        const snap = this.deps.zoomToBox?.(s.x, s.y, x, y) ?? null;
        if (snap) {
            this.zoomStack.push(snap);
            this.toolbar.setZoomOutShown(true);
        }
        this.withModeIntent(() => this.exitZoom());
    }

    /** Zoom Out (the toolbar button shown while there is a zoom to undo): back to the view before the last Zoom In. */
    zoomOut(): boolean {
        const snap = this.zoomStack.pop();
        if (!snap) return false;
        this.deps.restoreZoom?.(snap);
        this.toolbar.setZoomOutShown(this.zoomStack.length > 0);
        return true;
    }

    /** The types whose floating toolbar shows Add Alert (the host's list). */
    setAlertTypes(types: readonly string[]): void {
        this.alertTypes = new Set(types);
    }

    /** True while there is a Zoom In to go back from. */
    canZoomOut(): boolean {
        return this.zoomStack.length > 0;
    }

    /** The Zoom In box, bar centre to bar centre (TradingView's crosshair selection rectangle). */
    private paintZoomBox(ctx: CanvasRenderingContext2D): void {
        const s = this.zoomStart;
        const c = this.zoomCursor;
        if (!s || !c) return;
        const x1 = this.deps.zoomSnapX?.(c.x) ?? c.x;
        const left = Math.min(s.x, x1);
        const top = Math.min(s.y, c.y);
        const w = Math.abs(x1 - s.x);
        const h = Math.abs(c.y - s.y);
        ctx.save();
        ctx.fillStyle = ZOOM_BOX_FILL;
        ctx.fillRect(left, top, w, h);
        ctx.strokeStyle = ZOOM_BOX_LINE;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(left) + 0.5, Math.round(top) + 0.5, Math.round(w), Math.round(h));
        ctx.restore();
    }

    private exitEraser(): void {
        this.eraserMode = false;
        this.erasing = false;
        this.toolbar.setEraserActive(false);
        this.render();
    }

    /** Leave ruler mode. `clearGraphic` keeps a just-finished measurement on screen (false). */
    private exitMeasure(clearGraphic = true): void {
        this.measureMode = false;
        this.interaction.clearSnapMarker();
        if (clearGraphic) this.measure.clear();
        this.toolbar.setMeasureActive(false);
        this.render();
    }

    private tableById(id: string): TableDrawing | null {
        const d = this.drawings.find((x) => x.id === id);
        return d instanceof TableDrawing ? d : null;
    }

    /** The editor over a table cell: inside its borders, the cell's padding, font, colours and alignment. */
    private tableCellCss(d: TableDrawing, [r, c]: [number, number]): string | null {
        const L = d.layout(this.deps.projector());
        if (!L || r >= d.rows() || c >= d.cols()) return null;
        const theme = this.deps.theme();
        const bw = TV_TABLE.border + TV_TABLE.activeLine;
        const px = d.fontSize ?? TV_TABLE.fontSize;
        const back = d.style.fillColor ?? TV_TABLE.background;
        const left = L.colX[c]! + bw;
        const top = L.rowY[r]! + bw;
        const pad = Math.max(0, TV_TABLE.padding - TV_TABLE.activeLine);
        return (
            'position:absolute;z-index:24;box-sizing:border-box;resize:none;overflow:hidden;margin:0;outline:none;pointer-events:auto;border:none;' +
            `left:${left}px;top:${top}px;width:${L.colX[c + 1]! - TV_TABLE.activeLine - left}px;height:${L.rowY[r + 1]! - TV_TABLE.activeLine - top}px;padding:${pad}px;` +
            `background:${blendOver(back, theme.background, splitColor(back).alpha)};color:${safeCssColor(d.textColor, TV_TABLE.text)};` +
            `font:${px}px ${theme.fontFamily};line-height:${px * TV_TABLE.lineHeight}px;text-align:${d.horzAlign ?? 'left'};`
        );
    }

    /** Type into a table cell on the chart (TradingView): the text lands as you type, Tab / Shift+Tab go to the next /
     *  previous cell, Escape puts back what was there, a press elsewhere keeps it. */
    private editTableCell(id: string, cell: [number, number]): void {
        const d = this.tableById(id);
        if (!d) return;
        this.closeTextEditor();
        const [r, c] = cell;
        const initial = d.cells[r]?.[c] ?? '';
        setTableActiveCell(id, cell, true);
        const css = this.tableCellCss(d, cell);
        if (!css) return;
        const ta = document.createElement('textarea');
        ta.value = initial;
        ta.spellcheck = false;
        ta.style.cssText = css;
        ta.dataset.tableCell = `${r},${c}`;
        let frame = 0;
        ta.addEventListener('input', () => {
            this.tableById(id)?.applySettings({ [`cells.${r}.${c}`]: ta.value });
            if (frame) return;
            const paint = (): void => {
                frame = 0;
                if (this.tableEditor?.el === ta) this.render();
            };
            frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(paint) : (setTimeout(paint, 16) as unknown as number);
        });
        ta.addEventListener('pointerdown', (e) => e.stopPropagation());
        ta.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Tab') {
                e.preventDefault();
                const t = this.tableById(id);
                if (!t) return;
                const n = t.rows() * t.cols();
                const k = (r * t.cols() + c + (e.shiftKey ? n - 1 : 1)) % n;
                this.finishTableEditor(true);
                this.editTableCell(id, [Math.floor(k / t.cols()), k % t.cols()]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.finishTableEditor(false);
            }
        });
        ta.addEventListener('blur', (e) => {
            if (this.tableEditor?.el !== ta) return;
            // Reaching for the toolbar keeps the cell active (Insert row / column work from it).
            if (this.popup.contains((e as FocusEvent).relatedTarget as Node | null)) this.storeTableCell();
            else this.finishTableEditor(true);
        });
        this.overlayHost.appendChild(ta);
        this.tableEditor = { el: ta, id, cell, initial, css };
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        this.render();
    }

    /** Hand the cell's text to the core without ending the edit. */
    private storeTableCell(): void {
        const ed = this.tableEditor;
        const d = ed && this.tableById(ed.id);
        if (!ed || !d) return;
        const [r, c] = ed.cell;
        d.applySettings({ [`cells.${r}.${c}`]: ed.el.value });
        if (ed.el.value !== ed.initial) {
            ed.initial = ed.el.value;
            this.emit({ kind: 'edit', doc: d.serialize() });
        }
    }

    /** Close the cell editor, keeping (`commit`) or putting back the text; the cell stays active. */
    private finishTableEditor(commit: boolean): void {
        const ed = this.tableEditor;
        if (!ed) return;
        this.tableEditor = null; // first: removing the focused textarea fires blur
        const [r, c] = ed.cell;
        const value = commit ? ed.el.value : ed.initial;
        ed.el.remove();
        const d = this.tableById(ed.id);
        if (tableActiveCell(ed.id)) setTableActiveCell(ed.id, ed.cell, false);
        if (d) {
            const before = d.cells[r]?.[c];
            d.applySettings({ [`cells.${r}.${c}`]: value });
            if (value !== ed.initial || before !== value) this.emit({ kind: 'edit', doc: d.serialize() });
        }
        this.render();
    }

    /** TradingView's table rows and columns: added after the active cell (at the end when none), removed at it. */
    private tableOp(id: string, op: TableOp): void {
        const d = this.tableById(id);
        if (!d) return;
        const editing = this.tableEditor?.id === id;
        if (editing) this.finishTableEditor(true);
        const t = this.tableById(id) ?? d;
        const active = tableActiveCell(id)?.cell ?? null;
        const next = t.tableOp(op, active);
        setTableActiveCell(id, next);
        this.emit({ kind: 'edit', doc: t.serialize() });
        this.render();
        if (editing && next) this.editTableCell(id, next);
    }

    /**
     * Open an inline textarea over the drawing's own text so it is typed directly on the chart:
     * a callout fills its bubble, a plain text label sits exactly where the glyphs paint (the
     * canvas label is muted meanwhile, so what you type IS what the chart shows) inside a thin frame
     * that marks the text as being edited. An empty label shows a placeholder. Enter breaks the line,
     * a press on the chart (or Ctrl/Cmd+Enter) keeps the text, Escape puts back what was there. The
     * editor and the settings popup are one unit: reaching for a control in the popup does not end
     * the edit.
     */
    private editTextInline(id: string): void {
        const d = this.editedDrawing(id);
        if (!d) return;
        this.closeTextEditor();
        const initial = d.text?.value ?? '';
        const css = this.inlineEditorCss(d, initial);
        if (!css) return;
        const ta = document.createElement('textarea');
        ta.value = initial;
        ta.placeholder = TEXT_PLACEHOLDER;
        ta.spellcheck = false;
        ta.style.cssText = css;
        // live: the canvas bubble / hit box follow the typed text (and the editor re-lays out around it).
        // The text lands at once; the repaint is coalesced to one per frame, so a held Backspace or
        // fast typing never queues a repaint per key (a tester saw deleting lag, 2026-10-18).
        let frame = 0;
        const sync = (): void => {
            this.editedDrawing(id)?.applySettings({ 'text.value': ta.value });
            if (frame) return;
            const paint = (): void => {
                frame = 0;
                if (this.textEditor?.el === ta) this.render();
            };
            frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(paint) : (setTimeout(paint, 16) as unknown as number);
        };
        ta.addEventListener('input', sync);
        ta.addEventListener('pointerdown', (e) => e.stopPropagation());
        ta.addEventListener('keydown', (e) => {
            e.stopPropagation();
            // Enter breaks the line — the break is inserted here rather than left to the textarea's
            // default so it lands whatever else handled the key. Ctrl/Cmd+Enter is the keyboard way
            // to finish, for anyone who'd rather not click off the text.
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const at = ta.selectionStart;
                ta.setRangeText('\n', at, ta.selectionEnd, 'end');
                sync();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.finishTextEditor(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.finishTextEditor(false);
            }
        });
        ta.addEventListener('blur', (e) => {
            // Reaching for a control in the settings popup keeps the edit alive — but hand the text
            // over to the core first, so the popup's own patches build on it instead of a re-sync
            // dropping it.
            if (this.popup.contains((e as FocusEvent).relatedTarget as Node | null)) this.storeText(ta.value);
            else this.finishTextEditor(true); // clicking away keeps the text
        });
        this.overlayHost.appendChild(ta);
        this.textEditor = { el: ta, id, initial, stored: initial, css };
        ta.focus();
        // Caret at the end, nothing selected: reopening existing text with everything highlighted
        // reads as a rename/resize box rather than in-place editing (and one keystroke would
        // replace the whole annotation).
        ta.setSelectionRange(ta.value.length, ta.value.length);
    }

    /** Hand the edited text to the core (once per actual change) without ending the edit. */
    private storeText(value: string): void {
        const ed = this.textEditor;
        const d = ed && this.editedDrawing(ed.id);
        if (!ed || !d) return;
        d.applySettings({ 'text.value': value });
        if (value !== ed.stored) {
            ed.stored = value;
            this.emit({ kind: 'edit', doc: d.serialize() });
        }
    }

    /** The drawing an inline editor may edit, resolved fresh from the current projection (a core
     *  sync replaces the instances, so the editor holds an id rather than the object). */
    private editedDrawing(id: string): InlineEditable | null {
        const d = this.drawings.find((x) => x.id === id);
        return isInlineEditable(d) ? d : null;
    }

    /** Close the inline editor, keeping (`commit`) or reverting the typed text. A text label left
     *  with nothing in it would paint nothing at all, so it's dropped rather than left invisible. */
    private finishTextEditor(commit: boolean): void {
        const ed = this.textEditor;
        if (!ed) return;
        const value = commit ? ed.el.value : ed.initial;
        this.closeTextEditor();
        const d = this.editedDrawing(ed.id);
        if (!d) return; // deleted from under the editor
        d.applySettings({ 'text.value': value });
        this.render();
        if ((d instanceof TextLabel || (d instanceof Callout && d.tv)) && value.trim() === '') {
            this.clearSelection(); // its settings popup would outlive the drawing
            this.emit({ kind: 'delete', ids: [d.id] });
        } else if (value !== ed.stored) this.emit({ kind: 'edit', doc: d.serialize() });
    }

    /** Absolute position + text metrics for the inline editor, so the typed glyphs land where the
     *  painter would draw them. Null when the drawing has no on-screen box (off-pane anchor). */
    private inlineEditorCss(d: InlineEditable, value: string): string | null {
        const proj = this.deps.projector();
        const theme = this.deps.theme();
        const text = d.text;
        const fs = namedFontSize(text?.size ?? 'normal');
        const font = `${text?.italic ? 'italic ' : ''}${text?.bold ? 'bold ' : ''}${fs}px ${theme.fontFamily}`;
        const base = 'position:absolute;z-index:24;box-sizing:border-box;resize:none;overflow:hidden;margin:0;outline:none;pointer-events:auto;text-align:left;';
        if (d instanceof Note) {
            // TradingView's note: typed inside its tooltip, where the painter puts the text.
            const tip = this.ctx ? noteTooltip(this.ctx, d, proj, theme, value) : null;
            if (!tip) return null;
            const dark = contrastColor(theme.background) === '#ffffff';
            const back = d.background !== false ? safeCssColor(d.backgroundColor, dark ? '#1a1a1a' : '#ffffff') : 'transparent'; // palette-exempt: TradingView's note tooltip
            const ink = safeCssColor(d.text?.color, dark ? '#dbdbdb' : '#000000'); // palette-exempt: TradingView's note text
            return (
                base +
                `left:${tip.left}px;top:${tip.top}px;width:${tip.width}px;height:${tip.height}px;padding:${12 - EDITOR_BORDER}px;` +
                `border:${EDITOR_BORDER}px solid transparent;border-radius:4px;background:${back};color:${ink};font:${tip.font};line-height:${tip.fs + 5}px;`
            );
        }
        if (d instanceof Callout && d.tv) {
            // TradingView's bubble, measured as the painter measures it: the text 10 px in (corner radius 8 +
            // margin 2) from the bubble's edge, radius 8, its border width, one font size per line.
            const p = d.points(proj);
            if (!p) return null;
            const wrap = d.wrapPx();
            let lines = value.split('\n');
            let tw = wrap ?? 0;
            if (this.ctx) {
                this.ctx.save();
                this.ctx.font = font;
                if (wrap != null) lines = wrapLines(this.ctx, value, wrap);
                else tw = Math.max(0, ...lines.map((l) => this.ctx!.measureText(l).width));
                this.ctx.restore();
            }
            const rows = lines.length;
            const pad = 2 * (CALLOUT_RADIUS + CALLOUT_MARGIN);
            const w = Math.ceil(tw) + pad;
            const h = rows * fs + pad;
            // A saved layout is untrusted: only a plain color and a clamped width reach the CSS text.
            const lw = safeCssPx(d.style.lineWidth, 2, 0, 10);
            const fill = d.style.fillColor ?? theme.background;
            return (
                base +
                `left:${Math.round(p[1][0] - w / 2)}px;top:${Math.round(p[1][1] - h / 2)}px;width:${w}px;height:${h}px;` +
                `padding:${Math.max(0, pad / 2 - lw)}px;border-radius:${CALLOUT_RADIUS}px;border:${lw}px solid ${safeCssColor(d.style.lineColor, theme.borderColor)};line-height:${fs}px;` +
                `background:${blendOver(fill, theme.background, splitColor(fill).alpha)};color:${safeCssColor(text?.color, theme.textColor)};font:${font};`
            );
        }
        if (d instanceof Callout) {
            const box = d.box(proj);
            if (!box) return null;
            const fill = d.style.fillColor ?? theme.background;
            return (
                base +
                `left:${Math.round(box.x)}px;top:${Math.round(box.y)}px;width:${Math.round(box.w)}px;height:${Math.round(box.h)}px;` +
                `padding:5px 8px;border-radius:5px;border:1px solid ${safeCssColor(d.style.lineColor, theme.borderColor)};` +
                `background:${blendOver(fill, theme.background, splitColor(fill).alpha)};color:${safeCssColor(text?.color, theme.textColor)};font:${font};`
            );
        }
        const anchor = d.handlePoints(proj)[0];
        if (!anchor) return null;
        const lh = labelLineHeight(fs);
        const lines = (value || TEXT_PLACEHOLDER).split('\n');
        const w = Math.ceil(this.measureTextWidth(lines, font)) + CARET_ROOM;
        // The painter draws the label at (anchor + 2) with a `top` baseline; a textarea centers each
        // glyph in its line box, so lift it by half the leading to keep both in the same place. The
        // frame then grows outwards around that origin rather than pushing the text off it.
        return (
            base +
            `left:${Math.round(anchor[0] + 2) - TEXT_FRAME_INSET}px;top:${Math.round(anchor[1] + 2 - (lh - fs) / 2) - TEXT_FRAME_RISE}px;` +
            `width:${w + TEXT_FRAME_INSET * 2}px;height:${lines.length * lh + TEXT_FRAME_RISE * 2}px;` +
            `padding:${TEXT_FRAME_RISE - EDITOR_BORDER}px ${TEXT_FRAME_INSET - EDITOR_BORDER}px;` +
            `border:${EDITOR_BORDER}px solid ${withAlpha(theme.textColor, 0.3)};border-radius:4px;` +
            `background:transparent;color:${safeCssColor(text?.color, theme.textColor)};font:${font};line-height:${lh}px;white-space:pre;`
        );
    }

    /** Widest of `lines` at `font`, measured on the drawings canvas (transform-independent). */
    private measureTextWidth(lines: readonly string[], font: string): number {
        const ctx = this.ctx;
        if (!ctx) return 120;
        const prev = ctx.font;
        ctx.font = font;
        const w = Math.max(8, ...lines.map((l) => ctx.measureText(l).width));
        ctx.font = prev;
        return w;
    }

    /** Keep an open editor glued to its drawing (typing, panning, zooming all move the anchor). */
    private layoutTextEditor(): void {
        const te = this.tableEditor;
        const td = te && this.tableById(te.id);
        if (te && td) {
            const css = this.tableCellCss(td, te.cell);
            if (css && css !== te.css) {
                te.el.style.cssText = css;
                te.css = css;
            }
        }
        const ed = this.textEditor;
        if (!ed) return;
        const d = this.editedDrawing(ed.id);
        const css = d && this.inlineEditorCss(d, ed.el.value);
        // Only when it moved or grew: rewriting the same style on every repaint wakes every
        // DOM observer on the page for nothing.
        if (css && ed.css !== css) {
            ed.el.style.cssText = css;
            ed.css = css;
        }
    }

    private closeTextEditor(): void {
        if (this.tableEditor) this.finishTableEditor(true);
        const ed = this.textEditor;
        if (!ed) return;
        this.textEditor = null; // null first: removing a focused textarea fires blur → re-entrant close
        ed.el.remove();
        this.render();
    }

    /** The cursor while dragging a drawing (TradingView's grabbing hand for a body drag), or null to keep the hover one. */
    dragCursor(): string | null {
        return this.interaction.dragCursor();
    }

    /** Cursor hint while hovering — `'pointer'` over a drawing/handle, else null. */
    cursorAt(x: number, y: number): string | null {
        if (this.eraserMode) return 'pointer'; // signal "click to delete" while erasing
        if (this.activeTool == null && (this.magnifierChipAt(x, y) || this.alertTrashAt(x, y))) return 'pointer'; // the chip / trash is clickable
        return this.interaction.cursorAt(x, y);
    }

    /** Right-click: an explicit escape back to the pointer. Cancels an in-progress
     *  placement or measurement, and also plain-disarms an armed-but-idle drawing
     *  tool or the eraser — so a right-click ALWAYS reverts to the pointer, even in
     *  stay-in-drawing-mode (where Escape would leave a drawing tool armed).
     *  Persistent toggles (magnet, stay-mode, favorites) are untouched. Returns
     *  whether the press was consumed; false lets the host's context menu open
     *  normally. */
    cancelPlacement(): boolean {
        if (this.zoomMode) {
            this.withModeIntent(() => this.exitZoom());
            return true;
        }
        if (this.measureMode || this.eraserMode) {
            this.withModeIntent(() => (this.measureMode ? this.exitMeasure() : this.exitEraser()));
            return true;
        }
        if (this.interaction.isPlacing()) {
            this.interaction.cancel(); // emits tool-finished → the core disarms (stay-mode/brush excepted)
            if (this.activeTool != null) this.emit({ kind: 'arm', type: null });
            return true;
        }
        if (this.activeTool != null) {
            this.emit({ kind: 'arm', type: null }); // armed, no anchor yet — just disarm
            return true;
        }
        return false;
    }

    /** Double-click over a drawing → suppress the chart's view reset (single-click already
     *  opens settings). Returns true only when a drawing is under the cursor. */
    dblClick(x: number, y: number): boolean {
        if (this.interaction.finishPlacing(true)) return true; // double-click finishes a polyline (drops the dup point)
        const hit = topDrawingAt(this.shownDrawings(), x, y, this.deps.projector(), HIT_TOLERANCE);
        if (isInlineEditable(hit)) {
            this.editTextInline(hit.id); // double-click a callout / text label → edit its text in place
            return true;
        }
        if (hit instanceof TableDrawing) {
            const cell = hit.cellAt(x, y, this.deps.projector());
            if (cell) {
                this.openSettingsById(hit.id, 0, 0); // its bar stays up while typing (Insert row / column)
                this.editTableCell(hit.id, cell); // TradingView: type into the cell
            }
            return true;
        }
        if (hit && hit.inputsDialog()) {
            this.openSettingsById(hit.id, x, y); // select it, as a click does
            this.openInputsFor(hit.id); // double-click an indicator-style drawing → its settings dialog
            return true;
        }
        return hit != null;
    }

    /** Keyboard pre-empt: Escape (popup/placing/selection), undo/redo, copy/paste/duplicate,
     *  delete (multi), and arrow-nudge. Stands down while a label text field is focused. */
    handleKey(e: KeyboardEvent): boolean {
        if (e.key === 'Escape') {
            if (this.textEditor) {
                this.finishTextEditor(false); // cancel the edit before the popup/selection
                return true;
            }
            if (this.popup.isOpen()) {
                this.clearSelection();
                return true;
            }
            if (this.interaction.cancel()) return true;
            if (this.zoomMode) {
                this.withModeIntent(() => this.exitZoom());
                return true;
            }
            if (this.measureMode) {
                this.withModeIntent(() => this.exitMeasure());
                return true;
            }
            if (this.selectedIds.size) {
                this.clearSelection();
                return true;
            }
            return false;
        }
        if (e.key === 'Enter' && this.interaction.finishPlacing(false)) return true; // Enter finishes a polyline
        const action = keyToDrawingAction(e, {
            hasSelection: this.selectedIds.size > 0,
            hasTarget: this.selectedIds.size > 0 || this.hoveredId != null,
            editingText: isEditingText(e.target),
        });
        if (!action) return false;
        switch (action.kind) {
            case 'undo':
                if (!this.historyChords) return false; // the host's keymap owns Ctrl+Z/Y
                this.emit({ kind: 'undo' });
                break;
            case 'redo':
                if (!this.historyChords) return false;
                this.emit({ kind: 'redo' });
                break;
            case 'copy':
                this.emit({ kind: 'copy', ids: this.selectionIds() });
                break;
            case 'paste':
                this.emit({ kind: 'paste' });
                break;
            case 'duplicate':
                this.emit({ kind: 'duplicate', ids: this.selectionIds() });
                break;
            case 'delete': {
                const ids = this.selectedIds.size ? this.deletableSelection() : this.hoveredId ? [this.hoveredId] : [];
                if (ids.length) {
                    this.popup.close();
                    this.emit({ kind: 'delete', ids });
                }
                break;
            }
            case 'nudge':
                this.nudgeSelection(action.dx, action.dy);
                break;
        }
        return true;
    }

    private selectionIds(): string[] {
        return [...this.selectedIds];
    }

    private deletableSelection(): string[] {
        return deletableSelection(this.selectedIds, this.drawings);
    }

    /** Move every selected (unlocked) drawing by a pixel delta — one edit/edit-many → one undo step. */
    private nudgeSelection(dx: number, dy: number): void {
        const proj = this.deps.projector();
        const docs: SerializedDrawing[] = [];
        for (const d of this.drawings) {
            if (!this.selectedIds.has(d.id) || d.locked) continue;
            const anchors = d.anchors.map((a) => {
                const y = proj.yOf(a.price, d.paneId);
                return y == null ? { time: a.time, price: a.price } : proj.pxToPoint(proj.xOf(a.time) + dx, y + dy, d.paneId);
            });
            const doc = d.serialize();
            doc.anchors = anchors;
            docs.push(doc);
        }
        if (docs.length === 1) this.emit({ kind: 'edit', doc: docs[0]! });
        else if (docs.length > 1) this.emit({ kind: 'edit-many', docs });
    }

    // ── lifecycle ──
    setTheme(theme: VelaTheme): void {
        this.popup.setTheme(theme);
        this.toolbar.setTheme(theme);
        this.render();
    }

    onResize(): void {
        this.finishTextEditor(true);
        this.popup.close();
        this.render();
    }

    /** Whether the drawing's z puts it INSIDE the series stack (per the last-known boundaries)
     *  rather than over it — i.e. its body belongs to an interleave layer, not the top canvas. */
    private isInterleaved(d: Drawing): boolean {
        if (d instanceof PriceAlert) return false; // always over the stack: its chip sits on the price axis
        return sliceKeyFor(d.zIndex, this.lastBounds.get(d.paneId) ?? []) !== null;
    }

    /** A drawing that paints inside the series stack changed (content, not hover): its pixels
     *  live in the backend composite, so this layer alone can't show the change — ask for a
     *  data frame, which re-runs `prepareSlices` before the backend composites. */
    /** A drawing being dragged leaves its interleave slice for the top canvas, so each pointer
     *  move repaints one 2D layer instead of re-rasterizing and re-uploading a plot-sized slice
     *  texture through the data frame. The slices rebuild once as the drag starts and once as it
     *  ends (release, cancel), when the lifted set changes. */
    private syncLift(): void {
        const moving = this.interaction.movingIds();
        let same = moving.size === this.lifted.size;
        if (same) for (const id of moving) if (!this.lifted.has(id)) same = false;
        if (same) return;
        this.lifted = new Set(moving);
        this.invalidateSlices();
    }

    private invalidateSlices(): void {
        if (this.sliced.size > 0 || this.drawings.some((d) => this.isInterleaved(d))) this.deps.requestDataPaint();
    }

    /**
     * Rebuild the interleave layers for this data frame: bucket the visible drawings whose z
     * sits at-or-under a series boundary by the FIRST boundary at-or-above them (a tie paints
     * under that series), and paint each bucket on its own cached plot-sized canvas. Runs from
     * the renderer's data paint, just before the backend composites the scene.
     */
    prepareSlices(paneIds: readonly string[]): ReadonlyMap<string, DrawingSlice[]> {
        this.sliced.clear();
        this.lastBounds = new Map(paneIds.map((id) => [id, this.deps.seriesBoundaries(id)]));
        const out = new Map<string, DrawingSlice[]>();
        const dpr = this.deps.dpr();
        const proj = this.deps.projector();
        const theme = this.deps.theme();
        const buckets = new Map<string, { paneId: string; beforeZ: number; drawings: Drawing[] }>(); // keyed `paneId|beforeZ`
        for (const d of this.drawings) {
            if (!d.visible || d instanceof PriceAlert || this.lifted.has(d.id)) continue; // alerts always paint on the top canvas; a dragged drawing rides it too
            const beforeZ = sliceKeyFor(d.zIndex, this.lastBounds.get(d.paneId) ?? []);
            if (beforeZ === null) continue; // over the stack → top canvas
            const key = `${d.paneId}|${beforeZ}`;
            const bucket = buckets.get(key);
            if (bucket) bucket.drawings.push(d);
            else buckets.set(key, { paneId: d.paneId, beforeZ, drawings: [d] });
            this.sliced.add(d.id);
        }
        for (const [key, { paneId, beforeZ, drawings }] of buckets) {
            let canvas = this.sliceCache.get(key);
            if (!canvas) {
                canvas = document.createElement('canvas');
                this.sliceCache.set(key, canvas);
            }
            if (canvas.width !== this.canvas.width || canvas.height !== this.canvas.height) {
                canvas.width = this.canvas.width;
                canvas.height = this.canvas.height;
            }
            const sctx = canvas.getContext('2d');
            if (!sctx) continue;
            sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            sctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            this.painter.seriesLook = this.deps.seriesLook();
            this.painter.barMs = this.deps.chartBarMs();
            this.painter.barKind = this.deps.chartBarKind?.() ?? null;
            this.painter.paintAll(sctx, drawings, proj, theme, EMPTY_TARGETS);
            const slices = out.get(paneId) ?? [];
            slices.push({ beforeZ, canvas });
            out.set(paneId, slices);
        }
        for (const key of [...this.sliceCache.keys()]) if (!buckets.has(key)) this.sliceCache.delete(key); // drop stale layers
        for (const slices of out.values()) slices.sort((a, b) => a.beforeZ - b.beforeZ);
        return out;
    }

    /** Where the drawings' price chips sit on the scale this frame (centre y per pane), laid out as {@link render} will
     *  paint them. The renderer asks before the chrome paint so the axis can skip the numbers a chip would cover. */
    axisChipCenters(): ReadonlyMap<string, readonly number[]> {
        this.painter.barMs = this.deps.chartBarMs();
        this.painter.barKind = this.deps.chartBarKind?.() ?? null;
        this.painter.layoutAxisChips(this.drawings, this.deps.projector(), this.deps.priceBlock?.() ?? null);
        return this.painter.axisChipYs;
    }

    /** Repaint the TOP drawings layer (called every data frame + on internal changes): the
     *  drawings over the series stack, every selection handle (interleaved drawings' included,
     *  or a drawing sent under the candles could never show what you grabbed), and the
     *  transients — the placing ghost, anchor markers, the snap ring, the ruler. */
    render(): void {
        const ctx = this.ctx;
        if (!ctx) return;
        const dpr = this.deps.dpr();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
        const proj = this.deps.projector();
        // A transparent inline editor overlays the label it edits — mute the canvas copy so the
        // typed text isn't drawn twice (the callout editor is opaque, so its label stays).
        const edited = this.textEditor ? this.editedDrawing(this.textEditor.id) : null;
        const targets: PaintTargets = {
            selected: this.selectedIds,
            hovered: this.hoveredId,
            dragged: this.interaction.activeDragId(),
            mutedLabel: edited instanceof TextLabel ? edited.id : null,
        };
        // Front (non-interleaved) drawings paint fully here; the ones interleaved into the series
        // stack painted their bodies on the backend layers, so only their handles come back on top
        // — buried under the candles they'd be unusable.
        this.painter.seriesLook = this.deps.seriesLook();
        this.painter.barMs = this.deps.chartBarMs();
        this.painter.barKind = this.deps.chartBarKind?.() ?? null;
        const onTop = (d: Drawing) => !this.isInterleaved(d) || this.lifted.has(d.id);
        this.painter.layoutAxisChips(this.drawings, proj, this.deps.priceBlock?.() ?? null);
        this.painter.paintAll(ctx, this.drawings.filter(onTop), proj, this.deps.theme(), targets);
        this.painter.paintHighlights(ctx, this.drawings.filter((d) => !onTop(d)), proj, handleIdsFor(targets));
        // Price labels on the scale for every horizontal line, including ones painted under the candles.
        this.painter.timeZone = this.deps.timeZone?.() ?? 'UTC';
        this.painter.paintAxisPrices(ctx, this.drawings, proj, this.deps.theme());
        this.painter.paintVlineExtensions(ctx, this.drawings, proj);
        this.painter.paintSelectionAxes(ctx, this.drawings, proj, this.deps.theme(), this.selectedIds);
        // Line stats boxes (info line, trend lines) likewise sit over the candles, as TradingView's do; without "Always
        // show stats" only on the selected, hovered or dragged line.
        const active = new Set<string>(this.selectedIds);
        if (this.hoveredId) active.add(this.hoveredId);
        const dragged = this.interaction.activeDragId();
        if (dragged) active.add(dragged);
        this.painter.paintLineStats(ctx, this.drawings, proj, this.deps.theme(), active);
        this.painter.paintRangePlates(ctx, this.drawings, proj, this.deps.theme()); // price range numbers, over the candles
        // A Ctrl-drag moves COPIES that are not in the store yet: paint them here, in full and with
        // handles, so they read as the real drawings they are about to become.
        const clones = this.interaction.dragClones();
        if (clones) this.painter.paintAll(ctx, clones, proj, this.deps.theme(), { selected: new Set(clones.map((c) => c.id)) });
        this.layoutTextEditor();
        const ghost = this.interaction.ghost();
        if (ghost) this.painter.paintGhost(ctx, ghost, proj, this.deps.theme());
        // A remote placement mirrored here (drawings sync) paints as the same ghost.
        if (this.externalGhost) this.painter.paintGhost(ctx, this.externalGhost, proj, this.deps.theme());
        // Every placing change re-renders (deps.changed), so this catches each anchor
        // click, cursor move and cancel; the fingerprint gate drops the no-change frames.
        this.emitDraft(ghost);
        // Armed-tool placement prompt (a type's `placementHint`): a bottom-center pill
        // telling the user what gesture to perform; it clears once placement starts.
        if (this.activeTool && !ghost) {
            const hint = getDrawingType(this.activeTool)?.placementHint;
            if (hint) this.painter.paintPlacementHint(ctx, hint, this.deps.theme(), proj.width, proj.height);
        }
        // While placing, show control circles on the points clicked so far (so the user
        // sees where each anchor — e.g. a pitchfork's pivot — landed before it completes).
        const markers = this.interaction.placingMarkers(proj);
        if (markers) this.painter.paintHandles(ctx, markers);
        // Magnet (Ctrl) affordance: a ring on the candle point the next anchor will snap to.
        const m = this.interaction.snapMarker();
        const my = m ? proj.yOf(m.point.price, m.paneId) : null;
        if (m && my != null) this.painter.paintSnapRing(ctx, proj.xOf(m.point.time), my, this.deps.theme());
        // The transient ruler paints on top of everything (until cleared on the next press/pan/zoom).
        if (this.measure.isActive()) {
            this.measure.paint(ctx, proj, this.deps.theme(), (paneId, price) => this.painter.priceTick(paneId, price));
            // TradingView shades the ruler's span on the price scale and the time axis, with both ends in blue chips,
            // as it does for a selected drawing.
            const ends = this.measure.chartPoints(proj);
            const span = ends ? createDrawing('trendline', { id: RULER_ID, paneId: ends.paneId, anchors: [ends.a, ends.b] }) : null;
            if (span) this.painter.paintSelectionAxes(ctx, [span], proj, this.deps.theme(), new Set([RULER_ID]));
        }
        this.paintZoomBox(ctx);
        const marquee = this.interaction.marqueeRect();
        if (marquee) this.painter.paintMarquee(ctx, marquee);
    }

    destroy(): void {
        this.closeTextEditor();
        this.popup.destroy();
        this.toolbar.destroy();
        this.seriesGwUnsub?.();
        this.seriesGwUnsub = null;
        this.seriesGw = null;
        this.intentCb = null;
        this.drawings = [];
    }

    /** Mark nothing as edited: close the popup + clear the selection (handles then follow hover). */
    private clearSelection(): void {
        this.popup.close();
        if (this.selectedIds.size) this.emit({ kind: 'select', ids: [] });
        this.render();
    }

    /** Dismiss-on-outside-press also clears the selection — except when the press is ABOUT the
     *  selection: it carries a multi-select modifier (Shift / Ctrl / Cmd — it will add to the
     *  selection or sweep a marquee onto it), or it landed on a drawing that is already selected
     *  (the canvas handler ran first and is holding it for a drag or a click), so the drawings
     *  whose bar just closed must stay selected. */
    private readonly onPopupDismissed = (e?: PointerEvent): void => {
        if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) return;
        const pressed = this.interaction.pressedId();
        if (pressed && this.selectedIds.has(pressed)) return;
        this.clearSelection();
    };

    /** Report the live drawings' current state as one edit (one undo step, however many). */
    private emitEdits(drawings: readonly Drawing[]): void {
        const docs = drawings.map((d) => d.serialize());
        if (docs.length === 1) this.emit({ kind: 'edit', doc: docs[0]! });
        else if (docs.length > 1) this.emit({ kind: 'edit-many', docs });
    }

    /** The one bar for a multi-selection: it shows the controls all of its drawings share and
     *  every action applies to all of them. Floats clear of their combined bounds. */
    private openSettingsForSelection(ids: readonly string[]): void {
        const live = (): Drawing[] => ids.map((id) => this.drawings.find((d) => d.id === id)).filter((d): d is Drawing => d != null);
        const drawings = live();
        if (drawings.length < 2) return;
        const proj = this.deps.projector();
        let anchor: PopupAnchor | null = null;
        for (const d of drawings) {
            const b = d.bounds(proj);
            if (!b) continue;
            if (!anchor) anchor = { ...b };
            else {
                const right = Math.max(anchor.x + anchor.w, b.x + b.w);
                const bottom = Math.max(anchor.y + anchor.h, b.y + b.h);
                anchor.x = Math.min(anchor.x, b.x);
                anchor.y = Math.min(anchor.y, b.y);
                anchor.w = right - anchor.x;
                anchor.h = bottom - anchor.y;
            }
        }
        this.popupMulti = true;
        this.emit({ kind: 'settings', id: drawings[0]!.id });
        this.popup.open(drawings, anchor, {
            resolve: () => live()[0] ?? null,
            patch: (p) => {
                const ds = live();
                for (const d of ds) d.applySettings(p);
                this.render();
                this.emitEdits(ds);
            },
            setLocked: (v) => {
                const ds = live();
                for (const d of ds) d.locked = v;
                this.emitEdits(ds);
            },
            reorder: (to) => {
                for (const d of live()) this.emit({ kind: 'reorder', id: d.id, to });
            },
            duplicate: () => {
                this.popup.close();
                this.emit({ kind: 'duplicate', ids: live().map((d) => d.id) });
            },
            resetSettings: () => {
                const ds = live();
                for (const d of ds) resetDrawingSettings(d);
                this.render();
                this.emitEdits(ds);
                this.openSettingsForSelection(ids); // rebuild so the controls reflect the restored defaults
            },
            remove: () => {
                // Locked members are protected: they stay behind (still selected) while the rest go.
                const ids = live().filter((d) => !d.locked).map((d) => d.id);
                if (ids.length === 0) return;
                this.popup.close();
                this.emit({ kind: 'delete', ids });
            },
        }, this.onPopupDismissed);
    }

    /** The drawings shown on the chart's current timeframe (the Visibility tab hides the rest): only these can be hit. */
    private shownDrawings(): Drawing[] {
        const barMs = this.deps.chartBarMs();
        return this.drawings.filter((d) => shownOnBarMs(d.intervals, barMs, this.deps.chartBarKind?.() ?? null));
    }

    /** A click on a drawing opens its settings toolbar (text labels edit text here too). */
    private openSettingsById(id: string, x: number, y: number): void {
        const drawing = this.drawings.find((d) => d.id === id);
        if (!drawing) return;
        // TradingView's table: a click on a cell of the selected table types into that cell.
        if (drawing instanceof TableDrawing && this.selectedIds.has(id) && !this.popupMulti && (x !== 0 || y !== 0)) {
            const cell = drawing.cellAt(x, y, this.deps.projector());
            if (cell) {
                this.openSettingsById(id, 0, 0); // the press closed the bar: back with it, then type in the cell
                this.editTableCell(id, cell);
                return;
            }
        }
        const live = (): Drawing | undefined => this.drawings.find((d) => d.id === id);
        this.popupMulti = false;
        this.emit({ kind: 'select', ids: [id] }); // editing this drawing → it stays highlighted while the popup is open
        this.emit({ kind: 'settings', id });
        // An alert marker has its own hover tag (price + trash): no floating settings toolbar.
        if (drawing instanceof PriceAlert) return;
        const anchor = drawing.bounds(this.deps.projector()); // float the toolbar clear of the drawing
        this.popup.open([drawing], anchor, {
            // Sync rebuilds instances, so a panel that reads values back after a patch (e.g. the
            // position tool's price fields, where one edit can flip another level) resolves fresh.
            resolve: () => live() ?? null,
            patch: (p) => {
                const d = live();
                if (!d) return;
                d.applySettings(p);
                this.render();
                this.emit({ kind: 'edit', doc: d.serialize() });
            },
            setLocked: (v) => {
                const d = live();
                if (!d) return;
                d.locked = v;
                this.emit({ kind: 'edit', doc: d.serialize() });
            },
            reorder: (to) => this.emit({ kind: 'reorder', id, to }),
            duplicate: () => {
                // The copy lands on its source and becomes the selection (same as Ctrl/Cmd+D) —
                // ready to drag away; the source's popup would otherwise outlive its selection.
                this.finishTextEditor(true); // typed text is part of what gets copied
                this.popup.close();
                this.emit({ kind: 'duplicate', ids: [id] });
            },
            resetSettings: () => {
                const d = live();
                if (!d) return;
                resetDrawingSettings(d);
                this.render();
                this.emit({ kind: 'edit', doc: d.serialize() });
                // Rebuild the toolbar so controls reflect the restored defaults.
                this.openSettingsById(id, 0, 0);
            },
            ...(this.alertTypes.has(live()?.type ?? '') ? { addAlert: () => this.emit({ kind: 'alert', id }) } : {}),
            // TradingView's table: rows and columns from the toolbar and the more menu, and its own pin to the screen.
            ...(drawing instanceof TableDrawing
                ? {
                      tableOp: (op: TableOp) => this.tableOp(id, op),
                      toggleAnchor: () => {
                          const d = this.tableById(id);
                          if (!d) return;
                          if (this.tableEditor?.id === id) this.finishTableEditor(true);
                          const t = this.tableById(id) ?? d;
                          t.applySettings({ anchored: !t.anchored });
                          t.handlePoints(this.deps.projector()); // a fresh pin takes the table's place now
                          this.emit({ kind: 'edit', doc: t.serialize() });
                          this.openSettingsById(id, 0, 0);
                      },
                  }
                : {}),
            ...(ANCHOR_TWIN[drawing.type]
                ? {
                      toggleAnchor: () => {
                          const d = live();
                          const twin = d ? ANCHOR_TWIN[d.type] : undefined;
                          if (!d || !twin) return;
                          this.finishTextEditor(true); // typed text goes with it
                          // The pinned twin keeps the point where the drawing is now; unpinned, it drops the screen fraction.
                          const doc = d.serialize();
                          const props = { ...(doc.props ?? {}) };
                          delete props.fx;
                          delete props.fy;
                          this.emit({ kind: 'convert', doc: { ...doc, type: twin, props } });
                          this.openSettingsById(id, 0, 0);
                      },
                  }
                : {}),
            applyTemplate: (look) => {
                const d = live();
                if (!d) return;
                d.style = { ...look.style };
                if (look.text) d.text = { ...look.text };
                if (look.props) d.applyProps(look.props);
                this.render();
                this.emit({ kind: 'edit', doc: d.serialize() });
                this.openSettingsById(id, 0, 0); // the bar's swatches show the template's colours
            },
            restore: (doc) => {
                const d = live();
                if (!d) return;
                if (doc.style) d.style = { ...doc.style };
                if (doc.text !== undefined) d.text = doc.text ? { ...doc.text } : undefined;
                if (doc.props !== undefined) d.applyProps(doc.props);
                // The settings dialog edits anchors (Coordinates tab) and intervals (Visibility tab) too.
                if (doc.anchors) d.anchors = doc.anchors.map((p) => ({ time: p.time, price: p.price }));
                if ('intervals' in doc) d.intervals = doc.intervals ? { ...doc.intervals } : undefined;
                if ('title' in doc) d.title = doc.title;
                this.render();
                this.emit({ kind: 'edit', doc });
            },
            remove: () => {
                this.closeTextEditor(); // else the editor floats over the deleted label until it loses focus
                this.popup.close();
                this.emit({ kind: 'delete', ids: [id] });
            },
            openInputs: () => this.openInputsFor(id),
        }, this.onPopupDismissed);
    }

    /** Open drawing `id`'s indicator-style dialog (Drawing.inputsDialog); false when it has none. */
    private openInputsFor(id: string): boolean {
        const d = this.drawings.find((x) => x.id === id);
        const spec = d?.inputsDialog();
        if (!d || !spec || !this.deps.openInputsDialog) return false;
        this.deps.openInputsDialog(
            { id: `drawing:${id}`, title: spec.title, inputs: spec.inputs, values: { ...spec.values }, props: [], propValues: {} },
            (c) => {
                const live = this.drawings.find((x) => x.id === id);
                if (!live) return;
                live.applySettings({ [`${spec.path}.${c.key}`]: c.value });
                this.render();
                this.emit({ kind: 'edit', doc: live.serialize() });
            },
        );
        return true;
    }

    /** A plain click on the empty plot: drop the selection. The popup's dismiss-on-outside-press
     *  does the same, but a selection can exist with no bar open (a lone Ctrl-click pick, a
     *  selection whose bar was dismissed by a modifier press) — this covers those. */
    deselect(): void {
        this.clearSelection();
    }

    /** Report placement progress upstream (`draft` intent) so the drawings sync can
     *  mirror the ghost live on linked charts. Called from every render; only actual
     *  shape changes emit, and the end of a placement emits one `null`. */
    private emitDraft(ghost: Drawing | null): void {
        const key = ghost
            ? JSON.stringify({ t: ghost.type, p: ghost.paneId, a: ghost.anchors, s: ghost.style, x: ghost.text })
            : null;
        if (key === this.lastDraftKey) return;
        this.lastDraftKey = key;
        this.intentCb?.({ kind: 'draft', doc: ghost ? ghost.serialize() : null });
    }

    private emit(i: DrawingIntent): void {
        // A placed or moved point past the newest bar of a bar-axis chart is saved as "n bars after a bar"; drafts and
        // copies are not in `drawings`, so their anchors are classified here.
        const axis = this.barAxis;
        if (axis) {
            const fix = (doc: SerializedDrawing): SerializedDrawing => ({ ...doc, anchors: doc.anchors.map((a) => (a.bars ? a : writeAnchor(a, axis))) });
            if (i.kind === 'create' || i.kind === 'edit') i = { ...i, doc: fix(i.doc) };
            else if (i.kind === 'edit-many' || i.kind === 'clone') i = { ...i, docs: i.docs.map(fix) };
        }
        // A freshly-placed drawing surfaces its editing UI by default once it's set: every type opens
        // its settings menu, and a text label / callout additionally opens its inline editor so the
        // caret is already waiting. Works for both click + drag finalize — the core reassigns the id,
        // so we diff the drawing set around the create to find the new one.
        if (i.kind === 'create') {
            // A fresh annotation FIXES its text ink at creation: max contrast against the
            // live theme's plot background, stored on the drawing itself — so a later theme
            // or background change never recolors what is already placed. A color the user
            // chose (or a deserialized document carries) always passes through untouched.
            // (TradingView's note keeps its theme's text color: left unset.)
            if (i.doc.text && i.doc.text.color === undefined && !(i.doc.type === 'note' || i.doc.type === 'anchorednote')) {
                i.doc.text = { ...i.doc.text, color: contrastColor(this.deps.theme().background) };
            }
            const before = new Set(this.drawings.map((d) => d.id));
            this.intentCb?.(i);
            // Defer past the sync + the placing click (which would otherwise steal focus / dismiss
            // the popup) before opening the editing UI on the new drawing.
            setTimeout(() => {
                const fresh = this.drawings.find((d) => !before.has(d.id));
                if (!fresh) return;
                this.openSettingsById(fresh.id, 0, 0);
                if (isInlineEditable(fresh)) this.editTextInline(fresh.id); // focus lands in the editor, not the bar
            }, 0);
            return;
        }
        if (i.kind === 'clone') {
            // A drag-to-duplicate ends like a click on the copy: its settings bar opens so it can be
            // restyled right away. Several copies need nothing here — the selection they become
            // brings up the multi-selection bar on its own (see setSelection).
            const before = new Set(this.drawings.map((d) => d.id));
            this.intentCb?.(i);
            const fresh = this.drawings.filter((d) => !before.has(d.id));
            if (fresh.length === 1) this.openSettingsById(fresh[0]!.id, 0, 0);
            return;
        }
        this.intentCb?.(i);
    }
}
