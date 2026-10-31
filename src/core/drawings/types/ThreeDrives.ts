import { PatternDrawing } from './PatternDrawing';

/** A drive's retracement as TradingView prints it here: |c − b| / |b − a|, to 2 decimals. */
function driveRatio(a: number, b: number, c: number): number {
    return Math.round((100 * Math.abs(c - b)) / Math.abs(b - a)) / 100;
}

/**
 * TradingView's Three drives pattern (module 643023): seven points joined by a deep blue 2 px line, no names, no
 * background; dotted lines from the second point to the fourth and the fourth to the sixth (in the line's width)
 * with each retracement, 2 decimals, in a box at its middle.
 */
export class ThreeDrives extends PatternDrawing {
    readonly type = 'threedrives' as const;

    vertexLabels(): readonly string[] {
        return ['', '', '', '', '', '', ''];
    }

    protected override tvPattern(): boolean {
        return true;
    }

    override tvRatioLines(): Array<{ from: number; to: number; ratio: number }> {
        const p = this.anchors.map((a) => a.price);
        const out: Array<{ from: number; to: number; ratio: number }> = [];
        if (p.length >= 4) out.push({ from: 1, to: 3, ratio: driveRatio(p[1]!, p[2]!, p[3]!) });
        if (p.length >= 6) out.push({ from: 3, to: 5, ratio: driveRatio(p[3]!, p[4]!, p[5]!) });
        return out;
    }

    override tvRatioLineWidth(): number {
        return this.style.lineWidth;
    }
}
