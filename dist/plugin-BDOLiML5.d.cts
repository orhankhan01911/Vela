import { aD as WidgetContext } from './contributions-Bfkvj5fx.cjs';
import { b as DrawingTypeKey, D as DrawingStyle, S as SerializedDrawing, c as Drawing, a$ as SeriesKind, k as InputValue, O as OHLCV, V as VelaTheme } from './options-E_TmxEA7.cjs';
import './side-panel-DPWdgW2J.cjs';
import './icons-BZYbJXSV.cjs';
import './keymap-CGIxBV99.cjs';
import './DataProvider-_iHbkEgK.cjs';

/** What a drawing type contributes to the toolbar + factory (renderer-neutral). */
interface DrawingTypeMeta {
    type: DrawingTypeKey;
    /** Toolbar group id (e.g. `'lines'`, `'shapes'`, `'annotations'`). */
    group: string;
    label: string;
    /** Inline SVG markup for the toolbar button — no DOM, renderer paints it. */
    icon: string;
    defaultStyle: DrawingStyle;
    /** The tool's body REPLACES the series pixels inside its area (an opaque inset): a fresh
     *  instance then starts ABOVE the pane's series stack instead of just under the candles —
     *  under them its content would be buried. The user can still reorder it afterwards. */
    coversSeries?: boolean;
    /** One short sentence prompting the placement gesture, shown by the renderer at the
     *  bottom of the chart while the tool is armed and no placement has started yet. */
    placementHint?: string;
    /** Build an instance from a (partial) serialized record. Serves create + deserialize. */
    create(init: Partial<SerializedDrawing> & {
        paneId: string;
    }): Drawing;
}
/** Register (or replace) a drawing type. Built-ins register at module load; new
 *  types (fibs/patterns) call this — no base/port/facade change. */
declare function registerDrawingType(meta: DrawingTypeMeta): void;
declare function getDrawingType(type: string): DrawingTypeMeta | undefined;
declare function drawingTypes(): DrawingTypeMeta[];
/** Build a fresh drawing of `type` on `paneId`, seeding the type's default style. */
declare function createDrawing(type: DrawingTypeKey, init: Partial<SerializedDrawing> & {
    paneId: string;
}): Drawing | null;
/** Rehydrate a {@link Drawing} from a plain record, or null for an unknown type. */
declare function deserializeDrawing(doc: SerializedDrawing): Drawing | null;

/**
 * The authoritative, user-controlled pan/zoom state of the time axis.
 *
 * - `barSpacing`: pixels between adjacent bar centers (the zoom level).
 * - `rightOffset`: how many bar-widths the LAST bar sits from the right edge
 *   (the pan position). May be negative (last bar scrolled off the right).
 *
 * The chart width and bar count are NOT part of this state — they are owned by
 * the renderer (resize / setBars) and combined with the viewport in the
 * CoordinateSystem to produce pixel coordinates.
 */
interface ViewportState {
    barSpacing: number;
    rightOffset: number;
}

/** A pane's price window (after autoscale + margins). `log` ⇒ logarithmic mapping;
 *  `invert` ⇒ the axis is flipped (high at the bottom), stamped per frame from the pane. */
interface PriceScale {
    min: number;
    max: number;
    log?: boolean;
    invert?: boolean;
}
/** A pane's vertical pixel extent within the chart's data area (media px). */
interface PaneBounds {
    top: number;
    height: number;
}
/**
 * The ONE authoritative coordinate transform, shared by every layer (data
 * backend, canvas2d chrome, DOM overlays). Two decoupled axes:
 *
 * - X: a fractional **logical bar index** mapped to pixels by the viewport
 *   (`barSpacing` + `rightOffset`); bar TIME ↔ logical is a separate mapping
 *   over the loaded bar times so time and spacing stay independent.
 * - Y: a per-pane **linear/log/percent price** mapped within that pane's bounds.
 *
 * Everything is in media (CSS) pixels; `toBitmap` converts to device pixels for
 * crisp drawing. Keeping a single instance is what keeps all layers aligned.
 */
