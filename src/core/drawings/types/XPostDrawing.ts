import { Drawing, type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { pointInBox, handleAt } from '../hittest';

/** The card's width in CSS px (its height follows the text, see {@link XPostDrawing.cardH}). */
export const XPOST_W = 300;

/** One X post as the host fetched it. Pictures are same-origin paths (a host relay): a cross-origin picture
 *  on the canvas would block screenshots. */
export interface XPostCard {
    id: string;
    url: string;
    /** When it was posted, epoch ms. */
    t: number;
    text: string;
    name: string;
    handle: string;
    avatar: string;
    verified: boolean;
    media: string[];
    likes: number;
    replies: number;
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

/** A same-origin path (`/news/x/img?u=...`) or nothing: no scheme, no protocol-relative `//host`. */
export function safeRelayPath(v: unknown): string {
    return typeof v === 'string' && /^\/(?!\/)[A-Za-z0-9/_\-.~?=&%+]*$/.test(v) && v.length <= 2048 ? v : '';
}

/** A post read back from a saved layout or a host, every field checked; null when it is not one. */
export function toXPostCard(v: unknown): XPostCard | null {
    if (!v || typeof v !== 'object') return null;
    const o = v as Record<string, unknown>;
    const id = str(o.id, 24);
    if (!/^\d{1,20}$/.test(id) || typeof o.t !== 'number' || !Number.isFinite(o.t)) return null;
    const handle = str(o.handle, 64);
    const url = str(o.url, 256);
    return {
        id,
        url: /^https:\/\/(x|twitter)\.com\//.test(url) ? url : `https://x.com/${handle || 'i'}/status/${id}`,
        t: o.t,
        text: str(o.text, 4000),
        name: str(o.name, 120),
        handle,
        avatar: safeRelayPath(o.avatar),
        verified: o.verified === true,
        media: Array.isArray(o.media) ? o.media.map(safeRelayPath).filter(Boolean).slice(0, 4) : [],
        likes: num(o.likes),
        replies: num(o.replies),
    };
}

/**
 * TradingView's X post (its `LineToolTweet`): the post's card, hanging below one handle. As on TradingView the handle has
 * a time (the post's own time when placed; dragging moves it) and a HEIGHT ON THE PANE rather than a price: anchor 0's
 * `price` holds that height as a fraction of the pane (0 top .. 1 bottom), so a price-scale change never moves the
 * card. The card shows what TradingView's does: picture, name, @handle, the post's text, "Link to X post" and the date.
 */
export class XPostDrawing extends Drawing {
    readonly type = 'xpost' as const;
    // `!` (no initializer): the base constructor runs readProps first.
    post!: XPostCard | null;
    /** Height the painter last laid the card out at (CSS px): the hit box until the next paint. */
    cardH = 150;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 1, max: 1, slots: [{ role: 'point', free: 'both' }] };
    }

    /** The handle (time, height on the pane) and the card's box below it. */
    layout(proj: Projector): { dot: [number, number]; card: { x: number; y: number; w: number; h: number } } | null {
        const a = this.anchors[0];
        const pane = proj.paneRect?.(this.paneId);
        if (!a || !pane) return null;
        const x = proj.xOf(a.time);
        const y = pane.top + clampFrac(a.price) * pane.height;
        return { dot: [x, y], card: { x: x - XPOST_W / 2, y, w: XPOST_W, h: this.cardH } };
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const l = this.layout(proj);
        return l ? [l.dot] : [];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        return this.layout(proj)?.card ?? null;
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const b = this.bounds(proj);
        return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol);
    }

    /** The card moves on the screen: time along the axis, height as a share of the pane. */
    override translateBodyPx(dx: number, dy: number, orig: DrawingPoint[], proj: Projector): DrawingPoint[] {
        const o = orig[0];
        const pane = proj.paneRect?.(this.paneId);
        if (!o || !pane || pane.height <= 0) return orig;
        const time = proj.pxToPoint(proj.xOf(o.time) + dx, pane.top, this.paneId).time;
        return [{ time, price: clampFrac(clampFrac(o.price) + dy / pane.height) }];
    }

    /** Dragging the handle moves the card the same way (never onto a price). */
    override dragHandlePx(_index: number, x: number, y: number, proj: Projector): boolean {
        const pane = proj.paneRect?.(this.paneId);
        if (!pane || pane.height <= 0) return true;
        this.anchors = [{ time: proj.pxToPoint(x, y, this.paneId).time, price: clampFrac((y - pane.top) / pane.height) }];
        return true;
    }

    /** Not a price: never part of the price scale's range. */
    priceRange(): { min: number; max: number } | null {
        return null;
    }

    override timeExtent(): { min: number; max: number } | null {
        const a = this.anchors[0];
        return a ? { min: a.time, max: a.time } : null;
    }

    schema(): SettingsSchema {
        return { fields: [] };
    }

    protected override writeProps(): Record<string, unknown> {
        return { post: this.post ?? null };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if ('post' in props) this.post = toXPostCard(props.post);
    }
}

/** A card's height on the pane, kept where the handle stays grabbable. */
function clampFrac(v: number): number {
    return Number.isFinite(v) ? Math.min(0.97, Math.max(0, v)) : 0.25;
}
