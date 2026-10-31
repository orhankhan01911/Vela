// @vitest-environment jsdom
// Rotated rectangle, TradingView parity (audit 2026-10-31, read from TradingView's module 268872 and a live shape):
// p1→p2 is the middle line, p3 sets half the width on both sides; six handles (p1, p2, the four corners); iguana green
// 2 px, the green at 20 % behind; dialog Style (Border, Background), Visibility; bar line colour, background, width.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, RotatedRect, type Drawing, type Projector } from '../src/core/drawings';
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
// A level axis from (100, y 500) to (300, y 500), the width point 40 px above it.
const pts = [{ time: 100, price: 500 }, { time: 300, price: 500 }, { time: 200, price: 540 }];
const rot = (props?: Record<string, unknown>): RotatedRect =>
    createDrawing('rotatedrect', { id: 'r', paneId: 'price', anchors: pts, ...(props ? { props } : {}) })! as RotatedRect;

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

describe('Rotated rectangle (TradingView)', () => {
    it('a new one: TradingView\'s colours', () => {
        const d = rot();
        expect([d.tv, d.fillBackground, d.style.lineColor, d.style.lineWidth, d.style.fillColor]).toEqual([true, true, '#4caf50', 2, '#4caf5033']);
    });

    it('p1→p2 is the middle line: the width point sets half the width on both sides; six handles', () => {
        const d = rot();
        const h = d.handlePoints(proj);
        expect(h).toHaveLength(6);
        expect(h.slice(0, 2)).toEqual([[100, 500], [300, 500]]);
        const ys = h.slice(2).map((p) => p[1]).sort((a, b) => a - b);
        expect(ys).toEqual([460, 460, 540, 540]);
        expect(d.geometry(proj)!.segments).toHaveLength(4);
    });

    it('a corner sets the width; p1 moves the axis and keeps the width', () => {
        const d = rot();
        d.dragHandlePx(3, 300, 430, proj); // 70 px off the axis
        expect(d.handlePoints(proj).slice(2).map((p) => Math.round(p[1])).sort((a, b) => a - b)).toEqual([430, 430, 570, 570]);
        d.dragHandlePx(0, 100, 400, proj); // the axis tilts; the width stays 70
        const T = d.tvCorners(proj)!;
        expect(Math.hypot(T.corners[0]![0] - T.p1[0], T.corners[0]![1] - T.p1[1])).toBeCloseTo(70, 6);
    });

    it('Background off drops the fill; survives a save; one saved before (no props) keeps its look', () => {
        const d = rot();
        d.applySettings({ fillBackground: false });
        expect(d.geometry(proj)!.fill).toBeNull();
        const back = deserializeDrawing(d.serialize()) as RotatedRect;
        expect([back.tv, back.fillBackground]).toEqual([true, false]);
        const old = deserializeDrawing({ ...rot().serialize(), props: undefined }) as RotatedRect;
        expect(old.tv).toBeUndefined();
        expect(old.handlePoints(proj)).toHaveLength(3);
    });

    it('bar: line colour, background, width; dialog: Style (Border, Background), Visibility', async () => {
        const s = setup(rot());
        const tips = s.tips();
        for (const t of ['Line color', 'Fill', 'Line width']) expect(tips).toContain(t);
        expect(tips).not.toContain('Line style');
        expect(tips).not.toContain('Text color');
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Visibility']);
        const roles = [...s.body('style').querySelectorAll<HTMLElement>(':scope > [data-role]')].map((e) => e.dataset.role!);
        expect(roles).toEqual(['border', 'background']);
    });
});
