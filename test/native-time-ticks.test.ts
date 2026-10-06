import { describe, expect, it } from 'vitest';
import { timeTicks } from '../src/renderers/native/chrome/ticks';

const DAY = 86_400_000;
const H = 3_600_000;
const NY = -4 * H; // EDT

describe('timeTicks: calendar-aware, gap-aware', () => {
    it('never leaves fewer than 3 date labels on a narrow view of daily bars', () => {
        const to = Date.UTC(2026, 9, 6);
        for (const days of [20, 40, 60, 90, 120, 200, 400]) {
            expect(timeTicks(to - days * DAY, to, 5, NY).length).toBeGreaterThanOrEqual(3);
        }
    });

    it('puts month ticks on the 1st, not on 30-day blocks (no "Sep 4")', () => {
        const to = Date.UTC(2026, 9, 6);
        const labels = timeTicks(to - 120 * DAY, to, 5, NY).map((t) => t.label);
        expect(labels).toEqual(['Jul', 'Aug', 'Sep', 'Oct']);
    });

    it('puts week ticks on Mondays', () => {
        const to = Date.UTC(2026, 9, 6);
        for (const t of timeTicks(to - 40 * DAY, to, 5, NY)) {
            expect(new Date(t.time + NY).getUTCDay()).toBe(1);
        }
    });

    it('drops weekend midnights on intraday bars and labels the Monday open once', () => {
        const times: number[] = [];
        for (const d of [1, 2, 5]) {
            for (let t = Date.UTC(2026, 9, d, 13, 30); t < Date.UTC(2026, 9, d, 20); t += 900_000) times.push(t);
        }
        const labels = timeTicks(times[0]!, times[times.length - 1]!, 5, NY, { times, intervalMs: 900_000 }).map((t) => t.label);
        expect(labels).not.toContain('Oct 3');
        expect(labels).not.toContain('Oct 4');
        expect(labels.filter((l) => l === 'Oct 5')).toHaveLength(1);
        // And the Monday label sits on the first Monday bar, not in the gap.
        const mon = timeTicks(times[0]!, times[times.length - 1]!, 5, NY, { times, intervalMs: 900_000 }).find((t) => t.label === 'Oct 5')!;
        expect(mon.time).toBe(Date.UTC(2026, 9, 5, 13, 30));
    });

    it('is unchanged on a 24/7 market with no gaps', () => {
        const times: number[] = [];
        for (let t = Date.UTC(2026, 9, 1); t < Date.UTC(2026, 9, 6); t += 900_000) times.push(t);
        const a = timeTicks(times[0]!, times[times.length - 1]!, 5, 0);
        const b = timeTicks(times[0]!, times[times.length - 1]!, 5, 0, { times, intervalMs: 900_000 });
        expect(b).toEqual(a);
    });

    it('labels a snapped tick with the date of the bar it lands on (2-day step on a Sunday)', () => {
        const times: number[] = [];
        for (const d of [28, 29, 30, 31]) for (let t = Date.UTC(2026, 8, d, 13, 30); t < Date.UTC(2026, 8, d, 20); t += 900_000) times.push(t);
        for (const d of [1, 2, 5]) for (let t = Date.UTC(2026, 9, d, 13, 30); t < Date.UTC(2026, 9, d, 20); t += 900_000) times.push(t);
        for (const days of [6, 8, 10]) {
            const last = times[times.length - 1]!;
            const ticks = timeTicks(last - days * DAY, last + 3 * H, 8, NY, { times, intervalMs: 900_000 });
            for (const tk of ticks) {
                const d = new Date(tk.time + NY);
                if (/^[A-Z][a-z]{2} \d+$/.test(tk.label)) expect(tk.label).toBe(`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]} ${d.getUTCDate()}`);
            }
        }
    });
});
