import { describe, it, expect } from 'vitest';
import type { OHLCV } from '../src/core/model/ohlcv';
import { classicSpecs } from '../src/core/native-indicators/classics';

const DAY = 86_400_000;
const D0 = Date.UTC(2026, 9, 25);
const bar = (time: number, o: number, h: number, l: number, c: number): OHLCV => ({ time, open: o, high: h, low: l, close: c, volume: 1 });
const spec = classicSpecs.find((s) => s.type === 'pivot-points')!;
const pOf = (out: ReturnType<typeof spec.compute>): readonly number[] => out.plots.find((p) => p.key === 'p' || /^P$/i.test(p.title))!.values;

// Bars built from trades: a few hours of today only, irregular spacing (seconds apart).
const drawn: OHLCV[] = [0, 4, 9, 20, 61, 180].map((s, i) => bar(D0 + 10 * 3_600_000 + s * 1000, 100 + i, 101 + i, 99 + i, 100.5 + i));
// The day before as the host's daily candle: H 110, L 90, C 100 -> traditional P = 100.
const daily: OHLCV[] = [bar(D0 - DAY, 95, 110, 90, 100), bar(D0, 100, 106, 98, 105)];

describe('pivot points on bars built from trades', () => {
    it('draws nothing from the drawn bars alone (no previous day on the chart)', () => {
        const p = pOf(spec.compute(drawn, {}));
        expect(p.every((v) => !Number.isFinite(v))).toBe(true);
    });

    it("takes the previous day's OHLC from the period bars and Auto from the chart's interval", () => {
        const p = pOf(spec.compute(drawn, {}, { bars: daily, intervalMs: 5 * 60_000 }));
        // the period's first bar stays a break, every bar after it carries yesterday's pivot
        expect(Number.isFinite(p[0]!)).toBe(false);
        for (const v of p.slice(1)) expect(v).toBeCloseTo(100, 9);
    });

    it('time charts are unchanged without period bars', () => {
        const candles: OHLCV[] = [];
        for (let t = D0 - DAY; t < D0 + 6 * 3_600_000; t += 3_600_000) candles.push(bar(t, 100, t < D0 ? 110 : 104, t < D0 ? 90 : 97, 100));
        const a = pOf(spec.compute(candles, { anchor: 'Daily' }));
        const b = pOf(spec.compute(candles, { anchor: 'Daily' }, null));
        expect(b).toEqual(a);
        expect(a[a.length - 1]).toBeCloseTo(100, 9);
    });
});

describe('built-in registration on every chart', () => {
    it('keeps a host-wrapped built-in instead of overwriting it', async () => {
        const { getNativeIndicator, registerNativeIndicator } = await import('../src/core/native-indicators/NativeIndicator');
        const { registerClassicIndicators } = await import('../src/core/native-indicators/classics');
        registerClassicIndicators();
        const original = getNativeIndicator('pivot-points')!;
        const wrapped = Object.create(original) as typeof original;
        registerNativeIndicator(wrapped);
        registerClassicIndicators(); // what the next chart's construction does
        expect(getNativeIndicator('pivot-points')).toBe(wrapped);
        registerNativeIndicator(original);
    });
});

describe('registerBuiltinIndicators', () => {
    it('registers the classics before any chart exists', async () => {
        const { registerBuiltinIndicators, getNativeIndicator } = await import('../src/plugin');
        registerBuiltinIndicators();
        expect(getNativeIndicator('pivot-points')).toBeTruthy();
        expect(getNativeIndicator('volume')).toBeTruthy();
    });
});
