import { Drawing } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsField, SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS } from '../schema';
import { distToSegment, handleAt, pointInPolygon } from '../hittest';

/** How a tool takes TradingView's plain shape look: `area` (Border and Background, filled: triangle, arc), `polyline`
 *  (the same with a line style), `curve` (Line and Background, not filled: curve, double curve), `cycle` (Line and
 *  Background, filled: time cycles), `lines` (one Lines row: cyclic lines, sine line). */
export type TvShapeKind = 'area' | 'polyline' | 'curve' | 'cycle' | 'lines';

/**
 * Shared base for multi-line drawings (channels, pitchfork). The line math lives in
 * one place — the abstract {@link geometry} (pixel segments + optional fill) — and
 * hit-testing, handle positions, and bounds all derive from it + the anchors.
 * Subclasses supply `type`, `anchorSchema`, `geometry`, `priceRange`, and `schema`.
 */
export abstract class SegmentDrawing extends Drawing {
    /** TradingView's plain shape look (triangle, polyline, arc, curve, double curve; a new one): no text, a Background
     *  switch. One saved before keeps its look. */
    declare tv?: boolean;
    declare fillBackground?: boolean;

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        const kind = this.tvShapeKind();
        if (kind && !init.props) {
            this.tv = true;
            this.fillBackground = kind !== 'curve' && kind !== 'lines';
        }
    }

    /** The tool's TradingView shape look (null: the tool keeps its own props and look). */
    tvShapeKind(): TvShapeKind | null {
        return null;
    }

    /** Whether the fill is painted (a TradingView shape's Background switch; others whenever they have a fill). */
    fillShown(): boolean {
        return !!this.style.fillColor && !(this.tvShapeKind() && this.tv && this.fillBackground === false);
    }

    /** TradingView's settings for its plain shapes: Border (colour, width; a polyline's style too) or a curve's Line,
     *  and Background. No text. */
    protected tvShapeSchema(): SettingsSchema {
        const kind = this.tvShapeKind();
        const line: SettingsField[] = LINE_FIELDS.filter((f) => kind !== 'area' || f.path !== 'style.lineStyle');
        if (kind === 'lines') return { fields: line };
        return {
            fields: [
                ...(kind === 'curve' || kind === 'cycle' ? line : line.map((f) => ({ ...f, label: f.label.replace('Line', 'Border') }))),
                ...FILL_FIELDS,
                { path: 'fillBackground', label: 'Background', kind: 'boolean', group: 'fill' },
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return this.tvShapeKind() && this.tv ? { tv: true, fillBackground: this.fillBackground === true } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (!this.tvShapeKind() || props.tv !== true) return;
        this.tv = true;
        if (typeof props.fillBackground === 'boolean') this.fillBackground = props.fillBackground;
    }

    /** Pixel line segments + optional fill polygon (consumed by hit-test AND the painter). */
    abstract geometry(proj: Projector): SegmentGeometry | null;

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const g = this.geometry(proj);
        if (!g) return false;
        if (this.fillShown() && g.fill && pointInPolygon(px, py, g.fill)) return true;
        if (g.colored?.some(({ seg: s }) => distToSegment(px, py, s[0], s[1], s[2], s[3]) <= tol)) return true;
        return g.segments.some((s) => distToSegment(px, py, s[0], s[1], s[2], s[3]) <= tol);
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const pts: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            pts.push([proj.xOf(a.time), y]);
        }
        return pts;
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const pts = this.handlePoints(proj);
        if (pts.length === 0) return null;
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
}
