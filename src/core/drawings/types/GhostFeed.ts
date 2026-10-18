import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { PathDrawing } from './PathDrawing';

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

/**
 * TradingView's ghost feed: click a path of points (double-click to finish) and it draws made-up candles along it,
 * one per chart bar, each opening on the last close, to sketch how price might move.
 */
export class GhostFeed extends PathDrawing {
    readonly type = 'ghostfeed' as const;

    /** The candles along the path; wicks a third of a step past the body, alternating so they don't look ruled. */
    ghostCandles(proj: Projector): GhostCandle[] {
        const out: GhostCandle[] = [];
        for (let i = 1; i < this.anchors.length && out.length < MAX_GHOST; i += 1) {
            const a = this.anchors[i - 1]!;
            const b = this.anchors[i]!;
            const n = Math.max(1, Math.min(MAX_GHOST, Math.round(Math.abs(proj.barsBetween?.(a.time, b.time) ?? 1))));
            const dt = (b.time - a.time) / n;
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
                out.push({ x: proj.xOf(a.time + dt * (k + 1)), open: yo, high: yh, low: yl, close: yc });
            }
        }
        return out;
    }

    override schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS] };
    }
}
