/**
 * Canonical time in Vela: Unix epoch **milliseconds**.
 *
 * This matches JS `Date` and the bar `openTime` every provider and scripting
 * engine speaks. Each renderer converts to its own unit at its boundary (a
 * second-based adapter divides by 1000).
 */
type Millis = number;

/** A single price bar. `time` is the bar's open time in epoch ms. */
interface OHLCV {
    time: Millis;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

/** Value-series kinds drawn as a connected/point series. */
type LineLikeKind = 'line' | 'area' | 'step' | 'histogram' | 'columns' | 'circles' | 'cross';
/**
 * All renderable series kinds. NOTE: `fill`, `background`, and `hline` are
 * intentionally NOT series kinds — they are modeled as overlays on a pane
 * (see scene.ts), and `barcolor` is a recolor of the price candles, not a
 * series.
 */
type SeriesKind = LineLikeKind | 'candle' | 'bar' | 'markers';
type LineStyle = 'solid' | 'dashed' | 'dotted';
/** A single point of a value series. `value: null` marks a gap (whitespace). */
interface SeriesPoint {
    time: Millis;
    value: number | null;
    /** Per-point color override (e.g. `plot(x, color = cond ? c1 : c2)`). */
    color?: string;
}
interface LineLikeStyle {
    color: string;
    width: number;
    lineStyle: LineStyle;
    /** Baseline for histogram/area; ignored by the line family. */
    base?: number;
}
interface CandleStyle {
    up: string;
    down: string;
    wickUp?: string;
    wickDown?: string;
    borderUp?: string;
    borderDown?: string;
}
/** Per-bar plotcandle/plotbar override (body / wick / border colours). */
interface CandleBarColor {
    color?: string;
    wickColor?: string;
    borderColor?: string;
}
interface MarkerPoint {
    time: Millis;
    position: 'aboveBar' | 'belowBar' | 'inBar';
    /** Neutral shape token (e.g. 'arrowUp', 'circle', 'square'); mapped per renderer. */
    shape: string;
    color: string;
    text?: string;
    size?: 'tiny' | 'small' | 'normal' | 'large' | 'huge';
}
interface SeriesBase {
    /** Content-addressed, stable across re-runs of identical source (see identity.ts). */
    id: string;
    title: string;
    /** Pane this series belongs to; resolved by the orchestrator. */
    paneId: string;
    /** Declared draw-order intent; the renderer owns final z-ordering. */
    zOrder?: number;
    visible?: boolean;
    /** `force_overlay` → render on the price pane regardless of the indicator's pane. */
    overlay?: boolean;
}
interface LineLikeSeries extends SeriesBase {
    kind: LineLikeKind;
    points: SeriesPoint[];
    style: LineLikeStyle;
}
interface CandleSeries extends SeriesBase {
    kind: 'candle' | 'bar';
    bars: OHLCV[];
    style?: Partial<CandleStyle>;
    /** Per-bar plotcandle/plotbar colours, aligned to `bars` by index (null ≡ use defaults). */
    barColors?: Array<CandleBarColor | null>;
}
interface MarkerSeries extends SeriesBase {
    kind: 'markers';
    markers: MarkerPoint[];
}
type SeriesSpec = LineLikeSeries | CandleSeries | MarkerSeries;

/**
 * Renderer-neutral models for Pine drawing objects (`line.new`, `box.new`, …).
 * Coordinates are kept in their Pine form, tagged by {@link DrawingXLoc}: the
 * renderer converts a bar index or epoch-ms time to a pixel via the time scale.
 */
/** How a drawing's x-coordinates are interpreted (Pine `xloc`). */
type DrawingXLoc = 'bar_index' | 'bar_time';
/** Pine `extend`: which side(s) the drawing runs out to the chart edge. */
type DrawingExtend = 'none' | 'left' | 'right' | 'both';
type BoxTextSize = 'auto' | 'tiny' | 'small' | 'normal' | 'large' | 'huge';
type BoxHAlign = 'left' | 'center' | 'right';
type BoxVAlign = 'top' | 'center' | 'bottom';
type BoxFontFamily = 'default' | 'monospace';
/**
 * A Pine `line.new(...)`. `x1/x2` are bar indices (xloc `bar_index`) or epoch ms
 * (xloc `bar_time`); `y1/y2` are prices.
 */
interface DrawingLine {
    id: string;
    paneId: string;
    xloc: DrawingXLoc;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    extend: DrawingExtend;
    /** Stroke color. `undefined` → use the renderer's default foreground color. */
    color?: string;
    /** `na` color → the line exists but is not stroked (e.g. a linefill anchor). */
    invisible: boolean;
    /** Pine line width in px (uncapped, unlike a series `lineWidth`). */
    width: number;
    style: LineStyle;
    /** Arrowhead at the first point (`style_arrow_left` / `style_arrow_both`). */
    arrowLeft: boolean;
    /** Arrowhead at the second point (`style_arrow_right` / `style_arrow_both`). */
    arrowRight: boolean;
    /** `force_overlay` → render on the price pane regardless of the indicator's pane. */
    overlay?: boolean;
}
/** A Pine `box.new(...)`. `left/right` follow `xloc`; `top/bottom` are prices. */
interface DrawingBox {
    id: string;
    paneId: string;
    xloc: DrawingXLoc;
    left: number;
    top: number;
    right: number;
    bottom: number;
    extend: DrawingExtend;
    /** Fill color (may carry alpha). `undefined` → no fill (`na`). */
    bgColor?: string;
    /** Border color. `undefined` → no border (`na`). */
    borderColor?: string;
    borderWidth: number;
    borderStyle: LineStyle;
    /** Box text. `undefined`/empty → no text drawn. */
    text?: string;
    /** Text color. `undefined` → auto-contrast against the fill. */
    textColor?: string;
    textSize: BoxTextSize;
    hAlign: BoxHAlign;
    vAlign: BoxVAlign;
    /** `text.wrap_auto` → wrap to the box width; otherwise single line per `\n`. */
    wrap: boolean;
    fontFamily: BoxFontFamily;
    bold: boolean;
    italic: boolean;
    /** `force_overlay` → render on the price pane regardless of the indicator's pane. */
    overlay?: boolean;
}
/** Pine `label.style_*` (the bubble/pointer variants and the point-marker shapes). */
type LabelStyle = 'label_up' | 'label_down' | 'label_left' | 'label_right' | 'label_center' | 'label_lower_left' | 'label_lower_right' | 'label_upper_left' | 'label_upper_right' | 'circle' | 'square' | 'diamond' | 'flag' | 'arrowup' | 'arrowdown' | 'triangleup' | 'triangledown' | 'cross' | 'xcross' | 'text_outline' | 'none';
/**
 * Where a label/marker anchors vertically. Pine `yloc` (price/abovebar/belowbar)
 * plus the `plotshape` pane-relative `location.top`/`location.bottom`.
 */
type LabelYLoc = 'price' | 'abovebar' | 'belowbar' | 'top' | 'bottom';
/** A Pine `label.new(...)`. `x` follows `xloc`; `y` is a price (used when yloc='price'). */
interface DrawingLabel {
    id: string;
    paneId: string;
    xloc: DrawingXLoc;
    x: number;
    y: number;
    yloc: LabelYLoc;
    text?: string;
    style: LabelStyle;
    /** Bubble / marker color. `undefined` → renderer default. */
    color?: string;
    textColor?: string;
    size: BoxTextSize;
    textAlign: BoxHAlign;
    tooltip?: string;
    fontFamily: BoxFontFamily;
    /** Pine `text_formatting` — bold/italic text, matching the box text options. */
    bold?: boolean;
    italic?: boolean;
    /** na bubble/marker color → render text only (no bubble/shape fill). */
    noFill?: boolean;
    /** `force_overlay` → render on the price pane regardless of the indicator's pane. */
    overlay?: boolean;
}
/** One vertex of a polyline (Pine `chart.point`). `x` follows `xloc`; `price` is y. */
interface PolylinePoint {
    xloc: DrawingXLoc;
    x: number;
    price: number;
}
/** A Pine `polyline.new(...)` — a multi-point path, optionally curved and/or closed. */
interface DrawingPolyline {
    id: string;
    paneId: string;
    points: PolylinePoint[];
    curved: boolean;
    closed: boolean;
    /** Stroke color. `undefined` → no stroke. */
    lineColor?: string;
    /** Fill color (closed paths). `undefined` → no fill. */
    fillColor?: string;
    lineWidth: number;
    lineStyle: LineStyle;
    /** Arrowheads at segment starts/ends (`line.style_arrow_*`). */
    arrowLeft: boolean;
    arrowRight: boolean;
    /** `force_overlay` → render on the price pane regardless of the indicator's pane. */
    overlay?: boolean;
}
/** A Pine `linefill.new(line1, line2, color)` — the band between two lines. */
interface DrawingLinefill {
    id: string;
    paneId: string;
    line1: DrawingLine;
    line2: DrawingLine;
    /** Fill color. `undefined` → nothing drawn. */
    color?: string;
    /** `force_overlay` → render on the price pane regardless of the indicator's pane. */
    overlay?: boolean;
}
/** Pine `position.*` — which chart corner/edge a table anchors to. */
type TablePosition = 'top_left' | 'top_center' | 'top_right' | 'middle_left' | 'middle_center' | 'middle_right' | 'bottom_left' | 'bottom_center' | 'bottom_right';
/** One `table.cell(...)`. */
interface TableCell {
    text?: string;
    textColor?: string;
    bgColor?: string;
    hAlign: BoxHAlign;
    vAlign: BoxVAlign;
    /** A named size, or Pine's integer `text_size` as a raw pixel value. */
    textSize: BoxTextSize | number;
    fontFamily: BoxFontFamily;
    tooltip?: string;
    bold: boolean;
    italic: boolean;
    /** Cell width as a percent of the pane's width (absent/0 = size to content). */
    width?: number;
    /** Cell height as a percent of the pane's height (absent/0 = size to content). */
    height?: number;
    /** A non-origin cell absorbed by a `table.merge_cells` region → not rendered.
     *  Engines may also (spuriously) stamp this on the merge ORIGIN — renderers must
     *  resolve visibility against `DrawingTable.merges`, not this flag alone. */
    merged?: boolean;
}
/** A `table.merge_cells` region (inclusive, in column/row coordinates). */
interface TableMerge {
    startCol: number;
    startRow: number;
    endCol: number;
    endRow: number;
}
/** A Pine `table.new(...)` — a DOM-overlay grid anchored to a chart corner. */
interface DrawingTable {
    id: string;
    paneId: string;
    position: TablePosition;
    columns: number;
    rows: number;
    bgColor?: string;
    frameColor?: string;
    frameWidth: number;
    borderColor?: string;
    borderWidth: number;
    /** Row-major: `cells[row][col]`; entries may be null (empty cell). */
    cells: Array<Array<TableCell | null>>;
    /** Merged-cell regions (`table.merge_cells`); origin spans, others are dropped. */
    merges: TableMerge[];
    /** `force_overlay` → anchor to the price pane regardless of the indicator's pane. */
    overlay?: boolean;
}

type PaneKind = 'price' | 'study';
interface Pane {
    id: string;
    kind: PaneKind;
    /** Display order, top-to-bottom; the price pane is conventionally order 0. */
    order: number;
    /** Relative height weight among panes (the renderer normalizes). */
    heightWeight?: number;
    title?: string;
}
/** One bar's vertical gradient stop for a gradient `fill()` (color@price). */
interface FillGradientStop {
    topValue: number;
    bottomValue: number;
    topColor: string;
    bottomColor: string;
}
/** A band fill between two value series (Pine `fill(plot1, plot2, ...)`). */
interface Fill {
    id: string;
    paneId: string;
    /** RESOLVED series ids (the orchestrator resolves Pine plot refs to ids). */
    fromSeriesId: string;
    toSeriesId: string;
    /** Flat band color (no per-bar variation). */
    color?: string;
    /** Per-bar solid color (conditional fills), aligned to the anchor points by index. */
    colors?: Array<string | null>;
    /** Per-bar vertical gradient (gradient-fill overload), aligned by index. */
    gradient?: Array<FillGradientStop | null>;
    /** `force_overlay` → render on the price pane regardless of the indicator's pane. */
    overlay?: boolean;
}
/** A vertical background tint over a time span (Pine `bgcolor()` / session bands). */
interface Background {
    id: string;
    paneId: string;
    /** Inclusive start, epoch ms. */
    from: Millis;
    /** Exclusive end, epoch ms. */
    to: Millis;
    color: string;
    /** `force_overlay` → render on the price pane regardless of the indicator's pane. */
    overlay?: boolean;
}
/** A horizontal price line (Pine `hline()`). */
interface PriceLine {
    id: string;
    paneId: string;
    price: number;
    color?: string;
    lineStyle?: LineStyle;
    width?: number;
    title?: string;
}
/**
 * The renderer-neutral, full description of what to draw. In the engine-owned
 * design the orchestrator usually drives the renderer per-indicator
 * (`mountIndicator`), but `Scene` is the conceptual aggregate the reconciler
 * diffs against.
 */
interface Scene {
    bars: OHLCV[];
    panes: Pane[];
    series: SeriesSpec[];
    fills: Fill[];
    backgrounds: Background[];
    priceLines: PriceLine[];
    lines?: DrawingLine[];
    boxes?: DrawingBox[];
    labels?: DrawingLabel[];
    polylines?: DrawingPolyline[];
    linefills?: DrawingLinefill[];
    tables?: DrawingTable[];
}

/**
 * One order execution of a strategy indicator — the unit painted on the chart as a
 * trade marker (direction arrow + optional label/quantity text + a tick at the exact
 * fill price). Executions anchor to their FILL bar and always render on the PRICE
 * pane, whatever pane the indicator's plots landed on: a fill price only means
 * something on the price scale.
 */
interface TradeExecution {
    /** Fill bar (bar open time, epoch ms) — the bar the marker unit anchors to. */
    time: Millis;
    /** Exact fill price — anchors the price tick on the bar's edge. */
    price: number;
    /** A buy paints an up arrow below the bar; a sell a down arrow above it. */
    side: 'buy' | 'sell';
    /**
     * Entries paint a plain arrow in the position side's entry color; exits paint a
     * capped arrow (a bar between tip and price bar) in the shared exit color.
     */
    kind: 'entry' | 'exit';
    /** Text line next to the arrow — the order id, or its comment when one was given. */
    label?: string;
    /** Filled quantity (magnitude); painted signed (`+` for buys, `-` for sells). */
    qty?: number;
    /** Shared by the executions of one round-trip (an entry and its exits). */
    tradeId?: string;
}

/**
 * Renderer-neutral indicator input schema — Vela's own shape, owned here so no
 * scripting language's own input model leaks into core (each engine maps its
 * declarations onto this at its boundary). Drives the renderer's settings dialog
 * (the gear settings UI).
 */
type InputType = 'int' | 'float' | 'bool' | 'string' | 'source' | 'color' | 'price' | 'time' | 'session' | 'timeframe' | 'symbol' | 'text_area';
type InputValue = number | string | boolean;
/**
 * Host-provided symbol picker for the settings dialog's `input.symbol` control. Called when the
 * user activates the field: the host opens its own symbol-selection UI (e.g. the app's ticker
 * menu) seeded with the `current` symbol, and reports the chosen one back through `onPick`. When
 * no picker is wired, `input.symbol` falls back to a plain text field.
 */
type SymbolPickerFn = (current: string, onPick: (symbol: string) => void) => void;
/** One visibility condition on another input's current value: `equals` matches a single
 *  value (a toggle, one dropdown choice), `anyOf` matches a set (several choices). */
interface InputCondition {
    key: string;
    equals?: InputValue;
    anyOf?: readonly InputValue[];
}
/** An input's visibility gate: one condition, or several AND-ed together. */
type InputWhen = InputCondition | readonly InputCondition[];
/**
 * Evaluate a visibility gate against the dialog's resolved current values (an input's
 * stored value, else its `defval`). No gate ⇒ visible. Mirrors the chart-settings row
 * gate (`settingsRowVisible`) so both dialogs share one condition vocabulary.
 */
declare function inputVisible(when: InputWhen | undefined, values: Record<string, InputValue>): boolean;
interface InputSchema {
    /** Stable key used by `setInput()` — the engine's own variable id, falling back to `title`. */
    key: string;
    /** Display label shown in the settings dialog. */
    title: string;
    type: InputType;
    defval: InputValue;
    min?: number;
    max?: number;
    step?: number;
    /** Choices for a dropdown (`input.string(..., options=[...])`). */
    options?: readonly string[];
    /** Grouping label for the dialog layout. */
    group?: string;
    /** Inline grouping label (controls placed on one row). */
    inline?: string;
    /** Settings-dialog tab hosting this input; unset ⇒ the default "Inputs" tab. */
    tab?: string;
    /** Visibility gate: the input's row shows only while the condition(s) pass against
     *  the dialog's current values — re-evaluated live on every edit. Inputs sharing an
     *  `inline=` row show while ANY member's gate passes. A hidden input keeps its value. */
    when?: InputWhen;
    tooltip?: string;
}
/**
 * The DELTAS of a value bag against its schema's declaration defaults — what state
 * persistence stores (a default that later changes in the script must not stay frozen
 * in every saved document). Structural comparison (arrays/objects by JSON); keys the
 * schema does not declare are ignored. `undefined` = nothing deviates.
 */
declare function inputDeltas(schema: readonly InputSchema[], values: Record<string, InputValue>): Record<string, InputValue> | undefined;

/** Declaration metadata from the Pine `indicator()` / `strategy()` call. */
interface IndicatorMeta {
    title: string;
    shorttitle?: string;
    overlay: boolean;
    precision?: number;
    format?: string;
}
/** Where an indicator's plots are placed. */
type PaneHint = 'price' | 'new';
/** One label of a categorical pane axis: `frac` is the label's center as a fraction of
 *  the pane's height (0 = top, 1 = bottom). */
interface PaneAxisBand {
    frac: number;
    label: string;
}
/** A pane's value-axis override (see {@link IndicatorModel.paneAxis}): `'none'` = a
 *  blank axis; band labels = a categorical axis, one label per content band/row. */
type PaneAxis = 'none' | {
    bands: PaneAxisBand[];
};
/**
 * Everything one `addIndicator()` produces — the unit the orchestrator mounts
 * on the renderer. Renderer-neutral.
 */
interface IndicatorModel {
    /** Per-instance id (stable). */
    id: string;
    /** Full display name (settings dialog, object tree, inspect). */
    title: string;
    /**
     * Compact label the legend chip and the settings dialog show instead of the full
     * {@link title}. Absent ⇒ both use {@link title}. Mirrors Pine
     * `indicator(..., shorttitle=)`.
     */
    shorttitle?: string;
    overlay: boolean;
    paneHint: PaneHint;
    /**
     * Marks a NATIVE indicator (core-computed, no Pine engine) and its type (e.g. `'volume'`,
     * `'volume'`). Absent ⇒ an ordinary Pine indicator. Drives native-only legend styling
     * (distinct title color) + list ordering (native indicators pin to the top).
     */
    native?: {
        type: string;
    };
    /**
     * Value-axis override for the pane this indicator OWNS — declared by content that is
     * not value-mapped (e.g. a bespoke renderer layer painting in pixel bands), where a
     * derived price scale would label meaningless numbers. `'none'` leaves the axis blank;
     * band labels place text at fractions of the pane's height (a categorical axis — one
     * label per band/row, e.g. `frac: 0.25` centers a label in the top quarter). Either way
     * the renderer draws no price ticks, no horizontal gridlines, and no crosshair value
     * chip in that pane. Only honored while such indicators are the pane's sole content —
     * any real series merged into the pane takes the scale (and its labels) back over.
     */
    paneAxis?: PaneAxis;
    /** Resolved pane id, filled in by the orchestrator after routing. */
    paneId?: string;
    /**
     * When true, this indicator renders on its OWN price scale within its pane (a
     * dedicated axis column to the right of the pane's scale), independent of the
     * pane's master scale — set when the indicator is merged into a pane it does not
     * own. Absent/false ⇒ it shares the pane's scale (the norm; script overlays like
     * a moving average keep sharing the price scale).
     */
    ownScale?: boolean;
    /**
     * Chart time (epoch ms) of the execution's FIRST bar. Index-aligned payloads —
     * dense series point/bar arrays and `bar_index` drawing coordinates — count from
     * this bar, so a renderer aligns them to the chart via the offset of this time in
     * its bar array. Absent ⇒ the model spans the whole chart (offset 0, the norm);
     * set by engines that ran over a SUFFIX of the bars (e.g. mid-backfill).
     */
    anchorTime?: Millis;
    series: SeriesSpec[];
    fills: Fill[];
    backgrounds: Background[];
    priceLines: PriceLine[];
    /** Pine `line.new(...)` drawings (optional; absent ≡ none). */
    lines?: DrawingLine[];
    /** Pine `box.new(...)` drawings (optional; absent ≡ none). */
    boxes?: DrawingBox[];
    /** Pine `label.new(...)` drawings (optional; absent ≡ none). */
    labels?: DrawingLabel[];
    /** Pine `polyline.new(...)` drawings (optional; absent ≡ none). */
    polylines?: DrawingPolyline[];
    /** Pine `linefill.new(...)` fills (optional; absent ≡ none). */
    linefills?: DrawingLinefill[];
    /** Pine `table.new(...)` DOM overlays (optional; absent ≡ none). */
    tables?: DrawingTable[];
    /** Pine `barcolor(...)` per-bar candle recolor (time→color; absent/empty ≡ none). */
    barColors?: Array<{
        time: Millis;
        color: string;
    }>;
    /** Strategy order executions, painted as trade markers on the PRICE pane (optional; absent ≡ none). */
    trades?: TradeExecution[];
    /** Input schema parsed from the Pine source (drives the renderer's settings dialog). */
    inputs: InputSchema[];
    /** Current input values (defaults merged with any user/add-time overrides). */
    inputValues: Record<string, InputValue>;
    /** Declaration-props schema (the settings dialog's "Properties" tab). Absent ≡ none. */
    props?: InputSchema[];
    /** Current prop values (effective defaults merged with any user/add-time overrides). */
    propValues?: Record<string, InputValue>;
}

interface DirtyRange {
    from: Millis;
    to: Millis;
}
/** Per-series changed tail in a value patch. */
type SeriesValueDelta = {
    seriesId: string;
    kind: 'points';
    points: SeriesPoint[];
} | {
    seriesId: string;
    kind: 'bars';
    bars: OHLCV[];
} | {
    seriesId: string;
    kind: 'markers';
    markers: MarkerPoint[];
};
/**
 * Value-only update to existing series — legal as an in-place renderer update
 * (the renderer chooses `update()` vs `setData(tail)` by time comparison).
 */
interface ValuePatch {
    kind: 'value';
    indicatorId: string;
    dirty: DirtyRange;
    /**
     * The emitting run's anchor (see `IndicatorModel.anchorTime`): a re-run over a
     * DIFFERENT bar window arrives as a value patch, so the anchor must travel with
     * it for index-aligned rendering to re-derive its offset. `null` states the run
     * spanned the WHOLE chart and clears any previous anchor — an omitted key cannot,
     * so a model that once had an anchor would otherwise keep that stale offset.
     */
    anchorTime?: Millis | null;
    series: SeriesValueDelta[];
    /**
     * Full drawing snapshots for this tick. Pine drawing containers are emitted
     * as a small, capped, already-final set each run, so live updates replace
     * the whole set rather than diffing. Absent ≡ unchanged/none.
     */
    lines?: DrawingLine[];
    boxes?: DrawingBox[];
    labels?: DrawingLabel[];
    polylines?: DrawingPolyline[];
    linefills?: DrawingLinefill[];
    tables?: DrawingTable[];
    /** Trade executions follow the same full-snapshot-per-tick pattern as the drawings. */
    trades?: TradeExecution[];
}
/**
 * Structural change — series added/removed/kind-changed, or panes changed.
 * Forces a remount of the affected series (a series' kind is fixed at creation
 * in most backends).
 */
interface SchemaPatch {
    kind: 'schema';
    indicatorId: string;
    added: SeriesSpec[];
    removed: string[];
    changed: Array<{
        seriesId: string;
        reason: 'kind' | 'pane';
    }>;
}
type ScenePatch = ValuePatch | SchemaPatch;

/** A function that detaches a previously-registered subscription. */
type Unsubscribe = () => void;

/**
 * Async series access for data-driven drawings — the ranged, any-timeframe sibling
 * of {@link Projector.barsInRange}. Painting stays synchronous: a read either serves
 * bars from cache or reports `loading` while a fetch runs in the background; the
 * gateway then fires {@link DrawingSeriesGateway.onUpdate} so the renderer repaints
 * and the next read finds the bars. Neutral by design — any drawing that needs bars
 * of a finer timeframe than the chart's reads through this seam.
 */
/** One OHLC(V) bar as the gateway returns it (`time` = bar open, epoch ms). */
interface DrawingSeriesBar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}
/**
 * The synchronous answer to a series read. `ready` and `loading` carry the RESOLVED
 * timeframe (an `'auto'` request comes back concrete) and its bar duration so consumers
 * never re-derive timeframe math. `loading` may carry best-effort PARTIAL bars from
 * previously fetched overlapping windows, so a resize keeps painting what it already
 * has while the widened fetch runs; `unavailable` is a terminal state for this
 * request — no fetch was started.
 */
