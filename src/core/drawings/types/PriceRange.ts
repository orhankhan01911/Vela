import { MeasureBox } from './MeasureBox';

/** TradingView's price range: the measure box reading only the price change (and percent) between its two points. */
export class PriceRange extends MeasureBox {
    readonly type = 'pricerange' as const;

    constructor(init: ConstructorParameters<typeof MeasureBox>[0]) {
        super({ ...init, props: { showDate: false, ...(init.props ?? {}) } });
    }
}
