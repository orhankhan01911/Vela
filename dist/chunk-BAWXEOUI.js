import { STATIC_TOKENS, overlayScrollbarCss, themeTokens, injectStyles, vt, holdForExit, announceSurface, iconAt, iconEl, ACCENT_BRIGHT, BEARISH, ACCENT, BULLISH, WARNING, NEUTRAL } from './chunk-4YAXFTQI.js';
import { VanillaMachine, normalizeProps, spreadProps } from '@zag-js/vanilla';
export { normalizeProps, spreadProps } from '@zag-js/vanilla';
import * as menu from '@zag-js/menu';
import * as dialog from '@zag-js/dialog';

function runMachine(machine4, props, render) {
  const m = new VanillaMachine(machine4, props);
  const unsub = m.subscribe(render);
  m.start();
  render(m.service);
  return {
    service: m.service,
    flush: () => render(m.service),
    stop: () => {
      unsub();
      m.stop();
    }
  };
}
var uid = 0;
function nextUid(prefix) {
  return `${prefix}-${++uid}`;
}

// src/ui/tokens.ts
var STATIC_ID = "vela-ui-tokens";
var STATIC_DECLS = Object.entries(STATIC_TOKENS).map(([k, v]) => `    ${k}: ${v};`).join("\n");
var STATIC_CSS = `
.vela-ui, .vela-ui-layer {
${STATIC_DECLS}
    font-family: var(--vela-font, -apple-system, system-ui, sans-serif);
    box-sizing: border-box;
    /* Chrome text (titles, buttons, menus, readouts) is UI, not copy \u2014 never selectable. */
    user-select: none;
    -webkit-user-select: none;
}
.vela-ui *, .vela-ui-layer * { box-sizing: border-box; }
/* Text ENTRY is the one exception: selection is part of editing. */
.vela-ui :is(input, textarea), .vela-ui-layer :is(input, textarea) { user-select: text; -webkit-user-select: text; }
/* iOS Safari zooms the page when a focused field is under 16px, and often
   keeps that zoom after the field blurs or a dialog closes. The shell's
   mobile size class is the honest gate \u2014 not a media query \u2014 so an embedded
   chart on a wide desktop still gets the rule when it is in the phone layout.
   Scoped to the kit root so a host page's own [data-layout] is never touched. */
.vela-ui[data-layout='mobile'] :is(input, textarea, select) { font-size: 16px; }
.vela-icon { display: inline-flex; align-items: center; flex: none; }
.vela-icon svg { display: block; }
`;
function applyThemeTokens(el, t) {
  const tokens = themeTokens(t);
  for (const key in tokens) el.style.setProperty(key, tokens[key]);
}
function applyPlotOverlayTokens(host, base, config) {
  const layout = config?.layout;
  const background = layout?.backgroundType === "gradient" && layout.backgroundTop ? layout.backgroundTop : layout?.background;
  const t = background && layout?.textColor ? { ...base, background, textColor: layout.textColor } : base;
  applyThemeTokens(host, t);
}
function floatingLayerHost(from, fallback) {
  return from.closest(".vela-ui") ?? fallback ?? from;
}
function ensureUIHost(el, theme) {
  injectStyles(STATIC_ID, STATIC_CSS, el.getRootNode());
  el.classList.add("vela-ui");
  if (theme) applyThemeTokens(el, theme);
}
function menuController(opts) {
  return {
    machine: menu.machine,
    props: {
      id: opts.id ?? nextUid("vela-menu"),
      ids: opts.triggerId ? { trigger: opts.triggerId } : void 0,
      positioning: {
        placement: opts.placement ?? "bottom-start",
        ...opts.flip === false ? { flip: false } : {},
        ...opts.getAnchorRect ? { getAnchorRect: () => opts.getAnchorRect() } : {}
      },
      onSelect: (d) => opts.onSelect?.(d.value),
      onOpenChange: (d) => opts.onOpenChange?.(d.open)
    },
    connect: (service) => menu.connect(service, normalizeProps)
  };
}
function drawerController(opts = {}) {
  return {
    machine: dialog.machine,
    props: {
      id: nextUid("vela-drawer"),
      modal: true,
      closeOnEscape: opts.closeOnEscape ?? true,
      closeOnInteractOutside: opts.closeOnInteractOutside ?? true,
      initialFocusEl: opts.initialFocusEl,
      onOpenChange: (d) => opts.onOpenChange?.(d.open)
    },
    connect: (service) => dialog.connect(service, normalizeProps)
  };
}

