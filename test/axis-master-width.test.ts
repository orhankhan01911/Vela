import { describe, expect, it } from 'vitest';
import { AXIS_MASTER_W, AXIS_MERGED_W, axisColumnX, axisGutterWidth, masterWidthFor, nextMasterWidth } from '../src/renderers/native/chrome/axisLayout';

describe('price column fits its labels (no clipped 0.035000 at a large axis font)', () => {
    it('never goes below the default width', () => {
        expect(masterWidthFor(10)).toBe(AXIS_MASTER_W);
        expect(nextMasterWidth(AXIS_MASTER_W, 40)).toBe(AXIS_MASTER_W);
    });
    it('grows at once to fit a wide label, in 4 px steps', () => {
        // "0.035000" at 16 px is about 66 px wide: 6 + 66 + 8 = 80
        expect(nextMasterWidth(AXIS_MASTER_W, 66)).toBe(80);
        expect(nextMasterWidth(80, 66.5) % 4).toBe(0);
    });
    it('shrinks only with slack, so zooming does not make it flicker', () => {
        expect(nextMasterWidth(80, 62)).toBe(80); // needs 76: within the slack, stays
        expect(nextMasterWidth(80, 50)).toBe(AXIS_MASTER_W); // needs 64: 16 px too wide, shrinks
    });
    it('ignores a paint that drew no labels', () => {
        expect(nextMasterWidth(80, 0)).toBe(80);
        expect(nextMasterWidth(80, Number.NaN)).toBe(80);
    });
    it('merged scale columns sit right of the widened master column', () => {
        expect(axisGutterWidth(2, 80)).toBe(80 + 2 * AXIS_MERGED_W);
        expect(axisColumnX(1000, 1, 80)).toBe(1080);
        expect(axisColumnX(1000, 2, 80)).toBe(1080 + AXIS_MERGED_W);
        expect(axisColumnX(1000, 1)).toBe(1000 + AXIS_MASTER_W);
    });
});
