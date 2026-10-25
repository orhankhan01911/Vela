import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { pointInBox, handleAt } from '../hittest';

/** TradingView's limits for an image put on a chart: JPG or PNG, at most 2 MB, at most 2000 x 2000 px.
 *  Hosts check them where a picture comes in (dialog, paste, drop); see {@link checkImageFile}. */
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_MAX_SIDE = 2000;
export const IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg'];
/** A 2 MB file as base64 data, plus the `data:image/jpeg;base64,` head. */
const MAX_DATA_URL = Math.ceil(IMAGE_MAX_BYTES / 3) * 4 + 32;

/** Why a picture cannot go on the chart (TradingView's words), or null when it can. */
export function checkImageFile(file: { type: string; size: number }, dims?: { width: number; height: number }): string | null {
    if (!IMAGE_TYPES.includes(file.type)) return 'The image must be in JPG or PNG format';
    if (file.size > IMAGE_MAX_BYTES) return 'The image size must not exceed 2 MB';
    if (dims && (dims.width > IMAGE_MAX_SIDE || dims.height > IMAGE_MAX_SIDE)) return 'The maximum resolution is 2000 x 2000 pixels';
    return null;
}

/** Only web images and inline image data: no other URL scheme ever reaches an <img>. */
export function safeImageUrl(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    if (s.length > MAX_DATA_URL) return null;
    if (/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(s)) return s;
    try {
        const u = new URL(s);
        return u.protocol === 'https:' ? u.href : null;
    } catch {
        return null;
    }
}

/** Smallest and largest size of a picture on the chart, CSS px. */
const MIN_PX = 8;
const MAX_PX = 4000;

/**
 * TradingView's image: a picture (an https link or pasted image data). As on TradingView it is pinned at its top-left
 * corner (anchor 0) and has its own size in screen pixels (`cssWidth` x `cssHeight`), so zooming or scrolling the chart
 * moves it but never stretches it; the bottom-right handle resizes it. A picture saved before that (two corners, no
 * size) keeps its box between the two corners.
 */
export class ImageDrawing extends Drawing {
    readonly type = 'image' as const;
    // `!` (no initializer): the base constructor runs readProps first.
    url!: string;
    opacity!: number;
    cssWidth!: number;
    cssHeight!: number;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 1, max: 2, slots: [{ role: 'c1', free: 'both' }, { role: 'c2', free: 'both' }] };
    }

    /** True for a picture with its own pixel size (TradingView's model); false for an old two-corner one. */
    sized(): boolean {
        return this.cssWidth > 0 && this.cssHeight > 0;
    }

    /** The URL to draw, or null when it is not an https link / image data. */
    imageUrl(): string | null {
        return safeImageUrl(this.url);
    }

    private corner(proj: Projector, i: number): [number, number] | null {
        const a = this.anchors[i];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        return y == null ? null : [proj.xOf(a.time), y];
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const tl = this.corner(proj, 0);
        if (!tl) return [];
        if (this.sized()) return [tl, [tl[0] + this.cssWidth, tl[1] + this.cssHeight]];
        const br = this.corner(proj, 1);
        return br ? [tl, br] : [tl];
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const p = this.handlePoints(proj);
        if (p.length < 2) return null;
        const x = Math.min(p[0]![0], p[1]![0]);
        const y = Math.min(p[0]![1], p[1]![1]);
        return { x, y, w: Math.abs(p[1]![0] - p[0]![0]), h: Math.abs(p[1]![1] - p[0]![1]) };
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const b = this.bounds(proj);
        return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol);
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    /** The bottom-right handle of a sized picture sets its size; the top-left one moves it (an anchor drag). */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (index !== 1 || !this.sized()) return false;
        const tl = this.corner(proj, 0);
        if (!tl) return true;
        this.cssWidth = Math.min(MAX_PX, Math.max(MIN_PX, x - tl[0]));
        this.cssHeight = Math.min(MAX_PX, Math.max(MIN_PX, y - tl[1]));
        return true;
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (a && this.sized()) return { min: a.price, max: a.price };
        return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
    }

    schema(): SettingsSchema {
        return {
            fields: [
                { path: 'url', label: 'Image link (https) or image data', kind: 'text', group: 'behavior' },
                { path: 'opacity', label: 'Opacity', kind: 'opacity', min: 0, max: 1, step: 0.05, group: 'fill' },
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> {
        const out: Record<string, unknown> = { url: this.imageUrl() ?? '', opacity: this.opacity ?? 1 };
        if (this.sized()) Object.assign(out, { cssWidth: Math.round(this.cssWidth), cssHeight: Math.round(this.cssHeight) });
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.url === 'string') this.url = safeImageUrl(props.url) ?? '';
        if (typeof props.opacity === 'number' && Number.isFinite(props.opacity)) this.opacity = Math.min(1, Math.max(0, props.opacity));
        const px = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(MAX_PX, Math.max(MIN_PX, v)) : 0);
        if ('cssWidth' in props || 'cssHeight' in props) {
            this.cssWidth = px(props.cssWidth);
            this.cssHeight = px(props.cssHeight);
        } else {
            this.cssWidth ??= 0;
            this.cssHeight ??= 0;
        }
    }
}
