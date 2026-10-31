import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, effectiveFillColor, VALID_FILL, INVALID_FILL, type DrawingStyle, type DrawingTypeKey } from '../src/core/drawings';

const THEME = { background: '#0b0e11' };
// createDrawing merges defaultStyle at runtime, so a partial style is valid input (the type wants a full one).
const mk = (type: DrawingTypeKey, prices: number[], style?: Partial<DrawingStyle>) =>
    createDrawing(type, { paneId: 'price', anchors: prices.map((p, i) => ({ time: i * 10, price: p })), ...(style ? { style: style as DrawingStyle } : {}) })!;

describe('drawings/effectiveFillColor (settings swatch ↔ painter source of truth)', () => {
    it('a valid harmonic with no explicit fill resolves to the green validity tint', () => {
        expect(effectiveFillColor(mk('gartley', [0, 100, 40, 70, 22]), THEME)).toBe(VALID_FILL);
    });

    it('an invalid harmonic resolves to the red validity tint', () => {
        expect(effectiveFillColor(mk('gartley', [0, 100, 10, 70, 22]), THEME)).toBe(INVALID_FILL);
    });

    it('an explicit fillColor always wins over the validity tint', () => {
        expect(effectiveFillColor(mk('gartley', [0, 100, 40, 70, 22], { fillColor: '#123456' }), THEME)).toBe('#123456');
    });

    it('a new XABCD fills with TradingView\'s background (its own fill colour, blue at 85 % transparency)', () => {
        expect(effectiveFillColor(mk('xabcd', [0, 100, 40, 70, 22], { lineColor: '#abcdef' }), THEME)).toBe('#2962ff26');
    });

    it('an XABCD saved before (no fill colour) washes with its line color', () => {
        const old = deserializeDrawing({ id: 'o', type: 'xabcd', paneId: 'price', anchors: [0, 100, 40, 70, 22].map((p, i) => ({ time: i * 10, price: p })), style: { lineColor: '#abcdef', lineWidth: 1, lineStyle: 'solid' } } as Parameters<typeof deserializeDrawing>[0])!;
        expect(effectiveFillColor(old, THEME)).toBe('#abcdef');
    });

    it('a shape uses its own fill color', () => {
        expect(effectiveFillColor(mk('box', [0, 100], { fillColor: '#ff000080' }), THEME)).toBe('#ff000080');
    });

    it('a drawing with no body fill resolves to null', () => {
        expect(effectiveFillColor(mk('trendline', [0, 100]), THEME)).toBeNull();
    });
});
