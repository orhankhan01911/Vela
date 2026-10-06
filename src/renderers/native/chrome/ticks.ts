/**
 * Clean-room tick generation for the native renderer's axes.
 *  - `priceTicks`: 1/2/5×10ⁿ "nice numbers" for the price axis.
 *  - `timeTicks`: a UTC-aligned ladder for the time axis (crypto/24-7 friendly;
 *    DST/session-aware ticks are a later refinement — see the plan's risk list).
 */
import type { PctScale } from '../core/SceneGraph';
import { zonedDate } from './tz';

export function priceTicks(min: number, max: number, target = 6): number[] {
    if (!(max > min) || !Number.isFinite(min) || !Number.isFinite(max)) return [];
    const raw = (max - min) / Math.max(1, target);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
    const out: number[] = [];
    const start = Math.ceil(min / step) * step;
    for (let v = start; v <= max + step * 1e-6; v += step) {
        out.push(Number(v.toFixed(decimals)));
    }
    return out;
}

/** Decimals to show for a price, derived from the tick step magnitude. */
export function priceDecimals(min: number, max: number, target = 6): number {
    if (!(max > min)) return 2;
    const raw = (max - min) / Math.max(1, target);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    return Math.max(0, Math.min(8, -Math.floor(Math.log10(step)) + 1));
}

/**
 * Nice ticks for a logarithmic axis. Over a wide range (≥ ~1 decade) it places
 * 1/2/5 per decade; over a narrow range (the common zoomed view) log ≈ linear,
 * so it falls back to dense linear nice-numbers — positioned via the log mapping.
 */
export function logPriceTicks(min: number, max: number, target = 6): number[] {
    if (min <= 0 || !(max > min) || !Number.isFinite(min) || !Number.isFinite(max)) return [];
    if (Math.log10(max) - Math.log10(min) < 1.1) return priceTicks(min, max, target);
    const out: number[] = [];
    const startExp = Math.floor(Math.log10(min));
    const endExp = Math.ceil(Math.log10(max));
    for (let e = startExp; e <= endExp; e += 1) {
        for (const m of [1, 2, 5]) {
            const v = m * Math.pow(10, e);
            if (v >= min && v <= max) out.push(v);
        }
    }
    return out;
}

/** Decimals to show for a single price value (for log axes where the step varies). */
export function valueDecimals(v: number): number {
    const a = Math.abs(v);
    if (a >= 100) return 0;
    if (a >= 1) return 2;
    if (a >= 0.01) return 4;
    return 6;
}

/**
 * Decimal places needed to render a tick size exactly (0.01 → 2, 0.5 → 1, 1 → 0).
 * Probes increasing precision until the value round-trips, so it's robust to float
 * noise and to non-power-of-10 ticks (0.25, 0.5). Capped at 8.
 */
export function tickDecimals(tick: number): number {
    if (!(tick > 0) || !Number.isFinite(tick)) return 2;
    for (let d = 0; d <= 8; d += 1) {
        if (Math.abs(Number(tick.toFixed(d)) - tick) <= tick * 1e-6) return d;
    }
    return 8;
}

/**
 * Decimals for a price-axis label, by precedence:
 *  1. the exchange symbol's tick size (`mintick`) when known — the instrument's TRUE
 *     precision, so it doesn't drift with zoom;
 *  2. otherwise the zoom-derived "nice step" formula (the only source before symbol
 *     metadata loads, or for offline / non-exchange data).
 * A result of 0 is floored to 2 so a price never renders as a bare integer.
 */
export function axisDecimals(scale: { min: number; max: number }, heightPx: number, mintick?: number): number {
    const d = mintick != null && mintick > 0 ? tickDecimals(mintick) : priceDecimals(scale.min, scale.max, tickCount(heightPx));
    return d === 0 ? 2 : d;
}

/** Price-axis label density: ~one tick per 50px of pane height (like LwC). */
export function tickCount(paneHeightPx: number): number {
    return Math.max(2, Math.min(16, Math.round(paneHeightPx / 50)));
}

/** Price ticks for a pane: log ticks if logarithmic, else height-adaptive nice numbers. */
export function paneTicks(scale: { min: number; max: number; log?: boolean }, heightPx: number): number[] {
    return scale.log
        ? logPriceTicks(scale.min, scale.max, tickCount(heightPx))
        : priceTicks(scale.min, scale.max, tickCount(heightPx));
}

