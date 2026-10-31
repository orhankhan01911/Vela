import { Drawing, type AnchorSlot, type SerializedDrawing } from '../Drawing';
import type { LineStyle } from '../../model/series';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { distToSegment, pointInPolygon, handleAt } from '../hittest';
import { BEARISH, BULLISH, NEUTRAL } from '../../palette';

/** Standard-deviation multiplier for the channel half-width (a ±2σ band around the fit line). */
const DEVIATIONS = 2;

/** One OHLC bar the regression fits against (only `time` + `close` are used). */
interface FitBar {
    time: number;
    close: number;
}

/** The least-squares result over the bars in range: the fit line endpoints (price), the
 *  band half-width, and the goodness-of-fit R² (0..1). */
export interface RegressionFit {
    /** First / last bar time in range (the channel's horizontal extent). */
    t0: number;
    t1: number;
    /** Midline (fit) price at `t0` / `t1`. */
    mid0: number;
    mid1: number;
    /** Channel half-width in price (`DEVIATIONS` × residual σ). */
    dev: number;
    /** Coefficient of determination, 0..1 (shown as a %). */
    r2: number;
    /** Bar count fitted. */
    n: number;
}

/** Per-line + fill cosmetics for the regression channel (round-trips through `props`). */
export interface RegressionStyle {
    midColor: string;
    midStyle: LineStyle;
    upperColor: string;
    upperStyle: LineStyle;
    lowerColor: string;
    lowerStyle: LineStyle;
    /** Fill between the midline and the upper band. */
    upperFill: string;
    /** Fill between the midline and the lower band. */
    lowerFill: string;
    /** Show the R² readout at the start of the channel. */
    showR2: boolean;
}

function defaultRegressionStyle(): RegressionStyle {
    return {
        midColor: NEUTRAL, // neutral gray midline
        midStyle: 'solid',
        upperColor: BULLISH,
        upperStyle: 'solid',
        lowerColor: BEARISH,
        lowerStyle: 'solid',
        upperFill: `${BULLISH}26`, // translucent, mid → upper
        lowerFill: `${BEARISH}26`, // translucent, mid → lower
        showR2: true,
    };
}

/** Pixel layout the painter/hit-test consume — the three lines' endpoints + the R² readout. */
export interface RegressionLayout {
    x0: number;
    x1: number;
    midY0: number;
    midY1: number;
    upperY0: number;
    upperY1: number;
    lowerY0: number;
    lowerY1: number;
    r2: number;
    showR2: boolean;
}

/** Least-squares line + residual σ + Pearson R² over `(index, close)`. Null when < 2 bars. */
export function computeRegressionFit(bars: readonly FitBar[]): RegressionFit | null {
    const n = bars.length;
    if (n < 2) return null;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;
    for (let i = 0; i < n; i += 1) {
        const y = bars[i]!.close;
        sumX += i;
        sumY += y;
        sumXY += i * y;
        sumXX += i * i;
        sumYY += y * y;
    }
    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    let sse = 0;
    for (let i = 0; i < n; i += 1) {
        const resid = bars[i]!.close - (intercept + slope * i);
        sse += resid * resid;
    }
    const sigma = Math.sqrt(sse / n);
    const den = Math.sqrt(denom * (n * sumYY - sumY * sumY));
    const r = den === 0 ? 0 : (n * sumXY - sumX * sumY) / den;
    return {
        t0: bars[0]!.time,
        t1: bars[n - 1]!.time,
        mid0: intercept,
        mid1: intercept + slope * (n - 1),
        dev: DEVIATIONS * sigma,
        r2: Math.max(0, Math.min(1, r * r)),
        n,
    };
}

/** TradingView's price source for the regression (its Source input). */
export type RegressionSource = 'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4';
export const REGRESSION_SOURCES: readonly RegressionSource[] = ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4'];

/** One of TradingView's three regression lines: shown, its colour (the fill takes it with its opacity, the line
 *  draws it opaque), width and style. */
export interface RegressionTrendLine {
    show: boolean;
    color: string;
    width: number;
    style: LineStyle;
}

/** TradingView's regression trend settings (its study inputs and styles). */
export interface RegressionTrend {
    upperDev: number;
    lowerDev: number;
    useUpper: boolean;
    useLower: boolean;
    source: RegressionSource;
    base: RegressionTrendLine;
    up: RegressionTrendLine;
    down: RegressionTrendLine;
    extend: boolean;
    pearsons: boolean;
}

/** TradingView's defaults (a new regression trend's properties): ±2 deviations of the closes, the base red dashed,
 *  up and down blue, all 1 px at 30 % opacity, Pearson's R on, not extended. */
