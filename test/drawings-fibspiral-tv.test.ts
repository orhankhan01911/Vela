// @vitest-environment jsdom
// Fib spiral, TradingView parity (audit 2026-10-31, factory defaults and renderer read from TradingView's module 337648).
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

import { createDrawing, deserializeDrawing, FibSpiral, type Drawing, type Projector } from '../src/core/drawings';
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
const two = [{ time: 500, price: 500 }, { time: 600, price: 500 }];
const sp = (props?: Record<string, unknown>): FibSpiral => createDrawing('fibspiral', { id: 's', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as FibSpiral;

describe('Fib spiral (TradingView)', () => {
    it('a new one: sky blue 2 px solid, clockwise', () => {
        const d = sp();
        expect([d.tv, d.counterclockwise]).toEqual([true, false]);
        expect([d.style.lineColor.toLowerCase(), d.style.lineWidth, d.style.lineStyle]).toEqual(['#00bcd4', 2, 'solid']);
    });

    it('radii 0, 1, 2, 3, 5 … fifths of the points\' distance, a quarter turn apart, clockwise from p1 → p2', () => {
        const d = sp();
        const pts = d.spiralPoints(proj)!;
        expect(pts[0]).toEqual([500, 500]);
        expect(pts).toHaveLength(501);
        // quarter turn k sits at index 1 + 50k: radius TV_FIB[k] · 20 px, angle k · 90° (y down = clockwise)
        const at = (k: number): [number, number] => pts[1 + 50 * k]!;
        expect(at(1)[0]).toBeCloseTo(500);
        expect(at(1)[1]).toBeCloseTo(520); // 1 · 20 px, 90° clockwise (down)
        expect(at(2)[0]).toBeCloseTo(460); // 2 · 20 px, 180°
        expect(at(4)[0]).toBeCloseTo(600); // 5 · 20 px, 360°: back on the ray, through p2
        const ccw = sp();
        ccw.applySettings({ counterclockwise: true });
        expect(ccw.spiralPoints(proj)![51]![1]).toBeCloseTo(480); // up
    });

    it('a ray from p1 through p2 to the pane edge; a click on it selects the spiral', () => {
        const d = sp();
        expect(d.rayPoints(proj)).toEqual([500, 500, 2002, 500]);
        expect(d.hitTest(1500, 501, proj, 4)).toBe(true);
    });

    it('saved and read back stays TradingView\'s; one saved before (no flag) keeps its golden spiral and no ray', () => {
        const d = sp();
        d.applySettings({ counterclockwise: true });
        const back = deserializeDrawing(d.serialize()) as FibSpiral;
        expect([back.tv, back.counterclockwise]).toEqual([true, true]);
        const old = deserializeDrawing({ id: 'o', type: 'fibspiral', paneId: 'price', anchors: two, style: { lineColor: '#2962ff', lineWidth: 2, lineStyle: 'solid' } } as Parameters<typeof deserializeDrawing>[0]) as FibSpiral;
        expect(old.tv).toBeFalsy();
        expect(old.rayPoints(proj)).toBeNull();
        expect(old.spiralPoints(proj)![0]).not.toEqual([500, 500]);
    });

    it('bar: colour and width, no style; dialog: the Line row and Counterclockwise, no Text tab', async () => {
        const s = setup(sp());
        const tips = s.tips();
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        const text = s.dialog();
        expect(text).toContain('Fib spiral');
        expect(text).toContain('Counterclockwise');
        expect(text).not.toMatch(/Text(?!\w)/);
    });
});
