// @vitest-environment jsdom
// TradingView's plain shapes and cycles (audit 2026-10-31, factory defaults read from modules 565760 triangle, 631559
// polyline, 238807 arc, 499867 curve, 481599 double curve, 967139 cyclic lines, 34424 time cycles, 532591 sine line; dialogs and bars read on live shapes): colours, Background, no text,
// dialog rows and tabs, and the bar of each. One saved before (no props) keeps its look.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, TV_LINE_COLOR, type Drawing, type SegmentDrawing } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));
const three = [{ time: 100, price: 500 }, { time: 300, price: 520 }, { time: 200, price: 600 }];

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
    { type: 'triangle', anchors: three, color: '#089981', fill: true, tabs: ['Style', 'Coordinates', 'Visibility'], rows: ['border', 'background'], bar: ['Line color', 'Fill', 'Line width'] },
    { type: 'polyline', anchors: three, color: '#00bcd4', fill: true, tabs: ['Style', 'Visibility'], rows: ['border', 'background'], bar: ['Line color', 'Fill', 'Line width', 'Line style'] },
    { type: 'arc', anchors: three, color: '#e91e63', fill: true, tabs: ['Style', 'Visibility'], rows: ['border', 'background'], bar: ['Line color', 'Fill', 'Line width'] },
    { type: 'curve', anchors: three, color: TV_LINE_COLOR, fill: false, tabs: ['Style', 'Coordinates', 'Visibility'], rows: ['line', 'background'], bar: ['Line color', 'Line width', 'Line style'] },
    { type: 'doublecurve', anchors: three.slice(0, 2), color: '#673ab7', fill: false, tabs: ['Style', 'Coordinates', 'Visibility'], rows: ['line', 'background'], bar: ['Line color', 'Line width', 'Line style'] },
    // Cycles (modules 967139, 34424, 532591).
    { type: 'cycliclines', anchors: three.slice(0, 2), color: '#80ccdb', fill: false, tabs: ['Style', 'Coordinates', 'Visibility'], rows: ['lines'], bar: ['Line color', 'Line width'] },
    { type: 'timecycles', anchors: three.slice(0, 2), color: '#159980', fill: true, tabs: ['Style', 'Coordinates', 'Visibility'], rows: ['line', 'background'], bar: ['Line color', 'Fill', 'Line width', 'Line style'] },
    { type: 'sineline', anchors: three.slice(0, 2), color: '#159980', fill: false, tabs: ['Style', 'Coordinates', 'Visibility'], rows: ['lines'], bar: ['Line color', 'Line width', 'Line style'] },
] as const;

describe('TradingView\'s plain shapes', () => {
    for (const c of CASES) {
        it(`${c.type}: colours, Background, no text, saved look`, () => {
            const d = createDrawing(c.type, { id: c.type, paneId: 'price', anchors: [...c.anchors] })! as SegmentDrawing;
            expect([d.tv, d.style.lineColor, d.style.lineWidth, d.fillBackground]).toEqual([true, c.color, 2, c.fill]);
            expect(d.schema().fields.some((f) => f.path.startsWith('text.'))).toBe(false);
            d.applySettings({ fillBackground: !c.fill });
            expect((deserializeDrawing(d.serialize()) as SegmentDrawing).fillBackground).toBe(!c.fill);
            const old = deserializeDrawing({ ...d.serialize(), props: undefined }) as SegmentDrawing;
            expect(old.tv).toBeUndefined();
        });

        it(`${c.type}: TradingView's bar, tabs and rows`, async () => {
            const s = setup(createDrawing(c.type, { id: c.type, paneId: 'price', anchors: [...c.anchors] })!);
            const tips = s.tips();
            for (const t of c.bar) expect(tips, t).toContain(t);
            for (const t of ['Line color', 'Fill', 'Line width', 'Line style', 'Text color'].filter((t) => !(c.bar as readonly string[]).includes(t))) expect(tips, t).not.toContain(t);
            s.gear().click();
            await settled();
            expect(s.tabs()).toEqual(c.tabs);
            const roles = [...s.body('style').querySelectorAll<HTMLElement>(':scope > [data-role]')].map((e) => e.dataset.role!);
            expect(roles).toEqual(c.rows);
        });
    }
});
