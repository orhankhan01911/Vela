import { type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import { PitchforkBase, type PitchforkFrame } from './PitchforkBase';

/**
 * An inside pitchfork: the median is anchored at M = midpoint(p2, p3) but takes its slope from
 * d = p3 − midpoint(p1, p2) (the modified base B). The two tines run through p2/p3 parallel to
 * the median; short connector segments (B–p3 and p1–p2) show the construction.
 */
export class InsidePitchfork extends PitchforkBase {
    readonly type = 'insidepitchfork' as const;

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
        if (!c) return { placing: [P0[0], P0[1], P1[0], P1[1]] }; // back trend line only (placing)
        const B = px({ time: (a.time + b.time) / 2, price: (a.price + b.price) / 2 }); // modified base
        const P2 = px(c);
        if (!B || !P2) return null;
        const M: [number, number] = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2]; // median target M
        return {
            S: M, // the median runs through M with slope d = P2 − B
            M,
            P1,
            P2,
            d: [P2[0] - B[0], P2[1] - B[1]],
            construction: [
                [B[0], B[1], P2[0], P2[1]], // construction: modified base → p3
                [P0[0], P0[1], P1[0], P1[1]], // construction: the back trend line p1 → p2
            ],
        };
    }
}
