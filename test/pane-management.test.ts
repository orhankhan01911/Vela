import { describe, it, expect, vi } from 'vitest';
import { Vela } from '../src/index';
import type {
    IChartRenderer,
    RendererCapabilities,
    IndicatorRenderHandle,
    CrosshairEvent,
    ClickEvent,
    InputChangeEvent,
    VisibleRange,
    PaneAction,
} from '../src/core/ports/IChartRenderer';
import type {
    ScriptingEngine,
    EngineCapabilities,
    PreparedScript,
    ExecutionRequest,
    ExecutionHandlers,
    ExecutionSession,
} from '../src/core/ports/ScriptingEngine';
import type { MarketDataFeed } from '../src/core/ports/MarketDataFeed';
import type { OHLCV } from '../src/core/model/ohlcv';
import type { Pane } from '../src/core/model/scene';
import type { IndicatorModel } from '../src/core/model/indicator';
import type { ScenePatch } from '../src/core/model/patch';
import type { InputValue } from '../src/core/model/inputs';
import type { VelaTheme, MoveTarget } from '../src/core/options';
import type { Unsubscribe } from '../src/core/util/types';
import { applyPaneLayout, paneLayoutOf } from '../src/workspace/pane-layout';

const flush = async (): Promise<void> => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
};

function makeBars(n: number): OHLCV[] {
    const bars: OHLCV[] = [];
    let price = 100;
    for (let i = 0; i < n; i += 1) {
        price += Math.sin(i / 3);
        bars.push({ time: 1_700_000_000_000 + i * 3_600_000, open: price, high: price + 1, low: price - 1, close: price, volume: 10 });
    }
    return bars;
}

class MockDataFeed implements MarketDataFeed {
    load(): Promise<OHLCV[]> { return Promise.resolve(makeBars(50)); }
    subscribe(): Unsubscribe { return () => {}; }
}

/** A renderer that fully honors pane management — records the pane ops the orchestrator drives. */
class PaneRenderer implements IChartRenderer {
    readonly capabilities: RendererCapabilities = {
        panes: true, paneManagement: true, fills: 'native', bgcolor: 'native', hline: 'native',
        markers: true, barcolor: 'native', perPointColor: true, drawings: true, userDrawings: false, tables: true, inputsUI: true,
    };
    readonly name = 'pane-fake';
    readonly features: readonly string[] = [];
    panes: Pane[] = [];
    removedPanes: string[] = [];
    mountedModels: IndicatorModel[] = [];
    removed: string[] = [];
    setPaneCalls: { id: string; paneId: string; ownScale: boolean }[] = [];
    orderCalls: string[][] = [];
    collapseCalls: { id: string; collapsed: boolean }[] = [];
    maximizeCalls: (string | null)[] = [];
    private paneActionCb: ((a: PaneAction) => void) | null = null;
    private moveCb: ((id: string, target: MoveTarget) => void) | null = null;

    mount(): void {}
    setTheme(): void {}
    resize(): void {}
    applyFeature(): void {}
    readFeature(): unknown { return undefined; }
    destroy(): void {}
    setBars(): void {}
    updateBar(): void {}
    ensurePane(pane: Pane): void { this.panes = this.panes.filter((p) => p.id !== pane.id); this.panes.push(pane); }
    removePane(id: string): void { this.removedPanes.push(id); this.panes = this.panes.filter((p) => p.id !== id); }
    mountIndicator(model: IndicatorModel): IndicatorRenderHandle { this.mountedModels.push(model); return { id: model.id }; }
    updateIndicator(_h: IndicatorRenderHandle, _p: ScenePatch): void {}
    removeIndicator(h: IndicatorRenderHandle): void { this.removed.push(h.id); }
    setIndicatorInputs(): void {}
    setIndicatorVisible(): void {}
    setIndicatorStatus(): void {}
    setIndicatorPane(h: IndicatorRenderHandle, paneId: string, opts?: { ownScale?: boolean }): void {
        this.setPaneCalls.push({ id: h.id, paneId, ownScale: opts?.ownScale === true });
    }
    orderPanes(ids: string[]): void { this.orderCalls.push([...ids]); }
    setPaneCollapsed(id: string, collapsed: boolean): void { this.collapseCalls.push({ id, collapsed }); }
    setPaneMaximized(id: string | null): void { this.maximizeCalls.push(id); }
    onPaneAction(cb: (a: PaneAction) => void): Unsubscribe { this.paneActionCb = cb; return () => { this.paneActionCb = null; }; }
    firePaneAction(a: PaneAction): void { this.paneActionCb?.(a); }
    onMoveIndicator(cb: (id: string, target: MoveTarget) => void): Unsubscribe { this.moveCb = cb; return () => { this.moveCb = null; }; }
    fireMove(id: string, target: MoveTarget): void { this.moveCb?.(id, target); }
    private inputCb: ((e: InputChangeEvent) => void) | null = null;
    onInputChange(cb: (e: InputChangeEvent) => void): Unsubscribe { this.inputCb = cb; return () => { this.inputCb = null; }; }
    fireInputChange(e: InputChangeEvent): void { this.inputCb?.(e); }
    onRemoveIndicator(_cb: (id: string) => void): Unsubscribe { return () => {}; }
    onToggleIndicatorVisible(_cb: (id: string, v: boolean) => void): Unsubscribe { return () => {}; }
    onCrosshairMove(_cb: (e: CrosshairEvent) => void): Unsubscribe { return () => {}; }
    onClick(_cb: (e: ClickEvent) => void): Unsubscribe { return () => {}; }
    getVisibleRange(): VisibleRange | null { return null; }
    setVisibleRange(): void {}
    onViewportChange(_cb: (r: VisibleRange) => void): Unsubscribe { return () => {}; }
}

