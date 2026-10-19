import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, PositionTool, type DrawingTypeKey, type Projector } from '../src/core/drawings';
import { defaultToolbar } from '../src/core/drawings/toolbar';

const HR = 3600000;

/** Linear projector: x = time/hour, y = 100 − price. */
function fakeProjector(): Projector {
    return {
        xOf: (t) => t / HR,
        yOf: (price, paneId) => (paneId === 'price' ? 100 - price : null),
        pxToPoint: (x, y) => ({ time: x * HR, price: 100 - y }),
        paneIdAtY: () => 'price',
        barsBetween: (t1, t2) => Math.abs(t2 - t1) / HR,
        width: 400,
        height: 400,
    };
}

/** Place a tool with click 1 at (0 h, entry) and click 2 at (60 h, release), as the controller does. */
function place(type: DrawingTypeKey, entry: number, release: number): PositionTool {
    const d = createDrawing(type, { paneId: 'price', anchors: [{ time: 0, price: entry }, { time: 60 * HR, price: release }] }) as PositionTool;
    d.onPlaced(fakeProjector());
    return d;
}

describe('drawings/long and short position tools', () => {
    it('Long Position is a long even when dragged down; the drag sets the size', () => {
        const d = place('long-position', 50, 30);
        expect(d.type).toBe('long-position');
        expect(d.directionLabel()).toBe('LONG');
        expect(d.targetPrice).toBeCloseTo(70); // 20 above the entry, mirrored from the 20 below
        expect(d.stopPrice).toBeLessThan(50);
    });

    it('Short Position is a short even when dragged up', () => {
        const d = place('short-position', 50, 70);
        expect(d.type).toBe('short-position');
        expect(d.directionLabel()).toBe('SHORT');
        expect(d.targetPrice).toBeCloseTo(30);
        expect(d.stopPrice).toBeGreaterThan(50);
    });

    it('a bare click places the default box on each tool\'s own side', () => {
        expect(place('long-position', 50, 50).directionLabel()).toBe('LONG');
        expect(place('short-position', 50, 50).directionLabel()).toBe('SHORT');
    });

    it('the combined tool still follows the drag (saved charts, hotkey, assistant)', () => {
        expect(place('position', 50, 70).directionLabel()).toBe('LONG');
        expect(place('position', 50, 30).directionLabel()).toBe('SHORT');
    });

    it('keeps its type through save and load', () => {
        const a = place('short-position', 50, 70).serialize();
        const round = deserializeDrawing(a)!;
        expect(round.type).toBe('short-position');
        expect(round.serialize()).toEqual(a);
    });

    it('the Measurements menu lists Long Position and Short Position, not the combined tool', () => {
        const group = defaultToolbar().groups.find((g) => g.id === 'measurements')!;
        const labels = group.tools.map((t) => t.label);
        expect(labels.slice(0, 2)).toEqual(['Long Position', 'Short Position']);
        expect(labels).not.toContain('Long/Short Position');
    });
});
