// TradingView's chart right-click rows (src/widget/context-menu.ts): copy price, paste, lock the vertical
// cursor line, object tree, remove N drawings (locked ones kept when "Always remove locked drawings" is off),
// and contributed rows with a live label, a hint, a group and a submenu. Node env: the kit Menu is a recorder
// and the chart a fake; the real menu is checked in the browser.
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { CrosshairEvent } from '../src/core/ports/IChartRenderer';
import type { MenuItemDescriptor } from '../src/ui/components/menu';
import type { Vela } from '../src/Vela';
import { registerWidgetAction, type WidgetContext } from '../src/widget/contributions';
import { ChartContextMenu } from '../src/widget/context-menu';
import { removableDrawingIds, removeLockedDrawings, setRemoveLockedDrawings } from '../src/widget/remove-prefs';
import { tableViewRows } from '../src/widget/table-view';

const menus = vi.hoisted(() => [] as Array<{ items: readonly MenuItemDescriptor[]; select: (id: string) => void }>);

vi.mock('../src/ui/components/menu', () => ({
    Menu: class {
        private readonly rec: (typeof menus)[number];
        constructor(opts: { onSelect?: (id: string) => void }) {
            this.rec = { items: [], select: (id) => opts.onSelect?.(id) };
            menus.push(this.rec);
        }
        setItems(items: readonly MenuItemDescriptor[]): void {
            this.rec.items = items;
        }
        openAt(): void {}
        destroy(): void {}
    },
}));

type Listener = (e: unknown) => void;

function fakeHost(): HTMLElement & { fire(type: string, e: Record<string, unknown>): void } {
    const listeners = new Map<string, Listener[]>();
    return {
        addEventListener: (t: string, fn: Listener) => listeners.set(t, [...(listeners.get(t) ?? []), fn]),
        removeEventListener: (t: string, fn: Listener) => listeners.set(t, (listeners.get(t) ?? []).filter((f) => f !== fn)),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        fire(t: string, e: Record<string, unknown>) {
            for (const fn of listeners.get(t) ?? []) fn({ preventDefault: () => {}, ...e });
        },
    } as unknown as HTMLElement & { fire(type: string, e: Record<string, unknown>): void };
}

const memStore = new Map<string, string>();
vi.stubGlobal('localStorage', {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => void memStore.set(k, v),
});

function setup(drawings: Array<{ id: string; locked?: boolean }> = []) {
    const cbs = new Set<(e: CrosshairEvent) => void>();
    const features = new Map<string, unknown>();
    const calls = { paste: 0, removed: [] as string[][], tree: 0 };
    const chart = {
        renderer: {
            onCrosshairMove: (cb: (e: CrosshairEvent) => void) => {
                cbs.add(cb);
                return () => cbs.delete(cb);
            },
            get: (k: string) => features.get(k),
            set: (k: string, v: unknown) => void features.set(k, v),
            openSettings: () => undefined,
            priceMintick: () => 0.1,
        },
        drawings: {
            supported: true,
            all: () => drawings,
            canPaste: () => true,
            paste: () => void (calls.paste += 1),
            removeMany: (ids: string[]) => void calls.removed.push(ids),
        },
        indicators: () => [{}, {}],
    } as unknown as Vela;
    const host = fakeHost();
    const ctx = { symbol: 'BTCUSDT' } as unknown as WidgetContext;
    const menu = new ChartContextMenu(host, {
        resetView: () => undefined,
        getContext: () => ctx,
        openObjectTree: () => void (calls.tree += 1),
        hints: () => ({ 'reset-view': 'Alt+R', paste: 'Ctrl+V' }),
    });
    menu.onChart(chart);
    const open = (e: Partial<CrosshairEvent>): readonly MenuItemDescriptor[] => {
        for (const cb of cbs) cb({ time: null, price: null, values: new Map(), ohlc: null, ...e });
        host.fire('contextmenu', { clientX: 300, clientY: 200 });
        return menus[menus.length - 1]!.items;
    };
    return { menu, open, select: (id: string) => menus[menus.length - 1]!.select(id), features, calls };
}

const disposers: Array<() => void> = [];
afterEach(() => {
    for (const d of disposers.splice(0)) d();
    menus.length = 0;
    memStore.clear();
    vi.unstubAllGlobals();
    vi.stubGlobal('localStorage', {
        getItem: (k: string) => memStore.get(k) ?? null,
        setItem: (k: string, v: string) => void memStore.set(k, v),
    });
});

