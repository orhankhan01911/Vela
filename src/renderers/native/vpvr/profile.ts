import type { OHLCV } from '../../../core/model/ohlcv';

/** One profile row: `[price, price + rowH)` with the up/down volume that landed in it. */
export interface VpvrRow {
    /** The row's LOWER price bound. */
    price: number;
    up: number;
    down: number;
}

/** The bucketed visible-range volume-by-price profile. */
export interface VpvrProfile {
    /** Ascending by price; length = requested row count (a degenerate flat range yields 1). */
    rows: VpvrRow[];
    /** Price height of one row. */
    rowH: number;
    /** Price floor of the profile (rows[0].price). */
    min: number;
    /** Largest single-row total volume (normalization; > 0). */
    maxTotal: number;
    /** Index of the point-of-control (highest total-volume) row. */
    poc: number;
    /** Value-area row span, inclusive `[vaFrom, vaTo]`. */
    vaFrom: number;
    vaTo: number;
}

/**
 * Bucket the visible bars' volume by price. Each bar's volume is distributed over the
 * rows its high–low range overlaps, proportionally to the overlap, and split up/down by
 * the bar's close direction — so total volume is conserved exactly. The value area is
 * grown from the POC by repeatedly absorbing the larger adjacent row until it covers
 * `valueAreaFrac` of the total volume. Pure — the renderer memoizes calls on the
 * visible range; unit-tested directly.
 *
 * Returns null when the window holds no volume (or no bars).
 */
export function buildVpvrProfile(
    bars: readonly OHLCV[],
    i0: number,
    i1: number,
    rowCount: number,
    valueAreaFrac: number,
    rowSize?: number,
    tick?: number,
): VpvrProfile | null {
    const from = Math.max(0, i0);
    const to = Math.min(bars.length - 1, i1);
    if (from > to) return null;

    let min = Infinity;
    let max = -Infinity;
    for (let i = from; i <= to; i += 1) {
        const b = bars[i]!;
        if (!(b.volume != null && b.volume > 0)) continue; // volume is optional on OHLCV
        if (b.low < min) min = b.low;
        if (b.high > max) max = b.high;
    }
    if (!Number.isFinite(min)) return null; // no visible volume at all

    const grid = vpvrGrid(min, max, rowCount, rowSize, tick);
    min = grid.min;
    const { n, rowH } = grid;
    const rows: VpvrRow[] = Array.from({ length: n }, (_, k) => ({ price: min + k * rowH, up: 0, down: 0 }));

    for (let i = from; i <= to; i += 1) addBar(rows, bars[i]!, min, rowH);

    let total = 0;
    let maxTotal = 0;
    let poc = 0;
    for (let k = 0; k < n; k += 1) {
        const t = rows[k]!.up + rows[k]!.down;
        total += t;
        if (t > maxTotal) {
            maxTotal = t;
            poc = k;
        }
    }
    if (maxTotal <= 0) return null;

    const [vaFrom, vaTo] = growValueArea((k) => rows[k]!.up + rows[k]!.down, n, poc, total, valueAreaFrac);
    return { rows, rowH, min, maxTotal, poc, vaFrom, vaTo };
}

/** Most rows a profile is bucketed into (TradingView allows a row size up to 1 000 000; past this many rows a
 *  "Ticks Per Row" grid widens its rows instead, so a tiny tick on a wide range cannot stall the frame). */
export const VPVR_MAX_ROWS = 2000;

/**
 * The price grid of a profile over `[min, max]`. With no `rowSize` ("Number Of Rows") the range splits into
 * `rowCount` equal rows. With a `rowSize` ("Ticks Per Row": ticks times the symbol's tick) rows are that tall and
 * sit on multiples of it, as TradingView's do. A flat range (every volumed bar at one price) is a single row.
 */
export function vpvrGrid(min: number, max: number, rowCount: number, rowSize?: number, tick?: number): { min: number; rowH: number; n: number } {
    if (rowSize != null && rowSize > 0 && Number.isFinite(rowSize)) {
        let rowH = rowSize;
        let lo = Math.floor(min / rowH) * rowH;
        let n = Math.max(1, Math.floor((max - lo) / rowH) + 1);
        if (n > VPVR_MAX_ROWS) {
            rowH *= Math.ceil(n / VPVR_MAX_ROWS);
            lo = Math.floor(min / rowH) * rowH;
            n = Math.max(1, Math.floor((max - lo) / rowH) + 1);
        }
        return { min: lo, rowH, n };
    }
    if (!(max > min)) return { min, rowH: 1, n: 1 };
    const n = Math.min(VPVR_MAX_ROWS, Math.max(1, Math.round(rowCount)));
    let rowH = (max - min) / n;
    // TradingView rounds the row height UP to a whole number of ticks (XAUUSD, 6 rows: 25.5717 -> 25.58; BTC, 24 rows:
    // 229.667 -> 229.7), so its top row ends a little above the high.
    if (tick != null && tick > 0 && Number.isFinite(tick)) rowH = Math.ceil(rowH / tick - 1e-9) * tick;
    return { min, rowH, n };
}

