import { describe, it, expect, afterEach } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';

/**
 * `NativeRenderer.screenshot()` composites the visible chart layers onto an offscreen
 * canvas. Regression guard: the exported image must include the **user-drawings layer**
 * (L1.5 — trend lines, boxes, fibs, etc.), which lives on its own `drawingsCanvas` and
 * was previously dropped from the composite, so drawings never appeared in screenshots.
 * (Drawings interleaved into the series stack need no layer of their own here — the
 * geometry backend composites them inside the data canvas.)
 *
 * The vitest env is `node` (no DOM/canvas), so we stub `document.createElement('canvas')`
 * with a recording canvas that captures every `drawImage` source, and inject tagged fake
 * layer canvases into the renderer.
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
    r.backdropCanvas = layer('backdrop');
    r.dataCanvas = layer('data');
    r.chromeCanvas = layer('chrome');
    r.drawingsCanvas = layer('drawings');
    r.theme = { background: '#101010' };
    r.computeScales = () => {};
    r.paintData = () => { painted = true; };

    return { renderer, drawn, paintedBeforeFirstDraw: () => paintedBeforeFirstDraw };
}

describe('NativeRenderer.screenshot() layer composition', () => {
    it('composites the user-drawings layer above the chrome layer', () => {
        const { renderer, drawn } = setupRenderer();
        const url = renderer.screenshot();

        expect(url).toBe('data:image/png;base64,STUB');
        // The drawings layer must be present (the regression) …
        expect(drawn).toContain('drawings');
        // … drawn after chrome so user drawings sit above Pine drawings, matching the
        // screen — and the backdrop (grid + highlights) composites first, under everything.
        expect(drawn).toEqual(['backdrop', 'data', 'chrome', 'drawings']);
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

    it('draws the chart again at a higher scale for a sharper picture, then puts the screen back', () => {
        const { renderer, drawn } = setupRenderer();
        const r = renderer as unknown as Record<string, unknown>;
        r.dataCanvas = layer('data', 400, 300); // the screen: 1 px per CSS px
        r.plot = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }), querySelectorAll: () => [] };
        const sizes: Array<number | null> = [];
        let paintedAt: number | null = -1;
        r.syncSize = () => sizes.push(r.shotDpr as number | null);
        r.paintData = () => { paintedAt = r.shotDpr as number | null; };
        renderer.screenshotCanvas({ scale: 2 });
        expect(sizes).toEqual([2, null]); // resized for the picture, then back to the screen
        expect(paintedAt).toBe(2); // painted (and read) at the picture's scale
        expect(r.shotDpr).toBeNull();
        expect(drawn).toContain('data');
    });

    it('keeps the screen when the scale asked for is not above it', () => {
        const { renderer } = setupRenderer();
        const r = renderer as unknown as Record<string, unknown>;
        r.dataCanvas = layer('data', 800, 600);
        r.plot = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }), querySelectorAll: () => [] };
        let resized = 0;
        r.syncSize = () => { resized += 1; };
        renderer.screenshotCanvas({ scale: 2 });
        expect(resized).toBe(0);
    });

    it('puts the merged panes\' left scales and opted-in host canvases where they are on screen', () => {
        const calls: Array<{ layer: string; x: number; y: number }> = [];
        const ctx = { fillStyle: '', fillRect() {}, drawImage(src: FakeCanvas, x: number, y: number) { calls.push({ layer: src.__layer, x, y }); } };
        const out = { width: 0, height: 0, getContext: () => ctx, toDataURL: () => '' };
        (globalThis as { document?: unknown }).document = { createElement: () => out };
        const renderer = new NativeRenderer();
        const r = renderer as unknown as Record<string, unknown>;
        r.backdropCanvas = layer('backdrop', 400, 300);
        r.dataCanvas = layer('data', 400, 300);
        r.chromeCanvas = layer('chrome', 400, 300);
        r.drawingsCanvas = layer('drawings', 400, 300);
        r.theme = { background: '#101010' };
        r.computeScales = () => {};
        r.paintData = () => {};
        r.leftAxisW = 72;
        r.leftScaleCol = { visible: true, el: layer('left', 72, 300) };
        const strip = { ...layer('strip', 400, 20), style: { display: '' }, offsetLeft: 0, offsetTop: 280, offsetWidth: 400, offsetHeight: 20 };
        r.plot = {
            getBoundingClientRect: () => ({ left: 100, top: 0, width: 400, height: 300 }),
            querySelectorAll: (sel: string) => (sel.includes('data-vela-shot-canvas') ? [strip] : []),
        };
        renderer.screenshotCanvas();
        expect(out.width).toBe(472);
        expect(calls.map((c) => c.layer)).toEqual(['left', 'backdrop', 'data', 'chrome', 'strip', 'drawings']);
        expect(calls[0]).toMatchObject({ x: 0, y: 0 });
        expect(calls[1]).toMatchObject({ x: 72 });
        expect(calls[4]).toMatchObject({ x: 72, y: 280 });
        expect(renderer.screenshotBox()).toEqual({ left: 28, top: 0, width: 472, height: 300 });
    });
});
