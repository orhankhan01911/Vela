import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, LINE_TEXT_ALIGN_FIELDS, TEXT_FIELDS } from '../schema';
import { distToSegment, handleAt, pointInBox } from '../hittest';

/** A rectangle defined by two opposite corners. Optional fill + border; like TradingView's rectangle it can
 *  extend to the left / right edge of the pane and show a dashed middle line. */
export class Box extends Drawing {
    readonly type = 'box' as const;
    // `!` (no initializer): the base constructor runs readProps before subclass fields would initialize.
    extendLeft!: boolean;
    extendRight!: boolean;
    middleLine!: boolean;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'c1', free: 'both' }, { role: 'c2', free: 'both' }] };
    }

    private rect(proj: Projector): { x1: number; y1: number; x2: number; y2: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        if (ya == null || yb == null) return null;
        return { x1: proj.xOf(a.time), y1: ya, x2: proj.xOf(b.time), y2: yb };
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const r0 = this.rect(proj);
        const s = this.spanX(proj);
        if (!r0 || !s) return false;
        // An extended side reaches the pane edge, so the grabbable area does too.
        const r = { ...r0, x1: s.x1, x2: s.x2 };
        // A filled box is grabbable anywhere inside; otherwise only near its border.
        if (this.style.fillColor && pointInBox(px, py, r.x1, r.y1, r.x2, r.y2)) return true;
        const edges: Array<[number, number, number, number]> = [
            [r.x1, r.y1, r.x2, r.y1],
            [r.x2, r.y1, r.x2, r.y2],
            [r.x2, r.y2, r.x1, r.y2],
            [r.x1, r.y2, r.x1, r.y1],
        ];
        return edges.some((e) => distToSegment(px, py, e[0], e[1], e[2], e[3]) <= tol);
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const r = this.rect(proj);
        return r ? [[r.x1, r.y1], [r.x2, r.y2]] : [];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const r = this.rect(proj);
        if (!r) return null;
        return { x: Math.min(r.x1, r.x2), y: Math.min(r.y1, r.y2), w: Math.abs(r.x2 - r.x1), h: Math.abs(r.y2 - r.y1) };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
    }

    /** Left and right edges on screen, after any extension to the pane edge. */
    spanX(proj: Projector): { x1: number; x2: number } | null {
        const r = this.rect(proj);
        if (!r) return null;
        return { x1: this.extendLeft ? 0 : Math.min(r.x1, r.x2), x2: this.extendRight ? proj.width : Math.max(r.x1, r.x2) };
    }

    protected override writeProps(): Record<string, unknown> {
        return { extendLeft: !!this.extendLeft, extendRight: !!this.extendRight, middleLine: !!this.middleLine };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.extendLeft === 'boolean') this.extendLeft = props.extendLeft;
        if (typeof props.extendRight === 'boolean') this.extendRight = props.extendRight;
        if (typeof props.middleLine === 'boolean') this.middleLine = props.middleLine;
    }

    schema(): SettingsSchema {
        return {
            fields: [
                ...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })),
                { path: 'style.fillColor', label: 'Fill color', kind: 'color', group: 'fill' },
                { path: 'extendLeft', label: 'Extend left', kind: 'boolean', group: 'behavior' },
                { path: 'extendRight', label: 'Extend right', kind: 'boolean', group: 'behavior' },
                { path: 'middleLine', label: 'Middle line', kind: 'boolean', group: 'behavior' },
                ...TEXT_FIELDS,
                // TradingView's rectangle text alignment (inside the box).
                ...LINE_TEXT_ALIGN_FIELDS,
            ],
        };
    }
}
