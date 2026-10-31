// @vitest-environment jsdom
// The forecasting tools, TradingView parity (audit 2026-10-31, read from TradingView's modules 861360 forecast,
// 867140 projection, 282181 bars pattern, 28531 ghost feed and their live dialogs and floating toolbars).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, Forecast, Projection, BarsPattern, GhostFeed, tvTimeSpan, TV_BARS_PATTERN_MODES, toolSettings, rememberToolSettings, clearToolSettings, type Drawing, type Projector } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';
import { DrawingSettingsDialog } from '../src/renderers/native/drawings/DrawingSettingsDialog';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));

/** Bars one minute apart from t = 0, x = time / 1000 px (one bar = 60 px). */
const BARS = Array.from({ length: 20 }, (_, i) => ({ time: i * 60_000, open: 100 + i, high: 105 + i, low: 98 + i, close: 102 + i }));
const proj: Projector = {
    xOf: (t) => t / 1000,
    yOf: (price, paneId) => (paneId === 'price' ? 1000 - price : null),
    pxToPoint: (x, y) => ({ time: x * 1000, price: 1000 - y }),
    paneIdAtY: () => 'price',
    paneRect: () => ({ top: 0, height: 1000 }),
    barsBetween: (a, b) => (b - a) / 60_000,
    barsInRange: (from, to) => BARS.filter((b) => b.time >= from && b.time <= to),
    width: 2000,
    height: 1000,
};

function setup(drawing: Drawing) {
    let live = drawing;
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            live = deserializeDrawing(live.serialize())!;
        },
        restore: () => {},
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    const host = document.createElement('div');
    document.body.append(host);
    new DrawingSettingsPopup(host, DARK_THEME).open([drawing], null, actions);
    const tips = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-dpop [data-tip]')].map((e) => e.dataset.tip!);
    const gear = (): HTMLButtonElement => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!;
    const tabs = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!);
    const tab = (name: string): HTMLElement => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].find((e) => e.textContent === name)!;
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    const title = (): string => host.querySelector<HTMLElement>('.vela-drawing-dialog')!.textContent!;
    return { host, live: () => live, tips, gear, tabs, tab, body, title };
}

const make = <T extends Drawing>(type: string, anchors: Array<{ time: number; price: number }>, props?: Record<string, unknown>): T =>
    createDrawing(type as never, { id: 'd', paneId: 'price', anchors, ...(props ? { props } : {}) })! as T;

