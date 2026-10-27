// Interval dropdown (desktop topbar) — TradingView's layout: "Add custom interval…" on top, then
// collapsible sections. The built-in time sections (SECONDS / MINUTES / HOURS / DAYS) list the
// host's timeframes plus the user's custom ones; plugin sections (`interval-sections.ts`: TICKS,
// RANGES…) list their own values. Which sections are open is remembered; the section holding the
// current interval always opens.
import { Popover } from '../ui/components/popover';
import { iconEl } from '../ui/icons';
import { injectStyles } from '../ui/styles';
import type { WidgetContext } from './contributions';
import {
    activeIntervalSection,
    BUILTIN_INTERVAL_ORDER,
    intervalSections,
    parseSectionFavorite,
    sectionFavorite,
    type IntervalChoice,
    type IntervalSection,
} from './interval-sections';
import { parseTimeframe, timeframeLabel, timeframeMs } from './timeframe';

const STYLE_ID = 'vela-widget-interval-menu';
const CSS = `
.vela-ivm { min-width: 220px; max-height: min(70vh, 640px); padding: 6px; display: flex; flex-direction: column; }
.vela-ivm button.vela-menu-item { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 4px; cursor: pointer; white-space: nowrap; }
.vela-ivm .vela-menu-item:hover, .vela-ivm .vela-menu-item:focus-visible { background: var(--vela-hover); }
.vela-ivm .vela-menu-item[data-checked] { background: var(--vela-hover-strong); color: var(--vela-fg-bright); }
.vela-ivm .vela-menu-item .vela-menu-label { flex: 1 1 auto; }
.vela-ivm .vela-menu-item .vela-menu-hint { color: var(--vela-fg-faint); font-size: var(--vela-font-size-sm); }
.vela-ivm .vela-menu-item:hover .vela-menu-star { opacity: 0.55; }
.vela-ivm .vela-menu-item .vela-menu-star.vela-fav { opacity: 0.95; }
.vela-ivm-add .vela-icon { width: 16px; height: 16px; font-size: 16px; }
.vela-ivm-sec { border-top: 1px solid var(--vela-border); }
.vela-ivm-add + .vela-ivm-form + .vela-ivm-sec, .vela-ivm-add + .vela-ivm-sec { margin-top: 4px; }
.vela-ivm button.vela-ivm-head { all: unset; box-sizing: border-box; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 9px 10px; cursor: pointer; font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; color: var(--vela-fg-muted); border-radius: 4px; }
.vela-ivm button.vela-ivm-head:hover, .vela-ivm button.vela-ivm-head:focus-visible { color: var(--vela-fg-bright); background: var(--vela-hover); }
.vela-ivm-head .vela-icon { width: 14px; height: 14px; font-size: 14px; }
.vela-ivm-rows { display: flex; flex-direction: column; padding-bottom: 4px; }
.vela-ivm-sec:not([data-open]) .vela-ivm-rows { display: none; }
.vela-ivm-note { padding: 6px 10px; color: var(--vela-fg-faint); font-size: var(--vela-font-size-sm); white-space: normal; }
.vela-ivm-form { display: flex; gap: 6px; padding: 4px 6px 8px; align-items: center; }
.vela-ivm-form[hidden] { display: none; }
.vela-ivm-form input, .vela-ivm-form select { box-sizing: border-box; height: 30px; border-radius: 4px; border: 1px solid var(--vela-border-strong); background: var(--vela-surface); color: var(--vela-fg); font: inherit; padding: 0 8px; }
.vela-ivm-form input { width: 76px; }
.vela-ivm-form select { flex: 1 1 auto; min-width: 0; }
.vela-ivm-form button { all: unset; box-sizing: border-box; height: 30px; padding: 0 12px; border-radius: 4px; cursor: pointer; background: var(--vela-hover-strong); color: var(--vela-fg-bright); }
.vela-ivm-form button:disabled { opacity: 0.4; cursor: default; }
`;

const OPEN_KEY = 'vela.interval.open';
const CUSTOM_KEY = 'vela.interval.custom';
/** Custom section sizes (a typed brick size, tick count…), as `'@<section id>:<value>'`. */
const CUSTOM_SECTION_KEY = 'vela.interval.custom.sections';

type TimeGroup = 'seconds' | 'minutes' | 'hours' | 'days';
const TIME_TITLES: Record<TimeGroup, string> = { seconds: 'Seconds', minutes: 'Minutes', hours: 'Hours', days: 'Days' };
const TIME_UNITS: Record<TimeGroup, { letter: string; one: string; many: string }> = {
    seconds: { letter: 'S', one: 'second', many: 'seconds' },
    minutes: { letter: '', one: 'minute', many: 'minutes' },
    hours: { letter: 'H', one: 'hour', many: 'hours' },
    days: { letter: 'D', one: 'day', many: 'days' },
};

