import { describe, it, expect } from 'vitest';
import { DrawingPainter } from '../src/renderers/native/drawings/DrawingPainter';
import { sliceKeyFor } from '../src/renderers/native/drawings/UserDrawingController';
import { createDrawing, type Projector } from '../src/core/drawings';
import type { VelaTheme } from '../src/core/options';

/** Linear projector: x = time, y = 100 − price, single pane 'price'. */
function fakeProjector(): Projector {
    return {
        xOf: (t) => t,
        yOf: (price, paneId) => (paneId === 'price' ? 100 - price : null),
        pxToPoint: (x, y) => ({ time: x, price: 100 - y }),
        paneIdAtY: () => 'price',
        width: 200,
        height: 100,
    };
}

/** A canvas context that counts `arc()` calls (each selection handle is one arc) and `lineTo()`
 *  ones (a painted line body — handles are arcs only). */
function recordingCtx() {
    let arcs = 0;
    let lines = 0;
    const ctx = {
        globalAlpha: 1,
        setTransform() {},
        clearRect() {},
        beginPath() {},
        closePath() {},
        moveTo() {},
        lineTo() {
            lines += 1;
        },
        arcTo() {},
        stroke() {},
        fill() {},
        setLineDash() {},
        arc() {
            arcs += 1;
        },
        fillRect() {},
        strokeRect() {},
        save() {},
        restore() {},
        translate() {},
        rotate() {},
        fillText() {},
        measureText: () => ({ width: 0 }),
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, arcs: () => arcs, lines: () => lines };
}

const theme = { textColor: '#fff', fontFamily: 'sans-serif' } as unknown as VelaTheme;
const hline = (id: string, price: number) => createDrawing('hline', { id, paneId: 'price', anchors: [{ time: 10, price }] })!;
// Handles are counted as ring arcs: a trend line has two (the horizontal line's one is TradingView's square).
const seg = (id: string, price: number) => createDrawing('trendline', { id, paneId: 'price', anchors: [{ time: 10, price }, { time: 40, price: price + 5 }] })!;

describe('DrawingPainter.paintAll handle highlighting', () => {
    it('paints handles for every selected id', () => {
        const drawings = [seg('a', 30), seg('b', 50)];
        const { ctx, arcs } = recordingCtx();
        new DrawingPainter().paintAll(ctx, drawings, fakeProjector(), theme, { selected: new Set(['a', 'b']) });
        expect(arcs()).toBe(4); // two handles per selected trend line
    });

    it('paints handles for the hovered and dragged drawings too', () => {
        const drawings = [seg('a', 30), seg('b', 50)];
        const { ctx, arcs } = recordingCtx();
        new DrawingPainter().paintAll(ctx, drawings, fakeProjector(), theme, { hovered: 'a', dragged: 'b' });
        expect(arcs()).toBe(4);
    });

    it('paints no handles when nothing is targeted', () => {
        const drawings = [seg('a', 30), seg('b', 50)];
        const { ctx, arcs } = recordingCtx();
        new DrawingPainter().paintAll(ctx, drawings, fakeProjector(), theme);
        expect(arcs()).toBe(0);
    });

    // Drawings interleaved into the series stack paint their bodies on the backend-composited
    // layers, but their handles have to come back to the top canvas — buried under the candles
    // they'd be unusable.
    it('paintHighlights draws handles alone, for the highlighted ones only', () => {
        const drawings = [seg('a', 30), seg('b', 50)];
        const { ctx, arcs, lines } = recordingCtx();
        new DrawingPainter().paintHighlights(ctx, drawings, fakeProjector(), new Set(['b']));
        expect(arcs()).toBe(2); // b's handles …
        expect(lines()).toBe(0); // … and neither body
    });
});

describe('sliceKeyFor — which interleave layer a drawing paints on', () => {
    // Boundaries: an indicator at -2, the candles at 0, a raised indicator at 5.
    const bounds = [-2, 0, 5];

    it('a drawing over every boundary stays on the top canvas', () => {
        expect(sliceKeyFor(6, bounds)).toBeNull();
        expect(sliceKeyFor(9, [])).toBeNull();
    });

    it('slots a drawing under the first series at-or-above its z', () => {
        expect(sliceKeyFor(1, bounds)).toBe(5); // between the candles and the raised indicator
        expect(sliceKeyFor(-1, bounds)).toBe(0); // under the candles, over the back indicator
        expect(sliceKeyFor(-9, bounds)).toBe(-2); // under everything
    });

    it('a tie paints under the series carrying that z', () => {
        expect(sliceKeyFor(0, bounds)).toBe(0);
        expect(sliceKeyFor(5, bounds)).toBe(5);
    });
});

