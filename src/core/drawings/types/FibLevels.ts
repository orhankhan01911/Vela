import type { Projector } from '../geometry';
import { FibRatios, type FibEntryLine } from './FibRatios';

/** A resolved (enabled) level in pixels: its price, color, label, and line to stroke. */
export interface FibLevelLine {
    ratio: number;
    color: string;
    label?: string;
    price: number;
    x1: number;
    x2: number;
    y: number;
}

/**
 * Shared base for the horizontal Fibonacci level tools (retracement, extension): two
 * anchors define a price range; each level is a horizontal line at
 * `p1.price + ratio·(p2.price − p1.price)`, spanning the anchors' time range, with
 * fill bands between consecutive levels. Subclasses just declare the default ratio set.
 */
export type FibLabelH = 'left' | 'center' | 'right';
export type FibLabelV = 'top' | 'middle' | 'bottom';

/**
 * TradingView's Fib retracement/extension style settings (2026-10-17). Defaults keep the look
 * drawings had before: no extension, level + price numbers left and above each line, a faint fill.
 */
export const FIB_STYLE_DEFAULTS = {
    extendLeft: false,
    extendRight: false,
    showLevels: true,
    levelsAsPercent: false,
    showPrices: true,
    labelH: 'left' as FibLabelH,
    labelV: 'top' as FibLabelV,
    background: true,
    /** Fill alpha 0..1 (TradingView shows it as transparency). */
    fillOpacity: 0.06,
    trendline: false,
};

export abstract class FibLevels extends FibRatios {
    declare extendLeft: boolean;
    declare extendRight: boolean;
    declare showLevels: boolean;
    declare levelsAsPercent: boolean;
    declare showPrices: boolean;
    declare labelH: FibLabelH;
    declare labelV: FibLabelV;
    declare background: boolean;
    declare fillOpacity: number;
    declare trendline: boolean;

    constructor(init: ConstructorParameters<typeof FibRatios>[0]) {
        super(init);
        for (const [k, v] of Object.entries(FIB_STYLE_DEFAULTS)) {
            if ((this as Record<string, unknown>)[k] === undefined) (this as Record<string, unknown>)[k] = v;
        }
    }

    /** Price of a level for the two anchor prices; subclasses override to change which anchor ratio 0 sits on. */
    protected levelPrice(ratio: number, p1: number, p2: number): number {
        return p1 + ratio * (p2 - p1);
    }

    /** Per-level pixel line + price for the ENABLED levels, spanning the anchors' time range. */
    levelLines(proj: Projector): FibLevelLine[] | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const xa = proj.xOf(a.time);
        const xb = proj.xOf(b.time);
        const x1 = this.extendLeft ? 0 : Math.min(xa, xb);
        const x2 = this.extendRight ? proj.width : Math.max(xa, xb);
        const out: FibLevelLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const price = this.levelPrice(lv.ratio, a.price, b.price);
            const y = proj.yOf(price, this.paneId);
            if (y == null) continue;
            out.push({ ratio: lv.ratio, color: lv.color, label: lv.label, price, x1, x2, y });
        }
        return out;
    }

    /** The number shown beside a level: its ratio (or percent) and/or its price, as the settings choose. */
    levelText(ratio: number, price: number): string {
        const lvl = this.levelsAsPercent ? `${(ratio * 100).toFixed(2)}%` : String(ratio); // TradingView: 61.80%
        const pr = price.toFixed(2);
        if (this.showLevels && this.showPrices) return `${lvl} (${pr})`;
        if (this.showLevels) return lvl;
        if (this.showPrices) return pr;
        return '';
    }

    entryLines(proj: Projector): FibEntryLine[] | null {
        const lines = this.levelLines(proj);
        if (!lines) return null;
        const h = this.labelH;
        const dy = this.labelV === 'top' ? -7 : this.labelV === 'bottom' ? 7 : 0;
        return lines.map((l) => ({
            color: l.color,
            label: l.label,
            x1: l.x1,
            y1: l.y,
            x2: l.x2,
            y2: l.y,
            numberText: this.levelText(l.ratio, l.price),
            numberX: h === 'left' ? l.x1 + 4 : h === 'right' ? l.x2 - 4 : (l.x1 + l.x2) / 2,
            numberY: l.y + dy,
            numberAlign: h,
            // The custom label sits on the opposite side from the numbers so the two never overlap.
            labelX: h === 'center' ? l.x2 - 4 : (l.x1 + l.x2) / 2,
            labelY: l.y + (dy === 0 ? -7 : dy),
        }));
    }

    override fillBands(proj: Projector): Array<{ color: string; x: number; y: number; w: number; h: number }> {
        if (!this.background) return [];
        const lines = this.levelLines(proj);
        if (!lines) return [];
        const bands: Array<{ color: string; x: number; y: number; w: number; h: number }> = [];
        for (let i = 1; i < lines.length; i += 1) {
            const a = lines[i - 1]!;
            const b = lines[i]!;
            bands.push({ color: b.color, x: a.x1, y: Math.min(a.y, b.y), w: a.x2 - a.x1, h: Math.abs(b.y - a.y) });
        }
        return bands;
    }

    protected override writeProps(): Record<string, unknown> {
        const out: Record<string, unknown> = { ...super.writeProps() };
        for (const k of Object.keys(FIB_STYLE_DEFAULTS)) out[k] = (this as Record<string, unknown>)[k];
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        const self = this as Record<string, unknown>;
        for (const [k, def] of Object.entries(FIB_STYLE_DEFAULTS)) {
            const v = props[k];
            if (typeof def === 'boolean' && typeof v === 'boolean') self[k] = v;
            else if (typeof def === 'number' && typeof v === 'number' && Number.isFinite(v)) self[k] = Math.min(1, Math.max(0, v));
        }
        if (props.labelH === 'left' || props.labelH === 'center' || props.labelH === 'right') this.labelH = props.labelH;
        if (props.labelV === 'top' || props.labelV === 'middle' || props.labelV === 'bottom') this.labelV = props.labelV;
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const prices = this.levels.filter((l) => l.enabled).map((l) => this.levelPrice(l.ratio, a.price, b.price));
        if (prices.length === 0) return null;
        return { min: Math.min(...prices), max: Math.max(...prices) };
    }
}
