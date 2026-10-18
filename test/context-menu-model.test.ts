// The chart context menus (src/widget/context-menu-model.ts): what each right-click zone
// offers, which item is checked, and the renderer writes a selection implies — including
// the per-pane price scales. Pure functions over plain objects, so this runs in node.
import { describe, it, expect } from 'vitest';
import {
    bodyItems,
    composeMenu,
    CONTEXT_MENU_BUILTIN_ORDER,
    invertWrite,
    paneScaleAt,
    priceAxisItems,
    scaleChoiceOf,
    scaleWrites,
    settingsSectionOf,
    timeAxisItems,
    type PaneScaleInfo,
    type PriceAxisState,
} from '../src/widget/context-menu-model';
import type { MenuItemDescriptor } from '../src/ui/components/menu';
import { TIMEZONES } from '../src/widget/timezones';

function pane(id: string, kind: 'price' | 'study', top: number, height: number, extra: Partial<PaneScaleInfo> = {}): PaneScaleInfo {
    return { id, kind, top, height, mode: 'price', log: false, invert: false, ...extra };
}

const AXIS_STATE: PriceAxisState = {
    auto: true,
    invert: false,
    choice: 'regular',
    axisLabels: true,
    priceLabel: true,
    countdown: false,
    priceLine: true,
};

describe('paneScaleAt', () => {
    const panes = [pane('price', 'price', 0, 300), pane('p2', 'study', 300, 100)];

    it('maps a click y to the pane whose band contains it', () => {
        expect(paneScaleAt(panes, 10)?.id).toBe('price');
        expect(paneScaleAt(panes, 299)?.id).toBe('price');
        expect(paneScaleAt(panes, 300)?.id).toBe('p2');
        expect(paneScaleAt(panes, 399)?.id).toBe('p2');
    });

    it('falls back to the first pane out of band, and to null without per-pane scales', () => {
        expect(paneScaleAt(panes, 5000)?.id).toBe('price');
        expect(paneScaleAt([], 10)).toBeNull();
    });
});

describe('price-scale choice', () => {
    it('log wins over the mode — the four choices are one exclusive group', () => {
        expect(scaleChoiceOf({ mode: 'price', log: false })).toBe('regular');
        expect(scaleChoiceOf({ mode: 'percent', log: false })).toBe('percent');
        expect(scaleChoiceOf({ mode: 'indexed', log: false })).toBe('indexed');
        expect(scaleChoiceOf({ mode: 'percent', log: true })).toBe('log');
    });

    it('picking one choice clears the others on the main scale', () => {
        expect(scaleWrites('percent', null)).toEqual([
            ['scaleMode', 'percent'],
            ['logScale', false],
        ]);
        expect(scaleWrites('log', null)).toEqual([
            ['scaleMode', 'price'],
            ['logScale', true],
        ]);
        expect(scaleWrites('indexed', pane('price', 'price', 0, 100))).toEqual([
            ['scaleMode', 'indexed'],
            ['logScale', false],
        ]);
    });

    it('a study pane is targeted pane-scoped, so panes never affect each other', () => {
        expect(scaleWrites('log', pane('p2', 'study', 300, 100))).toEqual([
            ['scaleMode', { pane: 'p2', mode: 'price' }],
            ['logScale', { pane: 'p2', value: true }],
        ]);
    });

    it('invert follows the same main-scale / per-pane split', () => {
        expect(invertWrite(true, null)).toEqual(['invertScale', true]);
        expect(invertWrite(false, pane('price', 'price', 0, 100))).toEqual(['invertScale', false]);
        expect(invertWrite(true, pane('p2', 'study', 0, 100))).toEqual(['invertScale', { pane: 'p2', value: true }]);
    });
});