describe('DrawingPainter.paintAll muted label', () => {
    /** A ctx that records the strings passed to `fillText`. */
    function textCountingCtx() {
        const base = recordingCtx();
        const texts: string[] = [];
        (base.ctx as unknown as Record<string, unknown>).fillText = (s: string) => { texts.push(s); };
        return { ctx: base.ctx, texts: () => texts };
    }

    // A text saved before TradingView's look (its themed frame); the TradingView outline is in drawings-text-tv.
    const label = (id: string) => createDrawing('text', { id, paneId: 'price', anchors: [{ time: 10, price: 50 }], props: {}, text: { value: 'Buy zone', size: 'normal', hAlign: 'left', vAlign: 'top' } })!;

    it('paints a text label normally', () => {
        const { ctx, texts } = textCountingCtx();
        new DrawingPainter().paintAll(ctx, [label('a')], fakeProjector(), theme);
        expect(texts()).toEqual(['Buy zone']);
    });

    it('leaves the muted label to its inline editor (and only that one)', () => {
        const { ctx, texts } = textCountingCtx();
        new DrawingPainter().paintAll(ctx, [label('a'), label('b')], fakeProjector(), theme, { mutedLabel: 'a' });
        expect(texts()).toEqual(['Buy zone']); // 'b' still painted, 'a' muted
    });

    it('hides the muted label\u2019s drag handle too (typing, not dragging)', () => {
        const { ctx, arcs } = recordingCtx();
        new DrawingPainter().paintAll(ctx, [label('a')], fakeProjector(), theme, { selected: new Set(['a']), mutedLabel: 'a' });
        expect(arcs()).toBe(0);
    });
});

describe('DrawingPainter.paintAll text label frame', () => {
    /** A ctx that records the stroke color of every `stroke()` (the frame is the only stroke here). */
    function strokeRecordingCtx() {
        const base = recordingCtx();
        const strokes: string[] = [];
        const ctx = base.ctx as unknown as Record<string, unknown>;
        ctx.strokeStyle = '';
        ctx.stroke = () => { strokes.push(String(ctx.strokeStyle)); };
        return { ctx: base.ctx, strokes: () => strokes };
    }

    // A text saved before TradingView's look (its themed frame); the TradingView outline is in drawings-text-tv.
    const label = (id: string) => createDrawing('text', { id, paneId: 'price', anchors: [{ time: 10, price: 50 }], props: {}, text: { value: 'Buy zone', size: 'normal', hAlign: 'left', vAlign: 'top' } })!;
    const frame = (targets: { selected?: ReadonlySet<string>; hovered?: string | null }): string[] => {
        const { ctx, strokes } = strokeRecordingCtx();
        new DrawingPainter().paintAll(ctx, [label('a')], fakeProjector(), theme, targets);
        // Targeting also paints the handle (a hex-colored border); the frame is the themed rgba stroke.
        return strokes().filter((s) => s.startsWith('rgba('));
    };

    it('frames a selected text label, and a hovered one more faintly', () => {
        const selected = frame({ selected: new Set(['a']) });
        const hovered = frame({ hovered: 'a' });
        expect(selected).toHaveLength(1);
        expect(hovered).toHaveLength(1);
        expect(selected[0]).toContain('0.3'); // firm once clicked
        expect(hovered[0]).toContain('0.12'); // a hint under the cursor
    });

    it('leaves an untargeted label unframed', () => {
        expect(frame({})).toEqual([]);
        expect(frame({ selected: new Set(['other']), hovered: 'other' })).toEqual([]);
    });
});

