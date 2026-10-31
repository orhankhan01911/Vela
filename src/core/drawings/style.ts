import type { LineStyle } from '../model/series';
import { ACCENT_BRIGHT } from '../palette';

/**
 * The cosmetic payload shared by every drawing (the "settings" a user edits).
 * Reuses the Pine {@link LineStyle} so dash patterns resolve through the same
 * `dashPattern()` helper the renderer already uses.
 */
export interface DrawingStyle {
    lineColor: string;
    lineWidth: number;
    lineStyle: LineStyle;
    /** Fill (box / closed path); `undefined` ⇒ no fill. */
    fillColor?: string;
    /** Fill opacity 0..1 (applied over `fillColor`). */
    fillOpacity?: number;
    arrowLeft?: boolean;
    arrowRight?: boolean;
}

/** A drawing's editable text/annotation block. */
export interface DrawingText {
    value: string;
    /** `undefined` ⇒ auto-contrast against the fill/background. */
    color?: string;
    /** Px (TradingView's 8-40 list), or an older named size. */
    size: 'tiny' | 'small' | 'normal' | 'large' | 'huge' | 'auto' | number;
    hAlign: 'left' | 'center' | 'right';
    vAlign: 'top' | 'center' | 'bottom';
    bold?: boolean;
    italic?: boolean;
}

/** The default drawing accent — the Vela logo blue. */
export const DEFAULT_DRAWING_COLOR = ACCENT_BRIGHT;

/** A neutral default style — concrete tools override via their `defaultStyle`. */
export function defaultStyle(): DrawingStyle {
    return { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid' };
}

/** TradingView's default line-tool blue (trend line line and text): palette-exempt, matches TradingView 1:1. */
export const TV_LINE_COLOR = '#2962FF'; // palette-exempt: TradingView's line-tool blue
export const TV_GREY = '#808080'; // palette-exempt: TradingView's cold-gray-500, a neutral grey

/** Named text sizes in px (the older Small / Normal / Large choices). */
const NAMED_TEXT_PX: Record<string, number> = { tiny: 10, small: 12, normal: 14, large: 18, huge: 24, auto: 14 };

/** A text size in px: a number is px already, a name maps to its px, anything else is 14. */
export function textPx(size: DrawingText['size'] | undefined): number {
    if (typeof size === 'number') return Number.isFinite(size) && size > 0 ? size : 14;
    return NAMED_TEXT_PX[size ?? 'normal'] ?? 14;
}

/** TradingView's text-size list (px), the Text tab's size dropdown. */
export const TEXT_PX_SIZES: readonly number[] = [8, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40];

/** A neutral default text block (used when a drawing first gains text). */
export function defaultText(value = ''): DrawingText {
    return { value, size: 'normal', hAlign: 'left', vAlign: 'top' };
}
