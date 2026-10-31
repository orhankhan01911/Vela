// @vitest-environment jsdom
// Fib speed resistance arcs, TradingView parity (audit 2026-10-31, factory defaults and renderer read from TradingView's module 492327).
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

import { createDrawing, deserializeDrawing, FibArcs, type Drawing, type Projector } from '../src/core/drawings';
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
// p2 below p1 on screen (lower price): 30 px right, 40 px down → |p2 − p1| = 50 px
const down = [{ time: 500, price: 500 }, { time: 530, price: 460 }];
const arcs = (anchors = down, props?: Record<string, unknown>): FibArcs => createDrawing('fibarcs', { id: 'a', paneId: 'price', anchors, ...(props ? { props } : {}) })! as FibArcs;

describe('Fib speed resistance arcs (TradingView)', () => {
    it('a new one: the circles\' 11 levels and colours, 2 px solid; bands on at 80 %; dashed grey 2 px trend line; half circles', () => {
        const d = arcs();
        expect(d.tv).toBe(true);
        expect(d.levels.map((l) => [l.ratio, l.color.toUpperCase(), l.enabled, l.lineWidth])).toEqual(
            [
                [0.236, '#F23645'], [0.382, '#FF9800'], [0.5, '#4CAF50'], [0.618, '#089981'], [0.786, '#00BCD4'], [1, '#808080'],
                [1.618, '#2962FF'], [2.618, '#E91E63'], [3.618, '#2962FF'], [4.236, '#E91E63'], [4.618, '#F23645'],
            ].map(([r, c]) => [r, c, true, 2]),
        );
        expect([d.background, d.fillOpacity, d.showLevels, d.fullCircles]).toEqual([true, 0.2, true, false]);
        expect([d.trendline, d.trendColor, d.trendWidth, d.trendStyle]).toEqual([true, '#808080', 2, 'dashed']);
        expect(d.boundingLines(proj)).toEqual([]);
        expect(d.trendSegment(proj)).toEqual([500, 500, 530, 540]);
    });

    it('centred on p1, radius |p2 − p1| x coefficient; lower half when p2 is below, upper when above, whole with Full circles', () => {
        const g = arcs().radial(proj)!;
        expect([g.cx, g.cy, g.R0, g.a0, g.a1, g.dir]).toEqual([500, 500, 50, 0, Math.PI, 1]);
        const up = arcs([{ time: 500, price: 500 }, { time: 530, price: 540 }]).radial(proj)!;
        expect([up.a0, up.a1, up.dir]).toEqual([Math.PI, Math.PI * 2, -1]);
        const full = arcs();
        full.applySettings({ fullCircles: true });
        expect([full.radial(proj)!.a0, full.radial(proj)!.a1]).toEqual([0, Math.PI * 2]);
    });

    it('each number ends 4 px left of where its circle crosses the vertical through p1, on p2\'s side', () => {
        const d = arcs();
        const g = d.radial(proj)!;
        expect(d.ringLabel(g, 25)).toEqual({ x: 496, y: 525, align: 'right' });
        const u = arcs([{ time: 500, price: 500 }, { time: 530, price: 540 }]);
        expect(u.ringLabel(u.radial(proj)!, 25).y).toBe(475);
    });

    it('the arc on p2\'s side is clickable, the other half is not (unless Full circles)', () => {
        const d = arcs();
        expect(d.hitTest(500, 550, proj, 3)).toBe(true); // level 1, straight down
        expect(d.hitTest(500, 450, proj, 3)).toBe(false); // straight up
        d.applySettings({ fullCircles: true });
        expect(d.hitTest(500, 450, proj, 3)).toBe(true);
    });

    it('the TradingView look survives a save; one saved before keeps its look (bulge toward p2, baseline)', () => {
        const d = arcs();
        d.applySettings({ fullCircles: true, 'levels.0.lineWidth': 3 });
        const back = deserializeDrawing(d.serialize()) as FibArcs;
        expect([back.tv, back.fullCircles, back.levels[0]!.lineWidth]).toEqual([true, true, 3]);
        const old = arcs(down, { levels: [{ ratio: 1, color: '#123456', enabled: true }] });
        expect(old.tv).toBeUndefined();
        expect(old.boundingLines(proj)).toHaveLength(1);
        expect(old.trendSegment(proj)).toBeNull();
    });

    it('bar: colour and width, no style; dialog: Trend line, the 11 levels, Use one color, Background, Levels, Full circles', async () => {
        const s = setup(arcs());
        const tips = s.tips();
        expect(tips.indexOf('Line color')).toBeGreaterThan(-1);
        expect(tips.indexOf('Line width')).toBeGreaterThan(tips.indexOf('Line color'));
        expect(tips).not.toContain('Line style');
        s.gear().click();
        await settled();
        expect(s.dialog()).toContain('Fib speed resistance arcs');
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/^level-\d+-(coeff|line)$/.test(r));
        expect(roles).toEqual(['trend-line', ...Array.from({ length: 11 }, (_, i) => `level-${i}`), 'one-color', 'background', 'levels', 'full-circles']);
        expect(st.textContent).not.toContain('Coeffs as percents');
    });
});
