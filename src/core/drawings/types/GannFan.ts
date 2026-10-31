import type { Projector } from '../geometry';
import { extendRay } from '../hittest';
import { FibRatios, type FibEntryLine, type FibLevel } from './FibRatios';
import { fibLevels, LEVEL_AQUA, LEVEL_BLUE, LEVEL_CYAN, LEVEL_GREEN, LEVEL_ORANGE, LEVEL_PINK, LEVEL_RED, LEVEL_TEAL, LEVEL_UNITY } from '../levelPalette';

/**
 * The Gann angles: price-per-time ratios relative to the 1×1 (the line through the second
 * anchor). A ratio > 1 is steeper (more price per unit time), < 1 shallower.
 */
const GANN_FAN_LEVELS = fibLevels([
    { ratio: 0.125, color: LEVEL_RED, label: '1/8' },
    { ratio: 0.25, color: LEVEL_ORANGE, label: '1/4' },
    { ratio: 0.333, color: LEVEL_CYAN, label: '1/3' },
    { ratio: 0.5, color: LEVEL_GREEN, label: '1/2' },
    { ratio: 1, color: LEVEL_UNITY, label: '1/1' },
    { ratio: 2, color: LEVEL_TEAL, label: '2/1' },
    { ratio: 3, color: LEVEL_BLUE, label: '3/1' },
    { ratio: 4, color: LEVEL_AQUA, label: '4/1' },
    { ratio: 8, color: LEVEL_PINK, label: '8/1' },
]);

/** TradingView's 9 Gann fan levels (module 154448): time/price as c1/c2, all shown, 2 px solid, in its colours. */
export const TV_GANN_FAN_LEVELS: readonly FibLevel[] = (
    [
        [1, 8, '#FF9800'], // palette-exempt: TradingView's tan-orange-500
        [1, 4, '#089981'], // palette-exempt: TradingView's minty-green-500
        [1, 3, '#4CAF50'], // palette-exempt: TradingView's iguana-green-500
        [1, 2, '#089981'], // palette-exempt: TradingView's minty-green-500
        [1, 1, '#00BCD4'], // palette-exempt: TradingView's sky-blue-500
        [2, 1, '#2962FF'], // palette-exempt: TradingView's tv-blue-500
        [3, 1, '#9C27B0'], // palette-exempt: TradingView's grapes-purple-500
        [4, 1, '#E91E63'], // palette-exempt: TradingView's berry-pink-500
        [8, 1, '#F23645'], // palette-exempt: TradingView's ripe-red-500
    ] as const
).map(([c1, c2, color]) => ({ ratio: c1 / c2, label: `${c1}/${c2}`, color, enabled: true, lineWidth: 2, lineStyle: 'solid' as const }));

/** How far a ray is drawn (the canvas clips it). */
const FAR = 1e5;

/**
 * A Gann fan — rays from the first anchor at the Gann angles, scaled so the 1×1 passes
 * through the second anchor (which sets the price-per-time unit). Each angle is an editable
 * level (color / enabled / label) via the gear panel; rendered by the shared fib painter. Like TradingView's, the
 * wedges between neighbouring angles are filled (`background`, on by default) and the labels can be hidden.
 *
 * A new one is TradingView's (module 154448): a level c1/c2 is a ray from the first point through the box corner
 * (second point's time, first point's price + rise × c2/c1) when c1 > c2, else (first point's time + run × c1/c2, second
 * point's price): 1/8 the steepest, 8/1 the flattest. Its bands: the first three levels fill to the next shown ray, the
 * fifth to ninth to the previous one; each label sits at its ray's corner point.
 */
export class GannFan extends FibRatios {
    readonly type = 'gannfan' as const;
    /** TradingView's look (new drawings). */
    declare tv?: boolean;
    // `!` (no initializer): the base constructor runs readProps first; the constructor fills the defaults.
    background!: boolean;
    fillOpacity!: number;
    showLabels!: boolean;

    constructor(init: ConstructorParameters<typeof FibRatios>[0]) {
        super(init);
        if (this.background === undefined) this.background = true;
        if (this.fillOpacity === undefined) this.fillOpacity = 0.2;
        if (this.showLabels === undefined) this.showLabels = true;
        if (!init.props) {
            this.tv = true;
            this.levels = TV_GANN_FAN_LEVELS.map((l) => ({ ...l }));
            this.style = { ...this.style, lineWidth: 2, lineStyle: 'solid' };
            this.background = true;
            this.fillOpacity = 0.2;
            this.showLabels = true;
        }
    }

    /** The bar's colour and width set every level (TradingView's collected line colours and widths). */
    override applySettings(patch: Record<string, unknown>): void {
        super.applySettings(patch);
        if (!this.tv) return;
        const c = patch['style.lineColor'];
        if (typeof c === 'string') for (const l of this.levels) l.color = c;
        const w = patch['style.lineWidth'];
        if (typeof w === 'number') for (const l of this.levels) l.lineWidth = w;
    }