declare class CoordinateSystem {
    private widthPx;
    private dataHeightPx;
    private devicePixelRatio;
    private viewport;
    private pitchScale;
    private times;
    private intervalMs;
    setSize(width: number, dataHeight: number, dpr: number): void;
    setBars(times: readonly number[]): void;
    /**
     * Append one new bar time in O(1). The bar cadence is stable, so the median
     * interval is NOT re-derived (a full re-sort per live tick would be O(n log n)).
     * It's only derived lazily — via the robust median over the bars seen so far —
     * while it's still unknown (cold start at <2 bars); the warm path is a single
     * push. `barCount` reads `times.length`, so the new bar is visible immediately.
     */
    appendBar(time: number): void;
    setViewport(viewport: ViewportState): void;
    getViewport(): ViewportState;
    /**
     * Spacing multiplier applied to the center-to-center pixel PITCH between adjacent
     * bars (and hence the crosshair's snap step) — independent of the zoom (`barSpacing`).
     * `1` = default; `>1` spreads bars apart with real gaps; `<1` tightens them. It changes
     * only where bars SIT (`logicalToX`/`xToLogical`), never their raw zoom value, so candle
     * bodies keep their width — the extra pitch becomes gap. Body width tracks
     * {@link bodySpacing} so a `<1` multiplier shrinks bodies to fit instead of overlapping.
     */
    setPitchScale(scale: number): void;
    get spacingScale(): number;
    /** Effective center-to-center pixel pitch between adjacent bars (zoom × spacing multiplier). */
    pxPerBar(): number;
    /**
     * Pixel basis for element (candle/bar/column) BODY width. Kept at the raw zoom pitch so
     * bodies keep their width while the multiplier only adds gap; capped at the effective pitch
     * so a `<1` multiplier tightens bodies to fit rather than overlapping the neighbours.
     */
    bodySpacing(): number;
    get width(): number;
    get height(): number;
    get dpr(): number;
    get barCount(): number;
    get barInterval(): number;
    /** The logical index that sits exactly at the right pixel edge of the chart. */
    get rightEdgeLogical(): number;
    logicalToX(logical: number): number;
    xToLogical(x: number): number;
    timeToLogical(ms: number): number;
    logicalToTime(logical: number): number;
    timeToX(ms: number): number;
    priceToY(price: number, scale: PriceScale, bounds: PaneBounds): number;
    yToPrice(y: number, scale: PriceScale, bounds: PaneBounds): number;
    visibleLogicalRange(): {
        from: number;
        to: number;
    };
    visibleTimeRange(): {
        from: number;
        to: number;
    };
    toBitmap(mediaPx: number): number;
}

/** Things that need a stable id within an indicator instance. */
type IdentifiableKind = SeriesKind | 'fill' | 'background' | 'hline' | 'line' | 'box' | 'label' | 'polyline' | 'linefill' | 'table';
/**
 * Content-addressed id for a plotted element, stable across re-runs of
 * identical source.
 *
 * Deliberately NOT an engine's own callsite counter: those renumber whenever the
 * source is edited (insert a plot near the top and every downstream callsite
 * shifts), so keying persistent state on one would silently rebind to the wrong
 * element. The ordinal disambiguates multiple plots that share a title within one
 * indicator. Every engine MUST mint its series ids through this — it is the
 * identity contract value patches are keyed by.
 */
declare function stableSeriesId(parts: {
    instanceId: string;
    kind: IdentifiableKind;
    title: string;
    ordinal: number;
}): string;

