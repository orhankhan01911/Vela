/**
 * Drawing anchors past the newest bar on charts whose x axis counts bars, not time (tick, volume, delta, range bars,
 * Renko: the chart types that supply their own series).
 *
 * An anchor is a time. Past the newest bar the time scale extrapolates with the median bar spacing, which on those
 * charts is a few seconds and changes with every reload and data update, so a point drawn "10 bars ahead" slid or
 * jumped by itself (2026-10-26: 40-70 px in 90 s on tick and delta bars, a jump on Renko after a reload). There such an
 * anchor is kept as "`n` bars after the bar at `from`" ({@link FutureBars}): new bars walk into it one at a time and a
 * reload cannot move it. Its `time` stays the clock time it had when placed, so time charts (and readers that do not
 * know `bars`) keep placing it exactly as before.
 */
import type { DrawingPoint } from './geometry';

/** `n` (fractional) bars after the bar at time `from`. */
export interface FutureBars {
    from: number;
    n: number;
}

/** The bar axis of a chart whose x counts bars; null on a time chart. */
export interface BarAxis {
    /** Time of the newest bar. */
    lastTime: number;
    /** Fractional bar index of a time (extrapolated past either end). */
    logicalOf(time: number): number;
    /** Time at a fractional bar index (inverse of {@link logicalOf}). */
    timeOf(logical: number): number;
    /** Index of the newest bar. */
    lastLogical: number;
}

/** The time a `bars` anchor was saved with, while its `time` holds where it draws now. */
const CLOCK = new WeakMap<DrawingPoint, number>();

function validBars(b: unknown): b is FutureBars {
    const v = b as Partial<FutureBars> | null;
    return !!v && typeof v === 'object' && Number.isFinite(v.from) && Number.isFinite(v.n);
}

/** A clean copy of a serialized anchor (untrusted input): time, price and a well-formed `bars` only. */
export function readAnchor(p: DrawingPoint): DrawingPoint {
    const out: DrawingPoint = { time: p.time, price: p.price };
    if (validBars(p.bars)) {
        out.bars = { from: p.bars.from, n: p.bars.n };
        CLOCK.set(out, p.time);
    }
    return out;
}

/** Point each `bars` anchor at its bar on a bar-axis chart, or back at its saved time on a time chart. */
export function resolveAnchors(anchors: readonly DrawingPoint[], axis: BarAxis | null): void {
    for (const a of anchors) {
        if (!a.bars) continue;
        const clock = CLOCK.get(a) ?? a.time;
        CLOCK.set(a, clock);
        a.time = axis ? axis.timeOf(axis.logicalOf(a.bars.from) + a.bars.n) : clock;
    }
}

/**
 * The anchor to save. An anchor that still carries `bars` was not moved (a move builds new anchor objects), so it
 * keeps them. Any other anchor past the newest bar of a bar-axis chart gets `bars` from its current place.
 */
export function writeAnchor(a: DrawingPoint, axis: BarAxis | null): DrawingPoint {
    if (a.bars) return { time: CLOCK.get(a) ?? a.time, price: a.price, bars: { from: a.bars.from, n: a.bars.n } };
    if (axis) {
        const n = axis.logicalOf(a.time) - axis.lastLogical;
        if (n > 1e-6) return { time: a.time, price: a.price, bars: { from: axis.lastTime, n } };
    }
    return { time: a.time, price: a.price };
}

/**
 * Move anchors by `dLogical` bars on a bar-axis chart: a whole-drawing drag shifts every anchor by the same number of
 * bars, so the shape keeps its bar spacing where bars are denser or sparser in time. `move` is the type's own
 * `translateBody` (it may pin some anchors); it runs in bar-index space and the result is mapped back to times.
 */
export function translateInBars(
    orig: readonly DrawingPoint[],
    dLogical: number,
    dPrice: number,
    axis: BarAxis,
    move: (dt: number, dp: number, orig: DrawingPoint[]) => DrawingPoint[],
): DrawingPoint[] {
    const asBars = orig.map((o) => ({ time: axis.logicalOf(o.time), price: o.price }));
    return move(dLogical, dPrice, asBars).map((p) => ({ time: axis.timeOf(p.time), price: p.price }));
}

/**
 * Times a drawing derives from its anchors (fib time zones, Gann time levels, pitchfork and channel midpoints, ghost
 * and copied candles): on a chart whose x counts bars they are measured in bars, so a level "1.618 of the span" sits
 * 1.618 spans of BARS on, evenly spaced on screen; on a time chart in time, as before. (2026-10-26: on tick bars the
 * fib time zone lines 1, 2 and 3 were 113, 132 and 95 px apart.)
 */
export function timeBetween(proj: { barAxis?: BarAxis | null }, t0: number, t1: number, r: number): number {
    const ax = proj.barAxis;
    if (!ax) return t0 + r * (t1 - t0);
    const l0 = ax.logicalOf(t0);
    return ax.timeOf(l0 + r * (ax.logicalOf(t1) - l0));
}

/** `origin` plus `r` times the span from `from` to `to` (by bars on a bar-axis chart, see {@link timeBetween}). */
export function timeAfter(proj: { barAxis?: BarAxis | null }, origin: number, from: number, to: number, r: number): number {
    const ax = proj.barAxis;
    if (!ax) return origin + r * (to - from);
    return ax.timeOf(ax.logicalOf(origin) + r * (ax.logicalOf(to) - ax.logicalOf(from)));
}

/** `n` bars after time `t` on a bar-axis chart; `t + ms` on a time chart. */
export function timePlusBars(proj: { barAxis?: BarAxis | null }, t: number, n: number, ms: number): number {
    const ax = proj.barAxis;
    return ax ? ax.timeOf(ax.logicalOf(t) + n) : t + ms;
}
