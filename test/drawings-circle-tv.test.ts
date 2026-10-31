// @vitest-environment jsdom
// Circle, TradingView parity (audit 2026-10-31, read from TradingView's module 28918 and a live shape): tan orange 2 px,
// the orange at 20 % behind (Background switch); text 14 px orange, centred in the circle; the centre handle hidden while
// it shows text; dialog Style (Border, Background), Text, Coordinates, Visibility; bar line colour, background, text
// colour, width.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, Circle, type Drawing, type Projector } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));
const proj: Projector = {
    xOf: (t) => t,
    yOf: (p, pane) => (pane === 'price' ? 1000 - p : null),
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    width: 2000,
    height: 1000,
};
const circ = (props?: Record<string, unknown>): Circle =>
    createDrawing('circle', { id: 'c', paneId: 'price', anchors: [{ time: 200, price: 500 }, { time: 260, price: 580 }], ...(props ? { props } : {}) })! as Circle;

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
        restore: () => {},
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    popup.open([drawing], null, actions);
    const tips = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-dpop [data-tip]')].map((e) => e.dataset.tip!);
    const gear = (): HTMLButtonElement => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!;
    const tabs = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!);
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    return { tips, gear, tabs, body };
}

describe('Circle (TradingView)', () => {
    it('a new one: TradingView\'s colours and text', () => {
        const d = circ();
        expect([d.tv, d.fillBackground, d.style.lineColor, d.style.lineWidth, d.style.fillColor]).toEqual([true, true, '#FF9800', 2, '#FF980033']);
        d.applySettings({ 'text.value': 'x' });
        expect(d.text).toMatchObject({ color: '#FF9800', size: 14, hAlign: 'center', vAlign: 'center' });
    });

    it('stays round (radius 100 px); Background off drops the fill (no grabbing inside)', () => {
        const d = circ();
        expect(d.circle(proj)!.r).toBeCloseTo(100, 9);
        expect(d.hitTest(200, 500, proj, 4)).toBe(true);
        d.applySettings({ fillBackground: false });
        expect(d.filled()).toBe(false);
        expect(d.hitTest(200, 500, proj, 4)).toBe(false);
    });

    it('with text only the edge handle shows; it still sets the radius', () => {
        const d = circ();
        expect(d.handlePoints(proj)).toHaveLength(2);
        d.applySettings({ 'text.value': 'Zone' });
        expect(d.handlePoints(proj)).toEqual([[260, 420]]);
        expect(d.dragHandlePx(0, 350, 500, proj)).toBe(true);
        expect(d.anchors[0]).toMatchObject({ time: 200, price: 500 });
        expect(d.circle(proj)!.r).toBeCloseTo(150, 9);
    });

    it('survives a save; one saved before (no props) keeps its look', () => {
        const d = circ();
        d.applySettings({ fillBackground: false });
        expect((deserializeDrawing(d.serialize()) as Circle).fillBackground).toBe(false);
        const old = deserializeDrawing({ ...circ().serialize(), props: undefined }) as Circle;
        expect(old.tv).toBeUndefined();
        expect(old.textDefaults()).toBeUndefined();
    });

    it('bar: line colour, background, text colour, width; dialog: Style (Border, Background), Text, Coordinates, Visibility', async () => {
        const s = setup(circ());
        const tips = s.tips();
        const order = ['Line color', 'Fill', 'Text color', 'Line width'];
        for (const t of order) expect(tips).toContain(t);
        expect(order.map((t) => tips.indexOf(t))).toEqual([...order.map((t) => tips.indexOf(t))].sort((a, b) => a - b));
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Text', 'Coordinates', 'Visibility']);
        const roles = [...s.body('style').querySelectorAll<HTMLElement>(':scope > [data-role]')].map((e) => e.dataset.role!);
        expect(roles).toEqual(['border', 'background']);
        expect(s.body('text').textContent).not.toContain('alignment');
    });
});
