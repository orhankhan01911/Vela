import { describe, it, expect, vi } from 'vitest';
import type { OHLCV } from '../src/core/model/ohlcv';
import type { NativeIndicatorContext, NativeIndicatorOutput } from '../src/core/native-indicators/NativeIndicator';
import type { DataControl } from '../src/core/DataControl';
import type { LineLikeSeries } from '../src/core/model/series';
import { vpvrDescriptor, vpvrLayerData } from '../src/core/native-indicators/vpvr/VpvrIndicator';
import { buildVpvrDeveloping, buildVpvrProfile, vpvrGrid, vpvrLevels, VPVR_MAX_ROWS } from '../src/renderers/native/vpvr/profile';
import { formatVpvrVolume, paintVpvr } from '../src/renderers/native/vpvr/paintVpvr';

/**
 * TradingView's Visible Range Volume Profile, setting for setting (VbPVisible@tv-volumebyprice, read from
 * TradingView Desktop 2026-10-30): its dialog rows and factory defaults, Ticks Per Row, Up/Down / Total / Delta,
 * placement, value-area colours, row values, and the POC / VAH / VAL / developing lines.
 */

function bar(time: number, low: number, high: number, volume: number, up = true): OHLCV {
    return { time, open: up ? low : high, close: up ? high : low, high, low, volume };
}

describe('VRVP settings dialog = TradingView', () => {
    const schema = vpvrDescriptor.inputsSchema();
    const titlesOn = (tab: string | undefined): string[] => schema.filter((s) => s.tab === tab && s.title !== '').map((s) => s.title);

    it('Inputs tab: Rows Layout, Row Size, Volume, Value Area Volume, with TradingView defaults and choices', () => {
        expect(titlesOn(undefined)).toEqual(['Rows Layout', 'Row Size', 'Volume', 'Value Area Volume']);
        const by = Object.fromEntries(schema.map((s) => [s.key, s]));
        expect(by.rowsLayout!.options).toEqual(['Number Of Rows', 'Ticks Per Row']);
        expect(by.rowsLayout!.defval).toBe('Number Of Rows');
        expect([by.rows!.defval, by.rows!.min, by.rows!.max]).toEqual([24, 1, 1_000_000]);
        expect(by.volume!.options).toEqual(['Up/Down', 'Total', 'Delta']);
        expect(by.valueAreaPct!.defval).toBe(70);
    });

    it('Style tab rows in TradingView order, each line row = switch + colour + width on one line', () => {
        expect(titlesOn('Style')).toEqual([
            'Volume profile', 'Values', 'Width (% of the box)', 'Placement',
            'Up Volume', 'Down Volume', 'Value Area Up', 'Value Area Down',
            'VAH', 'VAL', 'POC', 'Developing POC', 'Developing VA',
            'Labels on price scale', 'Values in status line',
        ]);
        for (const show of ['showVah', 'showVal', 'showPoc', 'showDevPoc', 'showDevVa']) {
            expect(schema.filter((s) => s.inline === show).map((s) => s.type)).toEqual(['bool', 'color', 'int']);
        }
        const d = vpvrDescriptor.defaultInputs();
        expect([d.showPoc, d.showVah, d.showVal, d.showDevPoc, d.showDevVa]).toEqual([true, false, false, false, false]);
        expect([d.pocColor, d.pocWidth, d.vahColor, d.devPocWidth]).toEqual(['#f44336', 2, '#2962ff', 1]);
        expect([d.widthPct, d.placement, d.showValues, d.labelsOnScale, d.valuesInStatusLine]).toEqual([30, 'Right', false, true, true]);
    });

    it('layer payload maps the choices (and Ticks Per Row needs the tick)', () => {
        const d = vpvrDescriptor.defaultInputs();
        expect(vpvrLayerData({ ...d, volume: 'Delta', placement: 'Left' })).toMatchObject({ volumeMode: 'delta', placement: 'left' });
        expect(vpvrLayerData({ ...d, rowsLayout: 'Ticks Per Row', rows: 5 }, 0.5).rowSize).toBe(2.5);
        expect(vpvrLayerData({ ...d, rowsLayout: 'Ticks Per Row', rows: 5 }).rowSize).toBeUndefined();
        expect(vpvrLayerData({ ...d, rowsLayout: 'Number Of Rows' }, 0.5).rowSize).toBeUndefined();
    });
});

