import { describe, it, expect } from 'vitest';
import { dropTargetAt, type DragPaneView } from '../src/renderers/shared/legend-drag-merge';
import { latestValue, latestValues } from '../src/renderers/native/chrome/LeftScaleColumn';
import type { IndicatorModel } from '../src/core/model/indicator';

const panes: DragPaneView[] = [
    { id: 'price', kind: 'price', label: 'Main chart', top: 0, height: 400 },
    { id: 'cvd', kind: 'study', label: 'CVD Candle', top: 403, height: 150 },
    { id: 'rsi', kind: 'study', label: 'RSI', top: 556, height: 150 },
];

describe('legend drag-to-merge: where a drop lands', () => {
    it('inside another pane merges there (onto the price pane: "price")', () => {
        expect(dropTargetAt(panes, 'cvd', true, 620)).toMatchObject({ kind: 'merge', paneId: 'rsi', label: 'RSI', move: { pane: 'rsi' } });
        expect(dropTargetAt(panes, 'cvd', true, 200)).toMatchObject({ kind: 'merge', paneId: 'price', move: 'price' });
    });

    it('inside its own pane does nothing', () => {
        expect(dropTargetAt(panes, 'cvd', true, 480)).toBeNull();
    });

    it('on a pane boundary opens a new pane there, unless that is right beside its own pane', () => {
        // RSI alone in its pane: the line above it (cvd|rsi) changes nothing, so it reads as inside a pane
        expect(dropTargetAt(panes, 'rsi', true, 552)).toMatchObject({ kind: 'merge', paneId: 'cvd' });
        expect(dropTargetAt(panes, 'rsi', true, 557)).toBeNull();
        // CVD is not alone: the same line opens a new pane above RSI
        expect(dropTargetAt(panes, 'cvd', false, 557)).toMatchObject({ kind: 'newPane', move: { newPane: { before: 'rsi' } } });
        // an indicator from the price pane can go between price and CVD
        expect(dropTargetAt(panes, 'price', false, 405)).toMatchObject({ kind: 'newPane', y: 403, move: { newPane: { before: 'cvd' } } });
        // the bottom edge: a new pane below everything
        expect(dropTargetAt(panes, 'cvd', true, 702)).toMatchObject({ kind: 'newPane', move: { newPane: { after: 'rsi' } } });
        expect(dropTargetAt(panes, 'rsi', true, 702)).toBeNull();
    });

    it('outside every pane: no target', () => {
        expect(dropTargetAt(panes, 'cvd', true, 900)).toBeNull();
        expect(dropTargetAt([], 'cvd', true, 10)).toBeNull();
    });
});

describe('left scale: the latest value tag', () => {
    const model = (series: IndicatorModel['series']): IndicatorModel =>
        ({ id: 'm', title: 'm', series, fills: [], backgrounds: [], priceLines: [], inputs: [], inputValues: {} }) as unknown as IndicatorModel;

    it('a line: its last finite value, in its colour', () => {
        const m = model([{ id: 's', title: 's', paneId: 'p', kind: 'line', points: [{ time: 1, value: 3 }, { time: 2, value: 5 }, { time: 3, value: null }], style: { color: '#123456', width: 1, lineStyle: 'solid' } }]);
        expect(latestValue(m)).toEqual({ value: 5, color: '#123456' });
    });

    it('candles: the last close, coloured by the bar', () => {
        const m = model([{ id: 's', title: 's', paneId: 'p', kind: 'candle', bars: [{ time: 1, open: 2, high: 3, low: 1, close: 1, volume: 0 }], style: { up: '#0f0', down: '#f00' } }]);
        expect(latestValue(m)).toEqual({ value: 1, color: '#f00' });
    });

    it('lines that ask for a tag get one each (CVD by Exchange), else the latest value', () => {
        const line = (color: string, v: number, axisTag?: boolean) => ({ id: color, title: color, paneId: 'p', kind: 'line' as const, points: [{ time: 1, value: v }], style: { color, width: 1, lineStyle: 'solid' as const }, ...(axisTag ? { axisTag } : {}) });
        expect(latestValues(model([line('#111111', 1, true), line('#222222', 2, true), line('#333333', 3)]))).toEqual([{ value: 1, color: '#111111' }, { value: 2, color: '#222222' }]);
        expect(latestValues(model([line('#333333', 3)]))).toEqual([{ value: 3, color: '#333333' }]);
    });

    it('nothing to show: null', () => {
        expect(latestValue(model([]))).toBeNull();
    });
});
