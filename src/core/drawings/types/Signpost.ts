import type { AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { pointInBox, distToSegment } from '../hittest';
import { TV_LINE_COLOR, textPx } from '../style';
import { CalloutBase } from './CalloutBase';

/** TradingView's signpost geometry (module 624586): the emoji plate's radius, the gap from the label to it, the label's
 *  padding and wrap width, the gap between the candle and the pole. */
export const TV_SIGNPOST = { plateR: 35, plateGap: 10, padV: 6, padH: 8, wrap: 134, lineGap: 3, poleGap: 3 } as const;

/** A body drag's starting handle y, per drag (keyed by the drag's original anchors, stable for one drag). */
const bodyStart = new WeakMap<object, number>();

/** A TradingView signpost laid out on screen: the pole, the label box, the emoji plate, and the handle (the label's
 *  edge toward the candle's far side). */
export interface SignpostLayout {
    x: number;
    poleFrom: number;
    poleTo: number;
    box: { x: number; y: number; w: number; h: number };
    plate: { cx: number; cy: number; r: number } | null;
    handleY: number;
}

/** Radius of the signpost's round badge. */
export const SIGNPOST_R = 16;

/**
 * TradingView's signpost: a round badge with a flag on a vertical pole from a bar (anchor[0]), its label in a plate
 * above the badge. The badge sits at anchor[1]'s price, straight above or below the bar (its time follows the bar's).
 */
export class Signpost extends CalloutBase {
    readonly type = 'signpost' as const;
    /** TradingView's signpost (module 624586): one point on a bar and its vertical position, a % of the way from the
     *  candle to the pane's top (positive) or bottom (negative). A new one; one saved before keeps its look. */
    declare tv?: boolean;
    declare position?: number;
    /** TradingView's Emoji pin: shown, its emoji and the plate's colour. */
    declare showImage?: boolean;
    declare emoji?: string;
    declare plateColor?: string;

    constructor(init: ConstructorParameters<typeof CalloutBase>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.position = 50;
            this.showImage = false;
            this.emoji = '🙂';
            this.plateColor = TV_LINE_COLOR;
            this.text = { ...this.text!, size: 12 };
        }
    }

    protected override defaultLabel(): string {
        return 'Signpost';
    }

    override anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        if (this.tv) return { min: 1, max: 1, slots: [{ role: 'bar', free: 'both' }] };
        return super.anchorSchema();
    }

    /** The candle's high (up) or low (down) at the point's bar, in pane pixels, and the pane. */
    private candle(proj: Projector): { x: number; hi: number; lo: number; top: number; h: number } | null {
        const a = this.anchors[0];
        if (!a) return null;
        const rect = proj.paneRect?.(this.paneId) ?? { top: 0, height: proj.height };
        // The bar under the point (its time can sit anywhere in the bar): the nearest bar within a few pixels.
        const x = proj.xOf(a.time);
        const t0 = proj.pxToPoint(x - 6, 0, this.paneId).time;
        const t1 = proj.pxToPoint(x + 6, 0, this.paneId).time;
        const near = proj.barsInRange?.(Math.min(t0, t1, a.time), Math.max(t0, t1, a.time)) ?? [];
        const bar = near.reduce<(typeof near)[number] | undefined>((best, b) => (!best || Math.abs(b.time - a.time) < Math.abs(best.time - a.time) ? b : best), undefined);
        const hi = proj.yOf(bar ? bar.high : a.price, this.paneId);
        const lo = proj.yOf(bar ? bar.low : a.price, this.paneId);
        if (hi == null || lo == null) return null;
        return { x: proj.xOf(a.time), hi: hi - rect.top, lo: lo - rect.top, top: rect.top, h: rect.height };
    }

    /** TradingView's vertical position for a pane y (the inverse of its layout): above the high a % toward the top,
     *  below the low a % toward the bottom. */
    private positionAt(y: number, proj: Projector): number | null {
        const c = this.candle(proj);
        if (!c) return null;
        const ly = y - c.top;
        if (ly <= c.hi) return c.hi <= 0 ? 100 : Math.min(100, ((c.hi - ly) / c.hi) * 100);
        if (ly >= c.lo) return c.h - c.lo <= 0 ? -100 : -Math.min(100, ((ly - c.lo) / (c.h - c.lo)) * 100);
        return 0;
    }

    /** TradingView's layout (its positionToCoordinate and pane view); `label` is the label's measured size (else an
     *  estimate from the text). */
    tvLayout(proj: Projector, label?: { w: number; h: number }): SignpostLayout | null {
        const c = this.candle(proj);
        if (!c) return null;
        const pos = this.position ?? 50;
        const dir = pos >= 0 ? 1 : -1;
        const pc = dir === 1 ? c.hi : c.lo;
        const r = Math.min(c.h, Math.max(0, dir === 1 ? pc : c.h - pc));
        let f = pc - dir * Math.abs((r * pos) / 100);
        if (f >= 0 && f <= c.h) f = Math.min(c.h - 2, Math.max(2, f));
        const poleStart = pc - dir * TV_SIGNPOST.poleGap;
        const size = label ?? this.estimateLabel();
        // The label never covers its candle: its edge toward the candle stays at or beyond the pole's start.
        const u = dir === 1 ? Math.min(poleStart - size.h, f) : Math.max(poleStart + size.h, f);
        const boxTop = dir === 1 ? u : u - size.h;
        const plate = this.showImage === true;
        const extra = plate ? TV_SIGNPOST.plateGap + 2 * TV_SIGNPOST.plateR : 0;
        // The pole runs from the candle to the label's near edge, or on to the plate's far edge.
        const near = dir === 1 ? boxTop + size.h : boxTop;
        const poleTo = near + dir * extra;
        const plateC = plate ? near + dir * (TV_SIGNPOST.plateGap + TV_SIGNPOST.plateR) : 0;
        return {
            x: c.x,
            poleFrom: c.top + poleStart,
            poleTo: c.top + poleTo,
            box: { x: c.x - size.w / 2, y: c.top + boxTop, w: size.w, h: size.h },
            plate: plate ? { cx: c.x, cy: c.top + plateC, r: TV_SIGNPOST.plateR } : null,
            handleY: c.top + u,
        };
    }

    /** The label's size from its text (the painter measures it exactly). */
    private estimateLabel(): { w: number; h: number } {
        const fs = textPx(this.text?.size ?? 12);
        const lines = (this.text?.value || ' ').split('\n');
        const chars = Math.max(...lines.map((l) => l.length));
        const perLine = Math.max(1, Math.floor(TV_SIGNPOST.wrap / (fs * 0.6)));
        const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
        const w = Math.min(TV_SIGNPOST.wrap, chars * fs * 0.6) + 2 * TV_SIGNPOST.padH;
        return { w, h: rows * fs + (rows - 1) * TV_SIGNPOST.lineGap + 2 * TV_SIGNPOST.padV };
    }

    override onPlaced(proj?: Projector): void {
        if (this.tv) {
            const a = this.anchors[0];
            const y = a && proj ? proj.yOf(a.price, this.paneId) : null;
            const pos = y != null && proj ? this.positionAt(y, proj) : null;
            if (pos != null) this.position = Math.round(pos * 100) / 100;
            return;
        }
        const t = this.anchors[0];
        const b = this.anchors[1];
        if (t && b) b.time = t.time;
    }

    /** TradingView's handle slides the signpost up and down its bar. */
    override dragHandlePx(index: number, _x: number, y: number, proj: Projector): boolean {
        if (!this.tv || index !== 0) return false;
        const pos = this.positionAt(y, proj);
        if (pos != null) this.position = Math.round(pos * 100) / 100;
        return true;
    }

    override handleCursor(index: number): string | null {
        return this.tv && index === 0 ? 'ns-resize' : null;
    }

    /** A body drag moves it to another bar and up or down (TradingView's move). */
    override translateBodyPx(dx: number, dy: number, orig: DrawingPoint[], proj: Projector): DrawingPoint[] | null {
        if (!this.tv || !orig[0]) return null;
        if (!bodyStart.has(orig)) bodyStart.set(orig, this.tvLayout(proj)?.handleY ?? 0);
        const startY = bodyStart.get(orig)!;
        const pt = proj.pxToPoint(proj.xOf(orig[0].time) + dx, startY + dy, this.paneId);
        const moved = [{ time: Number.isFinite(pt.time) ? pt.time : orig[0].time, price: orig[0].price }];
        const before = this.anchors;
        this.anchors = moved;
        const pos = this.positionAt(startY + dy, proj);
        this.anchors = before;
        if (pos != null) this.position = Math.round(pos * 100) / 100;
        return moved;
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        if (!this.tv) return undefined;
        return { tv: true, position: this.position, showImage: this.showImage === true, emoji: this.emoji, plateColor: this.plateColor };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        this.tv = true;
        if (typeof props.position === 'number' && Number.isFinite(props.position)) this.position = Math.max(-100, Math.min(100, props.position));
        if (typeof props.showImage === 'boolean') this.showImage = props.showImage;
        if (typeof props.emoji === 'string' && props.emoji) this.emoji = props.emoji;
        if (typeof props.plateColor === 'string') this.plateColor = props.plateColor;
    }

    override handlePoints(proj: Projector): Array<[number, number]> {
        if (!this.tv) return super.handlePoints(proj);
        const L = this.tvLayout(proj);
        return L ? [[L.x, L.handleY]] : [];
    }

    override bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        if (!this.tv) return super.bounds(proj);
        return this.tvLayout(proj)?.box ?? null;
    }

    override priceRange(): { min: number; max: number } | null {
        return this.tv ? null : super.priceRange(); // TradingView's sits at a pane position, not a price
    }

    override schema(): SettingsSchema {
        const base = super.schema();
        if (!this.tv) return base;
        // TradingView's: the Emoji pin on the Style tab; its Text tab has size, bold, italic and the text (the colour
        // follows the theme).
        return {
            ...base,
            fields: [
                { path: 'showImage', label: 'Emoji pin', kind: 'boolean', group: 'behavior' },
                ...base.fields.filter((f) => f.path.startsWith('text.') && f.path !== 'text.color'),
            ],
        };
    }

    /** The bar point and the badge centre, the badge straight above or below the bar. */
    override points(proj: Projector): [[number, number], [number, number]] | null {
        const p = super.points(proj);
        return p ? [p[0], [p[0][0], p[1][1]]] : null;
    }

    /** The badge (the label plate above it is measured by the painter). */
    override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const p = this.points(proj);
        if (!p) return null;
        const [cx, cy] = p[1];
        return { x: cx - SIGNPOST_R, y: cy - SIGNPOST_R, w: SIGNPOST_R * 2, h: SIGNPOST_R * 2 };
    }

    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        if (this.tv) {
            const L = this.tvLayout(proj);
            if (!L) return false;
            if (pointInBox(px, py, L.box.x, L.box.y, L.box.x + L.box.w, L.box.y + L.box.h, tol)) return true;
            if (L.plate && Math.hypot(px - L.plate.cx, py - L.plate.cy) <= L.plate.r + tol) return true;
            return distToSegment(px, py, L.x, L.poleFrom, L.x, L.poleTo) <= Math.max(tol, 3);
        }
        const p = this.points(proj);
        if (!p) return false;
        const b = this.box(proj)!;
        if (pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol)) return true;
        // The label plate above the badge (approximate width) and the pole.
        const text = this.labelText();
        const w = Math.max(20, Math.max(...text.split('\n').map((l) => l.length)) * 8) + 16;
        const lines = text.split('\n').length;
        const top = p[1][1] - SIGNPOST_R - 6 - lines * 18 - 8;
        if (pointInBox(px, py, p[1][0] - w / 2, top, p[1][0] + w / 2, p[1][1] - SIGNPOST_R, tol)) return true;
        return distToSegment(px, py, p[0][0], p[0][1], p[1][0], p[1][1]) <= tol;
    }

    /** A body drag slides the badge up or down its pole; the bar point stays. */
    override translateBody(_dt: number, dp: number, orig: DrawingPoint[]): DrawingPoint[] {
        const t = orig[0];
        const b = orig[1];
        if (!t || !b) return orig.map((o) => ({ time: o.time, price: o.price + dp }));
        return [{ time: t.time, price: t.price }, { time: t.time, price: b.price + dp }];
    }

    override constrainHandleDrag(): void {
        if (this.tv) return;
        const t = this.anchors[0];
        const b = this.anchors[1];
        if (t && b) b.time = t.time;
    }
}
