/**
 * Price-scale chips of drawings (alert markers, horizontal-line prices) laid out so none sits on the current-price
 * label or on another chip, as TradingView stacks them. The level itself (the alert's dot, the line) stays at its
 * price; only the chip on the scale moves. Pure (tests).
 */

/** Height of one chip on the price scale (px), as painted. */
export const AXIS_CHIP_H = 19;
const GAP = 1;
const HALF = AXIS_CHIP_H / 2;

/** The current-price block on the scale: its top and bottom (px, plot coordinates). It never moves. */
export interface AxisBlock {
    top: number;
    bottom: number;
}

/**
 * Chip centres by id. With a block, chips above its middle stack upwards from it and the rest downwards, so a
 * chip only moves when it would overlap; without one, overlapping chips push down.
 */
export function layoutAxisChips(chips: ReadonlyArray<{ id: string; y: number }>, block: AxisBlock | null): Map<string, number> {
    const out = new Map<string, number>();
    if (!block) {
        let limit = -Infinity;
        for (const c of [...chips].sort((a, b) => a.y - b.y)) {
            const y = Math.max(c.y, limit);
            out.set(c.id, y);
            limit = y + AXIS_CHIP_H + GAP;
        }
        return out;
    }
    const mid = (block.top + block.bottom) / 2;
    let limit = block.top - GAP - HALF;
    for (const c of chips.filter((c) => c.y < mid).sort((a, b) => b.y - a.y)) {
        const y = Math.min(c.y, limit);
        out.set(c.id, y);
        limit = y - AXIS_CHIP_H - GAP;
    }
    limit = block.bottom + GAP + HALF;
    for (const c of chips.filter((c) => c.y >= mid).sort((a, b) => a.y - b.y)) {
        const y = Math.max(c.y, limit);
        out.set(c.id, y);
        limit = y + AXIS_CHIP_H + GAP;
    }
    return out;
}
