// TradingView's "Always remove locked drawings" switch (the remove-drawings dropdown): when it is
// off, "Remove N drawings" leaves locked drawings on the chart. One per-browser setting shared by
// every surface that removes drawings in bulk (the chart's right-click menu, a host's toolbar).
import type { Vela } from '../Vela';

export const REMOVE_LOCKED_KEY = 'vela:remove-locked-drawings';

/** On unless the user switched it off (TradingView's default). Storage may be missing or blocked. */
export function removeLockedDrawings(): boolean {
    try {
        return globalThis.localStorage?.getItem(REMOVE_LOCKED_KEY) !== '0';
    } catch {
        return true;
    }
}

export function setRemoveLockedDrawings(on: boolean): void {
    try {
        globalThis.localStorage?.setItem(REMOVE_LOCKED_KEY, on ? '1' : '0');
    } catch {
        /* storage blocked: the switch lasts for this page only through the caller's state */
    }
}

/** The drawings a bulk remove takes off `chart`: all of them, or the unlocked ones when locked
 *  drawings are kept. Empty on a renderer without drawings. */
export function removableDrawingIds(chart: Vela, removeLocked = removeLockedDrawings()): string[] {
    if (!chart.drawings.supported) return [];
    return chart.drawings
        .all()
        .filter((d) => removeLocked || !d.locked)
        .map((d) => d.id);
}
