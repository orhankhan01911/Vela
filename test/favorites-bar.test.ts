// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { DrawingToolbar } from '../src/renderers/native/drawings/DrawingToolbar';
import { buildToolbar } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import type { DrawingTypeKey } from '../src/core/drawings';

const KEY = 'test-fav-bar';

function sizedHost(w: number, h: number): HTMLElement {
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => w });
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => h });
    document.body.appendChild(el);
    return el;
}

function setup(width = 1200): { tb: DrawingToolbar; grid: HTMLElement; armed: Array<DrawingTypeKey | null>; bar: () => HTMLElement } {
    const side = document.createElement('div');
    document.body.appendChild(side);
    const grid = sizedHost(width, 700);
    const armed: Array<DrawingTypeKey | null> = [];
    const tb = new DrawingToolbar(side, DARK_THEME, (t) => armed.push(t), undefined, undefined, undefined, undefined, undefined, {
        dock: 'static',
        favoritesBar: { host: grid, storageKey: KEY },
    });
    tb.setDefinition(buildToolbar(undefined).definition);
    tb.setVisible(true);
    return { tb, grid, armed, bar: () => grid.querySelector<HTMLElement>('.vela-favbar')! };
}

const firstTwo = (): DrawingTypeKey[] => {
    const def = buildToolbar(undefined).definition;
    return def.groups.flatMap((g) => g.tools.map((t) => t.type)).slice(0, 2);
};

describe('floating favourites bar', () => {
    beforeEach(() => {
        document.body.replaceChildren();
        localStorage.clear();
    });

    it('is hidden with no favourites and shows one button per starred tool, in star order', () => {
        const { tb, bar } = setup();
        expect(bar().style.display).toBe('none');
        const [a, b] = firstTwo();
        tb.setFavorites([b!, a!]);
        expect(bar().style.display).toBe('flex');
        const tools = [...bar().querySelectorAll<HTMLElement>('.vela-favbar-btn')].map((x) => x.dataset.tool);
        expect(tools).toEqual([b, a]);
        tb.setFavorites([a!]);
        expect(bar().querySelectorAll('.vela-favbar-btn').length).toBe(1);
        tb.setFavorites([]);
        expect(bar().style.display).toBe('none');
    });

    it('arms the tool on click and highlights the active tool', () => {
        const { tb, bar, armed } = setup();
        const [a, b] = firstTwo();
        tb.setFavorites([a!, b!]);
        bar().querySelector<HTMLButtonElement>(`[data-tool="${b}"]`)!.click();
        expect(armed).toEqual([b]);
        tb.setActiveTool(b!);
        expect(bar().querySelector<HTMLElement>(`[data-tool="${b}"]`)!.dataset.active).toBe('1');
        expect(bar().querySelector<HTMLElement>(`[data-tool="${a}"]`)!.dataset.active).toBe('');
    });

    it('the left-toolbar star toggle hides and shows the bar, and the choice is saved', () => {
        const { tb, bar } = setup();
        tb.setFavorites(firstTwo());
        const toggle = document.querySelector<HTMLButtonElement>('.vela-dtb-favtoggle')!;
        expect(toggle.dataset.active).toBe('1');
        toggle.click();
        expect(bar().style.display).toBe('none');
        expect(toggle.dataset.active).toBe('');
        expect(JSON.parse(localStorage.getItem(KEY)!).shown).toBe(false);
        toggle.click();
        expect(bar().style.display).toBe('flex');
    });

    it('restores a saved position and hides on a phone-width host', () => {
        localStorage.setItem(KEY, JSON.stringify({ x: 300, y: 200, shown: true }));
        const { tb, bar } = setup();
        tb.setFavorites(firstTwo());
        expect(bar().style.left).toBe('300px');
        expect(bar().style.top).toBe('200px');
        document.body.replaceChildren();
        const phone = setup(390);
        phone.tb.setFavorites(firstTwo());
        expect(phone.bar().style.display).toBe('none');
    });

    it('survives storage that throws', () => {
        const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { tb, bar } = setup();
        tb.setFavorites(firstTwo());
        document.querySelector<HTMLButtonElement>('.vela-dtb-favtoggle')!.click();
        expect(bar().style.display).toBe('none');
        spy.mockRestore();
        set.mockRestore();
    });

    it('a toolbar without the option renders no bar and no toggle', () => {
        const side = document.createElement('div');
        document.body.appendChild(side);
        const tb = new DrawingToolbar(side, DARK_THEME, () => {});
        tb.setDefinition(buildToolbar(undefined).definition);
        tb.setVisible(true);
        expect(document.querySelector('.vela-favbar')).toBeNull();
        expect(document.querySelector('.vela-dtb-favtoggle')).toBeNull();
        expect(tb.favoritesBar).toBeNull();
    });
});
