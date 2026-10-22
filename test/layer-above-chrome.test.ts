import { describe, it, expect } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';

/**
 * An `'above-chrome'` SDK layer paints over the chrome (axes, price scale) so it can put marks ON the price scale
 * (a key level's price tag). It stays out of the z-key stacking that orders the other layers around the candles.
 */
const canvas = (name: string) => ({ __layer: name, width: 800, height: 600 }) as unknown as HTMLCanvasElement;

describe("'above-chrome' renderer layers", () => {
    it('are stacked apart from the z-ordered layers, last in the export pile', () => {
        const renderer = new NativeRenderer();
        const r = renderer as unknown as Record<string, unknown>;
        const entry = (id: string, placement: string) => ({ def: { id, placement }, instance: {}, canvas: canvas(id), channel: id, owner: null });
        r.extLayers = [entry('under', 'below-data'), entry('tags', 'above-chrome'), entry('over', 'above-data')];
        r.backdropCanvas = canvas('backdrop');
        r.dataCanvas = canvas('data');
        r.volumeCanvas = canvas('volume');
        const order = (renderer as unknown as { orderedLayerCanvases(): Record<"below" | "above" | "top", { __layer: string }[]> }).orderedLayerCanvases();
        expect(order.below.map((c) => c.__layer)).toEqual(['under']);
        expect(order.above.map((c) => c.__layer)).toEqual(['over']);
        expect(order.top.map((c) => c.__layer)).toEqual(['tags']);
        const pile = (renderer as unknown as { canvasPile(): { __layer: string }[] }).canvasPile().map((c) => c.__layer);
        expect(pile).toEqual(['backdrop', 'under', 'data', 'volume', 'over', 'tags']);
    });
});
