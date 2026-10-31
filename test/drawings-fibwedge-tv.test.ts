// @vitest-environment jsdom
// Fib wedge, TradingView parity (audit 2026-10-31, factory defaults and renderer read from TradingView's modules 474614, 168099, 292703).
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

import { createDrawing, deserializeDrawing, FibWedge, TV_FIB_WEDGE_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
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
// apex (500,500); p2 100 px right (angle 0); p3 straight down at 30 px (angle 90°, cut to 100 px)
const pts = [{ time: 500, price: 500 }, { time: 600, price: 500 }, { time: 500, price: 470 }];
const wedge = (props?: Record<string, unknown>): FibWedge => createDrawing('fibwedge', { id: 'w', paneId: 'price', anchors: pts, ...(props ? { props } : {}) })! as FibWedge;

describe('Fib wedge (TradingView)', () => {
    it('a new one: TradingView\'s 11 levels and colours, 0.236 .. 1 shown, 2 px; bands on at 80 %; solid grey 2 px trend lines', () => {
        const d = wedge();
        expect(d.tv).toBe(true);
        expect(d.levels.map((l) => [l.ratio, l.color.toUpperCase(), l.enabled, l.lineWidth])).toEqual([
            [0.236, '#F23645', true, 2], [0.382, '#FF9800', true, 2], [0.5, '#089981', true, 2], [0.618, '#4CAF50', true, 2],
            [0.786, '#00BCD4', true, 2], [1, '#808080', true, 2], [1.618, '#2962FF', false, 2], [2.618, '#F23645', false, 2],
            [3.618, '#673AB7', false, 2], [4.236, '#E91E63', false, 2], [4.618, '#E91E63', false, 2],
        ]);
        expect(TV_FIB_WEDGE_LEVELS).toHaveLength(11);
        expect([d.background, d.fillOpacity, d.showLevels]).toEqual([true, 0.2, true]);
        expect([d.trendline, d.trendColor, d.trendWidth, d.trendStyle]).toEqual([true, '#808080', 2, 'solid']);
    });

    it('the arcs span the smaller angle between the edges; the edges are the trend lines, the second cut to the first\'s length', () => {
        const d = wedge();
        const g = d.radial(proj)!;
        expect([g.cx, g.cy, g.R0, g.a0, g.a1]).toEqual([500, 500, 100, 0, Math.PI / 2]);
        expect(d.boundingLines(proj)).toEqual([]);
        const e = d.trendSegments(proj);
        expect(e[0]).toEqual([500, 500, 600, 500]);
        expect(e[1]![2]).toBeCloseTo(500);
        expect(e[1]![3]).toBeCloseTo(600);
        expect(d.handlePoints(proj)[2]![1]).toBeCloseTo(600); // the third handle sits on the cut edge
        d.applySettings({ trendline: false });
        expect(d.trendSegments(proj)).toEqual([]);
    });

    it('each number ends 4 px left of where its arc meets the bisector', () => {
        const d = wedge();
        const at = d.ringLabel(d.radial(proj)!, 100);
        expect(at.x).toBeCloseTo(500 + 100 * Math.SQRT1_2 - 4);
        expect(at.y).toBeCloseTo(500 + 100 * Math.SQRT1_2);
        expect(at.align).toBe('right');
    });

    it('the TradingView look survives a save; one saved before keeps its bounding rays', () => {
        const d = wedge();
        d.applySettings({ 'levels.6.enabled': true });
        const back = deserializeDrawing(d.serialize()) as FibWedge;
        expect([back.tv, back.levels[6]!.enabled, back.trendStyle]).toEqual([true, true, 'solid']);
        const old = wedge({ levels: [{ ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        expect(old.boundingLines(proj)).toHaveLength(2);
        expect(old.trendSegments(proj)).toEqual([]);
    });

    it('bar: colour and width; dialog: Trend line (no style), the 11 levels, Use one color, Background, Levels', async () => {
        const s = setup(wedge());
        const tips = s.tips();
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Fib wedge');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^level-\d+-(coeff|line)$/.test(r));
        expect(roles).toEqual(['trend-line', ...Array.from({ length: 11 }, (_, i) => `level-${i}`), 'one-color', 'background', 'levels']);
    });
});
