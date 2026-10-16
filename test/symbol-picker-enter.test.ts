// @vitest-environment jsdom
// Enter in the symbol search picks the highlighted row and the dialog stays closed. The dialog hands focus back to
// the symbol button when it closes; the Enter key press must not go on to that button (Chromium turns it into a
// click there, which opened the picker again right after the pick).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { SymbolPicker } from '../src/widget/symbol-picker';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
    Element.prototype.scrollIntoView ??= function () {}; // jsdom has no layout
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));

describe('symbol picker Enter', () => {
    it('picks the highlighted row, closes, and cancels the key press', async () => {
        const picked: string[] = [];
        const picker = new SymbolPicker({ onSelect: (s) => picked.push(s) });
        picker.setSource(() => [
            { ticker: 'ETHUSDT', provider: 'bybit', description: 'ETH / USDT' },
            { ticker: 'BTCUSDT', provider: 'bybit', description: 'BTC / USDT' },
        ]);
        picker.open('ETH');
        await settled();
        expect(picker.isOpen).toBe(true);
        const input = document.querySelector<HTMLInputElement>('.vela-sp-input');
        expect(input).not.toBeNull();

        const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        input!.dispatchEvent(ev);
        await settled();

        expect(picked).toEqual(['bybit:ETHUSDT']);
        expect(picker.isOpen).toBe(false);
        // The browser's follow-up (keypress, then a click on whatever has focus now) is cancelled.
        expect(ev.defaultPrevented).toBe(true);
        picker.destroy();
    });
});
