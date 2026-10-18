import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { ELLIOTT_DEGREES, ELLIOTT_DEGREE_FIELD, degreeOf } from './elliottDegree';
import { PatternDrawing } from './PatternDrawing';

/**
 * Elliott impulse wave — like TradingView's: an unlabelled origin, then waves 1–5 (6 points). Drawings saved before
 * the origin point existed (5 points labelled 1–5, no `origin` flag) keep their old shape.
 */
export class ElliottImpulse extends PatternDrawing {
    readonly type = 'elliottimpulse' as const;
    // `!` (no initializer): set by readProps (run by the base constructor) for an old 5-point drawing.
    private legacy!: boolean;
    /** TradingView's wave degree: the label style (Minor = 1–5 / A–C). */
    degree!: string;

    vertexLabels(): readonly string[] {
        const labels = ELLIOTT_DEGREES[degreeOf(this.degree)]!.impulse;
        return this.legacy ? labels : ['', ...labels];
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), origin: !this.legacy, degree: degreeOf(this.degree) };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        this.legacy = props.origin === false; // set on old records by deserializeDrawing
        if (typeof props.degree === 'string') this.degree = degreeOf(props.degree);
    }

    override schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ELLIOTT_DEGREE_FIELD] };
    }
}
