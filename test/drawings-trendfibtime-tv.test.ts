// @vitest-environment jsdom
// Trend-based fib time, TradingView parity (audit 2026-10-31, factory defaults read from TradingView's module 315360).
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

import { createDrawing, deserializeDrawing, TrendFibTime, TV_TREND_FIB_TIME_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
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
const three = [{ time: 100, price: 400 }, { time: 110, price: 500 }, { time: 200, price: 450 }];
const tft = (props?: Record<string, unknown>): TrendFibTime => createDrawing('trendfibtime', { id: 't', paneId: 'price', anchors: three, ...(props ? { props } : {}) })! as TrendFibTime;

describe('Trend-based fib time (TradingView)', () => {
    it('a new one: 11 levels in TradingView\'s order and colours, 0.5 hidden, 2 px solid; background on at 80 %; dashed grey 2 px trend', () => {
        const d = tft();
        expect(d.tv).toBe(true);
        expect(d.levels.map((l) => [l.ratio, l.color.toUpperCase(), l.enabled, l.lineWidth, l.lineStyle])).toEqual([
            [0, '#808080', true, 2, 'solid'], [0.382, '#F23645', true, 2, 'solid'], [0.5, '#81C784', false, 2, 'solid'],
            [0.618, '#4CAF50', true, 2, 'solid'], [1, '#089981', true, 2, 'solid'], [1.382, '#00BCD4', true, 2, 'solid'],
            [1.618, '#808080', true, 2, 'solid'], [2, '#2962FF', true, 2, 'solid'], [2.382, '#E91E63', true, 2, 'solid'],
            [2.618, '#9C27B0', true, 2, 'solid'], [3, '#673AB7', true, 2, 'solid'],
        ]);
        expect(TV_TREND_FIB_TIME_LEVELS).toHaveLength(11);
        expect([d.background, d.fillOpacity, d.showLabels, d.labelH, d.labelV]).toEqual([true, 0.2, true, 'right', 'bottom']);
        expect([d.trendline, d.trendColor, d.trendWidth, d.trendStyle]).toEqual([true, '#808080', 2, 'dashed']);
    });

    it('lines from the third point by coefficient x the first two points\' distance; number right of the line at the bottom', () => {
        const e = tft().entryLines(proj)!;
        expect(e).toHaveLength(10);
        expect(e[0]!.x1).toBeCloseTo(200);
        expect(e[3]!.x1).toBeCloseTo(210); // 1
        expect(e[9]!.x1).toBeCloseTo(230); // 3
        const one = e[3]!;
        expect([one.y1, one.y2, one.numberText, one.numberAlign, one.lineWidth, one.lineStyle]).toEqual([0, 800, '1', 'left', 2, 'solid']);
        expect(one.numberY).toBeGreaterThan(780);
    });

    it('bands between the shown lines in the later line\'s colour; Background off removes them', () => {
        const d = tft();
        const b = d.fillBands(proj);
        expect(b).toHaveLength(9);
        expect(b[0]!.color.toUpperCase()).toBe('#F23645');
        d.applySettings({ background: false });
        expect(d.fillBands(proj)).toEqual([]);
    });

    it('the TradingView look survives a save; one saved before keeps its look', () => {
        const d = tft();
        d.applySettings({ 'levels.2.enabled': true, trendStyle: 'dotted', 'levels.4.lineWidth': 4 });
        const back = deserializeDrawing(d.serialize()) as TrendFibTime;
        expect([back.tv, back.trendStyle, back.levels[2]!.enabled, back.levels[4]!.lineWidth]).toEqual([true, 'dotted', true, 4]);
        const old = tft({ levels: [{ ratio: 0, color: '#123456', enabled: true }, { ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        const l = old.entryLines(proj)![1]!;
        expect([l.numberAlign, l.numberY]).toEqual(['center', 9]);
        expect(old.fillBands(proj)).toEqual([]);
    });

    it('bar: colour and width, no style; dialog: Trend line, the 11 levels, Use one color, Background, Labels', async () => {
        const s = setup(tft());
        const tips = s.tips();
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Trend-based fib time');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^level-\d+-(coeff|line)$/.test(r));
        expect(roles).toEqual(['trend-line', ...Array.from({ length: 11 }, (_, i) => `level-${i}`), 'one-color', 'background', 'labels']);
    });
});