/** A renderer WITHOUT pane management (mirrors LWC): mutations should warn + no-op. */
class FlatRenderer extends PaneRenderer {
    override readonly capabilities: RendererCapabilities = {
        panes: true, paneManagement: false, fills: 'native', bgcolor: 'native', hline: 'native',
        markers: true, barcolor: 'native', perPointColor: true, drawings: true, userDrawings: false, tables: true, inputsUI: true,
    };
    // Drop the pane-management methods so paneManagementSupported() is false.
    override setIndicatorPane = undefined as unknown as PaneRenderer['setIndicatorPane'];
}

class MockEngine implements ScriptingEngine {
    readonly language = 'pine';
    readonly capabilities: EngineCapabilities = { streaming: true, visibleRange: true, inputs: true };
    prepare(source: string, instanceId: string): Promise<PreparedScript> {
        const overlay = /overlay\s*=\s*true/.test(source);
        return Promise.resolve({ language: 'pine', inputs: [], meta: { title: 'Mock', overlay }, reactsToViewport: false, token: { instanceId, overlay } });
    }
    execute(req: ExecutionRequest, handlers: ExecutionHandlers): ExecutionSession {
        const token = req.prepared.token as { instanceId: string; overlay: boolean };
        const bars = req.getBars?.() ?? req.bars;
        // A FRESH model each emit (no ownScale) — mirrors how a recompute produces a new model.
        const emit = (): void => {
            handlers.onModel({
                id: token.instanceId, title: 'Mock', overlay: token.overlay, paneHint: token.overlay ? 'price' : 'new',
                series: [{ id: `${token.instanceId}:line#0`, title: 'Mock', paneId: 'unrouted', kind: 'line', points: bars.map((b) => ({ time: b.time, value: b.close })), style: { color: '#f00', width: 1, lineStyle: 'solid' } }],
                fills: [], backgrounds: [], priceLines: [], inputs: [], inputValues: {},
            });
            handlers.onDone?.();
        };
        emit();
        return { stop: () => {}, update: () => emit(), setVisibleRange: () => {}, notifyBars: () => {} };
    }
}

async function makeChart(RendererCtor: new () => PaneRenderer = PaneRenderer): Promise<{ chart: Vela; renderer: PaneRenderer }> {
    const renderer = new RendererCtor();
    const chart = new Vela({} as unknown as HTMLElement, { live: false, volume: false }, { renderer, engines: [new MockEngine()], dataFeed: new MockDataFeed() });
    await chart.ready();
    await flush();
    return { chart, renderer };
}

