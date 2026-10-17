// @vitest-environment jsdom
// The drawing settings dialog, TradingView's layout (2026-10-17): every drawing gets a Settings gear on its
// toolbar; the dialog has the tabs the tool needs (Inputs, Style, Text, Coordinates, Visibility); the quick bar
// keeps only the quick controls. Visibility limits a drawing to some timeframes.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { barUnit, compactIntervals, createDrawing, deserializeDrawing, shownOnBarMs, type Drawing } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';
import { DrawingSettingsDialog, formatLocal, parseLocal } from '../src/renderers/native/drawings/DrawingSettingsDialog';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));
const H = 3_600_000;

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

function commit(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
    input.dispatchEvent(new Event('blur'));
}

const hline = (): Drawing => createDrawing('hline', { id: 'h', paneId: 'price', anchors: [{ time: 0, price: 100 }], text: { value: 'Heyaa', size: 'normal' } as Drawing['text'] })!;
const trend = (): Drawing => createDrawing('trendline', { id: 't', paneId: 'price', anchors: [{ time: Date.UTC(2026, 9, 1), price: 100 }, { time: Date.UTC(2026, 9, 2), price: 110 }] })!;

describe('visibility on intervals (core)', () => {
    it('maps bar durations to TradingView units', () => {
        expect(barUnit(15_000)).toEqual({ unit: 'seconds', count: 15 });
        expect(barUnit(5 * 60_000)).toEqual({ unit: 'minutes', count: 5 });
        expect(barUnit(4 * H)).toEqual({ unit: 'hours', count: 4 });
        expect(barUnit(24 * H)).toEqual({ unit: 'days', count: 1 });
        expect(barUnit(7 * 24 * H)).toEqual({ unit: 'weeks', count: 1 });
        expect(barUnit(30 * 24 * H)).toEqual({ unit: 'months', count: 1 });
        expect(barUnit(0)).toBeNull();
    });

    it('hides a drawing outside its ranges and shows it everywhere when unset', () => {
        const iv = { minutes: { on: false, from: 1, to: 59 }, hours: { on: true, from: 1, to: 4 } };
        expect(shownOnBarMs(undefined, 60_000)).toBe(true);
        expect(shownOnBarMs(iv, 5 * 60_000)).toBe(false);
        expect(shownOnBarMs(iv, H)).toBe(true);
        expect(shownOnBarMs(iv, 4 * H)).toBe(true);
        expect(shownOnBarMs(iv, 6 * H)).toBe(false);
        expect(shownOnBarMs(iv, 24 * H)).toBe(true);
        expect(shownOnBarMs(iv, 0)).toBe(true);
    });

    it('drops default rows and survives save and load', () => {
        expect(compactIntervals({ hours: { on: true, from: 1, to: 24 } })).toBeUndefined();
        const d = trend();
        d.applySettings({ intervals: { minutes: { on: false, from: 1, to: 59 } } });
        const back = deserializeDrawing(JSON.parse(JSON.stringify(d.serialize())))!;
        expect(back.intervals).toEqual({ minutes: { on: false, from: 1, to: 59 } });
        expect(deserializeDrawing(JSON.parse(JSON.stringify(trend().serialize())))!.intervals).toBeUndefined();
    });

    it('reads and writes local date-times', () => {
        const ms = new Date(2026, 9, 17, 15, 40).getTime();
        expect(formatLocal(ms)).toBe('2026-10-17 15:40');
        expect(parseLocal('2026-10-17 15:40')).toBe(ms);
        expect(parseLocal('2026-13-01 00:00')).toBeNull();
        expect(parseLocal('yesterday')).toBeNull();
    });
});

