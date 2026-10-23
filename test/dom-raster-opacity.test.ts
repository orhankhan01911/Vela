// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rasterizeOverlay } from '../src/renderers/shared/dom-raster';

/**
 * Overlays copied into a screenshot: content faded to opacity 0 must stay out of the picture. A bare
 * `parseFloat(opacity) || 1` read 0 as fully opaque, so a host mark whose name is folded away on screen (opacity 0
 * letters) came out drawn in the PNG.
 */
describe('rasterizeOverlay opacity', () => {
    afterEach(() => vi.restoreAllMocks());

    it('skips opacity 0 content and keeps the rest', () => {
        const box = { left: 0, top: 0, width: 40, height: 10, right: 40, bottom: 10, x: 0, y: 0, toJSON: () => ({}) };
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box as DOMRect);
        vi.spyOn(document, 'createRange').mockImplementation(
            () => ({ selectNodeContents() {}, getBoundingClientRect: () => box }) as unknown as Range,
        );
        const root = document.createElement('div');
        root.innerHTML = '<span>shown</span><span style="opacity: 0">hidden</span><span style="opacity: 0.5">half</span>';
        document.body.append(root);
        const texts: [string, number][] = [];
        const ctx = new Proxy(
            {
                globalAlpha: 1,
                fillText(t: string) {
                    texts.push([t, (ctx as { globalAlpha: number }).globalAlpha]);
                },
            } as Record<string, unknown>,
            { get: (o, k) => (k in o ? o[k as string] : () => undefined), set: (o, k, v) => ((o[k as string] = v), true) },
        ) as unknown as CanvasRenderingContext2D;
        rasterizeOverlay(ctx, root, { left: 0, top: 0, dpr: 1 } as never);
        expect(texts).toEqual([
            ['shown', 1],
            ['half', 0.5],
        ]);
    });
});
