import { MeasureBox } from './MeasureBox';

/** TradingView's date range: the measure box reading only the bars and time between its two points. */
export class DateRange extends MeasureBox {
    readonly type = 'daterange' as const;

    constructor(init: ConstructorParameters<typeof MeasureBox>[0]) {
        super({ ...init, props: { showPrice: false, ...(init.props ?? {}) } });
    }
}
