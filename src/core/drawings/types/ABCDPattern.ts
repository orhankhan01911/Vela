import { PatternDrawing, legRatio } from './PatternDrawing';

/** ABCD pattern — 4 points with the BC/AB and CD/BC leg ratios.
 *
 *  A new one is TradingView's (module 154759): green 2 px line, no background, dotted AC and BD lines in the line's
 *  width with the BC/AB and CD/BC ratios in green boxes at their middles, the point names in green boxes. */
export class ABCDPattern extends PatternDrawing {
    readonly type = 'abcd' as const;

    protected override tvPattern(): boolean {
        return true;
    }

    override tvRatioLines(): Array<{ from: number; to: number; ratio: number }> {
        const p = this.anchors.map((a) => a.price);
        const out: Array<{ from: number; to: number; ratio: number }> = [];
        if (p.length >= 3) out.push({ from: 0, to: 2, ratio: legRatio(p[0]!, p[1]!, p[2]!) });
        if (p.length >= 4) out.push({ from: 1, to: 3, ratio: legRatio(p[1]!, p[2]!, p[3]!) });
        return out;
    }

    override tvRatioLineWidth(): number {
        return this.style.lineWidth;
    }

    vertexLabels(): readonly string[] {
        return ['A', 'B', 'C', 'D'];
    }

    override legRatios(): boolean {
        return true;
    }
}
