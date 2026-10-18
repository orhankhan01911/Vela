import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS, LINE_TEXT_ALIGN_FIELDS, SHOW_PRICE_FIELD } from '../schema';
import { distToSegment, handleAt } from '../hittest';

/** A horizontal line from an anchor extending to the right chart edge. Like TradingView's, it shows its price on
 *  the price scale unless `showPrice` is off. */
export class HorizontalRay extends Drawing {
    readonly type = 'hray' as const;
    // `!` (no initializer): the base constructor runs readProps first. Absent ⇒ shown (TradingView's default).
    showPrice!: boolean;

    protected override writeProps(): Record<string, unknown> {
        return { showPrice: this.showPrice !== false };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.showPrice === 'boolean') this.showPrice = props.showPrice;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 1, max: 1, slots: [{ role: 'p', free: 'both' }] };
    }

    private pt(proj: Projector): [number, number] | null {
        const a = this.anchors[0];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        return y == null ? null : [proj.xOf(a.time), y];
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const p = this.pt(proj);
        return p != null && distToSegment(px, py, p[0], p[1], proj.width, p[1]) <= tol;
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const p = this.pt(proj);
        return p ? [p] : [];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const p = this.pt(proj);
        return p ? { x: p[0], y: p[1] - 1, w: Math.max(0, proj.width - p[0]), h: 2 } : null;
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        return a ? { min: a.price, max: a.price } : null;
    }

    // Extends right to the edge → visible whenever its anchor sits at/left of the viewport.
    override timeExtent(): { min: number; max: number } | null {
        const a = this.anchors[0];
        return a ? { min: a.time, max: Number.POSITIVE_INFINITY } : null;
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, SHOW_PRICE_FIELD, ...TEXT_FIELDS, ...LINE_TEXT_ALIGN_FIELDS] };
    }
}
