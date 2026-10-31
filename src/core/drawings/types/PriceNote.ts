import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS, TEXT_FIELDS, LINE_TEXT_ALIGN_FIELDS } from '../schema';
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
    /** TradingView's price label text (its own colour, size and weight); `text` is its free text along the line. */
    declare labelColor?: string;
    declare labelSize?: number;
    declare labelBold?: boolean;
    declare labelItalic?: boolean;

    constructor(init: ConstructorParameters<typeof CalloutBase>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.labelBorder = TV_LINE_COLOR;
            this.labelColor = TV_WHITE;
            this.labelSize = 12;
            this.labelBold = false;
            this.labelItalic = false;
            // TradingView's free text: 14 px blue, centred over the line ("Top").
            this.text = { ...this.text!, value: '', color: TV_LINE_COLOR, size: 14, hAlign: 'center', vAlign: 'top' };
        }
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        if (!this.tv) return undefined;
        return { tv: true, labelBorder: this.labelBorder, labelColor: this.labelColor, labelSize: this.labelSize, labelBold: this.labelBold === true, labelItalic: this.labelItalic === true };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        this.tv = true;
        if (typeof props.labelBorder === 'string') this.labelBorder = props.labelBorder;
        if (typeof props.labelColor === 'string') this.labelColor = props.labelColor;
        if (typeof props.labelSize === 'number' && Number.isFinite(props.labelSize)) this.labelSize = Math.min(48, Math.max(6, props.labelSize));
        if (typeof props.labelBold === 'boolean') this.labelBold = props.labelBold;
        if (typeof props.labelItalic === 'boolean') this.labelItalic = props.labelItalic;
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
        // TradingView's: the label on the Style tab, its free text (with alignment) on the Text tab.
        if (this.tv) return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS, ...LINE_TEXT_ALIGN_FIELDS] };
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS.filter((f) => f.path !== 'text.value')] };
    }
}
