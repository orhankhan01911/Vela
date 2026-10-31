// @vitest-environment jsdom
// XABCD pattern, TradingView parity (audit 2026-10-31, read from TradingView's modules 589610, 465795, 61444, 266806).
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

import { createDrawing, deserializeDrawing, XABCD, type Drawing, type Projector } from '../src/core/drawings';
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
const five = [{ time: 100, price: 300 }, { time: 200, price: 700 }, { time: 300, price: 450 }, { time: 400, price: 650 }, { time: 500, price: 350 }];
const x = (props?: Record<string, unknown>): XABCD =>
    createDrawing('xabcd', { id: 'x', paneId: 'price', anchors: five, style: { lineColor: '#2962ff', lineWidth: 2, lineStyle: 'solid', fillColor: '#2962ff26' }, ...(props ? { props } : {}) })! as XABCD;

describe('XABCD pattern (TradingView)', () => {
    it('a new one: TradingView\'s look, background on, white 12 px labels', () => {
        const d = x();
        expect([d.tv, d.fillBackground, d.textColor, d.fontSize, d.labelBold, d.labelItalic]).toEqual([true, true, '#FFFFFF', 12, false, false]);
    });

    it('the registry gives TradingView\'s blue 2 px line and its background at 85 % transparency', () => {
        const d = createDrawing('xabcd', { id: 'y', paneId: 'price', anchors: five })!;
        expect([d.style.lineColor, d.style.lineWidth, d.style.fillColor]).toEqual(['#2962ff', 2, '#2962ff26']);
    });

    it('ratios: XB = AB/XA, AC = BC/AB, BD = CD/BC, XD = AD/XA, to 3 decimals', () => {
        expect(x().tvRatioLines()).toEqual([
            { from: 0, to: 2, ratio: 0.625 },
            { from: 1, to: 3, ratio: 0.8 },
            { from: 2, to: 4, ratio: 1.5 },
            { from: 0, to: 4, ratio: 0.875 },
        ]);
    });

    it('survives a save; one saved before (no props) keeps its old look', () => {
        const d = x();
        d.applySettings({ fillBackground: false, textColor: '#000000', fontSize: 14, labelBold: true });
        const back = deserializeDrawing(d.serialize()) as XABCD;
        expect([back.tv, back.fillBackground, back.textColor, back.fontSize, back.labelBold]).toEqual([true, false, '#000000', 14, true]);
        const old = deserializeDrawing({ id: 'o', type: 'xabcd', paneId: 'price', anchors: five, style: { lineColor: '#2962ff', lineWidth: 1, lineStyle: 'solid' } } as Parameters<typeof deserializeDrawing>[0]) as XABCD;
        expect(old.tv).toBeFalsy();
        expect(old.serialize().props).toBeUndefined();
    });

    it('bar: line colour, text colour, width; dialog: Label, Border, Background', async () => {
        const s = setup(x());
        const tips = s.tips();
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips.indexOf('Text color')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Text color'));
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('XABCD pattern');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^text-/.test(r));
        expect(roles).toEqual(['label', 'border', 'background']);
    });
});