/**
 * Register default values for renderer features — every chart built afterwards applies
 * them once its renderer is mounted, before the first paint. Keys are renderer feature
 * names (`chart.renderer.features`); one the active renderer does not support is warned
 * about and ignored, exactly as `renderer.set()` does.
 *
 * These are DEFAULTS, not locks: an explicit `chart.renderer.set(...)`, an applied config
 * template, or the user's own in-chart settings still win afterwards. Charts already
 * built are untouched. Returns a disposer that removes precisely the values it set
 * (leaving any later re-registration of the same key in place).
 */
declare function registerRendererDefaults(values: Record<string, unknown>): () => void;
/** Drop registered defaults by key — all of them when called with no arguments. */
declare function unregisterRendererDefaults(...keys: string[]): void;
/** The defaults a chart applies at construction (empty when no plugin registered any). */
declare function rendererDefaults(): Record<string, unknown>;

/**
 * Room a host keeps at the right edge of a chart's plot (CSS px), for an overlay of its own that owns that edge
 * (project-options: the Position Payoff profile). Right-anchored built-ins (the visible-range volume profile) draw
 * left of it instead of under it. Providers get the drawing canvas so they can tell which chart asks; the widest
 * answer wins; a throwing provider counts as 0.
 */
type PlotRightInsetFn = (canvas: HTMLCanvasElement) => number;
/** Add a provider; returns its removal. */
declare function registerPlotRightInset(fn: PlotRightInsetFn): () => void;
/** CSS px kept free at the right edge of the plot `canvas` belongs to (0 when nothing asks for room). */
declare function plotRightInset(canvas: HTMLCanvasElement): number;

/** One plot of a classic indicator, bar-aligned to the bars it was computed on (NaN where it has no value). */
interface ClassicPlotValues {
    key: string;
    title: string;
    values: readonly number[];
}
/**
 * A classic indicator computed over `bars` with `inputs` (an indicator's own settings, e.g. from its handle's
 * `inputValues()`): the plots a person sees (legend or pane) and the fixed levels (RSI 70 / 30). Null for a type
 * outside the catalog. Pure: host code uses it to watch an indicator off-chart (alerts on EMA 20, RSI 14 ...).
 */
declare function classicPlots(type: string, bars: readonly OHLCV[], inputs: Record<string, InputValue>): {
    plots: ClassicPlotValues[];
    levels: Array<{
        key: string;
        title: string;
        price: number;
    }>;
    /** Shapes it marks on bars (Williams Fractal's up / down fractals), by bar time. */
    markers: Array<{
        time: number;
        position: 'aboveBar' | 'belowBar' | 'inBar';
        shape: string;
    }>;
} | null;
/** Every classic indicator: its type, titles, where it draws and its default settings (alert coverage tests list
 *  the whole catalog from this, so a new indicator is checked without anyone adding it by hand). */
declare function classicCatalog(): Array<{
    type: string;
    title: string;
    shortTitle: string;
    overlay: boolean;
    defaults: Record<string, InputValue>;
}>;

/** Everything a layer needs to paint one frame. */
interface RendererLayerArgs {
    /** The chart's CURRENT view bars (post bar-transform). */
    bars: readonly OHLCV[];
    /** The layer's channel payload (last `setNativeData(id, …)` push; undefined before the first). */
    data: unknown;
    /** The type's SDK settings values (`<id>-settings` channel; {} before any edit). */
    settings: Record<string, unknown>;
    /** Time ranges still loading (`<id>-pending` channel) — skeleton/reveal UIs. */
    pending: ReadonlyArray<readonly [number, number]>;
    coords: CoordinateSystem;
    /** The scale + bounds of the pane the layer paints on: the pane of the native
     *  indicator that owns this channel (its type equals the layer id), else the price
     *  pane — so a layer-backed indicator moved to its own pane takes its layer along. */
    scale: PriceScale;
    bounds: PaneBounds;
    theme: VelaTheme;
    /** The active price style — layers tied to a chart type gate their visibility on it. */
    priceStyle: string;
    /** Frame clock (ms) for pulses/fades; monotonic within a session. */
    nowMs: number;
    /** Plot-relative pointer position, or null when the pointer is off the plot. Layers
     *  that hover-test set `repaintOnCursor` on their definition so pointer moves repaint
     *  them (only data-tier frames repaint layers otherwise). */
    cursor: {
        x: number;
        y: number;
    } | null;
}
/** How a layer dims/slims the BASE painting under it (see
 *  {@link RendererLayerInstance.modulateBase}). Omitted fields keep their defaults. */
