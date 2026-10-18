// Chart context-menu MODEL — the item descriptors for each right-click zone, how
// contributed rows sort in among them, and the renderer writes a selection implies.
// Pure functions over plain state, so the menus can be tested without a DOM;
// `ChartContextMenu` reads the renderer, calls these and shows the result.
import type { MenuItemDescriptor } from '../ui/components/menu';
import { timezoneMenuRows } from './timezones';

/** Zone a right-click landed in — the chart body, the right price scale, the bottom time axis. */
export type Zone = 'body' | 'price-axis' | 'time-axis';

/** One pane's scale state, as reported by the renderer's `paneScales` feature. */
export interface PaneScaleInfo {
    id: string;
    kind: 'price' | 'study';
    /** The pane's pixel band inside the plot, so a click y maps to a pane. */
    top: number;
    height: number;
    mode: string;
    log: boolean;
    invert: boolean;
}

/** The settings-dialog tab each zone's settings item opens — the one holding the settings
 *  that zone is about, so the menu lands where the eye already is. */
export const SETTINGS_SECTION: Record<Zone, string> = {
    body: 'Canvas',
    'price-axis': 'Scales and lines',
    'time-axis': 'Scales and lines',
};

/** Menu id for the settings item of a zone, carrying the tab to open. */
function settingsItem(zone: Zone, label: string, icon?: string): MenuItemDescriptor {
    return { id: `settings:${SETTINGS_SECTION[zone]}`, label, ...(icon ? { icon } : {}), separatorBefore: true };
}

/** The section a `settings:*` item asks for, or undefined for a bare `settings` id. */
export function settingsSectionOf(id: string): string | undefined {
    return id.slice('settings:'.length) || undefined;
}

/** The four mutually exclusive price-scale choices (log is part of the same group). */
export type ScaleChoice = 'regular' | 'percent' | 'indexed' | 'log';

const SCALE_CHOICES: ReadonlyArray<readonly [ScaleChoice, string]> = [
    ['regular', 'Regular'],
    ['percent', 'Percent'],
    ['indexed', 'Indexed to 100'],
    ['log', 'Logarithmic'],
];

/** Which pane's scale a right-click at plot-local `y` targets, or null without per-pane scales. */
export function paneScaleAt(panes: readonly PaneScaleInfo[], y: number): PaneScaleInfo | null {
    return panes.find((p) => y >= p.top && y < p.top + p.height) ?? panes[0] ?? null;
}

/** A pane's active choice. Log wins over the mode: the two live in one exclusive group. */
export function scaleChoiceOf(scale: { mode?: string; log?: boolean }): ScaleChoice {
    if (scale.log) return 'log';
    if (scale.mode === 'percent') return 'percent';
    if (scale.mode === 'indexed') return 'indexed';
    return 'regular';
}

/** The main (price-pane) scale is the chart-level setting keyboard shortcuts and the
 *  persisted config also drive; a study pane carries its own, so panes stay independent. */
function mainScale(pane: PaneScaleInfo | null): boolean {
    return pane === null || pane.kind === 'price';
}

/** Renderer writes that selecting a scale choice implies — picking one clears the others. */
export function scaleWrites(choice: ScaleChoice, pane: PaneScaleInfo | null): Array<[string, unknown]> {
    const mode = choice === 'percent' ? 'percent' : choice === 'indexed' ? 'indexed' : 'price';
    const log = choice === 'log';
    if (mainScale(pane)) {
        return [
            ['scaleMode', mode],
            ['logScale', log],
        ];
    }
    return [
        ['scaleMode', { pane: pane!.id, mode }],
        ['logScale', { pane: pane!.id, value: log }],
    ];
}

/** The "Scale price chart only" row's state for a right-click on `pane`: the main
 *  price scale carries it, a study pane does not (undefined hides the row). */
export function priceOnlyState(pane: PaneScaleInfo | null, flag: boolean): boolean | undefined {
    return mainScale(pane) ? flag : undefined;
}

/** Renderer write inverting one pane's axis (high at the bottom). */
export function invertWrite(next: boolean, pane: PaneScaleInfo | null): [string, unknown] {
    return mainScale(pane) ? ['invertScale', next] : ['invertScale', { pane: pane!.id, value: next }];
}