/** Which time section a timeframe value belongs to (null: unparsable). */
export function timeGroupOf(tf: string): TimeGroup | null {
    const ms = timeframeMs(tf);
    if (!Number.isFinite(ms)) return null;
    if (ms < 60_000) return 'seconds';
    if (ms < 3_600_000) return 'minutes';
    if (ms < 86_400_000) return 'hours';
    return 'days';
}

/** Long row label of a timeframe (`'60'` → `'1 hour'`, `'5'` → `'5 minutes'`, `'W'` → `'1 week'`). */
export function timeframeLongLabel(tf: string): string {
    const short = timeframeLabel(tf);
    const m = /^(\d+)([a-zA-Z])$/.exec(short);
    if (!m) return short;
    const n = Number(m[1]);
    const names: Record<string, string> = { s: 'second', m: 'minute', h: 'hour', D: 'day', W: 'week', M: 'month', Y: 'year' };
    const name = names[m[2]!] ?? m[2]!;
    return `${n} ${name}${n === 1 ? '' : 's'}`;
}

function readList(key: string): string[] | null {
    try {
        const raw = localStorage.getItem(key);
        const v: unknown = raw ? JSON.parse(raw) : null;
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null;
    } catch {
        return null;
    }
}

function writeList(key: string, list: readonly string[]): void {
    try {
        localStorage.setItem(key, JSON.stringify(list));
    } catch {
        /* private mode: the choice just is not remembered */
    }
}

/** Custom time intervals the user added (canonical values, e.g. `'45'`, `'2S'`). */
export function customTimeframes(): string[] {
    return readList(CUSTOM_KEY) ?? [];
}

/** Custom sizes the user added to a plugin section (kept, so they can be picked again and starred). */
export function customSectionValues(id: string): number[] {
    const out: number[] = [];
    for (const key of readList(CUSTOM_SECTION_KEY) ?? []) {
        const i = key.lastIndexOf(':');
        const v = Number(key.slice(i + 1));
        if (i > 1 && key.slice(1, i) === id && Number.isFinite(v) && v > 0) out.push(v);
    }
    return out;
}

function addCustomSectionValue(id: string, value: number): void {
    const list = readList(CUSTOM_SECTION_KEY) ?? [];
    const key = sectionFavorite(id, value);
    if (!list.includes(key)) writeList(CUSTOM_SECTION_KEY, [...list, key]);
}

export interface IntervalMenuOptions {
    trigger: HTMLElement;
    host?: HTMLElement;
    timeframes: () => readonly string[];
    currentTimeframe: () => string;
    /** Live context of the active chart; without it plugin sections are not offered. */
    getContext?: () => WidgetContext;
    onTimeframe: (tf: string) => void;
    favorites?: () => readonly string[];
    onFavorite?: (tf: string, on: boolean) => void;
}

export class IntervalMenu {
    private readonly popover: Popover;
    private readonly panel: HTMLElement;
    private readonly doc: Document;
    private openIds: Set<string> | null = readList(OPEN_KEY) ? new Set(readList(OPEN_KEY)) : null;
    private gen = 0;

    constructor(private readonly opts: IntervalMenuOptions) {
        this.doc = opts.trigger.ownerDocument;
        injectStyles(STYLE_ID, CSS, this.doc);
        this.panel = this.doc.createElement('div');
        this.panel.className = 'vela-menu vela-ivm';
        this.panel.setAttribute('role', 'menu');
        this.panel.dataset.testid = 'interval-menu';
        this.popover = new Popover({ trigger: opts.trigger, host: opts.host, content: this.panel, align: 'start', gap: 4 });
        opts.trigger.addEventListener('click', () => this.toggle());
    }

    get isOpen(): boolean {
        return this.popover.open;
    }

    toggle(): void {
        if (this.popover.open) this.popover.hide();
        else this.show();
    }

    show(): void {
        this.render();
        this.popover.show();
    }

    hide(): void {
        this.popover.hide();
    }

    /** Re-render in place while open (a plugin's state changed). */
    refresh(): void {
        if (this.popover.open) {
            this.render();
            this.popover.reposition();
        }
    }

    destroy(): void {
        this.popover.destroy();
    }

    private ctx(): WidgetContext | null {
        return this.opts.getContext?.() ?? null;
    }

    private isOpenSection(id: string, holdsCurrent: boolean): boolean {
        if (holdsCurrent) return true;
        return this.openIds?.has(id) ?? false;
    }

    private setOpen(id: string, open: boolean): void {
        this.openIds ??= new Set();
        if (open) this.openIds.add(id);
        else this.openIds.delete(id);
        writeList(OPEN_KEY, [...this.openIds]);
    }

