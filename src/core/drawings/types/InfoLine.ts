import type { SettingsSchema } from '../schema';
import { LINE_FIELDS, TEXT_FIELDS, LINE_TEXT_ALIGN_FIELDS } from '../schema';
import { LINE_STATS_FIELDS, statsOf, type LineStats } from './lineStats';
import { TwoPointLine } from './TwoPointLine';

/** TradingView's info line: a segment with its stats box (price, percent, bars, time, distance, angle) under the middle. */
export class InfoLine extends TwoPointLine {
    readonly type = 'infoline' as const;
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
}
