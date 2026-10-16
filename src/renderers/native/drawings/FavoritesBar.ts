import type { VelaTheme } from '../../../core/options';
import type { DrawingTypeKey, ToolbarDefinition } from '../../../core/drawings';
import { applyChromeTokens } from '../../shared/theme-tokens';
import { attachChromeTooltip } from '../../shared/chrome-tooltip';

/** Below this host width the bar is hidden (TradingView hides it on phones too): on a narrow
 *  chart it would cover the chart controls. */
export const FAVORITES_BAR_MIN_HOST_WIDTH = 600;
/** Gap kept between the bar and the host's edges when it is placed or dragged. */
const EDGE = 4;
/** Default distance from the host's bottom edge: the time axis (28 px) plus a margin. */
const DEFAULT_BOTTOM = 52;

/** What the bar remembers across reloads: its position and whether the user hid it. */
interface SavedBarState {
    x?: number;
    y?: number;
    shown?: boolean;
}

export interface FavoritesBarOptions {
    /** The element the bar floats over (the chart area). It must be positioned. */
    host: HTMLElement;
    theme: VelaTheme;
    /** Pick a tool (same path as the left toolbar's buttons). */
    onPick: (type: DrawingTypeKey) => void;
    /** localStorage key for position and visibility. `null` keeps nothing. */
    storageKey?: string | null;
    /** Told when the user shows or hides the bar, so the left toolbar's toggle can follow. */
    onShownChange?: (shown: boolean) => void;
}

/**
 * The floating favourites toolbar (TradingView's "Favorites toolbar"): a compact horizontal pill
 * with a drag grip on the left and one button per starred drawing tool, in the order the tools
 * were starred. It floats over the chart, can be dragged anywhere inside the host and keeps its
 * position (localStorage). It shows only when at least one tool is starred AND the user has not
 * hidden it with the left toolbar's star toggle. Icons come from the toolbar definition, so they
 * are the same glyphs as the left toolbar; the active tool is highlighted.
 */
export class FavoritesBar {
    private readonly root: HTMLDivElement;
    private readonly grip: HTMLDivElement;
    private readonly items: HTMLDivElement;
    private def: ToolbarDefinition = { groups: [] };
    private favorites: DrawingTypeKey[] = [];
    private active: DrawingTypeKey | null = null;
    private theme: VelaTheme;
    private shown = true;
    /** The host-side visibility (the drawing toolbar itself is visible). */
    private enabled = true;
    private pos: { x: number; y: number } | null = null;
    private drag: { id: number; dx: number; dy: number } | null = null;
    private readonly btns = new Map<DrawingTypeKey, HTMLButtonElement>();
    private tipDisposers: Array<() => void> = [];
    private readonly ro: ResizeObserver | null;

