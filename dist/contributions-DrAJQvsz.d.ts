import { u as Millis, aj as InputSchema, ah as IndicatorMeta, P as PriceStyle, O as OHLCV, I as InputValue, l as IndicatorModel, k as MoveTarget, av as PaneAxis, aI as SeriesSpec, af as Fill, B as Background, aA as PriceLine, a2 as DrawingLine, _ as DrawingBox, a1 as DrawingLabel, a6 as DrawingPolyline, a3 as DrawingLinefill, ab as DrawingTable, h as IndicatorStatus, a as VisibleRange, c as VelaTheme, S as SerializedDrawing, w as DrawingTypeKey, v as SnapMode, a4 as DrawingMode, e as IChartRenderer, R as RendererCapabilities, o as LegendActionView, p as LegendCalloutView, U as Unsubscribe, C as CrosshairEvent, A as AxisLongPressEvent, s as DataWindowReadout, n as SymbolPickerFn, aX as PaneInfo, ae as DrawingsOption, a8 as DrawingSeriesGateway, D as Drawing, b as VelaOptions, y as AddIndicatorOptions, au as MarketSwitch, at as MarketSnapshot, V as VisibleRangePreset, T as ThemeName } from './options-D5RC7FBd.js';
import { S as SymbolInfo, B as BarRange, M as MarketDataFeed, D as DataProvider, P as ProviderInfo, a as SymbolDescriptor, b as ProviderCapabilities } from './DataProvider-CY0IqCGk.js';

/**
 * A strategy's broker state at ONE bar — the flat summary a host reads while a script
 * runs. Distinct from {@link TradeExecution}, which is a single order FILL the renderer
 * paints: this is the account, not the drawing.
 *
 * Neutral by design: an engine translates its own vocabulary into these names, so host
 * code reads the same fields whatever language the strategy was written in.
 */
interface StrategyState {
    /** Signed contracts held (positive = long, negative = short, 0 = flat). */
    position: number;
    /** Average entry price of the open position (0 when flat). */
    avgPrice: number;
    /** Account value: capital + realized + unrealized. */
    equity: number;
    /** Unrealized P&L of the open position. */
    openPnl: number;
    /** Realized P&L, gross profit minus gross loss. */
    netPnl: number;
    grossProfit: number;
    grossLoss: number;
    /** Closed-trade outcome counts. */
    wins: number;
    losses: number;
    even: number;
    /** Largest peak-to-trough equity drop / trough-to-peak rise, in account currency. */
    maxDrawdown: number;
    maxRunup: number;
    initialCapital: number;
}
/**
 * One ROUND TRIP of a strategy: an entry, and the exit that closed it when there is one.
 * Coarser than {@link TradeExecution} (a fill) on purpose — this is what a host tabulates,
 * exports, or reconciles against a broker.
 */
interface StrategyTrade {
    /** Stable within a run; shared with the fills' `tradeId`. */
    id: string;
    side: 'long' | 'short';
    /** Contracts (magnitude — `side` carries the direction). */
    qty: number;
    entry: StrategyFill;
    /** Absent while the trade is still open. */
    exit?: StrategyFill;
    /** Still open at the last computed bar. */
    open: boolean;
}
/** One side of a {@link StrategyTrade}. */
interface StrategyFill {
    /** The order id the script used (Pine's `strategy.entry("Long", …)`). */
    id: string;
    time: Millis;
    price: number;
    comment?: string;
}

/**
 * A cache-backed data gateway the engine uses to fetch ANY `(symbol, timeframe)`
 * series it needs — the main series stays in-memory, but secondary series
 * (Pine `request.security` HTF/LTF/cross-symbol) are fetched + cached through
 * this so they get real, correctly-resolved data (no aggregation; timeframes
 * kept separate). Provided by the orchestrator, backed by `MarketDataFeed`.
 */
type FetchSeries = (symbol: string, timeframe: string, range: BarRange) => Promise<OHLCV[]>;
/** The chart's visible bar-time window (epoch ms of the left/right edges). */
interface VisibleBarRange {
    left: number;
    right: number;
}
interface EngineAlert {
    id: string;
    message: string;
    title?: string;
    time: number;
    barIndex: number;
    freq?: string;
}
interface EngineWarning {
    message: string;
    method?: string;
    bar: number;
}
/**
 * A source script that has been parsed (inputs + declaration metadata extracted)
 * and is ready to execute. `token` is engine-internal and opaque to core — the
 * engine reads it back in `execute()`.
 */
interface PreparedScript {
    /** The language that produced this (the engine's `language`). */
    language: string;
    inputs: InputSchema[];
    /**
     * Declaration-property schema (a strategy's `initial_capital`, an indicator's
     * `precision`, …) — the settings dialog renders these on a "Properties" tab.
     * `defval` is the EFFECTIVE default: the value the script declares, else the
     * engine's configured default, else the language's own. Absent ≡ the language
     * has no declaration properties (`capabilities.props` false).
     */
    props?: InputSchema[];
    meta: IndicatorMeta;
    /**
     * Whether the script references a viewport built-in (e.g. Pine
     * `chart.left_visible_bar_time`). Detected statically at prepare; an engine
     * may refine it in place after the first run.
     */
    reactsToViewport: boolean;
    readonly token: unknown;
}
/** What an engine can do — lets the orchestrator route without engine-specific checks. */
interface EngineCapabilities {
    /** Can maintain a persistent incremental context for live ticks (vs a full re-run). */
    streaming: boolean;
    /** Understands viewport-dependent execution (`chart.*_visible_bar_time`-style). */
    visibleRange: boolean;
    /** Exposes an inputs schema (drives the renderer's settings dialog). */
    inputs: boolean;
    /** Exposes a declaration-props schema (`PreparedScript.props`) and honors prop
     *  overrides on `execute`/`update`. Absent ≡ false. */
    props?: boolean;
}
/** Market context an execution needs. Vela owns the bars; this is the metadata. */
interface ExecutionMarket {
    symbol: string;
    timeframe: string;
    /** Provider symbol metadata (Pine `syminfo.*`). May be absent or partial: the feed
     *  fetches it asynchronously (the `MarketDataFeed.symbolInfo` port is synchronous), so
     *  the first run can see a synthesized fallback and later runs the real values. */
    symbolInfo?: SymbolInfo;
    /** The chart's active price style. An engine adapter encodes a bar-transforming style
     *  into the chart's ticker identity (the extended ticker `"SYM;heikinashi"` — see
     *  `chartTickerOf`), from which chart-type builtins derive. The BARS an execution
     *  receives are already the style's view — this is metadata, not a request to
     *  transform. Optional; engines may ignore it. */
    chartStyle?: PriceStyle;
}
/**
 * One execution request. Vela owns the bars and passes them in — the engine
 * never fetches market data. `mode: 'static'` runs on demand (and re-runs when
 * the session is poked); `mode: 'live'` keeps a streaming context that emits per
 * tick (only requested when `capabilities.streaming`).
 */
interface ExecutionRequest {
    prepared: PreparedScript;
    market: ExecutionMarket;
    /** The initial bar snapshot. */
    bars: OHLCV[];
    /** Live accessor to Vela's canonical array (read on each re-run / tick). */
    getBars?: () => OHLCV[];
    /**
     * Fetch a secondary `(symbol, timeframe)` series (Pine `request.security`
     * HTF/LTF/cross-symbol). Cache-backed by Vela's data feed. Absent ≡ no
     * gateway (secondary fetches degrade to empty).
     */
    fetchSeries?: FetchSeries;
    inputs?: Record<string, InputValue>;
    /** Declaration-prop overrides, keyed like `PreparedScript.props`. Only meaningful
     *  when `capabilities.props`; other engines ignore it. */
    props?: Record<string, InputValue>;
    visibleRange?: VisibleBarRange;
    mode: 'static' | 'live';
    /**
     * Where the chart's history load stands at session start. `'backfill'` = older
     * chunks are still streaming in (the bars snapshot is a PARTIAL history); the
     * engine decides run policy — the bundled engines defer their first run until
     * the `'complete'` notification, a progressive engine may run immediately.
     * Absent ≡ `'complete'` (history fully loaded — today's behavior).
     */
    historyState?: 'backfill' | 'complete';
}
/** The event sink. `onModel` fires on the first run and on every re-run / live tick. */
interface ExecutionHandlers {
    onModel(model: IndicatorModel): void;
    onAlert?(alert: EngineAlert): void;
    onWarning?(warning: EngineWarning): void;
    onError?(error: Error): void;
    /** A `static` run finished; not fired for an open live stream. */
    onDone?(): void;
}
/**
 * Why the chart's bars changed, carried on {@link ExecutionSession.notifyBars}.
 * `'backfill'` = older history chunks prepended (the load is still in progress);
 * `'complete'` = the history backfill just finished (fires once). `undefined` =
 * a live tick / new bar at the tail — today's meaning. Run policy is the
 * ENGINE's: the bundled engines skip `'backfill'` and run on `'complete'`/ticks;
 * a progressive engine may re-run on every reason.
 */
type BarsChangeReason = 'backfill' | 'complete';
/** A running execution — the control surface the orchestrator drives. */
/** A read-only, serializable snapshot of a running script's execution context. */
interface EngineContextSnapshot {
    language: string;
    /** 'computing' while a static run is in flight, 'streaming' on a live session, 'idle' after done/stop. */
    phase: 'idle' | 'computing' | 'streaming';
    /** Index of the last computed bar. */
    barIndex: number;
    meta: {
        title: string;
        overlay: boolean;
        precision?: number;
        shorttitle?: string;
    };
    /** Named plot outputs, per key: index-aligned `{time, value}` points. */
    plots: Record<string, ReadonlyArray<{
        time: number;
        value: unknown;
    }>>;
    /**
     * The script's variables at the last computed bar, keyed by the names WRITTEN in the
     * source. An engine that mangles names internally un-mangles them here: a transpiler's
     * scoping scheme is its own business and must not reach host code. Values are the
     * serializable subset (never live references, never per-bar series buffers).
     */
    variables: Record<string, unknown>;
    /**
     * A STRATEGY's broker state at the last computed bar — absent for a plain indicator,
     * and for an engine whose language has no strategy concept. Neutral by contract: the
     * engine translates its own vocabulary into these fields.
     */
    strategy?: StrategyState;
    /** The strategy's round trips, closed then open. Absent when there are none. Select it
     *  explicitly — a deep backtest's ledger is large. */
    trades?: StrategyTrade[];
    warnings: EngineWarning[];
}
/** Keys a caller may restrict a context snapshot to (limits worker structured-clone cost). */
type ContextSelect = ReadonlyArray<keyof EngineContextSnapshot>;
interface ExecutionSession {
    /**
     * OPTIONAL capability — resolve a read-only context snapshot (null when the run
     * hasn't produced one yet). Always a COPY: mutating it never touches the engine.
     */
    getContext?(select?: ContextSelect): Promise<EngineContextSnapshot | null>;
    /** Tear down (stops any streaming / incremental re-execution). */
    stop(): void;
    /** Re-run / re-stream with merged input overrides. `props` (when given) merges
     *  declaration-prop overrides the same way — a props-capable engine re-runs with
     *  both applied; others may ignore the second argument. */
    update(inputs: Record<string, InputValue>, props?: Record<string, InputValue>): void;
    /** Update the viewport window (re-runs viewport-dependent scripts; no-op otherwise). */
    setVisibleRange(range: VisibleBarRange): void;
    /** Signal that Vela's bars changed. No reason = live tick; see {@link BarsChangeReason}. */
    notifyBars(reason?: BarsChangeReason): void;
}
/**
 * The scripting-engine abstraction. The orchestrator talks only to this, so every
 * concrete engine is swappable and Vela itself SHIPS none — engines are separate
 * packages (Pine Script: `@luxalgo/vela-pinets`) or host code written against this
 * port (see docs/contributing/adding-an-engine.md). Engines are registered by `language` and selected per
 * `addIndicator({ language })`; market data is owned by Vela's
 * `MarketDataFeed` and passed into `execute`.
 */
