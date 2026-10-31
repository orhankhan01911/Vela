// @vitest-environment jsdom
// Regression trend, TradingView parity (audit 2026-10-31, read from TradingView's modules 127345 / 998707 and a live
// shape): ±2 sample standard deviations around the least-squares base line, Pearson's R unsigned at full precision under
// the down line's start; base red dashed, up and down blue, 1 px at 30 % (lines drawn opaque, fills keep it); dialog
// Inputs / Style / Coordinates / Visibility; bar width only.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, computeTvRegression, opaqueColor, RegressionChannel, type Drawing, type Projector } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));

/** TradingView's own numbers for these 15 closes (BTCUSDT 1h, read from its regression trend 2026-10-31). */
const CLOSES = [78511.2, 78612.4, 78131.7, 77999.3, 77652.5, 77801.3, 77347.9, 77438.3, 77125.6, 77198.9, 77565.4, 77305.7, 77142.3, 76600, 76876.6];
const bars = CLOSES.map((close, i) => ({ time: i * 10, open: close, high: close + 50, low: close - 50, close }));
const proj: Projector = {
    xOf: (t) => t,
    yOf: (p, pane) => (pane === 'price' ? 100000 - p : null),
    pxToPoint: (x, y) => ({ time: x, price: 100000 - y }),
    paneIdAtY: () => 'price',
    width: 2000,
    height: 100000,
    barsInRange: (from, to) => bars.filter((b) => b.time >= from && b.time <= to),
};
const reg = (props?: Record<string, unknown>): RegressionChannel =>
    createDrawing('regressionchannel', { id: 'r', paneId: 'price', anchors: [{ time: 0, price: 0 }, { time: 140, price: 0 }], ...(props ? { props } : {}) })! as RegressionChannel;

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
    const tabs = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!);
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    const dialog = (): string => host.querySelector('.vela-drawing-dialog')!.textContent!;
    return { tips, gear, tabs, body, dialog, live: () => live };
}

describe('Regression trend (TradingView)', () => {
    it('fits like TradingView: its base line, 2 sample standard deviations, unsigned Pearson\'s R', () => {
        const f = computeTvRegression(CLOSES)!;
        expect(f.base0).toBeCloseTo(78377.1, 6);
        expect(f.base1).toBeCloseTo(76730.78, 6);
        expect(f.base0 + 2 * f.sd).toBeCloseTo(78834.77347900851, 6);
        expect(f.pearsons).toBeCloseTo(0.916951687795169, 9);
    });

    it('a new one: TradingView\'s defaults', () => {
        const d = reg();
        expect(d.tv).toBe(true);
        const t = d.trend;
        expect([t.upperDev, t.lowerDev, t.useUpper, t.useLower, t.source, t.extend, t.pearsons]).toEqual([2, -2, true, true, 'close', false, true]);
        expect([t.base.color, t.base.style, t.base.width]).toEqual(['#F236454d', 'dashed', 1]);
        expect([t.up.color, t.up.style, t.down.color]).toEqual(['#2962FF4d', 'solid', '#2962FF4d']);
        expect(opaqueColor(t.base.color)).toBe('#F23645');
    });

    it('layout: down, base, up bottom-up; handles on the base line; Pearson\'s R under the down line\'s start', () => {
        const L = reg().tvLayout(proj)!;
        expect(L.lines.map((l) => l.key)).toEqual(['down', 'base', 'up']);
        expect(L.baseY0).toBeCloseTo(100000 - 78377.1, 4);
        expect(L.lines[2]!.y0).toBeCloseTo(100000 - 78834.77347900851, 4);
        expect(L.pearsons!.text).toBe(String(computeTvRegression(CLOSES)!.pearsons));
        expect(L.pearsons!.y).toBeCloseTo(L.lines[0]!.y0 + 4, 6);
        expect([L.pearsons!.x, L.pearsons!.color]).toEqual([0, '#2962FF']);
        expect(reg().handlePoints(proj)).toEqual([[0, L.baseY0], [140, L.baseY1]]);
    });

    it('Use Lower Deviation off drops the down line and Pearson\'s R; Extend lines runs to the pane edge', () => {
        const d = reg();
        d.applySettings({ 'trend.useLower': false, 'trend.extend': true });
        const L = d.tvLayout(proj)!;
        expect(L.lines.map((l) => l.key)).toEqual(['base', 'up']);
        expect(L.pearsons).toBeNull();
        expect(L.xEnd).toBe(2000);
    });

    it('survives a save; one saved before keeps its look', () => {
        const d = reg();
        d.applySettings({ 'trend.upperDev': 3, 'trend.source': 'hl2', 'trend.base.show': false });
        const back = deserializeDrawing(d.serialize()) as RegressionChannel;
        expect([back.tv, back.trend.upperDev, back.trend.source, back.trend.base.show, back.trend.up.color]).toEqual([true, 3, 'hl2', false, '#2962FF4d']);
        const old = reg({ showR2: true });
        expect(old.tv).toBeUndefined();
        expect(old.reg.showR2).toBe(true);
    });

    it('bar: width only, setting all three lines; dialog: Inputs, Style, Coordinates, Visibility with TradingView\'s rows', async () => {
        const s = setup(reg());
        const tips = s.tips();
        expect(tips).toContain('Line width');
        expect(tips).not.toContain('Line color');
        expect(tips).not.toContain('Midline color');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Regression trend');
        expect(s.tabs()).toEqual(['Inputs', 'Style', 'Coordinates', 'Visibility']);
        const roles = (k: string): string[] => [...s.body(k).querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!);
        expect(roles('inputs')).toEqual(['upper-dev', 'lower-dev', 'use-upper', 'use-lower', 'source']);
        expect(roles('style')).toEqual(['base', 'up', 'down', 'extend', 'pearsons']);
        expect(s.body('style').textContent).toContain("Pearson's R");
    });
});
