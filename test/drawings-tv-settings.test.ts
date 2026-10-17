import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, type FibLevels, type Projector } from '../src/core/drawings';
import { labelLayout } from '../src/renderers/native/drawings/DrawingPainter';

/** Linear projector: x = time, y = 100 − price, single pane 'price', 200 px wide. */
const proj: Projector = {
    xOf: (t) => t,
    yOf: (price, paneId) => (paneId === 'price' ? 100 - price : null),
    pxToPoint: (x, y) => ({ time: x, price: 100 - y }),
    paneIdAtY: () => 'price',
    width: 200,
    height: 100,
};

describe('TradingView drawing settings (2026-10-17)', () => {
    const fib = () => createDrawing('fibretracement', { paneId: 'price', anchors: [{ time: 40, price: 0 }, { time: 90, price: 100 }] })! as FibLevels;

    it('a new fib keeps the old look: no extension, level and price numbers left and above, faint fill', () => {
        const d = fib();
        const l = d.entryLines(proj)!.find((e) => e.numberText.startsWith('0.5'))!;
        expect([l.x1, l.x2]).toEqual([40, 90]);
        expect(l.numberText).toBe('0.5 (50.00)');
        expect(l.numberAlign).toBe('left');
        expect(l.numberY).toBe(l.y1 - 7);
        expect(d.fillBands(proj).length).toBeGreaterThan(0);
        expect(d.fillOpacity).toBe(0.06);
    });

    it('offers TradingView\'s 25 levels: the 7 standard ones on, the extension and negative ones off', () => {
        const d = fib();
        expect(d.levels.length).toBe(25);
        expect(d.levels.filter((l) => l.enabled).map((l) => l.ratio)).toEqual([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
        expect(d.levels.some((l) => l.ratio === -0.618 && !l.enabled)).toBe(true);
    });

    it('extend left / right, levels as percent, prices off, labels right and below, no background, trend line', () => {
        const d = fib();
        d.applySettings({ extendLeft: true, extendRight: true, levelsAsPercent: true, showPrices: false, labelH: 'right', labelV: 'bottom', background: false, trendline: true });
        const l = d.entryLines(proj)!.find((e) => e.numberText === '61.80%')!;
        expect([l.x1, l.x2]).toEqual([0, 200]);
        expect(l.numberAlign).toBe('right');
        expect(l.numberX).toBe(196);
        expect(l.numberY).toBe(l.y1 + 7);
        expect(d.fillBands(proj)).toEqual([]);
    });

    it('levels and prices both off leaves no number; every setting survives save and load', () => {
        const d = fib();
        d.applySettings({ showLevels: false, showPrices: false, labelH: 'center', labelV: 'middle', fillOpacity: 0.3, trendline: true, extendRight: true });
        expect(d.entryLines(proj)!.every((e) => e.numberText === '')).toBe(true);
        const back = deserializeDrawing(JSON.parse(JSON.stringify(d.serialize()))) as FibLevels;
        expect(back.showLevels).toBe(false);
        expect(back.labelH).toBe('center');
        expect(back.labelV).toBe('middle');
        expect(back.fillOpacity).toBe(0.3);
        expect(back.trendline).toBe(true);
        expect(back.extendRight).toBe(true);
    });

    it('a fib saved before these settings loads with the defaults', () => {
        const old = createDrawing('fibretracement', { paneId: 'price', anchors: [{ time: 0, price: 0 }, { time: 50, price: 100 }] })!.serialize();
        for (const k of ['extendLeft', 'extendRight', 'showLevels', 'levelsAsPercent', 'showPrices', 'labelH', 'labelV', 'background', 'fillOpacity', 'trendline']) delete (old.props as Record<string, unknown>)[k];
        const back = deserializeDrawing(old) as FibLevels;
        expect([back.extendLeft, back.showLevels, back.showPrices, back.background, back.labelH, back.labelV]).toEqual([false, true, true, true, 'left', 'top']);
    });

    it('horizontal line text sits left / center / right across the plot and above / on / below the line', () => {
        const h = createDrawing('hline', { paneId: 'price', anchors: [{ time: 120, price: 50 }], text: { value: 'Heyaa', size: 'normal', hAlign: 'left', vAlign: 'top' } })!;
        const at = (hAlign: 'left' | 'center' | 'right', vAlign: 'top' | 'center' | 'bottom') => {
            h.applySettings({ 'text.hAlign': hAlign, 'text.vAlign': vAlign });
            return labelLayout(h, proj)!;
        };
        expect(at('left', 'top')).toMatchObject({ x: 8, align: 'left' });
        expect(at('center', 'top')).toMatchObject({ x: 100, align: 'center' });
        expect(at('right', 'top')).toMatchObject({ x: 192, align: 'right' });
        const above = at('left', 'top').top;
        const on = at('left', 'center').top;
        const below = at('left', 'bottom').top;
        expect(above).toBeLessThan(on);
        expect(on).toBeLessThan(50);
        expect(below).toBe(54);
        expect(h.schema().fields.map((f) => f.path)).toEqual(expect.arrayContaining(['text.hAlign', 'text.vAlign']));
    });
});
