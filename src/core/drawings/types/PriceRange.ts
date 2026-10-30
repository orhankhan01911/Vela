import type { DrawingPoint } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS } from '../schema';
import { MeasureBox } from './MeasureBox';

/** TradingView's price range Stats parts, its order and names. */
export const PRICE_RANGE_PARTS: ReadonlyArray<{ key: 'priceRange' | 'percent' | 'pips'; label: string }> = [
    { key: 'priceRange', label: 'Price range' },
    { key: 'percent', label: 'Percent change' },
    { key: 'pips', label: 'Change in pips' },
];
export type PriceRangeInfo = Record<(typeof PRICE_RANGE_PARTS)[number]['key'], boolean>;

/** TradingView's label plate (factory defaults, read from TradingView 2026-10-30). */
export const PRICE_RANGE_LABEL = { color: '#ffffff', size: 12, background: '#1a1a1a' } as const; // palette-exempt: TradingView's plate

/**
 * TradingView's price range: two price lines across the box, a 15 % fill, an arrow up the middle the way price moved
 * and a dark plate past its end with the price change, percent and change in pips (each switchable). The lines can
 * extend left and right; the custom text sits in the middle of the box, over the arrow. A price range saved before
 * this (no `tv`) keeps the old measure box look.
 */
export class PriceRange extends MeasureBox {
    readonly type = 'pricerange' as const;
    /** TradingView's look; set on new price ranges. */
    tv?: boolean;
    fillBackground!: boolean;
    extendLeft!: boolean;
    extendRight!: boolean;
    info!: PriceRangeInfo;
    labelColor!: string;
    labelSize!: number;
    labelBackground!: boolean;
    labelBgColor!: string;

    constructor(init: ConstructorParameters<typeof MeasureBox>[0]) {
        super({ ...init, props: { showDate: false, ...(init.props ?? {}) } });
        if (!init.props) this.tv = true;
        if (this.fillBackground === undefined) this.fillBackground = true;
        if (this.extendLeft === undefined) this.extendLeft = false;
        if (this.extendRight === undefined) this.extendRight = false;
        if (!this.info) this.info = { priceRange: true, percent: true, pips: true };
        if (this.labelColor === undefined) this.labelColor = PRICE_RANGE_LABEL.color;
        if (this.labelSize === undefined) this.labelSize = PRICE_RANGE_LABEL.size;
        if (this.labelBackground === undefined) this.labelBackground = true;
        if (this.labelBgColor === undefined) this.labelBgColor = PRICE_RANGE_LABEL.background;
    }

    /** The plate's text, TradingView's: `1,219.8 (1.48%) 12,198`, a minus sign when price fell. `tick` is the price
     *  scale's step: the change keeps its decimals and the pips count it. */
    infoText(tick: number): string {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return '';
        return priceRangeText(this.info, a, b, tick);
    }

    /** TradingView's: no alignment for the text (it sits in the middle of the box). */
    override schema(): SettingsSchema {
        if (!this.tv) return super.schema();
        return {
            fields: [
                ...LINE_FIELDS,
                { path: 'style.fillColor', label: 'Background', kind: 'color', group: 'fill' },
                ...TEXT_FIELDS,
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> {
        const base = super.writeProps();
        if (!this.tv) return base;
        return {
            ...base,
            tv: true,
            fillBackground: this.fillBackground,
            extendLeft: this.extendLeft,
            extendRight: this.extendRight,
            info: { ...this.info },
            labelColor: this.labelColor,
            labelSize: this.labelSize,
            labelBackground: this.labelBackground,
            labelBgColor: this.labelBgColor,
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (props.tv === true) this.tv = true;
        for (const k of ['fillBackground', 'extendLeft', 'extendRight', 'labelBackground'] as const) if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        if (typeof props.labelColor === 'string') this.labelColor = props.labelColor;
        if (typeof props.labelBgColor === 'string') this.labelBgColor = props.labelBgColor;
        if (typeof props.labelSize === 'number' && props.labelSize > 0) this.labelSize = props.labelSize;
        if (props.info && typeof props.info === 'object') {
            const r = props.info as Record<string, unknown>;
            const info: PriceRangeInfo = this.info ? { ...this.info } : { priceRange: true, percent: true, pips: true };
            for (const p of PRICE_RANGE_PARTS) if (typeof r[p.key] === 'boolean') info[p.key] = r[p.key] as boolean;
            this.info = info;
        }
    }
}

/** `1,219.8 (1.48%) 12,198`: the parts that are on, TradingView's format (the change at the tick's decimals, a minus
 *  sign − when price fell, pips = change / tick). */
export function priceRangeText(info: PriceRangeInfo, a: DrawingPoint, b: DrawingPoint, tick: number): string {
    const diff = b.price - a.price;
    const t = tick > 0 ? tick : 0.01;
    const dp = Math.max(0, Math.min(10, Math.round(-Math.log10(t))));
    const sign = (v: number): string => (v < 0 ? '−' : '');
    const parts: string[] = [];
    if (info.priceRange) parts.push(`${sign(diff)}${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`);
    if (info.percent) {
        const pct = a.price !== 0 ? (diff / Math.abs(a.price)) * 100 : 0;
        const s = `${sign(pct)}${Math.abs(pct).toFixed(2)}%`;
        parts.push(info.priceRange ? `(${s})` : s);
    }
    if (info.pips) {
        const pips = Math.round(diff / t);
        parts.push(`${sign(pips)}${Math.abs(pips).toLocaleString('en-US')}`);
    }
    return parts.join(' ');
}
