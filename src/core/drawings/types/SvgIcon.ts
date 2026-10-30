import { Drawing, type AnchorSlot, type SerializedDrawing } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { handleAt } from '../hittest';
import { EMOJI_GROUPS } from '../assets/emojiGroups';
import { FA_GLYPHS } from '../assets/faIcons';

/** TradingView's emoji / icon size (px) and its smallest size. */
export const SVG_ICON_SIZE = 72;
export const SVG_ICON_MIN = 20;
/** How far outside a corner the rotate zone reaches (TradingView: 20 px). */
export const ROTATE_ZONE_PX = 20;
/** The selection frame's line width (TradingView: 1.5 px). */
export const SVG_ICON_FRAME = 1.5;

/** A handle drag's start, taken when the press landed (its point and the drawing as it was). */
export interface HandleDragStart {
    x: number;
    y: number;
    doc: SerializedDrawing;
}

/** A rotate cursor (our own drawing: a circular arrow), shown over the rotate zones outside the corners. */
const ROTATE_CURSOR =
    `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18.5 9A7 7 0 1 0 19 13" stroke="white" stroke-width="4"/><path d="M19.5 4.5V9h-4.5" stroke="white" stroke-width="4"/><path d="M18.5 9A7 7 0 1 0 19 13" stroke="black" stroke-width="1.6"/><path d="M19.5 4.5V9h-4.5" stroke="black" stroke-width="1.6"/></g></svg>')}") 12 12, alias`;

/** The cursor for a resize handle pointing from the centre to (dx, dy) on screen. */
function resizeCursor(dx: number, dy: number): string {
    const a = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 180;
    if (a < 22.5 || a >= 157.5) return 'ew-resize';
    if (a < 67.5) return 'nwse-resize';
    if (a < 112.5) return 'ns-resize';
    return 'nesw-resize';
}

/**
 * TradingView's emoji and icon tools (LineToolSvgIconBase, module 637188, read 2026-10-30): one point (the centre), a
 * size in px (72, at least 20) and an angle (pi/2 = upright). Selected or hovered, the picture sits in a square frame
 * 4 px (more when large) bigger than it, with a resize handle at each corner (index 0 top right, 1 top left, 2 bottom
 * left, 3 bottom right) and a rotate zone just outside each (4..7). Dragging a corner scales the size by the distance
 * from the centre (crossing the centre flips the picture); dragging a rotate zone turns it. No Coordinates tab.
 */
