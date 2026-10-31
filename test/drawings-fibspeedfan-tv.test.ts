// @vitest-environment jsdom
// The Fib speed resistance fan, TradingView parity (audit 2026-10-31, TradingView's module 32895): 7 price and 7 time
// levels (0, 0.25, 0.382, 0.5, 0.618, 0.75, 1 in grey, orange, cyan, green, teal, blue, grey), level 0 on the second
// point and 1 on the first (Reverse swaps), rays from the first point through each, wedge bands at 80 % transparency, the
// grid in the points' box, labels on four sides 5 px out; dialog PRICE LEVELS / TIME LEVELS ...; bar colour, width, style.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, FibSpeedFan, TV_SPEED_FAN_LEVELS, TV_SPEED_FAN_GRID, type Drawing, type Projector } from '../src/core/drawings';
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
    width: 2000,
    height: 1000,
};
// A(100, 400) bottom-left, B(300, 600) top-right: box x 100..300, y 400..600.
const two = [{ time: 100, price: 400 }, { time: 300, price: 600 }];
const fan = (props?: Record<string, unknown>): FibSpeedFan => createDrawing('fibspeedfan', { id: 'f', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as FibSpeedFan;

describe('Fib speed resistance fan (TradingView)', () => {
    it('a new one: 7 price and 7 time levels in TradingView\'s colours; grid, bands, every label on; 2 px rays', () => {
        const d = fan();
        expect(d.tv).toBe(true);
        expect(d.levels.map((l) => [l.ratio, l.color.toUpperCase()])).toEqual([[0, '#808080'], [0.25, '#FF9800'], [0.382, '#00BCD4'], [0.5, '#4CAF50'], [0.618, '#089981'], [0.75, '#2962FF'], [1, '#808080']]);
        expect(d.timeLevels).toEqual(TV_SPEED_FAN_LEVELS);
        expect([d.grid, d.gridColor, d.gridWidth, d.gridStyle, d.background, d.fillOpacity, d.reverse]).toEqual([true, TV_SPEED_FAN_GRID, 1, 'solid', true, 0.2, false]);
        expect([d.showLeftLabels, d.showRightLabels, d.showTopLabels, d.showBottomLabels, d.style.lineWidth]).toEqual([true, true, true, true, 2]);
    });

    it('price level 0 on the second point, 1 on the first: grid lines across the box, labels 5 px outside', () => {
        const e = fan().entryLines(proj)!;
        const p0 = e[0]!;
        expect([p0.x1, p0.x2, p0.y1, p0.strokeColor, p0.numberText, p0.numberX, p0.numberAlign, p0.label, p0.labelX]).toEqual([100, 300, 400, TV_SPEED_FAN_GRID, '0', 95, 'right', '0', 305]);
        expect(e[6]!.y1).toBe(600); // level 1 on the first point
        const t0 = e[7]!; // time level 0 on the second point's x
        expect([t0.x1, t0.y1, t0.y2, t0.numberAlign]).toEqual([300, 400, 600, 'center']);
    });

    it('rays from the first point through each level, carried past the chart; Reverse swaps the base point', () => {
        const d = fan();
        const rays = d.entryLines(proj)!.filter((l) => !l.strokeColor); // the grid lines carry the grid colour
        expect(rays).toHaveLength(14);
        const half = rays[3]!; // price 0.5: through (300, 500)
        expect((half.y2 - 600) / (half.x2 - 100)).toBeCloseTo(-0.5, 6);
        expect(half.x2).toBeGreaterThan(2000);
        d.applySettings({ reverse: true });
        expect(d.entryLines(proj)![0]!.y1).toBe(600);
    });

    it('wedge bands between consecutive rays, in the later level\'s colour; Background off removes them', () => {
        const d = fan();
        const w = d.fillPolygons(proj);
        expect(w).toHaveLength(12);
        expect(w[0]!.color.toUpperCase()).toBe('#FF9800');
        expect(w[0]!.pts[0]).toEqual([100, 600]);
        d.applySettings({ background: false });
        expect(d.fillPolygons(proj)).toEqual([]);
    });

    it('grid off keeps the labels and hides the grid lines (no stroke, no hit)', () => {
        const d = fan();
        d.applySettings({ grid: false });
        const g = d.entryLines(proj)![1]!; // price 0.25: y 450
        expect([g.noStroke, g.numberText, g.y1]).toEqual([true, '0.25', 450]);
        expect(d.hitTest(200, 450, proj, 2)).toBe(false); // on the hidden 0.25 grid line, off every ray
        d.applySettings({ grid: true });
        expect(d.hitTest(200, 450, proj, 2)).toBe(true);
    });

    it('the look survives a save; one saved before keeps its look', () => {
        const d = fan();
        d.applySettings({ 'timeLevels.2.enabled': false, showTopLabels: false, gridStyle: 'dashed' });
        const back = deserializeDrawing(d.serialize()) as FibSpeedFan;
        expect([back.tv, back.timeLevels![2]!.enabled, back.showTopLabels, back.gridStyle]).toEqual([true, false, false, 'dashed']);
        const old = fan({ levels: [{ ratio: 0, color: '#123456', enabled: true }, { ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        expect(old.fillPolygons(proj)).toEqual([]);
    });

    it('bar: colour (grid and every level), width, style; dialog: TradingView\'s sections and rows', async () => {
        const s = setup(fan());
        const tips = s.tips();
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips.indexOf('Line style')).toBeGreaterThan(tips.indexOf('Line width'));
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Fib speed resistance fan');
        const text = s.body('style').textContent!;
        const order = ['Price levels', 'Left labels', 'Right labels', 'Time levels', 'Top labels', 'Bottom labels', 'Use one color', 'Background', 'Grid', 'Reverse'];
        let at = -1;
        for (const w of order) {
            const i = text.toLowerCase().indexOf(w.toLowerCase(), at + 1);
            expect(i, w).toBeGreaterThan(at);
            at = i;
        }
        expect(s.body('style').querySelectorAll('[data-role^="level-"][data-role$="0"], [data-role="fib-levels"] > div').length).toBeGreaterThanOrEqual(7);
        expect(s.body('style').querySelectorAll('[data-role="fib-timeLevels"] > div').length).toBe(7);
    });
});
