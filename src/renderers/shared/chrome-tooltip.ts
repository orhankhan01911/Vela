// A themed hover tooltip for RENDERER chrome (legend rows, the drawing toolbar, the
// in-chart dialogs) — the same look as the ui kit's Tooltip, without importing the kit:
// renderer chrome must work on a BARE chart, where no `.vela-ui` token host exists, so
// the tip carries its own tokens (`applyChromeTokens`) like the rest of the in-chart
// chrome. Native `title` tooltips are banned here for the same reason they are banned on
// the widget chrome: they look foreign and cannot be themed.
import type { VelaTheme } from '../../core/options';
import { iconAt } from '../../core/icons';
import { applyChromeTokens } from './theme-tokens';
import { vt } from '../../i18n';

export interface ChromeTooltipOptions {
    /** Positioned container the tip mounts into (the chart plot, the toolbar host…). */
    host: HTMLElement;
    /** Live theme — read at OPEN time, so a theme switch never shows a stale tip. */
    theme: () => VelaTheme;
    /** Tip text — read at OPEN time (dynamic labels: Hide/Show). Empty ⇒ no tip. */
    text: () => string;
    /** Hover delay before the tip opens. Default 700 ms. */
    delayMs?: number;
    /** `below` the anchor (legend rows), to its `right` (a vertical toolbar), or `above`
     *  (controls sitting on the bottom edge). Default below. */
    placement?: 'below' | 'right' | 'above';
    /** Allow wrapping (long texts, e.g. an input's docs). Default false — one line. */
    wrap?: boolean;
    /** A finger tap opens the tip (and the next tap anywhere closes it). For ⓘ hints, which a
     *  touch screen otherwise has no way to read. Default false. */
    tapToOpen?: boolean;
}

/** Above every in-page layer, the dialogs' own positioners included. */
const TIP_Z = '2147483000';

/**
 * Attach the tooltip to an anchor. Returns a disposer that removes the listeners AND any
 * open tip — call it when the anchor's row/dialog is torn down, or a tip visible at that
 * exact moment would outlive its anchor.
 */
