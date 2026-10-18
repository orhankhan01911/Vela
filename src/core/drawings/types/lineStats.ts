import type { DrawingPoint } from '../geometry';
import type { Projector } from '../geometry';
import type { SettingsField } from '../schema';

/**
 * TradingView's line stats (trend line, ray, extended line, info line): a box near the line reading the price
 * range, percent change, bar count, time span, pixel distance and on-screen angle. Each part has its own switch.
 */
export interface LineStats {
    price: boolean;
    percent: boolean;
    bars: boolean;
    date: boolean;
    distance: boolean;
    angle: boolean;
    /** Where the box sits: by the first point, the middle of the line or the second point. */
    position: 'left' | 'center' | 'right';
}

export const NO_STATS: LineStats = { price: false, percent: false, bars: false, date: false, distance: false, angle: false, position: 'right' };
/** The info line shows every part, under the middle of the line. */
export const ALL_STATS: LineStats = { price: true, percent: true, bars: true, date: true, distance: true, angle: true, position: 'center' };

export function readStats(raw: unknown, defaults: LineStats): LineStats {
    const s = { ...defaults };
    if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        for (const k of ['price', 'percent', 'bars', 'date', 'distance', 'angle'] as const) if (typeof r[k] === 'boolean') s[k] = r[k] as boolean;
        if (r.position === 'left' || r.position === 'center' || r.position === 'right') s.position = r.position;
    }
    return s;
}

/** A line tool's stats as drawn: what it stored (a settings edit may leave only the changed part) over its type's
 *  defaults (the info line shows everything, the others nothing). Null for a tool without stats. */
export function statsOf(d: { type: string; stats?: unknown }): LineStats | null {
    if (!STATS_TYPES.has(d.type)) return null;
    return readStats(d.stats, d.type === 'infoline' ? ALL_STATS : NO_STATS);
}

export const STATS_TYPES: ReadonlySet<string> = new Set(['trendline', 'ray', 'extendedline', 'infoline']);

export function anyStats(s: LineStats | undefined): boolean {
    return !!s && (s.price || s.percent || s.bars || s.date || s.distance || s.angle);
}

export const LINE_STATS_FIELDS: SettingsField[] = [
    { path: 'stats.price', label: 'Stats: price range', kind: 'boolean', group: 'behavior' },
    { path: 'stats.percent', label: 'Stats: percent change', kind: 'boolean', group: 'behavior' },
    { path: 'stats.bars', label: 'Stats: bars', kind: 'boolean', group: 'behavior' },
    { path: 'stats.date', label: 'Stats: time span', kind: 'boolean', group: 'behavior' },
    { path: 'stats.distance', label: 'Stats: distance', kind: 'boolean', group: 'behavior' },
    { path: 'stats.angle', label: 'Stats: angle', kind: 'boolean', group: 'behavior' },
    {
        path: 'stats.position',
        label: 'Stats position',
        kind: 'select',
        options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }],
        group: 'behavior',
    },
];

/** `1d 2h 30m` for a span in ms (largest units first, zero parts left out). */
export function formatSpan(ms: number): string {
    let m = Math.round(Math.abs(ms) / 60000);
    if (m === 0) return `${Math.round(Math.abs(ms) / 1000)}s`;
    const d = Math.floor(m / 1440);
    m -= d * 1440;
    const h = Math.floor(m / 60);
    m -= h * 60;
    return [d ? `${d}d` : '', h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
}

/** A price difference with the decimals of the price level it is measured at (`ref`). */
function fmtPrice(v: number, ref: number): string {
    const a = Math.abs(ref);
    const dp = a >= 10 ? 2 : a >= 1 ? 4 : 6;
    return v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** The stats box's text rows, TradingView's order: price, bars + time + distance, angle. Empty when all are off. */
export function lineStatsRows(s: LineStats, a: DrawingPoint, b: DrawingPoint, p: [number, number, number, number], proj: Projector): string[] {
    const rows: string[] = [];
    const diff = b.price - a.price;
    const pct = a.price !== 0 ? (diff / Math.abs(a.price)) * 100 : 0;
    const price = s.price ? fmtPrice(diff, Math.max(Math.abs(a.price), Math.abs(b.price))) : '';
    const percent = s.percent ? `${pct >= 0 ? '' : '−'}${Math.abs(pct).toFixed(2)}%` : '';
    if (price || percent) rows.push(price && percent ? `${price.replace('-', '−')} (${percent})` : price.replace('-', '−') || percent);
    const parts: string[] = [];
    if (s.bars) {
        const bars = proj.barsBetween ? Math.abs(Math.round(proj.barsBetween(a.time, b.time))) : 0;
        parts.push(`${bars} bars${s.date ? ` (${formatSpan(b.time - a.time)})` : ''}`);
    } else if (s.date) parts.push(formatSpan(b.time - a.time));
    if (s.distance) parts.push(`distance: ${Math.round(Math.hypot(p[2] - p[0], p[3] - p[1]))} px`);
    if (parts.length) rows.push(parts.join(', '));
    if (s.angle) {
        // On-screen angle, up is positive (pixel y grows down), as the eye reads the line from its first point.
        const deg = (Math.atan2(-(p[3] - p[1]), p[2] - p[0]) * 180) / Math.PI;
        rows.push(`${deg < 0 ? '−' : ''}${Math.abs(deg).toFixed(2)}°`);
    }
    return rows;
}
