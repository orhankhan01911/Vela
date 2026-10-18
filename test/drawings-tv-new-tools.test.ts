import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, getDrawingType, type Projector, type SegmentDrawing, type PatternDrawing, type MeasureBox } from '../src/core/drawings';

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
const P = (time: number, price: number) => ({ time, price });

describe("TradingView's tools Vela lacked", () => {
    it('cyclic lines: a vertical line every period from the first point to the right edge', () => {
        const d = createDrawing('cycliclines', { paneId: 'price', anchors: [P(20, 50), P(50, 50)] })! as SegmentDrawing;
        expect(d.geometry(proj())!.segments.map((s) => s[0])).toEqual([20, 50, 80, 110, 140, 170, 200]);
    });

    it('time cycles: half circles one period wide on the first point, both ways, filled', () => {
        const d = createDrawing('timecycles', { paneId: 'price', anchors: [P(60, 30), P(100, 50)] })! as SegmentDrawing;
        const g = d.geometry(proj())!;
        expect(g.fills!.length).toBeGreaterThanOrEqual(5); // −20..20 … 180..220 cover the 200 px pane
        const top = Math.min(...g.fills![0]!.pts.map((p) => p[1]));
        expect(top).toBeCloseTo(70 - 20, 6); // radius 20 above the baseline y 70
    });

    it('sine line: crest at the first point, trough at the second, across the pane', () => {
        const d = createDrawing('sineline', { paneId: 'price', anchors: [P(40, 80), P(80, 40)] })! as SegmentDrawing;
        const segs = d.geometry(proj())!.segments;
        const yAt = (x: number) => segs.find((s) => s[0] <= x && s[2] >= x)!;
        expect(Math.min(...segs.map((s) => s[1]))).toBeCloseTo(20, 0); // crest y = 100 − 80
        expect(Math.max(...segs.map((s) => s[1]))).toBeCloseTo(60, 0); // trough y = 100 − 40
        expect(yAt(120)).toBeTruthy(); // keeps going past the points
    });

    it('arrow marker: a filled arrow from the tail to its head', () => {
        const d = createDrawing('arrowmarker', { paneId: 'price', anchors: [P(20, 50), P(120, 50)] })! as SegmentDrawing;
        const g = d.geometry(proj())!;
        expect(g.fill!.some(([x, y]) => x === 120 && y === 50)).toBe(true); // the tip
        expect(d.hitTest(100, 50, proj(), 1)).toBe(true); // inside the filled body
        expect(getDrawingType('arrowmarker')!.defaultStyle.fillColor).toBeTruthy();
    });

    it('date range / price range read only their own measure', () => {
        const dr = createDrawing('daterange', { paneId: 'price', anchors: [P(20, 40), P(80, 60)] })! as MeasureBox;
        const pr = createDrawing('pricerange', { paneId: 'price', anchors: [P(20, 40), P(80, 60)] })! as MeasureBox;
        expect([dr.showPrice, dr.showDate]).toEqual([false, true]);
        expect([pr.showPrice, pr.showDate]).toEqual([true, false]);
        expect((deserializeDrawing(dr.serialize())! as MeasureBox).showPrice).toBe(false);
    });

    it('triangle pattern and the Elliott triangle / combos: their points and labels, degree styles', () => {
        const pts = (n: number) => Array.from({ length: n }, (_, i) => P(10 + i * 20, i % 2 ? 70 : 30));
        const tri = createDrawing('trianglepattern', { paneId: 'price', anchors: pts(4) })! as PatternDrawing;
        expect(tri.vertexLabels()).toEqual(['A', 'B', 'C', 'D']);
        expect(tri.labelPlates()).toBe(true);
        const et = createDrawing('elliotttriangle', { paneId: 'price', anchors: pts(6) })! as PatternDrawing;
        expect(et.vertexLabels()).toEqual(['', 'A', 'B', 'C', 'D', 'E']);
        const dc = createDrawing('elliottdoublecombo', { paneId: 'price', anchors: pts(4), props: { degree: 'Intermediate' } })! as PatternDrawing;
        expect(dc.vertexLabels()).toEqual(['', '(W)', '(X)', '(Y)']);
        const tc = createDrawing('elliotttriplecombo', { paneId: 'price', anchors: pts(6), props: { degree: 'Minute' } })! as PatternDrawing;
        expect(tc.vertexLabels()).toEqual(['', '(w)', '(x)', '(y)', '(x)', '(z)']);
        const pc = createDrawing('elliotttriangle', { paneId: 'price', anchors: pts(6), props: { degree: 'Primary' } })! as PatternDrawing;
        expect(pc.vertexLabels()).toEqual(['', 'Ⓐ', 'Ⓑ', 'Ⓒ', 'Ⓓ', 'Ⓔ']);
        expect(deserializeDrawing(tc.serialize())!.serialize().props).toMatchObject({ degree: 'Minute' });
    });
});
