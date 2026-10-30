import type { PitchforkStyle } from './PitchforkBase';
import { PitchforkVariant } from './PitchforkVariant';

/** A modified Schiff pitchfork: the median origin is the full midpoint of the pivot and the first
 *  tine point (shifted in both time and price). */
export class ModifiedSchiffPitchfork extends PitchforkVariant {
    readonly type = 'modifiedschiffpitchfork' as const;
    protected readonly defaultForkStyle: PitchforkStyle = 'modifiedschiff';
}
