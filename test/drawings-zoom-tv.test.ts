// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import { UserDrawingController, type UserDrawingDeps, type ZoomSnapshot } from '../src/renderers/native/drawings/UserDrawingController';
import { DrawingToolbar } from '../src/renderers/native/drawings/DrawingToolbar';
import { buildToolbar } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';

/**
 * TradingView's Zoom In / Zoom Out (module 649873, read 2026-10-30): the first press starts a box at the nearest
 * bar centre, a second press (or the release of a drag) ends it; the bars between fill the width and the pane's
 * price scale shows the two prices with autoscale off. Both ends on one bar: nothing happens. Either way the tool
 * goes back to the cursor. Every zoom goes on a stack; the Zoom Out button shows while the stack is not empty and
 * puts the last view back (bar spacing, offset, the pane's scale mode).
 */

type AnyRenderer = Record<string, any>;

/** An unmounted renderer: 100 bars over 800 px, one price pane 0..100 over 200 px. */
function renderer(): { r: AnyRenderer; pane: AnyRenderer } {
    const nr = new NativeRenderer();
    const r = nr as unknown as AnyRenderer;
    r.coords.setSize(800, 200, 1);
    r.coords.setBars(Array.from({ length: 100 }, (_, i) => (i + 1) * 1000));
    r.coords.setViewport({ barSpacing: 8, rightOffset: 0 });
    r.emitViewportChange = () => {};
    r.scheduler = { invalidate: () => {} };
    r.animator = { stop: () => {} };
    const pane = { id: 'price', kind: 'price', bounds: { top: 0, height: 200 }, scale: { min: 0, max: 100 }, scaleTarget: { min: 0, max: 100 }, manualScale: null, initialized: true };
    r.scene.panes.clear();
    r.scene.panes.set('price', pane);
    return { r, pane };
}

describe('renderer: zoom to a box (zoomToViewport)', () => {
    it('fits the bars between the two points and the two prices', () => {
        const { r, pane } = renderer();
        const x0 = r.coords.logicalToX(40);
        const x1 = r.coords.logicalToX(59);
        const snap = r.zoomToBox(x0, 50, x1, 150) as ZoomSnapshot;
        expect(snap).not.toBeNull();
        expect(snap.viewport).toEqual({ barSpacing: 8, rightOffset: 0 });
        expect(snap.manual).toBeNull();
        const vr = r.coords.visibleLogicalRange();
        expect(vr.from).toBeCloseTo(39.5, 5);
        expect(vr.to).toBeCloseTo(59.5, 5);
        expect(pane.manualScale).toEqual({ min: 25, max: 75 });
    });

    it('does nothing when both ends sit on one bar', () => {
        const { r, pane } = renderer();
        const x = r.coords.logicalToX(50);
        expect(r.zoomToBox(x - 1, 20, x + 1, 180)).toBeNull();
        expect(r.coords.getViewport()).toEqual({ barSpacing: 8, rightOffset: 0 });
        expect(pane.manualScale).toBeNull();
    });

    it('restoreZoom puts back the spacing, offset and autoscale', () => {
        const { r, pane } = renderer();
        const snap = r.zoomToBox(r.coords.logicalToX(70), 10, r.coords.logicalToX(80), 90) as ZoomSnapshot;
        r.restoreZoom(snap);
        expect(r.coords.getViewport()).toEqual({ barSpacing: 8, rightOffset: 0 });
        expect(pane.manualScale).toBeNull();
    });

    it('snaps x to the nearest bar centre', () => {
        const { r } = renderer();
        const c = r.coords.logicalToX(30);
        expect(r.zoomSnapX(c + 3)).toBeCloseTo(c, 6);
    });
});

/** A controller whose zoom deps record their calls. */
function controller(): { ctrl: UserDrawingController; calls: unknown[][]; host: HTMLElement } {
    const host = document.createElement('div');
    const plot = document.createElement('div');
    const canvas = document.createElement('canvas');
    document.body.append(host, plot);
    const calls: unknown[][] = [];
    const snap: ZoomSnapshot = { viewport: { barSpacing: 8, rightOffset: 0 }, paneId: 'price', manual: null };
    const deps = {
        projector: () => ({}) as never,
        dpr: () => 1,
        theme: () => DARK_THEME,
        requestScaleUpdate: () => {},
        seriesBoundaries: () => [],
        priceZ: () => null,
        requestDataPaint: () => {},
        seriesLook: () => ({ style: 'candles', upColor: '', downColor: '', lineColor: '' }),
        chartBarMs: () => 60_000,
        snap: (p: never) => p,
        setSnapMode: () => {},
        setToolbarGutter: () => {},
        zoomSnapX: (x: number) => Math.round(x / 10) * 10,
        zoomToBox: (...a: number[]) => {
            calls.push(['zoom', ...a]);
            return Math.abs(a[2]! - a[0]!) >= 10 ? snap : null;
        },
        restoreZoom: (s: ZoomSnapshot) => calls.push(['restore', s]),
    } as unknown as UserDrawingDeps;
    const ctrl = new UserDrawingController(host, plot, canvas, deps);
    ctrl.render = () => {};
    return { ctrl, calls, host };
}

