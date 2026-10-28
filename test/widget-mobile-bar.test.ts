// @vitest-environment jsdom
// The mobile bar's maximize stop: present only when the shell passes a toggle, and
// hideable at runtime — the workspace hides it while the grid holds a single chart.
import { describe, it, expect } from 'vitest';
import { MobileBar } from '../src/widget/mobile-bar';

// jsdom ships no `CSS.escape`; the style injector needs it for its id lookup.
if (typeof (globalThis as { CSS?: unknown }).CSS === 'undefined') {
    (globalThis as { CSS?: unknown }).CSS = { escape: (s: string) => s.replace(/([^\w-])/g, '\\$1') };
}

function mount(withMaximize: boolean): { bar: MobileBar; stop: () => HTMLButtonElement | null } {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const bar = new MobileBar(host, {
        symbol: 'BINANCE:BTCUSDT',
        timeframe: '60',
        onSymbolClick: () => {},
        onTimeframeClick: () => {},
        onMoreClick: () => {},
        onSettingsClick: () => {},
        ...(withMaximize ? { onMaximizeClick: () => {} } : {}),
    });
    return { bar, stop: () => host.querySelector<HTMLButtonElement>('.vela-mb-maximize') };
}

describe('MobileBar maximize stop', () => {
    it('is absent when the shell has nothing to isolate (single-chart mode)', () => {
        const { stop } = mount(false);
        expect(stop()).toBeNull();
    });

    it('is shown by default and hidden/re-shown through setMaximizeVisible', () => {
        const { bar, stop } = mount(true);
        expect(stop()).not.toBeNull();
        expect(stop()!.hidden).toBe(false);

        bar.setMaximizeVisible(false); // the grid dropped to one cell
        expect(stop()!.hidden).toBe(true);

        bar.setMaximizeVisible(true); // back to a multi-chart layout
        expect(stop()!.hidden).toBe(false);
    });

    it('keeps the lit state independent of visibility', () => {
        const { bar, stop } = mount(true);
        bar.setMaximizeActive(true);
        bar.setMaximizeVisible(false);
        expect(stop()!.classList.contains('vela-mb-on')).toBe(true);
        expect(stop()!.hidden).toBe(true);
    });
});

describe('MobileBar swipe row', () => {
    function full(): { host: HTMLElement; bar: MobileBar; hits: string[] } {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const hits: string[] = [];
        const hit = (n: string) => () => hits.push(n);
        const bar = new MobileBar(host, {
            symbol: 'BINANCE:BTCUSDT',
            timeframe: '60',
            onSymbolClick: hit('symbol'),
            onTimeframeClick: hit('tf'),
            onIndicatorsClick: hit('indicators'),
            onDrawingsClick: hit('drawings'),
            onMoreClick: hit('more'),
            onChartTypeClick: hit('charttype'),
            onUndoClick: hit('undo'),
            onRedoClick: hit('redo'),
            onAlertsClick: hit('alerts'),
            onScreenshotClick: hit('screenshot'),
            onSettingsClick: hit('settings'),
        });
        return { host, bar, hits };
    }

    it('keeps every stop a direct child, symbol and timeframe first, the shortcuts after the three dots', () => {
        const { host } = full();
        const bar = host.querySelector('.vela-mobilebar')!;
        const order = [...bar.children].filter((e) => e.tagName === 'BUTTON').map((e) => [...e.classList].find((c) => c !== 'vela-mb-item'));
        expect(order).toEqual([
            'vela-mb-symbol', 'vela-mb-tf', 'vela-mb-indicators', 'vela-mb-drawings', 'vela-mb-more',
            'vela-mb-charttype', 'vela-mb-undo', 'vela-mb-redo', 'vela-mb-alerts', 'vela-mb-screenshot', 'vela-mb-settings',
        ]);
        // A host button placed before the three dots (Local's Ask) still finds it as a direct child.
        expect(bar.querySelector(':scope > .vela-mb-more')).not.toBeNull();
    });

    it('routes each shortcut to its own handler', () => {
        const { host, hits } = full();
        for (const c of ['charttype', 'undo', 'redo', 'alerts', 'screenshot']) host.querySelector<HTMLButtonElement>(`.vela-mb-${c}`)!.click();
        expect(hits).toEqual(['charttype', 'undo', 'redo', 'alerts', 'screenshot']);
    });

    it('omits a shortcut whose handler is not passed', () => {
        mount(false); // passes none of the shortcuts
        const host = document.body.lastElementChild!;
        expect(host.querySelector('.vela-mb-undo')).toBeNull();
        expect(host.querySelector('.vela-mb-charttype')).toBeNull();
    });

    it('dims undo and redo when history has nothing for them', () => {
        const { host, bar } = full();
        bar.setHistoryState(false, true);
        expect(host.querySelector<HTMLButtonElement>('.vela-mb-undo')!.disabled).toBe(true);
        expect(host.querySelector<HTMLButtonElement>('.vela-mb-redo')!.disabled).toBe(false);
    });
});
