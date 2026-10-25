import { Drawing, type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { pointInBox } from '../hittest';

/** The card's width in CSS px (its height follows the text and picture, see {@link XPostDrawing.cardH}). */
export const XPOST_W = 280;
/** Gap between the card and the dot on the post's time. */
export const XPOST_GAP = 10;

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
 * TradingView's "X post" annotation: a post's card on the chart, on the time axis at the moment it was posted (a dot
 * there), the card above it. Dragging the card moves it up or down; the time stays the post's.
 */
export class XPostDrawing extends Drawing {
    readonly type = 'xpost' as const;
    // `!` (no initializer): the base constructor runs readProps first.
    post!: XPostCard | null;
    /** Height the painter last laid the card out at (CSS px) — the hit box until the next paint. */
    cardH = 150;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 1, max: 1, slots: [{ role: 'point', free: 'both' }] };
    }

    /** The dot on the post's time and the card's box above it, or below it when the pane has no room above (a post
     *  near the top of the prices would otherwise run off the plot, under the legend). */
    layout(proj: Projector): { dot: [number, number]; card: { x: number; y: number; w: number; h: number } } | null {
        const a = this.anchors[0];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        if (y == null) return null;
        const x = proj.xOf(a.time);
        const top = proj.paneRect(this.paneId)?.top ?? 0;
        const above = y - XPOST_GAP - this.cardH;
        return { dot: [x, y], card: { x: x - XPOST_W / 2, y: above >= top ? above : y + XPOST_GAP, w: XPOST_W, h: this.cardH } };
    }

    handlePoints(): Array<[number, number]> {
        return []; // the whole card is the grip
    }

    hitHandle(): number {
        return -1;
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const l = this.layout(proj);
        return l ? { x: l.card.x, y: l.card.y, w: l.card.w, h: l.card.h + XPOST_GAP } : null;
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const b = this.bounds(proj);
        return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol);
    }

    /** Up or down only: the post stays at the time it was posted. */
    override translateBody(_dt: number, dp: number, orig: DrawingPoint[]): DrawingPoint[] {
        return orig.map((o) => ({ time: o.time, price: o.price + dp }));
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        return a ? { min: a.price, max: a.price } : null;
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