// src/ui/components/drawer/styles.ts
var DRAWER_STYLE_ID = "vela-ui-drawer";
var DRAWER_CSS = `
.vela-drawer-backdrop {
    position: fixed;
    inset: 0;
    background: var(--vela-backdrop);
    z-index: var(--vela-z-dialog);
}
.vela-drawer-positioner {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: var(--vela-z-dialog);
}
/* Inside a shell that declares a size class, the sheet scopes to the SHELL's bounds
   (the widget root is position:relative) instead of the whole viewport \u2014 an embedded
   chart must not curtain the host page. */
[data-layout] .vela-drawer-backdrop, [data-layout] .vela-drawer-positioner { position: absolute; }
.vela-drawer {
    background: var(--vela-surface);
    color: var(--vela-fg);
    border: 1px solid var(--vela-border-strong);
    border-bottom: none;
    border-radius: 14px 14px 0 0;
    box-shadow: var(--vela-shadow-dialog);
    font-size: 13px;
    width: 100%;
    max-height: 85%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    outline: none;
}
.vela-drawer[data-state='open'] { animation: vela-drawer-in var(--vela-dur-med) var(--vela-ease); }
@keyframes vela-drawer-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}
/* The grab zone owns its touches (drag-to-dismiss), so the browser must not scroll it. */
.vela-drawer-grab {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 0 6px;
    cursor: grab;
    touch-action: none;
    user-select: none;
}
.vela-drawer-grab::before {
    content: '';
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--vela-border-strong);
}
.vela-drawer-title {
    flex: none;
    padding: 0 16px 10px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: var(--vela-fg-bright);
    user-select: none;
}
.vela-drawer-title:empty { display: none; }
.vela-drawer-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    /* Vertical pans stay native scrolling; horizontal moves reach the sheet's gesture
       recognizer as pointer events (tab swipes). Without this the browser claims a
       sideways touch as a scroll attempt and CANCELS the pointer stream, so swipes
       never registered on real touch devices. Sideways-scrolling strips inside the
       body opt back in with their own touch-action: pan-x. */
    touch-action: pan-y;
    padding: 0 var(--vela-space-3) calc(var(--vela-space-3) + env(safe-area-inset-bottom, 0px));
}
.vela-drawer-body::-webkit-scrollbar { width: 8px; }
.vela-drawer-body::-webkit-scrollbar-thumb {
    background: var(--vela-scroll);
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: padding-box;
}
`;
var DISMISS_FRACTION = 0.33;
var DISMISS_PX = 96;
var SLOP_PX = 8;
var HSWIPE_MIN_PX = 48;
function classifyGesture(dx, dy, ctx) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SLOP_PX) return "pending";
  if (Math.abs(dy) > Math.abs(dx)) return dy > 0 && !ctx.scrolled ? "drag" : "scroll";
  return ctx.canSwipe && !ctx.hScrollable ? "hswipe" : "scroll";
}
function dragDismisses(dy, panelHeightPx) {
  return dy >= Math.min(DISMISS_PX, panelHeightPx * DISMISS_FRACTION);
}
function swipeDirection(dx, dy) {
  if (Math.abs(dx) < HSWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? "left" : "right";
}
var Drawer = class {
  constructor(opts = {}) {
    this.opener = null;
    this.wasOpen = false;
    /** The sheet and scrim's exit animation after a close; a reopen cancels it. */
    this.exit = null;
    this.destroyed = false;
    const doc = (opts.host ?? document.body).ownerDocument;
    injectStyles(DRAWER_STYLE_ID, DRAWER_CSS, doc);
    const host = opts.host ?? doc.body;
    this.backdrop = doc.createElement("div");
    this.backdrop.className = "vela-drawer-backdrop vela-ui-layer";
    this.positioner = doc.createElement("div");
    this.positioner.className = "vela-drawer-positioner vela-ui-layer";
    this.panel = doc.createElement("div");
    this.panel.className = "vela-drawer";
    this.panel.tabIndex = -1;
    const grab = doc.createElement("div");
    grab.className = "vela-drawer-grab";
    this.titleEl = doc.createElement("div");
    this.titleEl.className = "vela-drawer-title";
    this.titleEl.textContent = vt(opts.title ?? "");
    this.body = doc.createElement("div");
    this.body.className = "vela-drawer-body";
    if (opts.content instanceof Node) this.body.appendChild(opts.content);
    else if (typeof opts.content === "function") opts.content(this.body);
    this.panel.append(grab, this.titleEl, this.body);
    this.positioner.appendChild(this.panel);
    host.append(this.backdrop, this.positioner);
    this.wireGestures(grab, opts.onSwipe);
    this.ctrl = drawerController({ ...opts, initialFocusEl: () => this.panel });
    const mid = String(this.ctrl.props.id);
    this.handle = runMachine(this.ctrl.machine, this.ctrl.props, (service) => {
      const api = this.ctrl.connect(service);
      const closing = this.wasOpen && !api.open;
      if (closing) this.announce(false);
      spreadProps(this.backdrop, api.getBackdropProps(), mid);
      spreadProps(this.positioner, api.getPositionerProps(), mid);
      spreadProps(this.panel, api.getContentProps(), mid);
      spreadProps(this.titleEl, api.getTitleProps(), mid);
      if (api.open) {
        this.exit?.cancel();
        this.exit = null;
        this.setShown(true);
      } else if (closing) {
        this.holdExit();
      } else if (!this.exit) {
        this.setShown(false);
      }
      if (api.open && !this.wasOpen) this.announce(true);
      if (this.wasOpen && !api.open) this.restoreOpener();
      this.wasOpen = api.open;
    });
  }
  /** Any element between `from` and the panel that has already been scrolled down —
   *  a downward pull there must scroll it back up, never drag the sheet. */
  scrolledAncestor(from) {
    let el = from instanceof Element ? from : null;
    while (el && el !== this.panel) {
      if (el.scrollTop > 0) return true;
      el = el.parentElement;
    }
    return false;
  }
  /** Any element between `from` and the panel that scrolls horizontally on its own
   *  (the tab strip, chip rows) — a sideways move there is ITS scroll, not a swipe. */
  hScrollableAncestor(from) {
    let el = from instanceof Element ? from : null;
    while (el && el !== this.panel) {
      if (el.scrollWidth > el.clientWidth + 1) return true;
      el = el.parentElement;
    }
    return false;
  }
  /**
   * One gesture recognizer for the whole sheet. A downward pull dismisses from
   * anywhere — the grab handle immediately, the content once it is decidedly vertical
   * and its scroller is at rest (a scrolled list keeps native scrolling). A decidedly
   * horizontal move becomes an `onSwipe` (tabbed drawers flip pages with it). The
   * non-passive touchmove hook is what keeps the browser from claiming the pull as a
   * scroll once the sheet is (or may become) the drag target.
   */
  wireGestures(grab, onSwipe) {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let mode = "idle";
    const beginDrag = (e) => {
      mode = "drag";
      startY = e.clientY;
      this.panel.style.transition = "none";
      try {
        this.panel.setPointerCapture(e.pointerId);
      } catch {
      }
    };
    this.panel.addEventListener("pointerdown", (e) => {
      if (e.isPrimary === false) return;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      if (grab.contains(e.target)) beginDrag(e);
      else mode = "pending";
    });
    this.panel.addEventListener("pointermove", (e) => {
      if (mode === "idle" || mode === "scroll") return;
      dx = e.clientX - startX;
      dy = e.clientY - startY;
      if (mode === "pending") {
        const intent = classifyGesture(dx, dy, {
          canSwipe: !!onSwipe,
          scrolled: this.scrolledAncestor(e.target),
          hScrollable: this.hScrollableAncestor(e.target)
        });
        if (intent === "pending") return;
        if (intent === "drag") beginDrag(e);
        else mode = intent;
      }
      if (mode === "drag") {
        dy = Math.max(0, e.clientY - startY);
        this.panel.style.transform = dy > 0 ? `translateY(${dy}px)` : "";
      }
    });
    this.panel.addEventListener(
      "touchmove",
      (e) => {
        if (mode === "drag" || mode === "hswipe") {
          e.preventDefault();
          return;
        }
        if (mode !== "pending") return;
        const t = e.touches[0];
        if (!t) return;
        const mdx = t.clientX - startX;
        const mdy = t.clientY - startY;
        if (mdy > Math.abs(mdx) && !this.scrolledAncestor(e.target)) e.preventDefault();
      },
      { passive: false }
    );
    const settle = () => {
      if (mode === "idle") return;
      const finished = mode;
      mode = "idle";
      if (finished === "drag") {
        this.panel.style.transition = "";
        this.panel.style.transform = "";
        if (dragDismisses(dy, this.panel.getBoundingClientRect().height)) this.hide();
      } else if (finished === "hswipe") {
        const dir = swipeDirection(dx, dy);
        if (dir) onSwipe?.(dir);
      }
    };
    this.panel.addEventListener("pointerup", settle);
    this.panel.addEventListener("pointercancel", settle);
  }
  setTitle(title) {
    this.titleEl.textContent = vt(title);
  }
  setShown(shown) {
    this.backdrop.style.display = shown ? "" : "none";
    this.positioner.style.display = shown ? "" : "none";
  }
  /** Keep the just-closed sheet up through its exit animation, then hide it — or
   *  remove it, when it was destroyed meanwhile. `spreadProps` re-applies the close
   *  props' `hidden` only when its value changes, so lifting it keeps the sheet and
   *  scrim up until the exit ends. The positioner spans the host: inert, it lets
   *  clicks through to the page while the sheet animates out. */
  holdExit() {
    const held = [this.panel, this.backdrop];
    for (const el of held) el.hidden = false;
    this.exit = holdForExit(
      held,
      () => {
        this.exit = null;
        if (this.destroyed) {
          this.detach();
        } else if (!this.open) {
          for (const el of held) el.hidden = true;
          this.setShown(false);
        }
      },
      { inert: [this.positioner] }
    );
  }
  detach() {
    this.backdrop.remove();
    this.positioner.remove();
  }
  /** Closing hands focus back to whatever opened it (Escape, the ✕, hide(), or a
   *  teardown that outruns the machine's close notification). */
  restoreOpener() {
    const opener = this.opener;
    this.opener = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  announce(open2) {
    const opener = this.opener === this.panel.ownerDocument.body ? null : this.opener;
    announceSurface(this.panel, open2, "drawer", opener);
  }
  get open() {
    return this.ctrl.connect(this.handle.service).open;
  }
  show() {
    this.opener = this.panel.ownerDocument.activeElement;
    this.ctrl.connect(this.handle.service).setOpen(true);
  }
  hide() {
    this.ctrl.connect(this.handle.service).setOpen(false);
  }
  destroy() {
    if (this.wasOpen && !this.open) this.handle.flush();
    this.handle.stop();
    this.destroyed = true;
    if (this.wasOpen) {
      this.wasOpen = false;
      this.announce(false);
    }
    this.restoreOpener();
    if (!this.exit) this.detach();
  }
};

// src/ui/components/menu/styles.ts
var MENU_STYLE_ID = "vela-ui-menu";
var MENU_CSS = `
.vela-menu {
    /* The list is a <ul>: without this, block rows (the separator) paint a ::marker dot. */
    list-style: none;
    margin: 0;
    background: var(--vela-surface);
    color: var(--vela-fg);
    border: 1px solid var(--vela-border-strong);
    border-radius: 6px;
    box-shadow: var(--vela-shadow);
    padding: 6px;
    min-width: 180px;
    /* Never wider than the screen: a row of label + hint (the chart settings' template list) ran ~630 px and
       widened a phone's page, cutting the names off. A row that does not fit puts its hint under the label. */
    max-width: calc(100vw - 16px);
    box-sizing: border-box;
    /* Never past the room on the side it opened (the positioner's --available-height): a long checklist opened
       from low in a dialog flips up and scrolls instead of running off the top of the window. */
    max-height: min(60vh, var(--available-height, 60vh));
    overflow-y: auto;
    font-size: 13px;
    z-index: var(--vela-z-menu);
    outline: none;
}
.vela-menu[data-state='open'] { animation: vela-menu-in var(--vela-dur-fast) var(--vela-ease); }
@keyframes vela-menu-in {
    from { opacity: 0; transform: translateY(-3px); }
    to { opacity: 1; transform: translateY(0); }
}
.vela-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
}
.vela-menu-item[data-highlighted] { background: var(--vela-hover); }
.vela-menu-item[data-disabled] { opacity: 0.4; cursor: default; }
.vela-menu-item .vela-icon { width: 16px; height: 16px; font-size: 16px; justify-content: center; color: var(--vela-fg-muted); }
.vela-menu-item { flex-wrap: wrap; row-gap: 2px; }
.vela-menu-item .vela-menu-label { flex: 1 1 auto; min-width: 0; white-space: normal; overflow-wrap: anywhere; }
.vela-menu-item .vela-menu-hint { color: var(--vela-fg-faint); font-size: var(--vela-font-size-sm); white-space: normal; min-width: 0; }
/* Active entry: the row surface carries the selection \u2014 a stronger background wash
   than the hover one, plus bright ink. Declared after the hover rule so a selected
   row stays visibly selected while highlighted. */
.vela-menu-item[data-checked] {
    background: var(--vela-hover-strong);
    color: var(--vela-fg-bright);
}
/* Checkmark mode (context/action menus): every row reserves the leading mark column so
   labels align; a checked row fills it with a \u2713 and brightens its ink \u2014 the row surface
   stays free for the hover wash. */
.vela-menu-item .vela-menu-mark {
    width: 14px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.vela-menu-item .vela-menu-mark .vela-icon {
    width: 14px;
    height: 14px;
    font-size: 14px;
    color: var(--vela-fg-bright);
}
.vela-menu-item[data-checkmark] { color: var(--vela-fg-bright); }
/* Badge mode (iconBadges): the row icon sits in a rounded tile and the row grows to fit
   it. An icon-less row of the same level keeps an invisible slot, so labels align. */
/* Compact: an icon menu is scanned by its tiles, so rows, gaps and separators run tighter
   than a plain list's. */
.vela-menu[data-badges] { padding: 4px; min-width: 0; font-size: 12.5px; }
.vela-menu[data-badges] > .vela-menu-item { padding: 3px 10px 3px 4px; gap: 8px; }
.vela-menu[data-badges] > .vela-menu-item .vela-menu-hint { padding-left: 14px; }
.vela-menu[data-badges] > .vela-menu-sep { margin: 3px 4px; }
.vela-menu-item .vela-menu-badge {
    width: 20px;
    height: 20px;
    padding: 3px;
    font-size: 13px;
    flex: none;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--vela-radius-md);
    background: var(--vela-hover);
    border: 1px solid var(--vela-border);
    color: var(--vela-fg-muted);
    transition: background var(--vela-dur-fast) var(--vela-ease), border-color var(--vela-dur-fast) var(--vela-ease), color var(--vela-dur-fast) var(--vela-ease);
}
.vela-menu-item .vela-menu-badge:empty { background: transparent; border-color: transparent; }
.vela-menu-item .vela-menu-badge .vela-icon { width: 13px; height: 13px; font-size: 13px; color: inherit; }
.vela-menu-item[data-highlighted] .vela-menu-badge:not(:empty) { color: var(--vela-fg-bright); }
/* The selected tile inverts: a bright fill under the surface-colored glyph. After the
   hover rule, so a selected row keeps its tile while highlighted. */
.vela-menu-item[data-checked] .vela-menu-badge:not(:empty),
.vela-menu-item[data-checkmark] .vela-menu-badge:not(:empty) {
    background: color-mix(in srgb, var(--vela-fg-bright) 83%, var(--vela-surface));
    border-color: color-mix(in srgb, var(--vela-fg-bright) 40%, transparent);
    color: var(--vela-surface);
}
/* Switch rows (boolean settings in a dropdown): a right-aligned toggle pill \u2014 the
   same control language as the settings dialog's toggles. */
.vela-menu-switch {
    order: 99;
    margin-left: auto;
    position: relative;
    flex: none;
    width: 34px;
    height: 18px;
    border-radius: 9px;
    background: var(--vela-surface-overlay);
    border: 1px solid var(--vela-border-soft);
    transition: background 0.16s ease, border-color 0.16s ease;
}
.vela-menu-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--vela-fg-muted);
    transition: transform 0.16s ease, background 0.16s ease;
}
.vela-menu-switch.on { background: var(--vela-accent-bright, var(--vela-accent)); border-color: var(--vela-accent-bright, var(--vela-accent)); }
.vela-menu-switch.on::after { transform: translateX(16px); background: var(--vela-bg); }
/* Favorite star (rows carrying \`favorite\`): reserved space always \u2014 it fades in on row
   hover instead of shifting the layout \u2014 and a starred row keeps its filled star visible.
   Same control language as the drawing toolbar's flyout stars. */
.vela-menu-item .vela-menu-star {
    order: 98;
    /* Pad the 16px icon slot into a bigger hit target without moving the row's layout. */
    margin: -3px -5px -3px 0;
    padding: 3px 5px;
    box-sizing: content-box;
    border-radius: var(--vela-radius-sm);
    opacity: 0;
    transition: opacity 0.1s ease, background 0.1s ease;
}
.vela-menu-item[data-highlighted] .vela-menu-star { opacity: 0.55; }
.vela-menu-item .vela-menu-star:hover { opacity: 1; background: var(--vela-hover-strong); }
.vela-menu-item .vela-menu-star.vela-fav { opacity: 0.95; color: var(--vela-highlight); }
.vela-menu-sep { height: 1px; margin: 4px 6px; background: var(--vela-border); }
/* Submenu trigger row: a right-aligned chevron, and it stays highlighted while its own
   list is open so the path you came down remains readable. */
.vela-menu-item .vela-menu-arrow {
    order: 99;
    margin-left: auto;
    width: 12px;
    flex: none;
    font-size: 11px;
    color: var(--vela-fg-faint);
}
.vela-menu-item[data-state='open'] { background: var(--vela-hover); }
`;
var Surface = class _Surface {
  constructor(doc, opts) {
    this.items = [];
    /** Branch item id → the surface it opens. */
    this.subs = /* @__PURE__ */ new Map();
    /** Trigger rect captured when this level opened — the list stays put if the
     *  trigger then moves (favorite chips shifting the caret). */
    this.pinnedAnchor = null;
    /** The open state last announced — see {@link announce}. */
    this.shown = false;
    /** The list's exit animation after a close; a reopen cancels it. */
    this.exit = null;
    this.doc = doc;
    this.host = opts.host;
    this.onSelect = opts.onSelect;
    this.onFavorite = opts.onFavorite;
    this.checkmarks = opts.checkmarks === true;
    this.iconBadges = opts.iconBadges === true;
    this.positioner = doc.createElement("div");
    this.positioner.className = "vela-ui-layer";
    this.list = doc.createElement("ul");
    this.list.className = "vela-menu";
    if (opts.minWidth) this.list.style.minWidth = opts.minWidth;
    if (opts.maxHeight) this.list.style.maxHeight = `min(${opts.maxHeight}, var(--available-height, ${opts.maxHeight}))`;
    this.positioner.appendChild(this.list);
    this.host.appendChild(this.positioner);
    const trigger = opts.trigger;
    this.opener = trigger ?? opts.opener ?? null;
    this.ctrl = menuController({
      items: [],
      id: opts.id,
      placement: opts.placement,
      flip: opts.flip,
      onSelect: (id) => {
        this.onSelect(id);
        const item = this.items.find((i) => i.id === id);
        if (!item?.toggle) return;
        const li = Array.from(this.list.querySelectorAll(".vela-menu-item")).find((el) => el.dataset.veiId === id);
        li?.querySelector(".vela-menu-switch")?.classList.toggle("on");
      },
      getAnchorRect: () => this.pinnedAnchor,
      onOpenChange: (open2) => {
        if (open2 && trigger) {
          const r = trigger.getBoundingClientRect();
          this.pinnedAnchor = { x: r.x, y: r.y, width: r.width, height: r.height };
        } else {
          this.pinnedAnchor = null;
        }
        opts.onOpenChange?.(open2);
      },
      triggerId: opts.triggerId
    });
    this.mid = String(this.ctrl.props.id);
    if (opts.triggerId && trigger) trigger.id = opts.triggerId;
    this.handle = runMachine(this.ctrl.machine, this.ctrl.props, (service) => {
      const api = this.ctrl.connect(service);
      const closing = this.shown && !api.open;
      if (closing) this.announce(false);
      if (api.open && this.exit) {
        this.exit.cancel();
        this.exit = null;
      }
      if (trigger) spreadProps(trigger, api.getTriggerProps(), this.mid);
      spreadProps(this.positioner, api.getPositionerProps(), this.mid);
      spreadProps(this.list, api.getContentProps(), this.mid);
      this.project(api);
      if (closing) this.holdExit();
      if (api.open && !this.shown) this.announce(true);
    });
  }
  /** Keep the just-closed list up through its exit animation. `spreadProps` re-applies
   *  `hidden` only when the machine's value for it changes, so the list stays shown until
   *  the exit ends — or until a reopen, which projects `hidden: false` itself. */
  holdExit() {
    this.list.hidden = false;
    this.exit = holdForExit(this.list, () => {
      this.exit = null;
      if (!this.shown) this.list.hidden = true;
    });
  }
  get api() {
    return this.ctrl.connect(this.handle.service);
  }
  announce(open2) {
    this.shown = open2;
    announceSurface(this.list, open2, "menu", this.opener);
  }
  setItems(items) {
    this.items = items;
    for (const sub of this.subs.values()) sub.destroy();
    this.subs.clear();
    this.build();
    const api = this.api;
    for (const sub of this.subs.values()) {
      api.setChild(sub.handle.service);
      sub.api.setParent(this.handle.service);
    }
    this.handle.flush();
    if (this.subs.size > 0) queueMicrotask(() => this.handle.flush());
  }
  destroy() {
    for (const sub of this.subs.values()) sub.destroy();
    this.subs.clear();
    this.exit?.finish();
    this.handle.stop();
    if (this.shown) this.announce(false);
    this.positioner.remove();
  }
  byId(id) {
    return this.items.find((i) => i.id === id);
  }
  /** Push the machine's item props onto the rendered rows. A branch takes the submenu
   *  trigger props, which carry the child's ids and hover handlers; a leaf takes plain ones. */
  project(api) {
    for (const li of this.list.children) {
      const id = li.dataset.veiId;
      if (!id) continue;
      const sub = this.subs.get(id);
      if (sub) {
        spreadProps(li, api.getTriggerItemProps(sub.api), this.mid);
        continue;
      }
      const item = this.byId(id);
      spreadProps(li, api.getItemProps({ value: id, disabled: item?.disabled, closeOnSelect: item?.toggle ? false : void 0 }), this.mid);
    }
  }
  build() {
    const doc = this.doc;
    this.list.replaceChildren();
    const iconic = this.items.some((i) => !!i.icon);
    const badged = this.iconBadges && iconic;
    const markable = this.checkmarks && !badged && this.items.some((i) => !(i.submenu && i.submenu.length > 0) && !i.toggle && i.checked !== void 0);
    if (badged) this.list.dataset.badges = "1";
    else delete this.list.dataset.badges;
    for (const item of this.items) {
      if (item.separatorBefore) {
        const sep = doc.createElement("li");
        sep.className = "vela-menu-sep";
        sep.setAttribute("role", "separator");
        this.list.appendChild(sep);
      }
      const branch = item.submenu !== void 0 && item.submenu.length > 0;
      const li = doc.createElement("li");
      li.className = "vela-menu-item";
      li.dataset.veiId = item.id;
      if (item.toggle) {
        li.dataset.toggle = "1";
      }
      if (markable) {
        const mark = doc.createElement("span");
        mark.className = "vela-menu-mark";
        if (!branch && !item.toggle && item.checked) {
          mark.appendChild(iconEl("check", doc));
          li.dataset.checkmark = "1";
        }
        li.appendChild(mark);
      } else if (badged && this.checkmarks && !branch && !item.toggle && item.checked) {
        li.dataset.checkmark = "1";
      } else if (!branch && !item.toggle && item.checked) {
        li.dataset.checked = "1";
      }
      if (badged) {
        const badge = doc.createElement("span");
        badge.className = "vela-menu-badge";
        const glyph = item.icon || (li.dataset.checkmark ? "check" : "");
        if (glyph) badge.appendChild(iconEl(glyph, doc));
        li.appendChild(badge);
      } else if (item.icon) {
        li.appendChild(iconEl(item.icon, doc));
      } else if (iconic) {
        li.appendChild(iconEl("", doc));
      }
      const label = doc.createElement("span");
      label.className = "vela-menu-label";
      label.textContent = vt(item.label);
      li.appendChild(label);
      if (item.hint) {
        const hint = doc.createElement("span");
        hint.className = "vela-menu-hint";
        hint.textContent = vt(item.hint);
        li.appendChild(hint);
      }
      if (item.favorite !== void 0 && this.onFavorite) {
        const on = item.favorite;
        const star = iconEl(on ? "star-filled" : "star", doc);
        star.classList.add("vela-menu-star");
        if (on) star.classList.add("vela-fav");
        star.removeAttribute("aria-hidden");
        star.setAttribute("role", "button");
        star.setAttribute("aria-label", vt(on ? "Remove from favorites" : "Add to favorites"));
        star.setAttribute("aria-pressed", on ? "true" : "false");
        for (const ev of ["pointerdown", "pointerup", "mousedown", "mouseup"]) {
          star.addEventListener(ev, (e) => e.stopPropagation());
        }
        star.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.onFavorite?.(item.id, !on);
        });
        li.appendChild(star);
      }
      if (item.toggle) {
        const sw = doc.createElement("span");
        sw.className = "vela-menu-switch" + (item.checked ? " on" : "");
        sw.setAttribute("aria-hidden", "true");
        li.appendChild(sw);
      }
      if (branch) {
        li.dataset.branch = "1";
        const arrow = iconEl("chevron-right", doc);
        arrow.classList.add("vela-menu-arrow");
        li.appendChild(arrow);
        const sub = new _Surface(doc, {
          host: this.host,
          placement: "right-start",
          opener: li,
          onSelect: this.onSelect,
          onFavorite: this.onFavorite,
          checkmarks: this.checkmarks,
          iconBadges: this.iconBadges,
          id: `${this.mid}--${item.id}`
        });
        sub.setItems(item.submenu ?? []);
        this.subs.set(item.id, sub);
      }
      this.list.appendChild(li);
    }
  }
};
var SHEET_STYLE_ID = "vela-menu-sheet";
var SHEET_CSS = `
.vela-msheet { padding: 2px 0 6px; }
.vela-msheet-row { all: unset; box-sizing: border-box; width: 100%; display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 6px; border-radius: 8px; cursor: pointer; color: var(--vela-fg-bright); font-size: 15px; -webkit-tap-highlight-color: transparent; }
.vela-msheet-row:active { background: var(--vela-hover); }
.vela-msheet-row[aria-checked='true']:not([data-toggle]) { background: var(--vela-hover-strong); font-weight: 600; }
.vela-msheet-row[aria-disabled='true'] { opacity: 0.4; cursor: default; }
.vela-msheet-row[data-sep] { margin-top: 6px; border-top: 1px solid var(--vela-border); border-radius: 0 0 8px 8px; }
.vela-msheet-row .vela-icon, .vela-msheet-row > svg { flex: none; width: 18px; height: 18px; font-size: 18px; color: var(--vela-fg-muted); }
.vela-msheet-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vela-msheet-hint, .vela-msheet-tick { flex: none; color: var(--vela-fg-muted); font-size: 13px; }
.vela-msheet-back { font-weight: 600; border-bottom: 1px solid var(--vela-border); border-radius: 0; margin-bottom: 4px; }
.vela-msheet-row .vela-menu-switch { flex: none; }
`;
function phoneLike(doc) {
  const win = doc.defaultView;
  if (!win) return false;
  let coarse = false;
  try {
    coarse = win.matchMedia("(pointer: coarse)").matches;
  } catch {
  }
  return coarse && win.innerWidth < 900;
}
var Menu = class {
  constructor(opts) {
    this.sheet = null;
    /** Re-render the open sheet's top page (setItems while it is open: a checklist pick flips other rows). */
    this.sheetRefresh = null;
    this.opts = opts;
    this.items = opts.items;
    const anchor = opts.trigger ?? opts.host ?? document.body;
    const doc = anchor.ownerDocument;
    injectStyles(MENU_STYLE_ID, MENU_CSS, doc);
    const host = floatingLayerHost(opts.host ?? anchor, doc.body);
    this.root = new Surface(doc, {
      host,
      placement: opts.placement,
      onSelect: (id) => opts.onSelect?.(id),
      onOpenChange: opts.onOpenChange,
      trigger: opts.trigger,
      triggerId: opts.triggerId,
      id: opts.id,
      minWidth: opts.minWidth,
      maxHeight: opts.maxHeight,
      flip: opts.flip,
      onFavorite: opts.onFavorite,
      checkmarks: opts.checkmarks,
      iconBadges: opts.iconBadges
    });
    this.root.setItems(opts.items);
  }
  get api() {
    return this.root.api;
  }
  open() {
    if (this.sheetMode()) this.openSheet();
    else this.api.setOpen(true);
  }
  /** On a phone a menu with no visible button to hang from opened as a small dropdown pinned in a corner, floating
   *  over the chart (the language picker, Add widget and Templates from the More sheet; user report 2026-10-28,
   *  "kind of slop", the third time). There it opens as a bottom sheet like the phone's other menus. */
  sheetMode() {
    const anchor = this.opts.trigger ?? this.opts.host ?? document.body;
    const t = this.opts.trigger;
    const triggerShown = !!t && t.isConnected && t.getClientRects().length > 0;
    const inDialog = !!t?.closest?.(".vela-dialog");
    return (!triggerShown || inDialog) && phoneLike(anchor.ownerDocument);
  }
  openSheet() {
    const anchor = this.opts.host ?? this.opts.trigger ?? document.body;
    const doc = anchor.ownerDocument;
    injectStyles(SHEET_STYLE_ID, SHEET_CSS, doc);
    this.sheet?.destroy();
    const stack = [];
    const sheet = new Drawer({
      host: this.opts.host ?? doc.body,
      onOpenChange: (open2) => {
        this.opts.onOpenChange?.(open2);
        if (open2) return;
        setTimeout(() => sheet.destroy(), 0);
        if (this.sheet === sheet) {
          this.sheet = null;
          this.sheetRefresh = null;
        }
      }
    });
    this.sheet = sheet;
    const render = (items) => {
      sheet.body.replaceChildren();
      const list = doc.createElement("div");
      list.className = "vela-msheet";
      list.setAttribute("role", "menu");
      const top = stack[stack.length - 1];
      if (top) {
        const back = doc.createElement("button");
        back.type = "button";
        back.className = "vela-msheet-row vela-msheet-back";
        back.appendChild(iconEl("chevron-left", doc));
        const t = doc.createElement("span");
        t.className = "vela-msheet-label";
        t.textContent = vt(top.title);
        back.appendChild(t);
        back.addEventListener("click", () => {
          stack.pop();
          render(stack[stack.length - 1]?.items ?? this.items);
        });
        list.appendChild(back);
      }
      for (const item of items) {
        const row = doc.createElement("button");
        row.type = "button";
        row.className = "vela-msheet-row";
        row.dataset.id = item.id;
        row.setAttribute("role", item.toggle ? "menuitemcheckbox" : item.checked !== void 0 ? "menuitemradio" : "menuitem");
        if (item.checked !== void 0) row.setAttribute("aria-checked", String(!!item.checked));
        if (item.toggle) row.dataset.toggle = "1";
        if (item.separatorBefore) row.dataset.sep = "1";
        if (item.disabled) row.setAttribute("aria-disabled", "true");
        if (item.icon) row.appendChild(iconEl(item.icon, doc));
        const label = doc.createElement("span");
        label.className = "vela-msheet-label";
        label.textContent = vt(item.label);
        row.appendChild(label);
        if (item.hint) {
          const hint = doc.createElement("span");
          hint.className = "vela-msheet-hint";
          hint.textContent = item.hint;
          row.appendChild(hint);
        }
        if (item.toggle) {
          const sw = doc.createElement("span");
          sw.className = "vela-menu-switch" + (item.checked ? " on" : "");
          sw.setAttribute("aria-hidden", "true");
          row.appendChild(sw);
        } else if (item.submenu) {
          row.appendChild(iconEl("chevron-right", doc));
        } else if (item.checked) {
          const tick = doc.createElement("span");
          tick.className = "vela-msheet-tick";
          tick.textContent = "\u2713";
          row.appendChild(tick);
        }
        row.addEventListener("click", () => {
          if (item.disabled) return;
          if (item.submenu) {
            stack.push({ title: item.label, items: item.submenu });
            render(item.submenu);
            return;
          }
          if (item.toggle) {
            this.opts.onSelect?.(item.id);
            if (!row.isConnected) return;
            const on = row.getAttribute("aria-checked") !== "true";
            row.setAttribute("aria-checked", String(on));
            row.querySelector(".vela-menu-switch")?.classList.toggle("on", on);
            return;
          }
          sheet.hide();
          this.opts.onSelect?.(item.id);
        });
        list.appendChild(row);
      }
      sheet.body.appendChild(list);
    };
    this.sheetRefresh = () => {
      if (stack.length === 0) render(this.items);
    };
    render(this.items);
    sheet.show();
  }
  /** Open anchored to a viewport point (context menus). */
  openAt(clientX, clientY) {
    const api = this.api;
    api.setOpen(true);
    api.reposition({ getAnchorRect: () => ({ x: clientX, y: clientY, width: 0, height: 0 }), overlap: true });
  }
  close() {
    this.sheet?.hide();
    this.api.setOpen(false);
  }
  /** Swap the item descriptors (e.g. checked states) and re-project. */
  setItems(items) {
    this.items = items;
    this.root.setItems(items);
    this.sheetRefresh?.();
  }
  destroy() {
    this.sheet?.destroy();
    this.sheet = null;
    this.sheetRefresh = null;
    this.root.destroy();
  }
};

