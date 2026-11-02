import type { InputSchema, InputValue } from '../../model/inputs';
import type { OHLCV } from '../../model/ohlcv';
import type { FillGradientStop } from '../../model/scene';
import type { ClassicBand, ClassicIndicatorSpec, ClassicLevel, ClassicOutput, ClassicPlot } from './define';
import { num, str } from './define';
import { anchorPlot } from './shared';
import { TV_COLORS } from '../../palette';
import { type Anchor, barInterval, periodKey } from './overlays';
import { closes, ema, highest, highs, lowest, lows, rma, sma, sourceValues, stdev, trueRange, volumes, vwma, wma } from './math';

/**
 * TradingView's own built-in indicators, setting for setting: the same inputs (labels, order, groups, defaults,
 * options), the same outputs (titles, default colours, widths, plot types, levels and fills, all editable on the Style
 * tab) and the same maths as TradingView's published source of each (read 2026-11-02 from TradingView Desktop and its
 * `pine-facade` metadata). Written in our own code; nothing is copied from TradingView's scripts.
 *
 * Colours are TradingView's defaults, kept in `TV_COLORS` (core/palette.ts).
 */

const BLUE = TV_COLORS.blue;
const ORANGE = TV_COLORS.orange;
const GREY = TV_COLORS.grey;
const GREY_HALF = 'rgba(120,123,134,0.5)';
const GREEN = TV_COLORS.green;
const RED = TV_COLORS.red;
const YELLOW = TV_COLORS.yellow;
const SMOOTHING = 'Smoothing';
const TV_SMOOTHING = ['None', 'SMA', 'SMA + Bollinger Bands', 'EMA', 'SMMA (RMA)', 'WMA', 'VWMA'] as const;
const TT_BB = "Only applies when 'SMA + Bollinger Bands' is selected. Determines the distance between the SMA and the bands.";

// ── input builders (TradingView's `input.*` shapes; no group unless TradingView has one) ──

function int(key: string, title: string, defval: number, min = 1, max = 5000, extra: Partial<InputSchema> = {}): InputSchema {
    return { key, title, type: 'int', defval, min, max, step: 1, ...extra };
}
function float(key: string, title: string, defval: number, min: number, max: number, step: number, extra: Partial<InputSchema> = {}): InputSchema {
    return { key, title, type: 'float', defval, min, max, step, ...extra };
}
/** TradingView's source list: its order and its labels. */
const TV_SOURCES = ['Open', 'High', 'Low', 'Close', 'HL2', 'HLC3', 'OHLC4', 'HLCC4'] as const;
const TV_SOURCE_LABELS: Record<string, string> = { HL2: '(H + L)/2', HLC3: '(H + L + C)/3', OHLC4: '(O + H + L + C)/4', HLCC4: '(H + L + C + C)/4' };
function source(key = 'source', title = 'Source', defval = 'Close', extra: Partial<InputSchema> = {}): InputSchema {
    return { key, title, type: 'string', defval, options: TV_SOURCES, optionLabels: TV_SOURCE_LABELS, ...extra };
}
function option(key: string, title: string, defval: string, options: readonly string[], extra: Partial<InputSchema> = {}): InputSchema {
    return { key, title, type: 'string', defval, options, ...extra };
}
function flag(key: string, title: string, defval: boolean, extra: Partial<InputSchema> = {}): InputSchema {
    return { key, title, type: 'bool', defval, ...extra };
}
const offsetInput = (group?: string): InputSchema => int('offset', 'Offset', 0, -500, 500, group ? { group } : {});

/** TradingView's moving-average switch (its `ma(source, length, type)` helper). */
function maOf(type: string, src: readonly number[], len: number, bars: readonly OHLCV[]): number[] {
    switch (type) {
        case 'EMA': return ema(src, len);
        case 'SMMA (RMA)':
        case 'RMA': return rma(src, len);
        case 'WMA': return wma(src, len);
        case 'VWMA': return vwma([...src], volumes(bars), len);
        default: return sma(src, len);
    }
}

/** Shift by a Pine `offset`: positive moves values right (later bars), negative left. */
function offsetBy(v: readonly number[], offset: number): number[] {
    const n = v.length;
    const out = new Array<number>(n).fill(Number.NaN);
    for (let i = 0; i < n; i++) {
        const j = i - offset;
        if (j >= 0 && j < n) out[i] = v[j]!;
    }
    return out;
}

const level = (key: string, title: string, price: number, color: string): ClassicLevel => ({ key, title, price, color, lineStyle: 'dashed', width: 1 });

/** TradingView's "Smoothing" block (RSI, EMA, SMA): the inputs. */
function smoothingInputs(defType: string): InputSchema[] {
    return [
        option('smoothingType', 'Type', defType, TV_SMOOTHING, { group: SMOOTHING }),
        int('smoothingLength', 'Length', 14, 1, 5000, { group: SMOOTHING }),
        float('bbMult', 'BB StdDev', 2, 0.001, 50, 0.5, { group: SMOOTHING, tooltip: TT_BB }),
    ];
}