interface ScriptingEngine {
    /** Language id this engine handles, e.g. `'pine'`. The registry key. */
    readonly language: string;
    readonly capabilities: EngineCapabilities;
    /** Parse a script: extract its inputs schema + declaration metadata. No market data. */
    prepare(source: string, instanceId: string): Promise<PreparedScript>;
    /** Execute (static or live). Returns a session control handle. */
    execute(req: ExecutionRequest, handlers: ExecutionHandlers): ExecutionSession;
}

/** Per-indicator events emitted on `handle.on(...)`. */
interface IndicatorEventMap extends Record<string, unknown> {
    ready: undefined;
    error: {
        error: Error;
    };
    alert: {
        id: string;
        message: string;
        title?: string;
        time: number;
    };
}
/**
 * What `chart.addIndicator(...)` returns to the developer. The handle is usable
 * synchronously; data renders when execution resolves (see `on('ready')`).
 */
interface IndicatorHandle {
    readonly id: string;
    readonly title: string;
    /** The script source this indicator was added with. `undefined` for a NATIVE
     *  (core-computed) indicator — there is no script to show. What a host editor
     *  opens when a legend action asks for "the code behind this row". */
    readonly source?: string;
    /** The registered type of a NATIVE (core-computed) indicator — `undefined` for a
     *  script indicator. The two are exclusive: a handle has a `source` or a `nativeType`. */
    readonly nativeType?: string;
    /** Inputs parsed from the Pine source (populated once the script is prepared). */
    readonly inputs: readonly InputSchema[];
    /** Declaration-props schema (a strategy's `initial_capital`, an indicator's
     *  `precision`, …; populated once the script is prepared). Empty when the
     *  engine exposes none. */
    readonly props: readonly InputSchema[];
    /** Whether the indicator is currently shown (vs hidden). Hidden indicators stop computing. */
    readonly visible: boolean;
    /** The CURRENT stored input values (declaration defaults merged with every edit so
     *  far) — what state persistence diffs against the schema's `defval`s. */
    inputValues(): Record<string, InputValue>;
    /** The CURRENT stored declaration-prop values (overrides only — props keep no
     *  merged defaults; absent keys mean the declaration value). */
    propValues(): Record<string, InputValue>;
    setInput(key: string, value: InputValue): void;
    setInputs(values: Record<string, InputValue>): void;
    /** Override one declaration prop and re-run (a prop change replays the whole script). */
    setProp(key: string, value: InputValue): void;
    /** Override several declaration props at once and re-run. */
    setProps(values: Record<string, InputValue>): void;
    /**
     * Hide or show the indicator. Hiding **suspends** it — its visuals are dropped (the legend
     * row stays, marked hidden) and its computation stops (the engine session is torn down), so a
     * hidden indicator consumes no resources. Showing re-runs it over the current bars.
     */
    setVisible(visible: boolean): void;
    /**
     * Move (or merge) this indicator to another pane: the main price pane (`'price'`),
     * an existing pane (`{ pane: id }`), or a fresh pane (`{ newPane: {...} }`, optionally
     * placed relative to an existing pane). Merging into a pane it doesn't own gives it its
     * own scale column. No-op (with a warning) on a renderer without pane management.
     */
    moveTo(target: MoveTarget): void;
    on<K extends keyof IndicatorEventMap>(event: K, handler: (payload: IndicatorEventMap[K]) => void): () => void;
    /**
     * Read-only snapshot of the engine's execution context (variables, plots, the
     * script's return value…). Resolves null when the engine lacks the capability or
     * nothing has run yet. Always a copy — never a live reference. `select` limits the
     * extracted keys (keeps worker transfers small). Re-pull on `'context:changed'`.
     */
    context(select?: ContextSelect): Promise<EngineContextSnapshot | null>;
    remove(): void;
}

/** A symbol resolved to a registered provider. */
interface Resolved {
    /** Registered provider name (normalized — lower-case). */
    provider: string;
    /** Ticker the provider expects (any `provider:` prefix stripped, any `.ext` kept). */
    ticker: string;
}
/** The parts of a raw symbol string. */
interface ParsedSymbol {
    /** Lower-cased provider segment, or null when the symbol is bare. */
    provider: string | null;
    /** Everything after the `provider:` prefix (includes any `.ext`). */
    ticker: string;
    /** Best-effort trailing `.ext` token (provider-defined, never used for routing). */
    ext?: string;
}

/**
 * The chart's data control surface (`chart.data`) — the sibling of `chart.renderer`.
 * Registers market-data providers and queries the registry (resolve a symbol, list
 * providers/symbols, fetch per-symbol metadata).
 *
 * It operates on the default {@link MultiProviderFeed}. If a fully custom feed was
 * injected via `deps.dataFeed`, that feed manages its own data and the
 * registration/query methods warn + no-op (mirroring `chart.renderer.set` on an
 * unsupported feature).
 */
declare class DataControl {
    private readonly registry;
    constructor(feed: MarketDataFeed);
    /**
     * Register (or replace) a data provider under `name`. Any symbol prefixed `name:`
     * (case-insensitive), or a bare symbol the provider's index contains, routes to it.
     * Returns synchronously and is chainable: it kicks a background symbol-index build,
     * and if the chart symbol resolves through this provider the parked initial load
     * fires. Await `chart.ready()` for that load, or `chart.data.ready()` for the index.
     */
    registerProvider(name: string, provider: DataProvider): this;
    /** Remove a registered provider. */
    unregisterProvider(name: string): this;
    /** Metadata for every registered provider. */
    providers(): ProviderInfo[];
    /** Resolve a symbol string to `{ provider, ticker }`, or null if nothing serves it. */
    resolve(symbol: string): Resolved | null;
    /**
     * The DISPLAY prefix for `symbol` — the listing venue its descriptor declares
     * (`NASDAQ` for AAPL) or the resolved provider name. Null while unresolvable.
     */
    displayPrefix(symbol: string): string | null;
    /** The canonical `PREFIX:TICKER` form of `symbol`, or null while unresolvable. */
    canonicalSymbol(symbol: string): string | null;
    /**
     * The registered provider INSTANCE under `name` — the seam for EXTENDED provider
     * surfaces: a provider may implement interfaces beyond the `DataProvider` port
     * (extra data kinds, venue-specific APIs); consumers retrieve the instance and
     * narrow it with their own type guard. Returns undefined if the name is unknown
     * (or a custom `deps.dataFeed` bypasses the registry).
     */
    providerInstance(name: string): DataProvider | undefined;
    /** Indexed symbols for one provider (or all) — for autocomplete. */
    symbols(provider?: string): SymbolDescriptor[];
    /** The icon URL for `symbol` — its owning provider's `resolveSymbolIcon`, routed
     *  through resolution. Undefined while unresolvable, when the provider declares no
     *  resolver, or on a custom `deps.dataFeed` — the shells then show initials. */
    symbolIcon(symbol: string): string | undefined;
    /** Per-symbol metadata (Pine `syminfo.*`), resolved through the owning provider. */
    symbolInfo(symbol: string): Promise<SymbolInfo | undefined>;
    /**
     * The full resolved capabilities for `symbol` — per-instrument when the provider refines
     * them (`capabilitiesFor`), else its provider-wide declaration. Null while nothing
     * resolves the symbol (a provider may still be registering), so callers that can act
     * later should re-read rather than latch the first answer.
     */
    capabilities(symbol: string): ProviderCapabilities | null;
    /** Resolves when every registered provider's eager index has settled. */
    ready(): Promise<void>;
}

/**
 * The renderer-neutral visual parts a native indicator emits each compute — a subset of
 * {@link import('../model/indicator').IndicatorModel}. The orchestrator wraps this into a full
 * model (stamping id / pane / native tag), so the native path reuses the entire mount → legend →
 * settings → patch pipeline. (A native indicator with a *bespoke* renderer layer — e.g. the volume
 * columns — instead pushes its payload through the dedicated renderer seam, `pushData`.)
 */
interface NativeIndicatorOutput {
    /**
     * Value-axis override for the pane this native OWNS (see `IndicatorModel.paneAxis`):
     * `'none'` for content that is not value-mapped, or band labels for a categorical
     * axis. Emitted per compute, so it can follow the inputs (e.g. row toggles relabel
     * the axis). Absent ⇒ the pane derives a scale from its content as usual.
     */
    paneAxis?: PaneAxis;
    series?: SeriesSpec[];
    fills?: Fill[];
    backgrounds?: Background[];
    priceLines?: PriceLine[];
    lines?: DrawingLine[];
    boxes?: DrawingBox[];
    labels?: DrawingLabel[];
    polylines?: DrawingPolyline[];
    linefills?: DrawingLinefill[];
    tables?: DrawingTable[];
}
/** Services the host gives a running native indicator. */
interface NativeIndicatorContext {
    readonly symbol: string;
    readonly timeframe: string;
    readonly live: boolean;
    /** The chart's trading session (`'regular'` | `'extended'`); undefined = regular /
     *  no session model. A session switch reloads the market and RESTARTS the
     *  indicator, so this never changes within one context's lifetime. */
    readonly session?: string;
    /** The canonical bar array (a live accessor — always current). */
    bars(): readonly OHLCV[];
    /** Market-data access (trades / capabilities) for data-driven natives. */
    readonly data: DataControl;
    /** Push a fresh render output; the chart mounts it (first call) or patches it (subsequent). */
    emit(out: NativeIndicatorOutput): void;
    /**
     * Push a BESPOKE render payload to the renderer's native layer for this indicator's type (for a
     * native whose visuals aren't ordinary series/fills — e.g. volume/VPVR push their layer config).
     */
    pushData(data: unknown): void;
    /** Set the indicator's legend status: `'loading'` (fetching), `'live'` (live-updating), `'idle'`. */
    setStatus(status: IndicatorStatus): void;
}
/**
 * A core-computed (non-Pine) indicator instance — the compute + lifecycle behind one on-chart
 * native indicator. The orchestrator owns one per instance and drives it through these hooks; the
 * instance pushes its visuals via {@link NativeIndicatorContext.emit}. Implementations live in this
 * folder (one file per type) and self-register a {@link NativeIndicatorDescriptor}.
 */
interface NativeIndicator {
    /** Begin: compute + emit the first output. */
    start(ctx: NativeIndicatorContext, inputs: Record<string, InputValue>): void;
    /** A live tick arrived (bars changed) — recompute + emit. */
    onBars(): void;
    /** The viewport changed (scroll/zoom) — for range-aware natives (see `reactsToViewport`). */
    onViewport(range: VisibleRange): void;
    /** Settings changed — recompute + emit. */
    setInputs(inputs: Record<string, InputValue>): void;
    /** Hidden — stop timers/fetches (free resources); the instance + its state are kept for resume. */
    suspend(): void;
    /** Shown again — resume + re-emit. */
    resume(): void;
    /** Removed — full teardown (clear caches, stop timers). */
    stop(): void;
}
/**
 * Static description + factory for a native-indicator TYPE, registered once via
 * {@link registerNativeIndicator}. The descriptor is the type (metadata + capability); `create()`
 * mints a per-instance {@link NativeIndicator}.
 */
