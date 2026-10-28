// Mobile bottom bar — the ONE navigation surface of the mobile chrome, a row you swipe
// sideways like TradingView's. The symbol and timeframe stay pinned on the left
// (position: sticky); every other stop has a fixed width and scrolls, so a new stop never
// squeezes the others or forces things into the three dots. Left to right: symbol
// (fullscreen search), timeframe (drawer), indicators (fullscreen picker), contributed
// actions, drawings, maximize, the three-dots drawer, then chart type, undo, redo,
// alerts, screenshot and chart settings. Every stop is a direct child of the bar, so a
// host that places its own button `before()` the three dots keeps working. This
// stylesheet also carries the mobile visibility flips for the topbar and the desktop
// bottombar, so the whole swap lives in one place and follows the root's `data-layout`
// attribute with no JS.
import { iconEl } from '../ui/icons';
import { injectStyles } from '../ui/styles';
import { parseSymbol } from '../data/ProviderRegistry';
import { timeframeLabel } from './timeframe';
import { mobilePlacement, widgetActions, type WidgetContext } from './contributions';
import { TOPBAR_BUILTIN_IDS } from './topbar-composition';
import { vt } from '../i18n';

const STYLE_ID = 'vela-widget-mobilebar';
const CSS = `
.vela-mobilebar {
    display: none;
    align-items: stretch;
    gap: 2px;
    padding: 2px 6px calc(2px + env(safe-area-inset-bottom, 0px)) 0;
    border-top: 1px solid var(--vela-border);
    color: var(--vela-fg-muted);
    background: var(--vela-bg);
    flex: none;
    /* The swipe: a native horizontal scroller (momentum and rubber band come from the
       browser), no scrollbar, and a sideways swipe never drags the page or the chart. */
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    touch-action: pan-x;
    -webkit-overflow-scrolling: touch;
}
.vela-mobilebar::-webkit-scrollbar { display: none; }
/* More stops past the right edge: fade that edge so the row reads as swipeable. */
.vela-mobilebar[data-more-right] {
    -webkit-mask-image: linear-gradient(to left, transparent 0, #000 28px);
    mask-image: linear-gradient(to left, transparent 0, #000 28px);
}
[data-layout='mobile'] .vela-mobilebar { display: flex; }
[data-layout='mobile'] .vela-widget-topbar { display: none; }
[data-layout='mobile'] .vela-widget-bottombar { display: none; }
.vela-mb-item {
    all: unset;
    flex: none;
    box-sizing: border-box;
    min-width: 46px;
    min-height: 44px;
    padding: 0 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--vela-fg-bright);
    font-size: 13px;
    font-weight: 600;
    -webkit-tap-highlight-color: transparent;
}
.vela-mb-item[hidden] { display: none !important; }
.vela-mb-item:active { background: var(--vela-hover); }
.vela-mb-item:disabled { opacity: 0.35; cursor: default; }
.vela-mb-item:disabled:active { background: none; }
.vela-mb-item .vela-icon { font-size: 18px; width: 18px; height: 18px; }
/* A lit stop (the maximize toggle while something is isolated): the inverse
   "selected" chip — white on the dark theme, dark on the light one. */
.vela-mb-item.vela-mb-on, .vela-mb-item.vela-mb-on:active { background: var(--vela-selected-bg); color: var(--vela-selected-fg); }
/* Left-aligned contributed actions get their own stops (the built-in indicators
   slot) — the wrapper is layout-transparent so each stop flexes like a sibling. */
.vela-mb-actions { display: contents; }
/* Symbol and timeframe stay put while the rest scrolls under them (fixed widths, so
   the timeframe knows where the symbol ends; the bar has no left padding, so nothing
   shows through on the left). */
.vela-mb-symbol, .vela-mb-tf {
    position: sticky;
    z-index: 1;
    background: var(--vela-bg);
    border-radius: 0;
}
.vela-mb-symbol {
    left: 0;
    width: 98px;
    padding-left: 10px;
    font-size: 14px;
    letter-spacing: 0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    line-height: 44px;
    text-align: left;
}
.vela-mb-tf { left: 98px; min-width: 50px; white-space: nowrap; box-shadow: 6px 0 6px -6px rgba(0, 0, 0, 0.35); }
`;

