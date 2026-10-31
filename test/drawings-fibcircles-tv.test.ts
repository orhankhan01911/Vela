// @vitest-environment jsdom
// Fib circles, TradingView parity (audit 2026-10-31, factory defaults and renderer read from TradingView's module 289525).
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

import { createDrawing, deserializeDrawing, FibCircles, TV_FIB_CIRCLE_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
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
const two = [{ time: 100, price: 600 }, { time: 300, price: 500 }];
const fc = (props?: Record<string, unknown>): FibCircles => createDrawing('fibcircles', { id: 'c', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as FibCircles;

describe('Fib circles (TradingView)', () => {
    it('a new one: 11 levels in TradingView\'s order and colours, 2 px solid; bands on at 80 %; dashed grey 2 px trend line', () => {
        const d = fc();
        expect(d.tv).toBe(true);
        expect(d.levels.map((l) => [l.ratio, l.color.toUpperCase(), l.enabled, l.lineWidth, l.lineStyle])).toEqual(
            [
                [0.236, '#F23645'], [0.382, '#FF9800'], [0.5, '#089981'], [0.618, '#4CAF50'], [0.786, '#00BCD4'], [1, '#808080'],
                [1.618, '#2962FF'], [2.618, '#E91E63'], [3.618, '#2962FF'], [4.236, '#E91E63'], [4.618, '#F23645'],
            ].map(([r, c]) => [r, c, true, 2, 'solid']),
        );
        expect(TV_FIB_CIRCLE_LEVELS).toHaveLength(11);
        expect([d.background, d.fillOpacity, d.showLevels, d.levelsAsPercent]).toEqual([true, 0.2, true, false]);
        expect([d.trendline, d.trendColor, d.trendWidth, d.trendStyle]).toEqual([true, '#808080', 2, 'dashed']);
    });

    it('level 1 fits the rectangle the points span, centred between them; the trend line joins the points', () => {
        const d = fc();
        const g = d.radial(proj)!;
        expect([g.cx, g.cy, g.R0, g.sy]).toEqual([200, 450, 100, 0.5]);
        expect(d.trendSegment(proj)).toEqual([100, 400, 300, 500]);
        d.applySettings({ trendline: false });
        expect(d.trendSegment(proj)).toBeNull();
    });

    it('the number ends 4 px left of its ring\'s lowest point; Coeffs as percents and Levels off', () => {
        const d = fc();
        const g = d.radial(proj)!;
        expect(d.ringLabel(g, 100 * 0.5)).toEqual({ x: 196, y: 475, align: 'right' });
        expect(d.ringText(0.618)).toBe('0.618');
        d.applySettings({ levelsAsPercent: true });
        expect(d.ringText(0.618)).toBe('61.80%');
        d.applySettings({ showLevels: false });
        expect(d.ringText(0.618)).toBe('');
    });

    it('the TradingView look survives a save; one saved before keeps its look', () => {
        const d = fc();
        d.applySettings({ 'levels.3.lineWidth': 4, background: false, trendStyle: 'dotted' });
        const back = deserializeDrawing(d.serialize()) as FibCircles;
        expect([back.tv, back.levels[3]!.lineWidth, back.background, back.trendStyle, back.levels.length]).toEqual([true, 4, false, 'dotted', 11]);
        const old = fc({ levels: [{ ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        expect(old.trendSegment(proj)).toBeNull();
        expect(old.ringLabel(old.radial(proj)!, 100).align).toBe('left');
    });

    it('bar: colour and width, no style; dialog: Trend line, the 11 levels, Use one color, Background, Levels, Coeffs as percents', async () => {
        const s = setup(fc());
        const tips = s.tips();
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Fib circles');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^level-\d+-(coeff|line)$/.test(r));
        expect(roles).toEqual(['trend-line', ...Array.from({ length: 11 }, (_, i) => `level-${i}`), 'one-color', 'background', 'levels', 'percents']);
        expect(st.textContent).toContain('Coeffs as percents');
    });
});
