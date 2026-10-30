// A drawing's colors and widths come from saved layouts (untrusted): before they go into CSS text (the inline text
// editor's style, the opacity slider's gradient) they must be a plain color and a clamped number.
import { describe, it, expect } from 'vitest';
import { isSafeCssColor, safeCssColor, safeCssPx } from '../src/renderers/shared/drawing-geometry';

describe('CSS guards for drawing values', () => {
    it('lets plain colors through', () => {
        for (const c of ['#0097a7', '#0097a7b3', 'rgba(41, 98, 255, 0.4)', 'red']) expect(isSafeCssColor(c)).toBe(true);
    });

    it('refuses anything that could add CSS', () => {
        for (const c of ['red;background:url(x)', 'url(https://x)', 'red}body{display:none', 'expression(alert(1))'.replace('(', ';('), 'a'.repeat(80), 42, null]) {
            expect(isSafeCssColor(c)).toBe(false);
            expect(safeCssColor(c, '#000')).toBe('#000');
        }
    });

    it('clamps widths and refuses non-numbers', () => {
        expect(safeCssPx(3, 2, 0, 10)).toBe(3);
        expect(safeCssPx(99, 2, 0, 10)).toBe(10);
        expect(safeCssPx('2px;color:red', 2, 0, 10)).toBe(2);
        expect(safeCssPx(Number.NaN, 2, 0, 10)).toBe(2);
    });
});
