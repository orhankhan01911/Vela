import { describe, it, expect } from 'vitest';
import { createDrawing, deserializeDrawing, PositionTool, type DrawingTypeKey, type Projector } from '../src/core/drawings';
import { defaultToolbar } from '../src/core/drawings/toolbar';

const HR = 3600000;

/** Linear projector: x = time/hour, y = 100 − price. */
function fakeProjector(): Projector {
    return {
        xOf: (t) => t / HR,
        yOf: (price, paneId) => (paneId === 'price' ? 100 - price : null),
        pxToPoint: (x, y) => ({ time: x * HR, price: 100 - y }),
        paneIdAtY: () => 'price',
        barsBetween: (t1, t2) => Math.abs(t2 - t1) / HR,
        width: 400,
        height: 400,
    };
}

/** Place a tool with click 1 at (0 h, entry) and click 2 at (60 h, release), as the controller does. */
function place(type: DrawingTypeKey, entry: number, release: number): PositionTool {
    const d = createDrawing(type, { paneId: 'price', anchors: [{ time: 0, price: entry }, { time: 60 * HR, price: release }] }) as PositionTool;
    d.onPlaced(fakeProjector());
    return d;
}

describe('drawings/long and short position tools', () => {
    it('Long Position is a long even when dragged down; the drag sets the size', () => {
        const d = place('long-position', 50, 30);
        expect(d.type).toBe('long-position');
        expect(d.directionLabel()).toBe('LONG');
        expect(d.targetPrice).toBeCloseTo(70); // 20 above the entry, mirrored from the 20 below
        expect(d.stopPrice).toBeLessThan(50);
    });

    it('Short Position is a short even when dragged up', () => {
        const d = place('short-position', 50, 70);
        expect(d.type).toBe('short-position');
        expect(d.directionLabel()).toBe('SHORT');
        expect(d.targetPrice).toBeCloseTo(30);
        expect(d.stopPrice).toBeGreaterThan(50);
    });

    it('a bare click places the default box on each tool\'s own side', () => {
        expect(place('long-position', 50, 50).directionLabel()).toBe('LONG');
        expect(place('short-position', 50, 50).directionLabel()).toBe('SHORT');
    });

    it('the combined tool still follows the drag (saved charts, hotkey, assistant)', () => {
        expect(place('position', 50, 70).directionLabel()).toBe('LONG');
        expect(place('position', 50, 30).directionLabel()).toBe('SHORT');
    });

    it('the drag preview already shows the tool\'s own side (no flip on release)', () => {
        const long = createDrawing('long-position', { paneId: 'price', anchors: [{ time: 0, price: 50 }, { time: 60 * HR, price: 30 }] }) as PositionTool;
        expect(long.directionLabel()).toBe('LONG'); // dragged down, still previews a long
        expect(long.priceRange()).toEqual({ min: 40, max: 70 });
        const short = createDrawing('short-position', { paneId: 'price', anchors: [{ time: 0, price: 50 }, { time: 60 * HR, price: 70 }] }) as PositionTool;
        expect(short.directionLabel()).toBe('SHORT');
        const preview = long.priceRange();
        const placed = place('long-position', 50, 30).priceRange();
        expect(placed!.max).toBeCloseTo(preview!.max); // what the preview showed is what lands
        expect(placed!.min).toBeCloseTo(preview!.min);
    });

    it('has TradingView\'s handles: entry circle, stop/target on the left edge, width on the right', () => {
        const d = place('long-position', 50, 30);
        const proj = fakeProjector();
        const L = d.layout(proj)!;
        expect(d.handlePoints(proj)).toEqual([[L.x1, L.ey], [L.x1, L.sy], [L.x1, L.ty], [L.x2, L.ey]]);
        expect(d.handleShapes()).toEqual(['circle', 'square', 'square', 'square']);
    });

    it('stop/target handles move their price only; the right handle moves the right edge', () => {
        const d = place('long-position', 50, 30);
        const proj = fakeProjector();
        const end = d.anchors[2]!.time;
        expect(d.dragHandlePx(2, 5, 100 - 80, proj)).toBe(true); // target to 80, dragged at x = 5 h
        expect(d.targetPrice).toBeCloseTo(80);
        expect(d.anchors[2]!.time).toBe(end); // the box keeps its width
        expect(d.dragHandlePx(3, 90, 0, proj)).toBe(true);
        expect(d.anchors[1]!.time).toBe(90 * HR);
        expect(d.anchors[2]!.time).toBe(90 * HR);
        expect(d.entryPrice).toBe(50);
        expect(place('position', 50, 30).dragHandlePx(0, 5, 5, proj)).toBe(false); // the combined tool's entry: the default free move
    });

    it('a stop or target dragged past the entry stops at it: the Long tool never turns short', () => {
        const proj = fakeProjector();
        const d = place('long-position', 50, 30); // entry 50, target 70, stop 40
        d.dragHandlePx(1, 5, 100 - 65, proj); // stop dragged up to 65, past the entry
        expect(d.stopPrice).toBeCloseTo(49); // held 1 px under the entry
        expect(d.targetPrice).toBeCloseTo(70); // the target did not flip
        expect(d.directionLabel()).toBe('LONG');
        d.dragHandlePx(2, 5, 100 - 20, proj); // target dragged down past the entry
        expect(d.targetPrice).toBeCloseTo(51);
        expect(d.directionLabel()).toBe('LONG');
        const s = place('short-position', 50, 70); // entry 50, target 30, stop 60
        s.dragHandlePx(1, 5, 100 - 20, proj); // stop dragged down past the entry
        expect(s.stopPrice).toBeCloseTo(51);
        expect(s.directionLabel()).toBe('SHORT');
    });

    it('the entry circle moves the entry price and the left edge; target, stop and right edge stay', () => {
        const proj = fakeProjector();
        const d = place('long-position', 50, 30); // entry 50 @ 0 h, stop 40, target 70, right edge 60 h
        const right = d.anchors[2]!.time;
        expect(d.dragHandlePx(0, 10, 100 - 60, proj)).toBe(true); // entry to 60 at 10 h
        expect(d.entryPrice).toBeCloseTo(60);
        expect(d.anchors[0]!.time).toBe(10 * HR);
        expect(d.targetPrice).toBeCloseTo(70);
        expect(d.stopPrice).toBeCloseTo(40);
        expect(d.anchors[2]!.time).toBe(right);
        d.dragHandlePx(0, 5, 100 - 95, proj); // past the target: held 1 px under it
        expect(d.entryPrice).toBeCloseTo(69);
        d.dragHandlePx(0, 5, 100 - 10, proj); // past the stop: held 1 px over it
        expect(d.entryPrice).toBeCloseTo(41);
        d.dragHandlePx(0, 500, 100 - 50, proj); // past the right edge: held 1 px left of it
        expect(d.anchors[0]!.time).toBe(right - HR);
        expect(d.directionLabel()).toBe('LONG');
        expect(d.entryPrice).toBeCloseTo(50);
        d.entryPrice = 55; // typed in settings: TradingView keeps the stop/target distances
        expect(d.targetPrice).toBeCloseTo(75);
        expect(d.stopPrice).toBeCloseTo(45);
    });

    it('each handle has TradingView\'s cursor', () => {
        const d = place('long-position', 50, 30);
        expect([0, 1, 2, 3].map((i) => d.handleCursor(i))).toEqual(['move', 'ns-resize', 'ns-resize', 'ew-resize']);
    });

    it('typed levels on the wrong side are clamped and Direction is not offered on the fixed tools', () => {
        const d = place('long-position', 50, 30);
        d.stopPrice = 60;
        expect(d.stopPrice).toBeLessThan(50);
        d.applySettings({ direction: 'short' });
        expect(d.directionLabel()).toBe('LONG');
        expect(d.schema().fields.some((f) => f.path === 'direction')).toBe(false);
        expect(place('position', 50, 30).schema().fields.some((f) => f.path === 'direction')).toBe(true);
    });

    it('the combined tool still turns around when a level crosses the entry', () => {
        const d = place('position', 50, 70); // long
        d.stopPrice = 60; // stop above the entry -> the target flips below
        expect(d.directionLabel()).toBe('SHORT');
    });

    it('text size is in px: 12 by default, whole px clamped to 6..72, saved with the drawing', () => {
        const d = place('long-position', 50, 30);
        expect(d.fontSize).toBe(12);
        expect(d.schema().fields.some((f) => f.path === 'text.size')).toBe(false);
        expect(d.schema().fields.find((f) => f.path === 'fontSize')).toMatchObject({ kind: 'number', min: 6, max: 72, step: 1 });
        d.applySettings({ fontSize: 15.6 });
        expect(d.fontSize).toBe(16);
        d.applySettings({ fontSize: 500 });
        expect(d.fontSize).toBe(72);
        d.applySettings({ fontSize: 1 });
        expect(d.fontSize).toBe(6);
        d.applySettings({ fontSize: 'big' });
        expect(d.fontSize).toBe(6); // ignored
        d.applySettings({ fontSize: 13 });
        const round = deserializeDrawing(d.serialize()) as PositionTool;
        expect(round.fontSize).toBe(13);
    });

    it('a position created with a few props (the API, the assistant) gets the 12 px default', () => {
        const d = createDrawing('long-position', { paneId: 'price', anchors: [{ time: 0, price: 50 }, { time: HR, price: 40 }, { time: HR, price: 70 }], props: { alwaysShowStats: true } }) as PositionTool;
        expect(d.fontSize).toBe(12);
    });

    it('a position saved with a named size keeps the size it painted at', () => {
        const base = place('long-position', 50, 30).serialize();
        const { fontSize: _drop, ...oldProps } = base.props as Record<string, unknown>;
        const large = deserializeDrawing({ ...base, props: oldProps, text: { value: '', size: 'large', hAlign: 'left', vAlign: 'top' } }) as PositionTool;
        expect(large.fontSize).toBe(18);
        const plain = deserializeDrawing({ ...base, props: oldProps, text: undefined }) as PositionTool;
        expect(plain.fontSize).toBe(14); // 'normal' was the old default
    });

    describe('the trade over the candles (TradingView\'s dashed line)', () => {
        // entry 50 @ 0 h, stop 40, target 70, box to 60 h; one bar per hour
        const pos = (): PositionTool =>
            createDrawing('long-position', { paneId: 'price', anchors: [{ time: 0, price: 50 }, { time: 60 * HR, price: 40 }, { time: 60 * HR, price: 70 }] }) as PositionTool;
        const bar = (h: number, low: number, high: number, close: number) => ({ time: h * HR, low, high, close });

        it('runs from the entry fill to the last close while open', () => {
            const t = pos().trade([bar(-1, 45, 48, 47), bar(1, 49, 52, 51), bar(2, 50, 56, 55), bar(3, 53, 58, 57)]);
            expect(t).toMatchObject({ openTime: 1 * HR, time: 3 * HR, price: 57, status: 'open' });
            expect(t!.pnl).toBeGreaterThan(0);
        });

        it('closes at the target or the stop, whichever price reaches first', () => {
            expect(pos().trade([bar(1, 49, 52, 51), bar(2, 60, 71, 69), bar(3, 30, 35, 31)])).toMatchObject({ time: 2 * HR, price: 70, status: 'target' });
            const loss = pos().trade([bar(1, 49, 52, 51), bar(2, 39, 50, 41)])!;
            expect(loss).toMatchObject({ time: 2 * HR, price: 40, status: 'stop' });
            expect(loss.pnl).toBeLessThan(0);
            // both levels inside one bar: the stop (the conservative read)
            expect(pos().trade([bar(1, 49, 52, 51), bar(2, 35, 75, 60)])!.status).toBe('stop');
        });

        it('a short wins below and loses above', () => {
            const s = createDrawing('short-position', { paneId: 'price', anchors: [{ time: 0, price: 50 }, { time: 60 * HR, price: 60 }, { time: 60 * HR, price: 30 }] }) as PositionTool;
            expect(s.trade([bar(1, 49, 51, 50), bar(2, 29, 45, 31)])).toMatchObject({ price: 30, status: 'target' });
            expect(s.trade([bar(1, 49, 51, 50), bar(2, 50, 61, 58)])).toMatchObject({ price: 60, status: 'stop' });
        });

        it('nothing until price reaches the entry, nothing for bars outside the box', () => {
            expect(pos().trade([bar(1, 52, 55, 54), bar(2, 53, 56, 55)])).toBeNull(); // never came back to 50
            expect(pos().trade([bar(61, 49, 52, 51)])).toBeNull(); // after the box
            expect(pos().trade([])).toBeNull();
        });

        it('the centre box reads Open / Closed PnL once the entry filled', () => {
            const d = pos();
            expect(d.centerBoxLines(null)[0]).toMatch(/^Long, Qty: /);
            // the risk in dollars stays on the line once the trade runs (it is what you stand to lose)
            expect(d.centerBoxLines(d.trade([bar(1, 49, 52, 51)]))[0]).toMatch(/^Open PnL: [\d,.]+, Qty: [\d.]+, Risk: \$100\.00$/);
            expect(d.centerBoxLines(d.trade([bar(1, 49, 52, 51), bar(2, 39, 50, 41)]))[0]).toMatch(/^Closed PnL: \u2212[\d,.]+, Qty: [\d.]+, Risk: \$100\.00$/);
        });
    });

    it('the trade line is off by default and saved with the drawing', () => {
        const d = place('long-position', 50, 30);
        expect(d.showTradeLine).toBe(false);
        d.applySettings({ showTradeLine: true });
        expect((deserializeDrawing(d.serialize()) as PositionTool).showTradeLine).toBe(true);
    });

    it('defaults to TradingView\'s colors: gray entry line, #089981 / #f23645 zones', () => {
        const d = place('long-position', 50, 30);
        expect(d.style.lineColor).toBe('#808080');
        expect(d.profitColor).toBe('#089981');
        expect(d.lossColor).toBe('#f23645');
    });

    it('keeps its type through save and load', () => {
        const a = place('short-position', 50, 70).serialize();
        const round = deserializeDrawing(a)!;
        expect(round.type).toBe('short-position');
        expect(round.serialize()).toEqual(a);
    });

    it('the Measurements menu lists Long Position and Short Position, not the combined tool', () => {
        const group = defaultToolbar().groups.find((g) => g.id === 'measurements')!;
        const labels = group.tools.map((t) => t.label);
        expect(labels.slice(0, 2)).toEqual(['Long Position', 'Short Position']);
        expect(labels).not.toContain('Long/Short Position');
    });
});
