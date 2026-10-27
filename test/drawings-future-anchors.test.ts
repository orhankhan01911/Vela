import { describe, it, expect } from 'vitest';
import { readAnchor, resolveAnchors, writeAnchor, translateInBars, deserializeDrawing, type BarAxis, type DrawingPoint } from '../src/core/drawings';
import { barTimeToLogical, logicalToBarTime } from '../src/renderers/native/core/bar-time';

/** A bar axis over `times`, extrapolating past the ends with `interval` (what the native coordinate system does). */
function axisOf(times: number[], interval: number): BarAxis {
    return {
        lastTime: times[times.length - 1]!,
        lastLogical: times.length - 1,
        logicalOf: (t) => barTimeToLogical(t, times, interval),
        timeOf: (l) => logicalToBarTime(l, times, interval),
    };
}

// Trade-built bars: irregular times (ms), as on a tick chart.
const TICKS = [0, 1_000, 1_500, 4_000, 4_200, 9_000, 9_100, 9_300, 12_000, 13_000];

describe('drawing anchors past the newest bar on bar-axis charts', () => {
    it('a point placed 5 bars past the newest bar is saved as "5 bars after it"', () => {
        const ax = axisOf(TICKS, 1_000);
        const placed = { time: ax.timeOf(9 + 5), price: 100 };
        const saved = writeAnchor(placed, ax);
        expect(saved.bars).toEqual({ from: 13_000, n: expect.closeTo(5, 9) });
        expect(saved.time).toBe(placed.time); // the clock time stays, for time charts
    });

    it('stays 5 bars past that bar when the guessed bar spacing changes (2026-10-26: Renko jumped after a reload)', () => {
        const saved = writeAnchor({ time: axisOf(TICKS, 1_000).timeOf(14), price: 100 }, axisOf(TICKS, 1_000));
        for (const interval of [300, 1_000, 6_000]) {
            const ax = axisOf(TICKS, interval);
            const a = readAnchor(saved);
            resolveAnchors([a], ax);
            expect(ax.logicalOf(a.time)).toBeCloseTo(14, 9);
        }
    });

    it('new bars walk into it one at a time, and it lands on the 5th new bar', () => {
        const saved = writeAnchor({ time: axisOf(TICKS, 1_000).timeOf(14), price: 100 }, axisOf(TICKS, 1_000));
        const more = [...TICKS];
        for (let k = 1; k <= 5; k += 1) {
            more.push(13_000 + k * 200); // bars arriving far faster than the guessed spacing
            const ax = axisOf(more, 1_000);
            const a = readAnchor(saved);
            resolveAnchors([a], ax);
            expect(ax.logicalOf(a.time) - ax.lastLogical).toBeCloseTo(5 - k, 9);
        }
        const a = readAnchor(saved);
        resolveAnchors([a], axisOf(more, 1_000));
        expect(a.time).toBe(14_000); // exactly the 5th new bar
    });

    it('on a time chart it draws at its saved clock time', () => {
        const ax = axisOf(TICKS, 1_000);
        const saved = writeAnchor({ time: ax.timeOf(14), price: 100 }, ax);
        const a = readAnchor(saved);
        resolveAnchors([a], axisOf(TICKS, 7_000));
        expect(a.time).not.toBe(saved.time);
        resolveAnchors([a], null);
        expect(a.time).toBe(saved.time);
    });

    it('an unmoved anchor keeps its bars and clock time when saved again; a moved one is classified afresh', () => {
        const ax = axisOf(TICKS, 1_000);
        const a = readAnchor(writeAnchor({ time: ax.timeOf(14), price: 100 }, ax));
        const clock = a.time;
        const later = axisOf([...TICKS, 13_500], 1_000);
        resolveAnchors([a], later);
        expect(writeAnchor(a, later)).toEqual({ time: clock, price: 100, bars: { from: 13_000, n: expect.closeTo(5, 9) } });
        // dragged back over the bars: a new plain point inside the data
        expect(writeAnchor({ time: 9_100, price: 100 }, later)).toEqual({ time: 9_100, price: 100 });
    });

    it('points inside the bars and every point on a time chart stay plain times', () => {
        const ax = axisOf(TICKS, 1_000);
        expect(writeAnchor({ time: 4_100, price: 1 }, ax)).toEqual({ time: 4_100, price: 1 });
        expect(writeAnchor({ time: 99_000, price: 1 }, null)).toEqual({ time: 99_000, price: 1 });
    });

    it('drops a malformed bars field from untrusted input', () => {
        expect(readAnchor({ time: 1, price: 2, bars: { from: 'x', n: 3 } } as unknown as DrawingPoint)).toEqual({ time: 1, price: 2 });
        expect(readAnchor({ time: 1, price: 2, bars: { from: 5, n: Infinity } })).toEqual({ time: 1, price: 2 });
    });

    it('a whole-drawing drag moves every anchor by the same number of bars', () => {
        const ax = axisOf(TICKS, 1_000);
        const orig = [{ time: TICKS[1]!, price: 1 }, { time: TICKS[3]!, price: 2 }];
        const moved = translateInBars(orig, 4, 10, ax, (dt, dp, o) => o.map((p) => ({ time: p.time + dt, price: p.price + dp })));
        expect(moved.map((p) => ax.logicalOf(p.time))).toEqual([5, 7]);
        expect(moved.map((p) => p.price)).toEqual([11, 12]);
    });

    it('round-trips through a saved drawing', () => {
        const ax = axisOf(TICKS, 1_000);
        const d = deserializeDrawing({
            id: 'a',
            type: 'trendline',
            paneId: 'price',
            anchors: [{ time: 4_000, price: 1 }, writeAnchor({ time: ax.timeOf(12), price: 2 }, ax)],
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            locked: false,
            visible: true,
            zIndex: 0,
            createdAt: 0,
        })!;
        const doc = d.serialize();
        expect(doc.anchors[0]).toEqual({ time: 4_000, price: 1 });
        expect(doc.anchors[1]!.bars).toEqual({ from: 13_000, n: expect.closeTo(3, 9) });
    });
});
