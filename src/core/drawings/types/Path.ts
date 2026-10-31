import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { PathDrawing } from './PathDrawing';

/**
 * A connected multi-point polyline that ends in an arrowhead (the painter adds the head). New ones are TradingView's
 * (read from its code 2026-10-30, module 592788): blue 2 px, a plain left end and an open arrow at the right end
 * (either switchable), drawn as one line with round joins; the dialog is one Line row (color, thickness, style, the
 * two ends) and Visibility, no text. Placing ends with a click on the last point. Paths saved before keep their look.
 */
export class Path extends PathDrawing {
    readonly type = 'path' as const;
    /** TradingView's path (new paths). */
    override tv?: boolean;

    constructor(init: ConstructorParameters<typeof PathDrawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.style = { ...this.style, arrowLeft: this.style.arrowLeft ?? false, arrowRight: this.style.arrowRight ?? true };
        }
    }

    override finishesOnSamePoint(): boolean {
        return this.tv === true;
    }

    /** TradingView hits the whole width of the line. */
    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        return super.hitTest(px, py, proj, this.tv ? Math.max(tol, Math.ceil((this.style.lineWidth ?? 1) / 2)) : tol);
    }

    override schema(): SettingsSchema {
        if (!this.tv) return super.schema();
        return {
            fields: [
                ...LINE_FIELDS,
                { path: 'style.arrowLeft', label: 'Left end', kind: 'boolean', group: 'line' },
                { path: 'style.arrowRight', label: 'Right end', kind: 'boolean', group: 'line' },
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return this.tv ? { tv: true } : undefined;
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv === true) this.tv = true;
    }
}