describe('pane management — move / merge', () => {
    it('merges a study into another study pane with its own scale, dropping the vacated pane', async () => {
        const { chart, renderer } = await makeChart();
        const a = chart.addIndicator('//@version=5\nindicator("A")\nplot(close)');
        const b = chart.addIndicator('//@version=5\nindicator("B")\nplot(close)');
        await flush();

        const before = chart.panes.list();
        expect(before.filter((p) => p.kind === 'study')).toHaveLength(2);
        const paneA = before.find((p) => p.indicators.some((i) => i.id === a.id))!;

        b.moveTo({ pane: paneA.id });
        await flush();

        const after = chart.panes.list();
        const studies = after.filter((p) => p.kind === 'study');
        expect(studies).toHaveLength(1); // b's old pane was emptied + removed
        const merged = studies[0]!;
        expect(merged.id).toBe(paneA.id);
        expect(merged.indicators.map((i) => i.id).sort()).toEqual([a.id, b.id].sort());
        // b got its own scale column (it doesn't own the pane); a still shares the pane scale.
        expect(merged.indicators.find((i) => i.id === b.id)!.ownScale).toBe(true);
        expect(merged.indicators.find((i) => i.id === a.id)!.ownScale).toBe(false);
        // The renderer was driven with the ownScale flag, and the empty pane torn down.
        expect(renderer.setPaneCalls.some((c) => c.id === b.id && c.paneId === paneA.id && c.ownScale)).toBe(true);
        expect(renderer.removedPanes.length).toBeGreaterThan(0);
    });

    it('moving onto the price pane: a non-overlay gets its own scale, an overlay shares the price scale', async () => {
        const { chart } = await makeChart();
        const study = chart.addIndicator('//@version=5\nindicator("S")\nplot(close)');
        const overlay = chart.addIndicator('//@version=5\nindicator("O", overlay=true)\nplot(close)');
        await flush();

        study.moveTo('price');
        await flush();
        const price = chart.panes.list().find((p) => p.kind === 'price')!;
        expect(price.indicators.find((i) => i.id === study.id)!.ownScale).toBe(true);

        // The overlay already lives on price sharing its scale; re-asserting 'price' keeps it shared.
        overlay.moveTo('price');
        await flush();
        const price2 = chart.panes.list().find((p) => p.kind === 'price')!;
        expect(price2.indicators.find((i) => i.id === overlay.id)!.ownScale).toBe(false);
    });

    it('preserves a merged indicator own-scale flag across a recompute (live tick / input change)', async () => {
        const { chart, renderer } = await makeChart();
        const a = chart.addIndicator('//@version=5\nindicator("A")\nplot(close)');
        const b = chart.addIndicator('//@version=5\nindicator("B")\nplot(close)');
        await flush();
        const paneA = chart.panes.list().find((p) => p.indicators.some((i) => i.id === a.id))!.id;

        b.moveTo({ pane: paneA });
        await flush();
        expect(chart.panes.list().find((p) => p.id === paneA)!.indicators.find((i) => i.id === b.id)!.ownScale).toBe(true);

        // A recompute (input change here; a live tick is the same path) must NOT reset the merge.
        renderer.fireInputChange({ indicatorId: b.id, key: 'len', value: 5 });
        await flush();
        const merged = chart.panes.list().find((p) => p.id === paneA)!;
        expect(merged.indicators.map((i) => i.id).sort()).toEqual([a.id, b.id].sort()); // still merged into paneA
        expect(merged.indicators.find((i) => i.id === b.id)!.ownScale).toBe(true); // own-scale survives
    });

    it('moving to a new pane creates one the indicator owns (shared scale, no own-scale column)', async () => {
        const { chart, renderer } = await makeChart();
        const overlay = chart.addIndicator('//@version=5\nindicator("O", overlay=true)\nplot(close)');
        await flush();
        expect(chart.panes.list().find((p) => p.indicators.some((i) => i.id === overlay.id))!.kind).toBe('price');

        overlay.moveTo({ newPane: { after: 'price' } });
        await flush();
        const panes = chart.panes.list();
        const own = panes.find((p) => p.kind === 'study' && p.indicators.some((i) => i.id === overlay.id))!;
        expect(own).toBeDefined();
        expect(own.indicators.find((i) => i.id === overlay.id)!.ownScale).toBe(false); // owns the pane ⇒ shares its scale
        expect(renderer.setPaneCalls.some((c) => c.id === overlay.id && c.ownScale === false)).toBe(true);
    });
});