describe('settings dialog', () => {
    it('every drawing has a Settings gear; More lists Settings and Visibility on intervals', async () => {
        const s = setup(trend());
        expect(s.tips()).toContain('Settings');
        s.host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="More"]')!.click();
        await settled();
        const items = [...document.querySelectorAll<HTMLElement>('.vela-dpop-item, [role="menuitem"]')].map((e) => e.textContent!.trim());
        expect(items.some((t) => t.startsWith('Settings'))).toBe(true);
        expect(items.some((t) => t.startsWith('Visibility on intervals'))).toBe(true);
    });

    it('a horizontal line gets Style, Text, Coordinates and Visibility, titled with the tool name', async () => {
        const s = setup(hline());
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Text', 'Coordinates', 'Visibility']);
        expect(s.host.querySelector('.vela-drawing-dialog')!.textContent).toContain('Horizontal Line');
        // a horizontal line's one point is a price only
        expect(s.body('coordinates').querySelectorAll('[data-role="anchor-price"]').length).toBe(1);
        expect(s.body('coordinates').querySelectorAll('[data-role="anchor-time"]').length).toBe(0);
    });

    it('the Style tab has the Line row (color, width, style); the Text tab has the text', async () => {
        const s = setup(hline());
        s.gear().click();
        await settled();
        expect(s.body('style').textContent).toContain('Line');
        expect(s.body('text').querySelector('textarea')!.value).toBe('Heyaa');
    });

    it('Coordinates edits move the anchor; Cancel puts it back', async () => {
        const s = setup(trend());
        s.gear().click();
        await settled();
        s.tab('Coordinates').click();
        const price = s.body('coordinates').querySelector<HTMLElement>('[data-role="anchor-price"]')!;
        const input = (price.matches('input') ? price : price.querySelector('input')) as HTMLInputElement;
        commit(input, '123.5');
        expect(s.live().anchors[0]!.price).toBe(123.5);
        const time = s.body('coordinates').querySelectorAll<HTMLElement>('[data-role="anchor-time"]')[1]!;
        const tin = (time.matches('input') ? time : time.querySelector('input')) as HTMLInputElement;
        commit(tin, '2026-10-05 12:00');
        expect(s.live().anchors[1]!.time).toBe(new Date(2026, 9, 5, 12, 0).getTime());
        s.button('Cancel').click();
        await settled();
        expect(s.live().anchors[0]!.price).toBe(100);
        expect(s.live().anchors[1]!.time).toBe(Date.UTC(2026, 9, 2));
    });

    it('Visibility: switching Minutes off hides the drawing on minute charts only; Cancel clears it', async () => {
        const s = setup(trend());
        s.gear().click();
        await settled();
        s.tab('Visibility').click();
        const rows = s.body('visibility');
        expect(rows.textContent).toContain('Minutes');
        const sw = [...rows.querySelectorAll<HTMLElement>('[role="switch"], input[type="checkbox"]')];
        expect(sw.length).toBe(6);
        sw[1]!.click(); // Minutes
        expect(s.live().intervals?.minutes?.on).toBe(false);
        expect(shownOnBarMs(s.live().intervals, 5 * 60_000)).toBe(false);
        expect(shownOnBarMs(s.live().intervals, H)).toBe(true);
        const to = rows.querySelector<HTMLElement>('[data-role="interval-hours-to"]')!;
        const tin = (to.matches('input') ? to : to.querySelector('input')) as HTMLInputElement;
        commit(tin, '4');
        expect(shownOnBarMs(s.live().intervals, 4 * H)).toBe(true);
        expect(shownOnBarMs(s.live().intervals, 12 * H)).toBe(false);
        s.button('Cancel').click();
        await settled();
        expect(s.live().intervals).toBeUndefined();
    });

    it('opening from More > Visibility on intervals lands on that tab', async () => {
        const s = setup(trend());
        s.host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="More"]')!.click();
        await settled();
        const item = [...document.querySelectorAll<HTMLElement>('.vela-dpop-item, [role="menuitem"]')].find((e) => e.textContent!.trim().startsWith('Visibility on intervals'))!;
        item.click();
        await settled();
        expect(s.tab('Visibility').getAttribute('aria-selected')).toBe('true');
    });

    it('tabs per tool: position has Inputs, fib has Style first, a text label has Text', () => {
        const pos = createDrawing('position', { paneId: 'price', anchors: [{ time: 0, price: 100 }, { time: 10, price: 110 }] })!;
        expect(DrawingSettingsDialog.tabsFor(pos)).toEqual(['inputs', 'style', 'text', 'visibility']);
        const fib = createDrawing('fibretracement', { paneId: 'price', anchors: [{ time: 0, price: 100 }, { time: 10, price: 200 }] })!;
        expect(DrawingSettingsDialog.tabsFor(fib)).toContain('style');
        expect(DrawingSettingsDialog.tabsFor(fib)).toContain('visibility');
        const label = createDrawing('text', { paneId: 'price', anchors: [{ time: 0, price: 100 }] })!;
        expect(DrawingSettingsDialog.tabsFor(label)).toContain('text');
    });

    it('the regression channel quick bar keeps one color; its other settings are in the dialog', async () => {
        const reg = createDrawing('regressionchannel', { paneId: 'price', anchors: [{ time: 0, price: 100 }, { time: 10, price: 110 }] })!;
        const s = setup(reg);
        expect(s.tips()).toContain('Midline color');
        expect(s.tips()).not.toContain('Upper fill');
        s.gear().click();
        await settled();
        expect(s.body('style').textContent).toContain('Upper fill');
    });
});