interface BasePaintingModulation {
    /** Candle body width multiplier, (0..1] (1 = full width). */
    candleBodyScale?: number;
    /** Candle body-fill opacity, [0..1] (wick + border keep their own opacity). */
    candleBodyAlpha?: number;
    /** Gridline opacity, [0..1] (fade the grid as a reveal-under layer opens). */
    gridAlpha?: number;
}
/** One live layer instance (per mounted renderer). */
interface RendererLayerInstance {
    /** The renderer created (and owns) this transparent canvas — keep the reference, paint into it. */
    mount(canvas: HTMLCanvasElement): void;
    /** Paint one frame. Always clear/redraw your own canvas — the renderer never clears it for you. */
    render(args: RendererLayerArgs): void;
    /** Return true while the layer needs CONTINUOUS frames (a pulse/fade) — keeps the animator alive. */
    animating?(): boolean;
    /**
     * How the base painting (candles, grid) should be dimmed/slimmed under this layer for
     * the CURRENT frame — a gradual counterpart of the chart type's all-or-nothing
     * `basePainting: 'none'`. Called after `render` on every mounted layer that implements
     * it (chart-type and overlay alike); returning null (or omitting the method) is no
     * opinion. When several layers speak, each field keeps the strongest (smallest)
     * request. Values are clamped by the renderer.
     */
    modulateBase?(args: RendererLayerArgs): BasePaintingModulation | null;
    /** The renderer unmounted — release everything (the canvas itself is removed by the renderer). */
    destroy?(): void;
}
/** One registered layer kind. */
interface RendererLayerDefinition {
    /** The layer id — also its native-data channel (`setNativeData(id, …)` / `id + '-pending'`). */
    id: string;
    /** Stacking: `'below-data'` = behind the candles (reveal-under styles); `'above-data'` =
     *  over the candles, under the chrome/axes. Default `'above-data'`. A layer owned by a
     *  native indicator (its type equals the layer id) follows that indicator's z key in
     *  the pane stacking instead (`seriesOrder` / the object tree), mounting in front.
     *  Either way the gridlines stay BELOW every layer (they live on the backdrop canvas
     *  at the bottom of the pile) — no stacking puts a layer behind the grid.
     *  `'above-chrome'` stacks the canvas over the chrome too (axes, price scale, price label;
     *  still under drawings and the crosshair) and ignores z: for marks that belong ON the
     *  price scale, such as a level's price tag. Its canvas covers the price scale gutter. */
    placement?: 'below-data' | 'above-data' | 'above-chrome';
    /** Repaint this layer when the pointer moves (hover hit-testing UIs). Off by default:
     *  pointer moves normally repaint only the crosshair overlay, not the layers. */
    repaintOnCursor?: boolean;
    /** Instance factory — called once per mounted renderer, plus once per mounted instance
     *  of a `multiInstance` native indicator whose type equals this id (each instance paints
     *  through its own layer instance and canvas, fed by its own channel). */
    create(): RendererLayerInstance;
}
/** Register (or replace) a renderer layer. Renderers mounted AFTER registration pick it up. */
declare function registerRendererLayer(def: RendererLayerDefinition): void;
declare function unregisterRendererLayer(id: string): void;
/** Every registered layer definition (registration order). */
declare function rendererLayers(): RendererLayerDefinition[];

/** Selection/menu accent — active entries, "native" badges, selected controls. */
declare const ACCENT = "#2962ff";
/** The lighter brand blue: "on" affordances and the default drawing color, brighter than
 *  {@link ACCENT} so a switch reads clearly enabled. */
