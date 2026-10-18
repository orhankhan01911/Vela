import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS } from '../schema';
import { PathDrawing } from './PathDrawing';

/** Most smoothing passes (each Chaikin pass doubles the points). */
const MAX_SMOOTH = 4;

/** One Chaikin pass: every corner cut at a quarter and three quarters of its sides; the ends stay put. */
function chaikin(pts: Array<[number, number]>): Array<[number, number]> {
    if (pts.length < 3) return pts;
    const out: Array<[number, number]> = [pts[0]!];
    for (let i = 0; i < pts.length - 1; i += 1) {
        const [x0, y0] = pts[i]!;
        const [x1, y1] = pts[i + 1]!;
        out.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    out.push(pts[pts.length - 1]!);
    return out;
}

/**
 * Shared base for captured freehand strokes (brush, highlighter): press, drag to
 * capture the sampled path, release to finish. A stroke has too many points to edit
 * per-vertex, so it shows no handles and moves as a whole (its bounds come from the
 * captured path, for the settings-popup anchor). Subclasses set `type` (+ any style
 * schema); the placement/handle/bounds behavior is identical across them.
 */
export abstract class BrushStroke extends PathDrawing {
    // `!` (no initializer): the base constructor runs readProps first. Absent ⇒ 0 (strokes saved before keep their look).
    /** TradingView's brush smoothing: 0 (as drawn) to 4 passes. */
    smooth!: number;

    /** The stroke in pixels, smoothed as set. */
    protected strokePixels(proj: Projector): Array<[number, number]> | null {
        let pts: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return null;
            pts.push([proj.xOf(a.time), y]);
        }
        const n = Math.min(MAX_SMOOTH, Math.max(0, Math.round(this.smooth ?? 0)));
        for (let i = 0; i < n && pts.length < 20000; i += 1) pts = chaikin(pts);
        return pts;
    }

    override geometry(proj: Projector): SegmentGeometry | null {
        const pts = this.strokePixels(proj);
        if (!pts || pts.length < 2) return null;
        const segments: Array<[number, number, number, number]> = [];
        for (let i = 1; i < pts.length; i += 1) segments.push([pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1]]);
        // A fill color closes the stroke into a shape (TradingView's brush background).
        return { segments, fill: this.style.fillColor ? pts : null };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return this.smooth ? { smooth: this.smooth } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.smooth === 'number' && Number.isFinite(props.smooth)) this.smooth = Math.min(MAX_SMOOTH, Math.max(0, Math.round(props.smooth)));
    }

    override placementMode(): 'click' | 'freehand' {
        return 'freehand';
    }

    override handlePoints(_proj: Projector): Array<[number, number]> {
        return []; // a captured stroke is moved as a whole, not edited per-point
    }

    override bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const xs: number[] = [];
        const ys: number[] = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) continue;
            xs.push(proj.xOf(a.time));
            ys.push(y);
        }
        if (xs.length === 0) return null;
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
}

/** A freehand brush stroke — a solid, thin captured line in the drawing's color. */
export class Freehand extends BrushStroke {
    readonly type = 'freehand' as const;

    override schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, { path: 'smooth', label: 'Smoothing', kind: 'number', min: 0, max: MAX_SMOOTH, step: 1, group: 'line' }, ...FILL_FIELDS] };
    }
}
