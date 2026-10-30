import { Drawing, type AnchorSlot } from '../Drawing';
import type { DrawingText } from '../style';
import type { Projector } from '../geometry';
import type { SettingsField, SettingsSchema } from '../schema';
import { LINE_FIELDS, LINE_TEXT_ALIGN_FIELDS, TEXT_FIELDS } from '../schema';
import type { LineStyle } from '../../model/series';
import { distToSegment, handleAt, pointInBox } from '../hittest';

const isLineStyle = (v: unknown): v is LineStyle => v === 'solid' || v === 'dashed' || v === 'dotted';

/** TradingView's rectangle purple (grapes purple 500). */
const TV_RECT_COLOR = '#9c27b0'; // palette-exempt: TradingView's rectangle default

/** TradingView's text placement: above the box ("Top"), inside it ("Inside"), below it ("Bottom"). */
const TV_RECT_TEXT_ALIGN: SettingsField[] = [
    { path: 'text.hAlign', label: 'Text horizontal position', kind: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], group: 'text' },
    { path: 'text.vAlign', label: 'Text vertical position', kind: 'select', options: [{ value: 'top', label: 'Top' }, { value: 'center', label: 'Inside' }, { value: 'bottom', label: 'Bottom' }], group: 'text' },
];

/** A rectangle defined by two opposite corners. Optional fill + border; like TradingView's rectangle it can
 *  extend to the left / right edge of the pane and show a dashed middle line. New ones are TradingView's (read from
 *  its code 2026-10-30, module 787889): purple 2 px border, the purple at 20 % as a Background that can be switched
 *  off, the middle line styled on its own, eight handles, text above / inside / below the box. Saved ones keep their
 *  look. */