    private pick(run: () => void): void {
        this.popover.hide();
        run();
    }

    /** Pick a time interval: leave a plugin section first when one is on. */
    private pickTime(tf: string): void {
        const ctx = this.ctx();
        const active = ctx ? activeIntervalSection(ctx) : null;
        this.pick(() => {
            if (ctx && active) active.section.leave(ctx);
            this.opts.onTimeframe(tf);
        });
    }

    private pickSection(section: IntervalSection, value: number): void {
        const ctx = this.ctx();
        if (!ctx) return;
        const active = activeIntervalSection(ctx);
        this.pick(() => {
            if (active && active.section.id !== section.id) active.section.leave(ctx);
            section.select(ctx, value);
        });
    }

    private row(label: string, checked: boolean, onPick: () => void, extra?: { hint?: string; star?: { on: boolean; toggle: () => void } }): HTMLElement {
        const b = this.doc.createElement('button');
        b.type = 'button';
        b.className = 'vela-menu-item';
        b.setAttribute('role', 'menuitemradio');
        b.setAttribute('aria-checked', String(checked));
        if (checked) b.dataset.checked = '';
        const l = this.doc.createElement('span');
        l.className = 'vela-menu-label';
        l.textContent = label;
        b.appendChild(l);
        if (extra?.hint) {
            const h = this.doc.createElement('span');
            h.className = 'vela-menu-hint';
            h.textContent = extra.hint;
            b.appendChild(h);
        }
        if (extra?.star) {
            const { on, toggle } = extra.star;
            const star = iconEl(on ? 'star-filled' : 'star', this.doc);
            star.classList.add('vela-menu-star');
            if (on) star.classList.add('vela-fav');
            star.removeAttribute('aria-hidden');
            star.setAttribute('role', 'button');
            star.setAttribute('aria-label', on ? 'Remove from favorites' : 'Add to favorites');
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle();
                this.render();
            });
            b.appendChild(star);
        }
        b.addEventListener('click', onPick);
        return b;
    }

    private section(id: string, title: string, holdsCurrent: boolean, fill: (rows: HTMLElement) => void): HTMLElement {
        const sec = this.doc.createElement('div');
        sec.className = 'vela-ivm-sec';
        sec.dataset.section = id;
        const open = this.isOpenSection(id, holdsCurrent);
        if (open) sec.dataset.open = '';
        const head = this.doc.createElement('button');
        head.type = 'button';
        head.className = 'vela-ivm-head';
        head.setAttribute('aria-expanded', String(open));
        const t = this.doc.createElement('span');
        t.textContent = title;
        head.append(t, iconEl(open ? 'chevron-up' : 'chevron-down', this.doc));
        head.addEventListener('click', () => {
            const next = !('open' in sec.dataset);
            this.setOpen(id, next);
            this.render();
            this.popover.reposition();
        });
        const rows = this.doc.createElement('div');
        rows.className = 'vela-ivm-rows';
        sec.append(head, rows);
        if (open) fill(rows);
        return sec;
    }

    private render(): void {
        const gen = ++this.gen;
        const ctx = this.ctx();
        const active = ctx ? activeIntervalSection(ctx) : null;
        const current = this.opts.currentTimeframe();
        const sections = ctx ? intervalSections(ctx) : [];
        this.panel.replaceChildren();

        // Custom interval: an inline form (count + unit), time units and every plugin unit.
        const add = this.row('Add custom interval…', false, () => {
            form.hidden = !form.hidden;
            if (!form.hidden) input.focus();
        });
        add.classList.add('vela-ivm-add');
        add.removeAttribute('role');
        add.prepend(iconEl('plus', this.doc));
        const form = this.doc.createElement('form');
        form.className = 'vela-ivm-form';
        form.hidden = true;
        const input = this.doc.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = 'any';
        input.placeholder = '1';
        input.setAttribute('aria-label', 'Interval size');
        const unit = this.doc.createElement('select');
        unit.setAttribute('aria-label', 'Interval unit');
        for (const g of ['seconds', 'minutes', 'hours', 'days'] as TimeGroup[]) {
            const o = this.doc.createElement('option');
            o.value = `time:${g}`;
            o.textContent = TIME_UNITS[g].many;
            unit.appendChild(o);
        }
        for (const s of sections) {
            const o = this.doc.createElement('option');
            o.value = `sec:${s.id}`;
            o.textContent = s.unit.many;
            unit.appendChild(o);
        }
        unit.value = 'time:minutes';
        const go = this.doc.createElement('button');
        go.type = 'submit';
        go.textContent = 'Add';
        form.append(input, unit, go);
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const n = Number(input.value);
            if (!Number.isFinite(n) || n <= 0) return;
            const [kind, id] = unit.value.split(':');
            if (kind === 'sec') {
                const s = sections.find((x) => x.id === id);
                if (!s) return;
                addCustomSectionValue(s.id, n);
                this.pickSection(s, n);
                return;
            }
            if (!Number.isInteger(n)) return;
            const parsed = parseTimeframe(`${n}${TIME_UNITS[id as TimeGroup].letter}`);
            if (!parsed.valid || !parsed.canonical) return;
            const list = customTimeframes();
            if (!list.includes(parsed.canonical) && !this.opts.timeframes().includes(parsed.canonical)) writeList(CUSTOM_KEY, [...list, parsed.canonical]);
            this.pickTime(parsed.canonical);
        });
        this.panel.append(add, form);

        // Time sections from the host's list plus custom values, in duration order.
        const tfs = [...new Set([...this.opts.timeframes(), ...customTimeframes()])].sort((a, b) => timeframeMs(a) - timeframeMs(b));
        const favs = this.opts.favorites?.() ?? [];
        const timeSec = (g: TimeGroup): HTMLElement | null => {
            const list = tfs.filter((tf) => timeGroupOf(tf) === g);
            if (!list.length) return null;
            const holds = !active && list.includes(current);
            return this.section(g, TIME_TITLES[g], holds, (rows) => {
                for (const tf of list) {
                    const star = this.opts.onFavorite ? { on: favs.includes(tf), toggle: () => this.opts.onFavorite!(tf, !favs.includes(tf)) } : undefined;
                    rows.appendChild(this.row(timeframeLongLabel(tf), !active && tf === current, () => this.pickTime(tf), { star }));
                }
            });
        };
        const pluginSec = (s: IntervalSection): HTMLElement => {
            const holds = active?.section.id === s.id;
            return this.section(s.id, s.title, holds, (rows) => {
                const paint = (choices: readonly IntervalChoice[]): void => {
                    rows.replaceChildren();
                    const values = [...choices];
                    // Listed besides the offered sizes: the value in use, the user's custom sizes and starred ones.
                    const extra = [
                        ...(holds && active ? [active.value] : []),
                        ...customSectionValues(s.id),
                        ...favs.map(parseSectionFavorite).flatMap((f) => (f && f.section.id === s.id ? [f.value] : [])),
                    ];
                    for (const v of extra) {
                        if (values.some((c) => c.value === v)) continue;
                        values.push({ value: v, label: s.label?.(v) ?? `${v} ${v === 1 ? s.unit.one : s.unit.many}` });
                    }
                    values.sort((a, b) => a.value - b.value);
                    for (const c of values) {
                        const key = sectionFavorite(s.id, c.value);
                        const star = this.opts.onFavorite ? { on: favs.includes(key), toggle: () => this.opts.onFavorite!(key, !favs.includes(key)) } : undefined;
                        rows.appendChild(this.row(c.label, holds && c.value === active?.value, () => this.pickSection(s, c.value), { hint: c.hint, star }));
                    }
                    if (!values.length) {
                        const n = this.doc.createElement('div');
                        n.className = 'vela-ivm-note';
                        n.textContent = `No suggested sizes for this market. Use "Add custom interval…".`;
                        rows.appendChild(n);
                    }
                };
                const got = ctx ? s.choices(ctx) : [];
                if (Array.isArray(got)) {
                    paint(got);
                    return;
                }
                const wait = this.doc.createElement('div');
                wait.className = 'vela-ivm-note';
                wait.textContent = 'Sizing for this market…';
                rows.appendChild(wait);
                void Promise.resolve(got)
                    .then((choices) => {
                        if (gen !== this.gen || !rows.isConnected) return;
                        paint(choices);
                        this.popover.reposition();
                    })
                    .catch(() => {
                        if (gen === this.gen) wait.textContent = 'Could not size these bars for this market.';
                    });
            });
        };

        const blocks: { order: number; el: HTMLElement | null }[] = [
            { order: BUILTIN_INTERVAL_ORDER.seconds, el: timeSec('seconds') },
            { order: BUILTIN_INTERVAL_ORDER.minutes, el: timeSec('minutes') },
            { order: BUILTIN_INTERVAL_ORDER.hours, el: timeSec('hours') },
            { order: BUILTIN_INTERVAL_ORDER.days, el: timeSec('days') },
            ...sections.map((s) => ({ order: s.order, el: pluginSec(s) })),
        ];
        blocks.sort((a, b) => a.order - b.order);
        for (const b of blocks) if (b.el) this.panel.appendChild(b.el);
    }
}

/** The compact label of the current interval: a plugin section's (`'100T'`) when one is on. */
export function currentIntervalLabel(timeframe: string, ctx: WidgetContext | null): string {
    const active = ctx ? activeIntervalSection(ctx) : null;
    return active ? active.section.short(active.value) : timeframeLabel(timeframe);
}
