// @vitest-environment jsdom
// Trend angle, TradingView parity (audit 2026-10-31, read from TradingView's module 598177 and a live shape): its trend
// line, 2 px TradingView blue, whose far end keeps its on-screen angle and length from the first point; Extend, Middle
// point, Price labels and price / percent / pips / bars stats; no line ends, no Text tab; Coordinates: point #1 and Angle.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, TrendAngle, TV_LINE_COLOR, type Drawing, type Projector } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));

const projAt = (scale: number): Projector => ({
    xOf: (t) => t * scale,
    yOf: (p, pane) => (pane === 'price' ? 1000 - p : null),
    pxToPoint: (x, y) => ({ time: x / scale, price: 1000 - y }),
    paneIdAtY: () => 'price',
    width: 2000,
    height: 1000,
});
const proj = projAt(1);
const ang = (props?: Record<string, unknown>): TrendAngle =>
    createDrawing('trendangle', { id: 'a', paneId: 'price', anchors: [{ time: 100, price: 500 }, { time: 200, price: 600 }], ...(props ? { props } : {}) })! as TrendAngle;

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
    const tab = (name: string): HTMLElement => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].find((e) => e.textContent === name)!;
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    return { tips, gear, tabs, tab, body, live: () => live };
}

describe('Trend angle (TradingView)', () => {
    it('a new one: TradingView blue 2 px, no ends, no text, TradingView\'s four stats', () => {
        const d = ang();
        expect([d.tv, d.style.lineColor, d.style.lineWidth]).toEqual([true, TV_LINE_COLOR, 2]);
        const paths = d.schema().fields.map((f) => f.path);
        expect(paths).not.toContain('style.arrowLeft');
        expect(paths.some((p) => p.startsWith('text.'))).toBe(false);
        expect(paths.filter((p) => p.startsWith('stats.'))).toEqual(['stats.price', 'stats.percent', 'stats.pips', 'stats.bars', 'stats.position', 'stats.always']);
    });

    it('placing sets the on-screen angle and length; the far end keeps them through a zoom', () => {
        const d = ang();
        d.onPlaced(proj);
        expect(d.angleDeg).toBe(45);
        expect(d.distance).toBeCloseTo(Math.hypot(100, 100), 9);
        const zoomed = projAt(3); // the bars three times wider: the stored point moves, the drawn end does not turn
        const [p0, p1] = d.handlePoints(zoomed);
        expect(p0).toEqual([300, 500]);
        expect(p1![0]).toBeCloseTo(400, 9);
        expect(p1![1]).toBeCloseTo(400, 9);
    });

    it('the second handle sets the angle; Angle in the dialog turns it about the first point', () => {
        const d = ang();
        d.onPlaced(proj);
        expect(d.dragHandlePx(1, 100, 400, proj)).toBe(true); // straight up
        expect(d.angleDeg).toBe(90);
        expect(d.anchors[1]).toMatchObject({ time: 100, price: 600 });
        d.applySettings({ angleDeg: -30 });
        const [, p1] = d.handlePoints(proj);
        expect(p1![1]).toBeGreaterThan(500); // below the first point
        expect(d.dragHandlePx(0, 0, 0, proj)).toBe(false);
    });

    it('survives a save; one saved before keeps its look', () => {
        const d = ang();
        d.onPlaced(proj);
        d.applySettings({ extendRight: true, 'stats.bars': true });
        const back = deserializeDrawing(d.serialize()) as TrendAngle;
        expect([back.tv, back.angleDeg, back.extendRight]).toEqual([true, 45, true]);
        const old = deserializeDrawing({ ...ang().serialize(), props: undefined }) as TrendAngle;
        expect(old.tv).toBeUndefined();
        expect(old.schema().fields.map((f) => f.path)).toContain('text.value');
    });

    it('bar: colour, width, style; dialog: Style, Coordinates (#1, Angle), Visibility', async () => {
        const d = ang();
        d.onPlaced(proj);
        const s = setup(d);
        const tips = s.tips();
        for (const t of ['Line color', 'Line width', 'Line style']) expect(tips).toContain(t);
        expect(tips).not.toContain('Text color');
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Coordinates', 'Visibility']);
        const style = s.body('style').textContent!;
        let at = -1;
        for (const w of ['Line', 'Extend', 'Middle point', 'Price labels', 'Stats', 'Stats position', 'Always show stats']) {
            const i = style.indexOf(w, at + 1);
            expect(i, w).toBeGreaterThan(at);
            at = i;
        }
        s.tab('Coordinates').click();
        const coords = s.body('coordinates').textContent!;
        expect(coords).toContain('#1');
        expect(coords).toContain('Angle');
        expect(coords).not.toContain('#2');
    });
});
