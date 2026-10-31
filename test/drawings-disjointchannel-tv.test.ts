// @vitest-environment jsdom
// Disjoint channel, TradingView parity (audit 2026-10-31, read from TradingView's module 817798 and a live shape): three
// points, the line p1→p2 and its mirror from p3 (at p2's bar) to p3 + (p2 − p1) at p1's bar; minty green 2 px, the green
// at 20 % behind; four handles with TradingView's moves; the flat top/bottom's dialog and bar.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, DisjointChannel, type Drawing, type Projector } from '../src/core/drawings';
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
const dis = (props?: Record<string, unknown>, anchors = pts): DisjointChannel =>
    createDrawing('disjointchannel', { id: 'd', paneId: 'price', anchors, ...(props ? { props } : {}) })! as DisjointChannel;

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

describe('Disjoint channel (TradingView)', () => {
    it('a new one: three points, TradingView\'s colours', () => {
        const d = dis();
        expect(d.tv).toBe(true);
        expect(d.anchorSchema().min).toBe(3);
        expect([d.style.lineColor, d.style.lineWidth, d.style.fillColor, d.fillBackground, d.showPrices]).toEqual(['#089981', 2, '#08998133', true, false]);
        expect(d.textDefaults()).toMatchObject({ color: '#089981', size: 14 });
    });

    it('the second line mirrors p1→p2 from p3: p3 at p2\'s bar, p3 + (p2 − p1) at p1\'s bar', () => {
        const d = dis();
        expect(d.figurePrices()).toEqual([600, 700, 400, 500]);
        expect(d.handlePoints(proj)).toEqual([[100, 400], [300, 300], [300, 600], [100, 500]]);
    });

    it('TradingView\'s handle moves', () => {
        const p2 = dis();
        p2.dragHandlePx(1, 300, 200, proj); // p2 to 800: p3 mirrors around their middle (550)
        expect(p2.anchors.map((a) => a.price)).toEqual([600, 800, 300]);
        const p3 = dis();
        p3.dragHandlePx(2, 999, 650, proj); // price only
        expect(p3.anchors.map((a) => [a.time, a.price])).toEqual([[100, 600], [300, 700], [300, 350]]);
        expect(p3.handleCursor(2)).toBe('ns-resize');
        const p4 = dis();
        p4.dragHandlePx(3, 50, 450, proj); // the end at p1's bar to 550 at bar 50: p1 = 700 + 400 − 550
        expect(p4.anchors[0]).toMatchObject({ time: 50, price: 550 });
        expect(p4.figurePrices()![3]).toBe(550);
        expect(dis().dragHandlePx(0, 0, 0, proj)).toBe(false);
    });

    it('survives a save; one saved before (4 free points, no props) keeps its look', () => {
        const d = dis();
        d.applySettings({ extendRight: true, showPrices: true });
        const back = deserializeDrawing(d.serialize()) as DisjointChannel;
        expect([back.tv, back.extendRight, back.showPrices]).toEqual([true, true, true]);
        const four = [...pts, { time: 100, price: 300 }];
        const old = deserializeDrawing({ ...dis({}, four).serialize(), props: undefined }) as DisjointChannel;
        expect(old.tv).toBeUndefined();
        expect(old.anchorSchema().min).toBe(4);
        expect(old.handlePoints(proj)).toHaveLength(4);
        expect(old.handlePoints(proj)[3]).toEqual([100, 700]);
    });

    it('bar and dialog: the flat top/bottom\'s (TradingView\'s trend figures)', async () => {
        const s = setup(dis());
        const tips = s.tips();
        for (const t of ['Line color', 'Fill', 'Text color', 'Line width', 'Line style']) expect(tips).toContain(t);
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Disjoint channel');
        expect(s.tabs()).toEqual(['Style', 'Text', 'Visibility']);
        const roles = [...s.body('style').querySelectorAll<HTMLElement>(':scope > [data-role]')].map((e) => e.dataset.role!);
        expect(roles).toEqual(['line', 'extend', 'prices', 'background']);
    });
});
