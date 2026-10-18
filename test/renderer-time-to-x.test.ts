// RendererControl.timeToX: host overlays anchor to a bar (the history card sits at the first bar).
import { describe, it, expect } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import { RendererControl } from '../src/core/RendererControl';
import type { IChartRenderer } from '../src/core/ports/IChartRenderer';
import type { OHLCV } from '../src/core/model/ohlcv';

const HOUR = 3_600_000;
const T0 = 1_700_000_000_000;
const bars = (n: number): OHLCV[] => Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 1, high: 2, low: 0.5, close: 1.5 }));

function makeRenderer(): NativeRenderer {
    const r = new NativeRenderer();
    const anyR = r as any;
    anyR.coords.setSize(800, 200, 1);
    if (!anyR.scheduler) anyR.scheduler = { invalidate: () => {} };
    if (!anyR.animator) anyR.animator = { active: false, start: () => {}, stop: () => {} };
    anyR.introPlayed = true;
    return r;
}

describe('RendererControl.timeToX', () => {
    it('is null before any bars are laid out', () => {
        expect(new RendererControl(makeRenderer() as unknown as IChartRenderer).timeToX(T0)).toBeNull();
    });

    it('maps bar times to increasing x, one bar spacing apart, and extrapolates before the first bar', () => {
        const r = makeRenderer();
        r.setBars(bars(50));
        const c = new RendererControl(r as unknown as IChartRenderer);
        const x0 = c.timeToX(T0)!;
        const x1 = c.timeToX(T0 + HOUR)!;
        const before = c.timeToX(T0 - 10 * HOUR)!;
        expect(x1).toBeGreaterThan(x0);
        expect(x0 - before).toBeCloseTo(10 * (x1 - x0), 5);
    });

    it('is null on a renderer without the seam', () => {
        expect(new RendererControl({} as IChartRenderer).timeToX(T0)).toBeNull();
    });
});
