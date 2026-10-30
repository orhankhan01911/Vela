import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS } from '../schema';
import { TV_LINE_COLOR } from '../style';
import { MeasureBox } from './MeasureBox';

/**
 * The Date & Price Range drawing. New ones are TradingView's (factory defaults read from its code 2026-10-30): a 15 %
 * fill, an arrow across the middle the way time ran and one up or down the way price moved (a head once it is 25 x
 * the line width long), no border (a 1 px blue one when switched on), and a dark plate past the second point with the
 * price change, bars and time, and volume. A box saved before keeps the old look and its `showPrice` / `showDate`.
 */
export class DatePriceRange extends MeasureBox {
    readonly type = 'datepricerange' as const;
    drawBorder!: boolean;
    borderColor!: string;
    borderWidth!: number;

    constructor(init: ConstructorParameters<typeof MeasureBox>[0]) {
        super(init);
        if (!init.props) this.tv = true;
        if (this.drawBorder === undefined) this.drawBorder = false;
        if (this.borderColor === undefined) this.borderColor = TV_LINE_COLOR;
        if (this.borderWidth === undefined) this.borderWidth = 1;
    }

    /** TradingView's: no alignment for the text (it sits in the middle of the box). */
    override schema(): SettingsSchema {
        if (!this.tv) return super.schema();
        return { fields: [...LINE_FIELDS, { path: 'style.fillColor', label: 'Background', kind: 'color', group: 'fill' }, ...TEXT_FIELDS] };
    }

    protected override writeProps(): Record<string, unknown> {
        const base = super.writeProps();
        return this.tv ? { ...base, drawBorder: this.drawBorder, borderColor: this.borderColor, borderWidth: this.borderWidth } : base;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (typeof props.drawBorder === 'boolean') this.drawBorder = props.drawBorder;
        if (typeof props.borderColor === 'string') this.borderColor = props.borderColor;
        if (typeof props.borderWidth === 'number' && props.borderWidth > 0) this.borderWidth = props.borderWidth;
    }
}
