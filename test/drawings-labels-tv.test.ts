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
    { type: 'pricenote', anchors: [{ time: 100, price: 500 }, { time: 200, price: 560 }], rows: ['label-text', 'label-background', 'label-border', 'line-color'], bar: ['Line color', 'Fill', 'Text color'], tabs: ['Style', 'Coordinates', 'Visibility'] },
    { type: 'flagmark', anchors: [{ time: 100, price: 500 }], rows: ['flag'], bar: ['Fill'], tabs: ['Style', 'Coordinates', 'Visibility'] },
] as const;

describe('TradingView\'s labels', () => {
    for (const c of CASES) {
        it(`${c.type}: TradingView's blue; saved look kept`, () => {
            const d = createDrawing(c.type, { id: c.type, paneId: 'price', anchors: [...c.anchors] })! as Drawing & { tv?: boolean };
            expect([d.tv, d.style.lineColor]).toEqual([true, TV_LINE_COLOR]);
            if (c.type !== 'flagmark') expect([d.style.fillColor, d.text?.color]).toEqual([TV_LINE_COLOR, '#FFFFFF']);
            expect((deserializeDrawing(d.serialize()) as Drawing & { tv?: boolean }).tv).toBe(true);
            const old = deserializeDrawing({ ...d.serialize(), props: c.type === 'flagmark' ? { glyph: '⚑', size: 'normal' } : undefined }) as Drawing & { tv?: boolean };
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
