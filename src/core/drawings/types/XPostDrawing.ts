import { Drawing, type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { pointInBox, handleAt } from '../hittest';

/** The card's width in CSS px before the painter has measured it (TradingView sizes it to its text). */
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

/** The card's height above (+) or below (-) its bar, TradingView's `position`: 0..100 % of the room between the bar
 *  and the pane's edge. A new post sits half way up, as on TradingView. */
export const XPOST_POSITION = 50;

/**
 * TradingView's X post (its `LineToolTweet`, read from TradingView's own code): a card that hangs below one handle,
 * plus a thin line from the card to the bar the post was made in. The line follows the timeframe: on 1m it points
 * at the minute, on 1h at the hour, on a range or tick chart at the bar that was forming then.
 *
 * Anchor 0 is the handle: `time` is where the card sits along the time axis (the post's own time when placed;
 * dragging moves it), and `price` holds TradingView's `position` rather than a price: the card's height as a share
 * of the room above the post's bar (positive) or below it (negative). So the card stays with its bar when the price
 * scale moves, and a price-scale change never puts it on top of the candles.
 */
export class XPostDrawing extends Drawing {
    readonly type = 'xpost' as const;
    // `!` (no initializer): the base constructor runs readProps first.
    post!: XPostCard | null;
    /** Size the painter last measured the card at (CSS px): the hit box until the next paint. */
    cardW = XPOST_W;
    cardH = 150;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 1, max: 1, slots: [{ role: 'point', free: 'both' }] };
    }

    /** The post's bar on screen: its x and the points the line may end at (high and low; the close on a line chart).
     *  Empty when the bar is not loaded. */
    barPoints(proj: Projector): Array<[number, number]> {
        const bar = this.post ? proj.barAt?.(this.post.t) : null;
        if (!bar) return [];
        const x = proj.xOf(bar.time);
        const ys = (bar.line ? [bar.close] : [bar.high, bar.low]).map((p) => proj.yOf(p, this.paneId));
        return ys.filter((y): y is number => y != null).map((y) => [x, y]);
    }

    /** Where TradingView measures `position` from, in pane px: just above the bar's high (below its low for a
     *  negative position), or the pane's middle when the bar is not loaded. */
    private reference(proj: Projector, top: number, height: number, dir: 1 | -1, pole: boolean): number {
        const bar = this.post ? proj.barAt?.(this.post.t) : null;
        if (bar) {
            const y = proj.yOf(bar.line ? bar.close : dir === 1 ? bar.high : bar.low, this.paneId);
            if (y != null) return y - top - (pole ? dir * (bar.line ? 1 : 3) : 0);
        }
        return height / 2;
    }

    /** The handle's y for a position (TradingView's `positionToCoordinate`). TradingView draws it a few px clear of
     *  the bar (`pole`) but measures a drag from the bar itself, so a drag that has not moved changes nothing. */
    private yForPosition(position: number, proj: Projector, pole = true): number | null {
        const pane = proj.paneRect?.(this.paneId);
        if (!pane || pane.height <= 0) return null;
        const pos = clampPos(position);
        const dir = pos >= 0 ? 1 : -1;
        const d = pane.height;
        const c = this.reference(proj, pane.top, d, dir, pole);
        const room = Math.min(d, Math.max(0, dir === 1 ? c : d - c));
        let y = c - dir * Math.abs((room * pos) / 100);
        if (y >= 0 && y <= d) y = Math.min(d - 2, Math.max(2, y));
        return pane.top + y;
    }

    /** The position for a handle at `y` (TradingView's `_updatePositionAndCorrectPoint`): above the bar's low counts
     *  as above the bar, and inside the bar is 0. */
    positionAt(y: number, proj: Projector): number {
        const pane = proj.paneRect?.(this.paneId);
        if (!pane || pane.height <= 0) return XPOST_POSITION;
        const o = pane.height;
        let yl = y - pane.top;
        let s = o / 2;
        let a: 1 | -1 = yl <= s ? 1 : -1;
        const bar = this.post ? proj.barAt?.(this.post.t) : null;
        const hi = bar ? proj.yOf(bar.line ? bar.close : bar.high, this.paneId) : null;
        const lo = bar ? proj.yOf(bar.line ? bar.close : bar.low, this.paneId) : null;
        if (hi != null && lo != null) {
            a = yl <= lo - pane.top ? 1 : -1;
            s = (a === 1 ? hi : lo) - pane.top;
            if (a === 1) yl = Math.min(yl, s);
        }
        const room = a === 1 ? s : o - s;
        if (!(room > 0)) return 0;
        return clampPos((Math.min(o, Math.abs(yl - s)) * 100 * a) / room);
    }

    /** The handle (top middle of the card) and the card's box below it. */
    layout(proj: Projector): { dot: [number, number]; card: { x: number; y: number; w: number; h: number } } | null {
        const a = this.anchors[0];
        if (!a) return null;
        const y = this.yForPosition(a.price, proj);
        if (y == null) return null;
        const x = proj.xOf(a.time);
        return { dot: [x, y], card: { x: x - this.cardW / 2, y, w: this.cardW, h: this.cardH } };
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

    /** The card moves on the screen: along the time axis, and up or down as a new position against its bar. */
    override translateBodyPx(dx: number, dy: number, orig: DrawingPoint[], proj: Projector): DrawingPoint[] {
        const o = orig[0];
        const y = o ? this.yForPosition(o.price, proj, false) : null;
        const pane = proj.paneRect?.(this.paneId);
        if (!o || y == null || !pane) return orig;
        const time = proj.pxToPoint(proj.xOf(o.time) + dx, pane.top, this.paneId).time;
        return [{ time, price: this.positionAt(y + dy, proj) }];
    }

    /** Dragging the handle moves the card the same way (never onto a price). */
    override dragHandlePx(_index: number, x: number, y: number, proj: Projector): boolean {
        const pane = proj.paneRect?.(this.paneId);
        if (!pane || pane.height <= 0) return true;
        this.anchors = [{ time: proj.pxToPoint(x, y, this.paneId).time, price: this.positionAt(y, proj) }];
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

/** A position, -100..100 (a broken one goes back to the default). */
function clampPos(v: number): number {
    return Number.isFinite(v) ? Math.min(100, Math.max(-100, v)) : XPOST_POSITION;
}
