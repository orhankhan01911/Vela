// @vitest-environment jsdom
// The legend's live mark is calm: a small STILL dot (it used to pulse forever, which a
// tester read as an alarm), one short pulse only the first time a row turns live, a
// reload under a second never swaps it for the loading dots, and hovering says what it means.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { InputsUI, LEGEND_STATUS_TIPS, LIVE_RELOAD_GRACE_MS } from '../src/renderers/shared/InputsUI';
import { DARK_THEME } from '../src/core/theme';

let ui: InputsUI | null = null;
afterEach(() => {
    ui?.destroy();
    ui = null;
    document.body.replaceChildren();
    vi.useRealTimers();
});

function setup() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    ui = new InputsUI(container, DARK_THEME, () => ({ top: 0, height: 300, rightAxis: 60 }));
    ui.upsert('ind-1', 'VWAP', [], {});
    const status = container.querySelector<HTMLElement>('[data-legend-status]')!;
    const animate = vi.fn();
    (status as unknown as { animate: typeof animate }).animate = animate;
    return { container, status, animate };
}

describe('legend live status', () => {
    it('live is a still dot: no endless CSS animation', () => {
        const { status } = setup();
        ui!.setStatus('ind-1', 'live');
        expect(status.dataset.legendStatus).toBe('live');
        expect(status.style.animation).toBe('');
        expect(status.style.display).toBe('inline-block');
    });

    it('pulses once, only the first time the row turns live', () => {
        const { animate } = setup();
        ui!.setStatus('ind-1', 'live');
        expect(animate).toHaveBeenCalledTimes(1);
        expect(animate.mock.calls[0]![1]).toMatchObject({ iterations: 1 });
        ui!.setStatus('ind-1', 'live');
        ui!.setStatus('ind-1', 'idle');
        ui!.setStatus('ind-1', 'live');
        expect(animate).toHaveBeenCalledTimes(1);
    });

    it('a quick reload keeps the still dot; a slow one shows the loading dots', () => {
        vi.useFakeTimers();
        const { status } = setup();
        ui!.setStatus('ind-1', 'live');
        ui!.setStatus('ind-1', 'loading');
        vi.advanceTimersByTime(LIVE_RELOAD_GRACE_MS - 100);
        expect(status.dataset.legendStatus).toBe('live');
        ui!.setStatus('ind-1', 'live');
        vi.advanceTimersByTime(LIVE_RELOAD_GRACE_MS * 2);
        expect(status.dataset.legendStatus).toBe('live');

        ui!.setStatus('ind-1', 'loading');
        vi.advanceTimersByTime(LIVE_RELOAD_GRACE_MS + 10);
        expect(status.dataset.legendStatus).toBe('loading');
        expect(status.style.borderTopColor).toBe('currentcolor'); // the spinning ring
        expect(status.getAttribute('aria-label')).toBe('Loading data for this indicator');
        ui!.setStatus('ind-1', 'live');
        expect(status.dataset.legendStatus).toBe('live');
        expect(status.children).toHaveLength(0);
    });

    it('first load (not yet live) shows the loading dots at once', () => {
        const { status } = setup();
        ui!.setStatus('ind-1', 'loading');
        expect(status.dataset.legendStatus).toBe('loading');
        expect(status.style.borderTopColor).toBe('currentcolor'); // the spinning ring
        expect(status.getAttribute('aria-label')).toBe('Loading data for this indicator');
    });

    it('explains itself on hover', () => {
        expect(LEGEND_STATUS_TIPS.live).toMatch(/Live/);
        expect(LEGEND_STATUS_TIPS.loading).toMatch(/Loading/);
    });
});
