import { PatternDrawing, legRatio } from './PatternDrawing';

/** Harmonic XABCD pattern — 5 points, leg ratios + a tinted body (Gartley / Bat / Crab / …).
 *
 *  A new one is TradingView's (modules 589610, 465795, 61444): blue lines 2 px, the XAB and BCD triangles filled at 85 %
 *  transparency, dotted XB / AC / BD / XD lines with the AB, BC, CD and XD ratios in blue boxes at their middles, and
 *  the point names in blue boxes. */
export class XABCD extends PatternDrawing {
    readonly type = 'xabcd' as const;

    protected override tvPattern(): boolean {
        return true;
    }

    /** TradingView: XB shows AB's retracement of XA, AC shows BC of AB, BD shows CD of BC, XD shows AD of XA. */
    override tvRatioLines(): Array<{ from: number; to: number; ratio: number }> {
        const p = this.anchors.map((a) => a.price);
        const out: Array<{ from: number; to: number; ratio: number }> = [];
        if (p.length >= 3) out.push({ from: 0, to: 2, ratio: legRatio(p[0]!, p[1]!, p[2]!) });
        if (p.length >= 4) out.push({ from: 1, to: 3, ratio: legRatio(p[1]!, p[2]!, p[3]!) });
        if (p.length >= 5) out.push({ from: 2, to: 4, ratio: legRatio(p[2]!, p[3]!, p[4]!) }, { from: 0, to: 4, ratio: legRatio(p[0]!, p[1]!, p[4]!) });
        return out;
    }

    vertexLabels(): readonly string[] {
        return ['X', 'A', 'B', 'C', 'D'];
    }

    override legRatios(): boolean {
        return true;
    }

    override fillTriangles(): ReadonlyArray<readonly [number, number, number]> {
        return [
            [0, 1, 2],
            [2, 3, 4],
        ];
    }
}
