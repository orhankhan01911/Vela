import { PitchforkBase } from './PitchforkBase';

/**
 * Shared base for the Schiff pitchfork family: an Andrews' pitchfork whose median STARTS at a
 * shifted origin instead of the pivot, with a construction line p1–p2 keeping the pivot attached.
 * The geometry lives in {@link PitchforkBase} (TradingView's Style dropdown switches between them).
 */
export abstract class PitchforkVariant extends PitchforkBase {}
