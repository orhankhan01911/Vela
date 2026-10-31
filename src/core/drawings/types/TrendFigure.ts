import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

/** TradingView's text positions for its trend figures (module 57137): over the upper line, inside, under the lower. */
const TV_FIGURE_TEXT_V = [{ value: 'top', label: 'Top' }, { value: 'center', label: 'Inside' }, { value: 'bottom', label: 'Bottom' }];

/** A trend figure's two lines in pixels, over the same bars and extended to the pane edges as set, plus the drawn
 *  (unextended) ends: p1, p2, then the second line's ends at p2's bar (c) and p1's bar (p), TradingView's handles. */
export interface FigureLines {
    line1: [number, number, number, number];
    line2: [number, number, number, number];
    p1: [number, number];
    p2: [number, number];
    c: [number, number];
    p: [number, number];
}

/**
 * TradingView's three-point trend figures, flat top/bottom and disjoint channel (modules 293769, 817798; dialog 57137):
 * the line p1→p2 and a second line over the same bars whose prices the figure gives, a fill between them, both lines
 * extended and arrowed alike, and each end's price on request. A new one takes this look; one saved before keeps its
 * own (the subclass draws it).
 */
export abstract class TrendFigure extends SegmentDrawing {
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

    /** The second line's prices at p2's bar and at p1's bar (null until the third point is placed). */
    protected abstract secondLine(): { atP2: number; atP1: number } | null;

    /** Every end's price: p1, p2, then the second line at p2's bar and at p1's bar. */
    figurePrices(): [number, number, number, number] | null {
        const [a, b] = this.anchors;
        const s = this.secondLine();
        return a && b && s ? [a.price, b.price, s.atP2, s.atP1] : null;
    }

    /** TradingView's text on a TradingView-look one only. */
    override textDefaults(): ReturnType<SegmentDrawing['textDefaults']> {
        return this.tv ? super.textDefaults() : undefined;
    }

    figureLines(proj: Projector): FigureLines | null {
        const [a, b] = this.anchors;
        const s = this.secondLine();
        if (!a || !b || !s) return null;
        const xa = proj.xOf(a.time);
        const xb = proj.xOf(b.time);
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        const yc = proj.yOf(s.atP2, this.paneId);
        const yp = proj.yOf(s.atP1, this.paneId);
        if (ya == null || yb == null || yc == null || yp == null) return null;
        const extL = this.extendLeft ? 0 : Math.min(xa, xb);
        const extR = this.extendRight ? Math.max(xa, xb, proj.width) : Math.max(xa, xb);
        const at = (y1: number, y2: number, x: number): number => (xb === xa ? y1 : y1 + ((y2 - y1) * (x - xa)) / (xb - xa));
        const lx = xa <= xb ? extL : extR;
        const rx = xa <= xb ? extR : extL;
        return {
            line1: [lx, at(ya, yb, lx), rx, at(ya, yb, rx)],
            line2: [lx, at(yp, yc, lx), rx, at(yp, yc, rx)],
            p1: [xa, ya],
            p2: [xb, yb],
            c: [xb, yc],
            p: [xa, yp],
        };
    }

    /** TradingView's handles: p1, p2, then the second line's ends at p2's and p1's bars. */
    protected tvHandlePoints(proj: Projector): Array<[number, number]> | null {
        const L = this.figureLines(proj);
        return L ? [L.p1, L.p2, L.c, L.p] : null;
    }

    /** The lines and fill (only p1→p2 while the third point is being placed). */
    protected tvGeometry(proj: Projector): SegmentGeometry | null {
        const L = this.figureLines(proj);
        if (!L) {
            const [a, b] = this.anchors;
            if (!a || !b) return null;
            const ya = proj.yOf(a.price, this.paneId);
            const yb = proj.yOf(b.price, this.paneId);
            return ya == null || yb == null ? null : { segments: [[proj.xOf(a.time), ya, proj.xOf(b.time), yb]], fill: null };
        }
        const fill: Array<[number, number]> | null = this.fillBackground !== false ? [[L.line1[0], L.line1[1]], [L.line1[2], L.line1[3]], [L.line2[2], L.line2[3]], [L.line2[0], L.line2[1]]] : null;
        return { segments: [L.line1, L.line2], fill };
    }

    /** An extended side reaches the pane edge, so it stays drawn however far the points scroll off. */
    protected tvTimeExtent(): { min: number; max: number } | null {
        const [a, b] = this.anchors;
        if (!a || !b) return null;
        return {
            min: this.extendLeft ? Number.NEGATIVE_INFINITY : Math.min(a.time, b.time),
            max: this.extendRight ? Number.POSITIVE_INFINITY : Math.max(a.time, b.time),
        };
    }

    protected tvPriceRange(): { min: number; max: number } | null {
        const ps = this.figurePrices() ?? this.anchors.slice(0, 2).map((p) => p.price);
        return ps.length ? { min: Math.min(...ps), max: Math.max(...ps) } : null;
    }

    protected tvSchema(): SettingsSchema {
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
                { path: 'text.vAlign', label: 'Text vertical position', kind: 'select', options: TV_FIGURE_TEXT_V, group: 'text' },
                { path: 'text.hAlign', label: 'Text horizontal position', kind: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], group: 'text' },
            ],
        };
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