export class Box extends Drawing {
    readonly type = 'box' as const;
    // `!` (no initializer): the base constructor runs readProps before subclass fields would initialize.
    extendLeft!: boolean;
    extendRight!: boolean;
    middleLine!: boolean;
    /** TradingView's rectangle (new boxes). */
    tv?: boolean;
    /** TradingView's Background switch (`tv` boxes; older ones fill whenever they have a fill color). */
    fillBackground?: boolean;
    /** The middle line's own look (`tv` boxes; older ones draw it dashed 1 px in the border color). */
    middleColor?: string;
    middleWidth?: number;
    middleStyle?: LineStyle;

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.extendLeft = false;
            this.extendRight = false;
            this.middleLine = false;
            this.fillBackground = true;
            this.middleColor = TV_RECT_COLOR;
            this.middleWidth = 1;
            this.middleStyle = 'dashed';
        }
    }

    override textDefaults(): Partial<DrawingText> | undefined {
        return this.tv ? { color: TV_RECT_COLOR, size: 14, hAlign: 'center', vAlign: 'center' } : undefined;
    }

    /** Whether the background is painted. */
    filled(): boolean {
        return !!this.style.fillColor && (this.tv ? this.fillBackground === true : true);
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'c1', free: 'both' }, { role: 'c2', free: 'both' }] };
    }

    private rect(proj: Projector): { x1: number; y1: number; x2: number; y2: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const ya = proj.yOf(a.price, this.paneId);
        const yb = proj.yOf(b.price, this.paneId);
        if (ya == null || yb == null) return null;
        return { x1: proj.xOf(a.time), y1: ya, x2: proj.xOf(b.time), y2: yb };
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const r0 = this.rect(proj);
        const s = this.spanX(proj);
        if (!r0 || !s) return false;
        // An extended side reaches the pane edge, so the grabbable area does too.
        const r = { ...r0, x1: s.x1, x2: s.x2 };
        // A filled box is grabbable anywhere inside; otherwise only near its border.
        if (this.filled() && pointInBox(px, py, r.x1, r.y1, r.x2, r.y2)) return true;
        const edges: Array<[number, number, number, number]> = [
            [r.x1, r.y1, r.x2, r.y1],
            [r.x2, r.y1, r.x2, r.y2],
            [r.x2, r.y2, r.x1, r.y2],
            [r.x1, r.y2, r.x1, r.y1],
        ];
        return edges.some((e) => distToSegment(px, py, e[0], e[1], e[2], e[3]) <= tol);
    }

    /** The two corners; TradingView's box adds the other two corners, then the middle of the left, right, top and
     *  bottom sides (its anchor order). */
    handlePoints(proj: Projector): Array<[number, number]> {
        const r = this.rect(proj);
        if (!r) return [];
        if (!this.tv) return [[r.x1, r.y1], [r.x2, r.y2]];
        const xm = (r.x1 + r.x2) / 2;
        const ym = (r.y1 + r.y2) / 2;
        return [[r.x1, r.y1], [r.x2, r.y2], [r.x1, r.y2], [r.x2, r.y1], [r.x1, ym], [r.x2, ym], [xm, r.y1], [xm, r.y2]];
    }

    /** TradingView: corners round, side middles square. */
    override handleShapes(): ReadonlyArray<'circle' | 'square'> {
        return this.tv ? ['circle', 'circle', 'circle', 'circle', 'square', 'square', 'square', 'square'] : [];
    }

    /** TradingView: the corners resize diagonally (the pair along the drawn diagonal one way, the other pair the
     *  other), the left / right middles sideways, the top / bottom middles up and down. */
    override handleCursor(index: number): string | null {
        if (!this.tv) return null;
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        if (index === 4 || index === 5) return 'ew-resize';
        if (index === 6 || index === 7) return 'ns-resize';
        // Screen y grows downward, so the sign of the price step is flipped.
        const s = Math.sign((a.time - b.time) * (b.price - a.price));
        const main = s < 0 ? 'nesw-resize' : 'nwse-resize';
        const other = s < 0 ? 'nwse-resize' : 'nesw-resize';
        return index < 2 ? main : other;
    }

    /** TradingView's handle moves: the extra corners take one corner's price and the other's time, a side middle
     *  moves that side only. The two drawn corners move as usual. */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (!this.tv || index < 2) return false;
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return false;
        const pt = proj.pxToPoint(x, y, this.paneId);
        if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
        if (index === 2) this.anchors = [{ ...a, time: pt.time }, { ...b, price: pt.price }];
        else if (index === 3) this.anchors = [{ ...a, price: pt.price }, { ...b, time: pt.time }];
        else if (index === 4) this.anchors = [{ ...a, time: pt.time }, b];
        else if (index === 5) this.anchors = [a, { ...b, time: pt.time }];
        else if (index === 6) this.anchors = [{ ...a, price: pt.price }, b];
        else if (index === 7) this.anchors = [a, { ...b, price: pt.price }];
        return true;
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const r = this.rect(proj);
        if (!r) return null;
        return { x: Math.min(r.x1, r.x2), y: Math.min(r.y1, r.y2), w: Math.abs(r.x2 - r.x1), h: Math.abs(r.y2 - r.y1) };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
    }

    /** Left and right edges on screen, after any extension to the pane edge. */
    spanX(proj: Projector): { x1: number; x2: number } | null {
        const r = this.rect(proj);
        if (!r) return null;
        return { x1: this.extendLeft ? 0 : Math.min(r.x1, r.x2), x2: this.extendRight ? proj.width : Math.max(r.x1, r.x2) };
    }

    protected override writeProps(): Record<string, unknown> {
        const base = { extendLeft: !!this.extendLeft, extendRight: !!this.extendRight, middleLine: !!this.middleLine };
        if (!this.tv) return base;
        return { ...base, tv: true, fillBackground: this.fillBackground === true, middleColor: this.middleColor, middleWidth: this.middleWidth, middleStyle: this.middleStyle };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv === true) this.tv = true;
        if (typeof props.fillBackground === 'boolean') this.fillBackground = props.fillBackground;
        if (typeof props.middleColor === 'string') this.middleColor = props.middleColor;
        if (typeof props.middleWidth === 'number' && Number.isFinite(props.middleWidth)) this.middleWidth = Math.min(10, Math.max(1, props.middleWidth));
        if (isLineStyle(props.middleStyle)) this.middleStyle = props.middleStyle;
        if (typeof props.extendLeft === 'boolean') this.extendLeft = props.extendLeft;
        if (typeof props.extendRight === 'boolean') this.extendRight = props.extendRight;
        if (typeof props.middleLine === 'boolean') this.middleLine = props.middleLine;
    }

    schema(): SettingsSchema {
        if (this.tv) {
            return {
                fields: [
                    ...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })),
                    { path: 'fillBackground', label: 'Background', kind: 'boolean', group: 'fill' },
                    { path: 'style.fillColor', label: 'Fill color', kind: 'color', group: 'fill' },
                    { path: 'extendLeft', label: 'Extend left', kind: 'boolean', group: 'behavior' },
                    { path: 'extendRight', label: 'Extend right', kind: 'boolean', group: 'behavior' },
                    { path: 'middleLine', label: 'Middle line', kind: 'boolean', group: 'behavior' },
                    ...TEXT_FIELDS,
                    ...TV_RECT_TEXT_ALIGN,
                ],
            };
        }
        return {
            fields: [
                ...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace('Line', 'Border') })),
                { path: 'style.fillColor', label: 'Fill color', kind: 'color', group: 'fill' },
                { path: 'extendLeft', label: 'Extend left', kind: 'boolean', group: 'behavior' },
                { path: 'extendRight', label: 'Extend right', kind: 'boolean', group: 'behavior' },
                { path: 'middleLine', label: 'Middle line', kind: 'boolean', group: 'behavior' },
                ...TEXT_FIELDS,
                // TradingView's rectangle text alignment (inside the box).
                ...LINE_TEXT_ALIGN_FIELDS,
            ],
        };
    }
}
