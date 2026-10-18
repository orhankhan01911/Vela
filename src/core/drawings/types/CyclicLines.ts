import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

/** Most lines one cycle tool draws (a tiny period on a wide pane would otherwise mean thousands). */
export const MAX_CYCLES = 400;

/** TradingView's cyclic lines: vertical lines every (second − first point) in time, from the first point to the
 *  right edge of the pane. */
export class CyclicLines extends SegmentDrawing {
    readonly type = 'cycliclines' as const;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'start', free: 'both' }, { role: 'period', free: 'both' }] };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const x0 = proj.xOf(a.time);
        const step = Math.abs(proj.xOf(b.time) - x0);
        const segments: Array<[number, number, number, number]> = [];
        if (step < 2) return { segments: [[x0, 0, x0, proj.height]], fill: null };
        for (let i = 0, x = x0; i < MAX_CYCLES && x <= proj.width; i += 1, x += step) if (x >= 0) segments.push([x, 0, x, proj.height]);
        return { segments, fill: null };
    }

    priceRange(): { min: number; max: number } | null {
        return null; // vertical lines don't constrain the price axis
    }

    override timeExtent(): { min: number; max: number } | null {
        const a = this.anchors[0];
        return a ? { min: a.time, max: Number.POSITIVE_INFINITY } : null;
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS] };
    }
}
