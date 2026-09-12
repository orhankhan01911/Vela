import { describe, it, expect, afterEach } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';

/**
 * `NativeRenderer.screenshot()` composites the visible chart layers onto an offscreen
 * canvas. Regression guard: the exported image must include the **user-drawings layer**
 * (L1.5 — trend lines, boxes, fibs, etc.), which lives on its own surface and was
 * previously dropped from the composite, so drawings never appeared in screenshots.
 * (Drawings interleaved into the series stack need no layer of their own here — the
 * geometry backend composites them inside the data canvas.)
 *
 * The vitest env is `node` (no DOM/canvas), so we stub `document.createElement('canvas')`
 * with a recording canvas that captures every `drawImage` source, and inject tagged fake
 * layer surfaces into the renderer.
 *
 * PERF PATCH (project-options fork): the layers are DETACHED buffers now (`{ canvas, dirty,
 * hasContent }`) composited onto two DOM canvases — only `dataCanvas` is still a bare DOM
 * canvas here. The screenshot compositor walks the same pile in the same order (see
 * `NativeRenderer.compositePile`), and a buffer flagged `hasContent: false` is skipped.
 */

interface FakeCanvas { __layer: string; width: number; height: number }
const layer = (name: string, width = 800, height = 600): FakeCanvas => ({ __layer: name, width, height });

const originalDocument = (globalThis as { document?: unknown }).document;
afterEach(() => { (globalThis as { document?: unknown }).document = originalDocument; });

/**
 * Build a renderer with fake layer canvases + a stubbed offscreen canvas, bypassing the
 * real mount/paint (which need a browser). `drawn` records the layers composited in order;
 * `paintedBeforeFirstDraw` confirms a fresh paint ran before compositing (so the drawings
 * layer is current).
 */
function setupRenderer(): { renderer: NativeRenderer; drawn: string[]; paintedBeforeFirstDraw: () => boolean } {
    let painted = false;
    let paintedBeforeFirstDraw = false;
    const drawn: string[] = [];

    const ctx = {
        fillStyle: '',
        fillRect() {},
        drawImage(src: FakeCanvas) {
            if (drawn.length === 0) paintedBeforeFirstDraw = painted;
            drawn.push(src.__layer);
        },
    };
    const out = { width: 0, height: 0, getContext: () => ctx, toDataURL: () => 'data:image/png;base64,STUB' };
    (globalThis as { document?: unknown }).document = { createElement: () => out };

    const renderer = new NativeRenderer();
    const r = renderer as unknown as Record<string, unknown>;
    const buf = (name: string, hasContent = true) => ({ canvas: layer(name), dirty: false, hasContent });
    r.backdropBuf = buf('backdrop');
    r.dataCanvas = layer('data'); // the WebGL/canvas2d geometry canvas — still a real DOM canvas
    r.volumeBuf = buf('volume');
    r.chromeBuf = buf('chrome');
    r.drawingsBuf = buf('drawings');
    // One SDK renderer layer on each side of the data canvas.
    r.belowExtBufs = [buf('ext-below')];
    r.aboveExtBufs = [buf('ext-above')];
    r.theme = { background: '#101010' };
    r.computeScales = () => {};
    r.paintData = () => { painted = true; };

    return { renderer, drawn, paintedBeforeFirstDraw: () => paintedBeforeFirstDraw };
}

describe('NativeRenderer.screenshot() layer composition', () => {
    it('composites every layer in the on-screen stacking order', () => {
        const { renderer, drawn } = setupRenderer();
        const url = renderer.screenshot();

        expect(url).toBe('data:image/png;base64,STUB');
        // The drawings layer must be present (the original regression) …
        expect(drawn).toContain('drawings');
        // … drawn after chrome so user drawings sit above Pine drawings, matching the screen.
        // The full order is the one the layers had as DOM children before the buffer patch:
        // backdrop (grid + highlights, under everything), the below-data SDK layers, the
        // geometry canvas, volume/VPVR, the above-data SDK layers, chrome, then drawings.
        expect(drawn).toEqual(['backdrop', 'ext-below', 'data', 'volume', 'ext-above', 'chrome', 'drawings']);
    });

    it('skips buffers flagged as blank (a hidden volume layer is not composited)', () => {
        const { renderer, drawn } = setupRenderer();
        const r = renderer as unknown as { volumeBuf: { hasContent: boolean } };
        r.volumeBuf.hasContent = false; // volume + VPVR both off — the shared buffer is transparent
        renderer.screenshot();
        expect(drawn).not.toContain('volume');
        expect(drawn).toEqual(['backdrop', 'ext-below', 'data', 'ext-above', 'chrome', 'drawings']);
    });

    it('runs a fresh paint before reading the layers back', () => {
        const { renderer, paintedBeforeFirstDraw } = setupRenderer();
        renderer.screenshot();
        // paintData() repaints the drawings layer (L1.5), so compositing sees current content.
        expect(paintedBeforeFirstDraw()).toBe(true);
    });

    it('returns null when the chart has not mounted (no data canvas)', () => {
        const renderer = new NativeRenderer();
        expect(renderer.screenshot()).toBeNull();
    });
});