const modes = (ctrl: UserDrawingController): unknown[] => {
    const out: unknown[] = [];
    ctrl.onDrawingIntent((i) => {
        if (i.kind === 'mode') out.push(i.mode);
    });
    return out;
};

describe('controller: the Zoom In mode', () => {
    it('click, click: zooms from the snapped press to the second press, then back to the cursor', () => {
        const { ctrl, calls } = controller();
        const seen = modes(ctrl);
        ctrl.setMode('zoom');
        expect(seen).toEqual(['zoom']);
        expect(ctrl.claim(10, 10)).toBe(true); // the press is the tool's, not a pan
        ctrl.pointerDown(103, 40);
        ctrl.pointerUp(103, 40); // a click: the box stays open
        expect(calls).toEqual([]);
        ctrl.pointerMove(240, 120);
        ctrl.pointerDown(240, 120);
        expect(calls).toEqual([['zoom', 100, 40, 240, 120]]);
        expect(seen).toEqual(['zoom', null]);
        expect(ctrl.canZoomOut()).toBe(true);
    });

    it('press-drag-release zooms in one gesture', () => {
        const { ctrl, calls } = controller();
        ctrl.setMode('zoom');
        ctrl.pointerDown(100, 40);
        ctrl.pointerMove(300, 150);
        ctrl.pointerUp(300, 150);
        expect(calls).toEqual([['zoom', 100, 40, 300, 150]]);
        expect(ctrl.canZoomOut()).toBe(true);
    });

    it('both ends on one bar: no zoom, nothing to zoom out of, tool still ends', () => {
        const { ctrl } = controller();
        const seen = modes(ctrl);
        ctrl.setMode('zoom');
        ctrl.pointerDown(100, 40);
        ctrl.pointerUp(100, 40);
        ctrl.pointerDown(102, 150);
        expect(ctrl.canZoomOut()).toBe(false);
        expect(seen).toEqual(['zoom', null]);
    });

    it('Escape and right-click cancel an open box', () => {
        const { ctrl, calls } = controller();
        ctrl.setMode('zoom');
        ctrl.pointerDown(100, 40);
        expect(ctrl.handleKey(new KeyboardEvent('keydown', { key: 'Escape' }))).toBe(true);
        ctrl.setMode('zoom');
        ctrl.pointerDown(100, 40);
        expect(ctrl.cancelPlacement()).toBe(true);
        expect(calls).toEqual([]);
    });

    it('zoom out walks the stack back, newest first', () => {
        const { ctrl, calls } = controller();
        for (let k = 0; k < 2; k += 1) {
            ctrl.setMode('zoom');
            ctrl.pointerDown(100, 40);
            ctrl.pointerMove(300, 150);
            ctrl.pointerUp(300, 150);
        }
        expect(ctrl.zoomOut()).toBe(true);
        expect(ctrl.canZoomOut()).toBe(true);
        expect(ctrl.zoomOut()).toBe(true);
        expect(ctrl.canZoomOut()).toBe(false);
        expect(ctrl.zoomOut()).toBe(false);
        expect(calls.filter((c) => c[0] === 'restore')).toHaveLength(2);
    });

    it('arming a drawing tool or the ruler leaves Zoom In', () => {
        const { ctrl } = controller();
        const seen = modes(ctrl);
        ctrl.setMode('zoom');
        ctrl.setMode('measure');
        expect(seen).toEqual(['zoom', 'measure']);
        ctrl.setMode('zoom');
        ctrl.setActiveTool('trendline');
        expect(seen).toEqual(['zoom', 'measure', 'zoom', null]);
    });
});

describe('toolbar: Zoom in / Zoom out buttons', () => {
    it('Zoom in sits under Measure; Zoom out shows only while there is a zoom to go back from', () => {
        const side = document.createElement('div');
        document.body.append(side);
        let zoom = 0;
        let out = 0;
        const tb = new DrawingToolbar(side, DARK_THEME, () => {}, undefined, undefined, undefined, undefined, undefined, {
            onZoom: () => (zoom += 1),
            onZoomOut: () => (out += 1),
        });
        tb.setDefinition(buildToolbar(undefined).definition);
        tb.setVisible(true);
        const labels = [...side.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
        const m = labels.indexOf('Measure');
        expect(labels.slice(m, m + 3)).toEqual(['Measure', 'Zoom in', 'Zoom out']);
        const zin = side.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')!;
        const zout = side.querySelector<HTMLButtonElement>('button[aria-label="Zoom out"]')!;
        expect(zout.style.display).toBe('none');
        tb.setZoomOutShown(true);
        expect(zout.style.display).toBe('');
        zin.click();
        zout.click();
        expect([zoom, out]).toEqual([1, 1]);
        tb.setZoomActive(true);
        expect(zin.dataset.active).toBe('1');
    });

    it('no buttons without the callbacks', () => {
        const side = document.createElement('div');
        document.body.append(side);
        const tb = new DrawingToolbar(side, DARK_THEME, () => {});
        tb.setDefinition(buildToolbar(undefined).definition);
        tb.setVisible(true);
        expect(side.querySelector('button[aria-label="Zoom in"]')).toBeNull();
    });
});
