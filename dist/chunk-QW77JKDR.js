import { normalizeProps, nextUid, runMachine, spreadProps } from './chunk-BAWXEOUI.js';
import { injectStyles, vt } from './chunk-4YAXFTQI.js';
import * as tooltip from '@zag-js/tooltip';

// src/ui/keymap.ts
var KEY_ALIASES = {
  esc: "escape",
  space: " ",
  plus: "+",
  minus: "-",
  del: "delete",
  return: "enter",
  left: "arrowleft",
  right: "arrowright",
  up: "arrowup",
  down: "arrowdown"
};
var MAC_GLYPHS = { meta: "\u2318", ctrl: "\u2303", alt: "\u2325", shift: "\u21E7" };
function parseChord(spec, mac) {
  const parts = spec.toLowerCase().split("+").map((p) => p.trim()).filter((p, i, a) => p !== "" || a[i - 1] === "");
  const chord = { ctrl: false, meta: false, alt: false, shift: false, key: "" };
  for (const raw of parts) {
    const p = raw === "" ? "+" : raw;
    if (p === "mod") mac ? chord.meta = true : chord.ctrl = true;
    else if (p === "ctrl" || p === "control") chord.ctrl = true;
    else if (p === "meta" || p === "cmd" || p === "command") chord.meta = true;
    else if (p === "alt" || p === "option") chord.alt = true;
    else if (p === "shift") chord.shift = true;
    else chord.key = KEY_ALIASES[p] ?? p;
  }
  return chord;
}
function eventKey(ev) {
  const k = ev.key.toLowerCase();
  if (ev.altKey && !/^[a-z0-9]$/.test(k) && typeof ev.code === "string") {
    const m = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(ev.code);
    const ch = m?.[1] ?? m?.[2];
    if (ch) return ch.toLowerCase();
  }
  return k;
}
function eventMatches(ev, c) {
  return ev.ctrlKey === c.ctrl && ev.metaKey === c.meta && ev.altKey === c.alt && // Shift is part of producing many printable keys ('?', '+') — only enforce it
  // when the chord names a non-printable/letter key where shift is a real modifier.
  (c.key.length > 1 || /^[a-z0-9 ]$/.test(c.key) ? ev.shiftKey === c.shift : true) && eventKey(ev) === c.key;
}
function isEditableTarget(ev) {
  const t = ev.target;
  if (!t || typeof t !== "object") return false;
  const tag = (t.tagName ?? "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (t.isContentEditable === true) return true;
  return (typeof t.getAttribute === "function" ? t.getAttribute("role") : null) === "textbox";
}
function displayChord(spec, mac) {
  const c = parseChord(spec, mac);
  const keyLabel = c.key === " " ? "Space" : c.key.length === 1 ? c.key.toUpperCase() : c.key.charAt(0).toUpperCase() + c.key.slice(1);
  if (mac) {
    return (c.ctrl ? MAC_GLYPHS.ctrl : "") + (c.alt ? MAC_GLYPHS.alt : "") + (c.shift ? MAC_GLYPHS.shift : "") + (c.meta ? MAC_GLYPHS.meta : "") + keyLabel;
  }
  const mods = [c.ctrl && "Ctrl", c.alt && "Alt", c.shift && "Shift", c.meta && "Win"].filter(Boolean);
  return [...mods, keyLabel].join("+");
}
var KeymapManager = class {
  constructor(opts = {}) {
    this.descriptors = /* @__PURE__ */ new Map();
    this.rebinds = /* @__PURE__ */ new Map();
    this.scopeStack = [];
    this.target = null;
    this.onKeydown = (ev) => {
      this.handleKeydown(ev);
    };
    this.mac = opts.platform !== void 0 ? opts.platform === "mac" : typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform ?? "");
    this.baseScope = opts.baseScope ?? "chart";
  }
  /** Register (or replace, by id) a binding. Returns a disposer. */
  register(desc) {
    this.descriptors.set(desc.id, desc);
    return () => {
      if (this.descriptors.get(desc.id) === desc) this.descriptors.delete(desc.id);
    };
  }
  unregister(id) {
    this.descriptors.delete(id);
    this.rebinds.delete(id);
  }
  /** User-level rebinding: overrides the descriptor's default chords (null resets). */
  rebind(id, keys) {
    if (keys === null) this.rebinds.delete(id);
    else this.rebinds.set(id, Array.isArray(keys) ? [...keys] : [keys]);
  }
  /** A chord as this platform writes it (`'mod+v'` → `Ctrl+V`, or `⌘V` on a Mac). */
  display(spec) {
    return displayChord(spec, this.mac);
  }
  /** Snapshot for a shortcuts help panel / rebinding UI. */
  bindings() {
    return [...this.descriptors.values()].map((d) => {
      const keys = this.activeKeys(d);
      return {
        id: d.id,
        label: d.label,
        category: d.category ?? "General",
        scope: d.scope ?? this.baseScope,
        keys,
        display: keys.map((k) => displayChord(k, this.mac))
      };
    });
  }
  pushScope(scope) {
    this.scopeStack.push(scope);
    return () => this.popScope(scope);
  }
  /** Pops the TOPMOST occurrence of `scope` (tolerates out-of-order teardown). */
  popScope(scope) {
    const i = this.scopeStack.lastIndexOf(scope);
    if (i >= 0) this.scopeStack.splice(i, 1);
  }
  get activeScope() {
    return this.scopeStack[this.scopeStack.length - 1] ?? this.baseScope;
  }
  attach(target) {
    this.detach();
    this.target = target;
    target.addEventListener("keydown", this.onKeydown);
  }
  detach() {
    this.target?.removeEventListener("keydown", this.onKeydown);
    this.target = null;
  }
  /** The matcher — public so hosts/tests can feed events from their own listeners. */
  handleKeydown(ev) {
    const editable = isEditableTarget(ev);
    for (const d of this.descriptors.values()) {
      const scope = d.scope ?? this.baseScope;
      if (scope !== "global" && scope !== this.activeScope) continue;
      if (editable && !d.allowInInput) continue;
      if (d.when && !d.when()) continue;
      for (const spec of this.activeKeys(d)) {
        if (eventMatches(ev, parseChord(spec, this.mac))) {
          if (d.preventDefault !== false) {
            ev.preventDefault?.();
            ev.stopPropagation?.();
          }
          d.run(ev);
          return true;
        }
      }
    }
    return false;
  }
  destroy() {
    this.detach();
    this.descriptors.clear();
    this.rebinds.clear();
    this.scopeStack.length = 0;
  }
  activeKeys(d) {
    return this.rebinds.get(d.id) ?? (Array.isArray(d.keys) ? d.keys : [d.keys]);
  }
};
function tooltipController(opts = {}) {
  return {
    machine: tooltip.machine,
    props: {
      id: nextUid("vela-tooltip"),
      openDelay: opts.openDelay ?? 0,
      closeDelay: opts.closeDelay ?? 0,
      interactive: opts.interactive ?? false,
      ids: opts.triggerId ? { trigger: opts.triggerId } : void 0,
      positioning: { placement: opts.placement ?? "top" }
    },
    connect: (service) => tooltip.connect(service, normalizeProps)
  };
}

