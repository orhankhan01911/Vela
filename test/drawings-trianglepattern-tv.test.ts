// @vitest-environment jsdom
// Triangle pattern, TradingView parity (audit 2026-10-31, read from TradingView's module 726725).
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

import { createDrawing, deserializeDrawing, TrianglePattern, type Drawing, type Projector } from '../src/core/drawings';
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
// A (100, y300) B (200, y700) C (300, y400) D (400, y600): the sides converge to the right
const four = [700, 300, 600, 400].map((price, i) => ({ time: 100 + i * 100, price }));
const tri = (): TrianglePattern => createDrawing('trianglepattern', { id: 't', paneId: 'price', anchors: four })! as TrianglePattern;

describe('Triangle pattern (TradingView)', () => {
    it('a new one: TradingView\'s look, deep blue 2 px, background at 85 % transparency', () => {
        const d = tri();
        expect([d.tv, d.fillBackground, d.style.lineColor, d.style.lineWidth, d.style.fillColor]).toEqual([true, true, '#673ab7', 2, '#673ab726']);
        expect(d.fillTriangles()).toEqual([]);
        expect(d.tvBackground()).toBe(true);
    });

    it('the converging triangle: the sides at the leftmost point, then their apex', () => {
        const d = tri();
        const pts = four.map((p) => [proj.xOf(p.time), proj.yOf(p.price, 'price')!] as [number, number]);
        const t = d.convergingTriangle(pts)!;
        // A–C: (100,300)→(300,400), slope 0.5; B–D: (200,700)→(400,600), slope −0.5; apex at x 550, y 525
        expect(t[0]).toEqual([100, 300]);
        expect(t[1]).toEqual([100, 750]);
        expect(t[2]).toEqual([550, 525]);
        expect(d.convergingTriangle(pts.slice(0, 3))).toBeNull();
    });

    it('when the apex is left of the points, the triangle opens on the right', () => {
        const d = tri();
        const pts: Array<[number, number]> = [[100, 400], [200, 600], [300, 300], [400, 700]];
        const t = d.convergingTriangle(pts)!;
        expect(t[0]![0]).toBe(400);
        expect(t[2]![0]).toBeLessThan(100);
    });

    it('one saved before (no props) keeps its look', () => {
        const old = deserializeDrawing({ id: 'o', type: 'trianglepattern', paneId: 'price', anchors: four, style: { lineColor: '#2962ff', lineWidth: 1, lineStyle: 'solid' } } as Parameters<typeof deserializeDrawing>[0]) as TrianglePattern;
        expect(old.tv).toBeFalsy();
        expect(old.fillTriangles()).toHaveLength(2);
    });

    it('bar: line, background, text colour, width; dialog: Label, Border, Background', async () => {
        const s = setup(tri());
        const tips = s.tips();
        const at = (t: string): number => tips.indexOf(t);
        expect([at('Line color') > -1, at('Fill') > at('Line color'), at('Text color') > at('Fill'), at('Line width') > at('Text color')]).toEqual([true, true, true, true]);
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Triangle pattern');
        const roles = [...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^text-/.test(r));
        expect(roles).toEqual(['label', 'border', 'background']);
    });
});
