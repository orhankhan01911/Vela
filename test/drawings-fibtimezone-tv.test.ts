// @vitest-environment jsdom
// The Fib time zone, TradingView parity (audit 2026-10-31, TradingView's module 308132): 11 vertical lines at 0, 1, 2,
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

import { createDrawing, deserializeDrawing, FibTimeZones, TV_FIB_TIME_ZONE_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
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
const two = [{ time: 100, price: 400 }, { time: 110, price: 500 }];
const tz = (props?: Record<string, unknown>): FibTimeZones => createDrawing('fibtimezones', { id: 't', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as FibTimeZones;

describe('Fib time zone (TradingView)', () => {
    it('a new one: 11 levels, 0 grey and the rest blue, 2 px solid each; no background; dashed grey 1 px trend line', () => {
        const d = tz();
        expect(d.tv).toBe(true);
        expect(d.levels.map((l) => [l.ratio, l.color.toUpperCase(), l.enabled, l.lineWidth, l.lineStyle])).toEqual(
            [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89].map((n, i) => [n, i === 0 ? '#808080' : '#2962FF', true, 2, 'solid']),
        );
        expect(TV_FIB_TIME_ZONE_LEVELS).toHaveLength(11);
        expect([d.background, d.fillOpacity, d.showLabels, d.labelH, d.labelV]).toEqual([false, 0.2, true, 'right', 'bottom']);
        expect([d.trendline, d.trendColor, d.trendWidth, d.trendStyle]).toEqual([true, '#808080', 1, 'dashed']);
    });

    it('lines at n x the points\' distance, full pane; the number 2 px right of the line at the bottom', () => {
        const e = tz().entryLines(proj)!;
        expect(e.map((l) => l.x1)).toEqual([100, 110, 120, 130, 150, 180, 230, 310, 440, 650, 990]);
        const five = e[4]!;
        expect([five.y1, five.y2, five.numberText, five.numberX, five.numberAlign]).toEqual([0, 800, '5', 152, 'left']);
        expect(five.numberY).toBeGreaterThan(780);
        expect([five.lineWidth, five.lineStyle]).toEqual([2, 'solid']);
    });

    it('a level\'s own width and style reach its line; Labels off leaves no numbers', () => {
        const d = tz();
        d.applySettings({ 'levels.3.lineWidth': 4, 'levels.3.lineStyle': 'dotted', showLabels: false });
        const back = deserializeDrawing(d.serialize()) as FibTimeZones;
        const l = back.entryLines(proj)![3]!;
        expect([l.lineWidth, l.lineStyle, l.numberText]).toEqual([4, 'dotted', '']);
    });

    it('Background on: bands between consecutive lines over the pane, in the later line\'s colour', () => {
        const d = tz();
        expect(d.fillBands(proj)).toEqual([]);
        d.applySettings({ background: true });
        const b = d.fillBands(proj);
        expect(b).toHaveLength(10);
        expect([b[0]!.x, b[0]!.w, b[0]!.h, b[0]!.color.toUpperCase()]).toEqual([100, 10, 800, '#2962FF']);
    });

    it('levels remembered from the old look (no line of their own) get TradingView\'s 2 px solid, not the old dashed default', () => {
        // The user's report (2026-10-31): a new time zone came out dashed, from settings remembered from an old one.
        const d = createDrawing('fibtimezones', {
            id: 't', paneId: 'price', anchors: two, style: { lineColor: '#2962ff', lineWidth: 1, lineStyle: 'dashed' },
            props: { tv: true, levels: [0, 1, 2].map((n) => ({ ratio: n, color: '#2962ff', enabled: true })) },
        })! as FibTimeZones;
        expect(d.entryLines(proj)!.every((l) => l.lineStyle === 'solid' && l.lineWidth === 2)).toBe(true);
        d.applySettings({ 'levels.1.lineStyle': 'dotted' });
        expect((deserializeDrawing(d.serialize()) as FibTimeZones).entryLines(proj)![1]!.lineStyle).toBe('dotted');
    });

    it('one saved before keeps its look (numbers centered at the top, no bands)', () => {
        const old = tz({ levels: [{ ratio: 0, color: '#123456', enabled: true }, { ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        const l = old.entryLines(proj)![1]!;
        expect([l.numberAlign, l.numberY]).toEqual(['center', 9]);
    });

    it('bar: colour, width, style; dialog: the 11 levels, Use one color, Background, Labels', async () => {
        const s = setup(tz());
        const tips = s.tips();
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips.indexOf('Line style')).toBeGreaterThan(tips.indexOf('Line width'));
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Fib time zone');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/-(coeff|line)$/.test(r));
        expect(roles).toEqual([...Array.from({ length: 11 }, (_, i) => `level-${i}`), 'one-color', 'background', 'labels']);
    });
});
