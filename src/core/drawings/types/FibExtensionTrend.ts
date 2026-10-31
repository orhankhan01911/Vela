import type { Projector } from '../geometry';
import type { AnchorSlot } from '../Drawing';
import type { FibEntryLine, FibLevel } from './FibRatios';
import { FibLevels, type FibLevelLine } from './FibLevels';
import { applyTvFibLook } from './FibRetracement';
import { fibLevels, LEVEL_PURPLE } from '../levelPalette';

/** Trend-based ratios: the move plus projections for price targets. */
const LEVELS = fibLevels([0, 0.382, 0.5, 0.618, 1, 1.618, { ratio: 2.618, color: LEVEL_PURPLE }]);

/**
 * Trend-based Fibonacci extension: three anchors A→B→C. Levels project the A–B price
 * move from the C anchor — `price = C.price + ratio·(B.price − A.price)`. Per-level config via the gear panel.
 *
 * A new one is TradingView's (module 268335): the retracement's 24 levels, look and dialog, the levels spanning B..C,
 * dashed trend lines A→B and B→C, Reverse projecting A−B instead. One saved before keeps its look (levels across all
 * three anchors, numbers above the lines, no fill).
 */
export class FibExtensionTrend extends FibLevels {
    readonly type = 'fibextensiontrend' as const;

    /** TradingView's Reverse: project A−B instead of B−A (TradingView-look drawings). */
    declare reverse?: boolean;

    constructor(init: ConstructorParameters<typeof FibLevels>[0]) {
        super(init);
        if (!init.props) {
            applyTvFibLook(this);
            this.reverse = false;
        }
    }

    override anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return {
            min: 3,
            max: 3,
            slots: [
                { role: 'a', free: 'both' },
                { role: 'b', free: 'both' },
                { role: 'c', free: 'both' },
            ],
        };
    }

    defaultLevels(): readonly FibLevel[] {
        return LEVELS;
    }

    private move(): number | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return this.tv && this.reverse ? a.price - b.price : b.price - a.price;
    }

    /** TradingView's levels: from C by the A–B move, spanning B..C (extended to the edges when set). */
    override levelLines(proj: Projector): FibLevelLine[] | null {
        const b = this.anchors[1];
        const c = this.anchors[2];
        const move = this.move();
        if (!b || !c || move == null) return null;
        const xb = proj.xOf(b.time);
        const xc = proj.xOf(c.time);
        const x1 = this.extendLeft ? 0 : Math.min(xb, xc);
        const x2 = this.extendRight ? proj.width : Math.max(xb, xc);
        const out: FibLevelLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const price = c.price + lv.ratio * move;
            const y = proj.yOf(price, this.paneId);
            if (y == null) continue;
            out.push({ ratio: lv.ratio, color: lv.color, label: lv.label, price, x1, x2, y });
        }
        return out;
    }

    override entryLines(proj: Projector): FibEntryLine[] | null {
        if (this.tv) return super.entryLines(proj);
        const a = this.anchors[0];
        const b = this.anchors[1];
        const c = this.anchors[2];
        if (!a || !b || !c) return null;
        const move = b.price - a.price;
        const xs = [proj.xOf(a.time), proj.xOf(b.time), proj.xOf(c.time)];
        const x1 = Math.min(...xs);
        const x2 = Math.max(...xs);
        const out: FibEntryLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const price = c.price + lv.ratio * move;
            const y = proj.yOf(price, this.paneId);
            if (y == null) continue;
            out.push({
                color: lv.color,
                label: lv.label,
                x1,
                y1: y,
                x2,
                y2: y,
                numberText: `${lv.ratio} (${price.toFixed(2)})`,
                numberX: x1 + 4,
                numberY: y - 7,
                numberAlign: 'left',
                labelX: (x1 + x2) / 2,
                labelY: y - 7,
            });
        }
        return out;
    }

    /** Bands only on TradingView-look drawings (saved ones never had a fill). */
    override fillBands(proj: Projector): Array<{ color: string; x: number; y: number; w: number; h: number }> {
        return this.tv ? super.fillBands(proj) : [];
    }

    override priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        const c = this.anchors[2];
        const move = this.move();
        if (!a || !b || !c || move == null) return null;
        const prices = this.levels.filter((l) => l.enabled).map((l) => c.price + l.ratio * move);
        prices.push(a.price, b.price, c.price);
        return { min: Math.min(...prices), max: Math.max(...prices) };
    }

    protected override writeProps(): Record<string, unknown> {
        const out = super.writeProps();
        if (this.tv) out.reverse = this.reverse === true;
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (typeof props.reverse === 'boolean') this.reverse = props.reverse;
    }
}
