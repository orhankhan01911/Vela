// @vitest-environment jsdom
// Three drives pattern, TradingView parity (audit 2026-10-31, read from TradingView's module 643023, dialog 221463).
// 3, 5, 8, 13, 21, 34, 55, 89 times the two points' distance, level 0 grey and the rest blue, each 2 px solid with its
// own line; the number right of each line at the pane's bottom, 12 px; bands only with Background on; a dashed grey
// 1 px trend line between the points; dialog: the levels, Use one color, Background, Labels; bar colour, width, style.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, ThreeDrives, type Drawing, type Projector } from '../src/core/drawings';
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
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    const dialog = (): string => host.querySelector('.vela-drawing-dialog')!.textContent!;
    return { tips, gear, body, dialog };
}

const proj: Projector = {
    xOf: (t) => t,
    yOf: (price, paneId) => (paneId === 'price' ? 1000 - price : null),
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    paneRect: () => ({ top: 0, height: 800 }),
    width: 2000,
    height: 1000,
};
const seven = [300, 500, 400, 600, 500, 700, 400].map((price, i) => ({ time: 100 + i * 100, price }));
const td = (): ThreeDrives => createDrawing('threedrives', { id: 't', paneId: 'price', anchors: seven })! as ThreeDrives;

describe('Three drives pattern (TradingView)', () => {
    it('seven points, deep blue 2 px, no names, no background', () => {
        const d = td();
        expect(d.anchorSchema().min).toBe(7);
        expect([d.tv, d.style.lineColor, d.style.lineWidth, d.style.fillColor]).toEqual([true, '#673ab7', 2, undefined]);
        expect(d.vertexLabels().every((l) => l === '')).toBe(true);
        expect(d.tvBackground()).toBe(false);
    });

    it('the two retracements (points 2→4 and 4→6) to 2 decimals, dotted in the line\'s width', () => {
        const d = td();
        expect(d.tvRatioLines()).toEqual([{ from: 1, to: 3, ratio: 2 }, { from: 3, to: 5, ratio: 2 }]);
        const odd = createDrawing('threedrives', { id: 'u', paneId: 'price', anchors: [300, 500, 430, 620, 500, 700, 400].map((price, i) => ({ time: i, price })) })! as ThreeDrives;
        expect(odd.tvRatioLines().map((r) => r.ratio)).toEqual([2.71, 1.67]); // 190/70, 200/120
        expect(d.tvRatioLineWidth()).toBe(2);
    });

    it('survives a save as itself', () => {
        const back = deserializeDrawing(td().serialize())!;
        expect(back).toBeInstanceOf(ThreeDrives);
        expect((back as ThreeDrives).tv).toBe(true);
    });

    it('bar: line colour, text colour, width; dialog: Label and Border', async () => {
        const s = setup(td());
        const tips = s.tips();
        expect(tips.indexOf('Text color')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Text color'));
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Three drives pattern');
        const roles = [...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^text-/.test(r));
        expect(roles).toEqual(['label', 'border']);
    });
});