type DrawingSeriesState = {
    state: 'loading';
    timeframe: string;
    barMs: number;
    bars?: ReadonlyArray<DrawingSeriesBar>;
} | {
    state: 'ready';
    bars: ReadonlyArray<DrawingSeriesBar>;
    timeframe: string;
    barMs: number;
} | {
    state: 'unavailable';
    /** `no-source` = the market has no ranged feed (inline data); `none-lower` = NO
     *  offered timeframe is below the chart's (the chart is already at the finest);
     *  `not-lower` = the explicit pick does not subdivide the chart's (lower picks
     *  exist); `too-wide` = the range would need more bars than the gateway's cap. */
    reason: 'no-source' | 'none-lower' | 'not-lower' | 'too-wide';
};
/**
 * The core-owned gateway the renderer hands drawings via {@link Projector.seriesInRange}.
 * `timeframe` accepts a canonical value (`'5'`, `'60'`, `'D'`) or `'auto'` — the gateway
 * resolves `'auto'` against the chart's own timeframe and refuses anything not strictly
 * lower than it.
 */
interface DrawingSeriesGateway {
    /** Synchronous cache read for the CHART's OWN symbol; kicks a background fetch on a miss. */
    seriesInRange(timeframe: string, from: number, to: number): DrawingSeriesState;
    /** Fires when a background fetch lands new bars (the renderer repaints on it). */
    onUpdate(listener: () => void): Unsubscribe;
}

