// @vitest-environment jsdom
// The horizontal line, TradingView parity (audit 2026-10-30): 2 px solid #2962FF with its price label, 12 px text
// centered on the line, a rounded-square handle, TradingView's dialog names ("Price label", "#1 (price)"), no price-label
// switch on the floating bar.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, TV_LINE_COLOR, type Drawing } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));

/** A chart stand-in that, like the renderer, rebuilds the drawing after every edit and restores like the controller. */
function chart(initial: Drawing): { actions: SettingsActions; live: () => Drawing } {
    let live = initial;
    const sync = (): void => {
        live = deserializeDrawing(live.serialize())!;
    };
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            sync();
        },
        restore: (doc) => {
            if (doc.style) live.style = { ...doc.style };
            if (doc.text !== undefined) live.text = doc.text ? { ...doc.text } : undefined;
            if (doc.props !== undefined) live.applyProps(doc.props);
            if (doc.anchors) live.anchors = doc.anchors.map((p) => ({ ...p }));
            if ('intervals' in doc) live.intervals = doc.intervals ? { ...doc.intervals } : undefined;
            sync();
        },
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    return { actions, live: () => live };
}

function setup(drawing: Drawing) {
    const host = document.createElement('div');
    document.body.append(host);
    const popup = new DrawingSettingsPopup(host, DARK_THEME);
    const c = chart(drawing);
    popup.open([drawing], null, c.actions);
    const tips = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-dpop [data-tip]')].map((e) => e.dataset.tip!);
    const gear = (): HTMLButtonElement => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!;
    const tabs = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!);
    const tab = (name: string): HTMLElement => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].find((e) => e.textContent === name)!;
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    const button = (label: string): HTMLButtonElement => [...host.querySelectorAll<HTMLButtonElement>('.vela-drawing-dialog button')].find((b) => b.textContent === label)!;
    return { host, popup, live: c.live, tips, gear, tabs, tab, body, button };
}



const hl = (): Drawing => createDrawing('hline', { id: 'h', paneId: 'price', anchors: [{ time: Date.UTC(2026, 9, 1), price: 100 }] })!;

describe('horizontal line defaults (TradingView)', () => {
    it('is 2 px solid TradingView blue with its price label on', () => {
        const d = hl();
        expect(d.style).toMatchObject({ lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' });
        expect(d.serialize().props).toMatchObject({ showPrice: true });
    });

    it('starts its text 12 px blue, centered on the line', () => {
        const d = hl();
        d.applySettings({ 'text.value': 'x' });
        expect(d.text).toMatchObject({ size: 12, color: TV_LINE_COLOR, hAlign: 'center', vAlign: 'center' });
    });

    it('has one rounded-square handle', () => {
        expect(hl().handleShapes()).toEqual(['square']);
    });
});

describe('horizontal line dialog and bar', () => {
    it('names the switch and the point like TradingView', async () => {
        const s = setup(hl());
        s.gear().click();
        await settled();
        s.tab('Style').click();
        expect(s.body('style').textContent).toContain('Price label');
        expect(s.body('style').textContent).not.toContain('on the scale');
        s.tab('Coordinates').click();
        expect(s.body('coordinates').textContent).toContain('#1 (price)');
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Horizontal line');
    });

    it('shows Middle / Center for new text', async () => {
        const d = hl();
        d.applySettings({ 'text.value': 'x' });
        const s = setup(d);
        s.gear().click();
        await settled();
        s.tab('Text').click();
        const t = s.body('text').textContent!;
        expect(t).toContain('Middle');
        expect(t).toContain('Center');
        expect(t).toContain('12');
    });

    it('keeps the price-label switch off the floating bar', () => {
        const s = setup(hl());
        expect(s.tips()).not.toContain('Show price');
    });
});
