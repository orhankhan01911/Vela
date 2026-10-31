import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { distToPolyline, handleAt, pointInBox } from '../hittest';
import { formatDuration } from './MeasureBox';
import { TV_LINE_COLOR } from '../style';

export type ForecastStatus = 'success' | 'failure' | 'pending';

/** TradingView's forecast colours (module 861360): blue plates with white text, its green and red badges. */
export const TV_FORECAST = {
    centers: '#202020', // palette-exempt: TradingView's forecast point dots
    text: '#FFFFFF', // palette-exempt: TradingView's white plate text
    success: '#4CAF50', // palette-exempt: TradingView's forecast success green
    failure: '#F23645', // palette-exempt: TradingView's forecast failure red
} as const;

/** The colours a TradingView-look forecast keeps (its dialog's rows). */
const TV_COLOR_KEYS = ['sourceTextColor', 'sourceBackColor', 'sourceStrokeColor', 'targetTextColor', 'targetBackColor', 'targetStrokeColor', 'successTextColor', 'successBackground', 'failureTextColor', 'failureBackground'] as const;
export type ForecastColorKey = (typeof TV_COLOR_KEYS)[number];

/** TradingView's time span: "1d 2h 3m 4s", zero parts left out (its TimeSpanFormatter). */
export function tvTimeSpan(ms: number): string {
    let s = Math.round(Math.abs(ms) / 1000);
    const d = Math.floor(s / 86400);
    s -= d * 86400;
    const h = Math.floor(s / 3600);
    s -= h * 3600;
    const m = Math.floor(s / 60);
    s -= m * 60;
    const out = `${d ? `${d}d ` : ''}${h ? `${h}h ` : ''}${m ? `${m}m ` : ''}${s ? `${s}s ` : ''}`.trim();
    return ms < 0 ? `-${out}` : out;
}

/**
 * TradingView's forecast: a curved path from a source point (price now) to a target (price and time you expect),
 * labelled with the change and how long it takes. Once bars reach the target price by the target time it reads
 * SUCCESS; when the target time passes without that, FAILURE.
 */