/**
 * Geometry seam for user drawings. A drawing stores its anchors in DATA space
 * ({@link DrawingPoint}); every pixel it needs is resolved on demand through a
 * {@link Projector} the renderer supplies. The model never stores pixels, so a
 * drawing survives reload, pan/zoom, bar-prepend, and timezone changes — the
 * same invariant Pine drawings get from `xloc:'bar_time'`.
 */

/** A drawing anchor in DATA space (epoch-ms time + data-space price). */
interface DrawingPoint {
    /** Epoch ms — resolved to a fractional logical bar index by the time scale. */
    time: number;
    /** Data-space price (not normalized, not pane-relative). */
    price: number;
}
/** Axes a handle is free to move along — drives drag constraints + handle generation. */
type FreeAxis = 'both' | 'x' | 'y' | 'none';
/**
 * Magnet (snap-to-candle) strength. `off` never snaps; `strong` always snaps the
 * anchor to the nearest bar/OHLC; `weak` snaps only when the candle point is within
 * a small pixel radius of the cursor (so you can place freely between candles).
 * Holding Ctrl/Cmd is a momentary `strong` override regardless of the sticky mode.
 */
type SnapMode = 'off' | 'weak' | 'strong';
/**
 * The renderer-supplied data→pixel transform. The native renderer builds it from
 * its {@link CoordinateSystem} (`xOf = timeToX`, `yOf = priceToY` against the
 * pane's live scale + bounds); any other renderer can build the same from its own
 * coordinate closures. Defined in core so the model depends only on the interface.
 */
interface Projector {
    /** Pixel x for an epoch-ms time (extrapolates past either edge). */
    xOf(time: number): number;
    /** Pixel y for a price on a pane; `null` when the pane is gone. */
    yOf(price: number, paneId: string): number | null;
    /** Inverse — pixel → data point on a pane (used on create/drag commit). */
    pxToPoint(x: number, y: number, paneId: string): DrawingPoint;
    /** Which pane owns a pixel y, or `null` outside every pane. */
    paneIdAtY(y: number): string | null;
    /**
     * A pane's vertical pixel extent, or `null` when the pane is gone. `height` is 0 while
     * the pane is hidden (collapsed to a legend strip, or zeroed by another pane's maximize) —
     * painters clip each drawing to this rect so panes stay visually separated; optional.
     */
    paneRect?(paneId: string): {
        top: number;
        height: number;
    } | null;
    /** Approximate whole bars between two times (for measurement labels); optional. */
    barsBetween?(t1: number, t2: number): number;
    /**
     * OHLC(V) bars whose time falls within `[from, to]` (inclusive), in ascending time —
     * the data a statistical drawing (e.g. a regression channel or anchored VWAP) fits
     * against. `volume` is optional (some feeds omit it). Optional itself: renderers without
     * series access (or with user-drawings disabled) may omit the method, and such drawings
     * then degrade gracefully to an anchor-only fallback.
     */
    barsInRange?(from: number, to: number): ReadonlyArray<{
        time: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume?: number;
    }>;
    /**
     * Bars of a FINER timeframe than the chart's, for the same symbol — the async sibling
     * of {@link barsInRange} (see {@link DrawingSeriesGateway}): a cache read that reports
     * `loading` while the background fetch runs, after which the renderer repaints.
     * Optional: renderers without a series gateway omit it, and such drawings degrade to
     * an anchors-only rendering.
     */
    seriesInRange?(timeframe: string, from: number, to: number): DrawingSeriesState;
    /** Plot width in media px (excludes the right price-axis strip). */
    readonly width: number;
    /** Plot height in media px (excludes the bottom time-axis strip). */
    readonly height: number;
}

/**
 * The cosmetic payload shared by every drawing (the "settings" a user edits).
 * Reuses the Pine {@link LineStyle} so dash patterns resolve through the same
 * `dashPattern()` helper the renderer already uses.
 */
interface DrawingStyle {
    lineColor: string;
    lineWidth: number;
    lineStyle: LineStyle;
    /** Fill (box / closed path); `undefined` ⇒ no fill. */
    fillColor?: string;
    /** Fill opacity 0..1 (applied over `fillColor`). */
    fillOpacity?: number;
    arrowLeft?: boolean;
    arrowRight?: boolean;
}
/** A drawing's editable text/annotation block. */
interface DrawingText {
    value: string;
    /** `undefined` ⇒ auto-contrast against the fill/background. */
    color?: string;
    size: 'tiny' | 'small' | 'normal' | 'large' | 'huge' | 'auto';
    hAlign: 'left' | 'center' | 'right';
    vAlign: 'top' | 'center' | 'bottom';
    bold?: boolean;
    italic?: boolean;
}

