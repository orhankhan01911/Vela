// Number formatting shared by the widget chrome (statusline, data readouts) — pure.

/** Sensible decimal count for a price magnitude (crypto-friendly). */
export function decimalsFor(ref: number): number {
    const a = Math.abs(ref);
    return a >= 1 ? 2 : a >= 0.01 ? 4 : 6;
}

/** Decimal places that show a tick size exactly (0.01 → 2, 0.000001 → 6, 0.25 → 2), capped at 10. */
export function decimalsForTick(tick: number): number {
    if (!(tick > 0) || !Number.isFinite(tick)) return 2;
    for (let d = 0; d <= 10; d += 1) {
        if (Math.abs(Number(tick.toFixed(d)) - tick) <= tick * 1e-6) return d;
    }
    return 10;
}

/** Decimals for a price readout: the symbol's tick size when known (what the price axis shows), else the
 *  magnitude heuristic. */
export function priceDecimals(ref: number, mintick?: number): number {
    return mintick != null && mintick > 0 ? decimalsForTick(mintick) : decimalsFor(ref);
}

/** Locale-formatted price; `'—'` for null/non-finite. */
export function fmtPrice(n: number | null | undefined, dp?: number): string {
    if (n == null || !Number.isFinite(n)) return '—';
    const d = dp ?? decimalsFor(n);
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Signed change + percent ("+123.45 (+1.23%)") from open→close; `''` when unavailable. */
export function fmtChange(open: number | null | undefined, close: number | null | undefined, dp?: number): string {
    if (open == null || close == null || !Number.isFinite(open) || !Number.isFinite(close) || open === 0) return '';
    const diff = close - open;
    const pct = (diff / open) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${fmtPrice(diff, dp ?? decimalsFor(close))} (${sign}${pct.toFixed(2)}%)`;
}

/** Signed percent change alone ("+1.23%") from open→close; `''` when unavailable. */
export function fmtChangePct(open: number | null | undefined, close: number | null | undefined): string {
    if (open == null || close == null || !Number.isFinite(open) || !Number.isFinite(close) || open === 0) return '';
    const pct = ((close - open) / open) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}
