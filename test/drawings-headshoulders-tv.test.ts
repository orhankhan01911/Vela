// @vitest-environment jsdom
// Head and shoulders, TradingView parity (audit 2026-10-31, read from TradingView's module 436074).
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

import { createDrawing, deserializeDrawing, HeadShoulders, type Drawing, type Projector } from '../src/core/drawings';
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
const seven = [300, 550, 400, 700, 420, 550, 300].map((price, i) => ({ time: 100 + i * 100, price }));
const hs = (): HeadShoulders => createDrawing('headshoulders', { id: 'h', paneId: 'price', anchors: seven })! as HeadShoulders;

describe('Head and shoulders (TradingView)', () => {
    it('a new one: TradingView\'s look, green 2 px line, green background at 85 % transparency', () => {
        const d = hs();
        expect([d.tv, d.fillBackground, d.textColor, d.style.lineColor, d.style.lineWidth, d.style.fillColor]).toEqual([true, true, '#FFFFFF', '#089981', 2, '#08998126']);
        expect(d.vertexLabels()).toEqual(['', 'Left Shoulder', '', 'Head', '', 'Right Shoulder', '']);
        expect(d.tvRatioLines()).toEqual([]);
    });

    it('one saved before (no props) keeps its look', () => {
        const old = deserializeDrawing({ id: 'o', type: 'headshoulders', paneId: 'price', anchors: seven, style: { lineColor: '#2962ff', lineWidth: 1, lineStyle: 'solid' } } as Parameters<typeof deserializeDrawing>[0]) as HeadShoulders;
        expect(old.tv).toBeFalsy();
    });

    it('bar: line colour, background, text colour, width; dialog: Label, Border, Background', async () => {
        const s = setup(hs());
        const tips = s.tips();
        const at = (t: string): number => tips.indexOf(t);
        expect(at('Line color')).toBeGreaterThan(-1);
        expect([at('Fill') > at('Line color'), at('Text color') > at('Fill'), at('Line width') > at('Text color')]).toEqual([true, true, true]);
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Head and shoulders');
        const roles = [...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^text-/.test(r));
        expect(roles).toEqual(['label', 'border', 'background']);
    });
});
