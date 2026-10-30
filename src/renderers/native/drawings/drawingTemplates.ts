import type { SerializedDrawing } from '../../../core/drawings';
import { clonePlain } from '../../../core/drawings';

/**
 * Drawing templates (TradingView's "Save Drawing Template As…"): a named look per drawing type, kept in this browser.
 * A template holds style, text and per-type props only, never anchors, so applying one restyles a drawing without
 * moving it. The settings dialog's Template menu and the floating toolbar's Templates button share these.
 */
export interface TemplateLook {
    style: SerializedDrawing['style'];
    text?: SerializedDrawing['text'];
    props?: Record<string, unknown>;
}

const TEMPLATE_KEY = 'vela.drawingTemplates.v1';
/** The longest template name. */
export const TEMPLATE_NAME_MAX = 40;

export function readTemplates(): Record<string, Record<string, TemplateLook>> {
    try {
        const raw = JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? '{}') as unknown;
        return raw && typeof raw === 'object' ? (raw as Record<string, Record<string, TemplateLook>>) : {};
    } catch {
        return {};
    }
}

export function writeTemplates(all: Record<string, Record<string, TemplateLook>>): void {
    try {
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(all));
    } catch {
        /* storage blocked (private mode) — templates simply don't persist */
    }
}

/** A type's saved template names, A to Z. */
export function templateNames(type: string): string[] {
    return Object.keys(readTemplates()[type] ?? {}).sort((a, b) => a.localeCompare(b));
}

export function templateLook(type: string, name: string): TemplateLook | undefined {
    return readTemplates()[type]?.[name];
}

/** Save `doc`'s look under `name` (replacing a template of that name). */
export function saveTemplate(type: string, name: string, doc: SerializedDrawing): void {
    const all = readTemplates();
    (all[type] ??= {})[name] = clonePlain({ style: doc.style, text: doc.text, props: doc.props });
    writeTemplates(all);
}

export function deleteTemplate(type: string, name: string): void {
    const all = readTemplates();
    if (all[type]) delete all[type][name];
    writeTemplates(all);
}

/** `doc` with `look` applied (its anchors, id and the rest untouched). */
export function withLook(doc: SerializedDrawing, look: TemplateLook): SerializedDrawing {
    return { ...doc, style: { ...look.style }, text: look.text ? { ...look.text } : doc.text, props: look.props ?? doc.props };
}

/** Just the look fields of a serialized drawing (never anchors/ids). */
export function pickLook(d: SerializedDrawing): Pick<SerializedDrawing, 'style' | 'text' | 'props'> {
    return { style: d.style, text: d.text, props: d.props };
}
