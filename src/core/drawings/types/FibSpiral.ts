import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS } from '../schema';
import { distToPolyline, distToSegment, extendRay, handleAt } from '../hittest';

const PHI = 1.6180339887;
const GROWTH = Math.log(PHI) / (Math.PI / 2); // radius ×φ per quarter turn → r = R0·e^(GROWTH·s)
const STEP = Math.PI / 64;
const MAX_S = Math.PI; // sample a half-turn past the edge anchor
const MIN_R = 0.5; // stop winding inward once the radius is sub-pixel

/** TradingView's spiral (module 337648): radii run through these, a quarter turn apart, in fifths of |p2 − p1|. */
const TV_FIB = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

/** TradingView's continuous Fibonacci radius at quarter-turn `t` (eased between the integers), null past 89. */
function tvFib(t: number): number | null {
    const lo = Math.floor(t);
    const hi = Math.ceil(t);
    if (hi >= TV_FIB.length) return null;
    return TV_FIB[lo]! + (TV_FIB[hi]! - TV_FIB[lo]!) * Math.pow(t - lo, 1.15);
}

/**
 * A golden (logarithmic) Fibonacci spiral: a data-anchored center (p1, the "eye") + an edge anchor
 * (p2) that fixes the initial pixel radius `R0 = |p2 − p1|` and the rotation. The radius multiplies
 * by φ every quarter turn; sampled as a polyline, clockwise by default.
 *
 * A new one is TradingView's (module 337648): from p1 along p1→p2, the radius steps through 0, 1, 2, 3, 5 … 89 fifths
 * of |p2 − p1| a quarter turn apart (clockwise unless Counterclockwise), plus a ray from p1 through p2. One saved
 * before keeps its golden spiral (marked `tv: false` when read).
 */
export class FibSpiral extends Drawing {
    readonly type = 'fibspiral' as const;

    /** TradingView's look (new drawings). */
    declare tv?: boolean;
    /** TradingView's Counterclockwise. */
    declare counterclockwise?: boolean;

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.counterclockwise = false;
        }
    }

    /** TradingView's ray: from p1 through p2 to the pane's edge (TradingView-look drawings). */
    rayPoints(proj: Projector): [number, number, number, number] | null {
        if (!this.tv) return null;
        const h = this.handlePoints(proj);
        if (h.length < 2 || Math.hypot(h[1]![0] - h[0]![0], h[1]![1] - h[0]![1]) < 1) return null;
        return extendRay(h[0]![0], h[0]![1], h[1]![0], h[1]![1], 'right', proj.width, proj.height);
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'center', free: 'both' }, { role: 'edge', free: 'both' }] };
    }

    /** The spiral sampled to pixel points (eye → through the edge anchor → a little beyond). */
    spiralPoints(proj: Projector): Array<[number, number]> | null {
        const c = this.anchors[0];
        const e = this.anchors[1];
        if (!c || !e) return null;
        const cy = proj.yOf(c.price, this.paneId);
        const ey = proj.yOf(e.price, this.paneId);
        if (cy == null || ey == null) return null;
        const cx = proj.xOf(c.time);
        const ex = proj.xOf(e.time);
        const R0 = Math.hypot(ex - cx, ey - cy);
        if (R0 < 1) return null;
        const theta0 = Math.atan2(ey - cy, ex - cx);
        if (this.tv) {
            const dir = this.counterclockwise ? -1 : 1;
            const unit = R0 / 5;
            const out: Array<[number, number]> = [[cx, cy]];
            for (let k = 0; k < 50 * (TV_FIB.length - 1); k += 1) {
                const r = tvFib(k / 50);
                if (r == null) break;
                const ang = theta0 + (dir * k * Math.PI) / 100;
                out.push([cx + Math.cos(ang) * r * unit, cy + Math.sin(ang) * r * unit]);
            }
            return out;
        }
        const sMin = Math.max(Math.log(MIN_R / R0) / GROWTH, -8 * Math.PI * 2); // inward until sub-pixel (capped)
        const pts: Array<[number, number]> = [];
        for (let s = sMin; s <= MAX_S; s += STEP) {
            const r = R0 * Math.exp(GROWTH * s);
            const ang = theta0 + s; // dir = +1 → clockwise on a y-down canvas
            pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
        }
        return pts;
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const pts = this.spiralPoints(proj);
        if (pts != null && pts.length >= 2 && distToPolyline(px, py, pts) <= tol) return true;
        const ray = this.rayPoints(proj);
        return ray != null && distToSegment(px, py, ray[0], ray[1], ray[2], ray[3]) <= tol;
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const c = this.anchors[0];
        const e = this.anchors[1];
        if (!c || !e) return [];
        const cy = proj.yOf(c.price, this.paneId);
        const ey = proj.yOf(e.price, this.paneId);
        if (cy == null || ey == null) return [];
        return [[proj.xOf(c.time), cy], [proj.xOf(e.time), ey]];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const pts = this.handlePoints(proj);
        if (pts.length < 2) return null;
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }

    priceRange(): { min: number; max: number } | null {
        const c = this.anchors[0];
        const e = this.anchors[1];
        if (!c || !e) return null;
        return { min: Math.min(c.price, e.price), max: Math.max(c.price, e.price) };
    }

    schema(): SettingsSchema {
        // TradingView's dialog: the Line row and Counterclockwise (no text).
        if (this.tv) return { fields: [...LINE_FIELDS, { path: 'counterclockwise', label: 'Counterclockwise', kind: 'boolean', group: 'behavior' }] };
        return { fields: [...LINE_FIELDS, ...TEXT_FIELDS] };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return this.tv ? { tv: true, counterclockwise: this.counterclockwise === true } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.tv === 'boolean') this.tv = props.tv || undefined;
        if (typeof props.counterclockwise === 'boolean') this.counterclockwise = props.counterclockwise;
    }
}
