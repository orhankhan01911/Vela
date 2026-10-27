// Interval SECTIONS contributed by plugins — bar kinds that are not a time span (ticks per bar,
// price range per bar, volume per bar…) listed in the interval dropdown next to the built-in
// SECONDS / MINUTES / HOURS / DAYS, the way TradingView lists TICKS and RANGES there.
//
// A section owns its bars: it says which values to offer for the ACTIVE chart (a plugin may
// size them per market), which value is on right now, and how to switch to one or leave it.
// The dropdown never learns how the bars are built — picking a time interval while a section
// is on calls that section's `leave` before the timeframe changes.
//
// Built-in time sections sit at these orders; a plugin picks its own around them:
//   SECONDS 10 · MINUTES 20 · HOURS 30 · DAYS 40   (TradingView puts TICKS before, RANGES after).
import type { WidgetContext } from './contributions';

export interface IntervalChoice {
    value: number;
    /** Row text (`'100 ticks'`). */
    label: string;
    /** Faint right-aligned note (`'~800/day'`). */
    hint?: string;
}

export interface IntervalSection {
    id: string;
    /** Section heading, shown upper-cased (`'Ticks'`). */
    title: string;
    order: number;
    /** Unit names for the custom-interval form and the default row label. */
    unit: { one: string; many: string };
    /** The values to offer for the active chart. May resolve later (the dropdown shows a
     *  loading row until it does) and may be empty (only a custom value then). */
    choices(ctx: WidgetContext): readonly IntervalChoice[] | Promise<readonly IntervalChoice[]>;
    /** The value that is on right now, or null when this section's bars are not on. */
    current(ctx: WidgetContext): number | null;
    /** Compact topbar label of a value (`'100T'`). */
    short(value: number): string;
    /** Label of a STARRED value's quick-switch chip, which shows whether or not the value is on
     *  (`short` may describe the value in use only). Default: `short`. */
    chip?(value: number): string;
    /** Row label of a value that is not among `choices` (the one in use, a custom size).
     *  Default: `'<value> <unit>'`. */
    label?(value: number): string;
    select(ctx: WidgetContext, value: number): void;
    /** Leave this section's bars (a time interval or another section was picked). */
    leave(ctx: WidgetContext): void;
    /** Hide the section for this chart (e.g. the market has no data for these bars). */
    when?(ctx: WidgetContext): boolean;
}

export const BUILTIN_INTERVAL_ORDER = { seconds: 10, minutes: 20, hours: 30, days: 40 } as const;

const registry = new Map<string, IntervalSection>();
const listeners = new Set<() => void>();

function emit(): void {
    for (const l of [...listeners]) l();
}

/** Register (or replace by id) a section. Returns the unregister. */
export function registerIntervalSection(section: IntervalSection): () => void {
    registry.set(section.id, section);
    emit();
    return () => {
        if (registry.get(section.id) === section) {
            registry.delete(section.id);
            emit();
        }
    };
}

export function unregisterIntervalSection(id: string): void {
    if (registry.delete(id)) emit();
}

/** Sections in `order`, `when`-filtered when a context is given. */
export function intervalSections(ctx?: WidgetContext): IntervalSection[] {
    const list = [...registry.values()].sort((a, b) => a.order - b.order);
    return ctx ? list.filter((s) => !s.when || s.when(ctx)) : list;
}

/** The section whose bars are on for this chart, with its value. */
export function activeIntervalSection(ctx: WidgetContext): { section: IntervalSection; value: number } | null {
    for (const section of intervalSections(ctx)) {
        const value = section.current(ctx);
        if (value !== null) return { section, value };
    }
    return null;
}

/** A section value in the host's favorite-interval list, next to the starred times: `'@<section id>:<value>'`. */
export function sectionFavorite(id: string, value: number): string {
    return `@${id}:${value}`;
}

/** The section and value of a favorite written by {@link sectionFavorite}; null for a time interval, or a
 *  section that is not registered (any more). */
export function parseSectionFavorite(key: string): { section: IntervalSection; value: number } | null {
    if (!key.startsWith('@')) return null;
    const i = key.lastIndexOf(':');
    if (i < 2) return null;
    const section = registry.get(key.slice(1, i));
    const value = Number(key.slice(i + 1));
    return section && Number.isFinite(value) && value > 0 ? { section, value } : null;
}

/** A plugin changed what its sections show or which value is on (settings edited elsewhere):
 *  the topbar label and an open dropdown re-read. */
export function notifyIntervalSectionsChanged(): void {
    emit();
}

/** Subscribe to registry / state changes. Returns the unsubscribe. */
export function onIntervalSectionsChanged(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
