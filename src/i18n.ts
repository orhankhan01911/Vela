// Interface language hook. Vela ships English only; the app that embeds it (Local, see vela-sandbox src/i18n)
// installs a translator before it creates a chart, and every visible Vela string goes through `vt()`.
//
// The translator lives on `globalThis`, not in a module variable: tsup builds each package entry (index, plugin,
// ui, workspace ...) on its own, and a module variable could exist once per entry. One global is shared by all.
//
// Keys are the English text (`vt('Settings')`); `ctx` tells apart two meanings of one English word
// (`vt('Open', 'price')`); `{name}` placeholders are filled from `vars`.

export type VelaVars = Record<string, string | number>;
export type VelaTranslate = (text: string, ctx?: string | VelaVars, vars?: VelaVars) => string;

const KEY = '__velaTranslate';
type Host = { [KEY]?: VelaTranslate };

export function setTranslator(fn: VelaTranslate | null): void {
    (globalThis as Host)[KEY] = fn ?? undefined;
}

function fill(s: string, vars?: VelaVars): string {
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function vt(text: string, ctx?: string | VelaVars, vars?: VelaVars): string {
    const f = (globalThis as Host)[KEY];
    if (f) return f(text, ctx, vars);
    return fill(text, typeof ctx === 'object' ? ctx : vars);
}

/** True when the page is laid out right to left (`<html dir="rtl">`, set by the embedding app). */
export function isRtlPage(): boolean {
    return typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
}

const HTML_ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** `vt()` for text placed inside an HTML string: the translation is escaped (it may hold & < > or quotes). */
export function vth(text: string, ctx?: string | VelaVars, vars?: VelaVars): string {
    return vt(text, ctx, vars).replace(/[&<>"']/g, (c) => HTML_ESC[c]!);
}
