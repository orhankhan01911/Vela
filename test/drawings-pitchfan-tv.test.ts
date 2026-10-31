// @vitest-environment jsdom
// Pitchfan, TradingView parity (audit 2026-10-31, factory defaults and renderer read from TradingView's module 342161, dialog 939865).
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

import { createDrawing, deserializeDrawing, Pitchfan, PITCHFAN_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
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
// pivot (500,500); p2 (700,400), p3 (700,600) → M (700,500), half-side (0,100)
const pts = [{ time: 500, price: 500 }, { time: 700, price: 600 }, { time: 700, price: 400 }];
const fan = (n = 3): Pitchfan => createDrawing('pitchfan', { id: 'p', paneId: 'price', anchors: pts.slice(0, n) })! as Pitchfan;
const dir = (s: [number, number, number, number]): number => Math.atan2(s[3] - s[1], s[2] - s[0]);

describe('Pitchfan (TradingView)', () => {
    it('a new one: TradingView\'s 9 levels and colours, 0.5 and 1 on, 2 px solid; red 2 px median; background on at 80 %', () => {
        const d = fan();
        expect(d.levels.map((l) => [l.ratio, l.color.toLowerCase(), l.enabled, l.lineWidth, l.lineStyle])).toEqual([
            [0.25, '#ffb74d', false, 2, 'solid'], [0.382, '#81c784', false, 2, 'solid'], [0.5, '#00bcd4', true, 2, 'solid'],
            [0.618, '#089981', false, 2, 'solid'], [0.75, '#00bcd4', false, 2, 'solid'], [1, '#2962ff', true, 2, 'solid'],
            [1.5, '#9c27b0', false, 2, 'solid'], [1.75, '#e91e63', false, 2, 'solid'], [2, '#f77c80', false, 2, 'solid'],
        ]);
        expect(PITCHFAN_LEVELS).toHaveLength(9);
        expect([d.medianColor.toLowerCase(), d.medianWidth, d.medianStyle, d.background, d.fillOpacity]).toEqual(['#f23645', 2, 'solid', true, 0.2]);
    });

    it('the median is a ray from the pivot through M, the side line joins p2 and p3, each level two rays through M ± ratio·half', () => {
        const g = fan().geometry(proj)!;
        const c = g.colored!;
        expect(dir(c[0]!.seg)).toBeCloseTo(0); // median → right through (700,500)
        expect(c[0]!.color.toLowerCase()).toBe('#f23645');
        expect(c[1]!.seg).toEqual([700, 400, 700, 600]); // side line
        const level = c.slice(2);
        expect(level).toHaveLength(4); // 0.5 and 1, both sides
        expect(dir(level[0]!.seg)).toBeCloseTo(Math.atan2(50, 200)); // 0.5: through (700,550)
        expect(dir(level[1]!.seg)).toBeCloseTo(Math.atan2(-50, 200));
        expect(dir(level[2]!.seg)).toBeCloseTo(Math.atan2(100, 200)); // 1: through p3
        expect(level[2]!.color.toLowerCase()).toBe('#2962ff');
    });

    it('bands: each level\'s wedge back to the previous shown level (the median first), in its colour; Background off: none', () => {
        const d = fan();
        const f = d.geometry(proj)!.fills!;
        expect(f).toHaveLength(4);
        expect(f[0]!.color.toLowerCase()).toBe('#00bcd4');
        expect(f[0]!.pts[0]).toEqual([500, 500]);
        expect(Math.atan2(f[0]!.pts[2]![1] - 500, f[0]!.pts[2]![0] - 500)).toBeCloseTo(0); // back to the median
        expect(Math.atan2(f[2]!.pts[2]![1] - 500, f[2]!.pts[2]![0] - 500)).toBeCloseTo(Math.atan2(50, 200)); // 1 back to 0.5
        d.applySettings({ background: false });
        expect(d.geometry(proj)!.fills).toEqual([]);
    });

    it('while placing, the median runs through the second point; a click on a ray selects it', () => {
        const g = fan(2).geometry(proj)!;
        expect(g.colored).toHaveLength(1);
        expect(dir(g.colored![0]!.seg)).toBeCloseTo(Math.atan2(-100, 200));
        expect(fan().hitTest(1100, 500, proj, 3)).toBe(true); // on the median far right
    });

    it('survives a save', () => {
        const d = fan();
        d.applySettings({ 'levels.0.enabled': true, medianStyle: 'dashed' });
        const back = deserializeDrawing(d.serialize()) as Pitchfan;
        expect([back.type, back.levels[0]!.enabled, back.medianStyle, back.levels.length]).toEqual(['pitchfan', true, 'dashed', 9]);
    });

    it('bar: colour and width; dialog: Median, the 9 levels, Use one color, Background (no Extend lines, no Style)', async () => {
        const s = setup(fan());
        const tips = s.tips();
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Pitchfan');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^level-\d+-(coeff|line)$/.test(r));
        expect(roles).toEqual(['median-line', ...Array.from({ length: 9 }, (_, i) => `level-${i}`), 'one-color', 'background']);
    });
});
