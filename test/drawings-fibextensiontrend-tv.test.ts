// @vitest-environment jsdom
// The trend-based Fib extension, TradingView parity (audit 2026-10-31, TradingView's module 268335): the retracement's
// 24 levels, look and dialog; levels at C + coefficient × (B − A) spanning B..C; dashed trend lines A→B and B→C;
// Reverse projects A − B.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, FibExtensionTrend, TV_FIB_RETRACEMENT_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
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
    const title = (): string => host.querySelector('.vela-drawing-dialog')!.textContent!;
    return { tips, gear, body, title, live: () => live };
}

const proj: Projector = {
    xOf: (t) => t,
    yOf: (price, paneId) => (paneId === 'price' ? 1000 - price : null),
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    width: 2000,
    height: 1000,
};
// A(100, 400) → B(200, 600) → C(300, 500): the move B − A = 200, projected from C.
const abc = [{ time: 100, price: 400 }, { time: 200, price: 600 }, { time: 300, price: 500 }];
const ext = (props?: Record<string, unknown>): FibExtensionTrend =>
    createDrawing('fibextensiontrend', { id: 'x', paneId: 'price', anchors: abc, ...(props ? { props } : {}) })! as FibExtensionTrend;

describe('trend-based Fib extension (TradingView)', () => {
    it('a new one has the retracement\'s 24 levels and factory look', () => {
        const d = ext();
        expect(d.tv).toBe(true);
        expect(d.levels).toEqual(TV_FIB_RETRACEMENT_LEVELS);
        expect([d.trendline, d.trendColor, d.trendWidth, d.trendStyle, d.style.lineWidth]).toEqual([true, '#808080', 2, 'dashed', 2]);
        expect([d.background, d.fillOpacity, d.labelH, d.labelV, d.fontSize, d.reverse]).toEqual([true, 0.2, 'left', 'middle', 12, false]);
    });

    it('levels sit at C + coefficient × (B − A) and span B..C', () => {
        const lines = ext().levelLines(proj)!;
        const at = (r: number) => lines.find((l) => l.ratio === r)!;
        expect(at(0).price).toBe(500);
        expect(at(1).price).toBe(700);
        expect(at(0.5).price).toBe(600);
        expect([at(1).x1, at(1).x2]).toEqual([200, 300]);
    });

    it('Reverse projects A − B instead', () => {
        const d = ext();
        d.applySettings({ reverse: true });
        expect(d.levelLines(proj)!.find((l) => l.ratio === 1)!.price).toBe(300);
        expect((deserializeDrawing(d.serialize()) as FibExtensionTrend).reverse).toBe(true);
    });

    it('labels left of B..C, "coefficient (price)"; bands fill between levels', () => {
        const d = ext();
        const l = d.entryLines(proj)![0]!;
        expect([l.numberX, l.numberAlign]).toEqual([196, 'right']);
        expect(d.fillBands(proj).length).toBe(10);
    });

    it('one saved before keeps its look: its own levels across all three anchors, numbers above, no fill', () => {
        const old = ext({ levels: [{ ratio: 0, color: '#123456', enabled: true }, { ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        const l = old.entryLines(proj)!;
        expect([l[1]!.x1, l[1]!.x2, l[1]!.numberAlign, l[1]!.numberY]).toEqual([100, 300, 'left', l[1]!.y1 - 7]);
        expect(l[1]!.numberText).toBe('1 (700.00)');
        expect(old.fillBands(proj)).toEqual([]);
    });

    it('bar: line colour and width; dialog: TradingView\'s title and the retracement\'s rows with Reverse', async () => {
        const s = setup(ext());
        expect(s.tips()).toContain('Line color');
        expect(s.tips()).toContain('Line width');
        expect(s.tips()).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.title()).toContain('Trend-based fib extension');
        const text = s.body('style').textContent!;
        for (const w of ['Trend line', 'Levels line', 'Extend', 'Use one color', 'Background', 'Reverse', 'Prices', 'Levels', 'Labels', 'Text', 'Font size']) expect(text, w).toContain(w);
    });
});
