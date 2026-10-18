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

export function degreeOf(v: unknown): string {
    return typeof v === 'string' && v in ELLIOTT_DEGREES ? v : DEFAULT_DEGREE;
}
