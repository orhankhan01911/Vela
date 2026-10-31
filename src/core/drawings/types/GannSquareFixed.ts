import type { Projector } from '../geometry';
import { GannSquare, type GannSquareFrame } from './GannSquare';

/**
 * TradingView's Gann square fixed (module 241492): the Gann square's grid, fans and arcs (same tables and dialog, no
 * price/bar ratio, no labels) on a box that is square on screen: from the first point, five times the distance to the
 * second point each way, toward the second point's quadrant. Reverse swaps the two points.
 */
export class GannSquareFixed extends GannSquare {
    override readonly type = 'gannsquarefixed' as const;

    constructor(init: ConstructorParameters<typeof GannSquare>[0]) {
        super(init);
        if (!init.props) this.showLabels = false; // TradingView's fixed square prints no ranges
    }

    /** The first point, then the second as placed (TradingView's two handles). */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const out: Array<[number, number]> = [];
        for (const a of this.anchors.slice(0, 2)) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            out.push([proj.xOf(a.time), y]);
        }
        return out;
    }

    override tvFrame(proj: Projector): GannSquareFrame | null {
        const h = this.handlePoints(proj);
        if (h.length < 2) return null;
        const [[x0, y0], [x1, y1]] = h as [[number, number], [number, number]];
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len < 1e-9) return null;
        const rx = 5 * len * (x1 - x0 < 0 ? -1 : 1);
        const ry = 5 * len * (y1 - y0 < 0 ? -1 : 1);
        return { sx: x0, sy: y0, rx, ry, left: Math.min(x0, x0 + rx), top: Math.min(y0, y0 + ry), right: Math.max(x0, x0 + rx), bot: Math.max(y0, y0 + ry) };
    }

    /** No price/bar ratio to fix or keep. */
    override onPlaced(): void {}

    override constrainHandleDrag(): void {}

    /** TradingView: Reverse swaps the two points. */
    override applySettings(patch: Record<string, unknown>): void {
        const flip = typeof patch.reverse === 'boolean' && patch.reverse !== (this.reverse === true);
        super.applySettings(patch);
        if (flip && this.anchors.length >= 2) this.anchors = [this.anchors[1]!, this.anchors[0]!];
    }
}
