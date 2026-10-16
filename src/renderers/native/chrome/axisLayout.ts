/**
 * Right-gutter column geometry, shared by the renderer (which reserves the gutter and
 * routes input) and the chrome layer (which draws the tick labels). The gutter holds the
 * pane's master price scale in the leftmost column (nearest the data), and one extra
 * column per merged (own-scale) indicator to its right.
 */
export const AXIS_MASTER_W = 64; // px — the pane master-scale column (nearest the data): its MINIMUM width
export const AXIS_MERGED_W = 56; // px — each additional merged-indicator scale column

/** Thickness of the horizontal separator drawn at each stacked pane's top edge (data + gutter). */
export const PANE_SEPARATOR_PX = 3;

/** Price labels start this far right of the data edge (`drawPriceAxes`). */
export const AXIS_LABEL_LEFT_PAD = 6;
/** Air between the widest label's end and the column's right edge. */
export const AXIS_LABEL_RIGHT_PAD = 8;
/** The master column only shrinks when it is at least this much wider than needed (no flicker while zooming). */
export const AXIS_SHRINK_SLACK = 12;

/** Total right-gutter width for a given number of merged scale columns. */
export function axisGutterWidth(mergedColumns: number, masterW = AXIS_MASTER_W): number {
    return masterW + AXIS_MERGED_W * Math.max(0, mergedColumns);
}

/** Master column width that fits a price label `widestLabel` px wide (4 px steps, never below AXIS_MASTER_W). */
export function masterWidthFor(widestLabel: number): number {
    const need = Math.ceil((AXIS_LABEL_LEFT_PAD + widestLabel + AXIS_LABEL_RIGHT_PAD) / 4) * 4;
    return Math.max(AXIS_MASTER_W, need);
}

/** The master column width after a paint whose widest price label was `widestLabel` px: grows at once to fit,
 *  shrinks only once it is AXIS_SHRINK_SLACK px or more too wide. Like TradingView, a long price
 *  (0.035000, 108,550.5 at a large axis font) widens the scale instead of being clipped. */
export function nextMasterWidth(current: number, widestLabel: number): number {
    if (!(widestLabel > 0) || !Number.isFinite(widestLabel)) return current;
    const need = masterWidthFor(widestLabel);
    if (need > current || need <= current - AXIS_SHRINK_SLACK) return need;
    return current;
}

/** Left x (relative to the data area's right edge `dataW`) of a scale column.
 *  Column 0 is the master scale; columns ≥ 1 are merged-indicator scales. */
export function axisColumnX(dataW: number, column: number, masterW = AXIS_MASTER_W): number {
    return column === 0 ? dataW : dataW + masterW + (column - 1) * AXIS_MERGED_W;
}

/** Width of a scale column (master vs merged). */
export function axisColumnWidth(column: number, masterW = AXIS_MASTER_W): number {
    return column === 0 ? masterW : AXIS_MERGED_W;
}