export interface PriceAxisState {
    /** Autoscale on — the axis fits the visible data instead of a frozen window. */
    auto: boolean;
    invert: boolean;
    /** "Scale price chart only" (main price scale only; undefined on a study pane hides the row). */
    priceOnly?: boolean;
    choice: ScaleChoice;
    axisLabels: boolean;
    priceLabel: boolean;
    countdown: boolean;
    priceLine: boolean;
}

export function priceAxisItems(s: PriceAxisState): MenuItemDescriptor[] {
    return [
        { id: 'auto', label: 'Auto (fits data to screen)', checked: s.auto },
        ...(s.priceOnly === undefined ? [] : [{ id: 'price-only', label: 'Scale price chart only', checked: s.priceOnly }]),
        { id: 'invert', label: 'Invert scale', checked: s.invert },
        ...SCALE_CHOICES.map(([choice, label], i) => ({
            id: `scale:${choice}`,
            label,
            checked: s.choice === choice,
            separatorBefore: i === 0,
        })),
        {
            id: 'labels',
            label: 'Labels',
            separatorBefore: true,
            submenu: [
                { id: 'toggle:axisLabels', label: 'Price axis labels', checked: s.axisLabels },
                { id: 'toggle:priceLabel', label: 'Last price label', checked: s.priceLabel },
                { id: 'toggle:countdown', label: 'Countdown to bar close', checked: s.countdown },
            ],
        },
        {
            id: 'levels',
            label: 'Levels',
            submenu: [{ id: 'toggle:currentPriceLine', label: 'Last Price Line', checked: s.priceLine }],
        },
        settingsItem('price-axis', 'More settings…'),
    ];
}

/** `timezone` is the host's STORED choice — an IANA zone, or the exchange rule. */
export function timeAxisItems(timezone: string): MenuItemDescriptor[] {
    return [
        {
            id: 'timezone',
            label: 'Time zone',
            submenu: timezoneMenuRows(timezone).map((r) => ({ id: `tz:${r.value}`, label: r.label, checked: r.checked })),
        },
        settingsItem('time-axis', 'More settings…'),
    ];
}

/** What the chart-body menu shows; every field but the counts is optional, so a bare host still gets
 *  TradingView's shape with what it can do. */
export interface BodyMenuState {
    drawings: number;
    indicators: number;
    /** The right-clicked price, formatted as the price scale shows it; null off the price pane. */
    price?: string | null;
    /** The drawings clipboard has something to paste. */
    canPaste?: boolean;
    /** The vertical cursor line is locked to a bar time. */
    cursorLocked?: boolean;
    /** The host has an object tree to open. */
    objectTree?: boolean;
    /** Shortcut hints by row id (`'reset-view': 'Alt+R'`). */
    hints?: Readonly<Record<string, string>>;
}

/** Chart-body items, TradingView's right-click menu: reset | copy price, paste | lock the vertical cursor
 *  line | table view, object tree | remove N drawings, remove N indicators | settings. Alerts and orders
 *  come from the host (`group: 'trade'`). The removals stay VISIBLE with nothing to remove, disabled, so
 *  the menu keeps its shape. */
export function bodyItems(s: BodyMenuState): MenuItemDescriptor[] {
    const hint = (id: string): { hint?: string } => (s.hints?.[id] ? { hint: s.hints[id] } : {});
    const count = (n: number, one: string): string => (n > 0 ? `Remove ${n} ${one}${n === 1 ? '' : 's'}` : `Remove ${one}s`);
    return [
        { id: 'reset-view', label: 'Reset chart view', icon: 'reset', ...hint('reset-view') },
        { id: 'copy-price', label: s.price ? `Copy price ${s.price}` : 'Copy price', icon: 'copy', disabled: !s.price, separatorBefore: true },
        { id: 'paste', label: 'Paste', icon: 'paste', disabled: !s.canPaste, ...hint('paste') },
        { id: 'lock-cursor', label: 'Lock vertical cursor line by time', icon: 'cursor-line', checked: Boolean(s.cursorLocked), separatorBefore: true },
        { id: 'table-view', label: 'Table view', icon: 'table', separatorBefore: true },
        ...(s.objectTree ? [{ id: 'object-tree', label: 'Object tree', icon: 'objects' }] : []),
        { id: 'remove-drawings', label: count(s.drawings, 'drawing'), icon: 'eraser', disabled: s.drawings === 0, separatorBefore: true },
        { id: 'remove-indicators', label: count(s.indicators, 'indicator'), icon: 'trash', disabled: s.indicators === 0 },
        settingsItem('body', 'Settings…', 'gear'),
    ];
}

