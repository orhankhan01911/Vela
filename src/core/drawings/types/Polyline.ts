import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { PathDrawing } from './PathDrawing';

/** A polyline: click each vertex, double-click to finish. Every vertex is an editable handle.
 *  A new one is TradingView's (module 631559): sky blue 2 px, the area it encloses filled with the blue at 20 %. */
export class Polyline extends PathDrawing {
    readonly type = 'polyline' as const;

    override tvShapeKind(): 'area' | 'polyline' | 'curve' {
        return 'polyline';
    }

    override geometry(proj: Projector): SegmentGeometry | null {
        const g = super.geometry(proj);
        if (!g || !this.tv || g.segments.length < 2) return g;
        // TradingView fills the area the points enclose.
        const fill: Array<[number, number]> = [[g.segments[0]![0], g.segments[0]![1]], ...g.segments.map((sg) => [sg[2], sg[3]] as [number, number])];
        return { ...g, fill };
    }

    override schema(): SettingsSchema {
        return this.tv ? this.tvShapeSchema() : super.schema();
    }
}
