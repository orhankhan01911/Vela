// @vitest-environment jsdom
// The horizontal line, TradingView parity (audit 2026-10-30): 2 px solid #2962FF with its price label, 12 px text
// centered on the line, a rounded-square handle, TradingView's dialog names ("Price label", "#1 (price)"), no price-label
// switch on the floating bar.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, ParallelChannel, TV_LINE_COLOR, type Drawing, type Projector } from '../src/core/drawings';
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



const hl = (): Drawing => createDrawing('hline', { id: 'h', paneId: 'price', anchors: [{ time: Date.UTC(2026, 9, 1), price: 100 }] })!;

describe('horizontal line defaults (TradingView)', () => {
    it('is 2 px solid TradingView blue with its price label on', () => {
        const d = hl();
        expect(d.style).toMatchObject({ lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' });
        expect(d.serialize().props).toMatchObject({ showPrice: true });
    });

    it('starts its text 12 px blue, centered on the line', () => {
        const d = hl();
        d.applySettings({ 'text.value': 'x' });
        expect(d.text).toMatchObject({ size: 12, color: TV_LINE_COLOR, hAlign: 'center', vAlign: 'center' });
    });

    it('has one rounded-square handle', () => {
        expect(hl().handleShapes()).toEqual(['square']);
    });
});

describe('horizontal line dialog and bar', () => {
    it('names the switch and the point like TradingView', async () => {
        const s = setup(hl());
        s.gear().click();
        await settled();
        s.tab('Style').click();
        expect(s.body('style').textContent).toContain('Price label');
        expect(s.body('style').textContent).not.toContain('on the scale');
        s.tab('Coordinates').click();
        expect(s.body('coordinates').textContent).toContain('#1 (price)');
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Horizontal line');
    });

    it('shows Middle / Center for new text', async () => {
        const d = hl();
        d.applySettings({ 'text.value': 'x' });
        const s = setup(d);
        s.gear().click();
        await settled();
        s.tab('Text').click();
        const t = s.body('text').textContent!;
        expect(t).toContain('Middle');
        expect(t).toContain('Center');
        expect(t).toContain('12');
    });

    it('keeps the price-label switch off the floating bar', () => {
        const s = setup(hl());
        expect(s.tips()).not.toContain('Show price');
    });
});

describe('vertical line (TradingView)', () => {
    const vl = (props?: Record<string, unknown>): Drawing =>
        createDrawing('vline', { id: 'v', paneId: 'price', anchors: [{ time: Date.UTC(2026, 9, 1), price: 100 }], ...(props ? { props } : {}) })!;
    it('starts blue 2 px, through every pane, time label on, text vertical in the middle', () => {
        const d = vl() as Drawing & { extendLine: boolean; textVertical: boolean; showTime: boolean };
        expect(d.style).toMatchObject({ lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' });
        expect(d.extendLine).toBe(true);
        expect(d.textVertical).toBe(true);
        d.applySettings({ 'text.value': 'x' });
        expect(d.text).toMatchObject({ size: 14, color: TV_LINE_COLOR, hAlign: 'center', vAlign: 'center' });
    });

    it('a saved line keeps its pane-only, horizontal-text look', () => {
        const d = vl({ showTime: true }) as Drawing & { extendLine: boolean; textVertical: boolean };
        expect(!!d.extendLine).toBe(false);
        expect(!!d.textVertical).toBe(false);
    });

    it('dialog: Line, Extend, Time label; Text orientation on the Text tab; #1 (time)', async () => {
        const d = vl();
        d.applySettings({ 'text.value': 'x' });
        const s = setup(d);
        s.gear().click();
        await settled();
        s.tab('Style').click();
        const st = s.body('style').textContent!;
        expect(st).toContain('Extend');
        expect(st).toContain('Time label');
        expect(st).not.toContain('Text orientation');
        s.tab('Text').click();
        expect(s.body('text').textContent).toContain('Text orientation');
        expect(s.body('text').textContent).toContain('Vertical');
        s.tab('Coordinates').click();
        expect(s.body('coordinates').textContent).toContain('#1 (time)');
    });
});

describe('horizontal ray (TradingView)', () => {
    const hr = (): Drawing => createDrawing('hray', { id: 'r', paneId: 'price', anchors: [{ time: Date.UTC(2026, 9, 1), price: 100 }] })!;
    it('starts blue 2 px with its price label; text 12 px under the line, centered along it', () => {
        const d = hr();
        expect(d.style).toMatchObject({ lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' });
        expect(d.serialize().props).toMatchObject({ showPrice: true });
        d.applySettings({ 'text.value': 'x' });
        expect(d.text).toMatchObject({ size: 12, color: TV_LINE_COLOR, hAlign: 'center', vAlign: 'bottom' });
    });
    it('dialog: Horizontal ray, Price label, a price and a time for its start; no price switch on the bar', async () => {
        const s = setup(hr());
        expect(s.tips()).not.toContain('Show price');
        s.gear().click();
        await settled();
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Horizontal ray');
        s.tab('Coordinates').click();
        const co = s.body('coordinates');
        expect(co.textContent).toContain('#1');
        expect(co.querySelectorAll('[data-role="anchor-price"]').length).toBe(1);
        expect(co.querySelectorAll('[data-role="anchor-time"]').length).toBe(1);
    });
});

describe('parallel channel (TradingView)', () => {
    const proj: Projector = { xOf: (t) => t, yOf: (p) => 1000 - p, pxToPoint: (x, y) => ({ time: x, price: 1000 - y }), paneIdAtY: () => 'price', width: 800, height: 600 };
    const ch = (props?: Record<string, unknown>): ParallelChannel =>
        createDrawing('parallelchannel', { id: 'c', paneId: 'price', anchors: [{ time: 100, price: 500 }, { time: 300, price: 600 }, { time: 200, price: 450 }], ...(props ? { props } : {}) })! as ParallelChannel;

    it("starts with TradingView's seven levels: 0 and 1 solid 2 px, 0.5 dashed, the rest hidden; blue, 20 % fill", () => {
        const d = ch();
        expect(d.levels.map((l) => [l.coeff, l.visible, l.lineStyle, l.lineWidth])).toEqual([
            [-0.25, false, 'solid', 1], [0, true, 'solid', 2], [0.25, false, 'solid', 1], [0.5, true, 'dashed', 1],
            [0.75, false, 'solid', 1], [1, true, 'solid', 2], [1.25, false, 'solid', 1],
        ]);
        expect(d.style.lineColor).toBe(TV_LINE_COLOR);
        expect(d.style.fillColor).toBe(`${TV_LINE_COLOR}33`);
        expect(d.fillBackground !== false).toBe(true);
    });

    it('a channel saved with its middle line off keeps it off (the 0.5 level)', () => {
        expect(ch({ middleLine: false }).levels[3]!.visible).toBe(false);
    });

    it('draws each visible level in its own dash and width, and no fill with Background off', () => {
        const g = ch().geometry(proj)!;
        expect(g.colored!.map((c) => [c.lineStyle, c.lineWidth])).toEqual([['solid', 2], ['dashed', 1], ['solid', 2]]);
        const off = ch({ fillBackground: false });
        expect(off.geometry(proj)!.fill).toBeNull();
    });

    it('marks its four corners on the axes when selected (TradingView), not the width anchor', () => {
        const d = ch();
        const off = d.offset();
        expect(d.axisPoints().map((p) => p.price).sort((a, b) => a - b)).toEqual([500, 600, 500 + off, 600 + off].sort((a, b) => a - b));
    });

    it('has four round corners and a square in the middle of each line', () => {
        const d = ch();
        expect(d.handlePoints(proj)).toHaveLength(6);
        expect(d.handleShapes()).toEqual(['circle', 'circle', 'circle', 'circle', 'square', 'square']);
    });

    it('baseline ends keep the width; the baseline square moves the baseline alone; the other square sets the width', () => {
        const d = ch();
        const w0 = d.offset();
        d.dragHandlePx(0, 120, 1000 - 520, proj);
        expect(d.offset()).toBeCloseTo(w0);
        const upper = d.anchors[2]!.price;
        d.dragHandlePx(4, 200, 1000 - 600, proj); // baseline middle to 600
        expect((d.anchors[0]!.price + d.anchors[1]!.price) / 2).toBeCloseTo(600);
        expect(d.anchors[2]!.price).toBeCloseTo(upper); // the parallel line stayed
        d.dragHandlePx(5, 200, 1000 - 700, proj);
        expect(d.anchors[2]!.price).toBeCloseTo(700);
    });

    it('the toolbar color recolors every level; its width and dash restyle the two lines', () => {
        const d = ch();
        d.applySettings({ 'levels.3.color': '#ff0000' });
        d.applySettings({ 'style.lineColor': '#00ff00', 'style.lineWidth': 3, 'style.lineStyle': 'dotted' });
        expect(d.levels.every((l) => !l.color)).toBe(true);
        expect(d.levels.filter((l) => l.coeff === 0 || l.coeff === 1).map((l) => [l.lineWidth, l.lineStyle])).toEqual([[3, 'dotted'], [3, 'dotted']]);
        expect(d.levels[3]!.lineStyle).toBe('dashed');
    });

    it('dialog: seven level rows, Extend, Background; Coordinates has the price offset', async () => {
        const s = setup(ch());
        s.gear().click();
        await settled();
        s.tab('Style').click();
        const st = s.body('style');
        for (let i = 0; i < 7; i += 1) expect(st.querySelector(`[data-role="level-${i}"]`), String(i)).not.toBeNull();
        expect(st.textContent).toContain('Extend');
        expect(st.textContent).toContain('Background');
        s.tab('Coordinates').click();
        expect(s.body('coordinates').textContent).toContain('Price offset');
        expect(s.body('coordinates').querySelector('[data-role="channel-offset"]')).not.toBeNull();
    });
});

describe('handle cursors (read from TradingView\'s anchor renderer, 2026-10-30)', () => {
    const mk = (type: string, n: number) =>
        createDrawing(type as never, { paneId: 'price', anchors: Array.from({ length: n }, (_, i) => ({ time: 100 + i * 100, price: 500 + i * 10 })) })!;
    it('plain ends are the arrow; the horizontal line\'s square is ns-resize, the vertical line\'s ew-resize', () => {
        for (const t of ['trendline', 'ray', 'infoline']) expect([0, 1].map((i) => mk(t, 2).handleCursor(i)), t).toEqual([null, null]);
        expect(mk('hray', 1).handleCursor(0)).toBeNull();
        expect(mk('hline', 1).handleCursor(0)).toBe('ns-resize');
        expect(mk('hline', 1).handleShapes()).toEqual(['square']);
        expect(mk('vline', 1).handleCursor(0)).toBe('ew-resize');
        expect(mk('vline', 1).handleShapes()).toEqual(['square']);
    });
    it('channel corners are the arrow, its middle squares ns-resize', () => {
        const c = mk('parallelchannel', 3);
        expect([0, 1, 2, 3, 4, 5].map((i) => c.handleCursor(i))).toEqual([null, null, null, null, 'ns-resize', 'ns-resize']);
    });
});
