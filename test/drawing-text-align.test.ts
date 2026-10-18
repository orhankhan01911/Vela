import { describe, it, expect } from 'vitest';
import { labelLayout } from '../src/renderers/native/drawings/DrawingPainter';
import { createDrawing, type DrawingTypeKey, type Projector } from '../src/core/drawings';
import { ALONG_LINE_TEXT_TYPES } from '../src/core/drawings/schema';

/** Linear projector: x = time, y = 100 − price, single pane 'price' (200 × 100 px). */
function proj(): Projector {
    return {
        xOf: (t) => t,
        yOf: (price, paneId) => (paneId === 'price' ? 100 - price : null),
        pxToPoint: (x, y) => ({ time: x, price: 100 - y }),
        paneIdAtY: () => 'price',
        paneRect: () => ({ top: 0, height: 100 }),
        width: 200,
        height: 100,
    };
}

type H = 'left' | 'center' | 'right';
type V = 'top' | 'center' | 'bottom';
const withText = (type: DrawingTypeKey, anchors: { time: number; price: number }[], hAlign: H, vAlign: V) =>
    createDrawing(type, { id: type, paneId: 'price', anchors, text: { value: 'label', size: 'normal', hAlign, vAlign } })!;

describe('drawing text alignment (TradingView: left / center / right, top / middle / bottom)', () => {
    it('horizontal ray: from the anchor to the right edge, above / on / below the line', () => {
        const at = (h: H, v: V) => labelLayout(withText('hray', [{ time: 40, price: 50 }], h, v), proj())!;
        expect(at('left', 'top')).toMatchObject({ x: 48, align: 'left' }); // just past the anchor
        expect(at('center', 'top').x).toBe(120); // halfway from the anchor (40) to the edge (200)
        expect(at('right', 'top')).toMatchObject({ x: 192, align: 'right' });
        const top = at('right', 'top').top;
        const mid = at('right', 'center').top;
        const bot = at('right', 'bottom').top;
        expect(top).toBeLessThan(50 - 4 + 0.001); // ends above the line (y = 50)
        expect(mid).toBeLessThan(50);
        expect(bot).toBe(54);
        expect(top).toBeLessThan(mid);
        expect(mid).toBeLessThan(bot);
    });

    it('trend line: left end / middle / right end of the segment, upright, above / on / below it', () => {
        const at = (h: H, v: V) => labelLayout(withText('trendline', [{ time: 20, price: 50 }, { time: 120, price: 50 }], h, v), proj())!;
        expect(at('left', 'top')).toMatchObject({ x: -50, align: 'left' });
        expect(at('center', 'top')).toMatchObject({ x: 0, align: 'center' });
        expect(at('right', 'top')).toMatchObject({ x: 50, align: 'right' });
        expect(at('center', 'top').rotate).toMatchObject({ cx: 70, cy: 50, angle: 0 });
        expect(at('center', 'bottom').top).toBe(6);
        expect(at('center', 'top').top).toBeLessThan(at('center', 'center').top);
        // drawn right to left: "left" is still the end on the left of the screen (the frame is turned upright)
        const back = labelLayout(withText('trendline', [{ time: 120, price: 50 }, { time: 20, price: 50 }], 'left', 'top'), proj())!;
        expect(back.rotate!.angle).toBe(0);
        expect(back.x).toBe(-50);
    });

    it('vertical line: left of / on / right of it, at the top / middle / bottom of the pane', () => {
        const at = (h: H, v: V) => labelLayout(withText('vline', [{ time: 80, price: 50 }], h, v), proj())!;
        expect(at('left', 'top')).toMatchObject({ x: 74, align: 'right', top: 8 });
        expect(at('center', 'top')).toMatchObject({ x: 80, align: 'center' });
        expect(at('right', 'top')).toMatchObject({ x: 86, align: 'left' });
        expect(at('right', 'bottom').top).toBeGreaterThan(at('right', 'center').top);
    });

    it('every line tool with text offers both alignment settings', () => {
        for (const type of ['hline', 'hray', 'vline', 'trendline', 'ray', 'extendedline', 'infoline', 'trendangle', 'arrow'] as DrawingTypeKey[]) {
            const anchors = [{ time: 20, price: 50 }, { time: 120, price: 60 }];
            const d = createDrawing(type, { id: type, paneId: 'price', anchors })!;
            const paths = d.schema().fields.map((f) => f.path);
            expect(paths, type).toContain('text.hAlign');
            expect(paths, type).toContain('text.vAlign');
        }
    });

    it('text added to a sloped line starts in the middle (as before); a horizontal ray starts at the left', () => {
        for (const type of ALONG_LINE_TEXT_TYPES as ReadonlySet<DrawingTypeKey>) {
            const d = createDrawing(type, { id: type, paneId: 'price', anchors: [{ time: 20, price: 50 }, { time: 120, price: 60 }] })!;
            d.applySettings({ 'text.value': 'x' });
            expect(d.text?.hAlign, type).toBe('center');
        }
        const r = createDrawing('hray', { id: 'r', paneId: 'price', anchors: [{ time: 20, price: 50 }] })!;
        r.applySettings({ 'text.value': 'x' });
        expect(r.text?.hAlign).toBe('left');
    });
});
