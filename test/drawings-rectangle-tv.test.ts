// @vitest-environment jsdom
// The rectangle, TradingView parity (audit 2026-10-30, read from TradingView's code, module 787889): purple 2 px, the
// purple at 20 % behind (a Background switch), a middle line with its own look, eight handles with TradingView's
// cursors and moves, text above / inside / below the box; the Style tab is Extend, Border, Middle line, Background.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { Box, createDrawing, deserializeDrawing, type Drawing, type Projector } from '../src/core/drawings';
import { labelLayout } from '../src/renderers/native/drawings/DrawingPainter';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});
afterEach(() => {
    document.body.replaceChildren();
});
const settled = () => new Promise<void>((r) => setTimeout(r, 50));

function setup(drawing: Drawing) {
    const host = document.createElement('div');
    document.body.append(host);
    const popup = new DrawingSettingsPopup(host, DARK_THEME);
    let live = drawing;
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            live = deserializeDrawing(live.serialize())!;
        },
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    popup.open([drawing], null, actions);
    const tab = (name: string): HTMLElement => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].find((e) => e.textContent === name)!;
    return {
        live: () => live,
        gear: () => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!,
        tabs: () => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!),
        tab,
        body: (key: string) => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!,
    };
}

const proj: Projector = { xOf: (t) => t, yOf: (p) => 1000 - p, pxToPoint: (x, y) => ({ time: x, price: 1000 - y }), paneIdAtY: () => 'price', width: 2000, height: 1000 };
// Corner 1 top-left (x 100, y 300), corner 2 bottom-right (x 300, y 500).
const rect = (props?: Record<string, unknown>): Box =>
    createDrawing('box', { id: 'r', paneId: 'price', anchors: [{ time: 100, price: 700 }, { time: 300, price: 500 }], ...(props ? { props } : {}) })! as Box;

describe('rectangle defaults (TradingView, module 787889)', () => {
    it('purple 2 px border, the purple at 20 % behind, middle line off (dashed 1 px purple when on)', () => {
        const d = rect();
        expect(d.style).toMatchObject({ lineColor: '#9c27b0', lineWidth: 2, lineStyle: 'solid', fillColor: '#9c27b033' });
        expect([d.tv, d.fillBackground, d.middleLine, d.extendLeft, d.extendRight]).toEqual([true, true, false, false, false]);
        expect([d.middleColor, d.middleWidth, d.middleStyle]).toEqual(['#9c27b0', 1, 'dashed']);
        expect(d.textDefaults()).toEqual({ color: '#9c27b0', size: 14, hAlign: 'center', vAlign: 'center' });
    });

    it('first text starts purple 14, centered inside', () => {
        const d = rect();
        d.applySettings({ 'text.value': 'Zone' });
        expect(d.text).toMatchObject({ value: 'Zone', color: '#9c27b0', size: 14, hAlign: 'center', vAlign: 'center' });
    });

    it('Background off: no fill, grabbed only on the border', () => {
        const d = rect();
        expect(d.hitTest(200, 400, proj, 4)).toBe(true);
        d.applySettings({ fillBackground: false });
        expect(d.filled()).toBe(false);
        expect(d.hitTest(200, 400, proj, 4)).toBe(false);
        expect(d.hitTest(200, 301, proj, 4)).toBe(true);
    });

    it('survives a save; a box saved before keeps its look', () => {
        const d = rect();
        d.applySettings({ middleLine: true, middleStyle: 'dotted', middleWidth: 3, fillBackground: false });
        const back = deserializeDrawing(d.serialize())! as Box;
        expect([back.tv, back.middleLine, back.middleStyle, back.middleWidth, back.fillBackground]).toEqual([true, true, 'dotted', 3, false]);
        const old = deserializeDrawing({ id: 'o', type: 'box', paneId: 'price', anchors: [{ time: 100, price: 700 }, { time: 300, price: 500 }], style: { lineColor: '#38c0fd', lineWidth: 1, lineStyle: 'solid', fillColor: '#38c0fd26' } } as never)! as Box;
        expect(old.tv).toBeUndefined();
        expect(old.handlePoints(proj).length).toBe(2);
        expect(old.filled()).toBe(true);
    });
});