describe('Forecast (TradingView)', () => {
    const fc = (): Forecast => make<Forecast>('forecast', [{ time: 60_000, price: 104 }, { time: 300_000, price: 110 }]);

    it('blue 2 px line, blue plates with white text, its green and red badges, 10 % see-through', () => {
        const d = fc();
        expect(d.tv).toBe(true);
        expect([d.style.lineColor.toUpperCase(), d.style.lineWidth]).toEqual(['#2962FF', 2]);
        expect([d.sourceBackColor, d.targetStrokeColor, d.sourceTextColor, d.successBackground, d.failureBackground, d.transparency]).toEqual(['#2962FF', '#2962FF', '#FFFFFF', '#4CAF50', '#F23645', 10]);
    });

    it('a quarter ellipse centred under the source at the target\'s height, from source to target', () => {
        const c = fc().curve(proj);
        expect(c[0]).toEqual([60, 896]);
        const end = c[c.length - 1]!;
        expect([Math.round(end[0]), Math.round(end[1])]).toEqual([300, 890]);
        // a quarter way round it sits off the chord, on the ellipse
        const [x, y] = c[16]!;
        expect(((x - 60) / 240) ** 2 + ((y - 890) / 6) ** 2).toBeCloseTo(1, 6);
    });

    it('status reads the target bar alone: its high reaching the target is a success, a closed bar short of it a failure', () => {
        expect(fc().status(proj)).toBe('success'); // bar 5: high 110
        expect(make<Forecast>('forecast', [{ time: 60_000, price: 104 }, { time: 300_000, price: 120 }]).status(proj)).toBe('failure');
        expect(make<Forecast>('forecast', [{ time: 60_000, price: 104 }, { time: 1_140_000, price: 200 }]).status(proj)).toBe('pending'); // the last bar
        expect(make<Forecast>('forecast', [{ time: 60_000, price: 110 }, { time: 300_000, price: 104 }]).status(proj)).toBe('success'); // a fall: low 103
    });

    it('the target text: the change and its percent, "in" the time span', () => {
        expect(fc().tvChange((p) => p.toFixed(2))).toEqual({ change: '6.00 (5.77%)', span: 'in 4m' });
        expect(tvTimeSpan(93_784_000)).toBe('1d 2h 3m 4s');
    });

    it('survives a save; one saved before keeps its look', () => {
        const d = fc();
        d.applySettings({ targetBackColor: '#123456' });
        const back = deserializeDrawing(d.serialize())! as Forecast;
        expect([back.tv, back.targetBackColor, back.transparency]).toEqual([true, '#123456', 10]);
        const old = deserializeDrawing({ ...d.serialize(), props: undefined })! as Forecast;
        expect(old.tv).toBeUndefined();
    });

    it('bar: line colour and width; dialog "Position forecast": Style, Coordinates, Visibility with its 11 rows', async () => {
        const s = setup(fc());
        const t = s.tips();
        expect(t.indexOf('Line color')).toBeGreaterThanOrEqual(0);
        expect(t.indexOf('Line color')).toBeLessThan(t.indexOf('Line width'));
        expect(t).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Coordinates', 'Visibility']);
        expect(s.title()).toContain('Position forecast');
        s.tab('Style').click();
        const roles = [...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role);
        expect(roles).toEqual(['line', 'sourceTextColor', 'sourceBackColor', 'sourceStrokeColor', 'targetTextColor', 'targetBackColor', 'targetStrokeColor', 'successTextColor', 'successBackground', 'failureTextColor', 'failureBackground']);
    });
});

describe('Projection (TradingView "Sector")', () => {
    const pr = (): Projection => make<Projection>('projection', [{ time: 100_000, price: 500 }, { time: 200_000, price: 500 }, { time: 100_000, price: 300 }]);

    it('blue to purple background 80 % see-through, grey 2 px border', () => {
        const d = pr();
        expect([d.tv, d.color1, d.color2, d.transparency, d.fillBackground]).toEqual([true, '#2962FF', '#9C27B0', 80, true]);
        expect([d.style.lineColor, d.style.lineWidth]).toEqual(['#9C9C9C', 2]);
    });

    it('the third handle sits on the circle along the third point; the sweep goes the short way', () => {
        const d = pr();
        const h = d.handlePoints(proj);
        expect(h[2]![0]).toBeCloseTo(100, 6);
        expect(h[2]![1]).toBeCloseTo(600, 6); // radius 100 down from the centre (500 px)
        expect(d.sector(proj)!.sweep).toBeCloseTo(Math.PI / 2, 6);
    });

    it('bar: two background colours and width; dialog "Sector": Style (Background, Border), Visibility', async () => {
        const s = setup(pr());
        expect(s.tips().filter((t) => ['Fill', 'Fill 2', 'Line width'].includes(t))).toEqual(['Fill', 'Fill 2', 'Line width']);
        expect(s.tips()).not.toContain('Line color');
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Visibility']);
        expect(s.title()).toContain('Sector');
        const roles = [...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role);
        expect(roles).toEqual(['background', 'border']);
    });

    it('survives a save', () => {
        const d = pr();
        d.applySettings({ color2: '#00ff00', transparency: 50 });
        const back = deserializeDrawing(d.serialize())! as Projection;
        expect([back.tv, back.color2, back.transparency]).toEqual([true, '#00ff00', 50]);
    });
});

