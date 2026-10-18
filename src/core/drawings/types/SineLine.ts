import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

/** TradingView's sine line: a wave whose crest is one point and the next trough the other (half a period apart),
 *  drawn across the whole pane. */
export class SineLine extends SegmentDrawing {
    readonly type = 'sineline' as const;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'crest', free: 'both' }, { role: 'trough', free: 'both' }] };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const y1 = proj.yOf(a.price, this.paneId);
        const y2 = proj.yOf(b.price, this.paneId);
        if (y1 == null || y2 == null) return null;
        const x1 = proj.xOf(a.time);
        const half = Math.abs(proj.xOf(b.time) - x1);
        if (half < 2) return { segments: [[x1, y1, proj.xOf(b.time), y2]], fill: null };
        const mid = (y1 + y2) / 2;
        const amp = y1 - mid; // y = mid + amp·cos(π(x − x1)/half) passes both points
        const segments: Array<[number, number, number, number]> = [];
        const step = Math.max(2, Math.min(8, half / 16));
        let px = 0;
        let py = mid + amp * Math.cos((Math.PI * (0 - x1)) / half);
        for (let x = step; x <= proj.width + step; x += step) {
            const y = mid + amp * Math.cos((Math.PI * (x - x1)) / half);
            segments.push([px, py, x, y]);
            px = x;
            py = y;
        }
        return { segments, fill: null };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
    }

    override timeExtent(): { min: number; max: number } | null {
        return null; // runs across the whole pane
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS] };
    }
}
