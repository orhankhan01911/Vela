// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { TypedEventBus } from '../src/core/events/EventBus';
import type { VelaEventMap } from '../src/core/events/types';
import { DrawingController } from '../src/core/drawings/DrawingController';
import { clearToolSettings, createDrawing, toolSettings } from '../src/core/drawings';
import { reloadToolSettingsForTest } from '../src/core/drawings/toolMemory';
import type { IDrawingsRendererPort, DrawingIntent, SerializedDrawing } from '../src/core/drawings';
import type { IChartRenderer } from '../src/core/ports/IChartRenderer';

/** A port that records nothing but lets a test fire intents (placements, edits) like the renderer. */
function harness() {
    let cb: ((i: DrawingIntent) => void) | null = null;
    const noop = () => {};
    const port = new Proxy({} as Record<string, unknown>, {
        get: (_t, k) => (k === 'onDrawingIntent' ? (f: (i: DrawingIntent) => void) => ((cb = f), noop) : noop),
    }) as unknown as IDrawingsRendererPort;
    const renderer = { capabilities: { userDrawings: true }, userDrawingsPort: port } as unknown as IChartRenderer;
    const ctrl = new DrawingController(renderer, new TypedEventBus<VelaEventMap>(), undefined);
    return { ctrl, fire: (i: DrawingIntent) => cb?.(i) };
}

const draft = (type: SerializedDrawing['type'], extra: Partial<SerializedDrawing> = {}): SerializedDrawing => ({
    id: 'tmp',
    type,
    paneId: 'price',
    anchors: [{ time: 1000, price: 100 }, { time: 2000, price: 110 }],
    style: { lineColor: '#2962ff', lineWidth: 1, lineStyle: 'solid' },
    locked: false,
    visible: true,
    zIndex: 0,
    createdAt: 0,
    ...extra,
});

describe('per-tool last-used settings (TradingView: the next drawing starts from them)', () => {
    beforeEach(() => {
        localStorage.clear();
        reloadToolSettingsForTest();
        clearToolSettings();
    });

    it('a stock fixed-range VP keeps its edited rows for the next one, across a reload', () => {
        const a = harness();
        a.fire({ kind: 'create', doc: draft('fixedrangevp') });
        const first = a.ctrl.all()[0]!;
        const edited = { ...first, props: { ...(first.props ?? {}), rows: 77 }, style: { ...first.style, lineColor: '#ff0000' } };
        a.fire({ kind: 'edit', doc: edited });
        a.fire({ kind: 'create', doc: draft('fixedrangevp') });
        const second = a.ctrl.all()[1]!;
        expect((second.props as { rows?: number }).rows).toBe(77);
        expect(second.style.lineColor).toBe('#ff0000');
        // a reload: memory read back from storage by a fresh chart
        reloadToolSettingsForTest();
        const b = harness();
        b.fire({ kind: 'create', doc: draft('fixedrangevp') });
        expect((b.ctrl.all()[0]!.props as { rows?: number }).rows).toBe(77);
    });

    it('a trend line keeps its colour, width and text look but never its text', () => {
        const a = harness();
        a.fire({ kind: 'create', doc: draft('trendline', { text: { value: 'mine', color: '#00ff00', size: 'large' } as SerializedDrawing['text'] }) });
        const d = a.ctrl.all()[0]!;
        a.fire({ kind: 'edit', doc: { ...d, style: { ...d.style, lineWidth: 4 } } });
        a.fire({ kind: 'create', doc: draft('trendline', { text: { value: '' } as SerializedDrawing['text'] }) });
        const next = a.ctrl.all()[1]!;
        expect(next.style.lineWidth).toBe(4);
        expect(next.text?.color).toBe('#00ff00');
        expect(next.text?.value).toBe('');
        expect(toolSettings('trendline')?.text).not.toHaveProperty('value');
    });

    it('settings remembered from a Fib\'s old look do not replace TradingView\'s on a new one; its own do (2026-10-31)', () => {
        // The user's recording: a Fib placed after editing an old-look one came out with the old levels, no trend line
        // and 1 px, while the drag preview showed TradingView's look.
        localStorage.setItem('vela.drawings.toolSettings.v1', JSON.stringify({
            fibretracement: {
                style: { lineColor: '#38c0fd', lineWidth: 1, lineStyle: 'solid' },
                props: { levels: [{ ratio: 0, color: '#787b86', enabled: true }, { ratio: 1.272, color: '#5b9cf6', enabled: true }], trendline: false, fillOpacity: 0.06 },
            },
        }));
        reloadToolSettingsForTest();
        const preview = createDrawing('fibretracement', { id: 'tmp', paneId: 'price', anchors: [{ time: 1000, price: 100 }, { time: 2000, price: 110 }] })!.serialize();
        const a = harness();
        a.fire({ kind: 'create', doc: preview });
        const placed = a.ctrl.all()[0]! as unknown as { props: { tv?: boolean; trendline?: boolean; levels: unknown[] }; style: { lineWidth?: number } };
        expect([placed.props.tv, placed.props.trendline, placed.props.levels.length, placed.style.lineWidth]).toEqual([true, true, 24, 2]);
        // Its own edits (now TradingView-look memory) carry to the next one, like every tool's.
        const d = a.ctrl.all()[0]!;
        a.fire({ kind: 'edit', doc: { ...d, style: { ...d.style, lineWidth: 3 }, props: { ...(d.props ?? {}), fontSize: 16 } } });
        a.fire({ kind: 'create', doc: preview });
        const next = a.ctrl.all()[1]!;
        expect([next.style.lineWidth, (next.props as { fontSize?: number }).fontSize]).toEqual([3, 16]);
    });

    it('each tool keeps its own settings', () => {
        const a = harness();
        a.fire({ kind: 'create', doc: draft('hline', { style: { lineColor: '#111111', lineWidth: 2, lineStyle: 'dashed' } }) });
        a.fire({ kind: 'create', doc: draft('box') });
        expect(toolSettings('hline')?.style.lineColor).toBe('#111111');
        expect(toolSettings('box')?.style.lineColor).toBe('#2962ff');
    });

    it('content types remember their style only (an image url is not a setting)', () => {
        const a = harness();
        a.fire({ kind: 'create', doc: draft('pricealert', { props: { condition: 'crossing' } }) });
        expect(toolSettings('pricealert')?.props).toBeUndefined();
    });
});