describe('Bars pattern (TradingView)', () => {
    /** Placed over bars 2..6. */
    const bp = (): BarsPattern => {
        const d = make<BarsPattern>('barspattern', [{ time: 120_000, price: 0 }, { time: 360_000, price: 0 }]);
        d.onPlaced(proj);
        return d;
    };

    it('its blue, HL bars; placed 5 % of the pane above the first bar\'s high, the second point on the last low', () => {
        const d = bp();
        expect([d.tv, d.style.lineColor.toUpperCase(), d.mode, d.bars.length]).toEqual([true, '#2962FF', 'hl', 5]);
        expect(d.anchors[0]).toEqual({ time: 120_000, price: 157 }); // high 107 + 50 px
        expect(d.anchors[1]).toEqual({ time: 360_000, price: 157 + (104 - 107) }); // last low 104
        const b = d.patternBars(proj);
        expect(b.map((x) => x.x)).toEqual([121, 181, 241, 301, 361]);
        expect(b[0]!.high).toBe(1000 - 157); // its first high on the first point
    });

    it('dragging the second point stretches the copy in time and price', () => {
        const d = bp();
        d.anchors = [d.anchors[0]!, { time: 600_000, price: 157 - 6 }]; // twice as long, twice as tall
        d.constrainHandleDrag(1);
        const b = d.patternBars(proj);
        expect(b.map((x) => x.x)).toEqual([121, 241, 361, 481, 601]);
        expect(b[4]!.low - b[0]!.high).toBeCloseTo(6, 6);
        expect(b[1]!.high - b[0]!.high).toBeCloseTo(-2, 6); // each high one higher, doubled
    });

    it('the second point stays at least a bar after the first', () => {
        const d = bp();
        d.anchors = [d.anchors[0]!, { time: 60_000, price: 150 }];
        d.constrainHandleDrag(1);
        expect(d.anchors[1]!.time).toBe(180_000);
    });

    it('Mirrored turns it upside down, Flipped reverses it in time; each swaps the points\' prices so it stays put', () => {
        const d = bp();
        const [p0, p1] = [d.anchors[0]!.price, d.anchors[1]!.price];
        d.applySettings({ mirrored: true });
        expect([d.anchors[0]!.price, d.anchors[1]!.price]).toEqual([p1, p0]);
        const m = d.tvPattern()!;
        expect(m.bars[0]!.h).toBeGreaterThan(m.bars[4]!.h); // a rise is now a fall
        d.applySettings({ mirrored: false, flipped: true });
        expect([d.anchors[0]!.price, d.anchors[1]!.price]).toEqual([p1, p0]); // two switches at once: no net swap
        expect(d.tvPattern()!.bars[0]!.dt).toBe(240_000);
    });

    it('its 7 modes; dialog: Style (Color, Mode, Mirrored, Flipped), Visibility; bar: colour only', async () => {
        expect([...TV_BARS_PATTERN_MODES]).toEqual(['hl', 'oc', 'close', 'open', 'high', 'low', 'hl2']);
        const s = setup(bp());
        expect(s.tips()).toContain('Fill');
        expect(s.tips()).not.toContain('Line color');
        expect(s.tips()).not.toContain('Line width');
        expect(DrawingSettingsDialog.tabsFor(bp())).toEqual(['style', 'visibility']);
        s.gear().click();
        await settled();
        expect(s.title()).toContain('Bars pattern');
        const text = s.body('style').textContent!;
        for (const w of ['Color', 'Mode', 'HL bars', 'Mirrored', 'Flipped']) expect(text).toContain(w);
    });

    it('a save keeps the copy, its base and the TradingView look; one saved before keeps its look', () => {
        const d = bp();
        d.applySettings({ mode: 'hl2' });
        const back = deserializeDrawing(d.serialize())! as BarsPattern;
        expect([back.tv, back.mode, back.base, back.bars.length]).toEqual([true, 'hl2', 102, 5]);
        const old = deserializeDrawing({ ...d.serialize(), props: { bars: d.bars, mode: 'candles', mirrored: false, flipped: false } })! as BarsPattern;
        expect([old.tv, old.mode]).toEqual([undefined, 'candles']);
    });
});

