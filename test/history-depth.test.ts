import { describe, expect, it } from 'vitest';

import { HISTORY_MAX_BARS, HISTORY_MIN_BARS, historyBars, historyMode, isoDay, parseIsoDay } from '../src/workspace/history-depth';
import { sanitizeState } from '../src/state/document';

const sanitizeCellState = (c: Record<string, unknown>) => sanitizeState({ version: 1, layout: '1', charts: [{ id: 'c1', ...c }] })?.charts[0];

const NOW = Date.UTC(2026, 9, 18, 12);

describe('history depth (bars / days / start date)', () => {
    it('a bar count stays a bar count', () => {
        expect(historyMode({ bars: 5000 })).toBe('bars');
        expect(historyBars({ bars: 5000 }, '1S', NOW)).toBe(5000);
        expect(historyBars({}, '60', NOW)).toBeUndefined();
    });

    it('days become bars of the timeframe being loaded', () => {
        const s = { bars: 50000, historyDays: 7 };
        expect(historyMode(s)).toBe('days');
        expect(historyBars(s, '60', NOW)).toBe(7 * 24 + 1); // 1h
        expect(historyBars(s, '1S', NOW)).toBe(7 * 86_400 + 1); // 1s: 604 801, not 50 000
        expect(historyBars(s, 'D', NOW)).toBe(HISTORY_MIN_BARS); // 8 daily bars -> the floor
    });

    it('a start date counts from now, and wins over days', () => {
        const s = { historyDays: 1, historySince: NOW - 3 * 86_400_000 };
        expect(historyMode(s)).toBe('since');
        expect(historyBars(s, '1', NOW)).toBe(3 * 1440 + 1);
    });

    it('caps a huge span', () => {
        expect(historyBars({ historyDays: 365 }, '1S', NOW)).toBe(HISTORY_MAX_BARS);
    });

    it('a timeframe it cannot measure keeps the bar count', () => {
        expect(historyBars({ bars: 2000, historyDays: 7 }, '100T', NOW)).toBe(2000);
    });

    it('dates: yyyy-mm-dd both ways, no future dates', () => {
        expect(isoDay(Date.UTC(2026, 9, 11))).toBe('2026-10-11');
        expect(parseIsoDay('2026-10-11', NOW)).toBe(Date.UTC(2026, 9, 11));
        expect(parseIsoDay('2026-10-30', NOW)).toBeNull();
        expect(parseIsoDay('11/10/2026', NOW)).toBeNull();
    });

    it('a saved chart keeps its span (one of the two)', () => {
        expect(sanitizeCellState({ bars: 500, historyDays: 7 })).toMatchObject({ bars: 500, historyDays: 7 });
        const both = sanitizeCellState({ historyDays: 7, historySince: NOW });
        expect(both?.historySince).toBe(NOW);
        expect(both?.historyDays).toBeUndefined();
        expect(sanitizeCellState({ historyDays: -1 })?.historyDays).toBeUndefined();
    });
});

describe('history time floor', () => {
    it('a span gives the oldest bar time; a bar count gives none', async () => {
        const { historyFrom } = await import('../src/workspace/history-depth');
        expect(historyFrom({ bars: 5000 }, NOW)).toBeUndefined();
        expect(historyFrom({ historyDays: 7 }, NOW)).toBe(NOW - 7 * 86_400_000);
        expect(historyFrom({ historySince: Date.UTC(2026, 9, 11) }, NOW)).toBe(Date.UTC(2026, 9, 11));
    });
});
