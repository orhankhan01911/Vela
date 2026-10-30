import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS } from '../schema';
import { MeasureBox } from './MeasureBox';
import { RANGE_PARTS, type RangePart } from './rangeInfo';

const PARTS = RANGE_PARTS.filter((p) => p.key === 'bars' || p.key === 'dateTime' || p.key === 'volume');

/**
 * TradingView's date range (new ones; factory defaults read from its code 2026-10-30): two time lines down the box
 * (extendable to the top and bottom of the pane, the fill with them), a 15 % fill, an arrow across the middle the way
 * time ran (a head once 15 x the line width long) and a dark plate with the bars, time and volume. A date range saved
 * before this (no `tv`) keeps the old measure box look.
 */
export class DateRange extends MeasureBox {
    readonly type = 'daterange' as const;
    extendTop!: boolean;
    extendBottom!: boolean;

    constructor(init: ConstructorParameters<typeof MeasureBox>[0]) {
        super({ ...init, props: { showPrice: false, ...(init.props ?? {}) } });
        if (!init.props) this.tv = true;
        if (this.extendTop === undefined) this.extendTop = false;
        if (this.extendBottom === undefined) this.extendBottom = false;
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
        return this.tv ? { ...base, extendTop: this.extendTop, extendBottom: this.extendBottom } : base;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (typeof props.extendTop === 'boolean') this.extendTop = props.extendTop;
        if (typeof props.extendBottom === 'boolean') this.extendBottom = props.extendBottom;
    }
}
