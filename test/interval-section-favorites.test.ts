// @vitest-environment jsdom
// Starred and custom plugin-section sizes (a typed Renko box, a tick count): the dropdown lists and stars them, the
// favorite key is `'@<section id>:<value>'`, and a custom size is kept for the next time the menu opens.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WidgetContext } from '../src/widget/contributions';
import { parseSectionFavorite, registerIntervalSection, sectionFavorite, type IntervalSection } from '../src/widget/interval-sections';
import { customSectionValues, IntervalMenu } from '../src/widget/interval-menu';

// jsdom ships no CSS.escape; the kit's style injection needs it for its id lookup.
(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };

const ctx = { priceStyle: 'renko' } as unknown as WidgetContext;

function boxSection(on: number | null): IntervalSection {
    return {
        id: 'type-renko',
        title: 'Renko',
        order: 90,
        unit: { one: 'box', many: 'box' },
        choices: () => [
            { value: 10, label: 'Box 10' },
            { value: 25, label: 'Box 25' },
        ],
        current: () => on,
        short: (v) => `Box ${v}`,
        label: (v) => `Box ${v}`,
        select: vi.fn(),
        leave: vi.fn(),
    };
}

const offs: (() => void)[] = [];
afterEach(() => {
    for (const off of offs.splice(0)) off();
    localStorage.clear();
    document.body.replaceChildren();
});

function open(favs: string[], onFavorite = vi.fn()) {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    const menu = new IntervalMenu({
        trigger,
        host: document.body,
        timeframes: () => ['1', '5', '60'],
        currentTimeframe: () => '5',
        getContext: () => ctx,
        onTimeframe: vi.fn(),
        favorites: () => favs,
        onFavorite,
    });
    menu.show();
    const rows = () => [...document.querySelectorAll<HTMLElement>('[data-section="type-renko"] .vela-menu-item')];
    return { menu, rows, onFavorite };
}

describe('section favorites', () => {
    it('round-trips the favorite key, and ignores times and unknown sections', () => {
        offs.push(registerIntervalSection(boxSection(null)));
        expect(sectionFavorite('type-renko', 40)).toBe('@type-renko:40');
        const f = parseSectionFavorite('@type-renko:40');
        expect([f?.section.id, f?.value]).toEqual(['type-renko', 40]);
        expect(parseSectionFavorite('60')).toBeNull();
        expect(parseSectionFavorite('@gone:40')).toBeNull();
        expect(parseSectionFavorite('@type-renko:-1')).toBeNull();
    });

    it('stars a size in the dropdown with the section key', () => {
        offs.push(registerIntervalSection(boxSection(10)));
        const { rows, onFavorite } = open([]);
        const box25 = rows().find((r) => r.textContent?.includes('Box 25'))!;
        box25.querySelector<HTMLElement>('.vela-menu-star')!.click();
        expect(onFavorite).toHaveBeenCalledWith('@type-renko:25', true);
    });

    it('lists a starred size the market does not offer, marked as a favorite', () => {
        offs.push(registerIntervalSection(boxSection(10)));
        const { rows } = open(['@type-renko:40']);
        const box40 = rows().find((r) => r.textContent?.includes('Box 40'));
        expect(box40).toBeTruthy();
        expect(box40!.querySelector('.vela-menu-star')?.classList.contains('vela-fav')).toBe(true);
    });

    it('keeps a custom size typed in "Add custom interval…" and lists it next time', () => {
        const s = boxSection(10);
        offs.push(registerIntervalSection(s));
        open([]);
        const form = document.querySelector<HTMLFormElement>('.vela-ivm-form')!;
        form.querySelector<HTMLInputElement>('input')!.value = '40';
        form.querySelector<HTMLSelectElement>('select')!.value = 'sec:type-renko';
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        expect(s.select).toHaveBeenCalledWith(ctx, 40);
        expect(customSectionValues('type-renko')).toEqual([40]);
        document.body.replaceChildren();
        const { rows } = open([]);
        expect(rows().map((r) => r.textContent?.trim())).toEqual(['Box 10', 'Box 25', 'Box 40']);
    });
});
