import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';
import { MAX_CYCLES } from './CyclicLines';

const ARC_STEPS = 32;

/** TradingView's time cycles: half circles one cycle (second − first point in time) wide standing on the first
 *  point's price, repeated both ways across the pane, filled. */
export class TimeCycles extends SegmentDrawing {
    readonly type = 'timecycles' as const;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'start', free: 'both' }, { role: 'period', free: 'both' }] };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const y0 = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        if (y0 == null || yb == null) return null;
        const x0 = proj.xOf(a.time);
        const d = Math.abs(proj.xOf(b.time) - x0);
        if (d < 2) return { segments: [[x0, y0, proj.xOf(b.time), yb]], fill: null };
        const r = d / 2;
        const up = yb <= y0 ? -1 : 1; // arcs on the side of the second point (above it by default)
        const first = Math.floor(-x0 / d) - 1;
        const segments: Array<[number, number, number, number]> = [];
        const fills: NonNullable<SegmentGeometry['fills']> = [];
        const color = this.style.fillColor || this.style.lineColor;
        for (let k = first, n = 0; n < MAX_CYCLES; k += 1, n += 1) {
            const left = x0 + k * d;
            if (left > proj.width) break;
            if (left + d < 0) continue;
            const pts: Array<[number, number]> = [];
            for (let i = 0; i <= ARC_STEPS; i += 1) {
                const t = Math.PI - (i / ARC_STEPS) * Math.PI;
                pts.push([left + r + r * Math.cos(t), y0 + up * r * Math.sin(t)]);
            }
            for (let i = 1; i < pts.length; i += 1) segments.push([pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1]]);
            fills.push({ color, pts });
        }
        return { segments, fill: null, fills, fillAlpha: this.style.fillColor ? 1 : 0.2 };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        return a ? { min: a.price, max: a.price } : null;
    }

    override timeExtent(): { min: number; max: number } | null {
        return null; // repeats across the whole pane
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS] };
    }
}