// src/ui/components/popover/controller.ts
function insetRect(r, inset) {
  return {
    left: r.left + inset,
    top: r.top + inset,
    right: r.right - inset,
    bottom: r.bottom - inset,
    width: r.width - inset * 2,
    height: r.height - inset * 2
  };
}
function viewportRect(width, height, inset) {
  return {
    left: inset,
    top: inset,
    right: width - inset,
    bottom: height - inset,
    width: width - inset * 2,
    height: height - inset * 2
  };
}
function intersectRects(a, b) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}
function placePopover(a) {
  let left = a.align === "end" ? a.trigger.right - a.pop.width : a.align === "center" ? a.trigger.left + a.trigger.width / 2 - a.pop.width / 2 : a.trigger.left;
  const below = a.trigger.bottom + a.gap;
  const above = a.trigger.top - a.pop.height - a.gap;
  const fitsBelow = below + a.pop.height <= a.clamp.bottom;
  const fitsAbove = above >= a.clamp.top;
  let top = below;
  if (!fitsBelow && (fitsAbove || a.trigger.top - a.clamp.top > a.clamp.bottom - a.trigger.bottom)) {
    top = Math.max(a.clamp.top, above);
  }
  if (left + a.pop.width > a.clamp.right) left = a.clamp.right - a.pop.width;
  if (left < a.clamp.left) left = a.clamp.left;
  if (top + a.pop.height > a.clamp.bottom) top = a.clamp.bottom - a.pop.height;
  if (top < a.clamp.top) top = a.clamp.top;
  return {
    left: Math.round(left - a.originX),
    top: Math.round(top - a.originY)
  };
}
function popoverController(opts = {}) {
  return {
    gap: opts.gap ?? 4,
    align: opts.align ?? "start",
    matchWidth: opts.matchWidth ?? false,
    position: opts.position ?? "fixed",
    boundaryInset: opts.boundaryInset ?? 0,
    viewportInset: opts.viewportInset ?? 6,
    onClose: opts.onClose
  };
}

// src/ui/components/popover/styles.ts
var POPOVER_STYLE_ID = "vela-ui-popover";
var POPOVER_CSS = `
.vela-popover {
    position: fixed;
    z-index: var(--vela-z-popover);
    box-sizing: border-box;
    /* Never serve as a scroll anchor: the shell is portaled and re-placed between
       gestures, and anchoring against it jumps the scroller underneath. */
    overflow-anchor: none;
}
.vela-popover[data-position='absolute'] { position: absolute; }
.vela-popover[hidden] { display: none !important; }
`;

// src/ui/components/popover/view.ts
var open = null;
var leaving = /* @__PURE__ */ new Set();
function closeOpenPopovers() {
  open?.hide();
}
function isPopoverOpen() {
  return open !== null;
}
function openPopoverTrigger() {
  return open?.trigger ?? null;
}
var POPOVER_DISMISS_FLAG = "__velaPopoverDismiss";
function markPopoverDismiss(e) {
  e[POPOVER_DISMISS_FLAG] = true;
}
function eventDismissedPopover(e) {
  return e[POPOVER_DISMISS_FLAG] === true;
}
function toRect(r) {
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}
var Popover = class {
  constructor(opts) {
    this.onOutside = null;
    this.onKey = null;
    this.onReflow = null;
    this.shown = false;
    /** The pending removal of a fading-out shell; a show() that reuses the shell cancels it. */
    this.leaveTimer = null;
    /** The shell's exit animation before it leaves the DOM; a show() that reuses the shell cancels it. */
    this.exit = null;
    const doc = opts.trigger.ownerDocument;
    injectStyles(POPOVER_STYLE_ID, POPOVER_CSS, doc);
    this.trigger = opts.trigger;
    this.host = opts.host ?? floatingLayerHost(opts.trigger, doc.body);
    this.inheritsTokens = !opts.host && this.host !== doc.body;
    this.ctrl = popoverController(opts);
    this.boundary = opts.boundary ?? "viewport";
    this.theme = opts.theme;
    this.fadeMs = Math.max(0, opts.fadeMs ?? 0);
    this.el = doc.createElement("div");
    this.el.className = "vela-popover vela-ui-layer" + (opts.className ? ` ${opts.className}` : "");
    this.el.dataset.position = this.ctrl.position;
    if (opts.zIndex !== void 0) this.el.style.zIndex = String(opts.zIndex);
    this.el.addEventListener("pointerdown", (e) => e.stopPropagation());
    if (opts.content instanceof Node) this.el.appendChild(opts.content);
    else if (typeof opts.content === "function") opts.content(this.el);
  }
  get open() {
    return this.shown;
  }
  get position() {
    return this.ctrl.position;
  }
  get align() {
    return this.ctrl.align;
  }
  show() {
    if (this.shown) {
      this.place();
      return;
    }
    if (open && open !== this) open.hide();
    if (this.leaveTimer !== null) {
      clearTimeout(this.leaveTimer);
      this.leaveTimer = null;
    }
    this.exit?.cancel();
    this.exit = null;
    leaving.delete(this);
    for (const p of [...leaving]) if (p.trigger === this.trigger) p.exit?.finish();
    ensureUIHost(this.el, this.inheritsTokens ? void 0 : this.theme);
    if (this.fadeMs > 0) {
      this.el.style.transition = `opacity ${this.fadeMs}ms ease`;
      this.el.style.opacity = "0";
      this.el.style.pointerEvents = "";
    }
    this.host.appendChild(this.el);
    this.shown = true;
    open = this;
    this.place();
    if (this.fadeMs > 0) this.el.style.opacity = "1";
    const onOutside = (ev) => {
      const t = ev.target;
      if (this.el.contains(t) || this.trigger.contains(t)) return;
      markPopoverDismiss(ev);
      this.hide();
    };
    const onKey = (ev) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      ev.stopPropagation();
      this.hide();
    };
    const onReflow = () => this.place();
    setTimeout(() => {
      if (this.onOutside === onOutside) document.addEventListener("pointerdown", onOutside, true);
    }, 0);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onReflow, true);
    document.addEventListener("scroll", onReflow, true);
    this.onOutside = onOutside;
    this.onKey = onKey;
    this.onReflow = onReflow;
    announceSurface(this.el, true, "popover", this.trigger);
  }
  hide() {
    if (!this.shown) return;
    this.shown = false;
    announceSurface(this.el, false, "popover", this.trigger);
    if (this.onOutside) document.removeEventListener("pointerdown", this.onOutside, true);
    if (this.onKey) document.removeEventListener("keydown", this.onKey, true);
    if (this.onReflow) {
      window.removeEventListener("resize", this.onReflow, true);
      document.removeEventListener("scroll", this.onReflow, true);
    }
    this.onOutside = null;
    this.onKey = null;
    this.onReflow = null;
    if (this.fadeMs > 0) {
      this.el.style.opacity = "0";
      this.el.style.pointerEvents = "none";
      this.leaveTimer = setTimeout(() => {
        this.leaveTimer = null;
        this.el.remove();
      }, this.fadeMs);
    } else {
      this.exit = holdForExit(this.el, () => {
        this.exit = null;
        leaving.delete(this);
        this.el.remove();
      });
      if (this.exit) leaving.add(this);
    }
    if (open === this) open = null;
    this.ctrl.onClose?.();
  }
  /** Show if closed, hide if this instance is the open popover. */
  toggle() {
    if (this.shown) this.hide();
    else this.show();
  }
  destroy() {
    this.hide();
    this.exit?.finish();
  }
  reposition() {
    if (this.shown) this.place();
  }
  clampRect() {
    const view = viewportRect(window.innerWidth, window.innerHeight, this.ctrl.viewportInset);
    const bound = this.readBoundary();
    if (!bound) return view;
    const inset = insetRect(bound, this.ctrl.boundaryInset);
    return intersectRects(view, inset);
  }
  readBoundary() {
    const b = this.boundary;
    if (b === "viewport") return null;
    const raw = typeof b === "function" ? b() : b.getBoundingClientRect();
    return raw ? toRect(raw) : null;
  }
  place() {
    const ar = this.trigger.getBoundingClientRect();
    if (this.ctrl.matchWidth) {
      this.el.style.minWidth = `${Math.round(Math.max(this.el.offsetWidth, ar.width))}px`;
    }
    const origin = this.ctrl.position === "absolute" ? this.host.getBoundingClientRect() : { left: 0, top: 0 };
    const pos = placePopover({
      trigger: toRect(ar),
      pop: { width: this.el.offsetWidth, height: this.el.offsetHeight },
      gap: this.ctrl.gap,
      align: this.ctrl.align,
      clamp: this.clampRect(),
      originX: origin.left,
      originY: origin.top
    });
    this.el.style.left = `${pos.left}px`;
    this.el.style.top = `${pos.top}px`;
  }
};

// src/ui/components/callout-bubble/controller.ts
function closesPanel(item) {
  return item.close !== false;
}
function calloutPanelRows(items) {
  const rows = [];
  for (const item of items) {
    if (item.type === "text") {
      rows.push({ type: "text", text: item.text });
      continue;
    }
    const last = rows[rows.length - 1];
    if (last && last.type === "buttons") last.buttons.push(item);
    else rows.push({ type: "buttons", buttons: [item] });
  }
  return rows;
}

// src/ui/components/callout-bubble/styles.ts
var CALLOUT_STYLE_ID = "vela-ui-callout-bubble";
var CALLOUT_CSS = `
.vela-callout {
    display: inline-grid;
    place-items: center;
    border-radius: 50%;
    flex: none;
    line-height: 0;
    box-sizing: border-box;
    cursor: default;
    user-select: none;
    -webkit-user-select: none;
}
.vela-callout[role='button'] { cursor: pointer; }
.vela-callout svg { display: block; }
/* The deployed panel \u2014 carries the kit's elevated-card look itself (the popover
   shell is bare positioning chrome). */
.vela-callout-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    max-width: 280px;
    box-sizing: border-box;
    background: var(--vela-surface-elev);
    border: 1px solid var(--vela-border-strong);
    border-radius: 6px;
    box-shadow: var(--vela-shadow);
    color: var(--vela-fg);
    font: var(--vela-font-size-md) var(--vela-font);
}
.vela-callout-title { font-weight: 600; color: var(--vela-fg-bright); }
.vela-callout-text { color: var(--vela-fg-muted); line-height: 1.45; white-space: pre-line; }
.vela-callout-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.vela-callout-btn {
    cursor: pointer;
    height: 26px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--vela-border);
    background: transparent;
    color: var(--vela-fg);
    font-size: var(--vela-font-size-md);
    font-family: inherit;
    transition: background var(--vela-dur-fast) ease, color var(--vela-dur-fast) ease, opacity var(--vela-dur-fast) ease, border-color var(--vela-dur-fast) ease;
}
.vela-callout-btn:hover { background: var(--vela-hover); color: var(--vela-fg-bright); border-color: var(--vela-fg-muted); }
.vela-callout-btn-primary { border-color: var(--vela-selected-bg); background: var(--vela-selected-bg); color: var(--vela-selected-fg); }
.vela-callout-btn-primary:hover { background: var(--vela-selected-bg); color: var(--vela-selected-fg); opacity: 0.85; border-color: var(--vela-selected-bg); }
`;