/** The Smoothing block's outputs: "<of>-based MA", and for SMA + Bollinger Bands the bands and their fill. */
function smoothingOutputs(values: readonly number[], bars: readonly OHLCV[], inputs: Record<string, InputValue>, of: string, defType: string): { plots: ClassicPlot[]; bands: ClassicBand[] } {
    const type = str(inputs, 'smoothingType', defType);
    if (type === 'None') return { plots: [], bands: [] };
    const len = Math.max(1, Math.trunc(num(inputs, 'smoothingLength', 14)));
    const ma = maOf(type === 'SMA + Bollinger Bands' ? 'SMA' : type, values, len, bars);
    const plots: ClassicPlot[] = [{ key: 'smoothing', title: `${of}-based MA`, values: ma, color: YELLOW }];
    const bands: ClassicBand[] = [];
    if (type === 'SMA + Bollinger Bands') {
        const dev = stdev(values, len);
        const k = num(inputs, 'bbMult', 2);
        plots.push(
            { key: 'bbUpper', title: 'Upper Bollinger Band', values: ma.map((m, i) => m + k * dev[i]!), color: GREEN },
            { key: 'bbLower', title: 'Lower Bollinger Band', values: ma.map((m, i) => m - k * dev[i]!), color: GREEN },
        );
        bands.push({ key: 'bbFill', title: 'Bollinger Bands Background Fill', from: 'bbUpper', to: 'bbLower', color: 'rgba(76,175,80,0.1)' });
    }
    return { plots, bands };
}

/** Pine's `ta.stoch`: NaN where the range is empty (Pine divides by zero to na). */
function stochTv(v: readonly number[], hi: readonly number[], lo: readonly number[], len: number): number[] {
    const hh = highest(hi, len);
    const ll = lowest(lo, len);
    return v.map((x, i) => {
        const h = hh[i]!;
        const l = ll[i]!;
        return Number.isFinite(x) && Number.isFinite(h) && Number.isFinite(l) && h !== l ? (100 * (x - l)) / (h - l) : Number.NaN;
    });
}

/** Pine's RSI as TradingView's built-in writes it (0 when there are no gains, 100 when there are no losses). */
function rsiTv(src: readonly number[], len: number): number[] {
    const n = src.length;
    const up = new Array<number>(n).fill(Number.NaN);
    const dn = new Array<number>(n).fill(Number.NaN);
    for (let i = 1; i < n; i++) {
        const d = src[i]! - src[i - 1]!;
        if (!Number.isFinite(d)) continue;
        up[i] = Math.max(d, 0);
        dn[i] = -Math.min(d, 0);
    }
    const u = rma(up, len);
    const w = rma(dn, len);
    return u.map((a, i) => {
        const b = w[i]!;
        if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
        return b === 0 ? 100 : a === 0 ? 0 : 100 - 100 / (1 + a / b);
    });
}

/** Constant-colour gradient stops on every bar (a Pine `fill(..., top_value, bottom_value, top_color, bottom_color)`). */
function gradientStops(n: number, stop: FillGradientStop): Array<FillGradientStop | null> {
    return new Array<FillGradientStop | null>(n).fill(stop);
}

// ── Relative strength index ──

const RSI_GROUP = 'RSI Settings';
const rsi: ClassicIndicatorSpec = {
    type: 'rsi',
    title: 'Relative Strength Index',
    shortTitle: 'RSI',
    overlay: false,
    tv: { statusKeys: ['length', 'source'] },
    inputs: [
        int('length', 'RSI Length', 14, 1, 5000, { group: RSI_GROUP }),
        source('source', 'Source', 'Close', { group: RSI_GROUP }),
        flag('divergence', 'Calculate Divergence', false, { group: RSI_GROUP, tooltip: 'Calculating divergences is needed in order for divergence alerts to fire.' }),
        ...smoothingInputs('SMA'),
    ],
    compute: (bars, inputs) => {
        const n = bars.length;
        const values = rsiTv(sourceValues(bars, str(inputs, 'source', 'Close')), Math.max(1, Math.trunc(num(inputs, 'length', 14))));
        const smoothing = smoothingOutputs(values, bars, inputs, 'RSI', 'SMA');
        const plots: ClassicPlot[] = [
            { key: 'rsi', title: 'RSI', values, color: TV_COLORS.purple },
            ...smoothing.plots,
            anchorPlot('upperAnchor', 'Upper Anchor', n, 70),
            anchorPlot('lowerAnchor', 'Lower Anchor', n, 30),
            anchorPlot('midAnchor', 'Mid Anchor', n, 50),
        ];
        const bands: ClassicBand[] = [
            { key: 'bg', title: 'RSI Background Fill', from: 'upperAnchor', to: 'lowerAnchor', color: 'rgba(126,87,194,0.1)' },
            { key: 'ob', title: 'Overbought Gradient Fill', from: 'rsi', to: 'midAnchor', color: 'rgba(76,175,80,0)', gradient: gradientStops(n, { topValue: 100, bottomValue: 70, topColor: 'rgba(76,175,80,1)', bottomColor: 'rgba(76,175,80,0)' }) },
            { key: 'os', title: 'Oversold Gradient Fill', from: 'rsi', to: 'midAnchor', color: 'rgba(242,54,69,0)', gradient: gradientStops(n, { topValue: 30, bottomValue: 0, topColor: 'rgba(242,54,69,0)', bottomColor: 'rgba(242,54,69,1)' }) },
            ...smoothing.bands,
        ];
        const out: ClassicOutput = {
            plots,
            bands,
            levels: [level('upper', 'RSI Upper Band', 70, GREY), level('middle', 'RSI Middle Band', 50, GREY_HALF), level('lower', 'RSI Lower Band', 30, GREY)],
        };
        if (inputs.divergence === true) addRsiDivergence(out, values, bars);
        return out;
    },
};

