import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS } from '../schema';
import { MeasureBox } from './MeasureBox';
import { RANGE_PARTS, type RangePart } from './rangeInfo';

const PARTS = RANGE_PARTS.filter((p) => p.key === 'priceRange' || p.key === 'percent' || p.key === 'pips');

/**
 * TradingView's price range: two price lines across the box (extendable, the fill with them), a 15 % fill, an arrow up
 * the middle the way price moved and a dark plate past its end with the price change, percent and change in pips.
 * The custom text sits in the middle of the box, over the arrow. A price range saved before this (no `tv`) keeps the
 * old measure box look.
 */
export class PriceRange extends MeasureBox {
    readonly type = 'pricerange' as const;
    extendLeft!: boolean;
    extendRight!: boolean;

    constructor(init: ConstructorParameters<typeof MeasureBox>[0]) {
        super({ ...init, props: { showDate: false, ...(init.props ?? {}) } });
        if (!init.props) this.tv = true;
        if (this.extendLeft === undefined) this.extendLeft = false;
        if (this.extendRight === undefined) this.extendRight = false;
    }

    override rangeParts(): ReadonlyArray<{ key: RangePart; label: string }> {
        return PARTS;
    }

    /** TradingView's: no alignment for the text (it sits in the middle of the box). */
    override schema(): SettingsSchema {
        if (!this.tv) return super.schema();
        return { fields: [...LINE_FIELDS, { path: 'style.fillColor', label: 'Background', kind: 'color', group: 'fill' }, ...TEXT_FIELDS] };
    }

    protected override writeProps(): Record<string, unknown> {
        const base = super.writeProps();
        return this.tv ? { ...base, extendLeft: this.extendLeft, extendRight: this.extendRight } : base;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (typeof props.extendLeft === 'boolean') this.extendLeft = props.extendLeft;
        if (typeof props.extendRight === 'boolean') this.extendRight = props.extendRight;
    }
}
