// @vitest-environment jsdom
// Gann square, TradingView parity (audit 2026-10-31, read from TradingView's modules 79240, 675635, 977036, 206315).
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

import { createDrawing, deserializeDrawing, GannSquare, TV_GANN_SQUARE_FANS, TV_GANN_SQUARE_ARCS, type Drawing, type Projector } from '../src/core/drawings';
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
    barsBetween: (a, b) => Math.abs(b - a) / 10, // one bar = 10 time units = 10 px
    xOf: (t) => t,
    yOf: (price, paneId) => (paneId === 'price' ? 1000 - price : null),
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    paneRect: () => ({ top: 0, height: 800 }),
    width: 2000,
    height: 1000,
};
// first point (100, price 700 → y 300); second 20 bars right, cursor at price 450 (below)
const two = [{ time: 100, price: 700 }, { time: 300, price: 450 }];
const sq = (props?: Record<string, unknown>): GannSquare => createDrawing('gannsquare', { id: 's', paneId: 'price', anchors: two.map((p) => ({ ...p })), ...(props ? { props } : {}) })! as GannSquare;

describe('Gann square (TradingView)', () => {
    it('a new one: 6 grid levels at fifths, TradingView\'s 11 fans (2x1, 1x1, 1x2 on) and 11 arcs, all 2 px; background 80 %', () => {
        const d = sq();
        expect(d.tv).toBe(true);
        expect(d.levels.map((l) => [l.ratio, l.color.toUpperCase(), l.enabled, l.lineWidth])).toEqual([
            [0, '#808080', true, 2], [0.2, '#FF9800', true, 2], [0.4, '#00BCD4', true, 2], [0.6, '#4CAF50', true, 2], [0.8, '#089981', true, 2], [1, '#808080', true, 2],
        ]);
        expect(d.fanLines!.filter((f) => f.enabled).map((f) => `${f.x}x${f.y}`)).toEqual(['2x1', '1x1', '1x2']);
        expect(d.fanLines!.map((f) => `${f.x}x${f.y}`)).toEqual(['8x1', '5x1', '4x1', '3x1', '2x1', '1x1', '1x2', '1x3', '1x4', '1x5', '1x8']);
        expect(d.arcs!.map((a) => `${a.x}x${a.y}`)).toEqual(['1x0', '1x1', '1.5x0', '2x0', '2x1', '3x0', '3x1', '4x0', '4x1', '5x0', '5x1']);
        expect(TV_GANN_SQUARE_FANS).toHaveLength(11);
        expect(TV_GANN_SQUARE_ARCS.every((a) => a.enabled)).toBe(true);
        expect([d.background, d.fillOpacity, d.showLabels, d.reverse, d.fontSize]).toEqual([true, 0.2, true, false, 12]);
    });

    it('placed: the chart\'s price/bar ratio is kept and the second point squared to it (20 bars x 10 = 200 below)', () => {
        const d = sq();
        d.onPlaced(proj);
        expect(d.scaleRatio).toBeCloseTo(10); // 10 px per bar ÷ 1 px per price unit
        expect(d.msPerBar).toBeCloseTo(10);
        expect(d.anchors[1]!.price).toBeCloseTo(500);
        d.applySettings({ scaleRatio: 5 });
        expect(d.anchors[1]!.price).toBeCloseTo(600);
        d.anchors = [d.anchors[0]!, { time: 400, price: 100 }];
        d.constrainHandleDrag();
        expect(d.anchors[1]!.price).toBeCloseTo(550); // 30 bars x 5 below
    });

    it('grid at fifths of the box; fans from the first point; arcs k = √(x²+y²)/5 with the previous shown one', () => {
        const d = sq();
        d.onPlaced(proj);
        const f = d.tvFrame(proj)!;
        expect([f.sx, f.sy, f.rx, f.ry]).toEqual([100, 300, 200, 200]);
        const lines = d.entryLines(proj)!;
        const verticals = lines.filter((l) => l.x1 === l.x2 && l.y1 === 300 && l.y2 === 500).map((l) => l.x1);
        expect(verticals).toEqual([100, 140, 180, 220, 260, 300]);
        const fans = lines.filter((l) => l.x1 === 100 && l.y1 === 300 && (l.x2 !== 100 || l.y2 !== 300) && l.x2 !== l.x1 && l.y2 !== l.y1);
        expect(fans.map((l) => [l.x2, l.y2])).toEqual([[300, 400], [300, 500], [200, 500]]); // 2x1, 1x1, 1x2
        const arcs = d.tvArcs();
        expect(arcs).toHaveLength(11);
        expect(arcs[0]!.k).toBeCloseTo(0.2);
        expect(arcs[1]!.k).toBeCloseTo(Math.SQRT2 / 5);
        expect(arcs[1]!.prevK).toBeCloseTo(0.2);
    });

    it('labels: price range, bar range and price/bar ratio in the last level\'s colour; off with Ranges and ratio off', () => {
        const d = sq();
        d.onPlaced(proj);
        const texts = d.entryLines(proj)!.filter((l) => l.numberText).map((l) => [l.numberText, l.color.toUpperCase()]);
        expect(texts).toEqual([['-200', '#808080'], ['20', '#808080'], ['10', '#808080']]);
        d.applySettings({ showLabels: false });
        expect(d.entryLines(proj)!.some((l) => l.numberText)).toBe(false);
    });

    it('Reverse counts from the second point', () => {
        const d = sq();
        d.onPlaced(proj);
        d.applySettings({ reverse: true });
        const f = d.tvFrame(proj)!;
        expect([f.sx, f.rx]).toEqual([300, -200]);
    });

    it('the bar\'s colour and width set every line; the look survives a save; one saved before keeps its look', () => {
        const d = sq();
        d.onPlaced(proj);
        d.applySettings({ 'style.lineColor': '#00ff00', 'style.lineWidth': 3, 'fanLines.0.enabled': true });
        expect([...d.levels, ...d.fanLines!, ...d.arcs!].every((l) => l.color === '#00ff00' && l.lineWidth === 3)).toBe(true);
        const back = deserializeDrawing(d.serialize()) as GannSquare;
        expect([back.tv, back.fanLines![0]!.enabled, back.scaleRatio, back.arcs!.length]).toEqual([true, true, d.scaleRatio, 11]);
        const old = sq({ levels: [{ ratio: 0, color: '#123456', enabled: true }, { ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        expect(old.anchors[1]!.price).toBe(450);
    });

    it('bar: colour and width; dialog: Levels, Fans, Arcs, Use one color, Background, Reverse, Price/bar ratio, Ranges and ratio', async () => {
        const s = setup(sq());
        const tips = s.tips();
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Gann square');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^text-/.test(r));
        expect(roles).toEqual([
            ...Array.from({ length: 6 }, (_, i) => `levels-${i}`), ...Array.from({ length: 11 }, (_, i) => `fanLines-${i}`), ...Array.from({ length: 11 }, (_, i) => `arcs-${i}`),
            'one-color', 'background', 'reverse', 'scale-ratio', 'labels',
        ]);
        const text = st.textContent!;
        for (const w of ['Levels', 'Fans', 'Arcs', '8x1', '1.5x0', 'Price/bar ratio', 'Ranges and ratio']) expect(text, w).toContain(w);
    });
});
