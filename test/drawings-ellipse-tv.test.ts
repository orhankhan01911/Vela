// @vitest-environment jsdom
// Ellipse, TradingView parity (audit 2026-10-31, read from TradingView's module 604020 and a live shape): ripe red 2 px,
// the red at 20 % behind (Background switch); four handles (axis ends keep the other radius, the other axis' ends set
// it); text 14 px red, centred; dialog Style (Border, Background), Text, Coordinates, Visibility; bar like the circle's.
import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, Ellipse, type Projector } from '../src/core/drawings';

const proj: Projector = {
    xOf: (t) => t,
    yOf: (p, pane) => (pane === 'price' ? 1000 - p : null),
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    width: 2000,
    height: 1000,
};
// A level axis from x 100 to 300 at y 500; the width point 40 px above the middle.
const ell = (props?: Record<string, unknown>): Ellipse =>
    createDrawing('ellipse', { id: 'e', paneId: 'price', anchors: [{ time: 100, price: 500 }, { time: 300, price: 500 }, { time: 200, price: 540 }], ...(props ? { props } : {}) })! as Ellipse;

describe('Ellipse (TradingView)', () => {
    it('a new one: TradingView\'s colours, text and four handles', () => {
        const d = ell();
        expect([d.tv, d.fillBackground, d.style.lineColor, d.style.lineWidth, d.style.fillColor]).toEqual([true, true, '#F23645', 2, '#F2364533']);
        expect(d.textDefaults()).toMatchObject({ color: '#F23645', size: 14, hAlign: 'center', vAlign: 'center' });
        const h = d.handlePoints(proj).map(([x, y]) => [Math.round(x), Math.round(y)]);
        expect(h).toEqual([[100, 500], [300, 500], [200, 540], [200, 460]]);
    });

    it('an end of the other axis sets its radius; an axis end keeps it', () => {
        const d = ell();
        d.dragHandlePx(3, 200, 430, proj); // 70 px
        expect(d.oval(proj)!.ry).toBeCloseTo(70, 6);
        d.dragHandlePx(1, 300, 400, proj); // the axis tilts
        expect(d.oval(proj)!.ry).toBeCloseTo(70, 6);
    });

    it('Background off drops the fill; survives a save; one saved before keeps its look', () => {
        const d = ell();
        d.applySettings({ fillBackground: false });
        expect(d.filled()).toBe(false);
        expect(d.hitTest(200, 500, proj, 3)).toBe(false);
        expect((deserializeDrawing(d.serialize()) as Ellipse).fillBackground).toBe(false);
        const old = ell({ axis: true });
        expect(old.tv).toBeUndefined();
        expect(old.handlePoints(proj)).toHaveLength(3);
    });
});
