import type { Projector } from '../geometry';
import { handleAt, pointInBox } from '../hittest';
import { FibRatios, type FibEntryLine, type FibLevel } from './FibRatios';
import { fibLevels, LEVEL_ANCHOR } from '../levelPalette';
import { timeBetween } from '../futureAnchors';

/** The Gann-box subdivisions, applied to BOTH the price (horizontal) and time (vertical) axes. */
const GANN_BOX_LEVELS = fibLevels([0, 0.25, 0.382, 0.5, 0.618, 0.75, 1].map((ratio) => ({ ratio, label: String(ratio) })));

const TV_GB_GRAY = '#808080'; // palette-exempt: TradingView's cold-gray-500 (levels 0 and 1)

/** TradingView's 7 Gann box levels (module 850509), the same for price and time: its coefficients and colours, all on. */
export const TV_GANN_BOX_LEVELS: readonly FibLevel[] = (
    [
        [0, TV_GB_GRAY],
        [0.25, '#FF9800'], // palette-exempt: TradingView's tan-orange-500
        [0.382, '#00BCD4'], // palette-exempt: TradingView's sky-blue-500
        [0.5, '#4CAF50'], // palette-exempt: TradingView's iguana-green-500
        [0.618, '#089981'], // palette-exempt: TradingView's minty-green-500
        [0.75, '#2962FF'], // palette-exempt: TradingView's tv-blue-500
        [1, TV_GB_GRAY],
    ] as const
).map(([ratio, color]) => ({ ratio, color, enabled: true }));

/** TradingView's Angles colour (cold-gray-400). */
export const TV_GANN_ANGLES = '#9C9C9C'; // palette-exempt: TradingView's cold-gray-400

/**
 * A Gann box — a price/time grid between two corners, with horizontal + vertical lines at the
 * Gann ratios plus the two diagonals. Each ratio is an editable level (color / enabled / label)
 * via the gear panel; rendered by the shared fib painter (each grid line is an entry line). Like TradingView's, the
 * price rows and time columns can be filled, and the price labels shown on the left / right, the time labels on the
 * top / bottom.
 *
 * A new one is TradingView's (module 850509): price levels (`levels`) and time levels (`timeLevels`) of their own, all
 * four labels, both backgrounds on at 80 % transparency (each its own), no diagonals but optional Angles (lines from
 * each corner to the level points on the opposite sides), Reverse (levels measured from the second point), and handles
 * on the other two corners.
 */