describe('pane management — undo a move (indicator:moved from + panes.place)', () => {
    it('a merge reports where it came from, and placing it back re-opens its pane in the same spot', async () => {
        const { chart } = await makeChart();
        const a = chart.addIndicator('//@version=5\nindicator("A")\nplot(close)');
        const b = chart.addIndicator('//@version=5\nindicator("B")\nplot(close)');
        const c = chart.addIndicator('//@version=5\nindicator("C")\nplot(close)');
        await flush();
        const order0 = chart.panes.list().map((p) => p.id);
        const paneOf = (id: string): string => chart.panes.list().find((p) => p.indicators.some((i) => i.id === id))!.id;
        const paneB = paneOf(b.id);
        const events: Array<{ id: string; paneId: string; ownScale?: boolean; from?: { paneId: string; ownScale: boolean; before?: string } }> = [];
        chart.on('indicator:moved', (e) => events.push(e));

        b.moveTo({ pane: paneOf(a.id) }); // merge B up into A
        await flush();
        expect(events).toHaveLength(1);
        expect(events[0]!.ownScale).toBe(true);
        expect(events[0]!.from).toEqual({ paneId: paneB, ownScale: false, before: paneOf(c.id) });
        expect(chart.panes.list().filter((p) => p.kind === 'study')).toHaveLength(2);

        chart.panes.place(b.id, events[0]!.from!); // undo
        await flush();
        expect(chart.panes.list().map((p) => p.id)).toEqual(order0); // same panes, same order
        const back = chart.panes.list().find((p) => p.id === paneB)!;
        expect(back.indicators.map((i) => i.id)).toEqual([b.id]);
        expect(back.indicators[0]!.ownScale).toBe(false);
    });

    it('placing into an existing pane keeps the exact scale flag', async () => {
        const { chart } = await makeChart();
        const a = chart.addIndicator('//@version=5\nindicator("A")\nplot(close)');
        await flush();
        chart.panes.place(a.id, { paneId: 'price', ownScale: true });
        await flush();
        const price = chart.panes.list().find((p) => p.kind === 'price')!;
        expect(price.indicators.find((i) => i.id === a.id)!.ownScale).toBe(true);
    });
});

describe('pane layout save / restore (CellState.panes)', () => {
    it('a merged layout saved by ledger position comes back on a fresh chart', async () => {
        const src = '//@version=5\nindicator("X")\nplot(close)';
        const one = await makeChart();
        const [a, b, c] = [one.chart.addIndicator(src), one.chart.addIndicator(src), one.chart.addIndicator(src)];
        await flush();
        const paneOf = (chart: Vela, id: string): string => chart.panes.list().find((p) => p.indicators.some((i) => i.id === id))!.id;
        c.moveTo({ pane: paneOf(one.chart, a.id) }); // C merged into A; B keeps its own pane
        a.moveTo('price'); // and A onto the main chart, on its own scale
        await flush();
        const refs = new Map([[a.id, 'n0'], [b.id, 'n1'], [c.id, 'n2']]);
        const layout = paneLayoutOf(one.chart.panes.list(), (id) => refs.get(id));
        expect(layout.slots[0]).toEqual([{ ref: 'n0', ownScale: true }]);

        const two = await makeChart();
        const [a2, b2, c2] = [two.chart.addIndicator(src), two.chart.addIndicator(src), two.chart.addIndicator(src)];
        await flush();
        const ids = new Map([['n0', a2.id], ['n1', b2.id], ['n2', c2.id]]);
        applyPaneLayout(layout, (r) => ids.get(r), two.chart.panes);
        await flush();
        const back = new Map([[a2.id, 'n0'], [b2.id, 'n1'], [c2.id, 'n2']]);
        expect(paneLayoutOf(two.chart.panes.list(), (id) => back.get(id))).toEqual(layout);
    });
});

