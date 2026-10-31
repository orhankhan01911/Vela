import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { ELLIOTT_DEGREE_FIELD, degreeLetters, degreeOf } from './elliottDegree';
import { PatternDrawing } from './PatternDrawing';
import { TV_DOUBLE_COMBO_LABELS, TV_TRIANGLE_LABELS, type ElliottLabelGroups } from './elliottTv';

/** Shared base of TradingView's Elliott triangle (A–E), double combo (W–X–Y) and triple combo (W–X–Y–X–Z): an
 *  unlabelled origin, then the lettered waves in the degree's style. */
abstract class ElliottLettered extends PatternDrawing {
    /** TradingView's wave degree: the label style (Minor = plain capitals). */
    degree!: string;
    protected abstract letters(): readonly string[];

    vertexLabels(): readonly string[] {
        return ['', ...degreeLetters(degreeOf(this.degree), this.letters())];
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), degree: degreeOf(this.degree) };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (typeof props.degree === 'string') this.degree = degreeOf(props.degree);
    }

    override schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ELLIOTT_DEGREE_FIELD] };
    }
}

/** A new one is TradingView's (module 356806): the impulse's degrees and look, (0) (A) … (E) at Intermediate, orange. */
export class ElliottTriangle extends ElliottLettered {
    readonly type = 'elliotttriangle' as const;
    protected override tvPattern(): boolean {
        return true;
    }
    override tvElliottLabels(): ElliottLabelGroups {
        return TV_TRIANGLE_LABELS;
    }
    protected letters(): readonly string[] {
        return ['A', 'B', 'C', 'D', 'E'];
    }
}

/** A new one is TradingView's (module 356806): the impulse's degrees and look, (0) (W) (X) (Y) at Intermediate, green. */
export class ElliottDoubleCombo extends ElliottLettered {
    readonly type = 'elliottdoublecombo' as const;
    protected override tvPattern(): boolean {
        return true;
    }
    override tvElliottLabels(): ElliottLabelGroups {
        return TV_DOUBLE_COMBO_LABELS;
    }
    protected letters(): readonly string[] {
        return ['W', 'X', 'Y'];
    }
}

export class ElliottTripleCombo extends ElliottLettered {
    readonly type = 'elliotttriplecombo' as const;
    protected letters(): readonly string[] {
        return ['W', 'X', 'Y', 'X', 'Z'];
    }
}
