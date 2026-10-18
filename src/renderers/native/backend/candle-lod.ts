/**
 * Candle level-of-detail tiers, keyed by bar spacing (px between bar centers).
 * Shared by both geometry backends so canvas2d and WebGL2 thin/aggregate at the
 * same zoom thresholds.
 *
 * - `full`: high-low wick + a body (enough room for a visible body).
 * - `wick`: high-low stick only (too thin for a body — the old `spacing < 3` path).
 * - `aggregate`: sub-pixel spacing — bars sharing a pixel column collapse to one
 *   high-low stick, so draw cost stays bounded by screen width when zoomed far out
 *   (true LOD) instead of growing with the bar count.
 */
import type { OHLCV } from '../../../core/model/ohlcv';

export type CandleTier = 'full' | 'wick' | 'aggregate';

/** Below this spacing a candle has no body (wick-only). */
export const CANDLE_BODY_MIN_SPACING = 3;
/** Wick line width in CSS px at wide zoom — rounded to whole device pixels per frame so it stays crisp. */
export const CANDLE_WICK_W = 1.5;
/** Below this spacing bars are bucketed per pixel column (aggregated). */
export const CANDLE_AGG_MAX_SPACING = 1;
/**
 * OHLC bars keep their open/close ticks down to this spacing (a 1 px tick each side still fits
 * between neighbours). Without them a zoomed-out bar chart is a row of plain sticks that looks
 * exactly like a zoomed-out candle chart (tester report 2026-10-17: "bars turn into candles").
 */
export const BAR_TICK_MIN_SPACING = 2;

/**
 * Per-bar paint rule of the candle-drawn styles that differ from plain candles (TradingView's):
 * - `hollowcandles`: color from the close vs the PREVIOUS close; the body is an outline when the
 *   close is above the open and filled when below.
 * - `volumecandles`: body width follows the bar's volume relative to the largest on screen.
 * `null` for every other style (plain candle painting).
 */
export interface CandleVariant {
    /** Up (direction) color for bar `i`. */
    up(i: number): boolean;
    /** Outline-only body for bar `i`. */
    hollow(i: number): boolean;
    /** Body width factor for bar `i` (1 = a normal candle). */
    width(i: number): number;
}

/** Thinnest volume candle as a share of a normal body (a near-zero volume bar stays visible). */
export const VOLUME_CANDLE_MIN_WIDTH = 0.15;

export function candleVariant(style: string, bars: ArrayLike<OHLCV | undefined>, i0: number, i1: number): CandleVariant | null {
    if (style === 'hollowcandles') {
        return {
            up: (i) => {
                const b = bars[i]!;
                const prev = i > 0 ? bars[i - 1] : undefined;
                return b.close >= (prev ? prev.close : b.open);
            },
            hollow: (i) => bars[i]!.close > bars[i]!.open,
            width: () => 1,
        };
    }
    if (style === 'volumecandles') {
        let max = 0;
        for (let i = i0; i <= i1; i += 1) {
            const v = bars[i]?.volume ?? 0;
            if (v > max) max = v;
        }
        return {
            up: (i) => bars[i]!.close >= bars[i]!.open,
            hollow: () => false,
            width: (i) => (max > 0 ? Math.max(VOLUME_CANDLE_MIN_WIDTH, Math.min(1, (bars[i]?.volume ?? 0) / max)) : 1),
        };
    }
    return null;
}

/**
 * Wick line width (CSS px) for a given bar spacing. The body is `~spacing·0.7` wide
 * (`half = floor(spacing·0.7)/2`), so a fixed wick reads as a solid body once bars get tight.
 * Cap the wick at the body's half-width and floor it at 1px: a crisp ~1.5px stick at wide zoom
 * that tapers to a 1px hair when zoomed out, never growing as wide as the candle body.
 * Shared by both backends so canvas2d and WebGL2 thin the wick at the same thresholds.
 */
export function wickWidth(spacing: number): number {
    const halfBody = Math.max(0.5, Math.floor(spacing * 0.7) / 2);
    return Math.max(1, Math.min(CANDLE_WICK_W, halfBody));
}

export function candleTier(spacing: number): CandleTier {
    if (spacing < CANDLE_AGG_MAX_SPACING) return 'aggregate';
    if (spacing < CANDLE_BODY_MIN_SPACING) return 'wick';
    return 'full';
}

/**
 * Snap a CSS-px Y coordinate to the device-pixel grid — the vertical counterpart of
 * candleGeometry's X snapping, applied to candle body tops/bottoms and wick ends.
 * An edge on a whole device pixel rasterizes as one hard step; a fractional one
 * leaves a blended anti-aliasing row that reads as a darker rim on the body. The
 * cost is up to half a device pixel of true position — invisible at any zoom.
 * Shared by both backends so canvas2d and WebGL2 land candles on the same rows.
 */
export function snapY(yCss: number, dpr: number): number {
    return Math.round(yCss * dpr) / dpr;
}

/** Wick + body layout of one candle, in CSS px, with every edge on the device-pixel grid. */
export interface CandleGeometry {
    /** Wick left edge / width. */
    wickX: number;
    wickW: number;
    /** Body left edge / width — always centered on the wick. */
    bodyX: number;
    bodyW: number;
    /** The shared wick/body centerline (the wick stroke's x in canvas2d). */
    center: number;
}

