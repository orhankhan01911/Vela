import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { PinnedLabel } from './PinnedLabel';
import { defaultText } from '../style';

/**
 * A price tag pinned to a bar/price: the painter auto-renders the anchor's price value (the text is
 * computed, not typed — so it tracks the level), with a left-pointing tag at the exact pixel.
 */
export class PriceLabel extends PinnedLabel {
    readonly type = 'pricelabel' as const;
    /** TradingView's price label (module 616930): a new one; one saved before keeps its look. */
    declare tv?: boolean;

    constructor(init: ConstructorParameters<typeof PinnedLabel>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            // TradingView's: white bold 14 px on its blue.
            this.text = { ...(this.text ?? defaultText('')), color: '#FFFFFF', size: 14, bold: true }; // palette-exempt: TradingView's white
        }
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return this.tv ? { tv: true } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv === true) this.tv = true;
    }

    /** Sized from the (approximate) price string — the painter formats it precisely. */
    protected override labelText(): string {
        const p = this.anchors[0]?.price;
        return p == null ? '0.00' : p.toFixed(2);
    }

    /** The label value is auto (the price), so expose only styling — not a `text.value` field. */
    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS.filter((f) => f.path !== 'text.value')] };
    }
}
