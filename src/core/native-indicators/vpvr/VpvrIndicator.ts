import type { InputSchema, InputValue } from '../../model/inputs';
import type { OHLCV } from '../../model/ohlcv';
import type { PriceLine } from '../../model/scene';
import type { SeriesDisplay, SeriesSpec } from '../../model/series';
import type { VpvrLayerData } from '../../model/volume-layers';
import type { VisibleRange } from '../../ports/IChartRenderer';
import type { NativeIndicator, NativeIndicatorContext, NativeIndicatorDescriptor, NativeIndicatorOutput } from '../NativeIndicator';
import { getNativeIndicator, registerNativeIndicator } from '../NativeIndicator';
import { stableSeriesId } from '../../model/identity';
import { transp } from '../classics/shared';
import { buildVpvrDevelopingAt, buildVpvrProfile, vpvrLevels, type VpvrProfile } from '../../../renderers/native/vpvr/profile';
import { timeframeToMs } from '../../../data/timeframe';

// TradingView's factory defaults for its VRVP (VbPVisible@tv-volumebyprice metainfo, read 2026-10-30).
const TV_BLUE = '#2962ff'; // palette-exempt: TradingView's VRVP up volume, VAH / VAL and developing VA colour
const TV_YELLOW = '#fbc02d'; // palette-exempt: TradingView's VRVP down volume colour
const TV_RED = '#f44336'; // palette-exempt: TradingView's VRVP POC and developing POC colour
const VALUES_GRAY = '#787b86'; // palette-exempt: row values, readable on dark and light (TradingView themes this)

const DEFAULT_ROWS = 24;
const DEFAULT_WIDTH_PCT = 30;
const DEFAULT_VALUE_AREA_PCT = 70;
const DEFAULT_UP = transp(TV_BLUE, 75);
const DEFAULT_DOWN = transp(TV_YELLOW, 75);
const DEFAULT_VA_UP = transp(TV_BLUE, 30);
const DEFAULT_VA_DOWN = transp(TV_YELLOW, 30);

const ROWS_LAYOUTS = ['Number Of Rows', 'Ticks Per Row'] as const;
const VOLUME_MODES = ['Up/Down', 'Total', 'Delta'] as const;
const PLACEMENTS = ['Right', 'Left'] as const;
const WIDTHS = ['1', '2', '3', '4'] as const;
const STYLE = 'Style';

function num(v: InputValue | undefined, fallback: number): number {
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: InputValue | undefined, fallback: string): string {
    return typeof v === 'string' && v !== '' ? v : fallback;
}

function bool(v: InputValue | undefined, fallback: boolean): boolean {
    return typeof v === 'boolean' ? v : fallback;
}

/** The price height of one row in "Ticks Per Row" (ticks times the symbol's tick), undefined in "Number Of Rows". */
function rowSizeOf(inputs: Record<string, InputValue>, tick: number | undefined): number | undefined {
    if (inputs.rowsLayout !== 'Ticks Per Row' || !(tick != null && tick > 0)) return undefined;
    return Math.max(1, Math.round(num(inputs.rows, DEFAULT_ROWS))) * tick;
}

/** Resolve the input record into the layer payload (clamped, fraction-normalized). `tick` = the symbol's tick. */
export function vpvrLayerData(inputs: Record<string, InputValue>, tick?: number): VpvrLayerData {
    const mode = inputs.volume === 'Total' ? 'total' : inputs.volume === 'Delta' ? 'delta' : 'updown';
    const rowSize = rowSizeOf(inputs, tick);
    return {
        rows: Math.round(Math.min(1_000_000, Math.max(1, num(inputs.rows, DEFAULT_ROWS)))),
        ...(rowSize != null ? { rowSize } : {}),
        volumeMode: mode,
        widthFrac: Math.min(1, Math.max(0.01, num(inputs.widthPct, DEFAULT_WIDTH_PCT) / 100)),
        placement: inputs.placement === 'Left' ? 'left' : 'right',
        upColor: str(inputs.upColor, DEFAULT_UP),
        downColor: str(inputs.downColor, DEFAULT_DOWN),
        vaUpColor: str(inputs.vaUpColor, DEFAULT_VA_UP),
        vaDownColor: str(inputs.vaDownColor, DEFAULT_VA_DOWN),
        showProfile: bool(inputs.showProfile, true),
        showValues: bool(inputs.showValues, false),
        valuesColor: str(inputs.valuesColor, VALUES_GRAY),
        // TradingView draws the POC as a line (emitted by the indicator), not as an outlined row.
        showPoc: false,
        valueAreaFrac: Math.min(1, Math.max(0, num(inputs.valueAreaPct, DEFAULT_VALUE_AREA_PCT) / 100)),
    };
}

