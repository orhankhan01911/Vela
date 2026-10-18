import { type SerializedDrawing } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { defaultText } from '../style';
import { PinnedLabel } from './PinnedLabel';

/** Size of the note's map pin: its tip sits on the point, the round head above it. */
export const NOTE_PIN = { r: 8, h: 24 } as const;

/**
 * TradingView's note: a small map pin on a price/bar whose text shows in a box above it while the pin is hovered or
 * selected (or always, with `showText`).
 */
export class Note extends PinnedLabel {
    readonly type = 'note' as const;
    // `!` (no initializer): the base constructor runs readProps first.
    showText!: boolean;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        // No color seed: the interactive creation path fixes a theme-contrast ink on the
        // fresh drawing; until then the painter auto-contrasts (`undefined` semantics).
        if (!this.text) this.text = defaultText('Note');
    }

    protected override defaultLabel(): string {
        return 'Note';
    }

    protected override writeProps(): Record<string, unknown> {
        return { showText: !!this.showText };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.showText === 'boolean') this.showText = props.showText;
    }

    /** The pin: the hit and grab area (the text box only appears on hover). */
    protected override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const a = this.anchors[0];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        if (y == null) return null;
        const x = proj.xOf(a.time);
        return { x: x - NOTE_PIN.r - 1, y: y - NOTE_PIN.h, w: NOTE_PIN.r * 2 + 2, h: NOTE_PIN.h };
    }

    schema(): SettingsSchema {
        return {
            fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS, { path: 'showText', label: 'Always show text', kind: 'boolean', group: 'behavior' }],
            textIsContent: true,
        };
    }
}
