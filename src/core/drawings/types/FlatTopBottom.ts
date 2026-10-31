import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { TrendFigure } from './TrendFigure';
import { timeBetween } from '../futureAnchors';

/**
 * A flat top/bottom channel: a sloped baseline p1→p2 plus a FLAT (horizontal) side at a constant
 * price (p3's price). Only p3's price is used — its time is ignored, and the flat side always spans
 * the baseline's time range. Optional fill between the two sides.
 */
export class FlatTopBottom extends TrendFigure {
    readonly type = 'flattopbottom' as const;
    /** TradingView's flat line (module 293769): at p3's price under p1 and p2 alike. */
    protected secondLine(): { atP2: number; atP1: number } | null {
        const f = this.anchors[2];
        return f ? { atP2: f.price, atP1: f.price } : null;
    }

    /** TradingView's flat-line ends: under p2 it moves p2's bar and the flat price, under p1 p1's bar and the price. */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (!this.tv || index < 2) return false;
        const [a, b, f] = this.anchors;
        if (!a || !b || !f) return false;
        const pt = proj.pxToPoint(x, y, this.paneId);
        if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
        if (index === 2) this.anchors = [a, { ...b, time: pt.time }, { ...f, price: pt.price }];
        else this.anchors = [{ ...a, time: pt.time }, b, { ...f, price: pt.price }];
        return true;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return {
            min: 3,
            max: 3,
            slots: [
                { role: 'p1', free: 'both' },
                { role: 'p2', free: 'both' },
                { role: 'flat', free: 'y' }, // only the flat side's price matters
            ],
        };
    }

    /** Handles: the two baseline ends + the flat-side handle at the baseline midpoint. */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const tv = this.tv ? this.tvHandlePoints(proj) : null;
        if (tv) return tv;
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
            const yc = proj.yOf(c.price, this.paneId);
            if (yc != null) pts.push([proj.xOf(timeBetween(proj, a.time, b.time, 0.5)), yc]);
        }
        return pts;
    }

    /** The channel spans the baseline's time only (the flat anchor's time is ignored). */
    override timeExtent(): { min: number; max: number } | null {
        if (this.tv) return this.tvTimeExtent();
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return { min: Math.min(a.time, b.time), max: Math.max(a.time, b.time) };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        if (this.tv) return this.tvGeometry(proj);
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const xa = proj.xOf(a.time);
        const xb = proj.xOf(b.time);
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        if (ya == null || yb == null) return null;
        const c = this.anchors[2];
        if (!c) return { segments: [[xa, ya, xb, yb]], fill: null }; // baseline only (placing)
        const flatY = proj.yOf(c.price, this.paneId);
        if (flatY == null) return null;
        return {
            segments: [
                [xa, ya, xb, yb], // sloped side
                [xa, flatY, xb, flatY], // flat side (constant price)
            ],
            fill: [
                [xa, ya],
                [xb, yb],
                [xb, flatY],
                [xa, flatY],
            ],
        };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const prices = [a.price, b.price];
        const c = this.anchors[2];
        if (c) prices.push(c.price);
        return { min: Math.min(...prices), max: Math.max(...prices) };
    }

    schema(): SettingsSchema {
        return this.tv ? this.tvSchema() : { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
    }
}
