import { Drawing, type AnchorSlot } from '../Drawing';
import type { DrawingText } from '../style';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { handleAt } from '../hittest';

/**
 * A true circle: a data-pinned center anchor + an edge anchor whose pixel distance from
 * the projected center is the radius. Because the radius is a scalar pixel distance (not
 * separate x/y radii), the shape stays perfectly round at any zoom — unlike the
 * bounding-box {@link Ellipse}, which distorts as the x/y scales diverge.
 */
export class Circle extends Drawing {
    readonly type = 'circle' as const;
    /** TradingView's circle (module 28918): a new one; one saved before keeps its look. */
    declare tv?: boolean;
    /** TradingView's Background switch (the colour is style.fillColor). */
    declare fillBackground?: boolean;

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.fillBackground = true;
        }
    }

    /** TradingView's text: 14 px tan orange, centred in the circle. */
    override textDefaults(): Partial<DrawingText> | undefined {
        return this.tv ? { color: '#FF9800', size: 14, hAlign: 'center', vAlign: 'center' } : undefined; // palette-exempt: TradingView's tan orange 500
    }

    /** Whether the inside is painted (TradingView's Background switch; older circles whenever they have a fill). */
    filled(): boolean {
        return !!this.style.fillColor && (this.tv ? this.fillBackground !== false : true);
    }

    /** The centre and radius in pixels (TradingView's text sits in the square inside it). */
    circle(proj: Projector): { cx: number; cy: number; r: number } | null {
        return this.geom(proj);
    }

    /** TradingView hides the centre handle while the circle shows text (the text moves it): only the edge is left. */
    private textHidesCentre(): boolean {
        return this.tv === true && !!this.text?.value;
    }

    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (!this.textHidesCentre() || index !== 0) return false;
        const pt = proj.pxToPoint(x, y, this.paneId);
        const e = this.anchors[1];
        if (e && Number.isFinite(pt.price) && Number.isFinite(pt.time)) this.anchors = [this.anchors[0]!, { ...e, time: pt.time, price: pt.price }];
        return true;
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return this.tv ? { tv: true, fillBackground: this.fillBackground !== false } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        this.tv = true;
        if (typeof props.fillBackground === 'boolean') this.fillBackground = props.fillBackground;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'center', free: 'both' }, { role: 'edge', free: 'both' }] };
    }

    private geom(proj: Projector): { cx: number; cy: number; r: number } | null {
        const c = this.anchors[0];
        const e = this.anchors[1];
        if (!c || !e) return null;
        const cy = proj.yOf(c.price, this.paneId);
        const ey = proj.yOf(e.price, this.paneId);
        if (cy == null || ey == null) return null;
        const cx = proj.xOf(c.time);
        const ex = proj.xOf(e.time);
        return { cx, cy, r: Math.hypot(ex - cx, ey - cy) };
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const g = this.geom(proj);
        if (!g || g.r < 1) return false;
        const d = Math.hypot(px - g.cx, py - g.cy);
        if (this.filled() && d <= g.r) return true; // inside a filled disc
        return Math.abs(d - g.r) <= tol; // near the ring
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const c = this.anchors[0];
        const e = this.anchors[1];
        if (!c || !e) return [];
        const cy = proj.yOf(c.price, this.paneId);
        const ey = proj.yOf(e.price, this.paneId);
        if (cy == null || ey == null) return [];
        if (this.textHidesCentre()) return [[proj.xOf(e.time), ey]];
        return [[proj.xOf(c.time), cy], [proj.xOf(e.time), ey]];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const g = this.geom(proj);
        if (!g) return null;
        return { x: g.cx - g.r, y: g.cy - g.r, w: g.r * 2, h: g.r * 2 };
    }

    priceRange(): { min: number; max: number } | null {
        const c = this.anchors[0];
        const e = this.anchors[1];
        if (!c || !e) return null;
        return { min: Math.min(c.price, e.price), max: Math.max(c.price, e.price) };
    }

    schema(): SettingsSchema {
        // TradingView's: Border (colour and width), Background, and its text (colour, size, bold, italic; no alignment).
        if (this.tv)
            return {
                fields: [
                    ...LINE_FIELDS.filter((f) => f.path !== 'style.lineStyle').map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })),
                    ...FILL_FIELDS,
                    { path: 'fillBackground', label: 'Background', kind: 'boolean', group: 'fill' },
                    ...TEXT_FIELDS,
                ],
            };
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
    }
}
