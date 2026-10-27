import type { OHLCV } from '../../model/ohlcv';
import type { InputValue } from '../../model/inputs';
import type { SeriesDisplay } from '../../model/series';
import { getNativeIndicator, registerNativeIndicator } from '../NativeIndicator';
import { classicDescriptor } from './define';
import type { ClassicIndicatorSpec } from './define';
import { averageSpecs } from './averages';
import { bandSpecs } from './bands';
import { oscillatorSpecs } from './oscillators';
import { trendSpecs } from './trend';
import { volatilitySpecs } from './volatility';
import { volumeSpecs } from './volume';
import { overlaySpecs } from './overlays';

/**
 * The classic indicator catalog — the standard technical-analysis studies every
 * charting host expects (moving averages, oscillators, bands, volume studies),
 * each a pure compute over the chart's own bars riding the native-indicator
 * pipeline (picker, legend, panes, settings, persistence).
 */
export const classicSpecs: ClassicIndicatorSpec[] = [
    ...averageSpecs,
    ...bandSpecs,
    ...oscillatorSpecs,
    ...trendSpecs,
    ...volatilitySpecs,
    ...volumeSpecs,
    ...overlaySpecs,
];

/** Register the classic indicator catalog (idempotent). Called by the composition root. */
export function registerClassicIndicators(): void {
    // Every chart construction calls this: skip a type already registered, so a host's wrapped descriptor (an app
    // that guards or feeds a built-in, e.g. Pivot Points' period candles) survives the next chart.
    for (const spec of classicSpecs) if (!getNativeIndicator(spec.type)) registerNativeIndicator(classicDescriptor(spec));
}

/** One plot of a classic indicator, bar-aligned to the bars it was computed on (NaN where it has no value). */
export interface ClassicPlotValues {
    key: string;
    title: string;
    values: readonly number[];
}

/**
 * A classic indicator computed over `bars` with `inputs` (an indicator's own settings, e.g. from its handle's
 * `inputValues()`): the plots a person sees (legend or pane) and the fixed levels (RSI 70 / 30). Null for a type
 * outside the catalog. Pure: host code uses it to watch an indicator off-chart (alerts on EMA 20, RSI 14 ...).
 */
export function classicPlots(
    type: string,
    bars: readonly OHLCV[],
    inputs: Record<string, InputValue>,
): {
    plots: ClassicPlotValues[];
    levels: Array<{ key: string; title: string; price: number }>;
    /** Shapes it marks on bars (Williams Fractal's up / down fractals), by bar time. */
    markers: Array<{ time: number; position: 'aboveBar' | 'belowBar' | 'inBar'; shape: string }>;
} | null {
    const spec = classicSpecs.find((s) => s.type === type);
    if (!spec) return null;
    const out = spec.compute(bars, inputs);
    // A plot shown nowhere only anchors a band (the 0/100 rails): not something to watch.
    const seen = (d: SeriesDisplay | undefined): boolean => !d || d.pane !== false || d.legend !== false;
    return {
        plots: out.plots.filter((p) => seen(p.display)).map((p) => ({ key: p.key, title: p.title, values: p.values })),
        levels: (out.levels ?? []).map((l) => ({ key: l.key, title: l.title ?? '', price: l.price })),
        markers: (out.markers ?? []).map((m) => ({ time: m.time, position: m.position, shape: m.shape })),
    };
}

/** Every classic indicator: its type, titles, where it draws and its default settings (alert coverage tests list
 *  the whole catalog from this, so a new indicator is checked without anyone adding it by hand). */
export function classicCatalog(): Array<{ type: string; title: string; shortTitle: string; overlay: boolean; defaults: Record<string, InputValue> }> {
    return classicSpecs.map((s) => ({
        type: s.type,
        title: s.title,
        shortTitle: s.shortTitle ?? s.title,
        overlay: s.overlay,
        defaults: Object.fromEntries(s.inputs.map((i) => [i.key, i.defval])) as Record<string, InputValue>,
    }));
}

export { classicDescriptor } from './define';
export type { ClassicIndicatorSpec, ClassicOutput, ClassicPlot, ClassicBand, ClassicLevel } from './define';
