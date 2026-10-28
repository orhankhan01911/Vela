// @vitest-environment jsdom
// The phone More sheet has a finder at the top (2026-10-28: the list kept growing and basic options were hard to find
// by scrolling). Typing filters the buttons and rows by their shown or English name, and offers chart types as rows.
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
});

function make(): { picked: string[]; ran: string[] } {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const picked: string[] = [];
    const ran: string[] = [];
    const drawer = new MoreDrawer({
        host,
        onUndo: () => {},
        onRedo: () => {},
        onScreenshot: () => ran.push('screenshot'),
        canUndo: () => true,
        canRedo: () => false,
        priceStyles: () => [
            { id: 'candles', label: 'Candles' },
            { id: 'renko', label: 'Renko' },
        ],
        priceStyle: () => 'candles',
        onPriceStyle: (id) => picked.push(id),
        panels: () => [{ id: 'watch', title: 'Watchlist', icon: 'list' }],
        onTogglePanel: () => {},
        actions: () => [
            { label: 'Templates', run: () => ran.push('templates') },
            { label: 'Smooth', run: () => ran.push('smooth') },
            { label: 'Privacy mode', run: () => ran.push('privacy') },
        ],
    });
    drawer.open();
    return { picked, ran };
}

const search = (): HTMLInputElement => document.querySelector<HTMLInputElement>('.vela-md-search')!;
const type = (v: string): void => {
    search().value = v;
    search().dispatchEvent(new Event('input'));
};
const shown = (sel: string): string[] =>
    [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.style.display !== 'none' && e.closest<HTMLElement>('.vela-md-actions')?.style.display !== 'none').map((e) => e.querySelector('.vela-md-row-label')?.textContent ?? e.textContent ?? '');

describe('MoreDrawer finder', () => {
    it('sits at the top of the sheet and shows everything while empty', () => {
        make();
        expect(document.querySelector('.vela-md-search')).toBeTruthy();
        expect(search().previousElementSibling).toBeNull();
        expect(shown('.vela-md-row')).toEqual(['Chart type', 'Watchlist', 'Templates', 'Smooth', 'Privacy mode']);
    });

    it('finds a row by the start of a word, and by a longer word ("smoothness")', () => {
        make();
        type('temp');
        expect(shown('.vela-md-row')).toEqual(['Templates']);
        type('smoothness');
        expect(shown('.vela-md-row')).toEqual(['Smooth']);
        type('PRIVACY');
        expect(shown('.vela-md-row')).toEqual(['Privacy mode']);
    });

    it('filters the action buttons too and hides their strip when none match', () => {
        make();
        type('screen');
        expect(shown('.vela-md-action')).toEqual(['Screenshot']);
        type('watch');
        expect(document.querySelector<HTMLElement>('.vela-md-actions')!.style.display).toBe('none');
    });

    it('offers matching chart types as rows that apply on a tap', () => {
        const { picked } = make();
        type('renko');
        const row = [...document.querySelectorAll<HTMLElement>('.vela-md-row')].find((r) => r.style.display !== 'none' && r.textContent?.includes('Renko'));
        expect(row).toBeTruthy();
        row!.click();
        expect(picked).toEqual(['renko']);
    });

    it('says so when nothing matches, and clearing brings the list back', () => {
        make();
        type('zzqx');
        expect(document.querySelector('.vela-md-empty')?.textContent).toBe('No matches');
        type('');
        expect(document.querySelector('.vela-md-empty')).toBeNull();
        expect(shown('.vela-md-row')).toHaveLength(5);
    });
});
