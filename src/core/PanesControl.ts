import type { IndicatorPlacement, MoveTarget, PaneInfo } from './options';

/** Callback surface `PanesControl` uses to drive the orchestrator. */
export interface PaneController {
    /** Whether the active renderer supports pane management (move/merge/reorder/collapse). */
    paneManagementSupported(): boolean;
    listPanes(): PaneInfo[];
    movePane(paneId: string, dir: 'up' | 'down'): void;
    removePaneAndIndicators(paneId: string): void;
    collapsePane(paneId: string, collapsed: boolean): void;
    maximizePane(paneId: string | null): void;
    moveIndicator(id: string, target: MoveTarget): void;
    placeIndicator(id: string, placement: IndicatorPlacement): void;
    orderPanes(ids: string[]): void;
}

/**
 * The public pane control surface — `chart.panes`. Lists panes with their indicators
 * and moves/merges/reorders/collapses/maximizes them. On a renderer without pane
 * management every mutation warns and no-ops (and `list()` still reports the panes).
 */
export class PanesControl {
    constructor(private readonly controller: PaneController) {}

    /** Whether the active renderer supports pane management (use to show/hide host UI). */
    get supported(): boolean {
        return this.controller.paneManagementSupported();
    }

    /** The current panes (top-to-bottom by `order`) with the indicators each holds. */
    list(): PaneInfo[] {
        return this.controller.listPanes();
    }

    /** Move a pane one slot up or down in the stack (the price pane stays pinned on top). */
    move(paneId: string, dir: 'up' | 'down'): this {
        if (this.guard()) this.controller.movePane(paneId, dir);
        return this;
    }

    /** Remove a pane and every indicator in it (the price pane can't be removed). */
    remove(paneId: string): this {
        if (this.guard()) this.controller.removePaneAndIndicators(paneId);
        return this;
    }

    /** Collapse a pane to a thin strip, or restore it. */
    collapse(paneId: string, collapsed = true): this {
        if (this.guard()) this.controller.collapsePane(paneId, collapsed);
        return this;
    }

    /** Maximize one pane to fill the plot, or restore the split (`null`). */
    maximize(paneId: string | null): this {
        if (this.guard()) this.controller.maximizePane(paneId);
        return this;
    }

    /** Move/merge an indicator to a pane — sugar for `handle.moveTo(...)` by id. */
    moveIndicator(id: string, target: MoveTarget): this {
        if (this.guard()) this.controller.moveIndicator(id, target);
        return this;
    }

    /** Put an indicator at an exact placement (the `from` of an `indicator:moved`): undoes a move or a merge. */
    place(id: string, placement: IndicatorPlacement): this {
        if (this.guard()) this.controller.placeIndicator(id, placement);
        return this;
    }

    /** Put the panes in this order, top to bottom. `'price'` places the main chart; left out, it stays on top. Panes not listed follow. */
    order(ids: string[]): this {
        if (this.guard()) this.controller.orderPanes(ids);
        return this;
    }

    private guard(): boolean {
        if (this.controller.paneManagementSupported()) return true;
        console.warn('[vela] the active renderer does not support pane management — chart.panes mutation ignored.');
        return false;
    }
}
