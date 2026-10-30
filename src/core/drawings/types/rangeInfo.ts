import type { DrawingPoint } from '../geometry';
import { formatSpan } from './lineStats';

/** TradingView's range-tool Stats parts (price range, date & price range, date range), its order and names. */
export const RANGE_PARTS = [
    { key: 'priceRange', label: 'Price range' },
    { key: 'percent', label: 'Percent change' },
    { key: 'pips', label: 'Change in pips' },
    { key: 'bars', label: 'Bars range' },
    { key: 'dateTime', label: 'Date/time range' },
    { key: 'volume', label: 'Volume' },
] as const;
export type RangePart = (typeof RANGE_PARTS)[number]['key'];
export type RangeInfo = Partial<Record<RangePart, boolean>>;

/** TradingView's range plate (factory defaults, read from TradingView's code 2026-10-30: white 12 px on cold gray 800). */
export const RANGE_LABEL = { color: '#ffffff', size: 12, background: '#1a1a1a' } as const; // palette-exempt: TradingView's plate

/** `13.9 K`: TradingView's volume, two decimals at most with a space before the unit. */
export function formatRangeVolume(v: number): string {
    const [n, unit] = v >= 1e9 ? [v / 1e9, ' B'] : v >= 1e6 ? [v / 1e6, ' M'] : v >= 1e3 ? [v / 1e3, ' K'] : [v, ''];
    return `${Number(n.toFixed(2))}${unit}`;
}

/** What the plate needs besides the two points: the price scale's step, the bars between them and their volume. */
export interface RangeFacts {
    tick: number;
    bars?: number;
    volume?: number;
}

/**
 * The plate's lines, TradingView's rules (its date & price range code): `1,219.8 (1.48%) 12,198` (the change at the
 * tick's decimals, a minus sign − on a fall, pips after a space when percent is shown, else after a comma), then
 * `49 bars, 4h 5m`, then `Vol 13.9 K` on its own line.
 */
export function rangeInfoLines(info: RangeInfo, a: DrawingPoint, b: DrawingPoint, f: RangeFacts): string[] {
    const diff = b.price - a.price;
    const t = f.tick > 0 ? f.tick : 0.01;
    const dp = Math.max(0, Math.min(10, Math.round(-Math.log10(t))));
    const sign = (v: number): string => (v < 0 ? '−' : '');
    let price = '';
    if (info.priceRange) price += `${sign(diff)}${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
    if (info.percent) {
        const pct = a.price !== 0 ? Math.round(((100 * diff) / Math.abs(a.price)) * 100) / 100 : 0;
        const s = `${sign(pct)}${Math.abs(pct).toFixed(2)}%`;
        price += info.priceRange ? ` (${s})` : s;
    }
    if (info.pips) {
        const pips = Math.round(diff / t);
        if (info.priceRange) price += info.percent ? ' ' : ', ';
        else if (info.percent) price += ', ';
        price += `${sign(pips)}${Math.abs(pips).toLocaleString('en-US')}`;
    }
    let time = '';
    if (info.bars) time += `${Math.round(f.bars ?? 0)} bars`;
    if (info.dateTime) {
        if (info.bars) time += ', ';
        time += `${b.time < a.time ? '-' : ''}${formatSpan(b.time - a.time)}`;
    }
    const lines = [price, time].filter(Boolean);
    if (info.volume && f.volume != null && Number.isFinite(f.volume)) lines.push(`Vol ${formatRangeVolume(f.volume)}`);
    return lines;
}
