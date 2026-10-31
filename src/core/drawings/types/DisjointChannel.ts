import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { TrendFigure } from './TrendFigure';

/**
 * A disjoint channel: two independent line segments (top p1→p2, bottom p3→p4) with
 * an optional fill between them. Unlike a parallel channel, the two lines need not
 * be parallel — every corner is free.
 *
 * A new one is TradingView's (module 817798): three points, the line p1→p2 and its mirror from p3 (at p2's bar) back
 * to p1's bar at p3 + (p2 − p1), minty green 2 px with the green at 20 % behind.
 */
export class DisjointChannel extends TrendFigure {
    readonly type = 'disjointchannel' as const;

    /** TradingView's mirror line: p3 at p2's bar, p3 + (p2 − p1) at p1's bar. */
    protected secondLine(): { atP2: number; atP1: number } | null {
        const [a, b, c] = this.anchors;
        return this.tv && a && b && c ? { atP2: c.price, atP1: c.price + (b.price - a.price) } : null;
    }

    /** TradingView's handle moves: p2 keeps the middle between itself and p3 (p3 mirrors it); the second line's end at
     *  p2's bar moves p3's price; its end at p1's bar moves p1's bar, and p1's price so that end follows the pointer. */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (!this.tv || index < 1) return false;
        const [a, b, c] = this.anchors;
        if (!a || !b || !c) return false;
        const pt = proj.pxToPoint(x, y, this.paneId);
        if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
        if (index === 1) this.anchors = [a, { ...b, time: pt.time, price: pt.price }, { ...c, price: b.price + c.price - pt.price }];
        else if (index === 2) this.anchors = [a, b, { ...c, price: pt.price }];
        else this.anchors = [{ ...a, time: pt.time, price: b.price + c.price - pt.price }, b, c];
        return true;
    }

    /** TradingView's second-line end at p2's bar moves up and down only. */
    override handleCursor(index: number): string | null {
        return this.tv && index === 2 ? 'ns-resize' : null;
    }

    override handlePoints(proj: Projector): Array<[number, number]> {
        return (this.tv ? this.tvHandlePoints(proj) : null) ?? super.handlePoints(proj);
    }

    override timeExtent(): { min: number; max: number } | null {
        return this.tv ? this.tvTimeExtent() : super.timeExtent();
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        if (this.tv) return { min: 3, max: 3, slots: [{ role: 'p1', free: 'both' }, { role: 'p2', free: 'both' }, { role: 'p3', free: 'y' }] };
        return {
            min: 4,
            max: 4,
            slots: [
                { role: 'top1', free: 'both' },
                { role: 'top2', free: 'both' },
                { role: 'bot1', free: 'both' },
                { role: 'bot2', free: 'both' },
            ],
        };
    }

    private seg(i: number, j: number, proj: Projector): [number, number, number, number] | null {
        const a = this.anchors[i];
        const b = this.anchors[j];
        if (!a || !b) return null;
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        if (ya == null || yb == null) return null;
        return [proj.xOf(a.time), ya, proj.xOf(b.time), yb];
    }

    geometry(proj: Projector): SegmentGeometry | null {
        if (this.tv) return this.tvGeometry(proj);
        const top = this.seg(0, 1, proj);
        const bot = this.seg(2, 3, proj);
        const segments = [top, bot].filter((s): s is [number, number, number, number] => s != null);
        if (segments.length === 0) return null;
        const fill: Array<[number, number]> | null =
            top && bot
                ? [
                      [top[0], top[1]],
                      [top[2], top[3]],
                      [bot[2], bot[3]],
                      [bot[0], bot[1]],
                  ]
                : null;
        return { segments, fill };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.tv) return this.tvPriceRange();
        if (this.anchors.length === 0) return null;
        const ps = this.anchors.map((a) => a.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    schema(): SettingsSchema {
        return this.tv ? this.tvSchema() : { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
    }
}
