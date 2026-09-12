import { describe, it, expect } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import { InvalidateLevel } from '../src/renderers/native/core/Scheduler';

/**
 * PERF PATCH (project-options fork) — the detached-buffer / two-canvas composite architecture.
 *
 * Vela used to put EVERY Canvas2D layer in the DOM as its own full-viewport `<canvas>`
 * (backdrop, volume+vpvr, chrome, drawings, cursor, plus one per SDK renderer layer — 7-8
 * elements on a normal chart). Chrome promotes each to its own GPU compositor layer, so a
 * drag or wheel-zoom paid full-viewport fill-rate + compositing PER LAYER, per frame:
 * measured head-to-head against lightweight-charts (~2 canvases) on the same host at the
 * same moment, Vela hit 8-16 frames over 100ms per 5s drag (worst 245-265ms) where
 * lightweight-charts hit 0 (worst 63-68ms).
 *
 * Those layers now paint into DETACHED buffers that are `drawImage`-composited onto two
 * real DOM canvases sandwiching the untouched WebGL data canvas:
 *   plot → belowCanvas, dataCanvas (WebGL2), aboveCanvas, cursorCanvas, overlayRoot
 * 4 DOM canvases, regardless of how many SDK layers are mounted.
 *
 * These are the guards that keep the change invisible on screen and cheap at the edges:
 *  - the composite order is EXACTLY the old DOM append order (any drift reorders the chart);
 *  - the cheap repaint tiers stay cheap (a chrome tick must not re-composite the below
 *    stack; a pointer move must not composite at all unless a hover-tracking SDK layer
 *    actually repainted);
 *  - a buffer known to be blank is skipped entirely;
 *  - teardown releases the buffers, which are NOT DOM children and so are not freed by
 *    removing the chart's wrapper.
 *
 * The vitest env is `node` (no DOM/canvas): the renderer is built unmounted and its
 * surfaces are stubbed — the same technique as native-screenshot.test.ts.
 */

type AnyRenderer = Record<string, any>;

/** A recording 2D context: captures the tagged sources of every `drawImage`, in order,
 *  plus the transform the compositor set and how many times it cleared the target. */
interface Recorder { ctx: AnyRenderer; drawn: string[]; clears: number }
function recorder(): Recorder {
    const rec: Recorder = { ctx: {}, drawn: [], clears: 0 };
    rec.ctx = {
        transform: null as number[] | null,
        setTransform(...args: number[]) { (rec.ctx as AnyRenderer).transform = args; },
        clearRect() { rec.clears += 1; },
        drawImage(src: { __layer: string }) { rec.drawn.push(src.__layer); },
    };
    return rec;
}

const surface = (name: string): { __layer: string; width: number; height: number; style: Record<string, string> } =>
    ({ __layer: name, width: 800, height: 600, style: {} });

const buf = (name: string, hasContent = true): AnyRenderer => ({ canvas: surface(name), dirty: false, hasContent });

/**
 * An unmounted renderer with both composite targets stubbed to recorders, one SDK layer
 * buffer on each side of the data canvas, and every buffer flagged as holding content.
 */
function setup(): { r: AnyRenderer; below: Recorder; above: Recorder } {
    const renderer = new NativeRenderer();
    const r = renderer as unknown as AnyRenderer;
    const below = recorder();
    const above = recorder();

    r.belowCanvas = surface('below-target');
    r.aboveCanvas = surface('above-target');
    r.belowCtx = below.ctx;
    r.aboveCtx = above.ctx;
    r.dataCanvas = surface('data');
    r.cursorCanvas = surface('cursor');

    r.backdropBuf = buf('backdrop');
    r.volumeBuf = buf('volume');
    r.chromeBuf = buf('chrome');
    r.drawingsBuf = buf('drawings');
    r.belowExtBufs = [buf('ext-below')];
    r.aboveExtBufs = [buf('ext-above')];

    return { r, below, above };
}

describe('composite passes flatten the buffers in the old DOM stacking order', () => {
    it('compositeBelow: backdrop first, then the below-data SDK layers', () => {
        const { r, below } = setup();
        r.compositeBelow();
        // The backdrop (grid + session highlights) must stay at the very bottom — nothing,
        // not even an SDK layer slotted behind the candles, may paint under the grid.
        expect(below.drawn).toEqual(['backdrop', 'ext-below']);
    });

    it('compositeAbove: volume/VPVR, the above-data SDK layers, chrome, then drawings', () => {
        const { r, above } = setup();
        r.compositeAbove();
        // Matches the DOM order the layers had before the patch exactly: user drawings sit
        // above the chrome/axes, which sit above the SDK layers, which sit above volume.
        expect(above.drawn).toEqual(['volume', 'ext-above', 'chrome', 'drawings']);
    });

    it('composites at IDENTITY transform — buffers and targets share a backing-store size', () => {
        const { r } = setup();
        r.compositeAbove();
        // The per-renderer dpr transform is set INSIDE each buffer; applying it again here
        // would scale the blit and resample every device-snapped edge.
        expect((r.aboveCtx as AnyRenderer).transform).toEqual([1, 0, 0, 1, 0, 0]);
    });

    it('the crosshair is NOT composited — it keeps its own DOM canvas this phase', () => {
        const { r, above, below } = setup();
        r.compositeBelow();
        r.compositeAbove();
        // Folding the cursor layer in would make every pointer move pay a full multi-buffer
        // composite; it is deliberately deferred.
        expect([...below.drawn, ...above.drawn]).not.toContain('cursor');
    });

    it('skips a buffer flagged blank (no drawImage recorded for it)', () => {
        const { r, above } = setup();
        r.volumeBuf.hasContent = false; // volume + VPVR both off — the shared buffer is transparent
        r.drawingsBuf.hasContent = false; // no drawings placed
        r.compositeAbove();
        expect(above.drawn).toEqual(['ext-above', 'chrome']);
    });

    it('clears the target before each composite (no ghosting of the previous frame)', () => {
        const { r, above } = setup();
        r.compositeAbove();
        r.compositeAbove();
        expect(above.clears).toBe(2);
    });

    it('does nothing when the target has no backing store yet (pre-resize)', () => {
        const { r, above } = setup();
        r.aboveCanvas.width = 0;
        r.compositeAbove();
        expect(above.drawn).toEqual([]);
        expect(above.clears).toBe(0);
    });
});

