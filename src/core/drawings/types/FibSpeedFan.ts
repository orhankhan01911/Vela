import type { Projector } from '../geometry';
import { extendRay } from '../hittest';
import { FibRatios, sanitizeLevel, type FibEntryLine, type FibLevel } from './FibRatios';
import { timeBetween } from '../futureAnchors';
import { fibLevels } from '../levelPalette';

// TradingView's factory colours (module 32895, colour names from module 872966).
const TV_GRAY = '#808080'; // palette-exempt: TradingView's cold-gray-500
const TV_ORANGE = '#FF9800'; // palette-exempt: TradingView's tan-orange-500
const TV_CYAN = '#00bcd4'; // palette-exempt: TradingView's sky-blue-500
const TV_GREEN = '#4caf50'; // palette-exempt: TradingView's iguana-green-500
const TV_TEAL = '#089981'; // palette-exempt: TradingView's minty-green-500
const TV_BLUE = '#2962FF'; // palette-exempt: TradingView's tv-blue-500
/** TradingView's grid colour for the speed fan (its own rgba, module 32895). */
export const TV_SPEED_FAN_GRID = 'rgba(21, 56, 153, 0.8)'; // palette-exempt: TradingView's speed fan grid

/** TradingView's 7 price and 7 time levels (the same list for both), all shown. */
export const TV_SPEED_FAN_LEVELS: readonly FibLevel[] = (
    [[0, TV_GRAY], [0.25, TV_ORANGE], [0.382, TV_CYAN], [0.5, TV_GREEN], [0.618, TV_TEAL], [0.75, TV_BLUE], [1, TV_GRAY]] as const
).map(([ratio, color]) => ({ ratio, color, enabled: true }));

const FAR = (proj: Projector): number => 4 * (proj.width + proj.height);

