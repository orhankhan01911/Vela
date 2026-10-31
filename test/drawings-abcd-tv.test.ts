// @vitest-environment jsdom
// ABCD pattern, TradingView parity (audit 2026-10-31, read from TradingView's module 154759, dialog 221463).
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

import { createDrawing, deserializeDrawing, ABCDPattern, type Drawing, type Projector } from '../src/core/drawings';
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
const four = [300, 700, 450, 650].map((price, i) => ({ time: 100 + i * 100, price }));
const ab = (): ABCDPattern => createDrawing('abcd', { id: 'a', paneId: 'price', anchors: four })! as ABCDPattern;

describe('ABCD pattern (TradingView)', () => {
    it('a new one: TradingView\'s look, green 2 px line, no background', () => {
        const d = ab();
        expect([d.tv, d.style.lineColor, d.style.lineWidth, d.style.fillColor]).toEqual([true, '#089981', 2, undefined]);
        expect(d.fillTriangles()).toEqual([]);
    });

    it('ratios BC/AB on AC and CD/BC on BD; the dotted lines take the line\'s width', () => {
        const d = ab();
        expect(d.tvRatioLines()).toEqual([{ from: 0, to: 2, ratio: 0.625 }, { from: 1, to: 3, ratio: 0.8 }]);
        expect(d.tvRatioLineWidth()).toBe(2);
        d.applySettings({ 'style.lineWidth': 3 });
        expect(d.tvRatioLineWidth()).toBe(3);
    });

    it('one saved before (no props) keeps its look', () => {
        const old = deserializeDrawing({ id: 'o', type: 'abcd', paneId: 'price', anchors: four, style: { lineColor: '#2962ff', lineWidth: 1, lineStyle: 'solid' } } as Parameters<typeof deserializeDrawing>[0]) as ABCDPattern;
        expect(old.tv).toBeFalsy();
    });

    it('bar: line colour, text colour, width; dialog: Label and Border only', async () => {
        const s = setup(ab());
        const tips = s.tips();
        expect(tips.indexOf('Text color')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Text color'));
        expect(tips).not.toContain('Fill');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('ABCD pattern');
        const roles = [...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^text-/.test(r));
        expect(roles).toEqual(['label', 'border']);
    });
});
