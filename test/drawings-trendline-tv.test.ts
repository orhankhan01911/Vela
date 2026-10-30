// @vitest-environment jsdom
// The trend line, TradingView parity (audit 2026-10-30): TradingView's defaults (2 px solid #2962FF, 14 px text in
// the same blue), its settings dialog (one Line button with thickness + line style, line-end buttons, an Extend
// dropdown, Middle point, Price labels, the INFO stats section, a px text size with B / I buttons), the stats box
// shown only on the selected / hovered line unless "Always show stats", and pips in the stats.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, lineStatsRows, statsOf, textPx, TV_LINE_COLOR, type Drawing, type Projector } from '../src/core/drawings';
import { namedFontSize } from '../src/renderers/shared/drawing-geometry';
import { DrawingPainter } from '../src/renderers/native/drawings/DrawingPainter';
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


const trend = (): Drawing => createDrawing('trendline', { id: 't', paneId: 'price', anchors: [{ time: Date.UTC(2026, 9, 1), price: 100 }, { time: Date.UTC(2026, 9, 2), price: 110 }] })!;

async function openTab(s: ReturnType<typeof setup>, name: string): Promise<HTMLElement> {
    s.gear().click();
    await settled();
    s.tab(name).click();
    return s.body(name.toLowerCase());
}

