import type { Projector } from '../geometry';
import { distToSegment, extendRay } from '../hittest';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS, LINE_TEXT_ALIGN_FIELDS } from '../schema';
import { LINE_STATS_FIELDS, statsOf, type LineStats } from './lineStats';
import { TwoPointLine } from './TwoPointLine';

/** A straight line through two anchors, extended to both chart edges. */
export class ExtendedLine extends TwoPointLine {
    readonly type = 'extendedline' as const;
    /** TradingView's stats box; read through `statsOf`. */
    stats!: Partial<LineStats> | undefined;

    protected override writeProps(): Record<string, unknown> {
        return { stats: statsOf(this)! };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (props.stats && typeof props.stats === 'object') this.stats = { ...(props.stats as Partial<LineStats>) };
    }

    override schema(): SettingsSchema {
        return { fields: [...LINE_FIELDS, ...LINE_STATS_FIELDS, ...TEXT_FIELDS, ...LINE_TEXT_ALIGN_FIELDS] };
    }

    override hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const p = this.pixels(proj);
        if (!p) return false;
        const [ex1, ey1, ex2, ey2] = extendRay(p[0], p[1], p[2], p[3], 'both', proj.width, proj.height);
        return distToSegment(px, py, ex1, ey1, ex2, ey2) <= tol;
    }

    // Spans the full width in both directions → never cull by time.
    override timeExtent(): { min: number; max: number } | null {
        return null;
    }
}