export function defaultRegressionTrend(): RegressionTrend {
    return {
        upperDev: 2,
        lowerDev: -2,
        useUpper: true,
        useLower: true,
        source: 'close',
        base: { show: true, color: '#F236454d', width: 1, style: 'dashed' }, // palette-exempt: TradingView's red 500 at 30 %
        up: { show: true, color: '#2962FF4d', width: 1, style: 'solid' }, // palette-exempt: TradingView's blue 500 at 30 %
        down: { show: true, color: '#2962FF4d', width: 1, style: 'solid' }, // palette-exempt: TradingView's blue 500 at 30 %
        extend: false,
        pearsons: true,
    };
}

/** A colour with its alpha dropped (TradingView draws the regression lines and Pearson's R opaque). */
export function opaqueColor(c: string): string {
    if (/^#[0-9a-f]{8}$/i.test(c)) return c.slice(0, 7);
    if (/^#[0-9a-f]{4}$/i.test(c)) return c.slice(0, 4);
    const m = /^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)$/i.exec(c.replace(/\s/g, ''));
    return m ? `rgb(${m[1]},${m[2]},${m[3]})` : c;
}

function sourceValue(b: { open: number; high: number; low: number; close: number }, src: RegressionSource): number {
    switch (src) {
        case 'open':
            return b.open;
        case 'high':
            return b.high;
        case 'low':
            return b.low;
        case 'hl2':
            return (b.high + b.low) / 2;
        case 'hlc3':
            return (b.high + b.low + b.close) / 3;
        case 'ohlc4':
            return (b.open + b.high + b.low + b.close) / 4;
        default:
            return b.close;
    }
}

/** TradingView's regression trend fit: the least-squares base line, the sample standard deviation of the values
 *  around it (n − 1) and Pearson's R (unsigned). Null under 2 values. */
export function computeTvRegression(values: readonly number[]): { base0: number; base1: number; sd: number; pearsons: number } | null {
    const n = values.length;
    if (n < 2) return null;
    let sx = 0;
    let sy = 0;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < n; i += 1) {
        const y = values[i]!;
        sx += i;
        sy += y;
        sxy += i * y;
        sxx += i * i;
        syy += y * y;
    }
    const denom = n * sxx - sx * sx;
    const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    let sse = 0;
    for (let i = 0; i < n; i += 1) {
        const r = values[i]! - (intercept + slope * i);
        sse += r * r;
    }
    const den = Math.sqrt(denom * (n * syy - sy * sy));
    return { base0: intercept, base1: intercept + slope * (n - 1), sd: Math.sqrt(sse / (n - 1)), pearsons: den === 0 ? 0 : Math.abs((n * sxy - sx * sy) / den) };
}

/** One drawn TradingView regression line in pixels. */
export interface RegressionTvLine {
    key: 'down' | 'base' | 'up';
    y0: number;
    y1: number;
    line: RegressionTrendLine;
}

/** TradingView's regression layout: the lines bottom-up (down, base, up; hidden or unused ones left out), the base
 *  line's ends (the handles) and Pearson's R under the down line's start. */
export interface RegressionTvLayout {
    x0: number;
    x1: number;
    /** Right end of the lines and fills (the pane's edge when extended). */
    xEnd: number;
    baseY0: number;
    baseY1: number;
    lines: RegressionTvLine[];
    pearsons: { x: number; y: number; text: string; color: string } | null;
}

/**
 * A linear-regression channel: two anchors bound a time range, and the tool fits a
 * least-squares trendline over the bars' closes in that range, drawing a ±2σ band
 * around it. The R² of the fit is shown (as an integer %) at the start of the channel.
 * The fit is DATA-driven — only the anchors' times matter — so it recomputes live as
 * an endpoint is dragged or new bars arrive, via {@link Projector.barsInRange}.
 */
export class RegressionChannel extends Drawing {
    readonly type = 'regressionchannel' as const;

    /** Per-line + fill cosmetics (seeded from defaults, persisted via props). Definite-assignment:
     *  set either by `readProps` (during `super()`) or by the constructor below — never as a field
     *  initializer, which would run *after* `super()` and clobber a restored value. */
    reg!: RegressionStyle;
    /** TradingView's regression trend (module 127345 / 998707): a new one; one saved before keeps its look. */
    declare tv?: boolean;
    declare trend: RegressionTrend;

