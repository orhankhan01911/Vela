import { PatternDrawing } from './PatternDrawing';

/** TradingView's triangle pattern: four swing points A–D, the two converging sides (A–C and B–D) shaded between. */
export class TrianglePattern extends PatternDrawing {
    readonly type = 'trianglepattern' as const;

    vertexLabels(): readonly string[] {
        return ['A', 'B', 'C', 'D'];
    }

    override labelPlates(): boolean {
        return true;
    }

    override fillTriangles(): ReadonlyArray<readonly [number, number, number]> {
        return [[0, 1, 2], [1, 2, 3]];
    }
}
