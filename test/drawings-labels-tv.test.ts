// @vitest-environment jsdom
// TradingView's price label, price note and flag mark (audit 2026-10-31, modules 616930, 394599, 95256; dialogs and bars
// read on live shapes): its blue, white label text, the dialog rows and bars; saved ones keep their look.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, TV_LINE_COLOR, type Drawing } from '../src/core/drawings';
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
        restore: () => {},
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    popup.open([drawing], null, actions);
    const tips = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-dpop [data-tip]')].map((e) => e.dataset.tip!);
    const gear = (): HTMLButtonElement => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!;
    const tabs = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!);
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    return { tips, gear, tabs, body };
}

const CASES = [
    { type: 'pricelabel', anchors: [{ time: 100, price: 500 }], rows: ['text', 'background', 'border'], bar: ['Text color', 'Fill', 'Text size'], tabs: ['Style', 'Coordinates', 'Visibility'] },
    { type: 'pricenote', anchors: [{ time: 100, price: 500 }, { time: 200, price: 560 }], rows: ['label-text', 'label-background', 'label-border', 'line-color'], bar: ['Line color', 'Fill', 'Text color'], tabs: ['Style', 'Text', 'Coordinates', 'Visibility'] },
    { type: 'signpost', anchors: [{ time: 100, price: 500 }], rows: ['emoji-pin'], bar: ['Fill', 'Text size'], tabs: ['Style', 'Text', 'Coordinates', 'Visibility'] },
    { type: 'flagmark', anchors: [{ time: 100, price: 500 }], rows: ['flag'], bar: ['Fill'], tabs: ['Style', 'Coordinates', 'Visibility'] },
] as const;

describe('TradingView\'s labels', () => {
    for (const c of CASES) {
        it(`${c.type}: TradingView's blue; saved look kept`, () => {
            const d = createDrawing(c.type, { id: c.type, paneId: 'price', anchors: [...c.anchors] })! as Drawing & { tv?: boolean };
            expect(d.tv).toBe(true);
            if (c.type !== 'signpost') expect(d.style.lineColor).toBe(TV_LINE_COLOR);
            if (c.type === 'pricelabel') expect([d.style.fillColor, d.text?.color]).toEqual([TV_LINE_COLOR, '#FFFFFF']);
            // The price note's label is white on its blue; its free text is blue, 14 px, over the line.
            if (c.type === 'pricenote') expect([d.style.fillColor, (d as Drawing & { labelColor?: string }).labelColor, d.text?.color, d.text?.size, d.text?.vAlign]).toEqual([TV_LINE_COLOR, '#FFFFFF', TV_LINE_COLOR, 14, 'top']);
            expect((deserializeDrawing(d.serialize()) as Drawing & { tv?: boolean }).tv).toBe(true);
            const oldDoc = c.type === 'signpost' ? { ...d.serialize(), anchors: [...d.serialize().anchors, { time: 100, price: 600 }] } : d.serialize();
            const old = deserializeDrawing({ ...oldDoc, props: c.type === 'flagmark' ? { glyph: '⚑', size: 'normal' } : undefined }) as Drawing & { tv?: boolean };
            expect(old.tv).toBeUndefined();
        });

        it(`${c.type}: TradingView's bar, tabs and rows`, async () => {
            const s = setup(createDrawing(c.type, { id: c.type, paneId: 'price', anchors: [...c.anchors] })!);
            const tips = s.tips();
            for (const t of c.bar) expect(tips, t).toContain(t);
            for (const t of ['Bold', 'Italic', 'Icon', 'Icon size']) expect(tips, t).not.toContain(t);
            s.gear().click();
            await settled();
            expect(s.tabs()).toEqual(c.tabs);
            const roles = [...s.body('style').querySelectorAll<HTMLElement>(':scope > [data-role]')].map((e) => e.dataset.role!);
            expect(roles).toEqual(c.rows);
        });
    }
});

import { Signpost, type Projector } from '../src/core/drawings';

describe('TradingView\'s signpost', () => {
    // One bar from high 600 to low 500 in a 1000 px pane (y = 1000 - price).
    const proj: Projector = {
        xOf: (t) => t,
        yOf: (p, pane) => (pane === 'price' ? 1000 - p : null),
        pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
        paneIdAtY: () => 'price',
        paneRect: () => ({ top: 0, height: 1000 }),
        barsInRange: () => [{ time: 100, open: 520, high: 600, low: 500, close: 580 }],
        width: 2000,
        height: 1000,
    };
    const sp = (): Signpost => createDrawing('signpost', { id: 's', paneId: 'price', anchors: [{ time: 100, price: 0 }] })! as Signpost;

    it('one point; 50 % sits halfway from the high to the pane top; the pole stops 3 px off the candle', () => {
        const d = sp();
        expect(d.anchorSchema().min).toBe(1);
        expect([d.position, d.showImage, d.emoji, d.plateColor]).toEqual([50, false, '🙂', TV_LINE_COLOR]);
        const L = d.tvLayout(proj, { w: 60, h: 24 })!;
        expect(L.handleY).toBe(200); // the high at y 400, halfway to 0
        expect([L.box.y, L.box.h, L.poleFrom, L.poleTo]).toEqual([200, 24, 397, 224]);
    });

    it('a negative position hangs below the low; the label never covers the candle', () => {
        const d = sp();
        d.applySettings({ position: -50 });
        const L = d.tvLayout(proj, { w: 60, h: 24 })!;
        expect(L.handleY).toBe(750); // the low at y 500, halfway to 1000
        expect(L.box.y).toBe(726);
        d.applySettings({ position: 0.5 });
        expect(d.tvLayout(proj, { w: 60, h: 24 })!.box.y + 24).toBeLessThanOrEqual(397);
    });

    it('the emoji plate sits between the label and the candle; the handle slides the position', () => {
        const d = sp();
        d.applySettings({ showImage: true });
        const L = d.tvLayout(proj, { w: 60, h: 24 })!;
        expect(L.plate).toEqual({ cx: 100, cy: 200 + 24 + 10 + 35, r: 35 });
        expect(L.poleTo).toBe(200 + 24 + 80);
        d.dragHandlePx(0, 100, 100, proj); // three quarters of the way up
        expect(d.position).toBe(75);
        expect(d.handleCursor(0)).toBe('ns-resize');
    });
});