// src/ui/components/callout-bubble/view.ts
var CalloutBubble = class {
  constructor(opts) {
    this.pop = null;
    this.spec = { icon: opts.icon, background: opts.background, label: opts.label };
    if (opts.color !== void 0) this.spec.color = opts.color;
    if (opts.panel !== void 0) this.spec.panel = opts.panel;
    if (opts.span !== void 0) this.spec.span = opts.span;
    this.size = opts.size ?? 16;
    this.host = opts.host;
    this.theme = opts.theme;
    this.boundary = opts.boundary;
    const doc = (opts.host ?? document.body).ownerDocument;
    injectStyles(CALLOUT_STYLE_ID, CALLOUT_CSS, doc);
    this.el = doc.createElement("span");
    this.el.className = "vela-callout";
    this.el.style.height = `${this.size}px`;
    this.el.addEventListener("click", (e) => {
      if (!this.spec.panel) return;
      e.stopPropagation();
      this.toggle();
    });
    this.el.addEventListener("dblclick", (e) => {
      if (this.spec.panel) e.stopPropagation();
    });
    this.el.addEventListener("keydown", (e) => {
      if (!this.spec.panel || e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      this.toggle();
    });
    this.dress();
  }
  /** Re-dress the bubble (a status change: new icon, tint, label, panel). */
  set(spec) {
    this.spec = { ...this.spec, ...spec };
    if ("panel" in spec) this.pop?.hide();
    this.dress();
  }
  /** Whether the deployed panel is currently open. */
  get open() {
    return this.pop?.open ?? false;
  }
  /** Close the deployed panel, if any. The bubble itself stays. */
  hidePanel() {
    this.pop?.hide();
  }
  destroy() {
    this.pop?.destroy();
    this.pop = null;
    this.el.remove();
  }
  dress() {
    const clickable = this.spec.panel !== void 0;
    this.el.style.background = this.spec.background;
    this.el.style.color = this.spec.color ?? "";
    const span = Math.min(6, Math.max(1, Math.round(this.spec.span ?? 1)));
    const ip = this.size - 4;
    this.el.style.width = `${this.size + (span - 1) * ip}px`;
    this.el.style.borderRadius = span > 1 ? `${this.size / 2}px` : "";
    this.el.innerHTML = iconAt(this.spec.icon, ip, ip * span);
    this.el.setAttribute("aria-label", vt(this.spec.label));
    if (clickable) {
      this.el.setAttribute("role", "button");
      this.el.tabIndex = 0;
    } else {
      this.el.removeAttribute("role");
      this.el.removeAttribute("tabindex");
    }
  }
  toggle() {
    if (this.pop?.open) {
      this.pop.hide();
      return;
    }
    const panel = this.spec.panel;
    if (!panel) return;
    this.pop?.destroy();
    this.pop = new Popover({
      trigger: this.el,
      gap: 6,
      content: (body) => this.buildPanel(body, panel),
      ...this.host ? { host: this.host } : {},
      ...this.theme ? { theme: this.theme() } : {},
      ...this.boundary ? { boundary: this.boundary } : {}
    });
    this.pop.show();
  }
  buildPanel(body, panel) {
    const doc = body.ownerDocument;
    const root = doc.createElement("div");
    root.className = "vela-callout-panel";
    if (panel.title) {
      const title = doc.createElement("div");
      title.className = "vela-callout-title";
      title.textContent = vt(panel.title);
      root.appendChild(title);
    }
    for (const row of calloutPanelRows(panel.items)) {
      if (row.type === "text") {
        const text = doc.createElement("div");
        text.className = "vela-callout-text";
        text.textContent = vt(row.text);
        root.appendChild(text);
        continue;
      }
      const actions = doc.createElement("div");
      actions.className = "vela-callout-actions";
      for (const item of row.buttons) {
        const btn = doc.createElement("button");
        btn.type = "button";
        btn.className = "vela-callout-btn" + (item.primary ? " vela-callout-btn-primary" : "");
        btn.textContent = vt(item.label);
        btn.addEventListener("click", () => {
          item.run();
          if (closesPanel(item)) this.pop?.hide();
        });
        actions.appendChild(btn);
      }
      root.appendChild(actions);
    }
    body.appendChild(root);
  }
};

// src/ui/components/select/controller.ts
function selectController(opts) {
  const options = opts.options;
  let value = opts.value ?? options[0]?.value ?? "";
  const size = opts.size ?? "md";
  return {
    options,
    get value() {
      return value;
    },
    size,
    fill: opts.fill ?? size !== "sm",
    disabled: opts.disabled ?? false,
    setValue(v) {
      value = v;
    },
    labelOf(v) {
      return options.find((o) => o.value === v)?.label ?? v;
    },
    pick(v) {
      value = v;
      const label = options.find((o) => o.value === v)?.label ?? v;
      opts.onChange?.(v, label);
      return { value: v, label };
    }
  };
}

// src/ui/components/select/styles.ts
var SELECT_STYLE_ID = "vela-ui-select-3";
var SELECT_CSS = `
.vela-select { position: relative; display: inline-block; min-width: 0; }
.vela-select[data-fill] { width: 100%; }
/* Closed trigger matches NumberInput / TextField (100px). Long labels ellipsis;
   the open list still sizes to the longest item. */
.vela-select:not([data-fill]) { width: 100px; flex: none; justify-self: start; }
.vela-select-trigger {
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 34px;
    padding: 0 26px 0 8px;
    background: transparent;
    border: 1px solid var(--vela-border-strong);
    border-radius: 6px;
    color: var(--vela-fg-bright);
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    outline: none;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.vela-select-trigger:hover { border-color: var(--vela-fg-muted); }
.vela-select-trigger:focus { border-color: var(--vela-focus); box-shadow: 0 0 0 3px var(--vela-focus-soft); }
.vela-select[data-size='sm'] .vela-select-trigger {
    height: 28px;
    background: var(--vela-surface-elev);
    border-radius: var(--vela-radius-sm);
    color: var(--vela-fg);
    font-size: 13px;
    box-shadow: none;
}
.vela-select[data-size='sm'] .vela-select-trigger:focus { box-shadow: none; border-color: var(--vela-fg-muted); }
.vela-select-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Compact toolbar selects still hug the widest option (no 100px kit column). */
.vela-select[data-size='sm']:not([data-fill]) { width: auto; max-width: 200px; }
.vela-select-sizer { visibility: hidden; height: 0; overflow: hidden; font-size: 13px; }
.vela-select-sizer span { display: block; height: 0; white-space: nowrap; padding: 0 26px 0 8px; border-inline: 1px solid transparent; }
.vela-select-chevron {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    display: flex;
    opacity: 0.55;
    line-height: 0;
    color: inherit;
}
.vela-select-chevron .vela-icon, .vela-select-chevron svg { width: 12px; height: 12px; display: block; }
.vela-select-list {
    width: max-content;
    background: var(--vela-bg);
    color: var(--vela-fg);
    border: none;
    border-radius: 6px;
    box-shadow: var(--vela-shadow);
    font: 14px var(--vela-font);
    padding: 4px;
    overflow: hidden;
}
.vela-select-list[data-size='sm'] { font-size: 13px; background: var(--vela-surface-overlay); }
.vela-select-items { width: max-content; min-width: 100%; max-height: none; overflow: hidden; }
.vela-select-list.is-scroll { display: flex; align-items: stretch; gap: 2px; }
.vela-select-list.is-scroll .vela-select-items {
    flex: 1 1 auto;
    min-width: min-content;
    max-height: 240px;
    overflow-y: auto;
    scrollbar-width: none;
}
.vela-select-list.is-scroll .vela-select-items::-webkit-scrollbar { display: none; width: 0; height: 0; }
.vela-select-rail { position: relative; flex: none; width: 3px; margin: 2px 1px 2px 0; pointer-events: none; }
.vela-select-thumb { width: 3px; border-radius: 2px; background: var(--vela-scroll); }
.vela-select-item {
    display: block;
    width: auto;
    min-width: 100%;
    white-space: nowrap;
    text-align: left;
    padding: 7px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 400;
}
.vela-select-item:hover { background: var(--vela-hover); }
.vela-select-item[data-checked] { background: var(--vela-hover-strong); color: var(--vela-fg-bright); }
.vela-select-item[data-checked]:hover { background: var(--vela-hover-strong); }
`;

// src/ui/components/select/view.ts
function ensureSelectStyles(doc) {
  injectStyles(SELECT_STYLE_ID, SELECT_CSS, doc);
}
function syncThumb(list, thumb) {
  const view = list.clientHeight;
  const total = list.scrollHeight;
  if (total <= view) {
    thumb.style.height = "0";
    return;
  }
  const thumbH = Math.max(20, view / total * view);
  const top = list.scrollTop / (total - view) * (view - thumbH);
  thumb.style.height = `${Math.round(thumbH)}px`;
  thumb.style.transform = `translateY(${Math.round(top)}px`;
}
function fillSelectList(menu2, options, current, onPick) {
  menu2.replaceChildren();
  const list = menu2.ownerDocument.createElement("div");
  list.className = "vela-select-items";
  for (const p of options) {
    const item = menu2.ownerDocument.createElement("button");
    item.type = "button";
    item.className = "vela-select-item";
    item.textContent = vt(p.label);
    if (p.value === current) item.dataset.checked = "1";
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      onPick(p.value, p.label);
    });
    list.appendChild(item);
  }
  menu2.appendChild(list);
}
function decorateSelectScroll(menu2) {
  const list = menu2.querySelector(".vela-select-items");
  if (!list) return;
  if (list.scrollHeight > 240) {
    menu2.classList.add("is-scroll");
    const rail = menu2.ownerDocument.createElement("div");
    rail.className = "vela-select-rail";
    const thumb = menu2.ownerDocument.createElement("div");
    thumb.className = "vela-select-thumb";
    rail.appendChild(thumb);
    menu2.appendChild(rail);
    list.addEventListener("scroll", () => syncThumb(list, thumb));
    syncThumb(list, thumb);
  }
  menu2.querySelector(".vela-select-item[data-checked]")?.scrollIntoView({ block: "nearest" });
  list.dispatchEvent(new Event("scroll"));
}
function toggleSelectList(trigger, options, current, onPick, opts = {}) {
  if (openPopoverTrigger() === trigger) {
    closeOpenPopovers();
    return null;
  }
  return openSelectList(trigger, options, current, onPick, opts);
}
function openSelectList(trigger, options, current, onPick, opts = {}) {
  ensureSelectStyles(trigger.ownerDocument);
  closeOpenPopovers();
  const pop = new Popover({
    trigger,
    theme: opts.theme,
    matchWidth: opts.matchWidth ?? true,
    boundary: opts.boundary,
    boundaryInset: opts.boundaryInset,
    gap: opts.gap ?? 4,
    align: opts.align ?? "start",
    host: opts.host,
    position: opts.position,
    zIndex: opts.zIndex,
    className: "vela-select-list",
    onClose: opts.onClose,
    content: (el) => {
      if (opts.size) el.dataset.size = opts.size;
      fillSelectList(el, options, current, (value, label) => {
        pop.hide();
        onPick(value, label);
      });
    }
  });
  pop.show();
  decorateSelectScroll(pop.el);
  pop.reposition();
  return pop;
}
var Select = class {
  constructor(opts) {
    this.list = null;
    const doc = opts.list?.host?.ownerDocument ?? document;
    ensureSelectStyles(doc);
    this.ctrl = selectController(opts);
    this.listOpts = { ...opts.list, theme: opts.theme ?? opts.list?.theme, size: this.ctrl.size };
    const wrap = doc.createElement("div");
    wrap.className = "vela-select";
    wrap.dataset.size = this.ctrl.size;
    if (this.ctrl.fill) wrap.dataset.fill = "";
    const btn = doc.createElement("button");
    btn.type = "button";
    if (opts.id) btn.id = opts.id;
    btn.className = "vela-select-trigger";
    if (this.ctrl.disabled) btn.disabled = true;
    const label = doc.createElement("span");
    label.className = "vela-select-label";
    label.textContent = vt(this.ctrl.labelOf(this.ctrl.value));
    const chevron = doc.createElement("span");
    chevron.className = "vela-select-chevron";
    chevron.appendChild(iconEl("chevron-down", doc));
    btn.append(label, chevron);
    wrap.appendChild(btn);
    if (this.ctrl.size === "sm") {
      const sizer = doc.createElement("div");
      sizer.className = "vela-select-sizer";
      sizer.setAttribute("aria-hidden", "true");
      for (const o of this.ctrl.options) {
        const s = doc.createElement("span");
        s.textContent = vt(o.label);
        sizer.appendChild(s);
      }
      wrap.appendChild(sizer);
    }
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.focus({ preventScroll: true });
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (opts.onTrigger) opts.onTrigger(btn);
      else this.toggle();
    });
    this.el = wrap;
    this.trigger = btn;
    this.labelEl = label;
  }
  get value() {
    return this.ctrl.value;
  }
  setValue(v) {
    this.ctrl.setValue(v);
    this.labelEl.textContent = vt(this.ctrl.labelOf(v));
  }
  /** Show `text` on the trigger without changing the value (a host menu's own label). */
  setText(text) {
    this.labelEl.textContent = vt(text);
  }
  toggle() {
    if (this.trigger.closest(".vela-dialog") && phoneLike(this.trigger.ownerDocument)) {
      const m = new Menu({
        trigger: this.trigger,
        items: this.ctrl.options.map((o) => ({ id: o.value, label: o.label, checked: o.value === this.ctrl.value })),
        onOpenChange: (open2) => {
          if (!open2) setTimeout(() => m.destroy(), 0);
        },
        onSelect: (value) => {
          const o = this.ctrl.options.find((x) => x.value === value);
          if (!o) return;
          this.ctrl.pick(o.value);
          this.labelEl.textContent = vt(o.label);
        }
      });
      m.open();
      return;
    }
    this.list = toggleSelectList(
      this.trigger,
      this.ctrl.options,
      this.ctrl.value,
      (value, label) => {
        this.ctrl.pick(value);
        this.labelEl.textContent = vt(label);
        this.list = null;
      },
      { ...this.listOpts, onClose: () => {
        this.list = null;
        this.listOpts.onClose?.();
      } }
    );
  }
  destroy() {
    this.list?.hide();
    this.list = null;
  }
};
function dialogController(opts = {}) {
  return {
    machine: dialog.machine,
    props: {
      id: nextUid("vela-dialog"),
      modal: opts.modal ?? true,
      closeOnEscape: opts.closeOnEscape ?? true,
      // Escape on an open dropdown (a Select's list) closes only the list, not the dialog under it. The dialog's
      // key listener runs before the list's (it was attached first), so it checks for the open list here.
      onEscapeKeyDown: (e) => {
        if (isPopoverOpen()) e.preventDefault();
      },
      closeOnInteractOutside: opts.closeOnInteractOutside ?? false,
      initialFocusEl: opts.initialFocusEl,
      onOpenChange: (d) => opts.onOpenChange?.(d.open)
    },
    connect: (service) => dialog.connect(service, normalizeProps)
  };
}

