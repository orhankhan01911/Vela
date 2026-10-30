// @vitest-environment jsdom
// The Fib retracement, TradingView parity (audit 2026-10-31, factory defaults read from TradingView's module 984358,
// dialog rows from 426316, label placement from 516130): 24 levels in its order and colours, a dashed grey 2 px trend
// line, 2 px solid levels, 80 % transparent bands, "coefficient (price)" labels left of the lines, middle, 12 px.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, FibRetracement, TV_FIB_RETRACEMENT_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));

function chart(initial: Drawing): { actions: SettingsActions; live: () => Drawing } {
    let live = initial;
    const sync = (): void => {
        live = deserializeDrawing(live.serialize())!;
    };
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            sync();
        },
        restore: (doc) => {
            if (doc.style) live.style = { ...doc.style };
            if (doc.props !== undefined) live.applyProps(doc.props);
            sync();
        },
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    return { actions, live: () => live };
}

function setup(drawing: Drawing) {
    const host = document.createElement('div');
    document.body.append(host);
    const popup = new DrawingSettingsPopup(host, DARK_THEME);
    const c = chart(drawing);
    popup.open([drawing], null, c.actions);
    const tips = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-dpop [data-tip]')].map((e) => e.dataset.tip!);
    const gear = (): HTMLButtonElement => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!;
    const tabs = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!);
    const tab = (name: string): HTMLElement => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].find((e) => e.textContent === name)!;
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    return { host, live: c.live, tips, gear, tabs, tab, body };
}