export interface MobileBarOptions {
    symbol: string;
    timeframe: string;
    onSymbolClick: () => void;
    onTimeframeClick: () => void;
    /** Omitted ⇒ no indicators stop (the composition hides the 'indicators' slot, or
     *  the deprecated `indicatorPicker: false`). A slot OVERRIDE keeps the stop — the
     *  shell passes a callback routed to the override. */
    onIndicatorsClick?: () => void;
    /** Omitted ⇒ no drawings stop (the shell disabled user drawings — `drawings: false`). */
    onDrawingsClick?: () => void;
    /** Omitted ⇒ no maximize stop (single-chart shells — nothing to isolate). The
     *  workspace passes a toggle that isolates the active chart over the grid;
     *  {@link setMaximizeActive} lights the stop while something is isolated. */
    onMaximizeClick?: () => void;
    onMoreClick: () => void;
    /** Each omitted ⇒ no stop. Shortcuts for what the three dots also list, in the swipe row after it. */
    onChartTypeClick?: () => void;
    onUndoClick?: () => void;
    onRedoClick?: () => void;
    onAlertsClick?: () => void;
    onScreenshotClick?: () => void;
    onSettingsClick: () => void;
    /** Live widget context — left-aligned contributed actions (`align: 'left'`)
     *  project as icon-only stops in the indicators slot. */
    getContext?: () => WidgetContext;
}

export class MobileBar {
    readonly el: HTMLElement;
    private readonly symbolEl: HTMLElement;
    private readonly tfEl: HTMLElement;
    /** The maximize toggle stop (null when the shell has nothing to isolate). */
    private readonly maxEl: HTMLButtonElement | null;
    /** Left-aligned contributed actions — filled by {@link renderActions}. */
    private readonly actionsHost: HTMLElement;
    private readonly opts: MobileBarOptions;
    private readonly undoEl: HTMLButtonElement | null;
    private readonly redoEl: HTMLButtonElement | null;
    private readonly ro: ResizeObserver | null = null;

    constructor(host: HTMLElement, opts: MobileBarOptions) {
        this.opts = opts;
        const doc = host.ownerDocument;
        injectStyles(STYLE_ID, CSS, doc);
        this.el = doc.createElement('div');
        this.el.className = 'vela-mobilebar';

        const item = (cls: string, label: string, onClick: () => void, icon?: string): HTMLButtonElement => {
            const b = doc.createElement('button');
            b.className = `vela-mb-item ${cls}`;
            b.setAttribute('aria-label', vt(label));
            if (icon) b.appendChild(iconEl(icon, doc));
            b.addEventListener('click', onClick);
            return b;
        };

        this.symbolEl = item('vela-mb-symbol', 'Symbol search', opts.onSymbolClick);
        this.symbolEl.textContent = parseSymbol(opts.symbol).ticker;
        this.tfEl = item('vela-mb-tf', 'Timeframe', opts.onTimeframeClick);
        this.tfEl.textContent = vt(timeframeLabel(opts.timeframe));
        const onIndicators = opts.onIndicatorsClick;
        const indicators = onIndicators ? item('vela-mb-indicators', 'Indicators', onIndicators, 'indicators') : null;
        this.actionsHost = doc.createElement('span');
        this.actionsHost.className = 'vela-mb-actions';
        const onDrawings = opts.onDrawingsClick;
        const drawings = onDrawings ? item('vela-mb-drawings', 'Drawings', onDrawings, 'pen') : null;
        const onMaximize = opts.onMaximizeClick;
        this.maxEl = onMaximize ? item('vela-mb-maximize', 'Maximize chart', onMaximize, 'maximize') : null;
        const more = item('vela-mb-more', 'More', opts.onMoreClick, 'kebab');
        const opt = (cls: string, label: string, onClick: (() => void) | undefined, icon: string): HTMLButtonElement[] => (onClick ? [item(cls, label, onClick, icon)] : []);
        const chartType = opt('vela-mb-charttype', 'Chart type', opts.onChartTypeClick, 'style-line');
        const [undo] = opt('vela-mb-undo', 'Undo', opts.onUndoClick, 'undo');
        const [redo] = opt('vela-mb-redo', 'Redo', opts.onRedoClick, 'redo');
        this.undoEl = undo ?? null;
        this.redoEl = redo ?? null;
        const alerts = opt('vela-mb-alerts', 'Alerts', opts.onAlertsClick, 'bell');
        const shot = opt('vela-mb-screenshot', 'Screenshot', opts.onScreenshotClick, 'camera');
        const settings = item('vela-mb-settings', 'Chart settings', opts.onSettingsClick, 'gear');

        this.el.append(
            this.symbolEl,
            this.tfEl,
            ...(indicators ? [indicators] : []),
            this.actionsHost,
            ...(drawings ? [drawings] : []),
            ...(this.maxEl ? [this.maxEl] : []),
            more,
            ...chartType,
            ...(undo ? [undo] : []),
            ...(redo ? [redo] : []),
            ...alerts,
            ...shot,
            settings,
        );
        host.appendChild(this.el);
        this.renderActions();

        // The fade on the right edge follows whether anything is still off screen there.
        this.el.addEventListener('scroll', this.updateEdge, { passive: true });
        const win = doc.defaultView;
        if (win && typeof win.ResizeObserver === 'function') {
            this.ro = new win.ResizeObserver(this.updateEdge);
            this.ro.observe(this.el);
        }
        this.updateEdge();
    }