describe('price-axis menu', () => {
    it('offers auto, invert, the four scale modes, the Labels/Levels submenus and settings', () => {
        const items = priceAxisItems(AXIS_STATE);
        expect(items.map((i) => i.label)).toEqual([
            'Auto (fits data to screen)',
            'Invert scale',
            'Regular',
            'Percent',
            'Indexed to 100',
            'Logarithmic',
            'Labels',
            'Levels',
            'More settings…',
        ]);
        expect(items.filter((i) => i.separatorBefore).map((i) => i.label)).toEqual(['Regular', 'Labels', 'More settings…']);
        expect(items.find((i) => i.label === 'Labels')?.submenu?.map((i) => i.label)).toEqual(['Price axis labels', 'Last price label', 'Countdown to bar close']);
        expect(items.find((i) => i.label === 'Levels')?.submenu?.map((i) => i.id)).toEqual(['toggle:currentPriceLine']);
    });

    it('check marks track the state — exactly one scale mode at a time', () => {
        const items = priceAxisItems({ ...AXIS_STATE, auto: false, invert: true, choice: 'indexed' });
        expect(items.find((i) => i.id === 'auto')?.checked).toBe(false);
        expect(items.find((i) => i.id === 'invert')?.checked).toBe(true);
        expect(items.filter((i) => i.id.startsWith('scale:') && i.checked).map((i) => i.id)).toEqual(['scale:indexed']);
    });

    it('the submenu toggles mirror the label/level feature states', () => {
        const items = priceAxisItems({ ...AXIS_STATE, axisLabels: false, countdown: true, priceLine: false });
        const labels = items.find((i) => i.id === 'labels')!.submenu!;
        expect(labels.find((i) => i.id === 'toggle:axisLabels')?.checked).toBe(false);
        expect(labels.find((i) => i.id === 'toggle:priceLabel')?.checked).toBe(true);
        expect(labels.find((i) => i.id === 'toggle:countdown')?.checked).toBe(true);
        expect(items.find((i) => i.id === 'levels')!.submenu![0]!.checked).toBe(false);
    });
});

describe('time-axis menu', () => {
    it('lists UTC, the exchange rule, then every other timezone, and checks the active one', () => {
        const items = timeAxisItems('Europe/Paris');
        expect(items.map((i) => i.id)).toEqual(['timezone', 'settings:Scales and lines']);
        const zones = items[0]!.submenu!;
        expect(zones).toHaveLength(TIMEZONES.length + 1);
        expect(zones.slice(0, 2).map((z) => z.id)).toEqual(['tz:Etc/UTC', 'tz:exchange']);
        expect(zones.filter((z) => z.checked).map((z) => z.id)).toEqual(['tz:Europe/Paris']);
        expect(zones.find((z) => z.id === 'tz:Asia/Tokyo')?.label).toBe('(UTC+9) Tokyo');
    });

    it("a renderer's bare 'UTC' checks the same row as 'Etc/UTC'", () => {
        for (const tz of ['UTC', 'Etc/UTC']) {
            expect(timeAxisItems(tz)[0]!.submenu!.filter((z) => z.checked).map((z) => z.id)).toEqual(['tz:Etc/UTC']);
        }
    });

    it('the exchange row reads plain "Exchange" (a rule, no offset) and checks under the rule', () => {
        const zones = timeAxisItems('exchange')[0]!.submenu!;
        expect(zones.filter((z) => z.checked).map((z) => z.id)).toEqual(['tz:exchange']);
        expect(zones[1]!.label).toBe('Exchange');
        // A fixed zone active: the exchange row is offered but not checked.
        expect(timeAxisItems('Europe/Paris')[0]!.submenu![1]!.checked).toBe(false);
    });
});

