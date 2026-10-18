import { describe, it, expect } from 'vitest';
import { candleVariant, VOLUME_CANDLE_MIN_WIDTH } from '../src/renderers/native/backend/candle-lod';
import { priceStyleIds } from '../src/renderers/native/core/chartConfig';
import { priceStyleLabel, priceStyleIcon } from '../src/widget/topbar';

/** Tester request 2026-10-17: TradingView's hollow candles and volume candles. */
const bar = (open: number, close: number, volume = 1) => ({ time: 0, open, high: Math.max(open, close) + 1, low: Math.min(open, close) - 1, close, volume });

describe('hollow candles', () => {
    const bars = [bar(10, 12), bar(12, 11), bar(11, 11.5), bar(13, 14)];
    const v = candleVariant('hollowcandles', bars, 0, 3)!;

    it('colors by the close against the PREVIOUS close (the first bar by its own open)', () => {
        expect(v.up(0)).toBe(true); // 12 >= 10 (own open)
        expect(v.up(1)).toBe(false); // 11 < 12
        expect(v.up(2)).toBe(true); // 11.5 >= 11
        expect(v.up(3)).toBe(true);
    });

    it('a close above the open is hollow, below is filled', () => {
        expect(v.hollow(0)).toBe(true);
        expect(v.hollow(1)).toBe(false);
        expect(v.hollow(2)).toBe(true);
    });

    it('keeps normal body widths', () => {
        expect(v.width(1)).toBe(1);
    });
});

describe('volume candles', () => {
    it('body width follows volume relative to the largest bar on screen, with a floor', () => {
        const bars = [bar(1, 2, 100), bar(2, 1, 50), bar(1, 2, 0)];
        const v = candleVariant('volumecandles', bars, 0, 2)!;
        expect(v.width(0)).toBe(1);
        expect(v.width(1)).toBeCloseTo(0.5);
        expect(v.width(2)).toBe(VOLUME_CANDLE_MIN_WIDTH);
        expect(v.up(1)).toBe(false);
        expect(v.hollow(0)).toBe(false);
    });

    it('only the visible bars set the scale', () => {
        const bars = [bar(1, 2, 1000), bar(1, 2, 10), bar(1, 2, 20)];
        expect(candleVariant('volumecandles', bars, 1, 2)!.width(2)).toBe(1);
    });
});

describe('the two styles are pickable', () => {
    it('listed right after Candles, with labels and icons', () => {
        const ids = priceStyleIds();
        expect(ids.slice(0, 3)).toEqual(['candles', 'hollowcandles', 'volumecandles']);
        expect(priceStyleLabel('hollowcandles')).toBe('Hollow candles');
        expect(priceStyleLabel('volumecandles')).toBe('Volume candles');
        expect(priceStyleIcon('hollowcandles')).toBe('style-hollowcandles');
        expect(priceStyleIcon('volumecandles')).toBe('style-volumecandles');
    });

    it('plain candles have no variant', () => {
        expect(candleVariant('candles', [bar(1, 2)], 0, 0)).toBeNull();
    });
});
