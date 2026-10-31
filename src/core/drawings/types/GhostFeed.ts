import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { PathDrawing } from './PathDrawing';
import { timeBetween } from '../futureAnchors';

/** One made-up candle in pixels. */
export interface GhostCandle {
    x: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

/** Most candles one ghost feed draws. */
const MAX_GHOST = 2000;

/** TradingView's ghost feed candle colours (module 28531): mint and pink bodies, green and red borders, grey wicks. */
export const TV_GHOST = {
    up: '#ACE5DC', // palette-exempt: TradingView's minty-green-100 body
    down: '#FAA1A4', // palette-exempt: TradingView's ripe-red-200 body
    borderUp: '#089981', // palette-exempt: TradingView's minty-green-500 border
    borderDown: '#F23645', // palette-exempt: TradingView's ripe-red-500 border
    wick: '#808080', // palette-exempt: TradingView's cold-gray-500 wick
} as const;

/** One made-up bar around the path, in price offsets from the path at its bar. */
type GhostBar = { o: number; h: number; l: number; c: number };

/** Up to how many decimals a price has (0..8): the tick a ghost feed's "minticks" count in. */
function decimalsOf(v: number): number {
    for (let d = 0; d <= 8; d += 1) if (Math.abs(v * 10 ** d - Math.round(v * 10 ** d)) < 1e-6) return d;
    return 8;
}

/**
 * TradingView's ghost feed: click a path of points (double-click to finish) and it draws made-up candles along it,
 * one per chart bar, each opening on the last close, to sketch how price might move.
 */
export class GhostFeed extends PathDrawing {
    readonly type = 'ghostfeed' as const;
    /**
     * TradingView's look (module 28531): random bars around the path, one per chart bar, each its own size: "Avg HL in
     * minticks" (the average high-low, the chart's average when placed) and "Variance" (%). Kept once made (saved
     * with the drawing); a change to either input makes them again. A grey 1 px line joins the points.
     */
    declare tv?: boolean;
    declare averageHL?: number;
    declare variance?: number;
    /** The price step "minticks" count in (read from the chart's prices when placed). */
    declare tick?: number;
    declare upColor?: string;
    declare downColor?: string;
    declare drawBorder?: boolean;
    declare borderUpColor?: string;
    declare borderDownColor?: string;
    declare drawWick?: boolean;
    declare wickColor?: string;
    /** The candles' transparency, % (TradingView's 50). */
    declare transparency?: number;
    /** The bars made per leg (leg i joins point i and i + 1). */
    segments?: GhostBar[][];

    constructor(init: ConstructorParameters<typeof PathDrawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.averageHL = 20;
            this.variance = 50;
            this.upColor = TV_GHOST.up;
            this.downColor = TV_GHOST.down;
            this.drawBorder = true;
            this.borderUpColor = TV_GHOST.borderUp;
            this.borderDownColor = TV_GHOST.borderDown;
            this.drawWick = true;
            this.wickColor = TV_GHOST.wick;
            this.transparency = 50;
            this.segments = [];
        }
    }

    /** TradingView's restore of factory defaults: the average high-low of the chart's bars, in ticks. */
    override onPlaced(proj: Projector): void {
        if (!this.tv) return;
        const bars = proj.barsInRange?.(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) ?? [];
        if (!bars.length) return;
        const recent = bars.slice(-200);
        this.tick = 10 ** -Math.max(...recent.map((b) => Math.max(decimalsOf(b.open), decimalsOf(b.high), decimalsOf(b.low), decimalsOf(b.close))));
        const avg = bars.reduce((sum, b) => sum + (b.high - b.low), 0) / bars.length;
        this.averageHL = Math.max(1, Math.min(50000, Math.round(avg / this.tick)));
        this.segments = [];
        this.tvCandles(proj); // made now, so the saved drawing holds them
    }

    /** One random bar (TradingView's: its middle off the path by up to the variance, its height the average give or
     *  take half the variance, open and close anywhere inside). */
    private makeBar(): GhostBar {
        const e = (this.averageHL ?? 20) * (this.tick ?? 1);
        const t = (this.variance ?? 50) / 100;
        const mid = e * (1 - 2 * Math.random()) * t;
        const range = e * (1 + (0.5 - Math.random()) * t);
        const lo = mid - range / 2;
        return { o: lo + Math.random() * range, h: lo + range, l: lo, c: lo + Math.random() * range };
    }

    /** A change to the inputs makes every bar again (as many as there were). */
    override applySettings(patch: Record<string, unknown>): void {
        super.applySettings(patch);
        if (this.tv && ('averageHL' in patch || 'variance' in patch)) this.segments = (this.segments ?? []).map((seg) => seg.map(() => this.makeBar()));
    }

