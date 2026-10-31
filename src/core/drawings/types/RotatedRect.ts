import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

/**
 * A rectangle at any angle: the baseline p1→p2 sets length + rotation, and p3 sets the
 * perpendicular thickness. The four corners are constructed in pixel space each frame
 * (so the figure shears with the x/y scale, like every data-space drawing).
 *
 * A new one is TradingView's (module 268872): p1→p2 is its middle line and p3 sets half its width on both sides; six
 * handles (p1, p2 and the four corners, each corner setting the width); iguana green 2 px, the green at 20 % behind.
 * One saved before keeps its look (p1→p2 one side, p3 the other).
 */
export class RotatedRect extends SegmentDrawing {
    readonly type = 'rotatedrect' as const;
    /** TradingView's rotated rectangle: a new one; one saved before keeps its look. */
    declare tv?: boolean;
    /** TradingView's Background switch (the colour is style.fillColor). */
    declare fillBackground?: boolean;

    constructor(init: ConstructorParameters<typeof SegmentDrawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.fillBackground = true;
        }
    }

    /** TradingView's corners in pixels: p1 and p2 moved half the width each way along the axis' normal (null until
     *  the width point is placed). */
    tvCorners(proj: Projector): { p1: [number, number]; p2: [number, number]; corners: Array<[number, number]> } | null {
        const A = this.px(proj, 0);
        const B = this.px(proj, 1);
        const W = this.px(proj, 2);
        if (!A || !B || !W) return null;
        const ex = B[0] - A[0];
        const ey = B[1] - A[1];
        const len = Math.hypot(ex, ey);
        if (len < 1e-6) return null;
        const nx = ey / len; // TradingView's normal (e.y, -e.x)
        const ny = -ex / len;
        const d = Math.abs((W[0] - A[0]) * nx + (W[1] - A[1]) * ny);
        return {
            p1: A,
            p2: B,
            corners: [
                [A[0] + nx * d, A[1] + ny * d],
                [B[0] + nx * d, B[1] + ny * d],
                [B[0] - nx * d, B[1] - ny * d],
                [A[0] - nx * d, A[1] - ny * d],
            ],
        };
    }

    override handlePoints(proj: Projector): Array<[number, number]> {
        const T = this.tv ? this.tvCorners(proj) : null;
        return T ? [T.p1, T.p2, ...T.corners] : super.handlePoints(proj);
    }

    /** TradingView's handle moves: a corner sets the width (the width point follows it); p1 or p2 moves the axis and
     *  keeps the width. */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (!this.tv || this.anchors.length < 3) return false;
        const pt = proj.pxToPoint(x, y, this.paneId);
        if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
        const [a, b, w] = this.anchors as [typeof this.anchors[0], typeof this.anchors[0], typeof this.anchors[0]];
        if (index >= 2) {
            this.anchors = [a, b, { ...w, time: pt.time, price: pt.price }];
            return true;
        }
        const T = this.tvCorners(proj);
        const half = T ? Math.hypot(T.corners[0]![0] - T.p1[0], T.corners[0]![1] - T.p1[1]) : 0;
        const moved = index === 0 ? [{ ...a, time: pt.time, price: pt.price }, b] : [a, { ...b, time: pt.time, price: pt.price }];
        this.anchors = [moved[0]!, moved[1]!, w];
        const A = this.px(proj, 0);
        const B = this.px(proj, 1);
        if (A && B) {
            const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
            const wp = proj.pxToPoint(A[0] + ((B[1] - A[1]) / len) * half, A[1] - ((B[0] - A[0]) / len) * half, this.paneId);
            this.anchors = [this.anchors[0]!, this.anchors[1]!, { ...w, time: wp.time, price: wp.price }];
        }
        return true;
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return this.tv ? { tv: true, fillBackground: this.fillBackground !== false } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        this.tv = true;
        if (typeof props.fillBackground === 'boolean') this.fillBackground = props.fillBackground;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 3, max: 3, slots: [{ role: 'p1', free: 'both' }, { role: 'p2', free: 'both' }, { role: 'w', free: 'both' }] };
    }

    private px(proj: Projector, i: number): [number, number] | null {
        const a = this.anchors[i];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        return y == null ? null : [proj.xOf(a.time), y];
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const T = this.tv ? this.tvCorners(proj) : null;
        if (T) {
            const c = T.corners;
            return {
                segments: c.map((p, i) => [p[0], p[1], c[(i + 1) % 4]![0], c[(i + 1) % 4]![1]] as [number, number, number, number]),
                fill: this.fillBackground !== false ? c : null,
            };
        }
        const A = this.px(proj, 0);
        const B = this.px(proj, 1);
        if (!A || !B) return null;
        const W = this.px(proj, 2);
        if (!W || this.anchors.length < 3) {
            return { segments: [[A[0], A[1], B[0], B[1]]], fill: null }; // baseline only (placing)
        }
        const vx = B[0] - A[0];
        const vy = B[1] - A[1];
        const len = Math.hypot(vx, vy);
        if (len < 1e-6) return { segments: [[A[0], A[1], B[0], B[1]]], fill: null };
        const nx = -vy / len; // unit perpendicular
        const ny = vx / len;
        const h = (W[0] - A[0]) * nx + (W[1] - A[1]) * ny; // signed perpendicular distance of the width point
        const ox = nx * h;
        const oy = ny * h;
        const C0: [number, number] = A;
        const C1: [number, number] = B;
        const C2: [number, number] = [B[0] + ox, B[1] + oy];
        const C3: [number, number] = [A[0] + ox, A[1] + oy];
        return {
            segments: [
                [C0[0], C0[1], C1[0], C1[1]],
                [C1[0], C1[1], C2[0], C2[1]],
                [C2[0], C2[1], C3[0], C3[1]],
                [C3[0], C3[1], C0[0], C0[1]],
            ],
            fill: [C0, C1, C2, C3],
        };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.anchors.length === 0) return null;
        // TradingView's: the corners sit about the width point's offset from the axis on both sides of each end (the
        // width is set on screen, so this is the autoscale's estimate).
        if (this.tv && this.anchors.length >= 3) {
            const [a, b, w] = this.anchors;
            const off = Math.abs(w!.price - (a!.price + b!.price) / 2);
            const ps = [a!.price - off, a!.price + off, b!.price - off, b!.price + off];
            return { min: Math.min(...ps), max: Math.max(...ps) };
        }
        const ps = this.anchors.map((a) => a.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    schema(): SettingsSchema {
        // TradingView's: Border (colour and width, always solid) and Background; no text.
        if (this.tv)
            return {
                fields: [
                    ...LINE_FIELDS.filter((f) => f.path !== 'style.lineStyle').map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })),
                    ...FILL_FIELDS,
                    { path: 'fillBackground', label: 'Background', kind: 'boolean', group: 'fill' },
                ],
            };
        return { fields: [...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })), ...FILL_FIELDS, ...TEXT_FIELDS] };
    }
}
