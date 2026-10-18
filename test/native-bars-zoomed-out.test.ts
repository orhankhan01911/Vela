import { describe, it, expect } from 'vitest';
import { Canvas2dBackend } from '../src/renderers/native/backend/Canvas2dBackend';
import { CoordinateSystem } from '../src/renderers/native/core/CoordinateSystem';
import { SceneGraph } from '../src/renderers/native/core/SceneGraph';
import type { VelaTheme } from '../src/core/options';

/**
 * Tester report 2026-10-17: a bar chart "turns into candles" when zoomed out. Between 1 and 3 px
 * per bar the open/close ticks were dropped, leaving plain sticks that look like zoomed-out
 * candles. Bars now keep their ticks down to 2 px per bar.
 */
const THEME: VelaTheme = {
    background: '#000000', textColor: '#cccccc', gridColor: '#222222', borderColor: '#333333',
    upColor: '#00AA00', downColor: '#AA0000', fontFamily: 'sans-serif',
};

/** Count the horizontal segments (open/close ticks) a bars paint draws at a given bar spacing. */
function horizontalSegments(spacing: number): number {
    let horizontal = 0;
    let last: [number, number] | null = null;
    const noop = (): void => undefined;
    const ctx = {
        fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, lineJoin: 'miter', lineCap: 'butt',
        setTransform: noop, clearRect: noop, save: noop, restore: noop, beginPath: noop, closePath: noop,
        rect: noop, clip: noop, arcTo: noop, arc: noop, setLineDash: noop, fill: noop, stroke: noop,
        fillRect: noop, strokeRect: noop, createLinearGradient: () => ({ addColorStop: noop }),
        moveTo: (x: number, y: number) => { last = [x, y]; },
        lineTo: (x: number, y: number) => {
            if (last && last[1] === y && last[0] !== x) horizontal += 1;
            last = [x, y];
        },
    } as unknown as CanvasRenderingContext2D;
    const backend = new Canvas2dBackend();
    backend.mount({ width: 400, height: 100, getContext: () => ctx } as unknown as HTMLCanvasElement);
    const scene = new SceneGraph();
    scene.priceStyle = 'bars';
    scene.showGrid = false;
    const bars = Array.from({ length: 50 }, (_, i) => ({ time: i * 60_000, open: 100, high: 106, low: 98, close: 104 }));
    scene.bars = bars;
    const pane = scene.ensurePane('price', 'price', 0, 3);
    pane.bounds = { top: 0, height: 100 };
    pane.scale = { min: 95, max: 110 };
    const coords = new CoordinateSystem();
    coords.setSize(400, 100, 1);
    coords.setBars(bars.map((b) => b.time));
    coords.setViewport({ barSpacing: spacing, rightOffset: 0 });
    backend.render(scene, coords, THEME);
    return horizontal;
}

describe('canvas2d bars: open/close ticks survive a wide zoom', () => {
    it('keeps both ticks per bar at 2.5 px and 2 px per bar (bars must not look like candles)', () => {
        expect(horizontalSegments(2.5)).toBe(100);
        expect(horizontalSegments(2)).toBe(100);
    });

    it('drops them only when there is no room (1.5 px per bar)', () => {
        expect(horizontalSegments(1.5)).toBe(0);
    });
});
