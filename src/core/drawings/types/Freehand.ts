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
 * TradingView's brush smoothing (its BrushBasePaneView): every segment split into up to 5 parts of about `t` px, then
 * each point averaged with its `t` neighbours on both sides; the last point stays.
 */
function tvSmooth(pts: Array<[number, number]>, t: number): Array<[number, number]> {
    if (pts.length < 2) return pts;
    const dense: Array<[number, number]> = [pts[0]!];
    for (let i = 1; i < pts.length; i += 1) {
        const [x0, y0] = pts[i - 1]!;
        const [x1, y1] = pts[i]!;
        const len = Math.hypot(x1 - x0, y1 - y0);
        const n = Math.min(5, Math.floor(len / t));
        for (let k = 0; k < n - 1; k += 1) dense.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
        dense.push([x1, y1]);
    }
    const out: Array<[number, number]> = [];
    for (let r = 0; r < dense.length; r += 1) {
        let sx = 0;
        let sy = 0;
        for (let k = 0; k < t; k += 1) {
            const a = dense[Math.max(r - k, 0)]!;
            const b = dense[Math.min(r + k, dense.length - 1)]!;
            sx += a[0] + b[0];
            sy += a[1] + b[1];
        }
        out.push([(0.5 * sx) / t, (0.5 * sy) / t]);
    }
    out.push(dense[dense.length - 1]!);
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
    /** Smoothing: TradingView's window (`tv` strokes, 5 by default) or, on strokes saved before, 0 (as drawn) to 4
     *  Chaikin passes. */
    smooth!: number;
    /** TradingView's brush (new strokes): its smoothing, line ends, Background switch and end markers. */
    tv?: boolean;
    /** TradingView's Background switch (`tv` strokes; older ones fill whenever they have a fill color). */
    fillBackground?: boolean;

    /** The stroke in pixels, smoothed as set. */
    protected strokePixels(proj: Projector): Array<[number, number]> | null {
        let pts: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return null;
            pts.push([proj.xOf(a.time), y]);
        }
        if (this.tv) return tvSmooth(pts, Math.max(1, Math.round(this.smooth ?? 5)));
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
        const filled = this.tv ? this.fillBackground === true : true;
        return { segments, fill: filled && this.style.fillColor ? pts : null };
    }

    /** The stroke's two ends with the point before each (for TradingView's line-end arrows), or null. */
    strokeEnds(proj: Projector): { start: [[number, number], [number, number]]; end: [[number, number], [number, number]] } | null {
        const pts = this.strokePixels(proj);
        if (!pts || pts.length < 2) return null;
        // A few points in, so a jitter at the very tip does not turn the arrow sideways.
        const k = Math.min(pts.length - 1, 3);
        return { start: [pts[k]!, pts[0]!], end: [pts[pts.length - 1 - k]!, pts[pts.length - 1]!] };
    }

    /** TradingView marks a selected brush's first and last points (not draggable). */
    override selectionMarkers(proj: Projector): Array<[number, number]> {
        if (!this.tv) return [];
        const pts = this.strokePixels(proj);
        return pts && pts.length ? [pts[0]!, pts[pts.length - 1]!] : [];
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        if (this.tv) return { tv: true, smooth: this.smooth, fillBackground: this.fillBackground === true };
        return this.smooth ? { smooth: this.smooth } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv === true) this.tv = true;
        if (typeof props.fillBackground === 'boolean') this.fillBackground = props.fillBackground;
        if (typeof props.smooth === 'number' && Number.isFinite(props.smooth)) {
            this.smooth = this.tv ? Math.min(50, Math.max(1, Math.round(props.smooth))) : Math.min(MAX_SMOOTH, Math.max(0, Math.round(props.smooth)));
        }
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

/**
 * A freehand brush stroke. New ones are TradingView's (factory defaults read from its code 2026-10-30): sky blue, 2 px,
 * smoothing 5, plain ends (arrows on request), its fill switched off; the dialog has only Line (color, thickness, the
 * two ends) and Background. Strokes saved before keep their look and Smoothing row.
 */
export class Freehand extends BrushStroke {
    readonly type = 'freehand' as const;

    constructor(init: ConstructorParameters<typeof BrushStroke>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.smooth = 5;
            this.fillBackground = false;
        }
    }

    override schema(): SettingsSchema {
        if (this.tv) {
            return {
                fields: [
                    ...LINE_FIELDS.filter((f) => f.path !== 'style.lineStyle'), // TradingView draws a brush solid
                    { path: 'style.arrowLeft', label: 'Left end', kind: 'boolean', group: 'line' },
                    { path: 'style.arrowRight', label: 'Right end', kind: 'boolean', group: 'line' },
                    { path: 'fillBackground', label: 'Background', kind: 'boolean', group: 'fill' },
                    ...FILL_FIELDS,
                ],
            };
        }
        return { fields: [...LINE_FIELDS, { path: 'smooth', label: 'Smoothing', kind: 'number', min: 0, max: MAX_SMOOTH, step: 1, group: 'line' }, ...FILL_FIELDS] };
    }
}