/**
 * TradingView's RSI divergences (pivot lookback 5 / 5, range 5-60 bars): a line from the previous RSI pivot to this one
 * and a "Bull" / "Bear" label where price made a lower low (higher high) while RSI made a higher low (lower high).
 */
function addRsiDivergence(out: ClassicOutput, r: readonly number[], bars: readonly OHLCV[]): void {
    const L = 5;
    const R = 5;
    const n = bars.length;
    const bull = new Array<number>(n).fill(Number.NaN);
    const bear = new Array<number>(n).fill(Number.NaN);
    const bullColors = new Array<string | null>(n).fill(null);
    const bearColors = new Array<string | null>(n).fill(null);
    const isPivot = (c: number, low: boolean): boolean => {
        const v = r[c]!;
        if (!Number.isFinite(v)) return false;
        for (let k = c - L; k <= c + R; k++) {
            if (k === c) continue;
            const w = r[k];
            if (w === undefined || !Number.isFinite(w)) return false;
            if (low ? w <= v && (k > c || w < v) : w >= v && (k > c || w > v)) return false;
        }
        return true;
    };
    let lastLow = -1;
    let lastHigh = -1;
    out.markers ??= [];
    for (let i = L + R; i < n; i++) {
        const c = i - R; // the pivot bar, confirmed R bars later
        for (const low of [true, false]) {
            if (!isPivot(c, low)) continue;
            const prev = low ? lastLow : lastHigh;
            const since = prev < 0 ? Infinity : c - prev;
            const inRange = since >= 5 && since <= 60;
            const cond = prev >= 0 && inRange && (low ? r[c]! > r[prev]! && bars[c]!.low < bars[prev]!.low : r[c]! < r[prev]! && bars[c]!.high > bars[prev]!.high);
            const line = low ? bull : bear;
            const colors = low ? bullColors : bearColors;
            line[c] = r[c]!;
            colors[c] = cond ? (low ? GREEN : RED) : 'rgba(255,255,255,0)';
            if (cond) out.markers.push({ time: bars[c]!.time, position: 'inBar', shape: low ? 'arrowUp' : 'arrowDown', color: low ? GREEN : RED, text: low ? 'Bull' : 'Bear' });
            if (low) lastLow = c;
            else lastHigh = c;
        }
    }
    // Pivot-to-pivot segments: the line between consecutive pivots carries the later pivot's colour.
    const join = (v: number[]): number[] => {
        const res = v.slice();
        let prev = -1;
        for (let i = 0; i < n; i++) {
            if (!Number.isFinite(v[i]!)) continue;
            if (prev >= 0) for (let k = prev + 1; k < i; k++) res[k] = v[prev]! + ((v[i]! - v[prev]!) * (k - prev)) / (i - prev);
            prev = i;
        }
        return res;
    };
    const spread = (c: Array<string | null>): Array<string | null> => {
        const res = c.slice();
        for (let i = n - 1, cur: string | null = null; i >= 0; i--) {
            if (c[i]) cur = c[i]!;
            else res[i] = cur;
        }
        return res;
    };
    out.plots.push(
        { key: 'bullDiv', title: 'Regular Bullish', values: join(bull), color: GREEN, width: 2, colors: spread(bullColors) },
        { key: 'bearDiv', title: 'Regular Bearish', values: join(bear), color: RED, width: 2, colors: spread(bearColors) },
    );
}

// ── Moving averages ──

function tvAverage(type: string, title: string, shortTitle: string, plotTitle: string, color: string, calc: (src: number[], len: number) => number[], opts: { offset?: boolean; source?: boolean; smoothing?: boolean; min?: number } = {}): ClassicIndicatorSpec {
    const { offset = true, source: hasSource = true, smoothing = false, min = 1 } = opts;
    return {
        type,
        title,
        shortTitle,
        overlay: true,
        tv: { statusKeys: hasSource ? ['length', 'source'] : ['length'] },
        inputs: [int('length', 'Length', 9, min), ...(hasSource ? [source()] : []), ...(offset ? [offsetInput()] : []), ...(smoothing ? smoothingInputs('None') : [])],
        compute: (bars, inputs) => {
            const len = Math.max(min, Math.trunc(num(inputs, 'length', 9)));
            const values = calc(sourceValues(bars, hasSource ? str(inputs, 'source', 'Close') : 'Close'), len);
            const shown = offset ? offsetBy(values, Math.trunc(num(inputs, 'offset', 0))) : values;
            const plots: ClassicPlot[] = [{ key: type, title: plotTitle, values: shown, color }];
            if (!smoothing) return { plots };
            // TradingView smooths the un-offset line.
            const s = smoothingOutputs(values, bars, inputs, shortTitle, 'None');
            return { plots: [...plots, ...s.plots], bands: s.bands };
        },
    };
}

/** Pine's Hull MA: WMA(2·WMA(len/2) − WMA(len), floor(√len)). */
function hullTv(src: number[], len: number): number[] {
    const half = wma(src, Math.max(1, Math.trunc(len / 2)));
    const full = wma(src, len);
    return wma(half.map((h, i) => 2 * h - full[i]!), Math.max(1, Math.floor(Math.sqrt(len))));
}

