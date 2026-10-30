// @vitest-environment jsdom
// The price range, TradingView parity (audit 2026-10-30, factory defaults read from TradingView): 2 px blue lines, a 15 %
// fill, the plate `1,219.8 (1.48%) 12,198` (white 12 px on #1A1A1A), Extend, Stats parts, Label and Label background;
// the text tab without alignment; two round default-cursor handles. Saved price ranges keep their old look.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, PriceRange, DatePriceRange, DateRange, rangeInfoLines, formatRangeVolume, TV_LINE_COLOR, type Drawing, type Projector } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));

/** A chart stand-in that, like the renderer, rebuilds the drawing after every edit and restores like the controller. */
function chart(initial: Drawing): { actions: SettingsActions; live: () => Drawing } {
    let live = initial;
    const sync = (): void => {
        live = deserializeDrawing(live.serialize())!;
    };
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            sync();
        },
        restore: (doc) => {
            if (doc.style) live.style = { ...doc.style };
            if (doc.text !== undefined) live.text = doc.text ? { ...doc.text } : undefined;
            if (doc.props !== undefined) live.applyProps(doc.props);
            if (doc.anchors) live.anchors = doc.anchors.map((p) => ({ ...p }));
            if ('intervals' in doc) live.intervals = doc.intervals ? { ...doc.intervals } : undefined;
            sync();
        },
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    return { actions, live: () => live };
}

function setup(drawing: Drawing) {
    const host = document.createElement('div');
    document.body.append(host);
    const popup = new DrawingSettingsPopup(host, DARK_THEME);
    const c = chart(drawing);
    popup.open([drawing], null, c.actions);
    const tips = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-dpop [data-tip]')].map((e) => e.dataset.tip!);
    const gear = (): HTMLButtonElement => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!;
    const tabs = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!);
    const tab = (name: string): HTMLElement => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].find((e) => e.textContent === name)!;
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    const button = (label: string): HTMLButtonElement => [...host.querySelectorAll<HTMLButtonElement>('.vela-drawing-dialog button')].find((b) => b.textContent === label)!;
    return { host, popup, live: c.live, tips, gear, tabs, tab, body, button };
}




