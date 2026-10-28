import { describe, it, expect } from 'vitest';
import { DrawingPainter } from '../src/renderers/native/drawings/DrawingPainter';
import { createProjector } from '../src/renderers/native/drawings/Projector';
import { Drawing, registerDrawingType, createDrawing, getDrawingType, type Projector, type SettingsSchema, type DrawingTypeKey } from '../src/core/drawings';
import type { VelaTheme } from '../src/core/options';

/** A host-registered type that paints itself: records what the painter handed it. */
class HostPainted extends Drawing {
    readonly type = 'fixedrangetpo' as DrawingTypeKey;
    static calls: Array<{ host: unknown; repaint: boolean }> = [];
    anchorSchema() {
        return { min: 2, max: 2, slots: [{ role: 'start', free: 'x' as const }, { role: 'end', free: 'x' as const }] };
    }
    override paintSelf(_ctx: CanvasRenderingContext2D, proj: Projector): boolean {
        HostPainted.calls.push({ host: proj.host, repaint: typeof proj.requestRepaint === 'function' });
        return true;
    }
    override placementPreview(): 'timespan' {
        return 'timespan';
    }
    hitTest() { return false; }
    hitHandle() { return -1; }
    handlePoints(): Array<[number, number]> { return []; }
    bounds() { return null; }
    priceRange() { return null; }
    schema(): SettingsSchema { return { fields: [] }; }
}

function ctxStub() {
    let lines = 0;
    const noop = () => {};
    const ctx = new Proxy({ globalAlpha: 1, measureText: () => ({ width: 0 }), lineTo: () => { lines += 1; } } as Record<string, unknown>, {
        get: (t, k) => (k in t ? t[k as string] : noop),
        set: (t, k, v) => { t[k as string] = v; return true; },
    });
    return { ctx: ctx as unknown as CanvasRenderingContext2D, lines: () => lines };
}

const theme = { textColor: '#fff', fontFamily: 'sans-serif' } as unknown as VelaTheme;
const proj = (host?: unknown): Projector => ({
    xOf: (t) => t,
    yOf: (p, pane) => (pane === 'price' ? 100 - p : null),
    pxToPoint: (x, y) => ({ time: x, price: 100 - y }),
    paneIdAtY: () => 'price',
    width: 200,
    height: 100,
    host,
    requestRepaint: () => {},
});

describe('host-painted drawings (Drawing.paintSelf)', () => {
    it('a built-in drawing paints nothing through the hook', () => {
        const d = createDrawing('hline', { paneId: 'price', anchors: [{ time: 10, price: 50 }] })!;
        expect(d.paintSelf(ctxStub().ctx, proj(), theme)).toBe(false);
        expect(d.placementPreview()).toBe('shape');
    });

    it('a registered replacement type paints itself and sees the host', () => {
        const stock = getDrawingType('fixedrangetpo')!;
        try {
            registerDrawingType({ ...stock, create: (init) => new HostPainted(init) });
            const d = createDrawing('fixedrangetpo', { paneId: 'price', anchors: [{ time: 10, price: 50 }, { time: 90, price: 50 }] })!;
            expect(d).toBeInstanceOf(HostPainted);
            HostPainted.calls = [];
            const host = { name: 'chart' };
            const { ctx, lines } = ctxStub();
            new DrawingPainter().paintAll(ctx, [d], proj(host), theme, {});
            expect(HostPainted.calls).toEqual([{ host, repaint: true }]);
            expect(lines()).toBe(0); // nothing of the built-in look
        } finally {
            registerDrawingType(stock);
        }
    });

    it('a timespan placement preview paints the guides, never the body', () => {
        const d = new HostPainted({ paneId: 'price', anchors: [{ time: 10, price: 50 }, { time: 90, price: 40 }] });
        HostPainted.calls = [];
        const { ctx, lines } = ctxStub();
        new DrawingPainter().paintGhost(ctx, d, proj(), theme);
        expect(HostPainted.calls).toEqual([]);
        expect(lines()).toBeGreaterThan(0); // the two guides + the connecting line
    });

    it('the projector carries host and requestRepaint through', () => {
        let n = 0;
        const coords = { timeToX: (t: number) => t, priceToY: () => 0, width: 10, height: 10 } as never;
        const p = createProjector(coords, () => null, () => null, undefined, undefined, { host: 'h', requestRepaint: () => { n += 1; } });
        expect(p.host).toBe('h');
        p.requestRepaint?.();
        expect(n).toBe(1);
    });
});