const emaSpec = tvAverage('ema', 'Exponential Moving Average', 'EMA', 'EMA', BLUE, ema, { smoothing: true });
const smaSpec = tvAverage('sma', 'Simple Moving Average', 'SMA', 'MA', BLUE, sma, { smoothing: true });
const wmaSpec = tvAverage('wma', 'Weighted Moving Average', 'WMA', 'WMA', BLUE, wma);
const hmaSpec = tvAverage('hull-moving-average', 'Hull Moving Average', 'HMA', 'HMA', BLUE, hullTv, { offset: false, min: 2 });
const demaSpec = tvAverage('dema', 'Double Exponential Moving Average', 'DEMA', 'DEMA', TV_COLORS.green600, (s, l) => { const e1 = ema(s, l); const e2 = ema(e1, l); return e1.map((x, i) => 2 * x - e2[i]!); }, { offset: false });
const temaSpec = tvAverage('tema', 'Triple Exponential Moving Average', 'TEMA', 'TEMA', BLUE, (s, l) => { const e1 = ema(s, l); const e2 = ema(e1, l); const e3 = ema(e2, l); return e1.map((x, i) => 3 * (x - e2[i]!) + e3[i]!); }, { offset: false, source: false });

// ── MACD ──

const macd: ClassicIndicatorSpec = {
    type: 'macd',
    title: 'MACD',
    shortTitle: 'MACD',
    overlay: false,
    tv: { statusKeys: ['source', 'fastLength', 'slowLength', 'signalLength'] },
    inputs: [
        source(),
        int('fastLength', 'Fast length', 12),
        int('slowLength', 'Slow length', 26),
        int('signalLength', 'Signal length', 9),
        option('oscType', 'Oscillator MA type', 'EMA', ['EMA', 'SMA']),
        option('signalType', 'Signal MA type', 'EMA', ['EMA', 'SMA']),
    ],
    compute: (bars, inputs) => {
        const src = sourceValues(bars, str(inputs, 'source', 'Close'));
        const osc = str(inputs, 'oscType', 'EMA');
        const fast = maOf(osc, src, Math.max(1, Math.trunc(num(inputs, 'fastLength', 12))), bars);
        const slow = maOf(osc, src, Math.max(1, Math.trunc(num(inputs, 'slowLength', 26))), bars);
        const line = fast.map((f, i) => f - slow[i]!);
        const signal = maOf(str(inputs, 'signalType', 'EMA'), line, Math.max(1, Math.trunc(num(inputs, 'signalLength', 9))), bars);
        const hist = line.map((m, i) => m - signal[i]!);
        const palette = [TV_COLORS.teal, TV_COLORS.tealLight, TV_COLORS.redLight, TV_COLORS.redAccent];
        const colors = hist.map((h, i) => {
            if (!Number.isFinite(h)) return null;
            const prev = hist[i - 1];
            const rising = prev !== undefined && Number.isFinite(prev) && h > prev;
            return palette[h >= 0 ? (rising ? 0 : 1) : rising ? 2 : 3]!;
        });
        return {
            plots: [
                { key: 'hist', title: 'Histogram', kind: 'columns', values: hist, color: TV_COLORS.teal, colors, palette, base: 0 },
                { key: 'macd', title: 'MACD', values: line, color: BLUE },
                { key: 'signal', title: 'Signal line', values: signal, color: ORANGE },
            ],
            levels: [{ key: 'zero', title: 'Zero', price: 0, color: GREY_HALF, lineStyle: 'dashed', width: 1 }],
        };
    },
};

// ── Bollinger Bands ──

const bollinger: ClassicIndicatorSpec = {
    type: 'bollinger-bands',
    title: 'Bollinger Bands',
    shortTitle: 'BB',
    overlay: true,
    tv: { statusKeys: ['length', 'maType', 'source', 'mult'] },
    inputs: [
        int('length', 'Length', 20, 1, 5000, { tooltip: 'The time period to be used in calculating the MA which creates the base for the Upper and Lower Bands.' }),
        option('maType', 'Basis MA Type', 'SMA', ['SMA', 'EMA', 'SMMA (RMA)', 'WMA', 'VWMA'], { tooltip: 'Determines the type of Moving Average that is applied to the basis plot line.' }),
        source('source', 'Source', 'Close', { tooltip: 'Determines what data from each bar will be used in calculations.' }),
        float('mult', 'StdDev', 2, 0.001, 50, 0.1, { tooltip: 'The number of Standard Deviations away from the MA that the Upper and Lower Bands should be.' }),
        int('offset', 'Offset', 0, -500, 500, { tooltip: 'Changing this number will move the Bollinger Bands either Forwards or Backwards relative to the current market.' }),
    ],
    compute: (bars, inputs) => {
        const len = Math.max(1, Math.trunc(num(inputs, 'length', 20)));
        const src = sourceValues(bars, str(inputs, 'source', 'Close'));
        const basis = maOf(str(inputs, 'maType', 'SMA'), src, len, bars);
        const dev = stdev(src, len);
        const k = num(inputs, 'mult', 2);
        const off = Math.trunc(num(inputs, 'offset', 0));
        return {
            plots: [
                { key: 'basis', title: 'Basis', values: offsetBy(basis, off), color: BLUE },
                { key: 'upper', title: 'Upper', values: offsetBy(basis.map((b, i) => b + k * dev[i]!), off), color: RED },
                { key: 'lower', title: 'Lower', values: offsetBy(basis.map((b, i) => b - k * dev[i]!), off), color: TV_COLORS.tvTeal },
            ],
            bands: [{ key: 'bg', title: 'Background', from: 'upper', to: 'lower', color: 'rgba(33,150,243,0.05)' }],
        };
    },
};

