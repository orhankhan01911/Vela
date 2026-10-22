import type { MoveTarget } from '../../core/options';

/**
 * Drag an indicator's legend row onto another pane to merge it there (TradingView's drag-to-merge), or onto the line
 * between two panes to give it a pane of its own at that spot. While dragging, the target pane is tinted with a
 * "Merge into RSI" tag, or an insert line with "New pane" shows where the pane will open; Esc or a drop anywhere else
 * cancels. Mouse: starts after the pointer moves a few pixels. Touch: press and hold the row, then drag (a plain swipe
 * still scrolls).
 */

export interface DragPaneView {
    id: string;
    kind: 'price' | 'study';
    label: string;
    top: number;
    height: number;
}

export type DropTarget =
    | { kind: 'merge'; paneId: string; label: string; top: number; height: number; move: MoveTarget }
    | { kind: 'newPane'; y: number; move: MoveTarget };

/** How close (px) to a pane boundary counts as "between the panes". */
const EDGE = 10;

/**
 * Where a drop at `y` (plot coordinates) lands. `sole`: the dragged indicator is alone in its pane, so a new pane right
 * next to that pane would change nothing and is not offered.
 */
export function dropTargetAt(panes: readonly DragPaneView[], fromPane: string, sole: boolean, y: number): DropTarget | null {
    if (!panes.length) return null;
    for (let i = 1; i < panes.length; i++) {
        const p = panes[i]!;
        if (Math.abs(y - p.top) > EDGE) continue;
        if (sole && (p.id === fromPane || panes[i - 1]!.id === fromPane)) break; // beside its own pane: no change
        return { kind: 'newPane', y: p.top, move: { newPane: { before: p.id } } };
    }
    const last = panes[panes.length - 1]!;
    const bottom = last.top + last.height;
    if (y >= bottom - EDGE && y <= bottom + EDGE && !(sole && last.id === fromPane)) {
        return { kind: 'newPane', y: bottom, move: { newPane: { after: last.id } } };
    }
    for (const p of panes) {
        if (y < p.top || y > p.top + p.height) continue;
        if (p.id === fromPane) return null;
        return { kind: 'merge', paneId: p.id, label: p.label, top: p.top, height: p.height, move: p.kind === 'price' ? 'price' : { pane: p.id } };
    }
    return null;
}

export interface LegendDragHost {
    /** The plot element (pane bounds are relative to it). */
    container: HTMLElement;
    panes(): DragPaneView[];
    /** Width of the price scale on the right (the tint stops at the plot's edge). */
    rightAxis(): number;
    paneOf(id: string): string;
    soleInPane(id: string): boolean;
    title(id: string): string;
    move(id: string, target: MoveTarget): void;
}

const HOLD_MS = 380;
const MOVE_PX = 5;

export class LegendDragMerge {
    private drag: {
        id: string;
        pointerId: number;
        startX: number;
        startY: number;
        active: boolean;
        touch: boolean;
        holdTimer: number;
        target: DropTarget | null;
        row: HTMLElement;
    } | null = null;
    private overlay: HTMLDivElement | null = null;
    private pill: HTMLDivElement | null = null;
    private ghost: HTMLDivElement | null = null;
    /** A drag just ended on this row: the click that follows must not select it. */
    private swallowClickUntil = 0;

    constructor(private readonly host: LegendDragHost) {}

    /** Make a legend row draggable. Presses on its buttons keep their own behaviour. */
    attach(row: HTMLElement, id: string): void {
        row.addEventListener('pointerdown', (e) => this.onDown(e, row, id));
        row.addEventListener('click', (e) => {
            if (performance.now() < this.swallowClickUntil) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }, true);
    }

    get dragging(): boolean {
        return this.drag?.active === true;
    }

    destroy(): void {
        this.cancel();
    }

    private onDown(e: PointerEvent, row: HTMLElement, id: string): void {
        if (this.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
        if ((e.target as HTMLElement).closest('button, input, select, a')) return;
        const touch = e.pointerType !== 'mouse';
        this.drag = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, active: false, touch, holdTimer: 0, target: null, row };
        if (touch) {
            // a finger has to hold first, so a swipe across the legend still scrolls or pans
            this.drag.holdTimer = window.setTimeout(() => this.start(), HOLD_MS);
        }
        const doc = row.ownerDocument;
        doc.addEventListener('pointermove', this.onMove, true);
        doc.addEventListener('pointerup', this.onUp, true);
        doc.addEventListener('pointercancel', this.onCancel, true);
        doc.addEventListener('keydown', this.onKey, true);
        doc.addEventListener('contextmenu', this.onContextMenu, true);
        // a page scroll must not steal a finger that is dragging a row
        doc.addEventListener('touchmove', this.onTouchMove, { capture: true, passive: false });
    }

    private readonly onMove = (e: PointerEvent): void => {
        const d = this.drag;
        if (!d || e.pointerId !== d.pointerId) return;
        const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
        if (!d.active) {
            if (d.touch) {
                // moved before the hold finished: this was a swipe, not a drag
                if (dist > 8) this.cancel();
                return;
            }
            if (dist < MOVE_PX) return;
            this.start();
        }
        e.preventDefault();
        this.track(e.clientX, e.clientY);
    };

    /** On touch the long press belongs to the drag: the context menu it also fires (the row's menu, Android's own)
     *  must not open over the drag, nor right after the drop. A mouse right-click never starts a drag, so it keeps
     *  its menu. */
    private readonly onContextMenu = (e: Event): void => {
        if (this.drag?.active || performance.now() < this.swallowClickUntil) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    };