/** Add one bar's volume to the rows its high-low range overlaps, in proportion to the overlap, on its close side. */
function addBar(rows: VpvrRow[], b: OHLCV, min: number, rowH: number): void {
    const v = b.volume;
    if (!(v != null && v > 0)) return;
    const n = rows.length;
    // a candle that closes where it opened counts as down (fits TradingView best: 0.22 % vs 0.25 % off on BTC 1m)
    const side = b.close > b.open ? 'up' : 'down';
    const span = b.high - b.low;
    if (span <= 0) {
        // Point bar: all volume in the row containing its price.
        rows[clampIndex(Math.floor((b.low - min) / rowH), n)]![side] += v;
        return;
    }
    const kFirst = clampIndex(Math.floor((b.low - min) / rowH), n);
    const kLast = clampIndex(Math.floor((b.high - min) / rowH - 1e-9), n);
    for (let k = kFirst; k <= kLast; k += 1) {
        const rowBot = min + k * rowH;
        const overlap = Math.min(b.high, rowBot + rowH) - Math.max(b.low, rowBot);
        if (overlap > 0) rows[k]![side] += (v * overlap) / span;
    }
}

/**
 * Grow the value area from the POC as TradingView does: take the larger neighbouring row each step, but STOP before
 * the row that would carry the area past the target, so it covers at most the target (measured on TradingView
 * 2026-10-30: 24 rows at 70 % -> 67.4 %, at 50 % -> 49.5 %; the same rule as the session profile's
 * `computeVolumeValueArea`, ties to the row above). Returns the inclusive row span.
 */
export function growValueArea(totalOf: (k: number) => number, n: number, poc: number, total: number, valueAreaFrac: number): [number, number] {
    const target = total * Math.min(1, Math.max(0, valueAreaFrac));
    let vaFrom = poc;
    let vaTo = poc;
    let acc = totalOf(poc);
    while (acc < target && (vaFrom > 0 || vaTo < n - 1)) {
        const below = vaFrom > 0 ? totalOf(vaFrom - 1) : -1;
        const above = vaTo < n - 1 ? totalOf(vaTo + 1) : -1;
        if (acc + Math.max(above, below) > target) break;
        if (above >= below) {
            vaTo += 1;
            acc += above;
        } else {
            vaFrom -= 1;
            acc += below;
        }
    }
    return [vaFrom, vaTo];
}

/** The profile's levels, as TradingView places them: the POC at the middle of its row, the value area high at the
 *  top of the highest value-area row and the low at the bottom of the lowest. */
export interface VpvrLevels {
    poc: number;
    vah: number;
    val: number;
}

export function vpvrLevels(p: VpvrProfile): VpvrLevels {
    return {
        poc: p.min + (p.poc + 0.5) * p.rowH,
        vah: p.min + (p.vaTo + 1) * p.rowH,
        val: p.min + p.vaFrom * p.rowH,
    };
}

/**
 * The developing levels: for every bar of the window, the POC / value area of the profile built from the window's
 * first bar up to that bar (TradingView's "Developing POC" / "Developing VA"), on the full window's grid. Index `j`
 * holds bar `i0 + j`; null until the first bar with volume.
 */
export function buildVpvrDeveloping(
    bars: readonly OHLCV[],
    i0: number,
    i1: number,
    profile: VpvrProfile,
    valueAreaFrac: number,
): Array<VpvrLevels | null> {
    const from = Math.max(0, i0);
    const to = Math.min(bars.length - 1, i1);
    return buildVpvrDevelopingAt(bars.slice(from, to + 1), profile, valueAreaFrac);
}

/**
 * The developing levels from `src` (oldest first, e.g. the finer candles the profile was built from), read at each
 * of `ends` (ascending): entry `j` is the profile of every `src` bar opening before `ends[j]`. Without `ends`, one
 * entry per `src` bar.
 */
export function buildVpvrDevelopingAt(
    src: readonly OHLCV[],
    profile: VpvrProfile,
    valueAreaFrac: number,
    ends?: readonly number[],
): Array<VpvrLevels | null> {
    const from = 0;
    const to = src.length - 1;
    const bars = src;
    const { rowH, min } = profile;
    const n = profile.rows.length;
    const rows: VpvrRow[] = Array.from({ length: n }, (_, k) => ({ price: min + k * rowH, up: 0, down: 0 }));
    const totalOf = (k: number): number => rows[k]!.up + rows[k]!.down;
    const out: Array<VpvrLevels | null> = [];
    let total = 0;
    let poc = -1;
    let pocTotal = 0;
    const levelsNow = (): VpvrLevels | null => {
        if (poc < 0) return null;
        const [vaFrom, vaTo] = growValueArea(totalOf, n, poc, total, valueAreaFrac);
        return { poc: min + (poc + 0.5) * rowH, vah: min + (vaTo + 1) * rowH, val: min + vaFrom * rowH };
    };
    let e = 0;
    for (let i = from; i <= to; i += 1) {
        const b = bars[i]!;
        while (ends && e < ends.length && b.time >= ends[e]!) {
            out.push(levelsNow());
            e += 1;
        }
        addBar(rows, b, min, rowH);
        const v = b.volume;
        if (v != null && v > 0) {
            total += v;
            // Rows only ever grow, so the new POC is the old one or a row this bar touched.
            const k0 = clampIndex(Math.floor((b.low - min) / rowH), n);
            const k1 = clampIndex(Math.floor((b.high - min) / rowH - 1e-9), n);
            for (let k = Math.min(k0, k1); k <= Math.max(k0, k1); k += 1) {
                const t = totalOf(k);
                if (t > pocTotal) {
                    pocTotal = t;
                    poc = k;
                }
            }
        }
        if (!ends) out.push(levelsNow());
    }
    if (ends) while (out.length < ends.length) out.push(levelsNow());
    return out;
}

function clampIndex(k: number, n: number): number {
    return k < 0 ? 0 : k >= n ? n - 1 : k;
}
