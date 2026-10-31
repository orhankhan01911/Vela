// @vitest-environment jsdom
// Gann fan, TradingView parity (audit 2026-10-31, factory defaults, renderer and dialog read from TradingView's module 154448).
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

import { createDrawing, deserializeDrawing, GannFan, TV_GANN_FAN_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
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
// first point (100, y 500); second 80 px right and 80 px up
const two = [{ time: 100, price: 500 }, { time: 180, price: 580 }];
const fan = (props?: Record<string, unknown>): GannFan => createDrawing('gannfan', { id: 'f', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as GannFan;

describe('Gann fan (TradingView)', () => {
    it('a new one: TradingView\'s 9 levels 1/8 .. 8/1 in its colours, 2 px solid; background on at 80 %; labels', () => {
        const d = fan();
        expect(d.tv).toBe(true);
        expect(d.levels.map((l) => [l.label, l.color.toUpperCase(), l.enabled, l.lineWidth, l.lineStyle])).toEqual([
            ['1/8', '#FF9800'], ['1/4', '#089981'], ['1/3', '#4CAF50'], ['1/2', '#089981'], ['1/1', '#00BCD4'],
            ['2/1', '#2962FF'], ['3/1', '#9C27B0'], ['4/1', '#E91E63'], ['8/1', '#F23645'],
        ].map(([l, c]) => [l, c, true, 2, 'solid']));
        expect(TV_GANN_FAN_LEVELS).toHaveLength(9);
        expect([d.background, d.fillOpacity, d.showLabels]).toEqual([true, 0.2, true]);
    });

    it('1/8 is the steepest (full rise in 1/8 of the run), 8/1 the flattest; 1/1 through the second point; labels at the corner points', () => {
        const e = fan().entryLines(proj)!;
        const corner = (i: number): [number, number] => [e[i]!.numberX, e[i]!.numberY];
        expect(corner(0)).toEqual([110, 420]); // 1/8
        expect(corner(4)).toEqual([180, 420]); // 1/1
        expect(corner(8)).toEqual([180, 490]); // 8/1
        expect(e[0]!.numberText).toBe('1/8');
        expect([e[0]!.x1, e[0]!.y1]).toEqual([100, 500]);
        expect(Math.atan2(e[8]!.y2 - 500, e[8]!.x2 - 100)).toBeCloseTo(Math.atan2(-10, 80)); // ray through its corner, onward
    });

    it('bands: levels 1-3 fill to the next ray, 5-9 to the previous, 1/2 none; each in its own colour', () => {
        const f = fan().fillPolygons(proj);
        expect(f).toHaveLength(8);
        expect(f.map((p) => p.color.toUpperCase())).toEqual(['#FF9800', '#089981', '#4CAF50', '#00BCD4', '#2962FF', '#9C27B0', '#E91E63', '#F23645']);
        const d = fan();
        d.applySettings({ background: false });
        expect(d.fillPolygons(proj)).toEqual([]);
    });

    it('the bar sets every level; the look survives a save; one saved before keeps its look', () => {
        const d = fan();
        d.applySettings({ 'style.lineColor': '#00ff00', 'style.lineWidth': 3, 'levels.0.enabled': false });
        expect(d.levels.every((l) => l.color === '#00ff00' && l.lineWidth === 3)).toBe(true);
        const back = deserializeDrawing(d.serialize()) as GannFan;
        expect([back.tv, back.levels[0]!.enabled, back.levels[1]!.label]).toEqual([true, false, '1/4']);
        const old = fan({ levels: [{ ratio: 2, color: '#123456', enabled: true, label: '2/1' }] });
        expect(old.tv).toBeUndefined();
        expect(old.entryLines(proj)![0]!.numberX).toBe(185);
    });

    it('bar: colour and width; dialog: the 9 levels by name, Use one color, Background, Labels', async () => {
        const s = setup(fan());
        const tips = s.tips();
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Gann fan');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!);
        expect(roles).toEqual([...Array.from({ length: 9 }, (_, i) => `level-${i}`), 'one-color', 'background', 'labels']);
        expect(st.textContent).toContain('1/8');
        expect(st.textContent).toContain('8/1');
    });
});
