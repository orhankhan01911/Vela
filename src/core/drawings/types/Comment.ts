import type { AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import { pointInBox } from '../hittest';
import { CalloutBase } from './CalloutBase';

/** Approximate px font size for a named text size (the painter measures the glyphs exactly). */
const SIZE_PX: Record<string, number> = { tiny: 10, small: 12, normal: 14, large: 18, huge: 24, auto: 14 };

/**
 * TradingView's comment: a rounded speech bubble standing on one point, its bottom-left corner the sharp tip on
 * the point. Comments saved before (a balloon tied to its target by a tail, two points, no `point` flag) keep
 * that shape.
 */
export class Comment extends CalloutBase {
    readonly type = 'comment' as const;
    // `!` (no initializer): set by readProps (run by the base constructor) for an old two-point comment.
    private legacy!: boolean;

    protected override defaultLabel(): string {
        return 'Comment';
    }

    /** True for an old two-point comment (balloon + tail). */
    get tailed(): boolean {
        return !!this.legacy;
    }

    protected override writeProps(): Record<string, unknown> {
        return { point: !this.legacy };
    }

    protected override readProps(props: Record<string, unknown>): void {
        this.legacy = props.point === false; // set on old records by deserializeDrawing
    }

    override anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return this.legacy ? super.anchorSchema() : { min: 1, max: 1, slots: [{ role: 'p', free: 'both' }] };
    }

    /** The bubble: above and right of the point, which is its bottom-left corner. */
    override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        if (this.legacy) return super.box(proj);
        const a = this.anchors[0];
        const y = a ? proj.yOf(a.price, this.paneId) : null;
        if (!a || y == null) return null;
        const fs = SIZE_PX[this.text?.size ?? 'normal'] ?? 14;
        const lines = this.labelText().split('\n');
        const cols = Math.max(1, ...lines.map((l) => l.length));
        const w = Math.max(20, cols * fs * 0.6) + 28;
        const h = lines.length * fs * 1.4 + 20;
        return { x: proj.xOf(a.time), y: y - h, w, h };
    }

    override points(proj: Projector): [[number, number], [number, number]] | null {
        if (this.legacy) return super.points(proj);
        const a = this.anchors[0];
        const y = a ? proj.yOf(a.price, this.paneId) : null;
        if (!a || y == null) return null;
        const p: [number, number] = [proj.xOf(a.time), y];
        return [p, p];
    }

    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        if (this.legacy) return super.hitTest(px, py, proj, tol);
        const b = this.box(proj);
        return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol);
    }

    override translateBody(dt: number, dp: number, orig: DrawingPoint[]): DrawingPoint[] {
        if (this.legacy) return super.translateBody(dt, dp, orig);
        return orig.map((o) => ({ time: o.time + dt, price: o.price + dp }));
    }

    override priceRange(): { min: number; max: number } | null {
        if (this.legacy) return super.priceRange();
        const a = this.anchors[0];
        return a ? { min: a.price, max: a.price } : null;
    }
}