    constructor(private readonly opts: FavoritesBarOptions) {
        this.theme = opts.theme;
        ensureStyles();
        const saved = this.load();
        if (typeof saved.shown === 'boolean') this.shown = saved.shown;
        if (typeof saved.x === 'number' && typeof saved.y === 'number' && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
            this.pos = { x: saved.x, y: saved.y };
        }
        const doc = opts.host.ownerDocument;
        this.root = doc.createElement('div');
        this.root.className = 'vela-favbar';
        this.root.setAttribute('role', 'toolbar');
        this.root.setAttribute('aria-label', 'Favorite drawing tools');
        this.root.dataset.velaScreenshot = '0';
        this.grip = doc.createElement('div');
        this.grip.className = 'vela-favbar-grip';
        this.grip.setAttribute('aria-label', 'Drag to move');
        this.grip.innerHTML = GRIP_SVG;
        this.items = doc.createElement('div');
        this.items.className = 'vela-favbar-items';
        this.root.append(this.grip, this.items);
        // The bar is an island over the chart: no press may fall through to the chart below.
        for (const ev of ['pointerdown', 'mousedown', 'touchstart', 'wheel', 'contextmenu', 'dblclick'] as const) {
            this.root.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev !== 'contextmenu' });
        }
        this.root.addEventListener('contextmenu', (e) => e.preventDefault());
        this.grip.addEventListener('pointerdown', this.onGripDown);
        this.grip.addEventListener('pointermove', this.onGripMove);
        this.grip.addEventListener('pointerup', this.onGripUp);
        this.grip.addEventListener('pointercancel', this.onGripUp);
        applyChromeTokens(this.root, this.theme);
        opts.host.appendChild(this.root);
        this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.layout()) : null;
        this.ro?.observe(opts.host);
        this.render();
    }

    setDefinition(def: ToolbarDefinition): void {
        this.def = def;
        this.render();
    }

    setFavorites(types: readonly DrawingTypeKey[]): void {
        const next = [...types];
        if (next.length === this.favorites.length && next.every((t, i) => t === this.favorites[i])) return;
        this.favorites = next;
        this.render();
    }

    setActiveTool(type: DrawingTypeKey | null): void {
        this.active = type;
        for (const [t, b] of this.btns) b.dataset.active = t === type ? '1' : '';
    }

    setTheme(theme: VelaTheme): void {
        this.theme = theme;
        applyChromeTokens(this.root, theme);
    }

    /** Host-side visibility (the drawing toolbar was hidden or shown). */
    setEnabled(on: boolean): void {
        this.enabled = on;
        this.layout();
    }

    /** User-facing show/hide (the left toolbar's star toggle). Persisted. */
    isShown(): boolean {
        return this.shown;
    }

    setShown(on: boolean): void {
        if (this.shown === on) return;
        this.shown = on;
        this.save();
        this.layout();
        this.opts.onShownChange?.(on);
    }

    /** True when the bar is on screen right now. */
    isVisible(): boolean {
        return this.root.style.display !== 'none';
    }

    destroy(): void {
        this.ro?.disconnect();
        for (const d of this.tipDisposers.splice(0)) d();
        this.root.remove();
    }

    // ── internals ──

    private toolOf(type: DrawingTypeKey): { label: string; icon?: string } | null {
        for (const g of this.def.groups) {
            const t = g.tools.find((x) => x.type === type);
            if (t) return t;
        }
        return null;
    }

    private render(): void {
        for (const d of this.tipDisposers.splice(0)) d();
        this.items.replaceChildren();
        this.btns.clear();
        const doc = this.root.ownerDocument;
        for (const type of this.favorites) {
            const tool = this.toolOf(type);
            if (!tool) continue; // a starred tool this toolbar does not offer
            const b = doc.createElement('button');
            b.type = 'button';
            b.className = 'vela-favbar-btn';
            b.dataset.tool = type;
            b.setAttribute('aria-label', tool.label);
            b.dataset.active = type === this.active ? '1' : '';
            b.innerHTML = `<span class="vela-favbar-hit">${sized(tool.icon ?? '')}</span>`;
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                this.opts.onPick(type);
            });
            this.tipDisposers.push(
                attachChromeTooltip(b, { host: this.opts.host, theme: () => this.theme, text: () => tool.label, placement: 'below' }),
            );
            this.btns.set(type, b);
            this.items.appendChild(b);
        }
        this.layout();
    }

    /** Show or hide, then place the bar inside the host (clamped; the saved spot is kept). */
    private layout(): void {
        const hostW = this.opts.host.clientWidth;
        const visible = this.enabled && this.shown && this.btns.size > 0 && hostW >= FAVORITES_BAR_MIN_HOST_WIDTH;
        this.root.style.display = visible ? 'flex' : 'none';
        if (!visible) return;
        const hostH = this.opts.host.clientHeight;
        const w = this.root.offsetWidth;
        const h = this.root.offsetHeight;
        // First run: centred near the bottom, above the time axis. The top is taken by the legend
        // (left, grows with every indicator) and the selected drawing's edit popup (centre).
        const want = this.pos ?? { x: Math.round((hostW - w) / 2), y: hostH - h - DEFAULT_BOTTOM };
        const x = clamp(want.x, EDGE, Math.max(EDGE, hostW - w - EDGE));
        const y = clamp(want.y, EDGE, Math.max(EDGE, hostH - h - EDGE));
        this.root.style.left = `${x}px`;
        this.root.style.top = `${y}px`;
    }

    private readonly onGripDown = (e: PointerEvent): void => {
        if (e.button !== 0) return;
        e.preventDefault();
        const r = this.root.getBoundingClientRect();
        this.drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
        try {
            this.grip.setPointerCapture(e.pointerId);
        } catch {
            /* capture is a nicety; the move handler still works while over the grip */
        }
        this.root.dataset.dragging = '1';
    };

    private readonly onGripMove = (e: PointerEvent): void => {
        const d = this.drag;
        if (!d || d.id !== e.pointerId) return;
        const hostR = this.opts.host.getBoundingClientRect();
        this.pos = { x: Math.round(e.clientX - hostR.left - d.dx), y: Math.round(e.clientY - hostR.top - d.dy) };
        this.layout();
    };

    private readonly onGripUp = (e: PointerEvent): void => {
        const d = this.drag;
        if (!d || d.id !== e.pointerId) return;
        this.drag = null;
        this.root.dataset.dragging = '';
        try {
            this.grip.releasePointerCapture(e.pointerId);
        } catch {
            /* already released */
        }
        // Keep the spot the user actually sees (clamped), not a point off the edge.
        this.pos = { x: parseFloat(this.root.style.left) || 0, y: parseFloat(this.root.style.top) || 0 };
        this.save();
    };

    private load(): SavedBarState {
        const key = this.opts.storageKey;
        if (!key) return {};
        try {
            const raw = globalThis.localStorage?.getItem(key);
            const v: unknown = raw ? JSON.parse(raw) : null;
            return v && typeof v === 'object' ? (v as SavedBarState) : {};
        } catch {
            return {};
        }
    }

    private save(): void {
        const key = this.opts.storageKey;
        if (!key) return;
        const state: SavedBarState = { shown: this.shown };
        if (this.pos) {
            state.x = this.pos.x;
            state.y = this.pos.y;
        }
        try {
            globalThis.localStorage?.setItem(key, JSON.stringify(state));
        } catch {
            /* private mode or blocked storage: the bar still works for this visit */
        }
    }
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
}

