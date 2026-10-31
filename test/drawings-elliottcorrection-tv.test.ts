// @vitest-environment jsdom
// Elliott correction wave, TradingView parity (audit 2026-10-31, read from TradingView's module 356806): the impulse's
// degrees and look on 4 points labelled 0 A B C, blue 2 px; dialog Color, Line, Degree; bar colour and width.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, ElliottCorrection, tvElliottLabel, TV_CORRECTION_LABELS, type Drawing } from '../src/core/drawings';
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
    return { tips, gear, body, dialog, live: () => live };
}

const four = [600, 400, 500, 300].map((price, i) => ({ time: 100 + i * 100, price }));
const ew = (props?: Record<string, unknown>): ElliottCorrection =>
    createDrawing('elliottcorrection', { id: 'e', paneId: 'price', anchors: four, ...(props ? { props } : {}) })! as ElliottCorrection;

describe('Elliott correction wave (TradingView)', () => {
    it('a new one: TradingView\'s look, Intermediate, wave shown, #3d85c6 2 px, 4 points', () => {
        const d = ew();
        expect([d.tv, d.tvDegree, d.showWave, d.style.lineColor, d.style.lineWidth]).toEqual([true, 7, true, '#3d85c6', 2]);
        expect(d.anchorSchema().min).toBe(4);
        expect(d.tvElliottLabels()).toBe(TV_CORRECTION_LABELS);
    });

    it('TradingView\'s labels: (A) at Intermediate, b circled at Minute, C at Minor', () => {
        const at = (deg: number, i: number) => tvElliottLabel(TV_CORRECTION_LABELS, deg, i);
        expect(at(7, 1).text).toBe('(A)');
        expect([at(9, 2).text, at(9, 2).circle]).toEqual(['b', true]);
        expect(at(8, 3).text).toBe('C');
    });

    it('survives a save; one saved before keeps its look', () => {
        const d = ew();
        d.applySettings({ tvDegree: 3 });
        const back = deserializeDrawing(d.serialize()) as ElliottCorrection;
        expect([back.tv, back.tvDegree]).toEqual([true, 3]);
        expect(ew({ origin: true, degree: 'Minor' }).tv).toBeUndefined();
    });

    it('bar: colour and width; dialog: TradingView\'s title, Color, Line, Degree', async () => {
        const s = setup(ew());
        const tips = s.tips();
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips).not.toContain('Text color');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Elliott correction wave (ABC)');
        const roles = [...s.body('style').querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!);
        expect(roles).toEqual(['color', 'line', 'degree']);
    });
});
