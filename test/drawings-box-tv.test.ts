import { describe, it, expect } from 'vitest';
import { labelLayout } from '../src/renderers/native/drawings/DrawingPainter';
import { Box, createDrawing, deserializeDrawing, type Projector } from '../src/core/drawings';

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
const box = (h: H, v: V, props?: Record<string, unknown>) =>
    createDrawing('box', {
        id: 'b',
        paneId: 'price',
        anchors: [{ time: 40, price: 80 }, { time: 120, price: 40 }], // x 40..120, y 20..60
        text: { value: 'label', size: 'normal', hAlign: h, vAlign: v },
        ...(props ? { props } : {}),
    })! as Box;

describe("box like TradingView's rectangle", () => {
    it('puts its text inside the box at left / center / right and top / middle / bottom', () => {
        const at = (h: H, v: V) => labelLayout(box(h, v), proj())!;
        expect(at('left', 'top')).toMatchObject({ x: 44, top: 24, align: 'left' });
        expect(at('center', 'top')).toMatchObject({ x: 80, align: 'center' });
        expect(at('right', 'top')).toMatchObject({ x: 116, align: 'right' });
        expect(at('right', 'center').top).toBeGreaterThan(24);
        expect(at('right', 'center').top).toBeLessThan(at('right', 'bottom').top);
        expect(at('right', 'bottom').top).toBeLessThan(60);
    });

    it('extends left / right to the pane edge, and the text follows the extended edge', () => {
        const b = box('right', 'top', { extendRight: true });
        expect(b.spanX(proj())).toEqual({ x1: 40, x2: 200 });
        expect(labelLayout(b, proj())!.x).toBe(196);
        expect(box('left', 'top', { extendLeft: true }).spanX(proj())).toEqual({ x1: 0, x2: 120 });
        // The extended part is grabbable when filled.
        const f = createDrawing('box', { paneId: 'price', anchors: [{ time: 40, price: 80 }, { time: 120, price: 40 }], style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid', fillColor: '#ffffff33' }, props: { extendRight: true } })!;
        expect(f.hitTest(180, 40, proj(), 3)).toBe(true);
        expect(f.hitTest(20, 40, proj(), 3)).toBe(false);
    });

    it('keeps extend and middle line through save / load and offers them (and text alignment) in settings', () => {
        const b = box('left', 'top', { extendLeft: true, extendRight: false, middleLine: true });
        const back = deserializeDrawing(b.serialize()) as Box;
        expect([back.extendLeft, back.extendRight, back.middleLine]).toEqual([true, false, true]);
        const paths = b.schema().fields.map((f) => f.path);
        for (const p of ['extendLeft', 'extendRight', 'middleLine', 'text.hAlign', 'text.vAlign']) expect(paths).toContain(p);
    });
});