describe('rectangle handles (TradingView)', () => {
    it('eight: the four corners round, the side middles square', () => {
        const d = rect();
        expect(d.handlePoints(proj)).toEqual([[100, 300], [300, 500], [100, 500], [300, 300], [100, 400], [300, 400], [200, 300], [200, 500]]);
        expect(d.handleShapes()).toEqual(['circle', 'circle', 'circle', 'circle', 'square', 'square', 'square', 'square']);
    });

    it('cursors: diagonal corners, sideways left/right middles, up-down top/bottom middles', () => {
        const d = rect();
        expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => d.handleCursor(i))).toEqual(['nwse-resize', 'nwse-resize', 'nesw-resize', 'nesw-resize', 'ew-resize', 'ew-resize', 'ns-resize', 'ns-resize']);
        // Drawn from the bottom-left to the top-right, the pairs swap.
        const flip = createDrawing('box', { paneId: 'price', anchors: [{ time: 100, price: 500 }, { time: 300, price: 700 }] })! as Box;
        expect(flip.handleCursor(0)).toBe('nesw-resize');
        expect(flip.handleCursor(2)).toBe('nwse-resize');
    });

    it('extra corners and side middles move only their sides', () => {
        const d = rect();
        expect(d.dragHandlePx(2, 80, 560, proj)).toBe(true); // bottom-left corner
        expect(d.anchors).toEqual([{ time: 80, price: 700 }, { time: 300, price: 440 }]);
        d.dragHandlePx(5, 350, 999, proj); // right middle: time only
        expect(d.anchors[1]).toEqual({ time: 350, price: 440 });
        d.dragHandlePx(6, 999, 250, proj); // top middle: price only
        expect(d.anchors[0]).toEqual({ time: 80, price: 750 });
        expect(d.dragHandlePx(0, 1, 1, proj)).toBe(false); // the drawn corners move as usual
    });
});

describe('rectangle text (TradingView: Top = above, Inside, Bottom = below)', () => {
    const at = (h: 'left' | 'center' | 'right', v: 'top' | 'center' | 'bottom') => {
        const d = rect();
        d.applySettings({ 'text.value': 'Zone', 'text.hAlign': h, 'text.vAlign': v });
        return labelLayout(d, proj)!;
    };
    it('Top sits above the box, Bottom below, Inside centred; a third of the font size off the edge', () => {
        const top = at('center', 'top');
        expect(top.x).toBe(200);
        expect(top.top).toBeLessThan(300 - 14 / 3 - 14);
        expect(at('center', 'bottom').top).toBeCloseTo(500 + 14 / 3);
        const inside = at('center', 'center');
        expect(inside.top).toBeGreaterThan(380);
        expect(inside.top).toBeLessThan(400);
        expect(at('left', 'center').x).toBeCloseTo(100 + 14 / 3);
        expect(at('left', 'top').x).toBe(100);
        expect(at('right', 'bottom')).toMatchObject({ x: 300, align: 'right' });
    });
});

describe('rectangle dialog (TradingView: Style, Text, Coordinates, Visibility)', () => {
    it('Style: Extend, Border, Middle line (switch + line), Background (switch + color)', async () => {
        const s = setup(rect());
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Text', 'Coordinates', 'Visibility']);
        s.tab('Style').click();
        const st = s.body('style');
        const labels = [...st.querySelectorAll('.vela-field-label, label')].map((e) => e.textContent?.trim()).filter(Boolean);
        expect(labels.join('|')).toMatch(/Extend.*Border.*Middle line.*Background/);
        expect(st.textContent).toContain("Don't extend");
        st.querySelector<HTMLElement>('[data-role="middle-line"] [role="switch"]')!.click();
        expect((s.live() as Box).middleLine).toBe(true);
        st.querySelector<HTMLElement>('[data-role="background"] [role="switch"]')!.click();
        expect((s.live() as Box).fillBackground).toBe(false);
    });

    it('Text: vertical choices are Top / Inside / Bottom', async () => {
        const s = setup(rect());
        s.gear().click();
        await settled();
        s.tab('Text').click();
        const opts = (rect().schema().fields.find((f) => f.path === 'text.vAlign')!.options ?? []).map((o) => o.label);
        expect(opts).toEqual(['Top', 'Inside', 'Bottom']);
        expect(s.body('text').textContent).toContain('Inside');
    });
});