    private readonly onTouchMove = (e: TouchEvent): void => {
        if (this.drag?.active) e.preventDefault();
    };

    private readonly onUp = (e: PointerEvent): void => {
        const d = this.drag;
        if (!d || e.pointerId !== d.pointerId) return;
        const target = d.active ? d.target : null;
        const wasActive = d.active;
        const id = d.id;
        if (wasActive) this.swallowClickUntil = performance.now() + 350;
        this.cancel();
        if (target) this.host.move(id, target.move);
    };

    private readonly onCancel = (e: PointerEvent): void => {
        if (this.drag && e.pointerId === this.drag.pointerId) this.cancel();
    };

    private readonly onKey = (e: KeyboardEvent): void => {
        if (e.key !== 'Escape' || !this.drag) return;
        e.stopPropagation();
        e.preventDefault();
        this.cancel();
    };

    private start(): void {
        const d = this.drag;
        if (!d) return;
        d.active = true;
        if (d.touch) navigator.vibrate?.(12);
        const doc = this.host.container.ownerDocument;
        doc.body.style.cursor = 'grabbing';
        d.row.style.opacity = '0.55';
        this.ghost = doc.createElement('div');
        this.ghost.className = 'vela-legend-drag-ghost';
        this.ghost.textContent = this.host.title(d.id);
        Object.assign(this.ghost.style, {
            position: 'absolute', zIndex: '40', pointerEvents: 'none', whiteSpace: 'nowrap',
            padding: '3px 8px', borderRadius: '4px', font: '600 12px/16px var(--vela-font)',
            background: 'var(--vela-surface-elev)', color: 'var(--vela-fg-bright)',
            border: '1px solid var(--vela-accent)', boxShadow: 'var(--vela-shadow)',
        });
        this.host.container.appendChild(this.ghost);
        this.track(d.startX, d.startY);
    }

    private track(clientX: number, clientY: number): void {
        const d = this.drag;
        if (!d) return;
        const r = this.host.container.getBoundingClientRect();
        const x = clientX - r.left;
        const y = clientY - r.top;
        if (this.ghost) {
            const gx = Math.min(Math.max(0, x + 14), Math.max(0, r.width - this.ghost.offsetWidth - 4));
            this.ghost.style.transform = `translate(${gx}px, ${Math.max(0, y - 28)}px)`;
        }
        d.target = x >= 0 && x <= r.width && y >= 0 && y <= r.height
            ? dropTargetAt(this.host.panes(), this.host.paneOf(d.id), this.host.soleInPane(d.id), y)
            : null;
        this.paintTarget(d.target, r.width);
    }

    private paintTarget(t: DropTarget | null, fullW: number): void {
        if (!t) {
            if (this.overlay) this.overlay.style.display = 'none';
            if (this.pill) this.pill.style.display = 'none';
            return;
        }
        const doc = this.host.container.ownerDocument;
        if (!this.overlay) {
            this.overlay = doc.createElement('div');
            this.overlay.className = 'vela-legend-drop';
            Object.assign(this.overlay.style, { position: 'absolute', left: '0', zIndex: '30', pointerEvents: 'none', boxSizing: 'border-box', borderRadius: '3px' });
            this.pill = doc.createElement('div');
            this.pill.className = 'vela-legend-drop-label';
            Object.assign(this.pill.style, {
                position: 'absolute', zIndex: '31', pointerEvents: 'none', whiteSpace: 'nowrap',
                padding: '3px 10px', borderRadius: '11px', font: '600 12px/16px var(--vela-font)',
                background: 'var(--vela-accent)', color: 'var(--vela-fg-on-fill)', transform: 'translate(-50%, -50%)',
            });
            this.host.container.append(this.overlay, this.pill);
        }
        const w = Math.max(0, fullW - this.host.rightAxis());
        const o = this.overlay.style;
        const p = this.pill!.style;
        o.display = '';
        p.display = '';
        o.width = `${w}px`;
        if (t.kind === 'merge') {
            Object.assign(o, {
                top: `${t.top}px`, height: `${t.height}px`, border: '1px solid var(--vela-accent)',
                background: 'color-mix(in srgb, var(--vela-accent) 12%, transparent)',
            });
            this.pill!.textContent = `Merge into ${t.label}`;
            Object.assign(p, { left: `${w / 2}px`, top: `${t.top + t.height / 2}px` });
        } else {
            Object.assign(o, { top: `${t.y - 1.5}px`, height: '3px', border: '0', background: 'var(--vela-accent)' });
            this.pill!.textContent = 'New pane';
            Object.assign(p, { left: `${w / 2}px`, top: `${t.y}px` });
        }
    }

    private cancel(): void {
        const d = this.drag;
        if (!d) return;
        window.clearTimeout(d.holdTimer);
        d.row.style.opacity = '';
        const doc = d.row.ownerDocument;
        doc.body.style.cursor = '';
        doc.removeEventListener('pointermove', this.onMove, true);
        doc.removeEventListener('pointerup', this.onUp, true);
        doc.removeEventListener('pointercancel', this.onCancel, true);
        doc.removeEventListener('keydown', this.onKey, true);
        if (performance.now() >= this.swallowClickUntil) doc.removeEventListener('contextmenu', this.onContextMenu, true);
        else window.setTimeout(() => doc.removeEventListener('contextmenu', this.onContextMenu, true), 400);
        doc.removeEventListener('touchmove', this.onTouchMove, { capture: true } as EventListenerOptions);
        this.drag = null;
        this.ghost?.remove();
        this.ghost = null;
        if (this.overlay) this.overlay.style.display = 'none';
        if (this.pill) this.pill.style.display = 'none';
    }
}
