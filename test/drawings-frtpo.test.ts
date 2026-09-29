import { describe, it, expect } from 'vitest';
import {
    buildTpoProfile,
    buildToolbar,
    createDrawing,
    deserializeDrawing,
    getDrawingType,
    tpoLetter,
    FixedRangeTpoProfile,
    type FrtpBar,
    type Projector,
} from '../src/core/drawings';

const MIN = 60_000;

/** One bar per 30 minutes from t=0, each spanning [low, high]. */
function bars(ranges: Array<[low: number, high: number]>, stepMin = 30): FrtpBar[] {
    return ranges.map(([low, high], i) => ({ time: i * stepMin * MIN, open: low, high, low, close: high }));
}

function fakeProjector(data: FrtpBar[]): Projector {
    return {
        xOf: (t) => t / MIN,
        yOf: (price) => 1000 - price,
        pxToPoint: (x, y) => ({ time: x * MIN, price: 1000 - y }),
        paneIdAtY: () => 'price',
        barsInRange: (from, to) => data.filter((b) => b.time >= Math.min(from, to) && b.time <= Math.max(from, to)),
        width: 500,
        height: 1000,
    };
}

describe('drawings/frtpo math', () => {
    it('marks every row a period trades through and counts TPOs per row', () => {
        // 3 periods over 100..130 in 3 rows of 10: A 100-110, B 100-120, C 110-130.
        const p = buildTpoProfile(bars([[100, 110], [100, 120], [110, 130]]), 3, 30 * MIN, 0.7)!;
        expect(p.periodCount).toBe(3);
        expect(p.rows.map((r) => r.periods)).toEqual([[0, 1], [1, 2], [2]]);
        expect(p.maxCount).toBe(2);
    });

    it('merges bars that fall in the same period into one letter', () => {
        // Two 15m bars inside the same 30m period, then one in the next.
        const data: FrtpBar[] = [
            { time: 0, open: 100, high: 105, low: 100, close: 105 },
            { time: 15 * MIN, open: 105, high: 110, low: 104, close: 110 },
            { time: 30 * MIN, open: 110, high: 112, low: 108, close: 112 },
        ];
        const p = buildTpoProfile(data, 4, 30 * MIN, 0.7)!;
        expect(p.periodCount).toBe(2);
    });

    it('gives a bar longer than the period its own letter (1h bars, 30m period)', () => {
        const p = buildTpoProfile(bars([[100, 110], [100, 110], [100, 110]], 60), 2, 30 * MIN, 0.7)!;
        expect(p.periodCount).toBe(3);
    });

    it('picks the row with the most TPOs as POC and breaks ties toward the middle', () => {
        const p = buildTpoProfile(bars([[100, 130], [100, 130]]), 3, 30 * MIN, 0.7)!;
        expect(p.maxCount).toBe(2);
        expect(p.poc).toBe(1); // all rows tie at 2, the middle one wins
    });

    it('grows the value area from the POC until it covers the requested share', () => {
        const p = buildTpoProfile(bars([[100, 110], [100, 120], [110, 130], [110, 120]]), 3, 30 * MIN, 0.7)!;
        // counts per row: [2, 3, 1]; total 6, target 4.2 → POC row + the larger neighbour is 5.
        expect(p.rows.map((r) => r.periods.length)).toEqual([2, 3, 1]);
        expect(p.poc).toBe(1);
        expect(p.vaTo - p.vaFrom).toBe(1);
        const p100 = buildTpoProfile(bars([[100, 110], [100, 120], [110, 130], [110, 120]]), 3, 30 * MIN, 1)!;
        expect([p100.vaFrom, p100.vaTo]).toEqual([0, 2]);
    });

    it('handles a flat range and empty input', () => {
        const flat = buildTpoProfile(bars([[100, 100], [100, 100]]), 10, 30 * MIN, 0.7)!;
        expect(flat.rows).toHaveLength(1);
        expect(flat.rows[0]!.periods).toEqual([0, 1]);
        expect(buildTpoProfile([], 10, 30 * MIN, 0.7)).toBeNull();
    });

    it('labels periods A-Z, a-z, then cycles', () => {
        expect(tpoLetter(0)).toBe('A');
        expect(tpoLetter(25)).toBe('Z');
        expect(tpoLetter(26)).toBe('a');
        expect(tpoLetter(52)).toBe('A');
    });
});

describe('drawings/frtpo tool', () => {
    it('is registered and appears in a Time and Price section of Measurements', () => {
        expect(getDrawingType('fixedrangetpo')?.label).toBe('Fixed Range TPO Profile');
        const { definition } = buildToolbar(true);
        const measure = definition.groups.find((g) => g.id === 'measurements');
        expect(measure?.sections?.find((s) => s.label === 'Time and Price')?.tools.map((t) => t.type)).toEqual(['fixedrangetpo']);
    });

    it('lays out from two anchors and recomputes when an anchor moves', () => {
        const data = bars([[100, 110], [100, 120], [110, 130], [120, 140]]);
        const d = createDrawing('fixedrangetpo', { paneId: 'price' }) as FixedRangeTpoProfile;
        d.anchors = [{ time: 0, price: 0 }, { time: 60 * MIN, price: 0 }];
        const L = d.layout(fakeProjector(data))!;
        expect(L.profile.periodCount).toBe(3); // bars at 0, 30, 60
        d.anchors = [{ time: 0, price: 0 }, { time: 90 * MIN, price: 0 }];
        expect(d.layout(fakeProjector(data))!.profile.periodCount).toBe(4);
        expect(d.priceRange()).toEqual({ min: 100, max: 140 });
    });

    it('round-trips its style through serialize / deserialize', () => {
        const d = createDrawing('fixedrangetpo', { paneId: 'price' }) as FixedRangeTpoProfile;
        d.frtpo = { ...d.frtpo, periodMin: 60, display: 'blocks', rows: 44 };
        const back = deserializeDrawing(d.serialize()) as FixedRangeTpoProfile;
        expect(back.frtpo.periodMin).toBe(60);
        expect(back.frtpo.display).toBe('blocks');
        expect(back.frtpo.rows).toBe(44);
    });
});
