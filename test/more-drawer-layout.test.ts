// @vitest-environment jsdom
// The phone Layout sheet carries the desktop dropdown's controls: the Free-form / Presets switch and on/off sync
// switches (2026-10-27: the sheet showed the presets only, and the sync rows had no visible on/off state).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { MoreDrawer } from '../src/widget/more-drawer';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
    localStorage.clear();
});

function make(): { host: HTMLElement; synced: Record<string, boolean> } {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const synced: Record<string, boolean> = { symbol: false, timeframe: true };
    const drawer = new MoreDrawer({
        host,
        canUndo: () => false,
        canRedo: () => false,
        priceStyles: () => [],
        priceStyle: () => 'candles',
        onPriceStyle: () => {},
        panels: () => [],
        onTogglePanel: () => {},
        actions: () => [],
        layout: {
            shape: () => ({ rows: 1, cols: 1 }),
            presets: () => [],
            onSelectGrid: () => {},
            onSelectPreset: () => {},
            catalog: () => [{ count: 1, items: [{ id: '1', label: '1 chart', glyph: '<svg></svg>', checked: true }] }],
            syncs: () => [
                { id: 'symbol', label: 'Symbol', checked: synced.symbol! },
                { id: 'timeframe', label: 'Interval', checked: synced.timeframe! },
            ],
            onToggleSync: (id) => {
                synced[id] = !synced[id];
            },
        },
    });
    drawer.open();
    const row = [...host.ownerDocument.querySelectorAll<HTMLElement>('.vela-md-row')].find((r) => r.textContent?.includes('Layout'));
    row!.click();
    return { host, synced };
}

const q = (s: string): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(s)];

describe('MoreDrawer layout sheet', () => {
    it('has the Free-form / Presets switch: free-form canvas by default, presets on a tap (remembered)', () => {
        make();
        const modes = q('.vela-md-list .vela-lp-mode button');
        expect(modes.map((b) => `${b.textContent}:${b.getAttribute('aria-pressed')}`)).toEqual(['Free-form:true', 'Presets:false']);
        expect(q('.vela-md-list .vela-lp-grid')).toHaveLength(1);
        expect(q('.vela-md-list .vela-lp-cat')).toHaveLength(0);
        modes[1]!.click();
        expect(q('.vela-md-list .vela-lp-cat')).toHaveLength(1);
        expect(q('.vela-md-list .vela-lp-grid')).toHaveLength(0);
        expect(localStorage.getItem('vela.layout.mode')).toBe('catalog');
    });

    it('sync rows are switches that show on/off and flip in place', () => {
        const { synced } = make();
        const rows = (): HTMLElement[] => q('.vela-md-row[role=switch]');
        expect(rows().map((r) => `${r.textContent}:${r.getAttribute('aria-checked')}:${r.querySelector('.vela-lp-switch.on') != null}`)).toEqual([
            'Symbol:false:false',
            'Interval:true:true',
        ]);
        rows()[0]!.click();
        expect(synced.symbol).toBe(true);
        expect(rows()[0]!.getAttribute('aria-checked')).toBe('true');
        expect(rows()[0]!.querySelector('.vela-lp-switch.on')).not.toBeNull();
    });
});