interface NativeIndicatorDescriptor {
    readonly type: string;
    /** Full display name (picker, settings header, handle title). */
    readonly title: string;
    /**
     * Compact name for the on-chart legend chip and the settings-dialog header.
     * Absent ⇒ {@link title}. The picker keeps the full title either way.
     */
    readonly shortTitle?: string;
    readonly paneHint: 'price' | 'new';
    readonly overlay: boolean;
    /** Whether instances react to viewport changes (drives the orchestrator's viewport poke). */
    readonly reactsToViewport?: boolean;
    /** Marks the type as beta — surfaced in the catalog so a host "add indicator" UI can badge it. */
    readonly beta?: boolean;
    /**
     * Allow several instances of this type on one chart — every add creates a new one (a study
     * like a moving average is typically stacked at different lengths). Absent ⇒ SINGLE instance
     * per type: a second add returns the existing handle. A type that pushes a bespoke layer
     * payload through `pushData` must stay single-instance (the layer is keyed by type).
     */
    readonly multiInstance?: boolean;
    inputsSchema(): InputSchema[];
    defaultInputs(): Record<string, InputValue>;
    create(): NativeIndicator;
    /**
     * Whether this native indicator applies to `symbol` (a type may need a provider capability).
     * Absent ⇒ always supported. Used to gate auto-add + an "add native indicator" menu.
     */
    isSupported?(symbol: string, data: DataControl): boolean | Promise<boolean>;
}
/**
 * One entry in the "add native indicator" catalog: the type's static metadata plus its live state
 * on a specific chart — whether it applies to the current symbol (`supported`) and whether at
 * least one instance is already present (`present`). Produced by
 * `chart.availableNativeIndicators()`.
 */
interface NativeIndicatorInfo {
    readonly type: string;
    readonly title: string;
    /** Applies to the current symbol (a type may need data the provider lacks). */
    readonly supported: boolean;
    /** At least one instance is on the chart. For a single-instance type a second add is a no-op;
     *  a `multiInstance` type adds another instance regardless. */
    readonly present: boolean;
    /** The type allows several instances per chart (see `NativeIndicatorDescriptor.multiInstance`). */
    readonly multiInstance?: boolean;
    /** The type is flagged beta (for a badge in the picker). */
    readonly beta?: boolean;
}
/** Register a native-indicator type so `chart.addNativeIndicator(type)` can create it. */
declare function registerNativeIndicator(descriptor: NativeIndicatorDescriptor): void;
/** Remove a registered native-indicator type (mainly for tests). */
declare function unregisterNativeIndicator(type: string): void;
/** Look up a registered native-indicator descriptor (undefined if the type isn't registered). */
declare function getNativeIndicator(type: string): NativeIndicatorDescriptor | undefined;
/** All registered native-indicator types (for a host "add native indicator" menu). */
declare function nativeIndicatorTypes(): string[];
/** All registered native-indicator descriptors (for building a catalog with metadata + capability). */
declare function nativeIndicatorDescriptors(): NativeIndicatorDescriptor[];

/**
 * Why a script computed. The distinction that matters most is `'tick'` vs `'bar'`: a tick
 * refines the bar that is still open, so its values can still move, while `'bar'` means a
 * new bar opened and everything before it is now settled. Anything that records, alerts,
 * or exports should key off `'bar'`.
 */
type ScriptRunCause = 
/** The first computation over the loaded history (also every re-computation an engine
 *  makes while a deep backfill is still landing — see {@link ScriptRun.complete}). */
'history'
/** The forming bar changed (a live tick). */
 | 'tick'
/** A new bar opened — the previous one is final. */
 | 'bar'
/** An input was edited. */
 | 'inputs'
/** The visible range moved (viewport-aware scripts only). */
 | 'viewport'
/** The chart's market changed and the script re-executed over the new bars. */
 | 'market';
/**
 * One computation of one script, as host code observes it — the payload of `script:run`
 * and what `runScript()` resolves to.
 *
 * The split is deliberate: everything FLAT and at the current bar rides the run itself,
 * while anything historical and unbounded (the trade ledger, a plot's full history) is a
 * call you make only when you need it, so a per-tick listener never ships a 5 000-row
 * ledger it will not read.
 */
interface ScriptRun {
    /** The indicator id — the same one `chart.indicators()` and the lifecycle events carry. */
    readonly id: string;
    /** The title the script DECLARED (`strategy("SMA cross")`), not a placeholder. */
    readonly title: string;
    readonly kind: 'indicator' | 'strategy';
    readonly cause: ScriptRunCause;
    /** This script's first computed run. */
    readonly first: boolean;
    /** Index of the last computed bar. */
    readonly bar: number;
    /** Open time of that bar. */
    readonly time: Millis;
    /** That bar is still open, so these values are provisional. False on a static chart
     *  and on any run computed over settled history. */
    readonly forming: boolean;
    /** The run saw the FULL requested history. False only while an engine that computes
     *  progressively is still being fed a deep backfill — a deeper run will follow. */
    readonly complete: boolean;
    /** Each named plot's value at {@link bar}; `null` marks a gap. */
    readonly plots: Readonly<Record<string, number | null>>;
    /** The script's own variables at {@link bar}, keyed by the names WRITTEN in the source.
     *  Empty for an engine that exposes none. */
    readonly vars: Readonly<Record<string, unknown>>;
    /** Broker state at {@link bar} — present iff `kind === 'strategy'` and the engine
     *  reports it. */
    readonly strategy?: StrategyState;
    /** Warnings this script has raised so far. */
    readonly warnings: readonly EngineWarning[];
    /** The strategy's round trips, closed then open. Async because the ledger is unbounded:
     *  it never rides the run. Empty for an indicator. */
    trades(): Promise<readonly StrategyTrade[]>;
    /** One plot's full history. Async for the same reason. Empty for an unknown key. */
    series(key: string): Promise<ReadonlyArray<{
        time: Millis;
        value: number | null;
    }>>;
}
/**
 * What `chart.runScript()` resolves to: the script's first run, plus the controls for the
 * indicator it put on the chart. Never rejects — a compile or runtime failure resolves
 * with `ok: false` and the indicator is removed again (no dead legend row).
 */
interface ScriptRunResult {
    ok: boolean;
    /** The first computed run on success; null on failure. */
    run: ScriptRun | null;
    /** The failure, or null. */
    error: Error | null;
    /** Follow this script's later runs. Returns an unsubscriber. No-op after a failure. */
    onUpdate(handler: (run: ScriptRun) => void): () => void;
    /** Take the script off the chart. No-op after a failure. */
    remove(): void;
}

/** Chart-level events emitted on `chart.on(...)`. */
interface VelaEventMap extends Record<string, unknown> {
    ready: undefined;
    /**
     * The chart's market switched IN PLACE via `setMarket` — symbol, provider, timeframe,
     * or offline data changed (a depth-only reload does not fire). Fires after the new
     * market's history is painted and every consumer restarted. `prev` carries the
     * previous identity so hosts can re-key per-symbol state (e.g. swap user-drawing
     * documents between symbols).
     */
    "market:changed": {
        symbol: string;
        timeframe: string;
        prev: {
            symbol: string;
            timeframe: string;
        };
    };
    /**
     * A bar load began with nothing painted: the FIRST load (fires during construction —
     * subscribers attached later see only its `load:end`), or an identity switch
     * (symbol/provider/timeframe), which blanks the old series in the same breath. Fires
     * before the first fetch — plugins, extensions and custom indicators hide or reset
     * their own visuals here. Exactly one `load:end` follows. A depth-only reload
     * (`bars`) keeps the chart painted and fires neither.
     */
    "load:start": {
        symbol: string;
        timeframe: string;
        firstLoad: boolean;
    };
    /**
     * The load ended: its first bars painted (`bars` > 0 — on deep histories the quick
     * preview, before the full depth), or it ended with none (`bars` = 0 — a failed
     * fetch, an empty market, or a parked symbol nothing serves). Counterpart of
     * `load:start`; plugins restore or rebuild their visuals here.
     */
    "load:end": {
        symbol: string;
        timeframe: string;
        bars: number;
    };
    "indicator:added": {
        id: string;
    };
    "indicator:removed": {
        id: string;
    };
    /** An indicator's stored input/prop VALUES changed (settings dialog, `setInputs`) — what state persistence listens to. */
    "indicator:inputs": {
        id: string;
    };
    "indicator:error": {
        id: string;
        error: Error;
    };
    /** No registered provider can serve the chart symbol — the load is PARKED, not failed:
     *  it resumes by itself if a capable provider registers later. */
    "data:unresolved": {
        symbol: string;
        providers: string[];
    };
    /** An indicator was moved/merged to another pane (`chart.panes` / legend / object tree). */
    "indicator:moved": {
        id: string;
        paneId: string;
    };
    /** An indicator was shown/hidden (legend eye, `handle.setVisible`, or object tree). */
    "indicator:visibility": {
        id: string;
        visible: boolean;
    };
    /** A pane's layout changed: order, collapse/maximize, creation or removal. */
    "pane:changed": undefined;
    /**
     * The app theme changed — `chart.setTheme(...)` or the in-chart settings dialog's
     * Canvas → Theme row. Payload is the RESOLVED theme; host chrome around the chart
     * (toolbars, panels, page shells) re-skins from it. Not fired for plot-only
     * cosmetic edits (`layout.background` through the config), which deliberately
     * leave the app theme alone.
     */
    "theme:changed": VelaTheme;
    /** A study pane was reordered one slot (`dir`) — carries enough to invert for undo/redo. */
    "pane:moved": {
        paneId: string;
        dir: "up" | "down";
    };
    /** A user drawing was created (interactively or via `chart.drawings.add`). */
    "drawing:created": {
        id: string;
    };
    /** An interactive placement is in progress — the ghost's current shape after each
     *  anchor click / cursor move, `null` when placement ends (finalized or
     *  cancelled). Transient: nothing is in the store yet. Multi-chart hosts mirror
     *  it on linked charts via `drawings.setExternalGhost`. */
    "drawing:draft": {
        doc: SerializedDrawing | null;
    };
    /** A user drawing's anchors/style/text changed. */
    "drawing:edited": {
        id: string;
    };
    /** Selection changed (`id` is null when nothing is selected). */
    "drawing:selected": {
        id: string | null;
    };
    /** The favorite-tool set changed (star toggles or a bulk restore). */
    "drawing:favorites": {
        favorites: string[];
    };
    /** The armed drawing tool changed — toolbar click, one-shot tool finishing (back to
     *  the pointer, `null`), or a programmatic `drawings.setTool`. */
    "drawing:tool": {
        type: DrawingTypeKey | null;
    };
    /** The magnet snap mode changed (in-chart toolbar or `drawings.setSnapMode`). */
    "drawing:snap": {
        mode: SnapMode;
    };
    /** Stay-in-drawing-mode changed (in-chart toolbar or `drawings.setStayMode`) — when
     *  on, finishing a drawing leaves the tool armed. */
    "drawing:stay": {
        on: boolean;
    };
    /** The renderer-local mode changed: measure ruler, eraser, or none — including the
     *  mutual-exclusion exits (arming a tool leaves measure/eraser). */
    "drawing:mode": {
        mode: DrawingMode;
    };
    /** A user drawing was removed. */
    "drawing:removed": {
        id: string;
    };
    /** The user requested a drawing's settings popup. */
    "drawing:settings": {
        id: string;
    };
    /**
     * A SCRIPT computed — the first run over the history, a live tick, a new bar, an input
     * edit, a viewport move, a market switch. The payload carries the run itself (title,
     * cause, the plots/variables/broker state at the computed bar), so a listener reads it
     * directly instead of resolving a handle and pulling a snapshot. Throttled to ~1/s per
     * indicator while streaming, and only emitted for engines that expose an execution
     * context. Native (core-computed) indicators never fire it — they run no script.
     */
    "script:run": ScriptRun;
    /** An indicator's execution context advanced (run finished, or throttled during
     *  streaming) — re-pull `handle.context()` if you consume it. Prefer `script:run`,
     *  which delivers the data rather than a signal to go fetch it. */
    "context:changed": {
        id: string;
    };
    /** A live tick: the forming bar was updated or a new bar appended. */
    bar: OHLCV;
    /**
     * The visible time range moved (pan/zoom/fit — fires per applied change, NOT
     * debounced; the engine re-run debounce is separate). Payload = `{from, to}` in
     * epoch-ms. The seam viewport-sync links between charts build on.
     */
    "viewport:changed": {
        from: number;
        to: number;
    };
    /** A deep-history backfill chunk landed (`loaded` of `target` bars are on the chart). */
    "history:progress": {
        loaded: number;
        target: number;
    };
    /**
     * The history load finished: `'depth'` = the requested bar count is loaded, `'genesis'` =
     * the source has nothing older (full available history), `'aborted'` = a fetch failed or
     * the data was non-monotonic — the chart keeps what loaded. Fires exactly once, including
     * for small/offline charts (immediately after their single load).
     */
    "history:complete": {
        reason: "depth" | "genesis" | "aborted";
        oldestTime: number;
        barsLoaded: number;
    };
    /** An indicator's script raised an alert. `indicator` names the source — the
     *  indicator's display title (what its legend row shows). */
    alert: EngineAlert & {
        indicator?: string;
    };
    warning: EngineWarning;
}

