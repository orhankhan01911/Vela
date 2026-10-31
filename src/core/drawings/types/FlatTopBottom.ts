import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';
import { timeBetween } from '../futureAnchors';

/** TradingView's flat top/bottom text positions (module 57137): over the upper line, inside, under the lower one. */
const TV_FLAT_TEXT_V = [{ value: 'top', label: 'Top' }, { value: 'center', label: 'Inside' }, { value: 'bottom', label: 'Bottom' }];

/** A flat top/bottom's lines in pixels: the sloped line p1→p2 and the flat one under / over it, both over the same
 *  bars, each extended to the pane edges as set. */
export interface FlatLines {
    sloped: [number, number, number, number];
    flat: [number, number, number, number];
    /** The drawn (unextended) ends: p1, p2, then the flat line's ends under p2 and p1 (TradingView's handles). */
    p1: [number, number];
    p2: [number, number];
    c: [number, number];
    p: [number, number];
}

/**
 * A flat top/bottom channel: a sloped baseline p1→p2 plus a FLAT (horizontal) side at a constant
 * price (p3's price). Only p3's price is used — its time is ignored, and the flat side always spans
 * the baseline's time range. Optional fill between the two sides.
 */
export class FlatTopBottom extends SegmentDrawing {
    readonly type = 'flattopbottom' as const;
    /** TradingView's flat top/bottom (module 293769): a new one; one saved before keeps its look. */
    declare tv?: boolean;
    declare extendLeft?: boolean;
    declare extendRight?: boolean;
    /** TradingView's Background switch (the colour is style.fillColor). */
    declare fillBackground?: boolean;
    /** TradingView's Prices: each end's price beside it, in this colour, size and weight. */
    declare showPrices?: boolean;
    declare priceColor?: string;
    declare priceSize?: number;
    declare priceBold?: boolean;
    declare priceItalic?: boolean;

    constructor(init: ConstructorParameters<typeof SegmentDrawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.extendLeft = false;
            this.extendRight = false;
            this.fillBackground = true;
            this.showPrices = false;
            this.priceColor = this.style.lineColor;
            this.priceSize = 12;
            this.priceBold = false;
            this.priceItalic = false;
        }
    }

    /** TradingView's text (orange, 14 px, left, over the upper line) on a TradingView-look one only. */
    override textDefaults(): ReturnType<SegmentDrawing['textDefaults']> {
        return this.tv ? super.textDefaults() : undefined;
    }

    /** TradingView's lines: p1→p2 and the flat line at p3's price over the same bars (null until p3 is placed). */
    flatLines(proj: Projector): FlatLines | null {
        const [a, b, f] = this.anchors;
        if (!a || !b || !f) return null;
        const xa = proj.xOf(a.time);
        const xb = proj.xOf(b.time);
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        const yf = proj.yOf(f.price, this.paneId);
        if (ya == null || yb == null || yf == null) return null;
        // The extended ends reach the pane edges on the side(s) set; the flat line extends with the sloped one.
        const left = Math.min(xa, xb);
        const right = Math.max(xa, xb);
        const extL = this.extendLeft ? 0 : left;
        const extR = this.extendRight ? Math.max(right, proj.width) : right;
        const yAt = (x: number): number => (xb === xa ? ya : ya + ((yb - ya) * (x - xa)) / (xb - xa));
        const lx = xa <= xb ? extL : extR;
        const rx = xa <= xb ? extR : extL;
        return {
            sloped: [lx, yAt(lx), rx, yAt(rx)],
            flat: [lx, yf, rx, yf],
            p1: [xa, ya],
            p2: [xb, yb],
            c: [xb, yf],
            p: [xa, yf],
        };
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
        const L = this.tv ? this.flatLines(proj) : null;
        if (L) return [L.p1, L.p2, L.c, L.p];
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
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return {
            min: this.tv && this.extendLeft ? Number.NEGATIVE_INFINITY : Math.min(a.time, b.time),
            max: this.tv && this.extendRight ? Number.POSITIVE_INFINITY : Math.max(a.time, b.time),
        };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const L = this.tv ? this.flatLines(proj) : null;
        if (L) {
            const fill: Array<[number, number]> | null = this.fillBackground !== false ? [[L.sloped[0], L.sloped[1]], [L.sloped[2], L.sloped[3]], [L.flat[2], L.flat[3]], [L.flat[0], L.flat[1]]] : null;
            return { segments: [L.sloped, L.flat], fill };
        }
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
        if (this.tv)
            return {
                fields: [
                    ...LINE_FIELDS,
                    { path: 'style.arrowLeft', label: 'Left end arrow', kind: 'boolean', group: 'line' },
                    { path: 'style.arrowRight', label: 'Right end arrow', kind: 'boolean', group: 'line' },
                    { path: 'extendLeft', label: 'Extend left', kind: 'boolean', group: 'behavior' },
                    { path: 'extendRight', label: 'Extend right', kind: 'boolean', group: 'behavior' },
                    ...FILL_FIELDS,
                    { path: 'fillBackground', label: 'Background', kind: 'boolean', group: 'fill' },
                    ...TEXT_FIELDS,
                    { path: 'text.vAlign', label: 'Text vertical position', kind: 'select', options: TV_FLAT_TEXT_V, group: 'text' },
                    { path: 'text.hAlign', label: 'Text horizontal position', kind: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], group: 'text' },
                ],
            };
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        if (!this.tv) return undefined;
        return {
            tv: true,
            extendLeft: this.extendLeft === true,
            extendRight: this.extendRight === true,
            fillBackground: this.fillBackground !== false,
            showPrices: this.showPrices === true,
            priceColor: this.priceColor,
            priceSize: this.priceSize,
            priceBold: this.priceBold === true,
            priceItalic: this.priceItalic === true,
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        this.tv = true;
        for (const k of ['extendLeft', 'extendRight', 'fillBackground', 'showPrices', 'priceBold', 'priceItalic'] as const) if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        if (typeof props.priceColor === 'string') this.priceColor = props.priceColor;
        if (typeof props.priceSize === 'number' && Number.isFinite(props.priceSize)) this.priceSize = Math.min(48, Math.max(6, props.priceSize));
    }
}
