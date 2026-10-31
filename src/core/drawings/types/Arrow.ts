import { TrendLine } from './TrendLine';

/**
 * An arrow, TradingView's (module 556973): its trend line with the right end an arrow (the registry's style turns
 * `arrowRight` on), so it has the trend line's settings (line ends, Extend, Middle point, Price labels, stats, text).
 */
export class Arrow extends TrendLine {
    override readonly type = 'arrow' as const;
}