describe('chart-body menu', () => {
    const ids = (items: MenuItemDescriptor[]): string[] => items.map((i) => i.id);

    it("has TradingView's rows and blocks", () => {
        const items = bodyItems({ drawings: 21, indicators: 3, price: '81,782.00', canPaste: true, objectTree: true, hints: { 'reset-view': 'Alt+R', paste: 'Ctrl+V' } });
        expect(items.map((i) => (i.separatorBefore ? `| ${i.label}` : i.label)).join(' ')).toBe(
            'Reset chart view | Copy price 81,782.00 Paste | Lock vertical cursor line by time | Table view Object tree | Remove 21 drawings Remove 3 indicators | Settings…',
        );
        expect(items.find((i) => i.id === 'reset-view')!.hint).toBe('Alt+R');
        expect(items.find((i) => i.id === 'paste')!.hint).toBe('Ctrl+V');
        expect(items.some((i) => i.disabled)).toBe(false);
    });

    it('greys what cannot run and keeps the menu shape', () => {
        const empty = bodyItems({ drawings: 0, indicators: 0 });
        expect(ids(empty)).toEqual(['reset-view', 'copy-price', 'paste', 'lock-cursor', 'table-view', 'remove-drawings', 'remove-indicators', 'settings:Canvas']);
        expect(empty.filter((i) => i.disabled).map((i) => i.id)).toEqual(['copy-price', 'paste', 'remove-drawings', 'remove-indicators']);
        expect(empty.find((i) => i.id === 'remove-drawings')!.label).toBe('Remove drawings');
        expect(bodyItems({ drawings: 1, indicators: 1 }).find((i) => i.id === 'remove-drawings')!.label).toBe('Remove 1 drawing');
    });

    it('checks the cursor-lock row while the line is locked', () => {
        expect(bodyItems({ drawings: 0, indicators: 0, cursorLocked: true }).find((i) => i.id === 'lock-cursor')!.checked).toBe(true);
        expect(bodyItems({ drawings: 0, indicators: 0 }).find((i) => i.id === 'lock-cursor')!.checked).toBe(false);
    });

    it('every body row carries an icon (one clean tile column); the axis menus stay text-only', () => {
        const rows = bodyItems({ drawings: 0, indicators: 0, objectTree: true });
        expect(rows.filter((i) => !i.icon).map((i) => i.id)).toEqual([]);
        expect(rows.map((i) => [i.id, i.icon])).toEqual([
            ['reset-view', 'reset'],
            ['copy-price', 'copy'],
            ['paste', 'paste'],
            ['lock-cursor', 'cursor-line'],
            ['table-view', 'table'],
            ['object-tree', 'objects'],
            ['remove-drawings', 'eraser'],
            ['remove-indicators', 'trash'],
            ['settings:Canvas', 'gear'],
        ]);
        expect(priceAxisItems(AXIS_STATE).some((i) => i.icon)).toBe(false);
        expect(timeAxisItems('Etc/UTC').some((i) => i.icon)).toBe(false);
    });
});

