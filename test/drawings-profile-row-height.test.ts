import { describe, it, expect } from 'vitest';
import { profileRowHeight } from '../src/renderers/native/drawings/DrawingPainter';

describe('profile drawing tools: row height', () => {
    it('keeps a 1 px gap between rows tall enough to read as rows', () => {
        expect(profileRowHeight(12)).toBe(11);
        expect(profileRowHeight(4)).toBe(3);
    });

    it('fills thin rows completely so many rows do not stripe into a hatch (2026-10-26)', () => {
        expect(profileRowHeight(3)).toBe(3);
        expect(profileRowHeight(1.2)).toBe(1.2);
        expect(profileRowHeight(0.4)).toBe(0.4);
    });
});