describe('chart right-click rows', () => {
    it('labels copy price with the clicked price at the symbol tick, counts the removals, shows the hints', () => {
        const { open } = setup([{ id: 'a' }, { id: 'b' }]);
        const items = open({ time: 1000, price: 81782, paneKind: 'price' });
        const label = (id: string) => items.find((i) => i.id === id);
        expect(label('copy-price')!.label).toBe('Copy price 81,782.0');
        expect(label('remove-drawings')!.label).toBe('Remove 2 drawings');
        expect(label('remove-indicators')!.label).toBe('Remove 2 indicators');
        expect(label('reset-view')!.hint).toBe('Alt+R');
        expect(label('paste')).toMatchObject({ hint: 'Ctrl+V', disabled: false });
        expect(label('object-tree')).toBeTruthy();
    });

    it('copies the plain number', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        const { open, select } = setup();
        open({ time: 1000, price: 81782.25, paneKind: 'price' });
        select('copy-price');
        expect(writeText).toHaveBeenCalledWith('81782.3');
    });

    it('pastes, opens the object tree', () => {
        const { open, select, calls } = setup();
        open({ time: 1000, price: 1, paneKind: 'price' });
        select('paste');
        select('object-tree');
        expect(calls).toMatchObject({ paste: 1, tree: 1 });
    });

    it('locks the vertical line to the right-clicked bar, and the same row unlocks it', () => {
        const { open, select, features } = setup();
        open({ time: 5000, price: 1, paneKind: 'price' });
        select('lock-cursor');
        expect(features.get('crosshairLockTime')).toBe(5000);
        expect(open({ time: 9000, price: 1, paneKind: 'price' }).find((i) => i.id === 'lock-cursor')!.checked).toBe(true);
        select('lock-cursor');
        expect(features.get('crosshairLockTime')).toBeNull();
    });

    it('removes every drawing in one step, or keeps the locked ones when that switch is off', () => {
        const drawings = [{ id: 'a' }, { id: 'b', locked: true }];
        const { open, select, calls } = setup(drawings);
        open({ time: 1, price: 1, paneKind: 'price' });
        select('remove-drawings');
        expect(calls.removed).toEqual([['a', 'b']]);
        setRemoveLockedDrawings(false);
        expect(open({ time: 1, price: 1, paneKind: 'price' }).find((i) => i.id === 'remove-drawings')!.label).toBe('Remove 1 drawing');
        select('remove-drawings');
        expect(calls.removed[1]).toEqual(['a']);
    });

    it('a contributed row gets its live label, hint, block and submenu', () => {
        const picked: string[] = [];
        disposers.push(
            registerWidgetAction({
                id: 'test.alert',
                target: 'context:body',
                label: 'Add alert',
                labelFor: (ctx) => `Add alert on ${ctx.symbol} at ${ctx.pointer?.price}…`,
                hint: 'Alt+A',
                group: 'trade',
                order: -27,
                run: () => undefined,
            }),
            registerWidgetAction({
                id: 'test.tpl',
                target: 'context:body',
                label: 'Chart template',
                group: 'objects',
                order: -22,
                submenu: () => [{ id: 'Scalping', label: 'Scalping' }],
                runItem: (_ctx, id) => void picked.push(id),
                run: () => undefined,
            }),
        );
        const { open, select } = setup();
        const items = open({ time: 1, price: 100, paneKind: 'price' });
        const alert = items.find((i) => i.id === 'action:test.alert')!;
        expect(alert).toMatchObject({ label: 'Add alert on BTCUSDT at 100…', hint: 'Alt+A', separatorBefore: true });
        expect(items[items.indexOf(alert) + 1]).toMatchObject({ id: 'lock-cursor', separatorBefore: true });
        const tpl = items.find((i) => i.id === 'action:test.tpl')!;
        expect(tpl.separatorBefore).toBe(false);
        expect(tpl.submenu!.map((r) => r.id)).toEqual(['sub:test.tpl::Scalping']);
        select('sub:test.tpl::Scalping');
        expect(picked).toEqual(['Scalping']);
    });
});

describe('remove prefs', () => {
    it('removes locked drawings unless switched off, and survives blocked storage', () => {
        expect(removeLockedDrawings()).toBe(true);
        setRemoveLockedDrawings(false);
        expect(removeLockedDrawings()).toBe(false);
        vi.stubGlobal('localStorage', {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            },
        });
        expect(removeLockedDrawings()).toBe(true);
        expect(() => setRemoveLockedDrawings(false)).not.toThrow();
    });

    it('lists nothing on a renderer without drawings', () => {
        expect(removableDrawingIds({ drawings: { supported: false } } as unknown as Vela)).toEqual([]);
    });
});

describe('table view rows', () => {
    const bars = [100, 110, 99, 120].map((close, i) => ({ time: i * 60_000, open: close, high: close + 1, low: close - 1, close, volume: i }));

    it('lists the bars on screen newest first with the change from the bar before', () => {
        const rows = tableViewRows(bars, { from: 60_000, to: 180_000 });
        expect(rows.map((r) => r.time)).toEqual([180_000, 120_000, 60_000]);
        expect(rows[0]!.change).toBeCloseTo(21.21, 2);
        expect(rows[2]!.change).toBeCloseTo(10, 5);
    });

    it('has no change on the first bar, caps the rows, and reads the latest bars without a range', () => {
        expect(tableViewRows(bars, null).slice(-1)[0]!.change).toBeNull();
        expect(tableViewRows(bars, null, 2).map((r) => r.time)).toEqual([180_000, 120_000]);
    });
});