/**
 * A renderer-agnostic count of the graphic elements one indicator generated — the
 * deterministic oracle signal. It confirms the core *produced* the elements (engine +
 * model mapping), independent of any renderer. Whether a renderer actually *drew* them
 * is a separate (visual) check.
 */
interface IndicatorSummary {
    id: string;
    title: string;
    overlay: boolean;
    paneId?: string;
    /** A native (core-computed) indicator, and its type — absent/false for a Pine indicator. */
    native: boolean;
    nativeType?: string;
    /** Value-series counts keyed by kind (line/area/step/histogram/columns/circles/cross/candle/bar/markers). */
    series: Record<string, number>;
    fills: number;
    backgrounds: number;
    priceLines: number;
    lines: number;
    boxes: number;
    labels: number;
    polylines: number;
    linefills: number;
    tables: number;
    barColors: number;
    trades: number;
    inputs: number;
    /** Elements flagged `force_overlay` (routed to the price pane), across every kind. */
    forcedOverlay: number;
}
/** A snapshot of everything the Vela core has generated for the mounted indicators. */
interface SceneInspection {
    indicators: IndicatorSummary[];
    /** Sums across all indicators, for convenient whole-scene assertions. */
    totals: {
        panes: number;
        series: number;
        fills: number;
        backgrounds: number;
        priceLines: number;
        lines: number;
        boxes: number;
        labels: number;
        polylines: number;
        linefills: number;
        tables: number;
        barColors: number;
        trades: number;
        forcedOverlay: number;
    };
}

/**
 * The public control surface for the active renderer — `chart.renderer`. A thin
 * facade over the renderer port: get/set/inspect render features without exposing
 * the internal orchestration methods (`setBars`, `mountIndicator`, …). A key the
 * active renderer doesn't support warns in the console and is ignored — the chart
 * is never touched.
 */
declare class RendererControl {
    private readonly renderer;
    constructor(renderer: IChartRenderer);
    /** The active renderer's identity, e.g. `'native'` or `'lwc'`. */
    get name(): string;
    /** What the active renderer can draw (drives graceful degradation). */
    get capabilities(): RendererCapabilities;
    /** Whether the active renderer supports a feature — use to show/hide a UI control. */
    supports(feature: string): boolean;
    /** Read a feature's current value (`undefined` if unsupported). */
    get(feature: string): unknown;
    /**
     * Set one feature (`set('glow', 0.6)`) or several at once
     * (`set({ logScale: true, upColor: '#fff' })`). A key the active renderer does
     * not support emits a console warning and is ignored, with no effect on the UI.
     */
    set(feature: string | Record<string, unknown>, value?: unknown): this;
    /**
     * Wire the legend rows' HOST-CONTRIBUTED actions (the shells route the plugin
     * registry through this; see `registerLegendAction`). Silent on a renderer without
     * the seam — contributed legend actions simply never show there, same graceful
     * degradation as the sync ghost crosshair.
     */
    setLegendActions(provider: ((indicatorId: string) => LegendActionView[]) | null): void;
    /**
     * Wire the legend rows' HOST-CONTRIBUTED callout bubbles (the shells route the
     * plugin registry through this; see `registerLegendCallout`). Silent on a renderer
     * without the seam — contributed callouts simply never show there, same graceful
     * degradation as {@link setLegendActions}.
     */
    setLegendCallouts(provider: ((indicatorId: string) => LegendCalloutView[]) | null): void;
    /**
     * Replace the indicator legend's fold toggle with a host action (or restore it with
     * `null`) — multi-chart shells point the chip at their indicator overview instead of
     * unfolding rows in place. Silent no-op on a renderer without a foldable legend.
     */
    setLegendOverviewAction(action: (() => void) | null): this;
    /** Whether the active renderer can open a per-indicator settings dialog. */
    get supportsIndicatorSettings(): boolean;
    /**
     * Open one indicator's settings dialog — the programmatic twin of the legend gear
     * (see {@link supportsIndicatorSettings}). Silent no-op without the seam or for an
     * unknown id.
     */
    openIndicatorSettings(indicatorId: string): this;
    /**
     * Export the current chart as a PNG data URL, or null if the active renderer
     * doesn't support it (warns). DOM overlays (tables, legend) are not included.
     */
    screenshot(): string | null;
    /**
     * Raster of the current chart onto a canvas (same pixels as {@link screenshot}),
     * or null if the renderer has no canvas export. Silent — a host compositing
     * several charts skips a renderer that cannot contribute.
     */
    screenshotCanvas(): HTMLCanvasElement | null;
    /**
     * The active renderer's full cosmetic config as a serializable, versioned JSON
     * document — persist it (templates, saved settings) and feed it back to
     * `applyConfig`. Returns null if the renderer has no rich config (warns).
     */
    getConfig(): unknown;
    /**
     * Apply a (possibly partial) config document from `getConfig()` — load a template
     * or restore saved settings. Malformed/unknown fields are ignored; no indicator
     * re-run. No-ops with a warning if the renderer has no rich config.
     */
    applyConfig(config: unknown): this;
    /**
     * Subscribe to cosmetic-config changes (`applyConfig` — the in-chart settings dialog
     * commits through it). Host chrome that mirrors a config value (a bottom-bar timezone)
     * re-pulls {@link get}/{@link getConfig} here. Silent no-op unsubscribe on a renderer
     * without a rich config.
     */
    onConfigChanged(cb: () => void): Unsubscribe;
    /**
     * Subscribe to crosshair movement — `time`/`price` under the cursor, per-series values,
     * and the hovered bar's OHLC (null fields when the cursor leaves the chart). This is the
     * public seam host chrome (status lines, data windows) builds on.
     */
    onCrosshairMove(cb: (e: CrosshairEvent) => void): Unsubscribe;
    /** Touch long-press on a price or time axis strip — silent no-op without the seam. */
    onAxisLongPress(cb: (e: AxisLongPressEvent) => void): Unsubscribe;
    /**
     * The current data-window readout — the hovered bar's date/time and OHLCV plus every
     * indicator's value there, each already formatted on its pane's scale (the latest bar when
     * the cursor is off the plot). Pair it with {@link onCrosshairMove} to drive a data-window
     * panel. Null on a renderer that doesn't provide the readout.
     */
    dataWindowReadout(): DataWindowReadout | null;
    /**
     * Wire (or clear with `null`) the host's symbol picker for the settings dialog's `input.symbol`
     * control — the host opens its own ticker-selection UI and reports the chosen symbol back.
     * No-ops with a warning if the active renderer doesn't support it (only the native renderer does).
     */
    setSymbolPicker(picker: SymbolPickerFn | null): this;
    /**
     * Move keyboard focus back onto the chart's interactive surface — call after a host
     * control (a shared toolbar button) stole focus, so chart/drawing shortcuts keep
     * working. Silent no-op on a renderer without a focusable surface.
     */
    focus(): this;
    /** Whether the active renderer can display an EXTERNAL (synced) crosshair. */
    get supportsExternalCrosshair(): boolean;
    /**
     * Show (or clear, with `null`) a data-space ghost crosshair driven from OUTSIDE
     * this chart — the multi-chart crosshair-sync seam. Silent no-op on a renderer
     * without the capability (see {@link supportsExternalCrosshair}).
     */
    setExternalCrosshair(time: number | null, price?: number | null): this;
    /**
     * Close any in-chart dialogs the active renderer owns (indicator settings, chart-settings
     * gear) — for keeping host dialogs mutually exclusive with the renderer's. Silent no-op if
     * the renderer has no such dialogs; safe to call speculatively.
     */
    closeDialogs(): this;
    /**
     * Open (or toggle) the renderer's in-chart settings dialog — silent no-op without one.
     * Pass a section title (e.g. `'Canvas'`) to land on that tab; an unknown one opens the
     * dialog on its first tab, and with a section an open dialog switches tab instead of closing.
     */
    openSettings(section?: string): this;
    /** Contribute host settings tabs (callback rows) to the renderer's settings dialog —
     *  e.g. the widget's Status line toggles. Silent no-op without a dialog. */
    setSettingsSections(sections: ReadonlyArray<{
        title: string;
        rows: readonly unknown[];
        id?: string;
    }>): this;
    /**
     * Set the settings-dialog visibility policy: `hidden` lists setting ids to hide —
     * a tab (`'canvas'`), a group (`'canvas.grid'`), or a single row
     * (`'canvas.grid.vertical'`); an id hides its whole subtree, and a tab with nothing
     * left disappears from the rail. Presentation-only: hidden values keep being stored
     * and applied (e.g. hide `'advanced'` while forcing the widget's `bars` option).
     * Seeded from `VelaOptions.settings`; silent no-op without a settings dialog.
     */
    setSettingsVisibility(policy: {
        hidden?: readonly string[];
    }): this;
    /** Every addressable setting id of this chart (built-in tabs/groups/rows, chart-type
     *  sections, host sections) — enumerate these to build a `hidden` list instead of
     *  reading contributor source. Empty on a renderer without a settings dialog. */
    listSettingsIds(): string[];
    /** Tell the renderer's own chrome which size class the host shell is in —
     *  `'mobile'` switches its dialogs/toolbars to the touch-first presentation.
     *  Silent no-op on a renderer without adaptive chrome. */
    setLayoutMode(mode: 'mobile' | 'desktop'): this;
}

/** Callback surface `PanesControl` uses to drive the orchestrator. */
interface PaneController {
    /** Whether the active renderer supports pane management (move/merge/reorder/collapse). */
    paneManagementSupported(): boolean;
    listPanes(): PaneInfo[];
    movePane(paneId: string, dir: 'up' | 'down'): void;
    removePaneAndIndicators(paneId: string): void;
    collapsePane(paneId: string, collapsed: boolean): void;
    maximizePane(paneId: string | null): void;
    moveIndicator(id: string, target: MoveTarget): void;
}
/**
 * The public pane control surface — `chart.panes`. Lists panes with their indicators
 * and moves/merges/reorders/collapses/maximizes them. On a renderer without pane
 * management every mutation warns and no-ops (and `list()` still reports the panes).
 */
