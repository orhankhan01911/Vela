// @vitest-environment jsdom
// The highlighter, TradingView parity (audit 2026-10-30, factory defaults read from TradingView's code, module 644455):
// its red at 20 %, 20 px, the brush's smoothing and end markers; Style (Line color, Thickness 8-96 px) and Visibility.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, Freehand, Highlighter, type Drawing, type Projector } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});
afterEach(() => {
    document.body.replaceChildren();
});
const settled = () => new Promise<void>((r) => setTimeout(r, 50));

function setup(drawing: Drawing) {
    const host = document.createElement('div');
    document.body.append(host);
    const popup = new DrawingSettingsPopup(host, DARK_THEME);
    let live = drawing;
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            live = deserializeDrawing(live.serialize())!;
        },
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    popup.open([drawing], null, actions);
    const tab = (name: string): HTMLElement => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].find((e) => e.textContent === name)!;
    return {
        live: () => live,
        gear: () => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!,
        tabs: () => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!),
        tab,
        body: (key: string) => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!,
    };
}

const proj: Projector = { xOf: (t) => t, yOf: (p) => 1000 - p, pxToPoint: (x, y) => ({ time: x, price: 1000 - y }), paneIdAtY: () => 'price', width: 2000, height: 1000 };
const stroke = Array.from({ length: 30 }, (_, i) => ({ time: 100 + i * 10, price: 500 + (i % 2 ? 20 : -20) }));
const marker = (props?: Record<string, unknown>): Highlighter =>
    createDrawing('highlighter', { id: 'h', paneId: 'price', anchors: stroke, ...(props ? { props } : {}) })! as Highlighter;


describe('highlighter defaults (TradingView)', () => {
    it('its red at 20 %, 20 px, smoothing 5, no background', () => {
        const d = marker();
        expect(d.style).toMatchObject({ lineColor: '#f2364533', lineWidth: 20 });
        expect([d.tv, d.smooth]).toEqual([true, 5]);
        expect(d.geometry(proj)!.fill).toBeNull();
    });

    it('smooths like the brush: the zig-zag flattens', () => {
        const ys = marker().geometry(proj)!.segments.map((s) => s[1]);
        expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(40);
    });

    it('is hit across its whole width (half the thickness from the middle)', () => {
        // A flat stretch: y = 500 px; 9 px off the middle is inside a 20 px swath.
        const flat = createDrawing('highlighter', { paneId: 'price', anchors: [{ time: 100, price: 500 }, { time: 400, price: 500 }] })! as Highlighter;
        expect(flat.hitTest(250, 509, proj, 3)).toBe(true);
        expect(flat.hitTest(250, 512, proj, 3)).toBe(false);
    });

    it('marks its two ends when selected; nothing to drag', () => {
        const d = marker();
        expect(d.selectionMarkers(proj).length).toBe(2);
        expect(d.handlePoints(proj)).toEqual([]);
    });

    it('survives a save', () => {
        const d = marker();
        d.applySettings({ 'style.lineWidth': 48 });
        const back = deserializeDrawing(d.serialize())! as Highlighter;
        expect([back.tv, back.smooth, back.style.lineWidth]).toEqual([true, 5, 48]);
    });
});

describe('strokes saved before keep their look', () => {
    it('a highlighter or brush saved with no props is not turned into TradingView\'s', () => {
        const style = { lineColor: '#ffeb3b59', lineWidth: 14, lineStyle: 'solid' };
        const h = deserializeDrawing({ id: 'o', type: 'highlighter', paneId: 'price', anchors: stroke, style } as never)! as Highlighter;
        expect([h.tv, h.style.lineWidth]).toEqual([undefined, 14]);
        expect(h.selectionMarkers(proj)).toEqual([]);
        expect(h.schema().fields.find((f) => f.path === 'style.lineWidth')!.kind).toBe('number');
        const b = deserializeDrawing({ id: 'p', type: 'freehand', paneId: 'price', anchors: stroke, style: { ...style, fillColor: '#ff000033' } } as never)! as Freehand;
        expect(b.tv).toBeUndefined();
        expect(b.geometry(proj)!.fill).not.toBeNull(); // it filled before, it still fills
    });
});

describe('highlighter dialog (TradingView: Style + Visibility)', () => {
    it('Line (a color) and Thickness (8 to 96 px); no Text or Coordinates', async () => {
        const s = setup(marker());
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Visibility']);
        s.tab('Style').click();
        const st = s.body('style');
        expect(st.querySelector('[data-role="line"]')!.textContent).toContain('Line');
        const thick = st.querySelector<HTMLElement>('[data-role="thickness"]')!;
        expect(thick.textContent).toContain('Thickness');
        expect(thick.textContent).toContain('20px');
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Highlighter');
    });

    it('the floating bar offers the same thickness list', () => {
        const s = setup(marker());
        const w = document.querySelector<HTMLElement>('.vela-dpop [data-tip="Line width"]')!;
        expect(w.textContent).toContain('20px');
        expect(s.live().style.lineWidth).toBe(20);
    });
});
