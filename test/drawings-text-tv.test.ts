// @vitest-environment jsdom
// The text, TradingView parity (audit 2026-10-30, read from TradingView's code, module 210166): its blue at 14 px,
// Background (blue 25 %) and Border (gray) off, wrap at 200 px set by a handle; Text + Visibility tabs; a 1.5 px blue
// outline when selected or hovered and no point shown. Texts saved before keep their look.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, TextLabel, type Drawing, type Projector } from '../src/core/drawings';
import { DrawingPainter } from '../src/renderers/native/drawings/DrawingPainter';
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
const text = (props?: Record<string, unknown>): TextLabel =>
    createDrawing('text', { id: 't', paneId: 'price', anchors: [{ time: 100, price: 500 }], ...(props ? { props } : {}) })! as TextLabel;

describe('text defaults (TradingView, module 210166)', () => {
    it('blue 14 px, no background or border (blue 25 % and gray when switched on), wrap off at 200 px', () => {
        const d = text();
        expect(d.tv).toBe(true);
        expect(d.text).toMatchObject({ value: '', color: '#2962ff', size: 14 });
        expect([d.background, d.border, d.wordWrap]).toEqual([undefined, undefined, undefined]);
        expect([d.backgroundColor, d.borderColor, d.wrapWidth]).toEqual(['#2962ff40', '#707070', 200]);
    });

    it('survives a save; a text saved before keeps its look', () => {
        const d = text();
        d.applySettings({ 'text.value': 'Buy', background: true, wordWrap: true });
        const back = deserializeDrawing(d.serialize())! as TextLabel;
        expect([back.tv, back.background, back.wordWrap, back.text?.color]).toEqual([true, true, true, '#2962ff']);
        const old = deserializeDrawing({ id: 'o', type: 'text', paneId: 'price', anchors: [{ time: 100, price: 500 }], style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' }, text: { value: 'Old', size: 'large' } } as never)! as TextLabel;
        expect(old.tv).toBeUndefined();
        expect(old.text?.size).toBe('large');
        expect(old.handleHidden(0)).toBe(false);
    });
});

describe('text handles (TradingView)', () => {
    it('no point shown; a press on it drags the text', () => {
        const d = text();
        d.applySettings({ 'text.value': 'Buy zone' });
        expect(d.handleHidden(0)).toBe(true);
        expect(d.hitHandle(100, 500, proj, 4)).toBe(-1);
        expect(d.hitTest(110, 505, proj, 4)).toBe(true);
    });

    it('with Text wrap on: a square on the right edge sets the wrap width (at least 100 px)', () => {
        const d = text();
        d.applySettings({ 'text.value': 'Buy zone', wordWrap: true });
        const pts = d.handlePoints(proj);
        expect(pts.length).toBe(2);
        expect(pts[1]![0]).toBe(100 + 200 + 5);
        expect(d.handleShapes()[1]).toBe('square');
        expect(d.handleCursor(1)).toBe('ew-resize');
        expect(d.hitHandle(pts[1]![0], pts[1]![1], proj, 4)).toBe(1);
        expect(d.dragHandlePx(1, 402, 0, proj)).toBe(true);
        expect(d.wrapWidth).toBe(402 - 100 - 2);
        d.dragHandlePx(1, 120, 0, proj);
        expect(d.wrapWidth).toBe(100);
    });
});

describe('text outline (TradingView: 1.5 px, its blue selected, blue 40 % hovered)', () => {
    const strokes = (targets: { selected?: ReadonlySet<string>; hovered?: string | null }) => {
        const out: Array<[string, number]> = [];
        const ctx = {
            globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top',
            setTransform() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arcTo() {}, arc() {}, rect() {}, clip() {},
            fill() {}, setLineDash() {}, fillRect() {}, strokeRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, fillText() {},
            measureText: () => ({ width: 40 }), getTransform: () => ({ a: 1 }),
            stroke() { out.push([String(ctx.strokeStyle), ctx.lineWidth]); },
        };
        const d = text();
        d.applySettings({ 'text.value': 'Buy zone' });
        new DrawingPainter().paintAll(ctx as unknown as CanvasRenderingContext2D, [d], proj, { textColor: '#fff', fontFamily: 'sans-serif' } as unknown as VelaTheme, targets);
        return out.filter(([c]) => c.startsWith('#2962ff'));
    };
    it('selected and hovered outlines', () => {
        expect(strokes({ selected: new Set(['t']) })).toEqual([['#2962ff', 1.5]]);
        expect(strokes({ hovered: 't' })).toEqual([['#2962ff66', 1.5]]);
        expect(strokes({})).toEqual([]);
    });
});

describe('text dialog (TradingView: Text + Visibility)', () => {
    it('Text tab: style row, the text, Background, Border, Text wrap', async () => {
        const d = text();
        d.applySettings({ 'text.value': 'Buy zone' });
        const s = setup(d);
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Text', 'Visibility']);
        s.tab('Text').click();
        const body = s.body('text');
        expect(body.querySelector('[data-role="background"]')!.textContent).toContain('Background');
        expect(body.querySelector('[data-role="border"]')!.textContent).toContain('Border');
        expect(body.querySelector('[data-role="wrap"]')!.textContent).toContain('Text wrap');
        expect(body.textContent).not.toContain('Wrap width');
        body.querySelector<HTMLElement>('[data-role="wrap"] [role="switch"], [data-role="wrap"] input')!.click();
        expect((s.live() as TextLabel).wordWrap).toBe(true);
    });
});
