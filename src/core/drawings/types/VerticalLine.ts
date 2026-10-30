import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, SHOW_TIME_FIELD, TEXT_FIELDS, LINE_TEXT_ALIGN_FIELDS } from '../schema';
import { handleAt } from '../hittest';

/** A vertical line at a single time, spanning the full pane height. Like TradingView's, it shows its time on the
 *  time axis unless `showTime` is off. */
export class VerticalLine extends Drawing {
    readonly type = 'vline' as const;
    // `!` (no initializer): the base constructor runs readProps first. Absent ⇒ shown (TradingView's default).
    showTime!: boolean;
    /** TradingView's "Text orientation: Vertical": the label runs up the line instead of across it. */
    textVertical!: boolean;
    /** TradingView's "Extend": the line runs through every pane, not only its own. */
    extendLine!: boolean;

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        // A new line starts as TradingView's (through every pane, vertical text); a saved one keeps how it was.
        if (!init.props) {
            this.extendLine = true;
            this.textVertical = true;
        }
    }

    protected override writeProps(): Record<string, unknown> {
        return { showTime: this.showTime !== false, extendLine: !!this.extendLine, ...(this.textVertical ? { textVertical: true } : {}) };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.showTime === 'boolean') this.showTime = props.showTime;
        if (typeof props.textVertical === 'boolean') this.textVertical = props.textVertical;
        if (typeof props.extendLine === 'boolean') this.extendLine = props.extendLine;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        // One anchor; only its time (x) matters — its price pins the drag handle.
        return { min: 1, max: 1, slots: [{ role: 'p', free: 'x' }] };
    }

    private x(proj: Projector): number | null {
        const a = this.anchors[0];
        return a ? proj.xOf(a.time) : null;
    }

    hitTest(px: number, _py: number, proj: Projector, tol: number): boolean {
        const x = this.x(proj);
        return x != null && Math.abs(px - x) <= tol; // ignores y → spans full height
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const a = this.anchors[0];
        const x = this.x(proj);
        if (!a || x == null) return [];
        const y = proj.yOf(a.price, this.paneId);
        return y == null ? [] : [[x, y]];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const x = this.x(proj);
        return x == null ? null : { x: x - 1, y: 0, w: 2, h: proj.height };
    }

    priceRange(): { min: number; max: number } | null {
        return null; // a vertical line doesn't constrain the price axis
    }

    schema(): SettingsSchema {
        return {
            fields: [
                ...LINE_FIELDS,
                { path: 'extendLine', label: 'Extend', kind: 'boolean', group: 'behavior' },
                SHOW_TIME_FIELD,
                ...TEXT_FIELDS,
                ...LINE_TEXT_ALIGN_FIELDS,
                { path: 'textVertical', label: 'Text orientation', kind: 'boolean', group: 'text' },
            ],
        };
    }
}
