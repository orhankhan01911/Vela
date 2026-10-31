import { PatternDrawing } from './PatternDrawing';

/** TradingView's triangle pattern: four swing points A–D, the two converging sides (A–C and B–D) shaded between.
 *
 *  A new one is TradingView's (module 726725): deep blue 2 px legs, the A–C and B–D lines run from the outermost
 *  points to their apex as a dotted triangle filled at 85 % transparency, the names in deep blue boxes. */
export class TrianglePattern extends PatternDrawing {
    readonly type = 'trianglepattern' as const;

    protected override tvPattern(): boolean {
        return true;
    }

    override tvConverging(): boolean {
        return true;
    }

    vertexLabels(): readonly string[] {
        return ['A', 'B', 'C', 'D'];
    }

    override labelPlates(): boolean {
        return true;
    }

    override fillTriangles(): ReadonlyArray<readonly [number, number, number]> {
        return this.tv ? [] : [[0, 1, 2], [1, 2, 3]];
    }

    /** TradingView's triangle in pixels: where the A–C and B–D lines cross the outermost points' x (the leftmost, or
     *  the rightmost when the apex is left of them), then the apex; null until all four points or when the sides are
     *  vertical or parallel. */
    convergingTriangle(pts: ReadonlyArray<readonly [number, number]>): [[number, number], [number, number], [number, number]] | null {
        if (pts.length < 4) return null;
        const [a, b, c, d] = pts as [[number, number], [number, number], [number, number], [number, number]];
        if (Math.abs(c[0] - a[0]) < 1 || Math.abs(d[0] - b[0]) < 1) return null;
        const s1 = (c[1] - a[1]) / (c[0] - a[0]);
        const s2 = (d[1] - b[1]) / (d[0] - b[0]);
        if (Math.abs(s1 - s2) < 1e-6) return null;
        const apexX = (b[1] - a[1] + (a[0] * s1 - b[0] * s2)) / (s1 - s2);
        const xs = [a[0], b[0], c[0], d[0]];
        let x = Math.min(...xs);
        if (apexX < x) x = Math.max(...xs);
        return [[x, a[1] + (x - a[0]) * s1], [x, b[1] + (x - b[0]) * s2], [apexX, a[1] + (apexX - a[0]) * s1]];
    }
}
