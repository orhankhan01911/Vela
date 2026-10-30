// @vitest-environment jsdom
// The arrow marker, TradingView parity (audit 2026-10-30, read from TradingView's code): one color #1E53E5, its head
// and outline growing with the length, a dot when both points coincide, bold 16 px text at the tail; Style has one
// Color row.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, ArrowMarker, ArrowMark, arrowMarkerStroke, type Drawing, type Projector } from '../src/core/drawings';
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

describe('arrow marker (TradingView, read from its code)', () => {
    const am = (a: { time: number; price: number }, b: { time: number; price: number }, props?: Record<string, unknown>): ArrowMarker =>
        createDrawing('arrowmarker', { id: 'm', paneId: 'price', anchors: [a, b], ...(props ? { props } : {}) })! as ArrowMarker;

    it('one color #1E53E5; text bold 16 px in it', () => {
        const d = am({ time: 100, price: 500 }, { time: 300, price: 500 });
        expect([d.tv, d.style.lineColor]).toEqual([true, '#1e53e5']);
        d.applySettings({ 'text.value': 'x' });
        expect(d.text).toMatchObject({ size: 16, bold: true, color: '#1e53e5' });
        expect(d.schema().fields.map((f) => f.path)).toEqual(['style.lineColor', 'text.value', 'text.color', 'text.size', 'text.bold', 'text.italic']);
    });

    it('head 18 px under 92 px long, 25 % after (to 106); outline 2-5 px; at least 22 px long', () => {
        const short = am({ time: 100, price: 500 }, { time: 160, price: 500 }).tvShape(proj)!;
        expect(short.len).toBe(60);
        expect(short.poly[2]![0]).toBeCloseTo(160 - 18); // the barb sits a head length back from the tip
        const long = am({ time: 100, price: 500 }, { time: 500, price: 500 }).tvShape(proj)!;
        expect(long.poly[2]![0]).toBeCloseTo(500 - 100); // 25 % of 400
        expect(arrowMarkerStroke(60)).toBe(2);
        expect(arrowMarkerStroke(400)).toBe(5);
        const tiny = am({ time: 100, price: 500 }, { time: 105, price: 500 }).tvShape(proj)!;
        expect(tiny.len).toBe(22);
        expect(tiny.poly[0]![0]).toBeCloseTo(105 - 22);
    });

    it('both points on one spot: a 9 px dot', () => {
        expect(am({ time: 100, price: 500 }, { time: 100, price: 500 }).tvShape(proj)!.dot).toEqual([100, 500]);
    });

    it('a marker saved before (no props) keeps its old look; a new one survives a save', () => {
        const old = deserializeDrawing({ id: 'o', type: 'arrowmarker', paneId: 'price', anchors: [{ time: 1, price: 1 }, { time: 2, price: 2 }], style: { lineColor: '#123456', lineWidth: 1, lineStyle: 'solid' } } as never)! as ArrowMarker;
        expect(old.tv).toBeUndefined();
        const back = deserializeDrawing(am({ time: 100, price: 500 }, { time: 300, price: 500 }).serialize())! as ArrowMarker;
        expect(back.tv).toBe(true);
    });

    it('dialog: Style has one Color row; Text without alignment; Coordinates and Visibility', async () => {
        const s = setup(am({ time: 100, price: 500 }, { time: 300, price: 500 }));
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Text', 'Coordinates', 'Visibility']);
        s.tab('Style').click();
        expect(s.body('style').querySelector('[data-role="color"]')!.textContent).toContain('Color');
        expect(s.body('style').textContent).not.toContain('Border');
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Arrow marker');
    });
});

describe('arrow mark up / down (TradingView, read from its code)', () => {
    const mark = (type: 'arrowmarkup' | 'arrowmarkdown'): ArrowMark => createDrawing(type, { id: 'k', paneId: 'price', anchors: [{ time: 100, price: 500 }] })! as ArrowMark;

    it('up is TradingView green, down its red; text 14 px in the arrow color', () => {
        expect(mark('arrowmarkup').style.lineColor).toBe('#089981');
        expect(mark('arrowmarkdown').style.lineColor).toBe('#cc2f3c');
        const d = mark('arrowmarkdown');
        d.applySettings({ 'text.value': 'x' });
        expect(d.text).toMatchObject({ size: 14, color: '#cc2f3c' });
    });

    it('the glyph: tip on the point, a 12 px head 19.5 px wide, a 10 px shaft 10 px wide', () => {
        const g = mark('arrowmarkup').glyphPoints(proj)!;
        expect(g[0]).toEqual([100, 500]);
        const xs = g.map((p) => p[0]);
        const ys = g.map((p) => p[1]);
        expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(19.5);
        expect(Math.max(...ys) - Math.min(...ys)).toBe(22);
        expect(g.some(([x, y]) => x === 105 && y === 512)).toBe(true); // the shaft's corner under the head
        const down = mark('arrowmarkdown').glyphPoints(proj)!;
        expect(Math.min(...down.map((p) => p[1]))).toBe(478); // a down mark rises above its point
    });

    it('no handle ring: a small marker on the point; the body drags it', () => {
        const d = mark('arrowmarkup');
        expect(d.handlePoints(proj)).toEqual([]);
        expect(d.selectionMarkers(proj)).toEqual([[100, 500]]);
        expect(d.hitTest(100, 510, proj, 2)).toBe(true);
    });

    it('dialog: one "Arrow" colour row (TradingView\'s label), title "Arrow mark up"; "#1 (price, time)"', async () => {
        const s = setup(mark('arrowmarkup'));
        s.gear().click();
        await settled();
        s.tab('Style').click();
        expect(s.body('style').querySelector('[data-role="color"]')!.textContent).toContain('Arrow');
        s.tab('Coordinates').click();
        expect(s.body('coordinates').textContent).toContain('#1 (price, time)');
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Arrow mark up');
    });
});