export class Forecast extends Drawing {
    readonly type = 'forecast' as const;
    /** TradingView's look (module 861360): a quarter ellipse with an arrow, balloon plates, its own colours. */
    declare tv?: boolean;
    declare sourceTextColor?: string;
    declare sourceBackColor?: string;
    declare sourceStrokeColor?: string;
    declare targetTextColor?: string;
    declare targetBackColor?: string;
    declare targetStrokeColor?: string;
    declare successTextColor?: string;
    declare successBackground?: string;
    declare failureTextColor?: string;
    declare failureBackground?: string;
    /** The plates' transparency, % (TradingView's 10). */
    declare transparency?: number;
    /** Where the painter last drew the plates (for the hit test; not saved). */
    plateRects?: Array<{ x: number; y: number; w: number; h: number }>;

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.style = { ...this.style, lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' };
            this.sourceTextColor = TV_FORECAST.text;
            this.sourceBackColor = TV_LINE_COLOR;
            this.sourceStrokeColor = TV_LINE_COLOR;
            this.targetTextColor = TV_FORECAST.text;
            this.targetBackColor = TV_LINE_COLOR;
            this.targetStrokeColor = TV_LINE_COLOR;
            this.successTextColor = TV_FORECAST.text;
            this.successBackground = TV_FORECAST.success;
            this.failureTextColor = TV_FORECAST.text;
            this.failureBackground = TV_FORECAST.failure;
            this.transparency = 10;
        }
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'source', free: 'both' }, { role: 'target', free: 'both' }] };
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const out: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            out.push([proj.xOf(a.time), y]);
        }
        return out;
    }

    /** The path: a quadratic curve leaving the source level flat and bending into the target. TradingView's look:
     *  a quarter of the ellipse centred under the source at the target's height, through both points. */
    curve(proj: Projector): Array<[number, number]> {
        const pts = this.handlePoints(proj);
        if (pts.length < 2) return pts;
        const [x1, y1] = pts[0]!;
        const [x2, y2] = pts[1]!;
        if (this.tv) {
            const rx = Math.abs(x2 - x1);
            const ry = Math.abs(y2 - y1);
            const out: Array<[number, number]> = [];
            for (let i = 0; i <= 32; i += 1) {
                const t = ((i / 32) * Math.PI) / 2;
                // from the source (straight below or above the centre) round to the target (level with it)
                out.push([x1 + Math.sign(x2 - x1) * rx * Math.sin(t), y2 + Math.sign(y1 - y2) * ry * Math.cos(t)]);
            }
            return out;
        }
        const cx = x1 + (x2 - x1) * 0.6;
        const out: Array<[number, number]> = [];
        for (let i = 0; i <= 32; i += 1) {
            const t = i / 32;
            const u = 1 - t;
            out.push([u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * y1 + t * t * y2]);
        }
        return out;
    }

    /** Whether price reached the target by the target time (from the bars between them). TradingView's look reads
     *  the target's bar alone: its high (low for a fall) reaching the target is a success, any other closed bar a
     *  failure, a bar still forming or not there yet is waiting. */
    status(proj: Projector): ForecastStatus {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (this.tv) {
            if (!a || !b) return 'pending';
            const x = proj.xOf(b.time);
            const t0 = proj.pxToPoint(x - 6, 0, this.paneId).time;
            const t1 = proj.pxToPoint(x + 6, 0, this.paneId).time;
            const near = proj.barsInRange?.(Math.min(t0, t1, b.time), Math.max(t0, t1, b.time)) ?? [];
            const bar = near.reduce<(typeof near)[number] | undefined>((best, k) => (!best || Math.abs(k.time - b.time) < Math.abs(best.time - b.time) ? k : best), undefined);
            if (!bar) return 'pending';
            if (b.price > a.price ? bar.high >= b.price : bar.low <= b.price) return 'success';
            const later = proj.barsInRange?.(bar.time + 1, Number.MAX_SAFE_INTEGER) ?? [];
            return later.length > 0 ? 'failure' : 'pending';
        }
        if (!a || !b || b.time <= a.time) return 'pending';
        const bars = proj.barsInRange?.(a.time, b.time) ?? [];
        const up = b.price >= a.price;
        if (bars.some((bar) => (up ? bar.high >= b.price : bar.low <= b.price))) return 'success';
        const last = proj.barsInRange?.(b.time, Number.MAX_SAFE_INTEGER) ?? [];
        return last.length > 0 ? 'failure' : 'pending';
    }

    /** The target's label: the change, its percent and the time it takes. */
    changeLabel(): string {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return '';
        const d = b.price - a.price;
        const pct = a.price ? (d / a.price) * 100 : 0;
        const dp = Math.abs(a.price) >= 10 ? 2 : 4;
        return `${d >= 0 ? '' : '−'}${Math.abs(d).toFixed(dp)} (${Math.abs(pct).toFixed(2)}%) in ${formatDuration(b.time - a.time)}`;
    }

    /** TradingView's target text: the change and its percent, then "in" and the time it takes. */
    tvChange(fmt: (price: number) => string): { change: string; span: string } {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return { change: '', span: '' };
        const d = b.price - a.price;
        const pct = a.price ? (d / Math.abs(a.price)) * 100 : 0;
        return { change: `${d < 0 ? '−' : ''}${fmt(Math.abs(d))} (${pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(2)}%)`, span: `in ${tvTimeSpan(b.time - a.time)}` };
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const c = this.curve(proj);
        if (c.length >= 2 && distToPolyline(px, py, c) <= tol) return true;
        if (this.tv) return (this.plateRects ?? []).some((r) => pointInBox(px, py, r.x, r.y, r.x + r.w, r.y + r.h, tol));
        const t = this.handlePoints(proj)[1];
        return !!t && pointInBox(px, py, t[0] - 90, t[1] - 52, t[0] + 90, t[1] - 4, tol); // the target's plates
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const pts = this.handlePoints(proj);
        if (pts.length < 2) return null;
        const x = Math.min(pts[0]![0], pts[1]![0]);
        const y = Math.min(pts[0]![1], pts[1]![1]);
        return { x, y, w: Math.abs(pts[1]![0] - pts[0]![0]), h: Math.abs(pts[1]![1] - pts[0]![1]) };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS] };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        if (!this.tv) return undefined;
        const out: Record<string, unknown> = { tv: true, transparency: this.transparency ?? 10 };
        for (const k of TV_COLOR_KEYS) out[k] = this[k];
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        this.tv = true;
        for (const k of TV_COLOR_KEYS) if (typeof props[k] === 'string') this[k] = props[k] as string;
        if (typeof props.transparency === 'number' && Number.isFinite(props.transparency)) this.transparency = Math.min(100, Math.max(0, props.transparency));
    }
}