/** The block each built-in body row belongs to; a contributed row with the same `group` joins it. */
const BODY_GROUPS: Readonly<Record<string, string>> = {
    'reset-view': 'view',
    'copy-price': 'clipboard',
    paste: 'clipboard',
    'lock-cursor': 'cursor',
    'table-view': 'objects',
    'object-tree': 'objects',
    'remove-drawings': 'remove',
    'remove-indicators': 'remove',
};

/**
 * The rank of every built-in context-menu row, by zone and row id (`settings` is each
 * zone's settings row). Contributed `context:*` actions sort TOGETHER with these rows by
 * their `order` (default 0), ascending; on a tie the built-in row comes first, then the
 * actions in registration order. The built-in actions rank below 0 and the settings row at
 * 1000, so an action without `order` lands after the built-in actions and before the
 * settings row, and `order: -100` leads the menu.
 */
export const CONTEXT_MENU_BUILTIN_ORDER = {
    body: {
        'reset-view': -30,
        'copy-price': -29,
        paste: -28,
        // -27..-26: the host's alert and order rows (`group: 'trade'`)
        'lock-cursor': -25,
        'table-view': -24,
        'object-tree': -23,
        // -22..-21: the host's object rows, e.g. chart templates (`group: 'objects'`)
        'remove-drawings': -20,
        'remove-indicators': -10,
        settings: 1000,
    },
    'price-axis': {
        auto: -80,
        'price-only': -75,
        invert: -70,
        'scale:regular': -60,
        'scale:percent': -50,
        'scale:indexed': -40,
        'scale:log': -30,
        labels: -20,
        levels: -10,
        settings: 1000,
    },
    'time-axis': { timezone: -10, settings: 1000 },
} as const satisfies Record<Zone, Record<string, number>>;

/** A contributed row on its way into a context menu, with the action's `order` and `group`. */
export interface ContributedRow {
    item: MenuItemDescriptor;
    order?: number;
    /** The built-in block it joins (see `WidgetActionDescriptor.group`); omitted, it forms its own. */
    group?: string;
    /** The built-in row id it stands in for; that row is dropped. */
    replaces?: string;
}

/**
 * One zone's menu: the built-in rows and the contributed ones interleaved by rank (see
 * {@link CONTEXT_MENU_BUILTIN_ORDER}). Separators fall between blocks only, never at the
 * ends: each built-in group is a run the builder already separates, a contributed row with a
 * `group` belongs to that built-in block, and consecutive other contributed rows form one block.
 * `contributed` arrives in registration order within equal `order`s (what `widgetActions`
 * returns) and keeps it.
 */
export function composeMenu(zone: Zone, builtin: readonly MenuItemDescriptor[], contributed: readonly ContributedRow[]): MenuItemDescriptor[] {
    const ranks: Readonly<Record<string, number>> = CONTEXT_MENU_BUILTIN_ORDER[zone];
    const named: Readonly<Record<string, string>> = zone === 'body' ? BODY_GROUPS : {};
    const rows: Array<{ item: MenuItemDescriptor; rank: number; group: string }> = [];
    let run = 0;
    const replaced = new Set(contributed.map((c) => c.replaces).filter((id): id is string => Boolean(id)));
    for (const item of builtin) {
        if (replaced.has(item.id)) {
            if (item.separatorBefore) run += 1;
            continue;
        }
        if (item.separatorBefore) run += 1;
        rows.push({ item, rank: ranks[item.id.startsWith('settings') ? 'settings' : item.id] ?? 0, group: named[item.id] ?? `#${run}` });
    }
    for (const { item, order, group } of contributed) rows.push({ item, rank: order ?? 0, group: group ?? '~contributed' });
    rows.sort((a, b) => a.rank - b.rank);
    return rows.map(({ item, group: g }, i) => ({ ...item, separatorBefore: i > 0 && rows[i - 1]!.group !== g }));
}
