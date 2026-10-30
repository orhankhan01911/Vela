// @vitest-environment jsdom
// TradingView's floating toolbar per tool (read from TradingView Desktop's toolbar on 2026-10-30): which colour,
// width, style and size controls it shows, in its order: line colour, background, text colour, width, style.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { createDrawing, deserializeDrawing, type Drawing } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});
afterEach(() => {
    document.body.replaceChildren();
});

const MANAGED = new Set(['Line color', 'Fill', 'Text color', 'Line width', 'Line style', 'Text size', 'Text']);

/** The bar's colour / width / style / size controls, in order. */
function bar(type: string, anchors: number): string[] {
    const host = document.createElement('div');
    document.body.append(host);
    const d: Drawing = createDrawing(type as never, { id: 'd', paneId: 'price', anchors: Array.from({ length: anchors }, (_, i) => ({ time: 100 + i * 100, price: 500 + i * 10 })) })!;
    let live = d;
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            live = deserializeDrawing(live.serialize())!;
        },
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    new DrawingSettingsPopup(host, DARK_THEME).open([d], null, actions);
    const kids = [...host.querySelector('.vela-dpop')!.firstElementChild!.children] as HTMLElement[];
    return kids.map((k) => k.dataset.tip ?? k.querySelector<HTMLElement>('[data-tip]')?.dataset.tip ?? '').filter((t) => MANAGED.has(t));
}

describe("TradingView's quick bar", () => {
    it('lines: line colour, text colour, width, style', () => {
        for (const t of ['trendline', 'ray', 'infoline']) expect(bar(t, 2), t).toEqual(['Line color', 'Text color', 'Line width', 'Line style']);
        expect(bar('hline', 1)).toEqual(['Line color', 'Text color', 'Line width', 'Line style']);
    });
    it('channel and ranges: line colour, background, text colour, width (no style)', () => {
        expect(bar('parallelchannel', 3)).toEqual(['Line color', 'Fill', 'Text color', 'Line width']);
        for (const t of ['pricerange', 'datepricerange', 'daterange']) expect(bar(t, 2), t).toEqual(['Line color', 'Fill', 'Text color', 'Line width']);
    });
    it('rectangle adds the style; path has no colour fill; pitchfork, brush: colour and width', () => {
        expect(bar('box', 2)).toEqual(['Line color', 'Fill', 'Text color', 'Line width', 'Line style']);
        expect(bar('path', 3)).toEqual(['Line color', 'Line width', 'Line style']);
        expect(bar('pitchfork', 3)).toEqual(['Line color', 'Line width']);
        expect(bar('freehand', 3)).toEqual(['Line color', 'Line width']);
    });
    it('texts: text colour, (background,) size; callout has no line controls; note keeps its pin colour', () => {
        expect(bar('text', 1)).toEqual(['Text color', 'Text size']);
        expect(bar('anchoredtext', 1)).toEqual(['Text color', 'Fill', 'Text size']);
        expect(bar('callout', 2)).toEqual(['Text color', 'Fill', 'Text size']);
        expect(bar('note', 1)).toEqual(['Line color', 'Text color', 'Text size']);
        expect(bar('arrowmarkup', 1)).toEqual(['Line color', 'Text color']);
    });
});