/** Index of the last bar opening at or before `t` (0 when every bar opens after it). */
function barAtOrBefore(bars: readonly OHLCV[], t: number): number {
    let lo = 0;
    let hi = bars.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (bars[mid]!.time <= t) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

/** A tick when the symbol reports none: a power of ten near 1/100 000 of the price (0.1 at 77 000). */
function fallbackTick(bars: readonly OHLCV[]): number | undefined {
    const c = bars[bars.length - 1]?.close;
    if (!(c != null && c > 0)) return undefined;
    return 10 ** Math.floor(Math.log10(c * 1e-5));
}

/** One TradingView line row (VAH, VAL, POC, Developing POC / VA): its switch, colour and width keys. */
interface LineRow {
    show: string;
    color: string;
    width: string;
}
const LINE_ROWS = {
    vah: { show: 'showVah', color: 'vahColor', width: 'vahWidth' },
    val: { show: 'showVal', color: 'valColor', width: 'valWidth' },
    poc: { show: 'showPoc', color: 'pocColor', width: 'pocWidth' },
    devPoc: { show: 'showDevPoc', color: 'devPocColor', width: 'devPocWidth' },
    devVa: { show: 'showDevVa', color: 'devVaColor', width: 'devVaWidth' },
} as const satisfies Record<string, LineRow>;

/** The Style-tab row of one line: "[x] Title [colour] [width]" on one line, as TradingView lays it out. */
function lineRow(row: LineRow, title: string, show: boolean, color: string, width: number): InputSchema[] {
    return [
        { key: row.show, title, type: 'bool', defval: show, inline: row.show, tab: STYLE },
        { key: row.color, title: '', type: 'color', defval: color, inline: row.show, tab: STYLE },
        { key: row.width, title: '', type: 'int', defval: width, options: WIDTHS, inline: row.show, tab: STYLE },
    ];
}

type Levels = { poc: number; vah: number; val: number };

/**
 * TradingView's timeframe ladder for its volume profiles (help article 43000703076): the first of these that puts
 * fewer than 5 000 candles in the window is the one the profile is built from.
 */
export const VPVR_INTRABAR_LADDER = ['1', '5', '15', '30', '60', '240', 'D'] as const;
const MAX_INTRABARS = 5000;

/** The finer timeframe TradingView builds a profile over `spanMs` from. */
export function vpvrIntrabarTimeframe(spanMs: number): string {
    for (const tf of VPVR_INTRABAR_LADDER) if (spanMs / timeframeToMs(tf) < MAX_INTRABARS) return tf;
    return VPVR_INTRABAR_LADDER[VPVR_INTRABAR_LADDER.length - 1]!;
}

/** Live ticks refresh the finer candles and the levels at most this often. */
const LIVE_REFRESH_MS = 1000;

/** Finer candles loaded for a window: the timeframe, the span asked for (ms) and what came back. */
interface Intrabars {
    tf: string;
    from: number;
    to: number;
    bars: readonly OHLCV[];
}

/**
 * The built-in VPVR (visible-range volume profile) indicator, with TradingView's settings and TradingView's data:
 * the rows are built from finer candles than the chart's (TradingView's ladder, `vpvrIntrabarTimeframe`), each
 * candle's volume spread evenly over its high-low and counted up when it closed above its open. Measured on
 * BYBIT:BTCUSDT.P 1h (39 bars, 24 rows) on 2026-10-30: built from the 1h candles, 33 % of the volume sat in a
 * different row or side than TradingView's; from Bybit's 1m candles, 0.2 %.
 *
 * This instance builds the rows and hands them to the renderer layer, and emits the POC / VAH / VAL and developing
 * lines. A host without `loadBars` (or a chart already at the ladder's timeframe) builds from the chart's bars.
 */
class VpvrIndicator implements NativeIndicator {
    /** Null until start() — pre-start setInputs/resume must record without pushing. */
    private ctx: NativeIndicatorContext | null = null;
    private inputs: Record<string, InputValue> = {};
    private tick: number | undefined;
    private range: VisibleRange | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private suspended = false;
    private intrabars: Intrabars | null = null;
    /** Bumped per request: an answer for a window the user has scrolled away from is dropped. */
    private request = 0;
    private loadingKey = '';

    start(ctx: NativeIndicatorContext, inputs: Record<string, InputValue>): void {
        this.ctx = ctx;
        this.inputs = inputs;
        ctx.emit({}); // mount the legend row (the layer draws the rows outside the model)
        this.recompute();
        // The tick: "Ticks Per Row" rows, and the row height TradingView rounds up to whole ticks.
        void ctx.data
            .symbolInfo(ctx.symbol)
            .then((info) => {
                const t = info?.mintick;
                if (this.ctx !== ctx || !(typeof t === 'number' && t > 0)) return;
                this.tick = t;
                this.recompute();
            })
            .catch(() => undefined);
    }

    /** Live ticks move the forming bar: refresh, at most every {@link LIVE_REFRESH_MS}. */
    onBars(): void {
        if (this.timer != null || this.suspended || !this.ctx) return;
        this.timer = setTimeout(() => {
            this.timer = null;
            this.refreshTail();
            this.recompute();
        }, LIVE_REFRESH_MS);
    }

    /** The window moved: rebuild for it (TradingView also recomputes after a scroll). */
    onViewport(range: VisibleRange): void {
        this.range = range;
        this.recompute();
    }

    setInputs(inputs: Record<string, InputValue>): void {
        this.inputs = inputs;
        // Pre-start edits (a workspace restore applies stored inputs the moment the
        // handle exists) just record: start() pushes the orchestrator's replayed values.
        if (!this.ctx) return;
        this.recompute();
    }

    /** Hiding is a renderer-layer flag (set via `setIndicatorVisible`); only the live timer stops. */
    suspend(): void {
        this.suspended = true;
        this.clearTimer();
    }

    resume(): void {
        this.suspended = false;
        // Pre-start resume (a restore un-hiding an indicator that never started) is a
        // no-op — start() pushes when the context lands.
        if (!this.ctx) return;
        this.recompute();
    }

    stop(): void {
        this.clearTimer();
        this.request += 1;
        this.ctx = null;
    }

    private clearTimer(): void {
        if (this.timer != null) clearTimeout(this.timer);
        this.timer = null;
    }

    private layerData(bars: readonly OHLCV[]): VpvrLayerData {
        const ticks = this.inputs.rowsLayout === 'Ticks Per Row';
        return vpvrLayerData(this.inputs, ticks ? (this.tick ?? fallbackTick(bars)) : undefined);
    }

    /** The window as chart bars: the first bar opening at or after its left edge through the last opening in it. */
    private window(bars: readonly OHLCV[]): { i0: number; i1: number; from: number; end: number; chartMs: number } | null {
        const range = this.range;
        if (!range || bars.length === 0) return null;
        let i0 = barAtOrBefore(bars, range.from);
        if (bars[i0]!.time < range.from && i0 < bars.length - 1) i0 += 1;
        const i1 = Math.max(i0, barAtOrBefore(bars, range.to));
        let chartMs = NaN;
        try {
            chartMs = timeframeToMs(this.ctx?.timeframe ?? '');
        } catch {
            chartMs = NaN;
        }
        const step = Number.isFinite(chartMs) && chartMs > 0 ? chartMs : i1 > i0 ? (bars[i1]!.time - bars[i0]!.time) / (i1 - i0) : 60_000;
        const end = i1 + 1 < bars.length ? bars[i1 + 1]!.time : bars[i1]!.time + step;
        return { i0, i1, from: bars[i0]!.time, end, chartMs: step };
    }

    /** Load the finer candles for `[from, end)`; recompute when they land (if the window still wants them). */
    private load(tf: string, from: number, end: number): void {
        const ctx = this.ctx;
        if (!ctx?.loadBars) return;
        const key = `${tf}:${from}:${end}`;
        if (key === this.loadingKey) return; // already asked
        this.loadingKey = key;
        const req = ++this.request;
        ctx.setStatus('loading');
        ctx.loadBars(tf, { from, to: end - 1 })
            .then((bars) => {
                if (req !== this.request || this.ctx !== ctx) return;
                this.loadingKey = '';
                this.intrabars = { tf, from, to: end, bars };
                ctx.setStatus('idle');
                this.recompute();
            })
            .catch(() => {
                if (req !== this.request || this.ctx !== ctx) return;
                this.loadingKey = '';
                // No finer candles for this market: build from the chart's own bars for this window.
                this.intrabars = { tf, from, to: end, bars: [] };
                ctx.setStatus('idle');
                this.recompute();
            });
    }

    /** Live: re-read the newest finer candles when the window reaches the forming bar. */
    private refreshTail(): void {
        const ctx = this.ctx;
        const ib = this.intrabars;
        if (!ctx?.loadBars || !ib || ib.bars.length === 0) return;
        const bars = ctx.bars();
        const w = this.window(bars);
        if (!w || w.i1 < bars.length - 1) return;
        const step = timeframeToMs(ib.tf);
        const from = ib.bars[ib.bars.length - 1]!.time;
        const end = Math.max(w.end, from + step);
        ctx.loadBars(ib.tf, { from, to: end - 1 })
            .then((fresh) => {
                if (this.intrabars !== ib || this.ctx !== ctx || fresh.length === 0) return;
                const keep = ib.bars.filter((b) => b.time < fresh[0]!.time);
                this.intrabars = { ...ib, to: Math.max(ib.to, end), bars: keep.concat(fresh) };
                this.recompute();
            })
            .catch(() => undefined);
    }

    /** Build the rows and the lines for the current window, from the finer candles when the host gives them. */
    private recompute(): void {
        const ctx = this.ctx;
        if (!ctx || this.suspended) return;
        const bars = ctx.bars();
        const w = this.window(bars);
        const data = this.layerData(bars);
        if (!w) {
            ctx.pushData(data);
            ctx.emit({ series: [], priceLines: [] });
            return;
        }
        // The source: TradingView's finer candles, or the chart's bars when the ladder lands at or above the chart's
        // own timeframe (or the host cannot load other timeframes).
        let src: readonly OHLCV[] = bars.slice(w.i0, w.i1 + 1);
        if (ctx.loadBars) {
            const tf = vpvrIntrabarTimeframe(w.end - w.from);
            if (timeframeToMs(tf) < w.chartMs) {
                const ib = this.intrabars;
                if (!ib || ib.tf !== tf || ib.from > w.from || ib.to < w.end) {
                    this.load(tf, w.from, w.end);
                    // keep showing the last profile until the finer candles land (as TradingView does)
                    if (ib && ib.tf === tf && ib.bars.length > 0) src = ib.bars.filter((b) => b.time >= w.from && b.time < w.end);
                    else return;
                } else if (ib.bars.length > 0) {
                    src = ib.bars.filter((b) => b.time >= w.from && b.time < w.end);
                }
            }
        }
        const roundTick = data.rowSize == null ? this.tick : undefined;
        const profile = src.length > 0 ? buildVpvrProfile(src, 0, src.length - 1, data.rows, data.valueAreaFrac, data.rowSize, roundTick) : null;
        ctx.pushData(profile ? { ...data, profile } : data);
        if (!profile) {
            ctx.emit({ series: [], priceLines: [] });
            return;
        }
        ctx.emit(this.lines(bars, w.i0, w.i1, src, profile, data.valueAreaFrac));
    }

    /** POC / VAH / VAL (full-width lines with a value-only series for the price-scale label and the status line),
     *  and the developing POC / VA read at each chart bar of the window. */
    private lines(bars: readonly OHLCV[], i0: number, i1: number, src: readonly OHLCV[], profile: VpvrProfile, vaFrac: number): NativeIndicatorOutput {
        const inputs = this.inputs;
        const series: SeriesSpec[] = [];
        const priceLines: PriceLine[] = [];
        const labels = bool(inputs.labelsOnScale, true);
        const values = bool(inputs.valuesInStatusLine, true);
        const style = (row: LineRow, color: string, width: number): { color: string; width: number; lineStyle: 'solid' } => ({
            color: str(inputs[row.color], color),
            width: Math.min(4, Math.max(1, Math.round(num(Number(inputs[row.width]), width)))), // the width dropdown may hand back '2'
            lineStyle: 'solid',
        });
        const id = (title: string, ordinal: number): string => stableSeriesId({ instanceId: 'vpvr', kind: 'line', title, ordinal });
        // Series points line up with the chart's bars index by index: every bar gets one, null outside the window.
        const over = (value: (i: number) => number | null): Array<{ time: number; value: number | null }> =>
            bars.map((b, i) => ({ time: b.time, value: i >= i0 && i <= i1 ? value(i) : null }));

        const lv = vpvrLevels(profile);
        const levels: Array<[LineRow, string, number, boolean, string]> = [
            [LINE_ROWS.poc, 'POC', lv.poc, true, TV_RED],
            [LINE_ROWS.vah, 'VAH', lv.vah, false, TV_BLUE],
            [LINE_ROWS.val, 'VAL', lv.val, false, TV_BLUE],
        ];
        levels.forEach(([row, title, price, on, color], ordinal) => {
            if (!bool(inputs[row.show], on)) return;
            const st = style(row, color, 2);
            priceLines.push({ id: stableSeriesId({ instanceId: 'vpvr', kind: 'hline', title, ordinal }), paneId: '', price, ...st });
            series.push({
                id: id(title, ordinal),
                title,
                paneId: '',
                kind: 'line',
                points: over(() => price),
                style: st,
                display: { pane: false, priceScale: labels, legend: values, dataWindow: true },
                axisTag: labels,
            });
        });

        const devPoc = bool(inputs[LINE_ROWS.devPoc.show], false);
        const devVa = bool(inputs[LINE_ROWS.devVa.show], false);
        if (devPoc || devVa) {
            // read after each chart bar: at the next bar's open (the last one at the window's end)
            const ends: number[] = [];
            for (let i = i0; i <= i1; i += 1) ends.push(i + 1 < bars.length ? bars[i + 1]!.time : Infinity);
            const dev = buildVpvrDevelopingAt(src, profile, vaFrac, ends);
            const line = (title: string, ordinal: number, row: LineRow, color: string, pick: (l: Levels) => number): void => {
                series.push({
                    id: id(title, ordinal),
                    title,
                    paneId: '',
                    kind: 'step',
                    points: over((i) => {
                        const l = dev[i - i0];
                        return l ? pick(l) : null;
                    }),
                    style: style(row, color, 1),
                    display: { pane: true, priceScale: labels, legend: values, dataWindow: true },
                    axisTag: labels,
                });
            };
            if (devPoc) line('Developing POC', 3, LINE_ROWS.devPoc, TV_RED, (l) => l.poc);
            if (devVa) {
                line('Developing VA High', 4, LINE_ROWS.devVa, TV_BLUE, (l) => l.vah);
                line('Developing VA Low', 5, LINE_ROWS.devVa, TV_BLUE, (l) => l.val);
            }
        }
        return { series, priceLines };
    }
}

/** TradingView's dialog, row for row: the Inputs tab, then the Style tab. */
function vpvrInputsSchema(): InputSchema[] {
    return [
        { key: 'rowsLayout', title: 'Rows Layout', type: 'string', defval: ROWS_LAYOUTS[0], options: ROWS_LAYOUTS },
        { key: 'rows', title: 'Row Size', type: 'int', defval: DEFAULT_ROWS, min: 1, max: 1_000_000, step: 1 },
        { key: 'volume', title: 'Volume', type: 'string', defval: VOLUME_MODES[0], options: VOLUME_MODES },
        { key: 'valueAreaPct', title: 'Value Area Volume', type: 'int', defval: DEFAULT_VALUE_AREA_PCT, min: 0, max: 100, step: 1 },
        { key: 'showProfile', title: 'Volume profile', type: 'bool', defval: true, tab: STYLE },
        { key: 'showValues', title: 'Values', type: 'bool', defval: false, inline: 'values', tab: STYLE },
        { key: 'valuesColor', title: '', type: 'color', defval: VALUES_GRAY, inline: 'values', tab: STYLE },
        { key: 'widthPct', title: 'Width (% of the box)', type: 'int', defval: DEFAULT_WIDTH_PCT, min: 1, max: 100, step: 1, tab: STYLE },
        { key: 'placement', title: 'Placement', type: 'string', defval: PLACEMENTS[0], options: PLACEMENTS, tab: STYLE },
        { key: 'upColor', title: 'Up Volume', type: 'color', defval: DEFAULT_UP, tab: STYLE },
        { key: 'downColor', title: 'Down Volume', type: 'color', defval: DEFAULT_DOWN, tab: STYLE },
        { key: 'vaUpColor', title: 'Value Area Up', type: 'color', defval: DEFAULT_VA_UP, tab: STYLE },
        { key: 'vaDownColor', title: 'Value Area Down', type: 'color', defval: DEFAULT_VA_DOWN, tab: STYLE },
        ...lineRow(LINE_ROWS.vah, 'VAH', false, TV_BLUE, 2),
        ...lineRow(LINE_ROWS.val, 'VAL', false, TV_BLUE, 2),
        ...lineRow(LINE_ROWS.poc, 'POC', true, TV_RED, 2),
        ...lineRow(LINE_ROWS.devPoc, 'Developing POC', false, TV_RED, 1),
        ...lineRow(LINE_ROWS.devVa, 'Developing VA', false, TV_BLUE, 1),
        { key: 'labelsOnScale', title: 'Labels on price scale', type: 'bool', defval: true, tab: STYLE },
        { key: 'valuesInStatusLine', title: 'Values in status line', type: 'bool', defval: true, tab: STYLE },
    ];
}

/** Descriptor for the built-in visible-range volume profile. Bar volume needs no capability probe. */
export const vpvrDescriptor: NativeIndicatorDescriptor = {
    type: 'vpvr',
    title: 'Visible Range Volume Profile',
    shortTitle: 'VRVP',
    paneHint: 'price',
    overlay: true,
    reactsToViewport: true,
    inputsSchema: vpvrInputsSchema,
    defaultInputs: (): Record<string, InputValue> => Object.fromEntries(vpvrInputsSchema().map((s) => [s.key, s.defval])),
    create: () => new VpvrIndicator(),
};

/** Register the built-in VPVR native indicator (idempotent). Called by the composition root. */
export function registerVpvr(): void {
    // skip when registered: a host's wrapped descriptor survives the next chart (see registerClassicIndicators)
    if (!getNativeIndicator(vpvrDescriptor.type)) registerNativeIndicator(vpvrDescriptor);
}
