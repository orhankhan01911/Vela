// @vitest-environment jsdom
// Gann square fixed, TradingView parity (audit 2026-10-31, read from TradingView's module 241492; tables 675635, dialog 206315).
// 3, 5, 8, 13, 21, 34, 55, 89 times the two points' distance, level 0 grey and the rest blue, each 2 px solid with its
// own line; the number right of each line at the pane's bottom, 12 px; bands only with Background on; a dashed grey
// 1 px trend line between the points; dialog: the levels, Use one color, Background, Labels; bar colour, width, style.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, GannSquareFixed, type Drawing, type Projector } from '../src/core/drawings';
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
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    const dialog = (): string => host.querySelector('.vela-drawing-dialog')!.textContent!;
    return { tips, gear, body, dialog };
}

const proj: Projector = {
    xOf: (t) => t,
    yOf: (price, paneId) => (paneId === 'price' ? 1000 - price : null),
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    paneRect: () => ({ top: 0, height: 800 }),
    width: 2000,
    height: 1000,
};
// first point (100, y 500); second 30 px right, 40 px up → distance 50, box 250 px toward up-right
const two = [{ time: 100, price: 500 }, { time: 130, price: 540 }];
const fx = (): GannSquareFixed => createDrawing('gannsquarefixed', { id: 'x', paneId: 'price', anchors: two.map((p) => ({ ...p })) })! as GannSquareFixed;

describe('Gann square fixed (TradingView)', () => {
    it('the Gann square\'s tables (6 levels, 11 fans, 11 arcs), no labels', () => {
        const d = fx();
        expect(d.type).toBe('gannsquarefixed');
        expect([d.tv, d.levels.length, d.fanLines!.length, d.arcs!.length, d.showLabels]).toEqual([true, 6, 11, 11, false]);
        expect(d.entryLines(proj)!.some((l) => l.numberText)).toBe(false);
    });

    it('a box square on screen: 5 × the points\' distance each way, toward the second point\'s quadrant', () => {
        const f = fx().tvFrame(proj)!;
        expect([f.sx, f.sy, f.rx, f.ry]).toEqual([100, 500, 250, -250]);
        const flipped = createDrawing('gannsquarefixed', { id: 'y', paneId: 'price', anchors: [{ time: 100, price: 500 }, { time: 60, price: 470 }] })! as GannSquareFixed;
        expect([flipped.tvFrame(proj)!.rx, flipped.tvFrame(proj)!.ry]).toEqual([-250, 250]);
    });

    it('handles on the two points as placed; placing and dragging leave them; Reverse swaps them', () => {
        const d = fx();
        d.onPlaced(proj);
        d.constrainHandleDrag();
        expect(d.handlePoints(proj)).toEqual([[100, 500], [130, 460]]);
        d.applySettings({ reverse: true });
        expect(d.anchors).toEqual([{ time: 130, price: 540 }, { time: 100, price: 500 }]);
        expect(d.reverse).toBe(true);
    });

    it('survives a save as itself', () => {
        const back = deserializeDrawing(fx().serialize())!;
        expect(back).toBeInstanceOf(GannSquareFixed);
        expect((back as GannSquareFixed).arcs!.length).toBe(11);
    });

    it('bar: colour and width; dialog: Levels, Fans, Arcs, Use one color, Background, Reverse (no ratio, no ranges)', async () => {
        const s = setup(fx());
        const tips = s.tips();
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Gann square fixed');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!);
        expect(roles).toEqual([
            ...Array.from({ length: 6 }, (_, i) => `levels-${i}`), ...Array.from({ length: 11 }, (_, i) => `fanLines-${i}`), ...Array.from({ length: 11 }, (_, i) => `arcs-${i}`),
            'one-color', 'background', 'reverse',
        ]);
    });
});
