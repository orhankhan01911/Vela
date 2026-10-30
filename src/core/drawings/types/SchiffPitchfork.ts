import type { PitchforkStyle } from './PitchforkBase';
import { PitchforkVariant } from './PitchforkVariant';

/** A Schiff pitchfork: the median origin is shifted in PRICE only — halfway between the pivot and
 *  the first tine point, at the pivot's time. */
export class SchiffPitchfork extends PitchforkVariant {
    readonly type = 'schiffpitchfork' as const;
    protected readonly defaultForkStyle: PitchforkStyle = 'schiff';
}
