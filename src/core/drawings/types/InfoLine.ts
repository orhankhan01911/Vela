import { TrendLine } from './TrendLine';

/**
 * TradingView's info line: its trend line with every stat on (price range, percent, pips, bars, time, distance,
 * angle), always shown, the box at the middle of the line. Same settings as the trend line (line ends, Extend,
 * Middle point, Price labels); the stats defaults come from `statsOf` (ALL_STATS for this type).
 */
export class InfoLine extends TrendLine {
    override readonly type = 'infoline' as const;
}
