import { type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import { PitchforkBase, type PitchforkFrame } from './PitchforkBase';

/**
 * Shared base for the Schiff pitchfork family. Identical to an Andrews' pitchfork —
 * median through M = midpoint(p2, p3), tines through p2/p3 parallel to it, base line
 * p2–p3 — except the median STARTS at a shifted origin S (computed in data space by
 * each subclass) instead of the pivot p1. The tines track the new median direction, and a
 * construction line p1–p2 keeps the pivot attached to the shape.
 */
export abstract class PitchforkVariant extends PitchforkBase {
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

    /** The median's start point, in DATA space (time+price), derived from the three anchors. */
    protected abstract medianStart(p0: DrawingPoint, p1: DrawingPoint, p2: DrawingPoint): DrawingPoint;

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
        const S = px(this.medianStart(a, b, c));
        const P2 = px(c);
        if (!S || !P2) return null;
        const M: [number, number] = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2]; // median target = midpoint of the tine anchors
        // The median leaves from the shifted origin, not the pivot — without the construction line p1–p2 the
        // pivot handle would float unattached to the shape it defines.
        return { S, M, P1, P2, d: [M[0] - S[0], M[1] - S[1]], construction: [[P0[0], P0[1], P1[0], P1[1]]] };
    }

}
