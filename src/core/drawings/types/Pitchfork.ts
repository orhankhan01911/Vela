import { PitchforkBase, type PitchforkStyle } from './PitchforkBase';

/**
 * An Andrews' pitchfork: a median line from the pivot (p1) through the midpoint of
 * p2/p3, plus two tines parallel to the median running through p2 and p3. All lines
 * extend to the right edge; a base line joins p2–p3. Levels, fills, extension and the
 * other styles come from {@link PitchforkBase}.
 */
export class Pitchfork extends PitchforkBase {
    readonly type = 'pitchfork' as const;
    protected readonly defaultForkStyle: PitchforkStyle = 'original';
}
