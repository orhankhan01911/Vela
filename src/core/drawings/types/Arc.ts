import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

const ARC_SAMPLES = 40;

/**
 * TradingView's arc: half an ellipse on the chord p1→p2 (its diameter) that passes through the third point. The
 * ellipse's other axis is square to the chord; the third point can sit anywhere beside the chord, so dragging it
 * both bulges and leans the arc. Arcs saved when the third point was pinned over the chord's middle draw unchanged.
 */
export class Arc extends SegmentDrawing {
    readonly type = 'arc' as const;

    /** TradingView's look on a new one (module 238807: berry pink 2 px, the pink at 20 % behind). */
    override tvShapeKind(): 'area' | 'polyline' | 'curve' | 'cycle' | 'lines' {
        return 'area';
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 3, max: 3, slots: [{ role: 'p1', free: 'both' }, { role: 'p2', free: 'both' }, { role: 'apex', free: 'both' }] };
    }

    private px(proj: Projector, i: number): [number, number] | null {
        const a = this.anchors[i];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        return y == null ? null : [proj.xOf(a.time), y];
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const A = this.px(proj, 0);
        const B = this.px(proj, 1);
        if (!A || !B) return null;
        const C = this.anchors.length >= 3 ? this.px(proj, 2) : null;
        if (!C) return { segments: [[A[0], A[1], B[0], B[1]]], fill: null }; // chord only (placing)
        const Mx = (A[0] + B[0]) / 2;
        const My = (A[1] + B[1]) / 2;
        const hx = (B[0] - A[0]) / 2; // half-chord vector
        const hy = (B[1] - A[1]) / 2;
        const len = Math.hypot(hx, hy);
        if (len < 1e-6) return { segments: [[A[0], A[1], B[0], B[1]]], fill: null };
        let nx = -hy / len; // unit normal to the chord
        let ny = hx / len;
        // The third point in the chord's frame: c along the half-chord (−1…1 between the ends), off along the normal.
        const dx = C[0] - Mx;
        const dy = C[1] - My;
        let off = dx * nx + dy * ny;
        if (off < 0) {
            nx = -nx;
            ny = -ny;
            off = -off;
        }
        const c = Math.max(-0.995, Math.min(0.995, (dx * hx + dy * hy) / (len * len)));
        // cos t = c and sin t · k = off on the ellipse, so its other semi-axis is k = off / sin t.
        const k = off / Math.sqrt(1 - c * c);
        const pts: Array<[number, number]> = [];
        for (let i = 0; i <= ARC_SAMPLES; i += 1) {
            const t = (i / ARC_SAMPLES) * Math.PI; // 0 → π sweeps B → A over the dome
            const cs = Math.cos(t);
            const sn = Math.sin(t);
            pts.push([Mx + cs * hx + sn * k * nx, My + cs * hy + sn * k * ny]);
        }
        const segments: Array<[number, number, number, number]> = [];
        for (let i = 1; i < pts.length; i += 1) segments.push([pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1]]);
        segments.push([pts[pts.length - 1]![0], pts[pts.length - 1]![1], pts[0]![0], pts[0]![1]]); // close along the chord
        return { segments, fill: pts };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.anchors.length === 0) return null;
        const ps = this.anchors.map((a) => a.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    schema(): SettingsSchema {
        if (this.tv) return this.tvShapeSchema();
        return { fields: [...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })), ...FILL_FIELDS, ...TEXT_FIELDS] };
    }
}
