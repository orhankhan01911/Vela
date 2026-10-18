import { describe, expect, it } from 'vitest';

import { BarStore, mergeSorted } from '../src/data/BarStore';
import type { OHLCV } from '../src/core/model/ohlcv';

const bar = (time: number, close = time): OHLCV => ({ time, open: close, high: close, low: close, close, volume: 1 });

/** The old merge (Map + sort): the reference. */
function reference(held: OHLCV[], inc: OHLCV[]): OHLCV[] {
    const m = new Map<number, OHLCV>();
    for (const b of held) m.set(b.time, b);
    for (const b of inc) m.set(b.time, b);
    return [...m.values()].sort((a, b) => a.time - b.time);
}

describe('BarStore merge', () => {
    it('matches the Map + sort merge on prepends, appends, overlaps and unsorted input', () => {
        let seed = 7;
        const rnd = (): number => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
        for (let k = 0; k < 300; k++) {
            const held = Array.from({ length: Math.floor(rnd() * 40) }, () => bar(Math.floor(rnd() * 100))).sort((a, b) => a.time - b.time);
            const uniqHeld = reference([], held);
            const inc = Array.from({ length: Math.floor(rnd() * 40) + 1 }, () => bar(Math.floor(rnd() * 130) - 15, rnd()));
            expect(mergeSorted(uniqHeld, inc)).toEqual(reference(uniqHeld, inc));
            expect(mergeSorted(held, inc)).toEqual(reference(held, inc)); // held with duplicate times
        }
    });

    it('incoming wins on the same time; a chunk before or after is a concat', () => {
        const held = [bar(10), bar(20), bar(30)];
        expect(mergeSorted(held, [bar(20, 99)]).map((b) => b.close)).toEqual([10, 99, 30]);
        expect(mergeSorted(held, [bar(1), bar(2)]).map((b) => b.time)).toEqual([1, 2, 10, 20, 30]);
        expect(mergeSorted(held, [bar(40)]).map((b) => b.time)).toEqual([10, 20, 30, 40]);
        const s = new BarStore();
        s.merge('k', held);
        expect(s.merge('k', [bar(5), bar(25)]).map((b) => b.time)).toEqual([5, 10, 20, 25, 30]);
    });

    it('merges a 400 000-bar backfill in chunks quickly', () => {
        const s = new BarStore();
        const t0 = performance.now();
        for (let c = 399; c >= 0; c--) s.merge('k', Array.from({ length: 1000 }, (_, i) => bar(c * 1000 + i)));
        expect(s.get('k')!.length).toBe(400_000);
        expect(performance.now() - t0).toBeLessThan(3000);
    });
});
