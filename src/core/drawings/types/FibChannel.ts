import { type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import { FibRatios, type FibEntryLine, type FibLevel } from './FibRatios';
import { fibLabelText, type FibLabelH, type FibLabelV } from './FibLevels';
import { TV_FIB_RETRACEMENT_LEVELS } from './FibRetracement';
import { fibLevels } from '../levelPalette';

const CHANNEL_LEVELS = fibLevels([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]);

/**
 * A Fibonacci channel: a baseline (p1→p2) plus parallel level lines, each the baseline
 * translated by `ratio · (p3 − p1)` (a full 2D offset vector — the third anchor sets both
 * the width and the skew). Level 0 is the baseline; level 1 passes through p3.
 */
export class FibChannel extends FibRatios {
    readonly type = 'fibchannel' as const;

    /** TradingView's look (module 543085), new channels only: 24 levels, labels beside each level, bands between
     *  them, Extend left / right. Saved channels keep their look. */
    declare tv?: boolean;
    declare extendLeft?: boolean;
    declare extendRight?: boolean;
    declare background?: boolean;
    declare fillOpacity?: number;
    declare showLevels?: boolean;
    declare levelsAsPercent?: boolean;
    declare showPrices?: boolean;
    declare labelH?: FibLabelH;
    declare labelV?: FibLabelV;
    declare fontSize?: number;

    constructor(init: ConstructorParameters<typeof FibRatios>[0]) {
        super(init);
        if (!init.props) {
            // TradingView's factory defaults (module 543085): the retracement's 24 levels and colours, 2 px solid
            // lines, bands at 80 % transparency, coefficient + price labels left, middle, 12 px, no extend.
            this.tv = true;
            this.levels = TV_FIB_RETRACEMENT_LEVELS.map((l) => ({ ...l }));
            this.style = { ...this.style, lineWidth: 2, lineStyle: 'solid' };
            this.extendLeft = false;
            this.extendRight = false;
            this.background = true;
            this.fillOpacity = 0.2;
            this.showLevels = true;
            this.levelsAsPercent = false;
            this.showPrices = true;
            this.labelH = 'left';
            this.labelV = 'middle';
            this.fontSize = 12;
        }
    }

    levelText(ratio: number, price: number, tick?: number): string {
        return fibLabelText({ showLevels: this.showLevels !== false, levelsAsPercent: this.levelsAsPercent === true, showPrices: this.showPrices !== false }, ratio, price, tick);
    }

    defaultLevels(): readonly FibLevel[] {
        return CHANNEL_LEVELS;
    }

    override anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 3, max: 3, slots: [{ role: 'p1', free: 'both' }, { role: 'p2', free: 'both' }, { role: 'offset', free: 'both' }] };
    }

    /** Each shown level as a line in pixels (the baseline shifted by ratio x the A->C offset), extended to the screen
     *  edges along its slope when set, with the price at its left end. */
    private tvLines(proj: Projector): Array<{ ratio: number; color: string; label?: string; x1: number; y1: number; x2: number; y2: number; lx: number; ly: number; rx: number; ry: number }> | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const y0 = proj.yOf(a.price, this.paneId);
        const y1 = proj.yOf(b.price, this.paneId);
        if (y0 == null || y1 == null) return null;
        const x0 = proj.xOf(a.time);
        const x1 = proj.xOf(b.time);
        let dX = 0;
        let dY = 0;
        const c = this.anchors[2];
        if (c) {
            const y2 = proj.yOf(c.price, this.paneId);
            if (y2 == null) return null;
            dX = proj.xOf(c.time) - x0;
            dY = y2 - y0;
        }
        const [l, r] = x0 <= x1 ? [[x0, y0], [x1, y1]] : [[x1, y1], [x0, y0]];
        const slope = r[0]! !== l[0]! ? (r[1]! - l[1]!) / (r[0]! - l[0]!) : 0;
        const out = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const ox = lv.ratio * dX;
            const oy = lv.ratio * dY;
            const lx = l[0]! + ox;
            const ly = l[1]! + oy;
            const rx = r[0]! + ox;
            const ry = r[1]! + oy;
            const ex1 = this.extendLeft && rx !== lx ? 0 : lx;
            const ex2 = this.extendRight && rx !== lx ? proj.width : rx;
            out.push({ ratio: lv.ratio, color: lv.color, label: lv.label, x1: ex1, y1: ly + slope * (ex1 - lx), x2: ex2, y2: ly + slope * (ex2 - lx), lx, ly, rx, ry });
        }
        return out;
    }

    entryLines(proj: Projector): FibEntryLine[] | null {
        if (this.tv) {
            const lines = this.tvLines(proj);
            if (!lines) return null;
            const fs = this.fontSize ?? 12;
            const v = this.labelV ?? 'middle';
            const dy = v === 'top' ? -(fs / 2 + 3) : v === 'bottom' ? fs / 2 + 3 : 0;
            return lines.map((ln) => {
                // TradingView's placement (module 516130): Left ends 4 px before the level's left point (4 px in from
                // the screen edge when extended left), Right starts 4 px after its right point, Center mid-span.
                const h = this.labelH ?? 'left';
                const place =
                    h === 'left'
                        ? this.extendLeft ? { x: 4, y: ln.ly, align: 'left' as const } : { x: ln.lx - 4, y: ln.ly, align: 'right' as const }
                        : h === 'right'
                          ? this.extendRight ? { x: proj.width - 4, y: ln.ry, align: 'right' as const } : { x: ln.rx + 4, y: ln.ry, align: 'left' as const }
                          : { x: (ln.x1 + ln.x2) / 2, y: (ln.y1 + ln.y2) / 2, align: 'center' as const };
                const price = proj.pxToPoint(ln.lx, ln.ly, this.paneId).price;
                return {
                    color: ln.color,
                    x1: ln.x1,
                    y1: ln.y1,
                    x2: ln.x2,
                    y2: ln.y2,
                    numberText: this.levelText(ln.ratio, price),
                    ratio: ln.ratio,
                    price,
                    numberX: place.x,
                    numberY: place.y + dy,
                    numberAlign: place.align,
                    labelX: place.x,
                    labelY: place.y + dy,
                };
            });
        }
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const y0 = proj.yOf(a.price, this.paneId);
        const y1 = proj.yOf(b.price, this.paneId);
        if (y0 == null || y1 == null) return null;
        const x0 = proj.xOf(a.time);
        const x1 = proj.xOf(b.time);
        // The offset vector p3 − p1 (zero while only the baseline is placed → levels collapse onto it).
        let dX = 0;
        let dY = 0;
        const c = this.anchors[2];
        if (c) {
            const y2 = proj.yOf(c.price, this.paneId);
            if (y2 == null) return null;
            dX = proj.xOf(c.time) - x0;
            dY = y2 - y0;
        }
        const out: FibEntryLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const ox = lv.ratio * dX;
            const oy = lv.ratio * dY;
            const lx2 = x1 + ox;
            const ly2 = y1 + oy;
            out.push({
                color: lv.color,
                label: lv.label,
                x1: x0 + ox,
                y1: y0 + oy,
                x2: lx2,
                y2: ly2,
                numberText: String(lv.ratio),
                numberX: lx2 + 5,
                numberY: ly2,
                numberAlign: 'left',
                labelX: lx2 + 5,
                labelY: ly2 + 13,
            });
        }
        return out;
    }

    /** TradingView's bands: between each shown level and the next shown one, in the first one's colour. */
    override fillPolygons(proj: Projector): Array<{ color: string; pts: Array<[number, number]> }> {
        if (!this.tv || this.background === false) return [];
        const lines = this.tvLines(proj);
        if (!lines) return [];
        const out: Array<{ color: string; pts: Array<[number, number]> }> = [];
        for (let i = 0; i + 1 < lines.length; i += 1) {
            const p = lines[i]!;
            const q = lines[i + 1]!;
            out.push({ color: p.color, pts: [[p.x1, p.y1], [p.x2, p.y2], [q.x2, q.y2], [q.x1, q.y1]] });
        }
        return out;
    }

    protected override writeProps(): Record<string, unknown> {
        const out = super.writeProps();
        if (this.tv) {
            Object.assign(out, {
                tv: true,
                extendLeft: this.extendLeft === true,
                extendRight: this.extendRight === true,
                background: this.background !== false,
                fillOpacity: this.fillOpacity,
                showLevels: this.showLevels !== false,
                levelsAsPercent: this.levelsAsPercent === true,
                showPrices: this.showPrices !== false,
                labelH: this.labelH,
                labelV: this.labelV,
                fontSize: this.fontSize,
            });
        }
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (props.tv === true) this.tv = true;
        for (const k of ['extendLeft', 'extendRight', 'background', 'showLevels', 'levelsAsPercent', 'showPrices'] as const) {
            if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        }
        if (typeof props.fillOpacity === 'number' && Number.isFinite(props.fillOpacity)) this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
        if (props.labelH === 'left' || props.labelH === 'center' || props.labelH === 'right') this.labelH = props.labelH;
        if (props.labelV === 'top' || props.labelV === 'middle' || props.labelV === 'bottom') this.labelV = props.labelV;
        if (typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        const c = this.anchors[2];
        if (!a || !b) return null;
        const dPrice = c ? c.price - a.price : 0;
        let min = Infinity;
        let max = -Infinity;
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            for (const base of [a.price, b.price]) {
                const p = base + lv.ratio * dPrice;
                if (p < min) min = p;
                if (p > max) max = p;
            }
        }
        return min <= max ? { min, max } : null;
    }
}