    /** TradingView's rays: each shown level's corner point and its far end, with the level's place in the list. */
    private tvRays(proj: Projector): { x0: number; y0: number; rays: Array<{ lv: FibLevel; index: number; px: number; py: number; fx: number; fy: number }> } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const y0 = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        if (y0 == null || yb == null) return null;
        const x0 = proj.xOf(a.time);
        const dx = proj.xOf(b.time) - x0;
        const dy = yb - y0;
        const rays: Array<{ lv: FibLevel; index: number; px: number; py: number; fx: number; fy: number }> = [];
        this.levels.forEach((lv, i) => {
            if (!lv.enabled || !(lv.ratio > 0)) return;
            const [px, py] = lv.ratio > 1 ? [x0 + dx, y0 + dy / lv.ratio] : [x0 + dx * lv.ratio, y0 + dy];
            const len = Math.hypot(px - x0, py - y0);
            const [fx, fy] = len < 1e-9 ? [px, py] : [x0 + ((px - x0) / len) * FAR, y0 + ((py - y0) / len) * FAR];
            rays.push({ lv, index: i + 1, px, py, fx, fy });
        });
        return { x0, y0, rays };
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), background: this.background, fillOpacity: this.fillOpacity, showLabels: this.showLabels, ...(this.tv ? { tv: true } : {}) };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (typeof props.background === 'boolean') this.background = props.background;
        if (typeof props.fillOpacity === 'number') this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
        if (typeof props.showLabels === 'boolean') this.showLabels = props.showLabels;
        if (props.tv === true) this.tv = true;
    }

    /** The wedge between each pair of neighbouring enabled angles, in the steeper one's color. */
    override fillPolygons(proj: Projector): Array<{ color: string; pts: Array<[number, number]> }> {
        if (this.tv) {
            const t = this.background ? this.tvRays(proj) : null;
            if (!t) return [];
            const out: Array<{ color: string; pts: Array<[number, number]> }> = [];
            t.rays.forEach((r, e) => {
                // TradingView: levels 1-3 fill to the next shown ray, 5-9 to the previous one, 4 (1/2) none.
                const other = r.index < 4 ? t.rays[e + 1] : r.index > 4 ? t.rays[e - 1] : undefined;
                if (other) out.push({ color: r.lv.color, pts: [[t.x0, t.y0], [r.fx, r.fy], [other.fx, other.fy]] });
            });
            return out;
        }
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!this.background || !a || !b) return [];
        const x0 = proj.xOf(a.time);
        const y0 = proj.yOf(a.price, this.paneId);
        if (y0 == null) return [];
        const xb = proj.xOf(b.time);
        const far = (ratio: number): [number, number] | null => {
            const ty = proj.yOf(a.price + (b.price - a.price) * ratio, this.paneId);
            if (ty == null) return null;
            const dx = xb - x0;
            const dy = ty - y0;
            const len = Math.hypot(dx, dy);
            if (len < 1e-6) return null;
            const k = 1e5 / len; // well past every pane edge; the canvas clips it
            return [x0 + dx * k, y0 + dy * k];
        };
        const on = this.levels.filter((l) => l.enabled).sort((p, q) => p.ratio - q.ratio);
        const out: Array<{ color: string; pts: Array<[number, number]> }> = [];
        for (let i = 1; i < on.length; i += 1) {
            const p = far(on[i - 1]!.ratio);
            const q = far(on[i]!.ratio);
            if (p && q) out.push({ color: on[i]!.color, pts: [[x0, y0], p, q] });
        }
        return out;
    }

    defaultLevels(): readonly FibLevel[] {
        return GANN_FAN_LEVELS;
    }

    entryLines(proj: Projector): FibEntryLine[] | null {
        if (this.tv) {
            const t = this.tvRays(proj);
            if (!t) return null;
            return t.rays.map((r) => ({
                color: r.lv.color,
                x1: t.x0,
                y1: t.y0,
                x2: r.fx,
                y2: r.fy,
                // TradingView: the label starts at the ray's corner point.
                numberText: this.showLabels === false ? '' : r.lv.label ?? String(r.lv.ratio),
                numberX: r.px,
                numberY: r.py,
                numberAlign: 'left' as const,
                labelX: r.px,
                labelY: r.py,
                ...(r.lv.lineWidth ? { lineWidth: r.lv.lineWidth } : {}),
                ...(r.lv.lineStyle ? { lineStyle: r.lv.lineStyle } : {}),
            }));
        }
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const x0 = proj.xOf(a.time);
        const y0 = proj.yOf(a.price, this.paneId);
        if (y0 == null) return null;
        const xb = proj.xOf(b.time);
        const dp = b.price - a.price; // the 1×1 rise; ratio r scales it to dp·r
        const out: FibEntryLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const ty = proj.yOf(a.price + dp * lv.ratio, this.paneId);
            if (ty == null) continue;
            const [x1, y1, x2, y2] = extendRay(x0, y0, xb, ty, 'right', proj.width, proj.height);
            out.push({
                color: lv.color,
                x1,
                y1,
                x2,
                y2,
                numberText: this.showLabels === false ? '' : lv.label ?? String(lv.ratio),
                numberX: xb + 5,
                numberY: ty,
                numberAlign: 'left',
                labelX: xb + 5,
                labelY: ty,
            });
        }
        return out;
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
    }
}
