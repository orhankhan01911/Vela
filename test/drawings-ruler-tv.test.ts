import { describe, it, expect } from 'vitest';
import { MeasureOverlay } from '../src/renderers/native/drawings/MeasureOverlay';
import { DARK_THEME } from '../src/core/theme';
import type { Projector } from '../src/core/drawings';

/**
 * TradingView's ruler (module 649873, read 2026-10-30): box at 20 % of its blue (up) or red (down), 1 px lines across
 * and up/down through the middle with an open arrow at the end once 50 px long, a solid label 10 px past the end
 * (12 px text, 8 px gap, 9 px padding) reading `12.31 (0.31%) 1,231` / `18 bars, 19h` / `Vol 391.14 K`.
 */

type Op = [string, ...unknown[]];

function recorder(): { ctx: CanvasRenderingContext2D; ops: Op[]; fills: Array<{ style: unknown; op: Op }>; texts: string[] } {
    const ops: Op[] = [];
    const fills: Array<{ style: unknown; op: Op }> = [];
    const texts: string[] = [];
    const state: Record<string, unknown> = {};
    const ctx = new Proxy(state, {
        get(t, k: string) {
            if (k in t) return t[k];
            if (k === 'measureText') return (s: string) => ({ width: s.length * 7 });
            return (...a: unknown[]) => {
                const op: Op = [k, ...a];
                ops.push(op);
                if (k === 'fillRect' || k === 'fill') fills.push({ style: t.fillStyle, op });
                if (k === 'fillText') texts.push(String(a[0]));
            };
        },
        set(t, k: string, v) {
            t[k] = v;
            ops.push([`set:${k}`, v]);
            return true;
        },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, ops, fills, texts };
}

/** 1 px per minute across, 1 price per px down from 1000 at y = 0; 600 px tall; bars every minute with volume 10. */
function projector(withVolume = true): Projector {
    return {
        height: 600,
        xOf: (t: number) => t / 60_000,
        yOf: (p: number) => 1000 - p,
        pxToPoint: (x: number, y: number, paneId: string) => ({ time: x * 60_000, price: 1000 - y, paneId }),
        paneIdAtY: () => 'price',
        paneRect: () => ({ top: 0, height: 600 }),
        barsBetween: (a: number, b: number) => Math.abs(b - a) / 60_000,
        barsInRange: (from: number, to: number) => {
            const out = [];
            for (let t = from; t <= to; t += 60_000) out.push({ time: t, open: 1, high: 1, low: 1, close: 1, ...(withVolume ? { volume: 10 } : {}) });
            return out;
        },
    } as unknown as Projector;
}

function measure(x1: number, y1: number, x2: number, y2: number): MeasureOverlay {
    const m = new MeasureOverlay();
    m.down(x1, y1);
    m.move(x2, y2);
    m.down(x2, y2);
    return m;
}

const tick = (): number => 0.01;

describe('ruler: TradingView look', () => {
    it('up: blue box, blue-600 lines, blue label, TradingView text', () => {
        const { ctx, ops, fills, texts } = recorder();
        measure(100, 400, 280, 300).paint(ctx, projector(), DARK_THEME, tick);
        expect(fills[0]!.style).toBe('rgba(41, 98, 255, 0.2)');
        expect(ops.find((o) => o[0] === 'set:strokeStyle')![1]).toBe('#1E53E5');
        expect(fills.find((f) => f.op[0] === 'fill')!.style).toBe('#2962FF');
        // 100 up from 600 -> 700 is +16.67 %; 180 bars of 1 m = 3h; 181 bars x 10 volume.
        expect(texts).toEqual(['100.00 (16.67%) 10,000', '180 bars, 3h', 'Vol 1.81 K']);
    });

    it('down and to the left: red, minus signs, negative bars and time', () => {
        const { ctx, fills, texts } = recorder();
        measure(280, 300, 100, 400).paint(ctx, projector(), DARK_THEME, tick);
        expect(fills[0]!.style).toBe('rgba(247, 82, 95, 0.2)');
        expect(fills.find((f) => f.op[0] === 'fill')!.style).toBe('#F7525F');
        expect(texts).toEqual(['−100.00 (−14.29%) −10,000', '-180 bars, -3h', 'Vol 1.81 K']);
    });

    it('no volume line when the bars carry no volume', () => {
        const { ctx, texts } = recorder();
        measure(100, 400, 280, 300).paint(ctx, projector(false), DARK_THEME, tick);
        expect(texts).toHaveLength(2);
    });

    it('arrows only on lines at least 50 px long, at the end drawn to', () => {
        const { ctx, ops } = recorder();
        measure(100, 400, 280, 380).paint(ctx, projector(), DARK_THEME, tick); // 180 across, 20 up
        const lines = ops.filter((o) => o[0] === 'lineTo').map((o) => [o[1], o[2]]);
        // across: line to x2 then the arrow's tip at x2; up/down: just the line (20 px)
        expect(lines.filter(([x]) => x === 280)).toHaveLength(2);
        expect(lines.filter(([, y]) => y === 380)).toHaveLength(1);
    });

    it('label: 12 px, 9 px padding, 8 px gap, 10 px above the end of an upward ruler', () => {
        const { ctx, ops } = recorder();
        measure(100, 400, 280, 300).paint(ctx, projector(), DARK_THEME, tick);
        const font = ops.filter((o) => o[0] === 'set:font').pop()![1] as string;
        expect(font.startsWith('12px ')).toBe(true);
        const box = ops.find((o) => o[0] === 'roundRect')!;
        const h = 3 * 12 + 2 * 8 + 18;
        expect(box[4]).toBe(h);
        expect(box[5]).toBe(4);
        expect(box[2]).toBe(300 - 10 - h);
    });

    it('label flips below when there is no room above', () => {
        const { ctx, ops } = recorder();
        measure(100, 200, 280, 20).paint(ctx, projector(), DARK_THEME, tick);
        const box = ops.find((o) => o[0] === 'roundRect')!;
        expect(box[2]).toBe(200 + 10);
    });
});

describe('ruler: its span on the axes (TradingView shades both scales and labels both ends)', () => {
    it('chartPoints gives the two ends as chart points in their pane, for the axis marks', () => {
        const m = measure(100, 300, 160, 250);
        expect(m.chartPoints(projector())).toEqual({ paneId: 'price', a: { time: 100 * 60_000, price: 700 }, b: { time: 160 * 60_000, price: 750 } });
        expect(new MeasureOverlay().chartPoints(projector())).toBeNull();
    });
});
