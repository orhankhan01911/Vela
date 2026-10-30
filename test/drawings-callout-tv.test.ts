// @vitest-environment jsdom
// The callout, TradingView parity (audit 2026-10-30, read from TradingView's code, module 583711): white 14 px text on
// sky blue 700 at 70 % with a 2 px border, a radius-8 bubble whose tail is TradingView's wedge, starting empty; Text
// (with Background, Border, Text wrap), Coordinates and Visibility tabs; the bubble and target are grabbed, not the tail.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { Callout, createDrawing, deserializeDrawing, type Drawing, type Projector } from '../src/core/drawings';
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
// Target (100, 600 px), bubble centred at (300, 400 px).
const callout = (props?: Record<string, unknown>): Callout =>
    createDrawing('callout', { id: 'c', paneId: 'price', anchors: [{ time: 100, price: 400 }, { time: 300, price: 600 }], ...(props ? { props } : {}) })! as Callout;

describe('callout defaults (TradingView, module 583711)', () => {
    it('white 14 px text, sky blue 700 border 2 px, the same at 70 % behind, starts empty, wrap off', () => {
        const d = callout();
        expect(d.tv).toBe(true);
        expect(d.text).toMatchObject({ value: '', color: '#ffffff', size: 14 });
        expect(d.style).toMatchObject({ lineColor: '#0097a7', lineWidth: 2, fillColor: '#0097a7b3' });
        expect([!!d.wordWrap, d.wrapWidth]).toEqual([false, 200]);
    });

    it('survives a save; a callout saved before keeps its look', () => {
        const d = callout();
        d.applySettings({ 'text.value': 'Breakout', wordWrap: true });
        const back = deserializeDrawing(d.serialize())! as Callout;
        expect([back.tv, back.wordWrap, back.text?.value]).toEqual([true, true, 'Breakout']);
        const old = deserializeDrawing({ id: 'o', type: 'callout', paneId: 'price', anchors: [{ time: 100, price: 400 }, { time: 300, price: 600 }], style: { lineColor: '#38c0fd', lineWidth: 1, lineStyle: 'solid', fillColor: '#38c0fdd9' }, text: { value: 'Callout', size: 'normal' } } as never)! as Callout;
        expect(old.tv).toBeUndefined();
        expect(old.schema().fields.some((f) => f.path === 'style.lineStyle')).toBe(true);
    });
});

describe('callout geometry (TradingView)', () => {
    it('bubble = text + 2 x (radius 8 + margin 2), centred on the box point; grabbed on the bubble, not the tail', () => {
        const d = callout();
        d.applySettings({ 'text.value': 'Hi' });
        const b = d.box(proj)!;
        expect(b.h).toBe(14 + 20);
        expect(b.x + b.w / 2).toBe(300);
        expect(d.hitTest(300, 400, proj, 3)).toBe(true);
        expect(d.hitTest(200, 500, proj, 3)).toBe(false); // halfway along the tail
        expect(d.handlePoints(proj)).toEqual([[100, 600]]);
    });

    it('Text wrap: a point on the right edge sets the width (left edge stays, at least 100 px)', () => {
        const d = callout();
        d.applySettings({ 'text.value': 'Hi', wordWrap: true });
        const b0 = d.box(proj)!;
        expect(b0.w).toBe(200 + 20);
        const pts = d.handlePoints(proj);
        expect(pts[1]).toEqual([b0.x + b0.w, b0.y + b0.h / 2]);
        expect(d.dragHandlePx(1, b0.x + 320, 0, proj)).toBe(true);
        expect(d.wrapWidth).toBe(310);
        expect(d.box(proj)!.x).toBeCloseTo(b0.x);
        d.dragHandlePx(1, b0.x + 50, 0, proj);
        expect(d.wrapWidth).toBe(100);
    });
});

describe('callout painting (TradingView path)', () => {
    const ops = (target: [number, number]) => {
        const out: string[] = [];
        const rec = (name: string) => (...a: number[]) => out.push(`${name}(${a.map((v) => Math.round(v)).join(',')})`);
        const ctx = {
            globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top', lineCap: '', lineJoin: '',
            setTransform() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo: rec('M'), lineTo: rec('L'), arcTo: rec('A'), arc() {}, rect() {}, clip() {},
            fill: () => out.push('fill'), stroke: () => out.push('stroke'), setLineDash() {}, fillRect() {}, strokeRect() {}, save() {}, restore() {}, translate() {}, rotate() {},
            fillText: (t: string) => out.push(`text(${t})`),
            measureText: () => ({ width: 40 }), getTransform: () => ({ a: 1 }),
        };
        const d = createDrawing('callout', { id: 'c', paneId: 'price', anchors: [{ time: target[0], price: 1000 - target[1] }, { time: 300, price: 600 }] })! as Callout;
        d.applySettings({ 'text.value': 'Hi' });
        new DrawingPainter().paintAll(ctx as unknown as CanvasRenderingContext2D, [d], proj, { textColor: '#fff', fontFamily: 'sans-serif', background: '#000' } as unknown as VelaTheme, {});
        return out;
    };
    it('target below-left: the bottom-left corner turns into the wedge; stroke before fill; text', () => {
        // Bubble 60 x 34 at (270, 383) local; target (100, 600) → local (-170, 217), region 2.
        const o = ops([100, 600]);
        expect(o).toContain('L(-170,217)');
        expect(o.indexOf('stroke')).toBeLessThan(o.indexOf('fill'));
        expect(o).toContain('text(Hi)');
    });
    it('target straight above: a 16 px wedge in the middle of the top side', () => {
        const o = ops([300, 200]);
        expect(o.slice(0, 5)).toEqual(['M(8,0)', 'L(22,0)', 'L(30,-183)', 'L(38,0)', 'L(52,0)']);
    });
    it('target inside the bubble: no tail', () => {
        const o = ops([300, 400]);
        expect(o.filter((s) => s.startsWith('L(')).length).toBe(4);
    });
});

describe('callout dialog (TradingView: Text, Coordinates, Visibility)', () => {
    it('Text tab: Background, Border, Text wrap', async () => {
        const d = callout();
        d.applySettings({ 'text.value': 'Breakout' });
        const s = setup(d);
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Text', 'Coordinates', 'Visibility']);
        s.tab('Text').click();
        const body = s.body('text');
        for (const role of ['background', 'border', 'wrap']) expect(body.querySelector(`[data-role="${role}"]`)).not.toBeNull();
    });
});
