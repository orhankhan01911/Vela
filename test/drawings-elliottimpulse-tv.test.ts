// @vitest-environment jsdom
// Elliott impulse wave, TradingView parity (audit 2026-10-31, read from TradingView's module 356806).
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

import { createDrawing, deserializeDrawing, ElliottImpulse, tvElliottLabel, TV_IMPULSE_LABELS, TV_ELLIOTT_DEGREES, type Drawing, type Projector } from '../src/core/drawings';
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
const six = [300, 500, 400, 650, 550, 750].map((price, i) => ({ time: 100 + i * 100, price }));
const ew = (props?: Record<string, unknown>): ElliottImpulse => createDrawing('elliottimpulse', { id: 'e', paneId: 'price', anchors: six, ...(props ? { props } : {}) })! as ElliottImpulse;

describe('Elliott impulse wave (TradingView)', () => {
    it('a new one: TradingView\'s look, Intermediate, wave shown, #3d85c6 2 px', () => {
        const d = ew();
        expect([d.tv, d.tvDegree, d.showWave, d.style.lineColor, d.style.lineWidth]).toEqual([true, 7, true, '#3d85c6', 2]);
        expect(d.anchorSchema().min).toBe(6);
    });

    it('TradingView\'s labels per degree: group, brackets / circle, size and weight', () => {
        const at = (deg: number, i: number) => tvElliottLabel(TV_IMPULSE_LABELS, deg, i);
        expect(TV_ELLIOTT_DEGREES).toHaveLength(15);
        expect(at(7, 1)).toEqual({ text: '(1)', circle: false, fontSize: 18, radius: 11, bold: false }); // Intermediate
        expect(at(8, 3).text).toBe('3'); // Minor
        expect([at(6, 1).text, at(6, 1).circle]).toEqual(['1', true]); // Primary: circled
        expect([at(9, 2).text, at(9, 2).circle, at(9, 2).fontSize]).toEqual(['ii', true, 16]); // Minute
        expect([at(5, 4).text, at(5, 4).fontSize]).toEqual(['IV', 20]); // Cycle
        expect([at(0, 5).text, at(0, 5).circle, at(0, 5).bold, at(0, 5).fontSize]).toEqual(['5', true, true, 24]); // Supermillennium
        expect([at(14, 0).text, at(14, 0).fontSize, at(14, 0).bold]).toEqual(['0', 11, true]); // Minuscule
    });

    it('survives a save; one saved before (our own degree names) keeps its look', () => {
        const d = ew();
        d.applySettings({ tvDegree: 9, showWave: false });
        const back = deserializeDrawing(d.serialize()) as ElliottImpulse;
        expect([back.tv, back.tvDegree, back.showWave]).toEqual([true, 9, false]);
        const old = ew({ origin: true, degree: 'Minor' });
        expect(old.tv).toBeUndefined();
    });

    it('bar: colour and width; dialog: Color, Line, Degree; no Text tab', async () => {
        const s = setup(ew());
        const tips = s.tips();
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips).not.toContain('Text color');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Elliott impulse wave (12345)');
        expect(s.dialog()).not.toMatch(/StyleTextCoordinates/);
        const roles = [...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!);
        expect(roles).toEqual(['color', 'line', 'degree']);
        expect(s.body('style').textContent).toContain('Intermediate');
    });
});
