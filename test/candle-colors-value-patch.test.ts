// A re-run's value patch carries a candle series' per-bar colours (found 2026-10-31 in the vela-sandbox Delta Candles
// indicator; SMC's trend candles have the same shape): the patch replaced the bars but kept the FIRST run's
// `barColors`, so when older bars loaded (501 -> 2501 bars) the 501 colours sat on the oldest bars and the newest
// candles lost theirs. Same class as test/fill-value-patch.test.ts.
import { describe, it, expect } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import type { IndicatorModel } from '../src/core/model/indicator';
import type { ValuePatch } from '../src/core/model/patch';

const T0 = 1_700_000_000_000;
const STEP = 60_000;
const bars = (n: number) => Array.from({ length: n }, (_, i) => ({ time: T0 + i * STEP, open: 1, high: 2, low: 0, close: 1 }));
const colors = (n: number, c: string) => Array.from({ length: n }, () => ({ color: c }));

function model(n: number, c: string): IndicatorModel {
    return {
        id: 'ind',
        title: 'ind',
        overlay: true,
        paneHint: 'price',
        paneId: 'price',
        series: [{ id: 'c', title: 'c', paneId: 'price', overlay: true, kind: 'candle', bars: bars(n), barColors: colors(n, c) }],
        fills: [],
        backgrounds: [],
        priceLines: [],
        inputs: [],
        inputValues: {},
    } as unknown as IndicatorModel;
}

function renderer(start: IndicatorModel) {
    const r = new NativeRenderer();
    const anyR = r as any; // eslint-disable-line @typescript-eslint/no-explicit-any -- the scene is renderer-private
    if (!anyR.scheduler) anyR.scheduler = { invalidate: () => {} };
    anyR.scene.indicators.set('ind', start);
    return { r, model: () => anyR.scene.indicators.get('ind') as IndicatorModel };
}

describe('value patch, candle series', () => {
    it('replaces the per-bar colours along with the bars', () => {
        const { r, model: m } = renderer(model(501, '#111111'));
        const next = model(2501, '#2f8cff');
        const s = next.series[0] as unknown as { id: string; bars: never; barColors: never };
        const patch: ValuePatch = { kind: 'value', indicatorId: 'ind', dirty: { from: T0, to: T0 + 2500 * STEP }, series: [{ seriesId: s.id, kind: 'bars', bars: s.bars, barColors: s.barColors }] };
        r.updateIndicator({ id: 'ind' } as never, patch);
        const c = m().series[0] as unknown as { bars: unknown[]; barColors: { color: string }[] };
        expect(c.bars.length).toBe(2501);
        expect(c.barColors.length).toBe(2501);
        expect(c.barColors[2500]?.color).toBe('#2f8cff');
    });

    it('a bars patch without colours drops the old ones (the run that sent it has none)', () => {
        const { r, model: m } = renderer(model(10, '#111111'));
        r.updateIndicator({ id: 'ind' } as never, { kind: 'value', indicatorId: 'ind', dirty: { from: T0, to: T0 }, series: [{ seriesId: 'c', kind: 'bars', bars: bars(10) }] });
        expect((m().series[0] as unknown as { barColors?: unknown[] }).barColors).toBeUndefined();
    });
});
