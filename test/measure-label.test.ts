import { describe, expect, it } from 'vitest';

import { measureDecimals, signed } from '../src/renderers/native/drawings/MeasureOverlay';

describe('measure label precision', () => {
    it('keeps about five significant digits of the price', () => {
        expect(measureDecimals(1.12)).toBe(5); // EURUSD
        expect(measureDecimals(150.12)).toBe(3); // USDJPY
        expect(measureDecimals(80000)).toBe(2); // BTC
        expect(measureDecimals(0.0305)).toBe(7);
        expect(measureDecimals(0)).toBe(2);
    });
    it('formats a signed, grouped change', () => {
        expect(signed(0.00089, 5)).toBe('+0.00089');
        expect(signed(-2062.081, 2)).toBe('-2,062.08');
        expect(signed(0)).toBe('+0.00');
    });
});
