import { Drawing, type AnchorSlot } from '../Drawing';
import type { DrawingText } from '../style';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { distToPolyline, handleAt } from '../hittest';

const PERIM_SAMPLES = 48; // perimeter samples for outline hit-testing

/**
 * TradingView's ellipse: the first two points span one axis (so the ellipse tilts along the line between them), the
 * third sets the other radius (its distance from that axis). Ellipses saved before (two corners of a level box, no
 * `axis` flag) keep that shape. Optional fill.
 *
 * A new one also takes TradingView's look (module 604020): ripe red 2 px, the red at 20 % behind with a Background
 * switch; four handles (the axis ends, keeping the other radius, and both ends of the other axis, setting it); text
 * 14 px red, centred and turned along the axis.
 */
export class Ellipse extends Drawing {
    readonly type = 'ellipse' as const;
    // `!` (no initializer): set by readProps (run by the base constructor) for an old two-corner ellipse.
    private boxed!: boolean;
    /** TradingView's look: a new one; one saved before keeps its look. */
    declare tv?: boolean;
    /** TradingView's Background switch (the colour is style.fillColor). */
    declare fillBackground?: boolean;

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.fillBackground = true;
        }
    }

    /** TradingView's text: 14 px ripe red, centred. */
    override textDefaults(): Partial<DrawingText> | undefined {
        return this.tv ? { color: '#F23645', size: 14, hAlign: 'center', vAlign: 'center' } : undefined; // palette-exempt: TradingView's ripe red 500
    }

    /** Whether the inside is painted (TradingView's Background switch; older ellipses whenever they have a fill). */
    filled(): boolean {
        return !!this.style.fillColor && (this.tv ? this.fillBackground !== false : true);
    }

    /** The anchors in pixels. */
    private anchorPx(proj: Projector): Array<[number, number]> {
        const pts: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            pts.push([proj.xOf(a.time), y]);
        }
        return pts;
    }

    /** TradingView's ends of the other axis: the centre moved its radius each way along the axis' normal. */
    private minorEnds(o: { cx: number; cy: number; ry: number; rot: number }): [[number, number], [number, number]] {
        const nx = -Math.sin(o.rot);
        const ny = Math.cos(o.rot);
        return [[o.cx + nx * o.ry, o.cy + ny * o.ry], [o.cx - nx * o.ry, o.cy - ny * o.ry]];
    }

    /** TradingView's handle moves: an end of the other axis sets its radius; an axis end moves and keeps it. */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (!this.tv || this.boxed || this.anchors.length < 3) return false;
        const pt = proj.pxToPoint(x, y, this.paneId);
        if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
        const [a, b, c] = this.anchors as [typeof this.anchors[0], typeof this.anchors[0], typeof this.anchors[0]];
        if (index >= 2) {
            this.anchors = [a, b, { ...c, time: pt.time, price: pt.price }];
            return true;
        }
        const before = this.oval(proj);
        this.anchors = index === 0 ? [{ ...a, time: pt.time, price: pt.price }, b, c] : [a, { ...b, time: pt.time, price: pt.price }, c];
        const after = this.oval(proj);
        if (before && after) {
            const [end] = this.minorEnds({ ...after, ry: before.ry });
            const w = proj.pxToPoint(end[0], end[1], this.paneId);
            this.anchors = [this.anchors[0]!, this.anchors[1]!, { ...c, time: w.time, price: w.price }];
        }
        return true;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        if (this.boxed) return { min: 2, max: 2, slots: [{ role: 'c1', free: 'both' }, { role: 'c2', free: 'both' }] };
        return { min: 3, max: 3, slots: [{ role: 'p1', free: 'both' }, { role: 'p2', free: 'both' }, { role: 'radius', free: 'both' }] };
    }

    protected override writeProps(): Record<string, unknown> {
        return { axis: !this.boxed, ...(this.tv ? { tv: true, fillBackground: this.fillBackground !== false } : {}) };
    }

    protected override readProps(props: Record<string, unknown>): void {
        this.boxed = props.axis === false; // set on old records by deserializeDrawing
        if (props.tv === true) this.tv = true;
        if (typeof props.fillBackground === 'boolean') this.fillBackground = props.fillBackground;
    }

    /** Centre, radii and tilt (radians, of the first axis) in pixels. */
    oval(proj: Projector): { cx: number; cy: number; rx: number; ry: number; rot: number } | null {
        const pts = this.anchorPx(proj);
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
        if (this.filled() && f <= 1) return true; // inside a filled ellipse
        return distToPolyline(px, py, this.perimeter(o)) <= tol; // near the outline
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const pts = this.anchorPx(proj);
        // TradingView's: the axis ends, then both ends of the other axis.
        if (this.tv && !this.boxed && pts.length >= 3) {
            const o = this.oval(proj);
            if (o) return [pts[0]!, pts[1]!, ...this.minorEnds(o)];
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
        // TradingView's: Border (colour and width), Background, and its text (colour, size, bold, italic; no alignment).
        if (this.tv)
            return {
                fields: [
                    ...LINE_FIELDS.filter((f) => f.path !== 'style.lineStyle').map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })),
                    ...FILL_FIELDS,
                    { path: 'fillBackground', label: 'Background', kind: 'boolean', group: 'fill' },
                    ...TEXT_FIELDS,
                ],
            };
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
    }
}
