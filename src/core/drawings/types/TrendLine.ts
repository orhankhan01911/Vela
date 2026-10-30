import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS, LINE_TEXT_ALIGN_FIELDS } from '../schema';
import { distToSegment, handleAt } from '../hittest';
import { LINE_STATS_FIELDS, statsOf, type LineStats } from './lineStats';

/** A two-point trend line. Both endpoints move freely on time + price. Like TradingView's, it can extend past
 *  either point to the pane edge and carry an arrow at either end. */
export class TrendLine extends Drawing {
    // A ray (extended right) and an info line (every stat on) are the same tool in TradingView.
    readonly type: 'trendline' | 'ray' | 'infoline' = 'trendline';
    // `!` (no initializer): the base constructor runs readProps before subclass fields would initialize.
    extendLeft!: boolean;
    extendRight!: boolean;
    /** TradingView's stats box; read through `statsOf`. */
    stats!: Partial<LineStats> | undefined;
    /** TradingView's "Middle point": a small ring at the middle of the line while it is selected or hovered. */
    showMiddlePoint!: boolean;
    /** TradingView's "Price labels": both points' prices in chips of the line color on the price scale. */
    showPriceLabels!: boolean;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'p1', free: 'both' }, { role: 'p2', free: 'both' }] };
    }

    protected override writeProps(): Record<string, unknown> {
        return {
            extendLeft: !!this.extendLeft,
            extendRight: !!this.extendRight,
            stats: statsOf(this)!,
            showMiddlePoint: !!this.showMiddlePoint,
            showPriceLabels: !!this.showPriceLabels,
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.extendLeft === 'boolean') this.extendLeft = props.extendLeft;
        if (typeof props.extendRight === 'boolean') this.extendRight = props.extendRight;
        if (props.stats && typeof props.stats === 'object') this.stats = { ...(props.stats as Partial<LineStats>) };
        if (typeof props.showMiddlePoint === 'boolean') this.showMiddlePoint = props.showMiddlePoint;
        if (typeof props.showPriceLabels === 'boolean') this.showPriceLabels = props.showPriceLabels;
    }

    private pixels(proj: Projector): [number, number, number, number] | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const y1 = proj.yOf(a.price, this.paneId);
        const y2 = proj.yOf(b.price, this.paneId);
        if (y1 == null || y2 == null) return null;
        return [proj.xOf(a.time), y1, proj.xOf(b.time), y2];
    }

    /** The segment as drawn, left point first: an extended side is carried to the pane edge (x = 0 or width). */
    drawnPixels(proj: Projector): [number, number, number, number] | null {
        const p = this.pixels(proj);
        if (!p || (!this.extendLeft && !this.extendRight)) return p;
        let [x1, y1, x2, y2] = p;
        if (Math.abs(x2 - x1) < 1e-6) return p; // vertical: nothing to extend along x
        if (x1 > x2) [x1, y1, x2, y2] = [x2, y2, x1, y1];
        const slope = (y2 - y1) / (x2 - x1);
        if (this.extendLeft) { y1 += (0 - x1) * slope; x1 = 0; }
        if (this.extendRight) { y2 += (proj.width - x2) * slope; x2 = proj.width; }
        return [x1, y1, x2, y2];
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const p = this.drawnPixels(proj);
        return p != null && distToSegment(px, py, p[0], p[1], p[2], p[3]) <= tol;
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const p = this.pixels(proj);
        return p ? [[p[0], p[1]], [p[2], p[3]]] : [];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const p = this.pixels(proj);
        if (!p) return null;
        const x = Math.min(p[0], p[2]);
        const y = Math.min(p[1], p[3]);
        return { x, y, w: Math.abs(p[2] - p[0]), h: Math.abs(p[3] - p[1]) };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
    }

    // An extended side reaches the pane edge, so it stays visible however far the points scroll off.
    override timeExtent(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return {
            min: this.extendLeft ? Number.NEGATIVE_INFINITY : Math.min(a.time, b.time),
            max: this.extendRight ? Number.POSITIVE_INFINITY : Math.max(a.time, b.time),
        };
    }

    schema(): SettingsSchema {
        return {
            fields: [
                ...LINE_FIELDS,
                { path: 'style.arrowLeft', label: 'Left end arrow', kind: 'boolean', group: 'line' },
                { path: 'style.arrowRight', label: 'Right end arrow', kind: 'boolean', group: 'line' },
                { path: 'extendLeft', label: 'Extend left', kind: 'boolean', group: 'behavior' },
                { path: 'extendRight', label: 'Extend right', kind: 'boolean', group: 'behavior' },
                { path: 'showMiddlePoint', label: 'Middle point', kind: 'boolean', group: 'behavior' },
                { path: 'showPriceLabels', label: 'Price labels', kind: 'boolean', group: 'behavior' },
                ...LINE_STATS_FIELDS,
                ...TEXT_FIELDS, ...LINE_TEXT_ALIGN_FIELDS,
            ],
        };
    }
}
