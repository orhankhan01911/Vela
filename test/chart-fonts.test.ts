/**
 * Chart text must never start with a generic font family. `sans-serif` / `monospace` / `-apple-system` resolve to
 * DejaVu on Linux (wide, heavy, soft next to TradingView), and that has come back more than once (2026-10-26: axes,
 * drawing labels, Fibonacci levels, Pine monospace, axis scale buttons). Use the theme's `fontFamily`
 * (CHART_FONT_FAMILY), CHART_MONO_FONT_FAMILY, or `var(--vela-font, ...)` in inline CSS; a generic name is fine
 * only as the LAST fallback of a stack.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { CHART_FONT_FAMILY, CHART_MONO_FONT_FAMILY, DARK_THEME, LIGHT_THEME } from '../src/core/theme';

const SRC = 'src';

/** Known exceptions, each with its reason. */
const ALLOWED: Record<string, string> = {
    // The legend's inline font: hosts restyle it with a CSS selector on this exact text (vela-sandbox
    // chrome-polish/styles.ts `div[style*="font: 12px -apple-system"]`), so changing it breaks their override.
    'renderers/shared/InputsUI.ts': 'font:12px -apple-system,Segoe UI,sans-serif',
};

function sources(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = `${dir}/${name}`;
        if (statSync(p).isDirectory()) sources(p, out);
        else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
    }
    return out;
}

const SETS_FONT = /\.font\s*=|\bfont(?:-family|Family)?\s*:|\bfont\s*=/;
const GENERIC_FIRST = /(?:\d(?:\.\d+)?px(?:\/[\d.]+)?|\}px)\s+['"]?(?:sans-serif|serif|monospace|ui-monospace|system-ui|-apple-system|Menlo|Consolas|Arial|Helvetica)\b/;
const GENERIC_RETURN = /\?\s*'monospace'\s*:/;

describe('chart text never starts with a generic font', () => {
    it('no source sets a font whose first family is generic', () => {
        const hits: string[] = [];
        for (const f of sources(SRC)) {
            const rel = f.slice(SRC.length + 1);
            readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
                if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
                const allowed = ALLOWED[rel];
                if (allowed && line.includes(allowed)) return;
                if ((SETS_FONT.test(line) && GENERIC_FIRST.test(line)) || GENERIC_RETURN.test(line)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
            });
        }
        expect(hits).toEqual([]);
    });

    it('the theme fonts lead with real faces', () => {
        expect(CHART_FONT_FAMILY.startsWith('Inter,')).toBe(true);
        expect(CHART_MONO_FONT_FAMILY.startsWith('"IBM Plex Mono"')).toBe(true);
        expect(DARK_THEME.fontFamily).toBe(CHART_FONT_FAMILY);
        expect(LIGHT_THEME.fontFamily).toBe(CHART_FONT_FAMILY);
    });
});