// src/ui/components/dialog/styles.ts
var DIALOG_STYLE_ID = "vela-ui-dialog-6";
var DIALOG_CSS = `
.vela-dialog-backdrop {
    position: fixed;
    inset: 0;
    background: var(--vela-backdrop);
    z-index: var(--vela-z-dialog);
}
/* Non-dimming variant: still catches outside clicks, but the page stays readable. */
.vela-dialog-backdrop--clear { background: transparent; }
.vela-dialog-positioner {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    z-index: var(--vela-z-dialog);
}
.vela-dialog-backdrop[data-contained],
.vela-dialog-positioner[data-contained] { position: absolute; }
.vela-dialog-positioner[data-align='center'] {
    align-items: center;
    padding-top: 0;
}
.vela-dialog {
    background: var(--vela-surface);
    color: var(--vela-fg);
    border: 1px solid var(--vela-border-strong);
    border-radius: 10px;
    box-shadow: var(--vela-shadow-dialog);
    font-size: 13px;
    min-width: 300px;
    max-width: min(92vw, 560px);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    outline: none;
}
.vela-dialog[data-state='open'] { animation: vela-dialog-in var(--vela-dur-med) var(--vela-ease); }
@keyframes vela-dialog-in {
    from { opacity: 0; transform: translateY(6px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}
.vela-dialog-header {
    display: flex;
    align-items: center;
    padding: 9px 9px 9px 16px;
    border-bottom: 1px solid var(--vela-border);
    user-select: none;
}
.vela-dialog-title { flex: 1; font-size: 17px; font-weight: 600; letter-spacing: 0.2px; color: var(--vela-fg-bright); }
.vela-dialog-close {
    all: unset;
    cursor: pointer;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--vela-fg-muted);
    line-height: 1;
    font-size: 15px;
}
.vela-dialog-close:hover { background: var(--vela-hover); color: var(--vela-fg-bright); }
.vela-dialog-body { padding: var(--vela-space-4); overflow: auto; min-height: 0; flex: 1 1 auto; }
.vela-dialog-body[data-flush] { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.vela-dialog-footer { flex: 0 0 auto; }
.vela-dialog--settings {
    width: fit-content;
    /* One stable width: a fit-content card re-sized per tab/page, so the dialog jumped sideways
       while clicking through the Footprint pages (their selects now show their full value). */
    min-width: min(680px, 94vw);
    max-width: min(720px, 94vw);
    max-height: 70vh;
    font-size: 13px;
    cursor: default;
}
.vela-dialog--form {
    width: fit-content;
    min-width: min(380px, 90%);
    max-width: min(640px, 94%);
    max-height: 82%;
    font-size: 14px;
}
/* Form dialogs (indicator inputs, drawing settings): the tab strip / body owns the
   line under the header, and the footer carries its own top delimiter. */
.vela-dialog--form .vela-dialog-header { align-items: flex-start; padding: 16px 20px 20px; border-bottom: none; }
.vela-dialog--form .vela-dialog-title { font-size: 20px; line-height: 28px; }
.vela-dialog--form .vela-dialog-title:has(.vela-drawing-rename, .vela-drawing-rename-input) { display: flex; align-items: center; gap: 4px; min-width: 0; }
.vela-drawing-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.vela-drawing-rename {
    all: unset;
    cursor: pointer;
    flex: none;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--vela-fg-muted);
    font-size: 18px;
}
.vela-drawing-rename:hover { background: var(--vela-hover); color: var(--vela-fg-bright); }
.vela-drawing-rename:focus-visible { outline: 2px solid var(--vela-accent); outline-offset: 1px; }
.vela-drawing-rename-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    height: 34px;
    margin: -3px 0;
    padding: 0 9px;
    border: 1px solid var(--vela-accent);
    border-radius: 6px;
    background: transparent;
    color: var(--vela-fg-bright);
    font: inherit;
    outline: none;
}
.vela-dialog--form .vela-dialog-footer {
    padding: 16px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    border-top: 1px solid var(--vela-border);
}
.vela-dialog-btn {
    cursor: pointer;
    height: 34px;
    padding: 0 11px;
    border-radius: 6px;
    border: 1px solid var(--vela-border-strong);
    background: transparent;
    color: var(--vela-fg);
    font-weight: 400;
    font-size: 14px;
    font-family: inherit;
    transition: background var(--vela-dur-fast) ease, color var(--vela-dur-fast) ease, opacity var(--vela-dur-fast) ease, border-color var(--vela-dur-fast) ease;
}
.vela-dialog-btn:hover { background: var(--vela-hover); color: var(--vela-fg-bright); border-color: var(--vela-fg-muted); }
.vela-dialog-btn-primary { border-color: var(--vela-selected-bg); background: var(--vela-selected-bg); color: var(--vela-selected-fg); }
.vela-dialog-btn-primary:hover { background: var(--vela-selected-bg); color: var(--vela-selected-fg); opacity: 0.85; border-color: var(--vela-selected-bg); }
${overlayScrollbarCss(".vela-dialog-body")}
/* Scrollers NESTED in a dialog (a flush body's grid, a tab pane) get the same thin
   overlay bars \u2014 the two-class selectors below stay overridable by more specific
   per-dialog sheets. */
${overlayScrollbarCss(".vela-dialog *")}
/* \u2500\u2500 mobile chrome: dialogs fill the shell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Inside a shell in the mobile size class ([data-layout='mobile'] on the widget root,
   which is position:relative) every kit dialog presents fullscreen: desktop cards are
   unusable at phone widths, and the shell's bounds \u2014 not the viewport \u2014 are the honest
   "screen" for an embedded chart. */
[data-layout='mobile'] .vela-dialog-backdrop { position: absolute; }
[data-layout='mobile'] .vela-dialog-positioner {
    position: absolute;
    padding: 0;
    align-items: stretch;
}
[data-layout='mobile'] .vela-dialog {
    width: 100%;
    min-width: 0;
    max-width: none;
    max-height: none;
    flex: 1 1 auto;
    border: none;
    border-radius: 0;
    transform: none !important; /* a desktop drag offset must not survive the flip */
}
[data-layout='mobile'] .vela-dialog-close { width: 40px; height: 40px; }
[data-layout='mobile'] .vela-dialog-body { padding-bottom: calc(var(--vela-space-4) + env(safe-area-inset-bottom, 0px)); }
`;
var Dialog = class {
  constructor(opts = {}) {
    this.opener = null;
    this.wasOpen = false;
    /** The panel and scrim's exit animation after a close; a reopen cancels it. */
    this.exit = null;
    this.destroyed = false;
    const doc = (opts.host ?? document.body).ownerDocument;
    injectStyles(DIALOG_STYLE_ID, DIALOG_CSS, doc);
    const host = opts.host ?? doc.body;
    this.backdrop = doc.createElement("div");
    this.backdrop.className = "vela-dialog-backdrop vela-ui-layer";
    if (opts.dimBackdrop !== true) this.backdrop.classList.add("vela-dialog-backdrop--clear");
    this.positioner = doc.createElement("div");
    this.positioner.className = "vela-dialog-positioner vela-ui-layer";
    if (opts.contained) {
      this.backdrop.dataset.contained = "";
      this.positioner.dataset.contained = "";
    }
    this.positioner.dataset.align = opts.align ?? "top";
    this.panel = doc.createElement("div");
    this.panel.className = "vela-dialog";
    if (opts.className) {
      for (const cls of opts.className.split(/\s+/)) if (cls) this.panel.classList.add(cls);
    }
    this.panel.tabIndex = -1;
    this.panel.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") e.stopPropagation();
    });
    const header = doc.createElement("div");
    header.className = "vela-dialog-header";
    if (opts.draggable) {
      header.style.cursor = "move";
      let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
      header.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".vela-dialog-close")) return;
        dragging = true;
        sx = e.clientX - ox;
        sy = e.clientY - oy;
        header.setPointerCapture(e.pointerId);
      });
      header.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        ox = e.clientX - sx;
        oy = e.clientY - sy;
        this.panel.style.transform = `translate(${ox}px, ${oy}px)`;
      });
      header.addEventListener("pointerup", () => dragging = false);
    }
    if (opts.headerStart) header.appendChild(opts.headerStart);
    const title = doc.createElement("div");
    title.className = "vela-dialog-title";
    title.textContent = vt(opts.title ?? "");
    this.titleEl = title;
    const close = doc.createElement("button");
    close.className = "vela-dialog-close";
    close.setAttribute("aria-label", vt("Close"));
    close.appendChild(iconEl("close", doc));
    header.append(title, close);
    this.body = doc.createElement("div");
    this.body.className = "vela-dialog-body";
    if (opts.flush) this.body.dataset.flush = "";
    if (opts.content instanceof Node) this.body.appendChild(opts.content);
    else if (typeof opts.content === "function") opts.content(this.body);
    this.panel.append(header, this.body);
    if (opts.footer) {
      const foot = doc.createElement("div");
      foot.className = "vela-dialog-footer";
      if (opts.footer instanceof Node) foot.appendChild(opts.footer);
      else opts.footer(foot);
      this.panel.appendChild(foot);
      this.footer = foot;
    } else {
      this.footer = null;
    }
    this.positioner.appendChild(this.panel);
    host.append(this.backdrop, this.positioner);
    if (opts.closeOnBackdrop) {
      const closeOn = (e) => {
        if (e.target !== this.backdrop && e.target !== this.positioner) return;
        if (isPopoverOpen() || eventDismissedPopover(e)) {
          closeOpenPopovers();
          return;
        }
        this.hide();
      };
      this.backdrop.addEventListener("pointerdown", closeOn);
      this.positioner.addEventListener("pointerdown", closeOn);
    }
    this.ctrl = dialogController({
      ...opts,
      // Mobile chrome (fullscreen presentation): opening must never land focus on
      // an input — that pops the on-screen keyboard over the just-opened dialog.
      // Focus goes to the panel; a caller that WANTS the keyboard focuses its
      // input explicitly. Desktop keeps the caller's pick, else the machine's
      // first-tabbable default.
      initialFocusEl: () => {
        if (this.positioner.closest('[data-layout="mobile"]')) return this.panel;
        return opts.initialFocusEl?.() ?? null;
      }
    });
    const mid = String(this.ctrl.props.id);
    this.handle = runMachine(this.ctrl.machine, this.ctrl.props, (service) => {
      const api = this.ctrl.connect(service);
      const closing = this.wasOpen && !api.open;
      if (closing) this.announce(false);
      spreadProps(this.backdrop, api.getBackdropProps(), mid);
      spreadProps(this.positioner, api.getPositionerProps(), mid);
      spreadProps(this.panel, api.getContentProps(), mid);
      spreadProps(title, api.getTitleProps(), mid);
      spreadProps(close, api.getCloseTriggerProps(), mid);
      if (api.open) {
        this.exit?.cancel();
        this.exit = null;
        this.setShown(true);
      } else if (closing) {
        this.holdExit();
      } else if (!this.exit) {
        this.setShown(false);
      }
      if (api.open && !this.wasOpen) this.announce(true);
      if (this.wasOpen && !api.open) this.restoreOpener();
      this.wasOpen = api.open;
    });
  }
  setShown(shown) {
    this.backdrop.style.display = shown ? "" : "none";
    this.positioner.style.display = shown ? "" : "none";
  }
  /** Keep the just-closed dialog up through its exit animation, then hide it — or
   *  remove it, when it was destroyed meanwhile. `spreadProps` re-applies the close
   *  props' `hidden` only when its value changes, so lifting it keeps the panel and
   *  scrim up until the exit ends. The positioner spans the viewport: inert, it lets
   *  clicks through to the page while the panel animates out. */
  holdExit() {
    const held = [this.panel, this.backdrop];
    for (const el of held) el.hidden = false;
    this.exit = holdForExit(
      held,
      () => {
        this.exit = null;
        if (this.destroyed) {
          this.detach();
        } else if (!this.open) {
          for (const el of held) el.hidden = true;
          this.setShown(false);
        }
      },
      { inert: [this.positioner] }
    );
  }
  detach() {
    this.backdrop.remove();
    this.positioner.remove();
  }
  /** Closing hands focus back to whatever opened it (Escape, the ✕, hide(), or a
   *  teardown that outruns the machine's close notification). */
  restoreOpener() {
    const opener = this.opener;
    this.opener = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  announce(open2) {
    const opener = this.opener === this.panel.ownerDocument.body ? null : this.opener;
    announceSurface(this.panel, open2, "dialog", opener);
  }
  get open() {
    return this.ctrl.connect(this.handle.service).open;
  }
  show() {
    this.opener = this.panel.ownerDocument.activeElement;
    this.ctrl.connect(this.handle.service).setOpen(true);
  }
  hide() {
    this.ctrl.connect(this.handle.service).setOpen(false);
  }
  contains(node) {
    if (node == null) return false;
    if (this.panel.contains(node) || this.backdrop.contains(node) || this.positioner.contains(node)) return true;
    const el = node instanceof Element ? node : node.parentElement;
    return el?.closest(".vela-popover, .vela-menu") != null;
  }
  destroy() {
    if (this.wasOpen && !this.open) this.handle.flush();
    if (this.open) this.hide();
    this.handle.stop();
    this.destroyed = true;
    if (this.wasOpen) {
      this.wasOpen = false;
      this.announce(false);
    }
    this.restoreOpener();
    if (!this.exit) this.detach();
  }
};

// src/ui/components/date-picker/controller.ts
var MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function normalizeDateInput(raw) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return isoDate(dt);
}
function parseIsoDate(raw) {
  const iso = raw ? normalizeDateInput(raw) : null;
  if (!iso) return null;
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d);
}
function datePickerController(opts = {}) {
  const today = opts.today ?? /* @__PURE__ */ new Date();
  let selected = parseIsoDate(opts.value);
  let year = selected?.getFullYear() ?? today.getFullYear();
  let month = selected?.getMonth() ?? today.getMonth();
  let panel = "date";
  const decade = () => Math.floor(year / 10) * 10;
  return {
    get panel() {
      return panel;
    },
    get year() {
      return year;
    },
    get month() {
      return month;
    },
    get value() {
      return selected ? isoDate(selected) : null;
    },
    header() {
      return {
        month: MONTH_LABELS[month] ?? "",
        monthVisible: panel === "date",
        year: panel === "year" ? `${decade()}-${decade() + 9}` : String(year),
        yearDisabled: panel === "year"
        // in the decade panel the year reads as its title
      };
    },
    navLabels() {
      if (panel === "date") return { prev: "Previous month", next: "Next month" };
      if (panel === "month") return { prev: "Previous year", next: "Next year" };
      return { prev: "Previous decade", next: "Next decade" };
    },
    cells() {
      const out = [];
      if (panel === "date") {
        const startPad = new Date(year, month, 1).getDay();
        const days = new Date(year, month + 1, 0).getDate();
        const todayIso = isoDate(today);
        const selectedIso = selected ? isoDate(selected) : "";
        for (let i = 0; i < startPad; i++) out.push({ label: "", value: "", checked: false, today: false, blank: true });
        for (let day = 1; day <= days; day++) {
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          out.push({ label: String(day), value: iso, checked: iso === selectedIso, today: iso === todayIso });
        }
        return out;
      }
      if (panel === "month") {
        for (let m = 0; m < 12; m++) {
          out.push({
            label: MONTH_SHORT[m] ?? "",
            value: m,
            checked: selected?.getFullYear() === year && selected.getMonth() === m,
            today: today.getFullYear() === year && today.getMonth() === m
          });
        }
        return out;
      }
      const d = decade();
      for (let y = d - 1; y <= d + 10; y++) {
        out.push({ label: String(y), value: y, checked: selected?.getFullYear() === y, today: today.getFullYear() === y, outside: y < d || y > d + 9 });
      }
      return out;
    },
    step(dir) {
      if (panel === "date") {
        month += dir;
        if (month < 0) {
          month = 11;
          year -= 1;
        }
        if (month > 11) {
          month = 0;
          year += 1;
        }
      } else {
        year += panel === "month" ? dir : dir * 10;
      }
    },
    showMonths() {
      panel = "month";
    },
    showYears() {
      panel = "year";
    },
    choose(cell) {
      if (cell.blank) return null;
      if (panel === "date") {
        selected = parseIsoDate(String(cell.value));
        return selected ? isoDate(selected) : null;
      }
      if (panel === "month") {
        month = Number(cell.value);
        panel = "date";
        return null;
      }
      year = Number(cell.value);
      panel = "month";
      return null;
    },
    setValue(value) {
      selected = parseIsoDate(value);
      if (selected) {
        year = selected.getFullYear();
        month = selected.getMonth();
      }
      panel = "date";
    }
  };
}

// src/ui/components/date-picker/styles.ts
var DATE_PICKER_STYLE_ID = "vela-date-picker-styles";
var DATE_PICKER_CSS = `
.vela-date-picker{color:var(--vela-fg);font:14px var(--vela-font);user-select:none;}
.vela-date-picker [hidden]{display:none !important;}
.vela-date-picker-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}
.vela-date-picker-title{flex:1;display:flex;align-items:center;justify-content:center;gap:2px;min-width:0;}
.vela-date-picker-switch{border:none;background:transparent;color:var(--vela-fg-bright);font:inherit;font-weight:600;font-size:14px;padding:2px 6px;border-radius:4px;cursor:pointer;}
.vela-date-picker-switch:not(:disabled):hover{background:var(--vela-hover);}
.vela-date-picker-switch:disabled{cursor:default;}
.vela-date-picker-nav{width:24px;height:24px;border:none;background:transparent;color:var(--vela-fg-muted);border-radius:4px;padding:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:14px;}
.vela-date-picker-nav:hover{background:var(--vela-hover);color:var(--vela-fg-bright);}
.vela-date-picker-week,.vela-date-picker-grid{display:grid;grid-template-columns:repeat(7,28px);gap:2px;}
.vela-date-picker-week{margin-bottom:4px;color:var(--vela-fg-muted);font-size:11px;text-align:center;}
.vela-date-picker-week span{line-height:20px;}
.vela-date-picker-blank{width:28px;height:28px;}
.vela-date-picker-day{width:28px;height:28px;border:none;background:transparent;color:inherit;border-radius:4px;padding:0;cursor:pointer;font:inherit;font-size:14px;}
.vela-date-picker-day:hover{background:var(--vela-hover);}
.vela-date-picker-day[data-checked]{background:var(--vela-hover-strong);color:var(--vela-fg-bright);}
.vela-date-picker-day[data-today]:not([data-checked]){box-shadow:inset 0 0 0 1px var(--vela-border-strong);}
.vela-date-picker-cells{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;width:calc(7 * 28px + 6 * 2px);}
.vela-date-picker-cell{height:36px;border:none;background:transparent;color:inherit;border-radius:4px;padding:0 4px;cursor:pointer;font:inherit;font-size:14px;}
.vela-date-picker-cell:hover{background:var(--vela-hover);}
.vela-date-picker-cell[data-checked]{background:var(--vela-hover-strong);color:var(--vela-fg-bright);}
.vela-date-picker-cell[data-today]:not([data-checked]){box-shadow:inset 0 0 0 1px var(--vela-border-strong);}
.vela-date-picker-cell[data-outside]{opacity:0.45;}
`;

// src/ui/components/date-picker/view.ts
var DatePicker = class {
  constructor(opts = {}) {
    this.opts = opts;
    const doc = document;
    injectStyles(DATE_PICKER_STYLE_ID, DATE_PICKER_CSS, doc);
    this.ctrl = datePickerController(opts);
    const button = (className) => {
      const b = doc.createElement("button");
      b.type = "button";
      b.className = className;
      return b;
    };
    this.prev = button("vela-date-picker-nav");
    this.prev.append(iconEl("chevron-left", doc));
    this.next = button("vela-date-picker-nav");
    this.next.append(iconEl("chevron-right", doc));
    this.monthBtn = button("vela-date-picker-switch");
    this.monthBtn.setAttribute("aria-label", vt("Choose month"));
    this.yearBtn = button("vela-date-picker-switch");
    this.yearBtn.setAttribute("aria-label", vt("Choose year"));
    const title = doc.createElement("div");
    title.className = "vela-date-picker-title";
    title.append(this.monthBtn, this.yearBtn);
    const head = doc.createElement("div");
    head.className = "vela-date-picker-head";
    head.append(this.prev, title, this.next);
    this.week = doc.createElement("div");
    this.week.className = "vela-date-picker-week";
    for (const d of WEEKDAY_LABELS) {
      const cell = doc.createElement("span");
      cell.textContent = d;
      this.week.appendChild(cell);
    }
    this.grid = doc.createElement("div");
    const on = (el, run) => el.addEventListener("click", (e) => {
      e.stopPropagation();
      run();
      this.paint();
    });
    on(this.prev, () => this.ctrl.step(-1));
    on(this.next, () => this.ctrl.step(1));
    on(this.monthBtn, () => this.ctrl.showMonths());
    on(this.yearBtn, () => this.ctrl.showYears());
    this.el = doc.createElement("div");
    this.el.className = "vela-date-picker";
    this.el.append(head, this.week, this.grid);
    this.paint();
  }
  get value() {
    return this.ctrl.value;
  }
  /** Rewrite the selection without emitting (the calendar opens on its month). */
  setValue(value) {
    this.ctrl.setValue(value);
    this.paint();
  }
  paint() {
    const doc = this.el.ownerDocument;
    const h = this.ctrl.header();
    this.monthBtn.hidden = !h.monthVisible;
    this.monthBtn.textContent = h.month;
    this.yearBtn.textContent = h.year;
    this.yearBtn.disabled = h.yearDisabled;
    const nav = this.ctrl.navLabels();
    this.prev.setAttribute("aria-label", vt(nav.prev));
    this.next.setAttribute("aria-label", vt(nav.next));
    const dates = this.ctrl.panel === "date";
    this.week.hidden = !dates;
    this.grid.className = dates ? "vela-date-picker-grid" : "vela-date-picker-cells";
    this.grid.replaceChildren(...this.ctrl.cells().map((cell) => this.cellEl(doc, cell, dates)));
  }
  cellEl(doc, cell, dates) {
    if (cell.blank) {
      const blank = doc.createElement("span");
      blank.className = "vela-date-picker-blank";
      return blank;
    }
    const b = doc.createElement("button");
    b.type = "button";
    b.className = dates ? "vela-date-picker-day" : "vela-date-picker-cell";
    b.textContent = vt(cell.label);
    if (cell.checked) b.dataset.checked = "1";
    if (cell.today) b.dataset.today = "1";
    if (cell.outside) b.dataset.outside = "1";
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const picked = this.ctrl.choose(cell);
      if (picked) this.opts.onPick?.(picked);
      else this.paint();
    });
    return b;
  }
};

// src/ui/components/switch/controller.ts
function switchController(opts = {}) {
  let checked = opts.checked ?? false;
  const disabled = opts.disabled ?? false;
  return {
    get checked() {
      return checked;
    },
    disabled,
    size: opts.size ?? "md",
    tone: opts.tone ?? "bright",
    setChecked(v) {
      checked = v;
    },
    toggle() {
      if (disabled) return checked;
      checked = !checked;
      opts.onChange?.(checked);
      return checked;
    }
  };
}

