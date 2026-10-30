// @vitest-environment jsdom
// The note, TradingView parity (audit 2026-10-30, read from TradingView's code, module 229151): its blue 24 x 30 pin,
// the text in a 236 px tooltip shown while hovered or selected (caret, shadow, theme colors), typed in place; Style is
// one Label row, Text holds Background and Border; no "Always show text". Notes saved before keep their look.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, Note, TV_LINE_COLOR, type Drawing, type Projector } from '../src/core/drawings';
import { noteTooltip } from '../src/renderers/native/drawings/DrawingPainter';
import type { VelaTheme } from '../src/core/options';
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
const note = (at = { time: 500, price: 500 }, props?: Record<string, unknown>): Note =>
    createDrawing('note', { id: 'n', paneId: 'price', anchors: [at], ...(props ? { props } : {}) })! as Note;
const theme = { textColor: '#fff', fontFamily: 'sans-serif', background: '#000000' } as unknown as VelaTheme;
const measure = { save() {}, restore() {}, font: '', measureText: (t: string) => ({ width: t.length * 7 }) } as unknown as CanvasRenderingContext2D;

describe('note defaults (TradingView, module 229151)', () => {
    it('blue pin, empty text at 14 px (theme text color), tooltip Background on and Border off, no "Always show text"', () => {
        const d = note();
        expect(d.tv).toBe(true);
        expect(d.style.lineColor).toBe(TV_LINE_COLOR);
        expect(d.text).toMatchObject({ value: '', size: 14 });
        expect(d.text?.color).toBeUndefined();
        expect([d.background, !!d.border]).toEqual([true, false]);
        expect(d.schema().fields.map((f) => f.path)).not.toContain('showText');
    });

    it('survives a save; a note saved before keeps its look', () => {
        const d = note();
        d.applySettings({ 'text.value': 'Earnings', border: true, background: false });
        const back = deserializeDrawing(d.serialize())! as Note;
        expect([back.tv, back.background, back.border, back.text?.value]).toEqual([true, false, true, 'Earnings']);
        const old = deserializeDrawing({ id: 'o', type: 'note', paneId: 'price', anchors: [{ time: 5, price: 5 }], style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' }, props: { showText: true }, text: { value: 'Old', size: 'normal' } } as never)! as Note;
        expect([old.tv, old.showText]).toEqual([undefined, true]);
    });
});

describe('note pin (TradingView)', () => {
    it('the 24 x 30 pin, tip on the point, is what is grabbed; no handle, a selection marker at the tip', () => {
        const d = note();
        expect(d.hitTest(500, 485, proj, 3)).toBe(true);
        expect(d.hitTest(500, 469, proj, 3)).toBe(false);
        expect(d.hitTest(513, 490, proj, 3)).toBe(false);
        expect(d.handleHidden(0)).toBe(true);
        expect(d.selectionMarkers(proj)).toEqual([[500, 500]]);
    });
});

describe('note tooltip (TradingView)', () => {
    it('236 px wide, centred on the pin, 13 px above it, caret down; text wrapped inside 12 px padding, 5 px between lines', () => {
        const d = note();
        d.applySettings({ 'text.value': 'one\ntwo' });
        const t = noteTooltip(measure, d, proj, theme)!;
        expect([t.width, t.left]).toEqual([236, 500 - 118]);
        expect(t.height).toBe(2 * 14 + 24 + 5);
        expect(t.top).toBe(500 - 30 - t.height - 13);
        expect(t.caret).toBe('bottom');
        const long = noteTooltip(measure, d, proj, theme, 'word '.repeat(60))!;
        expect(long.lines.length).toBeGreaterThan(1);
    });

    it('goes below the point near the top, and stays 10 px inside the sides (no caret right at a side)', () => {
        const top = note({ time: 500, price: 1000 - 40 });
        top.applySettings({ 'text.value': 'x' });
        expect(noteTooltip(measure, top, proj, theme)).toMatchObject({ top: 40 + 13, caret: 'top' });
        const left = note({ time: 15, price: 500 });
        left.applySettings({ 'text.value': 'x' });
        expect(noteTooltip(measure, left, proj, theme)).toMatchObject({ left: 10, caret: null });
    });
});

describe('note dialog (TradingView: Style, Text, Coordinates, Visibility)', () => {
    it('Style is one Label row; Text has Background and Border', async () => {
        const d = note();
        d.applySettings({ 'text.value': 'Earnings' });
        const s = setup(d);
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Text', 'Coordinates', 'Visibility']);
        s.tab('Style').click();
        expect(s.body('style').querySelector('[data-role="label"]')!.textContent).toContain('Label');
        expect(s.body('style').textContent).not.toContain('Background');
        s.tab('Text').click();
        for (const role of ['background', 'border']) expect(s.body('text').querySelector(`[data-role="${role}"]`)).not.toBeNull();
        expect(s.body('text').textContent).not.toContain('Always show');
    });
});
