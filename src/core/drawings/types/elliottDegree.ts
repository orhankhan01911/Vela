import type { SettingsField } from '../schema';

/**
 * Elliott wave degrees and their standard labels (Frost & Prechter), as TradingView offers them: each degree writes
 * the impulse waves 1–5 and the corrective waves A–C in its own style. Minor (1–5, A–C) is the default.
 */
export const ELLIOTT_DEGREES: Record<string, { impulse: readonly string[]; correction: readonly string[] }> = {
    'Grand Supercycle': { impulse: ['((I))', '((II))', '((III))', '((IV))', '((V))'], correction: ['((a))', '((b))', '((c))'] },
    Supercycle: { impulse: ['(I)', '(II)', '(III)', '(IV)', '(V)'], correction: ['(a)', '(b)', '(c)'] },
    Cycle: { impulse: ['I', 'II', 'III', 'IV', 'V'], correction: ['a', 'b', 'c'] },
    Primary: { impulse: ['①', '②', '③', '④', '⑤'], correction: ['Ⓐ', 'Ⓑ', 'Ⓒ'] },
    Intermediate: { impulse: ['(1)', '(2)', '(3)', '(4)', '(5)'], correction: ['(A)', '(B)', '(C)'] },
    Minor: { impulse: ['1', '2', '3', '4', '5'], correction: ['A', 'B', 'C'] },
    Minute: { impulse: ['(i)', '(ii)', '(iii)', '(iv)', '(v)'], correction: ['(a)', '(b)', '(c)'] },
    Minuette: { impulse: ['i', 'ii', 'iii', 'iv', 'v'], correction: ['a', 'b', 'c'] },
};

export const DEFAULT_DEGREE = 'Minor';

export const ELLIOTT_DEGREE_FIELD: SettingsField = {
    path: 'degree',
    label: 'Degree',
    kind: 'select',
    options: Object.keys(ELLIOTT_DEGREES).map((value) => ({ value, label: value })),
    group: 'text',
};

/** A known degree name, else the default. Own keys only: a stored "toString" / "__proto__" must not pass. */
export function degreeOf(v: unknown): string {
    return typeof v === 'string' && Object.prototype.hasOwnProperty.call(ELLIOTT_DEGREES, v) ? v : DEFAULT_DEGREE;
}

/**
 * Write any capital letters in a degree's corrective style (as its A shows): Primary circles them (Ⓐ), Intermediate
 * brackets them ((A)), Minute brackets lower case ((a)), Minuette / Cycle use lower case, and so on.
 */
export function degreeLetters(degree: string, letters: readonly string[]): string[] {
    const sample = ELLIOTT_DEGREES[degreeOf(degree)]!.correction[0]!; // the style's "A"
    if (sample === 'Ⓐ') return letters.map((l) => String.fromCodePoint(0x24b6 + l.charCodeAt(0) - 65));
    const core = /[Aa]/.exec(sample);
    if (!core) return [...letters];
    const pre = sample.slice(0, core.index);
    const post = sample.slice(core.index + 1);
    const lower = core[0] === 'a';
    return letters.map((l) => `${pre}${lower ? l.toLowerCase() : l}${post}`);
}
