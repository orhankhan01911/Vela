// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chromeHint } from '../src/renderers/shared/chrome-tooltip';
import { DARK_THEME } from '../src/core/theme';

/** A pointer event carrying `pointerType` (jsdom's PointerEvent support varies). */
function pointer(type: string, pointerType: string): Event {
    const e = new MouseEvent(type, { bubbles: type !== 'pointerenter' && type !== 'pointerleave', cancelable: true });
    Object.defineProperty(e, 'pointerType', { value: pointerType });
    return e;
}

/** The open tip, if any: the only fixed-position element with the hint's text. */
const tipOf = (text: string): HTMLElement | undefined =>
    [...document.body.querySelectorAll<HTMLElement>('div')].find((d) => d.textContent === text && d.style.position === 'fixed');

/**
 * ⓘ hints in the settings dialogs (2026-10-26): hovering one showed nothing on the desktop (the tip opened inside the
 * chart, BEHIND the dialog's own positioner) and tapping one did nothing on a phone (tips were mouse-only).
 */
describe('chromeHint', () => {
    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    function setup() {
        const host = document.createElement('div'); // the chart
        const dialog = document.createElement('div'); // a dialog in its own positioner
        const label = document.createElement('label');
        const box = document.createElement('input');
        box.type = 'checkbox';
        const { el, dispose } = chromeHint('What this does', { host, theme: () => DARK_THEME });
        label.append(box, el);
        dialog.append(label);
        document.body.append(host, dialog);
        return { host, el, box, dispose };
    }

    it('opens on the top layer, not inside the chart, on mouse hover', () => {
        vi.useFakeTimers();
        const { host, el } = setup();
        el.dispatchEvent(pointer('pointerenter', 'mouse'));
        vi.advanceTimersByTime(300);
        const tip = tipOf('What this does');
        expect(tip).toBeDefined();
        expect(tip!.parentElement).toBe(document.body);
        expect(host.contains(tip!)).toBe(false);
        expect(Number(tip!.style.zIndex)).toBeGreaterThan(1_000_000);
        el.dispatchEvent(pointer('pointerleave', 'mouse'));
        expect(tipOf('What this does')).toBeUndefined();
    });

    it('a finger tap opens it without ticking the box; the next tap anywhere closes it', () => {
        const { el, box } = setup();
        el.dispatchEvent(pointer('pointerdown', 'touch'));
        el.dispatchEvent(pointer('pointerleave', 'touch')); // a touch pointer leaves on lift, before the click
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        expect(tipOf('What this does')).toBeDefined();
        expect(box.checked).toBe(false);
        document.body.dispatchEvent(pointer('pointerdown', 'touch'));
        expect(tipOf('What this does')).toBeUndefined();
    });

    it('a second tap on the same hint closes it', () => {
        const { el } = setup();
        const tap = () => {
            el.dispatchEvent(pointer('pointerdown', 'touch'));
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        };
        tap();
        expect(tipOf('What this does')).toBeDefined();
        tap();
        expect(tipOf('What this does')).toBeUndefined();
    });

    // 2026-10-28 (user: "the i icon is not working"): a mouse click on an ⓘ CLOSED the tip the hover had just opened,
    // and a click before the hover delay cancelled it, so clicking the ⓘ showed nothing.
    it('a mouse click opens it and keeps it open after the pointer leaves, without ticking the box', () => {
        const { el, box } = setup();
        el.dispatchEvent(pointer('pointerdown', 'mouse'));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        expect(tipOf('What this does')).toBeDefined();
        expect(box.checked).toBe(false);
        el.dispatchEvent(pointer('pointerleave', 'mouse'));
        expect(tipOf('What this does')).toBeDefined();
        document.body.dispatchEvent(pointer('pointerdown', 'mouse'));
        expect(tipOf('What this does')).toBeUndefined();
    });

    it('a click on the tip the hover opened keeps it; a second click closes it', () => {
        vi.useFakeTimers();
        const { el } = setup();
        el.dispatchEvent(pointer('pointerenter', 'mouse'));
        vi.advanceTimersByTime(300);
        const click = () => {
            el.dispatchEvent(pointer('pointerdown', 'mouse'));
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        };
        click();
        expect(tipOf('What this does')).toBeDefined();
        el.dispatchEvent(pointer('pointerleave', 'mouse'));
        el.dispatchEvent(pointer('pointerenter', 'mouse'));
        vi.advanceTimersByTime(300);
        expect([...document.body.querySelectorAll('div')].filter((d) => d.textContent === 'What this does').length).toBe(1);
        click();
        expect(tipOf('What this does')).toBeUndefined();
    });

    it('dispose removes an open tip', () => {
        const { el, dispose } = setup();
        el.dispatchEvent(pointer('pointerdown', 'touch'));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        dispose();
        expect(tipOf('What this does')).toBeUndefined();
    });
});
