import type { VelaTheme, ThemeName } from './options';
import { BEARISH, BULLISH } from './palette';

/** Chart canvas text (axes, drawing labels, Fibonacci levels). Plain `sans-serif` is DejaVu Sans on Linux: wide,
 *  heavy and soft next to TradingView's. Inter first (the host page provides it), then each platform's UI face. */
export const CHART_FONT_FAMILY = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", Arial, sans-serif';

// The reference dark palette (the design spec's first-run chart cosmetics: surface,
// axis text, subtle grid, candle green/red).
export const DARK_THEME: VelaTheme = {
    background: '#151619',
    textColor: '#b2b5be',
    gridColor: '#20222c',
    borderColor: '#2a2b30',
    upColor: BULLISH,
    downColor: BEARISH,
    fontFamily: CHART_FONT_FAMILY,
};

export const LIGHT_THEME: VelaTheme = {
    background: '#ffffff',
    textColor: '#1e293b',
    // Soft chrome on white: grid is a neutral wash; pane separator / axis border
    // (they inherit `borderColor`) sit a step darker so stacked panes stay distinct.
    gridColor: '#cccccc',
    borderColor: '#d4dae3',
    // Candle hues are shared across themes: switching themes recolors surfaces and
    // text, never the series (a green candle stays the same green on white).
    upColor: BULLISH,
    downColor: BEARISH,
    fontFamily: CHART_FONT_FAMILY,
};

export function resolveTheme(theme?: ThemeName | VelaTheme): VelaTheme {
    if (!theme || theme === 'dark') return DARK_THEME;
    if (theme === 'light') return LIGHT_THEME;
    return theme;
}