describe('Ghost feed (TradingView)', () => {
    const gf = (): GhostFeed => {
        const d = make<GhostFeed>('ghostfeed', [{ time: 0, price: 100 }, { time: 300_000, price: 110 }, { time: 480_000, price: 105 }]);
        d.onPlaced(proj);
        return d;
    };

    it('Avg HL is the chart\'s average high-low in ticks; variance 50; its colours, 50 % see-through', () => {
        const d = gf();
        expect([d.tv, d.tick, d.averageHL, d.variance, d.transparency]).toEqual([true, 1, 7, 50, 50]);
        expect([d.upColor, d.downColor, d.borderUpColor, d.borderDownColor, d.wickColor]).toEqual(['#ACE5DC', '#FAA1A4', '#089981', '#F23645', '#808080']);
    });

    it('one bar per chart bar along each leg (the first leg one more), each around the line within its size', () => {
        const d = gf();
        const c = d.ghostCandles(proj);
        expect(c).toHaveLength(5 + 2);
        expect(c.map((x) => x.x)).toEqual([0, 60, 120, 180, 240, 300, 360]);
        const e = 7; // average 7, variance 50 %: the middle within 3.5 of the line, the height 5.25..8.75
        for (const k of c) {
            expect(k.low - k.high).toBeGreaterThanOrEqual(0.75 * e - 1e-9);
            expect(k.low - k.high).toBeLessThanOrEqual(1.25 * e + 1e-9);
        }
        // kept: the same bars next time
        expect(d.ghostCandles(proj)).toEqual(c);
    });

    it('the bars are made when placed (so the save holds them); a new Avg HL or Variance makes them again', () => {
        const d = gf();
        expect(d.segments!.map((s) => s.length)).toEqual([5, 2]);
        expect((d.serialize().props!.segments as unknown[][]).map((s) => s.length)).toEqual([5, 2]);
        const before = JSON.stringify(d.segments);
        d.applySettings({ variance: 10 });
        expect(d.segments!.map((s) => s.length)).toEqual([5, 2]);
        expect(JSON.stringify(d.segments)).not.toBe(before);
    });

    it('dialog "Ghost feed": Inputs, Style, Coordinates, Visibility; bar: no colours', async () => {
        const s = setup(gf());
        expect(s.tips().filter((t) => ['Line color', 'Line width', 'Line style', 'Fill'].includes(t))).toEqual([]);
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Inputs', 'Style', 'Coordinates', 'Visibility']);
        expect(s.title()).toContain('Ghost feed');
        expect([...s.body('inputs').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role)).toEqual(['avg-hl', 'variance']);
        expect(s.body('inputs').textContent).toContain('Avg HL in minticks');
        expect([...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role)).toEqual(['candles', 'borders', 'wick', 'transparency']);
    });

    it('a save keeps the made bars and inputs', () => {
        const d = gf();
        const c = d.ghostCandles(proj);
        const back = deserializeDrawing(d.serialize())! as GhostFeed;
        expect([back.tv, back.averageHL, back.tick]).toEqual([true, 7, 1]);
        expect(back.ghostCandles(proj)).toEqual(c);
    });
});

describe('last-used settings (tool memory)', () => {
    it('remember the bars pattern\'s look and the ghost feed\'s colours, never their bars', () => {
        clearToolSettings();
        const bp = make<BarsPattern>('barspattern', [{ time: 120_000, price: 0 }, { time: 360_000, price: 0 }]);
        bp.onPlaced(proj);
        bp.applySettings({ mode: 'oc' });
        rememberToolSettings(bp.serialize());
        expect(toolSettings('barspattern')!.props).toEqual({ mode: 'oc', mirrored: false, flipped: false, tv: true });
        const gf = make<GhostFeed>('ghostfeed', [{ time: 0, price: 100 }, { time: 300_000, price: 110 }]);
        gf.onPlaced(proj);
        gf.ghostCandles(proj);
        gf.applySettings({ variance: 30 });
        rememberToolSettings(gf.serialize());
        const kept = toolSettings('ghostfeed')!.props!;
        expect(kept.variance).toBe(30);
        expect(['segments', 'tick', 'averageHL'].some((k) => k in kept)).toBe(false);
        clearToolSettings();
    });

    it('a mode remembered from our old bars pattern starts a new one as HL bars', () => {
        const d = make<BarsPattern>('barspattern', [{ time: 120_000, price: 0 }, { time: 360_000, price: 0 }]);
        d.applyProps({ mode: 'candles', mirrored: false, flipped: false });
        expect([d.tv, d.mode]).toEqual([true, 'hl']);
    });
});
