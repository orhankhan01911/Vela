import { type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { FibLevel } from './FibRatios';
import { RadialFib, type RadialGeom } from './RadialFib';
import { fibLevels } from '../levelPalette';
import { TV_FC_GRAY } from './FibCircles';

const WEDGE_LEVELS = fibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1]);

/** TradingView's 11 wedge levels (module 474614), in its order and colours, each 2 px solid; 0.236 .. 1 shown. */
export const TV_FIB_WEDGE_LEVELS: readonly FibLevel[] = (
    [
        [0.236, '#F23645'], // palette-exempt: TradingView's ripe-red-500
        [0.382, '#FF9800'], // palette-exempt: TradingView's tan-orange-500
        [0.5, '#089981'], // palette-exempt: TradingView's iguana-green-500
        [0.618, '#4CAF50'], // palette-exempt: TradingView's minty-green-500
        [0.786, '#00BCD4'], // palette-exempt: TradingView's sky-blue-500
        [1, TV_FC_GRAY],
        [1.618, '#2962FF'], // palette-exempt: TradingView's tv-blue-500
        [2.618, '#F23645'], // palette-exempt: TradingView's ripe-red-500
        [3.618, '#673AB7'], // palette-exempt: TradingView's deep-blue-500
        [4.236, '#E91E63'], // palette-exempt: TradingView's berry-pink-500
        [4.618, '#E91E63'], // palette-exempt: TradingView's berry-pink-500
    ] as const
).map(([ratio, color]) => ({ ratio, color, enabled: ratio <= 1, lineWidth: 2, lineStyle: 'solid' as const }));

/**
 * A Fibonacci wedge: an apex (p1) with a base radius `R0 = |p2 − p1|` and an angular sweep between
 * the two rays p1→p2 and p1→p3 (p3 contributes only its angle). Each level is a circular arc of
 * radius `R0 · ratio` spanning the (minor) wedge angle, plus the two bounding rays.
 *
 * A new one is TradingView's (module 474614): its 11 levels with bands between them, the two edges as solid grey 2 px
 * trend lines, each number 4 px left of where its arc meets the wedge's bisector, the third handle on the second edge
 * at the first edge's length.
 */
export class FibWedge extends RadialFib {
    readonly type = 'fibwedge' as const;

    protected override applyTvDefaults(): boolean {
        this.applyTvRingLook(TV_FIB_WEDGE_LEVELS, TV_FC_GRAY);
        this.trendStyle = 'solid';
        return true;
    }

    defaultLevels(): readonly FibLevel[] {
        return WEDGE_LEVELS;
    }

    override anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 3, max: 3, slots: [{ role: 'apex', free: 'both' }, { role: 'radius', free: 'both' }, { role: 'angle', free: 'both' }] };
    }

    private px(proj: Projector, i: number): [number, number] | null {
        const a = this.anchors[i];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        return y == null ? null : [proj.xOf(a.time), y];
    }

    radial(proj: Projector): RadialGeom | null {
        const p0 = this.px(proj, 0);
        const p1 = this.px(proj, 1);
        const p2 = this.px(proj, 2);
        if (!p0 || !p1 || !p2) return null;
        const R0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        if (R0 < 1) return null;
        const angle1 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
        const angle2 = Math.atan2(p2[1] - p0[1], p2[0] - p0[0]);
        let lo = Math.min(angle1, angle2);
        let hi = Math.max(angle1, angle2);
        if (hi - lo > Math.PI) [lo, hi] = [hi, lo + Math.PI * 2]; // take the minor (wedge) sweep
        return { cx: p0[0], cy: p0[1], R0, a0: lo, a1: hi };
    }

    /** TradingView: the number ends 4 px left of where its arc meets the wedge's bisector. */
    override ringLabel(g: RadialGeom, r: number): { x: number; y: number; align: 'left' | 'right' | 'center' } {
        if (!this.tv) return super.ringLabel(g, r);
        const mid = (g.a0 + g.a1) / 2;
        return { x: g.cx + Math.cos(mid) * r - 4, y: g.cy + Math.sin(mid) * r, align: 'right' };
    }

    /** TradingView-look drawings: the two edges are its trend lines (in the trend line's colour, width and style). */
    override trendSegments(proj: Projector): Array<[number, number, number, number]> {
        return this.tv && this.trendline !== false ? this.edges(proj) : [];
    }

    /** TradingView puts the third handle on the second edge, at the first edge's length. */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const pts = super.handlePoints(proj);
        const e = this.tv ? this.edges(proj)[1] : undefined;
        if (e && pts.length === 3) pts[2] = [e[2], e[3]];
        return pts;
    }

    override boundingLines(proj: Projector): Array<[number, number, number, number]> {
        return this.tv ? [] : this.edges(proj);
    }

    /** p1→p2, and p1 toward p3 cut to |p2 − p1|. */
    private edges(proj: Projector): Array<[number, number, number, number]> {
        const p0 = this.px(proj, 0);
        const p1 = this.px(proj, 1);
        if (!p0 || !p1) return [];
        const out: Array<[number, number, number, number]> = [[p0[0], p0[1], p1[0], p1[1]]]; // apex→radius ray
        const p2 = this.px(proj, 2);
        if (p2) {
            const R0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
            const len = Math.hypot(p2[0] - p0[0], p2[1] - p0[1]);
            if (len > 1e-6) {
                // the second ray re-projected to the same radius R0 (only its angle matters)
                out.push([p0[0], p0[1], p0[0] + ((p2[0] - p0[0]) / len) * R0, p0[1] + ((p2[1] - p0[1]) / len) * R0]);
            }
        }
        return out;
    }
}
