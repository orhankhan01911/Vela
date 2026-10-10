// The layout menu's catalog: every arrangement grouped by chart count, built from
// "columns of stacks" / "rows of stacks" and expressed as grid areas.
import { describe, it, expect, beforeAll } from 'vitest';
import {
    ensureLayout,
    layoutCatalog,
    layoutCatalogGroups,
    layoutDefinition,
    layoutForGrid,
    layoutGlyph,
    LAYOUT_MAX_CELLS,
    occupancyGrid,
    registerBuiltinLayouts,
    stackLayout,
    type LayoutDefinition,
} from '../src/workspace/layouts';

beforeAll(() => registerBuiltinLayouts());

/** Every area must be one solid rectangle of tracks (a grid-template-areas requirement). */
function areasAreRectangles(def: LayoutDefinition): boolean {
    const grid = occupancyGrid(def);
    const boxes = new Map<string, { r0: number; r1: number; c0: number; c1: number; n: number }>();
    grid.forEach((row, r) =>
        row.forEach((name, c) => {
            const b = boxes.get(name) ?? { r0: r, r1: r, c0: c, c1: c, n: 0 };
            b.r0 = Math.min(b.r0, r);
            b.r1 = Math.max(b.r1, r);
            b.c0 = Math.min(b.c0, c);
            b.c1 = Math.max(b.c1, c);
            b.n += 1;
            boxes.set(name, b);
        }),
    );
    return [...boxes.values()].every((b) => (b.r1 - b.r0 + 1) * (b.c1 - b.c0 + 1) === b.n);
}

describe('stackLayout', () => {
    it('one tall cell beside three stacked ones', () => {
        const def = stackLayout('c-1-3', 'x', { kind: 'cols', counts: [1, 3] });
        expect(def.areas).toEqual(['c1 c2', 'c1 c3', 'c1 c4']);
        expect(def.cols).toEqual([1, 1]);
        expect(def.rows).toEqual([1, 1, 1]);
        expect(def.cells.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
    });

    it('rows are the transpose: a wide cell above two side by side', () => {
        const def = stackLayout('r-1-2', 'x', { kind: 'rows', counts: [1, 2] });
        expect(def.areas).toEqual(['c1 c1', 'c2 c3']);
    });

    it('mixed stacks share fine tracks (2 beside 3 is six tracks tall)', () => {
        const def = stackLayout('c-2-3', 'x', { kind: 'cols', counts: [2, 3] });
        expect(def.rows).toHaveLength(6);
        expect(def.cells).toHaveLength(5);
        expect(areasAreRectangles(def)).toBe(true);
    });

    it('numbers slots in reading order, top-left first', () => {
        const def = stackLayout('c-2-1', 'x', { kind: 'cols', counts: [2, 1] });
        // left column two cells, right column one tall: c1 top-left, c2 top-right, c3 below c1
        expect(def.areas).toEqual(['c1 c2', 'c3 c2']);
    });
});

describe('layout catalog', () => {
    const groups = layoutCatalogGroups();

    it('lists arrangements by chart count, from 1 up to 16', () => {
        expect(groups.map((g) => g.count)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16]);
        expect(groups.map((g) => g.layouts.length)).toEqual([1, 2, 6, 10, 10, 6, 3, 4, 4, 3, 3, 1, 2]);
        expect(layoutCatalog()).toHaveLength(55);
    });

    it('every layout has exactly its group count of slots, within the pool', () => {
        for (const g of groups) {
            for (const def of g.layouts) {
                expect(def.cells).toHaveLength(g.count);
                expect(def.cells.length).toBeLessThanOrEqual(LAYOUT_MAX_CELLS);
            }
        }
    });

    it('ids are unique and every layout resolves from its id (saved layouts restore)', () => {
        const ids = layoutCatalog().map((d) => d.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const def of layoutCatalog()) {
            expect(ensureLayout(def.id)?.id).toBe(def.id);
        }
    });

    it('asymmetric layouts are registered; uniform ones are the classic presets', () => {
        expect(layoutDefinition('c-1-3')).toBeDefined();
        expect(layoutDefinition('r-2-1')).toBeDefined();
        const ids = layoutCatalog().map((d) => d.id);
        for (const classic of ['1', '2h', '2v', '4', '8']) expect(ids).toContain(classic);
    });

    it('every area is one solid rectangle, so the grid renders it', () => {
        for (const def of layoutCatalog()) expect(areasAreRectangles(def)).toBe(true);
    });

    it('every layout draws a glyph', () => {
        for (const def of layoutCatalog()) expect(layoutGlyph(def)).toMatch(/^<svg /);
    });
});

describe('dynamic grids beyond the old 4x4 canvas', () => {
    it('resolves g1x8, g2x8 and g4x4, and refuses more charts than the pool holds', () => {
        expect(ensureLayout('g1x8')?.cells).toHaveLength(8);
        expect(ensureLayout('g2x8')?.cells).toHaveLength(16);
        expect(ensureLayout('g4x4')?.cells).toHaveLength(16);
        expect(ensureLayout('g5x4')).toBeUndefined();
        expect(ensureLayout('g17x1')).toBeUndefined();
    });

    it('layoutForGrid trims an oversized request to the pool', () => {
        const def = layoutForGrid(6, 6);
        expect(def.cells.length).toBeLessThanOrEqual(LAYOUT_MAX_CELLS);
    });
});
