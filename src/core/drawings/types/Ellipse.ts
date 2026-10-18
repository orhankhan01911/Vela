import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { distToPolyline, handleAt } from '../hittest';

const PERIM_SAMPLES = 48; // perimeter samples for outline hit-testing

/**
 * TradingView's ellipse: the first two points span one axis (so the ellipse tilts along the line between them), the
 * third sets the other radius (its distance from that axis). Ellipses saved before (two corners of a level box, no
 * `axis` flag) keep that shape. Optional fill.
 */
export class Ellipse extends Drawing {
    readonly type = 'ellipse' as const;
    // `!` (no initializer): set by readProps (run by the base constructor) for an old two-corner ellipse.
    private boxed!: boolean;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        if (this.boxed) return { min: 2, max: 2, slots: [{ role: 'c1', free: 'both' }, { role: 'c2', free: 'both' }] };
        return { min: 3, max: 3, slots: [{ role: 'p1', free: 'both' }, { role: 'p2', free: 'both' }, { role: 'radius', free: 'both' }] };
    }

    protected override writeProps(): Record<string, unknown> {
        return { axis: !this.boxed };
    }

    protected override readProps(props: Record<string, unknown>): void {
        this.boxed = props.axis === false; // set on old records by deserializeDrawing
    }

    /** Centre, radii and tilt (radians, of the first axis) in pixels. */
    oval(proj: Projector): { cx: number; cy: number; rx: number; ry: number; rot: number } | null {
        const pts = this.handlePoints(proj);
        if (pts.length < 2) return null;
        const [xa, ya] = pts[0]!;
        const [xb, yb] = pts[1]!;
        if (this.boxed) return { cx: (xa + xb) / 2, cy: (ya + yb) / 2, rx: Math.abs(xb - xa) / 2, ry: Math.abs(yb - ya) / 2, rot: 0 };
        const rx = Math.hypot(xb - xa, yb - ya) / 2;
        const rot = Math.atan2(yb - ya, xb - xa);
        const c = pts[2];
        // While the third point is not placed yet, a circle on the first axis.
        const ry = c ? Math.abs((c[0] - xa) * Math.sin(rot) - (c[1] - ya) * Math.cos(rot)) : rx;
        return { cx: (xa + xb) / 2, cy: (ya + yb) / 2, rx, ry, rot };
    }

    private perimeter(o: { cx: number; cy: number; rx: number; ry: number; rot: number }): Array<[number, number]> {
        const pts: Array<[number, number]> = [];
        const cr = Math.cos(o.rot);
        const sr = Math.sin(o.rot);
        for (let i = 0; i <= PERIM_SAMPLES; i += 1) {
            const t = (i / PERIM_SAMPLES) * Math.PI * 2;
            const ex = o.rx * Math.cos(t);
            const ey = o.ry * Math.sin(t);
            pts.push([o.cx + ex * cr - ey * sr, o.cy + ex * sr + ey * cr]);
        }
        return pts;
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const o = this.oval(proj);
        if (!o || o.rx < 1 || o.ry < 1) return false;
        const dx = px - o.cx;
        const dy = py - o.cy;
        const u = dx * Math.cos(o.rot) + dy * Math.sin(o.rot); // the point in the ellipse's own axes
        const v = -dx * Math.sin(o.rot) + dy * Math.cos(o.rot);
        const f = (u / o.rx) ** 2 + (v / o.ry) ** 2;
        if (this.style.fillColor && f <= 1) return true; // inside a filled ellipse
        return distToPolyline(px, py, this.perimeter(o)) <= tol; // near the outline
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const pts: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            pts.push([proj.xOf(a.time), y]);
        }
        return pts;
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const o = this.oval(proj);
        if (!o) return null;
        // The tilted ellipse's bounding box: its half-extents along x and y.
        const hw = Math.hypot(o.rx * Math.cos(o.rot), o.ry * Math.sin(o.rot));
        const hh = Math.hypot(o.rx * Math.sin(o.rot), o.ry * Math.cos(o.rot));
        return { x: o.cx - hw, y: o.cy - hh, w: hw * 2, h: hh * 2 };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.anchors.length < 2) return null;
        const ps = this.anchors.map((p) => p.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
    }
}
