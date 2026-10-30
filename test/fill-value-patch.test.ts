// A re-run's value patch carries the fills (found 2026-10-30 in the vela-sandbox OB Depth V2 indicator): a fill's
// per-bar `colors` are indexed like its series' points, and the patch used to replace the points but keep the FIRST
// run's fills. When older bars loaded (500 -> 2500 points) the 500 old colours sat on the oldest bars, which had no
// values, and the fill vanished.
import { describe, it, expect } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import type { IndicatorModel } from '../src/core/model/indicator';
import type { ValuePatch } from '../src/core/model/patch';

const T0 = 1_700_000_000_000;
const STEP = 60_000;
const pts = (n: number, v: number) => Array.from({ length: n }, (_, i) => ({ time: T0 + i * STEP, value: v }));

function model(n: number): IndicatorModel {
    const line = (id: string, v: number) => ({ id, title: id, paneId: 'p', kind: 'line' as const, points: pts(n, v), style: { color: '#fff', width: 1, lineStyle: 'solid' as const } });
    return {
        id: 'ind',
        title: 'ind',
        overlay: false,
        paneHint: 'new',
        paneId: 'p',
        series: [line('a', 2), line('b', 1)],
        fills: [{ id: 'f', paneId: 'p', fromSeriesId: 'a', toSeriesId: 'b', colors: Array.from({ length: n }, () => '#0f0') }],
        backgrounds: [],
        priceLines: [],
        inputs: [],
        inputValues: {},
    } as IndicatorModel;
}

describe('value patch', () => {
    it('replaces the fills along with the series points', () => {
        const r = new NativeRenderer();
        const anyR = r as any; // eslint-disable-line @typescript-eslint/no-explicit-any -- the scene is renderer-private
        if (!anyR.scheduler) anyR.scheduler = { invalidate: () => {} };
        anyR.scene.indicators.set('ind', model(500));
        const next = model(2500);
        const patch: ValuePatch = {
            kind: 'value',
            indicatorId: 'ind',
            dirty: { from: T0, to: T0 + 2499 * STEP },
            series: next.series.map((s) => ({ seriesId: s.id, kind: 'points' as const, points: (s as unknown as { points: never }).points })),
            fills: next.fills,
        };
        r.updateIndicator({ id: 'ind' } as never, patch);
        const m = anyR.scene.indicators.get('ind') as IndicatorModel;
        expect(m.series[0] && 'points' in m.series[0] ? m.series[0].points.length : 0).toBe(2500);
        expect(m.fills[0]?.colors?.length).toBe(2500);
    });

    it('a patch without fills leaves them as they are', () => {
        const r = new NativeRenderer();
        const anyR = r as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!anyR.scheduler) anyR.scheduler = { invalidate: () => {} };
        anyR.scene.indicators.set('ind', model(10));
        r.updateIndicator({ id: 'ind' } as never, { kind: 'value', indicatorId: 'ind', dirty: { from: T0, to: T0 }, series: [] });
        expect((anyR.scene.indicators.get('ind') as IndicatorModel).fills[0]?.colors?.length).toBe(10);
    });
});
