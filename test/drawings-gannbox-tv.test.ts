// @vitest-environment jsdom
// Gann box, TradingView parity (audit 2026-10-31, factory defaults, renderer and dialog read from TradingView's module 850509).
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

import { createDrawing, deserializeDrawing, GannBox, TV_GANN_BOX_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
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
// box from (100, y300) to (500, y700): first point top-left (price 700), second bottom-right (price 300)
const two = [{ time: 100, price: 700 }, { time: 500, price: 300 }];
const box = (props?: Record<string, unknown>): GannBox => createDrawing('gannbox', { id: 'g', paneId: 'price', anchors: two, ...(props ? { props } : {}) })! as GannBox;
const horiz = (d: GannBox) => d.entryLines(proj)!.filter((l) => l.y1 === l.y2 && l.x1 !== l.x2);
const vert = (d: GannBox) => d.entryLines(proj)!.filter((l) => l.x1 === l.x2 && l.y1 !== l.y2);

describe('Gann box (TradingView)', () => {
    it('a new one: 7 price and 7 time levels in TradingView\'s colours; 2 px solid; all labels; both backgrounds at 80 %; no Angles', () => {
        const d = box();
        expect(d.tv).toBe(true);
        const want = [[0, '#808080'], [0.25, '#FF9800'], [0.382, '#00BCD4'], [0.5, '#4CAF50'], [0.618, '#089981'], [0.75, '#2962FF'], [1, '#808080']];
        expect(d.levels.map((l) => [l.ratio, l.color.toUpperCase()])).toEqual(want);
        expect(d.timeLevels!.map((l) => [l.ratio, l.color.toUpperCase()])).toEqual(want);
        expect(TV_GANN_BOX_LEVELS).toHaveLength(7);
        expect([d.style.lineWidth, d.style.lineStyle]).toEqual([2, 'solid']);
        expect([d.labelsLeft, d.labelsRight, d.labelsTop, d.labelsBottom]).toEqual([true, true, true, true]);
        expect([d.fillPrice, d.fillOpacity, d.fillTime, d.fillTimeOpacity]).toEqual([true, 0.2, true, 0.2]);
        expect([d.angles, d.anglesColor!.toUpperCase(), d.reverse]).toEqual([false, '#9C9C9C', false]);
    });

    it('price lines across the box from the first point (0) to the second (1), time lines down it; no diagonals', () => {
        const d = box();
        expect(horiz(d).map((l) => +l.y1.toFixed(3))).toEqual([300, 400, 452.8, 500, 547.2, 600, 700]);
        expect(vert(d).map((l) => +l.x1.toFixed(3))).toEqual([100, 200, 252.8, 300, 347.2, 400, 500]);
        expect(d.entryLines(proj)!.some((l) => l.x1 !== l.x2 && l.y1 !== l.y2)).toBe(false);
        d.applySettings({ reverse: true });
        expect(horiz(d)[0]!.y1).toBe(700);
        expect(vert(d)[0]!.x1).toBe(500);
    });

    it('labels: left 5 px out, right 5 px out, top above, bottom below', () => {
        const d = box();
        const l = horiz(d)[1]!;
        expect([l.numberText, l.numberX, l.numberAlign]).toEqual(['0.25', 95, 'right']);
        const r = d.entryLines(proj)!.find((e) => e.x1 === 500 && e.x2 === 500 && e.y1 === 400)!;
        expect([r.numberText, r.numberX, r.numberAlign]).toEqual(['0.25', 505, 'left']);
        const t = vert(d)[1]!;
        expect([t.numberText, t.numberY]).toEqual(['0.25', 291]);
        const b = d.entryLines(proj)!.find((e) => e.x1 === 200 && e.y1 === 700 && e.y2 === 700)!;
        expect(b.numberY).toBe(711);
    });

    it('bands between shown levels in the later level\'s colour, each axis at its own opacity', () => {
        const d = box();
        d.applySettings({ fillTimeOpacity: 0.5 });
        const b = d.fillBands(proj);
        expect(b).toHaveLength(12);
        expect([b[0]!.y, b[0]!.h, b[0]!.color.toUpperCase(), b[0]!.alpha]).toEqual([300, 100, '#FF9800', 0.2]);
        expect(b[6]!.alpha).toBe(0.5);
        d.applySettings({ fillPrice: false });
        expect(d.fillBands(proj)).toHaveLength(6);
    });

    it('Angles: from every corner to each level point on the far sides', () => {
        const d = box();
        d.applySettings({ angles: true });
        const ang = d.entryLines(proj)!.filter((l) => l.color.toUpperCase() === '#9C9C9C');
        expect(ang).toHaveLength(56);
        expect(ang[0]).toMatchObject({ x1: 100, y1: 700, x2: 100, y2: 300 });
    });

    it('handles on the other two corners; dragging one moves one point\'s time and the other\'s price', () => {
        const d = box();
        expect(d.handlePoints(proj)).toEqual([[100, 300], [500, 700], [100, 700], [500, 300]]);
        d.dragHandlePx(3, 600, 250, proj);
        expect(d.anchors).toEqual([{ time: 100, price: 750 }, { time: 600, price: 300 }]);
    });

    it('the bar\'s colour sets every level and the Angles; the look survives a save; one saved before keeps its diagonals', () => {
        const d = box();
        d.applySettings({ 'style.lineColor': '#00ff00', 'timeLevels.2.enabled': false });
        expect([...d.levels, ...d.timeLevels!].every((l) => l.color === '#00ff00') && d.anglesColor === '#00ff00').toBe(true);
        const back = deserializeDrawing(d.serialize()) as GannBox;
        expect([back.tv, back.timeLevels![2]!.enabled, back.fillTimeOpacity]).toEqual([true, false, 0.2]);
        const old = box({ levels: [{ ratio: 0, color: '#123456', enabled: true }, { ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        expect(old.entryLines(proj)!.some((l) => l.x1 !== l.x2 && l.y1 !== l.y2)).toBe(true);
    });

    it('bar: colour, width, style; dialog: Price levels, Time levels, Use one color, Angles, Reverse', async () => {
        const s = setup(box());
        const tips = s.tips();
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips.indexOf('Line style')).toBeGreaterThan(tips.indexOf('Line width'));
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Gann box');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^(level|timeLevels)-\d+$|^level-(ratio|color)$/.test(r));
        expect(roles).toEqual(['fib-levels', 'left-labels', 'right-labels', 'price-background', 'fib-timeLevels', 'top-labels', 'bottom-labels', 'time-background', 'one-color', 'angles', 'reverse']);
        const text = st.textContent!;
        expect(text.indexOf('Price levels')).toBeLessThan(text.indexOf('Time levels'));
    });
});