/**
 * A data-driven settings schema. Each {@link SettingsField} names a dot-path into
 * a drawing (`'style.lineColor'`, `'text.value'`) plus a control `kind`, so the
 * renderer's settings popup builds controls generically — adding a new drawing
 * type is a schema entry, not new UI code.
 */
type FieldKind = 'color' | 'number' | 'select' | 'lineStyle' | 'boolean' | 'text' | 'opacity';
interface SettingsField {
    /** Dot-path into the drawing, e.g. `'style.lineColor'`, `'text.value'`, `'locked'`. */
    path: string;
    label: string;
    kind: FieldKind;
    /** number/opacity bounds. */
    min?: number;
    max?: number;
    step?: number;
    /** select options. */
    options?: ReadonlyArray<{
        value: string;
        label: string;
    }>;
    /** Cosmetic grouping in the popup. */
    group?: 'line' | 'fill' | 'text' | 'behavior';
}
interface SettingsSchema {
    fields: SettingsField[];
    /**
     * The text **is** the drawing (a text label, a note, a callout) rather than an optional label on
     * a shape. The settings popup then puts the text controls — color, size, bold, italic — on the
     * bar itself instead of tucking them under the text field.
     */
    textIsContent?: boolean;
}

/**
 * The interactive user-drawing types. The lean-core set ships first; new types
 * (fibs/patterns) extend the union + register a class — no base/port change.
 */
type DrawingTypeKey = 'trendline' | 'hline' | 'ray' | 'extendedline' | 'vline' | 'hray' | 'crossline' | 'infoline' | 'trendangle' | 'box' | 'text' | 'note' | 'pricenote' | 'comment' | 'pricelabel' | 'signpost' | 'parallelchannel' | 'disjointchannel' | 'flattopbottom' | 'regressionchannel' | 'anchoredvwap' | 'fixedrangevp' | 'pitchfork' | 'schiffpitchfork' | 'modifiedschiffpitchfork' | 'insidepitchfork' | 'arrow' | 'callout' | 'ellipse' | 'triangle' | 'polyline' | 'freehand' | 'highlighter' | 'circle' | 'rotatedrect' | 'path' | 'arc' | 'curve' | 'arrowmarkup' | 'arrowmarkdown' | 'flagmark' | 'iconstamp' | 'fibretracement' | 'fibextension' | 'fibextensiontrend' | 'fibfan' | 'fibtimezones' | 'fibchannel' | 'fibspeedfan' | 'trendfibtime' | 'fibcircles' | 'fibarcs' | 'fibwedge' | 'fibspiral' | 'gannfan' | 'gannbox' | 'gannsquare' | 'dedekind' | 'sonic' | 'supersonic' | 'goldensonic' | 'goldensupersonic' | 'datepricerange' | 'position' | 'magnifier' | 'xabcd' | 'abcd' | 'elliottimpulse' | 'elliottcorrection' | 'headshoulders' | 'gartley' | 'bat' | 'butterfly' | 'crab' | 'shark' | 'cypher';
/** One anchor's role + which axes its handle may move along. */
interface AnchorSlot {
    role: string;
    free: FreeAxis;
}
/**
 * The plain-JSON shape of one drawing — the ONLY representation that crosses the
 * renderer port and the persistence boundary. A {@link Drawing} (rich behavior)
 * serializes to/from this; the renderer never sees a class instance.
 */
interface SerializedDrawing {
    id: string;
    type: DrawingTypeKey;
    paneId: string;
    /** time+price anchors — the single source of geometry truth. */
    anchors: DrawingPoint[];
    style: DrawingStyle;
    text?: DrawingText;
    locked: boolean;
    visible: boolean;
    /** Draw-order key. On a renderer with `drawingDepth` it shares ONE space with the pane's
     *  series — the candles and each indicator carry z keys of their own — so a drawing can sit
     *  anywhere in the stack, under the candles or between two indicators included. */
    zIndex: number;
    createdAt: number;
    /** Per-type extras (e.g. box `extend`) — keeps the base closed. */
    props?: Record<string, unknown>;
}
/**
 * The parent of every user drawing. Owns the shared state + settings/serialization
 * (the "everything inherits from a parent object" intent), and declares the
 * geometry behaviors as PURE functions of `(anchors, Projector)` so the whole
 * hierarchy stays renderer-neutral and serializable.
 */
