import { type SerializedDrawing } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { TEXT_FIELDS } from '../schema';
import { defaultText } from '../style';
import { PinnedLabel } from './PinnedLabel';

/** Approximate px font size for a named text size (the painter measures the glyphs exactly). */
const SIZE_PX: Record<string, number> = { tiny: 10, small: 12, normal: 14, large: 18, huge: 24, auto: 14 };

/**
 * A free-floating text annotation anchored to one point (top-left of the text). Like TradingView's, it can sit on a
 * background, wear a border, and wrap its words at a set width.
 */
export class TextLabel extends PinnedLabel {
    // Widened so TradingView's anchored text (pinned to the screen) can reuse the whole tool.
    readonly type: 'text' | 'anchoredtext' | 'table' = 'text';
    // `!` (no initializer): the base constructor runs readProps first. Absent ⇒ off (TradingView's defaults).
    background!: boolean;
    backgroundColor!: string | undefined;
    border!: boolean;
    borderColor!: string | undefined;
    wordWrap!: boolean;
    wrapWidth!: number | undefined;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        // Starts empty on purpose: placing one opens an inline editor whose placeholder invites the
        // text, so a seeded literal would only have to be selected and deleted. Large by default —
        // a free-floating annotation is meant to be read at a glance, unlike a label hung on a shape.
        if (!this.text) this.text = { ...defaultText(), size: 'large' };
    }

    /** The wrap width in px (TradingView's default 200), or null when the text does not wrap. */
    wrapPx(): number | null {
        return this.wordWrap ? Math.max(20, this.wrapWidth ?? 200) : null;
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        const p: Record<string, unknown> = {};
        if (this.background) p.background = true;
        if (this.backgroundColor) p.backgroundColor = this.backgroundColor;
        if (this.border) p.border = true;
        if (this.borderColor) p.borderColor = this.borderColor;
        if (this.wordWrap) p.wordWrap = true;
        if (this.wrapWidth !== undefined) p.wrapWidth = this.wrapWidth;
        return Object.keys(p).length ? p : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.background === 'boolean') this.background = props.background;
        if (typeof props.backgroundColor === 'string') this.backgroundColor = props.backgroundColor;
        if (typeof props.border === 'boolean') this.border = props.border;
        if (typeof props.borderColor === 'string') this.borderColor = props.borderColor;
        if (typeof props.wordWrap === 'boolean') this.wordWrap = props.wordWrap;
        if (typeof props.wrapWidth === 'number' && Number.isFinite(props.wrapWidth)) this.wrapWidth = props.wrapWidth;
    }

    /** Wrapped text is at most the wrap width wide and as many lines taller as the wrap takes. */
    protected override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const b = super.box(proj);
        const wrap = this.wrapPx();
        if (!b || wrap == null || b.w - 8 <= wrap) return b;
        const fs = SIZE_PX[this.text?.size ?? 'normal'] ?? 14;
        const lines = this.labelText()
            .split('\n')
            .reduce((n, l) => n + Math.max(1, Math.ceil((l.length * fs * 0.6) / wrap)), 0);
        return { x: b.x, y: b.y, w: wrap + 8, h: lines * fs * 1.4 + 4 };
    }

    schema(): SettingsSchema {
        return {
            fields: [
                ...TEXT_FIELDS,
                { path: 'background', label: 'Background', kind: 'boolean', group: 'fill' },
                { path: 'backgroundColor', label: 'Background color', kind: 'color', group: 'fill' },
                { path: 'border', label: 'Border', kind: 'boolean', group: 'line' },
                { path: 'borderColor', label: 'Border color', kind: 'color', group: 'line' },
                { path: 'wordWrap', label: 'Text wrap', kind: 'boolean', group: 'text' },
                { path: 'wrapWidth', label: 'Wrap width', kind: 'number', min: 20, max: 2000, step: 10, group: 'text' },
            ],
            textIsContent: true,
        };
    }
}