    /** TradingView's bars in pixels: leg i has one bar per chart bar from its left point (the first leg also its last
     *  bar), on a straight line from point to point, each bar's prices off that line. Missing bars are made as needed. */
    private tvCandles(proj: Projector): GhostCandle[] {
        const out: GhostCandle[] = [];
        this.segments ??= [];
        for (let i = 1; i < this.anchors.length && out.length < MAX_GHOST; i += 1) {
            const p = this.anchors[i - 1]!;
            const q = this.anchors[i]!;
            const n = Math.min(MAX_GHOST, Math.round(Math.abs(proj.barsBetween?.(p.time, q.time) ?? 0)));
            if (n === 0) continue;
            const size = i === 1 ? n : n - 1;
            const seg = (this.segments[i - 1] ??= []);
            while (seg.length < size) seg.push(this.makeBar());
            const [l, r] = p.time <= q.time ? [p, q] : [q, p];
            const yl = proj.yOf(l.price, this.paneId);
            const yr = proj.yOf(r.price, this.paneId);
            if (yl == null || yr == null) continue;
            const dy = size > 1 ? (yr - yl) / (size - 1) : 0;
            for (let k = 0; k < size && out.length < MAX_GHOST; k += 1) {
                const bar = seg[k]!;
                const price = proj.pxToPoint(0, yl + k * dy, this.paneId).price;
                const y = (v: number): number | null => proj.yOf(price + v, this.paneId);
                const o = y(bar.o);
                const h = y(bar.h);
                const lo = y(bar.l);
                const c = y(bar.c);
                if (o == null || h == null || lo == null || c == null) continue;
                out.push({ x: proj.xOf(timeBetween(proj, l.time, r.time, k / n)), open: o, high: h, low: lo, close: c });
            }
        }
        return out;
    }

    /** The candles along the path; wicks a third of a step past the body, alternating so they don't look ruled. */
    ghostCandles(proj: Projector): GhostCandle[] {
        if (this.tv) return this.tvCandles(proj);
        const out: GhostCandle[] = [];
        for (let i = 1; i < this.anchors.length && out.length < MAX_GHOST; i += 1) {
            const a = this.anchors[i - 1]!;
            const b = this.anchors[i]!;
            const n = Math.max(1, Math.min(MAX_GHOST, Math.round(Math.abs(proj.barsBetween?.(a.time, b.time) ?? 1))));
            const dp = (b.price - a.price) / n;
            for (let k = 0; k < n && out.length < MAX_GHOST; k += 1) {
                const o = a.price + dp * k;
                const c = a.price + dp * (k + 1);
                const wick = Math.max(Math.abs(dp) * (k % 2 ? 0.5 : 0.25), Math.abs(b.price - a.price) * 0.01);
                const yo = proj.yOf(o, this.paneId);
                const yc = proj.yOf(c, this.paneId);
                const yh = proj.yOf(Math.max(o, c) + wick, this.paneId);
                const yl = proj.yOf(Math.min(o, c) - wick * (k % 3 ? 0.6 : 1), this.paneId);
                if (yo == null || yc == null || yh == null || yl == null) continue;
                out.push({ x: proj.xOf(timeBetween(proj, a.time, b.time, (k + 1) / n)), open: yo, high: yh, low: yl, close: yc });
            }
        }
        return out;
    }

    override schema(): SettingsSchema {
        return { fields: this.tv ? [] : [...LINE_FIELDS] };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        if (!this.tv) return undefined;
        return {
            tv: true,
            averageHL: this.averageHL,
            variance: this.variance,
            tick: this.tick,
            upColor: this.upColor,
            downColor: this.downColor,
            drawBorder: this.drawBorder !== false,
            borderUpColor: this.borderUpColor,
            borderDownColor: this.borderDownColor,
            drawWick: this.drawWick !== false,
            wickColor: this.wickColor,
            transparency: this.transparency,
            segments: (this.segments ?? []).map((seg) => seg.map((b) => ({ ...b }))),
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        this.tv = true;
        const num = (k: string, lo: number, hi: number): number | undefined => (typeof props[k] === 'number' && Number.isFinite(props[k]) ? Math.min(hi, Math.max(lo, props[k] as number)) : undefined);
        this.averageHL = num('averageHL', 1, 50000) ?? this.averageHL;
        this.variance = num('variance', 1, 100) ?? this.variance;
        this.tick = num('tick', 1e-12, 1e12) ?? this.tick;
        this.transparency = num('transparency', 0, 100) ?? this.transparency;
        for (const k of ['upColor', 'downColor', 'borderUpColor', 'borderDownColor', 'wickColor'] as const) if (typeof props[k] === 'string') this[k] = props[k] as string;
        for (const k of ['drawBorder', 'drawWick'] as const) if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        if (Array.isArray(props.segments)) {
            const ok = (b: unknown): b is GhostBar => !!b && typeof b === 'object' && ['o', 'h', 'l', 'c'].every((k) => Number.isFinite((b as Record<string, unknown>)[k]));
            this.segments = props.segments.slice(0, 512).map((seg) => (Array.isArray(seg) ? seg.filter(ok).slice(0, MAX_GHOST).map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c })) : []));
        }
    }
}