describe('VRVP profile math', () => {
    it('Ticks Per Row: rows sit on multiples of the row size', () => {
        const g = vpvrGrid(100.3, 104.9, 24, 0.5);
        expect(g.rowH).toBe(0.5);
        expect(g.min).toBe(100);
        expect(g.n).toBe(10); // 100 .. 105
        const p = buildVpvrProfile([bar(0, 100.3, 104.9, 1000)], 0, 0, 24, 0.7, 0.5)!;
        expect(p.rows).toHaveLength(10);
        expect(p.rows.reduce((s, r) => s + r.up + r.down, 0)).toBeCloseTo(1000, 6);
    });

    it('a tiny tick over a wide range widens the rows instead of making millions of them', () => {
        const g = vpvrGrid(0, 100_000, 24, 0.01);
        expect(g.n).toBeLessThanOrEqual(VPVR_MAX_ROWS);
        expect(g.min + g.n * g.rowH).toBeGreaterThan(100_000);
    });

    it('levels: POC at its row middle, VAH at the top of the value area, VAL at its bottom', () => {
        const p = buildVpvrProfile([bar(0, 100, 110, 1000), bar(1, 104, 106, 3000)], 0, 1, 10, 0.7)!;
        const lv = vpvrLevels(p);
        expect(lv.poc).toBeCloseTo(p.min + (p.poc + 0.5) * p.rowH, 9);
        expect(lv.vah).toBeCloseTo(p.min + (p.vaTo + 1) * p.rowH, 9);
        expect(lv.val).toBeCloseTo(p.min + p.vaFrom * p.rowH, 9);
        expect(lv.val).toBeLessThan(lv.poc);
        expect(lv.vah).toBeGreaterThan(lv.poc);
    });

    it('developing levels end on the full profile levels and start at the first bar', () => {
        const bars = [bar(0, 100, 102, 500), bar(1, 101, 109, 800, false), bar(2, 104, 106, 3000)];
        const p = buildVpvrProfile(bars, 0, 2, 12, 0.7)!;
        const dev = buildVpvrDeveloping(bars, 0, 2, p, 0.7);
        expect(dev).toHaveLength(3);
        expect(dev[2]).toEqual(vpvrLevels(p));
        expect(dev[0]!.poc).toBeLessThan(102); // only the first bar so far
        expect(dev[2]!.poc).toBeGreaterThan(104); // the heavy third bar moved it
    });
});

describe('VRVP painter', () => {
    interface Op { kind: 'fill' | 'text'; style: string; x: number; w?: number; text?: string }
    function rec(): { ctx: CanvasRenderingContext2D; ops: Op[] } {
        const ops: Op[] = [];
        const st = { fillStyle: '', strokeStyle: '' };
        const noop = (): void => undefined;
        const ctx = {
            set fillStyle(v: string) { st.fillStyle = v; },
            get fillStyle() { return st.fillStyle; },
            strokeStyle: '', globalAlpha: 1, lineWidth: 1, font: '', textAlign: 'start', textBaseline: 'alphabetic',
            fillRect: (x: number, _y: number, w: number) => ops.push({ kind: 'fill', style: st.fillStyle, x, w }),
            strokeRect: noop,
            fillText: (text: string, x: number) => ops.push({ kind: 'text', style: st.fillStyle, x, text }),
        } as unknown as CanvasRenderingContext2D;
        return { ctx, ops };
    }
    // two rows: the low one mostly selling, the high one all buying (the POC)
    const profile = buildVpvrProfile([bar(0, 100, 101, 100, false), bar(1, 100, 101, 20), bar(2, 101, 102, 300)], 0, 2, 2, 0.5)!;
    const geom = { rightX: 300, leftX: 0, maxW: 100, yOf: (p: number) => 1000 - p * 5 };
    const base = { upColor: 'U', downColor: 'D', vaUpColor: 'VU', vaDownColor: 'VD', showPoc: false, pocColor: 'T' };

    it('Total: one bar per row in the up colour (value-area colour inside the value area)', () => {
        const { ctx, ops } = rec();
        paintVpvr(ctx, profile, geom, { ...base, volumeMode: 'total' });
        expect(ops.map((o) => o.style).sort()).toEqual(['U', 'VU']);
    });

    it('Delta: |up - down| in the winning side colour', () => {
        const { ctx, ops } = rec();
        paintVpvr(ctx, profile, geom, { ...base, volumeMode: 'delta' });
        expect(ops.map((o) => o.style).sort()).toEqual(['D', 'VU']);
        const sell = ops.find((o) => o.style === 'D')!;
        expect(sell.w).toBeCloseTo((80 / 300) * 100, 6);
    });

    it('Placement Left: rows grow right from the left edge', () => {
        const { ctx, ops } = rec();
        paintVpvr(ctx, profile, geom, { ...base, placement: 'left' });
        const fills = ops.filter((o) => o.kind === 'fill');
        expect(Math.min(...fills.map((o) => o.x))).toBe(0);
        expect(Math.max(...fills.map((o) => o.x + o.w!))).toBeLessThanOrEqual(100 + 1e-9);
    });

    it('Values writes each row volume; Volume profile off draws no rows', () => {
        const a = rec();
        paintVpvr(a.ctx, profile, { ...geom, yOf: (p: number) => 3000 - p * 20 }, { ...base, showValues: true, valuesColor: 'V' }); // 20 px rows
        expect(a.ops.filter((o) => o.kind === 'text').map((o) => o.text).sort()).toEqual(['120', '300']);
        const b = rec();
        paintVpvr(b.ctx, profile, geom, { ...base, showProfile: false, showValues: true });
        expect(b.ops).toHaveLength(0);
    });

    it('formats volumes compactly', () => {
        expect([formatVpvrVolume(950), formatVpvrVolume(1250), formatVpvrVolume(3_400_000), formatVpvrVolume(-12_500)]).toEqual(['950', '1.25K', '3.4M', '-12.5K']);
    });
});

