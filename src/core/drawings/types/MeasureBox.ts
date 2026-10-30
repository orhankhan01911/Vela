import { Drawing, type AnchorSlot, type SerializedDrawing } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_SIZE_OPTIONS } from '../schema';
import { pointInBox, handleAt } from '../hittest';
import { RANGE_LABEL, RANGE_PARTS, rangeInfoLines, type RangeInfo, type RangePart } from './rangeInfo';

/** Signed value with 2 decimals (e.g. "+523.45"). */
function signed(n: number): string {
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
}

/** A compact duration string for a millisecond span (e.g. "2d 4h", "3h 15m"). */
export function formatDuration(ms: number): string {
    const m = Math.abs(ms);
    const DAY = 86400000;
    const HR = 3600000;
    const MIN = 60000;
    if (m >= DAY) {
        const d = Math.floor(m / DAY);
        const h = Math.round((m % DAY) / HR);
        return h ? `${d}d ${h}h` : `${d}d`;
    }
    if (m >= HR) {
        const h = Math.floor(m / HR);
        const mn = Math.round((m % HR) / MIN);
        return mn ? `${h}h ${mn}m` : `${h}h`;
    }
    if (m >= MIN) return `${Math.round(m / MIN)}m`;
    return `${Math.round(m / 1000)}s`;
}

/**
 * The measurement box (the persistent Date & Price Range drawing): a two-corner box
 * tinted green/red by direction, with a centered label of the price delta and/or the
 * date delta. Each line is toggled via `showPrice` / `showDate` in settings, and the
 * label is styled by the drawing's `text` color/size — so the one tool covers the
 * price-only, date-only, and combined cases.
 */
export abstract class MeasureBox extends Drawing {
    // Declared with `!` (no initializer) so a field default never clobbers readProps, which the
    // base constructor runs before subclass fields would initialize. Defaulted below after super().
    /** Show the `Δprice (Δ%)` line. */
    showPrice!: boolean;
    /** Show the `N bars, duration` line. */
    showDate!: boolean;

