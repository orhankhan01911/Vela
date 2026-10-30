import { textPx } from '../style';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { TEXT_FIELDS } from '../schema';
import { defaultText } from '../style';
import { pointInBox } from '../hittest';
import { CalloutBase } from './CalloutBase';

/** TradingView's callout bubble: corner radius and the margin inside it, around the text (its RoundRadius, TextMargins). */
export const CALLOUT_RADIUS = 8;
export const CALLOUT_MARGIN = 2;
/** TradingView's narrowest wrapped callout text. */
const CALLOUT_MIN_WRAP = 100;

/**
 * A callout: a text box (centered on anchor[1]) with a leader line pointing at a target
 * (anchor[0]) — e.g. labelling a specific price/bar. Drag from the target to where the box
 * should sit; the text is edited through the settings popup like the plain text tool.
 *
 * New ones are TradingView's (read from its code 2026-10-30, module 583711): white 14 px text on its sky blue 700 at
 * 70 % with a 2 px sky blue border, a bubble of corner radius 8 whose tail is a wedge to the target, starting empty
 * (typed in place, dropped if left empty); the Text tab holds Background, Border and Text wrap; only the bubble and
 * the target point are grabbed. Callouts saved before keep their look.
 */
export class Callout extends CalloutBase {
    readonly type = 'callout' as const;
    /** TradingView's callout (new ones). */
    tv?: boolean;
    // `!` (no initializer): the base constructor runs readProps first.
    wordWrap!: boolean;
    wrapWidth!: number | undefined;

    constructor(init: ConstructorParameters<typeof CalloutBase>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.wrapWidth ??= 200;
            this.text = { ...defaultText(''), ...(init.text ?? {}), color: init.text?.color ?? TV_CALLOUT_TEXT, size: init.text?.size ?? 14 };
        }
    }

    /** The wrap width in px, or null when the text does not wrap. */
    wrapPx(): number | null {
        return this.tv && this.wordWrap ? Math.max(CALLOUT_MIN_WRAP, this.wrapWidth ?? 200) : null;
    }

    /** TradingView's bubble: the text plus its margin and corner radius on every side, centered on the box point
     *  (text widths approximated; the painter measures the glyphs). */
    override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        if (!this.tv) return super.box(proj);
        const p = this.points(proj);
        if (!p) return null;
        const fs = textPx(this.text?.size);
        const lines = this.labelText().split('\n');
        const wrap = this.wrapPx();
        const tw = wrap ?? Math.max(...lines.map((l) => l.length * fs * 0.6));
        const rows = wrap == null ? lines.length : lines.reduce((n, l) => n + Math.max(1, Math.ceil((l.length * fs * 0.6) / wrap)), 0);
        const pad = 2 * (CALLOUT_RADIUS + CALLOUT_MARGIN);
        const w = tw + pad;
        const h = rows * fs + pad;
        return { x: p[1][0] - w / 2, y: p[1][1] - h / 2, w, h };
    }

    /** TradingView grabs the bubble and the target point, not the tail. */
    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        if (!this.tv) return super.hitTest(px, py, proj, tol);
        const b = this.box(proj);
        return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h);
    }

    /** The target; with Text wrap on, also a point on the bubble's right edge that sets the wrap width. */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const pts = super.handlePoints(proj);
        const b = this.tv && this.wrapPx() != null ? this.box(proj) : null;
        return b && pts[0] ? [pts[0], [b.x + b.w, b.y + b.h / 2]] : pts;
    }

    /** TradingView's wrap handle: the left edge stays, the width follows the handle (text at least 100 px). */
    override dragHandlePx(index: number, x: number, _y: number, proj: Projector): boolean {
        if (!this.tv || index !== 1) return false;
        const b = this.box(proj);
        const c = this.anchors[1];
        if (!b || !c) return true;
        const pad = 2 * (CALLOUT_RADIUS + CALLOUT_MARGIN);
        const wrap = Math.max(CALLOUT_MIN_WRAP, Math.round(x - b.x - pad / 2));
        if (!Number.isFinite(wrap)) return true;
        this.wrapWidth = wrap;
        const mid = proj.pxToPoint(b.x + (wrap + pad) / 2, b.y + b.h / 2, this.paneId);
        if (Number.isFinite(mid.time)) this.anchors = [this.anchors[0]!, { ...c, time: mid.time }];
        return true;
    }

    override schema(): SettingsSchema {
        if (!this.tv) return super.schema();
        return {
            fields: [
                ...TEXT_FIELDS,
                { path: 'style.fillColor', label: 'Background', kind: 'color', group: 'text' },
                { path: 'style.lineColor', label: 'Border', kind: 'color', group: 'text' },
                { path: 'style.lineWidth', label: 'Border width', kind: 'number', min: 1, max: 4, step: 1, group: 'text' },
                { path: 'wordWrap', label: 'Text wrap', kind: 'boolean', group: 'text' },
            ],
            textIsContent: true,
        };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        if (!this.tv) return undefined;
        return { tv: true, wordWrap: this.wordWrap === true, wrapWidth: this.wrapWidth };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv === true) this.tv = true;
        if (typeof props.wordWrap === 'boolean') this.wordWrap = props.wordWrap;
        if (typeof props.wrapWidth === 'number' && Number.isFinite(props.wrapWidth)) this.wrapWidth = Math.min(4000, Math.max(CALLOUT_MIN_WRAP, props.wrapWidth));
    }
}

const TV_CALLOUT_TEXT = '#ffffff'; // palette-exempt: TradingView's callout text (white)