// src/ui/components/switch/styles.ts
var SWITCH_STYLE_ID = "vela-ui-switch";
var SWITCH_CSS = `
.vela-switch {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--vela-border);
    border-radius: 5px;
    background: transparent;
    color: transparent;
    cursor: pointer;
    line-height: 0;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.vela-switch .vela-icon, .vela-switch svg { display: block; width: 12px; height: 12px; }
.vela-switch[data-size='sm'] .vela-icon, .vela-switch[data-size='sm'] svg { width: 11px; height: 11px; }
.vela-switch:hover { border-color: var(--vela-fg-muted); }
.vela-switch[data-checked] {
    background: var(--vela-fg-bright);
    border-color: var(--vela-fg-bright);
    color: var(--vela-bg);
}
.vela-switch[data-size='sm'] { width: 18px; height: 18px; border-color: var(--vela-border-strong); }
.vela-switch[data-size='sm']:hover { border-color: var(--vela-fg-muted); }
.vela-switch[data-size='sm'][data-checked] {
    background: var(--vela-selected-bg);
    border-color: var(--vela-selected-bg);
    color: var(--vela-selected-fg);
}
.vela-switch[data-tone='selected'][data-checked] {
    background: var(--vela-selected-bg);
    border-color: var(--vela-selected-bg);
    color: var(--vela-selected-fg);
}
.vela-switch[disabled] { opacity: 0.4; cursor: default; }
`;

// src/ui/components/switch/view.ts
var Switch = class {
  constructor(opts = {}) {
    injectStyles(SWITCH_STYLE_ID, SWITCH_CSS, document);
    this.ctrl = switchController(opts);
    const b = document.createElement("button");
    b.type = "button";
    if (opts.id) b.id = opts.id;
    b.className = "vela-switch";
    b.dataset.size = this.ctrl.size;
    b.dataset.tone = this.ctrl.tone;
    b.setAttribute("role", "switch");
    if (opts.label) b.setAttribute("aria-label", opts.label);
    if (this.ctrl.disabled) b.disabled = true;
    b.appendChild(iconEl("check", b.ownerDocument));
    this.el = b;
    this.paint();
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.focus({ preventScroll: true });
    });
    b.addEventListener("click", () => {
      this.ctrl.toggle();
      this.paint();
    });
  }
  get checked() {
    return this.ctrl.checked;
  }
  setChecked(v) {
    this.ctrl.setChecked(v);
    this.paint();
  }
  paint() {
    const on = this.ctrl.checked;
    this.el.setAttribute("aria-checked", on ? "true" : "false");
    if (on) this.el.dataset.checked = "";
    else delete this.el.dataset.checked;
  }
};

// src/ui/components/number-input/controller.ts
function clampNumber(n, opts) {
  let v = n;
  if (opts.min !== void 0) v = Math.max(opts.min, v);
  if (opts.max !== void 0) v = Math.min(opts.max, v);
  if (opts.integer) v = Math.round(v);
  return v;
}
function decimalsOf(n) {
  const s = String(n);
  const e = s.search(/[eE]/);
  if (e >= 0) {
    const frac = s.slice(0, e).split(".")[1]?.length ?? 0;
    return Math.max(0, Math.min(20, frac - Number(s.slice(e + 1))));
  }
  return s.split(".")[1]?.length ?? 0;
}
function snapToStep(n, base, step) {
  const d = Math.min(20, Math.max(decimalsOf(base), decimalsOf(step)));
  return Number(n.toFixed(d));
}
function numberInputController(opts) {
  let value = opts.value;
  const integer = opts.integer ?? false;
  const commit = opts.commit ?? "blur";
  const clamp = opts.clamp ?? commit === "blur";
  const step = opts.step ?? (integer ? 1 : 0.1);
  const onChange = opts.onChange;
  const normalize = (raw) => clamp ? clampNumber(raw, { min: opts.min, max: opts.max, integer }) : raw;
  const apply = (raw) => {
    if (!Number.isFinite(raw)) return null;
    const n = normalize(raw);
    if (n !== value) {
      value = n;
      onChange?.(n);
    }
    return n;
  };
  return {
    get value() {
      return value;
    },
    min: opts.min,
    max: opts.max,
    step,
    integer,
    size: opts.size ?? "md",
    commit,
    steppers: opts.steppers ?? commit === "blur",
    clamp,
    disabled: opts.disabled ?? false,
    apply,
    sync(raw) {
      const n = Number.isFinite(raw) ? normalize(raw) : value;
      value = n;
      return n;
    },
    nudge(dir) {
      return apply(snapToStep(value + dir * step, value, step));
    }
  };
}

// src/ui/components/number-input/styles.ts
var NUMBER_STYLE_ID = "vela-ui-number-3";
var NUMBER_CSS = `
.vela-num { position: relative; display: inline-block; min-width: 0; }
.vela-num[data-fill] { width: 100%; }
.vela-num:not([data-fill]) { width: 100px; flex: none; justify-self: start; }
.vela-num:not([data-fill])[data-compact] { width: 80px; }
.vela-num input {
    width: 100%;
    box-sizing: border-box;
    height: 34px;
    background: transparent;
    border: 1px solid var(--vela-border-strong);
    border-radius: 6px;
    color: var(--vela-fg-bright);
    padding: 0 8px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
    -moz-appearance: textfield;
    appearance: textfield;
    /* Selectable even under a user-select:none host (chart wrapper, .vela-ui). */
    user-select: text;
    -webkit-user-select: text;
}
.vela-num input::-webkit-inner-spin-button, .vela-num input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.vela-num input:hover { border-color: var(--vela-fg-muted); }
.vela-num input:focus { border-color: var(--vela-focus); box-shadow: 0 0 0 3px var(--vela-focus-soft); }
/* The stepper gutter exists only while the steppers do (hover) \u2014 an idle field keeps
   its full width so long values aren't cut under an invisible arrow column. */
.vela-num[data-steppers]:hover input { padding-right: 26px; }
.vela-num[data-size='sm'] { width: 64px; flex: none; }
.vela-num[data-size='sm'][data-compact] { width: 56px; }
.vela-num[data-size='sm'] input {
    height: 28px;
    background: var(--vela-surface-elev);
    border-radius: var(--vela-radius-sm);
    color: var(--vela-fg);
    font-size: 13px;
    box-shadow: none;
}
.vela-num[data-size='sm'] input:focus { box-shadow: none; }
.vela-num-step {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 22px;
    display: none;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    padding: 2px 6px 2px 0;
    line-height: 0;
}
.vela-num[data-steppers]:hover .vela-num-step { display: flex; }
.vela-num-step button {
    flex: 1;
    width: 100%;
    min-height: 0;
    border: none;
    background: transparent;
    color: var(--vela-fg-muted);
    border-radius: 3px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}
.vela-num-step button:hover { background: var(--vela-hover); color: var(--vela-fg-bright); }
.vela-num-step .vela-icon, .vela-num-step svg { width: 12px; height: 12px; display: block; }
`;

// src/ui/components/number-input/view.ts
var NumberInput = class {
  constructor(opts) {
    const doc = document;
    injectStyles(NUMBER_STYLE_ID, NUMBER_CSS, doc);
    this.ctrl = numberInputController(opts);
    this.placeholderMode = opts.placeholder !== void 0;
    this.emptyValue = opts.emptyValue ?? opts.value;
    this.last = String(opts.value);
    const wrap = doc.createElement("div");
    wrap.className = "vela-num";
    wrap.dataset.size = this.ctrl.size;
    if (opts.fill ?? this.ctrl.size !== "sm") wrap.dataset.fill = "";
    if (opts.compact) wrap.dataset.compact = "";
    if (this.ctrl.steppers) wrap.dataset.steppers = "";
    const ni = doc.createElement("input");
    ni.type = "number";
    if (opts.id) ni.id = opts.id;
    if (opts.title) ni.title = vt(opts.title);
    if (opts.min !== void 0) ni.min = String(opts.min);
    if (opts.max !== void 0) ni.max = String(opts.max);
    ni.step = String(this.ctrl.step);
    if (this.ctrl.disabled) ni.disabled = true;
    if (this.placeholderMode) {
      ni.placeholder = opts.placeholder ?? "";
      ni.value = opts.value !== this.emptyValue ? String(opts.value) : "";
    } else {
      ni.value = String(opts.value);
    }
    const commitRaw = (raw) => {
      const n = this.ctrl.apply(raw);
      if (n === null) {
        ni.value = this.placeholderMode && this.ctrl.value === this.emptyValue ? "" : this.last;
        return;
      }
      this.last = String(n);
      if (this.placeholderMode && n === this.emptyValue) ni.value = "";
      else ni.value = String(n);
    };
    if (this.placeholderMode) {
      ni.addEventListener("change", () => {
        const raw = ni.value.trim() === "" ? this.emptyValue : Number(ni.value);
        commitRaw(Number.isFinite(raw) ? raw : this.emptyValue);
      });
    } else if (this.ctrl.commit === "live") {
      ni.addEventListener("input", () => {
        const v = Number(ni.value);
        if (Number.isFinite(v)) this.ctrl.apply(v);
      });
    } else {
      ni.addEventListener("blur", () => commitRaw(Number(ni.value)));
      ni.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          ni.blur();
        }
      });
    }
    wrap.appendChild(ni);
    if (this.ctrl.steppers) {
      wrap.appendChild(this.buildSteppers(doc, (dir) => {
        const cur = Number(ni.value);
        const base = Number.isFinite(cur) ? cur : this.ctrl.value;
        commitRaw(snapToStep(base + dir * this.ctrl.step, base, this.ctrl.step));
      }));
    }
    this.el = wrap;
    this.input = ni;
  }
  get value() {
    return this.ctrl.value;
  }
  setValue(v) {
    const n = this.ctrl.sync(v);
    this.last = String(n);
    if (this.placeholderMode && n === this.emptyValue) this.input.value = "";
    else this.input.value = String(n);
  }
  buildSteppers(doc, applyDir) {
    const steps = doc.createElement("div");
    steps.className = "vela-num-step";
    const mk = (dir, icon, label) => {
      const b = doc.createElement("button");
      b.type = "button";
      b.tabIndex = -1;
      b.setAttribute("aria-label", vt(label));
      b.appendChild(iconEl(icon, doc));
      let timer = 0;
      const apply = () => applyDir(dir);
      const stop = () => {
        if (timer) {
          window.clearTimeout(timer);
          timer = 0;
        }
      };
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        apply();
        timer = window.setTimeout(function tick() {
          apply();
          timer = window.setTimeout(tick, 60);
        }, 400);
      });
      b.addEventListener("pointerup", stop);
      b.addEventListener("pointerleave", stop);
      b.addEventListener("pointercancel", stop);
      return b;
    };
    steps.append(mk(1, "chevron-up", "Increase"), mk(-1, "chevron-down", "Decrease"));
    return steps;
  }
};

// src/ui/components/text-field/controller.ts
function textFieldController(opts = {}) {
  let value = opts.value ?? "";
  const size = opts.size ?? "md";
  return {
    get value() {
      return value;
    },
    size,
    fill: opts.fill ?? size !== "sm",
    disabled: opts.disabled ?? false,
    commit(next) {
      if (next === value) return null;
      value = next;
      opts.onChange?.(next);
      return next;
    },
    sync(next) {
      value = next;
    }
  };
}

// src/ui/components/text-field/styles.ts
var TEXT_STYLE_ID = "vela-ui-text-2";
var TEXT_CSS = `
.vela-text {
    display: inline-block;
    min-width: 0;
}
.vela-text[data-fill] { width: 100%; }
.vela-text:not([data-fill]) { width: 100px; flex: none; justify-self: start; }
.vela-text-field {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 34px;
    background: transparent;
    border: 1px solid var(--vela-border-strong);
    border-radius: 6px;
    color: var(--vela-fg-bright);
    padding: 0 8px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
    /* Selectable even under a user-select:none host (chart wrapper, .vela-ui). */
    user-select: text;
    -webkit-user-select: text;
}
.vela-text-field:hover { border-color: var(--vela-fg-muted); }
.vela-text-field:focus { border-color: var(--vela-focus); box-shadow: 0 0 0 3px var(--vela-focus-soft); }
.vela-text[data-size='sm'] .vela-text-field {
    height: 28px;
    background: var(--vela-surface-elev);
    border-radius: var(--vela-radius-sm);
    color: var(--vela-fg);
    font-size: 13px;
}
`;

// src/ui/components/text-field/view.ts
var TextField = class {
  constructor(opts = {}) {
    const doc = document;
    injectStyles(TEXT_STYLE_ID, TEXT_CSS, doc);
    this.ctrl = textFieldController(opts);
    const wrap = doc.createElement("div");
    wrap.className = "vela-text";
    wrap.dataset.size = this.ctrl.size;
    if (this.ctrl.fill) wrap.dataset.fill = "";
    const ti = doc.createElement("input");
    ti.type = "text";
    ti.size = 1;
    if (opts.id) ti.id = opts.id;
    ti.value = this.ctrl.value;
    ti.className = "vela-text-field";
    if (this.ctrl.disabled) ti.disabled = true;
    ti.addEventListener("blur", () => {
      this.ctrl.commit(ti.value);
    });
    ti.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ti.blur();
      }
    });
    wrap.appendChild(ti);
    this.el = wrap;
    this.input = ti;
  }
  get value() {
    return this.ctrl.value;
  }
  setValue(v) {
    this.ctrl.sync(v);
    this.input.value = v;
  }
};

// src/ui/components/text-area/controller.ts
function textAreaController(opts = {}) {
  let value = opts.value ?? "";
  return {
    get value() {
      return value;
    },
    size: opts.size ?? "md",
    rows: opts.rows ?? 3,
    disabled: opts.disabled ?? false,
    commit(next) {
      if (next === value) return null;
      value = next;
      opts.onChange?.(next);
      return next;
    },
    sync(next) {
      value = next;
    }
  };
}

// src/ui/components/text-area/styles.ts
var TEXTAREA_STYLE_ID = "vela-ui-textarea";
var TEXTAREA_CSS = `
.vela-textarea { display: block; width: 100%; min-width: 0; }
.vela-textarea-field {
    display: block;
    width: 100%;
    box-sizing: border-box;
    min-height: 64px;
    background: transparent;
    border: 1px solid var(--vela-border-strong);
    border-radius: 6px;
    color: var(--vela-fg-bright);
    padding: 8px;
    font-size: 14px;
    font-family: inherit;
    line-height: 1.4;
    resize: vertical;
    outline: none;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
    /* Selectable even under a user-select:none host (chart wrapper, .vela-ui). */
    user-select: text;
    -webkit-user-select: text;
}
.vela-textarea-field:hover { border-color: var(--vela-fg-muted); }
.vela-textarea-field:focus { border-color: var(--vela-focus); box-shadow: 0 0 0 3px var(--vela-focus-soft); }
.vela-textarea-field::placeholder { color: currentColor; opacity: 0.4; }
.vela-textarea[data-autogrow] .vela-textarea-field { resize: none; overflow-y: hidden; min-height: 46px; }
.vela-textarea[data-size='sm'] .vela-textarea-field {
    font-size: 13px;
    min-height: 46px;
    padding: 6px 9px;
    line-height: 18px;
}
`;

// src/ui/components/text-area/view.ts
var TextArea = class {
  constructor(opts = {}) {
    const doc = document;
    injectStyles(TEXTAREA_STYLE_ID, TEXTAREA_CSS, doc);
    this.ctrl = textAreaController(opts);
    this.autoGrow = opts.autoGrow === true;
    this.maxLines = opts.maxLines ?? 4;
    const wrap = doc.createElement("div");
    wrap.className = "vela-textarea";
    wrap.dataset.size = this.ctrl.size;
    if (this.autoGrow) wrap.dataset.autogrow = "";
    const ta = doc.createElement("textarea");
    ta.className = "vela-textarea-field";
    if (opts.id) ta.id = opts.id;
    if (opts.placeholder) ta.placeholder = vt(opts.placeholder);
    ta.rows = this.ctrl.rows;
    ta.value = this.ctrl.value;
    if (this.ctrl.disabled) ta.disabled = true;
    ta.addEventListener("blur", () => {
      this.ctrl.commit(ta.value);
    });
    if (this.autoGrow) {
      ta.addEventListener("input", () => this.grow());
    }
    wrap.appendChild(ta);
    this.el = wrap;
    this.input = ta;
    if (this.autoGrow) this.grow();
  }
  get value() {
    return this.ctrl.value;
  }
  setValue(v) {
    this.ctrl.sync(v);
    this.input.value = v;
    if (this.autoGrow) this.grow();
  }
  grow() {
    const ta = this.input;
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 18;
    const pad = ta.clientHeight - (ta.offsetHeight ? lh * (ta.rows || 1) : 0);
    const max = lh * this.maxLines + (Number.isFinite(pad) && pad > 0 ? pad : 12);
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
    ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
  }
};