describe('DrawingPainter.paintAll pane separation', () => {
    /** fakeProjector + paneRect: 'price' is a live 100px pane; 'hidden' is zero-height. */
    function paneAwareProjector(): Projector {
        return {
            ...fakeProjector(),
            paneRect: (paneId) => (paneId === 'price' ? { top: 0, height: 100 } : paneId === 'hidden' ? { top: 100, height: 0 } : null),
        };
    }

    /** A ctx that additionally counts `clip()` and `stroke()` calls. */
    function clipCountingCtx() {
        const base = recordingCtx();
        let clips = 0;
        let strokes = 0;
        const ctx = base.ctx as unknown as Record<string, unknown>;
        ctx.clip = () => { clips += 1; };
        ctx.rect = () => {};
        const origStroke = ctx.stroke as () => void;
        ctx.stroke = () => { strokes += 1; origStroke(); };
        return { ctx: base.ctx, arcs: base.arcs, clips: () => clips, strokes: () => strokes };
    }

    it('clips each drawing to its pane rect', () => {
        const drawings = [hline('a', 30), hline('b', 50)];
        const { ctx, clips } = clipCountingCtx();
        new DrawingPainter().paintAll(ctx, drawings, paneAwareProjector(), theme);
        expect(clips()).toBe(2); // one clip per painted drawing
    });

    it('skips drawings on a hidden (zero-height) pane entirely — body and handles', () => {
        const onHidden = createDrawing('hline', { id: 'h', paneId: 'hidden', anchors: [{ time: 10, price: 30 }] })!;
        const { ctx, arcs, strokes } = clipCountingCtx();
        new DrawingPainter().paintAll(ctx, [onHidden], paneAwareProjector(), theme, { selected: new Set(['h']) });
        expect(strokes()).toBe(0); // nothing painted
        expect(arcs()).toBe(0); // no handles either
    });

    it('paints unclipped when the projector exposes no pane geometry (back-compat)', () => {
        const drawings = [hline('a', 30)];
        const { ctx, clips, strokes } = clipCountingCtx();
        new DrawingPainter().paintAll(ctx, drawings, fakeProjector(), theme);
        expect(clips()).toBe(0);
        expect(strokes()).toBeGreaterThan(0);
    });
});

describe('DrawingPainter trendline label follows the line', () => {
    it('rotates the label to the upright segment angle', () => {
        const d = createDrawing('trendline', {
            id: 't',
            paneId: 'price',
            anchors: [
                { time: 0, price: 0 },
                { time: 50, price: 50 },
            ],
            text: { value: 'zone', size: 'normal', hAlign: 'center', vAlign: 'top' },
        })!;
        const { ctx } = recordingCtx();
        const angles: number[] = [];
        (ctx as unknown as Record<string, unknown>).rotate = (a: number) => {
            angles.push(a);
        };
        new DrawingPainter().paintAll(ctx, [d], fakeProjector(), theme);
        expect(angles).toHaveLength(1);
        // projector y = 100 − price: (0,100) → (50,50) is up-right → −π/4
        expect(angles[0]).toBeCloseTo(-Math.PI / 4);
    });

    it('does not rotate a flat text annotation', () => {
        const d = createDrawing('text', {
            id: 'a',
            paneId: 'price',
            anchors: [{ time: 10, price: 50 }],
            text: { value: 'note', size: 'normal', hAlign: 'left', vAlign: 'top' },
        })!;
        const { ctx } = recordingCtx();
        let rotated = 0;
        (ctx as unknown as Record<string, unknown>).rotate = () => {
            rotated += 1;
        };
        new DrawingPainter().paintAll(ctx, [d], fakeProjector(), theme);
        expect(rotated).toBe(0);
    });
});

describe('DrawingPainter position labels', () => {
    it('paint at the tool\'s px size', () => {
        const d = createDrawing('long-position', { id: 'p', paneId: 'price', anchors: [{ time: 0, price: 50 }, { time: 60, price: 40 }, { time: 60, price: 70 }] })!;
        d.applySettings({ fontSize: 19, alwaysShowStats: true });
        const fonts: string[] = [];
        const { ctx } = recordingCtx();
        Object.defineProperty(ctx, 'font', { set: (v: string) => fonts.push(v), get: () => fonts[fonts.length - 1] ?? '' });
        (ctx as unknown as { textAlign: string; textBaseline: string; fillStyle: string; strokeStyle: string; lineWidth: number }).textAlign = 'left';
        new DrawingPainter().paintAll(ctx, [d], fakeProjector(), theme);
        expect(fonts.some((f) => f.startsWith('19px '))).toBe(true);
    });
});

