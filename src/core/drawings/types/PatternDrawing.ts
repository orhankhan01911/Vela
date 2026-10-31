import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS } from '../schema';
import { distToPolyline, handleAt } from '../hittest';

/** TradingView's pattern label text (white). */
export const TV_PATTERN_TEXT = '#FFFFFF'; // palette-exempt: TradingView's white label text

/** A price-leg ratio as TradingView prints it: |b − a| / |a − before|, to 3 decimals (NaN when the base leg is flat). */
export function legRatio(before: number, a: number, b: number): number {
    return Math.round((1e3 * Math.abs(b - a)) / Math.abs(a - before)) / 1e3;
}

/**
 * Shared base for the pattern tools (harmonic XABCD / ABCD, Elliott waves, head &
 * shoulders): a fixed-vertex polyline whose anchors are labelled, optionally tinted,
 * and optionally annotated with consecutive-leg ratios. Each subclass only supplies its
 * vertex labels (which fix the anchor count) and toggles ratios / fill / neckline.
 */
export abstract class PatternDrawing extends Drawing {
    /** TradingView's look (new drawings of a tool that has one, see {@link tvPattern}): the point names and ratios in
     *  boxes of the line colour, dotted ratio lines, the background its own switch. */
    declare tv?: boolean;
    declare fillBackground?: boolean;
    declare textColor?: string;
    declare fontSize?: number;
    declare labelBold?: boolean;
    declare labelItalic?: boolean;

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        if (!init.props && this.tvPattern()) {
            this.tv = true;
            this.fillBackground = true;
            this.textColor = TV_PATTERN_TEXT;
            this.fontSize = 12;
            this.labelBold = false;
            this.labelItalic = false;
        }
    }

    /** Whether a new one takes TradingView's look (the tools audited so far). */
    protected tvPattern(): boolean {
        return false;
    }

    /** TradingView's dotted ratio lines: the two points each joins and the ratio printed at its middle. */
    tvRatioLines(): Array<{ from: number; to: number; ratio: number }> {
        return [];
    }

    /** TradingView's triangle pattern: the A–C and B–D lines run to their apex, closed as a dotted, filled triangle. */
    tvConverging(): boolean {
        return false;
    }

    /** Whether TradingView's pattern has a Background (a filled part). */
    tvBackground(): boolean {
        return this.fillTriangles().length > 0 || this.tvConverging();
    }

    /** TradingView draws the dotted ratio lines 1 px (XABCD, Cypher) or in the line's width (ABCD). */
    tvRatioLineWidth(): number {
        return 1;
    }

    /** The label drawn at each anchor (empty string ⇒ no label). Its length is the vertex count. */
    abstract vertexLabels(): readonly string[];
    /** Show consecutive-leg retracement ratios (harmonic patterns). */
    legRatios(): boolean {
        return false;
    }
    /** Vertex-index triples to tint (the harmonic body), or none. */
    fillTriangles(): ReadonlyArray<readonly [number, number, number]> {
        return [];
    }
    /** Write the vertex labels on plates in the line color (head & shoulders), not as bare text. */
    labelPlates(): boolean {
        return false;
    }
    /** Two vertex indices whose line is drawn as an extended neckline (head & shoulders), or null. */
    necklineIndices(): readonly [number, number] | null {
        return null;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        const n = this.vertexLabels().length;
        const slots: AnchorSlot[] = [];
        for (let i = 0; i < n; i += 1) slots.push({ role: `p${i}`, free: 'both' });
        return { min: n, max: n, slots };
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const pts: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            pts.push([proj.xOf(a.time), y]);
        }
        return pts;
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const pts = this.handlePoints(proj);
        return pts.length >= 2 && distToPolyline(px, py, pts) <= tol;
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const pts = this.handlePoints(proj);
        if (pts.length === 0) return null;
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.anchors.length === 0) return null;
        const ps = this.anchors.map((a) => a.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    // ── harmonic validation hooks (overridden by HarmonicPattern; null = not a validated pattern) ──
    /** The harmonic pattern's name (drawn as a badge), or null for a plain pattern. */
    patternName(): string | null {
        return null;
    }
    /** Whether the leg ratio shown at vertex `i` is within the pattern's ideal band (null = no rule). */
    ratioOk(_i: number): boolean | null {
        return null;
    }
    /** Whether ALL the pattern's defining ratios are satisfied (null = not enough points / not harmonic). */
    valid(): boolean | null {
        return null;
    }

    /** Consecutive-leg ratio at vertex `i` (≥2): |leg(i-1,i)| / |leg(i-2,i-1)| in price. */
    ratioAt(i: number): number | null {
        const a = this.anchors[i - 2];
        const b = this.anchors[i - 1];
        const c = this.anchors[i];
        if (!a || !b || !c) return null;
        const prev = Math.abs(b.price - a.price);
        return prev < 1e-9 ? null : Math.abs(c.price - b.price) / prev;
    }

    schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ...(this.fillTriangles().length ? FILL_FIELDS : [])] };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        if (!this.tv) return super.writeProps();
        return {
            tv: true,
            fillBackground: this.fillBackground !== false,
            textColor: this.textColor,
            fontSize: this.fontSize,
            labelBold: this.labelBold === true,
            labelItalic: this.labelItalic === true,
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        if (props.tv === true) this.tv = true;
        for (const k of ['fillBackground', 'labelBold', 'labelItalic'] as const) if (typeof props[k] === 'boolean') this[k] = props[k] as boolean;
        if (typeof props.textColor === 'string') this.textColor = props.textColor;
        if (typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
    }
}
