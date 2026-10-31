import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS } from '../schema';
import { CalloutBase } from './CalloutBase';
import { TV_LINE_COLOR } from '../style';

/** TradingView's white label text. */
const TV_WHITE = '#FFFFFF'; // palette-exempt: TradingView's white

/**
 * A note pinned to a price/bar: a draggable box (anchor[1]) joined to the pinned point (anchor[0])
 * by a leader + a dot, displaying the AUTO-formatted price of the pinned point (not free text) —
 * label a level, then drag the readout clear of the candles.
 */
export class PriceNote extends CalloutBase {
    readonly type = 'pricenote' as const;
    /** TradingView's price note (module 394599): a new one; one saved before keeps its look. */
    declare tv?: boolean;
    /** TradingView's label border (its own colour; the line keeps style.lineColor). */
    declare labelBorder?: string;

    constructor(init: ConstructorParameters<typeof CalloutBase>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.labelBorder = TV_LINE_COLOR;
            // TradingView's label text: white, 12 px.
            this.text = { ...this.text!, color: TV_WHITE, size: 12 };
        }
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return this.tv ? { tv: true, labelBorder: this.labelBorder } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        this.tv = true;
        if (typeof props.labelBorder === 'string') this.labelBorder = props.labelBorder;
    }

    protected override defaultLabel(): string {
        return ''; // no free text — the painter renders the pinned price
    }

    /** Sized from the (approximate) pinned price string — the painter formats it precisely. */
    protected override labelText(): string {
        const p = this.anchors[0]?.price;
        return p == null ? '0.00' : p.toFixed(2);
    }

    /** The label is the auto price, so expose only styling — not a `text.value` field. */
    override schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS.filter((f) => f.path !== 'text.value')] };
    }
}