/** A price → percent-change vs baseline. */
function toPct(price: number, baseline: number): number {
    return (price / baseline - 1) * 100;
}

/** A price → value indexed to 100 at the baseline (`baseline` reads exactly 100). */
function toIndex(price: number, baseline: number): number {
    return (price / baseline) * 100;
}

/** Format a percent change with a sign (`+2.34%` / `-1.20%`). */
export function formatPct(pct: number): string {
    const sign = pct >= 0 ? '+' : '-';
    return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

/** Format an indexed-to-100 value (plain number, two decimals, e.g. `103.45`). */
export function formatIndex(idx: number): string {
    return idx.toFixed(2);
}

/** Abbreviate a magnitude with a K/M/B suffix (e.g. `1.2M`) — for volume axes, where a
 *  raw `1234567.00` reads poorly. Small values keep up to two decimals, dropping trailing
 *  zeros; a bare `0` stays `0`. */
export function formatCompactValue(v: number): string {
    const a = Math.abs(v);
    if (a >= 1e9) return `${trimZeros(v / 1e9)}B`;
    if (a >= 1e6) return `${trimZeros(v / 1e6)}M`;
    if (a >= 1e3) return `${trimZeros(v / 1e3)}K`;
    return trimZeros(v);
}

/** Up to two decimals, trailing zeros removed (`1.20 → 1.2`, `3.00 → 3`). */
function trimZeros(v: number): string {
    return Number(v.toFixed(2)).toString();
}

/**
 * Axis ticks for a pane as `{ price, label }` — the single source both the gridlines
 * (which need the pixel position from `price`) and the axis labels consume, so they
 * always agree. In percent / indexed mode (`pct` set) the ticks are nice ROUND percents
 * or index values mapped back to price; otherwise nice round prices. Linear only for
 * percent/indexed (the affine price↔percent map keeps the geometry identical to a linear
 * price axis). `format:'volume'` abbreviates the labels (K/M/B) — used for a volume-only pane.
 * `format:'none'` yields no ticks at all — an unscaled pane (content not value-mapped) draws
 * neither labels nor the gridlines that would ride them.
 */
export function paneAxisTicks(
    scale: { min: number; max: number; log?: boolean },
    heightPx: number,
    pct?: PctScale,
    mintick?: number,
    format?: 'volume' | 'none',
): Array<{ price: number; label: string }> {
    if (format === 'none') return [];
    if (pct) {
        const { baseline, indexed } = pct;
        const lo = Math.min(scale.min, scale.max);
        const hi = Math.max(scale.min, scale.max);
        if (indexed) {
            const iLo = toIndex(lo, baseline);
            const iHi = toIndex(hi, baseline);
            return priceTicks(iLo, iHi, tickCount(heightPx)).map((idx) => ({ price: (baseline * idx) / 100, label: formatIndex(idx) }));
        }
        const pLo = toPct(lo, baseline);
        const pHi = toPct(hi, baseline);
        return priceTicks(pLo, pHi, tickCount(heightPx)).map((p) => ({ price: baseline * (1 + p / 100), label: formatPct(p) }));
    }
    if (format === 'volume') {
        return paneTicks(scale, heightPx).map((price) => ({ price, label: formatCompactValue(price) }));
    }
    return paneTicks(scale, heightPx).map((price) => ({ price, label: formatPriceLabel(scale, heightPx, price, mintick) }));
}

/** Format a single price for an axis chip in the pane's mode (percent / indexed vs absolute; a
 *  volume pane abbreviates with K/M/B; an unscaled pane yields '' — callers skip the chip). */
export function formatAxisValue(
    scale: { min: number; max: number; log?: boolean },
    heightPx: number,
    value: number,
    pct?: PctScale,
    mintick?: number,
    format?: 'volume' | 'none',
): string {
    if (format === 'none') return '';
    if (pct) return pct.indexed ? formatIndex(toIndex(value, pct.baseline)) : formatPct(toPct(value, pct.baseline));
    if (format === 'volume') return formatCompactValue(value);
    return formatPriceLabel(scale, heightPx, value, mintick);
}

/**
 * Format a price for an axis/chip. Decimals come from {@link axisDecimals} (exchange
 * tick size when known, else the zoom-derived formula, floored at 2), EXCEPT on wide
 * (multi-decade) log scales which use per-value decimals so tiny + huge prices both
 * read well. Shared by the price axis, the current-price line, and the crosshair so
 * they always agree.
 */
export function formatPriceLabel(scale: { min: number; max: number; log?: boolean }, heightPx: number, value: number, mintick?: number): string {
    const wideLog = scale.log && Math.log10(scale.max) - Math.log10(scale.min) >= 1.1;
    if (wideLog) {
        const d = valueDecimals(value);
        return value.toFixed(d === 0 ? 2 : d);
    }
    return value.toFixed(axisDecimals(scale, heightPx, mintick));
}

export interface TimeTick {
    time: number;
    label: string;
    major: boolean;
}

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const STEP_LADDER = [
    SEC, 5 * SEC, 15 * SEC, 30 * SEC,
    MIN, 5 * MIN, 15 * MIN, 30 * MIN,
    HOUR, 2 * HOUR, 4 * HOUR, 6 * HOUR, 12 * HOUR,
    DAY, 2 * DAY, WEEK, 2 * WEEK, MONTH, 2 * MONTH, 3 * MONTH, 6 * MONTH, YEAR,
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/**
 * The crosshair's time-axis chip: `Sun 30 Aug '26 19:00`. Always the full calendar date
 * (weekday, day, month, two-digit year) so the stamp is unambiguous however far the view
 * is scrolled; the wall-clock time is appended only when bars are intraday — on a daily
 * or coarser bar the hh:mm would just echo the bar's open and add noise.
 */
export function formatTimeStamp(ms: number, timeZone: string, barIntervalMs: number): string {
    const d = zonedDate(ms, timeZone);
    const date = `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} '${pad2(d.getUTCFullYear() % 100)}`;
    if (barIntervalMs >= DAY) return date;
    return `${date} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function pickStepIndex(targetMs: number): number {
    for (let i = 0; i < STEP_LADDER.length; i += 1) if (STEP_LADDER[i]! >= targetMs) return i;
    return STEP_LADDER.length - 1;
}

/** Bar times for gap handling: ticks that land where the market is closed (weekends, holidays,
 *  overnight) have no bar under them, so they are dropped or snapped to the next session open. */
export interface TickBars {
    times: readonly number[];
    intervalMs: number;
}

/** Raw ticks for one ladder step, in zoned space. `t` is the real epoch-ms. */
function ticksForStep(zFrom: number, zTo: number, step: number, offsetMs: number): TimeTick[] {
    const out: TimeTick[] = [];
    const push = (zt: number, label: string, major: boolean): void => {
        out.push({ time: zt - offsetMs, label, major });
    };
    if (step >= MONTH) {
        // Calendar months (the 1st), never 30-day blocks that drift onto odd dates like "Sep 4".
        const months = step >= YEAR ? 12 : Math.max(1, Math.round(step / MONTH));
        const start = new Date(zFrom);
        let y = start.getUTCFullYear();
        let m = start.getUTCMonth();
        if (Date.UTC(y, m, 1) < zFrom) m += 1;
        m = Math.ceil(m / months) * months; // align to Jan / (Mar) / Apr / Jul ... by step
        for (;;) {
            const zt = Date.UTC(y, m, 1);
            if (zt > zTo) break;
            const d = new Date(zt);
            if (months >= 12 || d.getUTCMonth() === 0) push(zt, String(d.getUTCFullYear()), true);
            else push(zt, MONTHS[d.getUTCMonth()]!, true);
            m += months;
        }
        return out;
    }
    if (step >= WEEK) {
        // Weeks start on Monday (epoch day 0 was a Thursday).
        const anchor = 4 * DAY;
        for (let zt = Math.ceil((zFrom - anchor) / step) * step + anchor; zt <= zTo; zt += step) {
            const d = new Date(zt);
            push(zt, d.getUTCDate() === 1 ? MONTHS[d.getUTCMonth()]! : `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`, d.getUTCDate() === 1);
        }
        return out;
    }
    for (let zt = Math.ceil(zFrom / step) * step; zt <= zTo; zt += step) {
        const d = new Date(zt);
        if (step < DAY) {
            const h = d.getUTCHours();
            const m = d.getUTCMinutes();
            if (h === 0 && m === 0) push(zt, `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`, true);
            else push(zt, `${pad2(h)}:${pad2(m)}`, false);
        } else {
            const first = d.getUTCDate() === 1;
            push(zt, first ? MONTHS[d.getUTCMonth()]! : `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`, first);
        }
    }
    return out;
}

/** Index of the first bar at or after `ms`, or -1 when `ms` is outside the loaded bars. */
function firstBarAtOrAfter(times: readonly number[], ms: number): number {
    const n = times.length;
    if (n === 0 || ms < times[0]! || ms > times[n - 1]!) return -1;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (times[mid]! < ms) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

/**
 * Handle ticks that fall in a closed-market gap (weekend, holiday, overnight): there is no bar
 * there, so the axis maps them onto the one spot between two bars and "Oct 3 / Oct 4 / Oct 5"
 * stack on top of each other. Per gap we keep ONLY the last date-style tick, snapped to the
 * first bar after the gap, and drop time-of-day ticks that have no bar under them.
 */
function resolveGaps(ticks: TimeTick[], bars: TickBars, offsetMs: number): TimeTick[] {
    const { times, intervalMs } = bars;
    if (times.length < 2 || !(intervalMs > 0)) return ticks;
    const gapMs = intervalMs * 1.5;
    const keep: TimeTick[] = [];
    const lastInGap = new Map<number, TimeTick>();
    for (const tick of ticks) {
        const hi = firstBarAtOrAfter(times, tick.time);
        if (hi <= 0 || times[hi]! === tick.time || times[hi]! - times[hi - 1]! <= gapMs) {
            keep.push(tick);
            continue;
        }
        if (tick.major || !tick.label.includes(':')) lastInGap.set(hi, tick); // date-style only; later ticks in the same gap replace earlier ones
    }
    for (const [hi, tick] of lastInGap) {
        // A snapped day tick takes the date of the bar it lands on (a 2-day step can sit on
        // Sunday while the reopening bar is Monday). Month / year labels keep their text.
        let label = tick.label;
        if (/^[A-Z][a-z]{2} \d+$/.test(label)) {
            const d = new Date(times[hi]! + offsetMs);
            label = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
        }
        if (!keep.some((k) => k.label === label)) keep.push({ ...tick, label, time: times[hi]! });
    }
    keep.sort((a, b) => a.time - b.time);
    return keep;
}

/**
 * Calendar-aware tick ladder for the time axis. `offsetMs` shifts alignment + labels into
 * a chosen time zone (0 ⇒ UTC): ticks land on local midnights/hours and the returned
 * `time` is the REAL epoch-ms (zoned alignment undone) so the X mapping stays correct.
 * Months land on the 1st and weeks on Mondays. When a step would leave fewer than three
 * ticks in view (a narrow phone, a few weeks of daily bars) it steps down to a finer one so
 * the axis is never left with one or no date. `bars` (optional) removes ticks that fall in
 * closed-market gaps, see {@link resolveGaps}.
 */
export function timeTicks(fromMs: number, toMs: number, target = 8, offsetMs = 0, bars?: TickBars): TimeTick[] {
    const span = toMs - fromMs;
    if (!(span > 0)) return [];
    const zFrom = fromMs + offsetMs;
    const zTo = toMs + offsetMs;
    let idx = pickStepIndex(span / Math.max(1, target));
    let out = ticksForStep(zFrom, zTo, STEP_LADDER[idx]!, offsetMs);
    const resolved = (t: TimeTick[]): TimeTick[] => (bars ? resolveGaps(t, bars, offsetMs) : t);
    out = resolved(out);
    // Count only ticks clear of the view edges: the renderer drops labels within ~20px of either
    // edge, so on a phone a tick near the edge is as good as missing.
    const inset = span * 0.08;
    const inView = (t: TimeTick[]): number => t.filter((x) => x.time >= fromMs + inset && x.time <= toMs - inset).length;
    while (inView(out) < 3 && idx > 0) {
        idx -= 1;
        out = resolved(ticksForStep(zFrom, zTo, STEP_LADDER[idx]!, offsetMs));
    }
    return out;
}
