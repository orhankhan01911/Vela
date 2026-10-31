import type { Projector } from '../geometry';
import type { FibLevel } from './FibRatios';
import { RadialFib, type RadialGeom } from './RadialFib';
import { fibLevels } from '../levelPalette';

const CIRCLE_LEVELS = fibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]);

const TV_FC_GRAY = '#808080'; // palette-exempt: TradingView's cold-gray-500 (level 1, trend line)

/** TradingView's 11 circles (module 289525), in its order and colours, each 2 px solid, all shown. */
export const TV_FIB_CIRCLE_LEVELS: readonly FibLevel[] = (
    [
        [0.236, '#F23645'], // palette-exempt: TradingView's ripe-red-500
        [0.382, '#FF9800'], // palette-exempt: TradingView's tan-orange-500
        [0.5, '#4CAF50'], // palette-exempt: TradingView's minty-green-500
        [0.618, '#089981'], // palette-exempt: TradingView's iguana-green-500
        [0.786, '#00BCD4'], // palette-exempt: TradingView's sky-blue-500
        [1, TV_FC_GRAY],
        [1.618, '#2962FF'], // palette-exempt: TradingView's tv-blue-500
        [2.618, '#E91E63'], // palette-exempt: TradingView's berry-pink-500
        [3.618, '#2962FF'], // palette-exempt: TradingView's tv-blue-500
        [4.236, '#E91E63'], // palette-exempt: TradingView's berry-pink-500
        [4.618, '#F23645'], // palette-exempt: TradingView's ripe-red-500
    ] as const
).map(([ratio, color]) => ({ ratio, color, enabled: true, lineWidth: 2, lineStyle: 'solid' as const }));

/** TradingView's Fib Circles: concentric ellipses centred on the middle of the two points; level 1 fits the
 *  rectangle the two points span, the other levels scale it.
 *
 *  A new one is TradingView's (module 289525): 11 levels, bands between the rings at 80 % transparency, each level's
 *  number left of its ring's lowest point, a dashed grey 2 px trend line between the points. */
export class FibCircles extends RadialFib {
    readonly type = 'fibcircles' as const;

    protected override applyTvDefaults(): boolean {
        this.levels = TV_FIB_CIRCLE_LEVELS.map((l) => ({ ...l }));
        this.style = { ...this.style, lineWidth: 2, lineStyle: 'solid' };
        this.background = true;
        this.fillOpacity = 0.2;
        this.showLevels = true;
        this.levelsAsPercent = false;
        this.trendline = true;
        this.trendColor = TV_FC_GRAY;
        this.trendWidth = 2;
        this.trendStyle = 'dashed';
        return true;
    }

    /** TradingView: the number ends 4 px left of the ring's lowest point, centred on it. */
    override ringLabel(g: RadialGeom, r: number): { x: number; y: number; align: 'left' | 'right' | 'center' } {
        if (!this.tv) return super.ringLabel(g, r);
        return { x: g.cx - 4, y: g.cy + r * (g.sy ?? 1), align: 'right' };
    }

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
