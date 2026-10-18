import type { Projector } from '../geometry';
import { pointInBox } from '../hittest';
import { FibRatios, type FibEntryLine, type FibLevel } from './FibRatios';
import { fibLevels, LEVEL_ANCHOR } from '../levelPalette';

/** The Gann-box subdivisions, applied to BOTH the price (horizontal) and time (vertical) axes. */
const GANN_BOX_LEVELS = fibLevels([0, 0.25, 0.382, 0.5, 0.618, 0.75, 1].map((ratio) => ({ ratio, label: String(ratio) })));

/**
 * A Gann box — a price/time grid between two corners, with horizontal + vertical lines at the
 * Gann ratios plus the two diagonals. Each ratio is an editable level (color / enabled / label)
 * via the gear panel; rendered by the shared fib painter (each grid line is an entry line). Like TradingView's, the
 * price rows and time columns can be filled, and the price labels shown on the left / right, the time labels on the
 * top / bottom.
 */
export class GannBox extends FibRatios {
    readonly type = 'gannbox' as const;
    // `!` (no initializer): the base constructor runs readProps first; the constructor fills the defaults.
    fillPrice!: boolean;
    fillTime!: boolean;
    fillOpacity!: number;
    labelsLeft!: boolean;
    labelsRight!: boolean;
    labelsTop!: boolean;
    labelsBottom!: boolean;

    constructor(init: ConstructorParameters<typeof FibRatios>[0]) {
        super(init);
        if (this.fillPrice === undefined) this.fillPrice = false;
        if (this.fillTime === undefined) this.fillTime = false;
        if (this.fillOpacity === undefined) this.fillOpacity = 0.2;
        if (this.labelsLeft === undefined) this.labelsLeft = true;
        if (this.labelsRight === undefined) this.labelsRight = false;
        if (this.labelsTop === undefined) this.labelsTop = false;
        if (this.labelsBottom === undefined) this.labelsBottom = false;
    }

    protected override writeProps(): Record<string, unknown> {
        return {
            ...super.writeProps(),
            fillPrice: this.fillPrice,
            fillTime: this.fillTime,
            fillOpacity: this.fillOpacity,
            labelsLeft: this.labelsLeft,
            labelsRight: this.labelsRight,
            labelsTop: this.labelsTop,
            labelsBottom: this.labelsBottom,
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        for (const k of ['fillPrice', 'fillTime', 'labelsLeft', 'labelsRight', 'labelsTop', 'labelsBottom'] as const) {
            if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        }
        if (typeof props.fillOpacity === 'number') this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
    }

    /** Rows between neighbouring price levels and columns between neighbouring time levels, in the farther level's color. */
    override fillBands(proj: Projector): Array<{ color: string; x: number; y: number; w: number; h: number }> {
        const g = this.corners(proj);
        if (!g || (!this.fillPrice && !this.fillTime)) return [];
        const on = this.levels.filter((l) => l.enabled).sort((p, q) => p.ratio - q.ratio);
        const out: Array<{ color: string; x: number; y: number; w: number; h: number }> = [];
        for (let i = 1; i < on.length; i += 1) {
            const lo = on[i - 1]!;
            const hi = on[i]!;
            if (this.fillPrice) {
                const y1 = proj.yOf(g.c1.price + lo.ratio * (g.c2.price - g.c1.price), this.paneId);
                const y2 = proj.yOf(g.c1.price + hi.ratio * (g.c2.price - g.c1.price), this.paneId);
                if (y1 != null && y2 != null) out.push({ color: hi.color, x: g.left, y: Math.min(y1, y2), w: g.right - g.left, h: Math.abs(y2 - y1) });
            }
            if (this.fillTime) {
                const x1 = proj.xOf(g.c1.time + lo.ratio * (g.c2.time - g.c1.time));
                const x2 = proj.xOf(g.c1.time + hi.ratio * (g.c2.time - g.c1.time));
                out.push({ color: hi.color, x: Math.min(x1, x2), y: g.top, w: Math.abs(x2 - x1), h: g.bot - g.top });
            }
        }
        return out;
    }

    defaultLevels(): readonly FibLevel[] {
        return GANN_BOX_LEVELS;
    }

    // Placed click-move-click (the inherited 'click' mode): first click sets a corner, the second
    // sets the opposite one — matching the plain Rectangle tool.

    private corners(proj: Projector): { c1: { time: number; price: number }; c2: { time: number; price: number }; left: number; right: number; top: number; bot: number } | null {
        const c1 = this.anchors[0];
        const c2 = this.anchors[1];
        if (!c1 || !c2) return null;
        const xa = proj.xOf(c1.time);
        const xb = proj.xOf(c2.time);
        const ya = proj.yOf(c1.price, this.paneId);
        const yb = proj.yOf(c2.price, this.paneId);
        if (ya == null || yb == null) return null;
        return { c1, c2, left: Math.min(xa, xb), right: Math.max(xa, xb), top: Math.min(ya, yb), bot: Math.max(ya, yb) };
    }

    entryLines(proj: Projector): FibEntryLine[] | null {
        const g = this.corners(proj);
        if (!g) return null;
        const { c1, c2, left, right, top, bot } = g;
        const out: FibEntryLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const text = lv.label ?? String(lv.ratio);
            // horizontal (price) gridline — labelled at the left and / or right edge
            const py = proj.yOf(c1.price + lv.ratio * (c2.price - c1.price), this.paneId);
            if (py != null) {
                out.push({ color: lv.color, x1: left, y1: py, x2: right, y2: py, numberText: this.labelsLeft ? text : '', numberX: left - 5, numberY: py, numberAlign: 'right', labelX: left, labelY: py });
                if (this.labelsRight) out.push({ color: lv.color, x1: right, y1: py, x2: right, y2: py, numberText: text, numberX: right + 5, numberY: py, numberAlign: 'left', labelX: right, labelY: py });
            }
            // vertical (time) gridline — labelled above the top and / or under the bottom edge
            const vx = proj.xOf(c1.time + lv.ratio * (c2.time - c1.time));
            out.push({ color: lv.color, x1: vx, y1: top, x2: vx, y2: bot, numberText: this.labelsTop ? text : '', numberX: vx, numberY: top - 8, numberAlign: 'center', labelX: vx, labelY: top });
            if (this.labelsBottom) out.push({ color: lv.color, x1: vx, y1: bot, x2: vx, y2: bot, numberText: text, numberX: vx, numberY: bot + 8, numberAlign: 'center', labelX: vx, labelY: bot });
        }
        // the two diagonals (in the 1.0 level's color)
        const diag = this.levels.find((l) => l.ratio === 1)?.color ?? LEVEL_ANCHOR;
        out.push({ color: diag, x1: left, y1: top, x2: right, y2: bot, numberText: '', numberX: 0, numberY: 0, numberAlign: 'left', labelX: 0, labelY: 0 });
        out.push({ color: diag, x1: left, y1: bot, x2: right, y2: top, numberText: '', numberX: 0, numberY: 0, numberAlign: 'left', labelX: 0, labelY: 0 });
        return out;
    }

    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const g = this.corners(proj);
        return g != null && pointInBox(px, py, g.left, g.top, g.right, g.bot, tol); // grabbable anywhere inside
    }

    priceRange(): { min: number; max: number } | null {
        const c1 = this.anchors[0];
        const c2 = this.anchors[1];
        if (!c1 || !c2) return null;
        return { min: Math.min(c1.price, c2.price), max: Math.max(c1.price, c2.price) };
    }
}
