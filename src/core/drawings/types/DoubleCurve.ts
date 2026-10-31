import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

const STEPS = 64;

/**
 * TradingView's double curve: an S between two points through their middle. A cubic curve whose first control point
 * is the start moved by the chord turned 90°, and the second its mirror at the end (fitted to TradingView's on
 * 2026-10-18: same overshoot past the start and the end).
 */
export class DoubleCurve extends SegmentDrawing {
    readonly type = 'doublecurve' as const;

    /** TradingView's look on a new one (module 481599: deep blue 2 px, no background). */
    override tvShapeKind(): 'area' | 'polyline' | 'curve' {
        return 'curve';
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 2, max: 2, slots: [{ role: 'p1', free: 'both' }, { role: 'p2', free: 'both' }] };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const pts = this.handlePoints(proj);
        if (pts.length < 2) return null;
        const [x0, y0] = pts[0]!;
        const [x3, y3] = pts[1]!;
        const dx = x3 - x0;
        const dy = y3 - y0;
        const c1: [number, number] = [x0 + dy, y0 - dx]; // the chord turned 90°
        const c2: [number, number] = [x3 - dy, y3 + dx];
        const segments: Array<[number, number, number, number]> = [];
        let px = x0;
        let py = y0;
        for (let i = 1; i <= STEPS; i += 1) {
            const t = i / STEPS;
            const u = 1 - t;
            const x = u * u * u * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * x3;
            const y = u * u * u * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * y3;
            segments.push([px, py, x, y]);
            px = x;
            py = y;
        }
        return { segments, fill: null };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
    }

    schema(): SettingsSchema {
        if (this.tv) return this.tvShapeSchema();
        return { fields: [...LINE_FIELDS] };
    }
}
