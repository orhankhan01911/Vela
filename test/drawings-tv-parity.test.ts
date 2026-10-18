import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, TrendLine, Comment, Signpost, NOTE_PIN, statsOf, lineStatsRows, formatSpan, type Projector, type SegmentDrawing } from '../src/core/drawings';

/** Linear projector: x = time, y = 100 − price, single pane 'price' (200 × 100 px). */
function proj(): Projector {
    return {
        xOf: (t) => t,
        yOf: (price, paneId) => (paneId === 'price' ? 100 - price : null),
        pxToPoint: (x, y) => ({ time: x, price: 100 - y }),
        paneIdAtY: () => 'price',
        paneRect: () => ({ top: 0, height: 100 }),
        width: 200,
        height: 100,
    };
}
const paths = (type: Parameters<typeof createDrawing>[0], n: number) =>
    createDrawing(type, { paneId: 'price', anchors: Array.from({ length: n }, (_, i) => ({ time: 50 + i * 10, price: 50 + i })) })!
        .schema()
        .fields.map((f) => f.path);

describe('drawing settings TradingView has', () => {
    it('trend line: extend left / right to the pane edge (grabbable there) and an arrow at either end', () => {
        // (40,60) → (80,40): slope −0.5 px per px.
        const t = createDrawing('trendline', { paneId: 'price', anchors: [{ time: 40, price: 40 }, { time: 80, price: 60 }], props: { extendRight: true } })! as TrendLine;
        expect(t.drawnPixels(proj())).toEqual([40, 60, 200, -20]);
        expect(t.hitTest(120, 20, proj(), 2)).toBe(true); // past the second point
        expect(t.hitTest(20, 70, proj(), 2)).toBe(false); // left side not extended
        expect(t.timeExtent()).toEqual({ min: 40, max: Number.POSITIVE_INFINITY });
        const back = deserializeDrawing(t.serialize())! as TrendLine;
        expect([back.extendLeft, back.extendRight]).toEqual([false, true]);
        for (const p of ['extendLeft', 'extendRight', 'style.arrowLeft', 'style.arrowRight']) expect(paths('trendline', 2)).toContain(p);
    });

    it('horizontal line / ray / cross line: price label on the scale, on unless switched off', () => {
        for (const type of ['hline', 'hray', 'crossline'] as const) {
            expect(paths(type, 1)).toContain('showPrice');
            const d = createDrawing(type, { paneId: 'price', anchors: [{ time: 50, price: 50 }] })!;
            expect(d.serialize().props).toMatchObject({ showPrice: true });
            const off = createDrawing(type, { paneId: 'price', anchors: [{ time: 50, price: 50 }], props: { showPrice: false } })!;
            expect(deserializeDrawing(off.serialize())!.serialize().props).toMatchObject({ showPrice: false });
        }
    });

    it('parallel channel: dashed middle line (on by default) and extend left / right', () => {
        const mk = (props?: Record<string, unknown>) =>
            createDrawing('parallelchannel', { paneId: 'price', anchors: [{ time: 40, price: 60 }, { time: 80, price: 60 }, { time: 60, price: 40 }], ...(props ? { props } : {}) })! as SegmentDrawing;
        expect(mk().geometry(proj())!.dashed).toEqual([[40, 50, 80, 50]]); // halfway between y 40 and y 60
        expect(mk({ middleLine: false }).geometry(proj())!.dashed).toBeUndefined();
        const ext = mk({ extendLeft: true, extendRight: true }).geometry(proj())!;
        expect(ext.segments).toEqual([[0, 40, 200, 40], [0, 60, 200, 60]]);
        for (const p of ['middleLine', 'extendLeft', 'extendRight']) expect(paths('parallelchannel', 3)).toContain(p);
    });

    it('arc: the curve passes through the third point wherever it sits beside the chord', () => {
        // Chord (40,50) → (120,50); third point off-centre at (60, 20) (price 80).
        const arc = createDrawing('arc', { paneId: 'price', anchors: [{ time: 40, price: 50 }, { time: 120, price: 50 }, { time: 60, price: 80 }] })! as SegmentDrawing;
        const pts = arc.geometry(proj())!.fill!;
        const near = Math.min(...pts.map(([x, y]) => Math.hypot(x - 60, y - 20)));
        expect(near).toBeLessThan(2);
        expect(arc.anchors[2]!.time).toBe(60); // no longer pinned over the chord's middle
        // Over the middle it is the old symmetric dome: apex at the top.
        const dome = createDrawing('arc', { paneId: 'price', anchors: [{ time: 40, price: 50 }, { time: 120, price: 50 }, { time: 80, price: 80 }] })! as SegmentDrawing;
        expect(Math.min(...dome.geometry(proj())!.fill!.map(([, y]) => y))).toBeCloseTo(20, 6);
    });

    it('info line shows every stat by default; trend lines have them off until switched on', () => {
        const info = createDrawing('infoline', { paneId: 'price', anchors: [{ time: 0, price: 50 }, { time: 93_600_000, price: 60 }] })!;
        const s = statsOf(info as never)!;
        expect(s).toMatchObject({ price: true, percent: true, bars: true, date: true, distance: true, angle: true, position: 'center' });
        const p = proj();
        const rows = lineStatsRows(s, info.anchors[0]!, info.anchors[1]!, [40, 60, 80, 20], { ...p, barsBetween: () => 104 });
        expect(rows).toEqual(['10.00 (20.00%)', '104 bars (1d 2h), distance: 57 px', '45.00°']);
        expect(statsOf(createDrawing('trendline', { paneId: 'price', anchors: [{ time: 0, price: 1 }, { time: 1, price: 2 }] })! as never)).toMatchObject({ price: false, angle: false });
        // A settings edit stores only the changed part; the rest keeps the type's defaults, and it round-trips.
        const t = createDrawing('trendline', { paneId: 'price', anchors: [{ time: 0, price: 1 }, { time: 1, price: 2 }] })!;
        t.applySettings({ 'stats.angle': true });
        const back = deserializeDrawing(t.serialize())!;
        expect(statsOf(back as never)).toMatchObject({ angle: true, price: false, position: 'right' });
        for (const type of ['trendline', 'ray', 'extendedline', 'infoline'] as const) expect(paths(type, 2)).toContain('stats.position');
        expect(formatSpan(-(2 * 86_400_000 + 30 * 60_000))).toBe('2d 30m');
    });

    it('vertical line / cross line: time label on the time axis, on unless switched off', () => {
        for (const type of ['vline', 'crossline'] as const) {
            expect(paths(type, 1)).toContain('showTime');
            const d = createDrawing(type, { paneId: 'price', anchors: [{ time: 50, price: 50 }] })!;
            expect(d.serialize().props).toMatchObject({ showTime: true });
            const off = createDrawing(type, { paneId: 'price', anchors: [{ time: 50, price: 50 }], props: { showTime: false } })!;
            expect(deserializeDrawing(off.serialize())!.serialize().props).toMatchObject({ showTime: false });
        }
    });

    it('comment: a bubble standing on its one point (bottom-left corner); old two-point comments keep their tail', () => {
        const c = createDrawing('comment', { paneId: 'price', anchors: [{ time: 50, price: 50 }] })! as Comment;
        expect(c.tailed).toBe(false);
        const b = c.box(proj())!;
        expect([b.x, b.y + b.h]).toEqual([50, 50]); // the point is the bubble's bottom-left corner
        expect(c.hitTest(b.x + 5, b.y + 5, proj(), 2)).toBe(true);
        expect(deserializeDrawing(c.serialize())!.anchorSchema().min).toBe(1);
        const old = deserializeDrawing({ id: 'c1', type: 'comment', paneId: 'price', anchors: [{ time: 40, price: 40 }, { time: 80, price: 70 }], style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' } } as never)! as Comment;
        expect(old.tailed).toBe(true);
        expect(old.anchorSchema().min).toBe(2);
        expect(deserializeDrawing(old.serialize())!.anchorSchema().min).toBe(2); // stays old after a save
    });

    it('signpost: the badge stands straight above its bar and slides only up or down the pole', () => {
        const s = createDrawing('signpost', { paneId: 'price', anchors: [{ time: 50, price: 40 }, { time: 90, price: 70 }] })! as Signpost;
        expect(s.points(proj())).toEqual([[50, 60], [50, 30]]);
        expect(s.translateBody(10, 5, s.anchors)).toEqual([{ time: 50, price: 40 }, { time: 50, price: 75 }]);
        expect(s.hitTest(50, 45, proj(), 2)).toBe(true); // on the pole
    });

    it('note: a map pin whose tip is the point; text shows on hover unless "Always show text"', () => {
        const n = createDrawing('note', { paneId: 'price', anchors: [{ time: 50, price: 50 }] })!;
        expect(n.hitTest(50, 50 - NOTE_PIN.h + 4, proj(), 0)).toBe(true); // the pin head
        expect(n.hitTest(90, 45, proj(), 0)).toBe(false); // no text plate to hit while hidden
        expect(paths('note', 1)).toContain('showText');
        expect(createDrawing('note', { paneId: 'price', anchors: [{ time: 50, price: 50 }], props: { showText: true } })!.serialize().props).toEqual({ showText: true });
    });
});