export abstract class SvgIcon extends Drawing {
    // `!` (no initializer): the base constructor runs readProps first.
    size!: number;
    angle!: number;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        if (!Number.isFinite(this.size)) this.size = SVG_ICON_SIZE;
        if (!Number.isFinite(this.angle)) this.angle = Math.PI / 2;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 1, max: 1, slots: [{ role: 'p', free: 'both' }] };
    }

    /** TradingView's frame padding: 4 px, growing with the size past 72. */
    padding(): number {
        return 4 * Math.max(1, this.size / SVG_ICON_SIZE);
    }

    /** The frame side (picture plus padding on both sides). */
    frameSide(): number {
        return this.size + 2 * this.padding();
    }

    center(proj: Projector): [number, number] | null {
        const a = this.anchors[0];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        return y == null ? null : [proj.xOf(a.time), y];
    }

    /** The frame's corners, TradingView's order: top right, top left, bottom left, bottom right (rotated). */
    corners(proj: Projector): Array<[number, number]> {
        const c = this.center(proj);
        if (!c) return [];
        const f = (Math.SQRT2 * (this.frameSide() + SVG_ICON_FRAME / 2)) / 2;
        const m = -this.angle + Math.PI / 2;
        const ax = f * Math.cos(m + Math.PI / 4);
        const ay = f * Math.sin(m + Math.PI / 4);
        const bx = f * Math.cos(m + (3 * Math.PI) / 4);
        const by = f * Math.sin(m + (3 * Math.PI) / 4);
        return [
            [c[0] + ax, c[1] - ay],
            [c[0] + bx, c[1] - by],
            [c[0] - ax, c[1] + ay],
            [c[0] - bx, c[1] + by],
        ];
    }

    /** Inside the (rotated) frame. */
    private inFrame(px: number, py: number, proj: Projector): boolean {
        const c = this.center(proj);
        if (!c) return false;
        const r = -(this.angle - Math.PI / 2);
        const dx = px - c[0];
        const dy = py - c[1];
        const x = dx * Math.cos(r) - dy * Math.sin(r);
        const y = dx * Math.sin(r) + dy * Math.cos(r);
        const h = this.frameSide() / 2;
        return Math.abs(x) <= h && Math.abs(y) <= h;
    }

    hitTest(px: number, py: number, proj: Projector, _tol: number): boolean {
        return this.inFrame(px, py, proj);
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        return this.corners(proj);
    }

    /** A corner handle (0..3); else, off the frame but within 20 px of a corner, its rotate zone (4..7). */
    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        const corners = this.corners(proj);
        const i = handleAt(px, py, corners, tol + 3);
        if (i >= 0) return i;
        if (this.inFrame(px, py, proj)) return -1;
        const z = corners.findIndex(([x, y]) => Math.hypot(px - x, py - y) <= ROTATE_ZONE_PX);
        return z >= 0 ? 4 + z : -1;
    }

    /** The rotate cursor over a rotate zone; over a corner, the resize arrow pointing from the centre to it. */
    override handleCursor(index: number, proj?: Projector): string | null {
        if (index >= 4) return ROTATE_CURSOR;
        if (!proj) return null;
        const c = this.center(proj);
        const k = this.corners(proj)[index];
        return c && k ? resizeCursor(k[0] - c[0], k[1] - c[1]) : null;
    }

    /** TradingView's corner and rotate drags, from the press (`start`). */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector, start?: HandleDragStart): boolean {
        if (!start) return true;
        const c = this.center(proj);
        if (!c) return true;
        const props = start.doc.props ?? {};
        const size0 = typeof props.size === 'number' ? props.size : this.size;
        const angle0 = typeof props.angle === 'number' ? props.angle : this.angle;
        if (index >= 4) {
            const a0 = Math.atan2(start.y - c[1], start.x - c[0]);
            const a1 = Math.atan2(y - c[1], x - c[0]);
            this.angle = normAngle(angle0 + (a1 - a0));
            return true;
        }
        const d0 = Math.hypot(start.x - c[0], start.y - c[1]);
        if (d0 < 1) return true;
        this.size = Math.max(SVG_ICON_MIN, (size0 * Math.hypot(x - c[0], y - c[1])) / d0);
        // Dragged across the centre (sideways or up/down): TradingView turns the picture over.
        const crossed = Math.sign(start.x - c[0]) !== Math.sign(x - c[0]) || Math.sign(start.y - c[1]) !== Math.sign(y - c[1]);
        this.angle = normAngle(crossed ? angle0 + Math.PI : angle0);
        return true;
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const k = this.corners(proj);
        if (k.length === 0) return null;
        const xs = k.map((p) => p[0]);
        const ys = k.map((p) => p[1]);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        return a ? { min: a.price, max: a.price } : null;
    }

    protected override writeProps(): Record<string, unknown> {
        return { size: this.size, angle: this.angle };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.size === 'number' && Number.isFinite(props.size)) this.size = Math.min(2000, Math.max(SVG_ICON_MIN, props.size));
        if (typeof props.angle === 'number' && Number.isFinite(props.angle)) this.angle = normAngle(props.angle);
    }
}

function normAngle(a: number): number {
    const t = 2 * Math.PI;
    return ((a % t) + t) % t;
}

const EMOJI_SET: ReadonlySet<string> = new Set(EMOJI_GROUPS.flatMap((g) => g.emojis));

/** TradingView's emoji: a Twemoji picture (default 😀). Its dialog has Visibility only. */
export class EmojiDrawing extends SvgIcon {
    readonly type = 'emoji' as const;
    emoji!: string;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        if (!this.emoji) this.emoji = '😀';
    }

    schema(): SettingsSchema {
        return { fields: [] };
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), emoji: this.emoji };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        // Only an emoji the picker offers (its art is bundled): a saved layout cannot point anywhere else.
        if (typeof props.emoji === 'string' && EMOJI_SET.has(props.emoji)) this.emoji = props.emoji;
    }
}

/** TradingView's icon: a Font Awesome 4 glyph (default the smile, 0xF118) in its blue. Style: Color. */
export class IconDrawing extends SvgIcon {
    readonly type = 'icon' as const;
    icon!: number;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        if (!Number.isFinite(this.icon)) this.icon = 0xf118;
    }

    schema(): SettingsSchema {
        return { fields: [{ path: 'style.lineColor', label: 'Color', kind: 'color', group: 'line' }] };
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), icon: this.icon };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (typeof props.icon === 'number' && FA_GLYPHS[props.icon]) this.icon = props.icon;
    }
}
