import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

const SWEEP_STEPS = 48;

/** TradingView's projection: a filled sector around the first point, its radius the distance to the second point,
 *  swept from the second point's direction to the third's. */
export class Projection extends SegmentDrawing {
    readonly type = 'projection' as const;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 3, max: 3, slots: [{ role: 'center', free: 'both' }, { role: 'radius', free: 'both' }, { role: 'sweep', free: 'both' }] };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const pts = this.handlePoints(proj);
        if (pts.length < 2) return null;
        const [cx, cy] = pts[0]!;
        const [x2, y2] = pts[1]!;
        if (pts.length < 3) return { segments: [[cx, cy, x2, y2]], fill: null };
        const [x3, y3] = pts[2]!;
        const r = Math.hypot(x2 - cx, y2 - cy);
        const a0 = Math.atan2(y2 - cy, x2 - cx);
        let sweep = Math.atan2(y3 - cy, x3 - cx) - a0;
        if (sweep > Math.PI) sweep -= 2 * Math.PI; // the short way round
        if (sweep < -Math.PI) sweep += 2 * Math.PI;
        const poly: Array<[number, number]> = [[cx, cy]];
        for (let i = 0; i <= SWEEP_STEPS; i += 1) {
            const a = a0 + (sweep * i) / SWEEP_STEPS;
            poly.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        const segments: Array<[number, number, number, number]> = [];
        for (let i = 0; i < poly.length; i += 1) {
            const p = poly[i]!;
            const q = poly[(i + 1) % poly.length]!;
            segments.push([p[0], p[1], q[0], q[1]]);
        }
        return { segments, fill: poly };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.anchors.length === 0) return null;
        const ps = this.anchors.map((p) => p.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS] };
    }
}
