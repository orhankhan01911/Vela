// Interval dropdown: the plugin section registry (src/widget/interval-sections.ts) and the pure
// helpers of the menu (src/widget/interval-menu.ts). DOM-free — node env.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WidgetContext } from '../src/widget/contributions';
import {
    activeIntervalSection,
    intervalSections,
    notifyIntervalSectionsChanged,
    onIntervalSectionsChanged,
    registerIntervalSection,
    type IntervalSection,
} from '../src/widget/interval-sections';
import { currentIntervalLabel, timeframeLongLabel, timeGroupOf } from '../src/widget/interval-menu';

const ctx = { priceStyle: 'candles' } as unknown as WidgetContext;

function section(id: string, order: number, on: number | null, when?: (c: WidgetContext) => boolean): IntervalSection {
    return {
        id,
        title: id,
        order,
        unit: { one: id, many: `${id}s` },
        choices: () => [{ value: 10, label: `10 ${id}s` }],
        current: () => on,
        short: (v) => `${v}${id[0]!.toUpperCase()}`,
        select: vi.fn(),
        leave: vi.fn(),
        ...(when ? { when } : {}),
    };
}

const offs: (() => void)[] = [];
afterEach(() => {
    for (const off of offs.splice(0)) off();
});

describe('interval sections', () => {
    it('lists sections by order and drops the ones whose when() says no', () => {
        offs.push(registerIntervalSection(section('range', 50, null)));
        offs.push(registerIntervalSection(section('tick', 5, null)));
        offs.push(registerIntervalSection(section('delta', 70, null, () => false)));
        expect(intervalSections().map((s) => s.id)).toEqual(['tick', 'range', 'delta']);
        expect(intervalSections(ctx).map((s) => s.id)).toEqual(['tick', 'range']);
    });

    it('finds the section whose bars are on, and labels the interval with it', () => {
        offs.push(registerIntervalSection(section('tick', 5, null)));
        offs.push(registerIntervalSection(section('range', 50, 25)));
        expect(activeIntervalSection(ctx)?.section.id).toBe('range');
        expect(currentIntervalLabel('60', ctx)).toBe('25R');
        expect(currentIntervalLabel('60', null)).toBe('1h');
    });

    it('tells listeners about registrations and plugin notifications, and stops after unsubscribe', () => {
        const fn = vi.fn();
        const off = onIntervalSectionsChanged(fn);
        offs.push(registerIntervalSection(section('tick', 5, null)));
        notifyIntervalSectionsChanged();
        expect(fn).toHaveBeenCalledTimes(2);
        off();
        notifyIntervalSectionsChanged();
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('re-registering an id replaces it; a stale unregister does not remove the new one', () => {
        const offOld = registerIntervalSection(section('tick', 5, null));
        offs.push(registerIntervalSection(section('tick', 6, 100)));
        offOld();
        expect(intervalSections().map((s) => [s.id, s.order])).toEqual([['tick', 6]]);
    });
});

describe('interval menu helpers', () => {
    it('groups timeframes into the TradingView sections', () => {
        expect(['1S', '30S', '1', '45', '60', '240', '1440', 'W', '10080'].map(timeGroupOf)).toEqual([
            'seconds', 'seconds', 'minutes', 'minutes', 'hours', 'hours', 'days', 'days', 'days',
        ]);
        expect(timeGroupOf('nonsense')).toBeNull();
    });

    it('writes rows the way TradingView does', () => {
        expect(timeframeLongLabel('1')).toBe('1 minute');
        expect(timeframeLongLabel('5')).toBe('5 minutes');
        expect(timeframeLongLabel('60')).toBe('1 hour');
        expect(timeframeLongLabel('240')).toBe('4 hours');
        expect(timeframeLongLabel('1440')).toBe('1 day');
        expect(timeframeLongLabel('30S')).toBe('30 seconds');
    });
});