declare const ACCENT_BRIGHT = "#38c0fd";
/** Bullish/bearish reference pair — the dark theme's candle colors, reused wherever a
 *  fixed directional color is needed outside a theme (volume profiles, baseline defaults). */
declare const BULLISH = "#089981";
declare const BEARISH = "#f23645";
/** Neutral gray for de-emphasized geometry (unstyled level lines, gann 1/1 diagonals). */
declare const NEUTRAL = "#787b86";
/** Attention amber — favorited items. */
declare const HIGHLIGHT = "#e0b400";
/** Warm accent used by the categorical palette and warning-ish marks. */
declare const WARNING = "#ff9800";
/** Soft informational blue — statistical overlays (regression, VWAP) and the blue rung of the
 *  drawing level palette, which should read as derived data rather than user-drawn geometry. */
declare const INFO = "#5b9cf6";
/** Highlighter ink — a saturated marker orange, always drawn translucent. */
declare const MARKER = "#ff5d00";
/** Validity tints — a pattern that satisfies its rules vs one that does not. Brighter and
 *  cooler than {@link BULLISH}/{@link BEARISH} so a validity wash never reads as direction. */
declare const VALID = "#0ecb81";
declare const INVALID = "#f6465d";
/** Market-session states beside the theme's up-colored "open": pre-market dawn amber,
 *  post-market dusk sky, and the shared closed/holiday gray (statusline badge). */
declare const SESSION_PRE = "#f97316";
declare const SESSION_POST = "#0ea5e9";
declare const SESSION_OFF = "#9ca3af";
/** Default color of a plain line/area series — a softer blue than {@link ACCENT}, which is
 *  reserved for interactive chrome. */
declare const SERIES_LINE = "#3b82f6";
/** Crosshair ink: a cool gray that stays legible over both candles and empty surface. */
declare const CROSSHAIR = "#9aa0ad";
/** Fixed slate plates for canvas badges that float over chart content of any color (info
 *  badges on drawings) — they cannot follow the theme surface and stay readable.
 *  `SLATE_DEEP` is the plate, `SLATE` its border. */
declare const SLATE_DEEP = "#1e293b";
declare const SLATE = "#475569";
/** The crosshair's axis chips: a fixed mid gray, brighter than the dark chart surface so the
 *  chip stands off the axis on both themes while its white ink stays readable. */
declare const CHIP_PLATE = "#595959";
/** Strategy trade markers — entry arrows per position side, and the exits' shared violet.
 *  The entry pair deliberately reuses the accent blue / bearish red (the reference palette
 *  of order-fill marks); the violet keeps exits apart from both directions. */
declare const TRADE_LONG = "#2962ff";
declare const TRADE_SHORT = "#f23645";
declare const TRADE_EXIT = "#d500f9";
/** Categorical hues for auto-assigned colors (symbol badges, multi-series defaults).
 *  Ordered for adjacent-hue contrast, not by hue family. */
declare const CATEGORICAL: readonly string[];
/** Pick a stable categorical color for a string key (same key ⇒ same color). */
declare function categoricalColor(key: string): string;
/** TradingView's X post card (its own palette, measured on its dark chart 2026-10-26): a black card with light
 *  text and grey details in dark, the white card in light. `line` is the line to the post's bar. */
declare const XPOST_DARK: {
    readonly back: "#000000";
    readonly border: "#1A1A1A";
    readonly name: "#DBDBDB";
    readonly text: "#DBDBDB";
    readonly muted: "#808080";
    readonly line: "#808080";
    readonly url: "#1848CC";
};
declare const XPOST_LIGHT: {
    readonly back: "#FFFFFF";
    readonly border: "#EBEBEB";
    readonly name: "#000000";
    readonly text: "#0F0F0F";
    readonly muted: "#808080";
    readonly line: "#808080";
    readonly url: "#2962FF";
};
/** TradingView's own default colours for its built-in indicators (classics/tv.ts), read from its metainfo 2026-11-02.
 *  `pineBlue` is Pine's `color.blue`; a plot with no colour uses `blue`. */
