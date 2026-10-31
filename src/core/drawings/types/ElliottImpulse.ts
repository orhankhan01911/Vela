import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { ELLIOTT_DEGREES, ELLIOTT_DEGREE_FIELD, degreeOf } from './elliottDegree';
import { PatternDrawing } from './PatternDrawing';
import { TV_IMPULSE_LABELS, type ElliottLabelGroups } from './elliottTv';

/**
 * Elliott impulse wave — like TradingView's: an unlabelled origin, then waves 1–5 (6 points). Drawings saved before
 * the origin point existed (5 points labelled 1–5, no `origin` flag) keep their old shape.
 *
 * A new one is TradingView's (module 356806): its 15 degrees and label groups (Intermediate by default: (0) … (5)),
 * labels alternating below and above the wave, the origin's "0" only while it is selected, its blue 2 px wave.
 */
export class ElliottImpulse extends PatternDrawing {
    readonly type = 'elliottimpulse' as const;
    // `!` (no initializer): set by readProps (run by the base constructor) for an old 5-point drawing.
    private legacy!: boolean;
    /** TradingView's wave degree: the label style (Minor = 1–5 / A–C). */
    degree!: string;

    protected override tvPattern(): boolean {
        return true;
    }

    override tvElliottLabels(): ElliottLabelGroups {
        return TV_IMPULSE_LABELS;
    }

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
