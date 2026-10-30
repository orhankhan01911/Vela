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

import { createDrawing, deserializeDrawing, PriceRange, priceRangeText, TV_LINE_COLOR, type Drawing } from '../src/core/drawings';
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
        expect(d.info).toEqual({ priceRange: true, percent: true, pips: true });
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
        expect(pr().infoText(0.1)).toBe('1,219.8 (1.48%) 12,198');
    });

    it('a fall carries the minus sign on every part', () => {
        const down = priceRangeText({ priceRange: true, percent: true, pips: true }, { time: 0, price: 80000 }, { time: 1, price: 78319.1 }, 0.1);
        expect(down).toBe('−1,680.9 (−2.10%) −16,809');
    });

    it('each part can be switched off', () => {
        const a = { time: 0, price: 100 };
        const b = { time: 1, price: 101 };
        expect(priceRangeText({ priceRange: false, percent: true, pips: false }, a, b, 0.01)).toBe('1.00%');
        expect(priceRangeText({ priceRange: true, percent: false, pips: true }, a, b, 0.01)).toBe('1.00 100');
        expect(priceRangeText({ priceRange: false, percent: false, pips: false }, a, b, 0.01)).toBe('');
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