    private readonly updateEdge = (): void => {
        const el = this.el;
        const more = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
        if (more) el.dataset.moreRight = '';
        else delete el.dataset.moreRight;
    };

    /** Dim undo / redo when there is nothing to undo / redo (the topbar does the same). */
    setHistoryState(canUndo: boolean, canRedo: boolean): void {
        if (this.undoEl) this.undoEl.disabled = !canUndo;
        if (this.redoEl) this.redoEl.disabled = !canRedo;
    }

    /** Re-project the contributed actions placed on the bar (left-aligned by default —
     *  see `mobilePlacement`) as icon-only stops in the indicators slot (call after
     *  registrations change). The rest are three-dots drawer rows. */
    renderActions(): void {
        const ctx = this.opts.getContext?.();
        if (!ctx) return;
        const doc = this.el.ownerDocument;
        this.actionsHost.replaceChildren();
        // Built-in-id actions are slot OVERRIDES — they reach mobile through the slot's
        // own stop (the shell routes it), never as an extra flow stop here.
        const builtin = new Set<string>(TOPBAR_BUILTIN_IDS);
        for (const action of widgetActions('topbar', ctx).filter((a) => mobilePlacement(a) === 'bar' && !builtin.has(a.id))) {
            const b = doc.createElement('button');
            b.className = 'vela-mb-item';
            b.setAttribute('aria-label', vt(action.label));
            if (action.icon) b.appendChild(iconEl(action.icon, doc));
            else b.appendChild(doc.createTextNode(vt(action.label)));
            b.addEventListener('click', () => {
                const c = this.opts.getContext?.();
                if (c) action.run(c);
            });
            this.actionsHost.appendChild(b);
        }
        this.updateEdge();
    }

    setSymbol(symbol: string): void {
        this.symbolEl.textContent = parseSymbol(symbol).ticker;
    }

    /** `label` overrides the timeframe's own (tick/range… bars on: `'100T'`). */
    setTimeframe(tf: string, label?: string): void {
        this.tfEl.textContent = vt(label ?? timeframeLabel(tf));
    }

    /** Light the maximize stop while something is isolated (a chart over the grid,
     *  or a maximized pane inside the active chart) — inverse chip + restore glyph. */
    setMaximizeActive(on: boolean): void {
        if (!this.maxEl) return;
        this.maxEl.classList.toggle('vela-mb-on', on);
        this.maxEl.setAttribute('aria-label', on ? vt("Restore layout") : vt("Maximize chart"));
        this.maxEl.replaceChildren(iconEl(on ? 'restore' : 'maximize', this.el.ownerDocument));
    }

    /** Show the maximize stop only while the grid holds more than one chart — on a
     *  one-cell layout there is nothing to isolate, so the stop would be a dead press. */
    setMaximizeVisible(visible: boolean): void {
        if (!this.maxEl) return;
        this.maxEl.hidden = !visible;
    }

    destroy(): void {
        this.ro?.disconnect();
        this.el.removeEventListener('scroll', this.updateEdge);
        this.el.remove();
    }
}