describe('VRVP lines (the indicator)', () => {
    const bars = [bar(0, 100, 110, 1000), bar(60_000, 104, 106, 3000), bar(120_000, 101, 109, 800, false)];
    function run(inputs: Record<string, unknown> = {}, range = { from: 0, to: 120_000 }): NativeIndicatorOutput {
        const outs: NativeIndicatorOutput[] = [];
        const ctx = {
            id: 'native-1', symbol: 'X', timeframe: '1', live: false,
            bars: () => bars,
            data: { symbolInfo: () => Promise.resolve(undefined) } as unknown as DataControl,
            emit: (o: NativeIndicatorOutput) => outs.push(o),
            pushData: vi.fn(),
            setStatus: vi.fn(),
        } as NativeIndicatorContext;
        const ind = vpvrDescriptor.create();
        ind.start(ctx, { ...vpvrDescriptor.defaultInputs(), ...inputs } as never);
        ind.onViewport(range);
        ind.stop();
        return outs[outs.length - 1]!;
    }

    it('defaults: a full-width red POC line of width 2 with a price-scale label and a status-line value', () => {
        const out = run();
        expect(out.priceLines).toHaveLength(1);
        expect(out.priceLines![0]).toMatchObject({ color: '#f44336', width: 2, lineStyle: 'solid' });
        const poc = out.series![0] as LineLikeSeries;
        expect(poc.title).toBe('POC');
        expect(poc.axisTag).toBe(true);
        expect(poc.display).toEqual({ pane: false, priceScale: true, legend: true, dataWindow: true });
        expect(poc.points.every((p) => p.value === out.priceLines![0]!.price)).toBe(true);
    });

    it('VAH / VAL and the developing lines when switched on; labels and status values off on request', () => {
        const out = run({ showVah: true, showVal: true, showDevPoc: true, showDevVa: true, labelsOnScale: false, valuesInStatusLine: false, vahWidth: '3' });
        expect(out.priceLines!.map((l) => l.id.split(':')[2])).toEqual(['poc#0', 'vah#1', 'val#2']);
        expect(out.priceLines![1]!.width).toBe(3);
        const titles = out.series!.map((s) => s.title);
        expect(titles).toEqual(['POC', 'VAH', 'VAL', 'Developing POC', 'Developing VA High', 'Developing VA Low']);
        const dev = out.series![3] as LineLikeSeries;
        expect(dev.kind).toBe('step');
        expect(dev.points).toHaveLength(3); // one per chart bar (index-aligned)
        for (const s of out.series!) {
            expect(s.axisTag).toBe(false);
            expect(s.display!.legend).toBe(false);
        }
    });

    it('lines cover only the visible window (null on the bars outside it)', () => {
        const out = run({ showDevPoc: true }, { from: 60_000, to: 120_000 });
        for (const s of out.series as LineLikeSeries[]) expect(s.points.map((p) => p.value === null)).toEqual([true, false, false]);
    });

    it('POC off: no line at all', () => {
        const out = run({ showPoc: false });
        expect(out.priceLines).toHaveLength(0);
        expect(out.series).toHaveLength(0);
    });
});
