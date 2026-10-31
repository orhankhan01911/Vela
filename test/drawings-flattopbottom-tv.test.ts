// @vitest-environment jsdom
// Flat top/bottom, TradingView parity (audit 2026-10-31, read from TradingView's modules 293769 / 57137 and a live
// shape): tan orange 2 px, the orange at 20 % behind (on), no extend, no prices; four handles (the flat line's ends move
// that end's bar and the flat price); Style (Line with its ends, Extend, Prices, Background), Text, Visibility (no
// Coordinates); bar: line colour, background, text colour, width, style.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, FlatTopBottom, type Drawing, type Projector } from '../src/core/drawings';
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
const pts = [{ time: 100, price: 600 }, { time: 300, price: 700 }, { time: 300, price: 400 }];
const flat = (props?: Record<string, unknown>): FlatTopBottom =>
    createDrawing('flattopbottom', { id: 'f', paneId: 'price', anchors: pts, ...(props ? { props } : {}) })! as FlatTopBottom;

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
    return { tips, gear, tabs, body, dialog, live: () => live };
}

describe('Flat top/bottom (TradingView)', () => {
    it('a new one: TradingView\'s defaults', () => {
        const d = flat();
        expect([d.tv, d.style.lineColor, d.style.lineWidth, d.style.lineStyle, d.style.fillColor]).toEqual([true, '#FF9800', 2, 'solid', '#FF980033']);
        expect([d.fillBackground, d.extendLeft, d.extendRight, d.showPrices, d.priceSize, d.priceColor]).toEqual([true, false, false, false, 12, '#FF9800']);
        expect(d.textDefaults()).toMatchObject({ color: '#FF9800', size: 14, hAlign: 'left', vAlign: 'top' });
    });

    it('four handles: p1, p2 and the flat line under p2 and p1; those move that bar and the flat price', () => {
        const d = flat();
        expect(d.handlePoints(proj)).toEqual([[100, 400], [300, 300], [300, 600], [100, 600]]);
        expect(d.dragHandlePx(2, 350, 650, proj)).toBe(true);
        expect(d.anchors.map((a) => [a.time, a.price])).toEqual([[100, 600], [350, 700], [300, 350]]);
        expect(d.dragHandlePx(3, 50, 700, proj)).toBe(true);
        expect(d.anchors.map((a) => [a.time, a.price])).toEqual([[50, 600], [350, 700], [300, 300]]);
        expect(d.dragHandlePx(0, 0, 0, proj)).toBe(false);
    });

    it('Extend runs both lines (and the fill) to the pane edges; Background off drops the fill', () => {
        const d = flat();
        d.applySettings({ extendRight: true });
        const g = d.geometry(proj)!;
        expect(g.segments[0]![2]).toBe(2000);
        expect(g.segments[1]).toEqual([100, 600, 2000, 600]);
        expect(g.fill).not.toBeNull();
        d.applySettings({ fillBackground: false });
        expect(d.geometry(proj)!.fill).toBeNull();
    });

    it('survives a save; one saved before keeps its look', () => {
        const d = flat();
        d.applySettings({ showPrices: true, priceSize: 16, extendLeft: true });
        const back = deserializeDrawing(d.serialize()) as FlatTopBottom;
        expect([back.tv, back.showPrices, back.priceSize, back.extendLeft]).toEqual([true, true, 16, true]);
        const old = flat({});
        expect(old.tv).toBeUndefined();
        expect(old.handlePoints(proj)).toHaveLength(3);
        expect(old.textDefaults()).toBeUndefined();
    });

    it('bar: line colour, background, text colour, width, style; dialog: Style, Text, Visibility with TradingView\'s rows', async () => {
        const s = setup(flat());
        const tips = s.tips();
        const order = ['Line color', 'Fill', 'Text color', 'Line width', 'Line style'];
        expect(order.map((t) => tips.indexOf(t))).toEqual([...order.map((t) => tips.indexOf(t))].sort((a, b) => a - b));
        expect(order.every((t) => tips.includes(t))).toBe(true);
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Flat top/bottom');
        expect(s.tabs()).toEqual(['Style', 'Text', 'Visibility']);
        const roles = [...s.body('style').querySelectorAll<HTMLElement>(':scope > [data-role]')].map((e) => e.dataset.role!);
        expect(roles).toEqual(['line', 'extend', 'prices', 'background']);
        expect(s.body('text').textContent).toContain('Text alignmentTopLeft');
    });
});

describe('Flat top/bottom saved before (no props)', () => {
    it('reloads with its old look, not TradingView\'s', () => {
        const doc = { ...flat().serialize(), props: undefined };
        const back = deserializeDrawing(doc) as FlatTopBottom;
        expect(back.tv).toBeUndefined();
        expect(back.handlePoints(proj)).toHaveLength(3);
    });
});
