import type { Projector } from '../geometry';
import { DEFAULT_DRAWING_COLOR } from '../style';
import { FibRatios, type FibEntryLine, type FibLevel } from './FibRatios';
import type { FibLabelH, FibLabelV } from './FibLevels';
import { timeBetween } from '../futureAnchors';

/** A resolved time-zone line: its Fibonacci index, color, label, and pixel x. */
export interface FibZoneLine {
    n: number;
    color: string;
    label?: string;
    x: number;
}

const TV_TZ_GRAY = '#808080'; // palette-exempt: TradingView's cold-gray-500 (level 0, trend line)
const TV_TZ_BLUE = '#2962FF'; // palette-exempt: TradingView's tv-blue-500 (the other levels)

/** TradingView's 11 time zones (module 308132): 0 grey, the rest blue, each 2 px solid, all shown. */
export const TV_FIB_TIME_ZONE_LEVELS: readonly FibLevel[] = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89].map((n, i) => ({
    ratio: n,
    color: i === 0 ? TV_TZ_GRAY : TV_TZ_BLUE,
    enabled: true,
    lineWidth: 2,
    lineStyle: 'solid' as const,
}));

/** Fibonacci sequence (the time multiples drawn as vertical lines). */
const TZ_LEVELS: readonly FibLevel[] = [0, 1, 2, 3, 5, 8, 13, 21, 34].map((n) => ({ ratio: n, color: DEFAULT_DRAWING_COLOR, enabled: true }));

/**
 * Fibonacci time zones: vertical lines at Fibonacci multiples of the base interval
 * (the time span between the two anchors), projecting forward. Each line is an editable
 * level (color / enabled / label) via the gear panel. Price-agnostic — the lines span
 * the full pane height and don't affect the price scale.
 */
export class FibTimeZones extends FibRatios {
    readonly type = 'fibtimezones' as const;

    /** TradingView's look (module 308132), new drawings only: 11 levels with their own lines, the number beside each
     *  line, bands between them when Background is on, a dashed grey trend line between the two points. */
    declare tv?: boolean;
    declare background?: boolean;
    declare fillOpacity?: number;
    declare showLabels?: boolean;
    declare labelH?: FibLabelH;
    declare labelV?: FibLabelV;
    declare trendline?: boolean;
    declare trendColor?: string;
    declare trendWidth?: number;
    declare trendStyle?: 'solid' | 'dashed' | 'dotted';
    declare fontSize?: number;

