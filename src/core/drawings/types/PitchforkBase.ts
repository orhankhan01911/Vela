import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS } from '../schema';
import { extendRay } from '../hittest';
import { fibLevels, LEVEL_BLUE, LEVEL_CORAL, LEVEL_CYAN, LEVEL_GREEN, LEVEL_PINK, LEVEL_RED, LEVEL_TEAL } from '../levelPalette';
import type { FibLevel } from './FibRatios';
import { SegmentDrawing } from './SegmentDrawing';

/**
 * TradingView's pitchfork levels: lines parallel to the median through the base line at `ratio` × the distance
 * from the median to each tine anchor (1 = the tines). 0.5 and 1 on, the rest a tick away.
 */
export const PITCHFORK_LEVELS: readonly FibLevel[] = fibLevels([
    { ratio: 0.25, color: LEVEL_CORAL, enabled: false },
    { ratio: 0.382, color: LEVEL_GREEN, enabled: false },
    { ratio: 0.5, color: LEVEL_TEAL },
    { ratio: 0.618, color: LEVEL_TEAL, enabled: false },
    { ratio: 0.75, color: LEVEL_CYAN, enabled: false },
    { ratio: 1, color: LEVEL_BLUE },
    { ratio: 1.5, color: LEVEL_PINK, enabled: false },
    { ratio: 1.75, color: LEVEL_PINK, enabled: false },
    { ratio: 2, color: LEVEL_CORAL, enabled: false },
]);

/** TradingView's median line color. */
export const PITCHFORK_MEDIAN = LEVEL_RED;

/** The pixel frame every pitchfork shares: where the median starts, the point on the base line it passes, the two
 *  tine anchors, its direction, and any construction segments of the variant. */
export interface PitchforkFrame {
    S: [number, number];
    M: [number, number];
    P1: [number, number];
    P2: [number, number];
    d: [number, number];
    construction: Array<[number, number, number, number]>;
}

/**
 * Shared base of the pitchforks (Andrews, Schiff, modified Schiff, inside). Like TradingView's: editable levels
 * (ratio / color / on), the bands between neighbouring levels filled in the outer level's color (`background`),
 * lines extended back past the base line (`extendLines`) and a median of its own color. A pitchfork saved before
 * these existed draws as it did: only the tines (level 1) in the line color, no fill, median in the line color.
 */
export abstract class PitchforkBase extends SegmentDrawing {
    // `!` (no initializer): the base constructor runs readProps first; the constructor fills the defaults.
    levels!: FibLevel[];
    background!: boolean;
    fillOpacity!: number;
    extendLines!: boolean;
    /** The median's color; empty = the line color. */
    medianColor!: string;

    constructor(init: ConstructorParameters<typeof SegmentDrawing>[0]) {
        super(init);
        if (!this.levels) this.levels = PITCHFORK_LEVELS.map((l) => ({ ...l }));
        if (this.background === undefined) this.background = true;
        if (this.fillOpacity === undefined) this.fillOpacity = 0.2;
        if (this.extendLines === undefined) this.extendLines = false;
        if (this.medianColor === undefined) this.medianColor = PITCHFORK_MEDIAN;
    }

    /** The frame once all three points are set; the partial preview segment while placing; null off-pane. */
    protected abstract frame(proj: Projector): PitchforkFrame | { placing: [number, number, number, number] } | null;

    override editableLevels(): FibLevel[] | null {
        return this.levels;
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const f = this.frame(proj);
        if (!f) return null;
        if ('placing' in f) return { segments: [f.placing], fill: null };
        const { S, M, P1, P2, d } = f;
        const w = proj.width;
        const h = proj.height;
        const ext = this.extendLines ? 'both' : 'right';
        const ray = (x: number, y: number): [number, number, number, number] => extendRay(x, y, x + d[0], y + d[1], ext, w, h);
        const at = (r: number, P: [number, number]): [number, number] => [M[0] + r * (P[0] - M[0]), M[1] + r * (P[1] - M[1])];
        const on = this.levels.filter((l) => l.enabled).sort((a, b) => a.ratio - b.ratio);
        const colored: NonNullable<SegmentGeometry['colored']> = [];
        const median = ray(S[0], S[1]); // from S along d (for the inside pitchfork S is M itself)
        colored.push({ seg: median, color: this.medianColor || this.style.lineColor });
        for (const lv of on) {
            for (const P of [P1, P2]) {
                const b = at(lv.ratio, P);
                colored.push({ seg: ray(b[0], b[1]), color: lv.color });
            }
        }
        const rMax = on.length ? Math.max(1, on[on.length - 1]!.ratio) : 1;
        const e1 = at(rMax, P1);
        const e2 = at(rMax, P2);
        const fills: NonNullable<SegmentGeometry['fills']> = [];
        if (this.background && on.length) {
            // Far along the lines, to the right (and back to the left when extended); the canvas clips it.
            const len = Math.hypot(d[0], d[1]) || 1;
            const s = d[0] < 0 ? -1 : 1;
            const fx = (s * d[0] * 1e5) / len;
            const fy = (s * d[1] * 1e5) / len;
            const band = (a: [number, number], b: [number, number]): Array<[number, number]> =>
                this.extendLines
                    ? [[a[0] - fx, a[1] - fy], [a[0] + fx, a[1] + fy], [b[0] + fx, b[1] + fy], [b[0] - fx, b[1] - fy]]
                    : [a, [a[0] + fx, a[1] + fy], [b[0] + fx, b[1] + fy], b];
            const rs = [0, ...on.map((l) => l.ratio)];
            for (let i = 1; i < rs.length; i += 1) {
                const color = on[i - 1]!.color;
                for (const P of [P1, P2]) fills.push({ color, pts: band(at(rs[i - 1]!, P), at(rs[i]!, P)) });
            }
        }
        return {
            segments: [[e1[0], e1[1], e2[0], e2[1]], ...f.construction], // the base line across the outermost level
            fill: null,
            colored,
            fills,
            fillAlpha: this.fillOpacity,
        };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.anchors.length === 0) return null;
        const ps = this.anchors.map((p) => p.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ...TEXT_FIELDS] };
    }

    protected override writeProps(): Record<string, unknown> {
        return {
            levels: this.levels.map((l) => ({ ...l })),
            background: this.background,
            fillOpacity: this.fillOpacity,
            extendLines: this.extendLines,
            medianColor: this.medianColor,
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (Array.isArray(props.levels)) {
            const parsed = props.levels
                .filter((v): v is FibLevel => !!v && typeof v === 'object' && typeof (v as FibLevel).ratio === 'number' && typeof (v as FibLevel).color === 'string')
                .map((v) => ({ ratio: v.ratio, color: v.color, enabled: v.enabled !== false }));
            if (parsed.length) this.levels = parsed;
        }
        if (typeof props.background === 'boolean') this.background = props.background;
        if (typeof props.fillOpacity === 'number') this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
        if (typeof props.extendLines === 'boolean') this.extendLines = props.extendLines;
        if (typeof props.medianColor === 'string') this.medianColor = props.medianColor;
    }
}