declare class PanesControl {
    private readonly controller;
    constructor(controller: PaneController);
    /** Whether the active renderer supports pane management (use to show/hide host UI). */
    get supported(): boolean;
    /** The current panes (top-to-bottom by `order`) with the indicators each holds. */
    list(): PaneInfo[];
    /** Move a pane one slot up or down in the stack (the price pane stays pinned on top). */
    move(paneId: string, dir: 'up' | 'down'): this;
    /** Remove a pane and every indicator in it (the price pane can't be removed). */
    remove(paneId: string): this;
    /** Collapse a pane to a thin strip, or restore it. */
    collapse(paneId: string, collapsed?: boolean): this;
    /** Maximize one pane to fill the plot, or restore the split (`null`). */
    maximize(paneId: string | null): this;
    /** Move/merge an indicator to a pane — sugar for `handle.moveTo(...)` by id. */
    moveIndicator(id: string, target: MoveTarget): this;
    private guard;
}

type EventHandler<T> = (payload: T) => void;
/** Minimal typed pub/sub. Handler errors are isolated (logged, never thrown). */
declare class TypedEventBus<Events extends Record<string, unknown>> {
    private readonly handlers;
    on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void;
    off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;
    /** Whether anyone is listening — lets an emitter skip building an expensive payload. */
    hasListeners<K extends keyof Events>(event: K): boolean;
    emit<K extends keyof Events>(event: K, payload: Events[K]): void;
    clear(): void;
}

/** Versioned persistence envelope for a chart's user drawings. */
interface DrawingsDocument {
    version: 1;
    drawings: SerializedDrawing[];
}

/** Optional seed for a programmatic {@link DrawingController.add}. */
interface AddInit {
    paneId?: string;
    anchors?: SerializedDrawing['anchors'];
    style?: Partial<SerializedDrawing['style']>;
    text?: SerializedDrawing['text'];
    /** Per-type extras (e.g. a glyph stamp's `glyph`, a fib tool's `levels`). */
    props?: SerializedDrawing['props'];
    /** Draw-order key. Defaults to just under the pane's price on a renderer with
     *  `drawingDepth` — the candles read on top of a fresh drawing; pass an explicit key
     *  for any other slot in the stack. */
    zIndex?: number;
}
/**
 * Renderer-agnostic owner of the user-drawing model + tool/selection state. Holds
 * the {@link DrawingStore} (source of truth), pushes snapshots to the renderer
 * through {@link IDrawingsRendererPort}, and turns renderer intents into store
 * mutations + `drawing:*` events. Inert (but persistence still works) when the
 * active renderer lacks `userDrawings` — that's the LwC path.
 */
declare class DrawingController {
    private readonly events;
    private readonly store;
    private readonly history;
    private readonly port;
    private readonly enabled;
    private activeTool;
    /** Mirror of the renderer's sticky magnet mode (the renderer default is 'off'). */
    private snapMode;
    /** When on, finishing a drawing leaves the tool armed (instead of one-shot disarm). */
    private stayInDrawingMode;
    /** Mirror of the renderer-local mode (measure/eraser/none). */
    private mode;
    /** FAVORITE tool types (insertion-ordered) — user prefs, not document data. */
    private favs;
    private selectedIds;
    private clipboard;
    private readonly lastStyle;
    private readonly subs;
    constructor(renderer: IChartRenderer, events: TypedEventBus<VelaEventMap>, option: DrawingsOption | undefined, seriesGateway?: DrawingSeriesGateway);
    /** Whether the active renderer supports interactive drawings. */
    get supported(): boolean;
    setTool(type: DrawingTypeKey | null): void;
    getTool(): DrawingTypeKey | null;
    getSnapMode(): SnapMode;
    setSnapMode(mode: SnapMode): void;
    getStayMode(): boolean;
    setStayMode(on: boolean): void;
    getMode(): DrawingMode;
    setMode(mode: DrawingMode): void;
    showToolbar(visible: boolean): void;
    /** The favorite tool types, in the order they were starred. */
    favorites(): DrawingTypeKey[];
    isFavorite(type: DrawingTypeKey): boolean;
    /** Star/unstar one tool. Unknown types are ignored; no-ops don't emit. */
    setFavorite(type: DrawingTypeKey, on: boolean): void;
    /** Replace the whole favorite set (bulk restore) — unknown types are dropped. */
    setFavorites(types: readonly DrawingTypeKey[]): void;
    private pushFavorites;
    setToolbar(option: DrawingsOption): void;
    /** Display (or clear) another chart's in-progress placement as a ghost — silently
     *  inert on a renderer without the optional `setExternalGhost` seam. */
    setExternalGhost(doc: SerializedDrawing | null): void;
    /** Push per-tool shortcut hints (pre-formatted display strings) to the toolbar flyouts. */
    setToolShortcuts(map: Readonly<Partial<Record<DrawingTypeKey, string>>>): void;
    add(type: DrawingTypeKey, init?: AddInit): Drawing | null;
    remove(id: string): void;
    /** Apply a partial record to a drawing (headless write-back from a custom UI). */
    update(id: string, patch: Partial<SerializedDrawing>): void;
    /** Apply several partial records as ONE undo step (e.g. hiding/locking/reordering a group). */
    updateMany(patches: ReadonlyArray<{
        id: string;
        patch: Partial<SerializedDrawing>;
    }>): void;
    /** Delete several drawings as ONE undo step (the public face of {@link deleteMany}). */
    removeMany(ids: readonly string[]): void;
    setLocked(id: string, v: boolean): void;
    setVisible(id: string, v: boolean): void;
    bringToFront(id: string): void;
    sendToBack(id: string): void;
    /** The top of the pane's series stack — what a front drawing has to clear. 0 when the
     *  renderer keeps drawings on their own layer (no shared z space). */
    private seriesTopZ;
    /** The bottom of the pane's series stack — what a backmost drawing has to undercut. */
    private seriesBottomZ;
    /** Where a NEW drawing starts: just under the pane's price so the candles read on top of it
     *  (falling back to just under the pane's top series where there is no price — a study
     *  pane). Half a key down never ties a series; drawings tying each other paint in insertion
     *  order, so consecutive new drawings still stack newest-in-front. Undefined without a
     *  shared z space — the store then places it over the other drawings, its own layer's top.
     *  A type that COVERS the series (an opaque inset, `coversSeries`) instead starts just
     *  above the whole stack — under the candles its content would be buried. */
    private startZ;
    /** Programmatically select drawings (host UI → chart): shows the on-chart handles + toolbar.
     *  `additive` toggles membership (matching shift-click) instead of replacing. */
    select(ids: readonly string[], additive?: boolean): void;
    /** Open a drawing's on-chart settings popup (and select it) — a click on it, driven from a host UI. */
    openSettings(id: string): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    /** Duplicate drawings in place (clones land on the source, auto-selected → "duplicate then drag"). */
    duplicate(ids: readonly string[]): Drawing[];
    clone(id: string): Drawing | null;
    /** Copy drawings into the in-memory clipboard (no model change, no event). */
    copy(ids: readonly string[]): void;
    paste(): Drawing[];
    all(): SerializedDrawing[];
    toJSON(): DrawingsDocument;
    fromJSON(doc: unknown): void;
    destroy(): void;
    /** Set/extend the selection. `additive` toggles membership (shift-click) vs replacing it. */
    private setSelection;
    /** Restore a history snapshot, reconciling selection against what survived. */
    private restoreSnapshot;
    /** Delete drawings as one undo step; prune them from the selection. */
    private deleteMany;
    /** Add clones (fresh ids, fresh mount-order z) as one undo step + select them. */
    private insertClones;
    private resolve;
    /** Remember a drawing's style as the "last used" for its type (seeds the next one). */
    private captureStyle;
    private sync;
    /** Renderer gesture → authoritative store mutation + event. */
    private onIntent;
}

/**
 * The chart's drawing control surface (`chart.drawings`) — sibling of
 * `chart.data` / `chart.renderer`. Activate tools, create/mutate drawings
 * programmatically, and persist them. Always present; on a renderer without the
 * `userDrawings` capability the interactive methods warn + no-op (the
 * {@link DataControl} pattern), while `toJSON`/`fromJSON`/`all` still round-trip
 * because the model is core-owned.
 */
declare class DrawingsControl {
    private readonly ctrl;
    constructor(ctrl: DrawingController);
    /** Whether the active renderer supports interactive drawings. */
    get supported(): boolean;
    /** Arm a tool — the next click(s) place it. `null` returns to select/idle. */
    setTool(type: DrawingTypeKey | null): this;
    /** The currently armed tool (`null` = select/idle). Mirrors in-chart toolbar clicks
     *  and one-shot tools disarming — listen on `drawing:tool` to follow changes. */
    getTool(): DrawingTypeKey | null;
    /** Set the sticky magnet snap mode (`'off' | 'weak' | 'strong'`). */
    setSnapMode(mode: SnapMode): this;
    /** The current magnet snap mode — follow changes on `drawing:snap`. */
    getSnapMode(): SnapMode;
    /** Keep the armed tool after each placement (`true`) or one-shot disarm (`false`). */
    setStayMode(on: boolean): this;
    /** Whether tools stay armed after placement — follow changes on `drawing:stay`. */
    getStayMode(): boolean;
    /** Enter/exit a renderer-local mode: `'measure'` (transient ruler), `'eraser'`, or
     *  `null` (none). Mutually exclusive with each other and with any armed tool — the
     *  renderer enforces the exclusion and the outcome lands on `drawing:mode`. */
    setMode(mode: DrawingMode): this;
    /** The current renderer-local mode — follow changes on `drawing:mode`. */
    getMode(): DrawingMode;
    /** Show or hide the on-chart drawing toolbar. */
    showToolbar(visible?: boolean): this;
    /** Reconfigure the toolbar groups/tools live. */
    setToolbar(option: DrawingsOption): this;
    /** Show per-tool shortcut hints in the toolbar flyouts. Values are PRE-FORMATTED
     *  display strings (e.g. `'Alt+T'`, `'⌥T'`) — the host owns the keymap and the
     *  platform formatting, so hints always match the host's actual bindings. */
    setToolShortcuts(map: Readonly<Partial<Record<DrawingTypeKey, string>>>): this;
    /** Display another chart's in-progress placement as a GHOST at reduced opacity
     *  (`null` clears it) — how a multi-chart host mirrors `drawing:draft` onto linked
     *  charts. Never a real drawing: no store entry, no selection, no persistence.
     *  Silently inert on a renderer without the optional seam. */
    setExternalGhost(doc: SerializedDrawing | null): this;
    /** Create a drawing programmatically (no clicking). Returns it, or null if unsupported. */
    add(type: DrawingTypeKey, init?: AddInit): Drawing | null;
    remove(id: string): this;
    /** Apply a partial record to a drawing — for a custom (headless) settings UI. */
    update(id: string, patch: Partial<SerializedDrawing>): this;
    /** Apply several partial records as one undo step (group hide/lock/reorder from a host UI). */
    updateMany(patches: ReadonlyArray<{
        id: string;
        patch: Partial<SerializedDrawing>;
    }>): this;
    /** Remove several drawings as one undo step. */
    removeMany(ids: readonly string[]): this;
    lock(id: string, v?: boolean): this;
    show(id: string, v?: boolean): this;
    /** Select drawings on the chart (highlight + open their toolbar) — for a host-side tree/list.
     *  Pass `null` or `[]` to clear the selection. */
    select(ids: string | readonly string[] | null): this;
    /** Open a drawing's settings popup on the chart (selecting it) — the twin of clicking it. */
    openSettings(id: string): this;
    bringToFront(id: string): this;
    sendToBack(id: string): this;
    /** Revert the last edit. No-op when there is nothing to undo. */
    undo(): this;
    /** Re-apply the last undone edit. No-op when there is nothing to redo. */
    redo(): this;
    canUndo(): boolean;
    canRedo(): boolean;
    /** Duplicate a drawing in place; the clone is selected. Returns this (chainable). */
    clone(id: string): this;
    /** Duplicate several drawings in place; the clones become the selection. */
    duplicate(ids: string[]): this;
    /** Copy drawings into the in-memory clipboard for a later {@link paste}. */
    copyToClipboard(ids: string[]): this;
    /** Paste the clipboard as new drawings (fresh ids), selecting them. */
    paste(): this;
    /** Every drawing as plain JSON, in paint order. */
    all(): SerializedDrawing[];
    /** Snapshot all drawings as a versioned document (persistence). */
    toJSON(): DrawingsDocument;
    /** Restore drawings from a document produced by {@link toJSON} (untrusted-safe). */
    fromJSON(doc: unknown): this;
    /** The favorite tool types (starred in the toolbar flyouts), insertion-ordered. */
    favorites(): DrawingTypeKey[];
    isFavorite(type: DrawingTypeKey): boolean;
    /** Star/unstar one tool type. */
    setFavorite(type: DrawingTypeKey, on: boolean): this;
    /** Replace the whole favorite set (e.g. restoring persisted prefs). */
    setFavorites(types: readonly DrawingTypeKey[]): this;
    /** Aliases mirroring `renderer.getConfig()/applyConfig()` for symmetry. */
    getConfig(): DrawingsDocument;
    applyConfig(doc: unknown): this;
    private ok;
}