// ── Ichimoku cloud ──

const HIDDEN = { pane: false, priceScale: false, legend: false, dataWindow: true } as const;
/** A plot not shown anywhere (Pine `display.none`): a VWAP band switched off. */
const OFF = { pane: false, priceScale: false, legend: false, dataWindow: false } as const;

const donchianMid = (bars: readonly OHLCV[], len: number): number[] => {
    const hh = highest(highs(bars), len);
    const ll = lowest(lows(bars), len);
    return hh.map((h, i) => (h + ll[i]!) / 2);
};

const ichimoku: ClassicIndicatorSpec = {
    type: 'ichimoku-cloud',
    title: 'Ichimoku Cloud',
    shortTitle: 'Ichimoku',
    overlay: true,
    tv: { statusKeys: ['conversion', 'base', 'spanB', 'displacement'] },
    inputs: [
        int('conversion', 'Conversion Line Length', 9),
        int('base', 'Base Line Length', 26),
        int('spanB', 'Leading Span B Length', 52),
        int('displacement', 'Lagging Span', 26),
    ],
    compute: (bars, inputs) => {
        const conv = donchianMid(bars, Math.max(1, Math.trunc(num(inputs, 'conversion', 9))));
        const base = donchianMid(bars, Math.max(1, Math.trunc(num(inputs, 'base', 26))));
        const lead1 = conv.map((c, i) => (c + base[i]!) / 2);
        const lead2 = donchianMid(bars, Math.max(1, Math.trunc(num(inputs, 'spanB', 52))));
        const shift = Math.max(1, Math.trunc(num(inputs, 'displacement', 26))) - 1;
        // Leading spans run `shift` bars past the last candle (TradingView draws the cloud into the future).
        const ahead = (v: readonly number[]): number[] => [...new Array<number>(shift).fill(Number.NaN), ...v];
        const a = ahead(lead1);
        const b = ahead(lead2);
        const cloudColors = a.map((x, i) => (Number.isFinite(x) && Number.isFinite(b[i]!) ? (x > b[i]! ? 'rgba(67,160,71,0.1)' : 'rgba(244,67,54,0.1)') : null));
        return {
            plots: [
                { key: 'conversion', title: 'Conversion Line', values: conv, color: BLUE },
                { key: 'base', title: 'Base Line', values: base, color: TV_COLORS.red900 },
                { key: 'lagging', title: 'Lagging Span', values: offsetBy(closes(bars), -shift), color: TV_COLORS.green600 },
                { key: 'spanA', title: 'Leading Span A', values: a, color: TV_COLORS.green200 },
                { key: 'spanB', title: 'Leading Span B', values: b, color: TV_COLORS.red200 },
                // TradingView's two hidden cloud edges (no line on the chart; alerts can watch them).
                { key: 'kumoUpper', title: 'Kumo Cloud Upper Line', values: a.map((x, i) => Math.max(x, b[i]!)), color: TV_COLORS.green200, display: HIDDEN, styleOff: true },
                { key: 'kumoLower', title: 'Kumo Cloud Lower Line', values: a.map((x, i) => Math.min(x, b[i]!)), color: TV_COLORS.red200, display: HIDDEN, styleOff: true },
            ],
            bands: [{ key: 'cloud', title: 'Cloud Fill', from: 'spanA', to: 'spanB', color: 'rgba(67,160,71,0.1)', colors: cloudColors, palette: ['rgba(67,160,71,0.1)', 'rgba(244,67,54,0.1)'] }],
        };
    },
};

// ── Stochastic / Stochastic RSI ──

function stochOutput(k: number[], d: number[], kTitle: string, dTitle: string): ClassicOutput {
    const n = k.length;
    return {
        plots: [
            { key: 'k', title: kTitle, values: k, color: BLUE },
            { key: 'd', title: dTitle, values: d, color: ORANGE },
            anchorPlot('upperAnchor', 'Upper Anchor', n, 80),
            anchorPlot('lowerAnchor', 'Lower Anchor', n, 20),
        ],
        bands: [{ key: 'bg', title: 'Background', from: 'upperAnchor', to: 'lowerAnchor', color: 'rgba(33,150,243,0.1)' }],
        levels: [level('upper', 'Upper Band', 80, GREY), level('middle', 'Middle Band', 50, GREY_HALF), level('lower', 'Lower Band', 20, GREY)],
    };
}

const stochastic: ClassicIndicatorSpec = {
    type: 'stochastic',
    title: 'Stochastic',
    shortTitle: 'Stoch',
    overlay: false,
    tv: { statusKeys: ['kLength', 'kSmoothing', 'dLength'] },
    inputs: [int('kLength', '%K Length', 14), int('kSmoothing', '%K Smoothing', 1), int('dLength', '%D Smoothing', 3)],
    compute: (bars, inputs) => {
        const k = sma(stochTv(closes(bars), highs(bars), lows(bars), Math.max(1, Math.trunc(num(inputs, 'kLength', 14)))), Math.max(1, Math.trunc(num(inputs, 'kSmoothing', 1))));
        return stochOutput(k, sma(k, Math.max(1, Math.trunc(num(inputs, 'dLength', 3)))), '%K', '%D');
    },
};

