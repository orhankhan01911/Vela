// @vitest-environment jsdom
// Tester report 2026-10-18: the chart slowed down as indicators were added. Every value refresh
// rebuilt each legend row's value spans, a DOM change per indicator per frame that woke every
// page-wide DOM observer. Values now update their text in place.
import { describe, it, expect, afterEach } from 'vitest';
import { InputsUI } from '../src/renderers/shared/InputsUI';
import { DARK_THEME } from '../src/core/theme';

let ui: InputsUI | null = null;
afterEach(() => {
    ui?.destroy();
    ui = null;
    document.body.replaceChildren();
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('legend values update in place', () => {
    it('a new value changes the text node only: no nodes added or removed', async () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        ui = new InputsUI(container, DARK_THEME, () => ({ top: 0, height: 300, rightAxis: 60 }));
        ui.upsert('rsi', 'RSI', [], {});
        ui.setPlotValues(new Map([['rsi', [{ value: '51.20', color: '#fff' }, { value: '48.00', color: '#f00' }]]]));
        await flush();

        const records: MutationRecord[] = [];
        const obs = new MutationObserver((r) => records.push(...r));
        obs.observe(container, { childList: true, subtree: true, characterData: true });
        ui.setPlotValues(new Map([['rsi', [{ value: '52.75', color: '#fff' }, { value: '47.10', color: '#f00' }]]]));
        await flush();
        obs.disconnect();

        expect(records.length).toBeGreaterThan(0);
        expect(records.filter((r) => r.type === 'childList')).toEqual([]);
        expect(container.textContent).toContain('52.75');
        expect(container.textContent).toContain('47.10');
    });

    it('fewer values drop the extra spans; more values add them', async () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        ui = new InputsUI(container, DARK_THEME, () => ({ top: 0, height: 300, rightAxis: 60 }));
        ui.upsert('macd', 'MACD', [], {});
        ui.setPlotValues(new Map([['macd', [{ value: '1', color: '#fff' }, { value: '2', color: '#fff' }, { value: '3', color: '#fff' }]]]));
        ui.setPlotValues(new Map([['macd', [{ value: '4', color: '#fff' }]]]));
        expect(container.textContent).toContain('4');
        expect(container.textContent).not.toContain('2');
        ui.setPlotValues(new Map([['macd', [{ value: '5', color: '#fff' }, { value: '6', color: '#0f0' }]]]));
        expect(container.textContent).toContain('56');
    });
});
