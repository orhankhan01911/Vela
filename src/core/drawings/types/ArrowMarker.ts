import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';
import { distToSegment, pointInPolygon } from '../hittest';

/** TradingView's head length for an arrow `len` px long (its arrow marker renderer). */
function tvHead(len: number): number {
    if (len < 92) return 18;
    return Math.min(Math.max(Math.min(0.25 * len, 106), 18), 0.9 * len);
}

/** TradingView's outline width for an arrow `len` px long: 2 % of it, 2-5 px. */
export function arrowMarkerStroke(len: number): number {
    return Math.max(2, Math.min(5, Math.round(0.02 * len)));
}

/**
 * TradingView's arrow marker: a filled arrow from a point at the first anchor to its head at the second, with optional
 * text at the tail. New ones (`tv`) are TradingView's, read from its code 2026-10-30: one color (its blue 600) for the arrow
 * and its outline, a head that grows with the length (18-106 px), an outline 2-5 px, at least 22 px long, a 9 px dot
 * when both points coincide, the text bold 16 px 10 px off the tail on the side away from the head. Markers saved
 * before keep their border, fill and shape.
 */
export class ArrowMarker extends SegmentDrawing {
    readonly type = 'arrowmarker' as const;
    /** TradingView's arrow (new markers). */
    override tv?: boolean;

    constructor(init: ConstructorParameters<typeof SegmentDrawing>[0]) {
        super(init);
        if (!init.props) this.tv = true;
    }

    /** TradingView's polygon (screen px) and whether it is the dot: tail, the head's inner notch, its barb, the tip and
     *  back. Null while placing or off-pane. */
    tvShape(proj: Projector): { poly: Array<[number, number]>; dot: [number, number] | null; len: number } | null {
        const pts = this.handlePoints(proj);
        if (pts.length < 2) return null;
        const [ax, ay] = pts[0]!;
        const [bx, by] = pts[1]!;
        const a = this.anchors[0]!;
        const b = this.anchors[1]!;
        if (a.time === b.time && Math.abs(a.price - b.price) < 1e-8) return { poly: [], dot: [ax, ay], len: 0 };
        let len = Math.hypot(bx - ax, by - ay);
        const ux = len > 0 ? (bx - ax) / len : 0;
        const uy = len > 0 ? (by - ay) / len : -1;
        let sx = ax;
        let sy = ay;
        if (len < 22) {
            sx = bx - ux * 22;
            sy = by - uy * 22;
            len = 22;
        }
        const nx = uy; // TradingView's normal (r.y, -r.x)
        const ny = -ux;
        const e = tvHead(len);
        const i = len >= 35 ? 0.1 : 0;
        const geo: Array<[number, number]> = [[len - e + e * i, (1.22 * e) / 4], [len - e, (1.22 * e) / 2]];
        const at = (along: number, perp: number): [number, number] => [sx + ux * along + nx * perp, sy + uy * along + ny * perp];
        const poly: Array<[number, number]> = [[sx, sy], ...geo.map(([g, h]) => at(g, h)), [bx, by], ...[...geo].reverse().map(([g, h]) => at(g, -h))];
        return { poly, dot: null, len };
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'tail', free: 'both' }, { role: 'head', free: 'both' }] };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        if (this.tv) {
            const sh = this.tvShape(proj);
            if (!sh) return null;
            if (sh.dot) {
                const [x, y] = sh.dot;
                const ring: Array<[number, number]> = Array.from({ length: 16 }, (_, k) => [x + 9 * Math.cos((k * Math.PI) / 8), y + 9 * Math.sin((k * Math.PI) / 8)]);
                return { segments: [], fill: ring };
            }
            const segs: Array<[number, number, number, number]> = sh.poly.map((p, k) => {
                const q = sh.poly[(k + 1) % sh.poly.length]!;
                return [p[0], p[1], q[0], q[1]];
            });
            return { segments: segs, fill: sh.poly };
        }
        const pts = this.handlePoints(proj);
        if (pts.length < 2) return null;
        const [x1, y1] = pts[0]!;
        const [x2, y2] = pts[1]!;
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len < 4) return { segments: [[x1, y1, x2, y2]], fill: null };
        const ux = (x2 - x1) / len;
        const uy = (y2 - y1) / len;
        const nx = -uy;
        const ny = ux;
        const head = Math.min(26, len * 0.35); // head length
        const hw = Math.max(5, Math.min(14, len * 0.12)); // head half-width
        const sw = hw * 0.5; // shaft half-width at the head
        const bx = x2 - ux * head;
        const by = y2 - uy * head;
        const poly: Array<[number, number]> = [
            [x1 + nx * 1, y1 + ny * 1],
            [bx + nx * sw, by + ny * sw],
            [bx + nx * hw, by + ny * hw],
            [x2, y2],
            [bx - nx * hw, by - ny * hw],
            [bx - nx * sw, by - ny * sw],
            [x1 - nx * 1, y1 - ny * 1],
        ];
        const segments: Array<[number, number, number, number]> = [];
        for (let i = 0; i < poly.length; i += 1) {
            const p = poly[i]!;
            const q = poly[(i + 1) % poly.length]!;
            segments.push([p[0], p[1], q[0], q[1]]);
        }
        return { segments, fill: poly };
    }

    /** TradingView's: the whole arrow (or dot) is grabbable, filled with its one color. */
    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        if (!this.tv) return super.hitTest(px, py, proj, tol);
        const g = this.geometry(proj);
        if (!g?.fill) return false;
        if (pointInPolygon(px, py, g.fill)) return true;
        const f = g.fill;
        return f.some((p, k) => {
            const q = f[(k + 1) % f.length]!;
            return distToSegment(px, py, p[0], p[1], q[0], q[1]) <= tol;
        });
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
    }

    schema(): SettingsSchema {
        // TradingView's: one Color for the arrow; the text with its color, size, bold and italic (no alignment).
        if (this.tv) return { fields: [{ path: 'style.lineColor', label: 'Color', kind: 'color', group: 'line' }, ...TEXT_FIELDS] };
        return { fields: [...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })), ...FILL_FIELDS, ...TEXT_FIELDS] };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return this.tv ? { tv: true } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv === true) this.tv = true;
    }
}
