import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

/**
 * A parallel channel: a baseline through p1→p2 plus a second line parallel to it.
 * The offset is a constant PRICE delta measured at the baseline MIDPOINT (so it's
 * scale-aware AND the third handle always sits on the channel — only the 3rd
 * anchor's price matters, never its time, which keeps the handle from drifting off
 * to one side after editing). The offset handle is rendered at that midpoint.
 * Like TradingView's it shows a dashed middle line (off with `middleLine`) and can extend left / right to the
 * pane edge.
 */
export class ParallelChannel extends SegmentDrawing {
    readonly type = 'parallelchannel' as const;
    // `!` (no initializer): the base constructor runs readProps first. middleLine absent ⇒ shown (TradingView).
    middleLine!: boolean;
    extendLeft!: boolean;
    extendRight!: boolean;

    protected override writeProps(): Record<string, unknown> {
        return { middleLine: this.middleLine !== false, extendLeft: !!this.extendLeft, extendRight: !!this.extendRight };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.middleLine === 'boolean') this.middleLine = props.middleLine;
        if (typeof props.extendLeft === 'boolean') this.extendLeft = props.extendLeft;
        if (typeof props.extendRight === 'boolean') this.extendRight = props.extendRight;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return {
            min: 3,
            max: 3,
            slots: [
                { role: 'p1', free: 'both' },
                { role: 'p2', free: 'both' },
                { role: 'offset', free: 'y' }, // width only — drag the midpoint handle vertically
            ],
        };
    }

    /** Price delta of the parallel line from the baseline, measured at the midpoint. */
    private offset(): number {
        const a = this.anchors[0];
        const b = this.anchors[1];
        const c = this.anchors[2];
        if (!a || !b || !c) return 0;
        return c.price - (a.price + b.price) / 2; // baseline price at the midpoint time
    }

    /** Handles: the two baseline ends + the offset handle ON the parallel line at the midpoint. */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return [];
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        if (ya == null || yb == null) return [];
        const pts: Array<[number, number]> = [
            [proj.xOf(a.time), ya],
            [proj.xOf(b.time), yb],
        ];
        const c = this.anchors[2];
        if (c) {
            const yc = proj.yOf(c.price, this.paneId); // c.price IS the parallel-line price at the midpoint
            if (yc != null) pts.push([proj.xOf((a.time + b.time) / 2), yc]);
        }
        return pts;
    }

    /** The channel spans the baseline's time only (the offset anchor's time is ignored); an extended side has no end. */
    override timeExtent(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return {
            min: this.extendLeft ? Number.NEGATIVE_INFINITY : Math.min(a.time, b.time),
            max: this.extendRight ? Number.POSITIVE_INFINITY : Math.max(a.time, b.time),
        };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const d = this.offset();
        let xa = proj.xOf(a.time);
        let xb = proj.xOf(b.time);
        let ya = proj.yOf(a.price, this.paneId);
        let yb = proj.yOf(b.price, this.paneId);
        const ya2r = proj.yOf(a.price + d, this.paneId);
        const yb2r = proj.yOf(b.price + d, this.paneId);
        if (ya == null || yb == null || ya2r == null || yb2r == null) return null;
        // Pixel gap between the lines at each end (constant price offset → same gap after extending).
        let gapA = ya2r - ya;
        let gapB = yb2r - yb;
        if (xa > xb) [xa, ya, gapA, xb, yb, gapB] = [xb, yb, gapB, xa, ya, gapA]; // left end first
        if (Math.abs(xb - xa) > 1e-6 && (this.extendLeft || this.extendRight)) {
            const slope = (yb - ya) / (xb - xa);
            const gapSlope = (gapB - gapA) / (xb - xa);
            if (this.extendLeft) { ya += (0 - xa) * slope; gapA += (0 - xa) * gapSlope; xa = 0; }
            if (this.extendRight) { yb += (proj.width - xb) * slope; gapB += (proj.width - xb) * gapSlope; xb = proj.width; }
        }
        const ya2 = ya + gapA;
        const yb2 = yb + gapB;
        return {
            segments: [
                [xa, ya, xb, yb],
                [xa, ya2, xb, yb2],
            ],
            fill: [
                [xa, ya],
                [xb, yb],
                [xb, yb2],
                [xa, ya2],
            ],
            ...(this.middleLine !== false ? { dashed: [[xa, ya + gapA / 2, xb, yb + gapB / 2] as [number, number, number, number]] } : {}),
        };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const d = this.offset();
        const prices = [a.price, b.price, a.price + d, b.price + d];
        const c = this.anchors[2];
        if (c) prices.push(c.price);
        return { min: Math.min(...prices), max: Math.max(...prices) };
    }

    schema(): SettingsSchema {
        return {
            fields: [
                ...LINE_FIELDS,
                ...FILL_FIELDS,
                { path: 'middleLine', label: 'Middle line', kind: 'boolean', group: 'behavior' },
                { path: 'extendLeft', label: 'Extend left', kind: 'boolean', group: 'behavior' },
                { path: 'extendRight', label: 'Extend right', kind: 'boolean', group: 'behavior' },
                ...TEXT_FIELDS,
            ],
        };
    }
}
