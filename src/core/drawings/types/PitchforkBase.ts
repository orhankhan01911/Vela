import type { AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import type { LineStyle } from '../../model/series';
import { extendRay } from '../hittest';
import { timeBetween } from '../futureAnchors';
import { LEVEL_RED } from '../levelPalette';
import type { FibLevel } from './FibRatios';
import { SegmentDrawing } from './SegmentDrawing';

/** A pitchfork level: a {@link FibLevel} with its own line, like TradingView's level rows (2 px solid by default). */
export interface PitchforkLevel extends FibLevel {
    lineWidth?: number;
    lineStyle?: LineStyle;
}

/**
 * TradingView's pitchfork levels (factory defaults, read from TradingView 2026-10-30): lines parallel to the median
 * through the base line at `ratio` × the distance from the median to each tine anchor (1 = the tines). 0.5 and 1
 * on, the rest a tick away; every level 2 px solid.
 */
export const PITCHFORK_LEVELS: readonly PitchforkLevel[] = [
    { ratio: 0.25, color: '#ffb74d', enabled: false }, // palette-exempt: TradingView's level color
    { ratio: 0.382, color: '#81c784', enabled: false }, // palette-exempt
    { ratio: 0.5, color: '#089981', enabled: true }, // palette-exempt
    { ratio: 0.618, color: '#089981', enabled: false }, // palette-exempt
    { ratio: 0.75, color: '#00bcd4', enabled: false }, // palette-exempt
    { ratio: 1, color: '#2962ff', enabled: true }, // palette-exempt
    { ratio: 1.5, color: '#9c27b0', enabled: false }, // palette-exempt
    { ratio: 1.75, color: '#e91e63', enabled: false }, // palette-exempt
    { ratio: 2, color: '#f77c80', enabled: false }, // palette-exempt
].map((l) => ({ ...l, lineWidth: 2, lineStyle: 'solid' as const }));

/** TradingView's pitchfork Style dropdown: where the median starts. */
export type PitchforkStyle = 'original' | 'schiff' | 'modifiedschiff' | 'inside';
export const PITCHFORK_STYLES: ReadonlyArray<{ value: PitchforkStyle; label: string }> = [
    { value: 'original', label: 'Original' },
    { value: 'schiff', label: 'Schiff' },
    { value: 'modifiedschiff', label: 'Modified Schiff' },
    { value: 'inside', label: 'Inside' },
];
const isForkStyle = (v: unknown): v is PitchforkStyle => PITCHFORK_STYLES.some((s) => s.value === v);
const isLineStyle = (v: unknown): v is LineStyle => v === 'solid' || v === 'dashed' || v === 'dotted';

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
 * Shared base of the pitchforks (Andrews, Schiff, modified Schiff, inside). Like TradingView's: one shape whose Style
 * picks where the median starts (`forkStyle`; each tool starts on its own), editable levels (ratio / line / on), the
 * bands between neighbouring levels filled in the outer level's color (`background`), lines extended back past the
 * base line (`extendLines`) and a median with its own line, which also draws the base and construction lines. A
 * pitchfork saved before these existed draws as it did: only the tines (level 1) in the line color, no fill, median
 * in the line color.
 */
export abstract class PitchforkBase extends SegmentDrawing {
    // `!` (no initializer): the base constructor runs readProps first; the constructor fills the defaults.
    levels!: PitchforkLevel[];
    background!: boolean;
    fillOpacity!: number;
    extendLines!: boolean;
    /** The median's color; empty = the line color. */
    medianColor!: string;
    /** The median's thickness and dash; unset = the drawing's line (pitchforks saved before them). */
    medianWidth?: number;
    medianStyle?: LineStyle;
    /** TradingView's Style dropdown; unset = the tool's own ({@link defaultForkStyle}). */
    forkStyle?: PitchforkStyle;

    /** The style this tool places with. */
    protected abstract readonly defaultForkStyle: PitchforkStyle;

    /** TradingView's levels for a new one of this tool (a method: the base constructor reads it before subclass fields
     *  exist). */
    protected factoryLevels(): readonly PitchforkLevel[] {
        return PITCHFORK_LEVELS;
    }

    constructor(init: ConstructorParameters<typeof SegmentDrawing>[0]) {
        super(init);
        const fresh = !init.props;
        if (!this.levels) this.levels = this.factoryLevels().map((l) => ({ ...l }));
        if (this.background === undefined) this.background = true;
        if (this.fillOpacity === undefined) this.fillOpacity = 0.2;
        if (this.extendLines === undefined) this.extendLines = false;
        if (this.medianColor === undefined) this.medianColor = PITCHFORK_MEDIAN;
        if (fresh && this.medianWidth === undefined) this.medianWidth = 2;
        if (fresh && this.medianStyle === undefined) this.medianStyle = 'solid';
    }

    /** The style in use: the chosen one, else the tool's own (read lazily: subclass fields are set after this
     *  constructor runs). */
    currentForkStyle(): PitchforkStyle {
        return this.forkStyle ?? this.defaultForkStyle;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return {
            min: 3,
            max: 3,
            slots: [
                { role: 'pivot', free: 'both' },
                { role: 'upper', free: 'both' },
                { role: 'lower', free: 'both' },
            ],
        };
    }

    /** The toolbar's color is TradingView's "Use one color" (every level); its thickness and dash restyle every line. */
    override applySettings(patch: Record<string, unknown>): void {
        super.applySettings(patch);
        if (typeof patch['style.lineColor'] === 'string') for (const l of this.levels) l.color = patch['style.lineColor'] as string;
        const w = patch['style.lineWidth'];
        if (typeof w === 'number') {
            for (const l of this.levels) l.lineWidth = w;
            this.medianWidth = w;
        }
        const ls = patch['style.lineStyle'];
        if (isLineStyle(ls)) {
            for (const l of this.levels) l.lineStyle = ls;
            this.medianStyle = ls;
        }
    }

    /** The pixel frame once all three points are set; the partial preview segment while placing; null off-pane. */
    protected frame(proj: Projector): PitchforkFrame | { placing: [number, number, number, number] } | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const px = (p: DrawingPoint): [number, number] | null => {
            const y = proj.yOf(p.price, this.paneId);
            return y == null ? null : [proj.xOf(p.time), y];
        };
        const P0 = px(a);
        const P1 = px(b);
        if (!P0 || !P1) return null;
        const c = this.anchors[2];
        if (!c) return { placing: [P0[0], P0[1], P1[0], P1[1]] }; // pivot → cursor only (placing)
        const P2 = px(c);
        if (!P2) return null;
        const M: [number, number] = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2]; // midpoint of the two tine anchors
        const style = this.currentForkStyle();
        if (style === 'original') return { S: P0, M, P1, P2, d: [M[0] - P0[0], M[1] - P0[1]], construction: [] };
        // The shifted origins: Schiff moves the pivot halfway to p2 in price only, modified Schiff in time and price,
        // and the inside pitchfork takes its slope from that midpoint (B) to p3 and runs through M.
        const half = { time: timeBetween(proj, a.time, b.time, 0.5), price: (a.price + b.price) / 2 };
        const back: [number, number, number, number] = [P0[0], P0[1], P1[0], P1[1]]; // keeps the pivot attached
        if (style === 'inside') {
            const B = px(half);
            if (!B) return null;
            return { S: M, M, P1, P2, d: [P2[0] - B[0], P2[1] - B[1]], construction: [[B[0], B[1], P2[0], P2[1]], back] };
        }
        const S = px(style === 'schiff' ? { time: a.time, price: half.price } : half);
        if (!S) return null;
        return { S, M, P1, P2, d: [M[0] - S[0], M[1] - S[1]], construction: [back] };
    }

    override editableLevels(): FibLevel[] | null {
        return this.levels;
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const f = this.frame(proj);
        if (!f) return null;
        const mColor = this.medianColor || this.style.lineColor;
        const mLine = { color: mColor, lineWidth: this.medianWidth, lineStyle: this.medianStyle };
        if ('placing' in f) return { segments: [f.placing], fill: null };
        const { S, M, P1, P2, d } = f;
        const w = proj.width;
        const h = proj.height;
        const ext = this.extendLines ? 'both' : 'right';
        const ray = (x: number, y: number): [number, number, number, number] => extendRay(x, y, x + d[0], y + d[1], ext, w, h);
        const at = (r: number, P: [number, number]): [number, number] => [M[0] + r * (P[0] - M[0]), M[1] + r * (P[1] - M[1])];
        const on = this.levels.filter((l) => l.enabled).sort((a, b) => a.ratio - b.ratio);
        const colored: NonNullable<SegmentGeometry['colored']> = [];
        colored.push({ seg: ray(S[0], S[1]), ...mLine }); // from S along d (for the inside pitchfork S is M itself)
        for (const lv of on) {
            for (const P of [P1, P2]) {
                const b = at(lv.ratio, P);
                colored.push({ seg: ray(b[0], b[1]), color: lv.color, lineWidth: lv.lineWidth, lineStyle: lv.lineStyle });
            }
        }
        const rMax = on.length ? Math.max(1, on[on.length - 1]!.ratio) : 1;
        const e1 = at(rMax, P1);
        const e2 = at(rMax, P2);
        // The base line across the outermost level and the construction lines: in the median's line, like TradingView
        // (a pitchfork saved before the median had its own line keeps them in its line color).
        const baseLine = this.medianWidth === undefined ? { color: this.style.lineColor } : mLine;
        for (const seg of [[e1[0], e1[1], e2[0], e2[1]] as [number, number, number, number], ...f.construction]) colored.push({ seg, ...baseLine });
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
        return { segments: [], fill: null, colored, fills, fillAlpha: this.fillOpacity };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.anchors.length === 0) return null;
        const ps = this.anchors.map((p) => p.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    /** No Text tab (TradingView's pitchfork has none); color and thickness drive the floating toolbar (TradingView's
     *  has no dash control there). */
    schema(): SettingsSchema {
        return { fields: LINE_FIELDS.filter((f) => f.path !== 'style.lineStyle') };
    }

    protected override writeProps(): Record<string, unknown> {
        return {
            levels: this.levels.map((l) => ({ ...l })),
            background: this.background,
            fillOpacity: this.fillOpacity,
            extendLines: this.extendLines,
            medianColor: this.medianColor,
            ...(this.medianWidth !== undefined ? { medianWidth: this.medianWidth } : {}),
            ...(this.medianStyle !== undefined ? { medianStyle: this.medianStyle } : {}),
            ...(this.forkStyle !== undefined ? { forkStyle: this.forkStyle } : {}),
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (Array.isArray(props.levels)) {
            const parsed = props.levels
                .filter((v): v is PitchforkLevel => !!v && typeof v === 'object' && typeof (v as FibLevel).ratio === 'number' && typeof (v as FibLevel).color === 'string')
                .map((v) => ({
                    ratio: v.ratio,
                    color: v.color,
                    enabled: v.enabled !== false,
                    ...(typeof v.lineWidth === 'number' ? { lineWidth: v.lineWidth } : {}),
                    ...(isLineStyle(v.lineStyle) ? { lineStyle: v.lineStyle } : {}),
                }));
            if (parsed.length) this.levels = parsed;
        }
        if (typeof props.background === 'boolean') this.background = props.background;
        if (typeof props.fillOpacity === 'number') this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
        if (typeof props.extendLines === 'boolean') this.extendLines = props.extendLines;
        if (typeof props.medianColor === 'string') this.medianColor = props.medianColor;
        if (typeof props.medianWidth === 'number') this.medianWidth = props.medianWidth;
        if (isLineStyle(props.medianStyle)) this.medianStyle = props.medianStyle;
        if (isForkStyle(props.forkStyle)) this.forkStyle = props.forkStyle;
    }
}
