import { PatternDrawing } from './PatternDrawing';

/**
 * Head & shoulders — 7 points (start, left shoulder, trough, head, trough, right shoulder,
 * end) with an extended neckline through the two troughs. Like TradingView's, the three peaks
 * are filled down to the neckline and named on plates (Left Shoulder, Head, Right Shoulder).
 */
export class HeadShoulders extends PatternDrawing {
    readonly type = 'headshoulders' as const;

    vertexLabels(): readonly string[] {
        return ['', 'Left Shoulder', '', 'Head', '', 'Right Shoulder', ''];
    }

    override labelPlates(): boolean {
        return true;
    }

    /** The three peaks; the painter closes the outer two on the neckline where the outer legs cross it. */
    override fillTriangles(): ReadonlyArray<readonly [number, number, number]> {
        return [[0, 1, 2], [2, 3, 4], [4, 5, 6]];
    }

    override necklineIndices(): readonly [number, number] {
        return [2, 4]; // the two troughs flanking the head
    }
}