function sized(svg: string): string {
    return svg.replace('<svg ', '<svg width="100%" height="100%" ');
}

/** Two columns of three dots: the drag handle. */
const GRIP_SVG =
    '<svg viewBox="0 0 6 14" width="6" height="14" fill="currentColor" aria-hidden="true">' +
    '<circle cx="1" cy="2" r="1"/><circle cx="5" cy="2" r="1"/><circle cx="1" cy="7" r="1"/><circle cx="5" cy="7" r="1"/>' +
    '<circle cx="1" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>';

const STYLE_ID = 'vela-favorites-bar-styles';
function ensureStyles(): void {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
.vela-favbar{position:absolute;z-index:24;display:flex;align-items:center;gap:2px;padding:3px 4px 3px 2px;box-sizing:border-box;border-radius:var(--vela-radius-md);background:var(--vela-surface);border:1px solid var(--vela-border-strong);box-shadow:var(--vela-shadow);color:var(--vela-fg-muted);pointer-events:auto;user-select:none;-webkit-user-select:none;touch-action:none;}
.vela-favbar-grip{width:14px;height:28px;display:flex;align-items:center;justify-content:center;flex:none;cursor:grab;color:var(--vela-fg-muted);opacity:.7;border-radius:var(--vela-radius-sm);transition:opacity var(--vela-dur-fast) ease,background var(--vela-dur-fast) ease;}
.vela-favbar-grip:hover{opacity:1;background:var(--vela-hover);}
.vela-favbar[data-dragging='1'] .vela-favbar-grip{cursor:grabbing;opacity:1;}
.vela-favbar-items{display:flex;align-items:center;gap:2px;}
.vela-favbar-btn{width:30px;height:30px;flex:none;display:flex;align-items:center;justify-content:center;padding:0;border:none;background:transparent;color:inherit;cursor:pointer;transition:color var(--vela-dur-fast) ease;}
.vela-favbar-hit{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:var(--vela-radius-md);transition:background var(--vela-dur-fast) ease;}
.vela-favbar-hit>svg{width:18px;height:18px;}
.vela-favbar-btn:hover{color:var(--vela-fg-bright);}
.vela-favbar-btn:hover .vela-favbar-hit{background:var(--vela-hover);}
.vela-favbar-btn[data-active='1']{color:var(--vela-fg-bright);}
.vela-favbar-btn[data-active='1'] .vela-favbar-hit{background:var(--vela-active);}
.vela-favbar-btn:focus-visible{outline:none;}
.vela-favbar-btn:focus-visible .vela-favbar-hit{box-shadow:inset 0 0 0 1px var(--vela-fg-muted);}`;
    document.head.appendChild(s);
}
