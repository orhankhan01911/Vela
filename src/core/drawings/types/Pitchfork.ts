import { type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import { PitchforkBase, type PitchforkFrame } from './PitchforkBase';

/**
 * An Andrews' pitchfork: a median line from the pivot (p1) through the midpoint of
 * p2/p3, plus two tines parallel to the median running through p2 and p3. All lines
 * extend to the right edge; a base line joins p2–p3. Levels, fills and extension come
 * from {@link PitchforkBase}.
 */
export class Pitchfork extends PitchforkBase {
    readonly type = 'pitchfork' as const;

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return {
            min: 3,
            max: 3,
            slots: [
                { role: 'pivot', free: 'both' },
                { role: 'upper', free: 'both' },
                { role: 'lower', free: 'both' },
            ],
        };
    }

    protected frame(proj: Projector): PitchforkFrame | { placing: [number, number, number, number] } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const px = (p: DrawingPoint): [number, number] | null => {
            const y = proj.yOf(p.price, this.paneId);
            return y == null ? null : [proj.xOf(p.time), y];
        };
        const P0 = px(a);
        const P1 = px(b);
        if (!P0 || !P1) return null;
        const c = this.anchors[2];
        if (!c) return { placing: [P0[0], P0[1], P1[0], P1[1]] }; // pivot → cursor only (placing)
        const P2 = px(c);
        if (!P2) return null;
        const M: [number, number] = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2]; // midpoint of the two tine anchors
        return { S: P0, M, P1, P2, d: [M[0] - P0[0], M[1] - P0[1]], construction: [] };
    }
}
