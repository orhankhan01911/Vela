// Series tags on a pane's price scale (`axisTag`): pushed apart, kept inside their pane, and never more than fit.
import { describe, it, expect } from 'vitest';
import { ChromeRenderer } from '../src/renderers/native/chrome/ChromeRenderer';

type Layout = Map<string, { y: number; name: string; val: string }[]>;

function layout(paneHeight: number, lines: number): Layout {
    const pane = { id: 'p1', kind: 'indicator', collapsed: false, bounds: { top: 100, height: paneHeight, left: 0, width: 500 } };
    const series = Array.from({ length: lines }, (_, i) => ({
        kind: 'line',
        axisTag: true,
        legendLabel: `V${i}`,
        style: { color: '#e0a100' },
        // every line near the same value: the worst case for the stack
        points: [{ time: 1, value: 50 + i * 0.01 }],
    }));
    const scene = {
        indicators: new Map([['m', { paneId: 'p1', series }]]),
        scaleFor: () => ({ min: 0, max: 100, mode: 'linear' }),
        priceMintick: 0.01,
    };
    const coords = { priceToY: (v: number, _s: unknown, b: { top: number; height: number }) => b.top + b.height * (1 - v / 100) };
    const r = new ChromeRenderer() as unknown as { layoutSeriesAxisTags(s: unknown, c: unknown, p: unknown[]): Layout };
    return r.layoutSeriesAxisTags(scene, coords, [pane]);
}

describe('series axis tags', () => {
    it('stack apart inside a tall pane, all shown', () => {
        const tags = layout(300, 7).get('p1')!;
        expect(tags).toHaveLength(7);
        for (let i = 1; i < tags.length; i++) expect(tags[i]!.y - tags[i - 1]!.y).toBeGreaterThanOrEqual(16);
        expect(tags[0]!.y).toBeGreaterThanOrEqual(100 + 7.5);
        expect(tags[tags.length - 1]!.y).toBeLessThanOrEqual(400 - 7.5);
    });
    it('a short pane shows only the tags that fit, first lines first, none outside the pane', () => {
        const tags = layout(80, 7).get('p1')!;
        expect(tags).toHaveLength(5);
        expect(tags.map((t) => t.name).sort()).toEqual(['V0', 'V1', 'V2', 'V3', 'V4']);
        for (const t of tags) {
            expect(t.y - 7.5).toBeGreaterThanOrEqual(100);
            expect(t.y + 7.5).toBeLessThanOrEqual(180);
        }
    });
});
