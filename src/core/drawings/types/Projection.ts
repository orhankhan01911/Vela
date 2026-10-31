import { type AnchorSlot } from '../Drawing';
import type { Projector, SegmentGeometry } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, FILL_FIELDS } from '../schema';
import { SegmentDrawing } from './SegmentDrawing';

const SWEEP_STEPS = 48;

/** TradingView's projection colours (module 867140): blue to purple, 80 % see-through, a grey border. */
export const TV_PROJECTION = {
    color1: '#2962FF', // palette-exempt: TradingView's tv-blue-500 (the sector's centre)
    color2: '#9C27B0', // palette-exempt: TradingView's grapes-purple-500 (the sector's rim)
    border: '#9C9C9C', // palette-exempt: TradingView's cold-gray-400 border
} as const;

/** TradingView's projection: a filled sector around the first point, its radius the distance to the second point,
 *  swept from the second point's direction to the third's. */
export class Projection extends SegmentDrawing {
    readonly type = 'projection' as const;
    /** TradingView's look: its two-colour background (centre to rim, a radial gradient), grey border, no text. */
    declare tv?: boolean;
    declare color1?: string;
    declare color2?: string;
    /** The background's transparency, % (TradingView's 80). */
    declare transparency?: number;

    constructor(init: ConstructorParameters<typeof SegmentDrawing>[0]) {
        super(init);
        if (!init.props) {
            this.tv = true;
            this.style = { ...this.style, lineColor: TV_PROJECTION.border, lineWidth: 2, lineStyle: 'solid' };
            this.color1 = TV_PROJECTION.color1;
            this.color2 = TV_PROJECTION.color2;
            this.transparency = 80;
            this.fillBackground = true;
        }
    }

    /** The sector in pixels: centre, radius, start angle and signed sweep (the short way round), and the third point
     *  moved onto the circle (TradingView draws its handle there). */
    sector(proj: Projector): { cx: number; cy: number; r: number; a0: number; sweep: number; p2: [number, number]; p3: [number, number] } | null {
        const pts = this.handlePointsRaw(proj);
        if (pts.length < 3) return null;
        const [cx, cy] = pts[0]!;
        const [x2, y2] = pts[1]!;
        const [x3, y3] = pts[2]!;
        const r = Math.hypot(x2 - cx, y2 - cy);
        const a0 = Math.atan2(y2 - cy, x2 - cx);
        const a3 = Math.atan2(y3 - cy, x3 - cx);
        let sweep = a3 - a0;
        if (sweep > Math.PI) sweep -= 2 * Math.PI;
        if (sweep < -Math.PI) sweep += 2 * Math.PI;
        return { cx, cy, r, a0, sweep, p2: [x2, y2], p3: [cx + r * Math.cos(a3), cy + r * Math.sin(a3)] };
    }

    private handlePointsRaw(proj: Projector): Array<[number, number]> {
        const out: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            out.push([proj.xOf(a.time), y]);
        }
        return out;
    }

    /** TradingView's third handle sits on the circle, along the third point's direction. */
    override handlePoints(proj: Projector): Array<[number, number]> {
        const raw = this.handlePointsRaw(proj);
        const s = this.tv ? this.sector(proj) : null;
        return s ? [raw[0]!, raw[1]!, s.p3] : raw;
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 3, max: 3, slots: [{ role: 'center', free: 'both' }, { role: 'radius', free: 'both' }, { role: 'sweep', free: 'both' }] };
    }

    geometry(proj: Projector): SegmentGeometry | null {
        const pts = this.handlePointsRaw(proj);
        if (pts.length < 2) return null;
        const [cx, cy] = pts[0]!;
        const [x2, y2] = pts[1]!;
        if (pts.length < 3) return { segments: [[cx, cy, x2, y2]], fill: null };
        const [x3, y3] = pts[2]!;
        const r = Math.hypot(x2 - cx, y2 - cy);
        const a0 = Math.atan2(y2 - cy, x2 - cx);
        let sweep = Math.atan2(y3 - cy, x3 - cx) - a0;
        if (sweep > Math.PI) sweep -= 2 * Math.PI; // the short way round
        if (sweep < -Math.PI) sweep += 2 * Math.PI;
        const poly: Array<[number, number]> = [[cx, cy]];
        for (let i = 0; i <= SWEEP_STEPS; i += 1) {
            const a = a0 + (sweep * i) / SWEEP_STEPS;
            poly.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        const segments: Array<[number, number, number, number]> = [];
        for (let i = 0; i < poly.length; i += 1) {
            const p = poly[i]!;
            const q = poly[(i + 1) % poly.length]!;
            segments.push([p[0], p[1], q[0], q[1]]);
        }
        return { segments, fill: poly };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.anchors.length === 0) return null;
        const ps = this.anchors.map((p) => p.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    schema(): SettingsSchema {
        if (this.tv) return { fields: [{ path: 'style.lineColor', label: 'Border', kind: 'color', group: 'line' }, { path: 'style.lineWidth', label: 'Width', kind: 'number', group: 'line' }] };
        return { fields: [...LINE_FIELDS, ...FILL_FIELDS] };
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        if (!this.tv) return undefined;
        return { tv: true, color1: this.color1, color2: this.color2, transparency: this.transparency ?? 80, fillBackground: this.fillBackground !== false };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.tv !== true) return;
        this.tv = true;
        if (typeof props.color1 === 'string') this.color1 = props.color1;
        if (typeof props.color2 === 'string') this.color2 = props.color2;
        if (typeof props.transparency === 'number' && Number.isFinite(props.transparency)) this.transparency = Math.min(100, Math.max(0, props.transparency));
        if (typeof props.fillBackground === 'boolean') this.fillBackground = props.fillBackground;
    }
}
