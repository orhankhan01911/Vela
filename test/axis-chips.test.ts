import { describe, expect, it } from 'vitest';
import { AXIS_CHIP_H, layoutAxisChips } from '../src/renderers/native/drawings/axis-chips';

const ys = (m: Map<string, number>) => Object.fromEntries(m);

describe('layoutAxisChips: price-scale chips never cover the current-price label or each other', () => {
    const block = { top: 392, bottom: 424 }; // label + countdown around a last price at y=400

    it('a chip far from the label stays on its level', () => {
        expect(ys(layoutAxisChips([{ id: 'a', y: 200 }, { id: 'b', y: 600 }], block))).toEqual({ a: 200, b: 600 });
    });

    it('chips over the label move just above or below it (IB-9: 81,892 and 81,867 around 81,880)', () => {
        const m = layoutAxisChips([{ id: 'up', y: 395 }, { id: 'down', y: 410 }], block);
        expect(m.get('up')! + AXIS_CHIP_H / 2).toBeLessThanOrEqual(block.top);
        expect(m.get('down')! - AXIS_CHIP_H / 2).toBeGreaterThanOrEqual(block.bottom);
    });

    it('close chips stack without overlapping, keeping their order', () => {
        const m = layoutAxisChips([{ id: 'a', y: 380 }, { id: 'b', y: 385 }, { id: 'c', y: 388 }], block);
        const a = m.get('a')!, b = m.get('b')!, c = m.get('c')!;
        expect(c + AXIS_CHIP_H / 2).toBeLessThanOrEqual(block.top);
        expect(b).toBeLessThanOrEqual(c - AXIS_CHIP_H);
        expect(a).toBeLessThanOrEqual(b - AXIS_CHIP_H);
    });

    it('without a label, overlapping chips push down and separate ones stay', () => {
        const m = layoutAxisChips([{ id: 'a', y: 100 }, { id: 'b', y: 105 }, { id: 'c', y: 300 }], null);
        expect(m.get('a')).toBe(100);
        expect(m.get('b')!).toBeGreaterThanOrEqual(100 + AXIS_CHIP_H);
        expect(m.get('c')).toBe(300);
    });
});
