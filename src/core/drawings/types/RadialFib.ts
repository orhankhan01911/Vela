import type { Projector } from '../geometry';
import type { FibEntryLine, FibLevel } from './FibRatios';
import { FibRatios } from './FibRatios';
import { distToSegment } from '../hittest';

/** Center + base pixel radius + the arc sweep [a0, a1] shared by every concentric-ring fib tool. */
export interface RadialGeom {
    cx: number;
    cy: number;
    R0: number;
    a0: number;
    a1: number;
    /** Vertical radius ÷ horizontal radius (an ellipse); absent ⇒ 1, a circle. */
    sy?: number;
    /** Which way the second point lies vertically (1 below, −1 above, 0 level), where a tool's labels follow it. */
    dir?: number;
}

/** True if a cursor angle falls within the arc sweep [a0, a1] (a0 ≤ a1, going clockwise on canvas). */
export function angleInSweep(ang: number, a0: number, a1: number): boolean {
    if (a1 - a0 >= Math.PI * 2 - 1e-3) return true; // full circle
    let d = ang - a0;
    const TWO_PI = Math.PI * 2;
    while (d < 0) d += TWO_PI;
    while (d >= TWO_PI) d -= TWO_PI;
    return d <= a1 - a0 + 1e-6;
}

/**
 * Shared base for the concentric-ring Fibonacci tools (circles, arcs, wedge). Each is the
 * Circle-style hybrid: a data-anchored center with PIXEL-space radii (`R0 · ratio`). Subclasses
 * supply {@link radial} (center + base radius + angular sweep) and any {@link boundingLines};
 * the painter draws each enabled level as `ctx.arc(cx, cy, R0·ratio, a0, a1)`.
 */
export abstract class RadialFib extends FibRatios {
    /** TradingView's look (new drawings of a tool that has one): per-level lines, bands, a trend line, its labels. */
    declare tv?: boolean;
    declare background?: boolean;
    declare fillOpacity?: number;
    declare showLevels?: boolean;
    declare levelsAsPercent?: boolean;
    declare trendline?: boolean;
    declare trendColor?: string;
    declare trendWidth?: number;
    declare trendStyle?: 'solid' | 'dashed' | 'dotted';

    constructor(init: ConstructorParameters<typeof FibRatios>[0]) {
        super(init);
        if (!init.props && this.applyTvDefaults()) this.tv = true;
    }

    /** Set TradingView's factory defaults on a new drawing; false when the tool has no TradingView look yet. */
    protected applyTvDefaults(): boolean {
        return false;
    }

    /** TradingView's shared ring look (circles, arcs; modules 289525 and 492327): these levels, bands on at 80 %
     *  transparency, numbers shown, a dashed grey 2 px trend line. */
    protected applyTvRingLook(levels: readonly FibLevel[], trendColor: string): void {
        this.levels = levels.map((l) => ({ ...l }));
        this.style = { ...this.style, lineWidth: 2, lineStyle: 'solid' };
        this.background = true;
        this.fillOpacity = 0.2;
        this.showLevels = true;
        this.levelsAsPercent = false;
        this.trendline = true;
        this.trendColor = trendColor;
        this.trendWidth = 2;
        this.trendStyle = 'dashed';
    }

    /** Center, base pixel radius, and the arc sweep — null until enough anchors are placed. */
    abstract radial(proj: Projector): RadialGeom | null;

    /** Where a level's number goes on its ring of horizontal radius `r` (the old look: just past the sweep's middle). */
    ringLabel(g: RadialGeom, r: number): { x: number; y: number; align: 'left' | 'right' | 'center' } {
        const mid = (g.a0 + g.a1) / 2;
        return { x: g.cx + Math.cos(mid) * r + 3, y: g.cy + Math.sin(mid) * r * (g.sy ?? 1), align: 'left' };
    }

    /** A level's number: its coefficient, or TradingView's percent (61.80%); empty with Levels off. */
    ringText(ratio: number): string {
        if (this.tv && this.showLevels === false) return '';
        return this.tv && this.levelsAsPercent ? `${(ratio * 100).toFixed(2)}%` : String(ratio);
    }

    /** The trend line between the two points (TradingView-look drawings with it on), in pixels. */
    trendSegment(proj: Projector): [number, number, number, number] | null {
        if (!this.tv || this.trendline === false) return null;
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const ay = proj.yOf(a.price, this.paneId);
        const by = proj.yOf(b.price, this.paneId);
        if (ay == null || by == null) return null;
        return [proj.xOf(a.time), ay, proj.xOf(b.time), by];
    }

    /** Straight lines drawn alongside the rings (baseline / wedge rays); previewed before `radial` resolves. */
    boundingLines(_proj: Projector): Array<[number, number, number, number]> {
        return [];
    }

    // Ring tools hit-test by radius, not line segments → entryLines is unused (the painter dispatches
    // them to the arc branch). Satisfy the abstract with an empty set.
    entryLines(_proj: Projector): FibEntryLine[] | null {
        return [];
    }

    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const g = this.radial(proj);
        if (g) {
            // On an ellipse, measure in the circle it is squashed from (close enough for a few px of tolerance).
            const sy = g.sy && g.sy > 1e-6 ? g.sy : 1;
            const dy = (py - g.cy) / sy;
            const dist = Math.hypot(px - g.cx, dy);
            const ang = Math.atan2(dy, px - g.cx);
            if (angleInSweep(ang, g.a0, g.a1)) {
                for (const lv of this.levels) {
                    if (lv.enabled && Math.abs(dist - g.R0 * lv.ratio) <= tol / Math.min(1, sy)) return true;
                }
            }
        }
        return this.boundingLines(proj).some((b) => distToSegment(px, py, b[0], b[1], b[2], b[3]) <= tol);
    }

    protected override writeProps(): Record<string, unknown> {
        const out = super.writeProps();
        if (this.tv) {
            Object.assign(out, {
                tv: true,
                background: this.background === true,
                fillOpacity: this.fillOpacity,
                showLevels: this.showLevels !== false,
                levelsAsPercent: this.levelsAsPercent === true,
                trendline: this.trendline !== false,
                trendColor: this.trendColor,
                trendWidth: this.trendWidth,
                trendStyle: this.trendStyle,
            });
        }
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (props.tv === true) this.tv = true;
        for (const k of ['background', 'showLevels', 'levelsAsPercent', 'trendline'] as const) if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        if (typeof props.fillOpacity === 'number' && Number.isFinite(props.fillOpacity)) this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
        if (typeof props.trendColor === 'string') this.trendColor = props.trendColor;
        if (typeof props.trendWidth === 'number' && Number.isFinite(props.trendWidth)) this.trendWidth = Math.min(10, Math.max(1, props.trendWidth));
        if (props.trendStyle === 'solid' || props.trendStyle === 'dashed' || props.trendStyle === 'dotted') this.trendStyle = props.trendStyle;
        // TradingView's levels each carry their own line; ones remembered from the old look get its 2 px solid.
        if (this.tv) this.levels = this.levels.map((l) => ({ ...l, lineWidth: l.lineWidth ?? 2, lineStyle: l.lineStyle ?? 'solid' }));
    }

    priceRange(): { min: number; max: number } | null {
        if (this.anchors.length === 0) return null;
        const ps = this.anchors.map((a) => a.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }
}
