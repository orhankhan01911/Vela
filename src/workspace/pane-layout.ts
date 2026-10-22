// The pane layout a saved chart keeps once the user moved or merged an indicator (CellState.panes): which pane slot
// each indicator sits in, top to bottom, and which ones read on their own scale. Indicators are named by their place
// in the saved ledger (`n2`, `m0`), because their runtime ids are new after a reload.
import type { PanesControl } from '../core/PanesControl';
import type { PaneInfo } from '../core/options';
import type { PaneLayoutState } from '../state/document';

/** The layout of the chart's panes right now. Indicators `refOf` cannot name (not in the ledger) are left out. */
export function paneLayoutOf(panes: readonly PaneInfo[], refOf: (id: string) => string | undefined): PaneLayoutState {
    const slots: PaneLayoutState['slots'] = [];
    for (const p of panes) {
        const members = p.indicators.flatMap((i) => {
            const ref = refOf(i.id);
            return ref ? [i.ownScale ? { ref, ownScale: true } : { ref }] : [];
        });
        if (p.kind === 'price' || members.length > 0) slots.push(members);
    }
    return { slots };
}

/**
 * Put the indicators back in the saved layout. `resolve` turns a ref into the live indicator id (undefined: not on the
 * chart, skipped). Each study slot keeps the pane its master (the one on the pane's own scale) is in, or opens a new
 * one when that pane was already used by an earlier slot; the others merge into it. Then the panes are ordered.
 */
export function applyPaneLayout(layout: PaneLayoutState, resolve: (ref: string) => string | undefined, panes: PanesControl): void {
    const paneOf = (id: string): string | undefined => panes.list().find((p) => p.indicators.some((i) => i.id === id))?.id;
    const used: string[] = [];
    layout.slots.forEach((slot, s) => {
        const members = slot.flatMap((m) => {
            const id = resolve(m.ref);
            return id && paneOf(id) ? [{ id, own: m.ownScale === true }] : [];
        });
        if (s === 0) {
            for (const m of members) panes.place(m.id, { paneId: 'price', ownScale: m.own });
            return;
        }
        const master = members.find((m) => !m.own) ?? members[0];
        if (!master) return;
        let paneId = paneOf(master.id)!;
        if (paneId === 'price' || used.includes(paneId)) {
            panes.place(master.id, { paneId: `pane-${master.id}-layout`, ownScale: false });
            paneId = paneOf(master.id)!;
        } else {
            panes.place(master.id, { paneId, ownScale: false });
        }
        for (const m of members) if (m !== master) panes.place(m.id, { paneId, ownScale: m.own });
        used.push(paneId);
    });
    panes.order(used);
}
