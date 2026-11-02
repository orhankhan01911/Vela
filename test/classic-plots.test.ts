import { describe, expect, it } from 'vitest';
import { classicPlots } from '../src/plugin';

const last = (v: readonly number[]): number => v[v.length - 1]!;

const bars = Array.from({ length: 200 }, (_, i) => {
    const c = 100 + Math.sin(i / 6) * 5;
    return { time: 1_700_000_000_000 + i * 60_000, open: c, high: c + 0.5, low: c - 0.5, close: c, volume: 10 };
});

describe('classicPlots: a classic indicator computed off-chart with its own settings', () => {
    it('EMA: one plot, bar-aligned, follows its length input', () => {
        const a = classicPlots('ema', bars, { length: 9, source: 'Close', offset: 0 })!;
        const b = classicPlots('ema', bars, { length: 50, source: 'Close', offset: 0 })!;
        expect(a.plots.length).toBe(1);
        expect(a.plots[0]!.values.length).toBe(bars.length);
        expect(last(a.plots[0]!.values)).not.toBeCloseTo(last(b.plots[0]!.values), 3);
    });

    it('RSI: the RSI plot (0..100)', () => {
        const r = classicPlots('rsi', bars, { length: 14, source: 'Close', overbought: 70, oversold: 30 })!;
        const rsi = r.plots.find((p) => p.key === 'rsi')!;
        expect(rsi.title).toBe('RSI');
        expect(last(rsi.values)).toBeGreaterThan(0);
        expect(last(rsi.values)).toBeLessThan(100);
    });

    it('MACD: MACD and signal lines are both there', () => {
        const m = classicPlots('macd', bars, { fastLength: 12, slowLength: 26, signalLength: 9, source: 'Close' })!;
        const titles = m.plots.map((p) => p.title);
        expect(titles).toEqual(expect.arrayContaining(['MACD', 'Signal line']));
    });

    it('an unknown type is null', () => {
        expect(classicPlots('no-such', bars, {})).toBeNull();
    });
});
