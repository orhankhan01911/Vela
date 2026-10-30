import type { SettingsField, SettingsSchema } from '../schema';
import { BrushStroke } from './Freehand';

/** TradingView's highlighter thickness list. */
export const HIGHLIGHTER_WIDTHS: readonly number[] = [8, 12, 20, 32, 48, 64, 80, 96];

/**
 * The highlighter's editable cosmetics on strokes saved before TradingView's: a translucent marker, so it exposes
 * only color (its alpha is the highlight's opacity, set via the color picker) and a wide stroke width.
 */
const HIGHLIGHTER_FIELDS: SettingsField[] = [
    { path: 'style.lineColor', label: 'Color', kind: 'color', group: 'line' },
    { path: 'style.lineWidth', label: 'Width', kind: 'number', min: 4, max: 60, step: 1, group: 'line' },
];

/** TradingView's dialog: Line (a color) and Thickness (its px list). */
const TV_HIGHLIGHTER_FIELDS: SettingsField[] = [
    { path: 'style.lineColor', label: 'Line', kind: 'color', group: 'line' },
    { path: 'style.lineWidth', label: 'Thickness', kind: 'select', options: HIGHLIGHTER_WIDTHS.map((w) => ({ value: String(w), label: `${w}px` })), group: 'line' },
];

/**
 * A highlighter stroke: a wide, translucent freehand swath (like a marker over text), painted as one round-capped
 * path so a stroke reads as a single continuous highlight. New ones are TradingView's (read from its code 2026-10-30):
 * its red at 20 %, 20 px, the brush's smoothing (5) and end markers, no line ends or background. Strokes saved before
 * keep their look.
 */
export class Highlighter extends BrushStroke {
    readonly type = 'highlighter' as const;

    constructor(init: ConstructorParameters<typeof BrushStroke>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.smooth = 5;
        }
    }

    override schema(): SettingsSchema {
        return { fields: this.tv ? TV_HIGHLIGHTER_FIELDS : HIGHLIGHTER_FIELDS };
    }
}
