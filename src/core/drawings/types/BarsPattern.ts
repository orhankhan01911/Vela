import { Drawing, type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { pointInBox, handleAt } from '../hittest';
import { timePlusBars } from '../futureAnchors';
import { TV_LINE_COLOR } from '../style';

/** TradingView's modes (module 282181, in its dropdown's order): HL bars, OC bars, then a line through a price. */
export const TV_BARS_PATTERN_MODES = ['hl', 'oc', 'close', 'open', 'high', 'low', 'hl2'] as const;
export type TvBarsPatternMode = (typeof TV_BARS_PATTERN_MODES)[number];
export const TV_BARS_PATTERN_MODE_LABEL: Record<TvBarsPatternMode, string> = { hl: 'HL bars', oc: 'OC bars', close: 'Line - close', open: 'Line - open', high: 'Line - high', low: 'Line - low', hl2: 'Line - HL/2' };
type RelBar = { dt: number; o: number; h: number; l: number; c: number };
/** The price a TradingView pattern starts and ends on, per mode: the first bar's high and the last one's low for HL
 *  bars, open and close for OC bars, the line's price otherwise. */
const FIRST_FIELD: Record<TvBarsPatternMode, (b: RelBar) => number> = { hl: (b) => b.h, oc: (b) => b.o, close: (b) => b.c, open: (b) => b.o, high: (b) => b.h, low: (b) => b.l, hl2: (b) => (b.h + b.l) / 2 };
const LAST_FIELD: Record<TvBarsPatternMode, (b: RelBar) => number> = { hl: (b) => b.l, oc: (b) => b.c, close: (b) => b.c, open: (b) => b.o, high: (b) => b.h, low: (b) => b.l, hl2: (b) => (b.h + b.l) / 2 };

/** One copied bar resolved to pixels. */
export interface PatternBar {
    x: number;
    open: number;
    high: number;
    low: number;
    close: number;
    /** TradingView's line modes: the line's pixel y at this bar. */
    value?: number;
}

/**
 * TradingView's bars pattern: copies the bars between its two points when placed, then shows that copy wherever it
 * is dragged (to compare a past move with now). The copy can be mirrored (time reversed) or flipped (upside down)
 * and drawn as candles, HL bars or a close line.
 */
export class BarsPattern extends Drawing {
    readonly type = 'barspattern' as const;
    // `!` (no initializer): the base constructor runs readProps first.
    /** The copied bars, relative to the first: time offset (ms) and prices minus the first open. */
    bars!: RelBar[];
    mode!: 'candles' | 'bars' | 'line' | TvBarsPatternMode;
    mirrored!: boolean;
    flipped!: boolean;
    /**
     * TradingView's look (module 282181): its blue, HL bars, both points as handles (the second stretches the copy in
     * time and price), Mirrored turning it upside down and Flipped reversing it in time. One saved before keeps ours.
     */
    declare tv?: boolean;
    /** TradingView's look: the copied first bar's open, the price the relative bars add to. */
    declare base?: number;

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.mode = 'hl';
            this.mirrored = false;
            this.flipped = false;
            this.style = { ...this.style, lineColor: TV_LINE_COLOR };
        }
    }

    private tvMode(): TvBarsPatternMode {
        return (TV_BARS_PATTERN_MODES as readonly string[]).includes(this.mode) ? (this.mode as TvBarsPatternMode) : 'hl';
    }

    /** TradingView's copy as shown: mirrored (each price reflected about the copy's middle; high and low keep their
     *  names) and / or flipped (the bars in reverse order); its first and last prices for the mode. */
    tvPattern(): { bars: RelBar[]; first: number; last: number } | null {
        if (!this.bars?.length) return null;
        let bars = this.bars.map((b) => ({ ...b }));
        if (this.mirrored) {
            let lo = Math.min(bars[0]!.l, bars[0]!.h);
            let hi = Math.max(bars[0]!.l, bars[0]!.h);
            for (const b of bars) {
                lo = Math.min(lo, b.l);
                hi = Math.max(hi, b.h);
            }
            const mid = (lo + hi) / 2;
            bars = bars.map((b) => ({ dt: b.dt, o: 2 * mid - b.o, h: 2 * mid - b.h, l: 2 * mid - b.l, c: 2 * mid - b.c }));
        }
        if (this.flipped) bars.reverse();
        const m = this.tvMode();
        const [f, l] = this.flipped ? [LAST_FIELD[m], FIRST_FIELD[m]] : [FIRST_FIELD[m], LAST_FIELD[m]];
        return { bars, first: f(bars[0]!), last: l(bars[bars.length - 1]!) };
    }

    /** TradingView turns its points' prices round on every Mirrored / Flipped switch, so the copy stays put. */
    override applySettings(patch: Record<string, unknown>): void {
        const swap = this.tv && ['mirrored', 'flipped'].filter((k) => k in patch && typeof patch[k] === 'boolean' && patch[k] !== this[k as 'mirrored' | 'flipped']).length % 2 === 1;
        super.applySettings(patch);
        const [a, b] = this.anchors;
        if (swap && a && b) this.anchors = [{ ...a, price: b.price }, { ...b, price: a.price }, ...this.anchors.slice(2)];
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        const free = this.tv ? 'both' : 'x';
        return { min: 2, max: 2, slots: [{ role: 'from', free }, { role: 'to', free }] };
    }

    /** Copy the bars between the two points; the copy starts on the first bar's open. TradingView's look puts the
     *  copy 5 % of the pane above the original (its first price there) and the second point on its last price. */
    override onPlaced(proj: Projector): void {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return;
        const from = Math.min(a.time, b.time);
        const to = Math.max(a.time, b.time);
        const src = proj.barsInRange?.(from, to) ?? [];
        if (!src.length) return;
        const t0 = src[0]!.time;
        const base = src[0]!.open;
        this.bars = src.map((bar) => ({ dt: bar.time - t0, o: bar.open - base, h: bar.high - base, l: bar.low - base, c: bar.close - base }));
        const t1 = src[src.length - 1]!.time;
        if (this.tv) {
            this.base = base;
            const pat = this.tvPattern()!;
            const y = proj.yOf(base + pat.first, this.paneId);
            const rect = proj.paneRect?.(this.paneId) ?? { top: 0, height: proj.height };
            const p0 = y == null ? base + pat.first : proj.pxToPoint(proj.xOf(t0), y - 0.05 * rect.height, this.paneId).price;
            this.anchors = [{ time: t0, price: p0 }, { time: t1, price: p0 + pat.last - pat.first }];
            return;
        }
        this.anchors[0] = { time: t0, price: base };
        this.anchors[1] = { time: t1, price: base };
    }

    /** The second point follows the first: the copy keeps its length. TradingView's look keeps the second point at
     *  least a bar after the first instead (dragging it stretches the copy). */
    override constrainHandleDrag(index: number): void {
        const a = this.anchors[0];
        const b = this.anchors[1];
        const last = this.bars?.[this.bars.length - 1];
        if (this.tv) {
            if (!a || !b || b.time > a.time) return;
            const step = last && this.bars.length > 1 ? last.dt / (this.bars.length - 1) : 60_000;
            if (index === 0) this.anchors = [{ ...a, time: b.time - step }, b];
            else this.anchors = [a, { ...b, time: a.time + step }];
            return;
        }
        if (a && last) this.anchors[1] = { time: a.time + last.dt, price: a.price };
    }

    /** TradingView's copy in pixels: bar i at the first point plus i of the points' spacing, its prices placed so the
     *  pattern's first price sits on the first point and its last on the second (scaled to fit between them). */
    private tvBars(proj: Projector): PatternBar[] {
        const [a, b] = this.anchors;
        const pat = this.tvPattern();
        if (!a || !b || !pat || this.base == null) return [];
        const Y = (v: number): number | null => proj.yOf(this.base! + v, this.paneId);
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        const yf = Y(pat.first);
        const yl = Y(pat.last);
        if (ya == null || yb == null || yf == null || yl == null) return [];
        const xa = proj.xOf(a.time);
        const xb = proj.xOf(b.time);
        const n = pat.bars.length;
        const step = n > 1 ? Math.abs(xa - xb) / (n - 1) : 0;
        const x0 = Math.min(xa, xb);
        const scale = Math.abs(yl - yf) > 1e-9 ? +((yb - ya) / (yl - yf)).toFixed(8) : 1;
        const at = (v: number): number | null => {
            const y = Y(v);
            return y == null ? null : ya + scale * (y - yf);
        };
        const m = this.tvMode();
        const out: PatternBar[] = [];
        pat.bars.forEach((bar, i) => {
            const o = at(bar.o);
            const h = at(bar.h);
            const l = at(bar.l);
            const c = at(bar.c);
            const v = at(m === 'hl2' ? (bar.h + bar.l) / 2 : m === 'open' ? bar.o : m === 'high' ? bar.h : m === 'low' ? bar.l : bar.c);
            if (o == null || h == null || l == null || c == null || v == null) return;
            out.push({ x: Math.round(x0 + i * step + 0.5), open: o, high: h, low: l, close: c, value: v });
        });
        return out;
    }

    override translateBody(dt: number, dp: number, orig: DrawingPoint[]): DrawingPoint[] {
        return orig.map((o) => ({ time: o.time + dt, price: o.price + dp }));
    }

    /** The copy in pixels, placed at the first point, mirrored / flipped as set. */
    patternBars(proj: Projector): PatternBar[] {
        if (this.tv) return this.tvBars(proj);
        const a = this.anchors[0];
        if (!a || !this.bars?.length) return [];
        const span = this.bars[this.bars.length - 1]!.dt;
        const out: PatternBar[] = [];
        const last = this.bars.length - 1;
        for (const [j, bar] of this.bars.entries()) {
            const s = this.flipped ? -1 : 1;
            const y = (v: number): number | null => proj.yOf(a.price + s * v, this.paneId);
            const o = y(bar.o);
            const h = y(this.flipped ? bar.l : bar.h);
            const l = y(this.flipped ? bar.h : bar.l);
            const c = y(bar.c);
            if (o == null || h == null || l == null || c == null) continue;
            // the copied bars are consecutive: on a chart whose x counts bars they sit one bar apart
            const x = proj.xOf(timePlusBars(proj, a.time, this.mirrored ? last - j : j, this.mirrored ? span - bar.dt : bar.dt));
            // Mirrored, a bar runs backwards in time: its open and close swap.
            out.push(this.mirrored ? { x, open: c, high: h, low: l, close: o } : { x, open: o, high: h, low: l, close: c });
        }
        return this.mirrored ? out.reverse() : out;
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const b = this.bounds(proj);
        return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol);
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        if (this.tv) {
            const out: Array<[number, number]> = [];
            for (const p of this.anchors) {
                const y = proj.yOf(p.price, this.paneId);
                if (y != null) out.push([proj.xOf(p.time), y]);
            }
            return out;
        }
        const a = this.anchors[0];
        const y = a ? proj.yOf(a.price, this.paneId) : null;
        return a && y != null ? [[proj.xOf(a.time), y]] : [];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const bars = this.patternBars(proj);
        if (!bars.length) {
            const pts = this.anchors.map((p) => [proj.xOf(p.time), proj.yOf(p.price, this.paneId)] as const);
            if (pts.length < 2 || pts.some((p) => p[1] == null)) return null;
            return { x: Math.min(pts[0]![0], pts[1]![0]), y: pts[0]![1]! - 10, w: Math.abs(pts[1]![0] - pts[0]![0]), h: 20 };
        }
        const xs = bars.map((b) => b.x);
        const ys = bars.flatMap((b) => [b.high, b.low]);
        return { x: Math.min(...xs) - 3, y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 6, h: Math.max(...ys) - Math.min(...ys) };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        if (this.tv) {
            const b = this.anchors[1];
            const pat = this.tvPattern();
            if (!a || !b || !pat) return null;
            // linear between the points (a log scale stretches it a little differently)
            const k = pat.last !== pat.first ? (b.price - a.price) / (pat.last - pat.first) : 1;
            const vs = pat.bars.flatMap((x) => [x.h, x.l]).map((v) => a.price + k * (v - pat.first));
            vs.push(a.price, b.price);
            return { min: Math.min(...vs), max: Math.max(...vs) };
        }
        if (!a || !this.bars?.length) return null;
        const s = this.flipped ? -1 : 1;
        const vs = this.bars.flatMap((b) => [a.price + s * b.h, a.price + s * b.l]);
        return { min: Math.min(...vs), max: Math.max(...vs) };
    }

    override timeExtent(): { min: number; max: number } | null {
        if (this.tv) {
            const ts = this.anchors.map((p) => p.time);
            return ts.length ? { min: Math.min(...ts), max: Math.max(...ts) } : null;
        }
        const a = this.anchors[0];
        const last = this.bars?.[this.bars.length - 1];
        return a ? { min: a.time, max: a.time + (last?.dt ?? 0) } : null;
    }

    schema(): SettingsSchema {
        if (this.tv) {
            return {
                fields: [
                    { path: 'style.lineColor', label: 'Color', kind: 'color', group: 'line' },
                    { path: 'mode', label: 'Mode', kind: 'select', options: TV_BARS_PATTERN_MODES.map((v) => ({ value: v, label: TV_BARS_PATTERN_MODE_LABEL[v] })), group: 'behavior' },
                    { path: 'mirrored', label: 'Mirrored', kind: 'boolean', group: 'behavior' },
                    { path: 'flipped', label: 'Flipped', kind: 'boolean', group: 'behavior' },
                ],
            };
        }
        return {
            fields: [
                { path: 'style.lineColor', label: 'Color', kind: 'color', group: 'line' },
                {
                    path: 'mode',
                    label: 'Mode',
                    kind: 'select',
                    options: [{ value: 'candles', label: 'Candles' }, { value: 'bars', label: 'HL bars' }, { value: 'line', label: 'Line (close)' }],
                    group: 'behavior',
                },
                { path: 'mirrored', label: 'Mirrored', kind: 'boolean', group: 'behavior' },
                { path: 'flipped', label: 'Flipped', kind: 'boolean', group: 'behavior' },
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> {
        const out: Record<string, unknown> = { bars: (this.bars ?? []).map((b) => ({ ...b })), mode: this.mode ?? 'candles', mirrored: !!this.mirrored, flipped: !!this.flipped };
        if (this.tv) Object.assign(out, { tv: true, base: this.base });
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (Array.isArray(props.bars)) {
            this.bars = props.bars
                .filter((b): b is { dt: number; o: number; h: number; l: number; c: number } => !!b && typeof b === 'object' && ['dt', 'o', 'h', 'l', 'c'].every((k) => Number.isFinite((b as Record<string, unknown>)[k])))
                .slice(0, 5000)
                .map((b) => ({ dt: b.dt, o: b.o, h: b.h, l: b.l, c: b.c }));
        }
        if (props.tv === true) this.tv = true;
        if (typeof props.base === 'number' && Number.isFinite(props.base)) this.base = props.base;
        if (props.mode === 'candles' || props.mode === 'bars' || props.mode === 'line' || (TV_BARS_PATTERN_MODES as readonly unknown[]).includes(props.mode)) this.mode = props.mode as BarsPattern['mode'];
        // a mode remembered from one of ours (candles, bars, line) is TradingView's HL bars on its look
        if (this.tv && this.mode && !(TV_BARS_PATTERN_MODES as readonly string[]).includes(this.mode)) this.mode = 'hl';
        if (typeof props.mirrored === 'boolean') this.mirrored = props.mirrored;
        if (typeof props.flipped === 'boolean') this.flipped = props.flipped;
    }
}