// src/ui/components/color-picker/controller.ts
function splitColor(color) {
  const s = String(color ?? "").trim();
  let m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s);
  if (m) return { hex6: `#${m[1].toLowerCase()}`, alpha: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) {
    const h = m[1].toLowerCase();
    return { hex6: `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`, alpha: 1 };
  }
  const rgba = /^rgba?\(([^)]+)\)/i.exec(s);
  if (rgba) {
    const p = rgba[1].split(",").map((v) => v.trim());
    const hx = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    const a = p[3] != null ? Math.max(0, Math.min(1, parseFloat(p[3]))) : 1;
    return { hex6: `#${hx(parseInt(p[0] ?? "0", 10))}${hx(parseInt(p[1] ?? "0", 10))}${hx(parseInt(p[2] ?? "0", 10))}`, alpha: a };
  }
  return { hex6: ACCENT_BRIGHT, alpha: 1 };
}
function combineColor(hex6, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  if (a >= 0.999) return hex6;
  return `${hex6}${Math.round(a * 255).toString(16).padStart(2, "0")}`;
}
function blendOver(fg, bg, alpha) {
  const rgb = (c) => {
    const n = parseInt(splitColor(c).hex6.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  const [fr, fgc, fb] = rgb(fg);
  const [br, bgc, bb] = rgb(bg);
  const a = Math.max(0, Math.min(1, alpha));
  const h = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(fr * a + br * (1 - a))}${h(fgc * a + bgc * (1 - a))}${h(fb * a + bb * (1 - a))}`;
}
function hslHex(h, s, l) {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}
function hsvHex(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const to = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0");
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`;
}
function hexHsv(hex) {
  const n = parseInt(splitColor(hex).hex6.slice(1), 16);
  const [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map((x) => x / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d > 0) h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max > 0 ? d / max : 0, v: max };
}
function parseHexInput(text) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const h = m[1].toLowerCase();
  return h.length === 3 ? `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : `#${h}`;
}
function buildPalette() {
  const grays = [100, 90, 80, 68, 56, 45, 35, 25, 14, 0].map((l) => hslHex(0, 0, l));
  const hues = [4, 28, 50, 96, 140, 174, 200, 224, 270, 322];
  const levels = [
    [82, 56],
    [58, 84],
    [62, 74],
    [66, 62],
    [70, 50],
    [64, 39],
    [54, 29]
  ];
  return [grays, ...levels.map(([s, l]) => hues.map((h) => hslHex(h, s, l)))];
}
function transparencyChecker(size) {
  return `repeating-conic-gradient(#9aa0a6 0% 25%, #d3d6da 0% 50%) 0 0 / ${size}px ${size}px`;
}
function colorPickerController(opts = {}) {
  const parsed = splitColor(opts.color ?? ACCENT_BRIGHT);
  let hex6 = parsed.hex6;
  let alpha = parsed.alpha;
  return {
    get hex6() {
      return hex6;
    },
    get alpha() {
      return alpha;
    },
    combined() {
      return combineColor(hex6, alpha);
    },
    setHex(hex) {
      hex6 = splitColor(hex).hex6;
    },
    setAlpha(a) {
      alpha = Math.max(0, Math.min(1, a));
    }
  };
}

// src/ui/components/color-picker/styles.ts
var COLOR_STYLE_ID = "vela-ui-color";
var COLOR_CSS = `
.vela-color-field{width:24px;height:24px;padding:2px;border:1px solid var(--vela-border);border-radius:0;background:var(--vela-surface-sunken);cursor:pointer;display:inline-flex;flex:none;}
.vela-color-field:hover{border-color:var(--vela-fg-muted);}
.vela-color-field-swatch{display:block;width:100%;height:100%;border-radius:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.25);}
.vela-color-field-circle{width:26px;height:26px;padding:3px;border:1px solid var(--vela-border-strong);border-radius:4px;background:transparent;overflow:hidden;}
.vela-color-field-circle .vela-color-field-swatch{border-radius:2px;box-shadow:none;}
.vela-color-field-line{width:auto;height:32px;padding:0 10px 0 6px;gap:8px;align-items:center;border:1px solid var(--vela-border-strong);border-radius:6px;background:transparent;}
.vela-color-field-line .vela-color-field-swatch{width:20px;height:20px;flex:none;border-radius:3px;box-shadow:none;}
.vela-color-field-sample{display:block;width:34px;height:0;}
.vela-color-field-pop{background:var(--vela-surface-overlay);border:1px solid var(--vela-border);border-radius:var(--vela-radius-lg);box-shadow:var(--vela-shadow);padding:10px;}
`;

// src/ui/components/color-picker/view.ts
var PALETTE = buildPalette();
var CHECKER = transparencyChecker(10);
var FIELD_CHECKER = transparencyChecker(8);
var recents = [ACCENT, BULLISH, BEARISH, WARNING, NEUTRAL];
function addRecent(hex6) {
  const i = recents.findIndex((c) => c.toLowerCase() === hex6.toLowerCase());
  if (i >= 0) recents.splice(i, 1);
  recents.unshift(hex6);
  if (recents.length > 10) recents.length = 10;
}
function buildColorPicker(color, theme, onChange, options = {}) {
  const commit = options.commit ?? "live";
  const parsed = splitColor(color);
  let curHex = parsed.hex6;
  let curAlpha = parsed.alpha;
  const root = document.createElement("div");
  root.style.cssText = "display:flex;flex-direction:column;gap:9px;width:236px;";
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(10,1fr);gap:4px;";
  const swatches = [];
  for (const row of PALETTE) {
    for (const c of row) {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.dataset.c = c;
      sw.style.cssText = `width:100%;aspect-ratio:1;border-radius:4px;border:none;cursor:pointer;background:${c};padding:0;`;
      sw.addEventListener("click", (e) => {
        e.stopPropagation();
        pickHex(c);
      });
      grid.appendChild(sw);
      swatches.push(sw);
    }
  }
  const paintSelection = () => {
    for (const sw of swatches) {
      const on = (sw.dataset.c ?? "").toLowerCase() === curHex.toLowerCase();
      sw.style.outline = on ? `2px solid ${theme.textColor}` : "none";
      sw.style.outlineOffset = "2px";
      sw.style.zIndex = on ? "1" : "";
      sw.style.position = on ? "relative" : "";
    }
  };
  const recentRow = document.createElement("div");
  recentRow.style.cssText = "display:flex;align-items:center;gap:5px;flex-wrap:wrap;border-top:1px solid var(--vela-border);padding-top:9px;";
  const recentSwatches = document.createElement("div");
  recentSwatches.style.cssText = "display:contents;";
  const add = document.createElement("button");
  add.type = "button";
  add.title = vt("Custom color");
  add.setAttribute("aria-label", vt("Custom color"));
  add.dataset.testid = "color-custom";
  add.style.cssText = `width:17px;height:17px;border-radius:var(--vela-radius-sm);border:1px dashed var(--vela-border-strong);cursor:pointer;display:flex;align-items:center;justify-content:center;color:${theme.textColor};font:14px ${theme.fontFamily};background:transparent;padding:0;`;
  add.textContent = "+";
  recentRow.append(recentSwatches, add);
  const renderRecents = () => {
    recentSwatches.replaceChildren();
    for (const c of recents) {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.style.cssText = `width:17px;height:17px;border-radius:var(--vela-radius-sm);border:1px solid var(--vela-border);cursor:pointer;background:${c};padding:0;`;
      sw.addEventListener("click", (e) => {
        e.stopPropagation();
        pickHex(c);
      });
      recentSwatches.appendChild(sw);
    }
  };
  const opLabel = document.createElement("div");
  opLabel.textContent = vt("Opacity");
  opLabel.style.cssText = `font:11px ${theme.fontFamily};color:var(--vela-fg-muted);`;
  const opRow = document.createElement("div");
  opRow.style.cssText = "display:flex;align-items:center;gap:10px;";
  const track = document.createElement("div");
  track.style.cssText = "flex:1;position:relative;height:13px;border-radius:7px;cursor:pointer;";
  const knob = document.createElement("div");
  knob.style.cssText = "position:absolute;top:50%;width:15px;height:15px;border-radius:50%;background:var(--vela-selected-bg);box-shadow:0 1px 3px rgba(0,0,0,0.55);transform:translate(-50%,-50%);pointer-events:none;";
  track.appendChild(knob);
  const pctBox = document.createElement("input");
  pctBox.type = "text";
  pctBox.inputMode = "numeric";
  pctBox.title = vt("Opacity (%)");
  pctBox.style.cssText = `width:46px;box-sizing:border-box;text-align:center;font:var(--vela-font-size-md) ${theme.fontFamily};color:var(--vela-fg);background:transparent;border:1px solid var(--vela-border);border-radius:5px;padding:3px 4px;outline:none;`;
  pctBox.addEventListener("focus", () => {
    pctBox.style.borderColor = "var(--vela-border-strong)";
    pctBox.select();
  });
  opRow.append(track, pctBox);
  const paintOpacity = () => {
    track.style.background = `linear-gradient(to right, ${curHex}00, ${curHex}ff), ${CHECKER}`;
    knob.style.left = `${curAlpha * 100}%`;
    pctBox.value = `${Math.round(curAlpha * 100)}%`;
  };
  const commitTyped = () => {
    pctBox.style.borderColor = "var(--vela-border)";
    const n = parseFloat(pctBox.value.replace("%", ""));
    if (Number.isFinite(n)) {
      const next = Math.max(0, Math.min(100, n)) / 100;
      if (Math.round(next * 100) !== Math.round(curAlpha * 100)) {
        curAlpha = next;
        paintOpacity();
        emit();
        return;
      }
    }
    paintOpacity();
  };
  pctBox.addEventListener("change", commitTyped);
  pctBox.addEventListener("blur", () => {
    pctBox.style.borderColor = "var(--vela-border)";
    paintOpacity();
  });
  pctBox.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return;
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commitTyped();
      pctBox.blur();
    }
  });
  let dragging = false;
  const onDrag = (clientX) => {
    const r = track.getBoundingClientRect();
    curAlpha = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    paintOpacity();
    if (commit === "live") emit();
  };
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    if (commit === "release") emit();
  };
  track.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    dragging = true;
    track.setPointerCapture(e.pointerId);
    onDrag(e.clientX);
  });
  track.addEventListener("pointermove", (e) => {
    if (dragging) onDrag(e.clientX);
  });
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  function emit() {
    onChange(combineColor(curHex, curAlpha));
  }
  function previewHex(hex) {
    curHex = splitColor(hex).hex6;
    paintSelection();
    paintOpacity();
    emit();
  }
  function pickHex(hex, custom2 = false) {
    previewHex(hex);
    addRecent(curHex);
    if (custom2) renderRecents();
  }
  const palette = document.createElement("div");
  palette.style.cssText = "display:contents;";
  palette.append(grid, recentRow, opLabel, opRow);
  let custom = null;
  const back = () => {
    custom?.remove();
    custom = null;
    palette.style.display = "contents";
  };
  add.addEventListener("click", (e) => {
    e.stopPropagation();
    palette.style.display = "none";
    custom = buildCustomPanel(curHex, theme, previewHex, (hex) => {
      pickHex(hex, true);
      back();
    });
    root.appendChild(custom);
    custom.querySelector("input")?.focus();
  });
  renderRecents();
  paintSelection();
  paintOpacity();
  root.append(palette);
  return root;
}
function buildCustomPanel(start, theme, preview, done) {
  let { h, s, v } = hexHsv(start);
  let hex = splitColor(start).hex6;
  const panel = document.createElement("div");
  panel.dataset.testid = "color-custom-panel";
  panel.style.cssText = "display:flex;flex-direction:column;gap:10px;";
  const top = document.createElement("div");
  top.style.cssText = "display:flex;align-items:center;gap:8px;";
  const chip = document.createElement("span");
  chip.style.cssText = "flex:none;width:28px;height:28px;border-radius:5px;border:1px solid var(--vela-border);";
  const field = document.createElement("input");
  field.type = "text";
  field.spellcheck = false;
  field.maxLength = 7;
  field.setAttribute("aria-label", vt("Hex color"));
  field.dataset.testid = "color-hex";
  field.style.cssText = `flex:1;min-width:0;box-sizing:border-box;height:28px;font:var(--vela-font-size-md) ${theme.fontFamily};color:var(--vela-fg);background:transparent;border:1px solid var(--vela-border);border-radius:5px;padding:0 8px;outline:none;`;
  const ok = document.createElement("button");
  ok.type = "button";
  ok.textContent = vt("Add");
  ok.dataset.testid = "color-add";
  ok.style.cssText = `flex:none;height:28px;padding:0 12px;border-radius:6px;border:none;cursor:pointer;font:600 var(--vela-font-size-md) ${theme.fontFamily};color:var(--vela-selected-fg, var(--vela-bg));background:var(--vela-selected-bg, var(--vela-fg));`;
  top.append(chip, field, ok);
  const body = document.createElement("div");
  body.style.cssText = "display:flex;gap:10px;height:180px;";
  const square = document.createElement("div");
  square.dataset.testid = "color-square";
  square.style.cssText = "flex:1;position:relative;border-radius:4px;cursor:crosshair;touch-action:none;";
  const dot = document.createElement("div");
  dot.style.cssText = "position:absolute;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;";
  square.appendChild(dot);
  const bar = document.createElement("div");
  bar.dataset.testid = "color-hue";
  bar.style.cssText = `flex:none;width:18px;position:relative;border-radius:4px;cursor:pointer;touch-action:none;background:linear-gradient(to bottom,${[0, 60, 120, 180, 240, 300, 360].map((hue) => hsvHex(hue % 360, 1, 1)).join(",")});`;
  const tab = document.createElement("div");
  tab.style.cssText = "position:absolute;left:-3px;right:-3px;height:6px;border-radius:2px;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.5);transform:translateY(-50%);pointer-events:none;";
  bar.appendChild(tab);
  body.append(square, bar);
  panel.append(top, body);
  const paint = (typed = false) => {
    square.style.background = `linear-gradient(to top,#000,rgba(0,0,0,0)),linear-gradient(to right,#fff,${hsvHex(h, 1, 1)})`;
    dot.style.left = `${s * 100}%`;
    dot.style.top = `${(1 - v) * 100}%`;
    dot.style.background = hex;
    tab.style.top = `${h / 360 * 100}%`;
    chip.style.background = hex;
    if (!typed) field.value = hex;
    field.style.borderColor = "var(--vela-border)";
  };
  const fromHsv = () => {
    hex = hsvHex(h, s, v);
    paint();
    preview(hex);
  };
  const drag = (el, at) => {
    let on = false;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      at(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)));
    };
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      on = true;
      el.setPointerCapture(e.pointerId);
      move(e);
    });
    el.addEventListener("pointermove", (e) => on && move(e));
    el.addEventListener("pointerup", () => on = false);
    el.addEventListener("pointercancel", () => on = false);
  };
  drag(square, (x, y) => {
    s = x;
    v = 1 - y;
    fromHsv();
  });
  drag(bar, (_x, y) => {
    h = Math.min(359.9, y * 360);
    fromHsv();
  });
  field.addEventListener("input", () => {
    const got = parseHexInput(field.value);
    if (!got) {
      field.style.borderColor = `var(--vela-down, ${BEARISH})`;
      return;
    }
    hex = got;
    ({ h, s, v } = hexHsv(got));
    paint(true);
    preview(hex);
  });
  field.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return;
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      ok.click();
    }
  });
  ok.addEventListener("click", (e) => {
    e.stopPropagation();
    const got = parseHexInput(field.value);
    if (got) done(got);
    else field.style.borderColor = `var(--vela-down, ${BEARISH})`;
  });
  paint();
  return panel;
}
function colorField(theme, getVal, onVal, opts) {
  return new ColorField({ theme, getVal, onVal, shape: opts?.shape, id: opts?.id, popover: opts?.popover, commit: opts?.commit }).el;
}
var ColorField = class {
  constructor(opts) {
    this.sample = null;
    injectStyles(COLOR_STYLE_ID, COLOR_CSS, document);
    this.theme = opts.theme;
    this.getVal = opts.getVal;
    this.onVal = opts.onVal;
    this.popoverOpts = opts.popover;
    this.commit = opts.commit;
    this.line = opts.line;
    this.extra = opts.extra;
    const trigger = document.createElement("button");
    trigger.type = "button";
    if (opts.id) trigger.id = opts.id;
    trigger.className = opts.shape === "circle" ? "vela-color-field vela-color-field-circle" : "vela-color-field";
    const swatch = document.createElement("span");
    swatch.className = "vela-color-field-swatch";
    trigger.appendChild(swatch);
    if (opts.line) {
      trigger.classList.add("vela-color-field-line");
      this.sample = document.createElement("span");
      this.sample.className = "vela-color-field-sample";
      trigger.appendChild(this.sample);
    }
    this.el = trigger;
    this.swatch = swatch;
    this.paint();
    trigger.addEventListener("vela-sync", () => this.paint());
    trigger.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      trigger.focus({ preventScroll: true });
    });
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });
  }
  /** Repaint the swatch (and the line sample): after an outside change of the color, width or style. */
  paint() {
    const v = this.getVal();
    this.el.setAttribute("aria-label", `${vt("Color")} ${v}`);
    this.swatch.style.background = `linear-gradient(${v}, ${v}), ${FIELD_CHECKER}`;
    if (this.sample && this.line) {
      const { width, style } = this.line();
      this.sample.style.borderTop = `${Math.max(1, Math.min(4, width))}px ${style === "dashed" ? "dashed" : style === "dotted" ? "dotted" : "solid"} ${v}`;
    }
  }
  toggle() {
    if (openPopoverTrigger() === this.el) {
      closeOpenPopovers();
      return;
    }
    const pop = new Popover({
      trigger: this.el,
      theme: this.theme,
      align: this.popoverOpts?.align ?? "end",
      gap: this.popoverOpts?.gap ?? 6,
      host: this.popoverOpts?.host,
      position: this.popoverOpts?.position,
      boundary: this.popoverOpts?.boundary,
      zIndex: this.popoverOpts?.zIndex,
      className: "vela-color-field-pop",
      content: this.content()
    });
    pop.show();
  }
  content() {
    const picker = buildColorPicker(
      this.getVal(),
      this.theme,
      (val) => {
        this.onVal(val);
        this.paint();
      },
      { commit: this.commit }
    );
    const extra = this.extra?.();
    if (!extra) return picker;
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:12px;";
    wrap.append(picker, extra);
    return wrap;
  }
};
function closeColorPopover() {
  closeOpenPopovers();
}

