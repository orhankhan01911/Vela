import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, TrendLine, Comment, Signpost, NOTE_PIN, GannFan, GannSquare, GannBox, TextLabel, PitchforkBase, statsOf, lineStatsRows, formatSpan, type Projector, type SegmentDrawing } from '../src/core/drawings';

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

    it('parallel channel: dashed middle level (on by default) and extend left / right', () => {
        const mk = (props?: Record<string, unknown>) =>
            createDrawing('parallelchannel', { paneId: 'price', anchors: [{ time: 40, price: 60 }, { time: 80, price: 60 }, { time: 60, price: 40 }], ...(props ? { props } : {}) })! as SegmentDrawing;
        const dashed = (g: ReturnType<SegmentDrawing['geometry']>) => g!.colored!.filter((c) => c.lineStyle === 'dashed').map((c) => c.seg);
        expect(dashed(mk().geometry(proj()))).toEqual([[40, 50, 80, 50]]); // halfway between y 40 and y 60
        expect(dashed(mk({ middleLine: false }).geometry(proj()))).toEqual([]);
        const ext = mk({ extendLeft: true, extendRight: true }).geometry(proj())!;
        expect(ext.colored!.filter((c) => c.lineStyle === 'solid').map((c) => c.seg)).toEqual([[0, 40, 200, 40], [0, 60, 200, 60]]);
        for (const p of ['extendLeft', 'extendRight', 'fillBackground']) expect(paths('parallelchannel', 3)).toContain(p);
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
        expect(paths('vline', 1)).toContain('textVertical');
        const v = createDrawing('vline', { paneId: 'price', anchors: [{ time: 50, price: 50 }], props: { textVertical: true } })!;
        expect(deserializeDrawing(v.serialize())!.serialize().props).toMatchObject({ textVertical: true });
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
        // A note saved before TradingView's look (props); TradingView's own (no "Always show text") is in drawings-note-tv.
        const n = createDrawing('note', { paneId: 'price', anchors: [{ time: 50, price: 50 }], props: {} })!;
        expect(n.hitTest(50, 50 - NOTE_PIN.h + 4, proj(), 0)).toBe(true); // the pin head
        expect(n.hitTest(90, 45, proj(), 0)).toBe(false); // no text plate to hit while hidden
        expect(n.schema().fields.map((f) => f.path)).toContain('showText');
        expect(createDrawing('note', { paneId: 'price', anchors: [{ time: 50, price: 50 }], props: { showText: true } })!.serialize().props).toEqual({ showText: true });
    });

    it('Gann fills like TradingView: fan wedges and square arc rings on, box rows / columns off until switched on', () => {
        const two = [{ time: 40, price: 40 }, { time: 80, price: 60 }];
        const fan = createDrawing('gannfan', { paneId: 'price', anchors: two })! as GannFan;
        expect(fan.fillPolygons(proj()).length).toBe(fan.levels.filter((l) => l.enabled).length - 1);
        fan.background = false;
        expect(fan.fillPolygons(proj())).toEqual([]);
        expect(deserializeDrawing(fan.serialize())!.serialize().props).toMatchObject({ background: false, showLabels: true });
        const sq = createDrawing('gannsquare', { paneId: 'price', anchors: two })! as GannSquare;
        expect(sq.fillPolygons(proj()).length).toBe(4); // one ring per arc
        const box = createDrawing('gannbox', { paneId: 'price', anchors: two })! as GannBox;
        expect(box.fillBands(proj())).toEqual([]);
        box.fillPrice = true;
        box.fillTime = true;
        expect(box.fillBands(proj()).length).toBe(12); // 6 rows + 6 columns between the 7 levels
        box.labelsRight = true;
        box.labelsLeft = false;
        const lines = box.entryLines(proj())!;
        expect(lines.some((l) => l.numberAlign === 'left' && l.numberText === '0.5')).toBe(true);
        expect(lines.some((l) => l.numberAlign === 'right' && l.numberText !== '')).toBe(false);
    });

    it('text: background, border and word wrap round-trip; a wrapped text is no wider than its wrap width', () => {
        const long = 'one two three four five six seven eight nine ten eleven twelve';
        // A text saved before TradingView's look (new ones: drawings-text-tv).
        const t = createDrawing('text', { paneId: 'price', anchors: [{ time: 50, price: 50 }], props: {}, text: { value: long, size: 'normal' } as never })! as TextLabel;
        expect(t.serialize().props).toBeUndefined(); // plain text stays as before
        const wide = t.bounds(proj())!.w;
        t.applySettings({ background: true, border: true, wordWrap: true, wrapWidth: 120 });
        expect(t.bounds(proj())!.w).toBeLessThan(wide);
        expect(t.bounds(proj())!.w).toBe(128);
        const back = deserializeDrawing(t.serialize())! as TextLabel;
        expect([back.background, back.border, back.wrapPx()]).toEqual([true, true, 120]);
        // TradingView's text (new ones) sets the wrap width with a handle, not a number.
        for (const p of ['background', 'backgroundColor', 'border', 'borderColor', 'wordWrap']) expect(paths('text', 1)).toContain(p);
        expect(paths('text', 1)).not.toContain('wrapWidth');
    });

    it('pitchforks: TradingView levels (0.5 + 1 on), band fills and a red median; old saved ones draw as before', () => {
        const three = [{ time: 40, price: 50 }, { time: 80, price: 70 }, { time: 80, price: 30 }];
        // Construction lines per style: none for Andrews, p1-p2 for the Schiffs, B-p3 and p1-p2 for inside.
        const extra = { pitchfork: 0, schiffpitchfork: 1, modifiedschiffpitchfork: 1, insidepitchfork: 2 } as const;
        for (const type of ['pitchfork', 'schiffpitchfork', 'modifiedschiffpitchfork', 'insidepitchfork'] as const) {
            const pf = createDrawing(type, { paneId: 'price', anchors: three })! as PitchforkBase;
            const g = pf.geometry(proj())!;
            expect(g.colored!.length).toBe(1 + 2 * 2 + 1 + extra[type]); // median, levels 0.5 and 1 on both sides, base line
            expect(g.fills!.length).toBe(4); // 0→0.5 and 0.5→1, each side
            expect(pf.editableLevels()!.map((l) => l.ratio)).toEqual([0.25, 0.382, 0.5, 0.618, 0.75, 1, 1.5, 1.75, 2]);
            const old = deserializeDrawing({ id: 'p', type, paneId: 'price', anchors: three, style: { lineColor: '#123456', lineWidth: 1, lineStyle: 'solid' } } as never)! as PitchforkBase;
            const og = old.geometry(proj())!;
            expect(og.fills).toEqual([]);
            expect(new Set(og.colored!.map((c) => c.color))).toEqual(new Set(['#123456'])); // median, tines, base: the line color
            expect(og.colored!.every((c) => c.lineWidth === undefined || c.lineWidth === 1)).toBe(true);
        }
        // Andrews: the tines are the level-1 lines through p2 / p3; the 0.5 lines run halfway to the median.
        const pf = createDrawing('pitchfork', { paneId: 'price', anchors: three })! as PitchforkBase;
        const starts = pf.geometry(proj())!.colored!.slice(1, 5).map((c) => c.seg[1]);
        expect(starts.map((y) => Math.round(y))).toEqual([40, 60, 30, 70]); // y 50 ± 10 (0.5) and ± 20 (1)
    });

    it('brush saved before: Chaikin smoothing rounds the stroke (0 = as drawn), a fill color closes it', () => {
        const anchors = [{ time: 10, price: 10 }, { time: 30, price: 60 }, { time: 50, price: 10 }, { time: 70, price: 60 }];
        const raw = createDrawing('freehand', { paneId: 'price', anchors, props: {} })! as SegmentDrawing;
        expect(raw.geometry(proj())!.segments.length).toBe(3);
        expect(raw.serialize().props).toBeUndefined();
        const smooth = createDrawing('freehand', { paneId: 'price', anchors, props: { smooth: 2 } })! as SegmentDrawing;
        const segs = smooth.geometry(proj())!.segments;
        expect(segs.length).toBeGreaterThan(3);
        expect(Math.min(...segs.map((x) => x[1]))).toBeGreaterThan(40); // the sharp peaks at y 40 are rounded off
        expect(segs[0]!.slice(0, 2)).toEqual([10, 90]); // ends stay put
        expect(smooth.schema().fields.map((f) => f.path)).toContain('smooth');
        const filled = createDrawing('freehand', { paneId: 'price', anchors, props: {}, style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid', fillColor: '#ff000033' } as never })! as SegmentDrawing;
        expect(filled.geometry(proj())!.fill).not.toBeNull();
    });
});
