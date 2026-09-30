import { describe, it, expect } from 'vitest';
import { PriceAlert, createDrawing, deserializeDrawing, buildToolbar, type Projector } from '../src/core/drawings';

const proj: Projector = {
    xOf: (t) => t,
    yOf: (price) => 1000 - price,
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    width: 500,
    height: 1000,
};

function make(): PriceAlert {
    const d = createDrawing('pricealert', { paneId: 'price', anchors: [{ time: 0, price: 300 }] });
    if (!(d instanceof PriceAlert)) throw new Error('expected a PriceAlert');
    return d;
}

describe('PriceAlert drawing', () => {
    it('round-trips its alert state through props', () => {
        const d = make();
        d.applyProps({ label: 'BTCUSDT Crossing', trigger: 'Every time', active: false });
        const back = deserializeDrawing(d.serialize());
        expect(back).toBeInstanceOf(PriceAlert);
        expect((back as PriceAlert).alert).toMatchObject({ label: 'BTCUSDT Crossing', trigger: 'Every time', active: false, sound: true });
    });

    it('hits only near the plot edge at its price, never across the whole width', () => {
        const d = make(); // price 300 -> y 700
        expect(d.hitTest(490, 700, proj, 4)).toBe(true);
        expect(d.hitTest(490, 730, proj, 4)).toBe(false);
        expect(d.hitTest(100, 700, proj, 4)).toBe(false);
    });

    it('is drag-free on y only, and never widens the autoscale', () => {
        const d = make();
        expect(d.anchorSchema().slots).toEqual([{ role: 'p', free: 'y' }]);
        expect(d.priceRange()).toBeNull();
        expect(d.timeExtent()).toBeNull();
    });

    it('is not offered as a toolbar tool', () => {
        const all = JSON.stringify(buildToolbar(true).definition);
        expect(all).not.toContain('pricealert');
    });
});