describe('repaint tiers touch only the composite they need', () => {
    /** Wire the shared stubs every renderFrame tier needs on an unmounted renderer. */
    function tierSetup(): { r: AnyRenderer; below: Recorder; above: Recorder; chromeRenders: () => number; crosshairRenders: () => number } {
        const { r, below, above } = setup();
        let chromeRenders = 0;
        let crosshairRenders = 0;
        r.animator = { active: false, start: () => {} };
        r.paintedData = true;
        r.theme = { background: '#101010', textColor: '#fff' };
        r.chrome = { prepare: () => {}, render: () => { chromeRenders += 1; } };
        r.crosshairLayer = { render: () => { crosshairRenders += 1; } };
        r.axisSurface = () => ({});
        r.externalCrossPx = () => null;
        r.paintData = () => { throw new Error('a cheap tier must never repaint the data layer'); };
        r.extLayers = [];
        return { r, below, above, chromeRenders: () => chromeRenders, crosshairRenders: () => crosshairRenders };
    }

    it('chrome tier: repaints chrome and re-composites ABOVE only, never BELOW', () => {
        const { r, below, above, chromeRenders } = tierSetup();
        r.renderFrame(InvalidateLevel.Chrome);
        expect(chromeRenders()).toBe(1);
        // The countdown chip's wall-clock tick must not touch the backdrop/below-data stack —
        // nothing down there changed, and re-compositing it would be pure waste every second.
        expect(below.drawn).toEqual([]);
        expect(above.drawn).toEqual(['volume', 'ext-above', 'chrome', 'drawings']);
    });

    it('cursor tier: composites NOTHING when no SDK layer tracks the cursor', () => {
        const { r, below, above, crosshairRenders } = tierSetup();
        r.renderFrame(InvalidateLevel.Cursor);
        // The crosshair still repaints — on its own untouched DOM canvas, exactly as before
        // the patch, so a pointer move costs the same as it always did.
        expect(crosshairRenders()).toBe(1);
        expect(below.drawn).toEqual([]);
        expect(above.drawn).toEqual([]);
    });

    it('cursor tier: composites ABOVE when a repaintOnCursor layer actually repainted', () => {
        const { r, below, above } = tierSetup();
        r.scene.ensurePane('price', 'price', 0, 3);
        const hoverBuf = buf('ext-hover', false); // starts blank; the repaint must flag it
        let renders = 0;
        r.extLayers = [{
            def: { id: 'hover', placement: 'above-data', repaintOnCursor: true },
            instance: { render: () => { renders += 1; } },
            buf: hoverBuf,
        }];
        r.aboveExtBufs = [hoverBuf];
        r.renderFrame(InvalidateLevel.Cursor);
        expect(renders).toBe(1);
        expect(hoverBuf.hasContent).toBe(true);
        expect(above.drawn).toEqual(['volume', 'ext-hover', 'chrome', 'drawings']);
        expect(below.drawn).toEqual([]); // still never the below stack
    });
});

describe('teardown releases the detached buffers', () => {
    it('destroy() zeroes every buffer backing store, SDK layers included', () => {
        const { r } = setup();
        const extBuf = r.aboveExtBufs[0];
        r.extLayers = [{ def: { id: 'x' }, instance: {}, buf: extBuf }];
        r.backend = { destroy: () => {} };
        (r as { destroy(): void }).destroy();
        expect(extBuf.canvas.width).toBe(0);
        expect(extBuf.canvas.height).toBe(0);
        // A detached buffer is not a DOM child, so removing the chart's wrapper does not free
        // it — every remount would otherwise leak one full-viewport bitmap per layer.
        for (const b of [r.backdropBuf, r.volumeBuf, r.chromeBuf, r.drawingsBuf]) {
            expect(b.canvas.width).toBe(0);
            expect(b.canvas.height).toBe(0);
            expect(b.hasContent).toBe(false);
        }
        expect(r.aboveExtBufs).toEqual([]);
        expect(r.belowExtBufs).toEqual([]);
        expect(r.belowCtx).toBeNull();
        expect(r.aboveCtx).toBeNull();
    });
});
