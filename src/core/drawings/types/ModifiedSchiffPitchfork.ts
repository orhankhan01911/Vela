import type { DrawingPoint, Projector } from '../geometry';
import { PitchforkVariant } from './PitchforkVariant';
import { timeBetween } from '../futureAnchors';

/** A modified Schiff pitchfork: the median origin is the full midpoint of the pivot and the first
 *  tine point (shifted in both time and price). */
export class ModifiedSchiffPitchfork extends PitchforkVariant {
    readonly type = 'modifiedschiffpitchfork' as const;

    protected medianStart(p0: DrawingPoint, p1: DrawingPoint, _p2: DrawingPoint, proj: Projector): DrawingPoint {
        return { time: timeBetween(proj, p0.time, p1.time, 0.5), price: (p0.price + p1.price) / 2 };
    }
}
