import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { distToPolyline, handleAt, pointInBox } from '../hittest';
import { formatDuration } from './MeasureBox';

export type ForecastStatus = 'success' | 'failure' | 'pending';

/**
 * TradingView's forecast: a curved path from a source point (price now) to a target (price and time you expect),
 * labelled with the change and how long it takes. Once bars reach the target price by the target time it reads
 * SUCCESS; when the target time passes without that, FAILURE.
 */
export class Forecast extends Drawing {
    readonly type = 'forecast' as const;

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

    /** The path: a quadratic curve leaving the source level flat and bending into the target. */
    curve(proj: Projector): Array<[number, number]> {
        const pts = this.handlePoints(proj);
        if (pts.length < 2) return pts;
        const [x1, y1] = pts[0]!;
        const [x2, y2] = pts[1]!;
        const cx = x1 + (x2 - x1) * 0.6;
        const out: Array<[number, number]> = [];
        for (let i = 0; i <= 32; i += 1) {
            const t = i / 32;
            const u = 1 - t;
            out.push([u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * y1 + t * t * y2]);
        }
        return out;
    }

    /** Whether price reached the target by the target time (from the bars between them). */
    status(proj: Projector): ForecastStatus {
        const a = this.anchors[0];
        const b = this.anchors[1];
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

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const c = this.curve(proj);
        if (c.length >= 2 && distToPolyline(px, py, c) <= tol) return true;
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
}
