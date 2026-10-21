// @vitest-environment jsdom
// When a folded legend's chip opens the object tree instead of unfolding the rows (src/workspace/VelaWorkspace.ts).
import { describe, it, expect } from 'vitest';
import { legendRoutesToObjectTree } from '../src/workspace/VelaWorkspace';

describe('legend chip: object tree or rows in place', () => {
    it('only a non-maximized cell of a mobile grid goes to the object tree', () => {
        expect(legendRoutesToObjectTree(true, true, false)).toBe(true); // phone grid cell: no room for the rows
        expect(legendRoutesToObjectTree(true, true, true)).toBe(false); // maximized: the whole screen, rows unfold
        expect(legendRoutesToObjectTree(false, true, false)).toBe(false); // one chart
        expect(legendRoutesToObjectTree(true, false, false)).toBe(false); // desktop grid
    });
});
