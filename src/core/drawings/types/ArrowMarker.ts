import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

/** TradingView's arrow marker: a filled arrow that widens from a point at the first anchor to its head at the
 *  second, with optional text at the tail. */
export class ArrowMarker extends SegmentDrawing {
    readonly type = 'arrowmarker' as const;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'tail', free: 'both' }, { role: 'head', free: 'both' }] };
    }

    geometry(proj: Projector): SegmentGeometry | null {
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

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })), ...FILL_FIELDS, ...TEXT_FIELDS] };
    }
}