declare abstract class Drawing {
    readonly id: string;
    abstract readonly type: DrawingTypeKey;
    paneId: string;
    /** DATA-space anchors (time+price). The only geometry the model stores. */
    anchors: DrawingPoint[];
    style: DrawingStyle;
    text?: DrawingText;
    locked: boolean;
    visible: boolean;
    zIndex: number;
    readonly createdAt: number;
    constructor(init: Partial<SerializedDrawing> & {
        paneId: string;
    });
    /** Fallback id counter — used only when no id is supplied (store assigns real ids). */
    private static seq;
    abstract anchorSchema(): {
        min: number;
        max: number;
        slots: AnchorSlot[];
    };
    /** True once enough anchors exist to be a real shape. */
    isComplete(): boolean;
    /**
     * How the tool is placed: `'click'` (click each anchor; a variable-count tool —
     * `max > min` — keeps adding until a finish gesture), `'drag'` (press at the first
     * corner, drag, release at the second — the press-drag-release idiom for boxes/ranges/positions),
     * or `'freehand'` (press, drag to capture a path, release). Drives the state machine.
     */
    placementMode(): 'click' | 'drag' | 'freehand';
    /**
     * Hook run once after interactive placement finishes, before the `create` intent —
     * lets a type finalize its anchors against the live projector (e.g. a position deriving
     * its stop/target/width in pixel space so a bare click drops a default-sized box).
     * Default: no-op.
     */
    onPlaced(_proj: Projector): void;
    /**
     * After a single handle (anchor `index`) is dragged, re-impose any cross-anchor invariant —
     * e.g. a position keeps its stop and target on opposite sides of the entry, flipping the
     * non-dragged side across the entry when a drag would put them on the same side. Default: no-op.
     */
    constrainHandleDrag(_index: number): void;
    /**
     * Apply a whole-body drag — translate the original anchors by (dt, dp) in data space.
     * Default moves every anchor together; a type can pin some (e.g. a callout keeps its
     * pointer tip fixed and moves only the box).
     */
    translateBody(dt: number, dp: number, orig: DrawingPoint[]): DrawingPoint[];
    /** Is the pixel (px,py) on this drawing's body, within `tol` px? */
    abstract hitTest(px: number, py: number, proj: Projector, tol: number): boolean;
    /** Index of the grabbed handle, or -1 for the body. */
    abstract hitHandle(px: number, py: number, proj: Projector, tol: number): number;
    /** Pixel positions of the draggable handles (for painting + hit-test). */
    abstract handlePoints(proj: Projector): Array<[number, number]>;
    /** Tight pixel bounds (selection box), or null when unresolvable. */
    abstract bounds(proj: Projector): {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null;
    /** Visible price span on its pane. Reserved for a future per-drawing autoscale opt-in. */
    abstract priceRange(): {
        min: number;
        max: number;
    } | null;
    /**
     * Time span (epoch ms) the drawing occupies, for visible-range culling. Default
     * is the anchor extent; a full-width drawing (e.g. a horizontal line) overrides
     * to `null` meaning "all time" so it never culls.
     */
    timeExtent(): {
        min: number;
        max: number;
    } | null;
    abstract schema(): SettingsSchema;
    /**
     * Editable per-level config for a rich "gear" settings panel (Fibonacci levels):
     * each entry's `color` / `enabled` / `label` is mutated via a `levels.<i>.<field>`
     * settings path. Simple drawings return null (no gear).
     */
    editableLevels(): Array<{
        ratio: number;
        color: string;
        enabled: boolean;
        label?: string;
    }> | null;
    /** Apply a `{ 'dot.path': value }` patch (the popup emits these). */
    applySettings(patch: Record<string, unknown>): void;
    /** Re-read per-type extras (props) onto this instance — used by the store on an edit. */
    applyProps(props: Record<string, unknown>): void;
    serialize(): SerializedDrawing;
    /** Per-type extras to serialize into `props` (override in subclasses). */
    protected writeProps(): Record<string, unknown> | undefined;
    /** Read per-type extras from a `props` bag (override in subclasses). */
    protected readProps(_props: Record<string, unknown>): void;
}

/**
 * Inert, renderer-neutral toolbar data. The core builds it from the type registry;
 * the renderer paints a vertical bar where each {@link ToolGroup} is one button with
 * a flyout listing its {@link ToolDefinition}s. One tool is armed
 * at a time across all groups.
 */
interface ToolDefinition {
    type: DrawingTypeKey;
    label: string;
    /** Inline SVG markup (no DOM). */
    icon: string;
}
/** A labelled subsection inside a toolbar group's flyout (e.g. "Fibonacci" within Fibonacci & Gann). */
interface ToolSection {
    label: string;
    tools: ToolDefinition[];
}
interface ToolGroup {
    id: string;
    label: string;
    tools: ToolDefinition[];
    /** When set, the flyout renders non-clickable headers between sections. */
    sections?: ToolSection[];
}
interface ToolbarDefinition {
    groups: ToolGroup[];
}
/** A developer-supplied explicit group (just type keys; the registry fills the rest). */
interface ToolbarGroupConfig {
    id: string;
    label: string;
    tools: DrawingTypeKey[];
}
/** Public `options.drawings` shape. `true` = default toolbar; object = customize. */
type DrawingsOption = boolean | {
    toolbar?: boolean;
    tools?: DrawingTypeKey[];
    groups?: ToolbarGroupConfig[];
};
/** The default toolbar — every registered type, grouped into the canonical seven-button layout. */
declare function defaultToolbar(): ToolbarDefinition;
/**
 * Resolve `options.drawings` into a concrete toolbar definition + initial visibility.
 * Default (undefined) ⇒ toolbar VISIBLE; `false` ⇒ subsystem available but toolbar hidden
 * (headless use still works via `chart.drawings.add(...)`); object ⇒ `toolbar ?? true`.
 */
declare function buildToolbar(option: DrawingsOption | undefined): {
    definition: ToolbarDefinition;
    visible: boolean;
};

/**
 * The renderer-local drawing MODES beyond an armed tool: the transient measure ruler,
 * the eraser, or none. Mutually exclusive with each other and with any armed tool —
 * the renderer owns that exclusion; the core mirrors the outcome (see the `mode`
 * intent) so external UIs (a shared workspace toolbar) can reflect and drive it.
 */
type DrawingMode = 'measure' | 'eraser' | null;
/**
 * Renderer→core INTENT. The renderer proposes a change from a user gesture; the
 * core {@link DrawingController} decides, mutates the store (the source of truth),
 * re-syncs, and emits a `drawing:*` event. A single discriminated union (vs one
 * callback per kind) because every arm routes to the same destination.
 */
type DrawingIntent = {
    kind: 'arm';
    type: DrawingTypeKey | null;
}
/** Placement in progress: the ghost's current shape after every anchor click and
 *  cursor move; `null` when placement ends (finalized OR cancelled). No store
 *  mutation — the core only re-emits it (`drawing:draft`) so a multi-chart host
 *  can mirror the ghost live. Optional — a renderer that never emits it simply
 *  syncs at completion. */
 | {
    kind: 'draft';
    doc: SerializedDrawing | null;
} | {
    kind: 'create';
    doc: SerializedDrawing;
} | {
    kind: 'edit';
    doc: SerializedDrawing;
} | {
    kind: 'edit-many';
    docs: SerializedDrawing[];
} | {
    kind: 'select';
    ids: string[];
    additive?: boolean;
} | {
    kind: 'delete';
    ids: string[];
} | {
    kind: 'reorder';
    id: string;
    to: 'front' | 'back';
} | {
    kind: 'settings';
    id: string;
} | {
    kind: 'tool-finished';
    type: DrawingTypeKey;
} | {
    kind: 'favorite';
    type: DrawingTypeKey;
    on: boolean;
} | {
    kind: 'snap-mode';
    mode: SnapMode;
}
/** Stay-in-drawing-mode toggled in-chart — when on, finishing a drawing leaves the
 *  tool armed instead of reverting to the pointer. */
 | {
    kind: 'stay-mode';
    on: boolean;
} | {
    kind: 'mode';
    mode: DrawingMode;
} | {
    kind: 'undo';
} | {
    kind: 'redo';
} | {
    kind: 'duplicate';
    ids: string[];
} | {
    kind: 'copy';
    ids: string[];
} | {
    kind: 'paste';
};
/**
 * The interactive user-drawings surface a renderer optionally implements. Present
 * iff `capabilities.userDrawings`. Commands flow down; one intent channel flows up.
 * Only plain {@link SerializedDrawing}/{@link ToolbarDefinition} data crosses — no
 * backend types, mirroring the rest of {@link IChartRenderer}.
 */
interface IDrawingsRendererPort {
    /** Hand the renderer the inert toolbar definition to RENDER (groups/tools/icons). */
    setToolbar(def: ToolbarDefinition): void;
    /** Show or hide the on-chart drawing toolbar. */
    showToolbar(visible: boolean): void;
    /** Push the authoritative snapshot down; the renderer re-projects + repaints. */
    syncDrawings(docs: readonly SerializedDrawing[]): void;
    /** Arm/disarm a tool (`null` = selection/idle, pan resumes). `lastStyle` is the
     *  tool's last-used style (if any) so the placement preview matches what will be
     *  committed, rather than falling back to the type default. */
    setActiveTool(type: DrawingTypeKey | null, lastStyle?: SerializedDrawing['style']): void;
    /** Reflect which drawings are selected (drives handle painting); `[]` = none. */
    setSelection(ids: readonly string[]): void;
    /** Push the FAVORITE tool set (flyout stars + any favorites-driven UI). Optional —
     *  favorites still work headless without a renderer reflection. */
    setFavorites?(types: readonly DrawingTypeKey[]): void;
    /** Push per-tool shortcut hints — PRE-FORMATTED display strings (e.g. `'Alt+T'`)
     *  shown beside the tools in the toolbar flyouts. The host owns the keymap and the
     *  platform formatting; the renderer only displays. Optional. */
    setToolShortcuts?(map: Readonly<Partial<Record<DrawingTypeKey, string>>>): void;
    /** Set the sticky magnet snap mode (off/weak/strong). Optional — a renderer without
     *  a magnet omits it; the in-chart toolbar reflects the pushed value. */
    setSnapMode?(mode: SnapMode): void;
    /** Set stay-in-drawing-mode (tools remain armed after each placement). Optional —
     *  the in-chart toolbar reflects the pushed value. */
    setStayMode?(on: boolean): void;
    /** Enter/exit a renderer-local mode (measure ruler / eraser; `null` exits). The
     *  renderer keeps owning the mutual exclusion (with armed tools too) and reports
     *  every actual change back through the `mode` intent. Optional. */
    setMode?(mode: DrawingMode): void;
    /** Hand the renderer the core's series gateway so data-driven drawings can read bars
     *  of a finer timeframe (exposed to them as `Projector.seriesInRange`). Optional — a
     *  renderer without it simply never resolves lower-timeframe series. */
    setSeriesGateway?(gateway: DrawingSeriesGateway): void;
    /** Open a drawing's settings popup (selecting it too) — the programmatic twin of a click on it. */
    openSettings(id: string): void;
    /** Display another chart's in-progress placement as a GHOST at reduced opacity
     *  (`null` clears it) — the drawings-sync twin of `setExternalCrosshair`. Never a
     *  store drawing: no selection, no hit-testing, no persistence. Optional — a
     *  renderer without it simply never previews remote placements. */
    setExternalGhost?(doc: SerializedDrawing | null): void;
    /**
     * The pane's SERIES stack in z terms, for renderers whose drawings share one draw-order
     * space with the series (`drawingDepth`): the extremes ("bring to front" beats `front`,
     * "send to back" undercuts `back`) and the candles' own key (`price`, absent on a study
     * pane) — a new drawing starts just under it. Optional — without it drawings order only
     * among themselves, on a layer of their own.
     */
    stackRange?(paneId: string): {
        front: number;
        back: number;
        price?: number;
    };
    /** The one channel up — create/edit/select/delete/settings/tool-finished. */
    onDrawingIntent(cb: (intent: DrawingIntent) => void): Unsubscribe;
}

/** What a rendering backend supports — drives graceful degradation + warnings. */
interface RendererCapabilities {
    panes: boolean;
    /**
     * Full pane management: moving/merging an indicator between panes (with its own
     * scale column), reordering panes, and pane collapse/maximize. A renderer without
     * it keeps one-pane-per-indicator behavior; `chart.panes` mutations warn + no-op.
     */
    paneManagement: boolean;
    fills: 'native' | 'primitive' | 'unsupported';
    bgcolor: 'native' | 'primitive' | 'unsupported';
    hline: 'native' | 'primitive' | 'unsupported';
    markers: boolean;
    barcolor: 'native' | 'approximated' | 'unsupported';
    perPointColor: boolean;
    /** Pine drawing objects (line/box/label/polyline/linefill) via custom primitives. */
    drawings: boolean;
    /** Interactive USER drawing tools (toolbar + hit-test + handles). Distinct from `drawings`. */
    userDrawings: boolean;
    /** Whether user drawings share ONE draw-order space with the pane's series — a drawing's
     *  `zIndex` then places it anywhere in the stack: over everything, under the candles, or
     *  between two indicators. Absent/false: every drawing paints in front, `zIndex` orders
     *  only the drawings among themselves, and a host UI should not offer depth slots. */
    drawingDepth?: boolean;
    /** Pine `table.new` dashboards via a DOM overlay. */
    tables: boolean;
    /** Strategy trade markers (`IndicatorModel.trades`): order-fill arrows + labels + price
     *  ticks on the price pane, plus the `tradeMarkers` display feature. Absent/false ⇒ the
     *  channel is carried through mounts/patches but never painted. */
    trades?: boolean;
    /** Whether the renderer provides the in-chart inputs/settings UI. */
    inputsUI: boolean;
}
/** Opaque handle to a mounted indicator, returned by `mountIndicator()`. */
interface IndicatorRenderHandle {
    readonly id: string;
}
/** An indicator's live status, shown in its legend row. */
type IndicatorStatus = 'idle' | 'loading' | 'live';
/**
 * One host-contributed legend-row action, as the renderer consumes it: pure data plus a
 * thunk. The shell resolves the plugin descriptor (its `when` gate, the context, the
 * indicator info) BEFORE it reaches the renderer, so the renderer stays ignorant of the
 * plugin layer — it just paints an icon button and calls `run` on click.
 */
interface LegendActionView {
    id: string;
    /** Icon id in the core icon registry (`registerIcon`). */
    icon: string;
    tooltip: string;
    run(): void;
}
/** One block of a legend callout's deployed panel — plain text, or an action button. */
type LegendCalloutPanelItem = {
    type: 'text';
    text: string;
} | {
    type: 'button';
    label: string;
    /** Emphasized (selection-colored) button — the panel's main action. */
    primary?: boolean;
    /** Close the panel after `run` (default true). */
    close?: boolean;
    run(): void;
};
/** The panel a clickable legend callout deploys: an optional heading over ordered blocks. */
interface LegendCalloutPanel {
    title?: string;
    items: LegendCalloutPanelItem[];
}
/**
 * One host-contributed legend CALLOUT, as the renderer consumes it: a small tinted
 * bubble with a centered icon, visible beside the indicator's legend title while
 * the row is idle (hidden while its hover/selection controls are out). When
 * `content` is present the bubble is clickable and deploys that panel — below the
 * bubble, flipping above when the bottom screen edge is too close. Pure data plus
 * thunks, same rule as {@link LegendActionView}: the shell resolves the plugin
 * descriptor before it reaches the renderer.
 */
interface LegendCalloutView {
    id: string;
    /** Icon id in the core icon registry (`registerIcon`). */
    icon: string;
    /** Bubble fill — any CSS color. */
    background: string;
    /** Icon ink (default: the legend row's text color). */
    color?: string;
    tooltip: string;
    /** Deployed panel — presence makes the bubble clickable. */
    content?: LegendCalloutPanel;
}
/** OHLCV of the price bar under the crosshair (the "data window" source). */
interface CrosshairOHLC {
    time: Millis;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}
interface CrosshairEvent {
    time: Millis | null;
    /** Value at the cursor on ITS pane's scale — a price on the price pane, an
     *  indicator value on a study pane (which one: see {@link paneKind}). */
    price: number | null;
    /** The kind of pane the cursor (and thus `price`) is on — how a consumer tells a
     *  real price from a study-pane value (e.g. crosshair sync only mirrors the
     *  horizontal level from the price pane). Optional and additive: a renderer that
     *  doesn't track panes omits it. */
    paneKind?: 'price' | 'study' | null;
    /** Value at the crosshair per series, keyed by stable series id. */
    values: ReadonlyMap<string, number>;
    /** The hovered price bar's OHLCV (null when the cursor is off any bar). */
    ohlc: CrosshairOHLC | null;
}
interface ClickEvent {
    time: Millis | null;
    price: number | null;
}
/** A touch long-press on an axis strip — the mobile substitute for a right-click menu. */
interface AxisLongPressEvent {
    axis: 'price' | 'time';
    /** Plot-local pixel of the press (y maps a multi-pane price scale to its pane). */
    x: number;
    y: number;
}
/** One indicator plot's readout line in the data window. */
interface DataWindowRow {
    label: string;
    value: string;
    color: string;
}
/** The OHLCV block of a data-window readout, formatted on the price pane's scale. */
interface DataWindowOHLC {
    o: string;
    h: string;
    l: string;
    c: string;
    vol?: string;
    /** Close ≥ open → tint the values with the up color, else the down color. */
    up: boolean;
}
/** One indicator's readout: its title plus a row per plot. */
interface DataWindowGroup {
    name: string;
    rows: DataWindowRow[];
}
/**
 * A data-window snapshot — the bar's timestamp split into date + time, its OHLCV, and one
 * group per indicator. Every value arrives pre-formatted on the scale of the pane it belongs
 * to, so a host panel lays the readout out without doing any numeric formatting itself.
 */
interface DataWindowReadout {
    /** Bar date, pre-formatted (e.g. `2026-07-03`); empty when there is no bar. */
    date: string;
    /** Bar time of day, pre-formatted `HH:MM`; empty when there is no bar. */
    time: string;
    ohlc: DataWindowOHLC | null;
    groups: DataWindowGroup[];
}
/** Raised by the renderer when the user edits an input in the settings dialog. */
interface InputChangeEvent {
    indicatorId: string;
    key: string;
    value: InputValue;
    /** What was edited: a script input (default) or a declaration prop (the "Properties" tab). */
    kind?: 'input' | 'prop';
}
interface VisibleRange {
    from: Millis;
    to: Millis;
}
/** A user-initiated pane action reported by the renderer (hover buttons / double-clicks). */
type PaneAction = {
    type: 'move';
    paneId: string;
    dir: 'up' | 'down';
} | {
    type: 'remove';
    paneId: string;
} | {
    type: 'collapse';
    paneId: string;
    collapsed: boolean;
} | {
    type: 'maximize';
    paneId: string;
    maximized: boolean;
};
/**
 * The rendering backend abstraction. No backend (e.g. lightweight-charts) types
 * cross this boundary — that is what makes the renderer swappable. The only MVP
 * implementation is `src/renderers/lightweight-charts/LwcRenderer.ts`.
 */
interface IChartRenderer {
    readonly capabilities: RendererCapabilities;
    /** Stable identity of this renderer (e.g. `'native'`, `'lwc'`) — the warn label and `chart.renderer.name`. */
    readonly name: string;
    /** Feature keys this renderer can get/set at runtime via `chart.renderer.set` / `.get`. */
    readonly features: readonly string[];
    /** Apply a supported feature live (the caller has already checked `features`); repaints as needed. */
    applyFeature(key: string, value: unknown): void;
    /** Read a feature's current value (`undefined` if unsupported). */
    readFeature(key: string): unknown;
    mount(container: HTMLElement, theme: VelaTheme): void;
    setTheme(theme: VelaTheme): void;
    resize(): void;
    destroy(): void;
    /**
     * Replace all price bars. By default re-frames the view (a fresh series). Pass
     * `{ preserveView: true }` to keep the current viewport — used when extending the
     * same series in place (e.g. swapping a quick preview for the full history) so
     * candles don't jump.
     */
    setBars(bars: OHLCV[], opts?: {
        preserveView?: boolean;
    }): void;
    /** Append a new bar or replace the forming (last) bar, decided by time. */
    updateBar(bar: OHLCV): void;
    /**
     * Set the active symbol's tick size (e.g. `0.01`) so the price axis renders the
     * instrument's true precision. Passed as soon as symbol metadata resolves; `undefined`
     * (or absent) ⇒ the renderer falls back to its zoom-derived decimals. Optional.
     */
    setPricePrecision?(mintick: number | undefined): void;
    /**
     * Push a bespoke NATIVE-LAYER render payload, keyed by layer `type`. Visuals that aren't
     * ordinary series/fills draw through a dedicated renderer layer instead of the model; this is
     * the channel. Producers are native indicators (`'volume'`, `'vpvr'` — layer config) and core
     * data engines behind a price style (a plugin chart type pushing per-bar secondary data
     * through its own channel). Optional: a renderer without the
     * layers omits it.
     */
    setNativeData?(type: string, data: unknown): void;
    /**
     * Reflect an indicator's live status in its legend row: `'loading'` (a fetch is in flight —
     * spinner), `'live'` (live-updating — a distinct pulse), or `'idle'` (nothing). Optional.
     */
    setIndicatorStatus?(handle: IndicatorRenderHandle, status: IndicatorStatus): void;
    /**
     * A market load is in flight with NO bars painted yet — the first load, or a
     * symbol/timeframe switch (the host clears the old series first). Renderers may show a
     * subtle loading affordance, and must hide any content that does NOT ride the bar series
     * (corner-anchored tables); bar-mapped content vanishes with the cleared series on its
     * own. The host turns the flag off with the first series it hands over (or when a load
     * fails or parks) — the core also mirrors this state to plugins as `load:start`/`load:end`.
     * Optional.
     */
    setLoading?(loading: boolean): void;
    ensurePane(pane: Pane): void;
    removePane(id: string): void;
    /**
     * Move a mounted indicator to another pane (merge/unmerge). `ownScale` gives the
     * indicator its own scale column within the target pane, rescaled so its visible
     * extent lines up with the pane's; omitted/false shares the pane scale. Present iff
     * `capabilities.paneManagement`.
     */
    setIndicatorPane?(handle: IndicatorRenderHandle, paneId: string, opts?: {
        ownScale?: boolean;
    }): void;
    /** Set the top-to-bottom pane display order (an array of pane ids). */
    orderPanes?(orderedIds: string[]): void;
    /** Collapse a pane to a thin strip (legend + expand button) or restore it. */
    setPaneCollapsed?(paneId: string, collapsed: boolean): void;
    /** Maximize one pane to fill the plot, or restore the previous split (`null`). */
    setPaneMaximized?(paneId: string | null): void;
    /**
     * The renderer reports a user-initiated pane action (from a pane hover button or a
     * double-click). The host/core reflects it: `'remove'` tears down the pane's
     * indicators; the rest are already applied by the renderer and just keep core's
     * `chart.panes` view in sync. Present iff `capabilities.paneManagement`.
     */
    onPaneAction?(cb: (action: PaneAction) => void): Unsubscribe;
    /**
     * The renderer reports a user request to move/merge an indicator to another pane, made
     * from its own in-chart UI (the legend "Move to" menu or a legend-row drag). Core routes
     * it through `moveIndicator`. Present iff `capabilities.paneManagement`.
     */
    onMoveIndicator?(cb: (id: string, target: MoveTarget) => void): Unsubscribe;
    /** Mount an indicator's series + its in-chart legend/settings UI. */
    mountIndicator(model: IndicatorModel): IndicatorRenderHandle;
    updateIndicator(handle: IndicatorRenderHandle, patch: ScenePatch): void;
    removeIndicator(handle: IndicatorRenderHandle): void;
    /** Reflect a programmatic input change in the renderer's settings UI. `props`
     *  (when given) refreshes the declaration-prop values the same way. */
    setIndicatorInputs(handle: IndicatorRenderHandle, values: Record<string, InputValue>, props?: Record<string, InputValue>): void;
    /**
     * Supply a symbol picker so the settings dialog's `input.symbol` control opens the host's own
     * ticker-selection UI (the host wires this). Optional — without it, `input.symbol` is a plain
     * text field. Pass `null` to detach.
     */
    setSymbolPicker?(picker: SymbolPickerFn | null): void;
    /**
     * Supply the HOST-CONTRIBUTED actions of each legend row (the shells wire the plugin
     * registry through this — see `registerLegendAction`). The provider is called per row,
     * lazily, so `when()` gates and late registrations resolve at render time; calling this
     * again replaces the provider AND re-projects the rows already on screen. Optional — a
     * renderer without it simply never shows contributed legend actions.
     */
    setLegendActions?(provider: ((indicatorId: string) => LegendActionView[]) | null): void;
    /**
     * Supply the HOST-CONTRIBUTED callout bubbles of each legend row (the shells wire
     * the plugin registry through this — see `registerLegendCallout`). Same contract as
     * {@link setLegendActions}: the provider is called per row, lazily; calling this
     * again replaces the provider AND re-projects the rows already on screen. Optional —
     * a renderer without it simply never shows contributed callouts.
     */
    setLegendCallouts?(provider: ((indicatorId: string) => LegendCalloutView[]) | null): void;
    /**
     * Replace the indicator legend's fold toggle with a HOST action (or restore it with
     * null): the chip stays — a list glyph plus the indicator count — but pressing it
     * runs the action instead of unfolding the rows, which stay hidden while the
     * override is in force. Multi-chart shells route it to their indicator overview
     * (e.g. an object-tree panel), where per-indicator controls live instead. Optional —
     * a renderer without a foldable legend omits it.
     */
    setLegendOverviewAction?(action: (() => void) | null): void;
    /**
     * Open the settings dialog of one mounted indicator — the programmatic twin of the
     * legend row's gear button, for host chrome that reaches indicators outside the
     * legend (an object tree's action menu). Silent no-op for an unknown id. Optional —
     * a renderer without per-indicator settings UI omits it.
     */
    openIndicatorSettings?(indicatorId: string): void;
    /**
     * Hide (`false`) or show (`true`) a mounted indicator's visuals while keeping its legend row
     * (marked hidden). Optional — a renderer that can't suppress an indicator omits it (and the
     * core's hide still works for resource suspension; only the in-chart legend eye is unavailable).
     * On show the core re-mounts the indicator, so this need only drop the visuals + flag the row.
     */
    setIndicatorVisible?(handle: IndicatorRenderHandle, visible: boolean): void;
    /**
     * The renderer tells core when the base price style changes — from ANY source (the
     * `priceStyle` feature, the in-chart settings dialog, an applied config template).
     * Display state stays renderer-owned; the core listens because some styles carry a
     * DATA requirement (a plugin style may need its data engine running). Optional —
     * a renderer without runtime style switching omits it.
     */
    onPriceStyleChange?(cb: (style: PriceStyle) => void): Unsubscribe;
    /** The renderer tells core when the user edits an input in-chart. */
    onInputChange(cb: (e: InputChangeEvent) => void): Unsubscribe;
    /** The renderer tells core when the user removes an indicator in-chart (the legend ✕). */
    onRemoveIndicator(cb: (id: string) => void): Unsubscribe;
    /** The renderer tells core when the user toggles an indicator's visibility in-chart (the legend eye). */
    onToggleIndicatorVisible?(cb: (id: string, visible: boolean) => void): Unsubscribe;
    onCrosshairMove(cb: (e: CrosshairEvent) => void): Unsubscribe;
    onClick(cb: (e: ClickEvent) => void): Unsubscribe;
    /** Touch long-press on a price or time axis strip. Optional — a renderer without
     *  touch axis gestures omits it; host chrome (timezone / price-scale sheets) keys off it. */
    onAxisLongPress?(cb: (e: AxisLongPressEvent) => void): Unsubscribe;
    /**
     * Display an EXTERNAL crosshair at a data-space position — a ghost marker driven by
     * another chart (multi-chart crosshair sync), not by this chart's own pointer.
     * `time` is epoch-ms (`null` clears); `price` optionally adds the horizontal line
     * when the caller knows the scales are comparable (same-symbol groups). The ghost
     * must NEVER re-emit `onCrosshairMove` — that one-way rule is what makes the sync
     * loop-free. OPTIONAL — detect by presence (`RendererControl.supportsExternalCrosshair`);
     * a renderer without the seam simply never shows foreign crosshairs.
     */
    setExternalCrosshair?(time: Millis | null, price?: number | null): void;
    /**
     * A pre-formatted readout of the bar under the crosshair — or of the latest bar when the
     * cursor is off the plot, so the snapshot is always useful. Pull it on crosshair movement
     * to drive a host data-window panel. Optional: a renderer that tracks no hovered bar omits
     * it (`RendererControl.dataWindowReadout()` then returns null).
     */
    getDataWindowReadout?(): DataWindowReadout;
    getVisibleRange(): VisibleRange | null;
    setVisibleRange(range: VisibleRange): void;
    /**
     * Pan by a fraction of the visible width at constant zoom (positive ⇒ toward the
     * latest bars), behaving exactly like a pointer drag: same pan limits (including the
     * bounded whitespace past the newest bar), eased if the renderer animates pans.
     * OPTIONAL — without it the core falls back to an instant `setVisibleRange` shift.
     */
    panBy?(fraction: number): void;
    onViewportChange(cb: (range: VisibleRange) => void): Unsubscribe;
    /**
     * Export the current chart as a PNG data URL (optional — a renderer that can't
     * rasterize its surface omits it). DOM overlays may not be included.
     */
    screenshot?(): string | null;
    /**
     * Raster of the current chart onto a canvas (optional). Same pixels as
     * {@link screenshot}, for hosts that composite several charts into one image.
     */
    screenshotCanvas?(): HTMLCanvasElement | null;
    /**
     * Snapshot the renderer's full cosmetic configuration as a serializable,
     * versioned document — for persistence (templates, saved user settings).
     * Optional: a renderer without a rich config omits it. The returned value is
     * plain JSON; its concrete shape is renderer-defined.
     */
    getConfig?(): unknown;
    /**
     * Apply a (possibly partial) config document produced by `getConfig()`.
     * Implementations validate untrusted input and ignore unknown/malformed fields,
     * repainting with no indicator re-run.
     */
    applyConfig?(config: unknown): void;
    /**
     * The renderer's cosmetic config changed via {@link applyConfig} — the in-chart
     * settings dialog commits through it, so this is how host chrome mirroring a config
     * value (a bottom-bar timezone, a persisted template) learns about in-chart edits.
     * Re-pull {@link getConfig} / `readFeature` for the new values. Optional — paired
     * with `applyConfig`.
     */
    onConfigChanged?(cb: () => void): Unsubscribe;
    /**
     * The renderer reports a user request to switch the APP THEME, made from its own
     * in-chart UI (the settings dialog's Canvas → Theme row). The core owns the
     * canonical theme: it resolves the name, calls {@link setTheme}, and emits
     * `theme:changed` so host chrome follows. Optional — a renderer without an
     * in-chart theme control omits it.
     */
    onThemeSelect?(cb: (theme: ThemeName) => void): Unsubscribe;
    /**
     * Move keyboard focus onto the chart's interactive surface (the element its keyboard
     * shortcuts key off). Optional — a host UI calls it after its own controls steal focus
     * (e.g. a shared workspace toolbar click) so chart/drawing keys keep working.
     */
    focus?(): void;
    /**
     * Close any in-chart dialogs the renderer owns (the indicator settings dialog, the
     * chart-settings gear dialog). Optional — used by a host to keep its own dialogs mutually
     * exclusive with the renderer's. A no-op when nothing is open.
     */
    closeDialogs?(): void;
    /**
     * Open (or toggle) the renderer's own settings dialog, when it has one. `section` names
     * the tab to land on (matched against the dialog's section titles, unknown ones ignored);
     * with a section an already-open dialog switches tab rather than closing.
     */
    openSettingsDialog?(section?: string): void;
    /** A chart type's SDK settings changed (dialog edit / applyConfig) — the core forwards
     *  them to the type's data engine. */
    onChartTypeSettingsChange?(cb: (typeId: string, values: Record<string, unknown>) => void): Unsubscribe;
    /** Host-app settings tabs (callback rows) shown by the renderer's settings dialog.
     *  `id` names a section for the visibility policy (defaults to the title's slug). */
    setSettingsSections?(sections: ReadonlyArray<{
        title: string;
        rows: readonly unknown[];
        id?: string;
    }>): void;
    /** Settings-dialog visibility policy: `hidden` lists setting ids to hide (a tab, a
     *  group, or a row — subtree semantics). Presentation-only: hidden values keep
     *  being stored and applied. Optional — a renderer without a settings dialog omits it. */
    setSettingsVisibility?(policy: {
        hidden?: readonly string[];
    }): void;
    /** Every addressable setting id of this chart (built-ins, chart-type sections,
     *  host sections) — the discovery surface for the visibility policy. */
    listSettingsIds?(): string[];
    /**
     * The host shell's chrome size class. `'mobile'` asks the renderer's own chrome
     * (dialogs, toolbars, buttons) for its touch-first presentation — fullscreen
     * dialogs, no hover-gated affordances; `'desktop'` (the default) keeps the
     * pointer-first one. Optional — a renderer without adaptive chrome omits it.
     */
    setLayoutMode?(mode: 'mobile' | 'desktop'): void;
    /**
     * Interactive user-drawings surface. Present iff `capabilities.userDrawings`.
     * The core `DrawingController` drives it (commands down) and listens for
     * intents (up); a renderer without drawing tools simply omits it.
     */
    readonly userDrawingsPort?: IDrawingsRendererPort;
}

/** A named visible-range shortcut, resolved against the loaded bars. */
type VisibleRangePreset = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'YTD' | 'ALL';

/** A registered data-provider name (any string; matched case-insensitively). */
type ProviderName = string;
/**
 * Which trading session the chart shows, on markets that have one: `regular` = RTH
 * (09:30–16:00 for US equities), `extended` = ETH (pre/post-market included). The
 * provider owns the actual filtering — the flag rides every data request. Meaningless
 * (and ignored end-to-end) on continuous markets like crypto.
 */
type MarketSession = 'regular' | 'extended';
/** How the chart obtains its candles. */
interface MarketConfig {
    /** The market's symbol. A bare ticker (`'BTCUSDT'`) resolves against the registered
     *  providers in DECLARATION order (first one whose index lists it); an
     *  `EXCHANGE:` prefix (`'coinbase:BTC-USD'`, case-insensitive) pins the venue. */
    symbol?: string;
    timeframe?: string;
    bars?: number;
    /** Trading session to show ({@link MarketSession}). Absent = the provider's default
     *  (`regular` on session markets); continuous markets ignore it entirely. */
    session?: MarketSession;
    /**
     * The window to frame on the FIRST paint — a preset name (`'1D'`, `'YTD'`, …) or an
     * explicit `{from, to}`. Set it when the initial view is known up front (a range
     * chip, a shared link): the chart then loads the depth in ONE pass and paints the
     * requested window straight away, instead of flashing its fast recent-bars preview
     * and re-framing a moment later.
     */
    visibleRange?: VisibleRangePreset | VisibleRange;
    /** Offline bars instead of a provider; when set, no network fetch happens. */
    data?: OHLCV[];
}
/**
 * One in-place market switch — the argument of `chart.setMarket(next)`. Only the fields
 * given change; the rest of the market keeps its current value. `data` switches to
 * offline bars (and giving `symbol`/`provider` WITHOUT `data` drops a previous offline
 * dataset — back to the provider path). `visibleRange` frames the FIRST paint of the
 * new market (a range chip switching timeframe + depth + window in one call).
 */
interface MarketSwitch {
    /** Bare ticker (provider resolved by declaration order) or `EXCHANGE:`-prefixed. */
    symbol?: string;
    timeframe?: string;
    bars?: number;
    /** Switch the shown trading session (reloads like a timeframe change). */
    session?: MarketSession;
    data?: OHLCV[];
    visibleRange?: VisibleRangePreset | VisibleRange;
}
/**
 * The chart's current market identity — `chart.market`, the read counterpart of
 * `setMarket`. A SNAPSHOT of the requested market (mutating it changes nothing): it
 * reflects a switch as soon as `setMarket` is called, not when the load lands — the
 * "what is this chart showing/loading right now" answer. `offline` is true when the
 * chart runs on an inline `data` array instead of a provider.
 */
interface MarketSnapshot {
    symbol?: string;
    /** The venue the symbol PINS (its `EXCHANGE:` prefix, lower-cased) — undefined for a
     *  bare symbol. The venue that actually served it: `chart.data.resolve(symbol)`. */
    provider?: ProviderName;
    timeframe?: string;
    bars?: number;
    /** The shown trading session — undefined = the provider's default (regular). */
    session?: MarketSession;
    offline: boolean;
}
interface VelaTheme {
    background: string;
    textColor: string;
    gridColor: string;
    borderColor: string;
    upColor: string;
    downColor: string;
    fontFamily: string;
}
type ThemeName = 'dark' | 'light';
/** A renderer **class** — Vela instantiates it with the resolved display options.
 *  Built-in default: `NativeRenderer`.
 *  from `'vela/renderers/lwc'` and pass it as `options.renderer`. */
type RendererConstructor = new (opts?: RendererDisplayOptions) => IChartRenderer;
interface VelaOptions extends MarketConfig {
    /** false = static history; true = history + live forming candle. */
    live?: boolean;
    theme?: ThemeName | VelaTheme;
    height?: number | string;
    /** Rendering backend as a renderer **class** that Vela instantiates (with the
     *  resolved display options). Omit for the built-in native renderer (default); for
     **/
    renderer?: RendererConstructor;
    /** Scripting language used when `addIndicator` doesn't specify one. Default `'pine'`
     *  (or the first injected engine's language). */
    defaultLanguage?: string;
    /** Show the dashed line + axis label at the latest price (default true). */
    currentPriceLine?: boolean;
    /** Use a logarithmic price scale on the price pane (default false). */
    logScale?: boolean;
    /** Native geometry backend: `'auto'` (WebGL2 if available, else canvas2d),
     *  or force `'canvas2d'` / `'webgl2'`. Native renderer only. */
    nativeBackend?: NativeBackend;
    /** Native-renderer animations. `true`/`false` toggles all; an object configures
     *  each independently. Default: eased **zoom on**, inertial **pan on but snappy**
     *  (short glide), live-bar glide **off**. Set `{ pan: false }` for an instant pan
     *  with no momentum, `{ liveBar: true }` (or a duration in ms) to make the forming
     *  candle slide toward each live tick instead of snapping. */
    animations?: boolean | AnimationConfig;
    /** Neon glow/bloom intensity for line series (0 = off, ~0.6 = strong). WebGL2 only
     *  — the canvas2d backend ignores it. Default 0. */
    glow?: number;
    /** Bullish candle body/wick color (native renderer). Defaults to the palette's bullish green. */
    upColor?: string;
    /** Bearish candle body/wick color (native renderer). Defaults to the palette's bearish red. */
    downColor?: string;
    /** How the base price series is drawn (native renderer): candlestick / OHLC bars /
     *  line / area / baseline. Default `'candles'`. */
    priceStyle?: PriceStyle;
    /** Interactive user drawings (native renderer). Default: toolbar VISIBLE with the
     *  default tool set. `false` hides the toolbar (the `chart.drawings` API still works
     *  headlessly); an object picks tools (`{ tools: [...] }`) or defines groups
     *  (`{ groups: [...] }`) and toggles the toolbar (`{ toolbar: false }`). */
    drawings?: DrawingsOption;
    /** The built-in volume indicator: per-bar volume columns anchored to the bottom of the
     *  price pane, on their own scale (they never affect the price autoscale). Added
     *  automatically on chart creation (native renderer) — pass `false` to opt out. */
    volume?: boolean;
    /** Settings-dialog visibility policy. Default: everything visible. `hidden` lists
     *  setting ids to hide — a tab (`'canvas'`), a group (`'canvas.grid'`), or a single
     *  row (`'canvas.grid.vertical'`); an id hides its whole subtree, and a tab with
     *  nothing left disappears from the rail. Hiding is presentation-only: hidden
     *  values keep being stored and applied. Enumerate the addressable ids of a live
     *  chart with `chart.renderer.listSettingsIds()`; the catalog is documented in
     *  docs/user/options.md. */
    settings?: SettingsVisibilityPolicy;
}
/** Settings-dialog visibility policy (see `VelaOptions.settings`). */
interface SettingsVisibilityPolicy {
    /** Setting ids to hide — a tab, a group, or a row; an id hides its subtree. */
    hidden?: readonly string[];
}
/** Per-feature native-renderer animation toggles. */
interface AnimationConfig {
    /** Eased cursor-anchored wheel-zoom (+ gliding autoscale while zooming). Default true. */
    zoom?: boolean;
    /** Inertial/kinetic pan — a short snappy glide after a drag-release. Default true. */
    pan?: boolean;
    /** Glide of the forming bar: on a live tick the displayed high/low/close ease toward
     *  the new values instead of snapping (the price line and axis label follow). `true`
     *  uses the default duration ({@link LIVE_BAR_EASE_DEFAULT_MS}); a number is the ease
     *  time-constant in ms (visually settled after ~3×; clamped to
     *  {@link LIVE_BAR_EASE_MAX_MS}); `false`/`0` snaps. A new bar always snaps. Default
     *  `false` — the painted candle is then never behind the real data. */
    liveBar?: boolean | number;
}
/** Native geometry-layer backend selection. */
type NativeBackend = 'auto' | 'canvas2d' | 'webgl2';
/** How the base price series is drawn on the price pane (native renderer).
 *  A plugin chart type (registered via `vela/plugin`) adds its own id to this union
 *  volume-at-price (plus a right-edge visible-range profile); it needs the
 *  provider+symbol to expose trade data — without it, plain candles render.
 *  `'heikinashi'` draws Heikin Ashi candles: a 1:1 display transform of the raw
 *  bars applied at the core's bar seam, so indicators compute on the same
 *  smoothed values the chart shows (raw data stays untouched underneath). */
/** Built-in styles plus any id registered through the chart-type SDK (`registerChartType`). */
type PriceStyle = 'candles' | 'bars' | 'line' | 'area' | 'baseline' | 'heikinashi' | (string & {});
/** Display options passed to a renderer at construction. */
interface RendererDisplayOptions {
    currentPriceLine: boolean;
    logScale: boolean;
    nativeBackend: NativeBackend;
    animZoom: boolean;
    animPan: boolean;
    animLiveBar: number;
    glow: number;
    upColor: string;
    downColor: string;
    priceStyle: PriceStyle;
}
/**
 * Where to move an indicator (via `handle.moveTo(...)`):
 * - `'price'` — merge into the main price pane (on its own scale unless it's a
 *   price-unit overlay).
 * - `{ pane: id }` — merge into an existing pane (identified by `Pane.id`).
 * - `{ newPane: {...} }` — create a fresh pane, optionally placed relative to an
 *   existing one (`before`/`after` its pane id); default is a new pane at the bottom.
 */
type MoveTarget = 'price' | {
    pane: string;
} | {
    newPane: {
        before?: string;
        after?: string;
    } | true;
};
/** A pane and the indicators it holds — a `chart.panes.list()` entry. */
interface PaneInfo {
    id: string;
    kind: 'price' | 'study';
    /** Display order, top-to-bottom (0 = topmost, the price pane). */
    order: number;
    collapsed: boolean;
    maximized: boolean;
    indicators: Array<{
        id: string;
        title: string;
        ownScale: boolean;
    }>;
}
/** Options for `chart.addIndicator(source, options?)`. */
interface AddIndicatorOptions {
    /** Which registered engine runs this script (by language id). Default: the chart's `defaultLanguage`. */
    language?: string;
    /** Input overrides, keyed by input title or varId. */
    inputs?: Record<string, InputValue>;
    /** Declaration-property overrides (a strategy's `initial_capital`, an indicator's
     *  `precision`, …), keyed like the engine's props schema. Ignored by engines
     *  without props support. */
    props?: Record<string, InputValue>;
    /** Force overlay-vs-pane placement (default: read from `indicator(overlay=…)`). */
    overlay?: boolean;
    /** Explicit pane placement. */
    pane?: 'price' | 'new';
    /** Display title override. */
    title?: string;
}

export { type DrawingExtend as $, type AxisLongPressEvent as A, type Background as B, type CrosshairEvent as C, Drawing as D, type BoxFontFamily as E, type BoxHAlign as F, type BoxTextSize as G, type BoxVAlign as H, type InputValue as I, type CandleBarColor as J, type CandleSeries as K, type LineStyle as L, type MarketConfig as M, type NativeBackend as N, type OHLCV as O, type PriceStyle as P, type CandleStyle as Q, type RendererCapabilities as R, type SerializedDrawing as S, type ThemeName as T, type Unsubscribe as U, type VisibleRangePreset as V, type DataWindowGroup as W, type DataWindowOHLC as X, type DataWindowRow as Y, type DirtyRange as Z, type DrawingBox as _, type VisibleRange as a, type DrawingIntent as a0, type DrawingLabel as a1, type DrawingLine as a2, type DrawingLinefill as a3, type DrawingMode as a4, type DrawingPoint as a5, type DrawingPolyline as a6, type DrawingSeriesBar as a7, type DrawingSeriesGateway as a8, type DrawingSeriesState as a9, type PriceLine as aA, type Projector as aB, type ProviderName as aC, type RendererConstructor as aD, type Scene as aE, type SchemaPatch as aF, type SeriesKind as aG, type SeriesPoint as aH, type SeriesSpec as aI, type SeriesValueDelta as aJ, type SettingsField as aK, type SettingsSchema as aL, type SettingsVisibilityPolicy as aM, type TableCell as aN, type TableMerge as aO, type TablePosition as aP, type ToolbarGroupConfig as aQ, type TradeExecution as aR, type ValuePatch as aS, buildToolbar as aT, defaultToolbar as aU, inputDeltas as aV, inputVisible as aW, type PaneInfo as aX, type DrawingStyle as aa, type DrawingTable as ab, type DrawingText as ac, type DrawingXLoc as ad, type DrawingsOption as ae, type Fill as af, type FillGradientStop as ag, type IndicatorMeta as ah, type InputCondition as ai, type InputSchema as aj, type InputType as ak, type InputWhen as al, type LabelStyle as am, type LabelYLoc as an, type LineLikeKind as ao, type LineLikeSeries as ap, type LineLikeStyle as aq, type MarkerPoint as ar, type MarkerSeries as as, type MarketSnapshot as at, type MarketSwitch as au, type PaneAxis as av, type PaneAxisBand as aw, type PaneHint as ax, type PaneKind as ay, type PolylinePoint as az, type VelaOptions as b, type VelaTheme as c, type MarketSession as d, type IChartRenderer as e, type RendererDisplayOptions as f, type IndicatorRenderHandle as g, type IndicatorStatus as h, type Pane as i, type PaneAction as j, type MoveTarget as k, type IndicatorModel as l, type ScenePatch as m, type SymbolPickerFn as n, type LegendActionView as o, type LegendCalloutView as p, type InputChangeEvent as q, type ClickEvent as r, type DataWindowReadout as s, type IDrawingsRendererPort as t, type Millis as u, type SnapMode as v, type DrawingTypeKey as w, type ToolbarDefinition as x, type AddIndicatorOptions as y, type AnimationConfig as z };
