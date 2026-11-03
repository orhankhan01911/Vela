import { describe, expect, it } from 'vitest';

import { RANGE_PRESETS, snapRangePreset } from '../src/widget/bottombar';

const preset = (id: string) => RANGE_PRESETS.find((p) => p.id === id)!;
const VRP = ['15', '30', '60', '240', '720', 'D', 'W'];

describe('range chips on a chart with its own timeframes', () => {
    it('keeps a chip whose timeframe the chart offers', () => {
        expect(snapRangePreset(preset('3M'), VRP)).toBe(preset('3M'));
    });

    it('moves 7D (5m) and 1D (1m) to 15m, fetching the same window', () => {
        const d7 = snapRangePreset(preset('7D'), VRP);
        expect(d7.tf).toBe('15');
        expect(d7.bars * 15).toBeGreaterThanOrEqual(preset('7D').bars * 5);
        expect(snapRangePreset(preset('1D'), VRP).tf).toBe('15');
        expect(snapRangePreset(preset('7D'), VRP).preset).toBe('1W');
    });
});
