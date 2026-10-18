import { Drawing, type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { pointInBox, handleAt } from '../hittest';

/** One copied bar resolved to pixels. */
export interface PatternBar {
    x: number;
    open: number;
    high: number;
    low: number;
    close: number;
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
    bars!: Array<{ dt: number; o: number; h: number; l: number; c: number }>;
    mode!: 'candles' | 'bars' | 'line';
    mirrored!: boolean;
    flipped!: boolean;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'from', free: 'x' }, { role: 'to', free: 'x' }] };
    }

    /** Copy the bars between the two points; the copy starts on the first bar's open. */
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
        this.anchors[0] = { time: t0, price: base };
        this.anchors[1] = { time: src[src.length - 1]!.time, price: base };
    }

    /** The second point follows the first: the copy keeps its length. */
    override constrainHandleDrag(): void {
        const a = this.anchors[0];
        const last = this.bars?.[this.bars.length - 1];
        if (a && last) this.anchors[1] = { time: a.time + last.dt, price: a.price };
    }

    override translateBody(dt: number, dp: number, orig: DrawingPoint[]): DrawingPoint[] {
        return orig.map((o) => ({ time: o.time + dt, price: o.price + dp }));
    }

    /** The copy in pixels, placed at the first point, mirrored / flipped as set. */
    patternBars(proj: Projector): PatternBar[] {
        const a = this.anchors[0];
        if (!a || !this.bars?.length) return [];
        const span = this.bars[this.bars.length - 1]!.dt;
        const out: PatternBar[] = [];
        for (const bar of this.bars) {
            const s = this.flipped ? -1 : 1;
            const y = (v: number): number | null => proj.yOf(a.price + s * v, this.paneId);
            const o = y(bar.o);
            const h = y(this.flipped ? bar.l : bar.h);
            const l = y(this.flipped ? bar.h : bar.l);
            const c = y(bar.c);
            if (o == null || h == null || l == null || c == null) continue;
            const x = proj.xOf(a.time + (this.mirrored ? span - bar.dt : bar.dt));
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
        if (!a || !this.bars?.length) return null;
        const s = this.flipped ? -1 : 1;
        const vs = this.bars.flatMap((b) => [a.price + s * b.h, a.price + s * b.l]);
        return { min: Math.min(...vs), max: Math.max(...vs) };
    }

    override timeExtent(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const last = this.bars?.[this.bars.length - 1];
        return a ? { min: a.time, max: a.time + (last?.dt ?? 0) } : null;
    }

    schema(): SettingsSchema {
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
        return { bars: (this.bars ?? []).map((b) => ({ ...b })), mode: this.mode ?? 'candles', mirrored: !!this.mirrored, flipped: !!this.flipped };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (Array.isArray(props.bars)) {
            this.bars = props.bars
                .filter((b): b is { dt: number; o: number; h: number; l: number; c: number } => !!b && typeof b === 'object' && ['dt', 'o', 'h', 'l', 'c'].every((k) => Number.isFinite((b as Record<string, unknown>)[k])))
                .slice(0, 5000)
                .map((b) => ({ dt: b.dt, o: b.o, h: b.h, l: b.l, c: b.c }));
        }
        if (props.mode === 'candles' || props.mode === 'bars' || props.mode === 'line') this.mode = props.mode;
        if (typeof props.mirrored === 'boolean') this.mirrored = props.mirrored;
        if (typeof props.flipped === 'boolean') this.flipped = props.flipped;
    }
}