declare const TV_COLORS: {
    readonly blue: "#2962FF";
    readonly orange: "#FF6D00";
    readonly grey: "#787B86";
    readonly green: "#4CAF50";
    readonly red: "#F23645";
    readonly yellow: "#FDD835";
    readonly purple: "#7E57C2";
    readonly green600: "#43A047";
    readonly teal: "#26A69A";
    readonly tealLight: "#B2DFDB";
    readonly redLight: "#FFCDD2";
    readonly redAccent: "#FF5252";
    readonly tvTeal: "#089981";
    readonly red900: "#B71C1C";
    readonly green200: "#A5D6A7";
    readonly red200: "#EF9A9A";
    readonly olive: "#808000";
    readonly pineBlue: "#2196F3";
};

interface IntervalChoice {
    value: number;
    /** Row text (`'100 ticks'`). */
    label: string;
    /** Faint right-aligned note (`'~800/day'`). */
    hint?: string;
}
interface IntervalSection {
    id: string;
    /** Section heading, shown upper-cased (`'Ticks'`). */
    title: string;
    order: number;
    /** Unit names for the custom-interval form and the default row label. */
    unit: {
        one: string;
        many: string;
    };
    /** The values to offer for the active chart. May resolve later (the dropdown shows a
     *  loading row until it does) and may be empty (only a custom value then). */
    choices(ctx: WidgetContext): readonly IntervalChoice[] | Promise<readonly IntervalChoice[]>;
    /** The value that is on right now, or null when this section's bars are not on. */
    current(ctx: WidgetContext): number | null;
    /** Compact topbar label of a value (`'100T'`). */
    short(value: number): string;
    /** Label of a STARRED value's quick-switch chip, which shows whether or not the value is on
     *  (`short` may describe the value in use only). Default: `short`. */
    chip?(value: number): string;
    /** Row label of a value that is not among `choices` (the one in use, a custom size).
     *  Default: `'<value> <unit>'`. */
    label?(value: number): string;
    select(ctx: WidgetContext, value: number): void;
    /** Leave this section's bars (a time interval or another section was picked). */
    leave(ctx: WidgetContext): void;
    /** Hide the section for this chart (e.g. the market has no data for these bars). */
    when?(ctx: WidgetContext): boolean;
}
declare const BUILTIN_INTERVAL_ORDER: {
    readonly seconds: 10;
    readonly minutes: 20;
    readonly hours: 30;
    readonly days: 40;
};
/** Register (or replace by id) a section. Returns the unregister. */
declare function registerIntervalSection(section: IntervalSection): () => void;
declare function unregisterIntervalSection(id: string): void;
/** Sections in `order`, `when`-filtered when a context is given. */
declare function intervalSections(ctx?: WidgetContext): IntervalSection[];
/** The section whose bars are on for this chart, with its value. */
declare function activeIntervalSection(ctx: WidgetContext): {
    section: IntervalSection;
    value: number;
} | null;
/** A plugin changed what its sections show or which value is on (settings edited elsewhere):
 *  the topbar label and an open dropdown re-read. */
declare function notifyIntervalSectionsChanged(): void;

