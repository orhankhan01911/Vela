import { type SerializedDrawing } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { pointInBox } from '../hittest';
import { defaultText } from '../style';
import { PinnedLabel } from './PinnedLabel';

/** Size of the note's map pin: its tip sits on the point, the round head above it. */
export const NOTE_PIN = { r: 8, h: 24 } as const;
/** TradingView's pin icon (24 x 30, tip at the bottom middle). */
export const TV_NOTE_PIN = { w: 24, h: 30 } as const;

/**
 * TradingView's note: a small map pin on a price/bar whose text shows in a box above it while the pin is hovered or
 * selected (or always, with `showText`).
 */
export class Note extends PinnedLabel {
    // Widened so TradingView's anchored note (pinned to the screen) can reuse the whole tool.
    readonly type: 'note' | 'anchorednote' = 'note';
    // `!` (no initializer): the base constructor runs readProps first.
    showText!: boolean;
    /** TradingView's note (new notes, read from its code 2026-10-30, module 229151). */
    tv?: boolean;
    /** TradingView's tooltip Background (on) and Border (off); unset colors follow the theme. */
    background!: boolean;
    backgroundColor!: string | undefined;
    border!: boolean;
    borderColor!: string | undefined;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        if (!init.props) {
            // TradingView's: an empty text typed in place, 14 px, its theme's text color (left unset).
            this.tv = true;
            this.background = true;
            this.text = { ...defaultText(''), ...(init.text ?? {}), size: init.text?.size ?? 14 };
            return;
        }
        // No color seed: the interactive creation path fixes a theme-contrast ink on the
        // fresh drawing; until then the painter auto-contrasts (`undefined` semantics).
        if (!this.text) this.text = defaultText('Note');
    }

    /** TradingView shows no handle on the pin, only its selection marker at the tip. */
    override handleHidden(index: number): boolean {
        return this.tv === true && index === 0;
    }

    override selectionMarkers(proj: Projector): Array<[number, number]> {
        return this.tv ? this.handlePoints(proj) : [];
    }

    protected override defaultLabel(): string {
        return 'Note';
    }

    protected override writeProps(): Record<string, unknown> {
        if (!this.tv) return { showText: !!this.showText };
        const p: Record<string, unknown> = { tv: true, background: this.background !== false, border: this.border === true };
        if (this.backgroundColor) p.backgroundColor = this.backgroundColor;
        if (this.borderColor) p.borderColor = this.borderColor;
        return p;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.showText === 'boolean') this.showText = props.showText;
        if (props.tv === true) this.tv = true;
        if (typeof props.background === 'boolean') this.background = props.background;
        if (typeof props.backgroundColor === 'string') this.backgroundColor = props.backgroundColor;
        if (typeof props.border === 'boolean') this.border = props.border;
        if (typeof props.borderColor === 'string') this.borderColor = props.borderColor;
    }

    /** The pin: the hit and grab area (the text box only appears on hover). */
    protected override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const a = this.anchors[0];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        if (y == null) return null;
        const x = proj.xOf(a.time);
        if (this.tv) return { x: x - TV_NOTE_PIN.w / 2, y: y - TV_NOTE_PIN.h, w: TV_NOTE_PIN.w, h: TV_NOTE_PIN.h };
        return { x: x - NOTE_PIN.r - 1, y: y - NOTE_PIN.h, w: NOTE_PIN.r * 2 + 2, h: NOTE_PIN.h };
    }

    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        if (!this.tv) return super.hitTest(px, py, proj, tol);
        const b = this.box(proj);
        return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h);
    }

    schema(): SettingsSchema {
        if (this.tv) {
            // TradingView: Style is the pin's Label color; Text holds the text and the tooltip's Background / Border.
            return {
                fields: [
                    { path: 'style.lineColor', label: 'Label', kind: 'color', group: 'line' },
                    ...TEXT_FIELDS,
                    { path: 'background', label: 'Background', kind: 'boolean', group: 'text' },
                    { path: 'backgroundColor', label: 'Background color', kind: 'color', group: 'text' },
                    { path: 'border', label: 'Border', kind: 'boolean', group: 'text' },
                    { path: 'borderColor', label: 'Border color', kind: 'color', group: 'text' },
                ],
                textIsContent: true,
            };
        }
        return {
            fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS, { path: 'showText', label: 'Always show text', kind: 'boolean', group: 'behavior' }],
            textIsContent: true,
        };
    }
}
