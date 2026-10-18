import { timeframeMs } from '../widget/timeframe';

/**
 * How much history a chart loads (Chart settings > Advanced > History). A bar COUNT is the wrong measure for short
 * and non-time charts: 50 000 one-second bars are about a day, and Renko / tick charts built from them see only that
 * day. So the depth can also be a TIME SPAN (number of days) or a START DATE. The loader still asks in bars: the span
 * is turned into bars for the timeframe being loaded, again on every timeframe switch (7 days = 168 one-hour bars,
 * 604 800 one-second bars). Seconds without a trade have no bar, so a seconds chart can reach a little further back
 * than the span; never less far.
 */
export type HistoryMode = 'bars' | 'days' | 'since';

/** Most bars a span may ask for: 1 000 000 one-second bars is about 11 days, ~0.5 GB in the browser. Measured
 *  2026-10-18 on Local: 522 000 one-second BTC bars (9.75 days) loaded in 16 s and took ~250 MB. */
export const HISTORY_MAX_BARS = 1_000_000;
/** Fewest bars a span asks for (a 1-day span on a daily chart is still a usable chart). */
export const HISTORY_MIN_BARS = 100;

export const HISTORY_DAY_CHOICES = [1, 2, 3, 5, 7, 14, 30, 60, 90, 180, 365, 730, 1825] as const;

export interface HistoryState {
    bars?: number;
    historyDays?: number;
    historySince?: number;
}

export function historyMode(s: HistoryState): HistoryMode {
    if (typeof s.historySince === 'number' && Number.isFinite(s.historySince) && s.historySince > 0) return 'since';
    if (typeof s.historyDays === 'number' && Number.isFinite(s.historyDays) && s.historyDays > 0) return 'days';
    return 'bars';
}

/** The span in ms a time-based depth covers (null for a bar count). */
export function historySpanMs(s: HistoryState, now: number = Date.now()): number | null {
    const mode = historyMode(s);
    if (mode === 'since') return Math.max(0, now - (s.historySince as number));
    if (mode === 'days') return (s.historyDays as number) * 86_400_000;
    return null;
}

/** The oldest bar time a span asks for (the loader's time floor, `market.from`); undefined for a bar count. The
 *  bar count from {@link historyBars} stays the ceiling, so a seconds chart with gaps stops at the date, not past it. */
export function historyFrom(s: HistoryState, now: number = Date.now()): number | undefined {
    const span = historySpanMs(s, now);
    return span == null ? undefined : now - span;
}

/** Bars to load for `timeframe`: the stored count, or the span in bars of that timeframe (clamped). */
export function historyBars(s: HistoryState, timeframe: string | undefined, now: number = Date.now()): number | undefined {
    const span = historySpanMs(s, now);
    if (span == null) return s.bars;
    const tf = timeframeMs(timeframe ?? '60');
    if (!(tf > 0) || !Number.isFinite(tf)) return s.bars;
    return Math.min(HISTORY_MAX_BARS, Math.max(HISTORY_MIN_BARS, Math.ceil(span / tf) + 1));
}

/** `yyyy-mm-dd` of a UTC midnight timestamp (the date field's value). */
export function isoDay(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
}

/** UTC midnight of a `yyyy-mm-dd` date, or null when it is not one (or lies in the future). */
export function parseIsoDay(v: string, now: number = Date.now()): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
    if (!m) return null;
    const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isFinite(ms) || ms > now) return null;
    return ms;
}
