import { describe, expect, it } from 'vitest';
import { applyPlotStyle, plotStyleSchema, visibleOnInterval } from '../src/core/engine/plotStyle';
import type { IndicatorModel } from '../src/core/model/indicator';

function model(): IndicatorModel {
    return {
        id: 'x',
        title: 'T',
        overlay: true,
        paneHint: 'price',
        series: [
            { id: 's1', title: 'SMA', paneId: 'price', kind: 'line', points: [{ time: 1, value: 1 }, { time: 2, value: 2 }], style: { color: '#111111', width: 1, lineStyle: 'solid' } },
            { id: 's2', title: 'Signal', paneId: 'price', kind: 'line', points: [{ time: 1, value: 1, color: '#00ff00' }, { time: 2, value: 2, color: '#ff0000' }], style: { color: '#222222', width: 2, lineStyle: 'solid' } },
            { id: 's3', title: 'Anchor', paneId: 'price', kind: 'line', points: [], style: { color: '#333333', width: 1, lineStyle: 'solid' }, display: { pane: false } },
            { id: 's4', title: 'SMA', paneId: 'price', kind: 'histogram', points: [{ time: 1, value: 1, color: '#444444' }], style: { color: '#444444', width: 1, lineStyle: 'solid' } },
        ],
        fills: [{ id: 'f1', paneId: 'price', fromSeriesId: 's1', toSeriesId: 's2', color: 'rgba(0,0,255,0.2)' }],
        backgrounds: [{ id: 'b1', paneId: 'price', from: 1, to: 2, color: '#abcdef' }],
        priceLines: [{ id: 'h1', paneId: 'price', price: 0, color: '#999999', title: 'Zero' }],
        inputs: [],
        inputValues: {},
    };
}

describe('plot style (settings dialog Style tab)', () => {
    it('lists visible plots, levels, fills and background with the script defaults', () => {
        const keys = plotStyleSchema(model()).map((d) => `${d.key}=${String(d.defval)}`);
        expect(keys).toEqual([
            'plot:SMA.visible=true', 'plot:SMA.color=#111111', 'plot:SMA.width=1', 'plot:SMA.lineStyle=solid', 'plot:SMA.kind=line',
            // per-bar colours: no single colour to offer
            'plot:Signal.visible=true', 'plot:Signal.width=2', 'plot:Signal.lineStyle=solid', 'plot:Signal.kind=line',
            // the hidden anchor plot is skipped; a second "SMA" gets a suffix
            'plot:SMA#2.visible=true', 'plot:SMA#2.color=#444444', 'plot:SMA#2.width=1', 'plot:SMA#2.lineStyle=solid', 'plot:SMA#2.kind=histogram',
            'hline:Zero.visible=true', 'hline:Zero.color=#999999', 'hline:Zero.width=1', 'hline:Zero.lineStyle=solid', 'hline:Zero.value=0',
            'fill:1.visible=true', 'fill:1.color=rgba(0,0,255,0.2)',
            'bg.visible=true',
            // TradingView's Output values / Input values sections
            'out.precision=Default', 'out.priceLabels=true', 'out.statusValues=true', 'in.statusInputs=true',
            // TradingView's Visibility tab
            'vis.ticks=true',
            'vis.seconds=true', 'vis.seconds.from=1', 'vis.seconds.to=59',
            'vis.minutes=true', 'vis.minutes.from=1', 'vis.minutes.to=59',
            'vis.hours=true', 'vis.hours.from=1', 'vis.hours.to=24',
            'vis.days=true', 'vis.days.from=1', 'vis.days.to=366',
            'vis.weeks=true', 'vis.weeks.from=1', 'vis.weeks.to=52',
            'vis.months=true', 'vis.months.from=1', 'vis.months.to=12',
            'vis.ranges=true',
        ]);
    });

    it('Visibility tab: hides every output on a timeframe it switches off, and only there', () => {
        const m = model();
        plotStyleSchema(m);
        const H1 = 3_600_000;
        applyPlotStyle(m, { 'vis.hours': false }, H1);
        expect(m.series.every((s) => s.visible === false || s.display?.pane === false)).toBe(true);
        expect(m.priceLines).toHaveLength(0);
        expect(m.fills).toHaveLength(0);
        applyPlotStyle(m, { 'vis.hours': false }, 5 * 60_000); // a 5 minute chart: still shown
        expect(m.priceLines).toHaveLength(1);
        applyPlotStyle(m, { 'vis.minutes.to': 4 }, 5 * 60_000); // minutes 1-4 only
        expect(m.priceLines).toHaveLength(0);
        expect(visibleOnInterval({ 'vis.days.from': 2 }, 86_400_000)).toBe(false);
        expect(visibleOnInterval({}, 86_400_000)).toBe(true);
    });

    it('applies overrides and puts the script look back when they are cleared', () => {
        const m = model();
        plotStyleSchema(m);
        applyPlotStyle(m, { 'plot:SMA.color': '#ff00ff', 'plot:SMA.width': '3', 'plot:Signal.visible': false, 'hline:Zero.visible': false, 'fill:1.color': '#000000', 'bg.visible': false, 'plot:SMA#2.color': '#123456' });
        const [sma, sig, anchor, sma2] = m.series as Array<IndicatorModel['series'][number] & { style: { color: string; width: number }; points: Array<{ color?: string }> }>;
        expect(sma!.style.color).toBe('#ff00ff');
        expect(sma!.style.width).toBe(3);
        expect(sig!.visible).toBe(false);
        expect(sig!.display?.pane).toBe(false);
        expect(anchor!.display).toEqual({ pane: false }); // untouched
        expect(sma2!.points[0]!.color).toBe('#123456');
        expect(m.priceLines).toHaveLength(0);
        expect(m.fills[0]!.color).toBe('#000000');
        expect(m.backgrounds).toHaveLength(0);

        applyPlotStyle(m, {});
        expect(sma!.style.color).toBe('#111111');
        expect(sma!.style.width).toBe(1);
        expect(sig!.visible).toBeUndefined();
        expect(sig!.display).toBeUndefined();
        expect(sma2!.points[0]!.color).toBe('#444444');
        expect(m.priceLines).toHaveLength(1);
        expect(m.priceLines[0]!.color).toBe('#999999');
        expect(m.fills[0]!.color).toBe('rgba(0,0,255,0.2)');
        expect(m.backgrounds).toHaveLength(1);
    });

    it('ignores unknown keys and bad widths', () => {
        const m = model();
        applyPlotStyle(m, { 'plot:Nope.color': '#fff', 'plot:SMA.width': 'abc' });
        expect((m.series[0] as { style: { width: number } }).style.width).toBe(1);
    });
});

describe('plots off by default (Pine display.none) are listed unticked, like TradingView', () => {
    it('lists a styleOff plot with its box off, keeps it hidden by default, and draws it once ticked', () => {
        const m = model();
        const off = m.series[2]!;
        (off as { styleOff?: boolean }).styleOff = true;
        off.display = { pane: false, priceScale: false, legend: false, dataWindow: true };
        const schema = plotStyleSchema(m);
        const vis = schema.find((d) => d.key === 'plot:Anchor.visible');
        expect(vis?.defval).toBe(false);
        applyPlotStyle(m, {});
        expect(m.series[2]!.display?.pane).toBe(false);
        expect(m.series[2]!.display?.dataWindow).toBe(true); // its own display kept (alerts / data window)
        applyPlotStyle(m, { 'plot:Anchor.visible': true });
        expect(m.series[2]!.display?.pane).not.toBe(false);
        expect(m.series[2]!.visible).not.toBe(false);
    });
});