const stochasticRsi: ClassicIndicatorSpec = {
    type: 'stochastic-rsi',
    title: 'Stochastic RSI',
    shortTitle: 'Stoch RSI',
    overlay: false,
    tv: { statusKeys: ['kSmoothing', 'dLength', 'rsiLength', 'stochLength', 'source'] },
    inputs: [int('kSmoothing', 'K', 3), int('dLength', 'D', 3), int('rsiLength', 'RSI Length', 14), int('stochLength', 'Stochastic Length', 14), source('source', 'RSI Source')],
    compute: (bars, inputs) => {
        const r = rsiTv(sourceValues(bars, str(inputs, 'source', 'Close')), Math.max(1, Math.trunc(num(inputs, 'rsiLength', 14))));
        const k = sma(stochTv(r, r, r, Math.max(1, Math.trunc(num(inputs, 'stochLength', 14)))), Math.max(1, Math.trunc(num(inputs, 'kSmoothing', 3))));
        return stochOutput(k, sma(k, Math.max(1, Math.trunc(num(inputs, 'dLength', 3)))), 'K', 'D');
    },
};

// ── Average true range ──

const atrSpec: ClassicIndicatorSpec = {
    type: 'average-true-range',
    title: 'Average True Range',
    shortTitle: 'ATR',
    overlay: false,
    tv: { statusKeys: ['length', 'smoothing'] },
    inputs: [int('length', 'Length', 14), option('smoothing', 'Smoothing', 'RMA', ['RMA', 'SMA', 'EMA', 'WMA'])],
    compute: (bars, inputs) => {
        const values = maOf(str(inputs, 'smoothing', 'RMA'), trueRange(bars), Math.max(1, Math.trunc(num(inputs, 'length', 14))), bars);
        return { plots: [{ key: 'atr', title: 'ATR', values, color: TV_COLORS.red900 }] };
    },
};

// ── Supertrend ──

/** Pine's `ta.supertrend(factor, atrPeriod)`: [line, direction] (direction −1 = up trend). */
function supertrendTv(bars: readonly OHLCV[], factor: number, period: number): { line: number[]; dir: number[] } {
    const n = bars.length;
    const atrV = rma(trueRange(bars).map((x, i) => (i === 0 ? Number.NaN : x)), period);
    const line = new Array<number>(n).fill(Number.NaN);
    const dir = new Array<number>(n).fill(Number.NaN);
    let prevUpper = Number.NaN;
    let prevLower = Number.NaN;
    let prevLine = Number.NaN;
    for (let i = 0; i < n; i++) {
        const b = bars[i]!;
        const a = atrV[i]!;
        const mid = (b.high + b.low) / 2;
        let upper = mid + factor * a;
        let lower = mid - factor * a;
        const pl = Number.isFinite(prevLower) ? prevLower : 0;
        const pu = Number.isFinite(prevUpper) ? prevUpper : 0;
        const prevClose = i > 0 ? bars[i - 1]!.close : Number.NaN;
        lower = lower > pl || prevClose < pl ? lower : pl;
        upper = upper < pu || prevClose > pu ? upper : pu;
        let d: number;
        if (i === 0 || !Number.isFinite(atrV[i - 1]!)) d = 1;
        else if (prevLine === prevUpper) d = b.close > upper ? -1 : 1;
        else d = b.close < lower ? 1 : -1;
        const st = d === -1 ? lower : upper;
        if (Number.isFinite(a)) {
            line[i] = st;
            dir[i] = d;
        }
        prevUpper = upper;
        prevLower = lower;
        prevLine = st;
    }
    return { line, dir };
}

const supertrend: ClassicIndicatorSpec = {
    type: 'supertrend',
    title: 'Supertrend',
    shortTitle: 'Supertrend',
    overlay: true,
    tv: { statusKeys: ['atrLength', 'mult'] },
    inputs: [int('atrLength', 'ATR Length', 10), float('mult', 'Factor', 3, 0.01, 100, 0.01)],
    compute: (bars, inputs) => {
        const { line, dir } = supertrendTv(bars, num(inputs, 'mult', 3), Math.max(1, Math.trunc(num(inputs, 'atrLength', 10))));
        line[0] = Number.NaN;
        const up = line.map((v, i) => (dir[i] === -1 ? v : Number.NaN));
        const down = line.map((v, i) => (dir[i] === 1 ? v : Number.NaN));
        const middle = bars.map((b, i) => (i === 0 ? Number.NaN : (b.open + b.close) / 2));
        return {
            plots: [
                { key: 'up', title: 'Up Trend', values: up, color: GREEN },
                { key: 'down', title: 'Down Trend', values: down, color: RED },
                { key: 'middle', title: 'Body Middle', values: middle, color: 'rgba(0,0,0,0)', display: { pane: false, legend: false, dataWindow: false, priceScale: false } },
            ],
            bands: [
                { key: 'upBg', title: 'Uptrend background', from: 'middle', to: 'up', color: 'rgba(76,175,80,0.1)' },
                { key: 'downBg', title: 'Downtrend background', from: 'middle', to: 'down', color: 'rgba(242,54,69,0.1)' },
            ],
        };
    },
};

// ── Parabolic SAR ──