// src/ui/components/tooltip/styles.ts
var TOOLTIP_STYLE_ID = "vela-ui-tooltip";
var TOOLTIP_CSS = `
.vela-tooltip {
    background: var(--vela-bg);
    color: var(--vela-fg);
    border: 1px solid var(--vela-border-soft);
    border-radius: var(--vela-radius-md);
    box-shadow: var(--vela-shadow);
    font-size: var(--vela-font-size-md);
    line-height: 1.4;
    padding: var(--vela-space-1) var(--vela-space-2);
    max-width: 280px;
    pointer-events: none;
    z-index: var(--vela-z-tooltip);
}
.vela-tooltip[data-interactive] { pointer-events: auto; }
.vela-tooltip[data-state='open'] { animation: vela-tooltip-in 0.12s ease; }
@keyframes vela-tooltip-in {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
}
`;
function resolveHost(trigger, host) {
  return host ?? trigger.closest(".vela-ui") ?? trigger.ownerDocument.body;
}
var Tooltip = class {
  constructor(trigger, opts) {
    this.trigger = trigger;
    const doc = trigger.ownerDocument;
    injectStyles(TOOLTIP_STYLE_ID, TOOLTIP_CSS, doc);
    this.positioner = doc.createElement("div");
    this.positioner.className = "vela-ui-layer";
    this.content = doc.createElement("div");
    this.content.className = "vela-tooltip";
    this.positioner.appendChild(this.content);
    resolveHost(trigger, opts.host).appendChild(this.positioner);
    this.setContent(opts.content);
    const ctrl = tooltipController(opts);
    const mid = String(ctrl.props.id);
    if (opts.triggerId) trigger.id = opts.triggerId;
    this.handle = runMachine(ctrl.machine, ctrl.props, (service) => {
      const api = ctrl.connect(service);
      spreadProps(trigger, api.getTriggerProps(), mid);
      spreadProps(this.positioner, api.getPositionerProps(), mid);
      spreadProps(this.content, api.getContentProps(), mid);
    });
  }
  setContent(content) {
    this.content.replaceChildren(typeof content === "function" ? content() : typeof content === "string" ? vt(content) : content);
  }
  destroy() {
    this.handle.stop();
    this.positioner.remove();
    this.trigger.removeAttribute("data-scope");
  }
};

export { KeymapManager, Tooltip, isEditableTarget, tooltipController };