    /** TradingView's look (new price and date & price ranges); a box saved before keeps the old one. */
    tv?: boolean;
    fillBackground!: boolean;
    /** The Stats parts that are on ({@link rangeParts}). */
    info!: RangeInfo;
    labelColor!: string;
    labelSize!: number;
    labelBackground!: boolean;
    labelBgColor!: string;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        if (this.showPrice === undefined) this.showPrice = true;
        if (this.showDate === undefined) this.showDate = true;
        if (this.fillBackground === undefined) this.fillBackground = true;
        if (!this.info) this.info = Object.fromEntries(this.rangeParts().map((p) => [p.key, true])) as RangeInfo;
        if (this.labelColor === undefined) this.labelColor = RANGE_LABEL.color;
        if (this.labelSize === undefined) this.labelSize = RANGE_LABEL.size;
        if (this.labelBackground === undefined) this.labelBackground = true;
        if (this.labelBgColor === undefined) this.labelBgColor = RANGE_LABEL.background;
    }

    /** The Stats parts TradingView's dialog offers for this range. */
    rangeParts(): ReadonlyArray<{ key: RangePart; label: string }> {
        return RANGE_PARTS;
    }

    /** The plate's lines in TradingView's format; `tick` is the price scale's step. */
    infoLines(proj: Projector, tick: number): string[] {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return [];
        const bars = proj.barsBetween ? proj.barsBetween(a.time, b.time) : 0;
        const inRange = proj.barsInRange ? proj.barsInRange(Math.min(a.time, b.time), Math.max(a.time, b.time)) : null;
        const volume = inRange ? inRange.reduce((sum, bar) => sum + (bar.volume ?? 0), 0) : undefined;
        const on: RangeInfo = {};
        for (const p of this.rangeParts()) on[p.key] = this.info[p.key] === true;
        return rangeInfoLines(on, a, b, { tick, bars, volume });
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'c1', free: 'both' }, { role: 'c2', free: 'both' }] };
    }

    // Placed click-move-click (the inherited 'click' mode): first click sets a corner, the second
    // sets the opposite one — consistent with the box/Gann tools.

    /** The measurement lines, filtered by the enabled toggles (plus TradingView's volume line under the time). */
    measureLabel(proj: Projector): string[] {
        const lines: string[] = [];
        if (this.showPrice) lines.push(this.priceLabel());
        if (this.showDate) lines.push(this.timeLabel(proj));
        const vol = this.showDate ? this.volumeLabel(proj) : '';
        if (vol) lines.push(vol);
        return lines;
    }

    /** `Vol 11.36K`: the volume of the bars between the two points, or '' when the feed has none. */
    protected volumeLabel(proj: Projector): string {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b || !proj.barsInRange) return '';
        const bars = proj.barsInRange(Math.min(a.time, b.time), Math.max(a.time, b.time));
        const v = bars.reduce((sum, bar) => sum + (bar.volume ?? 0), 0);
        if (!(v > 0)) return '';
        const [n, unit] = v >= 1e9 ? [v / 1e9, 'B'] : v >= 1e6 ? [v / 1e6, 'M'] : v >= 1e3 ? [v / 1e3, 'K'] : [v, ''];
        return `Vol ${n.toFixed(unit ? 2 : 0)}${unit}`;
    }

    /** Up (later price ≥ earlier) → green; else red. */
    isUp(): boolean {
        const a = this.anchors[0];
        const b = this.anchors[1];
        return a != null && b != null && b.price >= a.price;
    }

    /** Formatted `Δprice (Δ%)` between the two anchors. */
    protected priceLabel(): string {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return '';
        const delta = b.price - a.price;
        const percent = a.price !== 0 ? (delta / a.price) * 100 : 0;
        return `${signed(delta)} (${signed(percent)}%)`;
    }

    /** Formatted `N bars, duration` between the two anchors (bars only when the projector knows). */
    protected timeLabel(proj: Projector): string {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return '';
        const duration = formatDuration(b.time - a.time);
        const bars = proj.barsBetween ? Math.round(proj.barsBetween(a.time, b.time)) : null;
        return bars != null ? `${bars} bars, ${duration}` : duration;
    }

    private rect(proj: Projector): { x1: number; y1: number; x2: number; y2: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        if (ya == null || yb == null) return null;
        return { x1: proj.xOf(a.time), y1: ya, x2: proj.xOf(b.time), y2: yb };
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const r = this.rect(proj);
        return r != null && pointInBox(px, py, r.x1, r.y1, r.x2, r.y2, tol); // shaded box → grabbable anywhere inside
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const r = this.rect(proj);
        return r ? [[r.x1, r.y1], [r.x2, r.y2]] : [];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const r = this.rect(proj);
        if (!r) return null;
        return { x: Math.min(r.x1, r.x2), y: Math.min(r.y1, r.y2), w: Math.abs(r.x2 - r.x1), h: Math.abs(r.y2 - r.y1) };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
    }

    schema(): SettingsSchema {
        return {
            fields: [
                { path: 'showPrice', label: 'Show price', kind: 'boolean', group: 'behavior' },
                { path: 'showDate', label: 'Show date', kind: 'boolean', group: 'behavior' },
                ...LINE_FIELDS.filter((f) => f.path !== 'style.lineColor'), // box border (the fill is direction-tinted)
                { path: 'text.color', label: 'Text color', kind: 'color', group: 'text' },
                { path: 'text.size', label: 'Text size', kind: 'select', options: TEXT_SIZE_OPTIONS, group: 'text' },
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> {
        const base = { showPrice: this.showPrice, showDate: this.showDate };
        if (!this.tv) return base;
        return {
            ...base,
            tv: true,
            fillBackground: this.fillBackground,
            info: { ...this.info },
            labelColor: this.labelColor,
            labelSize: this.labelSize,
            labelBackground: this.labelBackground,
            labelBgColor: this.labelBgColor,
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.showPrice === 'boolean') this.showPrice = props.showPrice;
        if (typeof props.showDate === 'boolean') this.showDate = props.showDate;
        if (props.tv === true) this.tv = true;
        if (typeof props.fillBackground === 'boolean') this.fillBackground = props.fillBackground;
        if (typeof props.labelBackground === 'boolean') this.labelBackground = props.labelBackground;
        if (typeof props.labelColor === 'string') this.labelColor = props.labelColor;
        if (typeof props.labelBgColor === 'string') this.labelBgColor = props.labelBgColor;
        if (typeof props.labelSize === 'number' && props.labelSize > 0) this.labelSize = props.labelSize;
        if (props.info && typeof props.info === 'object') {
            const r = props.info as Record<string, unknown>;
            const info: RangeInfo = { ...(this.info ?? {}) };
            for (const p of RANGE_PARTS) if (typeof r[p.key] === 'boolean') info[p.key] = r[p.key] as boolean;
            this.info = info;
        }
    }
}
