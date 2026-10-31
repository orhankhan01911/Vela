import { textPx } from '../style';
import { type SerializedDrawing } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { TEXT_FIELDS } from '../schema';
import { defaultText } from '../style';
import { PinnedLabel } from './PinnedLabel';

const TV_TEXT_COLOR = '#2962ff'; // palette-exempt: TradingView's blue 500
const TV_TEXT_BACKGROUND = '#2962ff40'; // palette-exempt: TradingView's blue 500 at 25 %
const TV_TEXT_BORDER = '#707070'; // palette-exempt: TradingView's cold gray 550
/** The wrap handle's distance right of the wrap width (the painted frame's own inset). */
const TEXT_WRAP_HANDLE_INSET = 5;

/**
 * A free-floating text annotation anchored to one point (top-left of the text). Like TradingView's, it can sit on a
 * background, wear a border, and wrap its words at a set width.
 */
export class TextLabel extends PinnedLabel {
    // Widened so TradingView's anchored text (pinned to the screen) can reuse the whole tool.
    readonly type: 'text' | 'anchoredtext' = 'text';
    // `!` (no initializer): the base constructor runs readProps first. Absent ⇒ off (TradingView's defaults).
    background!: boolean;
    backgroundColor!: string | undefined;
    border!: boolean;
    borderColor!: string | undefined;
    wordWrap!: boolean;
    wrapWidth!: number | undefined;
    /** TradingView's text (new texts, read from its code 2026-10-30, module 210166). */
    tv?: boolean;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        if (!init.props && this.tvLook()) {
            // TradingView's: its blue at 14 px; Background its blue at 25 %, Border gray, both off; wrap at 200 px.
            this.tv = true;
            this.text = { ...defaultText(), ...(this.text ?? {}), color: this.text?.color ?? TV_TEXT_COLOR, size: this.text?.size ?? 14 };
            this.backgroundColor ??= TV_TEXT_BACKGROUND;
            this.borderColor ??= TV_TEXT_BORDER;
            this.wrapWidth ??= 200;
            return;
        }
        // Starts empty on purpose: placing one opens an inline editor whose placeholder invites the
        // text, so a seeded literal would only have to be selected and deleted. Large by default —
        // a free-floating annotation is meant to be read at a glance, unlike a label hung on a shape.
        if (!this.text) this.text = { ...defaultText(), size: 'large' };
    }

    /** Whether a new one takes TradingView's text look (the table does not). */
    protected tvLook(): boolean {
        return true;
    }

    /** The wrap width in px (TradingView's default 200), or null when the text does not wrap. */
    wrapPx(): number | null {
        return this.wordWrap ? Math.max(20, this.wrapWidth ?? 200) : null;
    }

    /** TradingView shows no point on its text; with Text wrap on, a square on the right edge sets the wrap width. */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const pts = super.handlePoints(proj);
        const wrap = this.wrapPx();
        if (!this.tv || wrap == null || !pts[0]) return pts;
        const b = this.box(proj);
        return [pts[0], [pts[0][0] + wrap + TEXT_WRAP_HANDLE_INSET, b ? b.y + b.h / 2 : pts[0][1]]];
    }

    override handleHidden(index: number): boolean {
        return this.tv === true && index === 0;
    }

    override handleShapes(): ReadonlyArray<'circle' | 'square'> {
        return this.tv ? ['circle', 'square'] : [];
    }

    override handleCursor(index: number): string | null {
        return this.tv && index === 1 ? 'ew-resize' : null;
    }

    override hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        const i = super.hitHandle(px, py, proj, tol);
        return this.tv && i === 0 ? -1 : i; // the hidden point: a press there drags the body
    }

    /** TradingView's wrap handle: the wrap width follows it, at least 100 px. */
    override dragHandlePx(index: number, x: number, _y: number, proj: Projector): boolean {
        if (!this.tv || index !== 1) return false;
        const a = this.anchors[0];
        if (!a) return true;
        const w = x - proj.xOf(a.time) - Math.floor(textPx(this.text?.size) / 6);
        if (Number.isFinite(w)) this.wrapWidth = Math.max(100, Math.round(w));
        return true;
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        const p: Record<string, unknown> = {};
        if (this.tv) p.tv = true;
        if (this.background) p.background = true;
        if (this.backgroundColor) p.backgroundColor = this.backgroundColor;
        if (this.border) p.border = true;
        if (this.borderColor) p.borderColor = this.borderColor;
        if (this.wordWrap) p.wordWrap = true;
        if (this.wrapWidth !== undefined) p.wrapWidth = this.wrapWidth;
        return Object.keys(p).length ? p : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv === true) this.tv = true;
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
        const fs = textPx(this.text?.size);
        const lines = this.labelText()
            .split('\n')
            .reduce((n, l) => n + Math.max(1, Math.ceil((l.length * fs * 0.6) / wrap)), 0);
        return { x: b.x, y: b.y, w: wrap + 8, h: lines * fs * 1.4 + 4 };
    }

    schema(): SettingsSchema {
        if (this.tv) {
            // TradingView: everything on the Text tab; the wrap width is set with the handle, not a number.
            return {
                fields: [
                    ...TEXT_FIELDS,
                    { path: 'background', label: 'Background', kind: 'boolean', group: 'text' },
                    { path: 'backgroundColor', label: 'Background color', kind: 'color', group: 'text' },
                    { path: 'border', label: 'Border', kind: 'boolean', group: 'text' },
                    { path: 'borderColor', label: 'Border color', kind: 'color', group: 'text' },
                    { path: 'wordWrap', label: 'Text wrap', kind: 'boolean', group: 'text' },
                ],
                textIsContent: true,
            };
        }
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
