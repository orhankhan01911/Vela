import type { Projector } from '../geometry';
import type { FibLevel } from './FibRatios';
import { RadialFib, type RadialGeom } from './RadialFib';
import { fibLevels } from '../levelPalette';

const CIRCLE_LEVELS = fibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]);

/** TradingView's Fib Circles: concentric ellipses centred on the middle of the two points; level 1 fits the
 *  rectangle the two points span, the other levels scale it. */
export class FibCircles extends RadialFib {
    readonly type = 'fibcircles' as const;

    defaultLevels(): readonly FibLevel[] {
        return CIRCLE_LEVELS;
    }

    radial(proj: Projector): RadialGeom | null {
        const c = this.anchors[0];
        const e = this.anchors[1];
        if (!c || !e) return null;
        const cy = proj.yOf(c.price, this.paneId);
        const ey = proj.yOf(e.price, this.paneId);
        if (cy == null || ey == null) return null;
        const cx = proj.xOf(c.time);
        const ex = proj.xOf(e.time);
        const mx = (cx + ex) / 2;
        const my = (cy + ey) / 2;
        const rx = Math.abs(ex - cx) / 2;
        const ry = Math.abs(ey - cy) / 2;
        // A flat or vertical pair spans no rectangle: a circle through both points.
        if (rx < 0.5 || ry < 0.5) return { cx: mx, cy: my, R0: Math.hypot(ex - cx, ey - cy) / 2, a0: 0, a1: Math.PI * 2 };
        return { cx: mx, cy: my, R0: rx, a0: 0, a1: Math.PI * 2, sy: ry / rx };
    }
}
