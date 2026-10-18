import { PatternDrawing } from './PatternDrawing';

/**
 * Elliott corrective wave — like TradingView's: an unlabelled origin, then A–C (4 points). Drawings saved before the
 * origin point existed (3 points labelled A–C, no `origin` flag) keep their old shape.
 */
export class ElliottCorrection extends PatternDrawing {
    readonly type = 'elliottcorrection' as const;
    // `!` (no initializer): set by readProps (run by the base constructor) for an old 3-point drawing.
    private legacy!: boolean;

    vertexLabels(): readonly string[] {
        return this.legacy ? ['A', 'B', 'C'] : ['', 'A', 'B', 'C'];
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), origin: !this.legacy };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        this.legacy = props.origin === false; // set on old records by deserializeDrawing
    }
}