interface ChromeTooltipOptions {
    /** Positioned container the tip mounts into (the chart plot, the toolbar host…). */
    host: HTMLElement;
    /** Live theme — read at OPEN time, so a theme switch never shows a stale tip. */
    theme: () => VelaTheme;
    /** Tip text — read at OPEN time (dynamic labels: Hide/Show). Empty ⇒ no tip. */
    text: () => string;
    /** Hover delay before the tip opens. Default 700 ms. */
    delayMs?: number;
    /** `below` the anchor (legend rows), to its `right` (a vertical toolbar), or `above`
     *  (controls sitting on the bottom edge). Default below. */
    placement?: 'below' | 'right' | 'above';
    /** Allow wrapping (long texts, e.g. an input's docs). Default false — one line. */
    wrap?: boolean;
    /** A tap or a click opens the tip and keeps it open until the next press anywhere. For ⓘ hints:
     *  a touch screen has no other way to read them, and clicking an ⓘ is what people do with a mouse
     *  too (it used to CLOSE the tip, user 2026-10-28: "the i icon is not working"). Default false. */
    tapToOpen?: boolean;
}
/**
 * Attach the tooltip to an anchor. Returns a disposer that removes the listeners AND any
 * open tip — call it when the anchor's row/dialog is torn down, or a tip visible at that
 * exact moment would outlive its anchor.
 */
declare function attachChromeTooltip(anchor: HTMLElement, opts: ChromeTooltipOptions): () => void;
interface ChromeHintOptions {
    /** See {@link ChromeTooltipOptions.host}. */
    host: HTMLElement;
    /** See {@link ChromeTooltipOptions.theme}. */
    theme: () => VelaTheme;
    /** Badge diameter in px. Default 16. */
    size?: number;
}
/**
 * The ⓘ hint badge every in-chart dialog puts after a label: a round chip with the `info`
 * icon and a wrapped chrome tooltip that opens quickly (a hint is asked for, not stumbled
 * on). The glyph is an SVG, so it is centered in the badge regardless of the font. Styled
 * inline (renderer chrome carries no stylesheet); the hover state is the tip's own
 * pointer listeners. Returns the element and a disposer for the tooltip.
 */
declare function chromeHint(text: string, opts: ChromeHintOptions): {
    el: HTMLElement;
    dispose: () => void;
};

/**
 * Register Vela's built-in native indicators (Volume, VPVR, the classic studies) now. Every chart does this when it
 * is constructed; a host that wraps a built-in (guards it per chart type, feeds it extra data) calls this first so
 * the wrap exists before the first chart starts restored indicators. Idempotent; a wrapped descriptor is kept.
 */
declare function registerBuiltinIndicators(): void;

export { registerDrawingType as $, ACCENT as A, BEARISH as B, CATEGORICAL as C, type DrawingTypeMeta as D, categoricalColor as E, chromeHint as F, classicCatalog as G, HIGHLIGHT as H, INFO as I, classicPlots as J, createDrawing as K, deserializeDrawing as L, MARKER as M, NEUTRAL as N, drawingTypes as O, type PlotRightInsetFn as P, getDrawingType as Q, type RendererLayerArgs as R, SERIES_LINE as S, TRADE_EXIT as T, intervalSections as U, VALID as V, WARNING as W, XPOST_DARK as X, notifyIntervalSectionsChanged as Y, plotRightInset as Z, registerBuiltinIndicators as _, ACCENT_BRIGHT as a, registerIntervalSection as a0, registerPlotRightInset as a1, registerRendererDefaults as a2, registerRendererLayer as a3, rendererDefaults as a4, rendererLayers as a5, stableSeriesId as a6, unregisterIntervalSection as a7, unregisterRendererDefaults as a8, unregisterRendererLayer as a9, BUILTIN_INTERVAL_ORDER as b, BULLISH as c, type BasePaintingModulation as d, CHIP_PLATE as e, CROSSHAIR as f, type ChromeHintOptions as g, type ChromeTooltipOptions as h, type ClassicPlotValues as i, INVALID as j, type IdentifiableKind as k, type IntervalChoice as l, type IntervalSection as m, type RendererLayerDefinition as n, type RendererLayerInstance as o, SESSION_OFF as p, SESSION_POST as q, SESSION_PRE as r, SLATE as s, SLATE_DEEP as t, TRADE_LONG as u, TRADE_SHORT as v, TV_COLORS as w, XPOST_LIGHT as x, activeIntervalSection as y, attachChromeTooltip as z };