    constructor(init: ConstructorParameters<typeof FibRatios>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.levels = TV_FIB_TIME_ZONE_LEVELS.map((l) => ({ ...l }));
            this.style = { ...this.style, lineWidth: 2, lineStyle: 'solid' };
            this.background = false;
            this.fillOpacity = 0.2;
            this.showLabels = true;
            this.labelH = 'right';
            this.labelV = 'bottom';
            this.trendline = true;
            this.trendColor = TV_TZ_GRAY;
            this.trendWidth = 1;
            this.trendStyle = 'dashed';
            this.fontSize = 12;
        }
    }

    defaultLevels(): readonly FibLevel[] {
        return TZ_LEVELS;
    }

    zoneLines(proj: Projector): FibZoneLine[] | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const unit = b.time - a.time;
        if (Math.abs(unit) < 1e-9) return null;
        const out: FibZoneLine[] = [];
        for (const lv of this.levels) {
            if (!lv.enabled) continue;
            out.push({ n: lv.ratio, color: lv.color, label: lv.label, x: proj.xOf(timeBetween(proj, a.time, b.time, lv.ratio)) });
        }
        return out;
    }

    entryLines(proj: Projector): FibEntryLine[] | null {
        const lines = this.zoneLines(proj);
        if (!lines) return null;
        const h = proj.height;
        if (this.tv) {
            // TradingView: the number 2 px beside the line (Right = right of it), at the pane's top, middle or bottom.
            const rect = proj.paneRect?.(this.paneId) ?? { top: 0, height: h };
            const fs = this.fontSize ?? 12;
            const v = this.labelV ?? 'bottom';
            const y = v === 'top' ? rect.top + fs / 2 + 3 : v === 'middle' ? rect.top + rect.height / 2 : rect.top + rect.height - fs / 2 - 3;
            const hz = this.labelH ?? 'right';
            const byLevel = new Map(this.levels.map((l) => [l.ratio, l] as const));
            return lines.map((l) => {
                const lv = byLevel.get(l.n);
                return {
                    color: l.color,
                    x1: l.x,
                    y1: rect.top,
                    x2: l.x,
                    y2: rect.top + rect.height,
                    numberText: this.showLabels === false ? '' : String(l.n),
                    numberX: hz === 'right' ? l.x + 2 : hz === 'left' ? l.x - 2 : l.x,
                    numberY: y,
                    numberAlign: hz === 'right' ? 'left' : hz === 'left' ? 'right' : 'center',
                    labelX: l.x,
                    labelY: y,
                    ...(lv?.lineWidth ? { lineWidth: lv.lineWidth } : {}),
                    ...(lv?.lineStyle ? { lineStyle: lv.lineStyle } : {}),
                };
            });
        }
        return lines.map((l) => ({
            color: l.color,
            label: l.label,
            x1: l.x,
            y1: 0,
            x2: l.x,
            y2: h,
            numberText: String(l.n),
            numberX: l.x,
            numberY: 9,
            numberAlign: 'center',
            labelX: l.x,
            labelY: 24,
        }));
    }

    /** TradingView's bands (Background on): between consecutive shown lines, the full pane, the later line's colour. */
    override fillBands(proj: Projector): Array<{ color: string; x: number; y: number; w: number; h: number }> {
        if (!this.tv || !this.background) return [];
        const lines = this.zoneLines(proj);
        if (!lines) return [];
        const rect = proj.paneRect?.(this.paneId) ?? { top: 0, height: proj.height };
        const out: Array<{ color: string; x: number; y: number; w: number; h: number }> = [];
        for (let i = 1; i < lines.length; i += 1) {
            const a = lines[i - 1]!;
            const b = lines[i]!;
            out.push({ color: b.color, x: Math.min(a.x, b.x), y: rect.top, w: Math.abs(b.x - a.x), h: rect.height });
        }
        return out;
    }

    protected override writeProps(): Record<string, unknown> {
        const out = super.writeProps();
        if (this.tv) {
            Object.assign(out, {
                tv: true,
                background: this.background === true,
                fillOpacity: this.fillOpacity,
                showLabels: this.showLabels !== false,
                labelH: this.labelH,
                labelV: this.labelV,
                trendline: this.trendline !== false,
                trendColor: this.trendColor,
                trendWidth: this.trendWidth,
                trendStyle: this.trendStyle,
                fontSize: this.fontSize,
            });
        }
        return out;
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (props.tv === true) this.tv = true;
        for (const k of ['background', 'showLabels', 'trendline'] as const) if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        if (typeof props.fillOpacity === 'number' && Number.isFinite(props.fillOpacity)) this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
        if (props.labelH === 'left' || props.labelH === 'center' || props.labelH === 'right') this.labelH = props.labelH;
        if (props.labelV === 'top' || props.labelV === 'middle' || props.labelV === 'bottom') this.labelV = props.labelV;
        if (typeof props.trendColor === 'string') this.trendColor = props.trendColor;
        if (typeof props.trendWidth === 'number' && Number.isFinite(props.trendWidth)) this.trendWidth = Math.min(10, Math.max(1, props.trendWidth));
        if (props.trendStyle === 'solid' || props.trendStyle === 'dashed' || props.trendStyle === 'dotted') this.trendStyle = props.trendStyle;
        if (typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
        // TradingView's levels each carry their own line. Levels remembered from the old look have none and would take
        // the drawing's old dashed default (the user's report, 2026-10-31): give them TradingView's 2 px solid.
        if (this.tv) this.levels = this.levels.map((l) => ({ ...l, lineWidth: l.lineWidth ?? 2, lineStyle: l.lineStyle ?? 'solid' }));
    }

    priceRange(): { min: number; max: number } | null {
        return null; // vertical lines impose no price constraint
    }

    override timeExtent(): { min: number; max: number } | null {
        return null; // the zones project far forward → never time-cull
    }
}
