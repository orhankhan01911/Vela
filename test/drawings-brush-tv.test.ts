// @vitest-environment jsdom
// The brush, TradingView parity (audit 2026-10-30, factory defaults read from TradingView's code): sky blue 2 px,
// smoothing 5 (its window average), plain ends, the Background switch off; Style (Line with the two ends, Background)
// and Visibility only; its two ends marked when selected, not draggable.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, Freehand, type Drawing, type Projector } from '../src/core/drawings';
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
const brush = (props?: Record<string, unknown>): Freehand =>
    createDrawing('freehand', { id: 'b', paneId: 'price', anchors: stroke, ...(props ? { props } : {}) })! as Freehand;

describe('brush defaults (TradingView)', () => {
    it('sky blue 2 px, smoothing 5, plain ends, Background off with the blue at 20 %', () => {
        const d = brush();
        expect(d.style).toMatchObject({ lineColor: '#00bcd4', lineWidth: 2 });
        expect(d.style.fillColor).toBe('#00bcd433');
        expect([d.tv, d.smooth, d.fillBackground, !!d.style.arrowLeft, !!d.style.arrowRight]).toEqual([true, 5, false, false, false]);
        expect(d.geometry(proj)!.fill).toBeNull();
    });

    it('smooths like TradingView: the zig-zag flattens, the last point stays', () => {
        const g = brush().geometry(proj)!;
        const ys = g.segments.map((s) => s[1]);
        expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(40); // the raw stroke swings 40 px
        const last = g.segments[g.segments.length - 1]!;
        expect(last.slice(2)).toEqual([100 + 29 * 10, 1000 - (500 + 20)]);
    });

    it('Background on fills the stroke; settings survive a save', () => {
        const d = brush();
        d.applySettings({ fillBackground: true, 'style.arrowRight': true });
        const back = deserializeDrawing(d.serialize())! as Freehand;
        expect([back.tv, back.fillBackground, back.style.arrowRight, back.smooth]).toEqual([true, true, true, 5]);
        expect(back.geometry(proj)!.fill).not.toBeNull();
    });

    it('marks its two ends when selected; nothing to drag', () => {
        const d = brush();
        expect(d.selectionMarkers(proj).length).toBe(2);
        expect(d.handlePoints(proj)).toEqual([]);
    });
});

describe('brush dialog (TradingView: Style + Visibility)', () => {
    it('Line (with both ends) and a Background switch; no Smoothing, Text or Coordinates', async () => {
        const s = setup(brush());
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Visibility']);
        s.tab('Style').click();
        const st = s.body('style');
        expect(st.textContent).toContain('Line');
        expect(st.textContent).not.toContain('Smoothing');
        expect(st.querySelector('[data-role="background"] [role="switch"]')).not.toBeNull();
        st.querySelector<HTMLElement>('[data-role="background"] [role="switch"]')!.click();
        expect((s.live() as Freehand).fillBackground).toBe(true);
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Brush');
    });
});
