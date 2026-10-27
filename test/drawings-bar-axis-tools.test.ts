import { describe, it, expect } from 'vitest';
import { createDrawing, FibTimeZones, GhostFeed, BarsPattern, type BarAxis, type Projector } from '../src/core/drawings';
import { barTimeToLogical, logicalToBarTime } from '../src/renderers/native/core/bar-time';

// Tick bars: irregular times, one bar per 10 px on screen (x = 10 × bar index).
const TIMES = [0, 100, 150, 900, 950, 1_000, 3_000, 3_050, 3_100, 7_000, 7_020, 7_040, 9_000, 9_500, 12_000, 12_100, 12_200];
const IV = 100;
const axis: BarAxis = {
    lastTime: TIMES[TIMES.length - 1]!,
    lastLogical: TIMES.length - 1,
    logicalOf: (t) => barTimeToLogical(t, TIMES, IV),
    timeOf: (l) => logicalToBarTime(l, TIMES, IV),
};
function barProjector(withAxis: boolean): Projector {
    return {
        xOf: (t) => 10 * axis.logicalOf(t),
        yOf: (price, paneId) => (paneId === 'price' ? 100 - price : null),
        pxToPoint: (x, y) => ({ time: axis.timeOf(x / 10), price: 100 - y }),
        paneIdAtY: () => 'price',
        barsBetween: (a, b) => axis.logicalOf(b) - axis.logicalOf(a),
        barsInRange: (from, to) => TIMES.filter((t) => t >= from && t <= to).map((t) => ({ time: t, open: 50, high: 51, low: 49, close: 50 })),
        barAxis: withAxis ? axis : null,
        width: 400,
        height: 100,
    };
}
const gaps = (xs: number[]): number[] => xs.slice(1).map((x, i) => +(x - xs[i]!).toFixed(6));

describe('drawing tools on a chart whose x counts bars (tick, Renko ...)', () => {
    it('fib time zones 0, 1, 2, 3 are evenly spaced, in bars (2026-10-26: 113 / 132 / 95 px on tick bars)', () => {
        const d = createDrawing('fibtimezones', { paneId: 'price', anchors: [{ time: TIMES[1]!, price: 50 }, { time: TIMES[3]!, price: 50 }] }) as FibTimeZones;
        const xs = d.zoneLines(barProjector(true))!.filter((l) => [0, 1, 2, 3].includes(l.n)).map((l) => l.x);
        expect(gaps(xs)).toEqual([20, 20, 20]); // the span is 2 bars = 20 px
        // without the axis (time arithmetic) the same zones are uneven on these bars: the bug this guards
        const old = d.zoneLines(barProjector(false))!.filter((l) => [0, 1, 2, 3].includes(l.n)).map((l) => l.x);
        expect(new Set(gaps(old)).size).toBeGreaterThan(1);
    });

    it('ghost candles sit one bar apart', () => {
        const d = createDrawing('ghostfeed', { paneId: 'price', anchors: [{ time: TIMES[2]!, price: 40 }, { time: TIMES[8]!, price: 60 }] }) as GhostFeed;
        const xs = d.ghostCandles(barProjector(true)).map((c) => c.x);
        expect(xs.length).toBe(6);
        expect(gaps(xs)).toEqual([10, 10, 10, 10, 10]);
    });

    it('a copied bars pattern keeps one bar between copies wherever it is placed', () => {
        const proj = barProjector(true);
        const d = createDrawing('barspattern', { paneId: 'price', anchors: [{ time: TIMES[3]!, price: 50 }, { time: TIMES[8]!, price: 50 }] }) as BarsPattern;
        d.onPlaced(proj);
        d.anchors[0] = { time: TIMES[9]!, price: 50 }; // moved over denser bars
        expect(gaps(d.patternBars(proj).map((b) => b.x))).toEqual([10, 10, 10, 10, 10]);
    });

    it('on a time chart nothing changes', () => {
        const d = createDrawing('fibtimezones', { paneId: 'price', anchors: [{ time: 0, price: 50 }, { time: 10, price: 50 }] }) as FibTimeZones;
        const timeProj: Projector = { ...barProjector(false), xOf: (t) => t };
        expect(d.zoneLines(timeProj)!.filter((l) => [0, 1, 2, 3].includes(l.n)).map((l) => l.x)).toEqual([0, 10, 20, 30]);
    });
});
