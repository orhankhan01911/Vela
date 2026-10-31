import { describe, it, expect } from 'vitest';
import { vpvrLinePoints } from '../src/renderers/native/vpvr/paintVpvr';
import { vpvrLayerData } from '../src/core/native-indicators/vpvr';

// VPVR "Line" look (user 2026-10-31, Delta Dynamics' outline profile): a stepped outline along the rows' ends.
describe('VPVR line look', () => {
    const profile = {
        rowH: 10,
        maxTotal: 40,
        rows: [
            { price: 100, up: 30, down: 10 },
            { price: 110, up: 5, down: 15 },
            { price: 120, up: 0, down: 0 },
        ],
    };
    const yOf = (p: number): number => 1000 - p;

    it('steps: from the edge at the bottom, up each row at its total, back to the edge at the top', () => {
        const pts = vpvrLinePoints(profile as never, 500, -1, 200, yOf);
        expect(pts.map((p) => [p.x, p.y])).toEqual([
            [500, 900],
            [300, 900], // row 100-110: 40 of 40, the full 200 px left of the edge
            [300, 890],
            [400, 890], // row 110-120: 20 of 40
            [400, 880],
            [500, 880], // empty row stays on the edge
            [500, 870],
            [500, 870],
        ]);
        expect(pts.slice(1, 5).map((p) => p.up)).toEqual([true, true, false, false]);
    });

    it('grows right when placed on the left', () => {
        expect(vpvrLinePoints(profile as never, 0, 1, 200, yOf)[1]!.x).toBe(200);
    });

    it('reads the Look settings, Bars by default', () => {
        expect(vpvrLayerData({}).look).toBe('bars');
        const d = vpvrLayerData({ look: 'Line', lineWidth: 9 });
        expect(d.look).toBe('line');
        expect(d.lineWidth).toBe(4);
        expect(d.lineUpColor).toMatch(/^#/);
        // one click: the line brings its own fine rows; 0 falls back to the Inputs tab's
        expect(d.rows).toBe(120);
        expect(vpvrLayerData({ look: 'Line', lineRows: 0, rows: 30 }).rows).toBe(30);
        expect(vpvrLayerData({ rows: 30 }).rows).toBe(30);
    });
});
