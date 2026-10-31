// @vitest-environment jsdom
// Cross line, TradingView parity (audit 2026-10-31, read from TradingView's module 75519 and a live shape): 2 px
// TradingView blue, price and time labels on, no text; dialog Style (Line, Price label, Time label), Coordinates,
// Visibility; bar colour, width, style.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, CrossLine, TV_LINE_COLOR, type Drawing } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));
const cross = (props?: Record<string, unknown>): CrossLine =>
    createDrawing('crossline', { id: 'c', paneId: 'price', anchors: [{ time: 100, price: 500 }], ...(props ? { props } : {}) })! as CrossLine;

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
    const dialog = (): string => host.querySelector('.vela-drawing-dialog')!.textContent!;
    return { tips, gear, tabs, body, dialog };
}

describe('Cross line (TradingView)', () => {
    it('a new one: TradingView blue 2 px, both labels on, no text', () => {
        const d = cross();
        expect([d.tv, d.style.lineColor, d.style.lineWidth, d.showPrice !== false, d.showTime !== false]).toEqual([true, TV_LINE_COLOR, 2, true, true]);
        expect(d.schema().fields.some((f) => f.path.startsWith('text.'))).toBe(false);
    });

    it('survives a save; one saved before keeps its text', () => {
        const back = deserializeDrawing(cross().serialize()) as CrossLine;
        expect(back.tv).toBe(true);
        const old = cross({ showPrice: true, showTime: false });
        expect(old.tv).toBeUndefined();
        expect(old.schema().fields.map((f) => f.path)).toContain('text.value');
        expect((deserializeDrawing({ ...old.serialize(), props: undefined }) as CrossLine).tv).toBeUndefined();
    });

    it('bar: colour, width, style; dialog: Style (Line, Price label, Time label), Coordinates, Visibility', async () => {
        const s = setup(cross());
        const tips = s.tips();
        for (const t of ['Line color', 'Line width', 'Line style']) expect(tips).toContain(t);
        expect(tips).not.toContain('Text');
        expect(tips).not.toContain('Show price');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Cross line');
        expect(s.tabs()).toEqual(['Style', 'Coordinates', 'Visibility']);
        const style = s.body('style').textContent!;
        expect(style.indexOf('Line')).toBeLessThan(style.indexOf('Price label'));
        expect(style.indexOf('Price label')).toBeLessThan(style.indexOf('Time label'));
    });
});
