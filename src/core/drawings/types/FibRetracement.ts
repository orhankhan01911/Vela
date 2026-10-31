import { FibLevels } from './FibLevels';
import type { FibLevel } from './FibRatios';
import { fibLevels } from '../levelPalette';

/**
 * Standard retracement ratios (0 → 1) on, plus TradingView's extension and negative levels off
 * (a tick in the Levels dialog turns one on), so a new drawing offers the same 25 rows as TradingView.
 */
const EXTRA = [1.272, 1.414, 1.618, 2, 2.272, 2.414, 2.618, 3, 3.272, 3.414, 3.618, 4, 4.236, -0.236, -0.382, -0.618, -1, -1.618];
const LEVELS = fibLevels([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, ...EXTRA.map((ratio) => ({ ratio, enabled: false }))]);

// TradingView's factory colours (module 984358 with its colour names from module 872966).
const TV_GRAY = '#808080'; // palette-exempt: TradingView's cold-gray-500
const TV_RED = '#F23645'; // palette-exempt: TradingView's ripe-red-500
const TV_ORANGE = '#FF9800'; // palette-exempt: TradingView's tan-orange-500
const TV_GREEN = '#4caf50'; // palette-exempt: TradingView's iguana-green-500
const TV_TEAL = '#089981'; // palette-exempt: TradingView's minty-green-500
const TV_CYAN = '#00bcd4'; // palette-exempt: TradingView's sky-blue-500
const TV_BLUE = '#2962FF'; // palette-exempt: TradingView's tv-blue-500
const TV_PURPLE = '#9c27b0'; // palette-exempt: TradingView's grapes-purple-500
const TV_PINK = '#e91e63'; // palette-exempt: TradingView's berry-pink-500

/** TradingView's 24 levels in its order (level1 .. level24): ratio, colour, shown. The dialog lists them two per row. */
export const TV_FIB_RETRACEMENT_LEVELS: readonly FibLevel[] = (
    [
        [0, TV_GRAY, true], [0.236, TV_RED, true], [0.382, TV_ORANGE, true], [0.5, TV_GREEN, true],
        [0.618, TV_TEAL, true], [0.786, TV_CYAN, true], [1, TV_GRAY, true], [1.618, TV_BLUE, true],
        [2.618, TV_RED, true], [3.618, TV_PURPLE, true], [4.236, TV_PINK, true], [1.272, TV_ORANGE, false],
        [1.414, TV_RED, false], [2.272, TV_ORANGE, false], [2.414, TV_GREEN, false], [2, TV_TEAL, false],
        [3, TV_CYAN, false], [3.272, TV_GRAY, false], [3.414, TV_BLUE, false], [4, TV_RED, false],
        [4.272, TV_PURPLE, false], [4.414, TV_PINK, false], [4.618, TV_ORANGE, false], [4.764, TV_TEAL, false],
    ] as const
).map(([ratio, color, enabled]) => ({ ratio, color, enabled }));

/** TradingView's trend line colour (its dashed swing line). */
export const TV_FIB_TREND_COLOR = TV_GRAY;

/**
 * TradingView's factory look for its 24-level Fib tools (retracement 984358, trend-based extension 268335, the same
 * defaults): 24 levels, a dashed grey 2 px trend line, 2 px solid level lines, background at 80 % transparency,
 * coefficient + price labels on the left, middle, 12 px, level texts centered on their lines.
 */
export function applyTvFibLook(d: FibLevels): void {
    d.tv = true;
    d.levels = TV_FIB_RETRACEMENT_LEVELS.map((l) => ({ ...l }));
    d.trendline = true;
    d.trendColor = TV_FIB_TREND_COLOR;
    d.trendWidth = 2;
    d.trendStyle = 'dashed';
    d.style = { ...d.style, lineWidth: 2, lineStyle: 'solid' };
    d.background = true;
    d.fillOpacity = 0.2;
    d.showLevels = true;
    d.levelsAsPercent = false;
    d.showPrices = true;
    d.labelH = 'left';
    d.labelV = 'middle';
    d.showText = true;
    d.textH = 'center';
    d.textV = 'middle';
    d.fontSize = 12;
    d.logScale = false;
}

/**
 * Fibonacci retracement: horizontal levels between two swing anchors. Level 0 sits on the
 * second anchor and level 1 on the first, so the levels measure the pullback from the
 * point just placed; `reverse` puts level 0 on the first anchor instead.
 */
export class FibRetracement extends FibLevels {
    readonly type = 'fibretracement' as const;

    /** Level 0 on the first anchor (the layout drawings had before the default flipped). */
    declare reverse: boolean;

    constructor(init: ConstructorParameters<typeof FibLevels>[0]) {
        super(init);
        if (this.reverse === undefined) this.reverse = false;
        // A new retracement is TradingView's (module 984358 factory defaults).
        if (!init.props) applyTvFibLook(this);
    }

    defaultLevels(): readonly FibLevel[] {
        return LEVELS;
    }

    protected override levelPrice(ratio: number, p1: number, p2: number): number {
        return this.reverse ? p1 + ratio * (p2 - p1) : p2 + ratio * (p1 - p2);
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), reverse: this.reverse };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        // A document saved before the flag existed was laid out with level 0 on the first
        // anchor; keep it that way instead of letting it jump to the new default.
        this.reverse = typeof props.reverse === 'boolean' ? props.reverse : true;
    }
}
