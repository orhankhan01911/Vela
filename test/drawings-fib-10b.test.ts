import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, type Projector } from '../src/core/drawings';

/** Linear projector: x = time, y = 100 − price, single pane 'price', 200×100 plot. */
function fakeProjector(): Projector {
    return {
        xOf: (t) => t,
        yOf: (price, paneId) => (paneId === 'price' ? 100 - price : null),
        pxToPoint: (x, y) => ({ time: x, price: 100 - y }),
        paneIdAtY: () => 'price',
        width: 200,
        height: 100,
    };
}

describe('drawings/FibCircles', () => {
    const proj = fakeProjector();
    // center (50,50)→px(50,50); edge price 80 (y20) at time 50 → R0 = 30
    const make = () => createDrawing('fibcircles', { paneId: 'price', anchors: [{ time: 50, price: 50 }, { time: 50, price: 80 }] })!;

    it('has a 2-anchor schema', () => {
        const s = make().anchorSchema();
        expect([s.min, s.max]).toEqual([2, 2]);
    });

    it('hit-tests concentric rings at R0·ratio (full circles)', () => {
        // A vertical pair spans no rectangle: a circle through both points, centred between them (50,35), radius 15.
        const d = make();
        expect(d.hitTest(65, 35, proj, 2)).toBe(true); // ring 1 to the right of center
        expect(d.hitTest(50, 42.5, proj, 2)).toBe(true); // ring 0.5 (radius 7.5) below center
        expect(d.hitTest(50, 35, proj, 2)).toBe(false); // dead center — no zero-radius ring
    });

    it("centres on the middle of the two points and fits level 1 in their rectangle, like TradingView's", () => {
        // px (20,30) and (80,50): centre (50,40), half-width 30, half-height 10.
        const d = createDrawing('fibcircles', { paneId: 'price', anchors: [{ time: 20, price: 70 }, { time: 80, price: 50 }] })!;
        expect(d.hitTest(80, 40, proj, 2)).toBe(true); // level 1, right end
        expect(d.hitTest(50, 50, proj, 2)).toBe(true); // level 1, bottom
        expect(d.hitTest(65, 40, proj, 2)).toBe(true); // level 0.5, right end
        expect(d.hitTest(50, 40, proj, 2)).toBe(false);
    });

    it('reports the anchor price span + round-trips', () => {
        expect(make().priceRange()).toEqual({ min: 50, max: 80 });
        const a = make().serialize();
        expect(deserializeDrawing(a)!.serialize()).toEqual(a);
        expect(a.type).toBe('fibcircles');
    });
});

describe('drawings/FibArcs', () => {
    const proj = fakeProjector();
    // pivot (50,50); far (80,50) → R0 = 30, semicircle facing the far anchor (the right side)
    const make = () => createDrawing('fibarcs', { paneId: 'price', anchors: [{ time: 50, price: 50 }, { time: 80, price: 50 }] })!;

    it('a saved one is a semicircle bulging toward the far anchor (the other side is empty)', () => {
        // New arcs are TradingView's (test/drawings-fibarcs-tv.test.ts); one saved before (with props) keeps this look.
        const d = createDrawing('fibarcs', { paneId: 'price', anchors: [{ time: 50, price: 50 }, { time: 80, price: 50 }], props: { levels: [{ ratio: 1, color: '#2962ff', enabled: true }] } })!;
        expect(d.hitTest(80, 50, proj, 2)).toBe(true); // ring 1 on the far (right) side
        expect(d.hitTest(20, 50, proj, 2)).toBe(false); // same radius, but the away side has no arc
    });

    it('has a 2-anchor schema + round-trips', () => {
        const s = make().anchorSchema();
        expect([s.min, s.max]).toEqual([2, 2]);
        const a = make().serialize();
        expect(deserializeDrawing(a)!.serialize()).toEqual(a);
        expect(a.type).toBe('fibarcs');
    });
});

describe('drawings/FibWedge', () => {
    const proj = fakeProjector();
    // apex (50,50); radius pt (80,50) [angle 0]; angle pt price 80 (y20) at time 50 [angle −π/2] → wedge [−π/2, 0]
    const make = () =>
        createDrawing('fibwedge', {
            paneId: 'price',
            anchors: [{ time: 50, price: 50 }, { time: 80, price: 50 }, { time: 50, price: 80 }],
        })!;

    it('has a 3-anchor schema', () => {
        const s = make().anchorSchema();
        expect([s.min, s.max]).toEqual([3, 3]);
    });

    it('draws arcs only within the wedge sweep, plus the two bounding rays', () => {
        const d = make();
        expect(d.hitTest(80, 50, proj, 2)).toBe(true); // ring 1 along the first ray (angle 0)
        expect(d.hitTest(50, 35, proj, 2)).toBe(true); // on the second bounding ray (vertical)
        expect(d.hitTest(71, 71, proj, 2)).toBe(false); // same radius but outside the wedge angle
    });

    it('reports the anchor price span + round-trips', () => {
        expect(make().priceRange()).toEqual({ min: 50, max: 80 });
        const a = make().serialize();
        expect(deserializeDrawing(a)!.serialize()).toEqual(a);
        expect(a.type).toBe('fibwedge');
    });
});

describe('drawings/FibSpiral', () => {
    const proj = fakeProjector();
    // center (50,50); edge (80,50) → R0 = 30, the spiral passes through the edge anchor
    const make = () => createDrawing('fibspiral', { paneId: 'price', anchors: [{ time: 50, price: 50 }, { time: 80, price: 50 }] })!;

    it('has a 2-anchor schema; the curve passes through the edge anchor', () => {
        const s = make().anchorSchema();
        expect([s.min, s.max]).toEqual([2, 2]);
        const d = make();
        expect(d.hitTest(80, 50, proj, 2)).toBe(true); // the edge anchor sits on the spiral (s = 0)
        expect(d.hitTest(150, 95, proj, 2)).toBe(false); // far off the curve
    });

    it('round-trips through serialize', () => {
        const a = make().serialize();
        expect(deserializeDrawing(a)!.serialize()).toEqual(a);
        expect(a.type).toBe('fibspiral');
    });
});
