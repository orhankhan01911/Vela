import type { Projector } from '../geometry';
import type { FibLevel } from './FibRatios';
import { RadialFib, type RadialGeom } from './RadialFib';
import { fibLevels } from '../levelPalette';
import { TV_FC_GRAY, TV_FIB_CIRCLE_LEVELS } from './FibCircles';

const ARC_LEVELS = fibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]);

/**
 * Fibonacci speed/resistance arcs: concentric semicircles centered at the pivot (p1), at radii
 * `R0 · ratio` where `R0 = |p2 − p1|`, bulging toward the far anchor (p2). The p1→p2 baseline is drawn too.
 *
 * A new one is TradingView's (module 492327): the circles' 11 levels, bands and trend line; the lower half circles when
 * p2 is below p1, the upper ones otherwise (Full circles draws them whole); each number 4 px left of where its circle
 * crosses the vertical through p1, on p2's side.
 */
export class FibArcs extends RadialFib {
    readonly type = 'fibarcs' as const;

    /** TradingView's Full circles. */
    declare fullCircles?: boolean;

    protected override applyTvDefaults(): boolean {
        this.applyTvRingLook(TV_FIB_CIRCLE_LEVELS, TV_FC_GRAY);
        this.fullCircles = false;
        return true;
    }

    defaultLevels(): readonly FibLevel[] {
        return ARC_LEVELS;
    }

    private pts(proj: Projector): { cx: number; cy: number; ex: number; ey: number } | null {
        const c = this.anchors[0];
        const e = this.anchors[1];
        if (!c || !e) return null;
        const cy = proj.yOf(c.price, this.paneId);
        const ey = proj.yOf(e.price, this.paneId);
        if (cy == null || ey == null) return null;
        return { cx: proj.xOf(c.time), cy, ex: proj.xOf(e.time), ey };
    }

    radial(proj: Projector): RadialGeom | null {
        const p = this.pts(proj);
        if (!p) return null;
        const R0 = Math.hypot(p.ex - p.cx, p.ey - p.cy);
        if (this.tv) {
            const dir = Math.sign(p.ey - p.cy);
            const [a0, a1] = this.fullCircles ? [0, Math.PI * 2] : dir > 0 ? [0, Math.PI] : [Math.PI, Math.PI * 2];
            return { cx: p.cx, cy: p.cy, R0, a0, a1, dir };
        }
        const phi = Math.atan2(p.ey - p.cy, p.ex - p.cx); // direction toward the far anchor
        return { cx: p.cx, cy: p.cy, R0, a0: phi - Math.PI / 2, a1: phi + Math.PI / 2 };
    }

    /** TradingView: the number ends 4 px left of where its circle crosses the vertical through p1, on p2's side. */
    override ringLabel(g: RadialGeom, r: number): { x: number; y: number; align: 'left' | 'right' | 'center' } {
        if (!this.tv) return super.ringLabel(g, r);
        return { x: g.cx - 4, y: g.cy + (g.dir ?? 0) * r, align: 'right' };
    }

    override boundingLines(proj: Projector): Array<[number, number, number, number]> {
        if (this.tv) return []; // TradingView's trend line takes the baseline's place
        const p = this.pts(proj);
        return p ? [[p.cx, p.cy, p.ex, p.ey]] : []; // the pivot→far baseline
    }

    protected override writeProps(): Record<string, unknown> {
        const out = super.writeProps();
        if (this.tv) out.fullCircles = this.fullCircles === true;
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (typeof props.fullCircles === 'boolean') this.fullCircles = props.fullCircles;
    }
}