/** Pine's `ta.sar(start, inc, max)`, step for step. */
function sarTv(bars: readonly OHLCV[], start: number, inc: number, max: number): number[] {
    const n = bars.length;
    const out = new Array<number>(n).fill(Number.NaN);
    let result = Number.NaN;
    let maxMin = Number.NaN;
    let acc = Number.NaN;
    let below = false;
    for (let i = 1; i < n; i++) {
        const b = bars[i]!;
        let firstTrendBar = false;
        if (i === 1) {
            if (b.close > bars[0]!.close) {
                below = true;
                maxMin = b.high;
                result = bars[0]!.low;
            } else {
                below = false;
                maxMin = b.low;
                result = bars[0]!.high;
            }
            firstTrendBar = true;
            acc = start;
        }
        result = result + acc * (maxMin - result);
        if (below) {
            if (result > b.low) {
                firstTrendBar = true;
                below = false;
                result = Math.max(b.high, maxMin);
                maxMin = b.low;
                acc = start;
            }
        } else if (result < b.high) {
            firstTrendBar = true;
            below = true;
            result = Math.min(b.low, maxMin);
            maxMin = b.high;
            acc = start;
        }
        if (!firstTrendBar) {
            if (below) {
                if (b.high > maxMin) {
                    maxMin = b.high;
                    acc = Math.min(acc + inc, max);
                }
            } else if (b.low < maxMin) {
                maxMin = b.low;
                acc = Math.min(acc + inc, max);
            }
        }
        if (below) {
            result = Math.min(result, bars[i - 1]!.low);
            if (i > 1) result = Math.min(result, bars[i - 2]!.low);
        } else {
            result = Math.max(result, bars[i - 1]!.high);
            if (i > 1) result = Math.max(result, bars[i - 2]!.high);
        }
        out[i] = result;
    }
    return out;
}

const parabolicSar: ClassicIndicatorSpec = {
    type: 'parabolic-sar',
    title: 'Parabolic SAR',
    shortTitle: 'SAR',
    overlay: true,
    tv: { statusKeys: ['start', 'increment', 'maximum'] },
    inputs: [float('start', 'Start', 0.02, 0, 10, 0.01), float('increment', 'Increment', 0.02, 0, 10, 0.01), float('maximum', 'Max value', 0.2, 0, 10, 0.01)],
    compute: (bars, inputs) => ({
        plots: [{ key: 'sar', title: 'ParabolicSAR', kind: 'cross', values: sarTv(bars, num(inputs, 'start', 0.02), num(inputs, 'increment', 0.02), num(inputs, 'maximum', 0.2)), color: BLUE }],
    }),
};

// ── Average directional index ──

/** Pine's `fixnan`: carry the last finite value over NaNs. */
function fixnan(v: readonly number[]): number[] {
    let last = Number.NaN;
    return v.map((x) => (Number.isFinite(x) ? (last = x) : last));
}

const adx: ClassicIndicatorSpec = {
    type: 'average-directional-index',
    title: 'Average Directional Index',
    shortTitle: 'ADX',
    overlay: false,
    tv: { statusKeys: ['adxLength', 'diLength'] },
    inputs: [
        int('adxLength', 'ADX Smoothing', 14, 1, 5000, { tooltip: 'The time period to be used in calculating the ADX which has a smoothing component.' }),
        int('diLength', 'DI Length', 14, 1, 5000, { tooltip: 'The time period to be used in calculating the DI (Directional Indicator).' }),
    ],
    compute: (bars, inputs) => {
        const n = bars.length;
        const di = Math.max(1, Math.trunc(num(inputs, 'diLength', 14)));
        const plusDM = new Array<number>(n).fill(Number.NaN);
        const minusDM = new Array<number>(n).fill(Number.NaN);
        const tr = new Array<number>(n).fill(Number.NaN);
        for (let i = 1; i < n; i++) {
            const up = bars[i]!.high - bars[i - 1]!.high;
            const down = bars[i - 1]!.low - bars[i]!.low;
            plusDM[i] = up > down && up > 0 ? up : 0;
            minusDM[i] = down > up && down > 0 ? down : 0;
            const pc = bars[i - 1]!.close;
            tr[i] = Math.max(bars[i]!.high - bars[i]!.low, Math.abs(bars[i]!.high - pc), Math.abs(bars[i]!.low - pc));
        }
        const trs = rma(tr, di);
        const plus = fixnan(rma(plusDM, di).map((x, i) => (100 * x) / trs[i]!));
        const minus = fixnan(rma(minusDM, di).map((x, i) => (100 * x) / trs[i]!));
        const ratio = plus.map((p, i) => {
            const s = p + minus[i]!;
            return Math.abs(p - minus[i]!) / (s === 0 ? 1 : s);
        });
        const values = rma(ratio, Math.max(1, Math.trunc(num(inputs, 'adxLength', 14)))).map((x) => 100 * x);
        return { plots: [{ key: 'adx', title: 'ADX', values, color: RED }] };
    },
};

/** The TradingView versions; each replaces the catalog entry of the same type. */
// ── VWAP ──

const VWAP_GROUP = 'VWAP Settings';
const BANDS_GROUP = 'Bands Settings';
const DAY = 86_400_000;
/** TradingView's band colours: `color.green`, `color.olive`, `color.teal`. */
const VWAP_BAND_COLORS = [GREEN, TV_COLORS.olive, TV_COLORS.tvTeal] as const;
const VWAP_BAND_FILLS = ['rgba(76,175,80,0.05)', 'rgba(128,128,0,0.05)', 'rgba(8,153,129,0.05)'] as const;