/** Outcome of {@link Vela.runIndicator}: success carries the live handle, failure the error. */
interface RunIndicatorResult {
    ok: boolean;
    /** The mounted indicator on success; null on failure (it was removed again). */
    handle: IndicatorHandle | null;
    /** The compile/runtime error on failure; null on success. */
    error: Error | null;
    /** Post-mortem context snapshot on failure, when the engine had produced one (else null). */
    context: EngineContextSnapshot | null;
}
/** Optional dependency overrides — inject a different renderer, engines, or data feed (tests, swaps). */
interface VelaDeps {
    renderer?: IChartRenderer;
    /** Scripting engines to register at construction (bulk form of `registerEngine`); default none. */
    engines?: ScriptingEngine[];
    /** Market-data source; default `new MultiProviderFeed()` (a provider registry; offline `data` needs no provider).
     *  A custom feed injected here is used bare — `chart.data` registration is then a no-op. */
    dataFeed?: MarketDataFeed;
}
/**
 * The public, imperative chart. Composition root: wires the built-in native
 * renderer (the default) + provider data feed and delegates orchestration.
 * Optional renderers (e.g. lightweight-charts) are passed in as a class via
 * `options.renderer` and instantiated here, so this module imports only the
 * built-in native renderer. Scripting engines are opt-in — register one with
 * `registerEngine` (no engine ⇒ candles only).
 */
declare class Vela {
    private readonly orchestrator;
    private readonly rendererControl;
    private readonly panesControl;
    private readonly dataControl;
    private readonly drawingsControl;
    constructor(container: HTMLElement | string, options?: VelaOptions, deps?: VelaDeps);
    /**
     * Register a scripting engine so `addIndicator({ language })` can run that
     * language. Vela ships NO engine — install the one you need (Pine Script:
     * `@luxalgo/vela-pinets`) and register it, e.g.
     * `chart.registerEngine('pine', new PineEngine())`; without one the chart
     * displays candles, drawings and native indicators only. Re-registering a
     * language replaces it.
     */
    registerEngine(language: string, engine: ScriptingEngine): this;
    /** Run an indicator script on the chart's market data and render it. */
    addIndicator(source: string, options?: AddIndicatorOptions): IndicatorHandle;
    /**
     * Add a built-in NATIVE indicator (core-computed, no scripting engine) by registered `type` —
     * e.g. `'vpvr'` or `'sma'`. It becomes a first-class indicator (legend row, settings, hide,
     * remove, events). Layer-backed types (`'volume'`, `'vpvr'`) are single-instance — a second
     * call returns the existing handle; the classic studies allow several instances, so each call
     * adds one more. Returns a fail-soft handle for an unregistered type. Native renderer only.
     */
    addNativeIndicator(type: string, options?: {
        inputs?: Record<string, InputValue>;
    }): IndicatorHandle;
    /**
     * The catalog of built-in native indicators with their live state on this chart — each entry's
     * `type`, `title`, whether it `supported`s the current symbol, whether it's already `present`,
     * and whether it allows several instances (`multiInstance`; otherwise a second
     * `addNativeIndicator` is a no-op). Lets a host "add indicator" UI list them, gate unsupported
     * ones, and de-duplicate the single-instance ones. Async because support may probe the
     * provider (a type may need data the symbol lacks).
     */
    availableNativeIndicators(): Promise<NativeIndicatorInfo[]>;
    /**
     * The native-indicator types PRESENT on the chart right now, one entry per instance (a
     * multi-instance type repeats) — the synchronous slice of
     * {@link availableNativeIndicators} (only support probing is async; presence never is).
     * Persistence snapshots read this: an unload-time flush must see an add/remove that
     * happened microseconds ago, which an async catalog mirror cannot guarantee.
     */
    presentNativeIndicators(): string[];
    /** Live handles of every indicator currently on the chart (script + native) — drive
     *  host panels (object trees, indicator lists) with per-id visibility/removal. */
    indicators(): IndicatorHandle[];
    /**
     * Execute an indicator script and INJECT it only if the run succeeds — the seam for
     * host editors and consoles. Resolves `{ ok: true, handle }` after the first
     * successful evaluation, or `{ ok: false, error }` after a compile/runtime failure —
     * in which case the failed indicator is removed again (no dead legend row).
     * Never rejects.
     */
    /**
     * Execute a script and resolve its FIRST computed run — the data-out door for host
     * editors, consoles and dashboards. The script is injected only if it runs (a failure
     * removes it again, leaving no dead legend row), and the result carries the run itself
     * plus the controls for what it put on the chart: `onUpdate` to follow later runs,
     * `remove` to take it off. Never rejects.
     *
     * `runScript` is `runIndicator` with the run as its payload rather than a handle to go
     * fetch from — the same relationship `script:run` has to `context:changed`.
     */
    runScript(source: string, options?: AddIndicatorOptions): Promise<ScriptRunResult>;
    runIndicator(source: string, options?: AddIndicatorOptions): Promise<RunIndicatorResult>;
    /**
     * Switch the chart's market IN PLACE — symbol, provider, timeframe, depth, or offline
     * data — WITHOUT destroying the chart: indicators re-execute over the new bars, native
     * indicators restart, and panes, user drawings, renderer config and event
     * subscriptions all survive. Resolves once the new market's history is painted (a
     * deep backfill continues behind it — await {@link historyComplete}); a call
     * superseded by a newer `setMarket` resolves silently. Emits `market:changed`
     * (with the previous identity) when the market identity changed.
     */
    setMarket(next: MarketSwitch): Promise<void>;
    /** The current market identity — the read counterpart of {@link setMarket}. A snapshot
     *  of the REQUESTED market: it reflects an in-flight switch immediately (before the
     *  new bars land). Listen to `market:changed` for committed identity changes. */
    get market(): MarketSnapshot;
    /** Resolves once the chart is painted and interactive. For a symbol-backed chart this
     *  awaits a provider being registered that resolves the symbol (the parked load). On a
     *  ranged feed the first paint is a small recent head (~200 bars) and the rest of the
     *  history keeps backfilling BEHIND this — await {@link historyComplete} for the full
     *  depth. Distinct from `chart.data.ready()`, which awaits only the provider symbol
     *  indexes. */
    ready(): Promise<void>;
    /** Resolves once the FULL requested history has loaded (immediately for small/offline
     *  charts; after the backward backfill for deep ones — see the `history:progress` /
     *  `history:complete` events). Never rejects: on destroy or a failed backfill it
     *  resolves with whatever depth loaded. */
    historyComplete(): Promise<void>;
    /**
     * A renderer-agnostic snapshot of the graphic elements the core has generated
     * (series, fills, drawings, tables, …) — a deterministic check that a feature was
     * produced, independent of which renderer drew it.
     */
    inspect(): SceneInspection;
    /**
     * The active renderer's control surface. Set/read render features at runtime —
     * common ones (candle colors, `logScale`, `currentPriceLine`) and renderer-specific
     * ones (native `glow`) — with **no indicator re-run**. Unsupported keys warn and no-op:
     * `chart.renderer.set('glow', 0.6)`, `chart.renderer.set({ logScale: true })`.
     */
    get renderer(): RendererControl;
    /**
     * The chart's pane control surface. List panes with the indicators each holds and
     * move/merge/reorder/collapse/maximize them: `chart.panes.list()`,
     * `chart.panes.moveIndicator(id, { newPane: true })`, `chart.panes.collapse(id)`.
     * On a renderer without pane management the mutators warn and no-op.
     */
    get panes(): PanesControl;
    /**
     * The chart's data control surface. Register market-data providers and query the
     * registry: `chart.data.registerProvider('binance', new BinanceProvider())`,
     * `chart.data.resolve('BTCUSDT')`, `chart.data.symbols('binance')`, and
     * `chart.data.ready()` (provider indexes settled). No provider is bundled —
     * registering the one that resolves the chart symbol fires the parked initial load
     * (await it with `chart.ready()`).
     */
    get data(): DataControl;
    /**
     * The chart's user-drawings control surface. Activate tools, create/mutate
     * drawings programmatically, and persist them:
     * `chart.drawings.setTool('trendline')`, `chart.drawings.add('hline', { … })`,
     * `chart.drawings.toJSON()/fromJSON(doc)`. Always present; on a renderer without
     * the `userDrawings` capability the interactive methods warn + no-op while
     * persistence still round-trips. Enable the on-chart toolbar with
     * `new Vela(el, { drawings: true })` or `chart.drawings.showToolbar()`.
     */
    get drawings(): DrawingsControl;
    on<K extends keyof VelaEventMap>(event: K, handler: (payload: VelaEventMap[K]) => void): () => void;
    /** The current visible time range (`from`/`to` in epoch-ms), or null before data loads. */
    getVisibleRange(): VisibleRange | null;
    /** Set the visible time range explicitly (epoch-ms). Use for a custom date range. */
    setVisibleRange(range: VisibleRange): this;
    /**
     * Pan the view by a fraction of the visible width — positive ⇒ toward the latest
     * bars, negative ⇒ into history. Behaves exactly like dragging the chart: constant
     * zoom, the same pan limits (forward stops at the newest candle plus the bounded
     * empty space), and eased on renderers that animate pans. Repeated calls stack into
     * one continuous scroll.
     */
    panBy(fraction: number): this;
    /**
     * Frame a named date-range preset over the loaded bars: `'1D'`, `'1W'`, `'1M'`,
     * `'3M'`, `'6M'`, `'1Y'`, `'YTD'`, or `'ALL'`. A preset deeper than the loaded
     * history simply frames everything (it doesn't fetch more bars).
     */
    setVisibleRangePreset(preset: VisibleRangePreset): this;
    resize(): void;
    /**
     * Swap the app theme at runtime — `'dark'`, `'light'`, or a full custom
     * {@link VelaTheme}. Re-skins the chart surface, axes, legends and in-chart chrome
     * live (no indicator re-run, no rebuild) and emits `theme:changed` with the resolved
     * theme so host chrome around the chart can follow. Explicitly customized plot
     * cosmetics (a config-set background or series color) are re-based only when they
     * were inherited from the previous theme.
     */
    setTheme(theme: ThemeName | VelaTheme): this;
    destroy(): void;
}