export function attachChromeTooltip(anchor: HTMLElement, opts: ChromeTooltipOptions): () => void {
    let timer: number | null = null;
    let tip: HTMLElement | null = null;

    const clear = (): void => {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
        tip?.remove();
        tip = null;
    };

    const show = (): void => {
        const text = opts.text();
        if (!text) return;
        const doc = anchor.ownerDocument;
        tip = doc.createElement('div');
        tip.textContent = vt(text);
        // On the page's top layer, positioned on the viewport. Mounted in `host` (the chart),
        // the tip shared the chart's stacking context and opened BEHIND any dialog that lives
        // in its own positioner (every settings dialog in the app, 2026-10-26): hovering an ⓘ
        // showed nothing. The fullscreen element when there is one, or the tip is not shown.
        tip.style.cssText =
            `position:fixed;z-index:${TIP_Z};pointer-events:none;` +
            'background:var(--vela-bg);border:1px solid var(--vela-border);color:var(--vela-fg);' +
            'border-radius:var(--vela-radius-md);padding:4px 9px;box-shadow:var(--vela-shadow);' +
            'font:var(--vela-font-size-md) var(--vela-font);' +
            (opts.wrap ? 'max-width:min(260px,calc(100vw - 16px));' : 'white-space:nowrap;');
        applyChromeTokens(tip, opts.theme());
        (doc.fullscreenElement ?? doc.body).appendChild(tip);

        const a = anchor.getBoundingClientRect();
        const vw = doc.documentElement.clientWidth;
        const vh = doc.documentElement.clientHeight;
        const w = tip.offsetWidth;
        const th = tip.offsetHeight;
        let left: number;
        let top: number;
        if (opts.placement === 'right') {
            left = a.right + 8;
            top = a.top + (a.height - th) / 2;
        } else {
            // Left-aligned at the anchor. `above` is for anchors sitting on the bottom edge
            // (the A/L scale buttons); `below` flips above when it would run off the screen.
            left = a.left;
            const below = a.bottom + 6;
            const above = a.top - th - 6;
            top = opts.placement === 'above' ? above : below + th > vh - 4 && above >= 4 ? above : below;
        }
        // Kept on screen (a hint near the dialog's right edge or a phone's edge).
        tip.style.left = `${Math.max(4, Math.min(left, vw - w - 4))}px`;
        tip.style.top = `${Math.max(4, Math.min(top, vh - th - 4))}px`;
    };

    // Mouse only: a tap fires a SYNTHETIC mouseenter/pointerenter with no leave to
    // follow (the emulated cursor stays put), so a touch-armed tip would open after the
    // tap and stick around forever. pointerenter carries the pointer type; mouseenter
    // does not — which is why the mouse events are not used here.
    const arm = (e: PointerEvent): void => {
        if (e.pointerType !== 'mouse') return;
        clear();
        timer = window.setTimeout(show, opts.delayMs ?? 700);
    };

    // Touch (tapToOpen): a tap opens the tip, the next tap ANYWHERE closes it (a second tap
    // on the same ⓘ included), so nothing is left stuck on screen. The tap is kept from
    // reaching the row (the ⓘ sits inside the checkbox's label: it must not tick the box).
    let touchDown = false;
    let wasOpen = false;
    let docListening = false;
    const offDoc = (): void => {
        if (!docListening) return;
        docListening = false;
        anchor.ownerDocument.removeEventListener('pointerdown', onDocDown, true);
    };
    const onDocDown = (e: PointerEvent): void => {
        if (e.target instanceof Node && anchor.contains(e.target)) return;
        offDoc();
        clear();
    };
    const down = (e: PointerEvent): void => {
        touchDown = e.pointerType !== 'mouse';
        wasOpen = tip !== null;
        clear(); // a click answers the question the tip poses
    };
    const tap = (e: MouseEvent): void => {
        if (!opts.tapToOpen || !touchDown) return;
        e.preventDefault();
        e.stopPropagation();
        offDoc();
        if (wasOpen) return;
        show();
        if (tip) {
            anchor.ownerDocument.addEventListener('pointerdown', onDocDown, true);
            docListening = true;
        }
    };

    anchor.addEventListener('pointerenter', arm);
    anchor.addEventListener('pointerleave', clear);
    anchor.addEventListener('pointerdown', down);
    anchor.addEventListener('click', tap);

    return () => {
        anchor.removeEventListener('pointerenter', arm);
        anchor.removeEventListener('pointerleave', clear);
        anchor.removeEventListener('pointerdown', down);
        anchor.removeEventListener('click', tap);
        offDoc();
        clear();
    };
}

export interface ChromeHintOptions {
    /** See {@link ChromeTooltipOptions.host}. */
    host: HTMLElement;
    /** See {@link ChromeTooltipOptions.theme}. */
    theme: () => VelaTheme;
    /** Badge diameter in px. Default 16. */
    size?: number;
}

/**
 * The ⓘ hint badge every in-chart dialog puts after a label: a round chip with the `info`
 * icon and a wrapped chrome tooltip that opens quickly (a hint is asked for, not stumbled
 * on). The glyph is an SVG, so it is centered in the badge regardless of the font. Styled
 * inline (renderer chrome carries no stylesheet); the hover state is the tip's own
 * pointer listeners. Returns the element and a disposer for the tooltip.
 */
export function chromeHint(text: string, opts: ChromeHintOptions): { el: HTMLElement; dispose: () => void } {
    const px = opts.size ?? 16;
    const el = document.createElement('span');
    el.className = 'vela-hint';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', vt(text));
    el.innerHTML = iconAt('info', px);
    el.style.cssText =
        `flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:${px}px;height:${px}px;` +
        'border-radius:50%;cursor:help;user-select:none;background:var(--vela-hover);color:var(--vela-fg-muted);' +
        'transition:background var(--vela-dur-fast) ease,color var(--vela-dur-fast) ease;';
    const hover = (on: boolean): void => {
        el.style.background = on ? 'var(--vela-active)' : 'var(--vela-hover)';
        el.style.color = on ? 'var(--vela-fg-bright)' : 'var(--vela-fg-muted)';
    };
    el.addEventListener('pointerenter', () => hover(true));
    el.addEventListener('pointerleave', () => hover(false));
    const dispose = attachChromeTooltip(el, { host: opts.host, theme: opts.theme, text: () => text, wrap: true, delayMs: 250, tapToOpen: true });
    return { el, dispose };
}
