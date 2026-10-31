// @vitest-environment jsdom
// The Fib channel, TradingView parity (audit 2026-10-31, TradingView's module 543085): the retracement's 24 levels and
// colours, each level the A->B line shifted by coefficient x the A->C offset; bands between shown levels in the first
// one's colour at 80 % transparency; "coefficient (price)" labels left of each level's left end; Extend left / right;
// dialog without Trend line, Reverse, Text or log rows; floating bar with the line colour only; no alerts.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, FibChannel, TV_FIB_RETRACEMENT_LEVELS, type Drawing, type Projector } from '../src/core/drawings';
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
    width: 2000,
    height: 1000,
};
// Baseline A(100, 400) -> B(300, 400); C(120, 500): offset (20 px right, 100 up).
const abc = [{ time: 100, price: 400 }, { time: 300, price: 400 }, { time: 120, price: 500 }];
const ch = (props?: Record<string, unknown>): FibChannel => createDrawing('fibchannel', { id: 'c', paneId: 'price', anchors: abc, ...(props ? { props } : {}) })! as FibChannel;

describe('Fib channel (TradingView)', () => {
    it('a new one: 24 levels, 2 px solid, bands at 80 % transparency, labels left middle 12 px, no extend', () => {
        const d = ch();
        expect(d.tv).toBe(true);
        expect(d.levels).toEqual(TV_FIB_RETRACEMENT_LEVELS);
        expect([d.style.lineWidth, d.style.lineStyle, d.background, d.fillOpacity, d.extendLeft, d.extendRight]).toEqual([2, 'solid', true, 0.2, false, false]);
        expect([d.showLevels, d.levelsAsPercent, d.showPrices, d.labelH, d.labelV, d.fontSize]).toEqual([true, false, true, 'left', 'middle', 12]);
    });

    it('each level is the baseline shifted by coefficient x (C - A), sideways too', () => {
        const e = ch().entryLines(proj)!;
        const one = e.find((l) => l.ratio === 1)!;
        expect([one.x1, one.y1, one.x2, one.y2]).toEqual([120, 500, 320, 500]);
        expect(e[0]!.numberText).toBe('0 (400.00)');
        expect([one.numberX, one.numberAlign, one.numberY]).toEqual([116, 'right', 500]);
    });

    it('extend right reaches the screen edge along the level; the label stays at its left end', () => {
        const d = ch();
        d.applySettings({ extendRight: true });
        const one = d.entryLines(proj)!.find((l) => l.ratio === 1)!;
        expect([one.x1, one.x2]).toEqual([120, 2000]);
        expect(one.numberX).toBe(116);
    });

    it('bands between consecutive shown levels, in the first one\'s colour; Background off removes them', () => {
        const d = ch();
        const bands = d.fillPolygons(proj);
        expect(bands).toHaveLength(10);
        expect(bands[0]!.color).toBe(TV_FIB_RETRACEMENT_LEVELS[0]!.color);
        d.applySettings({ background: false });
        expect(d.fillPolygons(proj)).toEqual([]);
    });

    it('the look survives a save; one saved before keeps its look (numbers right of the lines, no bands)', () => {
        const d = ch();
        d.applySettings({ fontSize: 16, labelH: 'right' });
        const back = deserializeDrawing(d.serialize()) as FibChannel;
        expect([back.tv, back.fontSize, back.labelH]).toEqual([true, 16, 'right']);
        const old = ch({ levels: [{ ratio: 0, color: '#123456', enabled: true }, { ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        expect(old.entryLines(proj)![1]!.numberText).toBe('1');
        expect(old.fillPolygons(proj)).toEqual([]);
    });

    it('bar: line colour only; dialog: TradingView\'s title and rows (no Trend line, Reverse, Text or log)', async () => {
        const s = setup(ch());
        expect(s.tips()).toContain('Line color');
        expect(s.tips()).not.toContain('Line width');
        expect(s.tips()).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Fib channel');
        const text = s.body('style').textContent!;
        const order = ['Levels line', 'Extend', 'Use one color', 'Background', 'Prices', 'Levels', 'Labels', 'Font size'];
        let at = -1;
        for (const w of order) {
            const i = text.indexOf(w, at + 1);
            expect(i, w).toBeGreaterThan(at);
            at = i;
        }
        for (const w of ['Trend line', 'Reverse', 'Text', 'log scale']) expect(text, w).not.toContain(w);
    });
});
