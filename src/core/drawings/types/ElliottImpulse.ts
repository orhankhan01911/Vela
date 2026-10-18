import { PatternDrawing } from './PatternDrawing';

/**
 * Elliott impulse wave — like TradingView's: an unlabelled origin, then waves 1–5 (6 points). Drawings saved before
 * the origin point existed (5 points labelled 1–5, no `origin` flag) keep their old shape.
 */
export class ElliottImpulse extends PatternDrawing {
    readonly type = 'elliottimpulse' as const;
    // `!` (no initializer): set by readProps (run by the base constructor) for an old 5-point drawing.
    private legacy!: boolean;

    vertexLabels(): readonly string[] {
        return this.legacy ? ['1', '2', '3', '4', '5'] : ['', '1', '2', '3', '4', '5'];
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), origin: !this.legacy };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        this.legacy = props.origin === false; // set on old records by deserializeDrawing
    }
}
