import type { DrawingPoint, Projector } from '../geometry';
import { pointInBox, distToSegment } from '../hittest';
import { CalloutBase } from './CalloutBase';

/** Radius of the signpost's round badge. */
export const SIGNPOST_R = 16;

/**
 * TradingView's signpost: a round badge with a flag on a vertical pole from a bar (anchor[0]), its label in a plate
 * above the badge. The badge sits at anchor[1]'s price, straight above or below the bar (its time follows the bar's).
 */
export class Signpost extends CalloutBase {
    readonly type = 'signpost' as const;

    protected override defaultLabel(): string {
        return 'Signpost';
    }

    /** The bar point and the badge centre, the badge straight above or below the bar. */
    override points(proj: Projector): [[number, number], [number, number]] | null {
        const p = super.points(proj);
        return p ? [p[0], [p[0][0], p[1][1]]] : null;
    }

    /** The badge (the label plate above it is measured by the painter). */
    override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const p = this.points(proj);
        if (!p) return null;
        const [cx, cy] = p[1];
        return { x: cx - SIGNPOST_R, y: cy - SIGNPOST_R, w: SIGNPOST_R * 2, h: SIGNPOST_R * 2 };
    }

    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const p = this.points(proj);
        if (!p) return false;
        const b = this.box(proj)!;
        if (pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol)) return true;
        // The label plate above the badge (approximate width) and the pole.
        const text = this.labelText();
        const w = Math.max(20, Math.max(...text.split('\n').map((l) => l.length)) * 8) + 16;
        const lines = text.split('\n').length;
        const top = p[1][1] - SIGNPOST_R - 6 - lines * 18 - 8;
        if (pointInBox(px, py, p[1][0] - w / 2, top, p[1][0] + w / 2, p[1][1] - SIGNPOST_R, tol)) return true;
        return distToSegment(px, py, p[0][0], p[0][1], p[1][0], p[1][1]) <= tol;
    }

    /** A body drag slides the badge up or down its pole; the bar point stays. */
    override translateBody(_dt: number, dp: number, orig: DrawingPoint[]): DrawingPoint[] {
        const t = orig[0];
        const b = orig[1];
        if (!t || !b) return orig.map((o) => ({ time: o.time, price: o.price + dp }));
        return [{ time: t.time, price: t.price }, { time: t.time, price: b.price + dp }];
    }

    override onPlaced(): void {
        const t = this.anchors[0];
        const b = this.anchors[1];
        if (t && b) b.time = t.time;
    }

    override constrainHandleDrag(): void {
        this.onPlaced();
    }
}