/** A new anchor period starts on this bar (TradingView's `timeframe.change`). Earnings, dividends and splits do not
 *  exist for crypto, so those anchors never reset (the same as TradingView on a crypto symbol). */
function vwapNewPeriod(anchor: string, prev: number, cur: number): boolean {
    switch (anchor) {
        case 'Session': case 'Week': case 'Month': case 'Quarter': case 'Year':
            return periodKey(anchor as Anchor, prev) !== periodKey(anchor as Anchor, cur);
        case 'Decade': case 'Century': {
            const y = new Date(cur).getUTCFullYear();
            return new Date(prev).getUTCFullYear() !== y && y % (anchor === 'Decade' ? 10 : 100) === 0;
        }
        default:
            return false;
    }
}

const vwap: ClassicIndicatorSpec = {
    type: 'vwap',
    title: 'Volume Weighted Average Price',
    shortTitle: 'VWAP',
    overlay: true,
    tv: { statusKeys: ['anchor'] },
    inputs: [
        flag('hideDwm', 'Hide VWAP on 1D or Above', false, { group: VWAP_GROUP }),
        option('anchor', 'Anchor Period', 'Session', ['Session', 'Week', 'Month', 'Quarter', 'Year', 'Decade', 'Century', 'Earnings', 'Dividends', 'Splits'], { group: VWAP_GROUP }),
        source('source', 'Source', 'HLC3', { group: VWAP_GROUP }),
        offsetInput(VWAP_GROUP),
        option('bandsMode', 'Bands Calculation Mode', 'Standard Deviation', ['Standard Deviation', 'Percentage'], {
            group: BANDS_GROUP,
            tooltip: "Determines the units used to calculate the distance of the bands. When 'Percentage' is selected, a multiplier of 1 means 1%.",
        }),
        ...[1, 2, 3].flatMap((k) => [
            flag(`band${k}`, '', k === 1, { group: BANDS_GROUP, inline: `band_${k}` }),
            float(`band${k}Mult`, `Bands Multiplier #${k}`, k, 0, 1000, 0.5, { group: BANDS_GROUP, inline: `band_${k}` }),
        ]),
    ],
    compute: (bars, inputs) => {
        const n = bars.length;
        const anchor = str(inputs, 'anchor', 'Session');
        const src = sourceValues(bars, str(inputs, 'source', 'HLC3'));
        const off = Math.trunc(num(inputs, 'offset', 0));
        const hidden = inputs.hideDwm === true && barInterval(bars) >= DAY;
        const pct = str(inputs, 'bandsMode', 'Standard Deviation') === 'Percentage';
        const mid = new Array<number>(n).fill(Number.NaN);
        const basis = new Array<number>(n).fill(Number.NaN);
        let sPV = 0;
        let sPV2 = 0;
        let sV = 0;
        for (let i = 0; i < n && !hidden; i++) {
            // The first bar always starts a period (TradingView: `na(src[1])`).
            if (i === 0 || vwapNewPeriod(anchor, bars[i - 1]!.time, bars[i]!.time)) {
                sPV = 0;
                sPV2 = 0;
                sV = 0;
            }
            const v = bars[i]!.volume;
            const x = src[i]!;
            if (v != null && Number.isFinite(v) && Number.isFinite(x)) {
                sPV += x * v;
                sPV2 += x * x * v;
                sV += v;
            }
            if (sV <= 0) continue;
            const m = sPV / sV;
            mid[i] = m;
            basis[i] = pct ? m * 0.01 : Math.sqrt(Math.max(0, sPV2 / sV - m * m));
        }
        const plots: ClassicPlot[] = [{ key: 'vwap', title: 'VWAP', values: offsetBy(mid, off), color: BLUE }];
        const bands: ClassicBand[] = [];
        for (let k = 1; k <= 3; k++) {
            // TradingView keeps all three bands (and their fills) in the Style tab; a band switched off on the Inputs
            // tab is plotted as na and not displayed (`display = showBand ? display.all : display.none`).
            const on = inputs[`band${k}`] !== undefined ? inputs[`band${k}`] === true : k === 1;
            const mult = Math.max(0, num(inputs, `band${k}Mult`, k));
            const color = VWAP_BAND_COLORS[k - 1]!;
            const line = (sign: 1 | -1): number[] => (on ? offsetBy(mid.map((m, i) => m + sign * basis[i]! * mult), off) : new Array<number>(n).fill(Number.NaN));
            const display = on ? {} : { display: OFF, styleOff: true };
            plots.push(
                { key: `up${k - 1}`, title: `Upper Band #${k}`, values: line(1), color, ...display },
                { key: `down${k - 1}`, title: `Lower Band #${k}`, values: line(-1), color, ...display },
            );
            bands.push({ key: `fill${k - 1}`, title: `Bands Fill #${k}`, from: `up${k - 1}`, to: `down${k - 1}`, color: VWAP_BAND_FILLS[k - 1]! });
        }
        return { plots, bands };
    },
};

export const tvSpecs: ClassicIndicatorSpec[] = [
    vwap,
    rsi,
    emaSpec,
    smaSpec,
    wmaSpec,
    hmaSpec,
    demaSpec,
    temaSpec,
    macd,
    bollinger,
    ichimoku,
    stochastic,
    stochasticRsi,
    atrSpec,
    supertrend,
    parabolicSar,
    adx,
];