/** The runtime surface an action's `when`/`run` receives. */
interface WidgetContext {
    /** The CURRENT inner chart. Read it through this getter rather than capturing it:
     *  a shell may replace its chart instance, and a captured one would be destroyed.
     *  (Symbol and timeframe switches are applied IN PLACE — the instance survives them.) */
    chart: Vela;
    /** LIVE getters, like `chart` — they resolve the ACTIVE cell's market at every
     *  read, so an attachment that holds its mount context keeps reading the truth
     *  after a symbol/timeframe switch. Read them at the point of use; never copy
     *  them into long-lived state. */
    symbol: string;
    timeframe: string;
    priceStyle: string;
    setSymbol(symbol: string): void;
    setTimeframe(tf: string): void;
    setPriceStyle(style: string): void;
    openSymbolSearch(query?: string): void;
    /** Open/close a docked side panel by id (built-in or contributed) — a bare call flips
     *  it. The dock stays exclusive: opening one closes whichever was showing. Unknown ids
     *  are ignored. The seam a plugin uses to open ITS OWN panel programmatically. */
    togglePanel(id: string, open?: boolean): void;
    /** The widget's root element — pass it as `host` when mounting kit components
     *  (Dialog/Menu/Tooltip) from an action; without an explicit host they portal to
     *  the body, OUTSIDE the theme variables. A multi-chart shell hands its own root. */
    host: HTMLElement;
    /** The widget's feedback pill (bottom-center, auto-hides). */
    toast(message: string, kind?: 'info' | 'success' | 'error'): void;
    /** Add a SCRIPT indicator to the active chart THROUGH THE SHELL — unlike the raw
     *  `chart.addIndicator`, the addition enters the unified undo/redo timeline, the
     *  topbar indicator count, and the shell's bookkeeping. The entry's source rides the
     *  recorded action, so redo re-adds it even after the original handle died. The
     *  shell does NOT persist these across reloads (they are not manifest entries) —
     *  a plugin that wants them back owns that via {@link registerStatePersistence}. */
    addIndicator(entry: ExternalIndicatorEntry): void;
    /** Add a native (core-computed) indicator to the active chart through the shell —
     *  recorded in the undo/redo timeline, unlike the raw `chart.addNativeIndicator`. */
    addNativeIndicator(type: string): void;
    /** Tell the shell some PERSISTABLE third-party state changed (a debounced
     *  `state:changed` + storage write follows). Only needed for state with no shell
     *  event of its own — indicator adds/removals already trigger the save cycle. */
    stateChanged(): void;
}
/** What {@link WidgetContext.addIndicator} takes: a named script, ready to run. */
interface ExternalIndicatorEntry {
    name: string;
    /** The script source (the recorded undo/redo action re-adds from it). */
    script: string;
    /** Engine language (default: the chart's default engine). */
    language?: string;
    /** Input-value overrides applied at add time (what a persistence handler restores). */
    inputs?: Record<string, InputValue>;
    /** Declaration-prop overrides applied at add time. */
    props?: Record<string, InputValue>;
}
/** Where an action is projected. */
type WidgetActionTarget = 'topbar' | 'context:body' | 'context:price-axis' | 'context:time-axis';
interface WidgetActionDescriptor {
    /** Stable id — re-registering an id replaces it. */
    id: string;
    target: WidgetActionTarget;
    /** Always required, even icon-only: it is the button's aria-label and tooltip, the
     *  mobile drawer row's text, and the context-menu item's label. */
    label: string;
    /** Icon id from the `vela/ui` icon registry (register yours with `registerIcon`). */
    icon?: string;
    /** Topbar only: render the DESKTOP button icon-only, like the built-in tools — the
     *  `label` moves to the aria-label and a kit tooltip instead of button text (mobile
     *  surfaces keep their text). The right cluster gets the native 32px tool look; the
     *  left cluster keeps the primary chrome, minus the text. Requires `icon` — without
     *  one the flag is ignored (with a console warning) and the label renders. The piece
     *  that makes a `'screenshot'` slot override pixel-faithful to the native button. */
    iconOnly?: boolean;
    /** Sort key within the contributed group (ascending; default 0). */
    order?: number;
    /** Topbar only: which cluster the button joins. `'right'` (default) is the
     *  right-hand tools cluster; `'left'` puts it with the PRIMARY chrome buttons —
     *  right after the style/layout dropdowns, styled like them (the spot and look of
     *  the built-in Indicators button, for actions that replace it). */
    align?: 'left' | 'right';
    /** Runtime gate — omitted ⇒ always shown. */
    when?: (ctx: WidgetContext) => boolean;
    run: (ctx: WidgetContext) => void;
}
/**
 * A widget ATTACHMENT — a contributed unit of per-widget behavior/UI beyond a single
 * button: overlays, gesture handlers, custom key handling. `mount` runs once per
 * widget (at construction, or on `refreshActions()` for late registrations) with the
 * widget's {@link WidgetContext}; the returned disposer runs at widget destroy.
 * Everything the attachment touches must come from `ctx` (never module globals).
 */
interface WidgetAttachment {
    /** Stable id — re-registering an id replaces it (mounted widgets keep the old one until destroy). */
    id: string;
    mount(ctx: WidgetContext): () => void;
}
/**
 * A contributed side panel's runtime handle — what `mount` hands back. Every member is
 * optional: a panel that only paints its body once needs none of them.
 */
interface SidePanelHandle {
    /** (Re)bind to a chart instance: on mount, after every widget rebuild, and — in a
     *  workspace — whenever the active cell changes. */
    onChart?(chart: Vela): void;
    /** The panel just became visible. Panels that render lazily do it here. */
    onOpen?(): void;
    /** Released when the panel is dropped (widget destroy, or a re-registration). */
    destroy?(): void;
}
/**
 * The header surface a contributed panel may use: a SLOT between the title and the close
 * button for compact controls (a document name, action icons), and the title text itself.
 * Everything else in the header (the close button, the row) stays the shell's.
 */
interface SidePanelHeader {
    /** Lay out inline controls here; the close button stays pinned right of it. */
    slot: HTMLElement;
    /** Replace the header title (an empty string hides it). The topbar toggle keeps the
     *  DECLARED `title` as its tooltip. */
    setTitle(title: string): void;
}
/**
 * A contributed SIDE PANEL — a docked column in the shell's panel dock, alongside the object
 * tree and the data window, with a toggle button in the topbar's panel group.
 *
 * The shell owns the chrome (header, close button, dock exclusivity, the button and its pressed
 * state) and hands `mount` the panel's BODY element to fill — plus a {@link SidePanelHeader}
 * for panels that dock controls in their header; the contribution never reaches into
 * the shell's DOM. Register at import time, before widgets are constructed (`refreshActions()`
 * picks up later registrations on an already-built widget).
 */
interface SidePanelDescriptor {
    /** Stable id — re-registering an id replaces it. Also the key its width persists under. */
    id: string;
    /** Header title, and the tooltip of its topbar button. */
    title: string;
    /** Icon id from the `vela/ui` icon registry (register yours with `registerIcon`). */
    icon: string;
    /** Sort key among the panel buttons (ascending; default 100 — after the built-ins). */
    order?: number;
    /** Declared width in px (default 280). */
    width?: number;
    /** Let the user drag the panel's inner edge (default false — a fixed column). */
    resizable?: boolean;
    minWidth?: number;
    maxWidth?: number;
    /** Float over the chart's right edge instead of docking beside it: the chart keeps its
     *  width and layout, and the panel covers its right-hand part (default false — a docked
     *  column that shrinks the chart). For panels wide enough that a column would crush
     *  the plot. The dock stays exclusive either way. */
    overlay?: boolean;
    mount(ctx: WidgetContext, body: HTMLElement, header: SidePanelHeader): SidePanelHandle | void;
}
/** One panel toggle, as the shell's chrome consumes it (data, never DOM). */
interface SidePanelButton {
    id: string;
    title: string;
    icon: string;
}
/** Register (or replace) a widget attachment. Returns an unregister disposer. */
declare function registerWidgetAttachment(att: WidgetAttachment): () => void;
declare function unregisterWidgetAttachment(id: string): void;
/** Every registered attachment (registration order). */
declare function widgetAttachments(): WidgetAttachment[];
/** Sort key of a panel that declares none — after the shell's own panels. */
declare const DEFAULT_PANEL_ORDER = 100;
/** Register (or replace) a side panel. Returns an unregister disposer. */
declare function registerSidePanel(desc: SidePanelDescriptor): () => void;
declare function unregisterSidePanel(id: string): void;
/** Every registered side panel, `order`-sorted (registration order breaks ties). */
declare function sidePanels(): SidePanelDescriptor[];
/** The built-in topbar slots a contributed action may TAKE OVER by registering under
 *  their id — the "simple button" slots. The composites (symbol, timeframes, style,
 *  layout, undo-redo, alerts, panels) are stateful controls the shell pushes state
 *  into; a plain `{label, icon, run}` descriptor cannot stand in for them. */
declare const OVERRIDABLE_TOPBAR_IDS: readonly ["indicators", "screenshot"];
/**
 * The action OVERRIDING a built-in topbar slot, if one is registered — an action whose
 * `id` IS the built-in id. An override takes the slot's WHOLE surface: the desktop
 * button (at the slot's position), the mobile counterpart, and the keyboard chord all
 * route to `run`, and the native machinery behind the slot (the built-in indicator
 * picker) is not constructed. Shells resolve this at construction — register at import
 * time, like every contribution.
 */
declare function topbarActionOverride(id: string): WidgetActionDescriptor | undefined;
/** Register (or replace) a widget action. Widgets read the registry live.
 *  Registering under a RESERVED built-in topbar id (`'indicators'`, `'screenshot'`)
 *  OVERRIDES that slot — see {@link topbarActionOverride}. Built-in ids that are
 *  stateful composites cannot be overridden and the registration is refused. */
declare function registerWidgetAction(desc: WidgetActionDescriptor): () => void;
declare function unregisterWidgetAction(id: string): void;
/** Actions for one target, `order`-sorted, `when`-filtered when a context is given. */
declare function widgetActions(target: WidgetActionTarget, ctx?: WidgetContext): WidgetActionDescriptor[];
/** What a legend action sees about the indicator whose row it sits on. */
interface LegendIndicatorInfo {
    id: string;
    title: string;
    /** The script source the indicator was added with; undefined for a NATIVE
     *  (core-computed) indicator. The usual `when` gate for source-centric actions. */
    source?: string;
}
/**
 * A contributed LEGEND-ROW action: an icon button on every indicator's legend row,
 * revealed with the built-in controls (hover/selection), between them and the ✕.
 * `when` gates per indicator (e.g. `(ind) => ind.source !== undefined` for actions
 * that need the script). `run` receives the shell's {@link WidgetContext} and the row's
 * {@link LegendIndicatorInfo}.
 */
