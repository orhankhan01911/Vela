import { TrendLine } from './TrendLine';

/**
 * An extended line, TradingView's (module 637561): its trend line with "Extend left line" and "Extend right line" on,
 * so it has the trend line's settings (line ends, Extend, Middle point, Price labels, stats, text). One saved before
 * (no extend settings) keeps extending both ways.
 */
export class ExtendedLine extends TrendLine {
    override readonly type = 'extendedline' as const;

    constructor(init: ConstructorParameters<typeof TrendLine>[0]) {
        super(init);
        if (typeof init.props?.extendLeft !== 'boolean') this.extendLeft = true;
        if (typeof init.props?.extendRight !== 'boolean') this.extendRight = true;
    }
}