const flat: Projector = { xOf: (t) => t, yOf: (p) => 1000 - p, pxToPoint: (x, y) => ({ time: x, price: 1000 - y }), paneIdAtY: () => 'price', width: 2000, height: 1000 };
const two = [{ time: 100, price: 82428.5 }, { time: 300, price: 83648.3 }];
const pr = (props?: Record<string, unknown>): PriceRange =>
    createDrawing('pricerange', { id: 'r', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as PriceRange;

describe('price range defaults (TradingView)', () => {
    it('2 px solid TradingView blue, its blue at 15 % behind, lines not extended', () => {
        const d = pr();
        expect(d.style).toMatchObject({ lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' });
        expect(d.style.fillColor?.toLowerCase()).toBe(`${TV_LINE_COLOR}26`.toLowerCase());
        expect([d.tv, d.fillBackground, d.extendLeft, d.extendRight]).toEqual([true, true, false, false]);
    });

    it('plate: every part on, white 12 px on #1A1A1A with its background on', () => {
        const d = pr();
        expect(d.rangeParts().map((p) => [p.key, d.info[p.key]])).toEqual([['priceRange', true], ['percent', true], ['pips', true]]);
        expect([d.labelColor, d.labelSize, d.labelBackground, d.labelBgColor.toLowerCase()]).toEqual(['#ffffff', 12, true, '#1a1a1a']);
    });

    it('text starts 12 px TradingView blue', () => {
        const d = pr();
        d.applySettings({ 'text.value': 'x' });
        expect(d.text).toMatchObject({ size: 12, color: TV_LINE_COLOR });
    });

    it('two round handles with the default cursor', () => {
        const d = pr();
        expect(d.handleShapes().every((s) => s !== 'square')).toBe(true);
        expect([0, 1].map((i) => d.handleCursor(i))).toEqual([null, null]);
    });
});

describe('price range plate text (TradingView\'s format)', () => {
    it('reads like TradingView on a 0.1 tick: 1,219.8 (1.48%) 12,198', () => {
        expect(pr().infoLines(flat, 0.1)).toEqual(['1,219.8 (1.48%) 12,198']);
    });

    it('a fall carries the minus sign on every part', () => {
        const down = rangeInfoLines({ priceRange: true, percent: true, pips: true }, { time: 0, price: 80000 }, { time: 1, price: 78319.1 }, { tick: 0.1 });
        expect(down).toEqual(['−1,680.9 (−2.10%) −16,809']);
    });

    it('each part can be switched off', () => {
        const a = { time: 0, price: 100 };
        const b = { time: 1, price: 101 };
        const t = { tick: 0.01 };
        expect(rangeInfoLines({ percent: true }, a, b, t)).toEqual(['1.00%']);
        expect(rangeInfoLines({ priceRange: true, pips: true }, a, b, t)).toEqual(['1.00, 100']); // TradingView: a comma without the percent
        expect(rangeInfoLines({ percent: true, pips: true }, a, b, t)).toEqual(['1.00%, 100']);
        expect(rangeInfoLines({}, a, b, t)).toEqual([]);
    });

    it('the settings survive a save', () => {
        const d = pr();
        d.applySettings({ 'info.pips': false, labelSize: 16, extendRight: true, labelBackground: false });
        const back = deserializeDrawing(d.serialize())! as PriceRange;
        expect([back.tv, back.info.pips, back.labelSize, back.extendRight, back.labelBackground]).toEqual([true, false, 16, true, false]);
    });

    it('a price range saved before keeps the old box and its settings', () => {
        const old = deserializeDrawing({ id: 'o', type: 'pricerange', paneId: 'price', anchors: two, style: { lineColor: '#123456', lineWidth: 1, lineStyle: 'solid' }, props: { showPrice: true, showDate: false } } as never)! as PriceRange;
        expect(old.tv).toBeUndefined();
        expect(old.schema().fields.some((f) => f.path === 'showPrice')).toBe(true);
        expect(old.serialize().props).toEqual({ showPrice: true, showDate: false });
    });
});

describe('price range dialog', () => {
    it('Style: Line, Background, Extend, INFO Stats, Label, Label background; Text without alignment', async () => {
        const s = setup(pr());
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Text', 'Coordinates', 'Visibility']);
        s.tab('Style').click();
        const st = s.body('style').textContent!;
        const order = ['Line', 'Background', 'Extend', 'Stats', 'Label', 'Label background'].map((l) => st.indexOf(l));
        expect(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1]!))).toBe(true);
        expect(st).toContain('Price range, percent change, change in pips');
        expect(st).not.toContain('Show price');
        s.tab('Text').click();
        expect(s.body('text').textContent).not.toContain('position');
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Price range');
    });

    it('the Label background switch turns the plate background off', async () => {
        const s = setup(pr());
        s.gear().click();
        await settled();
        s.tab('Style').click();
        s.body('style').querySelector<HTMLElement>('[data-role="label-background"] [role="switch"]')!.click();
        expect((s.live() as PriceRange).labelBackground).toBe(false);
    });
});

describe('date and price range (TradingView, defaults from its code)', () => {
    const dp = (props?: Record<string, unknown>): DatePriceRange =>
        createDrawing('datepricerange', { id: 'd', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as DatePriceRange;

    it('2 px blue, 15 % fill, no border (1 px blue when on), every Stats part on', () => {
        const d = dp();
        expect(d.style).toMatchObject({ lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' });
        expect([d.tv, d.fillBackground, d.drawBorder, d.borderColor, d.borderWidth]).toEqual([true, true, false, TV_LINE_COLOR, 1]);
        expect(d.rangeParts().map((p) => p.label)).toEqual(['Price range', 'Percent change', 'Change in pips', 'Bars range', 'Date/time range', 'Volume']);
        expect(d.rangeParts().every((p) => d.info[p.key] === true)).toBe(true);
    });

    it('plate lines like TradingView\'s: price, bars and time, volume', () => {
        const lines = rangeInfoLines(
            { priceRange: true, percent: true, pips: true, bars: true, dateTime: true, volume: true },
            { time: 0, price: 78000 },
            { time: (4 * 60 + 5) * 60_000, price: 79680.9 },
            { tick: 0.1, bars: 49, volume: 13900 },
        );
        expect(lines).toEqual(['1,680.9 (2.15%) 16,809', '49 bars, 4h 5m', 'Vol 13.9 K']);
        expect(formatRangeVolume(37670)).toBe('37.67 K');
    });

    it('a saved date & price range keeps the old box; settings survive a save', () => {
        const old = deserializeDrawing({ id: 'o', type: 'datepricerange', paneId: 'price', anchors: two, style: { lineColor: '#123456', lineWidth: 1, lineStyle: 'solid' }, props: { showPrice: true, showDate: true } } as never)! as DatePriceRange;
        expect(old.tv).toBeUndefined();
        const d = dp();
        d.applySettings({ drawBorder: true, 'info.volume': false, labelSize: 14 });
        const back = deserializeDrawing(d.serialize())! as DatePriceRange;
        expect([back.tv, back.drawBorder, back.info.volume, back.labelSize]).toEqual([true, true, false, 14]);
    });

    it('dialog: Line, Border, Background, then INFO; title "Date and price range"', async () => {
        const s = setup(dp());
        s.gear().click();
        await settled();
        s.tab('Style').click();
        const st = s.body('style').textContent!;
        const order = ['Line', 'Border', 'Background', 'Stats', 'Label', 'Label background'].map((l) => st.indexOf(l));
        expect(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1]!))).toBe(true);
        expect(st).not.toContain('Extend');
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Date and price range');
    });
});

describe('date range (TradingView, defaults from its code)', () => {
    const dr = (props?: Record<string, unknown>): DateRange =>
        createDrawing('daterange', { id: 'g', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as DateRange;

    it('2 px blue, 15 % fill, not extended; Stats: bars, date/time, volume, all on', () => {
        const d = dr();
        expect(d.style).toMatchObject({ lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' });
        expect([d.tv, d.fillBackground, d.extendTop, d.extendBottom]).toEqual([true, true, false, false]);
        expect(d.rangeParts().map((p) => p.label)).toEqual(['Bars range', 'Date/time range', 'Volume']);
        expect(d.infoLines(flat, 0.1).some((l) => l.includes('1,219.8'))).toBe(false); // no price part
    });

    it('extends survive a save; a saved date range keeps the old box', () => {
        const d = dr();
        d.applySettings({ extendTop: true });
        const back = deserializeDrawing(d.serialize())! as DateRange;
        expect([back.tv, back.extendTop, back.extendBottom]).toEqual([true, true, false]);
        const old = deserializeDrawing({ id: 'o', type: 'daterange', paneId: 'price', anchors: two, style: { lineColor: '#123456', lineWidth: 1, lineStyle: 'solid' }, props: { showPrice: false, showDate: true } } as never)! as DateRange;
        expect(old.tv).toBeUndefined();
    });

    it('dialog: Line, Background, Extend (top / bottom), INFO', async () => {
        const s = setup(dr());
        s.gear().click();
        await settled();
        s.tab('Style').click();
        const st = s.body('style');
        const order = ['Line', 'Background', 'Extend', 'Stats', 'Label', 'Label background'].map((l) => st.textContent!.indexOf(l));
        expect(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1]!))).toBe(true);
        expect(st.querySelector('[data-role="extend"]')!.textContent).toContain("Don't extend");
        expect(st.textContent).toContain('Bars range, date/time range, volume');
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Date range');
    });
});
