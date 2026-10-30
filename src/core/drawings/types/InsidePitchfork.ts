import { PitchforkBase, type PitchforkStyle } from './PitchforkBase';

/**
 * An inside pitchfork: the median is anchored at M = midpoint(p2, p3) but takes its slope from
 * d = p3 − midpoint(p1, p2) (the modified base B). The two tines run through p2/p3 parallel to
 * the median; short connector segments (B–p3 and p1–p2) show the construction.
 */
export class InsidePitchfork extends PitchforkBase {
    readonly type = 'insidepitchfork' as const;
    protected readonly defaultForkStyle: PitchforkStyle = 'inside';
}
