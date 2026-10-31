// @vitest-environment jsdom
// Cypher pattern, TradingView parity (audit 2026-10-31, read from TradingView's module 262261 on the XABCD look 465795).
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

import { createDrawing, deserializeDrawing, Cypher, type Drawing, type Projector } from '../src/core/drawings';
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
// X 0, A 100, B 50, C 130, D 28
const five = [0, 100, 50, 130, 28].map((price, i) => ({ time: 100 + i * 100, price }));
const cy = (): Cypher => createDrawing('cypher', { id: 'c', paneId: 'price', anchors: five })! as Cypher;

describe('Cypher pattern (TradingView)', () => {
    it('a new one: TradingView\'s look and blue default', () => {
        const d = cy();
        expect([d.tv, d.fillBackground, d.style.lineColor, d.style.lineWidth, d.style.fillColor]).toEqual([true, true, '#2962ff', 2, '#2962ff26']);
    });

    it('ratios: XB = AB/XA, AC = XC/XA, BD = CD/BC, XD = CD/XC', () => {
        expect(cy().tvRatioLines()).toEqual([
            { from: 0, to: 2, ratio: 0.5 },
            { from: 1, to: 3, ratio: 1.3 },
            { from: 2, to: 4, ratio: 1.275 },
            { from: 0, to: 4, ratio: 0.785 },
        ]);
    });

    it('in the Patterns group after XABCD; one saved before keeps its harmonic look', () => {
        const old = deserializeDrawing({ id: 'o', type: 'cypher', paneId: 'price', anchors: five, style: { lineColor: '#2962ff', lineWidth: 1, lineStyle: 'solid' } } as Parameters<typeof deserializeDrawing>[0]) as Cypher;
        expect(old.tv).toBeFalsy();
        expect(old.patternName()).toBe('Cypher');
    });

    it('bar: line colour, text colour, width; dialog: Label, Border, Background', async () => {
        const s = setup(cy());
        const tips = s.tips();
        expect(tips.indexOf('Text color')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Text color'));
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Cypher pattern');
        const roles = [...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^text-/.test(r));
        expect(roles).toEqual(['label', 'border', 'background']);
    });
});