// src/ui/components/glyph-select/controller.ts
function glyphSelectController(opts) {
  let value = opts.value;
  return {
    options: opts.options,
    get value() {
      return value;
    },
    setValue(v) {
      value = v;
    },
    optionOf(v) {
      return opts.options.find((o) => o.value === v);
    },
    pick(v) {
      value = v;
      opts.onChange?.(v);
      return v;
    }
  };
}
var WIDTH_FIELD_OPTIONS = [1, 2, 3, 4, 5];
function lineWidthGlyph(width) {
  return `<svg width="22" height="14" viewBox="0 0 22 14" fill="none"><line x1="2" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="${width}" stroke-linecap="round"/></svg>`;
}
function widthFieldOptions() {
  return WIDTH_FIELD_OPTIONS.map((w) => ({ value: w, label: `${w}px`, glyph: lineWidthGlyph(w) }));
}

// src/ui/components/glyph-select/styles.ts
var GLYPH_SELECT_STYLE_ID = "vela-ui-glyph-select";
var GLYPH_SELECT_CSS = `
.vela-glyph-select {
    height: 34px;
    padding: 0 26px 0 8px;
    border: 1px solid var(--vela-border-strong);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: none;
    justify-self: start;
    color: var(--vela-fg-bright);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    position: relative;
    transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.vela-glyph-select:hover { border-color: var(--vela-fg-muted); }
.vela-glyph-select:focus { border-color: var(--vela-focus); box-shadow: 0 0 0 3px var(--vela-focus-soft); }
.vela-glyph-select-caret {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    opacity: 0.55;
    color: inherit;
    line-height: 0;
    pointer-events: none;
}
.vela-glyph-select-pop {
    background: var(--vela-bg);
    border: none;
    border-radius: 6px;
    box-shadow: var(--vela-shadow);
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    color: var(--vela-fg);
    font: 14px var(--vela-font);
}
.vela-glyph-select-item {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 96px;
    padding: 7px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
    font: inherit;
}
.vela-glyph-select-item:hover { background: var(--vela-hover); }
.vela-glyph-select-item[data-active='1'] { background: var(--vela-hover-strong); color: var(--vela-fg-bright); }
`;

// src/ui/components/glyph-select/view.ts
var GlyphSelect = class {
  constructor(opts) {
    injectStyles(GLYPH_SELECT_STYLE_ID, GLYPH_SELECT_CSS, document);
    this.ctrl = glyphSelectController(opts);
    this.theme = opts.theme;
    this.get = opts.get ?? (() => this.ctrl.value);
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "vela-glyph-select";
    if (opts.title) trigger.title = vt(opts.title);
    this.el = trigger;
    this.paint();
    trigger.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      trigger.focus({ preventScroll: true });
    });
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });
    trigger.addEventListener("vela-sync", () => {
      this.ctrl.setValue(this.get());
      this.paint();
    });
  }
  setValue(v) {
    this.ctrl.setValue(v);
    this.paint();
  }
  paint() {
    const cur = this.get();
    const opt = this.ctrl.optionOf(cur);
    const glyph = document.createElement("span");
    glyph.style.display = "flex";
    glyph.innerHTML = opt?.glyph ?? "";
    const caret = document.createElement("span");
    caret.className = "vela-glyph-select-caret";
    caret.appendChild(iconEl("chevron-down", this.el.ownerDocument));
    this.el.replaceChildren(glyph, caret);
  }
  toggle() {
    if (openPopoverTrigger() === this.el) {
      closeOpenPopovers();
      return;
    }
    const current = this.get();
    const pop = new Popover({
      trigger: this.el,
      theme: this.theme,
      align: "end",
      gap: 6,
      className: "vela-glyph-select-pop",
      content: (el) => {
        el.style.font = `var(--vela-font-size-md) ${this.theme.fontFamily}`;
        for (const o of this.ctrl.options) {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "vela-glyph-select-item";
          item.dataset.active = o.value === current ? "1" : "0";
          item.innerHTML = `<span style="display:flex;flex:none;">${o.glyph}</span><span style="flex:1;font-variant-numeric:tabular-nums;">${o.label}</span>`;
          item.addEventListener("click", (ev) => {
            ev.stopPropagation();
            pop.hide();
            this.ctrl.pick(o.value);
            this.paint();
          });
          el.appendChild(item);
        }
      }
    });
    pop.show();
  }
};
function widthField(theme, getVal, onVal) {
  return new GlyphSelect({
    theme,
    options: widthFieldOptions(),
    value: getVal(),
    get: getVal,
    onChange: onVal
  }).el;
}
function closeWidthPopover() {
  closeOpenPopovers();
}

// src/ui/components/field/controller.ts
var FIELD_GAP_PX = 16;
function fieldGridColumns(variant, mobile) {
  if (variant === "inputs") return mobile ? "minmax(0,1fr) auto" : "max-content 1fr";
  return mobile ? "minmax(0,1fr) max-content" : "max-content max-content";
}

// src/ui/components/field/styles.ts
var FIELD_STYLE_ID = "vela-ui-field";
var FIELD_CSS = `
.vela-field-grid {
    display: grid;
    align-items: center;
    align-content: start;
    column-gap: ${FIELD_GAP_PX}px;
    row-gap: ${FIELD_GAP_PX}px;
}
.vela-field-grid[data-variant='inputs'] { grid-template-columns: max-content 1fr; }
.vela-field-grid[data-variant='inputs'][data-mobile] { grid-template-columns: minmax(0,1fr) auto; }
.vela-field-grid[data-variant='settings'] {
    grid-template-columns: max-content max-content;
    column-gap: 12px;
}
.vela-field-grid[data-variant='settings'][data-mobile] { grid-template-columns: minmax(0,1fr) max-content; }
.vela-field-row { display: contents; }
.vela-field-span { grid-column: 1 / -1; }
.vela-field-label {
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 14px;
}
.vela-field-label[data-size='sm'] { font-size: inherit; opacity: 0.85; }
/* Titles are fully inert: spans, not label[for] \u2014 native labels propagate :hover and
   clicks onto their control, and both belong to the input alone. */
.vela-field-cell { display: flex; align-items: center; gap: 8px; justify-self: start; }
.vela-field-bool { display: flex; align-items: center; gap: 8px; min-height: 22px; }
.vela-field-stacked { display: flex; flex-direction: column; gap: 8px; }
.vela-field-stacked-head { display: flex; align-items: center; justify-content: center; gap: 8px; }
.vela-field-inline { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.vela-field-inline-item { display: flex; align-items: center; gap: 8px; }
.vela-field-toggle-label { display: flex; align-items: center; gap: 8px; }
.vela-field-section {
    grid-column: 1 / -1;
    margin: 24px 0 0;
    padding-bottom: 8px;
    font-size: var(--vela-font-size-sm);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--vela-fg-muted);
}
.vela-field-section[data-variant='inputs'] {
    margin: 0;
    padding: 20px 0 8px;
    font-size: 11px;
    font-weight: 600;
}
.vela-field-section[data-variant='inputs'][data-first] { padding-top: 4px; }
.vela-field-sep { grid-column: 1 / -1; height: 14px; }
.vela-field-dim { opacity: 0.4 !important; pointer-events: none !important; }
`;

// src/ui/components/field/view.ts
function ensureFieldStyles(doc = document) {
  injectStyles(FIELD_STYLE_ID, FIELD_CSS, doc);
}
function fieldGrid(opts = {}) {
  ensureFieldStyles();
  const el = document.createElement("div");
  el.className = "vela-field-grid";
  const variant = opts.variant ?? "inputs";
  el.dataset.variant = variant;
  if (opts.mobile) el.dataset.mobile = "";
  el.style.gridTemplateColumns = fieldGridColumns(variant, opts.mobile === true);
  return el;
}
function fieldSection(title, opts = {}) {
  ensureFieldStyles();
  const el = document.createElement("div");
  el.className = "vela-field-section";
  if (opts.variant) el.dataset.variant = opts.variant;
  if (opts.first) el.dataset.first = "";
  el.textContent = vt(title);
  return el;
}
function fieldSeparator() {
  ensureFieldStyles();
  const el = document.createElement("div");
  el.className = "vela-field-sep";
  return el;
}
function labelEl(text, opts) {
  const el = document.createElement("span");
  el.className = "vela-field-label";
  if (opts.size) el.dataset.size = opts.size;
  el.textContent = vt(text);
  const id = opts.id;
  if (id) {
    el.id = `${id}--title`;
    queueMicrotask(() => {
      el.ownerDocument.getElementById(id)?.setAttribute("aria-labelledby", el.id);
    });
  }
  return el;
}
function asList(control) {
  if (!control) return [];
  return Array.isArray(control) ? control : [control];
}
function applyClass(el, extra) {
  if (extra) {
    for (const c of extra.split(/\s+/)) if (c) el.classList.add(c);
  }
}
function dimControls(controls, on) {
  for (const c of controls) {
    if (c.dataset.sdSelfGated === "1") continue;
    c.classList.toggle("vela-field-dim", !on);
  }
}
function fieldRow(opts) {
  ensureFieldStyles();
  const size = opts.labelSize;
  if (opts.inline) {
    const wrap2 = document.createElement("div");
    wrap2.className = "vela-field-span vela-field-inline";
    for (const item of opts.inline) {
      const it = document.createElement("div");
      it.className = "vela-field-inline-item";
      if (item.toggleFirst) it.style.flexDirection = "row-reverse";
      if (item.label) {
        it.appendChild(labelEl(item.label, { id: item.id, size }));
      }
      if (item.fit) it.appendChild(item.control);
      else {
        const cw = document.createElement("div");
        cw.style.width = "100px";
        cw.appendChild(item.control);
        it.appendChild(cw);
      }
      wrap2.appendChild(it);
    }
    if (opts.info) wrap2.appendChild(opts.info);
    applyClass(wrap2, opts.className);
    return wrap2;
  }
  if (opts.bool) {
    const wrap2 = document.createElement("div");
    wrap2.className = "vela-field-span vela-field-bool";
    const sw = new Switch({
      id: opts.toggle?.id ?? opts.id,
      label: vt(opts.label),
      checked: opts.toggle?.checked ?? false,
      size: "md",
      tone: "bright",
      onChange: (v) => opts.toggle?.onChange(v)
    });
    const lab = labelEl(opts.label, { id: opts.toggle?.id ?? opts.id, size });
    lab.style.cursor = "pointer";
    lab.addEventListener("click", () => sw.el.click());
    wrap2.append(sw.el, lab);
    if (opts.info) wrap2.appendChild(opts.info);
    if (opts.toggle?.get) {
      const get = opts.toggle.get;
      wrap2.addEventListener("vela-sync", () => {
        sw.setChecked(get());
      });
    }
    applyClass(wrap2, opts.className);
    return wrap2;
  }
  if (opts.stacked) {
    const wrap2 = document.createElement("div");
    wrap2.className = "vela-field-span vela-field-stacked";
    const head = document.createElement("div");
    head.className = "vela-field-stacked-head";
    head.appendChild(labelEl(opts.label, { id: opts.id, size }));
    if (opts.info) head.appendChild(opts.info);
    wrap2.appendChild(head);
    for (const c of asList(opts.control)) wrap2.appendChild(c);
    applyClass(wrap2, opts.className);
    return wrap2;
  }
  const wrap = document.createElement("div");
  wrap.className = "vela-field-row";
  const controls = asList(opts.control);
  if (opts.toggle) {
    const left = document.createElement("div");
    left.className = "vela-field-toggle-label";
    const sw = new Switch({
      id: opts.toggle.id ?? opts.id,
      label: vt(opts.label),
      checked: opts.toggle.checked,
      size: "md",
      tone: "bright",
      onChange: (v) => {
        opts.toggle.onChange(v);
        if (controls.length > 0) dimControls(controls, v);
      }
    });
    left.append(sw.el, labelEl(opts.label, { id: opts.toggle.id ?? opts.id, size }));
    wrap.appendChild(left);
    if (controls.length > 0) dimControls(controls, opts.toggle.checked);
    if (opts.toggle.get) {
      const get = opts.toggle.get;
      wrap.addEventListener("vela-sync", () => {
        const v = get();
        sw.setChecked(v);
        if (controls.length > 0) dimControls(controls, v);
      });
    }
  } else {
    wrap.appendChild(labelEl(opts.label, { id: opts.id, size }));
    if (!opts.id) {
      const c = controls[0]?.matches("input,button,select,textarea") ? controls[0] : controls[0]?.querySelector("input,button,select,textarea");
      if (c && !c.hasAttribute("aria-label") && !c.hasAttribute("aria-labelledby")) c.setAttribute("aria-label", vt(opts.label));
    }
  }
  const cell = document.createElement("div");
  cell.className = "vela-field-cell";
  if (opts.controlWidth != null && controls.length === 1 && !opts.fit) {
    const cw = document.createElement("div");
    cw.style.width = `${opts.controlWidth}px`;
    cw.appendChild(controls[0]);
    cell.appendChild(cw);
  } else {
    for (const c of controls) cell.appendChild(c);
  }
  if (opts.info) cell.appendChild(opts.info);
  wrap.appendChild(cell);
  applyClass(wrap, opts.className);
  return wrap;
}
function buildFieldControl(desc) {
  if (desc.kind === "number") {
    const ni = new NumberInput({
      id: desc.id,
      value: desc.value,
      min: desc.min,
      max: desc.max,
      step: desc.step,
      integer: desc.integer,
      size: "md",
      fill: desc.fill,
      compact: desc.compact,
      commit: desc.commit,
      steppers: desc.steppers,
      clamp: desc.clamp,
      placeholder: desc.placeholder,
      emptyValue: desc.emptyValue,
      title: desc.title,
      onChange: desc.onChange
    });
    if (desc.sync) {
      const sync = desc.sync;
      ni.el.addEventListener("vela-sync", () => {
        ni.setValue(sync());
      });
    }
    return { el: ni.el, setValue: (v) => ni.setValue(Number(v)) };
  }
  if (desc.kind === "select") {
    const sel = new Select({
      id: desc.id,
      options: desc.options,
      value: desc.value,
      size: "md",
      fill: desc.fill,
      theme: desc.theme,
      list: desc.list,
      onChange: desc.onChange
    });
    if (desc.title) sel.el.title = vt(desc.title);
    if (desc.sync) {
      const sync = desc.sync;
      sel.el.addEventListener("vela-sync", () => {
        sel.setValue(sync());
      });
    }
    return { el: sel.el, setValue: (v) => sel.setValue(String(v)) };
  }
  if (desc.kind === "switch") {
    const sw = new Switch({
      id: desc.id,
      checked: desc.checked,
      size: "md",
      tone: "bright",
      onChange: desc.onChange
    });
    if (desc.sync) {
      const sync = desc.sync;
      sw.el.addEventListener("vela-sync", () => {
        sw.setChecked(sync());
      });
    }
    return { el: sw.el, setValue: (v) => sw.setChecked(Boolean(v)) };
  }
  if (desc.kind === "color") {
    const el2 = colorField(desc.theme, desc.get, desc.onChange, {
      shape: "circle",
      id: desc.id,
      popover: desc.popover,
      commit: desc.commit
    });
    if (desc.title) el2.title = vt(desc.title);
    return { el: el2 };
  }
  if (desc.kind === "text") {
    const tf = new TextField({
      id: desc.id,
      value: desc.value,
      size: "md",
      fill: desc.fill,
      onChange: desc.onChange
    });
    if (desc.placeholder) tf.input.placeholder = vt(desc.placeholder);
    if (desc.sync) {
      const sync = desc.sync;
      tf.el.addEventListener("vela-sync", () => {
        tf.setValue(sync());
      });
    }
    return { el: tf.el, setValue: (v) => tf.setValue(String(v)) };
  }
  if (desc.kind === "textarea") {
    const ta = new TextArea({
      id: desc.id,
      value: desc.value,
      rows: desc.rows,
      autoGrow: desc.autoGrow,
      maxLines: desc.maxLines,
      placeholder: desc.placeholder,
      onChange: desc.onChange
    });
    if (desc.sync) {
      const sync = desc.sync;
      ta.el.addEventListener("vela-sync", () => {
        ta.setValue(sync());
      });
    }
    return { el: ta.el, setValue: (v) => ta.setValue(String(v)) };
  }
  const el = widthField(desc.theme, desc.get, desc.onChange);
  if (desc.title) el.title = vt(desc.title);
  return { el };
}

export { CALLOUT_CSS, CALLOUT_STYLE_ID, CalloutBubble, ColorField, DatePicker, Dialog, Drawer, FIELD_GAP_PX, GlyphSelect, Menu, NumberInput, Popover, Select, Switch, TextArea, TextField, WIDTH_FIELD_OPTIONS, applyPlotOverlayTokens, applyThemeTokens, blendOver, buildColorPicker, buildFieldControl, buildPalette, calloutPanelRows, clampNumber, closeColorPopover, closeOpenPopovers, closeWidthPopover, closesPanel, colorField, colorPickerController, combineColor, datePickerController, decorateSelectScroll, dialogController, drawerController, ensureUIHost, eventDismissedPopover, fieldGrid, fieldGridColumns, fieldRow, fieldSection, fieldSeparator, fillSelectList, glyphSelectController, hexHsv, hslHex, hsvHex, insetRect, intersectRects, isPopoverOpen, isoDate, lineWidthGlyph, menuController, nextUid, normalizeDateInput, numberInputController, openPopoverTrigger, openSelectList, parseHexInput, placePopover, popoverController, runMachine, selectController, snapToStep, splitColor, switchController, textAreaController, textFieldController, toggleSelectList, transparencyChecker, viewportRect, widthField, widthFieldOptions };
