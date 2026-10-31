import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS, LINE_TEXT_ALIGN_FIELDS } from '../schema';
import { LINE_STATS_FIELDS } from './lineStats';
import { TrendLine } from './TrendLine';

/** TradingView's trend angle stats: price range, percent, pips and bars (no time, distance or angle). */
const TV_ANGLE_STATS = new Set(['stats.price', 'stats.percent', 'stats.pips', 'stats.bars', 'stats.position', 'stats.always']);

/**
 * A trend-line segment that shows its inclination (degrees) with a baseline + arc at the start.
 *
 * A new one is TradingView's (module 598177): its trend line (2 px TradingView blue, Extend, Middle point, Price labels,
 * price / percent / pips / bars stats) whose far end keeps its on-screen angle and length from the first point, so it
 * holds its angle through zoom and scroll; a dotted 50 px arc from the horizontal and the angle ("33.69º") beside it.
 * One saved before keeps its look (a segment between its two points, our baseline and arc).
 */
export class TrendAngle extends TrendLine {
    override readonly type = 'trendangle' as const;
    /** TradingView's trend angle: a new one; one saved before keeps its look. */
    declare tv?: boolean;
    /** The on-screen angle (radians, counter-clockwise from the right) and length (px) from the first point. Unset while
     *  it is being placed (the second point then sets them). */
    declare angle?: number;
    declare distance?: number;

    constructor(init: ConstructorParameters<typeof TrendLine>[0]) {
        super(init);
        if (!init.props) this.tv = true;
    }

    /** The angle in degrees, rounded to 0.01 as TradingView shows it; setting it turns the line about its first point. */
    get angleDeg(): number {
        return Math.round(((this.angle ?? 0) * 180) / Math.PI * 100) / 100;
    }
    set angleDeg(v: number) {
        if (!Number.isFinite(v)) return;
        this.angle = ((v % 360) * Math.PI) / 180;
    }

    /** Take the angle and length from the first point to (x, y) on screen. */
    private aimAt(x: number, y: number, proj: Projector): void {
        const a = this.anchors[0];
        const ya = a ? proj.yOf(a.price, this.paneId) : null;
        if (!a || ya == null) return;
        const dx = x - proj.xOf(a.time);
        const dy = y - ya;
        const len = Math.hypot(dx, dy);
        this.distance = len;
        this.angle = len > 0 ? (dy > 0 ? -1 : 1) * Math.acos(dx / len) : 0;
    }

    override onPlaced(proj: Projector): void {
        if (!this.tv) return;
        const p = super.pixels(proj);
        if (p) this.aimAt(p[2], p[3], proj);
    }

    /** TradingView's second handle sets the angle and length (and the stored point, which its alert reads). */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (!this.tv || index !== 1) return false;
        const pt = proj.pxToPoint(x, y, this.paneId);
        if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
        const b = this.anchors[1];
        if (b) this.anchors = [this.anchors[0]!, { ...b, time: pt.time, price: pt.price }];
        this.aimAt(x, y, proj);
        return true;
    }

    /** The segment on screen: the first point, then the far end from the angle and length (TradingView's). */
    protected override pixels(proj: Projector): [number, number, number, number] | null {
        const p = super.pixels(proj);
        if (!p || !this.tv || this.angle == null || this.distance == null) return p;
        return [p[0], p[1], p[0] + Math.cos(this.angle) * this.distance, p[1] - Math.sin(this.angle) * this.distance];
    }

    /** The far end as a chart point (TradingView's stats read it). */
    drawnEnd(proj: Projector): { time: number; price: number } | null {
        const p = this.pixels(proj);
        return p ? proj.pxToPoint(p[2], p[3], this.paneId) : null;
    }

    override schema(): SettingsSchema {
        if (!this.tv) return { fields: [...LINE_FIELDS, ...TEXT_FIELDS, ...LINE_TEXT_ALIGN_FIELDS] };
        return {
            fields: [
                ...LINE_FIELDS,
                { path: 'extendLeft', label: 'Extend left', kind: 'boolean', group: 'behavior' },
                { path: 'extendRight', label: 'Extend right', kind: 'boolean', group: 'behavior' },
                { path: 'showMiddlePoint', label: 'Middle point', kind: 'boolean', group: 'behavior' },
                { path: 'showPriceLabels', label: 'Price labels', kind: 'boolean', group: 'behavior' },
                ...LINE_STATS_FIELDS.filter((f) => TV_ANGLE_STATS.has(f.path)),
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> {
        // One saved before had no props: it keeps none, so it reloads as it was.
        if (!this.tv) return undefined as unknown as Record<string, unknown>;
        return { ...super.writeProps(), tv: true, ...(this.angle != null && this.distance != null ? { angle: this.angle, distance: this.distance } : {}) };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        super.readProps(props);
        this.tv = true;
        if (typeof props.angle === 'number' && Number.isFinite(props.angle)) this.angle = props.angle;
        if (typeof props.distance === 'number' && Number.isFinite(props.distance)) this.distance = props.distance;
    }
}
