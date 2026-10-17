/**
 * "Visibility on intervals" (TradingView's drawing Visibility tab): a drawing can be shown only on some chart
 * timeframes, e.g. on 1-4 hour charts and daily charts but not on minute charts. Each unit has an on/off switch
 * and a from-to range in that unit. A drawing with no `intervals` is shown everywhere.
 *
 * The chart's timeframe comes in as its bar duration in ms. Tick and range charts have no fixed duration, so
 * TradingView's "Ticks" and "Ranges" rows are not offered here.
 */

export type IntervalUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export interface IntervalRange {
    on: boolean;
    from: number;
    to: number;
}

export type IntervalVisibility = Partial<Record<IntervalUnit, IntervalRange>>;

export interface IntervalUnitMeta {
    unit: IntervalUnit;
    label: string;
    /** One unit in ms (a month counts as 30 days, a week as 7). */
    ms: number;
    max: number;
}

export const INTERVAL_UNITS: readonly IntervalUnitMeta[] = [
    { unit: 'seconds', label: 'Seconds', ms: 1_000, max: 59 },
    { unit: 'minutes', label: 'Minutes', ms: 60_000, max: 59 },
    { unit: 'hours', label: 'Hours', ms: 3_600_000, max: 24 },
    { unit: 'days', label: 'Days', ms: 86_400_000, max: 366 },
    { unit: 'weeks', label: 'Weeks', ms: 7 * 86_400_000, max: 52 },
    { unit: 'months', label: 'Months', ms: 30 * 86_400_000, max: 12 },
];

/** The full range of a unit, switched on (the default for every row). */
export function defaultRange(unit: IntervalUnit): IntervalRange {
    const meta = INTERVAL_UNITS.find((m) => m.unit === unit)!;
    return { on: true, from: 1, to: meta.max };
}

/** Which unit a bar duration belongs to and how many of it (a 4 h bar is hours 4; 28-31 days is months 1). */
export function barUnit(barMs: number): { unit: IntervalUnit; count: number } | null {
    if (!Number.isFinite(barMs) || barMs <= 0) return null;
    if (barMs >= 28 * 86_400_000) return { unit: 'months', count: Math.max(1, Math.round(barMs / (30 * 86_400_000))) };
    if (barMs >= 7 * 86_400_000 && barMs % (7 * 86_400_000) === 0) return { unit: 'weeks', count: barMs / (7 * 86_400_000) };
    if (barMs >= 86_400_000) return { unit: 'days', count: Math.round(barMs / 86_400_000) };
    if (barMs >= 3_600_000) return { unit: 'hours', count: Math.round(barMs / 3_600_000) };
    if (barMs >= 60_000) return { unit: 'minutes', count: Math.round(barMs / 60_000) };
    return { unit: 'seconds', count: Math.max(1, Math.round(barMs / 1_000)) };
}

/** True when a drawing with these settings shows on a chart whose bars last `barMs`. Unknown durations show. */
export function shownOnBarMs(intervals: IntervalVisibility | undefined, barMs: number): boolean {
    if (!intervals) return true;
    const u = barUnit(barMs);
    if (!u) return true;
    const r = intervals[u.unit];
    if (!r) return true;
    return r.on && u.count >= r.from && u.count <= r.to;
}

/** Drops rows equal to the default (on, full range); returns undefined when nothing is restricted. */
export function compactIntervals(intervals: IntervalVisibility | undefined): IntervalVisibility | undefined {
    if (!intervals) return undefined;
    const out: IntervalVisibility = {};
    for (const m of INTERVAL_UNITS) {
        const r = intervals[m.unit];
        if (r && !(r.on && r.from <= 1 && r.to >= m.max)) out[m.unit] = { on: !!r.on, from: r.from, to: r.to };
    }
    return Object.keys(out).length ? out : undefined;
}