interface LegendActionDescriptor {
    /** Stable id — re-registering an id replaces it. */
    id: string;
    /** Icon id from the `vela/ui` icon registry (register yours with `registerIcon`). */
    icon: string;
    tooltip: string;
    /** Sort key within the contributed group (ascending; default 0). */
    order?: number;
    /** Per-indicator gate — omitted ⇒ shown on every row. */
    when?: (indicator: LegendIndicatorInfo) => boolean;
    run(ctx: WidgetContext, indicator: LegendIndicatorInfo): void;
}
/** Register (or replace) a legend action. Returns an unregister disposer. */
declare function registerLegendAction(desc: LegendActionDescriptor): () => void;
declare function unregisterLegendAction(id: string): void;
/** Every registered legend action, `order`-sorted (registration order breaks ties). */
declare function legendActions(): LegendActionDescriptor[];
/** One block of a legend callout's deployed panel, descriptor-side: plain text, or a
 *  button whose `run` receives the shell's {@link WidgetContext} and the row's
 *  indicator — the same signature as a legend action's `run`. */
type LegendCalloutItem = {
    type: 'text';
    text: string;
} | {
    type: 'button';
    label: string;
    /** Emphasized (selection-colored) button — the panel's main action. */
    primary?: boolean;
    /** Close the panel after `run` (default true). */
    close?: boolean;
    run(ctx: WidgetContext, indicator: LegendIndicatorInfo): void;
};
/** The panel a clickable callout deploys: an optional heading over ordered blocks. */
interface LegendCalloutContent {
    title?: string;
    items: LegendCalloutItem[];
}
/** A callout's resolved presentation for one row — what {@link LegendCalloutDescriptor.callout} returns. */
interface LegendCalloutSpec {
    /** Icon id from the `vela/ui` icon registry (register yours with `registerIcon`). */
    icon: string;
    /** Bubble fill — any CSS color (`color-mix` token washes match the built-in badges). */
    background: string;
    /** Icon ink (default: the legend row's text color). */
    color?: string;
    /** Hover text; also the bubble's accessible name. */
    tooltip: string;
    /** Deployed panel — presence makes the bubble clickable. */
    content?: LegendCalloutContent;
}
/**
 * A contributed LEGEND CALLOUT: a small tinted bubble with a centered icon, visible
 * right of the indicator's legend title while the row is idle (hidden while its
 * hover/selection controls are out). When the spec carries `content`, clicking the
 * bubble deploys that panel — below it, flipping above near the bottom screen edge.
 *
 * Unlike a legend action's static icon, a callout's whole presentation is resolved
 * per row through `callout` — return `null` to show none (the per-indicator gate),
 * or a spec whose icon/tint/panel follow your own state (a market-status bubble
 * changes dress as sessions roll). Late state changes re-project through the shells'
 * `refreshActions()`, like every contribution.
 */
interface LegendCalloutDescriptor {
    /** Stable id — re-registering an id replaces it. */
    id: string;
    /** Sort key within the contributed group (ascending; default 0). */
    order?: number;
    /** Resolve the row's bubble — `null`/`undefined` shows none. */
    callout(indicator: LegendIndicatorInfo): LegendCalloutSpec | null | undefined;
}
/** Register (or replace) a legend callout. Returns an unregister disposer. */
declare function registerLegendCallout(desc: LegendCalloutDescriptor): () => void;
declare function unregisterLegendCallout(id: string): void;
/** Every registered legend callout, `order`-sorted (registration order breaks ties). */
declare function legendCallouts(): LegendCalloutDescriptor[];
/**
 * The surface a `scope: 'cell'` persistence handler works against — bound to ONE cell
 * (never the active one by proxy), because serialize/restore run per cell, including
 * cells that are not active. `addIndicator`/`addNativeIndicator` target THIS cell and
 * are ALWAYS muted — unlike their {@link WidgetContext} namesakes they never enter the
 * undo timeline, even from an async `restore` continuation (fetch, then add): applying
 * a document is state application, not a user edit.
 */
interface CellStateContext {
    /** The cell's durable identity (`'c1'`, a declared name). */
    cellId: string;
    /** The cell's LIVE chart. */
    chart: Vela;
    /** Add a script indicator to THIS cell through the shell (see {@link WidgetContext.addIndicator}). */
    addIndicator(entry: ExternalIndicatorEntry): void;
    /** Add a native indicator to THIS cell through the shell. */
    addNativeIndicator(type: string): void;
}
/**
 * A third-party STATE PERSISTENCE handler — how a plugin puts its own state into the
 * shell's persisted document (the `ext` bag of `WorkspaceState` / per-chart state)
 * instead of running a parallel store. `key` is namespaced (`'vendor.feature'`) and
 * flat — one entry per handler. `serialize` runs on every shell snapshot (`getState`,
 * the persist write) and returns a JSON-serializable payload, or `undefined` for "no
 * entry". `restore` runs when a document carrying the key is applied (boot restore,
 * `applyState`) — AFTER the core state (chart alive, engines registered, indicator
 * ledger converged) and, for cell scope, inside the cell's history-mute, so nothing it
 * does enters undo/redo. The payload is UNTRUSTED (the codec passes `ext` through
 * opaquely): validate it. `restore` is only called for keys present in the document.
 *
 * Register at import time, before shells are constructed — the rule every contribution
 * registry shares. A key with no registered handler still round-trips verbatim, so a
 * session without the plugin never loses its state.
 */
type StatePersistenceHandler = {
    /** Namespaced entry key (`'velapro.indicators'`) — re-registering a key replaces it. */
    key: string;
    /** Where the entry lives: per chart (`charts[i].ext`) — follows the cell through pool/layout moves. */
    scope: 'cell';
    serialize(ctx: CellStateContext): unknown;
    restore(payload: unknown, ctx: CellStateContext): void;
} | {
    key: string;
    /** Document root (`state.ext`) — one entry per document, whatever the grid. */
    scope: 'global';
    serialize(ctx: WidgetContext): unknown;
    restore(payload: unknown, ctx: WidgetContext): void;
};
/** Register (or replace) a state-persistence handler. Returns an unregister disposer. */
declare function registerStatePersistence(handler: StatePersistenceHandler): () => void;
declare function unregisterStatePersistence(key: string): void;
/** The registered handlers of one scope (registration order). */
declare function statePersistenceHandlers<S extends StatePersistenceHandler['scope']>(scope: S): Array<Extract<StatePersistenceHandler, {
    scope: S;
}>>;
/**
 * Reorder the symbol picker's AGGREGATED pool — every source combined, exactly what
 * the search dialog displays. Called when the pool changes (a provider's index lands
 * or refreshes), NOT per keystroke: the picker caches the result. May be async (a
 * server-fetched top list) — the picker shows the current order and refreshes when
 * the promise resolves.
 *
 * The returned list may INJECT descriptors absent from the pool (they must carry
 * their `provider` and be genuinely servable, or selecting them parks the load) and
 * may OMIT entries (hiding them). The picker dedupes by venue+ticker, FIRST
 * occurrence winning — injecting at the head fixes both position and display data.
 *
 * While a ranking is registered, the picker's built-in empty-query pin (the hardcoded
 * majors) stands down: the head of YOUR list is the dialog's opening screen. Under a
 * typed query the relevance tiers still lead — the ranking orders within each tier.
 */
type SymbolRankingHook = (pool: SymbolDescriptor[]) => SymbolDescriptor[] | Promise<SymbolDescriptor[]>;
/** Register (or replace — ONE ranking at a time, last wins) the symbol ranking.
 *  Returns an unregister disposer. Register at import time, like every contribution. */
declare function registerSymbolRanking(hook: SymbolRankingHook): () => void;
/** The registered ranking, if any — what the shells' symbol picker consults. */
declare function symbolRanking(): SymbolRankingHook | undefined;
/** Makes ONE engine instance for ONE chart — engines hold per-chart sessions (and
 *  possibly a worker), so the shell calls the factory per chart build, never shares. */
type EngineFactory = () => ScriptingEngine;
/**
 * Register (or replace) a DEFAULT scripting engine for a language: every widget and
 * workspace cell built afterwards registers `make()` on its chart automatically — the
 * app-level wiring for hosts that pair Vela with an engine package, same shape as the
 * other contribution registries. A per-instance `engines` option still wins for the
 * same language, and the bare `Vela` chart is untouched: with nothing registered here,
 * nothing changes anywhere (there is still no bundled default engine).
 */
declare function registerDefaultEngine(language: string, make: EngineFactory): () => void;
declare function unregisterDefaultEngine(language: string): void;
/** The registered defaults merged UNDER `overrides` — per-instance factories win per
 *  language. The shell layers (widget, workspace cell) register exactly this result. */
declare function resolveEngines(overrides?: Record<string, EngineFactory>): Record<string, EngineFactory>;

export { TypedEventBus as $, type RunIndicatorResult as A, type BarsChangeReason as B, type CellStateContext as C, type DrawingsDocument as D, type ExternalIndicatorEntry as E, type FetchSeries as F, type SceneInspection as G, type ScriptRunCause as H, type IndicatorHandle as I, type ScriptRunResult as J, type SidePanelButton as K, type LegendActionDescriptor as L, type SidePanelDescriptor as M, type NativeIndicator as N, OVERRIDABLE_TOPBAR_IDS as O, type ParsedSymbol as P, type SidePanelHandle as Q, type Resolved as R, type ScriptingEngine as S, type SidePanelHeader as T, type StatePersistenceHandler as U, Vela as V, type WidgetContext as W, type StrategyFill as X, type StrategyState as Y, type StrategyTrade as Z, type SymbolRankingHook as _, type ScriptRun as a, type VelaDeps as a0, type VelaEventMap as a1, type VisibleBarRange as a2, type WidgetActionDescriptor as a3, type WidgetActionTarget as a4, type WidgetAttachment as a5, getNativeIndicator as a6, legendActions as a7, legendCallouts as a8, nativeIndicatorDescriptors as a9, nativeIndicatorTypes as aa, registerDefaultEngine as ab, registerLegendAction as ac, registerLegendCallout as ad, registerNativeIndicator as ae, registerSidePanel as af, registerStatePersistence as ag, registerSymbolRanking as ah, registerWidgetAction as ai, registerWidgetAttachment as aj, resolveEngines as ak, sidePanels as al, statePersistenceHandlers as am, symbolRanking as an, topbarActionOverride as ao, unregisterDefaultEngine as ap, unregisterLegendAction as aq, unregisterLegendCallout as ar, unregisterNativeIndicator as as, unregisterSidePanel as at, unregisterStatePersistence as au, unregisterWidgetAction as av, unregisterWidgetAttachment as aw, widgetActions as ax, widgetAttachments as ay, DEFAULT_PANEL_ORDER as az, type ContextSelect as b, DataControl as c, DrawingsControl as d, type EngineAlert as e, type EngineCapabilities as f, type EngineContextSnapshot as g, type EngineFactory as h, type EngineWarning as i, type ExecutionHandlers as j, type ExecutionMarket as k, type ExecutionRequest as l, type ExecutionSession as m, type IndicatorEventMap as n, type IndicatorSummary as o, type LegendCalloutContent as p, type LegendCalloutDescriptor as q, type LegendCalloutItem as r, type LegendCalloutSpec as s, type LegendIndicatorInfo as t, type NativeIndicatorContext as u, type NativeIndicatorDescriptor as v, type NativeIndicatorInfo as w, type NativeIndicatorOutput as x, type PreparedScript as y, RendererControl as z };
