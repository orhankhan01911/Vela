import { TrendLine } from './TrendLine';

/**
 * A ray, TradingView's: a trend line extended past its second point to the pane edge. Like TradingView's it is the
 * trend line with "Extend right line" on by default, so it has the same settings (line ends, Extend, Middle point,
 * Price labels, stats); a saved ray without an extend setting keeps extending right.
 */
export class Ray extends TrendLine {
    override readonly type = 'ray' as const;

    constructor(init: ConstructorParameters<typeof TrendLine>[0]) {
        super(init);
        // Extended right unless the ray says otherwise (a new ray, or one saved before rays could switch it off).
        if (typeof init.props?.extendRight !== 'boolean') this.extendRight = true;
    }
}