describe('DrawingPainter position labels at extremes', () => {
    /** Labels painted (text + x) for a long position, with a fillText-recording context. */
    function labels(anchors: Array<{ time: number; price: number }>): Array<{ t: string; x: number }> {
        const d = createDrawing('long-position', { id: 'p', paneId: 'price', anchors, props: { alwaysShowStats: true } })!;
        const out: Array<{ t: string; x: number }> = [];
        const { ctx } = recordingCtx();
        (ctx as unknown as { fillText: (t: string, x: number) => void }).fillText = (t, x) => out.push({ t, x });
        (ctx as unknown as { measureText: (t: string) => { width: number } }).measureText = (t) => ({ width: t.length * 2 }); // fits the 200 px plot
        new DrawingPainter().paintAll(ctx, [d], fakeProjector(), theme);
        return out;
    }

    it('a box stretched far past the right edge keeps its labels on screen', () => {
        const out = labels([{ time: 20, price: 50 }, { time: 100_000, price: 45 }, { time: 100_000, price: 60 }]);
        expect(out.map((o) => o.t.split(':')[0])).toEqual(expect.arrayContaining(['Target', 'Stop']));
        for (const o of out) {
            // the whole label (left-aligned text from x) inside the 200 px plot
            expect(o.x).toBeGreaterThanOrEqual(0);
            expect(o.x + o.t.length * 2).toBeLessThanOrEqual(200);
        }
    });

    it('a box starting far off the left edge too', () => {
        const out = labels([{ time: -100_000, price: 50 }, { time: 150, price: 45 }, { time: 150, price: 60 }]);
        expect(out.length).toBeGreaterThan(0);
        for (const o of out) expect(o.x).toBeGreaterThanOrEqual(0);
    });
});

describe('DrawingPainter position trade line', () => {
    it('the dashed trade line paints only with Trade line on', () => {
        const proj: Projector = { ...fakeProjector(), barsInRange: () => [{ time: 30, open: 49, high: 52, low: 48, close: 51 }, { time: 40, open: 51, high: 56, low: 50, close: 55 }] };
        const dashes = (on: boolean): number => {
            const d = createDrawing('long-position', { id: 'p', paneId: 'price', anchors: [{ time: 20, price: 50 }, { time: 60, price: 40 }, { time: 60, price: 70 }], props: { showTradeLine: on } })!;
            let n = 0;
            const { ctx } = recordingCtx();
            (ctx as unknown as { setLineDash: (a: number[]) => void }).setLineDash = (a) => { if (a.length === 2 && a[0] === 4 && a[1] === 3) n += 1; };
            new DrawingPainter().paintAll(ctx, [d], proj, theme);
            return n;
        };
        expect(dashes(false)).toBe(0);
        expect(dashes(true)).toBe(1);
    });
});

describe('DrawingPainter position at a browser zoom', () => {
    it('lands label text and box edges on whole device pixels at dpr 1.25', () => {
        const d = createDrawing('long-position', { id: 'p', paneId: 'price', anchors: [{ time: 20.3, price: 50.37 }, { time: 140.7, price: 40.11 }, { time: 140.7, price: 70.53 }], props: { alwaysShowStats: true } })!;
        const texts: Array<[number, number]> = [];
        const rects: number[] = [];
        const { ctx } = recordingCtx();
        const c = ctx as unknown as Record<string, unknown>;
        c.getTransform = () => ({ a: 1.25 });
        c.fillText = (_t: string, x: number, y: number) => texts.push([x, y]);
        c.measureText = (t: string) => ({ width: t.length * 1.7 });
        c.fillRect = (x: number, y: number, w: number, h: number) => rects.push(x, y, x + w, y + h);
        new DrawingPainter().paintAll(ctx, [d], fakeProjector(), theme);
        const onDevice = (v: number): boolean => Math.abs(v * 1.25 - Math.round(v * 1.25)) < 1e-6;
        expect(texts.length).toBeGreaterThan(0);
        for (const [x, y] of texts) expect(onDevice(x) && onDevice(y)).toBe(true);
        for (const v of rects) expect(onDevice(v)).toBe(true);
    });
});

describe('DrawingPainter position PnL band', () => {
    it('deepens entry→last close on the profit side while the trade is up', () => {
        const proj: Projector = { ...fakeProjector(), barsInRange: () => [{ time: 30, open: 49, high: 52, low: 48, close: 51 }, { time: 40, open: 51, high: 56, low: 50, close: 55 }] };
        const d = createDrawing('long-position', { id: 'p', paneId: 'price', anchors: [{ time: 20, price: 50 }, { time: 60, price: 40 }, { time: 60, price: 70 }] })!;
        const rects: Array<[number, number, number, number]> = [];
        const { ctx } = recordingCtx();
        (ctx as unknown as Record<string, unknown>).fillRect = (x: number, y: number, w: number, h: number) => rects.push([x, y, w, h]);
        new DrawingPainter().paintAll(ctx, [d], proj, theme);
        // reward zone, risk zone, then the band from the entry (y 50) up to the last close 55 (y 45)
        expect(rects.length).toBe(3);
        expect(rects[2]).toEqual([20, 45, 40, 5]);
    });
});
