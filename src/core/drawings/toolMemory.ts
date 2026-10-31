import type { DrawingTypeKey, SerializedDrawing } from './Drawing';
import type { DrawingStyle, DrawingText } from './style';

/**
 * Per-tool "last used" settings (TradingView: change a tool's settings and the next one you draw starts from them,
 * across reloads). Holds the cosmetics of the last drawing edited or placed of each type: its style, its per-type
 * extras (`props`: profile rows, fib levels, extend options ...) and its text look (never the text itself). Shared by
 * every chart on the page and kept in localStorage when it is there (a private window or blocked storage just keeps
 * it for the session).
 *
 * Types whose `props` are CONTENT, not settings (an image's url, a post card, a table's cells, an alert's condition,
 * a pinned label's position), remember their style only.
 */
export interface ToolSettings {
    style: DrawingStyle;
    props?: Record<string, unknown>;
    /** Text cosmetics only: color, size, bold, italic, alignment. */
    text?: Omit<DrawingText, 'value'>;
}

const STORAGE_KEY = 'vela.drawings.toolSettings.v1';
// A bars pattern's copied bars and a ghost feed's made bars are what it shows, not settings (TradingView's templates
// keep their look and inputs: mode, mirrored, colours, variance; the ghost feed's average is the chart's own).
const NOT_REMEMBERED: Partial<Record<DrawingTypeKey, readonly string[]>> = { emoji: ['angle', 'emoji'], icon: ['angle', 'icon'], barspattern: ['bars', 'base'], ghostfeed: ['segments', 'tick', 'averageHL'] };
const CONTENT_PROPS = new Set<DrawingTypeKey>(['image', 'xpost', 'table', 'pricealert', 'anchoredtext', 'anchorednote']);

let memory: Map<string, ToolSettings> | null = null;

function storage(): Storage | null {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
}

function load(): Map<string, ToolSettings> {
    if (memory) return memory;
    memory = new Map();
    try {
        const raw = storage()?.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') {
            for (const [k, v] of Object.entries(parsed as Record<string, ToolSettings>)) {
                if (v && typeof v === 'object' && v.style && typeof v.style === 'object') memory.set(k, v);
            }
        }
    } catch {
        /* unreadable: start empty */
    }
    return memory;
}

function save(): void {
    try {
        storage()?.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(load())));
    } catch {
        /* full or blocked: keep it in memory */
    }
}

/** The last-used settings of `type`, or undefined when none were kept. */
export function toolSettings(type: DrawingTypeKey): ToolSettings | undefined {
    return load().get(type);
}

/** Remember `doc`'s cosmetics as its type's last-used settings. */
export function rememberToolSettings(doc: SerializedDrawing): void {
    const entry: ToolSettings = { style: { ...doc.style } };
    if (doc.props && !CONTENT_PROPS.has(doc.type)) {
        entry.props = JSON.parse(JSON.stringify(doc.props)) as Record<string, unknown>;
        // TradingView's emoji / icon remember their size (and color), not the turn or the picture: those come from the
        // picker and start upright.
        for (const k of NOT_REMEMBERED[doc.type] ?? []) delete entry.props[k];
    }
    if (doc.text) {
        const { value: _value, ...look } = doc.text;
        entry.text = look;
    }
    const prev = load().get(doc.type);
    if (prev && JSON.stringify(prev) === JSON.stringify(entry)) return;
    load().set(doc.type, entry);
    save();
}

/** Forget every tool's last-used settings (tests, a "reset all tools" action). */
export function clearToolSettings(): void {
    load().clear();
    save();
}

/** For tests: drop the in-memory copy so the next read goes back to storage. */
export function reloadToolSettingsForTest(): void {
    memory = null;
}
