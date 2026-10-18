import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, getDrawingType, type Projector, type SegmentDrawing, type PatternDrawing, type MeasureBox, type FixedRangeVolumeProfile, type Forecast, type BarsPattern, type GhostFeed } from '../src/core/drawings';

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

    it('anchored volume profile: one point, runs to the newest bar and grows with it', () => {
        let bars = Array.from({ length: 10 }, (_, i) => ({ time: i * 10, open: 50, high: 55 + i, low: 45, close: 52, volume: 100 }));
        const p: Projector = { ...proj(), barsInRange: (from, to) => bars.filter((b) => b.time >= from && b.time <= to) };
        const d = createDrawing('anchoredvp', { paneId: 'price', anchors: [P(30, 50)] })! as FixedRangeVolumeProfile;
        expect(d.anchorSchema().min).toBe(1);
        expect([d.layout(p)!.x0, d.layout(p)!.x1]).toEqual([30, 90]);
        bars = [...bars, { time: 100, open: 50, high: 70, low: 45, close: 60, volume: 100 }];
        expect(d.layout(p)!.x1).toBe(100); // a new bar extends it
        expect(d.handlePoints(p).length).toBe(1);
        expect(deserializeDrawing(d.serialize())!.type).toBe('anchoredvp');
    });

    it('projection: a sector around the first point, radius to the second, swept to the third', () => {
        const d = createDrawing('projection', { paneId: 'price', anchors: [P(20, 20), P(80, 20), P(20, 80)] })! as SegmentDrawing;
        const fill = d.geometry(proj())!.fill!;
        expect(fill[0]).toEqual([20, 80]);
        const r = fill.slice(1).map(([x, y]) => Math.hypot(x - 20, y - 80));
        expect(Math.min(...r)).toBeCloseTo(60, 6);
        expect(Math.max(...r)).toBeCloseTo(60, 6);
        expect(d.hitTest(40, 60, proj(), 1)).toBe(true); // inside the quarter
    });

    it('forecast: success once a bar reaches the target in time, failure when the time passes, else pending', () => {
        const bars: Array<{ time: number; open: number; high: number; low: number; close: number }> = [];
        const p: Projector = { ...proj(), barsInRange: (from, to) => bars.filter((b) => b.time >= from && b.time <= to) };
        const f = createDrawing('forecast', { paneId: 'price', anchors: [P(10, 50), P(50, 60)] })! as Forecast;
        expect(f.status(p)).toBe('pending');
        bars.push({ time: 20, open: 50, high: 55, low: 49, close: 54 }, { time: 60, open: 54, high: 56, low: 53, close: 55 });
        expect(f.status(p)).toBe('failure'); // past the target time, never at 60
        bars.splice(0, 0, { time: 30, open: 54, high: 61, low: 53, close: 58 });
        expect(f.status(p)).toBe('success');
        expect(f.changeLabel()).toBe('10.00 (20.00%) in 0s');
    });

    it('bars pattern: copies the bars between its points, moves as one, mirrors and flips', () => {
        const src = [0, 10, 20].map((t, i) => ({ time: t, open: 50 + i, high: 55 + i, low: 45 + i, close: 52 + i }));
        const p: Projector = { ...proj(), barsInRange: (from, to) => src.filter((b) => b.time >= from && b.time <= to) };
        const d = createDrawing('barspattern', { paneId: 'price', anchors: [P(0, 40), P(20, 40)] })! as BarsPattern;
        d.onPlaced(p);
        expect(d.anchors[0]).toEqual({ time: 0, price: 50 });
        expect(d.patternBars(p).map((b) => b.x)).toEqual([0, 10, 20]);
        d.anchors = d.translateBody(100, 10, d.anchors);
        const moved = d.patternBars(p);
        expect(moved[0]).toEqual({ x: 100, open: 40, high: 35, low: 45, close: 38 }); // y = 100 − (60 + offset)
        d.flipped = true;
        expect(d.patternBars(p)[0]!.close).toBe(42); // 60 − 2 → y 40 + 2
        const back = deserializeDrawing(d.serialize())! as BarsPattern;
        expect(back.bars.length).toBe(3);
        expect(back.flipped).toBe(true);
    });

    it('ghost feed: one made-up candle per bar along the path, each opening on the last close', () => {
        const p: Projector = { ...proj(), barsBetween: (a, b) => (b - a) / 10 };
        const g = createDrawing('ghostfeed', { paneId: 'price', anchors: [P(0, 50), P(40, 70), P(60, 60)] })! as GhostFeed;
        const c = g.ghostCandles(p);
        expect(c.length).toBe(6); // 4 bars up, 2 bars down
        expect(c.map((k) => k.x)).toEqual([10, 20, 30, 40, 50, 60]);
        for (let i = 1; i < c.length; i += 1) expect(c[i]!.open).toBeCloseTo(c[i - 1]!.close, 9);
        expect(c[3]!.close).toBeCloseTo(30, 9); // ends the first leg on price 70
    });
});