/**
 * Snap one candle's wick + body to the device-pixel grid so the candle stays SYMMETRIC:
 * the wick column is snapped first, then the body is built around it with a device-pixel
 * width of the same parity as the wick's — so both share an exact center and the body
 * extends the same number of device pixels on each side of the wick. (Snapping the two
 * independently lets a 1px wick land on one half of the body, which reads as a lopsided
 * candle once zoomed out.) Body width is constant for a given spacing/dpr, so the gap
 * between candles is uniform to within one device pixel — the raster-grid minimum.
 * Shared by both backends so canvas2d and WebGL2 lay candles out identically.
 */
export function candleGeometry(xCss: number, spacing: number, dpr: number, bodyScale = 1): CandleGeometry {
    const wickDev = Math.max(1, Math.round(wickWidth(spacing) * dpr));
    const wickLeftDev = Math.round(xCss * dpr - wickDev / 2);
    let bodyDev = Math.max(wickDev, Math.round(Math.floor(spacing * 0.7 * bodyScale) * dpr));
    if ((bodyDev - wickDev) % 2 !== 0) bodyDev += 1; // parity-match so the overhang splits evenly
    const sideDev = (bodyDev - wickDev) / 2;
    return {
        wickX: wickLeftDev / dpr,
        wickW: wickDev / dpr,
        bodyX: (wickLeftDev - sideDev) / dpr,
        bodyW: bodyDev / dpr,
        center: (wickLeftDev + wickDev / 2) / dpr,
    };
}

/** One aggregate-tier stick: a contiguous run of SAME-COLOR price coverage inside one pixel column. */
export interface AggregatedStick {
    /** The rounded CSS-px column shared by the stick's bars (canvas2d strokes at `x + 0.5`). */
    x: number;
    hi: number;
    lo: number;
    /** The resolved paint shared by every bar in the run — the grouping key. */
    color: string;
}

/** One in-progress coverage run of the current column (price space, index-tracked). */
interface Coverage {
    lo: number;
    hi: number;
    color: string;
    /** The run's most recent bar — the column's paint order key. */
    lastIdx: number;
}

/**
 * Aggregate-tier bucketing shared by both backends: bars whose centers round to the
 * same pixel column collapse into high-low sticks. Coverage is kept as the UNION of
 * the bars' true high-low ranges — one stick per contiguous run — instead of one
 * min-to-max span, so a PRICE GAP between bars sharing the column (the bars around
 * an overnight jump, once zoomed far out) stays a visible void instead of being
 * painted over as a solid connection. Runs whose separation is under one pixel
 * (`yOf` measures it) merge anyway: an invisible void isn't worth a second stick, and
 * ordinary contiguous data keeps producing exactly one stick per column.
 *
 * Runs are kept PER COLOR (`colorOf` resolves each bar's paint — direction, barcolor(),
 * wick setting): bars of different colors never merge, so a down bar's long wick stays
 * the down color even when the up bar next to it shares the column. Merging them into
 * one first-open→last-close stick would recolor that wick by whichever bar closed last.
 * Within a column the sticks come out in order of their most recent bar, so where runs
 * of different colors overlap in price the latest bar paints on top — the same result
 * drawing the bars one by one would give.
 */
export function aggregateCandleColumns(
    bars: ArrayLike<OHLCV | undefined>,
    i0: number,
    i1: number,
    xOf: (index: number) => number,
    yOf: (price: number) => number,
    colorOf: (bar: OHLCV) => string,
): AggregatedStick[] {
    const out: AggregatedStick[] = [];
    let col = NaN;
    let runs: Coverage[] = []; // the current column's runs, any color; typically length 1
    const flush = (): void => {
        if (runs.length === 0) return;
        // Coalesce same-color runs whose void is sub-pixel — it cannot render anyway.
        // Same-color runs are disjoint (overlaps merged on insert), so in `lo` order the
        // previous run of a color is the one just below.
        runs.sort((a, b) => a.lo - b.lo);
        const merged: Coverage[] = [];
        for (const next of runs) {
            let prev: Coverage | undefined;
            for (let k = merged.length - 1; k >= 0; k -= 1) {
                if (merged[k]!.color === next.color) {
                    prev = merged[k];
                    break;
                }
            }
            if (prev && Math.abs(yOf(prev.hi) - yOf(next.lo)) < 1) {
                prev.hi = next.hi;
                if (next.lastIdx > prev.lastIdx) prev.lastIdx = next.lastIdx;
            } else {
                merged.push(next);
            }
        }
        merged.sort((a, b) => a.lastIdx - b.lastIdx);
        for (const r of merged) out.push({ x: col, hi: r.hi, lo: r.lo, color: r.color });
        runs = [];
    };
    for (let i = i0; i <= i1; i += 1) {
        const b = bars[i];
        if (!b || b.high <= b.low) continue;
        const x = Math.round(xOf(i));
        if (x !== col) {
            flush();
            col = x;
        }
        // Merge the bar's range into every overlapping run OF ITS COLOR (usually zero or one).
        const color = colorOf(b);
        let lo = b.low;
        let hi = b.high;
        for (let k = runs.length - 1; k >= 0; k -= 1) {
            const r = runs[k]!;
            if (r.color !== color || r.lo > hi || r.hi < lo) continue;
            if (r.lo < lo) lo = r.lo;
            if (r.hi > hi) hi = r.hi;
            runs.splice(k, 1);
        }
        runs.push({ lo, hi, color, lastIdx: i }); // `i` is the newest bar, so it is the run's last
    }
    flush();
    return out;
}
