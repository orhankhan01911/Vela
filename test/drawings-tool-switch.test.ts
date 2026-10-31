// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { UserDrawingController, type UserDrawingDeps } from '../src/renderers/native/drawings/UserDrawingController';
import { DARK_THEME } from '../src/core/theme';

function controller(): { ctrl: UserDrawingController; cleared: () => number } {
    const host = document.createElement('div');
    const plot = document.createElement('div');
    const canvas = document.createElement('canvas');
    document.body.append(host, plot);
    const deps = {
        projector: () => ({}) as never,
        dpr: () => 1,
        theme: () => DARK_THEME,
        requestScaleUpdate: () => {},
        seriesBoundaries: () => [],
        priceZ: () => null,
        requestDataPaint: () => {},
        seriesLook: () => ({ style: 'candles', upColor: '', downColor: '', lineColor: '' }),
        chartBarMs: () => 60_000,
        snap: (p: never) => p,
        setSnapMode: () => {},
        setToolbarGutter: () => {},
    } as unknown as UserDrawingDeps;
    const ctrl = new UserDrawingController(host, plot, canvas, deps);
    ctrl.render = () => {};
    let n = 0;
    const it = (ctrl as unknown as { interaction: { onToolCleared: () => void } }).interaction;
    const orig = it.onToolCleared.bind(it);
    it.onToolCleared = () => {
        n += 1;
        orig();
    };
    return { ctrl, cleared: () => n };
}

describe('switching tools mid-placement (TradingView: the unfinished drawing is dropped)', () => {
    it('picking another tool drops the unfinished drawing; re-arming the same tool keeps it', () => {
        const { ctrl, cleared } = controller();
        ctrl.setActiveTool('ghostfeed');
        const base = cleared();
        ctrl.setActiveTool('ghostfeed'); // same tool again (a style push): placement continues
        expect(cleared()).toBe(base);
        ctrl.setActiveTool('table');
        expect(cleared()).toBe(base + 1);
        ctrl.setActiveTool(null);
        expect(cleared()).toBe(base + 2);
    });
});
