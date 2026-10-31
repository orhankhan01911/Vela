/**
 * TradingView's Elliott wave labels (module 356806). Fifteen degrees, Supermillennium (0) to Minuscule (14); a degree
 * picks one of five label groups (three degrees each) and a decoration: plain, in brackets, or in a circle. Each
 * group writes the waves in its own letters, size and weight.
 */
export const TV_ELLIOTT_DEGREES: readonly string[] = [
    'Supermillennium',
    'Millennium',
    'Submillennium',
    'Grand Supercycle',
    'Supercycle',
    'Cycle',
    'Primary',
    'Intermediate',
    'Minor',
    'Minute',
    'Minuette',
    'Subminuette',
    'Micro',
    'Submicro',
    'Minuscule',
];

/** TradingView's default degree: Intermediate. */
export const TV_ELLIOTT_DEFAULT_DEGREE = 7;

/** Each label group's font size, circle diameter and weight (group 0 the smallest). */
const GROUP_LOOK: ReadonlyArray<{ font: number; circle: number; bold: boolean }> = [
    { font: 11, circle: 14, bold: true },
    { font: 16, circle: 22, bold: false },
    { font: 18, circle: 22, bold: false },
    { font: 20, circle: 28, bold: false },
    { font: 24, circle: 36, bold: true },
];

/** A wave tool's labels per group (group 0 first), each starting with the origin's "0". */
export type ElliottLabelGroups = ReadonlyArray<readonly string[]>;

export const TV_IMPULSE_LABELS: ElliottLabelGroups = [
    ['0', '1', '2', '3', '4', '5'],
    ['0', 'i', 'ii', 'iii', 'iv', 'v'],
    ['0', '1', '2', '3', '4', '5'],
    ['0', 'I', 'II', 'III', 'IV', 'V'],
    ['0', '1', '2', '3', '4', '5'],
];
export const TV_CORRECTION_LABELS: ElliottLabelGroups = [
    ['0', 'A', 'B', 'C'],
    ['0', 'a', 'b', 'c'],
    ['0', 'A', 'B', 'C'],
    ['0', 'a', 'b', 'c'],
    ['0', 'A', 'B', 'C'],
];
export const TV_TRIANGLE_LABELS: ElliottLabelGroups = [
    ['0', 'A', 'B', 'C', 'D', 'E'],
    ['0', 'a', 'b', 'c', 'd', 'e'],
    ['0', 'A', 'B', 'C', 'D', 'E'],
    ['0', 'a', 'b', 'c', 'd', 'e'],
    ['0', 'A', 'B', 'C', 'D', 'E'],
];
export const TV_DOUBLE_COMBO_LABELS: ElliottLabelGroups = [
    ['0', 'W', 'X', 'Y'],
    ['0', 'w', 'x', 'y'],
    ['0', 'W', 'X', 'Y'],
    ['0', 'w', 'x', 'y'],
    ['0', 'W', 'X', 'Y'],
];
export const TV_TRIPLE_COMBO_LABELS: ElliottLabelGroups = [
    ['0', 'W', 'X', 'Y', 'X', 'Z'],
    ['0', 'w', 'x', 'y', 'x', 'z'],
    ['0', 'W', 'X', 'Y', 'X', 'Z'],
    ['0', 'w', 'x', 'y', 'x', 'z'],
    ['0', 'W', 'X', 'Y', 'X', 'Z'],
];

/** A label as TradingView draws it: its text (brackets included), whether it is circled, its font size, circle
 *  radius and weight. */
export interface ElliottLabel {
    text: string;
    circle: boolean;
    fontSize: number;
    radius: number;
    bold: boolean;
}

/** A valid degree index (0..14), else the default. */
export function tvDegreeOf(v: unknown): number {
    return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < TV_ELLIOTT_DEGREES.length ? v : TV_ELLIOTT_DEFAULT_DEGREE;
}

/** TradingView's label for point `index` at `degree`. */
export function tvElliottLabel(groups: ElliottLabelGroups, degree: number, index: number): ElliottLabel {
    const t = TV_ELLIOTT_DEGREES.length - tvDegreeOf(degree) - 1;
    const group = Math.floor(t / 3);
    const deco = (['', 'brackets', 'circle'] as const)[t % 3];
    const look = GROUP_LOOK[group]!;
    const raw = groups[group]?.[index] ?? '';
    return { text: deco === 'brackets' ? `(${raw})` : raw, circle: deco === 'circle', fontSize: look.font, radius: look.circle / 2, bold: look.bold };
}
