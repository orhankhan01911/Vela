import { type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { FibLevel } from './FibRatios';
import { FibVerticalLevels, type FibZoneLine } from './FibTimeZones';
import { fibLevels } from '../levelPalette';
import { timeAfter } from '../futureAnchors';

const TIME_LEVELS = fibLevels([
    0,
    0.382,
    { ratio: 0.5, enabled: false }, // hidden by default
    0.618,
    1,
    1.382,
    1.618,
    2,
    2.382,
    2.618,
    3,
]);

const TV_TFT_GRAY = '#808080'; // palette-exempt: TradingView's cold-gray-500 (levels 0 and 1.618, trend line)

/** TradingView's 11 levels (module 315360), in its order and colours, each 2 px solid; 0.5 hidden. */
export const TV_TREND_FIB_TIME_LEVELS: readonly FibLevel[] = (
    [
        [0, TV_TFT_GRAY],
        [0.382, '#F23645'], // palette-exempt: TradingView's level colour
        [0.5, '#81C784'], // palette-exempt: TradingView's level colour
        [0.618, '#4CAF50'], // palette-exempt: TradingView's level colour
        [1, '#089981'], // palette-exempt: TradingView's level colour
        [1.382, '#00BCD4'], // palette-exempt: TradingView's level colour
        [1.618, TV_TFT_GRAY],
        [2, '#2962FF'], // palette-exempt: TradingView's level colour
        [2.382, '#E91E63'], // palette-exempt: TradingView's level colour
        [2.618, '#9C27B0'], // palette-exempt: TradingView's level colour
        [3, '#673AB7'], // palette-exempt: TradingView's level colour
    ] as const
).map(([ratio, color]) => ({ ratio, color, enabled: ratio !== 0.5, lineWidth: 2, lineStyle: 'solid' as const }));

/**
 * Trend-based Fibonacci time: vertical lines at Fibonacci multiples of the base interval
 * (p1→p2), projected forward from the origin p3 — `xOf(p3.time + ratio · (p2.time − p1.time))`.
 * Time-only (the level lines ignore price), like {@link FibTimeZones} but driven by a 3-point trend.
 *
 * A new one is TradingView's (module 315360): 11 levels with their own lines, background on at 80 % transparency,
 * labels right / bottom, dashed grey 2 px trend lines A→B and B→C.
 */
export class TrendFibTime extends FibVerticalLevels {
    readonly type = 'trendfibtime' as const;

    protected applyTvDefaults(): void {
        this.levels = TV_TREND_FIB_TIME_LEVELS.map((l) => ({ ...l }));
        this.style = { ...this.style, lineWidth: 2, lineStyle: 'solid' };
        this.background = true;
        this.fillOpacity = 0.2;
        this.showLabels = true;
        this.labelH = 'right';
        this.labelV = 'bottom';
        this.trendline = true;
        this.trendColor = TV_TFT_GRAY;
        this.trendWidth = 2;
        this.trendStyle = 'dashed';
        this.fontSize = 12;
    }

    defaultLevels(): readonly FibLevel[] {
        return TIME_LEVELS;
    }

    override anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 3, max: 3, slots: [{ role: 'p1', free: 'both' }, { role: 'p2', free: 'both' }, { role: 'p3', free: 'both' }] };
    }

    zoneLines(proj: Projector): FibZoneLine[] | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        const c = this.anchors[2];
        if (!a || !b || !c) return null;
        if (Math.abs(b.time - a.time) < 1e-9) return null; // no base interval
        const out: FibZoneLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            out.push({ n: lv.ratio, color: lv.color, label: lv.label, x: proj.xOf(timeAfter(proj, c.time, a.time, b.time, lv.ratio)) });
        }
        return out;
    }
}