    /** Last computed price span (midline ± band), cached so autoscale's `priceRange()`
     *  — which gets no projector — can fold the channel in without recomputing. */
    private cachedRange: { min: number; max: number } | null = null;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        if (!this.reg) this.reg = defaultRegressionStyle();
        if (!init.props) {
            this.tv = true;
            this.trend = defaultRegressionTrend();
        }
    }

    /** TradingView's lines over the bars in the anchors' range (null with under 2 bars). */
    tvLayout(proj: Projector): RegressionTvLayout | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const from = Math.min(a.time, b.time);
        const to = Math.max(a.time, b.time);
        const bars = proj.barsInRange?.(from, to) ?? null;
        const t = this.trend;
        const f = bars ? computeTvRegression(bars.map((bar) => sourceValue(bar, t.source))) : null;
        if (!bars || !f) return null;
        const at = (dev: number, end: 0 | 1): number => (end === 0 ? f.base0 : f.base1) + dev * f.sd;
        const priced: Array<{ key: RegressionTvLine['key']; p0: number; p1: number; line: RegressionTrendLine }> = [];
        if (t.useLower) priced.push({ key: 'down', p0: at(t.lowerDev, 0), p1: at(t.lowerDev, 1), line: t.down });
        priced.push({ key: 'base', p0: f.base0, p1: f.base1, line: t.base });
        if (t.useUpper) priced.push({ key: 'up', p0: at(t.upperDev, 0), p1: at(t.upperDev, 1), line: t.up });
        const prices = priced.flatMap((l) => [l.p0, l.p1]);
        this.cachedRange = { min: Math.min(...prices), max: Math.max(...prices) };
        const lines: RegressionTvLine[] = [];
        let baseY0: number | null = null;
        let baseY1: number | null = null;
        let downY0: number | null = null;
        for (const l of priced) {
            const y0 = proj.yOf(l.p0, this.paneId);
            const y1 = proj.yOf(l.p1, this.paneId);
            if (y0 == null || y1 == null) return null;
            if (l.key === 'base') {
                baseY0 = y0;
                baseY1 = y1;
            }
            if (l.key === 'down') downY0 = y0;
            if (l.line.show) lines.push({ key: l.key, y0, y1, line: l.line });
        }
        const x0 = proj.xOf(bars[0]!.time);
        const x1 = proj.xOf(bars[bars.length - 1]!.time);
        return {
            x0,
            x1,
            xEnd: t.extend ? Math.max(x1, proj.width) : x1,
            baseY0: baseY0!,
            baseY1: baseY1!,
            lines,
            // TradingView: centred under the down line's start, 4 px below, in its colour (opaque).
            pearsons: t.pearsons && downY0 != null ? { x: x0, y: downY0 + 4, text: String(f.pearsons), color: opaqueColor(t.down.color) } : null,
        };
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        // Two points bound the time range; the fit ignores their price (data-driven),
        // so handles are constrained to horizontal moves.
        return { min: 2, max: 2, slots: [{ role: 'start', free: 'x' }, { role: 'end', free: 'x' }] };
    }

    /** Fit against the bars in the anchor time-range, caching the price span for autoscale. */
    fit(proj: Projector): RegressionFit | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const from = Math.min(a.time, b.time);
        const to = Math.max(a.time, b.time);
        const bars = proj.barsInRange?.(from, to) ?? null;
        const f = bars ? computeRegressionFit(bars) : null;
        if (f) {
            this.cachedRange = { min: Math.min(f.mid0, f.mid1) - f.dev, max: Math.max(f.mid0, f.mid1) + f.dev };
        }
        return f;
    }

    /** Resolve the fit to pixel geometry for the painter + hit-test. */
    layout(proj: Projector): RegressionLayout | null {
        const f = this.fit(proj);
        if (!f) return null;
        const midY0 = proj.yOf(f.mid0, this.paneId);
        const midY1 = proj.yOf(f.mid1, this.paneId);
        const upperY0 = proj.yOf(f.mid0 + f.dev, this.paneId);
        const upperY1 = proj.yOf(f.mid1 + f.dev, this.paneId);
        const lowerY0 = proj.yOf(f.mid0 - f.dev, this.paneId);
        const lowerY1 = proj.yOf(f.mid1 - f.dev, this.paneId);
        if (midY0 == null || midY1 == null || upperY0 == null || upperY1 == null || lowerY0 == null || lowerY1 == null) return null;
        return {
            x0: proj.xOf(f.t0),
            x1: proj.xOf(f.t1),
            midY0,
            midY1,
            upperY0,
            upperY1,
            lowerY0,
            lowerY1,
            r2: f.r2,
            showR2: this.reg.showR2,
        };
    }

    /** The band outline polygon (upper edge left→right, then lower edge right→left). */
    private band(proj: Projector): Array<[number, number]> | null {
        const L = this.layout(proj);
        if (!L) return null;
        return [
            [L.x0, L.upperY0],
            [L.x1, L.upperY1],
            [L.x1, L.lowerY1],
            [L.x0, L.lowerY0],
        ];
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        if (this.tv) {
            const T = this.tvLayout(proj);
            if (!T) return false;
            const ls = T.lines;
            if (ls.length >= 2) {
                const lo = ls[0]!;
                const hi = ls[ls.length - 1]!;
                if (pointInPolygon(px, py, [[T.x0, hi.y0], [T.xEnd, hi.y0 + ((hi.y1 - hi.y0) * (T.xEnd - T.x0)) / Math.max(1, T.x1 - T.x0)], [T.xEnd, lo.y0 + ((lo.y1 - lo.y0) * (T.xEnd - T.x0)) / Math.max(1, T.x1 - T.x0)], [T.x0, lo.y0]])) return true;
            }
            return [...ls.map((l) => [l.y0, l.y1] as const), [T.baseY0, T.baseY1] as const].some(([y0, y1]) => distToSegment(px, py, T.x0, y0, T.x1, y1) <= tol);
        }
        const L = this.layout(proj);
        if (!L) return false;
        const poly: Array<[number, number]> = [
            [L.x0, L.upperY0],
            [L.x1, L.upperY1],
            [L.x1, L.lowerY1],
            [L.x0, L.lowerY0],
        ];
        if (pointInPolygon(px, py, poly)) return true;
        const lines: Array<[number, number, number, number]> = [
            [L.x0, L.midY0, L.x1, L.midY1],
            [L.x0, L.upperY0, L.x1, L.upperY1],
            [L.x0, L.lowerY0, L.x1, L.lowerY1],
        ];
        return lines.some((s) => distToSegment(px, py, s[0], s[1], s[2], s[3]) <= tol);
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        if (this.tv) {
            const T = this.tvLayout(proj);
            if (T) return [[T.x0, T.baseY0], [T.x1, T.baseY1]];
        }
        const L = this.tv ? null : this.layout(proj);
        if (L) return [[L.x0, L.midY0], [L.x1, L.midY1]];
        // no fit (e.g. no data yet) → fall back to the raw anchors so the tool stays grabbable
        const pts: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            pts.push([proj.xOf(a.time), y]);
        }
        return pts;
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        if (this.tv) {
            const T = this.tvLayout(proj);
            if (!T) return null;
            const ys = [T.baseY0, T.baseY1, ...T.lines.flatMap((l) => [l.y0, l.y1])];
            const y = Math.min(...ys);
            return { x: T.x0, y, w: T.x1 - T.x0, h: Math.max(...ys) - y };
        }
        const poly = this.band(proj);
        if (!poly) return null;
        const xs = poly.map((p) => p[0]);
        const ys = poly.map((p) => p[1]);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.cachedRange) return this.cachedRange;
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
    }

    schema(): SettingsSchema {
        // TradingView's look edits in its own Inputs and Style tabs; the width is its bar's one control.
        if (this.tv) return { fields: [{ path: 'trend.base.width', label: 'Line width', kind: 'number', min: 1, max: 4, step: 1, group: 'line' }] };
        // Custom paths the settings popup renders as dedicated regression controls
        // (per-line color + style, the two area fills, and the R² toggle).
        return {
            fields: [
                { path: 'reg.midColor', label: 'Midline color', kind: 'color', group: 'line' },
                { path: 'reg.midStyle', label: 'Midline style', kind: 'lineStyle', group: 'line' },
                { path: 'reg.upperColor', label: 'Upper line color', kind: 'color', group: 'line' },
                { path: 'reg.upperStyle', label: 'Upper line style', kind: 'lineStyle', group: 'line' },
                { path: 'reg.lowerColor', label: 'Lower line color', kind: 'color', group: 'line' },
                { path: 'reg.lowerStyle', label: 'Lower line style', kind: 'lineStyle', group: 'line' },
                { path: 'reg.upperFill', label: 'Upper fill', kind: 'color', group: 'fill' },
                { path: 'reg.lowerFill', label: 'Lower fill', kind: 'color', group: 'fill' },
                { path: 'reg.showR2', label: 'Show R²', kind: 'boolean', group: 'behavior' },
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> {
        if (this.tv) return { tv: true, trend: structuredClone(this.trend) };
        return { ...this.reg };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv === true) {
            this.tv = true;
            const d = defaultRegressionTrend();
            const p = (props.trend ?? {}) as Partial<RegressionTrend>;
            const line = (k: 'base' | 'up' | 'down'): RegressionTrendLine => ({ ...d[k], ...(p[k] ?? {}) });
            this.trend = { ...d, ...p, base: line('base'), up: line('up'), down: line('down') };
            if (!REGRESSION_SOURCES.includes(this.trend.source)) this.trend.source = 'close';
            return;
        }
        this.reg = { ...defaultRegressionStyle(), ...(props as Partial<RegressionStyle>) };
    }
}
