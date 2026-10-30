import { type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';
import { timeBetween } from '../futureAnchors';

/** One of the channel's level lines, TradingView's: at `coeff` of the way from the baseline (0) to the parallel line
 *  (1), its own color (unset = the drawing's line color), dash and width. */
export interface ChannelLevel {
    coeff: number;
    visible: boolean;
    color?: string;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    lineWidth: number;
}

/** TradingView's seven levels: 0 and 1 solid 2 px, the middle dashed 1 px, the quarters and the outside ones hidden. */
export function defaultChannelLevels(middleLine = true): ChannelLevel[] {
    return [
        { coeff: -0.25, visible: false, lineStyle: 'solid', lineWidth: 1 },
        { coeff: 0, visible: true, lineStyle: 'solid', lineWidth: 2 },
        { coeff: 0.25, visible: false, lineStyle: 'solid', lineWidth: 1 },
        { coeff: 0.5, visible: middleLine, lineStyle: 'dashed', lineWidth: 1 },
        { coeff: 0.75, visible: false, lineStyle: 'solid', lineWidth: 1 },
        { coeff: 1, visible: true, lineStyle: 'solid', lineWidth: 2 },
        { coeff: 1.25, visible: false, lineStyle: 'solid', lineWidth: 1 },
    ];
}

/**
 * A parallel channel, TradingView's: a baseline through p1→p2, a parallel line at a constant PRICE offset (measured at
 * the baseline midpoint; only the 3rd anchor's price matters), and seven level lines between / around them (0 and 1
 * are the two lines, 0.5 the dashed middle). Handles, as TradingView's: the four corners (round) and a square in the
 * middle of each line; the baseline's ends keep the width, the parallel line's corners and square set the width, the
 * baseline's square moves the baseline alone. It can extend left / right and fill its background.
 */
export class ParallelChannel extends SegmentDrawing {
    readonly type = 'parallelchannel' as const;
    // `!` (no initializer): the base constructor runs readProps first.
    levels!: ChannelLevel[];
    extendLeft!: boolean;
    extendRight!: boolean;
    /** TradingView's Background switch (the color is style.fillColor). Absent ⇒ on. */
    fillBackground!: boolean;

    constructor(init: ConstructorParameters<typeof SegmentDrawing>[0]) {
        super(init);
        if (!this.levels) this.levels = defaultChannelLevels();
    }

    protected override writeProps(): Record<string, unknown> {
        return {
            levels: this.levels.map((l) => ({ ...l })),
            extendLeft: !!this.extendLeft,
            extendRight: !!this.extendRight,
            fillBackground: this.fillBackground !== false,
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (Array.isArray(props.levels)) {
            const base = defaultChannelLevels();
            this.levels = base.map((def, i) => {
                const r = (props.levels as Array<Partial<ChannelLevel>>)[i];
                if (!r || typeof r !== 'object') return def;
                return {
                    coeff: typeof r.coeff === 'number' && Number.isFinite(r.coeff) ? r.coeff : def.coeff,
                    visible: typeof r.visible === 'boolean' ? r.visible : def.visible,
                    ...(typeof r.color === 'string' && r.color ? { color: r.color } : {}),
                    lineStyle: r.lineStyle === 'dashed' || r.lineStyle === 'dotted' || r.lineStyle === 'solid' ? r.lineStyle : def.lineStyle,
                    lineWidth: typeof r.lineWidth === 'number' && r.lineWidth >= 1 ? r.lineWidth : def.lineWidth,
                };
            });
        } else if (typeof props.middleLine === 'boolean') {
            // a channel saved before the levels: its middle line switch becomes the 0.5 level
            this.levels = defaultChannelLevels(props.middleLine);
        }
        if (typeof props.extendLeft === 'boolean') this.extendLeft = props.extendLeft;
        if (typeof props.extendRight === 'boolean') this.extendRight = props.extendRight;
        if (typeof props.fillBackground === 'boolean') this.fillBackground = props.fillBackground;
    }

    /** The floating toolbar's color / width / dash: the color recolors every level, the width and dash restyle the
     *  channel's two lines (levels 0 and 1); the dialog edits each level on its own. */
    override applySettings(patch: Record<string, unknown>): void {
        super.applySettings(patch);
        if (typeof patch['style.lineColor'] === 'string') for (const l of this.levels) delete l.color;
        const main = this.levels.filter((l) => l.coeff === 0 || l.coeff === 1);
        if (typeof patch['style.lineWidth'] === 'number') for (const l of main) l.lineWidth = patch['style.lineWidth'] as number;
        const ls = patch['style.lineStyle'];
        if (ls === 'solid' || ls === 'dashed' || ls === 'dotted') for (const l of main) l.lineStyle = ls;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return {
            min: 3,
            max: 3,
            slots: [
                { role: 'p1', free: 'both' },
                { role: 'p2', free: 'both' },
                { role: 'offset', free: 'y' }, // width only
            ],
        };
    }

    /** Price delta of the parallel line from the baseline, measured at the midpoint. */
    offset(): number {
        const a = this.anchors[0];
        const b = this.anchors[1];
        const c = this.anchors[2];
        if (!a || !b || !c) return 0;
        return c.price - (a.price + b.price) / 2; // baseline price at the midpoint time
    }

    /** Handles, TradingView's: baseline ends, the parallel line's ends, then a square in the middle of each line. */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return [];
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        if (ya == null || yb == null) return [];
        const xa = proj.xOf(a.time);
        const xb = proj.xOf(b.time);
        const pts: Array<[number, number]> = [
            [xa, ya],
            [xb, yb],
        ];
        if (this.anchors[2]) {
            const d = this.offset();
            const ya2 = proj.yOf(a.price + d, this.paneId);
            const yb2 = proj.yOf(b.price + d, this.paneId);
            if (ya2 != null && yb2 != null) {
                const xm = proj.xOf(timeBetween(proj, a.time, b.time, 0.5));
                pts.push([xa, ya2], [xb, yb2], [xm, (ya + yb) / 2], [xm, (ya2 + yb2) / 2]);
            }
        }
        return pts;
    }

    /** TradingView marks the channel's four corners on the axes (both lines' ends), not the middle squares. */
    override axisPoints(): DrawingPoint[] {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return this.anchors;
        const d = this.anchors[2] ? this.offset() : 0;
        return [a, b, { time: a.time, price: a.price + d }, { time: b.time, price: b.price + d }];
    }

    /** TradingView: the corners show the plain arrow, the two middle squares the up-down resize cursor. */
    override handleCursor(index: number): string | null {
        return index === 4 || index === 5 ? 'ns-resize' : null;
    }

    override handleShapes(): ReadonlyArray<'circle' | 'square'> {
        return ['circle', 'circle', 'circle', 'circle', 'square', 'square'];
    }

    /** TradingView's handle moves (see the class doc); the offset anchor's time stays at the baseline midpoint. */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        const a = this.anchors[0];
        const b = this.anchors[1];
        const c = this.anchors[2];
        if (!a || !b || !c) return false;
        const pt = proj.pxToPoint(x, y, this.paneId);
        if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
        const off = this.offset();
        const keepWidth = (): void => {
            c.price = (a.price + b.price) / 2 + off;
            c.time = (a.time + b.time) / 2;
        };
        if (index === 0 || index === 1) {
            this.anchors[index] = { time: pt.time, price: pt.price };
            const na = this.anchors[0]!;
            const nb = this.anchors[1]!;
            c.price = (na.price + nb.price) / 2 + off;
            c.time = (na.time + nb.time) / 2;
            return true;
        }
        if (index === 2 || index === 3) {
            const end = index === 2 ? a : b;
            end.time = pt.time;
            const width = pt.price - end.price;
            c.price = (a.price + b.price) / 2 + width;
            c.time = (a.time + b.time) / 2;
            return true;
        }
        if (index === 4) {
            // the baseline alone, up / down: the parallel line stays where it is
            const dp = pt.price - (a.price + b.price) / 2;
            a.price += dp;
            b.price += dp;
            return true;
        }
        if (index === 5) {
            c.price = pt.price;
            c.time = (a.time + b.time) / 2;
            return true;
        }
        keepWidth();
        return false;
    }

    /** The channel spans the baseline's time only (the offset anchor's time is ignored); an extended side has no end. */
    override timeExtent(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return {
            min: this.extendLeft ? Number.NEGATIVE_INFINITY : Math.min(a.time, b.time),
            max: this.extendRight ? Number.POSITIVE_INFINITY : Math.max(a.time, b.time),
        };
    }

    /** The baseline (level 0) and parallel line (level 1) ends in px, left end first, extended as set; null while placing. */
    lines(proj: Projector): { xa: number; ya: number; xb: number; yb: number; gapA: number; gapB: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const d = this.offset();
        let xa = proj.xOf(a.time);
        let xb = proj.xOf(b.time);
        let ya = proj.yOf(a.price, this.paneId);
        let yb = proj.yOf(b.price, this.paneId);
        const ya2r = proj.yOf(a.price + d, this.paneId);
        const yb2r = proj.yOf(b.price + d, this.paneId);
        if (ya == null || yb == null || ya2r == null || yb2r == null) return null;
        // Pixel gap between the lines at each end (constant price offset → same gap after extending).
        let gapA = ya2r - ya;
        let gapB = yb2r - yb;
        if (xa > xb) [xa, ya, gapA, xb, yb, gapB] = [xb, yb, gapB, xa, ya, gapA]; // left end first
        if (Math.abs(xb - xa) > 1e-6 && (this.extendLeft || this.extendRight)) {
            const slope = (yb - ya) / (xb - xa);
            const gapSlope = (gapB - gapA) / (xb - xa);
            if (this.extendLeft) { ya += (0 - xa) * slope; gapA += (0 - xa) * gapSlope; xa = 0; }
            if (this.extendRight) { yb += (proj.width - xb) * slope; gapB += (proj.width - xb) * gapSlope; xb = proj.width; }
        }
        return { xa, ya, xb, yb, gapA, gapB };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const l = this.lines(proj);
        if (!l) return null;
        const { xa, ya, xb, yb, gapA, gapB } = l;
        const color = this.style.lineColor;
        return {
            segments: [],
            fill:
                this.fillBackground === false
                    ? null
                    : [
                          [xa, ya],
                          [xb, yb],
                          [xb, yb + gapB],
                          [xa, ya + gapA],
                      ],
            colored: this.levels
                .filter((lv) => lv.visible)
                .map((lv) => ({
                    seg: [xa, ya + gapA * lv.coeff, xb, yb + gapB * lv.coeff] as [number, number, number, number],
                    color: lv.color || color,
                    lineStyle: lv.lineStyle,
                    lineWidth: lv.lineWidth,
                })),
        };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const d = this.offset();
        const ks = [0, 1, ...this.levels.filter((l) => l.visible).map((l) => l.coeff)];
        const prices = ks.flatMap((k) => [a.price + d * k, b.price + d * k]);
        return { min: Math.min(...prices), max: Math.max(...prices) };
    }

    schema(): SettingsSchema {
        return {
            fields: [
                ...LINE_FIELDS,
                ...FILL_FIELDS,
                { path: 'extendLeft', label: 'Extend left', kind: 'boolean', group: 'behavior' },
                { path: 'extendRight', label: 'Extend right', kind: 'boolean', group: 'behavior' },
                { path: 'fillBackground', label: 'Background', kind: 'boolean', group: 'fill' },
                ...TEXT_FIELDS,
                {
                    path: 'text.vAlign',
                    label: 'Text vertical position',
                    kind: 'select',
                    options: [{ value: 'top', label: 'Top' }, { value: 'center', label: 'Inside' }, { value: 'bottom', label: 'Bottom' }],
                    group: 'text',
                },
                { path: 'text.hAlign', label: 'Text horizontal position', kind: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], group: 'text' },
            ],
        };
    }
}