const FAN_LEVELS = fibLevels([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);

/**
 * A Fibonacci speed/resistance fan: from the pivot (p1), each level emits TWO rays that
 * subdivide the edges of the p1→p2 box — a price ray to (full width, ratio·height) and a
 * time ray to (ratio·width, full height) — both extended to the chart edge. Purely pixel-
 * space subdivision of the box (it tracks the box on zoom), matching the reference.
 */
export class FibSpeedFan extends FibRatios {
    readonly type = 'fibspeedfan' as const;

    /** TradingView's look (module 32895), new fans only: price levels (`levels`) and time levels, rays from the first
     *  point through each, wedge bands, the grid in the two points' box, labels on four sides, Reverse. */
    declare tv?: boolean;
    declare timeLevels?: FibLevel[];
    declare background?: boolean;
    declare fillOpacity?: number;
    declare grid?: boolean;
    declare gridColor?: string;
    declare gridWidth?: number;
    declare gridStyle?: 'solid' | 'dashed' | 'dotted';
    declare showLeftLabels?: boolean;
    declare showRightLabels?: boolean;
    declare showTopLabels?: boolean;
    declare showBottomLabels?: boolean;
    declare reverse?: boolean;
    declare fontSize?: number;

    constructor(init: ConstructorParameters<typeof FibRatios>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.levels = TV_SPEED_FAN_LEVELS.map((l) => ({ ...l }));
            this.timeLevels = TV_SPEED_FAN_LEVELS.map((l) => ({ ...l }));
            this.style = { ...this.style, lineWidth: 2, lineStyle: 'solid' };
            this.background = true;
            this.fillOpacity = 0.2;
            this.grid = true;
            this.gridColor = TV_SPEED_FAN_GRID;
            this.gridWidth = 1;
            this.gridStyle = 'solid';
            this.showLeftLabels = true;
            this.showRightLabels = true;
            this.showTopLabels = true;
            this.showBottomLabels = true;
            this.reverse = false;
            this.fontSize = 12;
        }
    }

    /** TradingView's levels in pixels: each shown price level's y and time level's x (module 32895: level 0 on the
     *  second point, 1 on the first; Reverse swaps them), the box and the rays' origin (always the first point). */
    private tvGeometry(proj: Projector): {
        ax: number; ay: number; minX: number; maxX: number; minY: number; maxY: number; bx: number; by: number;
        price: Array<{ lv: FibLevel; y: number }>; time: Array<{ lv: FibLevel; x: number }>;
    } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const ay = proj.yOf(a.price, this.paneId);
        const by = proj.yOf(b.price, this.paneId);
        if (ay == null || by == null) return null;
        const ax = proj.xOf(a.time);
        const bx = proj.xOf(b.time);
        const [p0, p1] = this.reverse ? [a, b] : [b, a];
        const price: Array<{ lv: FibLevel; y: number }> = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            const y = proj.yOf(p0.price + lv.ratio * (p1.price - p0.price), this.paneId);
            if (y != null) price.push({ lv, y });
        }
        const time = (this.timeLevels ?? []).filter((lv) => lv.enabled).map((lv) => ({ lv, x: proj.xOf(timeBetween(proj, p0.time, p1.time, lv.ratio)) }));
        return { ax, ay, bx, by, minX: Math.min(ax, bx), maxX: Math.max(ax, bx), minY: Math.min(ay, by), maxY: Math.max(ay, by), price, time };
    }

    /** A ray from (ax, ay) through (x, y), carried far past the chart (the canvas clips it). */
    private far(proj: Projector, ax: number, ay: number, x: number, y: number): [number, number] {
        const len = Math.hypot(x - ax, y - ay);
        if (len < 1e-9) return [x, y];
        const k = FAR(proj) / len;
        return [ax + (x - ax) * k, ay + (y - ay) * k];
    }

    override fillPolygons(proj: Projector): Array<{ color: string; pts: Array<[number, number]> }> {
        if (!this.tv || this.background === false) return [];
        const g = this.tvGeometry(proj);
        if (!g) return [];
        const out: Array<{ color: string; pts: Array<[number, number]> }> = [];
        const wedges = (pts: Array<{ color: string; x: number; y: number }>): void => {
            for (let i = 1; i < pts.length; i += 1) {
                const p = pts[i - 1]!;
                const q = pts[i]!;
                out.push({ color: q.color, pts: [[g.ax, g.ay], this.far(proj, g.ax, g.ay, q.x, q.y), this.far(proj, g.ax, g.ay, p.x, p.y)] });
            }
        };
        wedges(g.price.map((p) => ({ color: p.lv.color, x: g.bx, y: p.y })));
        wedges(g.time.map((t) => ({ color: t.lv.color, x: t.x, y: g.by })));
        return out;
    }

    defaultLevels(): readonly FibLevel[] {
        return FAN_LEVELS;
    }

    entryLines(proj: Projector): FibEntryLine[] | null {
        if (this.tv) return this.tvEntryLines(proj);
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const y1 = proj.yOf(a.price, this.paneId);
        const y2 = proj.yOf(b.price, this.paneId);
        if (y1 == null || y2 == null) return null;
        const x1 = proj.xOf(a.time);
        const x2 = proj.xOf(b.time);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dir = dx >= 0 ? 'right' : 'left';
        const w = proj.width;
        const h = proj.height;
        const out: FibEntryLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            // price ray: pivot → (full width, ratio·height) — subdivides the box's right edge
            const pex = x1 + dx;
            const pey = y1 + dy * lv.ratio;
            const pr = extendRay(x1, y1, pex, pey, dir, w, h);
            out.push({
                color: lv.color,
                label: lv.label,
                x1: pr[0],
                y1: pr[1],
                x2: pr[2],
                y2: pr[3],
                numberText: String(lv.ratio),
                numberX: dir === 'right' ? pex + 5 : pex - 5,
                numberY: pey,
                numberAlign: dir === 'right' ? 'left' : 'right',
                labelX: pex,
                labelY: pey,
            });
            if (lv.ratio === 1) continue; // the time ray at ratio 1 is the same diagonal as the price ray
            // time ray: pivot → (ratio·width, full height) — subdivides the box's bottom edge
            const tex = x1 + dx * lv.ratio;
            const tey = y1 + dy;
            const tr = extendRay(x1, y1, tex, tey, dir, w, h);
            out.push({
                color: lv.color,
                label: lv.label,
                x1: tr[0],
                y1: tr[1],
                x2: tr[2],
                y2: tr[3],
                numberText: String(lv.ratio),
                numberX: tex,
                numberY: tey + (dy >= 0 ? 12 : -12),
                numberAlign: 'center',
                labelX: tex,
                labelY: tey + 12,
            });
        }
        return out;
    }

    /** TradingView's lines: per level a grid line in the box (its labels at the box's sides, 5 px out, in the level's
     *  colour) and a ray from the first point (the drawing's width and style). */
    private tvEntryLines(proj: Projector): FibEntryLine[] | null {
        const g = this.tvGeometry(proj);
        if (!g) return null;
        const fs = this.fontSize ?? 12;
        const fmt = (r: number): string => String(r);
        const grid = { strokeColor: this.gridColor || TV_SPEED_FAN_GRID, lineWidth: this.gridWidth ?? 1, lineStyle: this.gridStyle ?? 'solid', noStroke: this.grid === false };
        const out: FibEntryLine[] = [];
        for (const { lv, y } of g.price) {
            out.push({
                color: lv.color,
                ...grid,
                x1: g.minX,
                y1: y,
                x2: g.maxX,
                y2: y,
                numberText: this.showLeftLabels === false ? '' : fmt(lv.ratio),
                numberX: g.minX - 5,
                numberY: y,
                numberAlign: 'right',
                ...(this.showRightLabels === false ? {} : { label: fmt(lv.ratio) }),
                labelX: g.maxX + 5,
                labelY: y,
                labelAlign: 'left',
            });
        }
        for (const { lv, x } of g.time) {
            out.push({
                color: lv.color,
                ...grid,
                x1: x,
                y1: g.minY,
                x2: x,
                y2: g.maxY,
                numberText: this.showTopLabels === false ? '' : fmt(lv.ratio),
                numberX: x,
                numberY: g.minY - 5 - fs / 2,
                numberAlign: 'center',
                ...(this.showBottomLabels === false ? {} : { label: fmt(lv.ratio) }),
                labelX: x,
                labelY: g.maxY + 5 + fs / 2,
                labelAlign: 'center',
            });
        }
        const ray = (lv: FibLevel, x: number, y: number): void => {
            const [fx, fy] = this.far(proj, g.ax, g.ay, x, y);
            out.push({ color: lv.color, x1: g.ax, y1: g.ay, x2: fx, y2: fy, numberText: '', numberX: 0, numberY: 0, numberAlign: 'left', labelX: 0, labelY: 0 });
        };
        for (const { lv, y } of g.price) ray(lv, g.bx, y);
        for (const { lv, x } of g.time) ray(lv, x, g.by);
        return out;
    }

    protected override writeProps(): Record<string, unknown> {
        const out = super.writeProps();
        if (this.tv) {
            Object.assign(out, {
                tv: true,
                timeLevels: (this.timeLevels ?? []).map((l) => ({ ...l })),
                background: this.background !== false,
                fillOpacity: this.fillOpacity,
                grid: this.grid !== false,
                gridColor: this.gridColor,
                gridWidth: this.gridWidth,
                gridStyle: this.gridStyle,
                showLeftLabels: this.showLeftLabels !== false,
                showRightLabels: this.showRightLabels !== false,
                showTopLabels: this.showTopLabels !== false,
                showBottomLabels: this.showBottomLabels !== false,
                reverse: this.reverse === true,
                fontSize: this.fontSize,
            });
        }
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (props.tv === true) this.tv = true;
        if (Array.isArray(props.timeLevels)) {
            const parsed = props.timeLevels.map(sanitizeLevel).filter((l): l is FibLevel => l != null);
            if (parsed.length) this.timeLevels = parsed;
        }
        for (const k of ['background', 'grid', 'showLeftLabels', 'showRightLabels', 'showTopLabels', 'showBottomLabels', 'reverse'] as const) {
            if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        }
        if (typeof props.fillOpacity === 'number' && Number.isFinite(props.fillOpacity)) this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
        if (typeof props.gridColor === 'string') this.gridColor = props.gridColor;
        if (typeof props.gridWidth === 'number' && Number.isFinite(props.gridWidth)) this.gridWidth = Math.min(10, Math.max(1, props.gridWidth));
        if (props.gridStyle === 'solid' || props.gridStyle === 'dashed' || props.gridStyle === 'dotted') this.gridStyle = props.gridStyle;
        if (typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
        // A TradingView-look fan remembered without its time levels gets TradingView's.
        if (this.tv && !this.timeLevels) this.timeLevels = TV_SPEED_FAN_LEVELS.map((l) => ({ ...l }));
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
    }
}
