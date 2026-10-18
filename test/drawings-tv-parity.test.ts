import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, TrendLine, type Projector, type SegmentDrawing } from '../src/core/drawings';

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
const paths = (type: Parameters<typeof createDrawing>[0], n: number) =>
    createDrawing(type, { paneId: 'price', anchors: Array.from({ length: n }, (_, i) => ({ time: 50 + i * 10, price: 50 + i })) })!
        .schema()
        .fields.map((f) => f.path);

describe('drawing settings TradingView has', () => {
    it('trend line: extend left / right to the pane edge (grabbable there) and an arrow at either end', () => {
        // (40,60) → (80,40): slope −0.5 px per px.
        const t = createDrawing('trendline', { paneId: 'price', anchors: [{ time: 40, price: 40 }, { time: 80, price: 60 }], props: { extendRight: true } })! as TrendLine;
        expect(t.drawnPixels(proj())).toEqual([40, 60, 200, -20]);
        expect(t.hitTest(120, 20, proj(), 2)).toBe(true); // past the second point
        expect(t.hitTest(20, 70, proj(), 2)).toBe(false); // left side not extended
        expect(t.timeExtent()).toEqual({ min: 40, max: Number.POSITIVE_INFINITY });
        const back = deserializeDrawing(t.serialize())! as TrendLine;
        expect([back.extendLeft, back.extendRight]).toEqual([false, true]);
        for (const p of ['extendLeft', 'extendRight', 'style.arrowLeft', 'style.arrowRight']) expect(paths('trendline', 2)).toContain(p);
    });

    it('horizontal line / ray / cross line: price label on the scale, on unless switched off', () => {
        for (const type of ['hline', 'hray', 'crossline'] as const) {
            expect(paths(type, 1)).toContain('showPrice');
            const d = createDrawing(type, { paneId: 'price', anchors: [{ time: 50, price: 50 }] })!;
            expect(d.serialize().props).toEqual({ showPrice: true });
            const off = createDrawing(type, { paneId: 'price', anchors: [{ time: 50, price: 50 }], props: { showPrice: false } })!;
            expect(deserializeDrawing(off.serialize())!.serialize().props).toEqual({ showPrice: false });
        }
    });

    it('parallel channel: dashed middle line (on by default) and extend left / right', () => {
        const mk = (props?: Record<string, unknown>) =>
            createDrawing('parallelchannel', { paneId: 'price', anchors: [{ time: 40, price: 60 }, { time: 80, price: 60 }, { time: 60, price: 40 }], ...(props ? { props } : {}) })! as SegmentDrawing;
        expect(mk().geometry(proj())!.dashed).toEqual([[40, 50, 80, 50]]); // halfway between y 40 and y 60
        expect(mk({ middleLine: false }).geometry(proj())!.dashed).toBeUndefined();
        const ext = mk({ extendLeft: true, extendRight: true }).geometry(proj())!;
        expect(ext.segments).toEqual([[0, 40, 200, 40], [0, 60, 200, 60]]);
        for (const p of ['middleLine', 'extendLeft', 'extendRight']) expect(paths('parallelchannel', 3)).toContain(p);
    });
});