describe('trend line defaults (TradingView)', () => {
    it('is 2 px solid TradingView blue, with no stats, middle point or price labels', () => {
        const d = trend();
        expect(d.style).toMatchObject({ lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' });
        const props = d.serialize().props!;
        expect(props).toMatchObject({ extendLeft: false, extendRight: false, showMiddlePoint: false, showPriceLabels: false });
        expect(statsOf(d)).toMatchObject({ price: false, pips: false, angle: false, position: 'right', always: false });
    });

    it('starts its text as 14 px blue, centered over the line', () => {
        const d = trend();
        d.applySettings({ 'text.value': 'x' });
        expect(d.text).toMatchObject({ size: 14, color: TV_LINE_COLOR, hAlign: 'center', vAlign: 'top' });
    });

    it('keeps middle point and price labels through save and load', () => {
        const d = trend();
        d.applySettings({ showMiddlePoint: true, showPriceLabels: true, 'stats.pips': true, 'stats.always': true, 'stats.position': 'auto' });
        const back = deserializeDrawing(JSON.parse(JSON.stringify(d.serialize())))! as Drawing & { showMiddlePoint: boolean; showPriceLabels: boolean };
        expect(back.showMiddlePoint).toBe(true);
        expect(back.showPriceLabels).toBe(true);
        expect(statsOf(back)).toMatchObject({ pips: true, always: true, position: 'auto' });
    });

    it('info line keeps its stats always on', () => {
        const d = createDrawing('infoline', { paneId: 'price', anchors: [{ time: 0, price: 1 }, { time: 1, price: 2 }] })!;
        expect(statsOf(d)!.always).toBe(true);
    });
});

describe('text sizes in px', () => {
    it('reads px and the older names', () => {
        expect(textPx(22)).toBe(22);
        expect(textPx('normal')).toBe(14);
        expect(textPx(undefined)).toBe(14);
        expect(namedFontSize(32)).toBe(32);
        expect(namedFontSize('large')).toBe(18);
    });
});

describe('stats rows', () => {
    const proj = { barsBetween: () => 67 } as unknown as Projector;
    it('adds the change in pips (ticks of the price scale) after the price and percent', () => {
        const s = { ...statsOf(trend())!, price: true, percent: true, pips: true };
        const rows = lineStatsRows(s, { time: 0, price: 77000 }, { time: 1, price: 78184.7 }, [0, 0, 10, 10], proj, 0.1);
        expect(rows[0]).toBe('1,184.70 (1.54%), 11,847');
    });
});

describe('stats box visibility', () => {
    function ctx() {
        let rects = 0;
        const noop = () => {};
        const c = new Proxy({ measureText: () => ({ width: 50 }), roundRect: () => { rects += 1; }, arcTo: () => {}, getTransform: () => ({ a: 1 }) } as Record<string, unknown>, {
            get: (t, k) => (k in t ? t[k as string] : noop),
            set: (t, k, v) => { t[k as string] = v; return true; },
        });
        return { c: c as unknown as CanvasRenderingContext2D, fills: () => rects };
    }
    const proj: Projector = { xOf: (t) => t / 1e6, yOf: (p) => 400 - p, pxToPoint: () => ({ time: 0, price: 0 }), paneIdAtY: () => 'price', width: 800, height: 500, barsBetween: () => 5 };
    const line = (always: boolean): Drawing => {
        const d = createDrawing('trendline', { id: 'L', paneId: 'price', anchors: [{ time: 100e6, price: 100 }, { time: 300e6, price: 200 }] })!;
        d.applySettings({ 'stats.price': true, 'stats.always': always });
        return d;
    };
    it('shows only on the selected / hovered line without "Always show stats"', () => {
        const painter = new DrawingPainter();
        const theme = DARK_THEME;
        let k = ctx();
        const spy = (c: CanvasRenderingContext2D) => { let n = 0; (c as unknown as Record<string, unknown>).fill = () => { n += 1; }; return () => n; };
        let n = spy(k.c);
        painter.paintLineStats(k.c, [line(false)], proj, theme, new Set());
        expect(n()).toBe(0);
        k = ctx();
        n = spy(k.c);
        painter.paintLineStats(k.c, [line(false)], proj, theme, new Set(['L']));
        expect(n()).toBe(1);
        k = ctx();
        n = spy(k.c);
        painter.paintLineStats(k.c, [line(true)], proj, theme, new Set());
        expect(n()).toBe(1);
    });
});

describe('trend line settings dialog (TradingView layout)', () => {
    it('Style: one Line button, two line-end buttons, Extend dropdown, Middle point, Price labels, INFO', async () => {
        const s = setup(trend());
        const style = await openTab(s, 'Style');
        expect(style.querySelector('[data-role="line-button"]')).not.toBeNull();
        expect(style.querySelector('[data-role="line-end-left"]')).not.toBeNull();
        expect(style.querySelector('[data-role="line-end-right"]')).not.toBeNull();
        expect(style.querySelector('[data-role="extend"]')!.textContent).toContain("Don't extend");
        expect(style.querySelector('[data-role="stats"]')!.textContent).toContain('Hidden');
        const text = style.textContent!;
        for (const l of ['Middle point', 'Price labels', 'Info', 'Stats position', 'Always show stats']) expect(text).toContain(l);
        // the old per-part switches are gone from the tab itself
        expect(text).not.toContain('Stats: price range');
        expect(text).not.toContain('Left end arrow');
    });

    it('the line-end button turns the right end into an arrow', async () => {
        const s = setup(trend());
        const style = await openTab(s, 'Style');
        style.querySelector<HTMLButtonElement>('[data-role="line-end-right"]')!.click();
        const arrow = [...document.querySelectorAll<HTMLButtonElement>('.vela-dlg-list-item')].find((b) => b.textContent === 'Arrow')!;
        arrow.click();
        expect(s.live().style.arrowRight).toBe(true);
    });

    it('Extend ticks left and right and names the mix', async () => {
        const s = setup(trend());
        const style = await openTab(s, 'Style');
        const dd = style.querySelector<HTMLElement>('[data-role="extend"]')!;
        dd.querySelector('button')!.click();
        const rows = [...document.querySelectorAll<HTMLElement>('.vela-color-field-pop .vela-field-bool')];
        rows[0]!.querySelector<HTMLElement>('.vela-field-label')!.click(); // the words tick the box too
        rows[1]!.querySelector<HTMLButtonElement>('button')!.click();
        const live = s.live() as Drawing & { extendLeft: boolean; extendRight: boolean };
        expect(live.extendLeft && live.extendRight).toBe(true);
        expect(dd.textContent).toContain('Extend both lines');
    });

    it('Stats lists the seven parts and names the ticked ones', async () => {
        const s = setup(trend());
        const style = await openTab(s, 'Style');
        const dd = style.querySelector<HTMLElement>('[data-role="stats"]')!;
        dd.querySelector('button')!.click();
        const rows = [...document.querySelectorAll<HTMLElement>('.vela-color-field-pop .vela-field-bool')];
        expect(rows.map((r) => r.textContent)).toEqual(['Price range', 'Percent change', 'Change in pips', 'Bars range', 'Date/time range', 'Distance', 'Angle']);
        rows[2]!.querySelector<HTMLButtonElement>('button')!.click();
        expect(statsOf(s.live())!.pips).toBe(true);
        expect(dd.textContent).toContain('Change in pips');
    });

    it('Text: color, px size, B and I on one row; TradingView names for above / below the line', async () => {
        const d = trend();
        d.applySettings({ 'text.value': 'hi' });
        const s = setup(d);
        const text = await openTab(s, 'Text');
        const row = text.querySelector<HTMLElement>('[data-role="text-style"]')!;
        expect(row).not.toBeNull();
        expect(row.textContent).toContain('14');
        expect(row.querySelector('[data-role="text-bold"]')).not.toBeNull();
        expect(row.querySelector('[data-role="text-italic"]')).not.toBeNull();
        row.querySelector<HTMLButtonElement>('[data-role="text-bold"]')!.click();
        expect(s.live().text?.bold).toBe(true);
        // over the line (stored "top") is TradingView's "Bottom"
        expect(text.textContent).toContain('Bottom');
    });
});