describe('pane management — order / collapse / maximize', () => {
    it('movePane reorders study panes and pushes the new order to the renderer', async () => {
        const { chart, renderer } = await makeChart();
        chart.addIndicator('//@version=5\nindicator("A")\nplot(close)');
        const b = chart.addIndicator('//@version=5\nindicator("B")\nplot(close)');
        await flush();

        const list = chart.panes.list();
        const bPane = list.find((p) => p.indicators.some((i) => i.id === b.id))!;
        expect(bPane.order).toBe(2); // price(0), A(1), B(2)

        chart.panes.move(bPane.id, 'up');
        await flush();
        const reordered = chart.panes.list();
        expect(reordered.find((p) => p.id === bPane.id)!.order).toBe(1); // B now above A
        expect(renderer.orderCalls.length).toBeGreaterThan(0);
        expect(renderer.orderCalls[renderer.orderCalls.length - 1]![0]).toBe('price'); // price still on top

        // TradingView: Move pane up right under the main chart puts the pane above it.
        chart.panes.move(bPane.id, 'up');
        await flush();
        expect(chart.panes.list().map((p) => p.kind)).toEqual(['study', 'price', 'study']);
        expect(renderer.orderCalls[renderer.orderCalls.length - 1]![0]).toBe(bPane.id);
        chart.panes.move(bPane.id, 'up'); // already on top: no-op
        await flush();
        expect(chart.panes.list()[0]!.id).toBe(bPane.id);
    });

    it('a pane moved above the main chart is saved and restored there', async () => {
        const src = '//@version=5\nindicator("X")\nplot(close)';
        const one = await makeChart();
        const [a, b] = [one.chart.addIndicator(src), one.chart.addIndicator(src)];
        await flush();
        const paneOf = (chart: Vela, id: string): string => chart.panes.list().find((p) => p.indicators.some((i) => i.id === id))!.id;
        one.chart.panes.move(paneOf(one.chart, a.id), 'up');
        await flush();
        const refs = new Map([[a.id, 'n0'], [b.id, 'n1']]);
        const layout = paneLayoutOf(one.chart.panes.list(), (id) => refs.get(id));
        expect(layout).toEqual({ slots: [[], [{ ref: 'n0' }], [{ ref: 'n1' }]], priceAt: 1 });

        const two = await makeChart();
        const [a2, b2] = [two.chart.addIndicator(src), two.chart.addIndicator(src)];
        await flush();
        const ids = new Map([['n0', a2.id], ['n1', b2.id]]);
        applyPaneLayout(layout, (r) => ids.get(r), two.chart.panes);
        await flush();
        const list = two.chart.panes.list();
        expect(list.map((p) => p.kind)).toEqual(['study', 'price', 'study']);
        expect(list[0]!.indicators[0]!.id).toBe(a2.id);
    });

    it('collapse + maximize flow through to the renderer and the pane list', async () => {
        const { chart, renderer } = await makeChart();
        const a = chart.addIndicator('//@version=5\nindicator("A")\nplot(close)');
        await flush();
        const paneId = chart.panes.list().find((p) => p.indicators.some((i) => i.id === a.id))!.id;

        chart.panes.collapse(paneId, true);
        expect(chart.panes.list().find((p) => p.id === paneId)!.collapsed).toBe(true);
        expect(renderer.collapseCalls).toContainEqual({ id: paneId, collapsed: true });

        chart.panes.maximize(paneId);
        expect(chart.panes.list().find((p) => p.id === paneId)!.maximized).toBe(true);
        expect(renderer.maximizeCalls[renderer.maximizeCalls.length - 1]).toBe(paneId);

        chart.panes.maximize(null);
        expect(chart.panes.list().every((p) => !p.maximized)).toBe(true);
    });
});

describe('pane management — renderer-initiated actions', () => {
    it('a pane "remove" action tears down every indicator in that pane', async () => {
        const { chart, renderer } = await makeChart();
        const a = chart.addIndicator('//@version=5\nindicator("A")\nplot(close)');
        await flush();
        const paneId = chart.panes.list().find((p) => p.indicators.some((i) => i.id === a.id))!.id;

        renderer.firePaneAction({ type: 'remove', paneId });
        await flush();
        expect(renderer.removed).toContain(a.id);
        expect(chart.panes.list().some((p) => p.id === paneId)).toBe(false);
    });

    it('a legend "move" request routes through moveIndicator', async () => {
        const { chart, renderer } = await makeChart();
        const a = chart.addIndicator('//@version=5\nindicator("A")\nplot(close)');
        const b = chart.addIndicator('//@version=5\nindicator("B")\nplot(close)');
        await flush();
        const paneA = chart.panes.list().find((p) => p.indicators.some((i) => i.id === a.id))!.id;

        renderer.fireMove(b.id, { pane: paneA });
        await flush();
        const merged = chart.panes.list().find((p) => p.id === paneA)!;
        expect(merged.indicators.map((i) => i.id).sort()).toEqual([a.id, b.id].sort());
    });
});

describe('pane management — capability gating', () => {
    it('a renderer without pane management reports unsupported and no-ops mutations with a warning', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { chart } = await makeChart(FlatRenderer);
        const a = chart.addIndicator('//@version=5\nindicator("A")\nplot(close)');
        const b = chart.addIndicator('//@version=5\nindicator("B")\nplot(close)');
        await flush();

        expect(chart.panes.supported).toBe(false);
        const before = chart.panes.list().length;
        b.moveTo({ pane: 'price' }); // should warn + no-op
        chart.panes.move('whatever', 'up');
        await flush();
        expect(chart.panes.list().length).toBe(before); // unchanged
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
        void a;
    });
});
