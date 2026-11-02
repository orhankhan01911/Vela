import { describe, expect, it, vi } from 'vitest';

import { ChromeRenderer } from '../src/renderers/native/chrome/ChromeRenderer';
import { PriceAxisTickSource } from '../src/renderers/native/chrome/priceAxisTicks';

// dmcharts leak (2026-11-02): the font listener on document.fonts kept every destroyed chart's renderer alive.
describe('ChromeRenderer font listener', () => {
    it('removes its document.fonts listener on destroy (and on a re-mount)', () => {
        const add = vi.fn();
        const remove = vi.fn();
        const canvas = { getContext: () => null, ownerDocument: { fonts: { addEventListener: add, removeEventListener: remove } } } as unknown as HTMLCanvasElement;
        const r = new ChromeRenderer(new PriceAxisTickSource());
        r.mount(canvas);
        r.mount(canvas);
        expect(add).toHaveBeenCalledTimes(2);
        expect(remove).toHaveBeenCalledTimes(1);
        r.destroy();
        expect(remove).toHaveBeenCalledTimes(2);
        expect(remove.mock.calls[1]![1]).toBe(add.mock.calls[1]![1]);
    });
});