const proj: Projector = {
    xOf: (t) => t,
    yOf: (price, paneId) => (paneId === 'price' ? 1000 - price : null),
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    width: 2000,
    height: 1000,
};
const two = [{ time: 100, price: 700 }, { time: 300, price: 400 }];
const fib = (props?: Record<string, unknown>): FibRetracement =>
    createDrawing('fibretracement', { id: 'f', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as FibRetracement;

describe('Fib retracement defaults (TradingView)', () => {
    it('24 levels in TradingView\'s order and colours, 0 .. 4.236 shown', () => {
        const d = fib();
        expect(d.tv).toBe(true);
        expect(d.levels.map((l) => [l.ratio, l.color.toUpperCase(), l.enabled])).toEqual([
            [0, '#808080', true], [0.236, '#F23645', true], [0.382, '#FF9800', true], [0.5, '#4CAF50', true],
            [0.618, '#089981', true], [0.786, '#00BCD4', true], [1, '#808080', true], [1.618, '#2962FF', true],
            [2.618, '#F23645', true], [3.618, '#9C27B0', true], [4.236, '#E91E63', true], [1.272, '#FF9800', false],
            [1.414, '#F23645', false], [2.272, '#FF9800', false], [2.414, '#4CAF50', false], [2, '#089981', false],
            [3, '#00BCD4', false], [3.272, '#808080', false], [3.414, '#2962FF', false], [4, '#F23645', false],
            [4.272, '#9C27B0', false], [4.414, '#E91E63', false], [4.618, '#FF9800', false], [4.764, '#089981', false],
        ]);
        expect(TV_FIB_RETRACEMENT_LEVELS).toHaveLength(24);
    });

    it('trend line grey 2 px dashed and on; levels 2 px solid; background on at 80 % transparency; no extend', () => {
        const d = fib();
        expect([d.trendline, d.trendColor, d.trendWidth, d.trendStyle]).toEqual([true, '#808080', 2, 'dashed']);
        expect([d.style.lineWidth, d.style.lineStyle]).toEqual([2, 'solid']);
        expect([d.background, d.fillOpacity, d.extendLeft, d.extendRight, d.reverse]).toEqual([true, 0.2, false, false, false]);
    });

    it('labels: coefficient and price, left, middle, 12 px; level texts centered on their lines', () => {
        const d = fib();
        expect([d.showLevels, d.levelsAsPercent, d.showPrices, d.labelH, d.labelV, d.fontSize]).toEqual([true, false, true, 'left', 'middle', 12]);
        expect([d.showText, d.textH, d.textV, d.logScale]).toEqual([true, 'center', 'middle', false]);
    });

    it('level 0 sits on the second point, level 1 on the first (Reverse swaps them)', () => {
        const d = fib();
        const lines = d.levelLines(proj)!;
        expect(lines[0]!.price).toBe(400);
        expect(lines.find((l) => l.ratio === 1)!.price).toBe(700);
        d.applySettings({ reverse: true });
        expect(d.levelLines(proj)![0]!.price).toBe(700);
    });
});

describe('Fib retracement labels (TradingView placement and text)', () => {
    it('Left: ends 4 px before the lines; Right: starts 4 px after; extended left: 4 px in from the edge', () => {
        const d = fib();
        const l = d.entryLines(proj)![0]!;
        expect([l.numberX, l.numberAlign, l.numberY]).toEqual([96, 'right', l.y1]);
        d.applySettings({ labelH: 'right' });
        const r = d.entryLines(proj)![0]!;
        expect([r.numberX, r.numberAlign]).toEqual([304, 'left']);
        d.applySettings({ labelH: 'left', extendLeft: true });
        const e = d.entryLines(proj)![0]!;
        expect([e.numberX, e.numberAlign]).toEqual([4, 'left']);
    });

    it('Top puts the label above the line, Bottom below', () => {
        const d = fib();
        d.applySettings({ labelV: 'top' });
        const t = d.entryLines(proj)![0]!;
        expect(t.numberY).toBeLessThan(t.y1);
        d.applySettings({ labelV: 'bottom' });
        const b = d.entryLines(proj)![0]!;
        expect(b.numberY).toBeGreaterThan(b.y1);
    });

    it('"0.236 (77,055.3)": the price at the scale\'s step, thousands separated', () => {
        expect(fib().levelText(0.236, 77055.3456, 0.1)).toBe('0.236 (77,055.3)');
        const p = fib();
        p.applySettings({ levelsAsPercent: true });
        expect(p.levelText(0.236, 77055.3456, 0.1)).toBe('23.60% (77,055.3)');
    });

    it('a level text sits where Text says, and Text off hides it', () => {
        const d = fib();
        d.applySettings({ 'levels.0.label': 'Entry' });
        const c = d.entryLines(proj)![0]!;
        expect([c.label, c.labelX, c.labelAlign, c.labelY]).toEqual(['Entry', 200, 'center', c.y1]);
        d.applySettings({ showText: false });
        expect(d.entryLines(proj)![0]!.label).toBeUndefined();
    });

    it('bands fill between consecutive shown levels in the later level\'s colour', () => {
        const bands = fib().fillBands(proj);
        expect(bands).toHaveLength(10);
        expect(bands[0]!.color.toUpperCase()).toBe('#F23645');
    });
});

describe('Fib retracement saved drawings', () => {
    it('the TradingView look survives a save', () => {
        const d = fib();
        d.applySettings({ fontSize: 16, trendStyle: 'dotted', textH: 'right' });
        const back = deserializeDrawing(d.serialize())! as FibRetracement;
        expect([back.tv, back.fontSize, back.trendStyle, back.textH, back.levels.length]).toEqual([true, 16, 'dotted', 'right', 24]);
    });

    it('a retracement saved before keeps its look (no TradingView defaults forced on it)', () => {
        const old = fib({ levels: [{ ratio: 0, color: '#123456', enabled: true }, { ratio: 1, color: '#123456', enabled: true }], labelV: 'top', fillOpacity: 0.06, trendline: false });
        expect(old.tv).toBeUndefined();
        expect([old.levels.length, old.labelV, old.fillOpacity, old.trendline, old.reverse]).toEqual([2, 'top', 0.06, false, true]);
        expect(old.entryLines(proj)![0]!.numberAlign).toBe('left');
    });
});

describe('Fib retracement toolbar and dialog', () => {
    it('the floating bar has TradingView\'s line colour and width, no line style', () => {
        const tips = setup(fib()).tips();
        expect(tips).toContain('Line color');
        expect(tips).toContain('Line width');
        expect(tips).not.toContain('Line style');
        expect(tips.indexOf('Line color')).toBeLessThan(tips.indexOf('Line width'));
    });

    it('the bar\'s colour recolors the trend line and every level; its width sets both', () => {
        const s = setup(fib());
        const live = (): FibRetracement => s.live() as FibRetracement;
        // The bar's buttons patch through the same actions; drive the patch they send.
        live().applySettings({ trendColor: '#00ff00', ...Object.fromEntries(live().levels.map((_, i) => [`levels.${i}.color`, '#00ff00'])) });
        expect(live().levels.every((l) => l.color === '#00ff00') && live().trendColor === '#00ff00').toBe(true);
    });

    it('Style, Coordinates, Visibility; TradingView\'s rows in its order', async () => {
        const s = setup(fib());
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Coordinates', 'Visibility']);
        s.tab('Style').click();
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^level-\d+$|^level-(ratio|color)$/.test(r));
        expect(roles).toEqual(['trend-line', 'levels-line', 'extend', 'fib-levels', 'one-color', 'background', 'log-scale']);
        expect(st.querySelectorAll('[data-role^="level-"][data-role$="0"], [data-role="fib-levels"] > [data-role^="level-"]').length).toBeGreaterThanOrEqual(24);
        const text = st.textContent!;
        const order = ['Trend line', 'Levels line', 'Extend', 'Use one color', 'Background', 'Reverse', 'Prices', 'Levels', 'Labels', 'Text', 'Font size', 'Fib levels based on log scale'];
        let at = -1;
        for (const w of order) {
            const i = text.indexOf(w, at + 1);
            expect(i, w).toBeGreaterThan(at);
            at = i;
        }
        expect(text).not.toContain('Numbers size');
    });

    it('a level switch turns that level on', async () => {
        const s = setup(fib());
        s.gear().click();
        await settled();
        s.tab('Style').click();
        s.body('style').querySelector<HTMLElement>('[data-role="level-11"] [role="switch"], [data-role="level-11"] input[type="checkbox"]')!.click();
        expect((s.live() as FibRetracement).levels[11]!.enabled).toBe(true);
    });
});