export class GannBox extends FibRatios {
    readonly type = 'gannbox' as const;
    /** TradingView's look (new drawings). */
    declare tv?: boolean;
    /** TradingView's time levels (the price levels are `levels`). */
    declare timeLevels?: FibLevel[];
    /** The time background's opacity (TradingView's own transparency for it); the price one is `fillOpacity`. */
    declare fillTimeOpacity?: number;
    /** TradingView's Angles: shown, and their colour. */
    declare angles?: boolean;
    declare anglesColor?: string;
    /** TradingView's Reverse: the levels count from the second point. */
    declare reverse?: boolean;
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
        if (!init.props) {
            this.tv = true;
            this.levels = TV_GANN_BOX_LEVELS.map((l) => ({ ...l }));
            this.timeLevels = TV_GANN_BOX_LEVELS.map((l) => ({ ...l }));
            this.style = { ...this.style, lineWidth: 2, lineStyle: 'solid' };
            this.fillPrice = true;
            this.fillTime = true;
            this.fillOpacity = 0.2;
            this.fillTimeOpacity = 0.2;
            this.labelsLeft = this.labelsRight = this.labelsTop = this.labelsBottom = true;
            this.angles = false;
            this.anglesColor = TV_GANN_ANGLES;
            this.reverse = false;
        }
    }

    /** The bar's colour sets every price and time level and the Angles (TradingView's collected line colours). */
    override applySettings(patch: Record<string, unknown>): void {
        super.applySettings(patch);
        const c = patch['style.lineColor'];
        if (this.tv && typeof c === 'string') {
            for (const l of this.levels) l.color = c;
            for (const l of this.timeLevels ?? []) l.color = c;
            this.anglesColor = c;
        }
    }

    protected override writeProps(): Record<string, unknown> {
        return {
            ...super.writeProps(),
            ...(this.tv
                ? {
                      tv: true,
                      timeLevels: (this.timeLevels ?? []).map((l) => ({ ...l })),
                      fillTimeOpacity: this.fillTimeOpacity,
                      angles: this.angles === true,
                      anglesColor: this.anglesColor,
                      reverse: this.reverse === true,
                  }
                : {}),
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
        if (props.tv === true) this.tv = true;
        if (Array.isArray(props.timeLevels)) {
            const parsed = props.timeLevels.filter((v): v is FibLevel => !!v && typeof (v as FibLevel).ratio === 'number' && typeof (v as FibLevel).color === 'string').map((v) => ({ ratio: v.ratio, color: v.color, enabled: v.enabled !== false }));
            if (parsed.length) this.timeLevels = parsed;
        }
        if (typeof props.fillTimeOpacity === 'number') this.fillTimeOpacity = Math.min(1, Math.max(0, props.fillTimeOpacity));
        if (typeof props.angles === 'boolean') this.angles = props.angles;
        if (typeof props.anglesColor === 'string') this.anglesColor = props.anglesColor;
        if (typeof props.reverse === 'boolean') this.reverse = props.reverse;
    }

    /** TradingView's frame: where the levels count from and how far, in price and time (Reverse: from the second point). */
    private tvFrame(proj: Projector): { left: number; right: number; top: number; bot: number; yAt: (r: number) => number | null; xAt: (r: number) => number } | null {
        const g = this.corners(proj);
        if (!g) return null;
        const [from, to] = this.reverse ? [g.c2, g.c1] : [g.c1, g.c2];
        return {
            ...g,
            yAt: (r) => proj.yOf(from.price + r * (to.price - from.price), this.paneId),
            xAt: (r) => proj.xOf(timeBetween(proj, from.time, to.time, r)),
        };
    }

    /** TradingView's price lines (left / right labels) and time lines (top / bottom labels), then the Angles. */
    private tvLines(proj: Projector): FibEntryLine[] | null {
        const f = this.tvFrame(proj);
        if (!f) return null;
        const out: FibEntryLine[] = [];
        const none = { numberText: '', numberX: 0, numberY: 0, numberAlign: 'left' as const, labelX: 0, labelY: 0 };
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const y = f.yAt(lv.ratio);
            if (y == null) continue;
            const text = String(lv.ratio);
            out.push({ color: lv.color, x1: f.left, y1: y, x2: f.right, y2: y, ...none, numberText: this.labelsLeft ? text : '', numberX: f.left - 5, numberY: y, numberAlign: 'right' });
            if (this.labelsRight) out.push({ color: lv.color, x1: f.right, y1: y, x2: f.right, y2: y, ...none, numberText: text, numberX: f.right + 5, numberY: y });
        }
        for (const lv of this.timeLevels ?? []) {
            if (!lv.enabled) continue;
            const x = f.xAt(lv.ratio);
            const text = String(lv.ratio);
            // Top: the text's bottom 3 px above the box; bottom: its top 5 px below (12 px text, centred on numberY).
            out.push({ color: lv.color, x1: x, y1: f.top, x2: x, y2: f.bot, ...none, numberText: this.labelsTop ? text : '', numberX: x, numberY: f.top - 9, numberAlign: 'center' });
            if (this.labelsBottom) out.push({ color: lv.color, x1: x, y1: f.bot, x2: x, y2: f.bot, ...none, numberText: text, numberX: x, numberY: f.bot + 11, numberAlign: 'center' });
        }
        if (this.angles) {
            // TradingView: from every corner to each price level's time point on the far side and each time level's
            // price point on the far side (every level, shown or not).
            const color = this.anglesColor || TV_GANN_ANGLES;
            const line = (x1: number, y1: number, x2: number, y2: number): void => {
                out.push({ color, x1, y1, x2, y2, ...none });
            };
            for (const lv of this.levels) {
                const x = f.xAt(lv.ratio);
                line(f.left, f.bot, x, f.top);
                line(f.right, f.bot, x, f.top);
                line(f.left, f.top, x, f.bot);
                line(f.right, f.top, x, f.bot);
            }
            for (const lv of this.timeLevels ?? []) {
                const y = f.yAt(lv.ratio);
                if (y == null) continue;
                line(f.left, f.bot, f.right, y);
                line(f.right, f.bot, f.left, y);
                line(f.left, f.top, f.right, y);
                line(f.right, f.top, f.left, y);
            }
        }
        return out;
    }

    /** The two corners, then TradingView's other two (the first point's time with the second's price, and back). */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const pts = super.handlePoints(proj);
        if (!this.tv || pts.length < 2) return pts;
        return [pts[0]!, pts[1]!, [pts[0]![0], pts[1]![1]], [pts[1]![0], pts[0]![1]]];
    }

    override hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    /** TradingView: the extra corners each take one point's time and the other's price. */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (!this.tv || index < 2) return false;
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return false;
        const pt = proj.pxToPoint(x, y, this.paneId);
        if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
        this.anchors = index === 2 ? [{ ...a, time: pt.time }, { ...b, price: pt.price }] : [{ ...a, price: pt.price }, { ...b, time: pt.time }];
        return true;
    }

    /** Rows between neighbouring price levels and columns between neighbouring time levels, in the farther level's color. */
    override fillBands(proj: Projector): Array<{ color: string; x: number; y: number; w: number; h: number; alpha?: number }> {
        if (this.tv) {
            // TradingView: bands between consecutive shown levels in their order, in the later level's colour.
            const f = this.tvFrame(proj);
            if (!f) return [];
            const out: Array<{ color: string; x: number; y: number; w: number; h: number; alpha?: number }> = [];
            if (this.fillPrice) {
                const ys = this.levels.filter((l) => l.enabled).map((l) => ({ c: l.color, y: f.yAt(l.ratio) })).filter((v): v is { c: string; y: number } => v.y != null);
                for (let i = 1; i < ys.length; i += 1) out.push({ color: ys[i]!.c, x: f.left, y: Math.min(ys[i - 1]!.y, ys[i]!.y), w: f.right - f.left, h: Math.abs(ys[i]!.y - ys[i - 1]!.y), alpha: this.fillOpacity });
            }
            if (this.fillTime) {
                const xs = (this.timeLevels ?? []).filter((l) => l.enabled).map((l) => ({ c: l.color, x: f.xAt(l.ratio) }));
                for (let i = 1; i < xs.length; i += 1) out.push({ color: xs[i]!.c, x: Math.min(xs[i - 1]!.x, xs[i]!.x), y: f.top, w: Math.abs(xs[i]!.x - xs[i - 1]!.x), h: f.bot - f.top, alpha: this.fillTimeOpacity ?? this.fillOpacity });
            }
            return out;
        }
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
                const x1 = proj.xOf(timeBetween(proj, g.c1.time, g.c2.time, lo.ratio));
                const x2 = proj.xOf(timeBetween(proj, g.c1.time, g.c2.time, hi.ratio));
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
        if (this.tv) return this.tvLines(proj);
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
            const vx = proj.xOf(timeBetween(proj, c1.time, c2.time, lv.ratio));
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