describe('contributed rows sort together with the built-in ones', () => {
    const BODY = bodyItems({ drawings: 1, indicators: 1, objectTree: true });
    const row = (id: string, order?: number): { item: MenuItemDescriptor; order?: number } => ({ item: { id, label: id }, ...(order !== undefined ? { order } : {}) });
    const ids = (items: MenuItemDescriptor[]): string[] => items.map((i) => i.id);
    /** Ids with a `|` where a separator is drawn. */
    const shape = (items: MenuItemDescriptor[]): string => items.map((i) => (i.separatorBefore ? `| ${i.id}` : i.id)).join(' ');

    it('every built-in row has a documented rank', () => {
        const zones = {
            body: BODY,
            'price-axis': priceAxisItems({ ...AXIS_STATE, priceOnly: false }),
            'time-axis': timeAxisItems('Etc/UTC'),
        } as const;
        for (const [zone, items] of Object.entries(zones) as Array<[keyof typeof zones, MenuItemDescriptor[]]>) {
            const ranks: Record<string, number> = CONTEXT_MENU_BUILTIN_ORDER[zone];
            for (const item of items) expect(ranks[item.id.startsWith('settings') ? 'settings' : item.id], `${zone} ${item.id}`).toBeTypeOf('number');
            expect(Object.keys(ranks)).toHaveLength(items.length);
        }
    });

    it('with nothing contributed, every menu keeps its rows and separators', () => {
        expect(composeMenu('body', BODY, [])).toEqual(BODY.map((i) => ({ ...i, separatorBefore: Boolean(i.separatorBefore) })));
        expect(shape(composeMenu('price-axis', priceAxisItems(AXIS_STATE), []))).toBe(shape(priceAxisItems(AXIS_STATE)));
        expect(shape(composeMenu('time-axis', timeAxisItems('Etc/UTC'), []))).toBe('timezone | settings:Scales and lines');
    });

    it('an action without order lands after the built-in actions and before Settings…', () => {
        expect(shape(composeMenu('body', BODY, [row('a')]))).toBe('reset-view | copy-price paste | lock-cursor | table-view object-tree | remove-drawings remove-indicators | a | settings:Canvas');
    });

    it('a negative order leads the menu, separated from the built-in rows', () => {
        expect(shape(composeMenu('body', BODY, [row('copy', -100)]))).toBe('copy | reset-view | copy-price paste | lock-cursor | table-view object-tree | remove-drawings remove-indicators | settings:Canvas');
    });

    it('an order between two built-in ranks lands between those rows', () => {
        expect(ids(composeMenu('body', BODY, [row('x', -21), row('y', 1001)]))).toEqual(['reset-view', 'copy-price', 'paste', 'lock-cursor', 'table-view', 'object-tree', 'x', 'remove-drawings', 'remove-indicators', 'settings:Canvas', 'y']);
        // Splitting a built-in group separates the action from both halves.
        expect(shape(composeMenu('body', BODY, [row('x', -15)]))).toBe('reset-view | copy-price paste | lock-cursor | table-view object-tree | remove-drawings | x | remove-indicators | settings:Canvas');
    });

    it('ties keep registration order, the built-in row first', () => {
        expect(ids(composeMenu('body', BODY, [row('b'), row('a'), row('c', 0)])).slice(8, 11)).toEqual(['b', 'a', 'c']);
        expect(ids(composeMenu('body', BODY, [row('tie', -30)])).slice(0, 2)).toEqual(['reset-view', 'tie']);
        expect(ids(composeMenu('body', BODY, [row('last', 1000)])).slice(-2)).toEqual(['settings:Canvas', 'last']);
    });

    it('consecutive contributed rows form one group, and no separator opens or closes the menu', () => {
        const items = composeMenu('body', BODY, [row('a', -200), row('b', -100), row('c'), row('d')]);
        expect(shape(items)).toBe('a b | reset-view | copy-price paste | lock-cursor | table-view object-tree | remove-drawings remove-indicators | c d | settings:Canvas');
        expect(items[0]!.separatorBefore).toBe(false);
        expect(composeMenu('body', [], [row('a'), row('b')]).some((i) => i.separatorBefore)).toBe(false);
    });

    it('the axis menus keep their built-in order and groups, with More settings… at the end', () => {
        const price = composeMenu('price-axis', priceAxisItems(AXIS_STATE), [row('p')]);
        expect(shape(price)).toBe('auto invert | scale:regular scale:percent scale:indexed scale:log | labels levels | p | settings:Scales and lines');
        expect(shape(composeMenu('price-axis', priceAxisItems(AXIS_STATE), [row('lead', -100)]))).toMatch(/^lead \| auto invert \|/);
        expect(shape(composeMenu('time-axis', timeAxisItems('Etc/UTC'), [row('t')]))).toBe('timezone | t | settings:Scales and lines');
    });

    it('a row with a group joins that block without separators of its own', () => {
        const alert = { item: { id: 'alert', label: 'Add alert' }, order: -27, group: 'trade' };
        expect(shape(composeMenu('body', BODY, [alert]))).toBe('reset-view | copy-price paste | alert | lock-cursor | table-view object-tree | remove-drawings remove-indicators | settings:Canvas');
        const tpl = { item: { id: 'tpl', label: 'Chart template' }, order: -22, group: 'objects' };
        expect(shape(composeMenu('body', BODY, [tpl]))).toBe('reset-view | copy-price paste | lock-cursor | table-view object-tree tpl | remove-drawings remove-indicators | settings:Canvas');
    });

    it('rows pass through untouched apart from their separator', () => {
        const item: MenuItemDescriptor = { id: 'action:x', label: 'Copy price', icon: 'clone', separatorBefore: true };
        const [first] = composeMenu('body', BODY, [{ item, order: -100 }]);
        expect(first).toEqual({ id: 'action:x', label: 'Copy price', icon: 'clone', separatorBefore: false });
        expect(composeMenu('body', BODY, []).slice(-1)[0]).toMatchObject({ id: 'settings:Canvas', icon: 'gear', separatorBefore: true });
    });
});

describe('settings items', () => {
    it('each zone opens the dialog tab holding that zone’s own settings', () => {
        const sectionOfLast = (items: MenuItemDescriptor[]): string | undefined => settingsSectionOf(items[items.length - 1]!.id);
        expect(sectionOfLast(bodyItems({ drawings: 0, indicators: 0 }))).toBe('Canvas');
        expect(sectionOfLast(priceAxisItems(AXIS_STATE))).toBe('Scales and lines');
        expect(sectionOfLast(timeAxisItems('Etc/UTC'))).toBe('Scales and lines');
    });

    it('a bare settings id asks for no particular tab', () => {
        expect(settingsSectionOf('settings')).toBeUndefined();
    });
});
