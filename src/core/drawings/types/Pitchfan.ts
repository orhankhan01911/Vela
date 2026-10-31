import type { Projector, SegmentGeometry } from '../geometry';
import { PitchforkBase, type PitchforkLevel, type PitchforkStyle } from './PitchforkBase';

/** TradingView's Pitchfan levels (module 342161), in its order and colours: 0.5 and 1 on, the rest off; 2 px solid. */
export const PITCHFAN_LEVELS: readonly PitchforkLevel[] = [
    { ratio: 0.25, color: '#ffb74d', enabled: false }, // palette-exempt: TradingView's tan-orange-300
    { ratio: 0.382, color: '#81c784', enabled: false }, // palette-exempt: TradingView's iguana-green-300
    { ratio: 0.5, color: '#00bcd4', enabled: true }, // palette-exempt: TradingView's sky-blue-500
    { ratio: 0.618, color: '#089981', enabled: false }, // palette-exempt: TradingView's minty-green-500
    { ratio: 0.75, color: '#00bcd4', enabled: false }, // palette-exempt: TradingView's sky-blue-500
    { ratio: 1, color: '#2962ff', enabled: true }, // palette-exempt: TradingView's tv-blue-500
    { ratio: 1.5, color: '#9c27b0', enabled: false }, // palette-exempt: TradingView's grapes-purple-500
    { ratio: 1.75, color: '#e91e63', enabled: false }, // palette-exempt: TradingView's berry-pink-500
    { ratio: 2, color: '#f77c80', enabled: false }, // palette-exempt: TradingView's ripe-red-300
].map((l) => ({ ...l, lineWidth: 2, lineStyle: 'solid' as const }));

/** How far a ray is drawn (the canvas clips it). */
const FAR = 1e5;

/**
 * TradingView's Pitchfan (module 342161): the median is a ray from the pivot (p1) through the midpoint M of p2 and p3,
 * the side line joins p2 and p3, and each shown level is a pair of rays from the pivot through M ± ratio × (p3 − p2) / 2
 * (1 = through p2 and p3). With Background, each pair's wedge out to the previous shown level is filled in the level's
 * colour. Levels, median line and fill settings are the pitchforks'; it has no Style or Extend lines.
 */
export class Pitchfan extends PitchforkBase {
    readonly type = 'pitchfan' as const;
    protected readonly defaultForkStyle: PitchforkStyle = 'original';

    protected override factoryLevels(): readonly PitchforkLevel[] {
        return PITCHFAN_LEVELS;
    }

    override geometry(proj: Projector): SegmentGeometry | null {
        const px = (i: number): [number, number] | null => {
            const a = this.anchors[i];
            if (!a) return null;
            const y = proj.yOf(a.price, this.paneId);
            return y == null ? null : [proj.xOf(a.time), y];
        };
        const P0 = px(0);
        const P1 = px(1);
        if (!P0 || !P1) return null;
        const ray = (to: [number, number]): [number, number, number, number] => {
            const dx = to[0] - P0[0];
            const dy = to[1] - P0[1];
            const len = Math.hypot(dx, dy);
            return len < 1e-9 ? [P0[0], P0[1], to[0], to[1]] : [P0[0], P0[1], P0[0] + (dx / len) * FAR, P0[1] + (dy / len) * FAR];
        };
        const mLine = { color: this.medianColor || this.style.lineColor, lineWidth: this.medianWidth, lineStyle: this.medianStyle };
        const P2 = px(2);
        // Placing: the median runs through the second point until the third is set.
        if (!P2) return { segments: [], fill: null, colored: [{ seg: ray(P1), ...mLine }] };
        const M: [number, number] = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2];
        const half: [number, number] = [(P2[0] - P1[0]) / 2, (P2[1] - P1[1]) / 2];
        const at = (r: number): [number, number] => [M[0] + half[0] * r, M[1] + half[1] * r];
        const colored: NonNullable<SegmentGeometry['colored']> = [{ seg: ray(M), ...mLine }, { seg: [P1[0], P1[1], P2[0], P2[1]], ...mLine }];
        const fills: NonNullable<SegmentGeometry['fills']> = [];
        // TradingView walks the levels in their order; each band reaches back to the previous shown level (0 = median).
        let prev = 0;
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            for (const sign of [1, -1]) {
                const edge = ray(at(sign * lv.ratio));
                if (this.background) {
                    const back = ray(at(sign * prev));
                    fills.push({ color: lv.color, pts: [P0, [edge[2], edge[3]], [back[2], back[3]]] });
                }
                colored.push({ seg: edge, color: lv.color, lineWidth: lv.lineWidth, lineStyle: lv.lineStyle });
            }
            prev = lv.ratio;
        }
        return { segments: [], fill: null, colored, fills, fillAlpha: this.fillOpacity };
    }
}
