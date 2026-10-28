import { describe, it, expect } from 'vitest';
import { resolveLayoutMode, MOBILE_BREAKPOINT_PX, COARSE_BREAKPOINT_PX, PHONE_SHORT_SIDE_PX } from '../src/widget/layout-mode';

describe('resolveLayoutMode', () => {
    it('pins the mode when the option is explicit, regardless of measurements', () => {
        expect(resolveLayoutMode('mobile', 1920, false)).toBe('mobile');
        expect(resolveLayoutMode('desktop', 320, true)).toBe('desktop');
    });

    it('auto: narrow containers are mobile, wide ones desktop', () => {
        expect(resolveLayoutMode('auto', MOBILE_BREAKPOINT_PX - 1, false)).toBe('mobile');
        expect(resolveLayoutMode('auto', MOBILE_BREAKPOINT_PX, false)).toBe('desktop');
        expect(resolveLayoutMode('auto', 1920, false)).toBe('desktop');
    });

    it('auto: a coarse pointer widens the mobile band (tablets), but not indefinitely', () => {
        expect(resolveLayoutMode('auto', COARSE_BREAKPOINT_PX - 1, true)).toBe('mobile');
        expect(resolveLayoutMode('auto', COARSE_BREAKPOINT_PX, true)).toBe('desktop');
        // The same width with a fine pointer stays desktop.
        expect(resolveLayoutMode('auto', COARSE_BREAKPOINT_PX - 1, false)).toBe('desktop');
    });

    it('auto: a touch phone keeps the mobile chrome in landscape, at any width (iPhone Pro Max 932 x 430)', () => {
        expect(resolveLayoutMode('auto', 932, true, 430)).toBe('mobile');
        expect(resolveLayoutMode('auto', 1100, true, PHONE_SHORT_SIDE_PX - 1)).toBe('mobile');
        // A tablet (short side 768) in landscape keeps the desktop chrome, and so does a mouse on a small screen.
        expect(resolveLayoutMode('auto', 1024, true, 768)).toBe('desktop');
        expect(resolveLayoutMode('auto', 1024, false, 430)).toBe('desktop');
    });

    it('auto: an unmeasured container (width 0) stays desktop until observed', () => {
        expect(resolveLayoutMode('auto', 0, true)).toBe('desktop');
        expect(resolveLayoutMode('auto', -1, true)).toBe('desktop');
    });
});
