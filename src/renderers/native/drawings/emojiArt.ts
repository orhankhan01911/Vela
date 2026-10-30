/**
 * Twemoji art for the emoji tool and its picker (Twemoji 15, CC-BY 4.0: see core/drawings/assets/twemojiSprite.ts).
 * The art is its own chunk, loaded the first time an emoji is drawn or the picker opens; each emoji becomes one
 * cached image (an SVG data URL, so it stays sharp at any size and browser zoom).
 */

let sprite: Promise<Readonly<Record<string, string>>> | null = null;
const urls = new Map<string, string>();
const images = new Map<string, HTMLImageElement>();

/** The whole art set (loads once). */
export function loadEmojiArt(): Promise<Readonly<Record<string, string>>> {
    sprite ??= import('../../../core/drawings/assets/twemojiSprite').then((m) => m.default);
    return sprite;
}

/** An emoji's SVG as a data URL, or null when it has no art. */
export async function emojiUrl(emoji: string): Promise<string | null> {
    const hit = urls.get(emoji);
    if (hit) return hit;
    const art = await loadEmojiArt();
    const body = art[emoji];
    if (!body) return null;
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">${body}</svg>`)}`;
    urls.set(emoji, url);
    return url;
}

/** The emoji's image once it has loaded; null until then (`onReady` runs when it is, to repaint). */
export function emojiImage(emoji: string, onReady: () => void): HTMLImageElement | null {
    const img = images.get(emoji);
    if (img) return img.complete && img.naturalWidth > 0 ? img : null;
    if (typeof Image === 'undefined') return null;
    const el = new Image();
    images.set(emoji, el);
    el.onload = () => onReady();
    void emojiUrl(emoji).then((url) => {
        if (url) el.src = url;
    });
    return null;
}
