import type { Projector } from '../geometry';
import type { LineStyle } from '../../model/series';
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

/** TradingView's label font sizes (px) for the Fib level tools (its Font size dropdown). */
export const TV_FIB_FONT_SIZES: readonly number[] = [8, 10, 11, 12, 14, 16, 18, 20, 22, 24];

const isH = (v: unknown): v is FibLabelH => v === 'left' || v === 'center' || v === 'right';
const isV = (v: unknown): v is FibLabelV => v === 'top' || v === 'middle' || v === 'bottom';
const isStyle = (v: unknown): v is LineStyle => v === 'solid' || v === 'dashed' || v === 'dotted';

export abstract class FibLevels extends FibRatios {
    /** TradingView's look (new drawings of a tool that opts in): own trend line, px font, level texts, labels beside
     *  the lines. Saved drawings without it keep the look they had. */
    declare tv?: boolean;
    declare trendColor?: string;
    declare trendWidth?: number;
    declare trendStyle?: LineStyle;
    /** Label and level-text size in px (TradingView's Font size). */
    declare fontSize?: number;
    /** TradingView's Text row: each level's own text, and where it sits. */
    declare showText?: boolean;
    declare textH?: FibLabelH;
    declare textV?: FibLabelV;
    /** TradingView's "Fib levels based on log scale" (kept; applies on a log price scale). */
    declare logScale?: boolean;
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
    levelText(ratio: number, price: number, tick?: number): string {
        const lvl = this.levelsAsPercent ? `${(ratio * 100).toFixed(2)}%` : String(ratio); // TradingView: 61.80%
        // With the price scale's step (TradingView-look drawings): its decimals and thousands commas, "77,055.3".
        const dp = tick && tick > 0 ? Math.max(0, Math.min(10, Math.round(-Math.log10(tick)))) : 2;
        const pr = tick && tick > 0 ? price.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }) : price.toFixed(2);
        if (this.showLevels && this.showPrices) return `${lvl} (${pr})`;
        if (this.showLevels) return lvl;
        if (this.showPrices) return pr;
        return '';
    }

    entryLines(proj: Projector): FibEntryLine[] | null {
        const lines = this.levelLines(proj);
        if (!lines) return null;
        if (this.tv) return this.tvEntryLines(lines, proj);
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

    /** TradingView's placement (module 516130 getTextAlignInBox, 4 px offset): a Left label ends 4 px before the
     *  level's left end (starts 4 px in from the screen edge when the lines extend left), Right starts 4 px after
     *  its right end, Center sits mid-span. Top / Bottom put the text above / below the line, Middle on it. */
    private tvEntryLines(lines: FibLevelLine[], proj: Projector): FibEntryLine[] {
        const fs = this.fontSize ?? 12;
        const off = (v: FibLabelV): number => (v === 'top' ? -(fs / 2 + 3) : v === 'bottom' ? fs / 2 + 3 : 0);
        const place = (h: FibLabelH, l: FibLevelLine): { x: number; align: 'left' | 'center' | 'right' } => {
            if (h === 'left') return this.extendLeft ? { x: 4, align: 'left' } : { x: l.x1 - 4, align: 'right' };
            if (h === 'right') return this.extendRight ? { x: proj.width - 4, align: 'right' } : { x: l.x2 + 4, align: 'left' };
            return { x: (l.x1 + l.x2) / 2, align: 'center' };
        };
        return lines.map((l) => {
            const num = place(this.labelH, l);
            const txt = place(this.textH ?? 'center', l);
            return {
                color: l.color,
                label: this.showText === false ? undefined : l.label,
                x1: l.x1,
                y1: l.y,
                x2: l.x2,
                y2: l.y,
                numberText: this.levelText(l.ratio, l.price),
                ratio: l.ratio,
                price: l.price,
                numberX: num.x,
                numberY: l.y + off(this.labelV),
                numberAlign: num.align,
                labelX: txt.x,
                labelY: l.y + off(this.textV ?? 'middle'),
                labelAlign: txt.align,
            };
        });
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
        if (this.tv) {
            Object.assign(out, {
                tv: true,
                trendColor: this.trendColor,
                trendWidth: this.trendWidth,
                trendStyle: this.trendStyle,
                fontSize: this.fontSize,
                showText: this.showText,
                textH: this.textH,
                textV: this.textV,
                logScale: this.logScale,
            });
        }
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
        if (props.tv === true) this.tv = true;
        if (typeof props.trendColor === 'string') this.trendColor = props.trendColor;
        if (typeof props.trendWidth === 'number' && Number.isFinite(props.trendWidth)) this.trendWidth = Math.min(10, Math.max(1, props.trendWidth));
        if (isStyle(props.trendStyle)) this.trendStyle = props.trendStyle;
        if (typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
        if (typeof props.showText === 'boolean') this.showText = props.showText;
        if (isH(props.textH)) this.textH = props.textH;
        if (isV(props.textV)) this.textV = props.textV;
        if (typeof props.logScale === 'boolean') this.logScale = props.logScale;
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
