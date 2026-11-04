import { svg24, INFO, TV_COLORS, BULLISH, BEARISH, NEUTRAL, WARNING, ACCENT_BRIGHT, ACCENT, themeTokens, vt, iconAt, injectStyles, iconEl, announceSurface, holdForExit, STATIC_TOKENS } from './chunk-4YAXFTQI.js';

// src/core/model/series.ts
function isLineLikeSeries(spec) {
  return spec.kind !== "candle" && spec.kind !== "bar" && spec.kind !== "markers";
}
function seriesShownOn(spec, surface) {
  if (spec.display) return spec.display[surface] !== false;
  return spec.visible !== false;
}
function seriesInScale(spec) {
  return seriesShownOn(spec, "pane") || seriesShownOn(spec, "priceScale");
}

// src/core/native-indicators/NativeIndicator.ts
function nativeInstanceChannel(type, instanceId) {
  return `${type}#${instanceId}`;
}
var REGISTRY = /* @__PURE__ */ new Map();
function registerNativeIndicator(descriptor) {
  REGISTRY.set(descriptor.type, descriptor);
}
function unregisterNativeIndicator(type) {
  REGISTRY.delete(type);
}
function getNativeIndicator(type) {
  return REGISTRY.get(type);
}
var CAPS = /* @__PURE__ */ new Map();
function setNativeInstanceCap(type, max) {
  if (max == null || !Number.isFinite(max) || max < 1) CAPS.delete(type);
  else CAPS.set(type, Math.floor(max));
}
function nativeInstanceCap(type) {
  return REGISTRY.get(type)?.maxInstances ?? CAPS.get(type);
}
function nativeIndicatorTypes() {
  return [...REGISTRY.keys()];
}
function nativeIndicatorDescriptors() {
  return [...REGISTRY.values()];
}

// src/core/drawings/style.ts
var DEFAULT_DRAWING_COLOR = ACCENT_BRIGHT;
function defaultStyle() {
  return { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: "solid" };
}
var TV_LINE_COLOR = "#2962FF";
var TV_GREY = "#808080";
var NAMED_TEXT_PX = { tiny: 10, small: 12, normal: 14, large: 18, huge: 24, auto: 14 };
function textPx(size) {
  if (typeof size === "number") return Number.isFinite(size) && size > 0 ? size : 14;
  return NAMED_TEXT_PX[size ?? "normal"] ?? 14;
}
var TEXT_PX_SIZES = [8, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40];
function defaultText(value = "") {
  return { value, size: "normal", hAlign: "left", vAlign: "top" };
}

// src/core/drawings/schema.ts
var LINE_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" }
];
var LINE_FIELDS = [
  { path: "style.lineColor", label: "Line color", kind: "color", group: "line" },
  { path: "style.lineWidth", label: "Line width", kind: "number", min: 1, max: 10, step: 1, group: "line" },
  { path: "style.lineStyle", label: "Line style", kind: "lineStyle", options: LINE_STYLE_OPTIONS, group: "line" }
];
var FILL_FIELDS = [{ path: "style.fillColor", label: "Fill color", kind: "color", group: "fill" }];
var TEXT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "huge", label: "Huge" }
];
var TEXT_FIELDS = [
  { path: "text.value", label: "Text", kind: "text", group: "text" },
  { path: "text.color", label: "Text color", kind: "color", group: "text" },
  { path: "text.size", label: "Text size", kind: "select", options: TEXT_SIZE_OPTIONS, group: "text" },
  { path: "text.bold", label: "Bold", kind: "boolean", group: "text" },
  { path: "text.italic", label: "Italic", kind: "boolean", group: "text" }
];
var SHOW_PRICE_FIELD = { path: "showPrice", label: "Price label", kind: "boolean", group: "behavior" };
var SHOW_TIME_FIELD = { path: "showTime", label: "Time label", kind: "boolean", group: "behavior" };
var LINE_TEXT_ALIGN_FIELDS = [
  { path: "text.hAlign", label: "Text horizontal position", kind: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }], group: "text" },
  { path: "text.vAlign", label: "Text vertical position", kind: "select", options: [{ value: "top", label: "Top" }, { value: "center", label: "Middle" }, { value: "bottom", label: "Bottom" }], group: "text" }
];
var ALONG_LINE_TEXT_TYPES = /* @__PURE__ */ new Set(["trendline", "ray", "extendedline", "infoline", "trendangle", "arrow"]);

// src/core/drawings/intervals.ts
var INTERVAL_UNITS = [
  { unit: "seconds", label: "Seconds", ms: 1e3, max: 59 },
  { unit: "minutes", label: "Minutes", ms: 6e4, max: 59 },
  { unit: "hours", label: "Hours", ms: 36e5, max: 24 },
  { unit: "days", label: "Days", ms: 864e5, max: 366 },
  { unit: "weeks", label: "Weeks", ms: 7 * 864e5, max: 52 },
  { unit: "months", label: "Months", ms: 30 * 864e5, max: 12 }
];
var BAR_KIND_UNITS = [
  { unit: "ticks", label: "Ticks" },
  { unit: "ranges", label: "Ranges" }
];
function defaultRange(unit) {
  const meta = INTERVAL_UNITS.find((m) => m.unit === unit);
  return { on: true, from: 1, to: meta?.max ?? 1 };
}
function barUnit(barMs) {
  if (!Number.isFinite(barMs) || barMs <= 0) return null;
  if (barMs >= 28 * 864e5) return { unit: "months", count: Math.max(1, Math.round(barMs / (30 * 864e5))) };
  if (barMs >= 7 * 864e5 && barMs % (7 * 864e5) === 0) return { unit: "weeks", count: barMs / (7 * 864e5) };
  if (barMs >= 864e5) return { unit: "days", count: Math.round(barMs / 864e5) };
  if (barMs >= 36e5) return { unit: "hours", count: Math.round(barMs / 36e5) };
  if (barMs >= 6e4) return { unit: "minutes", count: Math.round(barMs / 6e4) };
  return { unit: "seconds", count: Math.max(1, Math.round(barMs / 1e3)) };
}
function shownOnBarMs(intervals, barMs, kind) {
  if (!intervals) return true;
  if (kind) return intervals[kind]?.on !== false;
  const u = barUnit(barMs);
  if (!u) return true;
  const r = intervals[u.unit];
  if (!r) return true;
  return r.on && u.count >= r.from && u.count <= r.to;
}
function compactIntervals(intervals) {
  if (!intervals) return void 0;
  const out = {};
  for (const { unit } of BAR_KIND_UNITS) {
    if (intervals[unit]?.on === false) out[unit] = { on: false, from: 1, to: 1 };
  }
  for (const m of INTERVAL_UNITS) {
    const r = intervals[m.unit];
    if (r && !(r.on && r.from <= 1 && r.to >= m.max)) out[m.unit] = { on: !!r.on, from: r.from, to: r.to };
  }
  return Object.keys(out).length ? out : void 0;
}

// src/core/drawings/futureAnchors.ts
var CLOCK = /* @__PURE__ */ new WeakMap();
function validBars(b) {
  const v = b;
  return !!v && typeof v === "object" && Number.isFinite(v.from) && Number.isFinite(v.n);
}
function readAnchor(p) {
  const out = { time: p.time, price: p.price };
  if (validBars(p.bars)) {
    out.bars = { from: p.bars.from, n: p.bars.n };
    CLOCK.set(out, p.time);
  }
  return out;
}
function resolveAnchors(anchors, axis) {
  for (const a of anchors) {
    if (!a.bars) continue;
    const clock = CLOCK.get(a) ?? a.time;
    CLOCK.set(a, clock);
    a.time = axis ? axis.timeOf(axis.logicalOf(a.bars.from) + a.bars.n) : clock;
  }
}
function writeAnchor(a, axis) {
  if (a.bars) return { time: CLOCK.get(a) ?? a.time, price: a.price, bars: { from: a.bars.from, n: a.bars.n } };
  if (axis) {
    const n = axis.logicalOf(a.time) - axis.lastLogical;
    if (n > 1e-6) return { time: a.time, price: a.price, bars: { from: axis.lastTime, n } };
  }
  return { time: a.time, price: a.price };
}
function translateInBars(orig, dLogical, dPrice, axis, move) {
  const asBars = orig.map((o) => ({ time: axis.logicalOf(o.time), price: o.price }));
  return move(dLogical, dPrice, asBars).map((p) => ({ time: axis.timeOf(p.time), price: p.price }));
}
function timeBetween(proj, t0, t1, r) {
  const ax = proj.barAxis;
  if (!ax) return t0 + r * (t1 - t0);
  const l0 = ax.logicalOf(t0);
  return ax.timeOf(l0 + r * (ax.logicalOf(t1) - l0));
}
function timeAfter(proj, origin, from, to, r) {
  const ax = proj.barAxis;
  if (!ax) return origin + r * (to - from);
  return ax.timeOf(ax.logicalOf(origin) + r * (ax.logicalOf(to) - ax.logicalOf(from)));
}
function timePlusBars(proj, t, n, ms) {
  const ax = proj.barAxis;
  return ax ? ax.timeOf(ax.logicalOf(t) + n) : t + ms;
}

// src/core/drawings/Drawing.ts
var TV_TEXT_DEFAULTS = {
  trendline: { color: TV_LINE_COLOR, size: 14, hAlign: "center", vAlign: "top" },
  ray: { color: TV_LINE_COLOR, size: 14, hAlign: "center", vAlign: "top" },
  extendedline: { color: TV_LINE_COLOR, size: 14, hAlign: "center", vAlign: "top" },
  arrow: { color: TV_LINE_COLOR, size: 14, hAlign: "center", vAlign: "top" },
  infoline: { color: TV_LINE_COLOR, size: 14, hAlign: "center", vAlign: "top" },
  hline: { color: TV_LINE_COLOR, size: 12, hAlign: "center", vAlign: "center" },
  hray: { color: TV_LINE_COLOR, size: 12, hAlign: "center", vAlign: "bottom" },
  parallelchannel: { color: TV_LINE_COLOR, size: 14, hAlign: "left", vAlign: "top" },
  flattopbottom: { color: "#FF9800", size: 14, hAlign: "left", vAlign: "top" },
  // palette-exempt: TradingView's tan orange 500
  disjointchannel: { color: "#089981", size: 14, hAlign: "left", vAlign: "top" },
  // palette-exempt: TradingView's minty green 500
  vline: { color: TV_LINE_COLOR, size: 14, hAlign: "center", vAlign: "center" },
  pricerange: { color: TV_LINE_COLOR, size: 12 },
  datepricerange: { color: TV_LINE_COLOR, size: 12 },
  daterange: { color: TV_LINE_COLOR, size: 12 },
  arrowmarker: { color: "#1e53e5", size: 16, bold: true },
  // palette-exempt: TradingView's blue 600
  arrowmarkup: { color: "#089981", size: 14 },
  // palette-exempt: TradingView's minty green 500
  arrowmarkdown: { color: "#cc2f3c", size: 14 }
  // palette-exempt: TradingView's ripe red 600
};
var DRAWING_TITLE_MAX = 100;
function drawingTitle(v) {
  if (typeof v !== "string") return void 0;
  const t = v.trim().slice(0, DRAWING_TITLE_MAX);
  return t || void 0;
}
var _Drawing = class _Drawing {
  // Public so the registry can construct concrete subclasses; `abstract` still
  // prevents `new Drawing()` directly.
  constructor(init) {
    this.locked = false;
    this.visible = true;
    this.zIndex = 0;
    /** The bar axis of the chart showing this drawing (null on a time chart); see `futureAnchors`. Not saved. */
    this.barAxis = null;
    this.id = init.id ?? `dw-${_Drawing.seq += 1}`;
    this.paneId = init.paneId;
    this.anchors = (init.anchors ?? []).map(readAnchor);
    this.style = init.style ? { ...init.style } : defaultStyle();
    this.text = init.text ? { ...init.text } : void 0;
    this.locked = init.locked ?? false;
    this.visible = init.visible ?? true;
    this.intervals = compactIntervals(init.intervals);
    this.title = drawingTitle(init.title);
    this.zIndex = init.zIndex ?? 0;
    this.createdAt = init.createdAt ?? Date.now();
    if (init.props) this.readProps(init.props);
  }
  /** True once enough anchors exist to be a real shape. */
  isComplete() {
    return this.anchors.length >= this.anchorSchema().min;
  }
  /**
   * How the tool is placed: `'click'` (click each anchor; a variable-count tool —
   * `max > min` — keeps adding until a finish gesture), `'drag'` (press at the first
   * corner, drag, release at the second — the press-drag-release idiom for boxes/ranges/positions),
   * or `'freehand'` (press, drag to capture a path, release). Drives the state machine.
   */
  placementMode() {
    return "click";
  }
  /**
   * Hook run once after interactive placement finishes, before the `create` intent —
   * lets a type finalize its anchors against the live projector (e.g. a position deriving
   * its stop/target/width in pixel space so a bare click drops a default-sized box).
   * Default: no-op.
   */
  onPlaced(_proj) {
  }
  /**
   * After a single handle (anchor `index`) is dragged, re-impose any cross-anchor invariant —
   * e.g. a position keeps its stop and target on opposite sides of the entry, flipping the
   * non-dragged side across the entry when a drag would put them on the same side. Default: no-op.
   */
  constrainHandleDrag(_index) {
  }
  /**
   * Apply a whole-body drag — translate the original anchors by (dt, dp) in data space.
   * Default moves every anchor together; a type can pin some (e.g. a callout keeps its
   * pointer tip fixed and moves only the box).
   */
  translateBody(dt, dp, orig) {
    return orig.map((o) => ({ time: o.time + dt, price: o.price + dp }));
  }
  /**
   * A handle drag in screen pixels, for a type whose geometry is partly in pixels (an image's size). Return true
   * when handled: the interaction then skips the anchor move. Default: not handled.
   */
  dragHandlePx(_index, _x, _y, _proj, _start) {
    return false;
  }
  /** The CSS cursor over handle `index` (e.g. a resize arrow), or null for the default pointer. */
  /** Each handle's look: TradingView draws most as rings, some (horizontal line) as rounded squares. Empty = rings. */
  handleShapes() {
    return [];
  }
  /** The points TradingView marks on the axes while the drawing is selected (a price chip and a time chip each, the
   *  shaded spans between them): its anchors by default; a channel marks its four corners. */
  axisPoints() {
    return this.anchors;
  }
  handleCursor(_index, _proj) {
    return null;
  }
  /**
   * A whole-body drag in screen pixels from the press point, for a type whose anchors are not all price/time (a post
   * card's height on the pane). Return the moved anchors, or null to use {@link translateBody}. Default: null.
   */
  translateBodyPx(_dx, _dy, _orig, _proj) {
    return null;
  }
  /**
   * Paint this drawing yourself, instead of the renderer's built-in look: for a type the host app registers
   * (`registerDrawingType`) whose body the app draws, e.g. a profile computed from the app's own data. Called by
   * the native painter with the canvas already in media px and clipped to the drawing's pane. Return true when
   * painted (the built-in painting is then skipped); the default paints nothing and returns false. Selection
   * handles stay the renderer's. Read async data through {@link Projector.host} and call
   * {@link Projector.requestRepaint} when it lands.
   */
  paintSelf(_ctx, _proj, _theme) {
    return false;
  }
  /**
   * Settings shown in the renderer's INDICATOR inputs dialog instead of the drawing settings dialog: for a
   * host-registered type whose settings are an indicator's inputs. Null (default) keeps the drawing dialog.
   */
  inputsDialog() {
    return null;
  }
  /** Extra buttons on the drawing's floating toolbar (e.g. a host's Templates menu). Default none. */
  toolbarActions() {
    return [];
  }
  /**
   * What the renderer paints while the tool is being placed: `'shape'` (the drawing itself, faded) or
   * `'timespan'` (only a dashed guide at each time anchor, like the built-in fixed-range profiles: a data-driven
   * body must not fetch on every cursor move). Default `'shape'`.
   */
  placementPreview() {
    return "shape";
  }
  /**
   * Time span (epoch ms) the drawing occupies, for visible-range culling. Default
   * is the anchor extent; a full-width drawing (e.g. a horizontal line) overrides
   * to `null` meaning "all time" so it never culls.
   */
  timeExtent() {
    if (this.anchors.length === 0) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const a of this.anchors) {
      if (a.time < lo) lo = a.time;
      if (a.time > hi) hi = a.time;
    }
    return { min: lo, max: hi };
  }
  /**
   * Editable per-level config for a rich "gear" settings panel (Fibonacci levels):
   * each entry's `color` / `enabled` / `label` is mutated via a `levels.<i>.<field>`
   * settings path. Simple drawings return null (no gear).
   */
  editableLevels() {
    return null;
  }
  /** A handle that is grabbed but not drawn (TradingView's text shows no point). */
  handleHidden(_index) {
    return false;
  }
  /** A variable click tool that ends when the next click lands on its last point (TradingView's path). */
  finishesOnSamePoint() {
    return false;
  }
  /** TradingView's text for this tool (color, size, alignment), used when text is first added. */
  textDefaults() {
    return TV_TEXT_DEFAULTS[this.type];
  }
  /** Apply a `{ 'dot.path': value }` patch (the popup emits these). */
  applySettings(patch) {
    for (const [path, value] of Object.entries(patch)) {
      if (path.startsWith("text.") && !this.text) this.text = { ...defaultText(), ...ALONG_LINE_TEXT_TYPES.has(this.type) ? { hAlign: "center" } : {}, ...this.textDefaults() };
      setByPath(this, path, value);
    }
  }
  /** Points TradingView marks on a selected drawing without letting them be dragged (a brush's two ends). */
  selectionMarkers(_proj) {
    return [];
  }
  /** Re-read per-type extras (props) onto this instance — used by the store on an edit. */
  applyProps(props) {
    this.readProps(props);
  }
  // ── serialization ──
  serialize() {
    return {
      id: this.id,
      type: this.type,
      paneId: this.paneId,
      anchors: this.anchors.map((p) => writeAnchor(p, this.barAxis)),
      style: { ...this.style },
      text: this.text ? { ...this.text } : void 0,
      locked: this.locked,
      visible: this.visible,
      intervals: compactIntervals(this.intervals),
      title: drawingTitle(this.title),
      zIndex: this.zIndex,
      createdAt: this.createdAt,
      props: this.writeProps()
    };
  }
  /** Per-type extras to serialize into `props` (override in subclasses). */
  writeProps() {
    return void 0;
  }
  /** Read per-type extras from a `props` bag (override in subclasses). */
  readProps(_props) {
  }
};
/** Fallback id counter — used only when no id is supplied (store assigns real ids). */
_Drawing.seq = 0;
var Drawing = _Drawing;
function setByPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = keys[i];
    let next = cur[k];
    if (next == null || typeof next !== "object") {
      next = {};
      cur[k] = next;
    }
    cur = next;
  }
  cur[keys[keys.length - 1]] = value;
}

// src/core/drawings/hittest.ts
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-9) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function distToPolyline(px, py, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = distToSegment(px, py, a[0], a[1], b[0], b[1]);
    if (d < best) best = d;
  }
  return best;
}
function pointInBox(px, py, x1, y1, x2, y2, pad = 0) {
  const lo = Math.min(x1, x2) - pad;
  const hi = Math.max(x1, x2) + pad;
  const top = Math.min(y1, y2) - pad;
  const bot = Math.max(y1, y2) + pad;
  return px >= lo && px <= hi && py >= top && py <= bot;
}
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    const intersect = a[1] > py !== b[1] > py && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0];
    if (intersect) inside = !inside;
  }
  return inside;
}
function lineSegmentIntersection(lx1, ly1, lx2, ly2, ax, ay, bx, by) {
  const dx = lx2 - lx1;
  const dy = ly2 - ly1;
  const ex = bx - ax;
  const ey = by - ay;
  const denom = ex * dy - ey * dx;
  if (Math.abs(denom) < 1e-9) return null;
  const s = ((ay - ly1) * dx - (ax - lx1) * dy) / denom;
  if (s < 0 || s > 1) return null;
  return [ax + s * ex, ay + s * ey];
}
function handleAt(px, py, handles, rad = 6) {
  for (let i = 0; i < handles.length; i += 1) {
    const h = handles[i];
    if (Math.hypot(px - h[0], py - h[1]) <= rad) return i;
  }
  return -1;
}
function extendRay(x1, y1, x2, y2, extend, width, height) {
  if (extend === "none") return [x1, y1, x2, y2];
  const dx = x2 - x1;
  const left = extend === "left" || extend === "both";
  const right = extend === "right" || extend === "both";
  if (Math.abs(dx) < 1e-6) {
    if (left && right) return [x1, 0, x2, height];
    const downward = y2 >= y1;
    if (right) return downward ? [x1, y1, x2, height] : [x1, y1, x2, 0];
    return downward ? [x1, 0, x2, y2] : [x1, height, x2, y2];
  }
  const slope = (y2 - y1) / dx;
  const yAt = (x) => y1 + slope * (x - x1);
  const lx = left ? -2 : Math.min(x1, x2);
  const rx = right ? width + 2 : Math.max(x1, x2);
  return [lx, yAt(lx), rx, yAt(rx)];
}

// src/core/drawings/types/ImageDrawing.ts
var IMAGE_MAX_BYTES = 2 * 1024 * 1024;
var IMAGE_MAX_SIDE = 2e3;
var IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
var MAX_DATA_URL = Math.ceil(IMAGE_MAX_BYTES / 3) * 4 + 32;
function checkImageFile(file, dims) {
  if (!IMAGE_TYPES.includes(file.type)) return "The image must be JPG, PNG or WEBP";
  if (file.size > IMAGE_MAX_BYTES) return "The image is over the 2MB maximum";
  if (dims && (dims.width > IMAGE_MAX_SIDE || dims.height > IMAGE_MAX_SIDE)) return "The maximum resolution is 2000 x 2000 pixels";
  return null;
}
function safeImageUrl(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length > MAX_DATA_URL) return null;
  if (/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(s)) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
var MIN_PX = 8;
var MAX_PX = 4e3;
var ImageDrawing = class extends Drawing {
  constructor() {
    super(...arguments);
    this.type = "image";
  }
  anchorSchema() {
    return { min: 1, max: 2, slots: [{ role: "c1", free: "both" }, { role: "c2", free: "both" }] };
  }
  /** True for a picture with its own pixel size (TradingView's model); false for an old two-corner one. */
  sized() {
    return this.cssWidth > 0 && this.cssHeight > 0;
  }
  /** The URL to draw, or null when it is not an https link / image data. */
  imageUrl() {
    return safeImageUrl(this.url);
  }
  corner(proj, i) {
    const a = this.anchors[i];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  handlePoints(proj) {
    const tl = this.corner(proj, 0);
    if (!tl) return [];
    if (this.sized()) return [tl, [tl[0] + this.cssWidth, tl[1] + this.cssHeight]];
    const br = this.corner(proj, 1);
    return br ? [tl, br] : [tl];
  }
  bounds(proj) {
    const p = this.handlePoints(proj);
    if (p.length < 2) return null;
    const x = Math.min(p[0][0], p[1][0]);
    const y = Math.min(p[0][1], p[1][1]);
    return { x, y, w: Math.abs(p[1][0] - p[0][0]), h: Math.abs(p[1][1] - p[0][1]) };
  }
  hitTest(px, py, proj, tol) {
    const b = this.bounds(proj);
    return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol);
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  /** The bottom-right handle of a sized picture sets its size; the top-left one moves it (an anchor drag). */
  dragHandlePx(index, x, y, proj) {
    if (index !== 1 || !this.sized()) return false;
    const tl = this.corner(proj, 0);
    if (!tl) return true;
    this.cssWidth = Math.min(MAX_PX, Math.max(MIN_PX, x - tl[0]));
    this.cssHeight = Math.min(MAX_PX, Math.max(MIN_PX, y - tl[1]));
    return true;
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (a && this.sized()) return { min: a.price, max: a.price };
    return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
  }
  schema() {
    return {
      fields: [
        { path: "url", label: "Image link (https) or image data", kind: "text", group: "behavior" },
        { path: "opacity", label: "Opacity", kind: "opacity", min: 0, max: 1, step: 0.05, group: "fill" }
      ]
    };
  }
  writeProps() {
    const out = { url: this.imageUrl() ?? "", opacity: this.opacity ?? 1 };
    if (this.sized()) Object.assign(out, { cssWidth: Math.round(this.cssWidth), cssHeight: Math.round(this.cssHeight) });
    return out;
  }
  readProps(props) {
    if (typeof props.url === "string") this.url = safeImageUrl(props.url) ?? "";
    if (typeof props.opacity === "number" && Number.isFinite(props.opacity)) this.opacity = Math.min(1, Math.max(0, props.opacity));
    const px = (v) => typeof v === "number" && Number.isFinite(v) ? Math.min(MAX_PX, Math.max(MIN_PX, v)) : 0;
    if ("cssWidth" in props || "cssHeight" in props) {
      this.cssWidth = px(props.cssWidth);
      this.cssHeight = px(props.cssHeight);
    } else {
      this.cssWidth ?? (this.cssWidth = 0);
      this.cssHeight ?? (this.cssHeight = 0);
    }
  }
};

// src/core/drawings/types/XPostDrawing.ts
var XPOST_W = 300;
var str = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
var num = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
function safeRelayPath(v) {
  return typeof v === "string" && /^\/(?!\/)[A-Za-z0-9/_\-.~?=&%+]*$/.test(v) && v.length <= 2048 ? v : "";
}
function toXPostCard(v) {
  if (!v || typeof v !== "object") return null;
  const o = v;
  const id = str(o.id, 24);
  if (!/^\d{1,20}$/.test(id) || typeof o.t !== "number" || !Number.isFinite(o.t)) return null;
  const handle = str(o.handle, 64);
  const url = str(o.url, 256);
  return {
    id,
    url: /^https:\/\/(x|twitter)\.com\//.test(url) ? url : `https://x.com/${handle || "i"}/status/${id}`,
    t: o.t,
    text: str(o.text, 4e3),
    name: str(o.name, 120),
    handle,
    avatar: safeRelayPath(o.avatar),
    verified: o.verified === true,
    media: Array.isArray(o.media) ? o.media.map(safeRelayPath).filter(Boolean).slice(0, 4) : [],
    likes: num(o.likes),
    replies: num(o.replies)
  };
}
var XPOST_POSITION = 50;
var XPostDrawing = class extends Drawing {
  constructor() {
    super(...arguments);
    this.type = "xpost";
    /** Size the painter last measured the card at (CSS px): the hit box until the next paint. */
    this.cardW = XPOST_W;
    this.cardH = 150;
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "point", free: "both" }] };
  }
  /** The post's bar on screen: its x and the points the line may end at (high and low; the close on a line chart).
   *  Empty when the bar is not loaded. */
  barPoints(proj) {
    const bar = this.post ? proj.barAt?.(this.post.t) : null;
    if (!bar) return [];
    const x = proj.xOf(bar.time);
    const ys = (bar.line ? [bar.close] : [bar.high, bar.low]).map((p) => proj.yOf(p, this.paneId));
    return ys.filter((y) => y != null).map((y) => [x, y]);
  }
  /** Where TradingView measures `position` from, in pane px: just above the bar's high (below its low for a
   *  negative position), or the pane's middle when the bar is not loaded. */
  reference(proj, top, height, dir, pole) {
    const bar = this.post ? proj.barAt?.(this.post.t) : null;
    if (bar) {
      const y = proj.yOf(bar.line ? bar.close : dir === 1 ? bar.high : bar.low, this.paneId);
      if (y != null) return y - top - (pole ? dir * (bar.line ? 1 : 3) : 0);
    }
    return height / 2;
  }
  /** The handle's y for a position (TradingView's `positionToCoordinate`). TradingView draws it a few px clear of
   *  the bar (`pole`) but measures a drag from the bar itself, so a drag that has not moved changes nothing. */
  yForPosition(position, proj, pole = true) {
    const pane = proj.paneRect?.(this.paneId);
    if (!pane || pane.height <= 0) return null;
    const pos = clampPos(position);
    const dir = pos >= 0 ? 1 : -1;
    const d = pane.height;
    const c = this.reference(proj, pane.top, d, dir, pole);
    const room = Math.min(d, Math.max(0, dir === 1 ? c : d - c));
    let y = c - dir * Math.abs(room * pos / 100);
    if (y >= 0 && y <= d) y = Math.min(d - 2, Math.max(2, y));
    return pane.top + y;
  }
  /** The position for a handle at `y` (TradingView's `_updatePositionAndCorrectPoint`): above the bar's low counts
   *  as above the bar, and inside the bar is 0. */
  positionAt(y, proj) {
    const pane = proj.paneRect?.(this.paneId);
    if (!pane || pane.height <= 0) return XPOST_POSITION;
    const o = pane.height;
    let yl = y - pane.top;
    let s = o / 2;
    let a = yl <= s ? 1 : -1;
    const bar = this.post ? proj.barAt?.(this.post.t) : null;
    const hi = bar ? proj.yOf(bar.line ? bar.close : bar.high, this.paneId) : null;
    const lo = bar ? proj.yOf(bar.line ? bar.close : bar.low, this.paneId) : null;
    if (hi != null && lo != null) {
      a = yl <= lo - pane.top ? 1 : -1;
      s = (a === 1 ? hi : lo) - pane.top;
      if (a === 1) yl = Math.min(yl, s);
    }
    const room = a === 1 ? s : o - s;
    if (!(room > 0)) return 0;
    return clampPos(Math.min(o, Math.abs(yl - s)) * 100 * a / room);
  }
  /** The handle (top middle of the card) and the card's box below it. */
  layout(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const y = this.yForPosition(a.price, proj);
    if (y == null) return null;
    const x = proj.xOf(a.time);
    return { dot: [x, y], card: { x: x - this.cardW / 2, y, w: this.cardW, h: this.cardH } };
  }
  handlePoints(proj) {
    const l = this.layout(proj);
    return l ? [l.dot] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    return this.layout(proj)?.card ?? null;
  }
  hitTest(px, py, proj, tol) {
    const b = this.bounds(proj);
    return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol);
  }
  /** The card moves on the screen: along the time axis, and up or down as a new position against its bar. */
  translateBodyPx(dx, dy, orig, proj) {
    const o = orig[0];
    const y = o ? this.yForPosition(o.price, proj, false) : null;
    const pane = proj.paneRect?.(this.paneId);
    if (!o || y == null || !pane) return orig;
    const time = proj.pxToPoint(proj.xOf(o.time) + dx, pane.top, this.paneId).time;
    return [{ time, price: this.positionAt(y + dy, proj) }];
  }
  /** Dragging the handle moves the card the same way (never onto a price). */
  dragHandlePx(_index, x, y, proj) {
    const pane = proj.paneRect?.(this.paneId);
    if (!pane || pane.height <= 0) return true;
    this.anchors = [{ time: proj.pxToPoint(x, y, this.paneId).time, price: this.positionAt(y, proj) }];
    return true;
  }
  /** Not a price: never part of the price scale's range. */
  priceRange() {
    return null;
  }
  timeExtent() {
    const a = this.anchors[0];
    return a ? { min: a.time, max: a.time } : null;
  }
  schema() {
    return { fields: [] };
  }
  writeProps() {
    return { post: this.post ?? null };
  }
  readProps(props) {
    if ("post" in props) this.post = toXPostCard(props.post);
  }
};
function clampPos(v) {
  return Number.isFinite(v) ? Math.min(100, Math.max(-100, v)) : XPOST_POSITION;
}

// src/core/drawings/types/lineStats.ts
var STATS_PARTS = [
  { key: "price", label: "Price range" },
  { key: "percent", label: "Percent change" },
  { key: "pips", label: "Change in pips" },
  { key: "bars", label: "Bars range" },
  { key: "date", label: "Date/time range" },
  { key: "distance", label: "Distance" },
  { key: "angle", label: "Angle" }
];
var NO_STATS = { price: false, percent: false, pips: false, bars: false, date: false, distance: false, angle: false, position: "right", always: false };
var ALL_STATS = { price: true, percent: true, pips: true, bars: true, date: true, distance: true, angle: true, position: "center", always: true };
function readStats(raw, defaults2) {
  const s = { ...defaults2 };
  if (raw && typeof raw === "object") {
    const r = raw;
    for (const k of ["price", "percent", "pips", "bars", "date", "distance", "angle", "always"]) if (typeof r[k] === "boolean") s[k] = r[k];
    if (r.position === "left" || r.position === "center" || r.position === "right" || r.position === "auto") s.position = r.position;
  }
  return s;
}
function statsOf(d) {
  if (!STATS_TYPES.has(d.type)) return null;
  return readStats(d.stats, d.type === "infoline" ? ALL_STATS : NO_STATS);
}
var STATS_TYPES = /* @__PURE__ */ new Set(["trendline", "ray", "extendedline", "infoline", "trendangle", "arrow"]);
function anyStats(s) {
  return !!s && (s.price || s.percent || s.pips || s.bars || s.date || s.distance || s.angle);
}
var LINE_STATS_FIELDS = [
  ...STATS_PARTS.map((p) => ({ path: `stats.${p.key}`, label: p.label, kind: "boolean", group: "behavior" })),
  {
    path: "stats.position",
    label: "Stats position",
    kind: "select",
    options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }, { value: "auto", label: "Auto" }],
    group: "behavior"
  },
  { path: "stats.always", label: "Always show stats", kind: "boolean", group: "behavior" }
];
function formatSpan(ms) {
  let m = Math.round(Math.abs(ms) / 6e4);
  if (m === 0) return `${Math.round(Math.abs(ms) / 1e3)}s`;
  const d = Math.floor(m / 1440);
  m -= d * 1440;
  const h = Math.floor(m / 60);
  m -= h * 60;
  return [d ? `${d}d` : "", h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ");
}
function fmtPrice(v, ref) {
  const a = Math.abs(ref);
  const dp = a >= 10 ? 2 : a >= 1 ? 4 : 6;
  return v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function lineStatsRows(s, a, b, p, proj, tick) {
  const rows = [];
  const diff = b.price - a.price;
  const pct = a.price !== 0 ? diff / Math.abs(a.price) * 100 : 0;
  const price = s.price ? fmtPrice(diff, Math.max(Math.abs(a.price), Math.abs(b.price))) : "";
  const percent = s.percent ? `${pct >= 0 ? "" : "\u2212"}${Math.abs(pct).toFixed(2)}%` : "";
  const t = tick && tick > 0 ? tick : 0;
  const pips = s.pips && t ? Math.round(diff / t) : null;
  const pipsText = pips == null ? "" : `${pips < 0 ? "\u2212" : ""}${Math.abs(pips).toLocaleString("en-US")}`;
  const head = price && percent ? `${price.replace("-", "\u2212")} (${percent})` : price.replace("-", "\u2212") || percent;
  if (head || pipsText) rows.push([head, pipsText].filter(Boolean).join(", "));
  const parts = [];
  if (s.bars) {
    const bars = proj.barsBetween ? Math.abs(Math.round(proj.barsBetween(a.time, b.time))) : 0;
    parts.push(`${bars} bars${s.date ? ` (${formatSpan(b.time - a.time)})` : ""}`);
  } else if (s.date) parts.push(formatSpan(b.time - a.time));
  if (s.distance) parts.push(`distance: ${Math.round(Math.hypot(p[2] - p[0], p[3] - p[1]))} px`);
  if (parts.length) rows.push(parts.join(", "));
  if (s.angle) {
    const deg = Math.atan2(-(p[3] - p[1]), p[2] - p[0]) * 180 / Math.PI;
    rows.push(`${deg < 0 ? "\u2212" : ""}${Math.abs(deg).toFixed(2)}\xB0`);
  }
  return rows;
}

// src/core/drawings/types/TrendLine.ts
var TrendLine = class extends Drawing {
  constructor() {
    super(...arguments);
    // A ray (extended right), an extended line (both ways) and an info line (every stat on) are the same tool in
    // TradingView, and so is its arrow (the right end an arrow); its trend angle is built on it.
    this.type = "trendline";
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }] };
  }
  writeProps() {
    return {
      extendLeft: !!this.extendLeft,
      extendRight: !!this.extendRight,
      stats: statsOf(this),
      showMiddlePoint: !!this.showMiddlePoint,
      showPriceLabels: !!this.showPriceLabels
    };
  }
  readProps(props) {
    if (typeof props.extendLeft === "boolean") this.extendLeft = props.extendLeft;
    if (typeof props.extendRight === "boolean") this.extendRight = props.extendRight;
    if (props.stats && typeof props.stats === "object") this.stats = { ...props.stats };
    if (typeof props.showMiddlePoint === "boolean") this.showMiddlePoint = props.showMiddlePoint;
    if (typeof props.showPriceLabels === "boolean") this.showPriceLabels = props.showPriceLabels;
  }
  pixels(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const y1 = proj.yOf(a.price, this.paneId);
    const y2 = proj.yOf(b.price, this.paneId);
    if (y1 == null || y2 == null) return null;
    return [proj.xOf(a.time), y1, proj.xOf(b.time), y2];
  }
  /** The segment as drawn, left point first: an extended side is carried to the pane edge (x = 0 or width). */
  drawnPixels(proj) {
    const p = this.pixels(proj);
    if (!p || !this.extendLeft && !this.extendRight) return p;
    let [x1, y1, x2, y2] = p;
    if (Math.abs(x2 - x1) < 1e-6) return p;
    if (x1 > x2) [x1, y1, x2, y2] = [x2, y2, x1, y1];
    const slope = (y2 - y1) / (x2 - x1);
    if (this.extendLeft) {
      y1 += (0 - x1) * slope;
      x1 = 0;
    }
    if (this.extendRight) {
      y2 += (proj.width - x2) * slope;
      x2 = proj.width;
    }
    return [x1, y1, x2, y2];
  }
  hitTest(px, py, proj, tol) {
    const p = this.drawnPixels(proj);
    return p != null && distToSegment(px, py, p[0], p[1], p[2], p[3]) <= tol;
  }
  handlePoints(proj) {
    const p = this.pixels(proj);
    return p ? [[p[0], p[1]], [p[2], p[3]]] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const p = this.pixels(proj);
    if (!p) return null;
    const x = Math.min(p[0], p[2]);
    const y = Math.min(p[1], p[3]);
    return { x, y, w: Math.abs(p[2] - p[0]), h: Math.abs(p[3] - p[1]) };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
  // An extended side reaches the pane edge, so it stays visible however far the points scroll off.
  timeExtent() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return {
      min: this.extendLeft ? Number.NEGATIVE_INFINITY : Math.min(a.time, b.time),
      max: this.extendRight ? Number.POSITIVE_INFINITY : Math.max(a.time, b.time)
    };
  }
  schema() {
    return {
      fields: [
        ...LINE_FIELDS,
        { path: "style.arrowLeft", label: "Left end arrow", kind: "boolean", group: "line" },
        { path: "style.arrowRight", label: "Right end arrow", kind: "boolean", group: "line" },
        { path: "extendLeft", label: "Extend left", kind: "boolean", group: "behavior" },
        { path: "extendRight", label: "Extend right", kind: "boolean", group: "behavior" },
        { path: "showMiddlePoint", label: "Middle point", kind: "boolean", group: "behavior" },
        { path: "showPriceLabels", label: "Price labels", kind: "boolean", group: "behavior" },
        ...LINE_STATS_FIELDS,
        ...TEXT_FIELDS,
        ...LINE_TEXT_ALIGN_FIELDS
      ]
    };
  }
};

// src/core/drawings/types/SegmentDrawing.ts
var SegmentDrawing = class extends Drawing {
  constructor(init) {
    super(init);
    const kind = this.tvShapeKind();
    if (kind && !init.props) {
      this.tv = true;
      this.fillBackground = kind !== "curve" && kind !== "lines";
    }
  }
  /** The tool's TradingView shape look (null: the tool keeps its own props and look). */
  tvShapeKind() {
    return null;
  }
  /** Whether the fill is painted (a TradingView shape's Background switch; others whenever they have a fill). */
  fillShown() {
    return !!this.style.fillColor && !(this.tvShapeKind() && this.tv && this.fillBackground === false);
  }
  /** TradingView's settings for its plain shapes: Border (colour, width; a polyline's style too) or a curve's Line,
   *  and Background. No text. */
  tvShapeSchema() {
    const kind = this.tvShapeKind();
    const line = LINE_FIELDS.filter((f) => kind !== "area" || f.path !== "style.lineStyle");
    if (kind === "lines") return { fields: line };
    return {
      fields: [
        ...kind === "curve" || kind === "cycle" ? line : line.map((f) => ({ ...f, label: f.label.replace("Line", "Border") })),
        ...FILL_FIELDS,
        { path: "fillBackground", label: "Background", kind: "boolean", group: "fill" }
      ]
    };
  }
  writeProps() {
    return this.tvShapeKind() && this.tv ? { tv: true, fillBackground: this.fillBackground === true } : void 0;
  }
  readProps(props) {
    if (!this.tvShapeKind() || props.tv !== true) return;
    this.tv = true;
    if (typeof props.fillBackground === "boolean") this.fillBackground = props.fillBackground;
  }
  hitTest(px, py, proj, tol) {
    const g = this.geometry(proj);
    if (!g) return false;
    if (this.fillShown() && g.fill && pointInPolygon(px, py, g.fill)) return true;
    if (g.colored?.some(({ seg: s }) => distToSegment(px, py, s[0], s[1], s[2], s[3]) <= tol)) return true;
    return g.segments.some((s) => distToSegment(px, py, s[0], s[1], s[2], s[3]) <= tol);
  }
  handlePoints(proj) {
    const pts = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      pts.push([proj.xOf(a.time), y]);
    }
    return pts;
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const pts = this.handlePoints(proj);
    if (pts.length === 0) return null;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
};

// src/core/drawings/types/CyclicLines.ts
var MAX_CYCLES = 400;
var CyclicLines = class extends SegmentDrawing {
  constructor() {
    super(...arguments);
    this.type = "cycliclines";
  }
  /** TradingView's look on a new one (module 967139: its light teal, 2 px). */
  tvShapeKind() {
    return "lines";
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "start", free: "both" }, { role: "period", free: "both" }] };
  }
  geometry(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const x0 = proj.xOf(a.time);
    const step = Math.abs(proj.xOf(b.time) - x0);
    const segments = [];
    if (step < 2) return { segments: [[x0, 0, x0, proj.height]], fill: null };
    for (let i = 0, x = x0; i < MAX_CYCLES && x <= proj.width; i += 1, x += step) if (x >= 0) segments.push([x, 0, x, proj.height]);
    return { segments, fill: null };
  }
  priceRange() {
    return null;
  }
  timeExtent() {
    const a = this.anchors[0];
    return a ? { min: a.time, max: Number.POSITIVE_INFINITY } : null;
  }
  schema() {
    if (this.tv) return this.tvShapeSchema();
    return { fields: [...LINE_FIELDS] };
  }
};

// src/core/drawings/types/Projection.ts
var SWEEP_STEPS = 48;
var TV_PROJECTION = {
  color1: "#2962FF",
  // palette-exempt: TradingView's tv-blue-500 (the sector's centre)
  color2: "#9C27B0",
  // palette-exempt: TradingView's grapes-purple-500 (the sector's rim)
  border: "#9C9C9C"
  // palette-exempt: TradingView's cold-gray-400 border
};
var Projection = class extends SegmentDrawing {
  constructor(init) {
    super(init);
    this.type = "projection";
    if (!init.props) {
      this.tv = true;
      this.style = { ...this.style, lineColor: TV_PROJECTION.border, lineWidth: 2, lineStyle: "solid" };
      this.color1 = TV_PROJECTION.color1;
      this.color2 = TV_PROJECTION.color2;
      this.transparency = 80;
      this.fillBackground = true;
    }
  }
  /** The sector in pixels: centre, radius, start angle and signed sweep (the short way round), and the third point
   *  moved onto the circle (TradingView draws its handle there). */
  sector(proj) {
    const pts = this.handlePointsRaw(proj);
    if (pts.length < 3) return null;
    const [cx, cy] = pts[0];
    const [x2, y2] = pts[1];
    const [x3, y3] = pts[2];
    const r = Math.hypot(x2 - cx, y2 - cy);
    const a0 = Math.atan2(y2 - cy, x2 - cx);
    const a3 = Math.atan2(y3 - cy, x3 - cx);
    let sweep = a3 - a0;
    if (sweep > Math.PI) sweep -= 2 * Math.PI;
    if (sweep < -Math.PI) sweep += 2 * Math.PI;
    return { cx, cy, r, a0, sweep, p2: [x2, y2], p3: [cx + r * Math.cos(a3), cy + r * Math.sin(a3)] };
  }
  handlePointsRaw(proj) {
    const out = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      out.push([proj.xOf(a.time), y]);
    }
    return out;
  }
  /** TradingView's third handle sits on the circle, along the third point's direction. */
  handlePoints(proj) {
    const raw = this.handlePointsRaw(proj);
    const s = this.tv ? this.sector(proj) : null;
    return s ? [raw[0], raw[1], s.p3] : raw;
  }
  anchorSchema() {
    return { min: 3, max: 3, slots: [{ role: "center", free: "both" }, { role: "radius", free: "both" }, { role: "sweep", free: "both" }] };
  }
  geometry(proj) {
    const pts = this.handlePointsRaw(proj);
    if (pts.length < 2) return null;
    const [cx, cy] = pts[0];
    const [x2, y2] = pts[1];
    if (pts.length < 3) return { segments: [[cx, cy, x2, y2]], fill: null };
    const [x3, y3] = pts[2];
    const r = Math.hypot(x2 - cx, y2 - cy);
    const a0 = Math.atan2(y2 - cy, x2 - cx);
    let sweep = Math.atan2(y3 - cy, x3 - cx) - a0;
    if (sweep > Math.PI) sweep -= 2 * Math.PI;
    if (sweep < -Math.PI) sweep += 2 * Math.PI;
    const poly = [[cx, cy]];
    for (let i = 0; i <= SWEEP_STEPS; i += 1) {
      const a = a0 + sweep * i / SWEEP_STEPS;
      poly.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const segments = [];
    for (let i = 0; i < poly.length; i += 1) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      segments.push([p[0], p[1], q[0], q[1]]);
    }
    return { segments, fill: poly };
  }
  priceRange() {
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((p) => p.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    if (this.tv) return { fields: [{ path: "style.lineColor", label: "Border", kind: "color", group: "line" }, { path: "style.lineWidth", label: "Width", kind: "number", group: "line" }] };
    return { fields: [...LINE_FIELDS, ...FILL_FIELDS] };
  }
  writeProps() {
    if (!this.tv) return void 0;
    return { tv: true, color1: this.color1, color2: this.color2, transparency: this.transparency ?? 80, fillBackground: this.fillBackground !== false };
  }
  readProps(props) {
    if (props.tv !== true) return;
    this.tv = true;
    if (typeof props.color1 === "string") this.color1 = props.color1;
    if (typeof props.color2 === "string") this.color2 = props.color2;
    if (typeof props.transparency === "number" && Number.isFinite(props.transparency)) this.transparency = Math.min(100, Math.max(0, props.transparency));
    if (typeof props.fillBackground === "boolean") this.fillBackground = props.fillBackground;
  }
};

// src/core/drawings/types/rangeInfo.ts
var RANGE_PARTS = [
  { key: "priceRange", label: "Price range" },
  { key: "percent", label: "Percent change" },
  { key: "pips", label: "Change in pips" },
  { key: "bars", label: "Bars range" },
  { key: "dateTime", label: "Date/time range" },
  { key: "volume", label: "Volume" }
];
var RANGE_LABEL = { color: "#ffffff", size: 12, background: "#1a1a1a" };
function formatRangeVolume(v) {
  const [n, unit] = v >= 1e9 ? [v / 1e9, " B"] : v >= 1e6 ? [v / 1e6, " M"] : v >= 1e3 ? [v / 1e3, " K"] : [v, ""];
  return `${Number(n.toFixed(2))}${unit}`;
}
function rangeInfoLines(info, a, b, f) {
  const diff = b.price - a.price;
  const t = f.tick > 0 ? f.tick : 0.01;
  const dp = Math.max(0, Math.min(10, Math.round(-Math.log10(t))));
  const sign = (v) => v < 0 ? "\u2212" : "";
  let price = "";
  if (info.priceRange) price += `${sign(diff)}${Math.abs(diff).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
  if (info.percent) {
    const pct = a.price !== 0 ? Math.round(100 * diff / Math.abs(a.price) * 100) / 100 : 0;
    const s = `${sign(pct)}${Math.abs(pct).toFixed(2)}%`;
    price += info.priceRange ? ` (${s})` : s;
  }
  if (info.pips) {
    const pips = Math.round(diff / t);
    if (info.priceRange) price += info.percent ? " " : ", ";
    else if (info.percent) price += ", ";
    price += `${sign(pips)}${Math.abs(pips).toLocaleString("en-US")}`;
  }
  let time = "";
  if (info.bars) time += `${Math.round(f.bars ?? 0)} bars`;
  if (info.dateTime) {
    if (info.bars) time += ", ";
    time += `${b.time < a.time ? "-" : ""}${formatSpan(b.time - a.time)}`;
  }
  const lines = [price, time].filter(Boolean);
  if (info.volume && f.volume != null && Number.isFinite(f.volume)) lines.push(`Vol ${formatRangeVolume(f.volume)}`);
  return lines;
}

// src/core/drawings/types/MeasureBox.ts
function signed(n) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}
function formatDuration(ms) {
  const m = Math.abs(ms);
  const DAY2 = 864e5;
  const HR = 36e5;
  const MIN = 6e4;
  if (m >= DAY2) {
    const d = Math.floor(m / DAY2);
    const h = Math.round(m % DAY2 / HR);
    return h ? `${d}d ${h}h` : `${d}d`;
  }
  if (m >= HR) {
    const h = Math.floor(m / HR);
    const mn = Math.round(m % HR / MIN);
    return mn ? `${h}h ${mn}m` : `${h}h`;
  }
  if (m >= MIN) return `${Math.round(m / MIN)}m`;
  return `${Math.round(m / 1e3)}s`;
}
var MeasureBox = class extends Drawing {
  constructor(init) {
    super(init);
    if (this.showPrice === void 0) this.showPrice = true;
    if (this.showDate === void 0) this.showDate = true;
    if (this.fillBackground === void 0) this.fillBackground = true;
    if (!this.info) this.info = Object.fromEntries(this.rangeParts().map((p) => [p.key, true]));
    if (this.labelColor === void 0) this.labelColor = RANGE_LABEL.color;
    if (this.labelSize === void 0) this.labelSize = RANGE_LABEL.size;
    if (this.labelBackground === void 0) this.labelBackground = true;
    if (this.labelBgColor === void 0) this.labelBgColor = RANGE_LABEL.background;
  }
  /** The Stats parts TradingView's dialog offers for this range. */
  rangeParts() {
    return RANGE_PARTS;
  }
  /** The plate's lines in TradingView's format; `tick` is the price scale's step. */
  infoLines(proj, tick) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return [];
    const bars = proj.barsBetween ? proj.barsBetween(a.time, b.time) : 0;
    const inRange = proj.barsInRange ? proj.barsInRange(Math.min(a.time, b.time), Math.max(a.time, b.time)) : null;
    const volume = inRange ? inRange.reduce((sum2, bar) => sum2 + (bar.volume ?? 0), 0) : void 0;
    const on = {};
    for (const p of this.rangeParts()) on[p.key] = this.info[p.key] === true;
    return rangeInfoLines(on, a, b, { tick, bars, volume });
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "c1", free: "both" }, { role: "c2", free: "both" }] };
  }
  // Placed click-move-click (the inherited 'click' mode): first click sets a corner, the second
  // sets the opposite one — consistent with the box/Gann tools.
  /** The measurement lines, filtered by the enabled toggles (plus TradingView's volume line under the time). */
  measureLabel(proj) {
    const lines = [];
    if (this.showPrice) lines.push(this.priceLabel());
    if (this.showDate) lines.push(this.timeLabel(proj));
    const vol = this.showDate ? this.volumeLabel(proj) : "";
    if (vol) lines.push(vol);
    return lines;
  }
  /** `Vol 11.36K`: the volume of the bars between the two points, or '' when the feed has none. */
  volumeLabel(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b || !proj.barsInRange) return "";
    const bars = proj.barsInRange(Math.min(a.time, b.time), Math.max(a.time, b.time));
    const v = bars.reduce((sum2, bar) => sum2 + (bar.volume ?? 0), 0);
    if (!(v > 0)) return "";
    const [n, unit] = v >= 1e9 ? [v / 1e9, "B"] : v >= 1e6 ? [v / 1e6, "M"] : v >= 1e3 ? [v / 1e3, "K"] : [v, ""];
    return `Vol ${n.toFixed(unit ? 2 : 0)}${unit}`;
  }
  /** Up (later price ≥ earlier) → green; else red. */
  isUp() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    return a != null && b != null && b.price >= a.price;
  }
  /** Formatted `Δprice (Δ%)` between the two anchors. */
  priceLabel() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return "";
    const delta = b.price - a.price;
    const percent = a.price !== 0 ? delta / a.price * 100 : 0;
    return `${signed(delta)} (${signed(percent)}%)`;
  }
  /** Formatted `N bars, duration` between the two anchors (bars only when the projector knows). */
  timeLabel(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return "";
    const duration = formatDuration(b.time - a.time);
    const bars = proj.barsBetween ? Math.round(proj.barsBetween(a.time, b.time)) : null;
    return bars != null ? `${bars} bars, ${duration}` : duration;
  }
  rect(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (ya == null || yb == null) return null;
    return { x1: proj.xOf(a.time), y1: ya, x2: proj.xOf(b.time), y2: yb };
  }
  hitTest(px, py, proj, tol) {
    const r = this.rect(proj);
    return r != null && pointInBox(px, py, r.x1, r.y1, r.x2, r.y2, tol);
  }
  handlePoints(proj) {
    const r = this.rect(proj);
    return r ? [[r.x1, r.y1], [r.x2, r.y2]] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const r = this.rect(proj);
    if (!r) return null;
    return { x: Math.min(r.x1, r.x2), y: Math.min(r.y1, r.y2), w: Math.abs(r.x2 - r.x1), h: Math.abs(r.y2 - r.y1) };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
  schema() {
    return {
      fields: [
        { path: "showPrice", label: "Show price", kind: "boolean", group: "behavior" },
        { path: "showDate", label: "Show date", kind: "boolean", group: "behavior" },
        ...LINE_FIELDS.filter((f) => f.path !== "style.lineColor"),
        // box border (the fill is direction-tinted)
        { path: "text.color", label: "Text color", kind: "color", group: "text" },
        { path: "text.size", label: "Text size", kind: "select", options: TEXT_SIZE_OPTIONS, group: "text" }
      ]
    };
  }
  writeProps() {
    const base = { showPrice: this.showPrice, showDate: this.showDate };
    if (!this.tv) return base;
    return {
      ...base,
      tv: true,
      fillBackground: this.fillBackground,
      info: { ...this.info },
      labelColor: this.labelColor,
      labelSize: this.labelSize,
      labelBackground: this.labelBackground,
      labelBgColor: this.labelBgColor
    };
  }
  readProps(props) {
    if (typeof props.showPrice === "boolean") this.showPrice = props.showPrice;
    if (typeof props.showDate === "boolean") this.showDate = props.showDate;
    if (props.tv === true) this.tv = true;
    if (typeof props.fillBackground === "boolean") this.fillBackground = props.fillBackground;
    if (typeof props.labelBackground === "boolean") this.labelBackground = props.labelBackground;
    if (typeof props.labelColor === "string") this.labelColor = props.labelColor;
    if (typeof props.labelBgColor === "string") this.labelBgColor = props.labelBgColor;
    if (typeof props.labelSize === "number" && props.labelSize > 0) this.labelSize = props.labelSize;
    if (props.info && typeof props.info === "object") {
      const r = props.info;
      const info = { ...this.info ?? {} };
      for (const p of RANGE_PARTS) if (typeof r[p.key] === "boolean") info[p.key] = r[p.key];
      this.info = info;
    }
  }
};

// src/core/drawings/types/Forecast.ts
var TV_FORECAST = {
  centers: "#202020",
  // palette-exempt: TradingView's forecast point dots
  text: "#FFFFFF",
  // palette-exempt: TradingView's white plate text
  success: "#4CAF50",
  // palette-exempt: TradingView's forecast success green
  failure: "#F23645"
  // palette-exempt: TradingView's forecast failure red
};
var TV_COLOR_KEYS = ["sourceTextColor", "sourceBackColor", "sourceStrokeColor", "targetTextColor", "targetBackColor", "targetStrokeColor", "successTextColor", "successBackground", "failureTextColor", "failureBackground"];
function tvTimeSpan(ms) {
  let s = Math.round(Math.abs(ms) / 1e3);
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const out = `${d ? `${d}d ` : ""}${h ? `${h}h ` : ""}${m ? `${m}m ` : ""}${s ? `${s}s ` : ""}`.trim();
  return ms < 0 ? `-${out}` : out;
}
var Forecast = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "forecast";
    if (!init.props) {
      this.tv = true;
      this.style = { ...this.style, lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" };
      this.sourceTextColor = TV_FORECAST.text;
      this.sourceBackColor = TV_LINE_COLOR;
      this.sourceStrokeColor = TV_LINE_COLOR;
      this.targetTextColor = TV_FORECAST.text;
      this.targetBackColor = TV_LINE_COLOR;
      this.targetStrokeColor = TV_LINE_COLOR;
      this.successTextColor = TV_FORECAST.text;
      this.successBackground = TV_FORECAST.success;
      this.failureTextColor = TV_FORECAST.text;
      this.failureBackground = TV_FORECAST.failure;
      this.transparency = 10;
    }
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "source", free: "both" }, { role: "target", free: "both" }] };
  }
  handlePoints(proj) {
    const out = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      out.push([proj.xOf(a.time), y]);
    }
    return out;
  }
  /** The path: a quadratic curve leaving the source level flat and bending into the target. TradingView's look:
   *  a quarter of the ellipse centred under the source at the target's height, through both points. */
  curve(proj) {
    const pts = this.handlePoints(proj);
    if (pts.length < 2) return pts;
    const [x1, y1] = pts[0];
    const [x2, y2] = pts[1];
    if (this.tv) {
      const rx = Math.abs(x2 - x1);
      const ry = Math.abs(y2 - y1);
      const out2 = [];
      for (let i = 0; i <= 32; i += 1) {
        const t = i / 32 * Math.PI / 2;
        out2.push([x1 + Math.sign(x2 - x1) * rx * Math.sin(t), y2 + Math.sign(y1 - y2) * ry * Math.cos(t)]);
      }
      return out2;
    }
    const cx = x1 + (x2 - x1) * 0.6;
    const out = [];
    for (let i = 0; i <= 32; i += 1) {
      const t = i / 32;
      const u = 1 - t;
      out.push([u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * y1 + t * t * y2]);
    }
    return out;
  }
  /** Whether price reached the target by the target time (from the bars between them). TradingView's look reads
   *  the target's bar alone: its high (low for a fall) reaching the target is a success, any other closed bar a
   *  failure, a bar still forming or not there yet is waiting. */
  status(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (this.tv) {
      if (!a || !b) return "pending";
      const x = proj.xOf(b.time);
      const t0 = proj.pxToPoint(x - 6, 0, this.paneId).time;
      const t1 = proj.pxToPoint(x + 6, 0, this.paneId).time;
      const near = proj.barsInRange?.(Math.min(t0, t1, b.time), Math.max(t0, t1, b.time)) ?? [];
      const bar = near.reduce((best, k) => !best || Math.abs(k.time - b.time) < Math.abs(best.time - b.time) ? k : best, void 0);
      if (!bar) return "pending";
      if (b.price > a.price ? bar.high >= b.price : bar.low <= b.price) return "success";
      const later = proj.barsInRange?.(bar.time + 1, Number.MAX_SAFE_INTEGER) ?? [];
      return later.length > 0 ? "failure" : "pending";
    }
    if (!a || !b || b.time <= a.time) return "pending";
    const bars = proj.barsInRange?.(a.time, b.time) ?? [];
    const up = b.price >= a.price;
    if (bars.some((bar) => up ? bar.high >= b.price : bar.low <= b.price)) return "success";
    const last = proj.barsInRange?.(b.time, Number.MAX_SAFE_INTEGER) ?? [];
    return last.length > 0 ? "failure" : "pending";
  }
  /** The target's label: the change, its percent and the time it takes. */
  changeLabel() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return "";
    const d = b.price - a.price;
    const pct = a.price ? d / a.price * 100 : 0;
    const dp = Math.abs(a.price) >= 10 ? 2 : 4;
    return `${d >= 0 ? "" : "\u2212"}${Math.abs(d).toFixed(dp)} (${Math.abs(pct).toFixed(2)}%) in ${formatDuration(b.time - a.time)}`;
  }
  /** TradingView's target text: the change and its percent, then "in" and the time it takes. */
  tvChange(fmt) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return { change: "", span: "" };
    const d = b.price - a.price;
    const pct = a.price ? d / Math.abs(a.price) * 100 : 0;
    return { change: `${d < 0 ? "\u2212" : ""}${fmt(Math.abs(d))} (${pct < 0 ? "\u2212" : ""}${Math.abs(pct).toFixed(2)}%)`, span: `in ${tvTimeSpan(b.time - a.time)}` };
  }
  hitTest(px, py, proj, tol) {
    const c = this.curve(proj);
    if (c.length >= 2 && distToPolyline(px, py, c) <= tol) return true;
    if (this.tv) return (this.plateRects ?? []).some((r) => pointInBox(px, py, r.x, r.y, r.x + r.w, r.y + r.h, tol));
    const t = this.handlePoints(proj)[1];
    return !!t && pointInBox(px, py, t[0] - 90, t[1] - 52, t[0] + 90, t[1] - 4, tol);
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const pts = this.handlePoints(proj);
    if (pts.length < 2) return null;
    const x = Math.min(pts[0][0], pts[1][0]);
    const y = Math.min(pts[0][1], pts[1][1]);
    return { x, y, w: Math.abs(pts[1][0] - pts[0][0]), h: Math.abs(pts[1][1] - pts[0][1]) };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
  }
  schema() {
    return { fields: [...LINE_FIELDS] };
  }
  writeProps() {
    if (!this.tv) return void 0;
    const out = { tv: true, transparency: this.transparency ?? 10 };
    for (const k of TV_COLOR_KEYS) out[k] = this[k];
    return out;
  }
  readProps(props) {
    if (props.tv !== true) return;
    this.tv = true;
    for (const k of TV_COLOR_KEYS) if (typeof props[k] === "string") this[k] = props[k];
    if (typeof props.transparency === "number" && Number.isFinite(props.transparency)) this.transparency = Math.min(100, Math.max(0, props.transparency));
  }
};

// src/core/drawings/types/BarsPattern.ts
var TV_BARS_PATTERN_MODES = ["hl", "oc", "close", "open", "high", "low", "hl2"];
var TV_BARS_PATTERN_MODE_LABEL = { hl: "HL bars", oc: "OC bars", close: "Line - close", open: "Line - open", high: "Line - high", low: "Line - low", hl2: "Line - HL/2" };
var FIRST_FIELD = { hl: (b) => b.h, oc: (b) => b.o, close: (b) => b.c, open: (b) => b.o, high: (b) => b.h, low: (b) => b.l, hl2: (b) => (b.h + b.l) / 2 };
var LAST_FIELD = { hl: (b) => b.l, oc: (b) => b.c, close: (b) => b.c, open: (b) => b.o, high: (b) => b.h, low: (b) => b.l, hl2: (b) => (b.h + b.l) / 2 };
var BarsPattern = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "barspattern";
    if (!init.props) {
      this.tv = true;
      this.mode = "hl";
      this.mirrored = false;
      this.flipped = false;
      this.style = { ...this.style, lineColor: TV_LINE_COLOR };
    }
  }
  tvMode() {
    return TV_BARS_PATTERN_MODES.includes(this.mode) ? this.mode : "hl";
  }
  /** TradingView's copy as shown: mirrored (each price reflected about the copy's middle; high and low keep their
   *  names) and / or flipped (the bars in reverse order); its first and last prices for the mode. */
  tvPattern() {
    if (!this.bars?.length) return null;
    let bars = this.bars.map((b) => ({ ...b }));
    if (this.mirrored) {
      let lo = Math.min(bars[0].l, bars[0].h);
      let hi = Math.max(bars[0].l, bars[0].h);
      for (const b of bars) {
        lo = Math.min(lo, b.l);
        hi = Math.max(hi, b.h);
      }
      const mid = (lo + hi) / 2;
      bars = bars.map((b) => ({ dt: b.dt, o: 2 * mid - b.o, h: 2 * mid - b.h, l: 2 * mid - b.l, c: 2 * mid - b.c }));
    }
    if (this.flipped) bars.reverse();
    const m = this.tvMode();
    const [f, l] = this.flipped ? [LAST_FIELD[m], FIRST_FIELD[m]] : [FIRST_FIELD[m], LAST_FIELD[m]];
    return { bars, first: f(bars[0]), last: l(bars[bars.length - 1]) };
  }
  /** TradingView turns its points' prices round on every Mirrored / Flipped switch, so the copy stays put. */
  applySettings(patch) {
    const swap = this.tv && ["mirrored", "flipped"].filter((k) => k in patch && typeof patch[k] === "boolean" && patch[k] !== this[k]).length % 2 === 1;
    super.applySettings(patch);
    const [a, b] = this.anchors;
    if (swap && a && b) this.anchors = [{ ...a, price: b.price }, { ...b, price: a.price }, ...this.anchors.slice(2)];
  }
  anchorSchema() {
    const free = this.tv ? "both" : "x";
    return { min: 2, max: 2, slots: [{ role: "from", free }, { role: "to", free }] };
  }
  /** Copy the bars between the two points; the copy starts on the first bar's open. TradingView's look puts the
   *  copy 5 % of the pane above the original (its first price there) and the second point on its last price. */
  onPlaced(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return;
    const from = Math.min(a.time, b.time);
    const to = Math.max(a.time, b.time);
    const src = proj.barsInRange?.(from, to) ?? [];
    if (!src.length) return;
    const t0 = src[0].time;
    const base = src[0].open;
    this.bars = src.map((bar) => ({ dt: bar.time - t0, o: bar.open - base, h: bar.high - base, l: bar.low - base, c: bar.close - base }));
    const t1 = src[src.length - 1].time;
    if (this.tv) {
      this.base = base;
      const pat = this.tvPattern();
      const y = proj.yOf(base + pat.first, this.paneId);
      const rect = proj.paneRect?.(this.paneId) ?? { height: proj.height };
      const p0 = y == null ? base + pat.first : proj.pxToPoint(proj.xOf(t0), y - 0.05 * rect.height, this.paneId).price;
      this.anchors = [{ time: t0, price: p0 }, { time: t1, price: p0 + pat.last - pat.first }];
      return;
    }
    this.anchors[0] = { time: t0, price: base };
    this.anchors[1] = { time: t1, price: base };
  }
  /** The second point follows the first: the copy keeps its length. TradingView's look keeps the second point at
   *  least a bar after the first instead (dragging it stretches the copy). */
  constrainHandleDrag(index) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    const last = this.bars?.[this.bars.length - 1];
    if (this.tv) {
      if (!a || !b || b.time > a.time) return;
      const step = last && this.bars.length > 1 ? last.dt / (this.bars.length - 1) : 6e4;
      if (index === 0) this.anchors = [{ ...a, time: b.time - step }, b];
      else this.anchors = [a, { ...b, time: a.time + step }];
      return;
    }
    if (a && last) this.anchors[1] = { time: a.time + last.dt, price: a.price };
  }
  /** TradingView's copy in pixels: bar i at the first point plus i of the points' spacing, its prices placed so the
   *  pattern's first price sits on the first point and its last on the second (scaled to fit between them). */
  tvBars(proj) {
    const [a, b] = this.anchors;
    const pat = this.tvPattern();
    if (!a || !b || !pat || this.base == null) return [];
    const Y = (v) => proj.yOf(this.base + v, this.paneId);
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    const yf = Y(pat.first);
    const yl = Y(pat.last);
    if (ya == null || yb == null || yf == null || yl == null) return [];
    const xa = proj.xOf(a.time);
    const xb = proj.xOf(b.time);
    const n = pat.bars.length;
    const step = n > 1 ? Math.abs(xa - xb) / (n - 1) : 0;
    const x0 = Math.min(xa, xb);
    const scale = Math.abs(yl - yf) > 1e-9 ? +((yb - ya) / (yl - yf)).toFixed(8) : 1;
    const at = (v) => {
      const y = Y(v);
      return y == null ? null : ya + scale * (y - yf);
    };
    const m = this.tvMode();
    const out = [];
    pat.bars.forEach((bar, i) => {
      const o = at(bar.o);
      const h = at(bar.h);
      const l = at(bar.l);
      const c = at(bar.c);
      const v = at(m === "hl2" ? (bar.h + bar.l) / 2 : m === "open" ? bar.o : m === "high" ? bar.h : m === "low" ? bar.l : bar.c);
      if (o == null || h == null || l == null || c == null || v == null) return;
      out.push({ x: Math.round(x0 + i * step + 0.5), open: o, high: h, low: l, close: c, value: v });
    });
    return out;
  }
  translateBody(dt, dp, orig) {
    return orig.map((o) => ({ time: o.time + dt, price: o.price + dp }));
  }
  /** The copy in pixels, placed at the first point, mirrored / flipped as set. */
  patternBars(proj) {
    if (this.tv) return this.tvBars(proj);
    const a = this.anchors[0];
    if (!a || !this.bars?.length) return [];
    const span = this.bars[this.bars.length - 1].dt;
    const out = [];
    const last = this.bars.length - 1;
    for (const [j, bar] of this.bars.entries()) {
      const s = this.flipped ? -1 : 1;
      const y = (v) => proj.yOf(a.price + s * v, this.paneId);
      const o = y(bar.o);
      const h = y(this.flipped ? bar.l : bar.h);
      const l = y(this.flipped ? bar.h : bar.l);
      const c = y(bar.c);
      if (o == null || h == null || l == null || c == null) continue;
      const x = proj.xOf(timePlusBars(proj, a.time, this.mirrored ? last - j : j, this.mirrored ? span - bar.dt : bar.dt));
      out.push(this.mirrored ? { x, open: c, high: h, low: l, close: o } : { x, open: o, high: h, low: l, close: c });
    }
    return this.mirrored ? out.reverse() : out;
  }
  hitTest(px, py, proj, tol) {
    const b = this.bounds(proj);
    return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol);
  }
  handlePoints(proj) {
    if (this.tv) {
      const out = [];
      for (const p of this.anchors) {
        const y2 = proj.yOf(p.price, this.paneId);
        if (y2 != null) out.push([proj.xOf(p.time), y2]);
      }
      return out;
    }
    const a = this.anchors[0];
    const y = a ? proj.yOf(a.price, this.paneId) : null;
    return a && y != null ? [[proj.xOf(a.time), y]] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const bars = this.patternBars(proj);
    if (!bars.length) {
      const pts = this.anchors.map((p) => [proj.xOf(p.time), proj.yOf(p.price, this.paneId)]);
      if (pts.length < 2 || pts.some((p) => p[1] == null)) return null;
      return { x: Math.min(pts[0][0], pts[1][0]), y: pts[0][1] - 10, w: Math.abs(pts[1][0] - pts[0][0]), h: 20 };
    }
    const xs = bars.map((b) => b.x);
    const ys = bars.flatMap((b) => [b.high, b.low]);
    return { x: Math.min(...xs) - 3, y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 6, h: Math.max(...ys) - Math.min(...ys) };
  }
  priceRange() {
    const a = this.anchors[0];
    if (this.tv) {
      const b = this.anchors[1];
      const pat = this.tvPattern();
      if (!a || !b || !pat) return null;
      const k = pat.last !== pat.first ? (b.price - a.price) / (pat.last - pat.first) : 1;
      const vs2 = pat.bars.flatMap((x) => [x.h, x.l]).map((v) => a.price + k * (v - pat.first));
      vs2.push(a.price, b.price);
      return { min: Math.min(...vs2), max: Math.max(...vs2) };
    }
    if (!a || !this.bars?.length) return null;
    const s = this.flipped ? -1 : 1;
    const vs = this.bars.flatMap((b) => [a.price + s * b.h, a.price + s * b.l]);
    return { min: Math.min(...vs), max: Math.max(...vs) };
  }
  timeExtent() {
    if (this.tv) {
      const ts = this.anchors.map((p) => p.time);
      return ts.length ? { min: Math.min(...ts), max: Math.max(...ts) } : null;
    }
    const a = this.anchors[0];
    const last = this.bars?.[this.bars.length - 1];
    return a ? { min: a.time, max: a.time + (last?.dt ?? 0) } : null;
  }
  schema() {
    if (this.tv) {
      return {
        fields: [
          { path: "style.lineColor", label: "Color", kind: "color", group: "line" },
          { path: "mode", label: "Mode", kind: "select", options: TV_BARS_PATTERN_MODES.map((v) => ({ value: v, label: TV_BARS_PATTERN_MODE_LABEL[v] })), group: "behavior" },
          { path: "mirrored", label: "Mirrored", kind: "boolean", group: "behavior" },
          { path: "flipped", label: "Flipped", kind: "boolean", group: "behavior" }
        ]
      };
    }
    return {
      fields: [
        { path: "style.lineColor", label: "Color", kind: "color", group: "line" },
        {
          path: "mode",
          label: "Mode",
          kind: "select",
          options: [{ value: "candles", label: "Candles" }, { value: "bars", label: "HL bars" }, { value: "line", label: "Line (close)" }],
          group: "behavior"
        },
        { path: "mirrored", label: "Mirrored", kind: "boolean", group: "behavior" },
        { path: "flipped", label: "Flipped", kind: "boolean", group: "behavior" }
      ]
    };
  }
  writeProps() {
    const out = { bars: (this.bars ?? []).map((b) => ({ ...b })), mode: this.mode ?? "candles", mirrored: !!this.mirrored, flipped: !!this.flipped };
    if (this.tv) Object.assign(out, { tv: true, base: this.base });
    return out;
  }
  readProps(props) {
    if (Array.isArray(props.bars)) {
      this.bars = props.bars.filter((b) => !!b && typeof b === "object" && ["dt", "o", "h", "l", "c"].every((k) => Number.isFinite(b[k]))).slice(0, 5e3).map((b) => ({ dt: b.dt, o: b.o, h: b.h, l: b.l, c: b.c }));
    }
    if (props.tv === true) this.tv = true;
    if (typeof props.base === "number" && Number.isFinite(props.base)) this.base = props.base;
    if (props.mode === "candles" || props.mode === "bars" || props.mode === "line" || TV_BARS_PATTERN_MODES.includes(props.mode)) this.mode = props.mode;
    if (this.tv && this.mode && !TV_BARS_PATTERN_MODES.includes(this.mode)) this.mode = "hl";
    if (typeof props.mirrored === "boolean") this.mirrored = props.mirrored;
    if (typeof props.flipped === "boolean") this.flipped = props.flipped;
  }
};

// src/core/drawings/types/PathDrawing.ts
var MAX_PATH_POINTS = 512;
var PathDrawing = class extends SegmentDrawing {
  anchorSchema() {
    return { min: 2, max: MAX_PATH_POINTS, slots: [] };
  }
  geometry(proj) {
    const pts = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return null;
      pts.push([proj.xOf(a.time), y]);
    }
    if (pts.length < 2) return null;
    const segments = [];
    for (let i = 1; i < pts.length; i += 1) segments.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
    return { segments, fill: null };
  }
  priceRange() {
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((a) => a.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    return { fields: [...LINE_FIELDS, ...TEXT_FIELDS] };
  }
};

// src/core/drawings/types/GhostFeed.ts
var MAX_GHOST = 2e3;
var TV_GHOST = {
  up: "#ACE5DC",
  // palette-exempt: TradingView's minty-green-100 body
  down: "#FAA1A4",
  // palette-exempt: TradingView's ripe-red-200 body
  borderUp: "#089981",
  // palette-exempt: TradingView's minty-green-500 border
  borderDown: "#F23645",
  // palette-exempt: TradingView's ripe-red-500 border
  wick: "#808080"
  // palette-exempt: TradingView's cold-gray-500 wick
};
function decimalsOf(v) {
  for (let d = 0; d <= 8; d += 1) if (Math.abs(v * 10 ** d - Math.round(v * 10 ** d)) < 1e-6) return d;
  return 8;
}
var GhostFeed = class extends PathDrawing {
  constructor(init) {
    super(init);
    this.type = "ghostfeed";
    if (!init.props) {
      this.tv = true;
      this.averageHL = 20;
      this.variance = 50;
      this.upColor = TV_GHOST.up;
      this.downColor = TV_GHOST.down;
      this.drawBorder = true;
      this.borderUpColor = TV_GHOST.borderUp;
      this.borderDownColor = TV_GHOST.borderDown;
      this.drawWick = true;
      this.wickColor = TV_GHOST.wick;
      this.transparency = 50;
      this.segments = [];
    }
  }
  /** TradingView's restore of factory defaults: the average high-low of the chart's bars, in ticks. */
  onPlaced(proj) {
    if (!this.tv) return;
    const bars = proj.barsInRange?.(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) ?? [];
    if (!bars.length) return;
    const recent = bars.slice(-200);
    this.tick = 10 ** -Math.max(...recent.map((b) => Math.max(decimalsOf(b.open), decimalsOf(b.high), decimalsOf(b.low), decimalsOf(b.close))));
    const avg = bars.reduce((sum2, b) => sum2 + (b.high - b.low), 0) / bars.length;
    this.averageHL = Math.max(1, Math.min(5e4, Math.round(avg / this.tick)));
    this.segments = [];
    this.tvCandles(proj);
  }
  /** One random bar (TradingView's: its middle off the path by up to the variance, its height the average give or
   *  take half the variance, open and close anywhere inside). */
  makeBar() {
    const e = (this.averageHL ?? 20) * (this.tick ?? 1);
    const t = (this.variance ?? 50) / 100;
    const mid = e * (1 - 2 * Math.random()) * t;
    const range = e * (1 + (0.5 - Math.random()) * t);
    const lo = mid - range / 2;
    return { o: lo + Math.random() * range, h: lo + range, l: lo, c: lo + Math.random() * range };
  }
  /** A change to the inputs makes every bar again (as many as there were). */
  applySettings(patch) {
    super.applySettings(patch);
    if (this.tv && ("averageHL" in patch || "variance" in patch)) this.segments = (this.segments ?? []).map((seg) => seg.map(() => this.makeBar()));
  }
  /** TradingView's bars in pixels: leg i has one bar per chart bar from its left point (the first leg also its last
   *  bar), on a straight line from point to point, each bar's prices off that line. Missing bars are made as needed. */
  tvCandles(proj) {
    var _a, _b;
    const out = [];
    this.segments ?? (this.segments = []);
    for (let i = 1; i < this.anchors.length && out.length < MAX_GHOST; i += 1) {
      const p = this.anchors[i - 1];
      const q = this.anchors[i];
      const n = Math.min(MAX_GHOST, Math.round(Math.abs(proj.barsBetween?.(p.time, q.time) ?? 0)));
      if (n === 0) continue;
      const size = i === 1 ? n : n - 1;
      const seg = (_a = this.segments)[_b = i - 1] ?? (_a[_b] = []);
      while (seg.length < size) seg.push(this.makeBar());
      const [l, r] = p.time <= q.time ? [p, q] : [q, p];
      const yl = proj.yOf(l.price, this.paneId);
      const yr = proj.yOf(r.price, this.paneId);
      if (yl == null || yr == null) continue;
      const dy = size > 1 ? (yr - yl) / (size - 1) : 0;
      for (let k = 0; k < size && out.length < MAX_GHOST; k += 1) {
        const bar = seg[k];
        const price = proj.pxToPoint(0, yl + k * dy, this.paneId).price;
        const y = (v) => proj.yOf(price + v, this.paneId);
        const o = y(bar.o);
        const h = y(bar.h);
        const lo = y(bar.l);
        const c = y(bar.c);
        if (o == null || h == null || lo == null || c == null) continue;
        out.push({ x: proj.xOf(timeBetween(proj, l.time, r.time, k / n)), open: o, high: h, low: lo, close: c });
      }
    }
    return out;
  }
  /** The candles along the path; wicks a third of a step past the body, alternating so they don't look ruled. */
  ghostCandles(proj) {
    if (this.tv) return this.tvCandles(proj);
    const out = [];
    for (let i = 1; i < this.anchors.length && out.length < MAX_GHOST; i += 1) {
      const a = this.anchors[i - 1];
      const b = this.anchors[i];
      const n = Math.max(1, Math.min(MAX_GHOST, Math.round(Math.abs(proj.barsBetween?.(a.time, b.time) ?? 1))));
      const dp = (b.price - a.price) / n;
      for (let k = 0; k < n && out.length < MAX_GHOST; k += 1) {
        const o = a.price + dp * k;
        const c = a.price + dp * (k + 1);
        const wick = Math.max(Math.abs(dp) * (k % 2 ? 0.5 : 0.25), Math.abs(b.price - a.price) * 0.01);
        const yo = proj.yOf(o, this.paneId);
        const yc = proj.yOf(c, this.paneId);
        const yh = proj.yOf(Math.max(o, c) + wick, this.paneId);
        const yl = proj.yOf(Math.min(o, c) - wick * (k % 3 ? 0.6 : 1), this.paneId);
        if (yo == null || yc == null || yh == null || yl == null) continue;
        out.push({ x: proj.xOf(timeBetween(proj, a.time, b.time, (k + 1) / n)), open: yo, high: yh, low: yl, close: yc });
      }
    }
    return out;
  }
  schema() {
    return { fields: this.tv ? [] : [...LINE_FIELDS] };
  }
  writeProps() {
    if (!this.tv) return void 0;
    return {
      tv: true,
      averageHL: this.averageHL,
      variance: this.variance,
      tick: this.tick,
      upColor: this.upColor,
      downColor: this.downColor,
      drawBorder: this.drawBorder !== false,
      borderUpColor: this.borderUpColor,
      borderDownColor: this.borderDownColor,
      drawWick: this.drawWick !== false,
      wickColor: this.wickColor,
      transparency: this.transparency,
      segments: (this.segments ?? []).map((seg) => seg.map((b) => ({ ...b })))
    };
  }
  readProps(props) {
    if (props.tv !== true) return;
    this.tv = true;
    const num5 = (k, lo, hi) => typeof props[k] === "number" && Number.isFinite(props[k]) ? Math.min(hi, Math.max(lo, props[k])) : void 0;
    this.averageHL = num5("averageHL", 1, 5e4) ?? this.averageHL;
    this.variance = num5("variance", 1, 100) ?? this.variance;
    this.tick = num5("tick", 1e-12, 1e12) ?? this.tick;
    this.transparency = num5("transparency", 0, 100) ?? this.transparency;
    for (const k of ["upColor", "downColor", "borderUpColor", "borderDownColor", "wickColor"]) if (typeof props[k] === "string") this[k] = props[k];
    for (const k of ["drawBorder", "drawWick"]) if (typeof props[k] === "boolean") this[k] = props[k];
    if (Array.isArray(props.segments)) {
      const ok = (b) => !!b && typeof b === "object" && ["o", "h", "l", "c"].every((k) => Number.isFinite(b[k]));
      this.segments = props.segments.slice(0, 512).map((seg) => Array.isArray(seg) ? seg.filter(ok).slice(0, MAX_GHOST).map((b) => ({ o: b.o, h: b.h, l: b.l, c: b.c })) : []);
    }
  }
};

// src/core/drawings/types/PinnedLabel.ts
var PinnedLabel = class extends Drawing {
  /** The placeholder string when no text has been entered yet. */
  defaultLabel() {
    return "Text";
  }
  /** The string used to size the approximate hit box (subclasses with computed text override it). */
  labelText() {
    return this.text?.value ?? this.defaultLabel();
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "p", free: "both" }] };
  }
  /** Approximate pixel box of the label (the painter renders the precise glyphs). */
  box(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    if (y == null) return null;
    const fs = textPx(this.text?.size);
    const lines = this.labelText().split("\n");
    const cols = Math.max(1, ...lines.map((l) => l.length));
    return { x: proj.xOf(a.time), y, w: Math.max(12, cols * fs * 0.6) + 8, h: lines.length * fs * 1.4 + 4 };
  }
  hitTest(px, py, proj, _tol) {
    const b = this.box(proj);
    return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h);
  }
  handlePoints(proj) {
    const a = this.anchors[0];
    const y = a ? proj.yOf(a.price, this.paneId) : null;
    return a && y != null ? [[proj.xOf(a.time), y]] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    return this.box(proj);
  }
  priceRange() {
    const a = this.anchors[0];
    return a ? { min: a.price, max: a.price } : null;
  }
};

// src/core/drawings/types/Note.ts
var NOTE_PIN = { r: 8, h: 24 };
var TV_NOTE_PIN = { w: 24, h: 30 };
var Note = class extends PinnedLabel {
  constructor(init) {
    super(init);
    // Widened so TradingView's anchored note (pinned to the screen) can reuse the whole tool.
    this.type = "note";
    if (!init.props) {
      this.tv = true;
      this.background = true;
      this.text = { ...defaultText(""), ...init.text ?? {}, size: init.text?.size ?? 14 };
      return;
    }
    if (!this.text) this.text = defaultText("Note");
  }
  /** TradingView shows no handle on the pin, only its selection marker at the tip. */
  handleHidden(index) {
    return this.tv === true && index === 0;
  }
  selectionMarkers(proj) {
    return this.tv ? this.handlePoints(proj) : [];
  }
  defaultLabel() {
    return "Note";
  }
  writeProps() {
    if (!this.tv) return { showText: !!this.showText };
    const p = { tv: true, background: this.background !== false, border: this.border === true };
    if (this.backgroundColor) p.backgroundColor = this.backgroundColor;
    if (this.borderColor) p.borderColor = this.borderColor;
    return p;
  }
  readProps(props) {
    if (typeof props.showText === "boolean") this.showText = props.showText;
    if (props.tv === true) this.tv = true;
    if (typeof props.background === "boolean") this.background = props.background;
    if (typeof props.backgroundColor === "string") this.backgroundColor = props.backgroundColor;
    if (typeof props.border === "boolean") this.border = props.border;
    if (typeof props.borderColor === "string") this.borderColor = props.borderColor;
  }
  /** The pin: the hit and grab area (the text box only appears on hover). */
  box(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    if (y == null) return null;
    const x = proj.xOf(a.time);
    if (this.tv) return { x: x - TV_NOTE_PIN.w / 2, y: y - TV_NOTE_PIN.h, w: TV_NOTE_PIN.w, h: TV_NOTE_PIN.h };
    return { x: x - NOTE_PIN.r - 1, y: y - NOTE_PIN.h, w: NOTE_PIN.r * 2 + 2, h: NOTE_PIN.h };
  }
  hitTest(px, py, proj, tol) {
    if (!this.tv) return super.hitTest(px, py, proj, tol);
    const b = this.box(proj);
    return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h);
  }
  schema() {
    if (this.tv) {
      return {
        fields: [
          { path: "style.lineColor", label: "Label", kind: "color", group: "line" },
          ...TEXT_FIELDS,
          { path: "background", label: "Background", kind: "boolean", group: "text" },
          { path: "backgroundColor", label: "Background color", kind: "color", group: "text" },
          { path: "border", label: "Border", kind: "boolean", group: "text" },
          { path: "borderColor", label: "Border color", kind: "color", group: "text" }
        ],
        textIsContent: true
      };
    }
    return {
      fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS, { path: "showText", label: "Always show text", kind: "boolean", group: "behavior" }],
      textIsContent: true
    };
  }
};

// src/core/drawings/types/TextLabel.ts
var TV_TEXT_COLOR = "#2962ff";
var TV_TEXT_BACKGROUND = "#2962ff40";
var TV_TEXT_BORDER = "#707070";
var TEXT_WRAP_HANDLE_INSET = 5;
var TextLabel = class extends PinnedLabel {
  constructor(init) {
    super(init);
    // Widened so TradingView's anchored text (pinned to the screen) can reuse the whole tool.
    this.type = "text";
    if (!init.props && this.tvLook()) {
      this.tv = true;
      this.text = { ...defaultText(), ...this.text ?? {}, color: this.text?.color ?? TV_TEXT_COLOR, size: this.text?.size ?? 14 };
      this.backgroundColor ?? (this.backgroundColor = TV_TEXT_BACKGROUND);
      this.borderColor ?? (this.borderColor = TV_TEXT_BORDER);
      this.wrapWidth ?? (this.wrapWidth = 200);
      return;
    }
    if (!this.text) this.text = { ...defaultText(), size: "large" };
  }
  /** Whether a new one takes TradingView's text look (the table does not). */
  tvLook() {
    return true;
  }
  /** The wrap width in px (TradingView's default 200), or null when the text does not wrap. */
  wrapPx() {
    return this.wordWrap ? Math.max(20, this.wrapWidth ?? 200) : null;
  }
  /** TradingView shows no point on its text; with Text wrap on, a square on the right edge sets the wrap width. */
  handlePoints(proj) {
    const pts = super.handlePoints(proj);
    const wrap = this.wrapPx();
    if (!this.tv || wrap == null || !pts[0]) return pts;
    const b = this.box(proj);
    return [pts[0], [pts[0][0] + wrap + TEXT_WRAP_HANDLE_INSET, b ? b.y + b.h / 2 : pts[0][1]]];
  }
  handleHidden(index) {
    return this.tv === true && index === 0;
  }
  handleShapes() {
    return this.tv ? ["circle", "square"] : [];
  }
  handleCursor(index) {
    return this.tv && index === 1 ? "ew-resize" : null;
  }
  hitHandle(px, py, proj, tol) {
    const i = super.hitHandle(px, py, proj, tol);
    return this.tv && i === 0 ? -1 : i;
  }
  /** TradingView's wrap handle: the wrap width follows it, at least 100 px. */
  dragHandlePx(index, x, _y, proj) {
    if (!this.tv || index !== 1) return false;
    const a = this.anchors[0];
    if (!a) return true;
    const w = x - proj.xOf(a.time) - Math.floor(textPx(this.text?.size) / 6);
    if (Number.isFinite(w)) this.wrapWidth = Math.max(100, Math.round(w));
    return true;
  }
  writeProps() {
    const p = {};
    if (this.tv) p.tv = true;
    if (this.background) p.background = true;
    if (this.backgroundColor) p.backgroundColor = this.backgroundColor;
    if (this.border) p.border = true;
    if (this.borderColor) p.borderColor = this.borderColor;
    if (this.wordWrap) p.wordWrap = true;
    if (this.wrapWidth !== void 0) p.wrapWidth = this.wrapWidth;
    return Object.keys(p).length ? p : void 0;
  }
  readProps(props) {
    if (props.tv === true) this.tv = true;
    if (typeof props.background === "boolean") this.background = props.background;
    if (typeof props.backgroundColor === "string") this.backgroundColor = props.backgroundColor;
    if (typeof props.border === "boolean") this.border = props.border;
    if (typeof props.borderColor === "string") this.borderColor = props.borderColor;
    if (typeof props.wordWrap === "boolean") this.wordWrap = props.wordWrap;
    if (typeof props.wrapWidth === "number" && Number.isFinite(props.wrapWidth)) this.wrapWidth = props.wrapWidth;
  }
  /** Wrapped text is at most the wrap width wide and as many lines taller as the wrap takes. */
  box(proj) {
    const b = super.box(proj);
    const wrap = this.wrapPx();
    if (!b || wrap == null || b.w - 8 <= wrap) return b;
    const fs = textPx(this.text?.size);
    const lines = this.labelText().split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length * fs * 0.6 / wrap)), 0);
    return { x: b.x, y: b.y, w: wrap + 8, h: lines * fs * 1.4 + 4 };
  }
  schema() {
    if (this.tv) {
      return {
        fields: [
          ...TEXT_FIELDS,
          { path: "background", label: "Background", kind: "boolean", group: "text" },
          { path: "backgroundColor", label: "Background color", kind: "color", group: "text" },
          { path: "border", label: "Border", kind: "boolean", group: "text" },
          { path: "borderColor", label: "Border color", kind: "color", group: "text" },
          { path: "wordWrap", label: "Text wrap", kind: "boolean", group: "text" }
        ],
        textIsContent: true
      };
    }
    return {
      fields: [
        ...TEXT_FIELDS,
        { path: "background", label: "Background", kind: "boolean", group: "fill" },
        { path: "backgroundColor", label: "Background color", kind: "color", group: "fill" },
        { path: "border", label: "Border", kind: "boolean", group: "line" },
        { path: "borderColor", label: "Border color", kind: "color", group: "line" },
        { path: "wordWrap", label: "Text wrap", kind: "boolean", group: "text" },
        { path: "wrapWidth", label: "Wrap width", kind: "number", min: 20, max: 2e3, step: 10, group: "text" }
      ],
      textIsContent: true
    };
  }
};

// src/core/drawings/types/Anchored.ts
var ScreenPin = class {
  constructor() {
    this.fx = null;
    this.fy = null;
    this.last = null;
  }
  resolve(anchors, paneId, proj) {
    const a = anchors[0];
    if (!a) return;
    const rect = proj.paneRect?.(paneId) ?? { top: 0, height: proj.height };
    const moved = this.last ? this.last.time !== a.time || this.last.price !== a.price : this.fx == null;
    if (moved || this.fx == null || this.fy == null) {
      const y = proj.yOf(a.price, paneId);
      if (y == null || proj.width <= 0 || rect.height <= 0) return;
      this.fx = Math.min(1, Math.max(0, proj.xOf(a.time) / proj.width));
      this.fy = Math.min(1, Math.max(0, (y - rect.top) / rect.height));
    } else {
      const p = proj.pxToPoint(this.fx * proj.width, rect.top + this.fy * rect.height, paneId);
      anchors[0] = { time: p.time, price: p.price };
    }
    this.last = { ...anchors[0] };
  }
  write() {
    return this.fx == null || this.fy == null ? {} : { fx: this.fx, fy: this.fy };
  }
  read(props) {
    if (typeof props.fx === "number" && Number.isFinite(props.fx)) this.fx = Math.min(1, Math.max(0, props.fx));
    if (typeof props.fy === "number" && Number.isFinite(props.fy)) this.fy = Math.min(1, Math.max(0, props.fy));
  }
};
var AnchoredText = class extends TextLabel {
  constructor() {
    super(...arguments);
    this.type = "anchoredtext";
  }
  get pin() {
    return this.pinState ?? (this.pinState = new ScreenPin());
  }
  handlePoints(proj) {
    this.pin.resolve(this.anchors, this.paneId, proj);
    return super.handlePoints(proj);
  }
  box(proj) {
    this.pin.resolve(this.anchors, this.paneId, proj);
    return super.box(proj);
  }
  timeExtent() {
    return null;
  }
  /** TradingView marks nothing on the axes for a text pinned to the screen (it has no bar or price). */
  axisPoints() {
    return [];
  }
  writeProps() {
    return { ...super.writeProps() ?? {}, ...this.pin.write() };
  }
  readProps(props) {
    super.readProps(props);
    this.pin.read(props);
  }
};
var AnchoredNote = class extends Note {
  constructor() {
    super(...arguments);
    this.type = "anchorednote";
  }
  get pin() {
    return this.pinState ?? (this.pinState = new ScreenPin());
  }
  handlePoints(proj) {
    this.pin.resolve(this.anchors, this.paneId, proj);
    return super.handlePoints(proj);
  }
  box(proj) {
    this.pin.resolve(this.anchors, this.paneId, proj);
    return super.box(proj);
  }
  timeExtent() {
    return null;
  }
  /** TradingView marks nothing on the axes for a note pinned to the screen. */
  axisPoints() {
    return [];
  }
  writeProps() {
    return { ...super.writeProps(), ...this.pin.write() };
  }
  readProps(props) {
    super.readProps(props);
    this.pin.read(props);
  }
};

// src/core/drawings/types/Table.ts
var TV_TABLE = {
  padding: 8,
  border: 1,
  activeLine: 2,
  columnWidth: 120,
  fontSize: 14,
  lineHeight: 1.3,
  background: "#000000",
  // palette-exempt: TradingView's cold-gray-900 table background (dark theme)
  borderColor: "#555555",
  // palette-exempt: TradingView's cold-gray-650 table border (dark theme)
  text: "#DBDBDB",
  // palette-exempt: TradingView's cold-gray-200 table text (dark theme)
  active: "#2962FF"
  // palette-exempt: TradingView's tv-blue-500 active cell
};
var MAX_ROWS = 50;
var MAX_COLS = 20;
var MAX_CELL = 2e3;
var ROW_EDGE = 64;
var measure = (t, px) => t.length * px * 0.6;
function setTableTextMeasure(fn) {
  measure = fn;
}
var ACTIVE = /* @__PURE__ */ new Map();
function tableActiveCell(id) {
  return ACTIVE.get(id) ?? null;
}
function setTableActiveCell(id, cell, editing = false) {
  if (cell) ACTIVE.set(id, { cell, editing });
  else ACTIVE.delete(id);
}
function wrapTableText(text, width, px) {
  const out = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      const next = line + word;
      if (measure(next, px) <= width || line === "") {
        if (measure(next, px) <= width) {
          line = next;
          continue;
        }
        let part = line;
        for (const ch of word) {
          if (part !== "" && measure(part + ch, px) > width) {
            out.push(part);
            part = ch.trim() ? ch : "";
          } else part += ch;
        }
        line = part;
        continue;
      }
      out.push(line.trimEnd());
      line = word.trim() ? word : "";
    }
    out.push(line.trimEnd());
  }
  return out;
}
function fitTotal(vals, mins, total, depth = 0) {
  const sumOf = (xs) => xs.reduce((a, b) => a + b, 0);
  let sum2 = sumOf(vals);
  let target = Math.max(total, sumOf(mins));
  if (sum2 === target || sum2 <= 0) return [...vals];
  if (target < sum2) {
    for (let i = 0; i < vals.length; i += 1) {
      if (vals[i] === mins[i]) {
        sum2 -= vals[i];
        target -= vals[i];
      }
    }
  }
  const k = sum2 > 0 ? target / sum2 : 1;
  const r = vals.map((v, i) => Math.max(mins[i], v * k));
  return sumOf(r) > target + 0.01 && depth < 20 ? fitTotal(r, mins, total, depth + 1) : r;
}
var TableDrawing = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "table";
    if (!this.cells) {
      const old = init.text?.value;
      if (old != null && init.props) {
        const rows = old.slice(0, MAX_ROWS * MAX_COLS * MAX_CELL).split("\n").slice(0, MAX_ROWS).map((r) => r.split("|").slice(0, MAX_COLS).map((c) => c.trim().slice(0, MAX_CELL)));
        const cols2 = Math.max(1, ...rows.map((r) => r.length));
        this.cells = rows.map((r) => [...r, ...Array.from({ length: cols2 - r.length }, () => "")]);
        this.anchored = true;
        if (init.text?.color) this.textColor = init.text.color;
      } else this.cells = Array.from({ length: 3 }, () => ["", "", ""]);
      this.text = void 0;
    }
    const cols = this.cells[0]?.length ?? 1;
    if (!this.columnWidths || this.columnWidths.length !== cols) this.columnWidths = Array.from({ length: cols }, (_, i) => this.columnWidths?.[i] ?? TV_TABLE.columnWidth);
    if (!this.rowHeights || this.rowHeights.length !== this.cells.length) this.rowHeights = this.cells.map((_, i) => this.rowHeights?.[i] ?? 0);
    this.textColor ?? (this.textColor = TV_TABLE.text);
    this.fontSize ?? (this.fontSize = TV_TABLE.fontSize);
    this.horzAlign ?? (this.horzAlign = "left");
    this.anchored ?? (this.anchored = false);
    if (!init.props) this.style = { ...this.style, lineColor: TV_TABLE.borderColor, fillColor: TV_TABLE.background };
  }
  get pin() {
    return this.pinState ?? (this.pinState = new ScreenPin());
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "topLeft", free: "both" }] };
  }
  rows() {
    return this.cells.length;
  }
  cols() {
    return this.cells[0]?.length ?? 0;
  }
  /** The narrowest a column may get: one "0" plus its padding and borders. */
  minColumnWidth() {
    const px = this.fontSize ?? TV_TABLE.fontSize;
    return measure("0", px) + 2 * TV_TABLE.padding + 2 * TV_TABLE.border;
  }
  topLeft(proj) {
    if (this.anchored) this.pin.resolve(this.anchors, this.paneId, proj);
    const a = this.anchors[0];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [Math.round(proj.xOf(a.time)), Math.round(y)];
  }
  /** Where every cell is: TradingView's text area per cell (its width less padding and borders), lines of
   *  size × 1.3 (the last one size tall), padded 8 and bordered 1. */
  layout(proj) {
    const tl = this.topLeft(proj);
    if (!tl) return null;
    const px = this.fontSize ?? TV_TABLE.fontSize;
    const pad = TV_TABLE.padding;
    const bw = TV_TABLE.border;
    const minColW = this.minColumnWidth();
    const widths = this.columnWidths.map((w) => Math.max(w, minColW));
    const lines = this.cells.map((row) => row.map((t, c) => wrapTableText(t, Math.max(widths[c] - 2 * pad - 2 * bw, measure("0", px)), px)));
    const minRowH = lines.map((row) => Math.max(px + 2 * pad + bw, ...row.map((ls) => ls.length * px + (ls.length - 1) * px * (TV_TABLE.lineHeight - 1) + 2 * pad + 2 * bw)));
    const heights = minRowH.map((m, r) => Math.max(m, this.rowHeights[r] ?? 0));
    const colX = [tl[0]];
    for (const w of widths) colX.push(colX[colX.length - 1] + w);
    const rowY = [tl[1]];
    for (const h of heights) rowY.push(rowY[rowY.length - 1] + h);
    return { colX: colX.map(Math.round), rowY: rowY.map(Math.round), lines, minRowH, minColW };
  }
  /** The cell under a pixel, or null. */
  cellAt(px, py, proj) {
    const L = this.layout(proj);
    if (!L) return null;
    const c = L.colX.findIndex((x, i) => i < L.colX.length - 1 && px >= x && px < L.colX[i + 1]);
    const r = L.rowY.findIndex((y, i) => i < L.rowY.length - 1 && py >= y && py < L.rowY[i + 1]);
    return c >= 0 && r >= 0 ? [r, c] : null;
  }
  /** TradingView's four corner handles: top left, bottom left, top right, bottom right. */
  handlePoints(proj) {
    const L = this.layout(proj);
    if (!L) return [];
    const [l, r] = [L.colX[0], L.colX[L.colX.length - 1]];
    const [t, b] = [L.rowY[0], L.rowY[L.rowY.length - 1]];
    return [[l, t], [l, b], [r, t], [r, b]];
  }
  hitHandle(px, py, proj, tol) {
    const L = this.layout(proj);
    if (!L) return -1;
    const corners = this.handlePoints(proj);
    const i = corners.findIndex(([x, y]) => Math.abs(px - x) <= tol + 3 && Math.abs(py - y) <= tol + 3);
    if (i >= 0) return i;
    const [l, r] = [L.colX[0], L.colX[L.colX.length - 1]];
    const [t, b] = [L.rowY[0], L.rowY[L.rowY.length - 1]];
    if (py >= t && py <= b) {
      for (let c = 0; c < this.cols(); c += 1) if (Math.abs(px - L.colX[c + 1]) <= tol) return 4 + c;
    }
    if (px >= l && px <= r) {
      for (let row = 0; row < this.rows(); row += 1) if (Math.abs(py - L.rowY[row + 1]) <= tol) return 4 + ROW_EDGE + row;
    }
    return -1;
  }
  handleCursor(index) {
    if (index === 0 || index === 3) return "nwse-resize";
    if (index === 1 || index === 2) return "nesw-resize";
    return index >= 4 + ROW_EDGE ? "row-resize" : index >= 4 ? "col-resize" : null;
  }
  /** Corners resize the whole table (TradingView keeps the far corner and scales every column and row alike, none
   *  under its least size); an edge resizes its column or row. */
  dragHandlePx(index, x, y, proj, start) {
    const L = this.layout(proj);
    if (!L) return true;
    const minW = L.minColW;
    if (index >= 4 + ROW_EDGE) {
      const r = index - 4 - ROW_EDGE;
      if (r < this.rows()) this.rowHeights = this.rowHeights.map((h, i) => i === r ? Math.max(L.minRowH[r], y - L.rowY[r]) : h);
      return true;
    }
    if (index >= 4) {
      const c = index - 4;
      if (c < this.cols()) this.columnWidths = this.columnWidths.map((w, i) => i === c ? Math.max(minW, x - L.colX[c]) : w);
      return true;
    }
    const startW = start?.doc.props?.columnWidths ?? this.columnWidths;
    const startH = start?.doc.props?.rowHeights ?? this.rowHeights;
    const w0 = startW.map((w) => Math.max(w, minW));
    const h0 = startH.map((h, r) => Math.max(h, L.minRowH[r] ?? 0));
    const left = index <= 1;
    const top = index === 0 || index === 2;
    const fx = left ? L.colX[L.colX.length - 1] : L.colX[0];
    const fy = top ? L.rowY[L.rowY.length - 1] : L.rowY[0];
    const minTotalW = minW * this.cols();
    const minTotalH = L.minRowH.reduce((a, b) => a + b, 0);
    const nx = left ? Math.min(x, fx - minTotalW) : Math.max(x, fx + minTotalW);
    const ny = top ? Math.min(y, fy - minTotalH) : Math.max(y, fy + minTotalH);
    this.columnWidths = fitTotal(w0, w0.map(() => minW), Math.abs(fx - nx));
    this.rowHeights = fitTotal(h0, L.minRowH, Math.abs(fy - ny));
    if (left || top) {
      const p = proj.pxToPoint(left ? nx : L.colX[0], top ? ny : L.rowY[0], this.paneId);
      const a = this.anchors[0];
      this.anchors = [{ time: left ? p.time : a.time, price: top ? p.price : a.price }];
    }
    return true;
  }
  hitTest(px, py, proj, tol) {
    const b = this.bounds(proj);
    return b != null && px >= b.x - tol && px <= b.x + b.w + tol && py >= b.y - tol && py <= b.y + b.h + tol;
  }
  bounds(proj) {
    const L = this.layout(proj);
    if (!L) return null;
    const x = L.colX[0];
    const y = L.rowY[0];
    return { x, y, w: L.colX[L.colX.length - 1] - x, h: L.rowY[L.rowY.length - 1] - y };
  }
  priceRange() {
    const a = this.anchors[0];
    return a && !this.anchored ? { min: a.price, max: a.price } : null;
  }
  timeExtent() {
    if (this.anchored) return null;
    const a = this.anchors[0];
    return a ? { min: a.time, max: a.time } : null;
  }
  /** Pinned to the screen it marks nothing on the axes. */
  axisPoints() {
    return this.anchored ? [] : this.anchors.slice(0, 1);
  }
  /** TradingView adds a row below the active cell's row (the last row when none) and a column to its right; it
   *  removes the active cell's row or column (never the last one). */
  tableOp(op, active) {
    const [r, c] = active ?? [this.rows() - 1, this.cols() - 1];
    if (op === "addRow" && this.rows() < MAX_ROWS) {
      this.cells.splice(r + 1, 0, Array.from({ length: this.cols() }, () => ""));
      this.rowHeights.splice(r + 1, 0, 0);
    } else if (op === "addColumn" && this.cols() < MAX_COLS) {
      for (const row of this.cells) row.splice(c + 1, 0, "");
      this.columnWidths.splice(c + 1, 0, TV_TABLE.columnWidth);
    } else if (op === "removeRow" && active && this.rows() > 1) {
      this.cells.splice(r, 1);
      this.rowHeights.splice(r, 1);
    } else if (op === "removeColumn" && active && this.cols() > 1) {
      for (const row of this.cells) row.splice(c, 1);
      this.columnWidths.splice(c, 1);
    }
    return active ? [Math.min(r, this.rows() - 1), Math.min(c, this.cols() - 1)] : null;
  }
  schema() {
    return { fields: [] };
  }
  writeProps() {
    return {
      cells: this.cells.map((r) => [...r]),
      columnWidths: [...this.columnWidths],
      rowHeights: [...this.rowHeights],
      textColor: this.textColor,
      fontSize: this.fontSize,
      horzAlign: this.horzAlign,
      anchored: this.anchored === true,
      ...this.anchored ? this.pin.write() : {}
    };
  }
  readProps(props) {
    if (Array.isArray(props.cells) && props.cells.length > 0) {
      const rows = props.cells.slice(0, MAX_ROWS).map((r) => Array.isArray(r) ? r.slice(0, MAX_COLS).map((c) => typeof c === "string" ? c.slice(0, MAX_CELL) : "") : []);
      const cols = Math.max(1, ...rows.map((r) => r.length));
      this.cells = rows.map((r) => [...r, ...Array.from({ length: cols - r.length }, () => "")]);
    }
    const nums = (v) => Array.isArray(v) ? v.map((n) => typeof n === "number" && Number.isFinite(n) ? Math.min(4e3, Math.max(0, n)) : 0) : void 0;
    this.columnWidths = nums(props.columnWidths) ?? this.columnWidths;
    this.rowHeights = nums(props.rowHeights) ?? this.rowHeights;
    if (typeof props.textColor === "string") this.textColor = props.textColor;
    if (typeof props.fontSize === "number" && Number.isFinite(props.fontSize)) this.fontSize = Math.min(72, Math.max(6, props.fontSize));
    if (props.horzAlign === "left" || props.horzAlign === "center" || props.horzAlign === "right") this.horzAlign = props.horzAlign;
    if (typeof props.anchored === "boolean") this.anchored = props.anchored;
    this.pin.read(props);
  }
};

// src/core/drawings/types/DoubleCurve.ts
var STEPS = 64;
var DoubleCurve = class extends SegmentDrawing {
  constructor() {
    super(...arguments);
    this.type = "doublecurve";
  }
  /** TradingView's look on a new one (module 481599: deep blue 2 px, no background). */
  tvShapeKind() {
    return "curve";
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }] };
  }
  geometry(proj) {
    const pts = this.handlePoints(proj);
    if (pts.length < 2) return null;
    const [x0, y0] = pts[0];
    const [x3, y3] = pts[1];
    const dx = x3 - x0;
    const dy = y3 - y0;
    const c1 = [x0 + dy, y0 - dx];
    const c2 = [x3 - dy, y3 + dx];
    const segments = [];
    let px = x0;
    let py = y0;
    for (let i = 1; i <= STEPS; i += 1) {
      const t = i / STEPS;
      const u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * x3;
      const y = u * u * u * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * y3;
      segments.push([px, py, x, y]);
      px = x;
      py = y;
    }
    return { segments, fill: null };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
  }
  schema() {
    if (this.tv) return this.tvShapeSchema();
    return { fields: [...LINE_FIELDS] };
  }
};

// src/core/drawings/types/TimeCycles.ts
var ARC_STEPS = 32;
var TimeCycles = class extends SegmentDrawing {
  constructor() {
    super(...arguments);
    this.type = "timecycles";
  }
  /** TradingView's look on a new one (module 34424: its teal 2 px, its green at 50 % behind). */
  tvShapeKind() {
    return "cycle";
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "start", free: "both" }, { role: "period", free: "both" }] };
  }
  geometry(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const y0 = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (y0 == null || yb == null) return null;
    const x0 = proj.xOf(a.time);
    const d = Math.abs(proj.xOf(b.time) - x0);
    if (d < 2) return { segments: [[x0, y0, proj.xOf(b.time), yb]], fill: null };
    const r = d / 2;
    const up = yb <= y0 ? -1 : 1;
    const first = Math.floor(-x0 / d) - 1;
    const segments = [];
    const fills = [];
    const color = this.style.fillColor || this.style.lineColor;
    for (let k = first, n = 0; n < MAX_CYCLES; k += 1, n += 1) {
      const left = x0 + k * d;
      if (left > proj.width) break;
      if (left + d < 0) continue;
      const pts = [];
      for (let i = 0; i <= ARC_STEPS; i += 1) {
        const t = Math.PI - i / ARC_STEPS * Math.PI;
        pts.push([left + r + r * Math.cos(t), y0 + up * r * Math.sin(t)]);
      }
      for (let i = 1; i < pts.length; i += 1) segments.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
      fills.push({ color, pts });
    }
    return { segments, fill: null, fills: this.tv && this.fillBackground === false ? [] : fills, fillAlpha: this.style.fillColor ? 1 : 0.2 };
  }
  priceRange() {
    const a = this.anchors[0];
    return a ? { min: a.price, max: a.price } : null;
  }
  timeExtent() {
    return null;
  }
  schema() {
    if (this.tv) return this.tvShapeSchema();
    return { fields: [...LINE_FIELDS, ...FILL_FIELDS] };
  }
};

// src/core/drawings/types/SineLine.ts
var SineLine = class extends SegmentDrawing {
  constructor() {
    super(...arguments);
    this.type = "sineline";
  }
  /** TradingView's look on a new one (module 532591: its teal, 2 px). */
  tvShapeKind() {
    return "lines";
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "crest", free: "both" }, { role: "trough", free: "both" }] };
  }
  geometry(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const y1 = proj.yOf(a.price, this.paneId);
    const y2 = proj.yOf(b.price, this.paneId);
    if (y1 == null || y2 == null) return null;
    const x1 = proj.xOf(a.time);
    const half = Math.abs(proj.xOf(b.time) - x1);
    if (half < 2) return { segments: [[x1, y1, proj.xOf(b.time), y2]], fill: null };
    const mid = (y1 + y2) / 2;
    const amp = y1 - mid;
    const segments = [];
    const step = Math.max(2, Math.min(8, half / 16));
    let px = 0;
    let py = mid + amp * Math.cos(Math.PI * (0 - x1) / half);
    for (let x = step; x <= proj.width + step; x += step) {
      const y = mid + amp * Math.cos(Math.PI * (x - x1) / half);
      segments.push([px, py, x, y]);
      px = x;
      py = y;
    }
    return { segments, fill: null };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
  }
  timeExtent() {
    return null;
  }
  schema() {
    if (this.tv) return this.tvShapeSchema();
    return { fields: [...LINE_FIELDS] };
  }
};

// src/core/drawings/types/ArrowMarker.ts
function tvHead(len) {
  if (len < 92) return 18;
  return Math.min(Math.max(Math.min(0.25 * len, 106), 18), 0.9 * len);
}
function arrowMarkerStroke(len) {
  return Math.max(2, Math.min(5, Math.round(0.02 * len)));
}
var ArrowMarker = class extends SegmentDrawing {
  constructor(init) {
    super(init);
    this.type = "arrowmarker";
    if (!init.props) this.tv = true;
  }
  /** TradingView's polygon (screen px) and whether it is the dot: tail, the head's inner notch, its barb, the tip and
   *  back. Null while placing or off-pane. */
  tvShape(proj) {
    const pts = this.handlePoints(proj);
    if (pts.length < 2) return null;
    const [ax, ay] = pts[0];
    const [bx, by] = pts[1];
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (a.time === b.time && Math.abs(a.price - b.price) < 1e-8) return { poly: [], dot: [ax, ay], len: 0 };
    let len = Math.hypot(bx - ax, by - ay);
    const ux = len > 0 ? (bx - ax) / len : 0;
    const uy = len > 0 ? (by - ay) / len : -1;
    let sx = ax;
    let sy = ay;
    if (len < 22) {
      sx = bx - ux * 22;
      sy = by - uy * 22;
      len = 22;
    }
    const nx = uy;
    const ny = -ux;
    const e = tvHead(len);
    const i = len >= 35 ? 0.1 : 0;
    const geo = [[len - e + e * i, 1.22 * e / 4], [len - e, 1.22 * e / 2]];
    const at = (along, perp) => [sx + ux * along + nx * perp, sy + uy * along + ny * perp];
    const poly = [[sx, sy], ...geo.map(([g, h]) => at(g, h)), [bx, by], ...[...geo].reverse().map(([g, h]) => at(g, -h))];
    return { poly, dot: null, len };
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "tail", free: "both" }, { role: "head", free: "both" }] };
  }
  geometry(proj) {
    if (this.tv) {
      const sh = this.tvShape(proj);
      if (!sh) return null;
      if (sh.dot) {
        const [x, y] = sh.dot;
        const ring = Array.from({ length: 16 }, (_, k) => [x + 9 * Math.cos(k * Math.PI / 8), y + 9 * Math.sin(k * Math.PI / 8)]);
        return { segments: [], fill: ring };
      }
      const segs = sh.poly.map((p, k) => {
        const q = sh.poly[(k + 1) % sh.poly.length];
        return [p[0], p[1], q[0], q[1]];
      });
      return { segments: segs, fill: sh.poly };
    }
    const pts = this.handlePoints(proj);
    if (pts.length < 2) return null;
    const [x1, y1] = pts[0];
    const [x2, y2] = pts[1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 4) return { segments: [[x1, y1, x2, y2]], fill: null };
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const nx = -uy;
    const ny = ux;
    const head = Math.min(26, len * 0.35);
    const hw = Math.max(5, Math.min(14, len * 0.12));
    const sw = hw * 0.5;
    const bx = x2 - ux * head;
    const by = y2 - uy * head;
    const poly = [
      [x1 + nx * 1, y1 + ny * 1],
      [bx + nx * sw, by + ny * sw],
      [bx + nx * hw, by + ny * hw],
      [x2, y2],
      [bx - nx * hw, by - ny * hw],
      [bx - nx * sw, by - ny * sw],
      [x1 - nx * 1, y1 - ny * 1]
    ];
    const segments = [];
    for (let i = 0; i < poly.length; i += 1) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      segments.push([p[0], p[1], q[0], q[1]]);
    }
    return { segments, fill: poly };
  }
  /** TradingView's: the whole arrow (or dot) is grabbable, filled with its one color. */
  hitTest(px, py, proj, tol) {
    if (!this.tv) return super.hitTest(px, py, proj, tol);
    const g = this.geometry(proj);
    if (!g?.fill) return false;
    if (pointInPolygon(px, py, g.fill)) return true;
    const f = g.fill;
    return f.some((p, k) => {
      const q = f[(k + 1) % f.length];
      return distToSegment(px, py, p[0], p[1], q[0], q[1]) <= tol;
    });
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    return a && b ? { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) } : null;
  }
  schema() {
    if (this.tv) return { fields: [{ path: "style.lineColor", label: "Color", kind: "color", group: "line" }, ...TEXT_FIELDS] };
    return { fields: [...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace("Line", "Border") })), ...FILL_FIELDS, ...TEXT_FIELDS] };
  }
  writeProps() {
    return this.tv ? { tv: true } : void 0;
  }
  readProps(props) {
    if (props.tv === true) this.tv = true;
  }
};

// src/core/drawings/types/DateRange.ts
var PARTS = RANGE_PARTS.filter((p) => p.key === "bars" || p.key === "dateTime" || p.key === "volume");
var DateRange = class extends MeasureBox {
  constructor(init) {
    super({ ...init, props: { showPrice: false, ...init.props ?? {} } });
    this.type = "daterange";
    if (!init.props) this.tv = true;
    if (this.extendTop === void 0) this.extendTop = false;
    if (this.extendBottom === void 0) this.extendBottom = false;
  }
  rangeParts() {
    return PARTS;
  }
  /** TradingView's: no alignment for the text (it sits in the middle of the box). */
  schema() {
    if (!this.tv) return super.schema();
    return { fields: [...LINE_FIELDS, { path: "style.fillColor", label: "Background", kind: "color", group: "fill" }, ...TEXT_FIELDS] };
  }
  writeProps() {
    const base = super.writeProps();
    return this.tv ? { ...base, extendTop: this.extendTop, extendBottom: this.extendBottom } : base;
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.extendTop === "boolean") this.extendTop = props.extendTop;
    if (typeof props.extendBottom === "boolean") this.extendBottom = props.extendBottom;
  }
};

// src/core/drawings/types/PriceRange.ts
var PARTS2 = RANGE_PARTS.filter((p) => p.key === "priceRange" || p.key === "percent" || p.key === "pips");
var PriceRange = class extends MeasureBox {
  constructor(init) {
    super({ ...init, props: { showDate: false, ...init.props ?? {} } });
    this.type = "pricerange";
    if (!init.props) this.tv = true;
    if (this.extendLeft === void 0) this.extendLeft = false;
    if (this.extendRight === void 0) this.extendRight = false;
  }
  rangeParts() {
    return PARTS2;
  }
  /** TradingView's: no alignment for the text (it sits in the middle of the box). */
  schema() {
    if (!this.tv) return super.schema();
    return { fields: [...LINE_FIELDS, { path: "style.fillColor", label: "Background", kind: "color", group: "fill" }, ...TEXT_FIELDS] };
  }
  writeProps() {
    const base = super.writeProps();
    return this.tv ? { ...base, extendLeft: this.extendLeft, extendRight: this.extendRight } : base;
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.extendLeft === "boolean") this.extendLeft = props.extendLeft;
    if (typeof props.extendRight === "boolean") this.extendRight = props.extendRight;
  }
};

// src/core/drawings/types/elliottTv.ts
var TV_ELLIOTT_DEGREES = [
  "Supermillennium",
  "Millennium",
  "Submillennium",
  "Grand Supercycle",
  "Supercycle",
  "Cycle",
  "Primary",
  "Intermediate",
  "Minor",
  "Minute",
  "Minuette",
  "Subminuette",
  "Micro",
  "Submicro",
  "Minuscule"
];
var TV_ELLIOTT_DEFAULT_DEGREE = 7;
var GROUP_LOOK = [
  { font: 11, circle: 14, bold: true },
  { font: 16, circle: 22, bold: false },
  { font: 18, circle: 22, bold: false },
  { font: 20, circle: 28, bold: false },
  { font: 24, circle: 36, bold: true }
];
var TV_IMPULSE_LABELS = [
  ["0", "1", "2", "3", "4", "5"],
  ["0", "i", "ii", "iii", "iv", "v"],
  ["0", "1", "2", "3", "4", "5"],
  ["0", "I", "II", "III", "IV", "V"],
  ["0", "1", "2", "3", "4", "5"]
];
var TV_CORRECTION_LABELS = [
  ["0", "A", "B", "C"],
  ["0", "a", "b", "c"],
  ["0", "A", "B", "C"],
  ["0", "a", "b", "c"],
  ["0", "A", "B", "C"]
];
var TV_TRIANGLE_LABELS = [
  ["0", "A", "B", "C", "D", "E"],
  ["0", "a", "b", "c", "d", "e"],
  ["0", "A", "B", "C", "D", "E"],
  ["0", "a", "b", "c", "d", "e"],
  ["0", "A", "B", "C", "D", "E"]
];
var TV_DOUBLE_COMBO_LABELS = [
  ["0", "W", "X", "Y"],
  ["0", "w", "x", "y"],
  ["0", "W", "X", "Y"],
  ["0", "w", "x", "y"],
  ["0", "W", "X", "Y"]
];
var TV_TRIPLE_COMBO_LABELS = [
  ["0", "W", "X", "Y", "X", "Z"],
  ["0", "w", "x", "y", "x", "z"],
  ["0", "W", "X", "Y", "X", "Z"],
  ["0", "w", "x", "y", "x", "z"],
  ["0", "W", "X", "Y", "X", "Z"]
];
function tvDegreeOf(v) {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < TV_ELLIOTT_DEGREES.length ? v : TV_ELLIOTT_DEFAULT_DEGREE;
}
function tvElliottLabel(groups, degree, index) {
  const t = TV_ELLIOTT_DEGREES.length - tvDegreeOf(degree) - 1;
  const group = Math.floor(t / 3);
  const deco = ["", "brackets", "circle"][t % 3];
  const look = GROUP_LOOK[group];
  const raw = groups[group]?.[index] ?? "";
  return { text: deco === "brackets" ? `(${raw})` : raw, circle: deco === "circle", fontSize: look.font, radius: look.circle / 2, bold: look.bold };
}

// src/core/drawings/types/PatternDrawing.ts
var TV_PATTERN_TEXT = "#FFFFFF";
function legRatio(before, a, b) {
  return Math.round(1e3 * Math.abs(b - a) / Math.abs(a - before)) / 1e3;
}
var PatternDrawing = class extends Drawing {
  constructor(init) {
    super(init);
    if (!init.props && this.tvPattern()) {
      this.tv = true;
      this.fillBackground = true;
      this.textColor = TV_PATTERN_TEXT;
      this.fontSize = 12;
      this.labelBold = false;
      this.labelItalic = false;
      if (this.tvElliottLabels()) {
        this.tvDegree = TV_ELLIOTT_DEFAULT_DEGREE;
        this.showWave = true;
      }
    }
  }
  /** TradingView's Elliott label groups for a wave tool (null for the other patterns). */
  tvElliottLabels() {
    return null;
  }
  /** Whether a new one takes TradingView's look (the tools audited so far). */
  tvPattern() {
    return false;
  }
  /** TradingView's dotted ratio lines: the two points each joins and the ratio printed at its middle. */
  tvRatioLines() {
    return [];
  }
  /** TradingView's triangle pattern: the A–C and B–D lines run to their apex, closed as a dotted, filled triangle. */
  tvConverging() {
    return false;
  }
  /** Whether TradingView's pattern has a Background (a filled part). */
  tvBackground() {
    return this.fillTriangles().length > 0 || this.tvConverging();
  }
  /** TradingView draws the dotted ratio lines 1 px (XABCD, Cypher) or in the line's width (ABCD). */
  tvRatioLineWidth() {
    return 1;
  }
  /** Show consecutive-leg retracement ratios (harmonic patterns). */
  legRatios() {
    return false;
  }
  /** Vertex-index triples to tint (the harmonic body), or none. */
  fillTriangles() {
    return [];
  }
  /** Write the vertex labels on plates in the line color (head & shoulders), not as bare text. */
  labelPlates() {
    return false;
  }
  /** Two vertex indices whose line is drawn as an extended neckline (head & shoulders), or null. */
  necklineIndices() {
    return null;
  }
  anchorSchema() {
    const n = this.vertexLabels().length;
    const slots = [];
    for (let i = 0; i < n; i += 1) slots.push({ role: `p${i}`, free: "both" });
    return { min: n, max: n, slots };
  }
  handlePoints(proj) {
    const pts = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      pts.push([proj.xOf(a.time), y]);
    }
    return pts;
  }
  hitTest(px, py, proj, tol) {
    const pts = this.handlePoints(proj);
    return pts.length >= 2 && distToPolyline(px, py, pts) <= tol;
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const pts = this.handlePoints(proj);
    if (pts.length === 0) return null;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  priceRange() {
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((a) => a.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  // ── harmonic validation hooks (overridden by HarmonicPattern; null = not a validated pattern) ──
  /** The harmonic pattern's name (drawn as a badge), or null for a plain pattern. */
  patternName() {
    return null;
  }
  /** Whether the leg ratio shown at vertex `i` is within the pattern's ideal band (null = no rule). */
  ratioOk(_i) {
    return null;
  }
  /** Whether ALL the pattern's defining ratios are satisfied (null = not enough points / not harmonic). */
  valid() {
    return null;
  }
  /** Consecutive-leg ratio at vertex `i` (≥2): |leg(i-1,i)| / |leg(i-2,i-1)| in price. */
  ratioAt(i) {
    const a = this.anchors[i - 2];
    const b = this.anchors[i - 1];
    const c = this.anchors[i];
    if (!a || !b || !c) return null;
    const prev = Math.abs(b.price - a.price);
    return prev < 1e-9 ? null : Math.abs(c.price - b.price) / prev;
  }
  schema() {
    return { fields: [...LINE_FIELDS, ...this.fillTriangles().length ? FILL_FIELDS : []] };
  }
  writeProps() {
    if (!this.tv) return super.writeProps();
    return {
      tv: true,
      fillBackground: this.fillBackground !== false,
      textColor: this.textColor,
      fontSize: this.fontSize,
      labelBold: this.labelBold === true,
      labelItalic: this.labelItalic === true,
      ...this.tvElliottLabels() ? { tvDegree: tvDegreeOf(this.tvDegree), showWave: this.showWave !== false } : {}
    };
  }
  readProps(props) {
    super.readProps(props);
    if (props.tv === true) this.tv = true;
    for (const k of ["fillBackground", "labelBold", "labelItalic"]) if (typeof props[k] === "boolean") this[k] = props[k];
    if (typeof props.textColor === "string") this.textColor = props.textColor;
    if (typeof props.fontSize === "number" && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
    if (props.tvDegree !== void 0) this.tvDegree = tvDegreeOf(props.tvDegree);
    if (typeof props.showWave === "boolean") this.showWave = props.showWave;
  }
};

// src/core/drawings/types/TrianglePattern.ts
var TrianglePattern = class extends PatternDrawing {
  constructor() {
    super(...arguments);
    this.type = "trianglepattern";
  }
  tvPattern() {
    return true;
  }
  tvConverging() {
    return true;
  }
  vertexLabels() {
    return ["A", "B", "C", "D"];
  }
  labelPlates() {
    return true;
  }
  fillTriangles() {
    return this.tv ? [] : [[0, 1, 2], [1, 2, 3]];
  }
  /** TradingView's triangle in pixels: where the A–C and B–D lines cross the outermost points' x (the leftmost, or
   *  the rightmost when the apex is left of them), then the apex; null until all four points or when the sides are
   *  vertical or parallel. */
  convergingTriangle(pts) {
    if (pts.length < 4) return null;
    const [a, b, c, d] = pts;
    if (Math.abs(c[0] - a[0]) < 1 || Math.abs(d[0] - b[0]) < 1) return null;
    const s1 = (c[1] - a[1]) / (c[0] - a[0]);
    const s2 = (d[1] - b[1]) / (d[0] - b[0]);
    if (Math.abs(s1 - s2) < 1e-6) return null;
    const apexX = (b[1] - a[1] + (a[0] * s1 - b[0] * s2)) / (s1 - s2);
    const xs = [a[0], b[0], c[0], d[0]];
    let x = Math.min(...xs);
    if (apexX < x) x = Math.max(...xs);
    return [[x, a[1] + (x - a[0]) * s1], [x, b[1] + (x - b[0]) * s2], [apexX, a[1] + (apexX - a[0]) * s1]];
  }
};

// src/core/drawings/types/ThreeDrives.ts
function driveRatio(a, b, c) {
  return Math.round(100 * Math.abs(c - b) / Math.abs(b - a)) / 100;
}
var ThreeDrives = class extends PatternDrawing {
  constructor() {
    super(...arguments);
    this.type = "threedrives";
  }
  vertexLabels() {
    return ["", "", "", "", "", "", ""];
  }
  tvPattern() {
    return true;
  }
  tvRatioLines() {
    const p = this.anchors.map((a) => a.price);
    const out = [];
    if (p.length >= 4) out.push({ from: 1, to: 3, ratio: driveRatio(p[1], p[2], p[3]) });
    if (p.length >= 6) out.push({ from: 3, to: 5, ratio: driveRatio(p[3], p[4], p[5]) });
    return out;
  }
  tvRatioLineWidth() {
    return this.style.lineWidth;
  }
};

// src/core/drawings/types/elliottDegree.ts
var ELLIOTT_DEGREES = {
  "Grand Supercycle": { impulse: ["((I))", "((II))", "((III))", "((IV))", "((V))"], correction: ["((a))", "((b))", "((c))"] },
  Supercycle: { impulse: ["(I)", "(II)", "(III)", "(IV)", "(V)"], correction: ["(a)", "(b)", "(c)"] },
  Cycle: { impulse: ["I", "II", "III", "IV", "V"], correction: ["a", "b", "c"] },
  Primary: { impulse: ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464"], correction: ["\u24B6", "\u24B7", "\u24B8"] },
  Intermediate: { impulse: ["(1)", "(2)", "(3)", "(4)", "(5)"], correction: ["(A)", "(B)", "(C)"] },
  Minor: { impulse: ["1", "2", "3", "4", "5"], correction: ["A", "B", "C"] },
  Minute: { impulse: ["(i)", "(ii)", "(iii)", "(iv)", "(v)"], correction: ["(a)", "(b)", "(c)"] },
  Minuette: { impulse: ["i", "ii", "iii", "iv", "v"], correction: ["a", "b", "c"] }
};
var DEFAULT_DEGREE = "Minor";
var ELLIOTT_DEGREE_FIELD = {
  path: "degree",
  label: "Degree",
  kind: "select",
  options: Object.keys(ELLIOTT_DEGREES).map((value) => ({ value, label: value })),
  group: "text"
};
function degreeOf(v) {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(ELLIOTT_DEGREES, v) ? v : DEFAULT_DEGREE;
}
function degreeLetters(degree, letters) {
  const sample = ELLIOTT_DEGREES[degreeOf(degree)].correction[0];
  if (sample === "\u24B6") return letters.map((l) => String.fromCodePoint(9398 + l.charCodeAt(0) - 65));
  const core = /[Aa]/.exec(sample);
  if (!core) return [...letters];
  const pre = sample.slice(0, core.index);
  const post = sample.slice(core.index + 1);
  const lower = core[0] === "a";
  return letters.map((l) => `${pre}${lower ? l.toLowerCase() : l}${post}`);
}

// src/core/drawings/types/ElliottCombo.ts
var ElliottLettered = class extends PatternDrawing {
  vertexLabels() {
    return ["", ...degreeLetters(degreeOf(this.degree), this.letters())];
  }
  writeProps() {
    return { ...super.writeProps(), degree: degreeOf(this.degree) };
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.degree === "string") this.degree = degreeOf(props.degree);
  }
  schema() {
    return { fields: [...LINE_FIELDS, ELLIOTT_DEGREE_FIELD] };
  }
};
var ElliottTriangle = class extends ElliottLettered {
  constructor() {
    super(...arguments);
    this.type = "elliotttriangle";
  }
  tvPattern() {
    return true;
  }
  tvElliottLabels() {
    return TV_TRIANGLE_LABELS;
  }
  letters() {
    return ["A", "B", "C", "D", "E"];
  }
};
var ElliottDoubleCombo = class extends ElliottLettered {
  constructor() {
    super(...arguments);
    this.type = "elliottdoublecombo";
  }
  tvPattern() {
    return true;
  }
  tvElliottLabels() {
    return TV_DOUBLE_COMBO_LABELS;
  }
  letters() {
    return ["W", "X", "Y"];
  }
};
var ElliottTripleCombo = class extends ElliottLettered {
  constructor() {
    super(...arguments);
    this.type = "elliotttriplecombo";
  }
  tvPattern() {
    return true;
  }
  tvElliottLabels() {
    return TV_TRIPLE_COMBO_LABELS;
  }
  letters() {
    return ["W", "X", "Y", "X", "Z"];
  }
};

// src/core/drawings/types/HorizontalLine.ts
var HorizontalLine = class extends Drawing {
  constructor() {
    super(...arguments);
    this.type = "hline";
  }
  writeProps() {
    return { showPrice: this.showPrice !== false };
  }
  readProps(props) {
    if (typeof props.showPrice === "boolean") this.showPrice = props.showPrice;
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "p", free: "y" }] };
  }
  y(proj) {
    const a = this.anchors[0];
    return a ? proj.yOf(a.price, this.paneId) : null;
  }
  hitTest(_px, py, proj, tol) {
    const y = this.y(proj);
    return y != null && Math.abs(py - y) <= tol;
  }
  handlePoints(proj) {
    const a = this.anchors[0];
    const y = this.y(proj);
    if (!a || y == null) return [];
    return [[proj.xOf(a.time), y]];
  }
  /** TradingView's horizontal-line handle is a rounded square with the up-down resize cursor. */
  handleShapes() {
    return ["square"];
  }
  handleCursor() {
    return "ns-resize";
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const y = this.y(proj);
    return y == null ? null : { x: 0, y: y - 1, w: proj.width, h: 2 };
  }
  priceRange() {
    const a = this.anchors[0];
    return a ? { min: a.price, max: a.price } : null;
  }
  // A horizontal line spans the full width → never cull by time.
  timeExtent() {
    return null;
  }
  schema() {
    return { fields: [...LINE_FIELDS, SHOW_PRICE_FIELD, ...TEXT_FIELDS, ...LINE_TEXT_ALIGN_FIELDS] };
  }
};

// src/core/drawings/types/Ray.ts
var Ray = class extends TrendLine {
  constructor(init) {
    super(init);
    this.type = "ray";
    if (typeof init.props?.extendRight !== "boolean") this.extendRight = true;
  }
};

// src/core/drawings/types/ExtendedLine.ts
var ExtendedLine = class extends TrendLine {
  constructor(init) {
    super(init);
    this.type = "extendedline";
    if (typeof init.props?.extendLeft !== "boolean") this.extendLeft = true;
    if (typeof init.props?.extendRight !== "boolean") this.extendRight = true;
  }
};

// src/core/drawings/types/VerticalLine.ts
var VerticalLine = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "vline";
    if (!init.props) {
      this.extendLine = true;
      this.textVertical = true;
    }
  }
  writeProps() {
    return { showTime: this.showTime !== false, extendLine: !!this.extendLine, ...this.textVertical ? { textVertical: true } : {} };
  }
  readProps(props) {
    if (typeof props.showTime === "boolean") this.showTime = props.showTime;
    if (typeof props.textVertical === "boolean") this.textVertical = props.textVertical;
    if (typeof props.extendLine === "boolean") this.extendLine = props.extendLine;
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "p", free: "x" }] };
  }
  x(proj) {
    const a = this.anchors[0];
    return a ? proj.xOf(a.time) : null;
  }
  hitTest(px, _py, proj, tol) {
    const x = this.x(proj);
    return x != null && Math.abs(px - x) <= tol;
  }
  handlePoints(proj) {
    const a = this.anchors[0];
    const x = this.x(proj);
    if (!a || x == null) return [];
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? [] : [[x, y]];
  }
  /** TradingView's vertical-line handle is a rounded square with the left-right resize cursor. */
  handleShapes() {
    return ["square"];
  }
  handleCursor() {
    return "ew-resize";
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const x = this.x(proj);
    return x == null ? null : { x: x - 1, y: 0, w: 2, h: proj.height };
  }
  priceRange() {
    return null;
  }
  schema() {
    return {
      fields: [
        ...LINE_FIELDS,
        { path: "extendLine", label: "Extend", kind: "boolean", group: "behavior" },
        SHOW_TIME_FIELD,
        ...TEXT_FIELDS,
        ...LINE_TEXT_ALIGN_FIELDS,
        { path: "textVertical", label: "Text orientation", kind: "boolean", group: "text" }
      ]
    };
  }
};

// src/core/drawings/types/HorizontalRay.ts
var HorizontalRay = class extends Drawing {
  constructor() {
    super(...arguments);
    this.type = "hray";
  }
  writeProps() {
    return { showPrice: this.showPrice !== false };
  }
  readProps(props) {
    if (typeof props.showPrice === "boolean") this.showPrice = props.showPrice;
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "p", free: "both" }] };
  }
  pt(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  hitTest(px, py, proj, tol) {
    const p = this.pt(proj);
    return p != null && distToSegment(px, py, p[0], p[1], proj.width, p[1]) <= tol;
  }
  handlePoints(proj) {
    const p = this.pt(proj);
    return p ? [p] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const p = this.pt(proj);
    return p ? { x: p[0], y: p[1] - 1, w: Math.max(0, proj.width - p[0]), h: 2 } : null;
  }
  priceRange() {
    const a = this.anchors[0];
    return a ? { min: a.price, max: a.price } : null;
  }
  // Extends right to the edge → visible whenever its anchor sits at/left of the viewport.
  timeExtent() {
    const a = this.anchors[0];
    return a ? { min: a.time, max: Number.POSITIVE_INFINITY } : null;
  }
  schema() {
    return { fields: [...LINE_FIELDS, SHOW_PRICE_FIELD, ...TEXT_FIELDS, ...LINE_TEXT_ALIGN_FIELDS] };
  }
};

// src/core/drawings/types/CrossLine.ts
var CrossLine = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "crossline";
    if (!init.props) this.tv = true;
  }
  writeProps() {
    return { showPrice: this.showPrice !== false, showTime: this.showTime !== false, ...this.tv ? { tv: true } : {} };
  }
  readProps(props) {
    if (typeof props.showPrice === "boolean") this.showPrice = props.showPrice;
    if (typeof props.showTime === "boolean") this.showTime = props.showTime;
    if (props.tv === true) this.tv = true;
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "p", free: "both" }] };
  }
  pt(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  hitTest(px, py, proj, tol) {
    const p = this.pt(proj);
    return p != null && (Math.abs(py - p[1]) <= tol || Math.abs(px - p[0]) <= tol);
  }
  handlePoints(proj) {
    const p = this.pt(proj);
    return p ? [p] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const p = this.pt(proj);
    return p ? { x: p[0] - 1, y: p[1] - 1, w: 2, h: 2 } : null;
  }
  priceRange() {
    const a = this.anchors[0];
    return a ? { min: a.price, max: a.price } : null;
  }
  // The horizontal arm spans the full width → never cull by time.
  timeExtent() {
    return null;
  }
  schema() {
    return { fields: [...LINE_FIELDS, SHOW_PRICE_FIELD, SHOW_TIME_FIELD, ...this.tv ? [] : TEXT_FIELDS] };
  }
};

// src/core/drawings/types/InfoLine.ts
var InfoLine = class extends TrendLine {
  constructor() {
    super(...arguments);
    this.type = "infoline";
  }
};

// src/core/drawings/types/TrendAngle.ts
var TV_ANGLE_STATS = /* @__PURE__ */ new Set(["stats.price", "stats.percent", "stats.pips", "stats.bars", "stats.position", "stats.always"]);
var TrendAngle = class extends TrendLine {
  constructor(init) {
    super(init);
    this.type = "trendangle";
    if (!init.props) this.tv = true;
  }
  /** The angle in degrees, rounded to 0.01 as TradingView shows it; setting it turns the line about its first point. */
  get angleDeg() {
    return Math.round((this.angle ?? 0) * 180 / Math.PI * 100) / 100;
  }
  set angleDeg(v) {
    if (!Number.isFinite(v)) return;
    this.angle = v % 360 * Math.PI / 180;
  }
  /** Take the angle and length from the first point to (x, y) on screen. */
  aimAt(x, y, proj) {
    const a = this.anchors[0];
    const ya = a ? proj.yOf(a.price, this.paneId) : null;
    if (!a || ya == null) return;
    const dx = x - proj.xOf(a.time);
    const dy = y - ya;
    const len = Math.hypot(dx, dy);
    this.distance = len;
    this.angle = len > 0 ? (dy > 0 ? -1 : 1) * Math.acos(dx / len) : 0;
  }
  onPlaced(proj) {
    if (!this.tv) return;
    const p = super.pixels(proj);
    if (p) this.aimAt(p[2], p[3], proj);
  }
  /** TradingView's second handle sets the angle and length (and the stored point, which its alert reads). */
  dragHandlePx(index, x, y, proj) {
    if (!this.tv || index !== 1) return false;
    const pt = proj.pxToPoint(x, y, this.paneId);
    if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
    const b = this.anchors[1];
    if (b) this.anchors = [this.anchors[0], { ...b, time: pt.time, price: pt.price }];
    this.aimAt(x, y, proj);
    return true;
  }
  /** The segment on screen: the first point, then the far end from the angle and length (TradingView's). */
  pixels(proj) {
    const p = super.pixels(proj);
    if (!p || !this.tv || this.angle == null || this.distance == null) return p;
    return [p[0], p[1], p[0] + Math.cos(this.angle) * this.distance, p[1] - Math.sin(this.angle) * this.distance];
  }
  /** The far end as a chart point (TradingView's stats read it). */
  drawnEnd(proj) {
    const p = this.pixels(proj);
    return p ? proj.pxToPoint(p[2], p[3], this.paneId) : null;
  }
  schema() {
    if (!this.tv) return { fields: [...LINE_FIELDS, ...TEXT_FIELDS, ...LINE_TEXT_ALIGN_FIELDS] };
    return {
      fields: [
        ...LINE_FIELDS,
        { path: "extendLeft", label: "Extend left", kind: "boolean", group: "behavior" },
        { path: "extendRight", label: "Extend right", kind: "boolean", group: "behavior" },
        { path: "showMiddlePoint", label: "Middle point", kind: "boolean", group: "behavior" },
        { path: "showPriceLabels", label: "Price labels", kind: "boolean", group: "behavior" },
        ...LINE_STATS_FIELDS.filter((f) => TV_ANGLE_STATS.has(f.path))
      ]
    };
  }
  writeProps() {
    if (!this.tv) return void 0;
    return { ...super.writeProps(), tv: true, ...this.angle != null && this.distance != null ? { angle: this.angle, distance: this.distance } : {} };
  }
  readProps(props) {
    if (props.tv !== true) return;
    super.readProps(props);
    this.tv = true;
    if (typeof props.angle === "number" && Number.isFinite(props.angle)) this.angle = props.angle;
    if (typeof props.distance === "number" && Number.isFinite(props.distance)) this.distance = props.distance;
  }
};

// src/core/drawings/types/Box.ts
var isLineStyle = (v) => v === "solid" || v === "dashed" || v === "dotted";
var TV_RECT_COLOR = "#9c27b0";
var TV_RECT_TEXT_ALIGN = [
  { path: "text.hAlign", label: "Text horizontal position", kind: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }], group: "text" },
  { path: "text.vAlign", label: "Text vertical position", kind: "select", options: [{ value: "top", label: "Top" }, { value: "center", label: "Inside" }, { value: "bottom", label: "Bottom" }], group: "text" }
];
var Box = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "box";
    if (!init.props) {
      this.tv = true;
      this.extendLeft = false;
      this.extendRight = false;
      this.middleLine = false;
      this.fillBackground = true;
      this.middleColor = TV_RECT_COLOR;
      this.middleWidth = 1;
      this.middleStyle = "dashed";
    }
  }
  textDefaults() {
    return this.tv ? { color: TV_RECT_COLOR, size: 14, hAlign: "center", vAlign: "center" } : void 0;
  }
  /** Whether the background is painted. */
  filled() {
    return !!this.style.fillColor && (this.tv ? this.fillBackground === true : true);
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "c1", free: "both" }, { role: "c2", free: "both" }] };
  }
  rect(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (ya == null || yb == null) return null;
    return { x1: proj.xOf(a.time), y1: ya, x2: proj.xOf(b.time), y2: yb };
  }
  hitTest(px, py, proj, tol) {
    const r0 = this.rect(proj);
    const s = this.spanX(proj);
    if (!r0 || !s) return false;
    const r = { ...r0, x1: s.x1, x2: s.x2 };
    if (this.filled() && pointInBox(px, py, r.x1, r.y1, r.x2, r.y2)) return true;
    const edges = [
      [r.x1, r.y1, r.x2, r.y1],
      [r.x2, r.y1, r.x2, r.y2],
      [r.x2, r.y2, r.x1, r.y2],
      [r.x1, r.y2, r.x1, r.y1]
    ];
    return edges.some((e) => distToSegment(px, py, e[0], e[1], e[2], e[3]) <= tol);
  }
  /** The two corners; TradingView's box adds the other two corners, then the middle of the left, right, top and
   *  bottom sides (its anchor order). */
  handlePoints(proj) {
    const r = this.rect(proj);
    if (!r) return [];
    if (!this.tv) return [[r.x1, r.y1], [r.x2, r.y2]];
    const xm = (r.x1 + r.x2) / 2;
    const ym = (r.y1 + r.y2) / 2;
    return [[r.x1, r.y1], [r.x2, r.y2], [r.x1, r.y2], [r.x2, r.y1], [r.x1, ym], [r.x2, ym], [xm, r.y1], [xm, r.y2]];
  }
  /** TradingView: corners round, side middles square. */
  handleShapes() {
    return this.tv ? ["circle", "circle", "circle", "circle", "square", "square", "square", "square"] : [];
  }
  /** TradingView: the corners resize diagonally (the pair along the drawn diagonal one way, the other pair the
   *  other), the left / right middles sideways, the top / bottom middles up and down. */
  handleCursor(index) {
    if (!this.tv) return null;
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    if (index === 4 || index === 5) return "ew-resize";
    if (index === 6 || index === 7) return "ns-resize";
    const s = Math.sign((a.time - b.time) * (b.price - a.price));
    const main = s < 0 ? "nesw-resize" : "nwse-resize";
    const other = s < 0 ? "nwse-resize" : "nesw-resize";
    return index < 2 ? main : other;
  }
  /** TradingView's handle moves: the extra corners take one corner's price and the other's time, a side middle
   *  moves that side only. The two drawn corners move as usual. */
  dragHandlePx(index, x, y, proj) {
    if (!this.tv || index < 2) return false;
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return false;
    const pt = proj.pxToPoint(x, y, this.paneId);
    if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
    if (index === 2) this.anchors = [{ ...a, time: pt.time }, { ...b, price: pt.price }];
    else if (index === 3) this.anchors = [{ ...a, price: pt.price }, { ...b, time: pt.time }];
    else if (index === 4) this.anchors = [{ ...a, time: pt.time }, b];
    else if (index === 5) this.anchors = [a, { ...b, time: pt.time }];
    else if (index === 6) this.anchors = [{ ...a, price: pt.price }, b];
    else if (index === 7) this.anchors = [a, { ...b, price: pt.price }];
    return true;
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const r = this.rect(proj);
    if (!r) return null;
    return { x: Math.min(r.x1, r.x2), y: Math.min(r.y1, r.y2), w: Math.abs(r.x2 - r.x1), h: Math.abs(r.y2 - r.y1) };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
  /** Left and right edges on screen, after any extension to the pane edge. */
  spanX(proj) {
    const r = this.rect(proj);
    if (!r) return null;
    return { x1: this.extendLeft ? 0 : Math.min(r.x1, r.x2), x2: this.extendRight ? proj.width : Math.max(r.x1, r.x2) };
  }
  writeProps() {
    const base = { extendLeft: !!this.extendLeft, extendRight: !!this.extendRight, middleLine: !!this.middleLine };
    if (!this.tv) return base;
    return { ...base, tv: true, fillBackground: this.fillBackground === true, middleColor: this.middleColor, middleWidth: this.middleWidth, middleStyle: this.middleStyle };
  }
  readProps(props) {
    if (props.tv === true) this.tv = true;
    if (typeof props.fillBackground === "boolean") this.fillBackground = props.fillBackground;
    if (typeof props.middleColor === "string") this.middleColor = props.middleColor;
    if (typeof props.middleWidth === "number" && Number.isFinite(props.middleWidth)) this.middleWidth = Math.min(10, Math.max(1, props.middleWidth));
    if (isLineStyle(props.middleStyle)) this.middleStyle = props.middleStyle;
    if (typeof props.extendLeft === "boolean") this.extendLeft = props.extendLeft;
    if (typeof props.extendRight === "boolean") this.extendRight = props.extendRight;
    if (typeof props.middleLine === "boolean") this.middleLine = props.middleLine;
  }
  schema() {
    if (this.tv) {
      return {
        fields: [
          ...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace("Line", "Border") })),
          { path: "fillBackground", label: "Background", kind: "boolean", group: "fill" },
          { path: "style.fillColor", label: "Fill color", kind: "color", group: "fill" },
          { path: "extendLeft", label: "Extend left", kind: "boolean", group: "behavior" },
          { path: "extendRight", label: "Extend right", kind: "boolean", group: "behavior" },
          { path: "middleLine", label: "Middle line", kind: "boolean", group: "behavior" },
          ...TEXT_FIELDS,
          ...TV_RECT_TEXT_ALIGN
        ]
      };
    }
    return {
      fields: [
        ...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace("Line", "Border") })),
        { path: "style.fillColor", label: "Fill color", kind: "color", group: "fill" },
        { path: "extendLeft", label: "Extend left", kind: "boolean", group: "behavior" },
        { path: "extendRight", label: "Extend right", kind: "boolean", group: "behavior" },
        { path: "middleLine", label: "Middle line", kind: "boolean", group: "behavior" },
        ...TEXT_FIELDS,
        // TradingView's rectangle text alignment (inside the box).
        ...LINE_TEXT_ALIGN_FIELDS
      ]
    };
  }
};

// src/core/drawings/types/PriceLabel.ts
var PriceLabel = class extends PinnedLabel {
  constructor(init) {
    super(init);
    this.type = "pricelabel";
    if (!init.props) {
      this.tv = true;
      this.text = { ...this.text ?? defaultText(""), color: "#FFFFFF", size: 14, bold: true };
    }
  }
  writeProps() {
    return this.tv ? { tv: true } : void 0;
  }
  readProps(props) {
    if (props.tv === true) this.tv = true;
  }
  /** Sized from the (approximate) price string — the painter formats it precisely. */
  labelText() {
    const p = this.anchors[0]?.price;
    return p == null ? "0.00" : p.toFixed(2);
  }
  /** The label value is auto (the price), so expose only styling — not a `text.value` field. */
  schema() {
    return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS.filter((f) => f.path !== "text.value")] };
  }
};

// src/core/drawings/types/CalloutBase.ts
var CalloutBase = class extends Drawing {
  constructor(init) {
    super(init);
    if (!this.text) this.text = defaultText(this.defaultLabel());
  }
  /** The placeholder text seeded for a fresh annotation. */
  defaultLabel() {
    return "Callout";
  }
  /** The string used to size the approximate hit box (auto-text subclasses override it). */
  labelText() {
    return this.text?.value ?? this.defaultLabel();
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "target", free: "both" }, { role: "box", free: "both" }] };
  }
  /** Approximate pixel box around the box anchor (the painter renders the precise glyphs). */
  box(proj) {
    const c = this.anchors[1];
    if (!c) return null;
    const cy = proj.yOf(c.price, this.paneId);
    if (cy == null) return null;
    const fs = textPx(this.text?.size);
    const lines = this.labelText().split("\n");
    const cols = Math.max(1, ...lines.map((l) => l.length));
    const w = Math.max(20, cols * fs * 0.6) + 16;
    const h = lines.length * fs * 1.4 + 12;
    return { x: proj.xOf(c.time) - w / 2, y: cy - h / 2, w, h };
  }
  /** The target tip + box-center pixels (drives the painter, hit-test, and the tip handle). */
  points(proj) {
    const t = this.anchors[0];
    const c = this.anchors[1];
    if (!t || !c) return null;
    const ty = proj.yOf(t.price, this.paneId);
    const cy = proj.yOf(c.price, this.paneId);
    if (ty == null || cy == null) return null;
    return [
      [proj.xOf(t.time), ty],
      [proj.xOf(c.time), cy]
    ];
  }
  hitTest(px, py, proj, tol) {
    const b = this.box(proj);
    if (b && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol)) return true;
    const p = this.points(proj);
    return p != null && distToSegment(px, py, p[0][0], p[0][1], p[1][0], p[1][1]) <= tol;
  }
  /** Only the pointer tip is a draggable handle — the box is moved by dragging its body, so no
   *  handle dot sits over the text. */
  handlePoints(proj) {
    const p = this.points(proj);
    return p ? [p[0]] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  /** A body drag moves only the box; the pointer tip stays pinned at its target. */
  translateBody(dt, dp, orig) {
    const t = orig[0];
    const b = orig[1];
    if (!t || !b) return orig.map((o) => ({ time: o.time + dt, price: o.price + dp }));
    return [
      { time: t.time, price: t.price },
      { time: b.time + dt, price: b.price + dp }
    ];
  }
  bounds(proj) {
    return this.box(proj);
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
  schema() {
    return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS], textIsContent: true };
  }
};

// src/core/drawings/types/Callout.ts
var CALLOUT_RADIUS = 8;
var CALLOUT_MARGIN = 2;
var CALLOUT_MIN_WRAP = 100;
var Callout = class extends CalloutBase {
  constructor(init) {
    super(init);
    this.type = "callout";
    if (!init.props) {
      this.tv = true;
      this.wrapWidth ?? (this.wrapWidth = 200);
      this.text = { ...defaultText(""), ...init.text ?? {}, color: init.text?.color ?? TV_CALLOUT_TEXT, size: init.text?.size ?? 14 };
    }
  }
  /** The wrap width in px, or null when the text does not wrap. */
  wrapPx() {
    return this.tv && this.wordWrap ? Math.max(CALLOUT_MIN_WRAP, this.wrapWidth ?? 200) : null;
  }
  /** TradingView's bubble: the text plus its margin and corner radius on every side, centered on the box point
   *  (text widths approximated; the painter measures the glyphs). */
  box(proj) {
    if (!this.tv) return super.box(proj);
    const p = this.points(proj);
    if (!p) return null;
    const fs = textPx(this.text?.size);
    const lines = this.labelText().split("\n");
    const wrap = this.wrapPx();
    const tw = wrap ?? Math.max(...lines.map((l) => l.length * fs * 0.6));
    const rows = wrap == null ? lines.length : lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length * fs * 0.6 / wrap)), 0);
    const pad = 2 * (CALLOUT_RADIUS + CALLOUT_MARGIN);
    const w = tw + pad;
    const h = rows * fs + pad;
    return { x: p[1][0] - w / 2, y: p[1][1] - h / 2, w, h };
  }
  /** TradingView grabs the bubble and the target point, not the tail. */
  hitTest(px, py, proj, tol) {
    if (!this.tv) return super.hitTest(px, py, proj, tol);
    const b = this.box(proj);
    return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h);
  }
  /** The target; with Text wrap on, also a point on the bubble's right edge that sets the wrap width. */
  handlePoints(proj) {
    const pts = super.handlePoints(proj);
    const b = this.tv && this.wrapPx() != null ? this.box(proj) : null;
    return b && pts[0] ? [pts[0], [b.x + b.w, b.y + b.h / 2]] : pts;
  }
  /** TradingView's wrap handle: the left edge stays, the width follows the handle (text at least 100 px). */
  dragHandlePx(index, x, _y, proj) {
    if (!this.tv || index !== 1) return false;
    const b = this.box(proj);
    const c = this.anchors[1];
    if (!b || !c) return true;
    const pad = 2 * (CALLOUT_RADIUS + CALLOUT_MARGIN);
    const wrap = Math.max(CALLOUT_MIN_WRAP, Math.round(x - b.x - pad / 2));
    if (!Number.isFinite(wrap)) return true;
    this.wrapWidth = wrap;
    const mid = proj.pxToPoint(b.x + (wrap + pad) / 2, b.y + b.h / 2, this.paneId);
    if (Number.isFinite(mid.time)) this.anchors = [this.anchors[0], { ...c, time: mid.time }];
    return true;
  }
  schema() {
    if (!this.tv) return super.schema();
    return {
      fields: [
        ...TEXT_FIELDS,
        { path: "style.fillColor", label: "Background", kind: "color", group: "text" },
        { path: "style.lineColor", label: "Border", kind: "color", group: "text" },
        { path: "style.lineWidth", label: "Border width", kind: "number", min: 1, max: 4, step: 1, group: "text" },
        { path: "wordWrap", label: "Text wrap", kind: "boolean", group: "text" }
      ],
      textIsContent: true
    };
  }
  writeProps() {
    if (!this.tv) return void 0;
    return { tv: true, wordWrap: this.wordWrap === true, wrapWidth: this.wrapWidth };
  }
  readProps(props) {
    if (props.tv === true) this.tv = true;
    if (typeof props.wordWrap === "boolean") this.wordWrap = props.wordWrap;
    if (typeof props.wrapWidth === "number" && Number.isFinite(props.wrapWidth)) this.wrapWidth = Math.min(4e3, Math.max(CALLOUT_MIN_WRAP, props.wrapWidth));
  }
};
var TV_CALLOUT_TEXT = "#ffffff";

// src/core/drawings/types/PriceNote.ts
var TV_WHITE = "#FFFFFF";
var PriceNote = class extends CalloutBase {
  constructor(init) {
    super(init);
    this.type = "pricenote";
    if (!init.props) {
      this.tv = true;
      this.labelBorder = TV_LINE_COLOR;
      this.labelColor = TV_WHITE;
      this.labelSize = 12;
      this.labelBold = false;
      this.labelItalic = false;
      this.text = { ...this.text, value: "", color: TV_LINE_COLOR, size: 14, hAlign: "center", vAlign: "top" };
    }
  }
  writeProps() {
    if (!this.tv) return void 0;
    return { tv: true, labelBorder: this.labelBorder, labelColor: this.labelColor, labelSize: this.labelSize, labelBold: this.labelBold === true, labelItalic: this.labelItalic === true };
  }
  readProps(props) {
    if (props.tv !== true) return;
    this.tv = true;
    if (typeof props.labelBorder === "string") this.labelBorder = props.labelBorder;
    if (typeof props.labelColor === "string") this.labelColor = props.labelColor;
    if (typeof props.labelSize === "number" && Number.isFinite(props.labelSize)) this.labelSize = Math.min(48, Math.max(6, props.labelSize));
    if (typeof props.labelBold === "boolean") this.labelBold = props.labelBold;
    if (typeof props.labelItalic === "boolean") this.labelItalic = props.labelItalic;
  }
  defaultLabel() {
    return "";
  }
  /** Sized from the (approximate) pinned price string — the painter formats it precisely. */
  labelText() {
    const p = this.anchors[0]?.price;
    return p == null ? "0.00" : p.toFixed(2);
  }
  /** The label is the auto price, so expose only styling — not a `text.value` field. */
  schema() {
    if (this.tv) return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS, ...LINE_TEXT_ALIGN_FIELDS] };
    return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS.filter((f) => f.path !== "text.value")] };
  }
};

// src/core/drawings/types/Comment.ts
var Comment = class extends CalloutBase {
  constructor() {
    super(...arguments);
    this.type = "comment";
  }
  defaultLabel() {
    return "Comment";
  }
  /** True for an old two-point comment (balloon + tail). */
  get tailed() {
    return !!this.legacy;
  }
  writeProps() {
    return { point: !this.legacy };
  }
  readProps(props) {
    this.legacy = props.point === false;
  }
  anchorSchema() {
    return this.legacy ? super.anchorSchema() : { min: 1, max: 1, slots: [{ role: "p", free: "both" }] };
  }
  /** The bubble: above and right of the point, which is its bottom-left corner. */
  box(proj) {
    if (this.legacy) return super.box(proj);
    const a = this.anchors[0];
    const y = a ? proj.yOf(a.price, this.paneId) : null;
    if (!a || y == null) return null;
    const fs = textPx(this.text?.size);
    const lines = this.labelText().split("\n");
    const cols = Math.max(1, ...lines.map((l) => l.length));
    const w = Math.max(20, cols * fs * 0.6) + 28;
    const h = lines.length * fs * 1.4 + 20;
    return { x: proj.xOf(a.time), y: y - h, w, h };
  }
  points(proj) {
    if (this.legacy) return super.points(proj);
    const a = this.anchors[0];
    const y = a ? proj.yOf(a.price, this.paneId) : null;
    if (!a || y == null) return null;
    const p = [proj.xOf(a.time), y];
    return [p, p];
  }
  hitTest(px, py, proj, tol) {
    if (this.legacy) return super.hitTest(px, py, proj, tol);
    const b = this.box(proj);
    return b != null && pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol);
  }
  translateBody(dt, dp, orig) {
    if (this.legacy) return super.translateBody(dt, dp, orig);
    return orig.map((o) => ({ time: o.time + dt, price: o.price + dp }));
  }
  priceRange() {
    if (this.legacy) return super.priceRange();
    const a = this.anchors[0];
    return a ? { min: a.price, max: a.price } : null;
  }
};

// src/core/drawings/types/Signpost.ts
var TV_SIGNPOST = { plateR: 35, plateGap: 10, padV: 6, padH: 8, wrap: 134, lineGap: 3, poleGap: 3 };
var bodyStart = /* @__PURE__ */ new WeakMap();
var SIGNPOST_R = 16;
var Signpost = class extends CalloutBase {
  constructor(init) {
    super(init);
    this.type = "signpost";
    if (!init.props) {
      this.tv = true;
      this.position = 50;
      this.showImage = false;
      this.emoji = "\u{1F642}";
      this.plateColor = TV_LINE_COLOR;
      this.text = { ...this.text, size: 12 };
    }
  }
  defaultLabel() {
    return "Signpost";
  }
  anchorSchema() {
    if (this.tv) return { min: 1, max: 1, slots: [{ role: "bar", free: "both" }] };
    return super.anchorSchema();
  }
  /** The candle's high (up) or low (down) at the point's bar, in pane pixels, and the pane. */
  candle(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const rect = proj.paneRect?.(this.paneId) ?? { top: 0, height: proj.height };
    const x = proj.xOf(a.time);
    const t0 = proj.pxToPoint(x - 6, 0, this.paneId).time;
    const t1 = proj.pxToPoint(x + 6, 0, this.paneId).time;
    const near = proj.barsInRange?.(Math.min(t0, t1, a.time), Math.max(t0, t1, a.time)) ?? [];
    const bar = near.reduce((best, b) => !best || Math.abs(b.time - a.time) < Math.abs(best.time - a.time) ? b : best, void 0);
    const hi = proj.yOf(bar ? bar.high : a.price, this.paneId);
    const lo = proj.yOf(bar ? bar.low : a.price, this.paneId);
    if (hi == null || lo == null) return null;
    return { x: proj.xOf(a.time), hi: hi - rect.top, lo: lo - rect.top, top: rect.top, h: rect.height };
  }
  /** TradingView's vertical position for a pane y (the inverse of its layout): above the high a % toward the top,
   *  below the low a % toward the bottom. */
  positionAt(y, proj) {
    const c = this.candle(proj);
    if (!c) return null;
    const ly = y - c.top;
    if (ly <= c.hi) return c.hi <= 0 ? 100 : Math.min(100, (c.hi - ly) / c.hi * 100);
    if (ly >= c.lo) return c.h - c.lo <= 0 ? -100 : -Math.min(100, (ly - c.lo) / (c.h - c.lo) * 100);
    return 0;
  }
  /** TradingView's layout (its positionToCoordinate and pane view); `label` is the label's measured size (else an
   *  estimate from the text). */
  tvLayout(proj, label) {
    const c = this.candle(proj);
    if (!c) return null;
    const pos = this.position ?? 50;
    const dir = pos >= 0 ? 1 : -1;
    const pc = dir === 1 ? c.hi : c.lo;
    const r = Math.min(c.h, Math.max(0, dir === 1 ? pc : c.h - pc));
    let f = pc - dir * Math.abs(r * pos / 100);
    if (f >= 0 && f <= c.h) f = Math.min(c.h - 2, Math.max(2, f));
    const poleStart = pc - dir * TV_SIGNPOST.poleGap;
    const size = label ?? this.estimateLabel();
    const u = dir === 1 ? Math.min(poleStart - size.h, f) : Math.max(poleStart + size.h, f);
    const boxTop = dir === 1 ? u : u - size.h;
    const plate = this.showImage === true;
    const extra = plate ? TV_SIGNPOST.plateGap + 2 * TV_SIGNPOST.plateR : 0;
    const near = dir === 1 ? boxTop + size.h : boxTop;
    const poleTo = near + dir * extra;
    const plateC = plate ? near + dir * (TV_SIGNPOST.plateGap + TV_SIGNPOST.plateR) : 0;
    return {
      x: c.x,
      poleFrom: c.top + poleStart,
      poleTo: c.top + poleTo,
      box: { x: c.x - size.w / 2, y: c.top + boxTop, w: size.w, h: size.h },
      plate: plate ? { cx: c.x, cy: c.top + plateC, r: TV_SIGNPOST.plateR } : null,
      handleY: c.top + u
    };
  }
  /** The label's size from its text (the painter measures it exactly). */
  estimateLabel() {
    const fs = textPx(this.text?.size ?? 12);
    const lines = (this.text?.value || " ").split("\n");
    const chars = Math.max(...lines.map((l) => l.length));
    const perLine = Math.max(1, Math.floor(TV_SIGNPOST.wrap / (fs * 0.6)));
    const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
    const w = Math.min(TV_SIGNPOST.wrap, chars * fs * 0.6) + 2 * TV_SIGNPOST.padH;
    return { w, h: rows * fs + (rows - 1) * TV_SIGNPOST.lineGap + 2 * TV_SIGNPOST.padV };
  }
  onPlaced(proj) {
    if (this.tv) {
      const a = this.anchors[0];
      const y = a && proj ? proj.yOf(a.price, this.paneId) : null;
      const pos = y != null && proj ? this.positionAt(y, proj) : null;
      if (pos != null) this.position = Math.round(pos * 100) / 100;
      return;
    }
    const t = this.anchors[0];
    const b = this.anchors[1];
    if (t && b) b.time = t.time;
  }
  /** TradingView's handle slides the signpost up and down its bar. */
  dragHandlePx(index, _x, y, proj) {
    if (!this.tv || index !== 0) return false;
    const pos = this.positionAt(y, proj);
    if (pos != null) this.position = Math.round(pos * 100) / 100;
    return true;
  }
  handleCursor(index) {
    return this.tv && index === 0 ? "ns-resize" : null;
  }
  /** A body drag moves it to another bar and up or down (TradingView's move). */
  translateBodyPx(dx, dy, orig, proj) {
    if (!this.tv || !orig[0]) return null;
    if (!bodyStart.has(orig)) bodyStart.set(orig, this.tvLayout(proj)?.handleY ?? 0);
    const startY = bodyStart.get(orig);
    const pt = proj.pxToPoint(proj.xOf(orig[0].time) + dx, startY + dy, this.paneId);
    const moved = [{ time: Number.isFinite(pt.time) ? pt.time : orig[0].time, price: orig[0].price }];
    const before = this.anchors;
    this.anchors = moved;
    const pos = this.positionAt(startY + dy, proj);
    this.anchors = before;
    if (pos != null) this.position = Math.round(pos * 100) / 100;
    return moved;
  }
  writeProps() {
    if (!this.tv) return void 0;
    return { tv: true, position: this.position, showImage: this.showImage === true, emoji: this.emoji, plateColor: this.plateColor };
  }
  readProps(props) {
    if (props.tv !== true) return;
    this.tv = true;
    if (typeof props.position === "number" && Number.isFinite(props.position)) this.position = Math.max(-100, Math.min(100, props.position));
    if (typeof props.showImage === "boolean") this.showImage = props.showImage;
    if (typeof props.emoji === "string" && props.emoji) this.emoji = props.emoji;
    if (typeof props.plateColor === "string") this.plateColor = props.plateColor;
  }
  handlePoints(proj) {
    if (!this.tv) return super.handlePoints(proj);
    const L = this.tvLayout(proj);
    return L ? [[L.x, L.handleY]] : [];
  }
  bounds(proj) {
    if (!this.tv) return super.bounds(proj);
    return this.tvLayout(proj)?.box ?? null;
  }
  priceRange() {
    return this.tv ? null : super.priceRange();
  }
  schema() {
    const base = super.schema();
    if (!this.tv) return base;
    return {
      ...base,
      fields: [
        { path: "showImage", label: "Emoji pin", kind: "boolean", group: "behavior" },
        ...base.fields.filter((f) => f.path.startsWith("text.") && f.path !== "text.color")
      ]
    };
  }
  /** The bar point and the badge centre, the badge straight above or below the bar. */
  points(proj) {
    const p = super.points(proj);
    return p ? [p[0], [p[0][0], p[1][1]]] : null;
  }
  /** The badge (the label plate above it is measured by the painter). */
  box(proj) {
    const p = this.points(proj);
    if (!p) return null;
    const [cx, cy] = p[1];
    return { x: cx - SIGNPOST_R, y: cy - SIGNPOST_R, w: SIGNPOST_R * 2, h: SIGNPOST_R * 2 };
  }
  hitTest(px, py, proj, tol) {
    if (this.tv) {
      const L = this.tvLayout(proj);
      if (!L) return false;
      if (pointInBox(px, py, L.box.x, L.box.y, L.box.x + L.box.w, L.box.y + L.box.h, tol)) return true;
      if (L.plate && Math.hypot(px - L.plate.cx, py - L.plate.cy) <= L.plate.r + tol) return true;
      return distToSegment(px, py, L.x, L.poleFrom, L.x, L.poleTo) <= Math.max(tol, 3);
    }
    const p = this.points(proj);
    if (!p) return false;
    const b = this.box(proj);
    if (pointInBox(px, py, b.x, b.y, b.x + b.w, b.y + b.h, tol)) return true;
    const text = this.labelText();
    const w = Math.max(20, Math.max(...text.split("\n").map((l) => l.length)) * 8) + 16;
    const lines = text.split("\n").length;
    const top = p[1][1] - SIGNPOST_R - 6 - lines * 18 - 8;
    if (pointInBox(px, py, p[1][0] - w / 2, top, p[1][0] + w / 2, p[1][1] - SIGNPOST_R, tol)) return true;
    return distToSegment(px, py, p[0][0], p[0][1], p[1][0], p[1][1]) <= tol;
  }
  /** A body drag slides the badge up or down its pole; the bar point stays. */
  translateBody(_dt, dp, orig) {
    const t = orig[0];
    const b = orig[1];
    if (!t || !b) return orig.map((o) => ({ time: o.time, price: o.price + dp }));
    return [{ time: t.time, price: t.price }, { time: t.time, price: b.price + dp }];
  }
  constrainHandleDrag() {
    if (this.tv) return;
    const t = this.anchors[0];
    const b = this.anchors[1];
    if (t && b) b.time = t.time;
  }
};

// src/core/drawings/types/ParallelChannel.ts
function defaultChannelLevels(middleLine = true) {
  return [
    { coeff: -0.25, visible: false, lineStyle: "solid", lineWidth: 1 },
    { coeff: 0, visible: true, lineStyle: "solid", lineWidth: 2 },
    { coeff: 0.25, visible: false, lineStyle: "solid", lineWidth: 1 },
    { coeff: 0.5, visible: middleLine, lineStyle: "dashed", lineWidth: 1 },
    { coeff: 0.75, visible: false, lineStyle: "solid", lineWidth: 1 },
    { coeff: 1, visible: true, lineStyle: "solid", lineWidth: 2 },
    { coeff: 1.25, visible: false, lineStyle: "solid", lineWidth: 1 }
  ];
}
var ParallelChannel = class extends SegmentDrawing {
  constructor(init) {
    super(init);
    this.type = "parallelchannel";
    if (!this.levels) this.levels = defaultChannelLevels();
  }
  writeProps() {
    return {
      levels: this.levels.map((l) => ({ ...l })),
      extendLeft: !!this.extendLeft,
      extendRight: !!this.extendRight,
      fillBackground: this.fillBackground !== false
    };
  }
  readProps(props) {
    if (Array.isArray(props.levels)) {
      const base = defaultChannelLevels();
      this.levels = base.map((def, i) => {
        const r = props.levels[i];
        if (!r || typeof r !== "object") return def;
        return {
          coeff: typeof r.coeff === "number" && Number.isFinite(r.coeff) ? r.coeff : def.coeff,
          visible: typeof r.visible === "boolean" ? r.visible : def.visible,
          ...typeof r.color === "string" && r.color ? { color: r.color } : {},
          lineStyle: r.lineStyle === "dashed" || r.lineStyle === "dotted" || r.lineStyle === "solid" ? r.lineStyle : def.lineStyle,
          lineWidth: typeof r.lineWidth === "number" && r.lineWidth >= 1 ? r.lineWidth : def.lineWidth
        };
      });
    } else if (typeof props.middleLine === "boolean") {
      this.levels = defaultChannelLevels(props.middleLine);
    }
    if (typeof props.extendLeft === "boolean") this.extendLeft = props.extendLeft;
    if (typeof props.extendRight === "boolean") this.extendRight = props.extendRight;
    if (typeof props.fillBackground === "boolean") this.fillBackground = props.fillBackground;
  }
  /** The floating toolbar's color / width / dash: the color recolors every level, the width and dash restyle the
   *  channel's two lines (levels 0 and 1); the dialog edits each level on its own. */
  applySettings(patch) {
    super.applySettings(patch);
    if (typeof patch["style.lineColor"] === "string") for (const l of this.levels) delete l.color;
    const main = this.levels.filter((l) => l.coeff === 0 || l.coeff === 1);
    if (typeof patch["style.lineWidth"] === "number") for (const l of main) l.lineWidth = patch["style.lineWidth"];
    const ls = patch["style.lineStyle"];
    if (ls === "solid" || ls === "dashed" || ls === "dotted") for (const l of main) l.lineStyle = ls;
  }
  anchorSchema() {
    return {
      min: 3,
      max: 3,
      slots: [
        { role: "p1", free: "both" },
        { role: "p2", free: "both" },
        { role: "offset", free: "y" }
        // width only
      ]
    };
  }
  /** Price delta of the parallel line from the baseline, measured at the midpoint. */
  offset() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    const c = this.anchors[2];
    if (!a || !b || !c) return 0;
    return c.price - (a.price + b.price) / 2;
  }
  /** Handles, TradingView's: baseline ends, the parallel line's ends, then a square in the middle of each line. */
  handlePoints(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return [];
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (ya == null || yb == null) return [];
    const xa = proj.xOf(a.time);
    const xb = proj.xOf(b.time);
    const pts = [
      [xa, ya],
      [xb, yb]
    ];
    if (this.anchors[2]) {
      const d = this.offset();
      const ya2 = proj.yOf(a.price + d, this.paneId);
      const yb2 = proj.yOf(b.price + d, this.paneId);
      if (ya2 != null && yb2 != null) {
        const xm = proj.xOf(timeBetween(proj, a.time, b.time, 0.5));
        pts.push([xa, ya2], [xb, yb2], [xm, (ya + yb) / 2], [xm, (ya2 + yb2) / 2]);
      }
    }
    return pts;
  }
  /** TradingView marks the channel's four corners on the axes (both lines' ends), not the middle squares. */
  axisPoints() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return this.anchors;
    const d = this.anchors[2] ? this.offset() : 0;
    return [a, b, { time: a.time, price: a.price + d }, { time: b.time, price: b.price + d }];
  }
  /** TradingView: the corners show the plain arrow, the two middle squares the up-down resize cursor. */
  handleCursor(index) {
    return index === 4 || index === 5 ? "ns-resize" : null;
  }
  handleShapes() {
    return ["circle", "circle", "circle", "circle", "square", "square"];
  }
  /** TradingView's handle moves (see the class doc); the offset anchor's time stays at the baseline midpoint. */
  dragHandlePx(index, x, y, proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    const c = this.anchors[2];
    if (!a || !b || !c) return false;
    const pt = proj.pxToPoint(x, y, this.paneId);
    if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
    const off = this.offset();
    const keepWidth = () => {
      c.price = (a.price + b.price) / 2 + off;
      c.time = (a.time + b.time) / 2;
    };
    if (index === 0 || index === 1) {
      this.anchors[index] = { time: pt.time, price: pt.price };
      const na = this.anchors[0];
      const nb = this.anchors[1];
      c.price = (na.price + nb.price) / 2 + off;
      c.time = (na.time + nb.time) / 2;
      return true;
    }
    if (index === 2 || index === 3) {
      const end = index === 2 ? a : b;
      end.time = pt.time;
      const width = pt.price - end.price;
      c.price = (a.price + b.price) / 2 + width;
      c.time = (a.time + b.time) / 2;
      return true;
    }
    if (index === 4) {
      const dp = pt.price - (a.price + b.price) / 2;
      a.price += dp;
      b.price += dp;
      return true;
    }
    if (index === 5) {
      c.price = pt.price;
      c.time = (a.time + b.time) / 2;
      return true;
    }
    keepWidth();
    return false;
  }
  /** The channel spans the baseline's time only (the offset anchor's time is ignored); an extended side has no end. */
  timeExtent() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return {
      min: this.extendLeft ? Number.NEGATIVE_INFINITY : Math.min(a.time, b.time),
      max: this.extendRight ? Number.POSITIVE_INFINITY : Math.max(a.time, b.time)
    };
  }
  /** The baseline (level 0) and parallel line (level 1) ends in px, left end first, extended as set; null while placing. */
  lines(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const d = this.offset();
    let xa = proj.xOf(a.time);
    let xb = proj.xOf(b.time);
    let ya = proj.yOf(a.price, this.paneId);
    let yb = proj.yOf(b.price, this.paneId);
    const ya2r = proj.yOf(a.price + d, this.paneId);
    const yb2r = proj.yOf(b.price + d, this.paneId);
    if (ya == null || yb == null || ya2r == null || yb2r == null) return null;
    let gapA = ya2r - ya;
    let gapB = yb2r - yb;
    if (xa > xb) [xa, ya, gapA, xb, yb, gapB] = [xb, yb, gapB, xa, ya, gapA];
    if (Math.abs(xb - xa) > 1e-6 && (this.extendLeft || this.extendRight)) {
      const slope = (yb - ya) / (xb - xa);
      const gapSlope = (gapB - gapA) / (xb - xa);
      if (this.extendLeft) {
        ya += (0 - xa) * slope;
        gapA += (0 - xa) * gapSlope;
        xa = 0;
      }
      if (this.extendRight) {
        yb += (proj.width - xb) * slope;
        gapB += (proj.width - xb) * gapSlope;
        xb = proj.width;
      }
    }
    return { xa, ya, xb, yb, gapA, gapB };
  }
  geometry(proj) {
    const l = this.lines(proj);
    if (!l) return null;
    const { xa, ya, xb, yb, gapA, gapB } = l;
    const color = this.style.lineColor;
    return {
      segments: [],
      fill: this.fillBackground === false ? null : [
        [xa, ya],
        [xb, yb],
        [xb, yb + gapB],
        [xa, ya + gapA]
      ],
      colored: this.levels.filter((lv) => lv.visible).map((lv) => ({
        seg: [xa, ya + gapA * lv.coeff, xb, yb + gapB * lv.coeff],
        color: lv.color || color,
        lineStyle: lv.lineStyle,
        lineWidth: lv.lineWidth
      }))
    };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const d = this.offset();
    const ks = [0, 1, ...this.levels.filter((l) => l.visible).map((l) => l.coeff)];
    const prices = ks.flatMap((k) => [a.price + d * k, b.price + d * k]);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
  schema() {
    return {
      fields: [
        ...LINE_FIELDS,
        ...FILL_FIELDS,
        { path: "extendLeft", label: "Extend left", kind: "boolean", group: "behavior" },
        { path: "extendRight", label: "Extend right", kind: "boolean", group: "behavior" },
        { path: "fillBackground", label: "Background", kind: "boolean", group: "fill" },
        ...TEXT_FIELDS,
        {
          path: "text.vAlign",
          label: "Text vertical position",
          kind: "select",
          options: [{ value: "top", label: "Top" }, { value: "center", label: "Inside" }, { value: "bottom", label: "Bottom" }],
          group: "text"
        },
        { path: "text.hAlign", label: "Text horizontal position", kind: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }], group: "text" }
      ]
    };
  }
};

// src/core/drawings/types/TrendFigure.ts
var TV_FIGURE_TEXT_V = [{ value: "top", label: "Top" }, { value: "center", label: "Inside" }, { value: "bottom", label: "Bottom" }];
var TrendFigure = class extends SegmentDrawing {
  constructor(init) {
    super(init);
    if (!init.props) {
      this.tv = true;
      this.extendLeft = false;
      this.extendRight = false;
      this.fillBackground = true;
      this.showPrices = false;
      this.priceColor = this.style.lineColor;
      this.priceSize = 12;
      this.priceBold = false;
      this.priceItalic = false;
    }
  }
  /** Every end's price: p1, p2, then the second line at p2's bar and at p1's bar. */
  figurePrices() {
    const [a, b] = this.anchors;
    const s = this.secondLine();
    return a && b && s ? [a.price, b.price, s.atP2, s.atP1] : null;
  }
  /** TradingView's text on a TradingView-look one only. */
  textDefaults() {
    return this.tv ? super.textDefaults() : void 0;
  }
  figureLines(proj) {
    const [a, b] = this.anchors;
    const s = this.secondLine();
    if (!a || !b || !s) return null;
    const xa = proj.xOf(a.time);
    const xb = proj.xOf(b.time);
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    const yc = proj.yOf(s.atP2, this.paneId);
    const yp = proj.yOf(s.atP1, this.paneId);
    if (ya == null || yb == null || yc == null || yp == null) return null;
    const extL = this.extendLeft ? 0 : Math.min(xa, xb);
    const extR = this.extendRight ? Math.max(xa, xb, proj.width) : Math.max(xa, xb);
    const at = (y1, y2, x) => xb === xa ? y1 : y1 + (y2 - y1) * (x - xa) / (xb - xa);
    const lx = xa <= xb ? extL : extR;
    const rx = xa <= xb ? extR : extL;
    return {
      line1: [lx, at(ya, yb, lx), rx, at(ya, yb, rx)],
      line2: [lx, at(yp, yc, lx), rx, at(yp, yc, rx)],
      p1: [xa, ya],
      p2: [xb, yb],
      c: [xb, yc],
      p: [xa, yp]
    };
  }
  /** TradingView's handles: p1, p2, then the second line's ends at p2's and p1's bars. */
  tvHandlePoints(proj) {
    const L = this.figureLines(proj);
    return L ? [L.p1, L.p2, L.c, L.p] : null;
  }
  /** The lines and fill (only p1→p2 while the third point is being placed). */
  tvGeometry(proj) {
    const L = this.figureLines(proj);
    if (!L) {
      const [a, b] = this.anchors;
      if (!a || !b) return null;
      const ya = proj.yOf(a.price, this.paneId);
      const yb = proj.yOf(b.price, this.paneId);
      return ya == null || yb == null ? null : { segments: [[proj.xOf(a.time), ya, proj.xOf(b.time), yb]], fill: null };
    }
    const fill = this.fillBackground !== false ? [[L.line1[0], L.line1[1]], [L.line1[2], L.line1[3]], [L.line2[2], L.line2[3]], [L.line2[0], L.line2[1]]] : null;
    return { segments: [L.line1, L.line2], fill };
  }
  /** An extended side reaches the pane edge, so it stays drawn however far the points scroll off. */
  tvTimeExtent() {
    const [a, b] = this.anchors;
    if (!a || !b) return null;
    return {
      min: this.extendLeft ? Number.NEGATIVE_INFINITY : Math.min(a.time, b.time),
      max: this.extendRight ? Number.POSITIVE_INFINITY : Math.max(a.time, b.time)
    };
  }
  tvPriceRange() {
    const ps = this.figurePrices() ?? this.anchors.slice(0, 2).map((p) => p.price);
    return ps.length ? { min: Math.min(...ps), max: Math.max(...ps) } : null;
  }
  tvSchema() {
    return {
      fields: [
        ...LINE_FIELDS,
        { path: "style.arrowLeft", label: "Left end arrow", kind: "boolean", group: "line" },
        { path: "style.arrowRight", label: "Right end arrow", kind: "boolean", group: "line" },
        { path: "extendLeft", label: "Extend left", kind: "boolean", group: "behavior" },
        { path: "extendRight", label: "Extend right", kind: "boolean", group: "behavior" },
        ...FILL_FIELDS,
        { path: "fillBackground", label: "Background", kind: "boolean", group: "fill" },
        ...TEXT_FIELDS,
        { path: "text.vAlign", label: "Text vertical position", kind: "select", options: TV_FIGURE_TEXT_V, group: "text" },
        { path: "text.hAlign", label: "Text horizontal position", kind: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }], group: "text" }
      ]
    };
  }
  writeProps() {
    if (!this.tv) return void 0;
    return {
      tv: true,
      extendLeft: this.extendLeft === true,
      extendRight: this.extendRight === true,
      fillBackground: this.fillBackground !== false,
      showPrices: this.showPrices === true,
      priceColor: this.priceColor,
      priceSize: this.priceSize,
      priceBold: this.priceBold === true,
      priceItalic: this.priceItalic === true
    };
  }
  readProps(props) {
    if (props.tv !== true) return;
    this.tv = true;
    for (const k of ["extendLeft", "extendRight", "fillBackground", "showPrices", "priceBold", "priceItalic"]) if (typeof props[k] === "boolean") this[k] = props[k];
    if (typeof props.priceColor === "string") this.priceColor = props.priceColor;
    if (typeof props.priceSize === "number" && Number.isFinite(props.priceSize)) this.priceSize = Math.min(48, Math.max(6, props.priceSize));
  }
};

// src/core/drawings/types/DisjointChannel.ts
var DisjointChannel = class extends TrendFigure {
  constructor() {
    super(...arguments);
    this.type = "disjointchannel";
  }
  /** TradingView's mirror line: p3 at p2's bar, p3 + (p2 − p1) at p1's bar. */
  secondLine() {
    const [a, b, c] = this.anchors;
    return this.tv && a && b && c ? { atP2: c.price, atP1: c.price + (b.price - a.price) } : null;
  }
  /** TradingView's handle moves: p2 keeps the middle between itself and p3 (p3 mirrors it); the second line's end at
   *  p2's bar moves p3's price; its end at p1's bar moves p1's bar, and p1's price so that end follows the pointer. */
  dragHandlePx(index, x, y, proj) {
    if (!this.tv || index < 1) return false;
    const [a, b, c] = this.anchors;
    if (!a || !b || !c) return false;
    const pt = proj.pxToPoint(x, y, this.paneId);
    if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
    if (index === 1) this.anchors = [a, { ...b, time: pt.time, price: pt.price }, { ...c, price: b.price + c.price - pt.price }];
    else if (index === 2) this.anchors = [a, b, { ...c, price: pt.price }];
    else this.anchors = [{ ...a, time: pt.time, price: b.price + c.price - pt.price }, b, c];
    return true;
  }
  /** TradingView's second-line end at p2's bar moves up and down only. */
  handleCursor(index) {
    return this.tv && index === 2 ? "ns-resize" : null;
  }
  handlePoints(proj) {
    return (this.tv ? this.tvHandlePoints(proj) : null) ?? super.handlePoints(proj);
  }
  timeExtent() {
    return this.tv ? this.tvTimeExtent() : super.timeExtent();
  }
  anchorSchema() {
    if (this.tv) return { min: 3, max: 3, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }, { role: "p3", free: "y" }] };
    return {
      min: 4,
      max: 4,
      slots: [
        { role: "top1", free: "both" },
        { role: "top2", free: "both" },
        { role: "bot1", free: "both" },
        { role: "bot2", free: "both" }
      ]
    };
  }
  seg(i, j, proj) {
    const a = this.anchors[i];
    const b = this.anchors[j];
    if (!a || !b) return null;
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (ya == null || yb == null) return null;
    return [proj.xOf(a.time), ya, proj.xOf(b.time), yb];
  }
  geometry(proj) {
    if (this.tv) return this.tvGeometry(proj);
    const top = this.seg(0, 1, proj);
    const bot = this.seg(2, 3, proj);
    const segments = [top, bot].filter((s) => s != null);
    if (segments.length === 0) return null;
    const fill = top && bot ? [
      [top[0], top[1]],
      [top[2], top[3]],
      [bot[2], bot[3]],
      [bot[0], bot[1]]
    ] : null;
    return { segments, fill };
  }
  priceRange() {
    if (this.tv) return this.tvPriceRange();
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((a) => a.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    return this.tv ? this.tvSchema() : { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
  }
};

// src/core/drawings/types/FlatTopBottom.ts
var FlatTopBottom = class extends TrendFigure {
  constructor() {
    super(...arguments);
    this.type = "flattopbottom";
  }
  /** TradingView's flat line (module 293769): at p3's price under p1 and p2 alike. */
  secondLine() {
    const f = this.anchors[2];
    return f ? { atP2: f.price, atP1: f.price } : null;
  }
  /** TradingView's flat-line ends: under p2 it moves p2's bar and the flat price, under p1 p1's bar and the price. */
  dragHandlePx(index, x, y, proj) {
    if (!this.tv || index < 2) return false;
    const [a, b, f] = this.anchors;
    if (!a || !b || !f) return false;
    const pt = proj.pxToPoint(x, y, this.paneId);
    if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
    if (index === 2) this.anchors = [a, { ...b, time: pt.time }, { ...f, price: pt.price }];
    else this.anchors = [{ ...a, time: pt.time }, b, { ...f, price: pt.price }];
    return true;
  }
  anchorSchema() {
    return {
      min: 3,
      max: 3,
      slots: [
        { role: "p1", free: "both" },
        { role: "p2", free: "both" },
        { role: "flat", free: "y" }
        // only the flat side's price matters
      ]
    };
  }
  /** Handles: the two baseline ends + the flat-side handle at the baseline midpoint. */
  handlePoints(proj) {
    const tv = this.tv ? this.tvHandlePoints(proj) : null;
    if (tv) return tv;
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return [];
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (ya == null || yb == null) return [];
    const pts = [
      [proj.xOf(a.time), ya],
      [proj.xOf(b.time), yb]
    ];
    const c = this.anchors[2];
    if (c) {
      const yc = proj.yOf(c.price, this.paneId);
      if (yc != null) pts.push([proj.xOf(timeBetween(proj, a.time, b.time, 0.5)), yc]);
    }
    return pts;
  }
  /** The channel spans the baseline's time only (the flat anchor's time is ignored). */
  timeExtent() {
    if (this.tv) return this.tvTimeExtent();
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.time, b.time), max: Math.max(a.time, b.time) };
  }
  geometry(proj) {
    if (this.tv) return this.tvGeometry(proj);
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const xa = proj.xOf(a.time);
    const xb = proj.xOf(b.time);
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (ya == null || yb == null) return null;
    const c = this.anchors[2];
    if (!c) return { segments: [[xa, ya, xb, yb]], fill: null };
    const flatY = proj.yOf(c.price, this.paneId);
    if (flatY == null) return null;
    return {
      segments: [
        [xa, ya, xb, yb],
        // sloped side
        [xa, flatY, xb, flatY]
        // flat side (constant price)
      ],
      fill: [
        [xa, ya],
        [xb, yb],
        [xb, flatY],
        [xa, flatY]
      ]
    };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const prices = [a.price, b.price];
    const c = this.anchors[2];
    if (c) prices.push(c.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
  schema() {
    return this.tv ? this.tvSchema() : { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
  }
};

// src/core/drawings/types/RegressionChannel.ts
var DEVIATIONS = 2;
function defaultRegressionStyle() {
  return {
    midColor: NEUTRAL,
    // neutral gray midline
    midStyle: "solid",
    upperColor: BULLISH,
    upperStyle: "solid",
    lowerColor: BEARISH,
    lowerStyle: "solid",
    upperFill: `${BULLISH}26`,
    // translucent, mid → upper
    lowerFill: `${BEARISH}26`,
    // translucent, mid → lower
    showR2: true
  };
}
function computeRegressionFit(bars) {
  const n = bars.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;
  for (let i = 0; i < n; i += 1) {
    const y = bars[i].close;
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
    sumYY += y * y;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  let sse = 0;
  for (let i = 0; i < n; i += 1) {
    const resid = bars[i].close - (intercept + slope * i);
    sse += resid * resid;
  }
  const sigma = Math.sqrt(sse / n);
  const den = Math.sqrt(denom * (n * sumYY - sumY * sumY));
  const r = den === 0 ? 0 : (n * sumXY - sumX * sumY) / den;
  return {
    t0: bars[0].time,
    t1: bars[n - 1].time,
    mid0: intercept,
    mid1: intercept + slope * (n - 1),
    dev: DEVIATIONS * sigma,
    r2: Math.max(0, Math.min(1, r * r)),
    n
  };
}
var REGRESSION_SOURCES = ["open", "high", "low", "close", "hl2", "hlc3", "ohlc4"];
function defaultRegressionTrend() {
  return {
    upperDev: 2,
    lowerDev: -2,
    useUpper: true,
    useLower: true,
    source: "close",
    base: { show: true, color: "#F236454d", width: 1, style: "dashed" },
    // palette-exempt: TradingView's red 500 at 30 %
    up: { show: true, color: "#2962FF4d", width: 1, style: "solid" },
    // palette-exempt: TradingView's blue 500 at 30 %
    down: { show: true, color: "#2962FF4d", width: 1, style: "solid" },
    // palette-exempt: TradingView's blue 500 at 30 %
    extend: false,
    pearsons: true
  };
}
function opaqueColor(c) {
  if (/^#[0-9a-f]{8}$/i.test(c)) return c.slice(0, 7);
  if (/^#[0-9a-f]{4}$/i.test(c)) return c.slice(0, 4);
  const m = /^rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)$/i.exec(c.replace(/\s/g, ""));
  return m ? `rgb(${m[1]},${m[2]},${m[3]})` : c;
}
function sourceValue(b, src) {
  switch (src) {
    case "open":
      return b.open;
    case "high":
      return b.high;
    case "low":
      return b.low;
    case "hl2":
      return (b.high + b.low) / 2;
    case "hlc3":
      return (b.high + b.low + b.close) / 3;
    case "ohlc4":
      return (b.open + b.high + b.low + b.close) / 4;
    default:
      return b.close;
  }
}
function computeTvRegression(values) {
  const n = values.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const y = values[i];
    sx += i;
    sy += y;
    sxy += i * y;
    sxx += i * i;
    syy += y * y;
  }
  const denom = n * sxx - sx * sx;
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  let sse = 0;
  for (let i = 0; i < n; i += 1) {
    const r = values[i] - (intercept + slope * i);
    sse += r * r;
  }
  const den = Math.sqrt(denom * (n * syy - sy * sy));
  return { base0: intercept, base1: intercept + slope * (n - 1), sd: Math.sqrt(sse / (n - 1)), pearsons: den === 0 ? 0 : Math.abs((n * sxy - sx * sy) / den) };
}
var RegressionChannel = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "regressionchannel";
    /** Last computed price span (midline ± band), cached so autoscale's `priceRange()`
     *  — which gets no projector — can fold the channel in without recomputing. */
    this.cachedRange = null;
    if (!this.reg) this.reg = defaultRegressionStyle();
    if (!init.props) {
      this.tv = true;
      this.trend = defaultRegressionTrend();
    }
  }
  /** TradingView's lines over the bars in the anchors' range (null with under 2 bars). */
  tvLayout(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const from = Math.min(a.time, b.time);
    const to = Math.max(a.time, b.time);
    const bars = proj.barsInRange?.(from, to) ?? null;
    const t = this.trend;
    const f = bars ? computeTvRegression(bars.map((bar) => sourceValue(bar, t.source))) : null;
    if (!bars || !f) return null;
    const at = (dev, end) => (end === 0 ? f.base0 : f.base1) + dev * f.sd;
    const priced = [];
    if (t.useLower) priced.push({ key: "down", p0: at(t.lowerDev, 0), p1: at(t.lowerDev, 1), line: t.down });
    priced.push({ key: "base", p0: f.base0, p1: f.base1, line: t.base });
    if (t.useUpper) priced.push({ key: "up", p0: at(t.upperDev, 0), p1: at(t.upperDev, 1), line: t.up });
    const prices = priced.flatMap((l) => [l.p0, l.p1]);
    this.cachedRange = { min: Math.min(...prices), max: Math.max(...prices) };
    const lines = [];
    let baseY0 = null;
    let baseY1 = null;
    let downY0 = null;
    for (const l of priced) {
      const y0 = proj.yOf(l.p0, this.paneId);
      const y1 = proj.yOf(l.p1, this.paneId);
      if (y0 == null || y1 == null) return null;
      if (l.key === "base") {
        baseY0 = y0;
        baseY1 = y1;
      }
      if (l.key === "down") downY0 = y0;
      if (l.line.show) lines.push({ key: l.key, y0, y1, line: l.line });
    }
    const x0 = proj.xOf(bars[0].time);
    const x1 = proj.xOf(bars[bars.length - 1].time);
    return {
      x0,
      x1,
      xEnd: t.extend ? Math.max(x1, proj.width) : x1,
      baseY0,
      baseY1,
      lines,
      // TradingView: centred under the down line's start, 4 px below, in its colour (opaque).
      pearsons: t.pearsons && downY0 != null ? { x: x0, y: downY0 + 4, text: String(f.pearsons), color: opaqueColor(t.down.color) } : null
    };
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "start", free: "x" }, { role: "end", free: "x" }] };
  }
  /** Fit against the bars in the anchor time-range, caching the price span for autoscale. */
  fit(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const from = Math.min(a.time, b.time);
    const to = Math.max(a.time, b.time);
    const bars = proj.barsInRange?.(from, to) ?? null;
    const f = bars ? computeRegressionFit(bars) : null;
    if (f) {
      this.cachedRange = { min: Math.min(f.mid0, f.mid1) - f.dev, max: Math.max(f.mid0, f.mid1) + f.dev };
    }
    return f;
  }
  /** Resolve the fit to pixel geometry for the painter + hit-test. */
  layout(proj) {
    const f = this.fit(proj);
    if (!f) return null;
    const midY0 = proj.yOf(f.mid0, this.paneId);
    const midY1 = proj.yOf(f.mid1, this.paneId);
    const upperY0 = proj.yOf(f.mid0 + f.dev, this.paneId);
    const upperY1 = proj.yOf(f.mid1 + f.dev, this.paneId);
    const lowerY0 = proj.yOf(f.mid0 - f.dev, this.paneId);
    const lowerY1 = proj.yOf(f.mid1 - f.dev, this.paneId);
    if (midY0 == null || midY1 == null || upperY0 == null || upperY1 == null || lowerY0 == null || lowerY1 == null) return null;
    return {
      x0: proj.xOf(f.t0),
      x1: proj.xOf(f.t1),
      midY0,
      midY1,
      upperY0,
      upperY1,
      lowerY0,
      lowerY1,
      r2: f.r2,
      showR2: this.reg.showR2
    };
  }
  /** The band outline polygon (upper edge left→right, then lower edge right→left). */
  band(proj) {
    const L = this.layout(proj);
    if (!L) return null;
    return [
      [L.x0, L.upperY0],
      [L.x1, L.upperY1],
      [L.x1, L.lowerY1],
      [L.x0, L.lowerY0]
    ];
  }
  hitTest(px, py, proj, tol) {
    if (this.tv) {
      const T = this.tvLayout(proj);
      if (!T) return false;
      const ls = T.lines;
      if (ls.length >= 2) {
        const lo = ls[0];
        const hi = ls[ls.length - 1];
        if (pointInPolygon(px, py, [[T.x0, hi.y0], [T.xEnd, hi.y0 + (hi.y1 - hi.y0) * (T.xEnd - T.x0) / Math.max(1, T.x1 - T.x0)], [T.xEnd, lo.y0 + (lo.y1 - lo.y0) * (T.xEnd - T.x0) / Math.max(1, T.x1 - T.x0)], [T.x0, lo.y0]])) return true;
      }
      return [...ls.map((l) => [l.y0, l.y1]), [T.baseY0, T.baseY1]].some(([y0, y1]) => distToSegment(px, py, T.x0, y0, T.x1, y1) <= tol);
    }
    const L = this.layout(proj);
    if (!L) return false;
    const poly = [
      [L.x0, L.upperY0],
      [L.x1, L.upperY1],
      [L.x1, L.lowerY1],
      [L.x0, L.lowerY0]
    ];
    if (pointInPolygon(px, py, poly)) return true;
    const lines = [
      [L.x0, L.midY0, L.x1, L.midY1],
      [L.x0, L.upperY0, L.x1, L.upperY1],
      [L.x0, L.lowerY0, L.x1, L.lowerY1]
    ];
    return lines.some((s) => distToSegment(px, py, s[0], s[1], s[2], s[3]) <= tol);
  }
  handlePoints(proj) {
    if (this.tv) {
      const T = this.tvLayout(proj);
      if (T) return [[T.x0, T.baseY0], [T.x1, T.baseY1]];
    }
    const L = this.tv ? null : this.layout(proj);
    if (L) return [[L.x0, L.midY0], [L.x1, L.midY1]];
    const pts = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      pts.push([proj.xOf(a.time), y]);
    }
    return pts;
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    if (this.tv) {
      const T = this.tvLayout(proj);
      if (!T) return null;
      const ys2 = [T.baseY0, T.baseY1, ...T.lines.flatMap((l) => [l.y0, l.y1])];
      const y2 = Math.min(...ys2);
      return { x: T.x0, y: y2, w: T.x1 - T.x0, h: Math.max(...ys2) - y2 };
    }
    const poly = this.band(proj);
    if (!poly) return null;
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  priceRange() {
    if (this.cachedRange) return this.cachedRange;
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
  schema() {
    if (this.tv) return { fields: [{ path: "trend.base.width", label: "Line width", kind: "number", min: 1, max: 4, step: 1, group: "line" }] };
    return {
      fields: [
        { path: "reg.midColor", label: "Midline color", kind: "color", group: "line" },
        { path: "reg.midStyle", label: "Midline style", kind: "lineStyle", group: "line" },
        { path: "reg.upperColor", label: "Upper line color", kind: "color", group: "line" },
        { path: "reg.upperStyle", label: "Upper line style", kind: "lineStyle", group: "line" },
        { path: "reg.lowerColor", label: "Lower line color", kind: "color", group: "line" },
        { path: "reg.lowerStyle", label: "Lower line style", kind: "lineStyle", group: "line" },
        { path: "reg.upperFill", label: "Upper fill", kind: "color", group: "fill" },
        { path: "reg.lowerFill", label: "Lower fill", kind: "color", group: "fill" },
        { path: "reg.showR2", label: "Show R\xB2", kind: "boolean", group: "behavior" }
      ]
    };
  }
  writeProps() {
    if (this.tv) return { tv: true, trend: structuredClone(this.trend) };
    return { ...this.reg };
  }
  readProps(props) {
    if (props.tv === true) {
      this.tv = true;
      const d = defaultRegressionTrend();
      const p = props.trend ?? {};
      const line = (k) => ({ ...d[k], ...p[k] ?? {} });
      this.trend = { ...d, ...p, base: line("base"), up: line("up"), down: line("down") };
      if (!REGRESSION_SOURCES.includes(this.trend.source)) this.trend.source = "close";
      return;
    }
    this.reg = { ...defaultRegressionStyle(), ...props };
  }
};

// src/core/drawings/types/AnchoredVwap.ts
var TRANSPARENT_BAND = `${INFO}00`;
function defaultVwapStyle() {
  return {
    midColor: INFO,
    // VWAP midline (opaque)
    midStyle: "solid",
    multiplier: 1,
    upperColor: TRANSPARENT_BAND,
    // band edges hidden by default
    upperStyle: "solid",
    lowerColor: TRANSPARENT_BAND,
    lowerStyle: "solid",
    bandFill: `${INFO}33`
    // band hue at ~20% opacity
  };
}
function computeVwap(bars, mult) {
  const n = bars.length;
  if (n < 1) return null;
  let totalVol = 0;
  for (const b of bars) totalVol += b.volume > 0 ? b.volume : 0;
  const useVol = totalVol > 0;
  let cumW = 0;
  let cumPV = 0;
  let cumP2V = 0;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const b = bars[i];
    const tp = (b.high + b.low + b.close) / 3;
    const w = useVol ? Math.max(0, b.volume) : 1;
    cumW += w;
    cumPV += tp * w;
    cumP2V += tp * tp * w;
    const mid = cumW > 0 ? cumPV / cumW : tp;
    const variance = cumW > 0 ? Math.max(0, cumP2V / cumW - mid * mid) : 0;
    const dev = Math.sqrt(variance) * mult;
    out.push({ time: b.time, mid, upper: mid + dev, lower: mid - dev });
  }
  return out;
}
var AnchoredVwap = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "anchoredvwap";
    /** Last computed price span (min lower … max upper), cached so autoscale's `priceRange()`
     *  — which gets no projector — folds the curve in without recomputing. */
    this.cachedRange = null;
    /** Last computed time span (anchor bar … last bar), cached for `timeExtent()` culling. */
    this.cachedExtent = null;
    if (!this.vwap) this.vwap = defaultVwapStyle();
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "anchor", free: "x" }] };
  }
  /** Compute the VWAP samples from the anchor time forward, caching the price + time spans. */
  series(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const bars = proj.barsInRange?.(a.time, Number.POSITIVE_INFINITY) ?? null;
    if (!bars || bars.length < 1) return null;
    const pts = computeVwap(
      bars.map((b) => ({ time: b.time, high: b.high, low: b.low, close: b.close, volume: b.volume ?? 0 })),
      this.vwap.multiplier
    );
    if (pts && pts.length > 0) {
      let min = Infinity;
      let max = -Infinity;
      for (const p of pts) {
        if (p.lower < min) min = p.lower;
        if (p.upper > max) max = p.upper;
      }
      this.cachedRange = { min, max };
      this.cachedExtent = { min: pts[0].time, max: pts[pts.length - 1].time };
    }
    return pts;
  }
  /** Resolve the samples to pixel polylines for the painter + hit-test. */
  layout(proj) {
    const pts = this.series(proj);
    if (!pts) return null;
    const mid = [];
    const upper = [];
    const lower = [];
    for (const p of pts) {
      const x = proj.xOf(p.time);
      const my = proj.yOf(p.mid, this.paneId);
      const uy = proj.yOf(p.upper, this.paneId);
      const ly = proj.yOf(p.lower, this.paneId);
      if (my == null || uy == null || ly == null) continue;
      mid.push([x, my]);
      upper.push([x, uy]);
      lower.push([x, ly]);
    }
    return mid.length > 0 ? { mid, upper, lower } : null;
  }
  /** The band outline polygon (upper edge left→right, then lower edge right→left). */
  bandPolygon(L) {
    return [...L.upper, ...[...L.lower].reverse()];
  }
  hitTest(px, py, proj, tol) {
    const L = this.layout(proj);
    if (!L) return false;
    if (pointInPolygon(px, py, this.bandPolygon(L))) return true;
    return polylineHit(px, py, L.mid, tol) || polylineHit(px, py, L.upper, tol) || polylineHit(px, py, L.lower, tol);
  }
  handlePoints(proj) {
    const L = this.layout(proj);
    if (L && L.mid.length > 0) return [L.mid[0]];
    const a = this.anchors[0];
    if (!a) return [];
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? [] : [[proj.xOf(a.time), y]];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const L = this.layout(proj);
    if (!L) return null;
    const pts = [...L.upper, ...L.lower];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  priceRange() {
    return this.cachedRange;
  }
  /** Spans anchor→last-bar (cached from the last compute); null before the first paint so it
   *  isn't culled from autoscale prematurely. */
  timeExtent() {
    return this.cachedExtent;
  }
  schema() {
    return {
      fields: [
        { path: "vwap.midColor", label: "VWAP color", kind: "color", group: "line" },
        { path: "vwap.midStyle", label: "VWAP style", kind: "lineStyle", group: "line" },
        { path: "vwap.multiplier", label: "Band multiplier", kind: "number", min: 0.5, max: 5, step: 0.5, group: "behavior" },
        { path: "vwap.upperColor", label: "Upper band color", kind: "color", group: "line" },
        { path: "vwap.lowerColor", label: "Lower band color", kind: "color", group: "line" },
        { path: "vwap.bandFill", label: "Band fill", kind: "color", group: "fill" }
      ]
    };
  }
  writeProps() {
    return { ...this.vwap };
  }
  readProps(props) {
    this.vwap = { ...defaultVwapStyle(), ...props };
  }
};
function polylineHit(px, py, pts, tol) {
  for (let i = 1; i < pts.length; i += 1) {
    if (distToSegment(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= tol) return true;
  }
  return false;
}

// src/core/drawings/types/FixedRangeVolumeProfile.ts
var OUTSIDE_UP = `${BULLISH}66`;
var OUTSIDE_DOWN = `${BEARISH}66`;
var VA_UP = `${BULLISH}BF`;
var VA_DOWN = `${BEARISH}BF`;
function defaultFrvpStyle() {
  return {
    rows: 24,
    valueAreaPct: 70,
    widthPct: 35,
    anchor: "left",
    upColor: OUTSIDE_UP,
    downColor: OUTSIDE_DOWN,
    vaUpColor: VA_UP,
    vaDownColor: VA_DOWN,
    showVah: true,
    vahColor: NEUTRAL,
    vahStyle: "solid",
    showVal: true,
    valColor: NEUTRAL,
    valStyle: "solid",
    showPoc: true,
    pocColor: void 0,
    // theme contrast ink until the user picks a color
    pocStyle: "solid",
    showDevelopingPoc: false,
    developingPocColor: ACCENT,
    developingPocStyle: "dotted",
    showDevelopingVa: false,
    developingVaColor: ACCENT,
    developingVaStyle: "dotted"
  };
}
function clampIndex(k, n) {
  return k < 0 ? 0 : k >= n ? n - 1 : k;
}
function growValueArea(rows, poc, valueAreaFrac) {
  const n = rows.length;
  let total = 0;
  let maxTotal = 0;
  for (let k = 0; k < n; k += 1) {
    const t = rows[k].up + rows[k].down;
    total += t;
    if (t > maxTotal) maxTotal = t;
  }
  const target = total * Math.min(1, Math.max(0, valueAreaFrac));
  let vaFrom = poc;
  let vaTo = poc;
  let acc = maxTotal;
  while (acc < target && (vaFrom > 0 || vaTo < n - 1)) {
    const below = vaFrom > 0 ? rows[vaFrom - 1].up + rows[vaFrom - 1].down : -1;
    const above = vaTo < n - 1 ? rows[vaTo + 1].up + rows[vaTo + 1].down : -1;
    if (above > below) {
      vaTo += 1;
      acc += above;
    } else {
      vaFrom -= 1;
      acc += below;
    }
  }
  return { vaFrom, vaTo };
}
function accumulateBar(rows, min, rowH, bar) {
  const v = bar.volume;
  if (!(v > 0)) return;
  const n = rows.length;
  const side = bar.close >= bar.open ? "up" : "down";
  const lo = Math.min(bar.low, bar.high);
  const hi = Math.max(bar.low, bar.high);
  const kLo = clampIndex(Math.floor((lo - min) / rowH), n);
  const kHi = clampIndex(Math.floor((hi - min) / rowH), n);
  if (!(hi > lo) || kLo === kHi) {
    rows[kLo][side] += v;
    return;
  }
  for (let k = kLo; k <= kHi; k += 1) {
    const bottom = min + k * rowH;
    const covered = Math.min(hi, k === n - 1 ? Infinity : bottom + rowH) - Math.max(lo, k === 0 ? -Infinity : bottom);
    if (covered > 0) rows[k][side] += v * covered / (hi - lo);
  }
}
function findPoc(rows) {
  let maxTotal = 0;
  let poc = 0;
  for (let k = 0; k < rows.length; k += 1) {
    const t = rows[k].up + rows[k].down;
    if (t > maxTotal) {
      maxTotal = t;
      poc = k;
    }
  }
  return maxTotal > 0 ? { poc, maxTotal } : null;
}
function buildEstimatedProfile(bars, rowCount, valueAreaFrac) {
  let min = Infinity;
  let max = -Infinity;
  for (const b of bars) {
    if (!(b.volume > 0)) continue;
    if (b.low < min) min = b.low;
    if (b.high > max) max = b.high;
  }
  if (!Number.isFinite(min)) return null;
  const n = max > min ? Math.max(1, Math.round(rowCount)) : 1;
  const rowH = max > min ? (max - min) / n : 1;
  const rows = Array.from({ length: n }, (_, k) => ({ price: min + k * rowH, up: 0, down: 0 }));
  for (const b of bars) accumulateBar(rows, min, rowH, b);
  const pocInfo = findPoc(rows);
  if (!pocInfo) return null;
  const { poc, maxTotal } = pocInfo;
  const { vaFrom, vaTo } = growValueArea(rows, poc, valueAreaFrac);
  return { rows, rowH, min, maxTotal, poc, vaFrom, vaTo };
}
function computeFixedRangeProfile(bars, rowCount, valueAreaFrac, wantDeveloping) {
  const profile = buildEstimatedProfile(bars, rowCount, valueAreaFrac);
  if (!profile) return null;
  if (!wantDeveloping || bars.length < 1) {
    return { profile, developingPoc: [], developingVaHigh: [], developingVaLow: [] };
  }
  const { min, rowH } = profile;
  const n = profile.rows.length;
  const rows = Array.from({ length: n }, (_, k) => ({ price: min + k * rowH, up: 0, down: 0 }));
  const developingPoc = [];
  const developingVaHigh = [];
  const developingVaLow = [];
  for (const bar of bars) {
    accumulateBar(rows, min, rowH, bar);
    const pocInfo = findPoc(rows);
    if (!pocInfo) continue;
    const { poc } = pocInfo;
    const { vaFrom, vaTo } = growValueArea(rows, poc, valueAreaFrac);
    developingPoc.push({ time: bar.time, price: rows[poc].price + rowH / 2 });
    developingVaHigh.push({ time: bar.time, price: rows[vaTo].price + rowH });
    developingVaLow.push({ time: bar.time, price: rows[vaFrom].price });
  }
  return { profile, developingPoc, developingVaHigh, developingVaLow };
}
var FixedRangeVolumeProfile = class extends Drawing {
  constructor(init) {
    super(init);
    // Widened so TradingView's anchored volume profile (one point, to the last bar) can reuse the whole tool.
    this.type = "fixedrangevp";
    this.cachedRange = null;
    if (!this.frvp) this.frvp = defaultFrvpStyle();
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "start", free: "x" }, { role: "end", free: "x" }] };
  }
  /** The profile's time range [from, to]: between the two anchors (the anchored kind overrides it). */
  timeSpan(_proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return [Math.min(a.time, b.time), Math.max(a.time, b.time)];
  }
  /** Bars in the time range (inclusive), or null when an anchor / the feed is missing. */
  barsInSpan(proj) {
    const span = this.timeSpan(proj);
    if (!span) return null;
    const [from, to] = span;
    const raw = proj.barsInRange?.(from, to) ?? null;
    if (!raw || raw.length < 1) return null;
    return raw.map((bar) => ({
      time: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume ?? 0
    }));
  }
  /** Compute the profile (+ developing series when enabled), caching the price span for autoscale. */
  compute(proj) {
    const bars = this.barsInSpan(proj);
    if (!bars) return null;
    const s = this.frvp;
    const wantDev = s.showDevelopingPoc || s.showDevelopingVa;
    const result = computeFixedRangeProfile(bars, s.rows, s.valueAreaPct / 100, wantDev);
    if (result) {
      const { profile } = result;
      this.cachedRange = {
        min: profile.min,
        max: profile.min + profile.rowH * profile.rows.length
      };
    }
    return result;
  }
  /** Resolve the compute to pixel geometry for the painter + hit-test. */
  layout(proj) {
    const span = this.timeSpan(proj);
    if (!span) return null;
    const computed = this.compute(proj);
    if (!computed) return null;
    const { profile } = computed;
    const [t0, t1] = span;
    const x0 = proj.xOf(t0);
    const x1 = proj.xOf(t1);
    const spanW = Math.abs(x1 - x0);
    const maxW = Math.max(1, Math.min(100, Math.max(0, this.frvp.widthPct)) / 100 * spanW);
    const growRight = this.frvp.anchor === "left";
    const anchorX = growRight ? Math.min(x0, x1) : Math.max(x0, x1);
    const grow = growRight ? 1 : -1;
    const yEdges = [];
    for (let k = 0; k <= profile.rows.length; k += 1) {
      const y = proj.yOf(profile.min + k * profile.rowH, this.paneId);
      if (y == null) return null;
      yEdges.push(y);
    }
    const yAt = (price) => proj.yOf(price, this.paneId);
    const vahPrice = profile.rows[profile.vaTo].price + profile.rowH;
    const valPrice = profile.rows[profile.vaFrom].price;
    const pocPrice = profile.rows[profile.poc].price + profile.rowH / 2;
    const toPoly = (pts) => {
      const out = [];
      for (const p of pts) {
        const y = yAt(p.price);
        if (y == null) continue;
        out.push([proj.xOf(p.time), y]);
      }
      return out;
    };
    return {
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      anchorX,
      maxW,
      grow,
      profile,
      yEdges,
      vahY: yAt(vahPrice),
      valY: yAt(valPrice),
      pocY: yAt(pocPrice),
      developingPoc: toPoly(computed.developingPoc),
      developingVaHigh: toPoly(computed.developingVaHigh),
      developingVaLow: toPoly(computed.developingVaLow)
    };
  }
  hitTest(px, py, proj, tol) {
    const L = this.layout(proj);
    if (!L) return false;
    const left = L.grow === 1 ? L.anchorX : L.anchorX - L.maxW;
    const right = L.grow === 1 ? L.anchorX + L.maxW : L.anchorX;
    const yLo = Math.min(L.yEdges[0], L.yEdges[L.yEdges.length - 1]);
    const yHi = Math.max(L.yEdges[0], L.yEdges[L.yEdges.length - 1]);
    if (pointInPolygon(px, py, [
      [left, yLo],
      [right, yLo],
      [right, yHi],
      [left, yHi]
    ])) return true;
    const hLines = [
      [L.x0, L.vahY],
      [L.x0, L.valY],
      [L.x0, L.pocY]
    ];
    for (const [, y] of hLines) {
      if (y != null && distToSegment(px, py, L.x0, y, L.x1, y) <= tol) return true;
    }
    for (const poly of [L.developingPoc, L.developingVaHigh, L.developingVaLow]) {
      for (let i = 1; i < poly.length; i += 1) {
        if (distToSegment(px, py, poly[i - 1][0], poly[i - 1][1], poly[i][0], poly[i][1]) <= tol) return true;
      }
    }
    return false;
  }
  handlePoints(proj) {
    const L = this.layout(proj);
    if (L && L.pocY != null) return [[L.x0, L.pocY], [L.x1, L.pocY]];
    const pts = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      pts.push([proj.xOf(a.time), y]);
    }
    return pts;
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const L = this.layout(proj);
    if (!L) return null;
    const left = Math.min(L.x0, L.grow === 1 ? L.anchorX : L.anchorX - L.maxW);
    const right = Math.max(L.x1, L.grow === 1 ? L.anchorX + L.maxW : L.anchorX);
    const yLo = Math.min(L.yEdges[0], L.yEdges[L.yEdges.length - 1]);
    const yHi = Math.max(L.yEdges[0], L.yEdges[L.yEdges.length - 1]);
    return { x: left, y: yLo, w: right - left, h: yHi - yLo };
  }
  priceRange() {
    if (this.cachedRange) return this.cachedRange;
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((p) => p.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    return {
      fields: [
        { path: "frvp.rows", label: "Rows", kind: "number", min: 1, max: 500, step: 1, group: "behavior" },
        { path: "frvp.valueAreaPct", label: "Value Area", kind: "number", min: 0, max: 100, step: 1, group: "behavior" },
        { path: "frvp.widthPct", label: "Width %", kind: "number", min: 0, max: 100, step: 1, group: "behavior" },
        {
          path: "frvp.anchor",
          label: "Anchor",
          kind: "select",
          options: [
            { value: "right", label: "Right" },
            { value: "left", label: "Left" }
          ],
          group: "behavior"
        },
        { path: "frvp.upColor", label: "Up Volume", kind: "color", group: "fill" },
        { path: "frvp.downColor", label: "Down Volume", kind: "color", group: "fill" },
        { path: "frvp.vaUpColor", label: "Value Area Up", kind: "color", group: "fill" },
        { path: "frvp.vaDownColor", label: "Value Area Down", kind: "color", group: "fill" },
        { path: "frvp.showVah", label: "VAH", kind: "boolean", group: "line" },
        { path: "frvp.vahColor", label: "VAH color", kind: "color", group: "line" },
        { path: "frvp.vahStyle", label: "VAH style", kind: "lineStyle", options: LINE_STYLE_OPTIONS, group: "line" },
        { path: "frvp.showVal", label: "VAL", kind: "boolean", group: "line" },
        { path: "frvp.valColor", label: "VAL color", kind: "color", group: "line" },
        { path: "frvp.valStyle", label: "VAL style", kind: "lineStyle", options: LINE_STYLE_OPTIONS, group: "line" },
        { path: "frvp.showPoc", label: "POC", kind: "boolean", group: "line" },
        { path: "frvp.pocColor", label: "POC color", kind: "color", group: "line" },
        { path: "frvp.pocStyle", label: "POC style", kind: "lineStyle", options: LINE_STYLE_OPTIONS, group: "line" },
        { path: "frvp.showDevelopingPoc", label: "Developing POC", kind: "boolean", group: "line" },
        { path: "frvp.developingPocColor", label: "Developing POC color", kind: "color", group: "line" },
        { path: "frvp.developingPocStyle", label: "Developing POC style", kind: "lineStyle", options: LINE_STYLE_OPTIONS, group: "line" },
        { path: "frvp.showDevelopingVa", label: "Developing VA", kind: "boolean", group: "line" },
        { path: "frvp.developingVaColor", label: "Developing VA color", kind: "color", group: "line" },
        { path: "frvp.developingVaStyle", label: "Developing VA style", kind: "lineStyle", options: LINE_STYLE_OPTIONS, group: "line" }
      ]
    };
  }
  writeProps() {
    return { ...this.frvp };
  }
  readProps(props) {
    this.frvp = { ...defaultFrvpStyle(), ...props };
  }
};
var AnchoredVolumeProfile = class extends FixedRangeVolumeProfile {
  constructor() {
    super(...arguments);
    this.type = "anchoredvp";
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "start", free: "x" }] };
  }
  timeSpan(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const bars = proj.barsInRange?.(a.time, Number.MAX_SAFE_INTEGER) ?? null;
    const last = bars && bars.length ? bars[bars.length - 1].time : null;
    return last == null || last < a.time ? null : [a.time, last];
  }
  handlePoints(proj) {
    return super.handlePoints(proj).slice(0, 1);
  }
  timeExtent() {
    const a = this.anchors[0];
    return a ? { min: a.time, max: Number.POSITIVE_INFINITY } : null;
  }
};

// src/core/drawings/types/FixedRangeTpoProfile.ts
var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function tpoLetter(periodIndex) {
  return LETTERS[(periodIndex % LETTERS.length + LETTERS.length) % LETTERS.length];
}
function defaultFrtpStyle() {
  return {
    rows: 30,
    periodMin: 30,
    valueAreaPct: 70,
    widthPct: 50,
    anchor: "left",
    display: "letters",
    color: `${NEUTRAL}CC`,
    vaColor: ACCENT,
    showVah: true,
    vahColor: NEUTRAL,
    vahStyle: "solid",
    showVal: true,
    valColor: NEUTRAL,
    valStyle: "solid",
    showPoc: true,
    pocColor: void 0,
    pocStyle: "solid"
  };
}
function clampIndex2(k, n) {
  return k < 0 ? 0 : k >= n ? n - 1 : k;
}
function toPeriods(bars, periodMs) {
  const sorted = [...bars].sort((a, b) => a.time - b.time);
  const out = [];
  let cur = Number.NaN;
  for (const b of sorted) {
    const bucket = Math.floor(b.time / periodMs);
    if (bucket !== cur) {
      out.push({ high: b.high, low: b.low });
      cur = bucket;
    } else {
      const p = out[out.length - 1];
      if (b.high > p.high) p.high = b.high;
      if (b.low < p.low) p.low = b.low;
    }
  }
  return out;
}
function growValueArea2(counts, poc, valueAreaFrac) {
  const n = counts.length;
  let total = 0;
  for (const c of counts) total += c;
  const target = total * Math.min(1, Math.max(0, valueAreaFrac));
  let vaFrom = poc;
  let vaTo = poc;
  let acc = counts[poc];
  while (acc < target && (vaFrom > 0 || vaTo < n - 1)) {
    const below = vaFrom > 0 ? counts[vaFrom - 1] : -1;
    const above = vaTo < n - 1 ? counts[vaTo + 1] : -1;
    if (above > below) {
      vaTo += 1;
      acc += above;
    } else {
      vaFrom -= 1;
      acc += below;
    }
  }
  return { vaFrom, vaTo };
}
function buildTpoProfile(bars, rowCount, periodMs, valueAreaFrac) {
  if (bars.length < 1 || !(periodMs > 0)) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const b of bars) {
    if (b.low < min) min = b.low;
    if (b.high > max) max = b.high;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const n = max > min ? Math.max(1, Math.round(rowCount)) : 1;
  const rowH = max > min ? (max - min) / n : 1;
  const rows = Array.from({ length: n }, (_, k) => ({ price: min + k * rowH, periods: [] }));
  const periods = toPeriods(bars, periodMs);
  periods.forEach((p, i) => {
    const kLo = clampIndex2(Math.floor((p.low - min) / rowH), n);
    const kHi = Math.max(kLo, clampIndex2(Math.ceil((p.high - min) / rowH - 1e-9) - 1, n));
    for (let k = kLo; k <= kHi; k += 1) rows[k].periods.push(i);
  });
  const counts = rows.map((r) => r.periods.length);
  let maxCount = 0;
  for (const c of counts) if (c > maxCount) maxCount = c;
  if (maxCount <= 0) return null;
  const mid = (n - 1) / 2;
  let poc = -1;
  for (let k = 0; k < n; k += 1) {
    if (counts[k] !== maxCount) continue;
    if (poc < 0 || Math.abs(k - mid) < Math.abs(poc - mid)) poc = k;
  }
  const { vaFrom, vaTo } = growValueArea2(counts, poc, valueAreaFrac);
  return { rows, rowH, min, periodCount: periods.length, maxCount, poc, vaFrom, vaTo };
}
var FixedRangeTpoProfile = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "fixedrangetpo";
    this.cachedRange = null;
    if (!this.frtpo) this.frtpo = defaultFrtpStyle();
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "start", free: "x" }, { role: "end", free: "x" }] };
  }
  barsInSpan(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const from = Math.min(a.time, b.time);
    const to = Math.max(a.time, b.time);
    const raw = proj.barsInRange?.(from, to) ?? null;
    if (!raw || raw.length < 1) return null;
    return raw.map((bar) => ({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close }));
  }
  /** Compute the profile, caching the price span for autoscale. */
  compute(proj) {
    const bars = this.barsInSpan(proj);
    if (!bars) return null;
    const s = this.frtpo;
    const profile = buildTpoProfile(bars, s.rows, Math.max(1, s.periodMin) * 6e4, s.valueAreaPct / 100);
    if (profile) this.cachedRange = { min: profile.min, max: profile.min + profile.rowH * profile.rows.length };
    return profile;
  }
  /** Resolve the compute to pixel geometry for the painter + hit-test. */
  layout(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const profile = this.compute(proj);
    if (!profile) return null;
    const x0 = proj.xOf(Math.min(a.time, b.time));
    const x1 = proj.xOf(Math.max(a.time, b.time));
    const spanW = Math.abs(x1 - x0);
    const maxW = Math.max(1, Math.min(100, Math.max(0, this.frtpo.widthPct)) / 100 * spanW);
    const growRight = this.frtpo.anchor === "left";
    const anchorX = growRight ? Math.min(x0, x1) : Math.max(x0, x1);
    const yEdges = [];
    for (let k = 0; k <= profile.rows.length; k += 1) {
      const y = proj.yOf(profile.min + k * profile.rowH, this.paneId);
      if (y == null) return null;
      yEdges.push(y);
    }
    const yAt = (price) => proj.yOf(price, this.paneId);
    return {
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      anchorX,
      maxW,
      grow: growRight ? 1 : -1,
      profile,
      yEdges,
      vahY: yAt(profile.rows[profile.vaTo].price + profile.rowH),
      valY: yAt(profile.rows[profile.vaFrom].price),
      pocY: yAt(profile.rows[profile.poc].price + profile.rowH / 2)
    };
  }
  hitTest(px, py, proj, tol) {
    const L = this.layout(proj);
    if (!L) return false;
    const left = L.grow === 1 ? L.anchorX : L.anchorX - L.maxW;
    const right = L.grow === 1 ? L.anchorX + L.maxW : L.anchorX;
    const yLo = Math.min(L.yEdges[0], L.yEdges[L.yEdges.length - 1]);
    const yHi = Math.max(L.yEdges[0], L.yEdges[L.yEdges.length - 1]);
    if (pointInPolygon(px, py, [[left, yLo], [right, yLo], [right, yHi], [left, yHi]])) return true;
    for (const y of [L.vahY, L.valY, L.pocY]) {
      if (y != null && distToSegment(px, py, L.x0, y, L.x1, y) <= tol) return true;
    }
    return false;
  }
  handlePoints(proj) {
    const L = this.layout(proj);
    if (L && L.pocY != null) return [[L.x0, L.pocY], [L.x1, L.pocY]];
    const pts = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      pts.push([proj.xOf(a.time), y]);
    }
    return pts;
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const L = this.layout(proj);
    if (!L) return null;
    const left = Math.min(L.x0, L.grow === 1 ? L.anchorX : L.anchorX - L.maxW);
    const right = Math.max(L.x1, L.grow === 1 ? L.anchorX + L.maxW : L.anchorX);
    const yLo = Math.min(L.yEdges[0], L.yEdges[L.yEdges.length - 1]);
    const yHi = Math.max(L.yEdges[0], L.yEdges[L.yEdges.length - 1]);
    return { x: left, y: yLo, w: right - left, h: yHi - yLo };
  }
  priceRange() {
    if (this.cachedRange) return this.cachedRange;
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
  schema() {
    return {
      fields: [
        { path: "frtpo.rows", label: "Rows", kind: "number", min: 1, max: 500, step: 1, group: "behavior" },
        { path: "frtpo.periodMin", label: "Period (min)", kind: "number", min: 1, max: 1440, step: 1, group: "behavior" },
        { path: "frtpo.valueAreaPct", label: "Value Area", kind: "number", min: 0, max: 100, step: 1, group: "behavior" },
        { path: "frtpo.widthPct", label: "Width %", kind: "number", min: 0, max: 100, step: 1, group: "behavior" },
        {
          path: "frtpo.anchor",
          label: "Anchor",
          kind: "select",
          options: [
            { value: "right", label: "Right" },
            { value: "left", label: "Left" }
          ],
          group: "behavior"
        },
        {
          path: "frtpo.display",
          label: "Display",
          kind: "select",
          options: [
            { value: "letters", label: "Letters" },
            { value: "blocks", label: "Blocks" }
          ],
          group: "behavior"
        },
        { path: "frtpo.color", label: "TPO", kind: "color", group: "fill" },
        { path: "frtpo.vaColor", label: "Value Area", kind: "color", group: "fill" },
        { path: "frtpo.showVah", label: "VAH", kind: "boolean", group: "line" },
        { path: "frtpo.vahColor", label: "VAH color", kind: "color", group: "line" },
        { path: "frtpo.vahStyle", label: "VAH style", kind: "lineStyle", options: LINE_STYLE_OPTIONS, group: "line" },
        { path: "frtpo.showVal", label: "VAL", kind: "boolean", group: "line" },
        { path: "frtpo.valColor", label: "VAL color", kind: "color", group: "line" },
        { path: "frtpo.valStyle", label: "VAL style", kind: "lineStyle", options: LINE_STYLE_OPTIONS, group: "line" },
        { path: "frtpo.showPoc", label: "POC", kind: "boolean", group: "line" },
        { path: "frtpo.pocColor", label: "POC color", kind: "color", group: "line" },
        { path: "frtpo.pocStyle", label: "POC style", kind: "lineStyle", options: LINE_STYLE_OPTIONS, group: "line" }
      ]
    };
  }
  writeProps() {
    return { ...this.frtpo };
  }
  readProps(props) {
    this.frtpo = { ...defaultFrtpStyle(), ...props };
  }
};

// src/core/drawings/levelPalette.ts
var LEVEL_ANCHOR = NEUTRAL;
var LEVEL_RED = BEARISH;
var LEVEL_ORANGE = WARNING;
var LEVEL_GREEN = "#4caf50";
var LEVEL_TEAL = BULLISH;
var LEVEL_BLUE = INFO;
var LEVEL_PURPLE = "#9c27b0";
var LEVEL_PINK = "#e91e63";
var LEVEL_AQUA = "#26a69a";
var LEVEL_VIOLET = "#ab47bc";
var LEVEL_CORAL = "#ef5350";
var LEVEL_CYAN = "#38c0fd";
var LEVEL_UNITY = "#b2b5be";
var LEVEL_CYCLE = [
  LEVEL_CYAN,
  LEVEL_BLUE,
  LEVEL_TEAL,
  LEVEL_GREEN,
  LEVEL_ORANGE,
  LEVEL_RED,
  LEVEL_PINK,
  LEVEL_PURPLE,
  LEVEL_ANCHOR,
  LEVEL_AQUA,
  LEVEL_VIOLET,
  LEVEL_CORAL
];
function cycleColor(index) {
  return LEVEL_CYCLE[(index % LEVEL_CYCLE.length + LEVEL_CYCLE.length) % LEVEL_CYCLE.length];
}
var RATIO_COLORS = [
  [0, LEVEL_ANCHOR],
  [0.125, LEVEL_RED],
  [0.236, LEVEL_RED],
  [0.25, LEVEL_RED],
  [0.382, LEVEL_ORANGE],
  [0.5, LEVEL_GREEN],
  [0.618, LEVEL_TEAL],
  [0.75, LEVEL_BLUE],
  [0.786, LEVEL_BLUE],
  [1, LEVEL_ANCHOR],
  [1.272, LEVEL_BLUE],
  [1.382, LEVEL_ORANGE],
  [1.618, LEVEL_RED],
  [2, LEVEL_ANCHOR],
  [2.382, LEVEL_ORANGE],
  [2.618, LEVEL_ORANGE],
  [3, LEVEL_ANCHOR],
  [4.236, LEVEL_GREEN],
  [6.854, LEVEL_TEAL],
  [11.09, LEVEL_BLUE]
];
function levelColor(ratio, index = 0) {
  return RATIO_COLORS.find(([r]) => r === ratio)?.[1] ?? cycleColor(index);
}
function fibLevels(specs) {
  return specs.map((spec, i) => {
    const s = typeof spec === "number" ? { ratio: spec } : spec;
    return {
      ratio: s.ratio,
      color: s.color ?? levelColor(s.ratio, i),
      enabled: s.enabled !== false,
      ...s.label ? { label: s.label } : {}
    };
  });
}
function cycleLevels(count, enabledCount = count) {
  return Array.from({ length: count }, (_, i) => ({
    ratio: i + 1,
    color: cycleColor(i),
    enabled: i < enabledCount,
    label: String(i + 1)
  }));
}

// src/core/drawings/types/PitchforkBase.ts
var PITCHFORK_LEVELS = [
  { ratio: 0.25, color: "#ffb74d", enabled: false },
  // palette-exempt: TradingView's level color
  { ratio: 0.382, color: "#81c784", enabled: false },
  // palette-exempt
  { ratio: 0.5, color: "#089981", enabled: true },
  // palette-exempt
  { ratio: 0.618, color: "#089981", enabled: false },
  // palette-exempt
  { ratio: 0.75, color: "#00bcd4", enabled: false },
  // palette-exempt
  { ratio: 1, color: "#2962ff", enabled: true },
  // palette-exempt
  { ratio: 1.5, color: "#9c27b0", enabled: false },
  // palette-exempt
  { ratio: 1.75, color: "#e91e63", enabled: false },
  // palette-exempt
  { ratio: 2, color: "#f77c80", enabled: false }
  // palette-exempt
].map((l) => ({ ...l, lineWidth: 2, lineStyle: "solid" }));
var PITCHFORK_STYLES = [
  { value: "original", label: "Original" },
  { value: "schiff", label: "Schiff" },
  { value: "modifiedschiff", label: "Modified Schiff" },
  { value: "inside", label: "Inside" }
];
var isForkStyle = (v) => PITCHFORK_STYLES.some((s) => s.value === v);
var isLineStyle2 = (v) => v === "solid" || v === "dashed" || v === "dotted";
var PITCHFORK_MEDIAN = LEVEL_RED;
var PitchforkBase = class extends SegmentDrawing {
  /** TradingView's levels for a new one of this tool (a method: the base constructor reads it before subclass fields
   *  exist). */
  factoryLevels() {
    return PITCHFORK_LEVELS;
  }
  constructor(init) {
    super(init);
    const fresh = !init.props;
    if (!this.levels) this.levels = this.factoryLevels().map((l) => ({ ...l }));
    if (this.background === void 0) this.background = true;
    if (this.fillOpacity === void 0) this.fillOpacity = 0.2;
    if (this.extendLines === void 0) this.extendLines = false;
    if (this.medianColor === void 0) this.medianColor = PITCHFORK_MEDIAN;
    if (fresh && this.medianWidth === void 0) this.medianWidth = 2;
    if (fresh && this.medianStyle === void 0) this.medianStyle = "solid";
  }
  /** The style in use: the chosen one, else the tool's own (read lazily: subclass fields are set after this
   *  constructor runs). */
  currentForkStyle() {
    return this.forkStyle ?? this.defaultForkStyle;
  }
  anchorSchema() {
    return {
      min: 3,
      max: 3,
      slots: [
        { role: "pivot", free: "both" },
        { role: "upper", free: "both" },
        { role: "lower", free: "both" }
      ]
    };
  }
  /** The toolbar's color is TradingView's "Use one color" (every level); its thickness and dash restyle every line. */
  applySettings(patch) {
    super.applySettings(patch);
    if (typeof patch["style.lineColor"] === "string") for (const l of this.levels) l.color = patch["style.lineColor"];
    const w = patch["style.lineWidth"];
    if (typeof w === "number") {
      for (const l of this.levels) l.lineWidth = w;
      this.medianWidth = w;
    }
    const ls = patch["style.lineStyle"];
    if (isLineStyle2(ls)) {
      for (const l of this.levels) l.lineStyle = ls;
      this.medianStyle = ls;
    }
  }
  /** The pixel frame once all three points are set; the partial preview segment while placing; null off-pane. */
  frame(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const px = (p) => {
      const y = proj.yOf(p.price, this.paneId);
      return y == null ? null : [proj.xOf(p.time), y];
    };
    const P0 = px(a);
    const P1 = px(b);
    if (!P0 || !P1) return null;
    const c = this.anchors[2];
    if (!c) return { placing: [P0[0], P0[1], P1[0], P1[1]] };
    const P2 = px(c);
    if (!P2) return null;
    const M = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2];
    const style = this.currentForkStyle();
    if (style === "original") return { S: P0, M, P1, P2, d: [M[0] - P0[0], M[1] - P0[1]], construction: [] };
    const half = { time: timeBetween(proj, a.time, b.time, 0.5), price: (a.price + b.price) / 2 };
    const back = [P0[0], P0[1], P1[0], P1[1]];
    if (style === "inside") {
      const B = px(half);
      if (!B) return null;
      return { S: M, M, P1, P2, d: [P2[0] - B[0], P2[1] - B[1]], construction: [[B[0], B[1], P2[0], P2[1]], back] };
    }
    const S = px(style === "schiff" ? { time: a.time, price: half.price } : half);
    if (!S) return null;
    return { S, M, P1, P2, d: [M[0] - S[0], M[1] - S[1]], construction: [back] };
  }
  editableLevels() {
    return this.levels;
  }
  geometry(proj) {
    const f = this.frame(proj);
    if (!f) return null;
    const mColor = this.medianColor || this.style.lineColor;
    const mLine = { color: mColor, lineWidth: this.medianWidth, lineStyle: this.medianStyle };
    if ("placing" in f) return { segments: [f.placing], fill: null };
    const { S, M, P1, P2, d } = f;
    const w = proj.width;
    const h = proj.height;
    const ext = this.extendLines ? "both" : "right";
    const ray = (x, y) => extendRay(x, y, x + d[0], y + d[1], ext, w, h);
    const at = (r, P) => [M[0] + r * (P[0] - M[0]), M[1] + r * (P[1] - M[1])];
    const on = this.levels.filter((l) => l.enabled).sort((a, b) => a.ratio - b.ratio);
    const colored = [];
    colored.push({ seg: ray(S[0], S[1]), ...mLine });
    for (const lv of on) {
      for (const P of [P1, P2]) {
        const b = at(lv.ratio, P);
        colored.push({ seg: ray(b[0], b[1]), color: lv.color, lineWidth: lv.lineWidth, lineStyle: lv.lineStyle });
      }
    }
    const rMax = on.length ? Math.max(1, on[on.length - 1].ratio) : 1;
    const e1 = at(rMax, P1);
    const e2 = at(rMax, P2);
    const baseLine = this.medianWidth === void 0 ? { color: this.style.lineColor } : mLine;
    for (const seg of [[e1[0], e1[1], e2[0], e2[1]], ...f.construction]) colored.push({ seg, ...baseLine });
    const fills = [];
    if (this.background && on.length) {
      const len = Math.hypot(d[0], d[1]) || 1;
      const s = d[0] < 0 ? -1 : 1;
      const fx = s * d[0] * 1e5 / len;
      const fy = s * d[1] * 1e5 / len;
      const band = (a, b) => this.extendLines ? [[a[0] - fx, a[1] - fy], [a[0] + fx, a[1] + fy], [b[0] + fx, b[1] + fy], [b[0] - fx, b[1] - fy]] : [a, [a[0] + fx, a[1] + fy], [b[0] + fx, b[1] + fy], b];
      const rs = [0, ...on.map((l) => l.ratio)];
      for (let i = 1; i < rs.length; i += 1) {
        const color = on[i - 1].color;
        for (const P of [P1, P2]) fills.push({ color, pts: band(at(rs[i - 1], P), at(rs[i], P)) });
      }
    }
    return { segments: [], fill: null, colored, fills, fillAlpha: this.fillOpacity };
  }
  priceRange() {
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((p) => p.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  /** No Text tab (TradingView's pitchfork has none); color and thickness drive the floating toolbar (TradingView's
   *  has no dash control there). */
  schema() {
    return { fields: LINE_FIELDS.filter((f) => f.path !== "style.lineStyle") };
  }
  writeProps() {
    return {
      levels: this.levels.map((l) => ({ ...l })),
      background: this.background,
      fillOpacity: this.fillOpacity,
      extendLines: this.extendLines,
      medianColor: this.medianColor,
      ...this.medianWidth !== void 0 ? { medianWidth: this.medianWidth } : {},
      ...this.medianStyle !== void 0 ? { medianStyle: this.medianStyle } : {},
      ...this.forkStyle !== void 0 ? { forkStyle: this.forkStyle } : {}
    };
  }
  readProps(props) {
    if (Array.isArray(props.levels)) {
      const parsed = props.levels.filter((v) => !!v && typeof v === "object" && typeof v.ratio === "number" && typeof v.color === "string").map((v) => ({
        ratio: v.ratio,
        color: v.color,
        enabled: v.enabled !== false,
        ...typeof v.lineWidth === "number" ? { lineWidth: v.lineWidth } : {},
        ...isLineStyle2(v.lineStyle) ? { lineStyle: v.lineStyle } : {}
      }));
      if (parsed.length) this.levels = parsed;
    }
    if (typeof props.background === "boolean") this.background = props.background;
    if (typeof props.fillOpacity === "number") this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
    if (typeof props.extendLines === "boolean") this.extendLines = props.extendLines;
    if (typeof props.medianColor === "string") this.medianColor = props.medianColor;
    if (typeof props.medianWidth === "number") this.medianWidth = props.medianWidth;
    if (isLineStyle2(props.medianStyle)) this.medianStyle = props.medianStyle;
    if (isForkStyle(props.forkStyle)) this.forkStyle = props.forkStyle;
  }
};

// src/core/drawings/types/Pitchfork.ts
var Pitchfork = class extends PitchforkBase {
  constructor() {
    super(...arguments);
    this.type = "pitchfork";
    this.defaultForkStyle = "original";
  }
};

// src/core/drawings/types/Pitchfan.ts
var PITCHFAN_LEVELS = [
  { ratio: 0.25, color: "#ffb74d", enabled: false },
  // palette-exempt: TradingView's tan-orange-300
  { ratio: 0.382, color: "#81c784", enabled: false },
  // palette-exempt: TradingView's iguana-green-300
  { ratio: 0.5, color: "#00bcd4", enabled: true },
  // palette-exempt: TradingView's sky-blue-500
  { ratio: 0.618, color: "#089981", enabled: false },
  // palette-exempt: TradingView's minty-green-500
  { ratio: 0.75, color: "#00bcd4", enabled: false },
  // palette-exempt: TradingView's sky-blue-500
  { ratio: 1, color: "#2962ff", enabled: true },
  // palette-exempt: TradingView's tv-blue-500
  { ratio: 1.5, color: "#9c27b0", enabled: false },
  // palette-exempt: TradingView's grapes-purple-500
  { ratio: 1.75, color: "#e91e63", enabled: false },
  // palette-exempt: TradingView's berry-pink-500
  { ratio: 2, color: "#f77c80", enabled: false }
  // palette-exempt: TradingView's ripe-red-300
].map((l) => ({ ...l, lineWidth: 2, lineStyle: "solid" }));
var FAR = 1e5;
var Pitchfan = class extends PitchforkBase {
  constructor() {
    super(...arguments);
    this.type = "pitchfan";
    this.defaultForkStyle = "original";
  }
  factoryLevels() {
    return PITCHFAN_LEVELS;
  }
  geometry(proj) {
    const px = (i) => {
      const a = this.anchors[i];
      if (!a) return null;
      const y = proj.yOf(a.price, this.paneId);
      return y == null ? null : [proj.xOf(a.time), y];
    };
    const P0 = px(0);
    const P1 = px(1);
    if (!P0 || !P1) return null;
    const ray = (to) => {
      const dx = to[0] - P0[0];
      const dy = to[1] - P0[1];
      const len = Math.hypot(dx, dy);
      return len < 1e-9 ? [P0[0], P0[1], to[0], to[1]] : [P0[0], P0[1], P0[0] + dx / len * FAR, P0[1] + dy / len * FAR];
    };
    const mLine = { color: this.medianColor || this.style.lineColor, lineWidth: this.medianWidth, lineStyle: this.medianStyle };
    const P2 = px(2);
    if (!P2) return { segments: [], fill: null, colored: [{ seg: ray(P1), ...mLine }] };
    const M = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2];
    const half = [(P2[0] - P1[0]) / 2, (P2[1] - P1[1]) / 2];
    const at = (r) => [M[0] + half[0] * r, M[1] + half[1] * r];
    const colored = [{ seg: ray(M), ...mLine }, { seg: [P1[0], P1[1], P2[0], P2[1]], ...mLine }];
    const fills = [];
    let prev = 0;
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      for (const sign of [1, -1]) {
        const edge = ray(at(sign * lv.ratio));
        if (this.background) {
          const back = ray(at(sign * prev));
          fills.push({ color: lv.color, pts: [P0, [edge[2], edge[3]], [back[2], back[3]]] });
        }
        colored.push({ seg: edge, color: lv.color, lineWidth: lv.lineWidth, lineStyle: lv.lineStyle });
      }
      prev = lv.ratio;
    }
    return { segments: [], fill: null, colored, fills, fillAlpha: this.fillOpacity };
  }
};

// src/core/drawings/types/PitchforkVariant.ts
var PitchforkVariant = class extends PitchforkBase {
};

// src/core/drawings/types/SchiffPitchfork.ts
var SchiffPitchfork = class extends PitchforkVariant {
  constructor() {
    super(...arguments);
    this.type = "schiffpitchfork";
    this.defaultForkStyle = "schiff";
  }
};

// src/core/drawings/types/ModifiedSchiffPitchfork.ts
var ModifiedSchiffPitchfork = class extends PitchforkVariant {
  constructor() {
    super(...arguments);
    this.type = "modifiedschiffpitchfork";
    this.defaultForkStyle = "modifiedschiff";
  }
};

// src/core/drawings/types/InsidePitchfork.ts
var InsidePitchfork = class extends PitchforkBase {
  constructor() {
    super(...arguments);
    this.type = "insidepitchfork";
    this.defaultForkStyle = "inside";
  }
};

// src/core/drawings/types/Arrow.ts
var Arrow = class extends TrendLine {
  constructor() {
    super(...arguments);
    this.type = "arrow";
  }
};

// src/core/drawings/types/Ellipse.ts
var PERIM_SAMPLES = 48;
var Ellipse = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "ellipse";
    if (!init.props) {
      this.tv = true;
      this.fillBackground = true;
    }
  }
  /** TradingView's text: 14 px ripe red, centred. */
  textDefaults() {
    return this.tv ? { color: "#F23645", size: 14, hAlign: "center", vAlign: "center" } : void 0;
  }
  /** Whether the inside is painted (TradingView's Background switch; older ellipses whenever they have a fill). */
  filled() {
    return !!this.style.fillColor && (this.tv ? this.fillBackground !== false : true);
  }
  /** The anchors in pixels. */
  anchorPx(proj) {
    const pts = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      pts.push([proj.xOf(a.time), y]);
    }
    return pts;
  }
  /** TradingView's ends of the other axis: the centre moved its radius each way along the axis' normal. */
  minorEnds(o) {
    const nx = -Math.sin(o.rot);
    const ny = Math.cos(o.rot);
    return [[o.cx + nx * o.ry, o.cy + ny * o.ry], [o.cx - nx * o.ry, o.cy - ny * o.ry]];
  }
  /** TradingView's handle moves: an end of the other axis sets its radius; an axis end moves and keeps it. */
  dragHandlePx(index, x, y, proj) {
    if (!this.tv || this.boxed || this.anchors.length < 3) return false;
    const pt = proj.pxToPoint(x, y, this.paneId);
    if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
    const [a, b, c] = this.anchors;
    if (index >= 2) {
      this.anchors = [a, b, { ...c, time: pt.time, price: pt.price }];
      return true;
    }
    const before = this.oval(proj);
    this.anchors = index === 0 ? [{ ...a, time: pt.time, price: pt.price }, b, c] : [a, { ...b, time: pt.time, price: pt.price }, c];
    const after = this.oval(proj);
    if (before && after) {
      const [end] = this.minorEnds({ ...after, ry: before.ry });
      const w = proj.pxToPoint(end[0], end[1], this.paneId);
      this.anchors = [this.anchors[0], this.anchors[1], { ...c, time: w.time, price: w.price }];
    }
    return true;
  }
  anchorSchema() {
    if (this.boxed) return { min: 2, max: 2, slots: [{ role: "c1", free: "both" }, { role: "c2", free: "both" }] };
    return { min: 3, max: 3, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }, { role: "radius", free: "both" }] };
  }
  writeProps() {
    return { axis: !this.boxed, ...this.tv ? { tv: true, fillBackground: this.fillBackground !== false } : {} };
  }
  readProps(props) {
    this.boxed = props.axis === false;
    if (props.tv === true) this.tv = true;
    if (typeof props.fillBackground === "boolean") this.fillBackground = props.fillBackground;
  }
  /** Centre, radii and tilt (radians, of the first axis) in pixels. */
  oval(proj) {
    const pts = this.anchorPx(proj);
    if (pts.length < 2) return null;
    const [xa, ya] = pts[0];
    const [xb, yb] = pts[1];
    if (this.boxed) return { cx: (xa + xb) / 2, cy: (ya + yb) / 2, rx: Math.abs(xb - xa) / 2, ry: Math.abs(yb - ya) / 2, rot: 0 };
    const rx = Math.hypot(xb - xa, yb - ya) / 2;
    const rot = Math.atan2(yb - ya, xb - xa);
    const c = pts[2];
    const ry = c ? Math.abs((c[0] - xa) * Math.sin(rot) - (c[1] - ya) * Math.cos(rot)) : rx;
    return { cx: (xa + xb) / 2, cy: (ya + yb) / 2, rx, ry, rot };
  }
  perimeter(o) {
    const pts = [];
    const cr = Math.cos(o.rot);
    const sr = Math.sin(o.rot);
    for (let i = 0; i <= PERIM_SAMPLES; i += 1) {
      const t = i / PERIM_SAMPLES * Math.PI * 2;
      const ex = o.rx * Math.cos(t);
      const ey = o.ry * Math.sin(t);
      pts.push([o.cx + ex * cr - ey * sr, o.cy + ex * sr + ey * cr]);
    }
    return pts;
  }
  hitTest(px, py, proj, tol) {
    const o = this.oval(proj);
    if (!o || o.rx < 1 || o.ry < 1) return false;
    const dx = px - o.cx;
    const dy = py - o.cy;
    const u = dx * Math.cos(o.rot) + dy * Math.sin(o.rot);
    const v = -dx * Math.sin(o.rot) + dy * Math.cos(o.rot);
    const f = (u / o.rx) ** 2 + (v / o.ry) ** 2;
    if (this.filled() && f <= 1) return true;
    return distToPolyline(px, py, this.perimeter(o)) <= tol;
  }
  handlePoints(proj) {
    const pts = this.anchorPx(proj);
    if (this.tv && !this.boxed && pts.length >= 3) {
      const o = this.oval(proj);
      if (o) return [pts[0], pts[1], ...this.minorEnds(o)];
    }
    return pts;
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const o = this.oval(proj);
    if (!o) return null;
    const hw = Math.hypot(o.rx * Math.cos(o.rot), o.ry * Math.sin(o.rot));
    const hh = Math.hypot(o.rx * Math.sin(o.rot), o.ry * Math.cos(o.rot));
    return { x: o.cx - hw, y: o.cy - hh, w: hw * 2, h: hh * 2 };
  }
  priceRange() {
    if (this.anchors.length < 2) return null;
    const ps = this.anchors.map((p) => p.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    if (this.tv)
      return {
        fields: [
          ...LINE_FIELDS.filter((f) => f.path !== "style.lineStyle").map((f) => ({ ...f, label: f.label.replace("Line", "Border") })),
          ...FILL_FIELDS,
          { path: "fillBackground", label: "Background", kind: "boolean", group: "fill" },
          ...TEXT_FIELDS
        ]
      };
    return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
  }
};

// src/core/drawings/types/Triangle.ts
var Triangle = class extends SegmentDrawing {
  constructor() {
    super(...arguments);
    this.type = "triangle";
  }
  /** TradingView's look on a new one (module 565760: minty green 2 px, the green at 20 % behind). */
  tvShapeKind() {
    return "area";
  }
  anchorSchema() {
    return {
      min: 3,
      max: 3,
      slots: [
        { role: "v1", free: "both" },
        { role: "v2", free: "both" },
        { role: "v3", free: "both" }
      ]
    };
  }
  geometry(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const px = (p) => {
      const y = proj.yOf(p.price, this.paneId);
      return y == null ? null : [proj.xOf(p.time), y];
    };
    const A = px(a);
    const B = px(b);
    if (!A || !B) return null;
    const c = this.anchors[2];
    if (!c) return { segments: [[A[0], A[1], B[0], B[1]]], fill: null };
    const C = px(c);
    if (!C) return null;
    return {
      segments: [
        [A[0], A[1], B[0], B[1]],
        [B[0], B[1], C[0], C[1]],
        [C[0], C[1], A[0], A[1]]
      ],
      fill: [A, B, C]
    };
  }
  priceRange() {
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((p) => p.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    if (this.tv) return this.tvShapeSchema();
    return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
  }
};

// src/core/drawings/types/Polyline.ts
var Polyline = class extends PathDrawing {
  constructor() {
    super(...arguments);
    this.type = "polyline";
  }
  tvShapeKind() {
    return "polyline";
  }
  geometry(proj) {
    const g = super.geometry(proj);
    if (!g || !this.tv || g.segments.length < 2) return g;
    const fill = [[g.segments[0][0], g.segments[0][1]], ...g.segments.map((sg) => [sg[2], sg[3]])];
    return { ...g, fill };
  }
  schema() {
    return this.tv ? this.tvShapeSchema() : super.schema();
  }
};

// src/core/drawings/types/Freehand.ts
var MAX_SMOOTH = 4;
function chaikin(pts) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    out.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
var MAX_STROKE_POINTS = 2e4;
function tvSmooth(pts, t) {
  if (pts.length < 2) return pts;
  const dense = [pts[0]];
  const densify = pts.length * 5 <= MAX_STROKE_POINTS;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const n2 = densify ? Math.min(5, Math.floor(Math.hypot(x1 - x0, y1 - y0) / t)) : 0;
    for (let k = 0; k < n2 - 1; k += 1) dense.push([x0 + (x1 - x0) * k / n2, y0 + (y1 - y0) * k / n2]);
    dense.push([x1, y1]);
  }
  const n = dense.length;
  const px = new Float64Array(n + 1);
  const py = new Float64Array(n + 1);
  for (let i = 0; i < n; i += 1) {
    px[i + 1] = px[i] + dense[i][0];
    py[i + 1] = py[i] + dense[i][1];
  }
  const [fx, fy] = dense[0];
  const [lx, ly] = dense[n - 1];
  const out = [];
  for (let r = 0; r < n; r += 1) {
    const lo = Math.max(0, r - t + 1);
    const padLo = t - (r - lo + 1);
    const hi = Math.min(n - 1, r + t - 1);
    const padHi = t - (hi - r + 1);
    const sx = px[r + 1] - px[lo] + padLo * fx + px[hi + 1] - px[r] + padHi * lx;
    const sy = py[r + 1] - py[lo] + padLo * fy + py[hi + 1] - py[r] + padHi * ly;
    out.push([0.5 * sx / t, 0.5 * sy / t]);
  }
  out.push(dense[n - 1]);
  return out;
}
var BrushStroke = class extends PathDrawing {
  /** The stroke in pixels, smoothed as set. */
  strokePixels(proj) {
    let pts = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return null;
      pts.push([proj.xOf(a.time), y]);
    }
    if (this.tv) {
      const t = Number.isFinite(this.smooth) ? Math.min(50, Math.max(1, Math.round(this.smooth))) : 5;
      return tvSmooth(pts, t);
    }
    const n = Math.min(MAX_SMOOTH, Math.max(0, Math.round(this.smooth ?? 0)));
    for (let i = 0; i < n && pts.length < MAX_STROKE_POINTS; i += 1) pts = chaikin(pts);
    return pts;
  }
  geometry(proj) {
    const pts = this.strokePixels(proj);
    if (!pts || pts.length < 2) return null;
    const segments = [];
    for (let i = 1; i < pts.length; i += 1) segments.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
    const filled = this.tv ? this.fillBackground === true : true;
    return { segments, fill: filled && this.style.fillColor ? pts : null };
  }
  /** The stroke's two ends with the point before each (for TradingView's line-end arrows), or null. */
  strokeEnds(proj) {
    const pts = this.strokePixels(proj);
    if (!pts || pts.length < 2) return null;
    const k = Math.min(pts.length - 1, 3);
    return { start: [pts[k], pts[0]], end: [pts[pts.length - 1 - k], pts[pts.length - 1]] };
  }
  /** TradingView hits the whole width of the stroke (a 20 px highlighter is clickable 10 px from its middle). */
  hitTest(px, py, proj, tol) {
    return super.hitTest(px, py, proj, this.tv ? Math.max(tol, Math.ceil((this.style.lineWidth ?? 1) / 2)) : tol);
  }
  /** TradingView marks a selected brush's first and last points (not draggable). */
  selectionMarkers(proj) {
    if (!this.tv) return [];
    const pts = this.strokePixels(proj);
    return pts && pts.length ? [pts[0], pts[pts.length - 1]] : [];
  }
  writeProps() {
    if (this.tv) return { tv: true, smooth: this.smooth, fillBackground: this.fillBackground === true };
    return this.smooth ? { smooth: this.smooth } : void 0;
  }
  readProps(props) {
    if (props.tv === true) this.tv = true;
    if (typeof props.fillBackground === "boolean") this.fillBackground = props.fillBackground;
    if (typeof props.smooth === "number" && Number.isFinite(props.smooth)) {
      this.smooth = this.tv ? Math.min(50, Math.max(1, Math.round(props.smooth))) : Math.min(MAX_SMOOTH, Math.max(0, Math.round(props.smooth)));
    }
  }
  placementMode() {
    return "freehand";
  }
  handlePoints(_proj) {
    return [];
  }
  bounds(proj) {
    const xs = [];
    const ys = [];
    for (const a of this.anchors) {
      const y2 = proj.yOf(a.price, this.paneId);
      if (y2 == null) continue;
      xs.push(proj.xOf(a.time));
      ys.push(y2);
    }
    if (xs.length === 0) return null;
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
};
var Freehand = class extends BrushStroke {
  constructor(init) {
    super(init);
    this.type = "freehand";
    if (!init.props) {
      this.tv = true;
      this.smooth = 5;
      this.fillBackground = false;
    }
  }
  schema() {
    if (this.tv) {
      return {
        fields: [
          ...LINE_FIELDS.filter((f) => f.path !== "style.lineStyle"),
          // TradingView draws a brush solid
          { path: "style.arrowLeft", label: "Left end", kind: "boolean", group: "line" },
          { path: "style.arrowRight", label: "Right end", kind: "boolean", group: "line" },
          { path: "fillBackground", label: "Background", kind: "boolean", group: "fill" },
          ...FILL_FIELDS
        ]
      };
    }
    return { fields: [...LINE_FIELDS, { path: "smooth", label: "Smoothing", kind: "number", min: 0, max: MAX_SMOOTH, step: 1, group: "line" }, ...FILL_FIELDS] };
  }
};

// src/core/drawings/types/Highlighter.ts
var HIGHLIGHTER_WIDTHS = [8, 12, 20, 32, 48, 64, 80, 96];
var HIGHLIGHTER_FIELDS = [
  { path: "style.lineColor", label: "Color", kind: "color", group: "line" },
  { path: "style.lineWidth", label: "Width", kind: "number", min: 4, max: 60, step: 1, group: "line" }
];
var TV_HIGHLIGHTER_FIELDS = [
  { path: "style.lineColor", label: "Line", kind: "color", group: "line" },
  { path: "style.lineWidth", label: "Thickness", kind: "select", options: HIGHLIGHTER_WIDTHS.map((w) => ({ value: String(w), label: `${w}px` })), group: "line" }
];
var Highlighter = class extends BrushStroke {
  constructor(init) {
    super(init);
    this.type = "highlighter";
    if (!init.props) {
      this.tv = true;
      this.smooth = 5;
    }
  }
  schema() {
    return { fields: this.tv ? TV_HIGHLIGHTER_FIELDS : HIGHLIGHTER_FIELDS };
  }
};

// src/core/drawings/types/Circle.ts
var Circle = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "circle";
    if (!init.props) {
      this.tv = true;
      this.fillBackground = true;
    }
  }
  /** TradingView's text: 14 px tan orange, centred in the circle. */
  textDefaults() {
    return this.tv ? { color: "#FF9800", size: 14, hAlign: "center", vAlign: "center" } : void 0;
  }
  /** Whether the inside is painted (TradingView's Background switch; older circles whenever they have a fill). */
  filled() {
    return !!this.style.fillColor && (this.tv ? this.fillBackground !== false : true);
  }
  /** The centre and radius in pixels (TradingView's text sits in the square inside it). */
  circle(proj) {
    return this.geom(proj);
  }
  /** TradingView hides the centre handle while the circle shows text (the text moves it): only the edge is left. */
  textHidesCentre() {
    return this.tv === true && !!this.text?.value;
  }
  dragHandlePx(index, x, y, proj) {
    if (!this.textHidesCentre() || index !== 0) return false;
    const pt = proj.pxToPoint(x, y, this.paneId);
    const e = this.anchors[1];
    if (e && Number.isFinite(pt.price) && Number.isFinite(pt.time)) this.anchors = [this.anchors[0], { ...e, time: pt.time, price: pt.price }];
    return true;
  }
  writeProps() {
    return this.tv ? { tv: true, fillBackground: this.fillBackground !== false } : void 0;
  }
  readProps(props) {
    if (props.tv !== true) return;
    this.tv = true;
    if (typeof props.fillBackground === "boolean") this.fillBackground = props.fillBackground;
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "center", free: "both" }, { role: "edge", free: "both" }] };
  }
  geom(proj) {
    const c = this.anchors[0];
    const e = this.anchors[1];
    if (!c || !e) return null;
    const cy = proj.yOf(c.price, this.paneId);
    const ey = proj.yOf(e.price, this.paneId);
    if (cy == null || ey == null) return null;
    const cx = proj.xOf(c.time);
    const ex = proj.xOf(e.time);
    return { cx, cy, r: Math.hypot(ex - cx, ey - cy) };
  }
  hitTest(px, py, proj, tol) {
    const g = this.geom(proj);
    if (!g || g.r < 1) return false;
    const d = Math.hypot(px - g.cx, py - g.cy);
    if (this.filled() && d <= g.r) return true;
    return Math.abs(d - g.r) <= tol;
  }
  handlePoints(proj) {
    const c = this.anchors[0];
    const e = this.anchors[1];
    if (!c || !e) return [];
    const cy = proj.yOf(c.price, this.paneId);
    const ey = proj.yOf(e.price, this.paneId);
    if (cy == null || ey == null) return [];
    if (this.textHidesCentre()) return [[proj.xOf(e.time), ey]];
    return [[proj.xOf(c.time), cy], [proj.xOf(e.time), ey]];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const g = this.geom(proj);
    if (!g) return null;
    return { x: g.cx - g.r, y: g.cy - g.r, w: g.r * 2, h: g.r * 2 };
  }
  priceRange() {
    const c = this.anchors[0];
    const e = this.anchors[1];
    if (!c || !e) return null;
    return { min: Math.min(c.price, e.price), max: Math.max(c.price, e.price) };
  }
  schema() {
    if (this.tv)
      return {
        fields: [
          ...LINE_FIELDS.filter((f) => f.path !== "style.lineStyle").map((f) => ({ ...f, label: f.label.replace("Line", "Border") })),
          ...FILL_FIELDS,
          { path: "fillBackground", label: "Background", kind: "boolean", group: "fill" },
          ...TEXT_FIELDS
        ]
      };
    return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
  }
};

// src/core/drawings/types/RotatedRect.ts
var RotatedRect = class extends SegmentDrawing {
  constructor(init) {
    super(init);
    this.type = "rotatedrect";
    if (!init.props) {
      this.tv = true;
      this.fillBackground = true;
    }
  }
  /** TradingView's corners in pixels: p1 and p2 moved half the width each way along the axis' normal (null until
   *  the width point is placed). */
  tvCorners(proj) {
    const A = this.px(proj, 0);
    const B = this.px(proj, 1);
    const W = this.px(proj, 2);
    if (!A || !B || !W) return null;
    const ex = B[0] - A[0];
    const ey = B[1] - A[1];
    const len = Math.hypot(ex, ey);
    if (len < 1e-6) return null;
    const nx = ey / len;
    const ny = -ex / len;
    const d = Math.abs((W[0] - A[0]) * nx + (W[1] - A[1]) * ny);
    return {
      p1: A,
      p2: B,
      corners: [
        [A[0] + nx * d, A[1] + ny * d],
        [B[0] + nx * d, B[1] + ny * d],
        [B[0] - nx * d, B[1] - ny * d],
        [A[0] - nx * d, A[1] - ny * d]
      ]
    };
  }
  handlePoints(proj) {
    const T = this.tv ? this.tvCorners(proj) : null;
    return T ? [T.p1, T.p2, ...T.corners] : super.handlePoints(proj);
  }
  /** TradingView's handle moves: a corner sets the width (the width point follows it); p1 or p2 moves the axis and
   *  keeps the width. */
  dragHandlePx(index, x, y, proj) {
    if (!this.tv || this.anchors.length < 3) return false;
    const pt = proj.pxToPoint(x, y, this.paneId);
    if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
    const [a, b, w] = this.anchors;
    if (index >= 2) {
      this.anchors = [a, b, { ...w, time: pt.time, price: pt.price }];
      return true;
    }
    const T = this.tvCorners(proj);
    const half = T ? Math.hypot(T.corners[0][0] - T.p1[0], T.corners[0][1] - T.p1[1]) : 0;
    const moved = index === 0 ? [{ ...a, time: pt.time, price: pt.price }, b] : [a, { ...b, time: pt.time, price: pt.price }];
    this.anchors = [moved[0], moved[1], w];
    const A = this.px(proj, 0);
    const B = this.px(proj, 1);
    if (A && B) {
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
      const wp = proj.pxToPoint(A[0] + (B[1] - A[1]) / len * half, A[1] - (B[0] - A[0]) / len * half, this.paneId);
      this.anchors = [this.anchors[0], this.anchors[1], { ...w, time: wp.time, price: wp.price }];
    }
    return true;
  }
  writeProps() {
    return this.tv ? { tv: true, fillBackground: this.fillBackground !== false } : void 0;
  }
  readProps(props) {
    if (props.tv !== true) return;
    this.tv = true;
    if (typeof props.fillBackground === "boolean") this.fillBackground = props.fillBackground;
  }
  anchorSchema() {
    return { min: 3, max: 3, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }, { role: "w", free: "both" }] };
  }
  px(proj, i) {
    const a = this.anchors[i];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  geometry(proj) {
    const T = this.tv ? this.tvCorners(proj) : null;
    if (T) {
      const c = T.corners;
      return {
        segments: c.map((p, i) => [p[0], p[1], c[(i + 1) % 4][0], c[(i + 1) % 4][1]]),
        fill: this.fillBackground !== false ? c : null
      };
    }
    const A = this.px(proj, 0);
    const B = this.px(proj, 1);
    if (!A || !B) return null;
    const W = this.px(proj, 2);
    if (!W || this.anchors.length < 3) {
      return { segments: [[A[0], A[1], B[0], B[1]]], fill: null };
    }
    const vx = B[0] - A[0];
    const vy = B[1] - A[1];
    const len = Math.hypot(vx, vy);
    if (len < 1e-6) return { segments: [[A[0], A[1], B[0], B[1]]], fill: null };
    const nx = -vy / len;
    const ny = vx / len;
    const h = (W[0] - A[0]) * nx + (W[1] - A[1]) * ny;
    const ox = nx * h;
    const oy = ny * h;
    const C0 = A;
    const C1 = B;
    const C2 = [B[0] + ox, B[1] + oy];
    const C3 = [A[0] + ox, A[1] + oy];
    return {
      segments: [
        [C0[0], C0[1], C1[0], C1[1]],
        [C1[0], C1[1], C2[0], C2[1]],
        [C2[0], C2[1], C3[0], C3[1]],
        [C3[0], C3[1], C0[0], C0[1]]
      ],
      fill: [C0, C1, C2, C3]
    };
  }
  priceRange() {
    if (this.anchors.length === 0) return null;
    if (this.tv && this.anchors.length >= 3) {
      const [a, b, w] = this.anchors;
      const off = Math.abs(w.price - (a.price + b.price) / 2);
      const ps2 = [a.price - off, a.price + off, b.price - off, b.price + off];
      return { min: Math.min(...ps2), max: Math.max(...ps2) };
    }
    const ps = this.anchors.map((a) => a.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    if (this.tv)
      return {
        fields: [
          ...LINE_FIELDS.filter((f) => f.path !== "style.lineStyle").map((f) => ({ ...f, label: f.label.replace("Line", "Border") })),
          ...FILL_FIELDS,
          { path: "fillBackground", label: "Background", kind: "boolean", group: "fill" }
        ]
      };
    return { fields: [...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace("Line", "Border") })), ...FILL_FIELDS, ...TEXT_FIELDS] };
  }
};

// src/core/drawings/types/Path.ts
var Path = class extends PathDrawing {
  constructor(init) {
    super(init);
    this.type = "path";
    if (!init.props) {
      this.tv = true;
      this.style = { ...this.style, arrowLeft: this.style.arrowLeft ?? false, arrowRight: this.style.arrowRight ?? true };
    }
  }
  finishesOnSamePoint() {
    return this.tv === true;
  }
  /** TradingView hits the whole width of the line. */
  hitTest(px, py, proj, tol) {
    return super.hitTest(px, py, proj, this.tv ? Math.max(tol, Math.ceil((this.style.lineWidth ?? 1) / 2)) : tol);
  }
  schema() {
    if (!this.tv) return super.schema();
    return {
      fields: [
        ...LINE_FIELDS,
        { path: "style.arrowLeft", label: "Left end", kind: "boolean", group: "line" },
        { path: "style.arrowRight", label: "Right end", kind: "boolean", group: "line" }
      ]
    };
  }
  writeProps() {
    return this.tv ? { tv: true } : void 0;
  }
  readProps(props) {
    if (props.tv === true) this.tv = true;
  }
};

// src/core/drawings/types/Arc.ts
var ARC_SAMPLES = 40;
var Arc = class extends SegmentDrawing {
  constructor() {
    super(...arguments);
    this.type = "arc";
  }
  /** TradingView's look on a new one (module 238807: berry pink 2 px, the pink at 20 % behind). */
  tvShapeKind() {
    return "area";
  }
  anchorSchema() {
    return { min: 3, max: 3, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }, { role: "apex", free: "both" }] };
  }
  px(proj, i) {
    const a = this.anchors[i];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  geometry(proj) {
    const A = this.px(proj, 0);
    const B = this.px(proj, 1);
    if (!A || !B) return null;
    const C = this.anchors.length >= 3 ? this.px(proj, 2) : null;
    if (!C) return { segments: [[A[0], A[1], B[0], B[1]]], fill: null };
    const Mx = (A[0] + B[0]) / 2;
    const My = (A[1] + B[1]) / 2;
    const hx = (B[0] - A[0]) / 2;
    const hy = (B[1] - A[1]) / 2;
    const len = Math.hypot(hx, hy);
    if (len < 1e-6) return { segments: [[A[0], A[1], B[0], B[1]]], fill: null };
    let nx = -hy / len;
    let ny = hx / len;
    const dx = C[0] - Mx;
    const dy = C[1] - My;
    let off = dx * nx + dy * ny;
    if (off < 0) {
      nx = -nx;
      ny = -ny;
      off = -off;
    }
    const c = Math.max(-0.995, Math.min(0.995, (dx * hx + dy * hy) / (len * len)));
    const k = off / Math.sqrt(1 - c * c);
    const pts = [];
    for (let i = 0; i <= ARC_SAMPLES; i += 1) {
      const t = i / ARC_SAMPLES * Math.PI;
      const cs = Math.cos(t);
      const sn = Math.sin(t);
      pts.push([Mx + cs * hx + sn * k * nx, My + cs * hy + sn * k * ny]);
    }
    const segments = [];
    for (let i = 1; i < pts.length; i += 1) segments.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
    segments.push([pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]]);
    return { segments, fill: pts };
  }
  priceRange() {
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((a) => a.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    if (this.tv) return this.tvShapeSchema();
    return { fields: [...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace("Line", "Border") })), ...FILL_FIELDS, ...TEXT_FIELDS] };
  }
};

// src/core/drawings/types/Curve.ts
var CURVE_SAMPLES = 40;
var Curve = class extends SegmentDrawing {
  constructor() {
    super(...arguments);
    this.type = "curve";
  }
  /** TradingView's look on a new one (module 499867: TradingView blue 2 px, no background). */
  tvShapeKind() {
    return "curve";
  }
  anchorSchema() {
    return { min: 3, max: 3, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }, { role: "control", free: "both" }] };
  }
  px(proj, i) {
    const a = this.anchors[i];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  geometry(proj) {
    const P0 = this.px(proj, 0);
    const P2 = this.px(proj, 1);
    if (!P0 || !P2) return null;
    const C = this.px(proj, 2);
    if (!C || this.anchors.length < 3) {
      return { segments: [[P0[0], P0[1], P2[0], P2[1]]], fill: null };
    }
    const pts = [];
    for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
      const t = i / CURVE_SAMPLES;
      const u = 1 - t;
      pts.push([u * u * P0[0] + 2 * u * t * C[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * C[1] + t * t * P2[1]]);
    }
    const segments = [];
    for (let i = 1; i < pts.length; i += 1) segments.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
    return { segments, fill: pts };
  }
  priceRange() {
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((a) => a.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    if (this.tv) return this.tvShapeSchema();
    return { fields: [...LINE_FIELDS, ...FILL_FIELDS, ...TEXT_FIELDS] };
  }
};

// src/core/drawings/types/ArrowMark.ts
var GLYPH = { head: 12, headW: 9.75, stemW: 5, len: 22 };
var ArrowMark = class extends Drawing {
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "p", free: "both" }] };
  }
  /** The filled glyph polygon in pixel space, tip at the anchor. */
  glyphPoints(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    if (y == null) return null;
    const x = proj.xOf(a.time);
    const { head, headW, stemW, len } = GLYPH;
    const base = [
      [0, 0],
      [-headW, head],
      [-stemW, head],
      [-stemW, len],
      [stemW, len],
      [stemW, head],
      [headW, head]
    ];
    const dir = this.dir();
    const rot = ([bx, by]) => {
      switch (dir) {
        case "up":
          return [bx, by];
        case "down":
          return [bx, -by];
        case "left":
          return [by, bx];
        default:
          return [-by, bx];
      }
    };
    return base.map((p) => {
      const [rx, ry] = rot(p);
      return [x + rx, y + ry];
    });
  }
  hitTest(px, py, proj, _tol) {
    const g = this.glyphPoints(proj);
    return g != null && pointInPolygon(px, py, g);
  }
  /** The tip, where the marker points. */
  tip(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  /** TradingView's: no handle ring; the whole arrow drags its point. */
  handlePoints(_proj) {
    return [];
  }
  /** TradingView marks the selected arrow's point with its small marker. */
  selectionMarkers(proj) {
    const t = this.tip(proj);
    return t ? [t] : [];
  }
  /** Which way it points (the painter places the text past its tail). */
  direction() {
    return this.dir();
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const g = this.glyphPoints(proj);
    if (!g) return null;
    const xs = g.map((p) => p[0]);
    const ys = g.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  priceRange() {
    const a = this.anchors[0];
    return a ? { min: a.price, max: a.price } : null;
  }
  schema() {
    return { fields: [{ path: "style.lineColor", label: "Color", kind: "color", group: "line" }, ...TEXT_FIELDS] };
  }
};
var ArrowMarkUp = class extends ArrowMark {
  constructor() {
    super(...arguments);
    this.type = "arrowmarkup";
  }
  dir() {
    return "up";
  }
};
var ArrowMarkDown = class extends ArrowMark {
  constructor() {
    super(...arguments);
    this.type = "arrowmarkdown";
  }
  dir() {
    return "down";
  }
};

// src/core/drawings/types/GlyphStamp.ts
var GLYPH_OPTIONS = ["\u2605", "\u2606", "\u25CF", "\u25C6", "\u25B2", "\u25BC", "\u27A4", "\u2691", "\u271A", "\u2715", "\u2764", "\u2666"];
var STAMP_SIZE_OPTIONS = ["small", "normal", "large", "huge"];
var STAMP_PX = { small: 16, normal: 22, large: 32, huge: 44 };
var GlyphStamp = class extends Drawing {
  constructor(init) {
    super(init);
    if (!this.glyph) this.glyph = this.defaultGlyph();
    if (!this.size) this.size = "normal";
  }
  /** The on-screen glyph size in px for the current named size. */
  sizePx() {
    return STAMP_PX[this.size] ?? STAMP_PX.normal;
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "p", free: "both" }] };
  }
  /** The anchor pixel (the glyph box is sizePx() square, centered here). */
  center(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  hitTest(px, py, proj, tol) {
    const c = this.center(proj);
    if (!c) return false;
    const r = this.sizePx() / 2 + tol;
    return Math.abs(px - c[0]) <= r && Math.abs(py - c[1]) <= r;
  }
  handlePoints(proj) {
    const c = this.center(proj);
    return c ? [c] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const c = this.center(proj);
    if (!c) return null;
    const s = this.sizePx();
    return { x: c[0] - s / 2, y: c[1] - s / 2, w: s, h: s };
  }
  priceRange() {
    const a = this.anchors[0];
    return a ? { min: a.price, max: a.price } : null;
  }
  schema() {
    return {
      fields: [
        { path: "glyph", label: "Icon", kind: "select", options: GLYPH_OPTIONS.map((g) => ({ value: g, label: g })), group: "line" },
        { path: "size", label: "Size", kind: "select", options: STAMP_SIZE_OPTIONS.map((s) => ({ value: s, label: s })), group: "line" },
        { path: "style.lineColor", label: "Color", kind: "color", group: "line" },
        ...TEXT_FIELDS
      ]
    };
  }
  writeProps() {
    return { glyph: this.glyph, size: this.size };
  }
  readProps(props) {
    if (typeof props.glyph === "string") this.glyph = props.glyph;
    if (typeof props.size === "string") this.size = props.size;
  }
};
var FlagMark = class extends GlyphStamp {
  constructor(init) {
    super(init);
    this.type = "flagmark";
    if (!init.props) this.tv = true;
  }
  defaultGlyph() {
    return "\u2691";
  }
  /** TradingView's flag: a 20 px pole on the point, its pennant to the right; grabbed in its 19 × 20 box. */
  hitTest(px, py, proj, tol) {
    if (!this.tv) return super.hitTest(px, py, proj, tol);
    const c = this.center(proj);
    return !!c && px >= c[0] && px <= c[0] + 19 && py >= c[1] - 20 && py <= c[1];
  }
  bounds(proj) {
    if (!this.tv) return super.bounds(proj);
    const c = this.center(proj);
    return c ? { x: c[0], y: c[1] - 20, w: 19, h: 20 } : null;
  }
  writeProps() {
    return { ...super.writeProps(), ...this.tv ? { tv: true } : {} };
  }
  readProps(props) {
    super.readProps(props);
    if (props.tv === true) this.tv = true;
  }
};
var IconStamp = class extends GlyphStamp {
  constructor() {
    super(...arguments);
    this.type = "iconstamp";
  }
  defaultGlyph() {
    return "\u2605";
  }
};

// src/core/drawings/assets/emojiGroups.ts
var EMOJI_GROUPS = [
  { title: "Smileys & People", tab: "\u{1F600}", emojis: ["\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}", "\u{1F606}", "\u{1F605}", "\u{1F602}", "\u{1F923}", "\u263A\uFE0F", "\u{1F60A}", "\u{1F607}", "\u{1F642}", "\u{1F643}", "\u{1F609}", "\u{1F60C}", "\u{1F60D}", "\u{1F970}", "\u{1F618}", "\u{1F617}", "\u{1F619}", "\u{1F61A}", "\u{1F60B}", "\u{1F61B}", "\u{1F61D}", "\u{1F61C}", "\u{1F92A}", "\u{1F928}", "\u{1F9D0}", "\u{1F913}", "\u{1F60E}", "\u{1F929}", "\u{1F973}", "\u{1F60F}", "\u{1F612}", "\u{1F61E}", "\u{1F614}", "\u{1F61F}", "\u{1F615}", "\u{1F641}", "\u2639\uFE0F", "\u{1F623}", "\u{1F616}", "\u{1F62B}", "\u{1F629}", "\u{1F97A}", "\u{1F622}", "\u{1F62D}", "\u{1F624}", "\u{1F620}", "\u{1F621}", "\u{1F92C}", "\u{1F92F}", "\u{1F633}", "\u{1F975}", "\u{1F976}", "\u{1F631}", "\u{1F628}", "\u{1F630}", "\u{1F625}", "\u{1F613}", "\u{1F917}", "\u{1F914}", "\u{1F92D}", "\u{1F92B}", "\u{1F925}", "\u{1F636}", "\u{1F610}", "\u{1F611}", "\u{1F62C}", "\u{1F644}", "\u{1F62F}", "\u{1F626}", "\u{1F627}", "\u{1F62E}", "\u{1F632}", "\u{1F971}", "\u{1F634}", "\u{1F924}", "\u{1F62A}", "\u{1F635}", "\u{1F910}", "\u{1F974}", "\u{1F922}", "\u{1F92E}", "\u{1F927}", "\u{1F637}", "\u{1F912}", "\u{1F915}", "\u{1F911}", "\u{1F920}", "\u{1F608}", "\u{1F47F}", "\u{1F479}", "\u{1F47A}", "\u{1F921}", "\u{1F4A9}", "\u{1F47B}", "\u{1F480}", "\u2620\uFE0F", "\u{1F47D}", "\u{1F47E}", "\u{1F916}", "\u{1F383}", "\u{1F63A}", "\u{1F638}", "\u{1F639}", "\u{1F63B}", "\u{1F63C}", "\u{1F63D}", "\u{1F640}", "\u{1F63F}", "\u{1F63E}", "\u{1F44B}", "\u{1F91A}", "\u{1F590}", "\u270B", "\u{1F596}", "\u{1F44C}", "\u{1F90F}", "\u270C\uFE0F", "\u{1F91E}", "\u{1F91F}", "\u{1F918}", "\u{1F919}", "\u{1F448}", "\u{1F449}", "\u{1F446}", "\u{1F595}", "\u{1F447}", "\u261D\uFE0F", "\u{1F44D}", "\u{1F44E}", "\u270A", "\u{1F44A}", "\u{1F91B}", "\u{1F91C}", "\u{1F44F}", "\u{1F64C}", "\u{1F450}", "\u{1F932}", "\u{1F91D}", "\u{1F64F}", "\u270D\uFE0F", "\u{1F485}", "\u{1F933}", "\u{1F4AA}", "\u{1F9BE}", "\u{1F9B5}", "\u{1F9BF}", "\u{1F9B6}", "\u{1F442}", "\u{1F9BB}", "\u{1F443}", "\u{1F9E0}", "\u{1F9B7}", "\u{1F9B4}", "\u{1F440}", "\u{1F441}", "\u{1F445}", "\u{1F444}", "\u{1F48B}", "\u{1FA78}", "\u{1F476}", "\u{1F9D2}", "\u{1F466}", "\u{1F467}", "\u{1F9D1}", "\u{1F471}", "\u{1F468}", "\u{1F9D4}", "\u{1F468}\u200D\u{1F9B0}", "\u{1F468}\u200D\u{1F9B1}", "\u{1F468}\u200D\u{1F9B3}", "\u{1F468}\u200D\u{1F9B2}", "\u{1F469}", "\u{1F469}\u200D\u{1F9B0}", "\u{1F9D1}\u200D\u{1F9B0}", "\u{1F469}\u200D\u{1F9B1}", "\u{1F9D1}\u200D\u{1F9B1}", "\u{1F469}\u200D\u{1F9B3}", "\u{1F9D1}\u200D\u{1F9B3}", "\u{1F469}\u200D\u{1F9B2}", "\u{1F9D1}\u200D\u{1F9B2}", "\u{1F471}\u200D\u2640\uFE0F", "\u{1F471}\u200D\u2642\uFE0F", "\u{1F9D3}", "\u{1F474}", "\u{1F475}", "\u{1F64D}", "\u{1F64D}\u200D\u2642\uFE0F", "\u{1F64D}\u200D\u2640\uFE0F", "\u{1F64E}", "\u{1F64E}\u200D\u2642\uFE0F", "\u{1F64E}\u200D\u2640\uFE0F", "\u{1F645}", "\u{1F645}\u200D\u2642\uFE0F", "\u{1F645}\u200D\u2640\uFE0F", "\u{1F646}", "\u{1F646}\u200D\u2642\uFE0F", "\u{1F646}\u200D\u2640\uFE0F", "\u{1F481}", "\u{1F481}\u200D\u2642\uFE0F", "\u{1F481}\u200D\u2640\uFE0F", "\u{1F64B}", "\u{1F64B}\u200D\u2642\uFE0F", "\u{1F64B}\u200D\u2640\uFE0F", "\u{1F9CF}", "\u{1F9CF}\u200D\u2642\uFE0F", "\u{1F9CF}\u200D\u2640\uFE0F", "\u{1F647}", "\u{1F647}\u200D\u2642\uFE0F", "\u{1F647}\u200D\u2640\uFE0F", "\u{1F926}", "\u{1F926}\u200D\u2642\uFE0F", "\u{1F926}\u200D\u2640\uFE0F", "\u{1F937}", "\u{1F937}\u200D\u2642\uFE0F", "\u{1F937}\u200D\u2640\uFE0F", "\u{1F9D1}\u200D\u2695\uFE0F", "\u{1F468}\u200D\u2695\uFE0F", "\u{1F469}\u200D\u2695\uFE0F", "\u{1F9D1}\u200D\u{1F393}", "\u{1F468}\u200D\u{1F393}", "\u{1F469}\u200D\u{1F393}", "\u{1F9D1}\u200D\u{1F3EB}", "\u{1F468}\u200D\u{1F3EB}", "\u{1F469}\u200D\u{1F3EB}", "\u{1F9D1}\u200D\u2696\uFE0F", "\u{1F468}\u200D\u2696\uFE0F", "\u{1F469}\u200D\u2696\uFE0F", "\u{1F9D1}\u200D\u{1F33E}", "\u{1F468}\u200D\u{1F33E}", "\u{1F469}\u200D\u{1F33E}", "\u{1F9D1}\u200D\u{1F373}", "\u{1F468}\u200D\u{1F373}", "\u{1F469}\u200D\u{1F373}", "\u{1F9D1}\u200D\u{1F527}", "\u{1F468}\u200D\u{1F527}", "\u{1F469}\u200D\u{1F527}", "\u{1F9D1}\u200D\u{1F3ED}", "\u{1F468}\u200D\u{1F3ED}", "\u{1F469}\u200D\u{1F3ED}", "\u{1F9D1}\u200D\u{1F4BC}", "\u{1F468}\u200D\u{1F4BC}", "\u{1F469}\u200D\u{1F4BC}", "\u{1F9D1}\u200D\u{1F52C}", "\u{1F468}\u200D\u{1F52C}", "\u{1F469}\u200D\u{1F52C}", "\u{1F9D1}\u200D\u{1F4BB}", "\u{1F468}\u200D\u{1F4BB}", "\u{1F469}\u200D\u{1F4BB}", "\u{1F9D1}\u200D\u{1F3A4}", "\u{1F468}\u200D\u{1F3A4}", "\u{1F469}\u200D\u{1F3A4}", "\u{1F9D1}\u200D\u{1F3A8}", "\u{1F468}\u200D\u{1F3A8}", "\u{1F469}\u200D\u{1F3A8}", "\u{1F9D1}\u200D\u2708\uFE0F", "\u{1F468}\u200D\u2708\uFE0F", "\u{1F469}\u200D\u2708\uFE0F", "\u{1F9D1}\u200D\u{1F680}", "\u{1F468}\u200D\u{1F680}", "\u{1F469}\u200D\u{1F680}", "\u{1F9D1}\u200D\u{1F692}", "\u{1F468}\u200D\u{1F692}", "\u{1F469}\u200D\u{1F692}", "\u{1F46E}", "\u{1F46E}\u200D\u2642\uFE0F", "\u{1F46E}\u200D\u2640\uFE0F", "\u{1F575}", "\u{1F575}\uFE0F\u200D\u2642\uFE0F", "\u{1F575}\uFE0F\u200D\u2640\uFE0F", "\u{1F482}", "\u{1F482}\u200D\u2642\uFE0F", "\u{1F482}\u200D\u2640\uFE0F", "\u{1F477}", "\u{1F477}\u200D\u2642\uFE0F", "\u{1F477}\u200D\u2640\uFE0F", "\u{1F934}", "\u{1F478}", "\u{1F473}", "\u{1F473}\u200D\u2642\uFE0F", "\u{1F473}\u200D\u2640\uFE0F", "\u{1F472}", "\u{1F9D5}", "\u{1F935}", "\u{1F470}", "\u{1F930}", "\u{1F931}", "\u{1F47C}", "\u{1F385}", "\u{1F936}", "\u{1F9B8}", "\u{1F9B8}\u200D\u2642\uFE0F", "\u{1F9B8}\u200D\u2640\uFE0F", "\u{1F9B9}", "\u{1F9B9}\u200D\u2642\uFE0F", "\u{1F9B9}\u200D\u2640\uFE0F", "\u{1F9D9}", "\u{1F9D9}\u200D\u2642\uFE0F", "\u{1F9D9}\u200D\u2640\uFE0F", "\u{1F9DA}", "\u{1F9DA}\u200D\u2642\uFE0F", "\u{1F9DA}\u200D\u2640\uFE0F", "\u{1F9DB}", "\u{1F9DB}\u200D\u2642\uFE0F", "\u{1F9DB}\u200D\u2640\uFE0F", "\u{1F9DC}", "\u{1F9DC}\u200D\u2642\uFE0F", "\u{1F9DC}\u200D\u2640\uFE0F", "\u{1F9DD}", "\u{1F9DD}\u200D\u2642\uFE0F", "\u{1F9DD}\u200D\u2640\uFE0F", "\u{1F9DE}", "\u{1F9DE}\u200D\u2642\uFE0F", "\u{1F9DE}\u200D\u2640\uFE0F", "\u{1F9DF}", "\u{1F9DF}\u200D\u2642\uFE0F", "\u{1F9DF}\u200D\u2640\uFE0F", "\u{1F486}", "\u{1F486}\u200D\u2642\uFE0F", "\u{1F486}\u200D\u2640\uFE0F", "\u{1F487}", "\u{1F487}\u200D\u2642\uFE0F", "\u{1F487}\u200D\u2640\uFE0F", "\u{1F6B6}", "\u{1F6B6}\u200D\u2642\uFE0F", "\u{1F6B6}\u200D\u2640\uFE0F", "\u{1F9CD}", "\u{1F9CD}\u200D\u2642\uFE0F", "\u{1F9CD}\u200D\u2640\uFE0F", "\u{1F9CE}", "\u{1F9CE}\u200D\u2642\uFE0F", "\u{1F9CE}\u200D\u2640\uFE0F", "\u{1F9D1}\u200D\u{1F9AF}", "\u{1F468}\u200D\u{1F9AF}", "\u{1F469}\u200D\u{1F9AF}", "\u{1F9D1}\u200D\u{1F9BC}", "\u{1F468}\u200D\u{1F9BC}", "\u{1F469}\u200D\u{1F9BC}", "\u{1F9D1}\u200D\u{1F9BD}", "\u{1F468}\u200D\u{1F9BD}", "\u{1F469}\u200D\u{1F9BD}", "\u{1F3C3}", "\u{1F3C3}\u200D\u2642\uFE0F", "\u{1F3C3}\u200D\u2640\uFE0F", "\u{1F483}", "\u{1F57A}", "\u{1F574}", "\u{1F46F}", "\u{1F46F}\u200D\u2642\uFE0F", "\u{1F46F}\u200D\u2640\uFE0F", "\u{1F9D6}", "\u{1F9D6}\u200D\u2642\uFE0F", "\u{1F9D6}\u200D\u2640\uFE0F", "\u{1F9D1}\u200D\u{1F91D}\u200D\u{1F9D1}", "\u{1F46D}", "\u{1F46B}", "\u{1F46C}", "\u{1F48F}", "\u{1F468}\u200D\u2764\uFE0F\u200D\u{1F48B}\u200D\u{1F468}", "\u{1F469}\u200D\u2764\uFE0F\u200D\u{1F48B}\u200D\u{1F469}", "\u{1F491}", "\u{1F468}\u200D\u2764\uFE0F\u200D\u{1F468}", "\u{1F469}\u200D\u2764\uFE0F\u200D\u{1F469}", "\u{1F46A}", "\u{1F468}\u200D\u{1F469}\u200D\u{1F466}", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}", "\u{1F468}\u200D\u{1F469}\u200D\u{1F466}\u200D\u{1F466}", "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F467}", "\u{1F468}\u200D\u{1F468}\u200D\u{1F466}", "\u{1F468}\u200D\u{1F468}\u200D\u{1F467}", "\u{1F468}\u200D\u{1F468}\u200D\u{1F467}\u200D\u{1F466}", "\u{1F468}\u200D\u{1F468}\u200D\u{1F466}\u200D\u{1F466}", "\u{1F468}\u200D\u{1F468}\u200D\u{1F467}\u200D\u{1F467}", "\u{1F469}\u200D\u{1F469}\u200D\u{1F466}", "\u{1F469}\u200D\u{1F469}\u200D\u{1F467}", "\u{1F469}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}", "\u{1F469}\u200D\u{1F469}\u200D\u{1F466}\u200D\u{1F466}", "\u{1F469}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F467}", "\u{1F468}\u200D\u{1F466}", "\u{1F468}\u200D\u{1F466}\u200D\u{1F466}", "\u{1F468}\u200D\u{1F467}", "\u{1F468}\u200D\u{1F467}\u200D\u{1F466}", "\u{1F468}\u200D\u{1F467}\u200D\u{1F467}", "\u{1F469}\u200D\u{1F466}", "\u{1F469}\u200D\u{1F466}\u200D\u{1F466}", "\u{1F469}\u200D\u{1F467}", "\u{1F469}\u200D\u{1F467}\u200D\u{1F466}", "\u{1F469}\u200D\u{1F467}\u200D\u{1F467}", "\u{1F5E3}", "\u{1F464}", "\u{1F465}", "\u{1F463}"] },
  { title: "Animals & Nature", tab: "\u{1F43B}", emojis: ["\u{1F436}", "\u{1F431}", "\u{1F42D}", "\u{1F439}", "\u{1F430}", "\u{1F98A}", "\u{1F43B}", "\u{1F43C}", "\u{1F428}", "\u{1F42F}", "\u{1F981}", "\u{1F42E}", "\u{1F437}", "\u{1F43D}", "\u{1F438}", "\u{1F435}", "\u{1F648}", "\u{1F649}", "\u{1F64A}", "\u{1F412}", "\u{1F414}", "\u{1F427}", "\u{1F426}", "\u{1F424}", "\u{1F423}", "\u{1F425}", "\u{1F986}", "\u{1F985}", "\u{1F989}", "\u{1F987}", "\u{1F43A}", "\u{1F417}", "\u{1F434}", "\u{1F984}", "\u{1F41D}", "\u{1F41B}", "\u{1F98B}", "\u{1F40C}", "\u{1F41E}", "\u{1F41C}", "\u{1F99F}", "\u{1F997}", "\u{1F577}", "\u{1F578}", "\u{1F982}", "\u{1F422}", "\u{1F40D}", "\u{1F98E}", "\u{1F996}", "\u{1F995}", "\u{1F419}", "\u{1F991}", "\u{1F990}", "\u{1F99E}", "\u{1F980}", "\u{1F421}", "\u{1F420}", "\u{1F41F}", "\u{1F42C}", "\u{1F433}", "\u{1F40B}", "\u{1F988}", "\u{1F40A}", "\u{1F405}", "\u{1F406}", "\u{1F993}", "\u{1F98D}", "\u{1F9A7}", "\u{1F418}", "\u{1F99B}", "\u{1F98F}", "\u{1F42A}", "\u{1F42B}", "\u{1F992}", "\u{1F998}", "\u{1F403}", "\u{1F402}", "\u{1F404}", "\u{1F40E}", "\u{1F416}", "\u{1F40F}", "\u{1F411}", "\u{1F999}", "\u{1F410}", "\u{1F98C}", "\u{1F415}", "\u{1F429}", "\u{1F9AE}", "\u{1F415}\u200D\u{1F9BA}", "\u{1F408}", "\u{1F413}", "\u{1F983}", "\u{1F99A}", "\u{1F99C}", "\u{1F9A2}", "\u{1F9A9}", "\u{1F54A}", "\u{1F407}", "\u{1F99D}", "\u{1F9A8}", "\u{1F9A1}", "\u{1F9A6}", "\u{1F9A5}", "\u{1F401}", "\u{1F400}", "\u{1F43F}", "\u{1F994}", "\u{1F43E}", "\u{1F409}", "\u{1F432}", "\u{1F335}", "\u{1F384}", "\u{1F332}", "\u{1F333}", "\u{1F334}", "\u{1F331}", "\u{1F33F}", "\u2618\uFE0F", "\u{1F340}", "\u{1F38D}", "\u{1F38B}", "\u{1F343}", "\u{1F342}", "\u{1F341}", "\u{1F344}", "\u{1F41A}", "\u{1F33E}", "\u{1F490}", "\u{1F337}", "\u{1F339}", "\u{1F940}", "\u{1F33A}", "\u{1F338}", "\u{1F33C}", "\u{1F33B}", "\u{1F31E}", "\u{1F31D}", "\u{1F31B}", "\u{1F31C}", "\u{1F31A}", "\u{1F315}", "\u{1F316}", "\u{1F317}", "\u{1F318}", "\u{1F311}", "\u{1F312}", "\u{1F313}", "\u{1F314}", "\u{1F319}", "\u{1F30E}", "\u{1F30D}", "\u{1F30F}", "\u{1FA90}", "\u{1F4AB}", "\u2B50\uFE0F", "\u{1F31F}", "\u2728", "\u26A1\uFE0F", "\u2604\uFE0F", "\u{1F4A5}", "\u{1F525}", "\u{1F32A}", "\u{1F308}", "\u2600\uFE0F", "\u{1F324}", "\u26C5\uFE0F", "\u{1F325}", "\u2601\uFE0F", "\u{1F326}", "\u{1F327}", "\u26C8", "\u{1F329}", "\u{1F328}", "\u2744\uFE0F", "\u2603\uFE0F", "\u26C4\uFE0F", "\u{1F32C}", "\u{1F4A8}", "\u{1F4A7}", "\u{1F4A6}", "\u2614\uFE0F", "\u{1F30A}", "\u{1F32B}"] },
  { title: "Food & Drink", tab: "\u{1F354}", emojis: ["\u{1F34F}", "\u{1F34E}", "\u{1F350}", "\u{1F34A}", "\u{1F34B}", "\u{1F34C}", "\u{1F349}", "\u{1F347}", "\u{1F353}", "\u{1F348}", "\u{1F352}", "\u{1F351}", "\u{1F96D}", "\u{1F34D}", "\u{1F965}", "\u{1F95D}", "\u{1F345}", "\u{1F346}", "\u{1F951}", "\u{1F966}", "\u{1F96C}", "\u{1F952}", "\u{1F336}", "\u{1F33D}", "\u{1F955}", "\u{1F9C4}", "\u{1F9C5}", "\u{1F954}", "\u{1F360}", "\u{1F950}", "\u{1F96F}", "\u{1F35E}", "\u{1F956}", "\u{1F968}", "\u{1F9C0}", "\u{1F95A}", "\u{1F373}", "\u{1F9C8}", "\u{1F95E}", "\u{1F9C7}", "\u{1F953}", "\u{1F969}", "\u{1F357}", "\u{1F356}", "\u{1F32D}", "\u{1F354}", "\u{1F35F}", "\u{1F355}", "\u{1F96A}", "\u{1F959}", "\u{1F9C6}", "\u{1F32E}", "\u{1F32F}", "\u{1F957}", "\u{1F958}", "\u{1F96B}", "\u{1F35D}", "\u{1F35C}", "\u{1F372}", "\u{1F35B}", "\u{1F363}", "\u{1F371}", "\u{1F95F}", "\u{1F9AA}", "\u{1F364}", "\u{1F359}", "\u{1F35A}", "\u{1F358}", "\u{1F365}", "\u{1F960}", "\u{1F96E}", "\u{1F362}", "\u{1F361}", "\u{1F367}", "\u{1F368}", "\u{1F366}", "\u{1F967}", "\u{1F9C1}", "\u{1F370}", "\u{1F382}", "\u{1F36E}", "\u{1F36D}", "\u{1F36C}", "\u{1F36B}", "\u{1F37F}", "\u{1F369}", "\u{1F36A}", "\u{1F330}", "\u{1F95C}", "\u{1F36F}", "\u{1F95B}", "\u{1F37C}", "\u2615\uFE0F", "\u{1F375}", "\u{1F9C3}", "\u{1F964}", "\u{1F376}", "\u{1F37A}", "\u{1F37B}", "\u{1F942}", "\u{1F377}", "\u{1F943}", "\u{1F378}", "\u{1F379}", "\u{1F9C9}", "\u{1F37E}", "\u{1F9CA}", "\u{1F944}", "\u{1F374}", "\u{1F37D}", "\u{1F963}", "\u{1F961}", "\u{1F962}", "\u{1F9C2}"] },
  { title: "Activity", tab: "\u26BD", emojis: ["\u26BD\uFE0F", "\u{1F3C0}", "\u{1F3C8}", "\u26BE\uFE0F", "\u{1F94E}", "\u{1F3BE}", "\u{1F3D0}", "\u{1F3C9}", "\u{1F94F}", "\u{1F3B1}", "\u{1FA80}", "\u{1F3D3}", "\u{1F3F8}", "\u{1F3D2}", "\u{1F3D1}", "\u{1F94D}", "\u{1F3CF}", "\u{1F945}", "\u26F3\uFE0F", "\u{1FA81}", "\u{1F3F9}", "\u{1F3A3}", "\u{1F93F}", "\u{1F94A}", "\u{1F94B}", "\u{1F3BD}", "\u{1F6F9}", "\u{1F6F7}", "\u26F8", "\u{1F94C}", "\u{1F3BF}", "\u26F7", "\u{1F3C2}", "\u{1FA82}", "\u{1F3CB}\uFE0F", "\u{1F3CB}\uFE0F\u200D\u2642\uFE0F", "\u{1F3CB}\uFE0F\u200D\u2640\uFE0F", "\u{1F93C}", "\u{1F93C}\u200D\u2642\uFE0F", "\u{1F93C}\u200D\u2640\uFE0F", "\u{1F938}\u200D\u2640\uFE0F", "\u{1F938}", "\u{1F938}\u200D\u2642\uFE0F", "\u26F9\uFE0F", "\u26F9\uFE0F\u200D\u2642\uFE0F", "\u26F9\uFE0F\u200D\u2640\uFE0F", "\u{1F93A}", "\u{1F93E}", "\u{1F93E}\u200D\u2642\uFE0F", "\u{1F93E}\u200D\u2640\uFE0F", "\u{1F3CC}\uFE0F", "\u{1F3CC}\uFE0F\u200D\u2642\uFE0F", "\u{1F3CC}\uFE0F\u200D\u2640\uFE0F", "\u{1F3C7}", "\u{1F9D8}", "\u{1F9D8}\u200D\u2642\uFE0F", "\u{1F9D8}\u200D\u2640\uFE0F", "\u{1F3C4}", "\u{1F3C4}\u200D\u2642\uFE0F", "\u{1F3C4}\u200D\u2640\uFE0F", "\u{1F3CA}", "\u{1F3CA}\u200D\u2642\uFE0F", "\u{1F3CA}\u200D\u2640\uFE0F", "\u{1F93D}", "\u{1F93D}\u200D\u2642\uFE0F", "\u{1F93D}\u200D\u2640\uFE0F", "\u{1F6A3}", "\u{1F6A3}\u200D\u2642\uFE0F", "\u{1F6A3}\u200D\u2640\uFE0F", "\u{1F9D7}", "\u{1F9D7}\u200D\u2642\uFE0F", "\u{1F9D7}\u200D\u2640\uFE0F", "\u{1F6B5}", "\u{1F6B5}\u200D\u2642\uFE0F", "\u{1F6B5}\u200D\u2640\uFE0F", "\u{1F6B4}", "\u{1F6B4}\u200D\u2642\uFE0F", "\u{1F6B4}\u200D\u2640\uFE0F", "\u{1F3C6}", "\u{1F947}", "\u{1F948}", "\u{1F949}", "\u{1F3C5}", "\u{1F396}", "\u{1F3F5}", "\u{1F397}", "\u{1F3AB}", "\u{1F39F}", "\u{1F3AA}", "\u{1F939}", "\u{1F939}\u200D\u2642\uFE0F", "\u{1F939}\u200D\u2640\uFE0F", "\u{1F3AD}", "\u{1F3A8}", "\u{1F3AC}", "\u{1F3A4}", "\u{1F3A7}", "\u{1F3BC}", "\u{1F3B9}", "\u{1F941}", "\u{1F3B7}", "\u{1F3BA}", "\u{1F3B8}", "\u{1FA95}", "\u{1F3BB}", "\u{1F3B2}", "\u{1F3AF}", "\u{1F3B3}", "\u{1F3AE}", "\u{1F3B0}", "\u{1F9E9}"] },
  { title: "Travel & Places", tab: "\u{1F697}", emojis: ["\u{1F697}", "\u{1F695}", "\u{1F699}", "\u{1F68C}", "\u{1F68E}", "\u{1F3CE}", "\u{1F693}", "\u{1F691}", "\u{1F692}", "\u{1F690}", "\u{1F69A}", "\u{1F69B}", "\u{1F69C}", "\u{1F9AF}", "\u{1F9BD}", "\u{1F9BC}", "\u{1F6F4}", "\u{1F6B2}", "\u{1F6F5}", "\u{1F3CD}", "\u{1F6FA}", "\u{1F6A8}", "\u{1F694}", "\u{1F68D}", "\u{1F698}", "\u{1F696}", "\u{1F6A1}", "\u{1F6A0}", "\u{1F69F}", "\u{1F683}", "\u{1F68B}", "\u{1F69E}", "\u{1F69D}", "\u{1F684}", "\u{1F685}", "\u{1F688}", "\u{1F682}", "\u{1F686}", "\u{1F687}", "\u{1F68A}", "\u{1F689}", "\u2708\uFE0F", "\u{1F6EB}", "\u{1F6EC}", "\u{1F6E9}", "\u{1F4BA}", "\u{1F6F0}", "\u{1F680}", "\u{1F6F8}", "\u{1F681}", "\u{1F6F6}", "\u26F5\uFE0F", "\u{1F6A4}", "\u{1F6E5}", "\u{1F6F3}", "\u26F4", "\u{1F6A2}", "\u2693\uFE0F", "\u26FD\uFE0F", "\u{1F6A7}", "\u{1F6A6}", "\u{1F6A5}", "\u{1F68F}", "\u{1F5FA}", "\u{1F5FF}", "\u{1F5FD}", "\u{1F5FC}", "\u{1F3F0}", "\u{1F3EF}", "\u{1F3DF}", "\u{1F3A1}", "\u{1F3A2}", "\u{1F3A0}", "\u26F2\uFE0F", "\u26F1", "\u{1F3D6}", "\u{1F3DD}", "\u{1F3DC}", "\u{1F30B}", "\u26F0", "\u{1F3D4}", "\u{1F5FB}", "\u{1F3D5}", "\u26FA\uFE0F", "\u{1F3E0}", "\u{1F3E1}", "\u{1F3D8}", "\u{1F3DA}", "\u{1F3D7}", "\u{1F3ED}", "\u{1F3E2}", "\u{1F3EC}", "\u{1F3E3}", "\u{1F3E4}", "\u{1F3E5}", "\u{1F3E6}", "\u{1F3E8}", "\u{1F3EA}", "\u{1F3EB}", "\u{1F3E9}", "\u{1F492}", "\u{1F3DB}", "\u26EA\uFE0F", "\u{1F54C}", "\u{1F54D}", "\u{1F6D5}", "\u{1F54B}", "\u26E9", "\u{1F6E4}", "\u{1F6E3}", "\u{1F5FE}", "\u{1F391}", "\u{1F3DE}", "\u{1F305}", "\u{1F304}", "\u{1F320}", "\u{1F387}", "\u{1F386}", "\u{1F307}", "\u{1F306}", "\u{1F3D9}", "\u{1F303}", "\u{1F30C}", "\u{1F309}", "\u{1F301}"] },
  { title: "Objects", tab: "\u{1F4A1}", emojis: ["\u231A\uFE0F", "\u{1F4F1}", "\u{1F4F2}", "\u{1F4BB}", "\u2328\uFE0F", "\u{1F5A5}", "\u{1F5A8}", "\u{1F5B1}", "\u{1F5B2}", "\u{1F579}", "\u{1F5DC}", "\u{1F4BD}", "\u{1F4BE}", "\u{1F4BF}", "\u{1F4C0}", "\u{1F4FC}", "\u{1F4F7}", "\u{1F4F8}", "\u{1F4F9}", "\u{1F3A5}", "\u{1F4FD}", "\u{1F39E}", "\u{1F4DE}", "\u260E\uFE0F", "\u{1F4DF}", "\u{1F4E0}", "\u{1F4FA}", "\u{1F4FB}", "\u{1F399}", "\u{1F39A}", "\u{1F39B}", "\u{1F9ED}", "\u23F1", "\u23F2", "\u23F0", "\u{1F570}", "\u231B\uFE0F", "\u23F3", "\u{1F4E1}", "\u{1F50B}", "\u{1F50C}", "\u{1F4A1}", "\u{1F526}", "\u{1F56F}", "\u{1FA94}", "\u{1F9EF}", "\u{1F6E2}", "\u{1F4B8}", "\u{1F4B5}", "\u{1F4B4}", "\u{1F4B6}", "\u{1F4B7}", "\u{1F4B0}", "\u{1F4B3}", "\u{1F48E}", "\u2696\uFE0F", "\u{1F9F0}", "\u{1F527}", "\u{1F528}", "\u2692", "\u{1F6E0}", "\u26CF", "\u{1F529}", "\u2699\uFE0F", "\u{1F9F1}", "\u26D3", "\u{1F9F2}", "\u{1F52B}", "\u{1F4A3}", "\u{1F9E8}", "\u{1FA93}", "\u{1F52A}", "\u{1F5E1}", "\u2694\uFE0F", "\u{1F6E1}", "\u{1F6AC}", "\u26B0\uFE0F", "\u26B1\uFE0F", "\u{1F3FA}", "\u{1F52E}", "\u{1F4FF}", "\u{1F9FF}", "\u{1F488}", "\u2697\uFE0F", "\u{1F52D}", "\u{1F52C}", "\u{1F573}", "\u{1FA79}", "\u{1FA7A}", "\u{1F48A}", "\u{1F489}", "\u{1F9EC}", "\u{1F9A0}", "\u{1F9EB}", "\u{1F9EA}", "\u{1F321}", "\u{1F9F9}", "\u{1F9FA}", "\u{1F9FB}", "\u{1F6BD}", "\u{1F6B0}", "\u{1F6BF}", "\u{1F6C1}", "\u{1F6C0}", "\u{1F9FC}", "\u{1FA92}", "\u{1F9FD}", "\u{1F9F4}", "\u{1F6CE}", "\u{1F511}", "\u{1F5DD}", "\u{1F6AA}", "\u{1FA91}", "\u{1F6CB}", "\u{1F6CF}", "\u{1F6CC}", "\u{1F9F8}", "\u{1F5BC}", "\u{1F6CD}", "\u{1F6D2}", "\u{1F381}", "\u{1F388}", "\u{1F38F}", "\u{1F380}", "\u{1F38A}", "\u{1F389}", "\u{1F38E}", "\u{1F3EE}", "\u{1F390}", "\u{1F9E7}", "\u2709\uFE0F", "\u{1F4E9}", "\u{1F4E8}", "\u{1F4E7}", "\u{1F48C}", "\u{1F4E5}", "\u{1F4E4}", "\u{1F4E6}", "\u{1F3F7}", "\u{1F4EA}", "\u{1F4EB}", "\u{1F4EC}", "\u{1F4ED}", "\u{1F4EE}", "\u{1F4EF}", "\u{1F4DC}", "\u{1F4C3}", "\u{1F4C4}", "\u{1F4D1}", "\u{1F9FE}", "\u{1F4CA}", "\u{1F4C8}", "\u{1F4C9}", "\u{1F5D2}", "\u{1F5D3}", "\u{1F4C6}", "\u{1F4C5}", "\u{1F5D1}", "\u{1F4C7}", "\u{1F5C3}", "\u{1F5F3}", "\u{1F5C4}", "\u{1F4CB}", "\u{1F4C1}", "\u{1F4C2}", "\u{1F5C2}", "\u{1F5DE}", "\u{1F4F0}", "\u{1F4D3}", "\u{1F4D4}", "\u{1F4D2}", "\u{1F4D5}", "\u{1F4D7}", "\u{1F4D8}", "\u{1F4D9}", "\u{1F4DA}", "\u{1F4D6}", "\u{1F516}", "\u{1F9F7}", "\u{1F517}", "\u{1F4CE}", "\u{1F587}", "\u{1F4D0}", "\u{1F4CF}", "\u{1F9EE}", "\u{1F4CC}", "\u{1F4CD}", "\u2702\uFE0F", "\u{1F58A}", "\u{1F58B}", "\u2712\uFE0F", "\u{1F58C}", "\u{1F58D}", "\u{1F4DD}", "\u270F\uFE0F", "\u{1F50D}", "\u{1F50E}", "\u{1F50F}", "\u{1F510}", "\u{1F512}", "\u{1F513}", "\u{1F9F3}", "\u{1F302}", "\u2602\uFE0F", "\u{1F9F5}", "\u{1F9F6}", "\u{1F453}", "\u{1F576}", "\u{1F97D}", "\u{1F97C}", "\u{1F9BA}", "\u{1F454}", "\u{1F455}", "\u{1F456}", "\u{1F9E3}", "\u{1F9E4}", "\u{1F9E5}", "\u{1F9E6}", "\u{1F457}", "\u{1F458}", "\u{1F97B}", "\u{1FA71}", "\u{1FA72}", "\u{1FA73}", "\u{1F459}", "\u{1F45A}", "\u{1F45B}", "\u{1F45C}", "\u{1F45D}", "\u{1F392}", "\u{1F45E}", "\u{1F45F}", "\u{1F97E}", "\u{1F97F}", "\u{1F460}", "\u{1F461}", "\u{1FA70}", "\u{1F462}", "\u{1F451}", "\u{1F452}", "\u{1F3A9}", "\u{1F393}", "\u{1F9E2}", "\u26D1", "\u{1F484}", "\u{1F48D}", "\u{1F4BC}"] },
  { title: "Symbols", tab: "\u{1F4B2}", emojis: ["\u2764\uFE0F", "\u{1F9E1}", "\u{1F49B}", "\u{1F49A}", "\u{1F499}", "\u{1F49C}", "\u{1F5A4}", "\u{1F90D}", "\u{1F90E}", "\u{1F494}", "\u2763\uFE0F", "\u{1F495}", "\u{1F49E}", "\u{1F493}", "\u{1F497}", "\u{1F496}", "\u{1F498}", "\u{1F49D}", "\u{1F49F}", "\u262E\uFE0F", "\u271D\uFE0F", "\u262A\uFE0F", "\u{1F549}", "\u2638\uFE0F", "\u2721\uFE0F", "\u{1F52F}", "\u{1F54E}", "\u262F\uFE0F", "\u2626\uFE0F", "\u{1F6D0}", "\u26CE", "\u2648\uFE0F", "\u2649\uFE0F", "\u264A\uFE0F", "\u264B\uFE0F", "\u264C\uFE0F", "\u264D\uFE0F", "\u264E\uFE0F", "\u264F\uFE0F", "\u2650\uFE0F", "\u2651\uFE0F", "\u2652\uFE0F", "\u2653\uFE0F", "\u{1F194}", "\u269B\uFE0F", "\u{1F251}", "\u2622\uFE0F", "\u2623\uFE0F", "\u{1F4F4}", "\u{1F4F3}", "\u{1F236}", "\u{1F21A}\uFE0F", "\u{1F238}", "\u{1F23A}", "\u{1F237}\uFE0F", "\u2734\uFE0F", "\u{1F19A}", "\u{1F4AE}", "\u{1F250}", "\u3299\uFE0F", "\u3297\uFE0F", "\u{1F234}", "\u{1F235}", "\u{1F239}", "\u{1F232}", "\u{1F170}\uFE0F", "\u{1F171}\uFE0F", "\u{1F18E}", "\u{1F191}", "\u{1F17E}\uFE0F", "\u{1F198}", "\u274C", "\u2B55\uFE0F", "\u{1F6D1}", "\u26D4\uFE0F", "\u{1F4DB}", "\u{1F6AB}", "\u{1F4AF}", "\u{1F4A2}", "\u2668\uFE0F", "\u{1F6B7}", "\u{1F6AF}", "\u{1F6B3}", "\u{1F6B1}", "\u{1F51E}", "\u{1F4F5}", "\u{1F6AD}", "\u2757\uFE0F", "\u2755", "\u2753", "\u2754", "\u203C\uFE0F", "\u2049\uFE0F", "\u{1F505}", "\u{1F506}", "\u303D\uFE0F", "\u26A0\uFE0F", "\u{1F6B8}", "\u{1F531}", "\u269C\uFE0F", "\u{1F530}", "\u267B\uFE0F", "\u2705", "\u{1F22F}\uFE0F", "\u{1F4B9}", "\u2747\uFE0F", "\u2733\uFE0F", "\u274E", "\u{1F310}", "\u{1F4A0}", "\u24C2\uFE0F", "\u{1F300}", "\u{1F4A4}", "\u{1F3E7}", "\u{1F6BE}", "\u267F\uFE0F", "\u{1F17F}\uFE0F", "\u{1F233}", "\u{1F202}\uFE0F", "\u{1F6C2}", "\u{1F6C3}", "\u{1F6C4}", "\u{1F6C5}", "\u{1F6B9}", "\u{1F6BA}", "\u{1F6BC}", "\u{1F6BB}", "\u{1F6AE}", "\u{1F3A6}", "\u{1F4F6}", "\u{1F201}", "\u{1F523}", "\u2139\uFE0F", "\u{1F524}", "\u{1F521}", "\u{1F520}", "\u{1F196}", "\u{1F197}", "\u{1F199}", "\u{1F192}", "\u{1F195}", "\u{1F193}", "0\uFE0F\u20E3", "1\uFE0F\u20E3", "2\uFE0F\u20E3", "3\uFE0F\u20E3", "4\uFE0F\u20E3", "5\uFE0F\u20E3", "6\uFE0F\u20E3", "7\uFE0F\u20E3", "8\uFE0F\u20E3", "9\uFE0F\u20E3", "\u{1F51F}", "\u{1F522}", "#\uFE0F\u20E3", "*\uFE0F\u20E3", "\u23CF\uFE0F", "\u25B6\uFE0F", "\u23F8", "\u23EF", "\u23F9", "\u23FA", "\u23ED", "\u23EE", "\u23E9", "\u23EA", "\u23EB", "\u23EC", "\u25C0\uFE0F", "\u{1F53C}", "\u{1F53D}", "\u27A1\uFE0F", "\u2B05\uFE0F", "\u2B06\uFE0F", "\u2B07\uFE0F", "\u2197\uFE0F", "\u2198\uFE0F", "\u2199\uFE0F", "\u2196\uFE0F", "\u2195\uFE0F", "\u2194\uFE0F", "\u21AA\uFE0F", "\u21A9\uFE0F", "\u2934\uFE0F", "\u2935\uFE0F", "\u{1F500}", "\u{1F501}", "\u{1F502}", "\u{1F504}", "\u{1F503}", "\u{1F3B5}", "\u{1F3B6}", "\u2795", "\u2796", "\u2797", "\u2716\uFE0F", "\u267E", "\u{1F4B2}", "\u{1F4B1}", "\u2122\uFE0F", "\xA9\uFE0F", "\xAE\uFE0F", "\u3030\uFE0F", "\u27B0", "\u27BF", "\u{1F51A}", "\u{1F519}", "\u{1F51B}", "\u{1F51D}", "\u{1F51C}", "\u2714\uFE0F", "\u2611\uFE0F", "\u{1F518}", "\u{1F534}", "\u{1F7E0}", "\u{1F7E1}", "\u{1F7E2}", "\u{1F535}", "\u{1F7E3}", "\u26AB\uFE0F", "\u26AA\uFE0F", "\u{1F7E4}", "\u{1F53A}", "\u{1F53B}", "\u{1F538}", "\u{1F539}", "\u{1F536}", "\u{1F537}", "\u{1F533}", "\u{1F532}", "\u25AA\uFE0F", "\u25AB\uFE0F", "\u25FE\uFE0F", "\u25FD\uFE0F", "\u25FC\uFE0F", "\u25FB\uFE0F", "\u{1F7E5}", "\u{1F7E7}", "\u{1F7E8}", "\u{1F7E9}", "\u{1F7E6}", "\u{1F7EA}", "\u2B1B\uFE0F", "\u2B1C\uFE0F", "\u{1F7EB}", "\u{1F508}", "\u{1F507}", "\u{1F509}", "\u{1F50A}", "\u{1F514}", "\u{1F515}", "\u{1F4E3}", "\u{1F4E2}", "\u{1F441}\u200D\u{1F5E8}", "\u{1F4AC}", "\u{1F4AD}", "\u{1F5EF}", "\u2660\uFE0F", "\u2663\uFE0F", "\u2665\uFE0F", "\u2666\uFE0F", "\u{1F0CF}", "\u{1F3B4}", "\u{1F004}\uFE0F", "\u{1F550}", "\u{1F551}", "\u{1F552}", "\u{1F553}", "\u{1F554}", "\u{1F555}", "\u{1F556}", "\u{1F557}", "\u{1F558}", "\u{1F559}", "\u{1F55A}", "\u{1F55B}", "\u{1F55C}", "\u{1F55D}", "\u{1F55E}", "\u{1F55F}", "\u{1F560}", "\u{1F561}", "\u{1F562}", "\u{1F563}", "\u{1F564}", "\u{1F565}", "\u{1F566}", "\u{1F567}"] },
  { title: "Flags", tab: "\u{1F3F3}\uFE0F", emojis: ["\u{1F3F3}\uFE0F", "\u{1F3F4}", "\u{1F3C1}", "\u{1F6A9}", "\u{1F3F3}\uFE0F\u200D\u{1F308}", "\u{1F3F4}\u200D\u2620\uFE0F", "\u{1F1E6}\u{1F1EB}", "\u{1F1E6}\u{1F1FD}", "\u{1F1E6}\u{1F1F1}", "\u{1F1E9}\u{1F1FF}", "\u{1F1E6}\u{1F1F8}", "\u{1F1E6}\u{1F1E9}", "\u{1F1E6}\u{1F1F4}", "\u{1F1E6}\u{1F1EE}", "\u{1F1E6}\u{1F1F6}", "\u{1F1E6}\u{1F1EC}", "\u{1F1E6}\u{1F1F7}", "\u{1F1E6}\u{1F1F2}", "\u{1F1E6}\u{1F1FC}", "\u{1F1E6}\u{1F1FA}", "\u{1F1E6}\u{1F1F9}", "\u{1F1E6}\u{1F1FF}", "\u{1F1E7}\u{1F1F8}", "\u{1F1E7}\u{1F1ED}", "\u{1F1E7}\u{1F1E9}", "\u{1F1E7}\u{1F1E7}", "\u{1F1E7}\u{1F1FE}", "\u{1F1E7}\u{1F1EA}", "\u{1F1E7}\u{1F1FF}", "\u{1F1E7}\u{1F1EF}", "\u{1F1E7}\u{1F1F2}", "\u{1F1E7}\u{1F1F9}", "\u{1F1E7}\u{1F1F4}", "\u{1F1E7}\u{1F1E6}", "\u{1F1E7}\u{1F1FC}", "\u{1F1E7}\u{1F1F7}", "\u{1F1EE}\u{1F1F4}", "\u{1F1FB}\u{1F1EC}", "\u{1F1E7}\u{1F1F3}", "\u{1F1E7}\u{1F1EC}", "\u{1F1E7}\u{1F1EB}", "\u{1F1E7}\u{1F1EE}", "\u{1F1F0}\u{1F1ED}", "\u{1F1E8}\u{1F1F2}", "\u{1F1E8}\u{1F1E6}", "\u{1F1EE}\u{1F1E8}", "\u{1F1E8}\u{1F1FB}", "\u{1F1E7}\u{1F1F6}", "\u{1F1F0}\u{1F1FE}", "\u{1F1E8}\u{1F1EB}", "\u{1F1F9}\u{1F1E9}", "\u{1F1E8}\u{1F1F1}", "\u{1F1E8}\u{1F1F3}", "\u{1F1E8}\u{1F1FD}", "\u{1F1E8}\u{1F1E8}", "\u{1F1E8}\u{1F1F4}", "\u{1F1F0}\u{1F1F2}", "\u{1F1E8}\u{1F1EC}", "\u{1F1E8}\u{1F1E9}", "\u{1F1E8}\u{1F1F0}", "\u{1F1E8}\u{1F1F7}", "\u{1F1E8}\u{1F1EE}", "\u{1F1ED}\u{1F1F7}", "\u{1F1E8}\u{1F1FA}", "\u{1F1E8}\u{1F1FC}", "\u{1F1E8}\u{1F1FE}", "\u{1F1E8}\u{1F1FF}", "\u{1F1E9}\u{1F1F0}", "\u{1F1E9}\u{1F1EF}", "\u{1F1E9}\u{1F1F2}", "\u{1F1E9}\u{1F1F4}", "\u{1F1EA}\u{1F1E8}", "\u{1F1EA}\u{1F1EC}", "\u{1F1F8}\u{1F1FB}", "\u{1F1EC}\u{1F1F6}", "\u{1F1EA}\u{1F1F7}", "\u{1F1EA}\u{1F1EA}", "\u{1F1EA}\u{1F1F9}", "\u{1F1EA}\u{1F1FA}", "\u{1F1EB}\u{1F1F0}", "\u{1F1EB}\u{1F1F4}", "\u{1F1EB}\u{1F1EF}", "\u{1F1EB}\u{1F1EE}", "\u{1F1EB}\u{1F1F7}", "\u{1F1EC}\u{1F1EB}", "\u{1F1F5}\u{1F1EB}", "\u{1F1F9}\u{1F1EB}", "\u{1F1EC}\u{1F1E6}", "\u{1F1EC}\u{1F1F2}", "\u{1F1EC}\u{1F1EA}", "\u{1F1E9}\u{1F1EA}", "\u{1F1EC}\u{1F1ED}", "\u{1F1EC}\u{1F1EE}", "\u{1F1EC}\u{1F1F7}", "\u{1F1EC}\u{1F1F1}", "\u{1F1EC}\u{1F1E9}", "\u{1F1EC}\u{1F1F5}", "\u{1F1EC}\u{1F1FA}", "\u{1F1EC}\u{1F1F9}", "\u{1F1EC}\u{1F1EC}", "\u{1F1EC}\u{1F1F3}", "\u{1F1EC}\u{1F1FC}", "\u{1F1EC}\u{1F1FE}", "\u{1F1ED}\u{1F1F9}", "\u{1F1ED}\u{1F1F3}", "\u{1F1ED}\u{1F1F0}", "\u{1F1ED}\u{1F1FA}", "\u{1F1EE}\u{1F1F8}", "\u{1F1EE}\u{1F1F3}", "\u{1F1EE}\u{1F1E9}", "\u{1F1EE}\u{1F1F7}", "\u{1F1EE}\u{1F1F6}", "\u{1F1EE}\u{1F1EA}", "\u{1F1EE}\u{1F1F2}", "\u{1F1EE}\u{1F1F1}", "\u{1F1EE}\u{1F1F9}", "\u{1F1EF}\u{1F1F2}", "\u{1F1EF}\u{1F1F5}", "\u{1F38C}", "\u{1F1EF}\u{1F1EA}", "\u{1F1EF}\u{1F1F4}", "\u{1F1F0}\u{1F1FF}", "\u{1F1F0}\u{1F1EA}", "\u{1F1F0}\u{1F1EE}", "\u{1F1FD}\u{1F1F0}", "\u{1F1F0}\u{1F1FC}", "\u{1F1F0}\u{1F1EC}", "\u{1F1F1}\u{1F1E6}", "\u{1F1F1}\u{1F1FB}", "\u{1F1F1}\u{1F1E7}", "\u{1F1F1}\u{1F1F8}", "\u{1F1F1}\u{1F1F7}", "\u{1F1F1}\u{1F1FE}", "\u{1F1F1}\u{1F1EE}", "\u{1F1F1}\u{1F1F9}", "\u{1F1F1}\u{1F1FA}", "\u{1F1F2}\u{1F1F4}", "\u{1F1F2}\u{1F1F0}", "\u{1F1F2}\u{1F1EC}", "\u{1F1F2}\u{1F1FC}", "\u{1F1F2}\u{1F1FE}", "\u{1F1F2}\u{1F1FB}", "\u{1F1F2}\u{1F1F1}", "\u{1F1F2}\u{1F1F9}", "\u{1F1F2}\u{1F1ED}", "\u{1F1F2}\u{1F1F6}", "\u{1F1F2}\u{1F1F7}", "\u{1F1F2}\u{1F1FA}", "\u{1F1FE}\u{1F1F9}", "\u{1F1F2}\u{1F1FD}", "\u{1F1EB}\u{1F1F2}", "\u{1F1F2}\u{1F1E9}", "\u{1F1F2}\u{1F1E8}", "\u{1F1F2}\u{1F1F3}", "\u{1F1F2}\u{1F1EA}", "\u{1F1F2}\u{1F1F8}", "\u{1F1F2}\u{1F1E6}", "\u{1F1F2}\u{1F1FF}", "\u{1F1F2}\u{1F1F2}", "\u{1F1F3}\u{1F1E6}", "\u{1F1F3}\u{1F1F7}", "\u{1F1F3}\u{1F1F5}", "\u{1F1F3}\u{1F1F1}", "\u{1F1F3}\u{1F1E8}", "\u{1F1F3}\u{1F1FF}", "\u{1F1F3}\u{1F1EE}", "\u{1F1F3}\u{1F1EA}", "\u{1F1F3}\u{1F1EC}", "\u{1F1F3}\u{1F1FA}", "\u{1F1F3}\u{1F1EB}", "\u{1F1F0}\u{1F1F5}", "\u{1F1F2}\u{1F1F5}", "\u{1F1F3}\u{1F1F4}", "\u{1F1F4}\u{1F1F2}", "\u{1F1F5}\u{1F1F0}", "\u{1F1F5}\u{1F1FC}", "\u{1F1F5}\u{1F1F8}", "\u{1F1F5}\u{1F1E6}", "\u{1F1F5}\u{1F1EC}", "\u{1F1F5}\u{1F1FE}", "\u{1F1F5}\u{1F1EA}", "\u{1F1F5}\u{1F1ED}", "\u{1F1F5}\u{1F1F3}", "\u{1F1F5}\u{1F1F1}", "\u{1F1F5}\u{1F1F9}", "\u{1F1F5}\u{1F1F7}", "\u{1F1F6}\u{1F1E6}", "\u{1F1F7}\u{1F1EA}", "\u{1F1F7}\u{1F1F4}", "\u{1F1F7}\u{1F1FA}", "\u{1F1F7}\u{1F1FC}", "\u{1F1FC}\u{1F1F8}", "\u{1F1F8}\u{1F1F2}", "\u{1F1F8}\u{1F1E6}", "\u{1F1F8}\u{1F1F3}", "\u{1F1F7}\u{1F1F8}", "\u{1F1F8}\u{1F1E8}", "\u{1F1F8}\u{1F1F1}", "\u{1F1F8}\u{1F1EC}", "\u{1F1F8}\u{1F1FD}", "\u{1F1F8}\u{1F1F0}", "\u{1F1F8}\u{1F1EE}", "\u{1F1EC}\u{1F1F8}", "\u{1F1F8}\u{1F1E7}", "\u{1F1F8}\u{1F1F4}", "\u{1F1FF}\u{1F1E6}", "\u{1F1F0}\u{1F1F7}", "\u{1F1F8}\u{1F1F8}", "\u{1F1EA}\u{1F1F8}", "\u{1F1F1}\u{1F1F0}", "\u{1F1E7}\u{1F1F1}", "\u{1F1F8}\u{1F1ED}", "\u{1F1F0}\u{1F1F3}", "\u{1F1F1}\u{1F1E8}", "\u{1F1F5}\u{1F1F2}", "\u{1F1FB}\u{1F1E8}", "\u{1F1F8}\u{1F1E9}", "\u{1F1F8}\u{1F1F7}", "\u{1F1F8}\u{1F1FF}", "\u{1F1F8}\u{1F1EA}", "\u{1F1E8}\u{1F1ED}", "\u{1F1F8}\u{1F1FE}", "\u{1F1F9}\u{1F1FC}", "\u{1F1F9}\u{1F1EF}", "\u{1F1F9}\u{1F1FF}", "\u{1F1F9}\u{1F1ED}", "\u{1F1F9}\u{1F1F1}", "\u{1F1F9}\u{1F1EC}", "\u{1F1F9}\u{1F1F0}", "\u{1F1F9}\u{1F1F4}", "\u{1F1F9}\u{1F1F9}", "\u{1F1F9}\u{1F1F3}", "\u{1F1F9}\u{1F1F7}", "\u{1F1F9}\u{1F1F2}", "\u{1F1F9}\u{1F1E8}", "\u{1F1F9}\u{1F1FB}", "\u{1F1FB}\u{1F1EE}", "\u{1F1FA}\u{1F1EC}", "\u{1F1FA}\u{1F1E6}", "\u{1F1E6}\u{1F1EA}", "\u{1F1EC}\u{1F1E7}", "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}", "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}", "\u{1F1FA}\u{1F1F3}", "\u{1F1FA}\u{1F1F8}", "\u{1F1FA}\u{1F1FE}", "\u{1F1FA}\u{1F1FF}", "\u{1F1FB}\u{1F1FA}", "\u{1F1FB}\u{1F1E6}", "\u{1F1FB}\u{1F1EA}", "\u{1F1FB}\u{1F1F3}", "\u{1F1FC}\u{1F1EB}", "\u{1F1EA}\u{1F1ED}", "\u{1F1FE}\u{1F1EA}", "\u{1F1FF}\u{1F1F2}", "\u{1F1FF}\u{1F1FC}"] }
];

// src/core/drawings/assets/faIcons.ts
var ICON_GROUPS = [
  { title: "Gestures & Smileys", tab: 61720, icons: [61575, 61576, 61796, 61797, 61604, 61605, 61447, 61606, 61607, 61720, 61722, 61721, 61827] },
  { title: "Symbols & Flags", tab: 61476, icons: [61725, 61726, 61476, 61444, 61445, 61446, 61510, 61452, 61453, 61457, 61458, 61473, 61470, 61842, 61505, 61770, 61525, 61526, 61527, 61529, 61528, 61530, 61531, 61532, 61533, 61534, 61543, 61544, 61545, 61546, 61553, 61550, 61552, 61557, 61578, 61603, 61669, 61712, 61713, 61731, 61732, 61708, 61736, 61737, 61738, 61760, 61715, 61820, 61817] },
  { title: "Nature", tab: 61548, icons: [61548, 61829, 61830, 61832, 61671] },
  { title: "Currency", tab: 61781, icons: [61779, 61780, 61781, 61782, 61783, 61784, 61785, 61845, 61786] },
  { title: "Objects", tab: 61675, icons: [61440, 61442, 61454, 61461, 61463, 61488, 61459, 61507, 61547, 61554, 61558, 61568, 61572, 61504, 61601, 61602, 61654, 61667, 61675, 61683, 61749, 61757] },
  { title: "Arrows", tab: 61537, icons: [61536, 61537, 61538, 61539, 61523, 61524, 61559, 61560, 61565, 61566, 61609, 61610, 61611, 61657, 61658, 61655, 61656, 61698, 61699, 61700, 61701, 61702, 61703, 61751, 61753, 61754, 61714, 61540, 61768, 61769, 61815, 61816, 61813, 61814, 61466, 61467, 61541, 61542] }
];
var FA_GLYPHS = {
  61440: { d: "M1699 1350q0 -35 -43 -78l-632 -632v-768h320q26 0 45 -19t19 -45t-19 -45t-45 -19h-896q-26 0 -45 19t-19 45t19 45t45 19h320v768l-632 632q-43 43 -43 78q0 23 18 36.5t38 17.5t43 4h1408q23 0 43 -4t38 -17.5t18 -36.5z", w: 1792 },
  61442: { d: "M1152 704q0 185 -131.5 316.5t-316.5 131.5t-316.5 -131.5t-131.5 -316.5t131.5 -316.5t316.5 -131.5t316.5 131.5t131.5 316.5zM1664 -128q0 -52 -38 -90t-90 -38q-54 0 -90 38l-343 342q-179 -124 -399 -124q-143 0 -273.5 55.5t-225 150t-150 225t-55.5 273.5 t55.5 273.5t150 225t225 150t273.5 55.5t273.5 -55.5t225 -150t150 -225t55.5 -273.5q0 -220 -124 -399l343 -343q37 -37 37 -90z", w: 1664 },
  61444: { d: "M896 -128q-26 0 -44 18l-624 602q-10 8 -27.5 26t-55.5 65.5t-68 97.5t-53.5 121t-23.5 138q0 220 127 344t351 124q62 0 126.5 -21.5t120 -58t95.5 -68.5t76 -68q36 36 76 68t95.5 68.5t120 58t126.5 21.5q224 0 351 -124t127 -344q0 -221 -229 -450l-623 -600 q-18 -18 -44 -18z", w: 1792 },
  61445: { d: "M1664 889q0 -22 -26 -48l-363 -354l86 -500q1 -7 1 -20q0 -21 -10.5 -35.5t-30.5 -14.5q-19 0 -40 12l-449 236l-449 -236q-22 -12 -40 -12q-21 0 -31.5 14.5t-10.5 35.5q0 6 2 20l86 500l-364 354q-25 27 -25 48q0 37 56 46l502 73l225 455q19 41 49 41t49 -41l225 -455 l502 -73q56 -9 56 -46z", w: 1664 },
  61446: { d: "M1137 532l306 297l-422 62l-189 382l-189 -382l-422 -62l306 -297l-73 -421l378 199l377 -199zM1664 889q0 -22 -26 -48l-363 -354l86 -500q1 -7 1 -20q0 -50 -41 -50q-19 0 -40 12l-449 236l-449 -236q-22 -12 -40 -12q-21 0 -31.5 14.5t-10.5 35.5q0 6 2 20l86 500 l-364 354q-25 27 -25 48q0 37 56 46l502 73l225 455q19 41 49 41t49 -41l225 -455l502 -73q56 -9 56 -46z", w: 1664 },
  61447: { d: "M1280 137q0 -109 -62.5 -187t-150.5 -78h-854q-88 0 -150.5 78t-62.5 187q0 85 8.5 160.5t31.5 152t58.5 131t94 89t134.5 34.5q131 -128 313 -128t313 128q76 0 134.5 -34.5t94 -89t58.5 -131t31.5 -152t8.5 -160.5zM1024 1024q0 -159 -112.5 -271.5t-271.5 -112.5 t-271.5 112.5t-112.5 271.5t112.5 271.5t271.5 112.5t271.5 -112.5t112.5 -271.5z", w: 1280 },
  61452: { d: "M1671 970q0 -40 -28 -68l-724 -724l-136 -136q-28 -28 -68 -28t-68 28l-136 136l-362 362q-28 28 -28 68t28 68l136 136q28 28 68 28t68 -28l294 -295l656 657q28 28 68 28t68 -28l136 -136q28 -28 28 -68z", w: 1792 },
  61453: { d: "M1298 214q0 -40 -28 -68l-136 -136q-28 -28 -68 -28t-68 28l-294 294l-294 -294q-28 -28 -68 -28t-68 28l-136 136q-28 28 -28 68t28 68l294 294l-294 294q-28 28 -28 68t28 68l136 136q28 28 68 28t68 -28l294 -294l294 294q28 28 68 28t68 -28l136 -136q28 -28 28 -68 t-28 -68l-294 -294l294 -294q28 -28 28 -68z", w: 1408 },
  61454: { d: "M1024 736v-64q0 -13 -9.5 -22.5t-22.5 -9.5h-224v-224q0 -13 -9.5 -22.5t-22.5 -9.5h-64q-13 0 -22.5 9.5t-9.5 22.5v224h-224q-13 0 -22.5 9.5t-9.5 22.5v64q0 13 9.5 22.5t22.5 9.5h224v224q0 13 9.5 22.5t22.5 9.5h64q13 0 22.5 -9.5t9.5 -22.5v-224h224 q13 0 22.5 -9.5t9.5 -22.5zM1152 704q0 185 -131.5 316.5t-316.5 131.5t-316.5 -131.5t-131.5 -316.5t131.5 -316.5t316.5 -131.5t316.5 131.5t131.5 316.5zM1664 -128q0 -53 -37.5 -90.5t-90.5 -37.5q-54 0 -90 38l-343 342q-179 -124 -399 -124q-143 0 -273.5 55.5 t-225 150t-150 225t-55.5 273.5t55.5 273.5t150 225t225 150t273.5 55.5t273.5 -55.5t225 -150t150 -225t55.5 -273.5q0 -220 -124 -399l343 -343q37 -37 37 -90z", w: 1664 },
  61457: { d: "M1536 640q0 -156 -61 -298t-164 -245t-245 -164t-298 -61t-298 61t-245 164t-164 245t-61 298q0 182 80.5 343t226.5 270q43 32 95.5 25t83.5 -50q32 -42 24.5 -94.5t-49.5 -84.5q-98 -74 -151.5 -181t-53.5 -228q0 -104 40.5 -198.5t109.5 -163.5t163.5 -109.5 t198.5 -40.5t198.5 40.5t163.5 109.5t109.5 163.5t40.5 198.5q0 121 -53.5 228t-151.5 181q-42 32 -49.5 84.5t24.5 94.5q31 43 84 50t95 -25q146 -109 226.5 -270t80.5 -343zM896 1408v-640q0 -52 -38 -90t-90 -38t-90 38t-38 90v640q0 52 38 90t90 38t90 -38t38 -90z", w: 1536 },
  61458: { d: "M256 96v-192q0 -14 -9 -23t-23 -9h-192q-14 0 -23 9t-9 23v192q0 14 9 23t23 9h192q14 0 23 -9t9 -23zM640 224v-320q0 -14 -9 -23t-23 -9h-192q-14 0 -23 9t-9 23v320q0 14 9 23t23 9h192q14 0 23 -9t9 -23zM1024 480v-576q0 -14 -9 -23t-23 -9h-192q-14 0 -23 9t-9 23 v576q0 14 9 23t23 9h192q14 0 23 -9t9 -23zM1408 864v-960q0 -14 -9 -23t-23 -9h-192q-14 0 -23 9t-9 23v960q0 14 9 23t23 9h192q14 0 23 -9t9 -23zM1792 1376v-1472q0 -14 -9 -23t-23 -9h-192q-14 0 -23 9t-9 23v1472q0 14 9 23t23 9h192q14 0 23 -9t9 -23z", w: 1792 },
  61459: { d: "M1024 640q0 106 -75 181t-181 75t-181 -75t-75 -181t75 -181t181 -75t181 75t75 181zM1536 749v-222q0 -12 -8 -23t-20 -13l-185 -28q-19 -54 -39 -91q35 -50 107 -138q10 -12 10 -25t-9 -23q-27 -37 -99 -108t-94 -71q-12 0 -26 9l-138 108q-44 -23 -91 -38 q-16 -136 -29 -186q-7 -28 -36 -28h-222q-14 0 -24.5 8.5t-11.5 21.5l-28 184q-49 16 -90 37l-141 -107q-10 -9 -25 -9q-14 0 -25 11q-126 114 -165 168q-7 10 -7 23q0 12 8 23q15 21 51 66.5t54 70.5q-27 50 -41 99l-183 27q-13 2 -21 12.5t-8 23.5v222q0 12 8 23t19 13 l186 28q14 46 39 92q-40 57 -107 138q-10 12 -10 24q0 10 9 23q26 36 98.5 107.5t94.5 71.5q13 0 26 -10l138 -107q44 23 91 38q16 136 29 186q7 28 36 28h222q14 0 24.5 -8.5t11.5 -21.5l28 -184q49 -16 90 -37l142 107q9 9 24 9q13 0 25 -10q129 -119 165 -170q7 -8 7 -22 q0 -12 -8 -23q-15 -21 -51 -66.5t-54 -70.5q26 -50 41 -98l183 -28q13 -2 21 -12.5t8 -23.5z", w: 1536 },
  61461: { d: "M1408 544v-480q0 -26 -19 -45t-45 -19h-384v384h-256v-384h-384q-26 0 -45 19t-19 45v480q0 1 0.5 3t0.5 3l575 474l575 -474q1 -2 1 -6zM1631 613l-62 -74q-8 -9 -21 -11h-3q-13 0 -21 7l-692 577l-692 -577q-12 -8 -24 -7q-13 2 -21 11l-62 74q-8 10 -7 23.5t11 21.5 l719 599q32 26 76 26t76 -26l244 -204v195q0 14 9 23t23 9h192q14 0 23 -9t9 -23v-408l219 -182q10 -8 11 -21.5t-7 -23.5z", w: 1664 },
  61463: { d: "M896 992v-448q0 -14 -9 -23t-23 -9h-320q-14 0 -23 9t-9 23v64q0 14 9 23t23 9h224v352q0 14 9 23t23 9h64q14 0 23 -9t9 -23zM1312 640q0 148 -73 273t-198 198t-273 73t-273 -73t-198 -198t-73 -273t73 -273t198 -198t273 -73t273 73t198 198t73 273zM1536 640 q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61466: { d: "M1120 608q0 -12 -10 -24l-319 -319q-11 -9 -23 -9t-23 9l-320 320q-15 16 -7 35q8 20 30 20h192v352q0 14 9 23t23 9h192q14 0 23 -9t9 -23v-352h192q14 0 23 -9t9 -23zM768 1184q-148 0 -273 -73t-198 -198t-73 -273t73 -273t198 -198t273 -73t273 73t198 198t73 273 t-73 273t-198 198t-273 73zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61467: { d: "M1118 660q-8 -20 -30 -20h-192v-352q0 -14 -9 -23t-23 -9h-192q-14 0 -23 9t-9 23v352h-192q-14 0 -23 9t-9 23q0 12 10 24l319 319q11 9 23 9t23 -9l320 -320q15 -16 7 -35zM768 1184q-148 0 -273 -73t-198 -198t-73 -273t73 -273t198 -198t273 -73t273 73t198 198 t73 273t-73 273t-198 198t-273 73zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61470: { d: "M1536 1280v-448q0 -26 -19 -45t-45 -19h-448q-42 0 -59 40q-17 39 14 69l138 138q-148 137 -349 137q-104 0 -198.5 -40.5t-163.5 -109.5t-109.5 -163.5t-40.5 -198.5t40.5 -198.5t109.5 -163.5t163.5 -109.5t198.5 -40.5q119 0 225 52t179 147q7 10 23 12q15 0 25 -9 l137 -138q9 -8 9.5 -20.5t-7.5 -22.5q-109 -132 -264 -204.5t-327 -72.5q-156 0 -298 61t-245 164t-164 245t-61 298t61 298t164 245t245 164t298 61q147 0 284.5 -55.5t244.5 -156.5l130 129q29 31 70 14q39 -17 39 -59z", w: 1536 },
  61473: { d: "M1511 480q0 -5 -1 -7q-64 -268 -268 -434.5t-478 -166.5q-146 0 -282.5 55t-243.5 157l-129 -129q-19 -19 -45 -19t-45 19t-19 45v448q0 26 19 45t45 19h448q26 0 45 -19t19 -45t-19 -45l-137 -137q71 -66 161 -102t187 -36q134 0 250 65t186 179q11 17 53 117 q8 23 30 23h192q13 0 22.5 -9.5t9.5 -22.5zM1536 1280v-448q0 -26 -19 -45t-45 -19h-448q-26 0 -45 19t-19 45t19 45l138 138q-148 137 -349 137q-134 0 -250 -65t-186 -179q-11 -17 -53 -117q-8 -23 -30 -23h-199q-13 0 -22.5 9.5t-9.5 22.5v7q65 268 270 434.5t480 166.5 q146 0 284 -55.5t245 -156.5l130 129q19 19 45 19t45 -19t19 -45z", w: 1536 },
  61476: { d: "M320 1280q0 -72 -64 -110v-1266q0 -13 -9.5 -22.5t-22.5 -9.5h-64q-13 0 -22.5 9.5t-9.5 22.5v1266q-64 38 -64 110q0 53 37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1792 1216v-763q0 -25 -12.5 -38.5t-39.5 -27.5q-215 -116 -369 -116q-61 0 -123.5 22t-108.5 48 t-115.5 48t-142.5 22q-192 0 -464 -146q-17 -9 -33 -9q-26 0 -45 19t-19 45v742q0 32 31 55q21 14 79 43q236 120 421 120q107 0 200 -29t219 -88q38 -19 88 -19q54 0 117.5 21t110 47t88 47t54.5 21q26 0 45 -19t19 -45z", w: 1792 },
  61488: { d: "M960 864q119 0 203.5 -84.5t84.5 -203.5t-84.5 -203.5t-203.5 -84.5t-203.5 84.5t-84.5 203.5t84.5 203.5t203.5 84.5zM1664 1280q106 0 181 -75t75 -181v-896q0 -106 -75 -181t-181 -75h-1408q-106 0 -181 75t-75 181v896q0 106 75 181t181 75h224l51 136 q19 49 69.5 84.5t103.5 35.5h512q53 0 103.5 -35.5t69.5 -84.5l51 -136h224zM960 128q185 0 316.5 131.5t131.5 316.5t-131.5 316.5t-316.5 131.5t-316.5 -131.5t-131.5 -316.5t131.5 -316.5t316.5 -131.5z", w: 1920 },
  61504: { d: "M363 0l91 91l-235 235l-91 -91v-107h128v-128h107zM886 928q0 22 -22 22q-10 0 -17 -7l-542 -542q-7 -7 -7 -17q0 -22 22 -22q10 0 17 7l542 542q7 7 7 17zM832 1120l416 -416l-832 -832h-416v416zM1515 1024q0 -53 -37 -90l-166 -166l-416 416l166 165q36 38 90 38 q53 0 91 -38l235 -234q37 -39 37 -91z", w: 1536 },
  61505: { d: "M768 896q0 106 -75 181t-181 75t-181 -75t-75 -181t75 -181t181 -75t181 75t75 181zM1024 896q0 -109 -33 -179l-364 -774q-16 -33 -47.5 -52t-67.5 -19t-67.5 19t-46.5 52l-365 774q-33 70 -33 179q0 212 150 362t362 150t362 -150t150 -362z", w: 1024 },
  61507: { d: "M512 384q0 36 -20 69q-1 1 -15.5 22.5t-25.5 38t-25 44t-21 50.5q-4 16 -21 16t-21 -16q-7 -23 -21 -50.5t-25 -44t-25.5 -38t-15.5 -22.5q-20 -33 -20 -69q0 -53 37.5 -90.5t90.5 -37.5t90.5 37.5t37.5 90.5zM1024 512q0 -212 -150 -362t-362 -150t-362 150t-150 362 q0 145 81 275q6 9 62.5 90.5t101 151t99.5 178t83 201.5q9 30 34 47t51 17t51.5 -17t33.5 -47q28 -93 83 -201.5t99.5 -178t101 -151t62.5 -90.5q81 -127 81 -275z", w: 1024 },
  61510: { d: "M1408 606v-318q0 -119 -84.5 -203.5t-203.5 -84.5h-832q-119 0 -203.5 84.5t-84.5 203.5v832q0 119 84.5 203.5t203.5 84.5h832q63 0 117 -25q15 -7 18 -23q3 -17 -9 -29l-49 -49q-10 -10 -23 -10q-3 0 -9 2q-23 6 -45 6h-832q-66 0 -113 -47t-47 -113v-832 q0 -66 47 -113t113 -47h832q66 0 113 47t47 113v254q0 13 9 22l64 64q10 10 23 10q6 0 12 -3q20 -8 20 -29zM1639 1095l-814 -814q-24 -24 -57 -24t-57 24l-430 430q-24 24 -24 57t24 57l110 110q24 24 57 24t57 -24l263 -263l647 647q24 24 57 24t57 -24l110 -110 q24 -24 24 -57t-24 -57z", w: 1664 },
  61523: { d: "M1171 1235l-531 -531l531 -531q19 -19 19 -45t-19 -45l-166 -166q-19 -19 -45 -19t-45 19l-742 742q-19 19 -19 45t19 45l742 742q19 19 45 19t45 -19l166 -166q19 -19 19 -45t-19 -45z", w: 1280 },
  61524: { d: "M1107 659l-742 -742q-19 -19 -45 -19t-45 19l-166 166q-19 19 -19 45t19 45l531 531l-531 531q-19 19 -19 45t19 45l166 166q19 19 45 19t45 -19l742 -742q19 -19 19 -45t-19 -45z", w: 1280 },
  61525: { d: "M1216 576v128q0 26 -19 45t-45 19h-256v256q0 26 -19 45t-45 19h-128q-26 0 -45 -19t-19 -45v-256h-256q-26 0 -45 -19t-19 -45v-128q0 -26 19 -45t45 -19h256v-256q0 -26 19 -45t45 -19h128q26 0 45 19t19 45v256h256q26 0 45 19t19 45zM1536 640q0 -209 -103 -385.5 t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61526: { d: "M1216 576v128q0 26 -19 45t-45 19h-768q-26 0 -45 -19t-19 -45v-128q0 -26 19 -45t45 -19h768q26 0 45 19t19 45zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5 t103 -385.5z", w: 1536 },
  61527: { d: "M1149 414q0 26 -19 45l-181 181l181 181q19 19 19 45q0 27 -19 46l-90 90q-19 19 -46 19q-26 0 -45 -19l-181 -181l-181 181q-19 19 -45 19q-27 0 -46 -19l-90 -90q-19 -19 -19 -46q0 -26 19 -45l181 -181l-181 -181q-19 -19 -19 -45q0 -27 19 -46l90 -90q19 -19 46 -19 q26 0 45 19l181 181l181 -181q19 -19 45 -19q27 0 46 19l90 90q19 19 19 46zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61528: { d: "M1284 802q0 28 -18 46l-91 90q-19 19 -45 19t-45 -19l-408 -407l-226 226q-19 19 -45 19t-45 -19l-91 -90q-18 -18 -18 -46q0 -27 18 -45l362 -362q19 -19 45 -19q27 0 46 19l543 543q18 18 18 45zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103 t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61529: { d: "M896 160v192q0 14 -9 23t-23 9h-192q-14 0 -23 -9t-9 -23v-192q0 -14 9 -23t23 -9h192q14 0 23 9t9 23zM1152 832q0 88 -55.5 163t-138.5 116t-170 41q-243 0 -371 -213q-15 -24 8 -42l132 -100q7 -6 19 -6q16 0 25 12q53 68 86 92q34 24 86 24q48 0 85.5 -26t37.5 -59 q0 -38 -20 -61t-68 -45q-63 -28 -115.5 -86.5t-52.5 -125.5v-36q0 -14 9 -23t23 -9h192q14 0 23 9t9 23q0 19 21.5 49.5t54.5 49.5q32 18 49 28.5t46 35t44.5 48t28 60.5t12.5 81zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5 t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61530: { d: "M1024 160v160q0 14 -9 23t-23 9h-96v512q0 14 -9 23t-23 9h-320q-14 0 -23 -9t-9 -23v-160q0 -14 9 -23t23 -9h96v-320h-96q-14 0 -23 -9t-9 -23v-160q0 -14 9 -23t23 -9h448q14 0 23 9t9 23zM896 1056v160q0 14 -9 23t-23 9h-192q-14 0 -23 -9t-9 -23v-160q0 -14 9 -23 t23 -9h192q14 0 23 9t9 23zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61531: { d: "M1197 512h-109q-26 0 -45 19t-19 45v128q0 26 19 45t45 19h109q-32 108 -112.5 188.5t-188.5 112.5v-109q0 -26 -19 -45t-45 -19h-128q-26 0 -45 19t-19 45v109q-108 -32 -188.5 -112.5t-112.5 -188.5h109q26 0 45 -19t19 -45v-128q0 -26 -19 -45t-45 -19h-109 q32 -108 112.5 -188.5t188.5 -112.5v109q0 26 19 45t45 19h128q26 0 45 -19t19 -45v-109q108 32 188.5 112.5t112.5 188.5zM1536 704v-128q0 -26 -19 -45t-45 -19h-143q-37 -161 -154.5 -278.5t-278.5 -154.5v-143q0 -26 -19 -45t-45 -19h-128q-26 0 -45 19t-19 45v143 q-161 37 -278.5 154.5t-154.5 278.5h-143q-26 0 -45 19t-19 45v128q0 26 19 45t45 19h143q37 161 154.5 278.5t278.5 154.5v143q0 26 19 45t45 19h128q26 0 45 -19t19 -45v-143q161 -37 278.5 -154.5t154.5 -278.5h143q26 0 45 -19t19 -45z", w: 1536 },
  61532: { d: "M1097 457l-146 -146q-10 -10 -23 -10t-23 10l-137 137l-137 -137q-10 -10 -23 -10t-23 10l-146 146q-10 10 -10 23t10 23l137 137l-137 137q-10 10 -10 23t10 23l146 146q10 10 23 10t23 -10l137 -137l137 137q10 10 23 10t23 -10l146 -146q10 -10 10 -23t-10 -23 l-137 -137l137 -137q10 -10 10 -23t-10 -23zM1312 640q0 148 -73 273t-198 198t-273 73t-273 -73t-198 -198t-73 -273t73 -273t198 -198t273 -73t273 73t198 198t73 273zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5 t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61533: { d: "M1171 723l-422 -422q-19 -19 -45 -19t-45 19l-294 294q-19 19 -19 45t19 45l102 102q19 19 45 19t45 -19l147 -147l275 275q19 19 45 19t45 -19l102 -102q19 -19 19 -45t-19 -45zM1312 640q0 148 -73 273t-198 198t-273 73t-273 -73t-198 -198t-73 -273t73 -273t198 -198 t273 -73t273 73t198 198t73 273zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61534: { d: "M1312 643q0 161 -87 295l-754 -753q137 -89 297 -89q111 0 211.5 43.5t173.5 116.5t116 174.5t43 212.5zM313 344l755 754q-135 91 -300 91q-148 0 -273 -73t-198 -199t-73 -274q0 -162 89 -299zM1536 643q0 -157 -61 -300t-163.5 -246t-245 -164t-298.5 -61t-298.5 61 t-245 164t-163.5 246t-61 300t61 299.5t163.5 245.5t245 164t298.5 61t298.5 -61t245 -164t163.5 -245.5t61 -299.5z", w: 1536 },
  61536: { d: "M1536 640v-128q0 -53 -32.5 -90.5t-84.5 -37.5h-704l293 -294q38 -36 38 -90t-38 -90l-75 -76q-37 -37 -90 -37q-52 0 -91 37l-651 652q-37 37 -37 90q0 52 37 91l651 650q38 38 91 38q52 0 90 -38l75 -74q38 -38 38 -91t-38 -91l-293 -293h704q52 0 84.5 -37.5 t32.5 -90.5z", w: 1536 },
  61537: { d: "M1472 576q0 -54 -37 -91l-651 -651q-39 -37 -91 -37q-51 0 -90 37l-75 75q-38 38 -38 91t38 91l293 293h-704q-52 0 -84.5 37.5t-32.5 90.5v128q0 53 32.5 90.5t84.5 37.5h704l-293 294q-38 36 -38 90t38 90l75 75q38 38 90 38q53 0 91 -38l651 -651q37 -35 37 -90z", w: 1536 },
  61538: { d: "M1611 565q0 -51 -37 -90l-75 -75q-38 -38 -91 -38q-54 0 -90 38l-294 293v-704q0 -52 -37.5 -84.5t-90.5 -32.5h-128q-53 0 -90.5 32.5t-37.5 84.5v704l-294 -293q-36 -38 -90 -38t-90 38l-75 75q-38 38 -38 90q0 53 38 91l651 651q35 37 90 37q54 0 91 -37l651 -651 q37 -39 37 -91z", w: 1664 },
  61539: { d: "M1611 704q0 -53 -37 -90l-651 -652q-39 -37 -91 -37q-53 0 -90 37l-651 652q-38 36 -38 90q0 53 38 91l74 75q39 37 91 37q53 0 90 -37l294 -294v704q0 52 38 90t90 38h128q52 0 90 -38t38 -90v-704l294 294q37 37 90 37q52 0 91 -37l75 -75q37 -39 37 -91z", w: 1664 },
  61540: { d: "M1792 896q0 -26 -19 -45l-512 -512q-19 -19 -45 -19t-45 19t-19 45v256h-224q-98 0 -175.5 -6t-154 -21.5t-133 -42.5t-105.5 -69.5t-80 -101t-48.5 -138.5t-17.5 -181q0 -55 5 -123q0 -6 2.5 -23.5t2.5 -26.5q0 -15 -8.5 -25t-23.5 -10q-16 0 -28 17q-7 9 -13 22 t-13.5 30t-10.5 24q-127 285 -127 451q0 199 53 333q162 403 875 403h224v256q0 26 19 45t45 19t45 -19l512 -512q19 -19 19 -45z", w: 1792 },
  61541: { d: "M755 480q0 -13 -10 -23l-332 -332l144 -144q19 -19 19 -45t-19 -45t-45 -19h-448q-26 0 -45 19t-19 45v448q0 26 19 45t45 19t45 -19l144 -144l332 332q10 10 23 10t23 -10l114 -114q10 -10 10 -23zM1536 1344v-448q0 -26 -19 -45t-45 -19t-45 19l-144 144l-332 -332 q-10 -10 -23 -10t-23 10l-114 114q-10 10 -10 23t10 23l332 332l-144 144q-19 19 -19 45t19 45t45 19h448q26 0 45 -19t19 -45z", w: 1536 },
  61542: { d: "M768 576v-448q0 -26 -19 -45t-45 -19t-45 19l-144 144l-332 -332q-10 -10 -23 -10t-23 10l-114 114q-10 10 -10 23t10 23l332 332l-144 144q-19 19 -19 45t19 45t45 19h448q26 0 45 -19t19 -45zM1523 1248q0 -13 -10 -23l-332 -332l144 -144q19 -19 19 -45t-19 -45 t-45 -19h-448q-26 0 -45 19t-19 45v448q0 26 19 45t45 19t45 -19l144 -144l332 332q10 10 23 10t23 -10l114 -114q10 -10 10 -23z", w: 1536 },
  61543: { d: "M1408 800v-192q0 -40 -28 -68t-68 -28h-416v-416q0 -40 -28 -68t-68 -28h-192q-40 0 -68 28t-28 68v416h-416q-40 0 -68 28t-28 68v192q0 40 28 68t68 28h416v416q0 40 28 68t68 28h192q40 0 68 -28t28 -68v-416h416q40 0 68 -28t28 -68z", w: 1408 },
  61544: { d: "M1408 800v-192q0 -40 -28 -68t-68 -28h-1216q-40 0 -68 28t-28 68v192q0 40 28 68t68 28h1216q40 0 68 -28t28 -68z", w: 1408 },
  61545: { d: "M1482 486q46 -26 59.5 -77.5t-12.5 -97.5l-64 -110q-26 -46 -77.5 -59.5t-97.5 12.5l-266 153v-307q0 -52 -38 -90t-90 -38h-128q-52 0 -90 38t-38 90v307l-266 -153q-46 -26 -97.5 -12.5t-77.5 59.5l-64 110q-26 46 -12.5 97.5t59.5 77.5l266 154l-266 154 q-46 26 -59.5 77.5t12.5 97.5l64 110q26 46 77.5 59.5t97.5 -12.5l266 -153v307q0 52 38 90t90 38h128q52 0 90 -38t38 -90v-307l266 153q46 26 97.5 12.5t77.5 -59.5l64 -110q26 -46 12.5 -97.5t-59.5 -77.5l-266 -154z", w: 1664 },
  61546: { d: "M768 1408q209 0 385.5 -103t279.5 -279.5t103 -385.5t-103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103zM896 161v190q0 14 -9 23.5t-22 9.5h-192q-13 0 -23 -10t-10 -23v-190q0 -13 10 -23t23 -10h192 q13 0 22 9.5t9 23.5zM894 505l18 621q0 12 -10 18q-10 8 -24 8h-220q-14 0 -24 -8q-10 -6 -10 -18l17 -621q0 -10 10 -17.5t24 -7.5h185q14 0 23.5 7.5t10.5 17.5z", w: 1536 },
  61547: { d: "M928 180v56v468v192h-320v-192v-468v-56q0 -25 18 -38.5t46 -13.5h192q28 0 46 13.5t18 38.5zM472 1024h195l-126 161q-26 31 -69 31q-40 0 -68 -28t-28 -68t28 -68t68 -28zM1160 1120q0 40 -28 68t-68 28q-43 0 -69 -31l-125 -161h194q40 0 68 28t28 68zM1536 864v-320 q0 -14 -9 -23t-23 -9h-96v-416q0 -40 -28 -68t-68 -28h-1088q-40 0 -68 28t-28 68v416h-96q-14 0 -23 9t-9 23v320q0 14 9 23t23 9h440q-93 0 -158.5 65.5t-65.5 158.5t65.5 158.5t158.5 65.5q107 0 168 -77l128 -165l128 165q61 77 168 77q93 0 158.5 -65.5t65.5 -158.5 t-65.5 -158.5t-158.5 -65.5h440q14 0 23 -9t9 -23z", w: 1536 },
  61548: { d: "M1280 832q0 26 -19 45t-45 19q-172 0 -318 -49.5t-259.5 -134t-235.5 -219.5q-19 -21 -19 -45q0 -26 19 -45t45 -19q24 0 45 19q27 24 74 71t67 66q137 124 268.5 176t313.5 52q26 0 45 19t19 45zM1792 1030q0 -95 -20 -193q-46 -224 -184.5 -383t-357.5 -268 q-214 -108 -438 -108q-148 0 -286 47q-15 5 -88 42t-96 37q-16 0 -39.5 -32t-45 -70t-52.5 -70t-60 -32q-43 0 -63.5 17.5t-45.5 59.5q-2 4 -6 11t-5.5 10t-3 9.5t-1.5 13.5q0 35 31 73.5t68 65.5t68 56t31 48q0 4 -14 38t-16 44q-9 51 -9 104q0 115 43.5 220t119 184.5 t170.5 139t204 95.5q55 18 145 25.5t179.5 9t178.5 6t163.5 24t113.5 56.5l29.5 29.5t29.5 28t27 20t36.5 16t43.5 4.5q39 0 70.5 -46t47.5 -112t24 -124t8 -96z", w: 1792 },
  61550: { d: "M1664 576q-152 236 -381 353q61 -104 61 -225q0 -185 -131.5 -316.5t-316.5 -131.5t-316.5 131.5t-131.5 316.5q0 121 61 225q-229 -117 -381 -353q133 -205 333.5 -326.5t434.5 -121.5t434.5 121.5t333.5 326.5zM944 960q0 20 -14 34t-34 14q-125 0 -214.5 -89.5 t-89.5 -214.5q0 -20 14 -34t34 -14t34 14t14 34q0 86 61 147t147 61q20 0 34 14t14 34zM1792 576q0 -34 -20 -69q-140 -230 -376.5 -368.5t-499.5 -138.5t-499.5 139t-376.5 368q-20 35 -20 69t20 69q140 229 376.5 368t499.5 139t499.5 -139t376.5 -368q20 -35 20 -69z", w: 1792 },
  61552: { d: "M555 201l78 141q-87 63 -136 159t-49 203q0 121 61 225q-229 -117 -381 -353q167 -258 427 -375zM944 960q0 20 -14 34t-34 14q-125 0 -214.5 -89.5t-89.5 -214.5q0 -20 14 -34t34 -14t34 14t14 34q0 86 61 147t147 61q20 0 34 14t14 34zM1307 1151q0 -7 -1 -9 q-106 -189 -316 -567t-315 -566l-49 -89q-10 -16 -28 -16q-12 0 -134 70q-16 10 -16 28q0 12 44 87q-143 65 -263.5 173t-208.5 245q-20 31 -20 69t20 69q153 235 380 371t496 136q89 0 180 -17l54 97q10 16 28 16q5 0 18 -6t31 -15.5t33 -18.5t31.5 -18.5t19.5 -11.5 q16 -10 16 -27zM1344 704q0 -139 -79 -253.5t-209 -164.5l280 502q8 -45 8 -84zM1792 576q0 -35 -20 -69q-39 -64 -109 -145q-150 -172 -347.5 -267t-419.5 -95l74 132q212 18 392.5 137t301.5 307q-115 179 -282 294l63 112q95 -64 182.5 -153t144.5 -184q20 -34 20 -69z", w: 1792 },
  61553: { d: "M1024 161v190q0 14 -9.5 23.5t-22.5 9.5h-192q-13 0 -22.5 -9.5t-9.5 -23.5v-190q0 -14 9.5 -23.5t22.5 -9.5h192q13 0 22.5 9.5t9.5 23.5zM1022 535l18 459q0 12 -10 19q-13 11 -24 11h-220q-11 0 -24 -11q-10 -7 -10 -21l17 -457q0 -10 10 -16.5t24 -6.5h185 q14 0 23.5 6.5t10.5 16.5zM1008 1469l768 -1408q35 -63 -2 -126q-17 -29 -46.5 -46t-63.5 -17h-1536q-34 0 -63.5 17t-46.5 46q-37 63 -2 126l768 1408q17 31 47 49t65 18t65 -18t47 -49z", w: 1792 },
  61554: { d: "M1376 1376q44 -52 12 -148t-108 -172l-161 -161l160 -696q5 -19 -12 -33l-128 -96q-7 -6 -19 -6q-4 0 -7 1q-15 3 -21 16l-279 508l-259 -259l53 -194q5 -17 -8 -31l-96 -96q-9 -9 -23 -9h-2q-15 2 -24 13l-189 252l-252 189q-11 7 -13 23q-1 13 9 25l96 97q9 9 23 9 q6 0 8 -1l194 -53l259 259l-508 279q-14 8 -17 24q-2 16 9 27l128 128q14 13 30 8l665 -159l160 160q76 76 172 108t148 -12z", w: 1408 },
  61557: { d: "M1792 640q0 -174 -120 -321.5t-326 -233t-450 -85.5q-70 0 -145 8q-198 -175 -460 -242q-49 -14 -114 -22q-17 -2 -30.5 9t-17.5 29v1q-3 4 -0.5 12t2 10t4.5 9.5l6 9t7 8.5t8 9q7 8 31 34.5t34.5 38t31 39.5t32.5 51t27 59t26 76q-157 89 -247.5 220t-90.5 281 q0 130 71 248.5t191 204.5t286 136.5t348 50.5q244 0 450 -85.5t326 -233t120 -321.5z", w: 1792 },
  61558: { d: "M1536 704v-128q0 -201 -98.5 -362t-274 -251.5t-395.5 -90.5t-395.5 90.5t-274 251.5t-98.5 362v128q0 26 19 45t45 19h384q26 0 45 -19t19 -45v-128q0 -52 23.5 -90t53.5 -57t71 -30t64 -13t44 -2t44 2t64 13t71 30t53.5 57t23.5 90v128q0 26 19 45t45 19h384 q26 0 45 -19t19 -45zM512 1344v-384q0 -26 -19 -45t-45 -19h-384q-26 0 -45 19t-19 45v384q0 26 19 45t45 19h384q26 0 45 -19t19 -45zM1536 1344v-384q0 -26 -19 -45t-45 -19h-384q-26 0 -45 19t-19 45v384q0 26 19 45t45 19h384q26 0 45 -19t19 -45z", w: 1536 },
  61559: { d: "M1683 205l-166 -165q-19 -19 -45 -19t-45 19l-531 531l-531 -531q-19 -19 -45 -19t-45 19l-166 165q-19 19 -19 45.5t19 45.5l742 741q19 19 45 19t45 -19l742 -741q19 -19 19 -45.5t-19 -45.5z", w: 1792 },
  61560: { d: "M1683 728l-742 -741q-19 -19 -45 -19t-45 19l-742 741q-19 19 -19 45.5t19 45.5l166 165q19 19 45 19t45 -19l531 -531l531 531q19 19 45 19t45 -19l166 -165q19 -19 19 -45.5t-19 -45.5z", w: 1792 },
  61565: { d: "M704 1216q0 -26 -19 -45t-45 -19h-128v-1024h128q26 0 45 -19t19 -45t-19 -45l-256 -256q-19 -19 -45 -19t-45 19l-256 256q-19 19 -19 45t19 45t45 19h128v1024h-128q-26 0 -45 19t-19 45t19 45l256 256q19 19 45 19t45 -19l256 -256q19 -19 19 -45z", w: 768 },
  61566: { d: "M1792 640q0 -26 -19 -45l-256 -256q-19 -19 -45 -19t-45 19t-19 45v128h-1024v-128q0 -26 -19 -45t-45 -19t-45 19l-256 256q-19 19 -19 45t19 45l256 256q19 19 45 19t45 -19t19 -45v-128h1024v128q0 26 19 45t45 19t45 -19l256 -256q19 -19 19 -45z", w: 1792 },
  61568: { d: "M640 640v-512h-256v512h256zM1024 1152v-1024h-256v1024h256zM2048 0v-128h-2048v1536h128v-1408h1920zM1408 896v-768h-256v768h256zM1792 1280v-1152h-256v1152h256z", w: 2048 },
  61572: { d: "M832 1024q0 80 -56 136t-136 56t-136 -56t-56 -136q0 -42 19 -83q-41 19 -83 19q-80 0 -136 -56t-56 -136t56 -136t136 -56t136 56t56 136q0 42 -19 83q41 -19 83 -19q80 0 136 56t56 136zM1683 320q0 -17 -49 -66t-66 -49q-9 0 -28.5 16t-36.5 33t-38.5 40t-24.5 26 l-96 -96l220 -220q28 -28 28 -68q0 -42 -39 -81t-81 -39q-40 0 -68 28l-671 671q-176 -131 -365 -131q-163 0 -265.5 102.5t-102.5 265.5q0 160 95 313t248 248t313 95q163 0 265.5 -102.5t102.5 -265.5q0 -189 -131 -365l355 -355l96 96q-3 3 -26 24.5t-40 38.5t-33 36.5 t-16 28.5q0 17 49 66t66 49q13 0 23 -10q6 -6 46 -44.5t82 -79.5t86.5 -86t73 -78t28.5 -41z", w: 1792 },
  61575: { d: "M256 192q0 26 -19 45t-45 19t-45 -19t-19 -45t19 -45t45 -19t45 19t19 45zM1408 768q0 51 -39 89.5t-89 38.5h-352q0 58 48 159.5t48 160.5q0 98 -32 145t-128 47q-26 -26 -38 -85t-30.5 -125.5t-59.5 -109.5q-22 -23 -77 -91q-4 -5 -23 -30t-31.5 -41t-34.5 -42.5 t-40 -44t-38.5 -35.5t-40 -27t-35.5 -9h-32v-640h32q13 0 31.5 -3t33 -6.5t38 -11t35 -11.5t35.5 -12.5t29 -10.5q211 -73 342 -73h121q192 0 192 167q0 26 -5 56q30 16 47.5 52.5t17.5 73.5t-18 69q53 50 53 119q0 25 -10 55.5t-25 47.5q32 1 53.5 47t21.5 81zM1536 769 q0 -89 -49 -163q9 -33 9 -69q0 -77 -38 -144q3 -21 3 -43q0 -101 -60 -178q1 -139 -85 -219.5t-227 -80.5h-36h-93q-96 0 -189.5 22.5t-216.5 65.5q-116 40 -138 40h-288q-53 0 -90.5 37.5t-37.5 90.5v640q0 53 37.5 90.5t90.5 37.5h274q36 24 137 155q58 75 107 128 q24 25 35.5 85.5t30.5 126.5t62 108q39 37 90 37q84 0 151 -32.5t102 -101.5t35 -186q0 -93 -48 -192h176q104 0 180 -76t76 -179z", w: 1536 },
  61576: { d: "M256 1088q0 26 -19 45t-45 19t-45 -19t-19 -45t19 -45t45 -19t45 19t19 45zM1408 512q0 35 -21.5 81t-53.5 47q15 17 25 47.5t10 55.5q0 69 -53 119q18 31 18 69q0 37 -17.5 73.5t-47.5 52.5q5 30 5 56q0 85 -49 126t-136 41h-128q-131 0 -342 -73q-5 -2 -29 -10.5 t-35.5 -12.5t-35 -11.5t-38 -11t-33 -6.5t-31.5 -3h-32v-640h32q16 0 35.5 -9t40 -27t38.5 -35.5t40 -44t34.5 -42.5t31.5 -41t23 -30q55 -68 77 -91q41 -43 59.5 -109.5t30.5 -125.5t38 -85q96 0 128 47t32 145q0 59 -48 160.5t-48 159.5h352q50 0 89 38.5t39 89.5z M1536 511q0 -103 -76 -179t-180 -76h-176q48 -99 48 -192q0 -118 -35 -186q-35 -69 -102 -101.5t-151 -32.5q-51 0 -90 37q-34 33 -54 82t-25.5 90.5t-17.5 84.5t-31 64q-48 50 -107 127q-101 131 -137 155h-274q-53 0 -90.5 37.5t-37.5 90.5v640q0 53 37.5 90.5t90.5 37.5 h288q22 0 138 40q128 44 223 66t200 22h112q140 0 226.5 -79t85.5 -216v-5q60 -77 60 -178q0 -22 -3 -43q38 -67 38 -144q0 -36 -9 -69q49 -73 49 -163z", w: 1536 },
  61578: { d: "M1664 940q0 81 -21.5 143t-55 98.5t-81.5 59.5t-94 31t-98 8t-112 -25.5t-110.5 -64t-86.5 -72t-60 -61.5q-18 -22 -49 -22t-49 22q-24 28 -60 61.5t-86.5 72t-110.5 64t-112 25.5t-98 -8t-94 -31t-81.5 -59.5t-55 -98.5t-21.5 -143q0 -168 187 -355l581 -560l580 559 q188 188 188 356zM1792 940q0 -221 -229 -450l-623 -600q-18 -18 -44 -18t-44 18l-624 602q-10 8 -27.5 26t-55.5 65.5t-68 97.5t-53.5 121t-23.5 138q0 220 127 344t351 124q62 0 126.5 -21.5t120 -58t95.5 -68.5t76 -68q36 36 76 68t95.5 68.5t120 58t126.5 21.5 q224 0 351 -124t127 -344z", w: 1792 },
  61601: { d: "M1664 896q53 0 90.5 -37.5t37.5 -90.5t-37.5 -90.5t-90.5 -37.5v-384q0 -52 -38 -90t-90 -38q-417 347 -812 380q-58 -19 -91 -66t-31 -100.5t40 -92.5q-20 -33 -23 -65.5t6 -58t33.5 -55t48 -50t61.5 -50.5q-29 -58 -111.5 -83t-168.5 -11.5t-132 55.5q-7 23 -29.5 87.5 t-32 94.5t-23 89t-15 101t3.5 98.5t22 110.5h-122q-66 0 -113 47t-47 113v192q0 66 47 113t113 47h480q435 0 896 384q52 0 90 -38t38 -90v-384zM1536 292v954q-394 -302 -768 -343v-270q377 -42 768 -341z", w: 1792 },
  61602: { d: "M912 -160q0 16 -16 16q-59 0 -101.5 42.5t-42.5 101.5q0 16 -16 16t-16 -16q0 -73 51.5 -124.5t124.5 -51.5q16 0 16 16zM246 128h1300q-266 300 -266 832q0 51 -24 105t-69 103t-121.5 80.5t-169.5 31.5t-169.5 -31.5t-121.5 -80.5t-69 -103t-24 -105q0 -532 -266 -832z M1728 128q0 -52 -38 -90t-90 -38h-448q0 -106 -75 -181t-181 -75t-181 75t-75 181h-448q-52 0 -90 38t-38 90q50 42 91 88t85 119.5t74.5 158.5t50 206t19.5 260q0 152 117 282.5t307 158.5q-8 19 -8 39q0 40 28 68t68 28t68 -28t28 -68q0 -20 -8 -39q190 -28 307 -158.5 t117 -282.5q0 -139 19.5 -260t50 -206t74.5 -158.5t85 -119.5t91 -88z", w: 1792 },
  61603: { d: "M1376 640l138 -135q30 -28 20 -70q-12 -41 -52 -51l-188 -48l53 -186q12 -41 -19 -70q-29 -31 -70 -19l-186 53l-48 -188q-10 -40 -51 -52q-12 -2 -19 -2q-31 0 -51 22l-135 138l-135 -138q-28 -30 -70 -20q-41 11 -51 52l-48 188l-186 -53q-41 -12 -70 19q-31 29 -19 70 l53 186l-188 48q-40 10 -52 51q-10 42 20 70l138 135l-138 135q-30 28 -20 70q12 41 52 51l188 48l-53 186q-12 41 19 70q29 31 70 19l186 -53l48 188q10 41 51 51q41 12 70 -19l135 -139l135 139q29 30 70 19q41 -10 51 -51l48 -188l186 53q41 12 70 -19q31 -29 19 -70 l-53 -186l188 -48q40 -10 52 -51q10 -42 -20 -70z", w: 1536 },
  61604: { d: "M256 192q0 26 -19 45t-45 19t-45 -19t-19 -45t19 -45t45 -19t45 19t19 45zM1664 768q0 51 -39 89.5t-89 38.5h-576q0 20 15 48.5t33 55t33 68t15 84.5q0 67 -44.5 97.5t-115.5 30.5q-24 0 -90 -139q-24 -44 -37 -65q-40 -64 -112 -145q-71 -81 -101 -106 q-69 -57 -140 -57h-32v-640h32q72 0 167 -32t193.5 -64t179.5 -32q189 0 189 167q0 26 -5 56q30 16 47.5 52.5t17.5 73.5t-18 69q53 50 53 119q0 25 -10 55.5t-25 47.5h331q52 0 90 38t38 90zM1792 769q0 -105 -75.5 -181t-180.5 -76h-169q-4 -62 -37 -119q3 -21 3 -43 q0 -101 -60 -178q1 -139 -85 -219.5t-227 -80.5q-133 0 -322 69q-164 59 -223 59h-288q-53 0 -90.5 37.5t-37.5 90.5v640q0 53 37.5 90.5t90.5 37.5h288q10 0 21.5 4.5t23.5 14t22.5 18t24 22.5t20.5 21.5t19 21.5t14 17q65 74 100 129q13 21 33 62t37 72t40.5 63t55 49.5 t69.5 17.5q125 0 206.5 -67t81.5 -189q0 -68 -22 -128h374q104 0 180 -76t76 -179z", w: 1792 },
  61605: { d: "M1376 128h32v640h-32q-35 0 -67.5 12t-62.5 37t-50 46t-49 54q-8 9 -12 14q-72 81 -112 145q-14 22 -38 68q-1 3 -10.5 22.5t-18.5 36t-20 35.5t-21.5 30.5t-18.5 11.5q-71 0 -115.5 -30.5t-44.5 -97.5q0 -43 15 -84.5t33 -68t33 -55t15 -48.5h-576q-50 0 -89 -38.5 t-39 -89.5q0 -52 38 -90t90 -38h331q-15 -17 -25 -47.5t-10 -55.5q0 -69 53 -119q-18 -32 -18 -69t17.5 -73.5t47.5 -52.5q-4 -24 -4 -56q0 -85 48.5 -126t135.5 -41q84 0 183 32t194 64t167 32zM1664 192q0 26 -19 45t-45 19t-45 -19t-19 -45t19 -45t45 -19t45 19t19 45z M1792 768v-640q0 -53 -37.5 -90.5t-90.5 -37.5h-288q-59 0 -223 -59q-190 -69 -317 -69q-142 0 -230 77.5t-87 217.5l1 5q-61 76 -61 178q0 22 3 43q-33 57 -37 119h-169q-105 0 -180.5 76t-75.5 181q0 103 76 179t180 76h374q-22 60 -22 128q0 122 81.5 189t206.5 67 q38 0 69.5 -17.5t55 -49.5t40.5 -63t37 -72t33 -62q35 -55 100 -129q2 -3 14 -17t19 -21.5t20.5 -21.5t24 -22.5t22.5 -18t23.5 -14t21.5 -4.5h288q53 0 90.5 -37.5t37.5 -90.5z", w: 1792 },
  61606: { d: "M1280 -64q0 26 -19 45t-45 19t-45 -19t-19 -45t19 -45t45 -19t45 19t19 45zM1408 700q0 189 -167 189q-26 0 -56 -5q-16 30 -52.5 47.5t-73.5 17.5t-69 -18q-50 53 -119 53q-25 0 -55.5 -10t-47.5 -25v331q0 52 -38 90t-90 38q-51 0 -89.5 -39t-38.5 -89v-576 q-20 0 -48.5 15t-55 33t-68 33t-84.5 15q-67 0 -97.5 -44.5t-30.5 -115.5q0 -24 139 -90q44 -24 65 -37q64 -40 145 -112q81 -71 106 -101q57 -69 57 -140v-32h640v32q0 72 32 167t64 193.5t32 179.5zM1536 705q0 -133 -69 -322q-59 -164 -59 -223v-288q0 -53 -37.5 -90.5 t-90.5 -37.5h-640q-53 0 -90.5 37.5t-37.5 90.5v288q0 10 -4.5 21.5t-14 23.5t-18 22.5t-22.5 24t-21.5 20.5t-21.5 19t-17 14q-74 65 -129 100q-21 13 -62 33t-72 37t-63 40.5t-49.5 55t-17.5 69.5q0 125 67 206.5t189 81.5q68 0 128 -22v374q0 104 76 180t179 76 q105 0 181 -75.5t76 -180.5v-169q62 -4 119 -37q21 3 43 3q101 0 178 -60q139 1 219.5 -85t80.5 -227z", w: 1536 },
  61607: { d: "M1408 576q0 84 -32 183t-64 194t-32 167v32h-640v-32q0 -35 -12 -67.5t-37 -62.5t-46 -50t-54 -49q-9 -8 -14 -12q-81 -72 -145 -112q-22 -14 -68 -38q-3 -1 -22.5 -10.5t-36 -18.5t-35.5 -20t-30.5 -21.5t-11.5 -18.5q0 -71 30.5 -115.5t97.5 -44.5q43 0 84.5 15t68 33 t55 33t48.5 15v-576q0 -50 38.5 -89t89.5 -39q52 0 90 38t38 90v331q46 -35 103 -35q69 0 119 53q32 -18 69 -18t73.5 17.5t52.5 47.5q24 -4 56 -4q85 0 126 48.5t41 135.5zM1280 1344q0 26 -19 45t-45 19t-45 -19t-19 -45t19 -45t45 -19t45 19t19 45zM1536 580 q0 -142 -77.5 -230t-217.5 -87l-5 1q-76 -61 -178 -61q-22 0 -43 3q-54 -30 -119 -37v-169q0 -105 -76 -180.5t-181 -75.5q-103 0 -179 76t-76 180v374q-54 -22 -128 -22q-121 0 -188.5 81.5t-67.5 206.5q0 38 17.5 69.5t49.5 55t63 40.5t72 37t62 33q55 35 129 100 q3 2 17 14t21.5 19t21.5 20.5t22.5 24t18 22.5t14 23.5t4.5 21.5v288q0 53 37.5 90.5t90.5 37.5h640q53 0 90.5 -37.5t37.5 -90.5v-288q0 -59 59 -223q69 -190 69 -317z", w: 1536 },
  61609: { d: "M1285 640q0 27 -18 45l-91 91l-362 362q-18 18 -45 18t-45 -18l-91 -91q-18 -18 -18 -45t18 -45l189 -189h-502q-26 0 -45 -19t-19 -45v-128q0 -26 19 -45t45 -19h502l-189 -189q-19 -19 -19 -45t19 -45l91 -91q18 -18 45 -18t45 18l362 362l91 91q18 18 18 45zM1536 640 q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61610: { d: "M1284 641q0 27 -18 45l-362 362l-91 91q-18 18 -45 18t-45 -18l-91 -91l-362 -362q-18 -18 -18 -45t18 -45l91 -91q18 -18 45 -18t45 18l189 189v-502q0 -26 19 -45t45 -19h128q26 0 45 19t19 45v502l189 -189q19 -19 45 -19t45 19l91 91q18 18 18 45zM1536 640 q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61611: { d: "M1284 639q0 27 -18 45l-91 91q-18 18 -45 18t-45 -18l-189 -189v502q0 26 -19 45t-45 19h-128q-26 0 -45 -19t-19 -45v-502l-189 189q-19 19 -45 19t-45 -19l-91 -91q-18 -18 -18 -45t18 -45l362 -362l91 -91q18 -18 45 -18t45 18l91 91l362 362q18 18 18 45zM1536 640 q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61654: { d: "M768 384h384v96h-128v448h-114l-148 -137l77 -80q42 37 55 57h2v-288h-128v-96zM1280 640q0 -70 -21 -142t-59.5 -134t-101.5 -101t-138 -39t-138 39t-101.5 101t-59.5 134t-21 142t21 142t59.5 134t101.5 101t138 39t138 -39t101.5 -101t59.5 -134t21 -142zM1792 384 v512q-106 0 -181 75t-75 181h-1152q0 -106 -75 -181t-181 -75v-512q106 0 181 -75t75 -181h1152q0 106 75 181t181 75zM1920 1216v-1152q0 -26 -19 -45t-45 -19h-1792q-26 0 -45 19t-19 45v1152q0 26 19 45t45 19h1792q26 0 45 -19t19 -45z", w: 1920 },
  61655: { d: "M1024 832q0 -26 -19 -45l-448 -448q-19 -19 -45 -19t-45 19l-448 448q-19 19 -19 45t19 45t45 19h896q26 0 45 -19t19 -45z", w: 1024 },
  61656: { d: "M1024 320q0 -26 -19 -45t-45 -19h-896q-26 0 -45 19t-19 45t19 45l448 448q19 19 45 19t45 -19l448 -448q19 -19 19 -45z", w: 1024 },
  61657: { d: "M640 1088v-896q0 -26 -19 -45t-45 -19t-45 19l-448 448q-19 19 -19 45t19 45l448 448q19 19 45 19t45 -19t19 -45z", w: 640 },
  61658: { d: "M576 640q0 -26 -19 -45l-448 -448q-19 -19 -45 -19t-45 19t-19 45v896q0 26 19 45t45 19t45 -19l448 -448q19 -19 19 -45z", w: 640 },
  61667: { d: "M1771 0q0 -53 -37 -90l-107 -108q-39 -37 -91 -37q-53 0 -90 37l-363 364q-38 36 -38 90q0 53 43 96l-256 256l-126 -126q-14 -14 -34 -14t-34 14q2 -2 12.5 -12t12.5 -13t10 -11.5t10 -13.5t6 -13.5t5.5 -16.5t1.5 -18q0 -38 -28 -68q-3 -3 -16.5 -18t-19 -20.5 t-18.5 -16.5t-22 -15.5t-22 -9t-26 -4.5q-40 0 -68 28l-408 408q-28 28 -28 68q0 13 4.5 26t9 22t15.5 22t16.5 18.5t20.5 19t18 16.5q30 28 68 28q10 0 18 -1.5t16.5 -5.5t13.5 -6t13.5 -10t11.5 -10t13 -12.5t12 -12.5q-14 14 -14 34t14 34l348 348q14 14 34 14t34 -14 q-2 2 -12.5 12t-12.5 13t-10 11.5t-10 13.5t-6 13.5t-5.5 16.5t-1.5 18q0 38 28 68q3 3 16.5 18t19 20.5t18.5 16.5t22 15.5t22 9t26 4.5q40 0 68 -28l408 -408q28 -28 28 -68q0 -13 -4.5 -26t-9 -22t-15.5 -22t-16.5 -18.5t-20.5 -19t-18 -16.5q-30 -28 -68 -28 q-10 0 -18 1.5t-16.5 5.5t-13.5 6t-13.5 10t-11.5 10t-13 12.5t-12 12.5q14 -14 14 -34t-14 -34l-126 -126l256 -256q43 43 96 43q52 0 91 -37l363 -363q37 -39 37 -91z", w: 1792 },
  61669: { d: "M896 1152q-204 0 -381.5 -69.5t-282 -187.5t-104.5 -255q0 -112 71.5 -213.5t201.5 -175.5l87 -50l-27 -96q-24 -91 -70 -172q152 63 275 171l43 38l57 -6q69 -8 130 -8q204 0 381.5 69.5t282 187.5t104.5 255t-104.5 255t-282 187.5t-381.5 69.5zM1792 640 q0 -174 -120 -321.5t-326 -233t-450 -85.5q-70 0 -145 8q-198 -175 -460 -242q-49 -14 -114 -22h-5q-15 0 -27 10.5t-16 27.5v1q-3 4 -0.5 12t2 10t4.5 9.5l6 9t7 8.5t8 9q7 8 31 34.5t34.5 38t31 39.5t32.5 51t27 59t26 76q-157 89 -247.5 220t-90.5 281q0 174 120 321.5 t326 233t450 85.5t450 -85.5t326 -233t120 -321.5z", w: 1792 },
  61671: { d: "M885 970q18 -20 7 -44l-540 -1157q-13 -25 -42 -25q-4 0 -14 2q-17 5 -25.5 19t-4.5 30l197 808l-406 -101q-4 -1 -12 -1q-18 0 -31 11q-18 15 -13 39l201 825q4 14 16 23t28 9h328q19 0 32 -12.5t13 -29.5q0 -8 -5 -18l-171 -463l396 98q8 2 12 2q19 0 34 -15z", w: 896 },
  61675: { d: "M736 960q0 -13 -9.5 -22.5t-22.5 -9.5t-22.5 9.5t-9.5 22.5q0 46 -54 71t-106 25q-13 0 -22.5 9.5t-9.5 22.5t9.5 22.5t22.5 9.5q50 0 99.5 -16t87 -54t37.5 -90zM896 960q0 72 -34.5 134t-90 101.5t-123 62t-136.5 22.5t-136.5 -22.5t-123 -62t-90 -101.5t-34.5 -134 q0 -101 68 -180q10 -11 30.5 -33t30.5 -33q128 -153 141 -298h228q13 145 141 298q10 11 30.5 33t30.5 33q68 79 68 180zM1024 960q0 -155 -103 -268q-45 -49 -74.5 -87t-59.5 -95.5t-34 -107.5q47 -28 47 -82q0 -37 -25 -64q25 -27 25 -64q0 -52 -45 -81q13 -23 13 -47 q0 -46 -31.5 -71t-77.5 -25q-20 -44 -60 -70t-87 -26t-87 26t-60 70q-46 0 -77.5 25t-31.5 71q0 24 13 47q-45 29 -45 81q0 37 25 64q-25 27 -25 64q0 54 47 82q-4 50 -34 107.5t-59.5 95.5t-74.5 87q-103 113 -103 268q0 99 44.5 184.5t117 142t164 89t186.5 32.5 t186.5 -32.5t164 -89t117 -142t44.5 -184.5z", w: 1024 },
  61683: { d: "M912 -160q0 16 -16 16q-59 0 -101.5 42.5t-42.5 101.5q0 16 -16 16t-16 -16q0 -73 51.5 -124.5t124.5 -51.5q16 0 16 16zM1728 128q0 -52 -38 -90t-90 -38h-448q0 -106 -75 -181t-181 -75t-181 75t-75 181h-448q-52 0 -90 38t-38 90q50 42 91 88t85 119.5t74.5 158.5 t50 206t19.5 260q0 152 117 282.5t307 158.5q-8 19 -8 39q0 40 28 68t68 28t68 -28t28 -68q0 -20 -8 -39q190 -28 307 -158.5t117 -282.5q0 -139 19.5 -260t50 -206t74.5 -158.5t85 -119.5t91 -88z", w: 1792 },
  61698: { d: "M1075 224q0 -13 -10 -23l-50 -50q-10 -10 -23 -10t-23 10l-393 393l-393 -393q-10 -10 -23 -10t-23 10l-50 50q-10 10 -10 23t10 23l466 466q10 10 23 10t23 -10l466 -466q10 -10 10 -23zM1075 608q0 -13 -10 -23l-50 -50q-10 -10 -23 -10t-23 10l-393 393l-393 -393 q-10 -10 -23 -10t-23 10l-50 50q-10 10 -10 23t10 23l466 466q10 10 23 10t23 -10l466 -466q10 -10 10 -23z", w: 1152 },
  61699: { d: "M1075 672q0 -13 -10 -23l-466 -466q-10 -10 -23 -10t-23 10l-466 466q-10 10 -10 23t10 23l50 50q10 10 23 10t23 -10l393 -393l393 393q10 10 23 10t23 -10l50 -50q10 -10 10 -23zM1075 1056q0 -13 -10 -23l-466 -466q-10 -10 -23 -10t-23 10l-466 466q-10 10 -10 23 t10 23l50 50q10 10 23 10t23 -10l393 -393l393 393q10 10 23 10t23 -10l50 -50q10 -10 10 -23z", w: 1152 },
  61700: { d: "M627 992q0 -13 -10 -23l-393 -393l393 -393q10 -10 10 -23t-10 -23l-50 -50q-10 -10 -23 -10t-23 10l-466 466q-10 10 -10 23t10 23l466 466q10 10 23 10t23 -10l50 -50q10 -10 10 -23z", w: 640 },
  61701: { d: "M595 576q0 -13 -10 -23l-466 -466q-10 -10 -23 -10t-23 10l-50 50q-10 10 -10 23t10 23l393 393l-393 393q-10 10 -10 23t10 23l50 50q10 10 23 10t23 -10l466 -466q10 -10 10 -23z", w: 640 },
  61702: { d: "M1075 352q0 -13 -10 -23l-50 -50q-10 -10 -23 -10t-23 10l-393 393l-393 -393q-10 -10 -23 -10t-23 10l-50 50q-10 10 -10 23t10 23l466 466q10 10 23 10t23 -10l466 -466q10 -10 10 -23z", w: 1152 },
  61703: { d: "M1075 800q0 -13 -10 -23l-466 -466q-10 -10 -23 -10t-23 10l-466 466q-10 10 -10 23t10 23l50 50q10 10 23 10t23 -10l393 -393l393 393q10 10 23 10t23 -10l50 -50q10 -10 10 -23z", w: 1152 },
  61708: { d: "M768 1184q-148 0 -273 -73t-198 -198t-73 -273t73 -273t198 -198t273 -73t273 73t198 198t73 273t-73 273t-198 198t-273 73zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103 t279.5 -279.5t103 -385.5z", w: 1536 },
  61712: { d: "M526 142q0 -53 -37.5 -90.5t-90.5 -37.5q-52 0 -90 38t-38 90q0 53 37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1024 -64q0 -53 -37.5 -90.5t-90.5 -37.5t-90.5 37.5t-37.5 90.5t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM320 640q0 -53 -37.5 -90.5t-90.5 -37.5 t-90.5 37.5t-37.5 90.5t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1522 142q0 -52 -38 -90t-90 -38q-53 0 -90.5 37.5t-37.5 90.5t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM558 1138q0 -66 -47 -113t-113 -47t-113 47t-47 113t47 113t113 47t113 -47t47 -113z M1728 640q0 -53 -37.5 -90.5t-90.5 -37.5t-90.5 37.5t-37.5 90.5t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1088 1344q0 -80 -56 -136t-136 -56t-136 56t-56 136t56 136t136 56t136 -56t56 -136zM1618 1138q0 -93 -66 -158.5t-158 -65.5q-93 0 -158.5 65.5t-65.5 158.5 q0 92 65.5 158t158.5 66q92 0 158 -66t66 -158z", w: 1792 },
  61713: { d: "M1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61714: { d: "M1792 416q0 -166 -127 -451q-3 -7 -10.5 -24t-13.5 -30t-13 -22q-12 -17 -28 -17q-15 0 -23.5 10t-8.5 25q0 9 2.5 26.5t2.5 23.5q5 68 5 123q0 101 -17.5 181t-48.5 138.5t-80 101t-105.5 69.5t-133 42.5t-154 21.5t-175.5 6h-224v-256q0 -26 -19 -45t-45 -19t-45 19 l-512 512q-19 19 -19 45t19 45l512 512q19 19 45 19t45 -19t19 -45v-256h224q713 0 875 -403q53 -134 53 -333z", w: 1792 },
  61715: { d: "M640 320q0 -40 -12.5 -82t-43 -76t-72.5 -34t-72.5 34t-43 76t-12.5 82t12.5 82t43 76t72.5 34t72.5 -34t43 -76t12.5 -82zM1280 320q0 -40 -12.5 -82t-43 -76t-72.5 -34t-72.5 34t-43 76t-12.5 82t12.5 82t43 76t72.5 34t72.5 -34t43 -76t12.5 -82zM1440 320 q0 120 -69 204t-187 84q-41 0 -195 -21q-71 -11 -157 -11t-157 11q-152 21 -195 21q-118 0 -187 -84t-69 -204q0 -88 32 -153.5t81 -103t122 -60t140 -29.5t149 -7h168q82 0 149 7t140 29.5t122 60t81 103t32 153.5zM1664 496q0 -207 -61 -331q-38 -77 -105.5 -133t-141 -86 t-170 -47.5t-171.5 -22t-167 -4.5q-78 0 -142 3t-147.5 12.5t-152.5 30t-137 51.5t-121 81t-86 115q-62 123 -62 331q0 237 136 396q-27 82 -27 170q0 116 51 218q108 0 190 -39.5t189 -123.5q147 35 309 35q148 0 280 -32q105 82 187 121t189 39q51 -102 51 -218 q0 -87 -27 -168q136 -160 136 -398z", w: 1664 },
  61720: { d: "M1134 461q-37 -121 -138 -195t-228 -74t-228 74t-138 195q-8 25 4 48.5t38 31.5q25 8 48.5 -4t31.5 -38q25 -80 92.5 -129.5t151.5 -49.5t151.5 49.5t92.5 129.5q8 26 32 38t49 4t37 -31.5t4 -48.5zM640 896q0 -53 -37.5 -90.5t-90.5 -37.5t-90.5 37.5t-37.5 90.5 t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1152 896q0 -53 -37.5 -90.5t-90.5 -37.5t-90.5 37.5t-37.5 90.5t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1408 640q0 130 -51 248.5t-136.5 204t-204 136.5t-248.5 51t-248.5 -51t-204 -136.5t-136.5 -204t-51 -248.5 t51 -248.5t136.5 -204t204 -136.5t248.5 -51t248.5 51t204 136.5t136.5 204t51 248.5zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61721: { d: "M1134 307q8 -25 -4 -48.5t-37 -31.5t-49 4t-32 38q-25 80 -92.5 129.5t-151.5 49.5t-151.5 -49.5t-92.5 -129.5q-8 -26 -31.5 -38t-48.5 -4q-26 8 -38 31.5t-4 48.5q37 121 138 195t228 74t228 -74t138 -195zM640 896q0 -53 -37.5 -90.5t-90.5 -37.5t-90.5 37.5 t-37.5 90.5t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1152 896q0 -53 -37.5 -90.5t-90.5 -37.5t-90.5 37.5t-37.5 90.5t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1408 640q0 130 -51 248.5t-136.5 204t-204 136.5t-248.5 51t-248.5 -51t-204 -136.5t-136.5 -204 t-51 -248.5t51 -248.5t136.5 -204t204 -136.5t248.5 -51t248.5 51t204 136.5t136.5 204t51 248.5zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61722: { d: "M1152 448q0 -26 -19 -45t-45 -19h-640q-26 0 -45 19t-19 45t19 45t45 19h640q26 0 45 -19t19 -45zM640 896q0 -53 -37.5 -90.5t-90.5 -37.5t-90.5 37.5t-37.5 90.5t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1152 896q0 -53 -37.5 -90.5t-90.5 -37.5t-90.5 37.5 t-37.5 90.5t37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1408 640q0 130 -51 248.5t-136.5 204t-204 136.5t-248.5 51t-248.5 -51t-204 -136.5t-136.5 -204t-51 -248.5t51 -248.5t136.5 -204t204 -136.5t248.5 -51t248.5 51t204 136.5t136.5 204t51 248.5zM1536 640 q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61725: { d: "M1664 491v616q-169 -91 -306 -91q-82 0 -145 32q-100 49 -184 76.5t-178 27.5q-173 0 -403 -127v-599q245 113 433 113q55 0 103.5 -7.5t98 -26t77 -31t82.5 -39.5l28 -14q44 -22 101 -22q120 0 293 92zM320 1280q0 -35 -17.5 -64t-46.5 -46v-1266q0 -14 -9 -23t-23 -9 h-64q-14 0 -23 9t-9 23v1266q-29 17 -46.5 46t-17.5 64q0 53 37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1792 1216v-763q0 -39 -35 -57q-10 -5 -17 -9q-218 -116 -369 -116q-88 0 -158 35l-28 14q-64 33 -99 48t-91 29t-114 14q-102 0 -235.5 -44t-228.5 -102 q-15 -9 -33 -9q-16 0 -32 8q-32 19 -32 56v742q0 35 31 55q35 21 78.5 42.5t114 52t152.5 49.5t155 19q112 0 209 -31t209 -86q38 -19 89 -19q122 0 310 112q22 12 31 17q31 16 62 -2q31 -20 31 -55z", w: 1792 },
  61726: { d: "M832 536v192q-181 -16 -384 -117v-185q205 96 384 110zM832 954v197q-172 -8 -384 -126v-189q215 111 384 118zM1664 491v184q-235 -116 -384 -71v224q-20 6 -39 15q-5 3 -33 17t-34.5 17t-31.5 15t-34.5 15.5t-32.5 13t-36 12.5t-35 8.5t-39.5 7.5t-39.5 4t-44 2 q-23 0 -49 -3v-222h19q102 0 192.5 -29t197.5 -82q19 -9 39 -15v-188q42 -17 91 -17q120 0 293 92zM1664 918v189q-169 -91 -306 -91q-45 0 -78 8v-196q148 -42 384 90zM320 1280q0 -35 -17.5 -64t-46.5 -46v-1266q0 -14 -9 -23t-23 -9h-64q-14 0 -23 9t-9 23v1266 q-29 17 -46.5 46t-17.5 64q0 53 37.5 90.5t90.5 37.5t90.5 -37.5t37.5 -90.5zM1792 1216v-763q0 -39 -35 -57q-10 -5 -17 -9q-218 -116 -369 -116q-88 0 -158 35l-28 14q-64 33 -99 48t-91 29t-114 14q-102 0 -235.5 -44t-228.5 -102q-15 -9 -33 -9q-16 0 -32 8 q-32 19 -32 56v742q0 35 31 55q35 21 78.5 42.5t114 52t152.5 49.5t155 19q112 0 209 -31t209 -86q38 -19 89 -19q122 0 310 112q22 12 31 17q31 16 62 -2q31 -20 31 -55z", w: 1792 },
  61731: { d: "M1186 579l257 250l-356 52l-66 10l-30 60l-159 322v-963l59 -31l318 -168l-60 355l-12 66zM1638 841l-363 -354l86 -500q5 -33 -6 -51.5t-34 -18.5q-17 0 -40 12l-449 236l-449 -236q-23 -12 -40 -12q-23 0 -34 18.5t-6 51.5l86 500l-364 354q-32 32 -23 59.5t54 34.5 l502 73l225 455q20 41 49 41q28 0 49 -41l225 -455l502 -73q45 -7 54 -34.5t-24 -59.5z", w: 1664 },
  61732: { d: "M1401 1187l-640 -1280q-17 -35 -57 -35q-5 0 -15 2q-22 5 -35.5 22.5t-13.5 39.5v576h-576q-22 0 -39.5 13.5t-22.5 35.5t4 42t29 30l1280 640q13 7 29 7q27 0 45 -19q15 -14 18.5 -34.5t-6.5 -39.5z", w: 1408 },
  61736: { d: "M704 280v-240q0 -16 -12 -28t-28 -12h-240q-16 0 -28 12t-12 28v240q0 16 12 28t28 12h240q16 0 28 -12t12 -28zM1020 880q0 -54 -15.5 -101t-35 -76.5t-55 -59.5t-57.5 -43.5t-61 -35.5q-41 -23 -68.5 -65t-27.5 -67q0 -17 -12 -32.5t-28 -15.5h-240q-15 0 -25.5 18.5 t-10.5 37.5v45q0 83 65 156.5t143 108.5q59 27 84 56t25 76q0 42 -46.5 74t-107.5 32q-65 0 -108 -29q-35 -25 -107 -115q-13 -16 -31 -16q-12 0 -25 8l-164 125q-13 10 -15.5 25t5.5 28q160 266 464 266q80 0 161 -31t146 -83t106 -127.5t41 -158.5z", w: 1024 },
  61737: { d: "M640 192v-128q0 -26 -19 -45t-45 -19h-512q-26 0 -45 19t-19 45v128q0 26 19 45t45 19h64v384h-64q-26 0 -45 19t-19 45v128q0 26 19 45t45 19h384q26 0 45 -19t19 -45v-576h64q26 0 45 -19t19 -45zM512 1344v-192q0 -26 -19 -45t-45 -19h-256q-26 0 -45 19t-19 45v192 q0 26 19 45t45 19h256q26 0 45 -19t19 -45z", w: 640 },
  61738: { d: "M512 288v-224q0 -26 -19 -45t-45 -19h-256q-26 0 -45 19t-19 45v224q0 26 19 45t45 19h256q26 0 45 -19t19 -45zM542 1344l-28 -768q-1 -26 -20.5 -45t-45.5 -19h-256q-26 0 -45.5 19t-20.5 45l-28 768q-1 26 17.5 45t44.5 19h320q26 0 44.5 -19t17.5 -45z", w: 640 },
  61749: { d: "M1440 1088q0 40 -28 68t-68 28t-68 -28t-28 -68t28 -68t68 -28t68 28t28 68zM1664 1376q0 -249 -75.5 -430.5t-253.5 -360.5q-81 -80 -195 -176l-20 -379q-2 -16 -16 -26l-384 -224q-7 -4 -16 -4q-12 0 -23 9l-64 64q-13 14 -8 32l85 276l-281 281l-276 -85q-3 -1 -9 -1 q-14 0 -23 9l-64 64q-17 19 -5 39l224 384q10 14 26 16l379 20q96 114 176 195q188 187 358 258t431 71q14 0 24 -9.5t10 -22.5z", w: 1664 },
  61751: { d: "M909 141l102 102q19 19 19 45t-19 45l-307 307l307 307q19 19 19 45t-19 45l-102 102q-19 19 -45 19t-45 -19l-454 -454q-19 -19 -19 -45t19 -45l454 -454q19 -19 45 -19t45 19zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5 t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61753: { d: "M1165 397l102 102q19 19 19 45t-19 45l-454 454q-19 19 -45 19t-45 -19l-454 -454q-19 -19 -19 -45t19 -45l102 -102q19 -19 45 -19t45 19l307 307l307 -307q19 -19 45 -19t45 19zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5 t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61754: { d: "M813 237l454 454q19 19 19 45t-19 45l-102 102q-19 19 -45 19t-45 -19l-307 -307l-307 307q-19 19 -45 19t-45 -19l-102 -102q-19 -19 -19 -45t19 -45l454 -454q19 -19 45 -19t45 19zM1536 640q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5 t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61757: { d: "M960 1280q0 26 -19 45t-45 19t-45 -19t-19 -45t19 -45t45 -19t45 19t19 45zM1792 352v-352q0 -22 -20 -30q-8 -2 -12 -2q-12 0 -23 9l-93 93q-119 -143 -318.5 -226.5t-429.5 -83.5t-429.5 83.5t-318.5 226.5l-93 -93q-9 -9 -23 -9q-4 0 -12 2q-20 8 -20 30v352 q0 14 9 23t23 9h352q22 0 30 -20q8 -19 -7 -35l-100 -100q67 -91 189.5 -153.5t271.5 -82.5v647h-192q-26 0 -45 19t-19 45v128q0 26 19 45t45 19h192v163q-58 34 -93 92.5t-35 128.5q0 106 75 181t181 75t181 -75t75 -181q0 -70 -35 -128.5t-93 -92.5v-163h192q26 0 45 -19 t19 -45v-128q0 -26 -19 -45t-45 -19h-192v-647q149 20 271.5 82.5t189.5 153.5l-100 100q-15 16 -7 35q8 20 30 20h352q14 0 23 -9t9 -23z", w: 1792 },
  61760: { d: "M1024 640q0 -106 -75 -181t-181 -75t-181 75t-75 181t75 181t181 75t181 -75t75 -181zM1152 640q0 159 -112.5 271.5t-271.5 112.5t-271.5 -112.5t-112.5 -271.5t112.5 -271.5t271.5 -112.5t271.5 112.5t112.5 271.5zM1280 640q0 -212 -150 -362t-362 -150t-362 150 t-150 362t150 362t362 150t362 -150t150 -362zM1408 640q0 130 -51 248.5t-136.5 204t-204 136.5t-248.5 51t-248.5 -51t-204 -136.5t-136.5 -204t-51 -248.5t51 -248.5t136.5 -204t204 -136.5t248.5 -51t248.5 51t204 136.5t136.5 204t51 248.5zM1536 640 q0 -209 -103 -385.5t-279.5 -279.5t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61768: { d: "M1018 933q-18 -37 -58 -37h-192v-864q0 -14 -9 -23t-23 -9h-704q-21 0 -29 18q-8 20 4 35l160 192q9 11 25 11h320v640h-192q-40 0 -58 37q-17 37 9 68l320 384q18 22 49 22t49 -22l320 -384q27 -32 9 -68z", w: 1024 },
  61769: { d: "M32 1280h704q13 0 22.5 -9.5t9.5 -23.5v-863h192q40 0 58 -37t-9 -69l-320 -384q-18 -22 -49 -22t-49 22l-320 384q-26 31 -9 69q18 37 58 37h192v640h-320q-14 0 -25 11l-160 192q-13 14 -4 34q9 19 29 19z", w: 1024 },
  61770: { d: "M685 237l614 614q19 19 19 45t-19 45l-102 102q-19 19 -45 19t-45 -19l-467 -467l-211 211q-19 19 -45 19t-45 -19l-102 -102q-19 -19 -19 -45t19 -45l358 -358q19 -19 45 -19t45 19zM1536 1120v-960q0 -119 -84.5 -203.5t-203.5 -84.5h-960q-119 0 -203.5 84.5 t-84.5 203.5v960q0 119 84.5 203.5t203.5 84.5h960q119 0 203.5 -84.5t84.5 -203.5z", w: 1536 },
  61779: { d: "M976 229l35 -159q3 -12 -3 -22.5t-17 -14.5l-5 -1q-4 -2 -10.5 -3.5t-16 -4.5t-21.5 -5.5t-25.5 -5t-30 -5t-33.5 -4.5t-36.5 -3t-38.5 -1q-234 0 -409 130.5t-238 351.5h-95q-13 0 -22.5 9.5t-9.5 22.5v113q0 13 9.5 22.5t22.5 9.5h66q-2 57 1 105h-67q-14 0 -23 9 t-9 23v114q0 14 9 23t23 9h98q67 210 243.5 338t400.5 128q102 0 194 -23q11 -3 20 -15q6 -11 3 -24l-43 -159q-3 -13 -14 -19.5t-24 -2.5l-4 1q-4 1 -11.5 2.5l-17.5 3.5t-22.5 3.5t-26 3t-29 2.5t-29.5 1q-126 0 -226 -64t-150 -176h468q16 0 25 -12q10 -12 7 -26 l-24 -114q-5 -26 -32 -26h-488q-3 -37 0 -105h459q15 0 25 -12q9 -12 6 -27l-24 -112q-2 -11 -11 -18.5t-20 -7.5h-387q48 -117 149.5 -185.5t228.5 -68.5q18 0 36 1.5t33.5 3.5t29.5 4.5t24.5 5t18.5 4.5l12 3l5 2q13 5 26 -2q12 -7 15 -21z", w: 1024 },
  61780: { d: "M1020 399v-367q0 -14 -9 -23t-23 -9h-956q-14 0 -23 9t-9 23v150q0 13 9.5 22.5t22.5 9.5h97v383h-95q-14 0 -23 9.5t-9 22.5v131q0 14 9 23t23 9h95v223q0 171 123.5 282t314.5 111q185 0 335 -125q9 -8 10 -20.5t-7 -22.5l-103 -127q-9 -11 -22 -12q-13 -2 -23 7 q-5 5 -26 19t-69 32t-93 18q-85 0 -137 -47t-52 -123v-215h305q13 0 22.5 -9t9.5 -23v-131q0 -13 -9.5 -22.5t-22.5 -9.5h-305v-379h414v181q0 13 9 22.5t23 9.5h162q14 0 23 -9.5t9 -22.5z", w: 1024 },
  61781: { d: "M978 351q0 -153 -99.5 -263.5t-258.5 -136.5v-175q0 -14 -9 -23t-23 -9h-135q-13 0 -22.5 9.5t-9.5 22.5v175q-66 9 -127.5 31t-101.5 44.5t-74 48t-46.5 37.5t-17.5 18q-17 21 -2 41l103 135q7 10 23 12q15 2 24 -9l2 -2q113 -99 243 -125q37 -8 74 -8q81 0 142.5 43 t61.5 122q0 28 -15 53t-33.5 42t-58.5 37.5t-66 32t-80 32.5q-39 16 -61.5 25t-61.5 26.5t-62.5 31t-56.5 35.5t-53.5 42.5t-43.5 49t-35.5 58t-21 66.5t-8.5 78q0 138 98 242t255 134v180q0 13 9.5 22.5t22.5 9.5h135q14 0 23 -9t9 -23v-176q57 -6 110.5 -23t87 -33.5 t63.5 -37.5t39 -29t15 -14q17 -18 5 -38l-81 -146q-8 -15 -23 -16q-14 -3 -27 7q-3 3 -14.5 12t-39 26.5t-58.5 32t-74.5 26t-85.5 11.5q-95 0 -155 -43t-60 -111q0 -26 8.5 -48t29.5 -41.5t39.5 -33t56 -31t60.5 -27t70 -27.5q53 -20 81 -31.5t76 -35t75.5 -42.5t62 -50 t53 -63.5t31.5 -76.5t13 -94z", w: 1024 },
  61782: { d: "M898 1066v-102q0 -14 -9 -23t-23 -9h-168q-23 -144 -129 -234t-276 -110q167 -178 459 -536q14 -16 4 -34q-8 -18 -29 -18h-195q-16 0 -25 12q-306 367 -498 571q-9 9 -9 22v127q0 13 9.5 22.5t22.5 9.5h112q132 0 212.5 43t102.5 125h-427q-14 0 -23 9t-9 23v102 q0 14 9 23t23 9h413q-57 113 -268 113h-145q-13 0 -22.5 9.5t-9.5 22.5v133q0 14 9 23t23 9h832q14 0 23 -9t9 -23v-102q0 -14 -9 -23t-23 -9h-233q47 -61 64 -144h171q14 0 23 -9t9 -23z", w: 898 },
  61783: { d: "M603 0h-172q-13 0 -22.5 9t-9.5 23v330h-288q-13 0 -22.5 9t-9.5 23v103q0 13 9.5 22.5t22.5 9.5h288v85h-288q-13 0 -22.5 9t-9.5 23v104q0 13 9.5 22.5t22.5 9.5h214l-321 578q-8 16 0 32q10 16 28 16h194q19 0 29 -18l215 -425q19 -38 56 -125q10 24 30.5 68t27.5 61 l191 420q8 19 29 19h191q17 0 27 -16q9 -14 1 -31l-313 -579h215q13 0 22.5 -9.5t9.5 -22.5v-104q0 -14 -9.5 -23t-22.5 -9h-290v-85h290q13 0 22.5 -9.5t9.5 -22.5v-103q0 -14 -9.5 -23t-22.5 -9h-290v-330q0 -13 -9.5 -22.5t-22.5 -9.5z", w: 1027 },
  61784: { d: "M1043 971q0 100 -65 162t-171 62h-320v-448h320q106 0 171 62t65 162zM1280 971q0 -193 -126.5 -315t-326.5 -122h-340v-118h505q14 0 23 -9t9 -23v-128q0 -14 -9 -23t-23 -9h-505v-192q0 -14 -9.5 -23t-22.5 -9h-167q-14 0 -23 9t-9 23v192h-224q-14 0 -23 9t-9 23v128 q0 14 9 23t23 9h224v118h-224q-14 0 -23 9t-9 23v149q0 13 9 22.5t23 9.5h224v629q0 14 9 23t23 9h539q200 0 326.5 -122t126.5 -315z", w: 1280 },
  61785: { d: "M514 341l81 299h-159l75 -300q1 -1 1 -3t1 -3q0 1 0.5 3.5t0.5 3.5zM630 768l35 128h-292l32 -128h225zM822 768h139l-35 128h-70zM1271 340l78 300h-162l81 -299q0 -1 0.5 -3.5t1.5 -3.5q0 1 0.5 3t0.5 3zM1382 768l33 128h-297l34 -128h230zM1792 736v-64q0 -14 -9 -23 t-23 -9h-213l-164 -616q-7 -24 -31 -24h-159q-24 0 -31 24l-166 616h-209l-167 -616q-7 -24 -31 -24h-159q-11 0 -19.5 7t-10.5 17l-160 616h-208q-14 0 -23 9t-9 23v64q0 14 9 23t23 9h175l-33 128h-142q-14 0 -23 9t-9 23v64q0 14 9 23t23 9h109l-89 344q-5 15 5 28 q10 12 26 12h137q26 0 31 -24l90 -360h359l97 360q7 24 31 24h126q24 0 31 -24l98 -360h365l93 360q5 24 31 24h137q16 0 26 -12q10 -13 5 -28l-91 -344h111q14 0 23 -9t9 -23v-64q0 -14 -9 -23t-23 -9h-145l-34 -128h179q14 0 23 -9t9 -23z", w: 1792 },
  61786: { d: "M1167 896q18 -182 -131 -258q117 -28 175 -103t45 -214q-7 -71 -32.5 -125t-64.5 -89t-97 -58.5t-121.5 -34.5t-145.5 -15v-255h-154v251q-80 0 -122 1v-252h-154v255q-18 0 -54 0.5t-55 0.5h-200l31 183h111q50 0 58 51v402h16q-6 1 -16 1v287q-13 68 -89 68h-111v164 l212 -1q64 0 97 1v252h154v-247q82 2 122 2v245h154v-252q79 -7 140 -22.5t113 -45t82.5 -78t36.5 -114.5zM952 351q0 36 -15 64t-37 46t-57.5 30.5t-65.5 18.5t-74 9t-69 3t-64.5 -1t-47.5 -1v-338q8 0 37 -0.5t48 -0.5t53 1.5t58.5 4t57 8.5t55.5 14t47.5 21t39.5 30 t24.5 40t9.5 51zM881 827q0 33 -12.5 58.5t-30.5 42t-48 28t-55 16.5t-61.5 8t-58 2.5t-54 -1t-39.5 -0.5v-307q5 0 34.5 -0.5t46.5 0t50 2t55 5.5t51.5 11t48.5 18.5t37 27t27 38.5t9 51z", w: 1280 },
  61796: { d: "M256 192q0 26 -19 45t-45 19q-27 0 -45.5 -19t-18.5 -45q0 -27 18.5 -45.5t45.5 -18.5q26 0 45 18.5t19 45.5zM416 704v-640q0 -26 -19 -45t-45 -19h-288q-26 0 -45 19t-19 45v640q0 26 19 45t45 19h288q26 0 45 -19t19 -45zM1600 704q0 -86 -55 -149q15 -44 15 -76 q3 -76 -43 -137q17 -56 0 -117q-15 -57 -54 -94q9 -112 -49 -181q-64 -76 -197 -78h-36h-76h-17q-66 0 -144 15.5t-121.5 29t-120.5 39.5q-123 43 -158 44q-26 1 -45 19.5t-19 44.5v641q0 25 18 43.5t43 20.5q24 2 76 59t101 121q68 87 101 120q18 18 31 48t17.5 48.5 t13.5 60.5q7 39 12.5 61t19.5 52t34 50q19 19 45 19q46 0 82.5 -10.5t60 -26t40 -40.5t24 -45t12 -50t5 -45t0.5 -39q0 -38 -9.5 -76t-19 -60t-27.5 -56q-3 -6 -10 -18t-11 -22t-8 -24h277q78 0 135 -57t57 -135z", w: 1664 },
  61797: { d: "M256 960q0 -26 -19 -45t-45 -19q-27 0 -45.5 19t-18.5 45q0 27 18.5 45.5t45.5 18.5q26 0 45 -18.5t19 -45.5zM416 448v640q0 26 -19 45t-45 19h-288q-26 0 -45 -19t-19 -45v-640q0 -26 19 -45t45 -19h288q26 0 45 19t19 45zM1545 597q55 -61 55 -149q-1 -78 -57.5 -135 t-134.5 -57h-277q4 -14 8 -24t11 -22t10 -18q18 -37 27 -57t19 -58.5t10 -76.5q0 -24 -0.5 -39t-5 -45t-12 -50t-24 -45t-40 -40.5t-60 -26t-82.5 -10.5q-26 0 -45 19q-20 20 -34 50t-19.5 52t-12.5 61q-9 42 -13.5 60.5t-17.5 48.5t-31 48q-33 33 -101 120q-49 64 -101 121 t-76 59q-25 2 -43 20.5t-18 43.5v641q0 26 19 44.5t45 19.5q35 1 158 44q77 26 120.5 39.5t121.5 29t144 15.5h17h76h36q133 -2 197 -78q58 -69 49 -181q39 -37 54 -94q17 -61 0 -117q46 -61 43 -137q0 -32 -15 -76z", w: 1664 },
  61813: { d: "M765 237q8 -19 -5 -35l-350 -384q-10 -10 -23 -10q-14 0 -24 10l-355 384q-13 16 -5 35q9 19 29 19h224v1248q0 14 9 23t23 9h192q14 0 23 -9t9 -23v-1248h224q21 0 29 -19z", w: 768 },
  61814: { d: "M765 1043q-9 -19 -29 -19h-224v-1248q0 -14 -9 -23t-23 -9h-192q-14 0 -23 9t-9 23v1248h-224q-21 0 -29 19t5 35l350 384q10 10 23 10q14 0 24 -10l355 -384q13 -16 5 -35z", w: 768 },
  61815: { d: "M1792 736v-192q0 -14 -9 -23t-23 -9h-1248v-224q0 -21 -19 -29t-35 5l-384 350q-10 10 -10 23q0 14 10 24l384 354q16 14 35 6q19 -9 19 -29v-224h1248q14 0 23 -9t9 -23z", w: 1792 },
  61816: { d: "M1728 643q0 -14 -10 -24l-384 -354q-16 -14 -35 -6q-19 9 -19 29v224h-1248q-14 0 -23 9t-9 23v192q0 14 9 23t23 9h1248v224q0 21 19 29t35 -5l384 -350q10 -10 10 -23z", w: 1792 },
  61817: { d: "M1393 321q-39 -125 -123 -250q-129 -196 -257 -196q-49 0 -140 32q-86 32 -151 32q-61 0 -142 -33q-81 -34 -132 -34q-152 0 -301 259q-147 261 -147 503q0 228 113 374q113 144 284 144q72 0 177 -30q104 -30 138 -30q45 0 143 34q102 34 173 34q119 0 213 -65 q52 -36 104 -100q-79 -67 -114 -118q-65 -94 -65 -207q0 -124 69 -223t158 -126zM1017 1494q0 -61 -29 -136q-30 -75 -93 -138q-54 -54 -108 -72q-37 -11 -104 -17q3 149 78 257q74 107 250 148q1 -3 2.5 -11t2.5 -11q0 -4 0.5 -10t0.5 -10z", w: 1408 },
  61820: { d: "M663 1125q-11 -1 -15.5 -10.5t-8.5 -9.5q-5 -1 -5 5q0 12 19 15h10zM750 1111q-4 -1 -11.5 6.5t-17.5 4.5q24 11 32 -2q3 -6 -3 -9zM399 684q-4 1 -6 -3t-4.5 -12.5t-5.5 -13.5t-10 -13q-10 -11 -1 -12q4 -1 12.5 7t12.5 18q1 3 2 7t2 6t1.5 4.5t0.5 4v3t-1 2.5t-3 2z M1254 325q0 18 -55 42q4 15 7.5 27.5t5 26t3 21.5t0.5 22.5t-1 19.5t-3.5 22t-4 20.5t-5 25t-5.5 26.5q-10 48 -47 103t-72 75q24 -20 57 -83q87 -162 54 -278q-11 -40 -50 -42q-31 -4 -38.5 18.5t-8 83.5t-11.5 107q-9 39 -19.5 69t-19.5 45.5t-15.5 24.5t-13 15t-7.5 7 q-14 62 -31 103t-29.5 56t-23.5 33t-15 40q-4 21 6 53.5t4.5 49.5t-44.5 25q-15 3 -44.5 18t-35.5 16q-8 1 -11 26t8 51t36 27q37 3 51 -30t4 -58q-11 -19 -2 -26.5t30 -0.5q13 4 13 36v37q-5 30 -13.5 50t-21 30.5t-23.5 15t-27 7.5q-107 -8 -89 -134q0 -15 -1 -15 q-9 9 -29.5 10.5t-33 -0.5t-15.5 5q1 57 -16 90t-45 34q-27 1 -41.5 -27.5t-16.5 -59.5q-1 -15 3.5 -37t13 -37.5t15.5 -13.5q10 3 16 14q4 9 -7 8q-7 0 -15.5 14.5t-9.5 33.5q-1 22 9 37t34 14q17 0 27 -21t9.5 -39t-1.5 -22q-22 -15 -31 -29q-8 -12 -27.5 -23.5 t-20.5 -12.5q-13 -14 -15.5 -27t7.5 -18q14 -8 25 -19.5t16 -19t18.5 -13t35.5 -6.5q47 -2 102 15q2 1 23 7t34.5 10.5t29.5 13t21 17.5q9 14 20 8q5 -3 6.5 -8.5t-3 -12t-16.5 -9.5q-20 -6 -56.5 -21.5t-45.5 -19.5q-44 -19 -70 -23q-25 -5 -79 2q-10 2 -9 -2t17 -19 q25 -23 67 -22q17 1 36 7t36 14t33.5 17.5t30 17t24.5 12t17.5 2.5t8.5 -11q0 -2 -1 -4.5t-4 -5t-6 -4.5t-8.5 -5t-9 -4.5t-10 -5t-9.5 -4.5q-28 -14 -67.5 -44t-66.5 -43t-49 -1q-21 11 -63 73q-22 31 -25 22q-1 -3 -1 -10q0 -25 -15 -56.5t-29.5 -55.5t-21 -58t11.5 -63 q-23 -6 -62.5 -90t-47.5 -141q-2 -18 -1.5 -69t-5.5 -59q-8 -24 -29 -3q-32 31 -36 94q-2 28 4 56q4 19 -1 18q-2 -1 -4 -5q-36 -65 10 -166q5 -12 25 -28t24 -20q20 -23 104 -90.5t93 -76.5q16 -15 17.5 -38t-14 -43t-45.5 -23q8 -15 29 -44.5t28 -54t7 -70.5q46 24 7 92 q-4 8 -10.5 16t-9.5 12t-2 6q3 5 13 9.5t20 -2.5q46 -52 166 -36q133 15 177 87q23 38 34 30q12 -6 10 -52q-1 -25 -23 -92q-9 -23 -6 -37.5t24 -15.5q3 19 14.5 77t13.5 90q2 21 -6.5 73.5t-7.5 97t23 70.5q15 18 51 18q1 37 34.5 53t72.5 10.5t60 -22.5zM626 1152 q3 17 -2.5 30t-11.5 15q-9 2 -9 -7q2 -5 5 -6q10 0 7 -15q-3 -20 8 -20q3 0 3 3zM1045 955q-2 8 -6.5 11.5t-13 5t-14.5 5.5q-5 3 -9.5 8t-7 8t-5.5 6.5t-4 4t-4 -1.5q-14 -16 7 -43.5t39 -31.5q9 -1 14.5 8t3.5 20zM867 1168q0 11 -5 19.5t-11 12.5t-9 3q-6 0 -8 -2t0 -4 t5 -3q14 -4 18 -31q0 -3 8 2q2 2 2 3zM921 1401q0 2 -2.5 5t-9 7t-9.5 6q-15 15 -24 15q-9 -1 -11.5 -7.5t-1 -13t-0.5 -12.5q-1 -4 -6 -10.5t-6 -9t3 -8.5q4 -3 8 0t11 9t15 9q1 1 9 1t15 2t9 7zM1486 60q20 -12 31 -24.5t12 -24t-2.5 -22.5t-15.5 -22t-23.5 -19.5 t-30 -18.5t-31.5 -16.5t-32 -15.5t-27 -13q-38 -19 -85.5 -56t-75.5 -64q-17 -16 -68 -19.5t-89 14.5q-18 9 -29.5 23.5t-16.5 25.5t-22 19.5t-47 9.5q-44 1 -130 1q-19 0 -57 -1.5t-58 -2.5q-44 -1 -79.5 -15t-53.5 -30t-43.5 -28.5t-53.5 -11.5q-29 1 -111 31t-146 43 q-19 4 -51 9.5t-50 9t-39.5 9.5t-33.5 14.5t-17 19.5q-10 23 7 66.5t18 54.5q1 16 -4 40t-10 42.5t-4.5 36.5t10.5 27q14 12 57 14t60 12q30 18 42 35t12 51q21 -73 -32 -106q-32 -20 -83 -15q-34 3 -43 -10q-13 -15 5 -57q2 -6 8 -18t8.5 -18t4.5 -17t1 -22q0 -15 -17 -49 t-14 -48q3 -17 37 -26q20 -6 84.5 -18.5t99.5 -20.5q24 -6 74 -22t82.5 -23t55.5 -4q43 6 64.5 28t23 48t-7.5 58.5t-19 52t-20 36.5q-121 190 -169 242q-68 74 -113 40q-11 -9 -15 15q-3 16 -2 38q1 29 10 52t24 47t22 42q8 21 26.5 72t29.5 78t30 61t39 54 q110 143 124 195q-12 112 -16 310q-2 90 24 151.5t106 104.5q39 21 104 21q53 1 106 -13.5t89 -41.5q57 -42 91.5 -121.5t29.5 -147.5q-5 -95 30 -214q34 -113 133 -218q55 -59 99.5 -163t59.5 -191q8 -49 5 -84.5t-12 -55.5t-20 -22q-10 -2 -23.5 -19t-27 -35.5 t-40.5 -33.5t-61 -14q-18 1 -31.5 5t-22.5 13.5t-13.5 15.5t-11.5 20.5t-9 19.5q-22 37 -41 30t-28 -49t7 -97q20 -70 1 -195q-10 -65 18 -100.5t73 -33t85 35.5q59 49 89.5 66.5t103.5 42.5q53 18 77 36.5t18.5 34.5t-25 28.5t-51.5 23.5q-33 11 -49.5 48t-15 72.5 t15.5 47.5q1 -31 8 -56.5t14.5 -40.5t20.5 -28.5t21 -19t21.5 -13t16.5 -9.5z", w: 1536 },
  61827: { d: "M1024 832v-416q0 -40 -28 -68t-68 -28t-68 28t-28 68v352h-64v-912q0 -46 -33 -79t-79 -33t-79 33t-33 79v464h-64v-464q0 -46 -33 -79t-79 -33t-79 33t-33 79v912h-64v-352q0 -40 -28 -68t-68 -28t-68 28t-28 68v416q0 80 56 136t136 56h640q80 0 136 -56t56 -136z M736 1280q0 -93 -65.5 -158.5t-158.5 -65.5t-158.5 65.5t-65.5 158.5t65.5 158.5t158.5 65.5t158.5 -65.5t65.5 -158.5z", w: 1024 },
  61829: { d: "M1472 640q0 117 -45.5 223.5t-123 184t-184 123t-223.5 45.5t-223.5 -45.5t-184 -123t-123 -184t-45.5 -223.5t45.5 -223.5t123 -184t184 -123t223.5 -45.5t223.5 45.5t184 123t123 184t45.5 223.5zM1748 363q-4 -15 -20 -20l-292 -96v-306q0 -16 -13 -26q-15 -10 -29 -4 l-292 94l-180 -248q-10 -13 -26 -13t-26 13l-180 248l-292 -94q-14 -6 -29 4q-13 10 -13 26v306l-292 96q-16 5 -20 20q-5 17 4 29l180 248l-180 248q-9 13 -4 29q4 15 20 20l292 96v306q0 16 13 26q15 10 29 4l292 -94l180 248q9 12 26 12t26 -12l180 -248l292 94 q14 6 29 -4q13 -10 13 -26v-306l292 -96q16 -5 20 -20q5 -16 -4 -29l-180 -248l180 -248q9 -12 4 -29z", w: 1792 },
  61830: { d: "M1262 233q-54 -9 -110 -9q-182 0 -337 90t-245 245t-90 337q0 192 104 357q-201 -60 -328.5 -229t-127.5 -384q0 -130 51 -248.5t136.5 -204t204 -136.5t248.5 -51q144 0 273.5 61.5t220.5 171.5zM1465 318q-94 -203 -283.5 -324.5t-413.5 -121.5q-156 0 -298 61 t-245 164t-164 245t-61 298q0 153 57.5 292.5t156 241.5t235.5 164.5t290 68.5q44 2 61 -39q18 -41 -15 -72q-86 -78 -131.5 -181.5t-45.5 -218.5q0 -148 73 -273t198 -198t273 -73q118 0 228 51q41 18 72 -13q14 -14 17.5 -34t-4.5 -38z", w: 1536 },
  61832: { d: "M1632 576q0 -26 -19 -45t-45 -19h-224q0 -171 -67 -290l208 -209q19 -19 19 -45t-19 -45q-18 -19 -45 -19t-45 19l-198 197q-5 -5 -15 -13t-42 -28.5t-65 -36.5t-82 -29t-97 -13v896h-128v-896q-51 0 -101.5 13.5t-87 33t-66 39t-43.5 32.5l-15 14l-183 -207 q-20 -21 -48 -21q-24 0 -43 16q-19 18 -20.5 44.5t15.5 46.5l202 227q-58 114 -58 274h-224q-26 0 -45 19t-19 45t19 45t45 19h224v294l-173 173q-19 19 -19 45t19 45t45 19t45 -19l173 -173h844l173 173q19 19 45 19t45 -19t19 -45t-19 -45l-173 -173v-294h224q26 0 45 -19 t19 -45zM1152 1152h-640q0 133 93.5 226.5t226.5 93.5t226.5 -93.5t93.5 -226.5z", w: 1664 },
  61842: { d: "M1024 640q0 -106 -75 -181t-181 -75t-181 75t-75 181t75 181t181 75t181 -75t75 -181zM768 1184q-148 0 -273 -73t-198 -198t-73 -273t73 -273t198 -198t273 -73t273 73t198 198t73 273t-73 273t-198 198t-273 73zM1536 640q0 -209 -103 -385.5t-279.5 -279.5 t-385.5 -103t-385.5 103t-279.5 279.5t-103 385.5t103 385.5t279.5 279.5t385.5 103t385.5 -103t279.5 -279.5t103 -385.5z", w: 1536 },
  61845: { d: "M1152 704q0 -191 -94.5 -353t-256.5 -256.5t-353 -94.5h-160q-14 0 -23 9t-9 23v611l-215 -66q-3 -1 -9 -1q-10 0 -19 6q-13 10 -13 26v128q0 23 23 31l233 71v93l-215 -66q-3 -1 -9 -1q-10 0 -19 6q-13 10 -13 26v128q0 23 23 31l233 71v250q0 14 9 23t23 9h160 q14 0 23 -9t9 -23v-181l375 116q15 5 28 -5t13 -26v-128q0 -23 -23 -31l-393 -121v-93l375 116q15 5 28 -5t13 -26v-128q0 -23 -23 -31l-393 -121v-487q188 13 318 151t130 328q0 14 9 23t23 9h160q14 0 23 -9t9 -23z", w: 1152 }
};

// src/core/drawings/types/SvgIcon.ts
var SVG_ICON_SIZE = 72;
var SVG_ICON_MIN = 20;
var ROTATE_ZONE_PX = 20;
var SVG_ICON_FRAME = 1.5;
var ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18.5 9A7 7 0 1 0 19 13" stroke="white" stroke-width="4"/><path d="M19.5 4.5V9h-4.5" stroke="white" stroke-width="4"/><path d="M18.5 9A7 7 0 1 0 19 13" stroke="black" stroke-width="1.6"/><path d="M19.5 4.5V9h-4.5" stroke="black" stroke-width="1.6"/></g></svg>')}") 12 12, alias`;
function resizeCursor(dx, dy) {
  const a = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 180;
  if (a < 22.5 || a >= 157.5) return "ew-resize";
  if (a < 67.5) return "nwse-resize";
  if (a < 112.5) return "ns-resize";
  return "nesw-resize";
}
var SvgIcon = class extends Drawing {
  constructor(init) {
    super(init);
    if (!Number.isFinite(this.size)) this.size = SVG_ICON_SIZE;
    if (!Number.isFinite(this.angle)) this.angle = Math.PI / 2;
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "p", free: "both" }] };
  }
  /** TradingView's frame padding: 4 px, growing with the size past 72. */
  padding() {
    return 4 * Math.max(1, this.size / SVG_ICON_SIZE);
  }
  /** The frame side (picture plus padding on both sides). */
  frameSide() {
    return this.size + 2 * this.padding();
  }
  center(proj) {
    const a = this.anchors[0];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  /** The frame's corners, TradingView's order: top right, top left, bottom left, bottom right (rotated). */
  corners(proj) {
    const c = this.center(proj);
    if (!c) return [];
    const f = Math.SQRT2 * (this.frameSide() + SVG_ICON_FRAME / 2) / 2;
    const m = -this.angle + Math.PI / 2;
    const ax = f * Math.cos(m + Math.PI / 4);
    const ay = f * Math.sin(m + Math.PI / 4);
    const bx = f * Math.cos(m + 3 * Math.PI / 4);
    const by = f * Math.sin(m + 3 * Math.PI / 4);
    return [
      [c[0] + ax, c[1] - ay],
      [c[0] + bx, c[1] - by],
      [c[0] - ax, c[1] + ay],
      [c[0] - bx, c[1] + by]
    ];
  }
  /** Inside the (rotated) frame. */
  inFrame(px, py, proj) {
    const c = this.center(proj);
    if (!c) return false;
    const r = -(this.angle - Math.PI / 2);
    const dx = px - c[0];
    const dy = py - c[1];
    const x = dx * Math.cos(r) - dy * Math.sin(r);
    const y = dx * Math.sin(r) + dy * Math.cos(r);
    const h = this.frameSide() / 2;
    return Math.abs(x) <= h && Math.abs(y) <= h;
  }
  hitTest(px, py, proj, _tol) {
    return this.inFrame(px, py, proj);
  }
  handlePoints(proj) {
    return this.corners(proj);
  }
  /** A corner handle (0..3); else, off the frame but within 20 px of a corner, its rotate zone (4..7). */
  hitHandle(px, py, proj, tol) {
    const corners = this.corners(proj);
    const i = handleAt(px, py, corners, tol + 3);
    if (i >= 0) return i;
    if (this.inFrame(px, py, proj)) return -1;
    const z = corners.findIndex(([x, y]) => Math.hypot(px - x, py - y) <= ROTATE_ZONE_PX);
    return z >= 0 ? 4 + z : -1;
  }
  /** The rotate cursor over a rotate zone; over a corner, the resize arrow pointing from the centre to it. */
  handleCursor(index, proj) {
    if (index >= 4) return ROTATE_CURSOR;
    if (!proj) return null;
    const c = this.center(proj);
    const k = this.corners(proj)[index];
    return c && k ? resizeCursor(k[0] - c[0], k[1] - c[1]) : null;
  }
  /** TradingView's corner and rotate drags, from the press (`start`). */
  dragHandlePx(index, x, y, proj, start) {
    if (!start) return true;
    const c = this.center(proj);
    if (!c) return true;
    const props = start.doc.props ?? {};
    const size0 = typeof props.size === "number" ? props.size : this.size;
    const angle0 = typeof props.angle === "number" ? props.angle : this.angle;
    if (index >= 4) {
      const a0 = Math.atan2(start.y - c[1], start.x - c[0]);
      const a1 = Math.atan2(y - c[1], x - c[0]);
      this.angle = normAngle(angle0 + (a1 - a0));
      return true;
    }
    const d0 = Math.hypot(start.x - c[0], start.y - c[1]);
    if (d0 < 1) return true;
    this.size = Math.max(SVG_ICON_MIN, size0 * Math.hypot(x - c[0], y - c[1]) / d0);
    const crossed = Math.sign(start.x - c[0]) !== Math.sign(x - c[0]) || Math.sign(start.y - c[1]) !== Math.sign(y - c[1]);
    this.angle = normAngle(crossed ? angle0 + Math.PI : angle0);
    return true;
  }
  bounds(proj) {
    const k = this.corners(proj);
    if (k.length === 0) return null;
    const xs = k.map((p) => p[0]);
    const ys = k.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  priceRange() {
    const a = this.anchors[0];
    return a ? { min: a.price, max: a.price } : null;
  }
  writeProps() {
    return { size: this.size, angle: this.angle };
  }
  readProps(props) {
    if (typeof props.size === "number" && Number.isFinite(props.size)) this.size = Math.min(2e3, Math.max(SVG_ICON_MIN, props.size));
    if (typeof props.angle === "number" && Number.isFinite(props.angle)) this.angle = normAngle(props.angle);
  }
};
function normAngle(a) {
  const t = 2 * Math.PI;
  return (a % t + t) % t;
}
var EMOJI_SET = new Set(EMOJI_GROUPS.flatMap((g) => g.emojis));
var EmojiDrawing = class extends SvgIcon {
  constructor(init) {
    super(init);
    this.type = "emoji";
    if (!this.emoji) this.emoji = "\u{1F600}";
  }
  schema() {
    return { fields: [] };
  }
  writeProps() {
    return { ...super.writeProps(), emoji: this.emoji };
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.emoji === "string" && EMOJI_SET.has(props.emoji)) this.emoji = props.emoji;
  }
};
var IconDrawing = class extends SvgIcon {
  constructor(init) {
    super(init);
    this.type = "icon";
    if (!Number.isFinite(this.icon)) this.icon = 61720;
  }
  schema() {
    return { fields: [{ path: "style.lineColor", label: "Color", kind: "color", group: "line" }] };
  }
  writeProps() {
    return { ...super.writeProps(), icon: this.icon };
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.icon === "number" && FA_GLYPHS[props.icon]) this.icon = props.icon;
  }
};

// src/core/drawings/types/FibRatios.ts
var isFibSize = (v) => v === "small" || v === "normal" || v === "large" || v === "huge";
function sanitizeLevel(v) {
  if (!v || typeof v !== "object") return null;
  const o = v;
  if (typeof o.ratio !== "number" || typeof o.color !== "string") return null;
  return {
    ratio: o.ratio,
    color: o.color,
    enabled: o.enabled !== false,
    ...typeof o.label === "string" && o.label ? { label: o.label } : {},
    ...typeof o.lineWidth === "number" && Number.isFinite(o.lineWidth) ? { lineWidth: Math.min(10, Math.max(1, o.lineWidth)) } : {},
    ...o.lineStyle === "solid" || o.lineStyle === "dashed" || o.lineStyle === "dotted" ? { lineStyle: o.lineStyle } : {}
  };
}
var FibRatios = class extends Drawing {
  constructor(init) {
    super(init);
    if (!this.levels) this.levels = this.defaultLevels().map((l) => ({ ...l }));
    if (!this.numbersSize) this.numbersSize = "small";
    if (!this.labelsSize) this.labelsSize = "normal";
  }
  /** Optional fill bands between entries (retracement/extension override); default none. A band's own `alpha`
   *  overrides the drawing's fill opacity (a Gann box's price and time bands each have their own). */
  fillBands(_proj) {
    return [];
  }
  /** Optional filled areas between entries that are not axis-aligned bands (Gann fan wedges, Gann square arc
   *  rings), painted under the lines at the tool's fill opacity; default none. */
  fillPolygons(_proj) {
    return [];
  }
  editableLevels() {
    return this.levels;
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }] };
  }
  hitTest(px, py, proj, tol) {
    const lines = this.entryLines(proj);
    return lines != null && lines.some((l) => !l.noStroke && distToSegment(px, py, l.x1, l.y1, l.x2, l.y2) <= tol);
  }
  handlePoints(proj) {
    const pts = [];
    for (const a of this.anchors) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      pts.push([proj.xOf(a.time), y]);
    }
    return pts;
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const pts = this.handlePoints(proj);
    if (pts.length === 0) return null;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  schema() {
    return { fields: LINE_FIELDS.filter((f) => f.path !== "style.lineColor") };
  }
  writeProps() {
    return { levels: this.levels.map((l) => ({ ...l })), numbersSize: this.numbersSize, labelsSize: this.labelsSize };
  }
  readProps(props) {
    if (Array.isArray(props.levels)) {
      const parsed = props.levels.map(sanitizeLevel).filter((l) => l != null);
      if (parsed.length) this.levels = parsed;
    }
    if (isFibSize(props.numbersSize)) this.numbersSize = props.numbersSize;
    if (isFibSize(props.labelsSize)) this.labelsSize = props.labelsSize;
  }
};

// src/core/drawings/types/FibLevels.ts
var FIB_STYLE_DEFAULTS = {
  extendLeft: false,
  extendRight: false,
  showLevels: true,
  levelsAsPercent: false,
  showPrices: true,
  labelH: "left",
  labelV: "top",
  background: true,
  /** Fill alpha 0..1 (TradingView shows it as transparency). */
  fillOpacity: 0.06,
  trendline: false
};
var TV_FIB_FONT_SIZES = [8, 10, 11, 12, 14, 16, 18, 20, 22, 24];
function fibLabelText(o, ratio, price, tick) {
  const lvl = o.levelsAsPercent ? `${(ratio * 100).toFixed(2)}%` : String(ratio);
  const dp = tick && tick > 0 ? Math.max(0, Math.min(10, Math.round(-Math.log10(tick)))) : 2;
  const pr = tick && tick > 0 ? price.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }) : price.toFixed(2);
  if (o.showLevels && o.showPrices) return `${lvl} (${pr})`;
  if (o.showLevels) return lvl;
  if (o.showPrices) return pr;
  return "";
}
var isH = (v) => v === "left" || v === "center" || v === "right";
var isV = (v) => v === "top" || v === "middle" || v === "bottom";
var isStyle = (v) => v === "solid" || v === "dashed" || v === "dotted";
var FibLevels = class extends FibRatios {
  constructor(init) {
    super(init);
    for (const [k, v] of Object.entries(FIB_STYLE_DEFAULTS)) {
      if (this[k] === void 0) this[k] = v;
    }
  }
  /** Price of a level for the two anchor prices; subclasses override to change which anchor ratio 0 sits on. */
  levelPrice(ratio, p1, p2) {
    return p1 + ratio * (p2 - p1);
  }
  /** Per-level pixel line + price for the ENABLED levels, spanning the anchors' time range. */
  levelLines(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const xa = proj.xOf(a.time);
    const xb = proj.xOf(b.time);
    const x1 = this.extendLeft ? 0 : Math.min(xa, xb);
    const x2 = this.extendRight ? proj.width : Math.max(xa, xb);
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const price = this.levelPrice(lv.ratio, a.price, b.price);
      const y = proj.yOf(price, this.paneId);
      if (y == null) continue;
      out.push({ ratio: lv.ratio, color: lv.color, label: lv.label, price, x1, x2, y });
    }
    return out;
  }
  /** The number shown beside a level: its ratio (or percent) and/or its price, as the settings choose. */
  levelText(ratio, price, tick) {
    return fibLabelText(this, ratio, price, tick);
  }
  entryLines(proj) {
    const lines = this.levelLines(proj);
    if (!lines) return null;
    if (this.tv) return this.tvEntryLines(lines, proj);
    const h = this.labelH;
    const dy = this.labelV === "top" ? -7 : this.labelV === "bottom" ? 7 : 0;
    return lines.map((l) => ({
      color: l.color,
      label: l.label,
      x1: l.x1,
      y1: l.y,
      x2: l.x2,
      y2: l.y,
      numberText: this.levelText(l.ratio, l.price),
      numberX: h === "left" ? l.x1 + 4 : h === "right" ? l.x2 - 4 : (l.x1 + l.x2) / 2,
      numberY: l.y + dy,
      numberAlign: h,
      // The custom label sits on the opposite side from the numbers so the two never overlap.
      labelX: h === "center" ? l.x2 - 4 : (l.x1 + l.x2) / 2,
      labelY: l.y + (dy === 0 ? -7 : dy)
    }));
  }
  /** TradingView's placement (module 516130 getTextAlignInBox, 4 px offset): a Left label ends 4 px before the
   *  level's left end (starts 4 px in from the screen edge when the lines extend left), Right starts 4 px after
   *  its right end, Center sits mid-span. Top / Bottom put the text above / below the line, Middle on it. */
  tvEntryLines(lines, proj) {
    const fs = this.fontSize ?? 12;
    const off = (v) => v === "top" ? -(fs / 2 + 3) : v === "bottom" ? fs / 2 + 3 : 0;
    const place = (h, l) => {
      if (h === "left") return this.extendLeft ? { x: 4, align: "left" } : { x: l.x1 - 4, align: "right" };
      if (h === "right") return this.extendRight ? { x: proj.width - 4, align: "right" } : { x: l.x2 + 4, align: "left" };
      return { x: (l.x1 + l.x2) / 2, align: "center" };
    };
    return lines.map((l) => {
      const num5 = place(this.labelH, l);
      const txt = place(this.textH ?? "center", l);
      return {
        color: l.color,
        label: this.showText === false ? void 0 : l.label,
        x1: l.x1,
        y1: l.y,
        x2: l.x2,
        y2: l.y,
        numberText: this.levelText(l.ratio, l.price),
        ratio: l.ratio,
        price: l.price,
        numberX: num5.x,
        numberY: l.y + off(this.labelV),
        numberAlign: num5.align,
        labelX: txt.x,
        labelY: l.y + off(this.textV ?? "middle"),
        labelAlign: txt.align
      };
    });
  }
  fillBands(proj) {
    if (!this.background) return [];
    const lines = this.levelLines(proj);
    if (!lines) return [];
    const bands = [];
    for (let i = 1; i < lines.length; i += 1) {
      const a = lines[i - 1];
      const b = lines[i];
      bands.push({ color: b.color, x: a.x1, y: Math.min(a.y, b.y), w: a.x2 - a.x1, h: Math.abs(b.y - a.y) });
    }
    return bands;
  }
  writeProps() {
    const out = { ...super.writeProps() };
    for (const k of Object.keys(FIB_STYLE_DEFAULTS)) out[k] = this[k];
    if (this.tv) {
      Object.assign(out, {
        tv: true,
        trendColor: this.trendColor,
        trendWidth: this.trendWidth,
        trendStyle: this.trendStyle,
        fontSize: this.fontSize,
        showText: this.showText,
        textH: this.textH,
        textV: this.textV,
        logScale: this.logScale
      });
    }
    return out;
  }
  readProps(props) {
    super.readProps(props);
    const self = this;
    for (const [k, def] of Object.entries(FIB_STYLE_DEFAULTS)) {
      const v = props[k];
      if (typeof def === "boolean" && typeof v === "boolean") self[k] = v;
      else if (typeof def === "number" && typeof v === "number" && Number.isFinite(v)) self[k] = Math.min(1, Math.max(0, v));
    }
    if (props.labelH === "left" || props.labelH === "center" || props.labelH === "right") this.labelH = props.labelH;
    if (props.labelV === "top" || props.labelV === "middle" || props.labelV === "bottom") this.labelV = props.labelV;
    if (props.tv === true) this.tv = true;
    if (typeof props.trendColor === "string") this.trendColor = props.trendColor;
    if (typeof props.trendWidth === "number" && Number.isFinite(props.trendWidth)) this.trendWidth = Math.min(10, Math.max(1, props.trendWidth));
    if (isStyle(props.trendStyle)) this.trendStyle = props.trendStyle;
    if (typeof props.fontSize === "number" && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
    if (typeof props.showText === "boolean") this.showText = props.showText;
    if (isH(props.textH)) this.textH = props.textH;
    if (isV(props.textV)) this.textV = props.textV;
    if (typeof props.logScale === "boolean") this.logScale = props.logScale;
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const prices = this.levels.filter((l) => l.enabled).map((l) => this.levelPrice(l.ratio, a.price, b.price));
    if (prices.length === 0) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
};

// src/core/drawings/types/FibRetracement.ts
var EXTRA = [1.272, 1.414, 1.618, 2, 2.272, 2.414, 2.618, 3, 3.272, 3.414, 3.618, 4, 4.236, -0.236, -0.382, -0.618, -1, -1.618];
var LEVELS = fibLevels([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, ...EXTRA.map((ratio) => ({ ratio, enabled: false }))]);
var TV_GRAY = "#808080";
var TV_RED = "#F23645";
var TV_ORANGE = "#FF9800";
var TV_GREEN = "#4caf50";
var TV_TEAL = "#089981";
var TV_CYAN = "#00bcd4";
var TV_BLUE = "#2962FF";
var TV_PURPLE = "#9c27b0";
var TV_PINK = "#e91e63";
var TV_FIB_RETRACEMENT_LEVELS = [
  [0, TV_GRAY, true],
  [0.236, TV_RED, true],
  [0.382, TV_ORANGE, true],
  [0.5, TV_GREEN, true],
  [0.618, TV_TEAL, true],
  [0.786, TV_CYAN, true],
  [1, TV_GRAY, true],
  [1.618, TV_BLUE, true],
  [2.618, TV_RED, true],
  [3.618, TV_PURPLE, true],
  [4.236, TV_PINK, true],
  [1.272, TV_ORANGE, false],
  [1.414, TV_RED, false],
  [2.272, TV_ORANGE, false],
  [2.414, TV_GREEN, false],
  [2, TV_TEAL, false],
  [3, TV_CYAN, false],
  [3.272, TV_GRAY, false],
  [3.414, TV_BLUE, false],
  [4, TV_RED, false],
  [4.272, TV_PURPLE, false],
  [4.414, TV_PINK, false],
  [4.618, TV_ORANGE, false],
  [4.764, TV_TEAL, false]
].map(([ratio, color, enabled]) => ({ ratio, color, enabled }));
var TV_FIB_TREND_COLOR = TV_GRAY;
function applyTvFibLook(d) {
  d.tv = true;
  d.levels = TV_FIB_RETRACEMENT_LEVELS.map((l) => ({ ...l }));
  d.trendline = true;
  d.trendColor = TV_FIB_TREND_COLOR;
  d.trendWidth = 2;
  d.trendStyle = "dashed";
  d.style = { ...d.style, lineWidth: 2, lineStyle: "solid" };
  d.background = true;
  d.fillOpacity = 0.2;
  d.showLevels = true;
  d.levelsAsPercent = false;
  d.showPrices = true;
  d.labelH = "left";
  d.labelV = "middle";
  d.showText = true;
  d.textH = "center";
  d.textV = "middle";
  d.fontSize = 12;
  d.logScale = false;
}
var FibRetracement = class extends FibLevels {
  constructor(init) {
    super(init);
    this.type = "fibretracement";
    if (this.reverse === void 0) this.reverse = false;
    if (!init.props) applyTvFibLook(this);
  }
  defaultLevels() {
    return LEVELS;
  }
  levelPrice(ratio, p1, p2) {
    return this.reverse ? p1 + ratio * (p2 - p1) : p2 + ratio * (p1 - p2);
  }
  writeProps() {
    return { ...super.writeProps(), reverse: this.reverse };
  }
  readProps(props) {
    super.readProps(props);
    this.reverse = typeof props.reverse === "boolean" ? props.reverse : true;
  }
};

// src/core/drawings/types/FibExtension.ts
var LEVELS2 = fibLevels([0, 0.382, 0.618, 1, 1.272, 1.618, { ratio: 2.618, color: LEVEL_PURPLE }]);
var FibExtension = class extends FibLevels {
  constructor() {
    super(...arguments);
    this.type = "fibextension";
  }
  defaultLevels() {
    return LEVELS2;
  }
};

// src/core/drawings/types/FibExtensionTrend.ts
var LEVELS3 = fibLevels([0, 0.382, 0.5, 0.618, 1, 1.618, { ratio: 2.618, color: LEVEL_PURPLE }]);
var FibExtensionTrend = class extends FibLevels {
  constructor(init) {
    super(init);
    this.type = "fibextensiontrend";
    if (!init.props) {
      applyTvFibLook(this);
      this.reverse = false;
    }
  }
  anchorSchema() {
    return {
      min: 3,
      max: 3,
      slots: [
        { role: "a", free: "both" },
        { role: "b", free: "both" },
        { role: "c", free: "both" }
      ]
    };
  }
  defaultLevels() {
    return LEVELS3;
  }
  move() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return this.tv && this.reverse ? a.price - b.price : b.price - a.price;
  }
  /** TradingView's levels: from C by the A–B move, spanning B..C (extended to the edges when set). */
  levelLines(proj) {
    const b = this.anchors[1];
    const c = this.anchors[2];
    const move = this.move();
    if (!b || !c || move == null) return null;
    const xb = proj.xOf(b.time);
    const xc = proj.xOf(c.time);
    const x1 = this.extendLeft ? 0 : Math.min(xb, xc);
    const x2 = this.extendRight ? proj.width : Math.max(xb, xc);
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const price = c.price + lv.ratio * move;
      const y = proj.yOf(price, this.paneId);
      if (y == null) continue;
      out.push({ ratio: lv.ratio, color: lv.color, label: lv.label, price, x1, x2, y });
    }
    return out;
  }
  entryLines(proj) {
    if (this.tv) return super.entryLines(proj);
    const a = this.anchors[0];
    const b = this.anchors[1];
    const c = this.anchors[2];
    if (!a || !b || !c) return null;
    const move = b.price - a.price;
    const xs = [proj.xOf(a.time), proj.xOf(b.time), proj.xOf(c.time)];
    const x1 = Math.min(...xs);
    const x2 = Math.max(...xs);
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const price = c.price + lv.ratio * move;
      const y = proj.yOf(price, this.paneId);
      if (y == null) continue;
      out.push({
        color: lv.color,
        label: lv.label,
        x1,
        y1: y,
        x2,
        y2: y,
        numberText: `${lv.ratio} (${price.toFixed(2)})`,
        numberX: x1 + 4,
        numberY: y - 7,
        numberAlign: "left",
        labelX: (x1 + x2) / 2,
        labelY: y - 7
      });
    }
    return out;
  }
  /** Bands only on TradingView-look drawings (saved ones never had a fill). */
  fillBands(proj) {
    return this.tv ? super.fillBands(proj) : [];
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    const c = this.anchors[2];
    const move = this.move();
    if (!a || !b || !c || move == null) return null;
    const prices = this.levels.filter((l) => l.enabled).map((l) => c.price + l.ratio * move);
    prices.push(a.price, b.price, c.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
  writeProps() {
    const out = super.writeProps();
    if (this.tv) out.reverse = this.reverse === true;
    return out;
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.reverse === "boolean") this.reverse = props.reverse;
  }
};

// src/core/drawings/types/FibFan.ts
var FAN_LEVELS = fibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1]);
var FibFan = class extends FibRatios {
  constructor() {
    super(...arguments);
    this.type = "fibfan";
  }
  defaultLevels() {
    return FAN_LEVELS;
  }
  fanLines(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const x0 = proj.xOf(a.time);
    const y0 = proj.yOf(a.price, this.paneId);
    if (y0 == null) return null;
    const xb = proj.xOf(b.time);
    const delta = b.price - a.price;
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const ty = proj.yOf(a.price + lv.ratio * delta, this.paneId);
      if (ty == null) continue;
      const [x1, y1, x2, y2] = extendRay(x0, y0, xb, ty, "right", proj.width, proj.height);
      out.push({ ratio: lv.ratio, color: lv.color, label: lv.label, x1, y1, x2, y2, labelX: xb + 5, labelY: ty });
    }
    return out;
  }
  entryLines(proj) {
    const lines = this.fanLines(proj);
    if (!lines) return null;
    return lines.map((l) => ({
      color: l.color,
      label: l.label,
      x1: l.x1,
      y1: l.y1,
      x2: l.x2,
      y2: l.y2,
      numberText: String(l.ratio),
      numberX: l.labelX,
      numberY: l.labelY,
      numberAlign: "left",
      labelX: l.labelX,
      labelY: l.labelY + 13
    }));
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
};

// src/core/drawings/types/FibTimeZones.ts
var TV_TZ_GRAY = "#808080";
var TV_TZ_BLUE = "#2962FF";
var TV_FIB_TIME_ZONE_LEVELS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89].map((n, i) => ({
  ratio: n,
  color: i === 0 ? TV_TZ_GRAY : TV_TZ_BLUE,
  enabled: true,
  lineWidth: 2,
  lineStyle: "solid"
}));
var TZ_LEVELS = [0, 1, 2, 3, 5, 8, 13, 21, 34].map((n) => ({ ratio: n, color: DEFAULT_DRAWING_COLOR, enabled: true }));
var FibVerticalLevels = class extends FibRatios {
  constructor(init) {
    super(init);
    if (!init.props) {
      this.tv = true;
      this.applyTvDefaults();
    }
  }
  entryLines(proj) {
    const lines = this.zoneLines(proj);
    if (!lines) return null;
    const h = proj.height;
    if (this.tv) {
      const rect = proj.paneRect?.(this.paneId) ?? { top: 0, height: h };
      const fs = this.fontSize ?? 12;
      const v = this.labelV ?? "bottom";
      const y = v === "top" ? rect.top + fs / 2 + 3 : v === "middle" ? rect.top + rect.height / 2 : rect.top + rect.height - fs / 2 - 3;
      const hz = this.labelH ?? "right";
      const byLevel = new Map(this.levels.map((l) => [l.ratio, l]));
      return lines.map((l) => {
        const lv = byLevel.get(l.n);
        return {
          color: l.color,
          x1: l.x,
          y1: rect.top,
          x2: l.x,
          y2: rect.top + rect.height,
          numberText: this.showLabels === false ? "" : String(l.n),
          numberX: hz === "right" ? l.x + 2 : hz === "left" ? l.x - 2 : l.x,
          numberY: y,
          numberAlign: hz === "right" ? "left" : hz === "left" ? "right" : "center",
          labelX: l.x,
          labelY: y,
          ...lv?.lineWidth ? { lineWidth: lv.lineWidth } : {},
          ...lv?.lineStyle ? { lineStyle: lv.lineStyle } : {}
        };
      });
    }
    return lines.map((l) => ({
      color: l.color,
      label: l.label,
      x1: l.x,
      y1: 0,
      x2: l.x,
      y2: h,
      numberText: String(l.n),
      numberX: l.x,
      numberY: 9,
      numberAlign: "center",
      labelX: l.x,
      labelY: 24
    }));
  }
  /** TradingView's bands (Background on): between consecutive shown lines, the full pane, the later line's colour. */
  fillBands(proj) {
    if (!this.tv || !this.background) return [];
    const lines = this.zoneLines(proj);
    if (!lines) return [];
    const rect = proj.paneRect?.(this.paneId) ?? { top: 0, height: proj.height };
    const out = [];
    for (let i = 1; i < lines.length; i += 1) {
      const a = lines[i - 1];
      const b = lines[i];
      out.push({ color: b.color, x: Math.min(a.x, b.x), y: rect.top, w: Math.abs(b.x - a.x), h: rect.height });
    }
    return out;
  }
  writeProps() {
    const out = super.writeProps();
    if (this.tv) {
      Object.assign(out, {
        tv: true,
        background: this.background === true,
        fillOpacity: this.fillOpacity,
        showLabels: this.showLabels !== false,
        labelH: this.labelH,
        labelV: this.labelV,
        trendline: this.trendline !== false,
        trendColor: this.trendColor,
        trendWidth: this.trendWidth,
        trendStyle: this.trendStyle,
        fontSize: this.fontSize
      });
    }
    return out;
  }
  readProps(props) {
    super.readProps(props);
    if (props.tv === true) this.tv = true;
    for (const k of ["background", "showLabels", "trendline"]) if (typeof props[k] === "boolean") this[k] = props[k];
    if (typeof props.fillOpacity === "number" && Number.isFinite(props.fillOpacity)) this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
    if (props.labelH === "left" || props.labelH === "center" || props.labelH === "right") this.labelH = props.labelH;
    if (props.labelV === "top" || props.labelV === "middle" || props.labelV === "bottom") this.labelV = props.labelV;
    if (typeof props.trendColor === "string") this.trendColor = props.trendColor;
    if (typeof props.trendWidth === "number" && Number.isFinite(props.trendWidth)) this.trendWidth = Math.min(10, Math.max(1, props.trendWidth));
    if (props.trendStyle === "solid" || props.trendStyle === "dashed" || props.trendStyle === "dotted") this.trendStyle = props.trendStyle;
    if (typeof props.fontSize === "number" && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
    if (this.tv) this.levels = this.levels.map((l) => ({ ...l, lineWidth: l.lineWidth ?? 2, lineStyle: l.lineStyle ?? "solid" }));
  }
  priceRange() {
    return null;
  }
  timeExtent() {
    return null;
  }
};
var FibTimeZones = class extends FibVerticalLevels {
  constructor() {
    super(...arguments);
    this.type = "fibtimezones";
  }
  applyTvDefaults() {
    this.levels = TV_FIB_TIME_ZONE_LEVELS.map((l) => ({ ...l }));
    this.style = { ...this.style, lineWidth: 2, lineStyle: "solid" };
    this.background = false;
    this.fillOpacity = 0.2;
    this.showLabels = true;
    this.labelH = "right";
    this.labelV = "bottom";
    this.trendline = true;
    this.trendColor = TV_TZ_GRAY;
    this.trendWidth = 1;
    this.trendStyle = "dashed";
    this.fontSize = 12;
  }
  defaultLevels() {
    return TZ_LEVELS;
  }
  zoneLines(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const unit = b.time - a.time;
    if (Math.abs(unit) < 1e-9) return null;
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      out.push({ n: lv.ratio, color: lv.color, label: lv.label, x: proj.xOf(timeBetween(proj, a.time, b.time, lv.ratio)) });
    }
    return out;
  }
};

// src/core/drawings/types/FibChannel.ts
var CHANNEL_LEVELS = fibLevels([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]);
var FibChannel = class extends FibRatios {
  constructor(init) {
    super(init);
    this.type = "fibchannel";
    if (!init.props) {
      this.tv = true;
      this.levels = TV_FIB_RETRACEMENT_LEVELS.map((l) => ({ ...l }));
      this.style = { ...this.style, lineWidth: 2, lineStyle: "solid" };
      this.extendLeft = false;
      this.extendRight = false;
      this.background = true;
      this.fillOpacity = 0.2;
      this.showLevels = true;
      this.levelsAsPercent = false;
      this.showPrices = true;
      this.labelH = "left";
      this.labelV = "middle";
      this.fontSize = 12;
    }
  }
  levelText(ratio, price, tick) {
    return fibLabelText({ showLevels: this.showLevels !== false, levelsAsPercent: this.levelsAsPercent === true, showPrices: this.showPrices !== false }, ratio, price, tick);
  }
  defaultLevels() {
    return CHANNEL_LEVELS;
  }
  anchorSchema() {
    return { min: 3, max: 3, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }, { role: "offset", free: "both" }] };
  }
  /** Each shown level as a line in pixels (the baseline shifted by ratio x the A->C offset), extended to the screen
   *  edges along its slope when set, with the price at its left end. */
  tvLines(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const y0 = proj.yOf(a.price, this.paneId);
    const y1 = proj.yOf(b.price, this.paneId);
    if (y0 == null || y1 == null) return null;
    const x0 = proj.xOf(a.time);
    const x1 = proj.xOf(b.time);
    let dX = 0;
    let dY = 0;
    const c = this.anchors[2];
    if (c) {
      const y2 = proj.yOf(c.price, this.paneId);
      if (y2 == null) return null;
      dX = proj.xOf(c.time) - x0;
      dY = y2 - y0;
    }
    const [l, r] = x0 <= x1 ? [[x0, y0], [x1, y1]] : [[x1, y1], [x0, y0]];
    const slope = r[0] !== l[0] ? (r[1] - l[1]) / (r[0] - l[0]) : 0;
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const ox = lv.ratio * dX;
      const oy = lv.ratio * dY;
      const lx = l[0] + ox;
      const ly = l[1] + oy;
      const rx = r[0] + ox;
      const ry = r[1] + oy;
      const ex1 = this.extendLeft && rx !== lx ? 0 : lx;
      const ex2 = this.extendRight && rx !== lx ? proj.width : rx;
      out.push({ ratio: lv.ratio, color: lv.color, label: lv.label, x1: ex1, y1: ly + slope * (ex1 - lx), x2: ex2, y2: ly + slope * (ex2 - lx), lx, ly, rx, ry });
    }
    return out;
  }
  entryLines(proj) {
    if (this.tv) {
      const lines = this.tvLines(proj);
      if (!lines) return null;
      const fs = this.fontSize ?? 12;
      const v = this.labelV ?? "middle";
      const dy = v === "top" ? -(fs / 2 + 3) : v === "bottom" ? fs / 2 + 3 : 0;
      return lines.map((ln) => {
        const h = this.labelH ?? "left";
        const place = h === "left" ? this.extendLeft ? { x: 4, y: ln.ly, align: "left" } : { x: ln.lx - 4, y: ln.ly, align: "right" } : h === "right" ? this.extendRight ? { x: proj.width - 4, y: ln.ry, align: "right" } : { x: ln.rx + 4, y: ln.ry, align: "left" } : { x: (ln.x1 + ln.x2) / 2, y: (ln.y1 + ln.y2) / 2, align: "center" };
        const price = proj.pxToPoint(ln.lx, ln.ly, this.paneId).price;
        return {
          color: ln.color,
          x1: ln.x1,
          y1: ln.y1,
          x2: ln.x2,
          y2: ln.y2,
          numberText: this.levelText(ln.ratio, price),
          ratio: ln.ratio,
          price,
          numberX: place.x,
          numberY: place.y + dy,
          numberAlign: place.align,
          labelX: place.x,
          labelY: place.y + dy
        };
      });
    }
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const y0 = proj.yOf(a.price, this.paneId);
    const y1 = proj.yOf(b.price, this.paneId);
    if (y0 == null || y1 == null) return null;
    const x0 = proj.xOf(a.time);
    const x1 = proj.xOf(b.time);
    let dX = 0;
    let dY = 0;
    const c = this.anchors[2];
    if (c) {
      const y2 = proj.yOf(c.price, this.paneId);
      if (y2 == null) return null;
      dX = proj.xOf(c.time) - x0;
      dY = y2 - y0;
    }
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const ox = lv.ratio * dX;
      const oy = lv.ratio * dY;
      const lx2 = x1 + ox;
      const ly2 = y1 + oy;
      out.push({
        color: lv.color,
        label: lv.label,
        x1: x0 + ox,
        y1: y0 + oy,
        x2: lx2,
        y2: ly2,
        numberText: String(lv.ratio),
        numberX: lx2 + 5,
        numberY: ly2,
        numberAlign: "left",
        labelX: lx2 + 5,
        labelY: ly2 + 13
      });
    }
    return out;
  }
  /** TradingView's bands: between each shown level and the next shown one, in the first one's colour. */
  fillPolygons(proj) {
    if (!this.tv || this.background === false) return [];
    const lines = this.tvLines(proj);
    if (!lines) return [];
    const out = [];
    for (let i = 0; i + 1 < lines.length; i += 1) {
      const p = lines[i];
      const q = lines[i + 1];
      out.push({ color: p.color, pts: [[p.x1, p.y1], [p.x2, p.y2], [q.x2, q.y2], [q.x1, q.y1]] });
    }
    return out;
  }
  writeProps() {
    const out = super.writeProps();
    if (this.tv) {
      Object.assign(out, {
        tv: true,
        extendLeft: this.extendLeft === true,
        extendRight: this.extendRight === true,
        background: this.background !== false,
        fillOpacity: this.fillOpacity,
        showLevels: this.showLevels !== false,
        levelsAsPercent: this.levelsAsPercent === true,
        showPrices: this.showPrices !== false,
        labelH: this.labelH,
        labelV: this.labelV,
        fontSize: this.fontSize
      });
    }
    return out;
  }
  readProps(props) {
    super.readProps(props);
    if (props.tv === true) this.tv = true;
    for (const k of ["extendLeft", "extendRight", "background", "showLevels", "levelsAsPercent", "showPrices"]) {
      if (typeof props[k] === "boolean") this[k] = props[k];
    }
    if (typeof props.fillOpacity === "number" && Number.isFinite(props.fillOpacity)) this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
    if (props.labelH === "left" || props.labelH === "center" || props.labelH === "right") this.labelH = props.labelH;
    if (props.labelV === "top" || props.labelV === "middle" || props.labelV === "bottom") this.labelV = props.labelV;
    if (typeof props.fontSize === "number" && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    const c = this.anchors[2];
    if (!a || !b) return null;
    const dPrice = c ? c.price - a.price : 0;
    let min = Infinity;
    let max = -Infinity;
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      for (const base of [a.price, b.price]) {
        const p = base + lv.ratio * dPrice;
        if (p < min) min = p;
        if (p > max) max = p;
      }
    }
    return min <= max ? { min, max } : null;
  }
};

// src/core/drawings/types/FibSpeedFan.ts
var TV_GRAY2 = "#808080";
var TV_ORANGE2 = "#FF9800";
var TV_CYAN2 = "#00bcd4";
var TV_GREEN2 = "#4caf50";
var TV_TEAL2 = "#089981";
var TV_BLUE2 = "#2962FF";
var TV_SPEED_FAN_GRID = "rgba(21, 56, 153, 0.8)";
var TV_SPEED_FAN_LEVELS = [[0, TV_GRAY2], [0.25, TV_ORANGE2], [0.382, TV_CYAN2], [0.5, TV_GREEN2], [0.618, TV_TEAL2], [0.75, TV_BLUE2], [1, TV_GRAY2]].map(([ratio, color]) => ({ ratio, color, enabled: true }));
var FAR2 = (proj) => 4 * (proj.width + proj.height);
var FAN_LEVELS2 = fibLevels([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
var FibSpeedFan = class extends FibRatios {
  constructor(init) {
    super(init);
    this.type = "fibspeedfan";
    if (!init.props) {
      this.tv = true;
      this.levels = TV_SPEED_FAN_LEVELS.map((l) => ({ ...l }));
      this.timeLevels = TV_SPEED_FAN_LEVELS.map((l) => ({ ...l }));
      this.style = { ...this.style, lineWidth: 2, lineStyle: "solid" };
      this.background = true;
      this.fillOpacity = 0.2;
      this.grid = true;
      this.gridColor = TV_SPEED_FAN_GRID;
      this.gridWidth = 1;
      this.gridStyle = "solid";
      this.showLeftLabels = true;
      this.showRightLabels = true;
      this.showTopLabels = true;
      this.showBottomLabels = true;
      this.reverse = false;
      this.fontSize = 12;
    }
  }
  /** TradingView's levels in pixels: each shown price level's y and time level's x (module 32895: level 0 on the
   *  second point, 1 on the first; Reverse swaps them), the box and the rays' origin (always the first point). */
  tvGeometry(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const ay = proj.yOf(a.price, this.paneId);
    const by = proj.yOf(b.price, this.paneId);
    if (ay == null || by == null) return null;
    const ax = proj.xOf(a.time);
    const bx = proj.xOf(b.time);
    const [p0, p1] = this.reverse ? [a, b] : [b, a];
    const price = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const y = proj.yOf(p0.price + lv.ratio * (p1.price - p0.price), this.paneId);
      if (y != null) price.push({ lv, y });
    }
    const time = (this.timeLevels ?? []).filter((lv) => lv.enabled).map((lv) => ({ lv, x: proj.xOf(timeBetween(proj, p0.time, p1.time, lv.ratio)) }));
    return { ax, ay, bx, by, minX: Math.min(ax, bx), maxX: Math.max(ax, bx), minY: Math.min(ay, by), maxY: Math.max(ay, by), price, time };
  }
  /** A ray from (ax, ay) through (x, y), carried far past the chart (the canvas clips it). */
  far(proj, ax, ay, x, y) {
    const len = Math.hypot(x - ax, y - ay);
    if (len < 1e-9) return [x, y];
    const k = FAR2(proj) / len;
    return [ax + (x - ax) * k, ay + (y - ay) * k];
  }
  fillPolygons(proj) {
    if (!this.tv || this.background === false) return [];
    const g = this.tvGeometry(proj);
    if (!g) return [];
    const out = [];
    const wedges = (pts) => {
      for (let i = 1; i < pts.length; i += 1) {
        const p = pts[i - 1];
        const q = pts[i];
        out.push({ color: q.color, pts: [[g.ax, g.ay], this.far(proj, g.ax, g.ay, q.x, q.y), this.far(proj, g.ax, g.ay, p.x, p.y)] });
      }
    };
    wedges(g.price.map((p) => ({ color: p.lv.color, x: g.bx, y: p.y })));
    wedges(g.time.map((t) => ({ color: t.lv.color, x: t.x, y: g.by })));
    return out;
  }
  defaultLevels() {
    return FAN_LEVELS2;
  }
  entryLines(proj) {
    if (this.tv) return this.tvEntryLines(proj);
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const y1 = proj.yOf(a.price, this.paneId);
    const y2 = proj.yOf(b.price, this.paneId);
    if (y1 == null || y2 == null) return null;
    const x1 = proj.xOf(a.time);
    const x2 = proj.xOf(b.time);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dir = dx >= 0 ? "right" : "left";
    const w = proj.width;
    const h = proj.height;
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const pex = x1 + dx;
      const pey = y1 + dy * lv.ratio;
      const pr = extendRay(x1, y1, pex, pey, dir, w, h);
      out.push({
        color: lv.color,
        label: lv.label,
        x1: pr[0],
        y1: pr[1],
        x2: pr[2],
        y2: pr[3],
        numberText: String(lv.ratio),
        numberX: dir === "right" ? pex + 5 : pex - 5,
        numberY: pey,
        numberAlign: dir === "right" ? "left" : "right",
        labelX: pex,
        labelY: pey
      });
      if (lv.ratio === 1) continue;
      const tex = x1 + dx * lv.ratio;
      const tey = y1 + dy;
      const tr = extendRay(x1, y1, tex, tey, dir, w, h);
      out.push({
        color: lv.color,
        label: lv.label,
        x1: tr[0],
        y1: tr[1],
        x2: tr[2],
        y2: tr[3],
        numberText: String(lv.ratio),
        numberX: tex,
        numberY: tey + (dy >= 0 ? 12 : -12),
        numberAlign: "center",
        labelX: tex,
        labelY: tey + 12
      });
    }
    return out;
  }
  /** TradingView's lines: per level a grid line in the box (its labels at the box's sides, 5 px out, in the level's
   *  colour) and a ray from the first point (the drawing's width and style). */
  tvEntryLines(proj) {
    const g = this.tvGeometry(proj);
    if (!g) return null;
    const fs = this.fontSize ?? 12;
    const fmt = (r) => String(r);
    const grid = { strokeColor: this.gridColor || TV_SPEED_FAN_GRID, lineWidth: this.gridWidth ?? 1, lineStyle: this.gridStyle ?? "solid", noStroke: this.grid === false };
    const out = [];
    for (const { lv, y } of g.price) {
      out.push({
        color: lv.color,
        ...grid,
        x1: g.minX,
        y1: y,
        x2: g.maxX,
        y2: y,
        numberText: this.showLeftLabels === false ? "" : fmt(lv.ratio),
        numberX: g.minX - 5,
        numberY: y,
        numberAlign: "right",
        ...this.showRightLabels === false ? {} : { label: fmt(lv.ratio) },
        labelX: g.maxX + 5,
        labelY: y,
        labelAlign: "left"
      });
    }
    for (const { lv, x } of g.time) {
      out.push({
        color: lv.color,
        ...grid,
        x1: x,
        y1: g.minY,
        x2: x,
        y2: g.maxY,
        numberText: this.showTopLabels === false ? "" : fmt(lv.ratio),
        numberX: x,
        numberY: g.minY - 5 - fs / 2,
        numberAlign: "center",
        ...this.showBottomLabels === false ? {} : { label: fmt(lv.ratio) },
        labelX: x,
        labelY: g.maxY + 5 + fs / 2,
        labelAlign: "center"
      });
    }
    const ray = (lv, x, y) => {
      const [fx, fy] = this.far(proj, g.ax, g.ay, x, y);
      out.push({ color: lv.color, x1: g.ax, y1: g.ay, x2: fx, y2: fy, numberText: "", numberX: 0, numberY: 0, numberAlign: "left", labelX: 0, labelY: 0 });
    };
    for (const { lv, y } of g.price) ray(lv, g.bx, y);
    for (const { lv, x } of g.time) ray(lv, x, g.by);
    return out;
  }
  writeProps() {
    const out = super.writeProps();
    if (this.tv) {
      Object.assign(out, {
        tv: true,
        timeLevels: (this.timeLevels ?? []).map((l) => ({ ...l })),
        background: this.background !== false,
        fillOpacity: this.fillOpacity,
        grid: this.grid !== false,
        gridColor: this.gridColor,
        gridWidth: this.gridWidth,
        gridStyle: this.gridStyle,
        showLeftLabels: this.showLeftLabels !== false,
        showRightLabels: this.showRightLabels !== false,
        showTopLabels: this.showTopLabels !== false,
        showBottomLabels: this.showBottomLabels !== false,
        reverse: this.reverse === true,
        fontSize: this.fontSize
      });
    }
    return out;
  }
  readProps(props) {
    super.readProps(props);
    if (props.tv === true) this.tv = true;
    if (Array.isArray(props.timeLevels)) {
      const parsed = props.timeLevels.map(sanitizeLevel).filter((l) => l != null);
      if (parsed.length) this.timeLevels = parsed;
    }
    for (const k of ["background", "grid", "showLeftLabels", "showRightLabels", "showTopLabels", "showBottomLabels", "reverse"]) {
      if (typeof props[k] === "boolean") this[k] = props[k];
    }
    if (typeof props.fillOpacity === "number" && Number.isFinite(props.fillOpacity)) this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
    if (typeof props.gridColor === "string") this.gridColor = props.gridColor;
    if (typeof props.gridWidth === "number" && Number.isFinite(props.gridWidth)) this.gridWidth = Math.min(10, Math.max(1, props.gridWidth));
    if (props.gridStyle === "solid" || props.gridStyle === "dashed" || props.gridStyle === "dotted") this.gridStyle = props.gridStyle;
    if (typeof props.fontSize === "number" && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
    if (this.tv && !this.timeLevels) this.timeLevels = TV_SPEED_FAN_LEVELS.map((l) => ({ ...l }));
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
};

// src/core/drawings/types/TrendFibTime.ts
var TIME_LEVELS = fibLevels([
  0,
  0.382,
  { ratio: 0.5, enabled: false },
  // hidden by default
  0.618,
  1,
  1.382,
  1.618,
  2,
  2.382,
  2.618,
  3
]);
var TV_TFT_GRAY = "#808080";
var TV_TREND_FIB_TIME_LEVELS = [
  [0, TV_TFT_GRAY],
  [0.382, "#F23645"],
  // palette-exempt: TradingView's level colour
  [0.5, "#81C784"],
  // palette-exempt: TradingView's level colour
  [0.618, "#4CAF50"],
  // palette-exempt: TradingView's level colour
  [1, "#089981"],
  // palette-exempt: TradingView's level colour
  [1.382, "#00BCD4"],
  // palette-exempt: TradingView's level colour
  [1.618, TV_TFT_GRAY],
  [2, "#2962FF"],
  // palette-exempt: TradingView's level colour
  [2.382, "#E91E63"],
  // palette-exempt: TradingView's level colour
  [2.618, "#9C27B0"],
  // palette-exempt: TradingView's level colour
  [3, "#673AB7"]
  // palette-exempt: TradingView's level colour
].map(([ratio, color]) => ({ ratio, color, enabled: ratio !== 0.5, lineWidth: 2, lineStyle: "solid" }));
var TrendFibTime = class extends FibVerticalLevels {
  constructor() {
    super(...arguments);
    this.type = "trendfibtime";
  }
  applyTvDefaults() {
    this.levels = TV_TREND_FIB_TIME_LEVELS.map((l) => ({ ...l }));
    this.style = { ...this.style, lineWidth: 2, lineStyle: "solid" };
    this.background = true;
    this.fillOpacity = 0.2;
    this.showLabels = true;
    this.labelH = "right";
    this.labelV = "bottom";
    this.trendline = true;
    this.trendColor = TV_TFT_GRAY;
    this.trendWidth = 2;
    this.trendStyle = "dashed";
    this.fontSize = 12;
  }
  defaultLevels() {
    return TIME_LEVELS;
  }
  anchorSchema() {
    return { min: 3, max: 3, slots: [{ role: "p1", free: "both" }, { role: "p2", free: "both" }, { role: "p3", free: "both" }] };
  }
  zoneLines(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    const c = this.anchors[2];
    if (!a || !b || !c) return null;
    if (Math.abs(b.time - a.time) < 1e-9) return null;
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      out.push({ n: lv.ratio, color: lv.color, label: lv.label, x: proj.xOf(timeAfter(proj, c.time, a.time, b.time, lv.ratio)) });
    }
    return out;
  }
};

// src/core/drawings/types/RadialFib.ts
function angleInSweep(ang, a0, a1) {
  if (a1 - a0 >= Math.PI * 2 - 1e-3) return true;
  let d = ang - a0;
  const TWO_PI = Math.PI * 2;
  while (d < 0) d += TWO_PI;
  while (d >= TWO_PI) d -= TWO_PI;
  return d <= a1 - a0 + 1e-6;
}
var RadialFib = class extends FibRatios {
  constructor(init) {
    super(init);
    if (!init.props && this.applyTvDefaults()) this.tv = true;
  }
  /** Set TradingView's factory defaults on a new drawing; false when the tool has no TradingView look yet. */
  applyTvDefaults() {
    return false;
  }
  /** TradingView's shared ring look (circles, arcs; modules 289525 and 492327): these levels, bands on at 80 %
   *  transparency, numbers shown, a dashed grey 2 px trend line. */
  applyTvRingLook(levels, trendColor) {
    this.levels = levels.map((l) => ({ ...l }));
    this.style = { ...this.style, lineWidth: 2, lineStyle: "solid" };
    this.background = true;
    this.fillOpacity = 0.2;
    this.showLevels = true;
    this.levelsAsPercent = false;
    this.trendline = true;
    this.trendColor = trendColor;
    this.trendWidth = 2;
    this.trendStyle = "dashed";
  }
  /** Where a level's number goes on its ring of horizontal radius `r` (the old look: just past the sweep's middle). */
  ringLabel(g, r) {
    const mid = (g.a0 + g.a1) / 2;
    return { x: g.cx + Math.cos(mid) * r + 3, y: g.cy + Math.sin(mid) * r * (g.sy ?? 1), align: "left" };
  }
  /** A level's number: its coefficient, or TradingView's percent (61.80%); empty with Levels off. */
  ringText(ratio) {
    if (this.tv && this.showLevels === false) return "";
    return this.tv && this.levelsAsPercent ? `${(ratio * 100).toFixed(2)}%` : String(ratio);
  }
  /** The trend lines (TradingView-look drawings with them on), in pixels: the one between the two points by default. */
  trendSegments(proj) {
    const t = this.trendSegment(proj);
    return t ? [t] : [];
  }
  /** The trend line between the two points (TradingView-look drawings with it on), in pixels. */
  trendSegment(proj) {
    if (!this.tv || this.trendline === false) return null;
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const ay = proj.yOf(a.price, this.paneId);
    const by = proj.yOf(b.price, this.paneId);
    if (ay == null || by == null) return null;
    return [proj.xOf(a.time), ay, proj.xOf(b.time), by];
  }
  /** Straight lines drawn alongside the rings (baseline / wedge rays); previewed before `radial` resolves. */
  boundingLines(_proj) {
    return [];
  }
  // Ring tools hit-test by radius, not line segments → entryLines is unused (the painter dispatches
  // them to the arc branch). Satisfy the abstract with an empty set.
  entryLines(_proj) {
    return [];
  }
  hitTest(px, py, proj, tol) {
    const g = this.radial(proj);
    if (g) {
      const sy = g.sy && g.sy > 1e-6 ? g.sy : 1;
      const dy = (py - g.cy) / sy;
      const dist = Math.hypot(px - g.cx, dy);
      const ang = Math.atan2(dy, px - g.cx);
      if (angleInSweep(ang, g.a0, g.a1)) {
        for (const lv of this.levels) {
          if (lv.enabled && Math.abs(dist - g.R0 * lv.ratio) <= tol / Math.min(1, sy)) return true;
        }
      }
    }
    return [...this.boundingLines(proj), ...this.trendSegments(proj)].some((b) => distToSegment(px, py, b[0], b[1], b[2], b[3]) <= tol);
  }
  writeProps() {
    const out = super.writeProps();
    if (this.tv) {
      Object.assign(out, {
        tv: true,
        background: this.background === true,
        fillOpacity: this.fillOpacity,
        showLevels: this.showLevels !== false,
        levelsAsPercent: this.levelsAsPercent === true,
        trendline: this.trendline !== false,
        trendColor: this.trendColor,
        trendWidth: this.trendWidth,
        trendStyle: this.trendStyle
      });
    }
    return out;
  }
  readProps(props) {
    super.readProps(props);
    if (props.tv === true) this.tv = true;
    for (const k of ["background", "showLevels", "levelsAsPercent", "trendline"]) if (typeof props[k] === "boolean") this[k] = props[k];
    if (typeof props.fillOpacity === "number" && Number.isFinite(props.fillOpacity)) this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
    if (typeof props.trendColor === "string") this.trendColor = props.trendColor;
    if (typeof props.trendWidth === "number" && Number.isFinite(props.trendWidth)) this.trendWidth = Math.min(10, Math.max(1, props.trendWidth));
    if (props.trendStyle === "solid" || props.trendStyle === "dashed" || props.trendStyle === "dotted") this.trendStyle = props.trendStyle;
    if (this.tv) this.levels = this.levels.map((l) => ({ ...l, lineWidth: l.lineWidth ?? 2, lineStyle: l.lineStyle ?? "solid" }));
  }
  priceRange() {
    if (this.anchors.length === 0) return null;
    const ps = this.anchors.map((a) => a.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
};

// src/core/drawings/types/FibCircles.ts
var CIRCLE_LEVELS = fibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]);
var TV_FC_GRAY = "#808080";
var TV_FIB_CIRCLE_LEVELS = [
  [0.236, "#F23645"],
  // palette-exempt: TradingView's ripe-red-500
  [0.382, "#FF9800"],
  // palette-exempt: TradingView's tan-orange-500
  [0.5, "#089981"],
  // palette-exempt: TradingView's minty-green-500
  [0.618, "#4CAF50"],
  // palette-exempt: TradingView's iguana-green-500
  [0.786, "#00BCD4"],
  // palette-exempt: TradingView's sky-blue-500
  [1, TV_FC_GRAY],
  [1.618, "#2962FF"],
  // palette-exempt: TradingView's tv-blue-500
  [2.618, "#E91E63"],
  // palette-exempt: TradingView's berry-pink-500
  [3.618, "#2962FF"],
  // palette-exempt: TradingView's tv-blue-500
  [4.236, "#E91E63"],
  // palette-exempt: TradingView's berry-pink-500
  [4.618, "#F23645"]
  // palette-exempt: TradingView's ripe-red-500
].map(([ratio, color]) => ({ ratio, color, enabled: true, lineWidth: 2, lineStyle: "solid" }));
var FibCircles = class extends RadialFib {
  constructor() {
    super(...arguments);
    this.type = "fibcircles";
  }
  applyTvDefaults() {
    this.applyTvRingLook(TV_FIB_CIRCLE_LEVELS, TV_FC_GRAY);
    return true;
  }
  /** TradingView: the number ends 4 px left of the ring's lowest point, centred on it. */
  ringLabel(g, r) {
    if (!this.tv) return super.ringLabel(g, r);
    return { x: g.cx - 4, y: g.cy + r * (g.sy ?? 1), align: "right" };
  }
  defaultLevels() {
    return CIRCLE_LEVELS;
  }
  radial(proj) {
    const c = this.anchors[0];
    const e = this.anchors[1];
    if (!c || !e) return null;
    const cy = proj.yOf(c.price, this.paneId);
    const ey = proj.yOf(e.price, this.paneId);
    if (cy == null || ey == null) return null;
    const cx = proj.xOf(c.time);
    const ex = proj.xOf(e.time);
    const mx = (cx + ex) / 2;
    const my = (cy + ey) / 2;
    const rx = Math.abs(ex - cx) / 2;
    const ry = Math.abs(ey - cy) / 2;
    if (rx < 0.5 || ry < 0.5) return { cx: mx, cy: my, R0: Math.hypot(ex - cx, ey - cy) / 2, a0: 0, a1: Math.PI * 2 };
    return { cx: mx, cy: my, R0: rx, a0: 0, a1: Math.PI * 2, sy: ry / rx };
  }
};

// src/core/drawings/types/FibArcs.ts
var ARC_LEVELS = fibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]);
var FibArcs = class extends RadialFib {
  constructor() {
    super(...arguments);
    this.type = "fibarcs";
  }
  applyTvDefaults() {
    this.applyTvRingLook(TV_FIB_CIRCLE_LEVELS, TV_FC_GRAY);
    this.fullCircles = false;
    return true;
  }
  defaultLevels() {
    return ARC_LEVELS;
  }
  pts(proj) {
    const c = this.anchors[0];
    const e = this.anchors[1];
    if (!c || !e) return null;
    const cy = proj.yOf(c.price, this.paneId);
    const ey = proj.yOf(e.price, this.paneId);
    if (cy == null || ey == null) return null;
    return { cx: proj.xOf(c.time), cy, ex: proj.xOf(e.time), ey };
  }
  radial(proj) {
    const p = this.pts(proj);
    if (!p) return null;
    const R0 = Math.hypot(p.ex - p.cx, p.ey - p.cy);
    if (this.tv) {
      const dir = Math.sign(p.ey - p.cy);
      const [a0, a1] = this.fullCircles ? [0, Math.PI * 2] : dir > 0 ? [0, Math.PI] : [Math.PI, Math.PI * 2];
      return { cx: p.cx, cy: p.cy, R0, a0, a1, dir };
    }
    const phi = Math.atan2(p.ey - p.cy, p.ex - p.cx);
    return { cx: p.cx, cy: p.cy, R0, a0: phi - Math.PI / 2, a1: phi + Math.PI / 2 };
  }
  /** TradingView: the number ends 4 px left of where its circle crosses the vertical through p1, on p2's side. */
  ringLabel(g, r) {
    if (!this.tv) return super.ringLabel(g, r);
    return { x: g.cx - 4, y: g.cy + (g.dir ?? 0) * r, align: "right" };
  }
  boundingLines(proj) {
    if (this.tv) return [];
    const p = this.pts(proj);
    return p ? [[p.cx, p.cy, p.ex, p.ey]] : [];
  }
  writeProps() {
    const out = super.writeProps();
    if (this.tv) out.fullCircles = this.fullCircles === true;
    return out;
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.fullCircles === "boolean") this.fullCircles = props.fullCircles;
  }
};

// src/core/drawings/types/FibWedge.ts
var WEDGE_LEVELS = fibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1]);
var TV_FIB_WEDGE_LEVELS = [
  [0.236, "#F23645"],
  // palette-exempt: TradingView's ripe-red-500
  [0.382, "#FF9800"],
  // palette-exempt: TradingView's tan-orange-500
  [0.5, "#4CAF50"],
  // palette-exempt: TradingView's iguana-green-500
  [0.618, "#089981"],
  // palette-exempt: TradingView's minty-green-500
  [0.786, "#00BCD4"],
  // palette-exempt: TradingView's sky-blue-500
  [1, TV_FC_GRAY],
  [1.618, "#2962FF"],
  // palette-exempt: TradingView's tv-blue-500
  [2.618, "#F23645"],
  // palette-exempt: TradingView's ripe-red-500
  [3.618, "#673AB7"],
  // palette-exempt: TradingView's deep-blue-500
  [4.236, "#E91E63"],
  // palette-exempt: TradingView's berry-pink-500
  [4.618, "#E91E63"]
  // palette-exempt: TradingView's berry-pink-500
].map(([ratio, color]) => ({ ratio, color, enabled: ratio <= 1, lineWidth: 2, lineStyle: "solid" }));
var FibWedge = class extends RadialFib {
  constructor() {
    super(...arguments);
    this.type = "fibwedge";
  }
  applyTvDefaults() {
    this.applyTvRingLook(TV_FIB_WEDGE_LEVELS, TV_FC_GRAY);
    this.trendStyle = "solid";
    return true;
  }
  defaultLevels() {
    return WEDGE_LEVELS;
  }
  anchorSchema() {
    return { min: 3, max: 3, slots: [{ role: "apex", free: "both" }, { role: "radius", free: "both" }, { role: "angle", free: "both" }] };
  }
  px(proj, i) {
    const a = this.anchors[i];
    if (!a) return null;
    const y = proj.yOf(a.price, this.paneId);
    return y == null ? null : [proj.xOf(a.time), y];
  }
  radial(proj) {
    const p0 = this.px(proj, 0);
    const p1 = this.px(proj, 1);
    const p2 = this.px(proj, 2);
    if (!p0 || !p1 || !p2) return null;
    const R0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (R0 < 1) return null;
    const angle1 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    const angle2 = Math.atan2(p2[1] - p0[1], p2[0] - p0[0]);
    let lo = Math.min(angle1, angle2);
    let hi = Math.max(angle1, angle2);
    if (hi - lo > Math.PI) [lo, hi] = [hi, lo + Math.PI * 2];
    return { cx: p0[0], cy: p0[1], R0, a0: lo, a1: hi };
  }
  /** TradingView: the number ends 4 px left of where its arc meets the wedge's bisector. */
  ringLabel(g, r) {
    if (!this.tv) return super.ringLabel(g, r);
    const mid = (g.a0 + g.a1) / 2;
    return { x: g.cx + Math.cos(mid) * r - 4, y: g.cy + Math.sin(mid) * r, align: "right" };
  }
  /** TradingView-look drawings: the two edges are its trend lines (in the trend line's colour, width and style). */
  trendSegments(proj) {
    return this.tv && this.trendline !== false ? this.edges(proj) : [];
  }
  /** TradingView puts the third handle on the second edge, at the first edge's length. */
  handlePoints(proj) {
    const pts = super.handlePoints(proj);
    const e = this.tv ? this.edges(proj)[1] : void 0;
    if (e && pts.length === 3) pts[2] = [e[2], e[3]];
    return pts;
  }
  boundingLines(proj) {
    return this.tv ? [] : this.edges(proj);
  }
  /** p1→p2, and p1 toward p3 cut to |p2 − p1|. */
  edges(proj) {
    const p0 = this.px(proj, 0);
    const p1 = this.px(proj, 1);
    if (!p0 || !p1) return [];
    const out = [[p0[0], p0[1], p1[0], p1[1]]];
    const p2 = this.px(proj, 2);
    if (p2) {
      const R0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const len = Math.hypot(p2[0] - p0[0], p2[1] - p0[1]);
      if (len > 1e-6) {
        out.push([p0[0], p0[1], p0[0] + (p2[0] - p0[0]) / len * R0, p0[1] + (p2[1] - p0[1]) / len * R0]);
      }
    }
    return out;
  }
};

// src/core/drawings/types/FibSpiral.ts
var PHI = 1.6180339887;
var GROWTH = Math.log(PHI) / (Math.PI / 2);
var STEP = Math.PI / 64;
var MAX_S = Math.PI;
var MIN_R = 0.5;
var TV_FIB = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
function tvFib(t) {
  const lo = Math.floor(t);
  const hi = Math.ceil(t);
  if (hi >= TV_FIB.length) return null;
  return TV_FIB[lo] + (TV_FIB[hi] - TV_FIB[lo]) * Math.pow(t - lo, 1.15);
}
var FibSpiral = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "fibspiral";
    if (!init.props) {
      this.tv = true;
      this.counterclockwise = false;
    }
  }
  /** TradingView's ray: from p1 through p2 to the pane's edge (TradingView-look drawings). */
  rayPoints(proj) {
    if (!this.tv) return null;
    const h = this.handlePoints(proj);
    if (h.length < 2 || Math.hypot(h[1][0] - h[0][0], h[1][1] - h[0][1]) < 1) return null;
    return extendRay(h[0][0], h[0][1], h[1][0], h[1][1], "right", proj.width, proj.height);
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "center", free: "both" }, { role: "edge", free: "both" }] };
  }
  /** The spiral sampled to pixel points (eye → through the edge anchor → a little beyond). */
  spiralPoints(proj) {
    const c = this.anchors[0];
    const e = this.anchors[1];
    if (!c || !e) return null;
    const cy = proj.yOf(c.price, this.paneId);
    const ey = proj.yOf(e.price, this.paneId);
    if (cy == null || ey == null) return null;
    const cx = proj.xOf(c.time);
    const ex = proj.xOf(e.time);
    const R0 = Math.hypot(ex - cx, ey - cy);
    if (R0 < 1) return null;
    const theta0 = Math.atan2(ey - cy, ex - cx);
    if (this.tv) {
      const dir = this.counterclockwise ? -1 : 1;
      const unit = R0 / 5;
      const out = [[cx, cy]];
      for (let k = 0; k < 50 * (TV_FIB.length - 1); k += 1) {
        const r = tvFib(k / 50);
        if (r == null) break;
        const ang = theta0 + dir * k * Math.PI / 100;
        out.push([cx + Math.cos(ang) * r * unit, cy + Math.sin(ang) * r * unit]);
      }
      return out;
    }
    const sMin = Math.max(Math.log(MIN_R / R0) / GROWTH, -8 * Math.PI * 2);
    const pts = [];
    for (let s = sMin; s <= MAX_S; s += STEP) {
      const r = R0 * Math.exp(GROWTH * s);
      const ang = theta0 + s;
      pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
    }
    return pts;
  }
  hitTest(px, py, proj, tol) {
    const pts = this.spiralPoints(proj);
    if (pts != null && pts.length >= 2 && distToPolyline(px, py, pts) <= tol) return true;
    const ray = this.rayPoints(proj);
    return ray != null && distToSegment(px, py, ray[0], ray[1], ray[2], ray[3]) <= tol;
  }
  handlePoints(proj) {
    const c = this.anchors[0];
    const e = this.anchors[1];
    if (!c || !e) return [];
    const cy = proj.yOf(c.price, this.paneId);
    const ey = proj.yOf(e.price, this.paneId);
    if (cy == null || ey == null) return [];
    return [[proj.xOf(c.time), cy], [proj.xOf(e.time), ey]];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const pts = this.handlePoints(proj);
    if (pts.length < 2) return null;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  priceRange() {
    const c = this.anchors[0];
    const e = this.anchors[1];
    if (!c || !e) return null;
    return { min: Math.min(c.price, e.price), max: Math.max(c.price, e.price) };
  }
  schema() {
    if (this.tv) return { fields: [...LINE_FIELDS, { path: "counterclockwise", label: "Counterclockwise", kind: "boolean", group: "behavior" }] };
    return { fields: [...LINE_FIELDS, ...TEXT_FIELDS] };
  }
  writeProps() {
    return this.tv ? { tv: true, counterclockwise: this.counterclockwise === true } : void 0;
  }
  readProps(props) {
    if (typeof props.tv === "boolean") this.tv = props.tv || void 0;
    if (typeof props.counterclockwise === "boolean") this.counterclockwise = props.counterclockwise;
  }
};

// src/core/drawings/types/GannFan.ts
var GANN_FAN_LEVELS = fibLevels([
  { ratio: 0.125, color: LEVEL_RED, label: "1/8" },
  { ratio: 0.25, color: LEVEL_ORANGE, label: "1/4" },
  { ratio: 0.333, color: LEVEL_CYAN, label: "1/3" },
  { ratio: 0.5, color: LEVEL_GREEN, label: "1/2" },
  { ratio: 1, color: LEVEL_UNITY, label: "1/1" },
  { ratio: 2, color: LEVEL_TEAL, label: "2/1" },
  { ratio: 3, color: LEVEL_BLUE, label: "3/1" },
  { ratio: 4, color: LEVEL_AQUA, label: "4/1" },
  { ratio: 8, color: LEVEL_PINK, label: "8/1" }
]);
var TV_GANN_FAN_LEVELS = [
  [1, 8, "#FF9800"],
  // palette-exempt: TradingView's tan-orange-500
  [1, 4, "#089981"],
  // palette-exempt: TradingView's minty-green-500
  [1, 3, "#4CAF50"],
  // palette-exempt: TradingView's iguana-green-500
  [1, 2, "#089981"],
  // palette-exempt: TradingView's minty-green-500
  [1, 1, "#00BCD4"],
  // palette-exempt: TradingView's sky-blue-500
  [2, 1, "#2962FF"],
  // palette-exempt: TradingView's tv-blue-500
  [3, 1, "#9C27B0"],
  // palette-exempt: TradingView's grapes-purple-500
  [4, 1, "#E91E63"],
  // palette-exempt: TradingView's berry-pink-500
  [8, 1, "#F23645"]
  // palette-exempt: TradingView's ripe-red-500
].map(([c1, c2, color]) => ({ ratio: c1 / c2, label: `${c1}/${c2}`, color, enabled: true, lineWidth: 2, lineStyle: "solid" }));
var FAR3 = 1e5;
var GannFan = class extends FibRatios {
  constructor(init) {
    super(init);
    this.type = "gannfan";
    if (this.background === void 0) this.background = true;
    if (this.fillOpacity === void 0) this.fillOpacity = 0.2;
    if (this.showLabels === void 0) this.showLabels = true;
    if (!init.props) {
      this.tv = true;
      this.levels = TV_GANN_FAN_LEVELS.map((l) => ({ ...l }));
      this.style = { ...this.style, lineWidth: 2, lineStyle: "solid" };
      this.background = true;
      this.fillOpacity = 0.2;
      this.showLabels = true;
    }
  }
  /** The bar's colour and width set every level (TradingView's collected line colours and widths). */
  applySettings(patch) {
    super.applySettings(patch);
    if (!this.tv) return;
    const c = patch["style.lineColor"];
    if (typeof c === "string") for (const l of this.levels) l.color = c;
    const w = patch["style.lineWidth"];
    if (typeof w === "number") for (const l of this.levels) l.lineWidth = w;
  }
  /** TradingView's rays: each shown level's corner point and its far end, with the level's place in the list. */
  tvRays(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const y0 = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (y0 == null || yb == null) return null;
    const x0 = proj.xOf(a.time);
    const dx = proj.xOf(b.time) - x0;
    const dy = yb - y0;
    const rays = [];
    this.levels.forEach((lv, i) => {
      if (!lv.enabled || !(lv.ratio > 0)) return;
      const [px, py] = lv.ratio > 1 ? [x0 + dx, y0 + dy / lv.ratio] : [x0 + dx * lv.ratio, y0 + dy];
      const len = Math.hypot(px - x0, py - y0);
      const [fx, fy] = len < 1e-9 ? [px, py] : [x0 + (px - x0) / len * FAR3, y0 + (py - y0) / len * FAR3];
      rays.push({ lv, index: i + 1, px, py, fx, fy });
    });
    return { x0, y0, rays };
  }
  writeProps() {
    return { ...super.writeProps(), background: this.background, fillOpacity: this.fillOpacity, showLabels: this.showLabels, ...this.tv ? { tv: true } : {} };
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.background === "boolean") this.background = props.background;
    if (typeof props.fillOpacity === "number") this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
    if (typeof props.showLabels === "boolean") this.showLabels = props.showLabels;
    if (props.tv === true) this.tv = true;
  }
  /** The wedge between each pair of neighbouring enabled angles, in the steeper one's color. */
  fillPolygons(proj) {
    if (this.tv) {
      const t = this.background ? this.tvRays(proj) : null;
      if (!t) return [];
      const out2 = [];
      t.rays.forEach((r, e) => {
        const other = r.index < 4 ? t.rays[e + 1] : r.index > 4 ? t.rays[e - 1] : void 0;
        if (other) out2.push({ color: r.lv.color, pts: [[t.x0, t.y0], [r.fx, r.fy], [other.fx, other.fy]] });
      });
      return out2;
    }
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!this.background || !a || !b) return [];
    const x0 = proj.xOf(a.time);
    const y0 = proj.yOf(a.price, this.paneId);
    if (y0 == null) return [];
    const xb = proj.xOf(b.time);
    const far = (ratio) => {
      const ty = proj.yOf(a.price + (b.price - a.price) * ratio, this.paneId);
      if (ty == null) return null;
      const dx = xb - x0;
      const dy = ty - y0;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) return null;
      const k = 1e5 / len;
      return [x0 + dx * k, y0 + dy * k];
    };
    const on = this.levels.filter((l) => l.enabled).sort((p, q) => p.ratio - q.ratio);
    const out = [];
    for (let i = 1; i < on.length; i += 1) {
      const p = far(on[i - 1].ratio);
      const q = far(on[i].ratio);
      if (p && q) out.push({ color: on[i].color, pts: [[x0, y0], p, q] });
    }
    return out;
  }
  defaultLevels() {
    return GANN_FAN_LEVELS;
  }
  entryLines(proj) {
    if (this.tv) {
      const t = this.tvRays(proj);
      if (!t) return null;
      return t.rays.map((r) => ({
        color: r.lv.color,
        x1: t.x0,
        y1: t.y0,
        x2: r.fx,
        y2: r.fy,
        // TradingView: the label starts at the ray's corner point.
        numberText: this.showLabels === false ? "" : r.lv.label ?? String(r.lv.ratio),
        numberX: r.px,
        numberY: r.py,
        numberAlign: "left",
        labelX: r.px,
        labelY: r.py,
        ...r.lv.lineWidth ? { lineWidth: r.lv.lineWidth } : {},
        ...r.lv.lineStyle ? { lineStyle: r.lv.lineStyle } : {}
      }));
    }
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const x0 = proj.xOf(a.time);
    const y0 = proj.yOf(a.price, this.paneId);
    if (y0 == null) return null;
    const xb = proj.xOf(b.time);
    const dp = b.price - a.price;
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const ty = proj.yOf(a.price + dp * lv.ratio, this.paneId);
      if (ty == null) continue;
      const [x1, y1, x2, y2] = extendRay(x0, y0, xb, ty, "right", proj.width, proj.height);
      out.push({
        color: lv.color,
        x1,
        y1,
        x2,
        y2,
        numberText: this.showLabels === false ? "" : lv.label ?? String(lv.ratio),
        numberX: xb + 5,
        numberY: ty,
        numberAlign: "left",
        labelX: xb + 5,
        labelY: ty
      });
    }
    return out;
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
};

// src/core/drawings/types/GannBox.ts
var GANN_BOX_LEVELS = fibLevels([0, 0.25, 0.382, 0.5, 0.618, 0.75, 1].map((ratio) => ({ ratio, label: String(ratio) })));
var TV_GB_GRAY = "#808080";
var TV_GANN_BOX_LEVELS = [
  [0, TV_GB_GRAY],
  [0.25, "#FF9800"],
  // palette-exempt: TradingView's tan-orange-500
  [0.382, "#00BCD4"],
  // palette-exempt: TradingView's sky-blue-500
  [0.5, "#4CAF50"],
  // palette-exempt: TradingView's iguana-green-500
  [0.618, "#089981"],
  // palette-exempt: TradingView's minty-green-500
  [0.75, "#2962FF"],
  // palette-exempt: TradingView's tv-blue-500
  [1, TV_GB_GRAY]
].map(([ratio, color]) => ({ ratio, color, enabled: true }));
var TV_GANN_ANGLES = "#9C9C9C";
var GannBox = class extends FibRatios {
  constructor(init) {
    super(init);
    this.type = "gannbox";
    if (this.fillPrice === void 0) this.fillPrice = false;
    if (this.fillTime === void 0) this.fillTime = false;
    if (this.fillOpacity === void 0) this.fillOpacity = 0.2;
    if (this.labelsLeft === void 0) this.labelsLeft = true;
    if (this.labelsRight === void 0) this.labelsRight = false;
    if (this.labelsTop === void 0) this.labelsTop = false;
    if (this.labelsBottom === void 0) this.labelsBottom = false;
    if (!init.props) {
      this.tv = true;
      this.levels = TV_GANN_BOX_LEVELS.map((l) => ({ ...l }));
      this.timeLevels = TV_GANN_BOX_LEVELS.map((l) => ({ ...l }));
      this.style = { ...this.style, lineWidth: 2, lineStyle: "solid" };
      this.fillPrice = true;
      this.fillTime = true;
      this.fillOpacity = 0.2;
      this.fillTimeOpacity = 0.2;
      this.labelsLeft = this.labelsRight = this.labelsTop = this.labelsBottom = true;
      this.angles = false;
      this.anglesColor = TV_GANN_ANGLES;
      this.reverse = false;
    }
  }
  /** The bar's colour sets every price and time level and the Angles (TradingView's collected line colours). */
  applySettings(patch) {
    super.applySettings(patch);
    const c = patch["style.lineColor"];
    if (this.tv && typeof c === "string") {
      for (const l of this.levels) l.color = c;
      for (const l of this.timeLevels ?? []) l.color = c;
      this.anglesColor = c;
    }
  }
  writeProps() {
    return {
      ...super.writeProps(),
      ...this.tv ? {
        tv: true,
        timeLevels: (this.timeLevels ?? []).map((l) => ({ ...l })),
        fillTimeOpacity: this.fillTimeOpacity,
        angles: this.angles === true,
        anglesColor: this.anglesColor,
        reverse: this.reverse === true
      } : {},
      fillPrice: this.fillPrice,
      fillTime: this.fillTime,
      fillOpacity: this.fillOpacity,
      labelsLeft: this.labelsLeft,
      labelsRight: this.labelsRight,
      labelsTop: this.labelsTop,
      labelsBottom: this.labelsBottom
    };
  }
  readProps(props) {
    super.readProps(props);
    for (const k of ["fillPrice", "fillTime", "labelsLeft", "labelsRight", "labelsTop", "labelsBottom"]) {
      if (typeof props[k] === "boolean") this[k] = props[k];
    }
    if (typeof props.fillOpacity === "number") this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
    if (props.tv === true) this.tv = true;
    if (Array.isArray(props.timeLevels)) {
      const parsed = props.timeLevels.filter((v) => !!v && typeof v.ratio === "number" && typeof v.color === "string").map((v) => ({ ratio: v.ratio, color: v.color, enabled: v.enabled !== false }));
      if (parsed.length) this.timeLevels = parsed;
    }
    if (typeof props.fillTimeOpacity === "number") this.fillTimeOpacity = Math.min(1, Math.max(0, props.fillTimeOpacity));
    if (typeof props.angles === "boolean") this.angles = props.angles;
    if (typeof props.anglesColor === "string") this.anglesColor = props.anglesColor;
    if (typeof props.reverse === "boolean") this.reverse = props.reverse;
  }
  /** TradingView's frame: where the levels count from and how far, in price and time (Reverse: from the second point). */
  tvFrame(proj) {
    const g = this.corners(proj);
    if (!g) return null;
    const [from, to] = this.reverse ? [g.c2, g.c1] : [g.c1, g.c2];
    return {
      ...g,
      yAt: (r) => proj.yOf(from.price + r * (to.price - from.price), this.paneId),
      xAt: (r) => proj.xOf(timeBetween(proj, from.time, to.time, r))
    };
  }
  /** TradingView's price lines (left / right labels) and time lines (top / bottom labels), then the Angles. */
  tvLines(proj) {
    const f = this.tvFrame(proj);
    if (!f) return null;
    const out = [];
    const none = { numberText: "", numberX: 0, numberY: 0, numberAlign: "left", labelX: 0, labelY: 0 };
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const y = f.yAt(lv.ratio);
      if (y == null) continue;
      const text = String(lv.ratio);
      out.push({ color: lv.color, x1: f.left, y1: y, x2: f.right, y2: y, ...none, numberText: this.labelsLeft ? text : "", numberX: f.left - 5, numberY: y, numberAlign: "right" });
      if (this.labelsRight) out.push({ color: lv.color, x1: f.right, y1: y, x2: f.right, y2: y, ...none, numberText: text, numberX: f.right + 5, numberY: y });
    }
    for (const lv of this.timeLevels ?? []) {
      if (!lv.enabled) continue;
      const x = f.xAt(lv.ratio);
      const text = String(lv.ratio);
      out.push({ color: lv.color, x1: x, y1: f.top, x2: x, y2: f.bot, ...none, numberText: this.labelsTop ? text : "", numberX: x, numberY: f.top - 9, numberAlign: "center" });
      if (this.labelsBottom) out.push({ color: lv.color, x1: x, y1: f.bot, x2: x, y2: f.bot, ...none, numberText: text, numberX: x, numberY: f.bot + 11, numberAlign: "center" });
    }
    if (this.angles) {
      const color = this.anglesColor || TV_GANN_ANGLES;
      const line = (x1, y1, x2, y2) => {
        out.push({ color, x1, y1, x2, y2, ...none });
      };
      for (const lv of this.levels) {
        const x = f.xAt(lv.ratio);
        line(f.left, f.bot, x, f.top);
        line(f.right, f.bot, x, f.top);
        line(f.left, f.top, x, f.bot);
        line(f.right, f.top, x, f.bot);
      }
      for (const lv of this.timeLevels ?? []) {
        const y = f.yAt(lv.ratio);
        if (y == null) continue;
        line(f.left, f.bot, f.right, y);
        line(f.right, f.bot, f.left, y);
        line(f.left, f.top, f.right, y);
        line(f.right, f.top, f.left, y);
      }
    }
    return out;
  }
  /** The two corners, then TradingView's other two (the first point's time with the second's price, and back). */
  handlePoints(proj) {
    const pts = super.handlePoints(proj);
    if (!this.tv || pts.length < 2) return pts;
    return [pts[0], pts[1], [pts[0][0], pts[1][1]], [pts[1][0], pts[0][1]]];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  /** TradingView: the extra corners each take one point's time and the other's price. */
  dragHandlePx(index, x, y, proj) {
    if (!this.tv || index < 2) return false;
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return false;
    const pt = proj.pxToPoint(x, y, this.paneId);
    if (!Number.isFinite(pt.price) || !Number.isFinite(pt.time)) return true;
    this.anchors = index === 2 ? [{ ...a, time: pt.time }, { ...b, price: pt.price }] : [{ ...a, price: pt.price }, { ...b, time: pt.time }];
    return true;
  }
  /** Rows between neighbouring price levels and columns between neighbouring time levels, in the farther level's color. */
  fillBands(proj) {
    if (this.tv) {
      const f = this.tvFrame(proj);
      if (!f) return [];
      const out2 = [];
      if (this.fillPrice) {
        const ys = this.levels.filter((l) => l.enabled).map((l) => ({ c: l.color, y: f.yAt(l.ratio) })).filter((v) => v.y != null);
        for (let i = 1; i < ys.length; i += 1) out2.push({ color: ys[i].c, x: f.left, y: Math.min(ys[i - 1].y, ys[i].y), w: f.right - f.left, h: Math.abs(ys[i].y - ys[i - 1].y), alpha: this.fillOpacity });
      }
      if (this.fillTime) {
        const xs = (this.timeLevels ?? []).filter((l) => l.enabled).map((l) => ({ c: l.color, x: f.xAt(l.ratio) }));
        for (let i = 1; i < xs.length; i += 1) out2.push({ color: xs[i].c, x: Math.min(xs[i - 1].x, xs[i].x), y: f.top, w: Math.abs(xs[i].x - xs[i - 1].x), h: f.bot - f.top, alpha: this.fillTimeOpacity ?? this.fillOpacity });
      }
      return out2;
    }
    const g = this.corners(proj);
    if (!g || !this.fillPrice && !this.fillTime) return [];
    const on = this.levels.filter((l) => l.enabled).sort((p, q) => p.ratio - q.ratio);
    const out = [];
    for (let i = 1; i < on.length; i += 1) {
      const lo = on[i - 1];
      const hi = on[i];
      if (this.fillPrice) {
        const y1 = proj.yOf(g.c1.price + lo.ratio * (g.c2.price - g.c1.price), this.paneId);
        const y2 = proj.yOf(g.c1.price + hi.ratio * (g.c2.price - g.c1.price), this.paneId);
        if (y1 != null && y2 != null) out.push({ color: hi.color, x: g.left, y: Math.min(y1, y2), w: g.right - g.left, h: Math.abs(y2 - y1) });
      }
      if (this.fillTime) {
        const x1 = proj.xOf(timeBetween(proj, g.c1.time, g.c2.time, lo.ratio));
        const x2 = proj.xOf(timeBetween(proj, g.c1.time, g.c2.time, hi.ratio));
        out.push({ color: hi.color, x: Math.min(x1, x2), y: g.top, w: Math.abs(x2 - x1), h: g.bot - g.top });
      }
    }
    return out;
  }
  defaultLevels() {
    return GANN_BOX_LEVELS;
  }
  // Placed click-move-click (the inherited 'click' mode): first click sets a corner, the second
  // sets the opposite one — matching the plain Rectangle tool.
  corners(proj) {
    const c1 = this.anchors[0];
    const c2 = this.anchors[1];
    if (!c1 || !c2) return null;
    const xa = proj.xOf(c1.time);
    const xb = proj.xOf(c2.time);
    const ya = proj.yOf(c1.price, this.paneId);
    const yb = proj.yOf(c2.price, this.paneId);
    if (ya == null || yb == null) return null;
    return { c1, c2, left: Math.min(xa, xb), right: Math.max(xa, xb), top: Math.min(ya, yb), bot: Math.max(ya, yb) };
  }
  entryLines(proj) {
    if (this.tv) return this.tvLines(proj);
    const g = this.corners(proj);
    if (!g) return null;
    const { c1, c2, left, right, top, bot } = g;
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const text = lv.label ?? String(lv.ratio);
      const py = proj.yOf(c1.price + lv.ratio * (c2.price - c1.price), this.paneId);
      if (py != null) {
        out.push({ color: lv.color, x1: left, y1: py, x2: right, y2: py, numberText: this.labelsLeft ? text : "", numberX: left - 5, numberY: py, numberAlign: "right", labelX: left, labelY: py });
        if (this.labelsRight) out.push({ color: lv.color, x1: right, y1: py, x2: right, y2: py, numberText: text, numberX: right + 5, numberY: py, numberAlign: "left", labelX: right, labelY: py });
      }
      const vx = proj.xOf(timeBetween(proj, c1.time, c2.time, lv.ratio));
      out.push({ color: lv.color, x1: vx, y1: top, x2: vx, y2: bot, numberText: this.labelsTop ? text : "", numberX: vx, numberY: top - 8, numberAlign: "center", labelX: vx, labelY: top });
      if (this.labelsBottom) out.push({ color: lv.color, x1: vx, y1: bot, x2: vx, y2: bot, numberText: text, numberX: vx, numberY: bot + 8, numberAlign: "center", labelX: vx, labelY: bot });
    }
    const diag = this.levels.find((l) => l.ratio === 1)?.color ?? LEVEL_ANCHOR;
    out.push({ color: diag, x1: left, y1: top, x2: right, y2: bot, numberText: "", numberX: 0, numberY: 0, numberAlign: "left", labelX: 0, labelY: 0 });
    out.push({ color: diag, x1: left, y1: bot, x2: right, y2: top, numberText: "", numberX: 0, numberY: 0, numberAlign: "left", labelX: 0, labelY: 0 });
    return out;
  }
  hitTest(px, py, proj, tol) {
    const g = this.corners(proj);
    return g != null && pointInBox(px, py, g.left, g.top, g.right, g.bot, tol);
  }
  priceRange() {
    const c1 = this.anchors[0];
    const c2 = this.anchors[1];
    if (!c1 || !c2) return null;
    return { min: Math.min(c1.price, c2.price), max: Math.max(c1.price, c2.price) };
  }
};

// src/core/drawings/types/GannSquare.ts
var GRID_LEVELS = fibLevels([0, 0.25, 0.382, 0.5, 0.618, 0.75, 1].map((ratio) => ({ ratio, label: String(ratio) })));
var FAN = [
  { label: "3x1", x: 3, y: 1, color: LEVEL_RED },
  { label: "2x1", x: 2, y: 1, color: LEVEL_ORANGE },
  { label: "1x1", x: 1, y: 1, color: LEVEL_UNITY },
  { label: "1x2", x: 1, y: 2, color: LEVEL_TEAL },
  { label: "1x3", x: 1, y: 3, color: LEVEL_BLUE }
];
var GANN_SQUARE_ARCS = [
  { k: 0.25, color: LEVEL_RED },
  { k: 0.5, color: LEVEL_ORANGE },
  { k: 0.75, color: LEVEL_GREEN },
  { k: 1, color: LEVEL_TEAL }
];
var TV_GS_GRAY = "#808080";
var TV_GS_ORANGE = "#FF9800";
var TV_GS_SKY = "#00BCD4";
var TV_GS_IGUANA = "#4CAF50";
var TV_GS_MINTY = "#089981";
var TV_GS_BLUE = "#2962FF";
var TV_GS_RED = "#F23645";
var TV_GS_DEEP200 = "#B39DDB";
var TV_GS_DEEP300 = "#9575CD";
var TV_GANN_SQUARE_LEVELS = [TV_GS_GRAY, TV_GS_ORANGE, TV_GS_SKY, TV_GS_IGUANA, TV_GS_MINTY, TV_GS_GRAY].map((color, i) => ({ ratio: i / 5, color, enabled: true, lineWidth: 2 }));
var TV_GANN_SQUARE_FANS = [
  [8, 1, TV_GS_DEEP200, false],
  [5, 1, TV_GS_RED, false],
  [4, 1, TV_GS_GRAY, false],
  [3, 1, TV_GS_ORANGE, false],
  [2, 1, TV_GS_SKY, true],
  [1, 1, TV_GS_IGUANA, true],
  [1, 2, TV_GS_MINTY, true],
  [1, 3, TV_GS_MINTY, false],
  [1, 4, TV_GS_BLUE, false],
  [1, 5, TV_GS_DEEP300, false],
  [1, 8, TV_GS_DEEP200, false]
].map(([x, y, color, enabled]) => ({ x, y, color, enabled, lineWidth: 2 }));
var TV_GANN_SQUARE_ARCS = [
  [1, 0, TV_GS_ORANGE],
  [1, 1, TV_GS_ORANGE],
  [1.5, 0, TV_GS_ORANGE],
  [2, 0, TV_GS_SKY],
  [2, 1, TV_GS_SKY],
  [3, 0, TV_GS_IGUANA],
  [3, 1, TV_GS_IGUANA],
  [4, 0, TV_GS_MINTY],
  [4, 1, TV_GS_MINTY],
  [5, 0, TV_GS_BLUE],
  [5, 1, TV_GS_BLUE]
].map(([x, y, color]) => ({ x, y, color, enabled: true, lineWidth: 2 }));
function readRatioLines(v) {
  if (!Array.isArray(v)) return null;
  const out = v.filter((e) => !!e && typeof e === "object" && typeof e.x === "number" && typeof e.y === "number" && typeof e.color === "string").map((e) => ({ x: e.x, y: e.y, color: e.color, enabled: e.enabled !== false, lineWidth: typeof e.lineWidth === "number" && Number.isFinite(e.lineWidth) ? Math.min(10, Math.max(1, e.lineWidth)) : 2 }));
  return out.length ? out : null;
}
var GannSquare = class extends FibRatios {
  constructor(init) {
    super(init);
    // The fixed square (GannSquareFixed) is this drawing on a box of its own.
    this.type = "gannsquare";
    if (this.background === void 0) this.background = true;
    if (this.fillOpacity === void 0) this.fillOpacity = 0.2;
    if (this.showLabels === void 0) this.showLabels = true;
    if (!init.props) {
      this.tv = true;
      this.levels = TV_GANN_SQUARE_LEVELS.map((l) => ({ ...l }));
      this.fanLines = TV_GANN_SQUARE_FANS.map((l) => ({ ...l }));
      this.arcs = TV_GANN_SQUARE_ARCS.map((l) => ({ ...l }));
      this.style = { ...this.style, lineWidth: 2, lineStyle: "solid" };
      this.background = true;
      this.fillOpacity = 0.2;
      this.showLabels = true;
      this.reverse = false;
      this.fontSize = 12;
      this.labelBold = false;
      this.labelItalic = false;
    }
  }
  /** The chart's price per bar that shows the box square, and one bar's length (from the live projector). */
  chartRatio(proj, at) {
    const span = 30 * 24 * 36e5;
    const bars = proj.barsBetween?.(at.time, at.time + span) ?? 0;
    const y0 = proj.yOf(at.price, this.paneId);
    const y1 = proj.yOf(at.price + 1, this.paneId);
    if (!(bars > 0) || y0 == null || y1 == null || y0 === y1) return null;
    const pxPerBar = Math.abs(proj.xOf(at.time + span) - proj.xOf(at.time)) / bars;
    return { ratio: pxPerBar / Math.abs(y1 - y0), msPerBar: span / bars };
  }
  /** The points as TradingView draws them: the moving one (the second, or the first with Reverse) put at the other's
   *  price ± its bar distance × the ratio. */
  squared(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    if (!this.tv) return [a, b];
    const live = proj && (this.scaleRatio === void 0 || this.msPerBar === void 0) ? this.chartRatio(proj, a) : null;
    const ratio = this.scaleRatio ?? live?.ratio;
    const msPerBar = this.msPerBar ?? live?.msPerBar;
    if (ratio === void 0 || !msPerBar) return [a, b];
    const [fixed, moving] = this.reverse ? [b, a] : [a, b];
    const bars = Math.round(Math.abs(moving.time - fixed.time) / msPerBar);
    const dir = Math.sign(moving.price - fixed.price) || 1;
    const moved = { ...moving, price: fixed.price + dir * bars * ratio };
    return this.reverse ? [moved, b] : [a, moved];
  }
  /** Placed: fix the chart's price/bar ratio (TradingView takes it from the chart) and square the second point. */
  onPlaced(proj) {
    if (!this.tv) return;
    const a = this.anchors[0];
    if (!a) return;
    const live = this.chartRatio(proj, a);
    if (!live) return;
    if (this.scaleRatio === void 0) this.scaleRatio = live.ratio;
    this.msPerBar = live.msPerBar;
    const sq = this.squared(null);
    if (sq) this.anchors = [sq[0], sq[1]];
  }
  /** A handle drag keeps the square (TradingView corrects the moved point's price). */
  constrainHandleDrag() {
    const sq = this.tv ? this.squared(null) : null;
    if (sq) this.anchors = [sq[0], sq[1]];
  }
  /** A new price/bar ratio from the dialog re-squares the box; the bar's colour and width set every line. */
  applySettings(patch) {
    super.applySettings(patch);
    if (!this.tv) return;
    const c = patch["style.lineColor"];
    if (typeof c === "string") for (const l of [...this.levels, ...this.fanLines ?? [], ...this.arcs ?? []]) l.color = c;
    const w = patch["style.lineWidth"];
    if (typeof w === "number") for (const l of [...this.levels, ...this.fanLines ?? [], ...this.arcs ?? []]) l.lineWidth = w;
    if ("scaleRatio" in patch || "reverse" in patch) this.constrainHandleDrag();
  }
  /** TradingView's frame in pixels (null until both points are set). */
  tvFrame(proj) {
    const sq = this.squared(proj);
    if (!sq) return null;
    const [p, q] = this.reverse ? [sq[1], sq[0]] : sq;
    const py = proj.yOf(p.price, this.paneId);
    const qy = proj.yOf(q.price, this.paneId);
    if (py == null || qy == null) return null;
    const px = proj.xOf(p.time);
    const qx = proj.xOf(q.time);
    return { sx: px, sy: py, rx: qx - px, ry: qy - py, left: Math.min(px, qx), top: Math.min(py, qy), right: Math.max(px, qx), bot: Math.max(py, qy) };
  }
  /** The shown arcs as fractions of the box (√(x² + y²) / 5), each with the previous shown one's (0 for the first). */
  tvArcs() {
    const out = [];
    let prev = 0;
    for (const a of this.arcs ?? []) {
      if (!a.enabled) continue;
      const k = Math.hypot(a.x, a.y) / 5;
      out.push({ k, prevK: prev, color: a.color, lineWidth: a.lineWidth });
      prev = k;
    }
    return out;
  }
  /** TradingView's grid, fan lines and the three corner labels. */
  tvLines(proj) {
    const f = this.tvFrame(proj);
    if (!f) return null;
    const none = { numberText: "", numberX: 0, numberY: 0, numberAlign: "left", labelX: 0, labelY: 0 };
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const x = f.sx + lv.ratio * f.rx;
      const y = f.sy + lv.ratio * f.ry;
      out.push({ color: lv.color, x1: x, y1: f.sy, x2: x, y2: f.sy + f.ry, ...none, lineWidth: lv.lineWidth });
      out.push({ color: lv.color, x1: f.sx, y1: y, x2: f.sx + f.rx, y2: y, ...none, lineWidth: lv.lineWidth });
    }
    for (const fan of this.fanLines ?? []) {
      if (!fan.enabled) continue;
      const [ex, ey] = fan.x > fan.y ? [f.sx + f.rx, f.sy + fan.y / fan.x * f.ry] : [f.sx + fan.x / fan.y * f.rx, f.sy + f.ry];
      out.push({ color: fan.color, x1: f.sx, y1: f.sy, x2: ex, y2: ey, ...none, lineWidth: fan.lineWidth });
    }
    if (this.showLabels !== false) out.push(...this.cornerLabels(proj, f));
    return out;
  }
  /** TradingView's labels: the price range beside the first point's time at the second's price, the bar range at the
   *  second's time and the first's price, the price/bar ratio at the second point; in the last level's colour. */
  cornerLabels(proj, f) {
    const sq = this.squared(proj);
    if (!sq) return [];
    const [a, b] = sq;
    const priceDiff = (b.price - a.price) * (this.reverse ? -1 : 1);
    const barSpan = proj.barsBetween ? Math.round(proj.barsBetween(a.time, b.time)) : this.msPerBar ? Math.round(Math.abs(b.time - a.time) / this.msPerBar) : 0;
    const barDiff = Math.sign(b.time - a.time) * barSpan * (this.reverse ? -1 : 1);
    const color = this.levels[this.levels.length - 1]?.color ?? TV_GS_GRAY;
    const half = (this.fontSize ?? 12) / 2;
    const up = priceDiff > 0;
    const right = barDiff > 0;
    const p1 = { x: f.sx, y: f.sy };
    const p2 = { x: f.sx + f.rx, y: f.sy + f.ry };
    const at = (x, y, text, alignLeftOfPoint, above, offAbove, offBelow) => ({
      color,
      x1: x,
      y1: y,
      x2: x,
      y2: y,
      numberText: text,
      numberX: alignLeftOfPoint ? x - 10 : x + 10,
      numberY: above ? y - offAbove - half : y + offBelow + half,
      numberAlign: alignLeftOfPoint ? "right" : "left",
      labelX: x,
      labelY: y
    });
    const fmt = (n) => n.toLocaleString("en-US", { maximumFractionDigits: Math.abs(n) >= 100 ? 2 : 6 });
    const ratio = barDiff !== 0 ? Math.abs(priceDiff / barDiff) : null;
    const out = [at(p1.x, p2.y, fmt(priceDiff), right, up, 8, 10), at(p2.x, p1.y, String(barDiff), !right, !up, 8, 10)];
    if (ratio !== null) out.push(at(p2.x, p2.y, String(Number(ratio.toPrecision(7))), !right, up, 8, 10));
    return out;
  }
  writeProps() {
    return {
      ...super.writeProps(),
      background: this.background,
      fillOpacity: this.fillOpacity,
      showLabels: this.showLabels,
      ...this.tv ? {
        tv: true,
        fanLines: (this.fanLines ?? []).map((l) => ({ ...l })),
        arcs: (this.arcs ?? []).map((l) => ({ ...l })),
        reverse: this.reverse === true,
        ...this.scaleRatio !== void 0 ? { scaleRatio: this.scaleRatio } : {},
        ...this.msPerBar !== void 0 ? { msPerBar: this.msPerBar } : {},
        fontSize: this.fontSize,
        labelBold: this.labelBold === true,
        labelItalic: this.labelItalic === true
      } : {}
    };
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.background === "boolean") this.background = props.background;
    if (typeof props.fillOpacity === "number") this.fillOpacity = Math.min(1, Math.max(0, props.fillOpacity));
    if (typeof props.showLabels === "boolean") this.showLabels = props.showLabels;
    if (props.tv === true) this.tv = true;
    const fans = readRatioLines(props.fanLines);
    if (fans) this.fanLines = fans;
    const arcs = readRatioLines(props.arcs);
    if (arcs) this.arcs = arcs;
    for (const k of ["reverse", "labelBold", "labelItalic"]) if (typeof props[k] === "boolean") this[k] = props[k];
    if (typeof props.scaleRatio === "number" && Number.isFinite(props.scaleRatio) && props.scaleRatio > 0) this.scaleRatio = props.scaleRatio;
    if (typeof props.msPerBar === "number" && Number.isFinite(props.msPerBar) && props.msPerBar > 0) this.msPerBar = props.msPerBar;
    if (typeof props.fontSize === "number" && Number.isFinite(props.fontSize)) this.fontSize = Math.min(48, Math.max(6, props.fontSize));
  }
  /** The ring between each arc and the one inside it (the innermost reaches the origin), in the outer arc's color. */
  fillPolygons(proj) {
    if (this.tv) return [];
    const g = this.background ? this.arcGeom(proj) : null;
    if (!g || Math.abs(g.bx) < 1 || Math.abs(g.py) < 1) return [];
    const N = 24;
    const quarter = (k) => Array.from({ length: N + 1 }, (_, i) => {
      const t = i / N * (Math.PI / 2);
      return [g.ox + k * g.bx * Math.cos(t), g.oy + k * g.py * Math.sin(t)];
    });
    const out = [];
    let inner = [[g.ox, g.oy]];
    for (const arc of GANN_SQUARE_ARCS) {
      const outer = quarter(arc.k);
      out.push({ color: arc.color, pts: [...outer, ...[...inner].reverse()] });
      inner = outer;
    }
    return out;
  }
  defaultLevels() {
    return GRID_LEVELS;
  }
  // Placed click-move-click (the inherited 'click' mode): first click sets a corner, the second
  // sets the opposite one — matching the plain Rectangle tool.
  box(proj) {
    const c1 = this.anchors[0];
    const c2 = this.anchors[1];
    if (!c1 || !c2) return null;
    const oy = proj.yOf(c1.price, this.paneId);
    const ey = proj.yOf(c2.price, this.paneId);
    if (oy == null || ey == null) return null;
    const ox = proj.xOf(c1.time);
    const ex = proj.xOf(c2.time);
    return { ox, oy, bx: ex - ox, py: ey - oy, left: Math.min(ox, ex), top: Math.min(oy, ey), right: Math.max(ox, ex), bot: Math.max(oy, ey) };
  }
  /** The origin corner + box pixel deltas, consumed by the arc painter. */
  arcGeom(proj) {
    const b = this.box(proj);
    return b ? { ox: b.ox, oy: b.oy, bx: b.bx, py: b.py } : null;
  }
  entryLines(proj) {
    if (this.tv) return this.tvLines(proj);
    const b = this.box(proj);
    if (!b) return null;
    const c1 = this.anchors[0];
    const c2 = this.anchors[1];
    const out = [];
    for (const lv of this.levels) {
      if (!lv.enabled) continue;
      const hy = proj.yOf(c1.price + lv.ratio * (c2.price - c1.price), this.paneId);
      if (hy != null) {
        out.push({ color: lv.color, x1: b.left, y1: hy, x2: b.right, y2: hy, numberText: this.showLabels === false ? "" : lv.label ?? String(lv.ratio), numberX: b.left - 5, numberY: hy, numberAlign: "right", labelX: b.left, labelY: hy });
      }
      const vx = proj.xOf(timeBetween(proj, c1.time, c2.time, lv.ratio));
      out.push({ color: lv.color, x1: vx, y1: b.top, x2: vx, y2: b.bot, numberText: "", numberX: vx, numberY: b.top, numberAlign: "center", labelX: vx, labelY: b.top });
    }
    for (const f of FAN) {
      let u;
      let v;
      if (f.x > f.y) {
        u = b.ox + b.bx;
        v = b.oy + f.y / f.x * b.py;
      } else {
        v = b.oy + b.py;
        u = b.ox + f.x / f.y * b.bx;
      }
      out.push({ color: f.color, x1: b.ox, y1: b.oy, x2: u, y2: v, numberText: this.showLabels === false ? "" : f.label, numberX: u + 4, numberY: v, numberAlign: "left", labelX: u + 4, labelY: v });
    }
    return out;
  }
  /** TradingView: the handles sit on the squared points. */
  handlePoints(proj) {
    const sq = this.tv ? this.squared(proj) : null;
    if (!sq) return super.handlePoints(proj);
    const out = [];
    for (const p of sq) {
      const y = proj.yOf(p.price, this.paneId);
      if (y == null) return [];
      out.push([proj.xOf(p.time), y]);
    }
    return out;
  }
  hitTest(px, py, proj, tol) {
    if (this.tv) {
      const f = this.tvFrame(proj);
      return f != null && pointInBox(px, py, f.left, f.top, f.right, f.bot, tol);
    }
    const b = this.box(proj);
    return b != null && pointInBox(px, py, b.left, b.top, b.right, b.bot, tol);
  }
  priceRange() {
    const c1 = this.anchors[0];
    const c2 = this.anchors[1];
    if (!c1 || !c2) return null;
    return { min: Math.min(c1.price, c2.price), max: Math.max(c1.price, c2.price) };
  }
};

// src/core/drawings/types/GannSquareFixed.ts
var GannSquareFixed = class extends GannSquare {
  constructor(init) {
    super(init);
    this.type = "gannsquarefixed";
    if (!init.props) this.showLabels = false;
  }
  /** The first point, then the second as placed (TradingView's two handles). */
  handlePoints(proj) {
    const out = [];
    for (const a of this.anchors.slice(0, 2)) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      out.push([proj.xOf(a.time), y]);
    }
    return out;
  }
  tvFrame(proj) {
    const h = this.handlePoints(proj);
    if (h.length < 2) return null;
    const [[x0, y0], [x1, y1]] = h;
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1e-9) return null;
    const rx = 5 * len * (x1 - x0 < 0 ? -1 : 1);
    const ry = 5 * len * (y1 - y0 < 0 ? -1 : 1);
    return { sx: x0, sy: y0, rx, ry, left: Math.min(x0, x0 + rx), top: Math.min(y0, y0 + ry), right: Math.max(x0, x0 + rx), bot: Math.max(y0, y0 + ry) };
  }
  /** No price/bar ratio to fix or keep. */
  onPlaced(_proj) {
  }
  constrainHandleDrag() {
  }
  /** TradingView: Reverse swaps the two points. */
  applySettings(patch) {
    const flip = typeof patch.reverse === "boolean" && patch.reverse !== (this.reverse === true);
    super.applySettings(patch);
    if (flip && this.anchors.length >= 2) this.anchors = [this.anchors[1], this.anchors[0]];
  }
};

// src/core/drawings/types/DedekindTessellation.ts
var DEDEKIND_CURVATURE_OPTIONS = [4, 8, 12, 16, 24, 32, 48, 64];
var DEFAULT_MAX_CURVATURE = 24;
var MIN_ARC_PX = 0.75;
function isDedekindCenter(k, n) {
  if (!Number.isInteger(k) || !Number.isInteger(n) || n <= 0) return false;
  const k2m1 = k * k - 1;
  if (n % 2 === 1) return k2m1 % n === 0;
  if (n % 8 === 0) {
    if (k2m1 % n !== 0) return false;
    return k2m1 / n % 2 !== 0;
  }
  return false;
}
function dedekindCentersInUnit(n) {
  const out = [];
  for (let k = 0; k < n; k += 1) {
    if (isDedekindCenter(k, n)) out.push(k);
  }
  return out;
}
var DedekindTessellation = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "dedekind";
    if (this.maxCurvature === void 0) this.maxCurvature = DEFAULT_MAX_CURVATURE;
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "c1", free: "both" }, { role: "c2", free: "both" }] };
  }
  /** Pixel box + isotropic hyperbolic scale (null until both corners resolve). */
  box(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (ya == null || yb == null) return null;
    const left = Math.min(proj.xOf(a.time), proj.xOf(b.time));
    const right = Math.max(proj.xOf(a.time), proj.xOf(b.time));
    const top = Math.min(ya, yb);
    const bot = Math.max(ya, yb);
    const w = right - left;
    const h = bot - top;
    if (w < 1 || h < 1) return null;
    const unitPx = h;
    const realSpan = w / unitPx;
    return { left, right, top, bot, unitPx, x0: 0, realSpan };
  }
  /**
   * Semicircles + vertical geodesics in media pixels, already culled to the box.
   * Verticals are at every half-integer (Kocik case B); arcs use curvatures 1…maxCurvature.
   */
  geodesics(proj) {
    const box = this.box(proj);
    if (!box) return null;
    const { left, top, bot, unitPx, x0, realSpan } = box;
    const maxN = Math.max(1, Math.min(64, Math.round(this.maxCurvature)));
    const xMin = x0 - 1 / maxN;
    const xMax = x0 + realSpan + 1 / maxN;
    const right = left + realSpan * unitPx;
    const out = [];
    const k0 = Math.floor(xMin * 2);
    const k1 = Math.ceil(xMax * 2);
    for (let k = k0; k <= k1; k += 1) {
      if (k % 2 === 0) continue;
      const x = left + (k / 2 - x0) * unitPx;
      if (x < left - 0.5 || x > right + 0.5) continue;
      out.push({ kind: "vline", x, y0: bot, y1: top });
    }
    for (let n = 1; n <= maxN; n += 1) {
      const r = 1 / n;
      const rPx = r * unitPx;
      if (rPx < MIN_ARC_PX) continue;
      const ks = dedekindCentersInUnit(n);
      if (ks.length === 0) continue;
      const tLo = Math.floor(xMin) - 1;
      const tHi = Math.ceil(xMax) + 1;
      for (let t = tLo; t <= tHi; t += 1) {
        for (const k of ks) {
          const c = k / n + t;
          if (c + r < xMin || c - r > xMax) continue;
          const cx = left + (c - x0) * unitPx;
          if (cx + rPx < left - 1 || cx - rPx > right + 1) continue;
          out.push({ kind: "arc", cx, cy: bot, r: rPx });
        }
      }
    }
    return out;
  }
  hitTest(px, py, proj, tol) {
    const b = this.box(proj);
    return b != null && pointInBox(px, py, b.left, b.top, b.right, b.bot, tol);
  }
  handlePoints(proj) {
    const b = this.box(proj);
    return b ? [[b.left, b.top], [b.right, b.bot]] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const b = this.box(proj);
    if (!b) return null;
    return { x: b.left, y: b.top, w: b.right - b.left, h: b.bot - b.top };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
  schema() {
    return {
      fields: [
        ...LINE_FIELDS,
        {
          path: "maxCurvature",
          label: "Max curvature",
          kind: "number",
          min: 4,
          max: 64,
          step: 4,
          group: "behavior"
        },
        ...TEXT_FIELDS
      ]
    };
  }
  writeProps() {
    return { maxCurvature: this.maxCurvature };
  }
  readProps(props) {
    if (typeof props.maxCurvature === "number" && Number.isFinite(props.maxCurvature)) {
      this.maxCurvature = Math.max(1, Math.min(64, Math.round(props.maxCurvature)));
    }
  }
};

// src/core/drawings/types/MachFigure.ts
var MACH_WAVE_COUNT_OPTIONS = [3, 4, 5, 6, 8, 10, 12];
var MACH_NUMBER_OPTIONS = [1.5, 2, 2.5, 3, 4, 5];
var DEFAULT_WAVES = 6;
var DEFAULT_MACH = 2;
function linearMachLevels(enabledCount = DEFAULT_WAVES) {
  return [...cycleLevels(LEVEL_CYCLE.length, enabledCount)];
}
function sanitizeLevel2(v) {
  if (!v || typeof v !== "object") return null;
  const o = v;
  if (typeof o.ratio !== "number" || typeof o.color !== "string") return null;
  return {
    ratio: o.ratio,
    color: o.color,
    enabled: o.enabled !== false,
    ...typeof o.label === "string" && o.label ? { label: o.label } : {}
  };
}
var SHOW_RATIOS_FIELD = {
  path: "showRatios",
  label: "Show ratios",
  kind: "boolean",
  group: "behavior"
};
var MachFigure = class extends Drawing {
  constructor(init) {
    super(init);
    if (this.waveCount === void 0) this.waveCount = DEFAULT_WAVES;
    if (this.showRatios === void 0) this.showRatios = true;
    const levelsFromProps = Array.isArray(init.props?.levels);
    if (!this.levels) this.levels = this.defaultLevels().map((l) => ({ ...l }));
    if (!levelsFromProps && this.shouldSyncWaveCount()) this.syncLevelsToWaveCount();
  }
  /** Linear Sonic/Supersonic sync `waveCount` → enabled levels; Golden tools return false. */
  shouldSyncWaveCount() {
    return true;
  }
  syncLevelsToWaveCount() {
    const n = Math.max(1, Math.min(this.levels.length, Math.round(this.waveCount)));
    this.waveCount = n;
    for (let i = 0; i < this.levels.length; i += 1) this.levels[i].enabled = i < n;
  }
  editableLevels() {
    return this.levels;
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "d1", free: "both" }, { role: "d2", free: "both" }] };
  }
  /** Pixel geometry for the current anchors, or null until both ends resolve. */
  geom(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const ay = proj.yOf(a.price, this.paneId);
    const by = proj.yOf(b.price, this.paneId);
    if (ay == null || by == null) return null;
    const ax = proj.xOf(a.time);
    const bx = proj.xOf(b.time);
    const c0x = (ax + bx) / 2;
    const c0y = (ay + by) / 2;
    const R = Math.hypot(bx - ax, by - ay) / 2;
    if (R < 1) return null;
    let fx = bx - ax;
    let fy = by - ay;
    const flen = Math.hypot(fx, fy);
    if (flen < 1e-9) {
      fx = 1;
      fy = 0;
    } else {
      fx /= flen;
      fy /= flen;
    }
    const active = this.levels.filter((l) => l.enabled && l.ratio > 0).slice().sort((p, q) => p.ratio - q.ratio);
    if (active.length === 0) return null;
    const M = Math.max(1, this.machNumber());
    const circles = [];
    for (const lv of active) {
      const r = lv.ratio * R;
      circles.push({
        cx: c0x + M * (r - R) * fx,
        cy: c0y + M * (r - R) * fy,
        r,
        color: lv.color,
        ratio: lv.ratio
      });
    }
    const noseX = c0x - M * R * fx;
    const noseY = c0y - M * R * fy;
    const maxR = circles[circles.length - 1].r;
    const rayLen = M * maxR + 2 * R;
    const rays = [];
    if (M <= 1 + 1e-9) {
      const px = -fy;
      const py = fx;
      rays.push([noseX - px * rayLen, noseY - py * rayLen, noseX + px * rayLen, noseY + py * rayLen]);
    } else {
      const mu = Math.asin(1 / M);
      const cos = Math.cos(mu);
      const sin = Math.sin(mu);
      const rot = (dx, dy, s) => [dx * cos - dy * s * sin, dx * s * sin + dy * cos];
      const [d1x, d1y] = rot(fx, fy, 1);
      const [d2x, d2y] = rot(fx, fy, -1);
      rays.push([noseX, noseY, noseX + d1x * rayLen, noseY + d1y * rayLen]);
      rays.push([noseX, noseY, noseX + d2x * rayLen, noseY + d2y * rayLen]);
    }
    return { c0x, c0y, R, fx, fy, noseX, noseY, circles, rays };
  }
  hitTest(px, py, proj, tol) {
    const g = this.geom(proj);
    if (!g) return false;
    for (const c of g.circles) {
      if (Math.abs(Math.hypot(px - c.cx, py - c.cy) - c.r) <= tol) return true;
    }
    return g.rays.some((r) => distToSegment(px, py, r[0], r[1], r[2], r[3]) <= tol);
  }
  handlePoints(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return [];
    const ay = proj.yOf(a.price, this.paneId);
    const by = proj.yOf(b.price, this.paneId);
    if (ay == null || by == null) return [];
    return [
      [proj.xOf(a.time), ay],
      [proj.xOf(b.time), by]
    ];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const g = this.geom(proj);
    if (!g) return null;
    let loX = g.noseX;
    let hiX = g.noseX;
    let loY = g.noseY;
    let hiY = g.noseY;
    for (const c of g.circles) {
      loX = Math.min(loX, c.cx - c.r);
      hiX = Math.max(hiX, c.cx + c.r);
      loY = Math.min(loY, c.cy - c.r);
      hiY = Math.max(hiY, c.cy + c.r);
    }
    for (const r of g.rays) {
      loX = Math.min(loX, r[0], r[2]);
      hiX = Math.max(hiX, r[0], r[2]);
      loY = Math.min(loY, r[1], r[3]);
      hiY = Math.max(hiY, r[1], r[3]);
    }
    return { x: loX, y: loY, w: hiX - loX, h: hiY - loY };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
  /** Sync the Waves dropdown onto `levels[].enabled` (first N on). */
  applySettings(patch) {
    super.applySettings(patch);
    if (Object.prototype.hasOwnProperty.call(patch, "waveCount") && typeof this.waveCount === "number") {
      const n = Math.max(1, Math.min(this.levels.length, Math.round(this.waveCount)));
      this.waveCount = n;
      for (let i = 0; i < this.levels.length; i += 1) this.levels[i].enabled = i < n;
    }
  }
  schema() {
    return {
      fields: [
        ...LINE_FIELDS,
        {
          path: "waveCount",
          label: "Waves",
          kind: "number",
          min: 3,
          max: 12,
          step: 1,
          group: "behavior"
        },
        SHOW_RATIOS_FIELD,
        ...TEXT_FIELDS
      ]
    };
  }
  writeProps() {
    return {
      waveCount: this.waveCount,
      showRatios: this.showRatios,
      levels: this.levels.map((l) => ({ ...l }))
    };
  }
  readProps(props) {
    if (typeof props.waveCount === "number" && Number.isFinite(props.waveCount)) {
      this.waveCount = Math.max(2, Math.min(12, Math.round(props.waveCount)));
    }
    if (typeof props.showRatios === "boolean") this.showRatios = props.showRatios;
    if (Array.isArray(props.levels)) {
      const parsed = props.levels.map(sanitizeLevel2).filter((l) => l != null);
      if (parsed.length) this.levels = parsed;
    }
  }
};
var Sonic = class extends MachFigure {
  constructor() {
    super(...arguments);
    this.type = "sonic";
  }
  defaultLevels() {
    return linearMachLevels(DEFAULT_WAVES);
  }
  machNumber() {
    return 1;
  }
};
var Supersonic = class extends MachFigure {
  constructor(init) {
    super(init);
    this.type = "supersonic";
    if (this.mach === void 0) this.mach = DEFAULT_MACH;
  }
  defaultLevels() {
    return linearMachLevels(DEFAULT_WAVES);
  }
  machNumber() {
    return Math.max(1.01, this.mach);
  }
  schema() {
    return {
      fields: [
        ...LINE_FIELDS,
        {
          path: "mach",
          label: "Mach number",
          kind: "number",
          min: 1.5,
          max: 5,
          step: 0.5,
          group: "behavior"
        },
        {
          path: "waveCount",
          label: "Waves",
          kind: "number",
          min: 3,
          max: 12,
          step: 1,
          group: "behavior"
        },
        SHOW_RATIOS_FIELD,
        ...TEXT_FIELDS
      ]
    };
  }
  writeProps() {
    return { ...super.writeProps(), mach: this.mach };
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.mach === "number" && Number.isFinite(props.mach)) {
      this.mach = Math.max(1.01, Math.min(20, props.mach));
    }
  }
};

// src/core/drawings/types/GoldenMach.ts
var GOLDEN_MACH_LEVELS = fibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618, 4.236, 6.854, 11.09]);
var DEFAULT_MACH2 = 2;
var GoldenSonic = class extends MachFigure {
  constructor() {
    super(...arguments);
    this.type = "goldensonic";
  }
  shouldSyncWaveCount() {
    return false;
  }
  defaultLevels() {
    return GOLDEN_MACH_LEVELS;
  }
  machNumber() {
    return 1;
  }
  schema() {
    return { fields: [...LINE_FIELDS, SHOW_RATIOS_FIELD, ...TEXT_FIELDS] };
  }
};
var GoldenSupersonic = class extends MachFigure {
  constructor(init) {
    super(init);
    this.type = "goldensupersonic";
    if (this.mach === void 0) this.mach = DEFAULT_MACH2;
  }
  shouldSyncWaveCount() {
    return false;
  }
  defaultLevels() {
    return GOLDEN_MACH_LEVELS;
  }
  machNumber() {
    return Math.max(1.01, this.mach);
  }
  schema() {
    return {
      fields: [
        ...LINE_FIELDS,
        {
          path: "mach",
          label: "Mach number",
          kind: "number",
          min: 1.5,
          max: 5,
          step: 0.5,
          group: "behavior"
        },
        SHOW_RATIOS_FIELD,
        ...TEXT_FIELDS
      ]
    };
  }
  writeProps() {
    return { ...super.writeProps(), mach: this.mach };
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.mach === "number" && Number.isFinite(props.mach)) {
      this.mach = Math.max(1.01, Math.min(20, props.mach));
    }
  }
};

// src/core/drawings/types/XABCD.ts
var XABCD = class extends PatternDrawing {
  constructor() {
    super(...arguments);
    this.type = "xabcd";
  }
  tvPattern() {
    return true;
  }
  /** TradingView: XB shows AB's retracement of XA, AC shows BC of AB, BD shows CD of BC, XD shows AD of XA. */
  tvRatioLines() {
    const p = this.anchors.map((a) => a.price);
    const out = [];
    if (p.length >= 3) out.push({ from: 0, to: 2, ratio: legRatio(p[0], p[1], p[2]) });
    if (p.length >= 4) out.push({ from: 1, to: 3, ratio: legRatio(p[1], p[2], p[3]) });
    if (p.length >= 5) out.push({ from: 2, to: 4, ratio: legRatio(p[2], p[3], p[4]) }, { from: 0, to: 4, ratio: legRatio(p[0], p[1], p[4]) });
    return out;
  }
  vertexLabels() {
    return ["X", "A", "B", "C", "D"];
  }
  legRatios() {
    return true;
  }
  fillTriangles() {
    return [
      [0, 1, 2],
      [2, 3, 4]
    ];
  }
};

// src/core/drawings/types/ABCDPattern.ts
var ABCDPattern = class extends PatternDrawing {
  constructor() {
    super(...arguments);
    this.type = "abcd";
  }
  tvPattern() {
    return true;
  }
  tvRatioLines() {
    const p = this.anchors.map((a) => a.price);
    const out = [];
    if (p.length >= 3) out.push({ from: 0, to: 2, ratio: legRatio(p[0], p[1], p[2]) });
    if (p.length >= 4) out.push({ from: 1, to: 3, ratio: legRatio(p[1], p[2], p[3]) });
    return out;
  }
  tvRatioLineWidth() {
    return this.style.lineWidth;
  }
  vertexLabels() {
    return ["A", "B", "C", "D"];
  }
  legRatios() {
    return true;
  }
};

// src/core/drawings/types/ElliottImpulse.ts
var ElliottImpulse = class extends PatternDrawing {
  constructor() {
    super(...arguments);
    this.type = "elliottimpulse";
  }
  tvPattern() {
    return true;
  }
  tvElliottLabels() {
    return TV_IMPULSE_LABELS;
  }
  vertexLabels() {
    const labels = ELLIOTT_DEGREES[degreeOf(this.degree)].impulse;
    return this.legacy ? labels : ["", ...labels];
  }
  writeProps() {
    return { ...super.writeProps(), origin: !this.legacy, degree: degreeOf(this.degree) };
  }
  readProps(props) {
    super.readProps(props);
    this.legacy = props.origin === false;
    if (typeof props.degree === "string") this.degree = degreeOf(props.degree);
  }
  schema() {
    return { fields: [...LINE_FIELDS, ELLIOTT_DEGREE_FIELD] };
  }
};

// src/core/drawings/types/ElliottCorrection.ts
var ElliottCorrection = class extends PatternDrawing {
  constructor() {
    super(...arguments);
    this.type = "elliottcorrection";
  }
  tvPattern() {
    return true;
  }
  tvElliottLabels() {
    return TV_CORRECTION_LABELS;
  }
  vertexLabels() {
    const labels = ELLIOTT_DEGREES[degreeOf(this.degree)].correction;
    return this.legacy ? labels : ["", ...labels];
  }
  writeProps() {
    return { ...super.writeProps(), origin: !this.legacy, degree: degreeOf(this.degree) };
  }
  readProps(props) {
    super.readProps(props);
    this.legacy = props.origin === false;
    if (typeof props.degree === "string") this.degree = degreeOf(props.degree);
  }
  schema() {
    return { fields: [...LINE_FIELDS, ELLIOTT_DEGREE_FIELD] };
  }
};

// src/core/drawings/types/HeadShoulders.ts
var HeadShoulders = class extends PatternDrawing {
  constructor() {
    super(...arguments);
    this.type = "headshoulders";
  }
  tvPattern() {
    return true;
  }
  vertexLabels() {
    return ["", "Left Shoulder", "", "Head", "", "Right Shoulder", ""];
  }
  labelPlates() {
    return true;
  }
  /** The three peaks; the painter closes the outer two on the neckline where the outer legs cross it. */
  fillTriangles() {
    return [[0, 1, 2], [2, 3, 4], [4, 5, 6]];
  }
  necklineIndices() {
    return [2, 4];
  }
};

// src/core/drawings/types/HarmonicPattern.ts
var HarmonicPattern = class extends PatternDrawing {
  vertexLabels() {
    return ["X", "A", "B", "C", "D"];
  }
  legRatios() {
    return true;
  }
  fillTriangles() {
    return [
      [0, 1, 2],
      [2, 3, 4]
    ];
  }
  /** A named leg ratio in price space (absolute), or null if a leg is degenerate. */
  legValue(name) {
    const [x, a, b, c, d] = this.anchors;
    if (!x || !a || !b || !c || !d) return null;
    const leg = (p, q) => Math.abs(q.price - p.price);
    const xa = leg(x, a);
    const ab = leg(a, b);
    const bc = leg(b, c);
    switch (name) {
      case "ab":
        return xa < 1e-9 ? null : ab / xa;
      case "bc":
        return ab < 1e-9 ? null : bc / ab;
      case "cd":
        return bc < 1e-9 ? null : leg(c, d) / bc;
      default:
        return xa < 1e-9 ? null : leg(a, d) / xa;
    }
  }
  inBand(v, b) {
    return v != null && v >= b.min && v <= b.max;
  }
  ratioOk(i) {
    const r = this.ranges();
    if (i === 2) return this.inBand(this.legValue("ab"), r.ab);
    if (i === 3) return this.inBand(this.legValue("bc"), r.bc);
    if (i === 4) return this.inBand(this.legValue("cd"), r.cd);
    return null;
  }
  valid() {
    if (this.anchors.length < 5) return null;
    const r = this.ranges();
    return this.inBand(this.legValue("ab"), r.ab) && this.inBand(this.legValue("bc"), r.bc) && this.inBand(this.legValue("cd"), r.cd) && this.inBand(this.legValue("ad"), r.ad);
  }
};

// src/core/drawings/types/Gartley.ts
var Gartley = class extends HarmonicPattern {
  constructor() {
    super(...arguments);
    this.type = "gartley";
  }
  patternName() {
    return "Gartley";
  }
  ranges() {
    return { ab: { min: 0.55, max: 0.68 }, bc: { min: 0.382, max: 0.886 }, cd: { min: 1.13, max: 1.618 }, ad: { min: 0.74, max: 0.83 } };
  }
};

// src/core/drawings/types/Bat.ts
var Bat = class extends HarmonicPattern {
  constructor() {
    super(...arguments);
    this.type = "bat";
  }
  patternName() {
    return "Bat";
  }
  ranges() {
    return { ab: { min: 0.382, max: 0.5 }, bc: { min: 0.382, max: 0.886 }, cd: { min: 1.618, max: 2.618 }, ad: { min: 0.84, max: 0.92 } };
  }
};

// src/core/drawings/types/Butterfly.ts
var Butterfly = class extends HarmonicPattern {
  constructor() {
    super(...arguments);
    this.type = "butterfly";
  }
  patternName() {
    return "Butterfly";
  }
  ranges() {
    return { ab: { min: 0.74, max: 0.83 }, bc: { min: 0.382, max: 0.886 }, cd: { min: 1.618, max: 2.618 }, ad: { min: 1.272, max: 1.618 } };
  }
};

// src/core/drawings/types/Crab.ts
var Crab = class extends HarmonicPattern {
  constructor() {
    super(...arguments);
    this.type = "crab";
  }
  patternName() {
    return "Crab";
  }
  ranges() {
    return { ab: { min: 0.382, max: 0.618 }, bc: { min: 0.382, max: 0.886 }, cd: { min: 2.618, max: 3.618 }, ad: { min: 1.55, max: 1.69 } };
  }
};

// src/core/drawings/types/Shark.ts
var Shark = class extends HarmonicPattern {
  constructor() {
    super(...arguments);
    this.type = "shark";
  }
  patternName() {
    return "Shark";
  }
  ranges() {
    return { ab: { min: 0.382, max: 0.618 }, bc: { min: 1.13, max: 1.618 }, cd: { min: 1.618, max: 2.24 }, ad: { min: 0.886, max: 1.13 } };
  }
};

// src/core/drawings/types/Cypher.ts
var XC_OVER_XA = { min: 1.272, max: 1.414 };
var CD_OVER_XC = { min: 0.74, max: 0.83 };
var Cypher = class extends HarmonicPattern {
  constructor() {
    super(...arguments);
    this.type = "cypher";
  }
  tvPattern() {
    return true;
  }
  tvRatioLines() {
    const p = this.anchors.map((a) => a.price);
    const out = [];
    if (p.length >= 3) out.push({ from: 0, to: 2, ratio: legRatio(p[0], p[1], p[2]) });
    if (p.length >= 4) out.push({ from: 1, to: 3, ratio: legRatio(p[1], p[0], p[3]) });
    if (p.length >= 5) out.push({ from: 2, to: 4, ratio: legRatio(p[2], p[3], p[4]) }, { from: 0, to: 4, ratio: legRatio(p[0], p[3], p[4]) });
    return out;
  }
  patternName() {
    return "Cypher";
  }
  ranges() {
    return { ab: { min: 0.382, max: 0.618 }, bc: { min: 0, max: Infinity }, cd: { min: 0, max: Infinity }, ad: { min: 0, max: Infinity } };
  }
  /** XC/XA — point C is a projection of the XA leg beyond A. */
  xcOverXa() {
    const x = this.anchors[0];
    const a = this.anchors[1];
    const c = this.anchors[3];
    if (!x || !a || !c) return null;
    const xa = Math.abs(a.price - x.price);
    return xa < 1e-9 ? null : Math.abs(c.price - x.price) / xa;
  }
  /** CD/XC — D is a retracement of the XC line. */
  cdOverXc() {
    const x = this.anchors[0];
    const c = this.anchors[3];
    const d = this.anchors[4];
    if (!x || !c || !d) return null;
    const xc = Math.abs(c.price - x.price);
    return xc < 1e-9 ? null : Math.abs(d.price - c.price) / xc;
  }
  ratioOk(i) {
    if (i === 2) return this.inBand(this.legValue("ab"), this.ranges().ab);
    return null;
  }
  valid() {
    if (this.anchors.length < 5) return null;
    return this.inBand(this.legValue("ab"), this.ranges().ab) && this.inBand(this.xcOverXa(), XC_OVER_XA) && this.inBand(this.cdOverXc(), CD_OVER_XC);
  }
};

// src/core/drawings/types/DatePriceRange.ts
var DatePriceRange = class extends MeasureBox {
  constructor(init) {
    super(init);
    this.type = "datepricerange";
    if (!init.props) this.tv = true;
    if (this.drawBorder === void 0) this.drawBorder = false;
    if (this.borderColor === void 0) this.borderColor = TV_LINE_COLOR;
    if (this.borderWidth === void 0) this.borderWidth = 1;
  }
  /** TradingView's: no alignment for the text (it sits in the middle of the box). */
  schema() {
    if (!this.tv) return super.schema();
    return { fields: [...LINE_FIELDS, { path: "style.fillColor", label: "Background", kind: "color", group: "fill" }, ...TEXT_FIELDS] };
  }
  writeProps() {
    const base = super.writeProps();
    return this.tv ? { ...base, drawBorder: this.drawBorder, borderColor: this.borderColor, borderWidth: this.borderWidth } : base;
  }
  readProps(props) {
    super.readProps(props);
    if (typeof props.drawBorder === "boolean") this.drawBorder = props.drawBorder;
    if (typeof props.borderColor === "string") this.borderColor = props.borderColor;
    if (typeof props.borderWidth === "number" && props.borderWidth > 0) this.borderWidth = props.borderWidth;
  }
};

// src/core/drawings/types/PositionTool.ts
var DIRECTION_OPTIONS = [
  { value: "long", label: "Long" },
  { value: "short", label: "Short" }
];
var _PositionTool = class _PositionTool extends Drawing {
  constructor(init) {
    super(init);
    this.type = "position";
    /** The side this tool always places (the Long / Short Position tools); null = from the drag (Long/Short). */
    this.placeSide = null;
    if (this.riskPercent === void 0) this.riskPercent = _PositionTool.DEFAULT_RISK_PERCENT;
    if (this.accountBalance === void 0) this.accountBalance = _PositionTool.DEFAULT_ACCOUNT_BALANCE;
    if (this.showText === void 0) this.showText = true;
    if (this.alwaysShowStats === void 0) this.alwaysShowStats = false;
    if (this.showHeader === void 0) this.showHeader = true;
    if (this.showPrices === void 0) this.showPrices = true;
    if (this.showLossSize === void 0) this.showLossSize = true;
    if (this.showTargetLabel === void 0) this.showTargetLabel = true;
    if (this.showStopLabel === void 0) this.showStopLabel = true;
    if (this.profitColor === void 0) this.profitColor = _PositionTool.DEFAULT_PROFIT_COLOR;
    if (this.lossColor === void 0) this.lossColor = _PositionTool.DEFAULT_LOSS_COLOR;
    if (this.showTradeLine === void 0) this.showTradeLine = false;
    if (this.fontPx === void 0) this.fontSize = _PositionTool.DEFAULT_FONT_PX;
  }
  /** Label text size in px (TradingView's position tools take a pixel size, not small/large): whole px,
   *  clamped to MIN_FONT_PX..MAX_FONT_PX; a non-number is ignored. */
  get fontSize() {
    return this.fontPx;
  }
  set fontSize(v) {
    if (typeof v !== "number" || !Number.isFinite(v)) return;
    this.fontPx = Math.min(_PositionTool.MAX_FONT_PX, Math.max(_PositionTool.MIN_FONT_PX, Math.round(v)));
  }
  /** `'LONG'` or `'SHORT'`, computed from geometry so it flips live as the drag crosses the
   *  entry (target above entry → long; below → short). */
  directionLabel() {
    const p = this.prices();
    return p && p.target >= p.entry ? "LONG" : "SHORT";
  }
  /** Direction as a settings path: reading reflects the geometry; writing the opposite value
   *  mirrors the stop AND the target across the entry, turning the trade around in place
   *  while preserving each side's distance (and therefore the R:R). */
  get direction() {
    return this.directionLabel() === "LONG" ? "long" : "short";
  }
  set direction(v) {
    const entry = this.anchors[0];
    const stop = this.anchors[1];
    const target = this.anchors[2];
    if (!entry || !stop || !target || this.placeSide) return;
    if ((v === "long" || v === "short") && v !== this.direction) {
      stop.price = 2 * entry.price - stop.price;
      target.price = 2 * entry.price - target.price;
    }
  }
  /** Position size as a settings path: reading returns the computed size; writing back-solves
   *  the risk % so that `size × stop distance = balance × risk%` holds for the typed size. */
  get quantity() {
    return this.positionSize();
  }
  set quantity(v) {
    const p = this.prices();
    if (!p || !Number.isFinite(v) || v < 0) return;
    const dist = Math.abs(p.entry - p.stop);
    if (dist < 1e-9 || this.accountBalance <= 0) return;
    this.riskPercent = v * dist / this.accountBalance * 100;
  }
  // ── price levels as settings paths (the gear panel patches these directly) ──
  get entryPrice() {
    return this.anchors[0]?.price ?? 0;
  }
  set entryPrice(v) {
    const a = this.anchors[0];
    if (a && Number.isFinite(v)) {
      if (this.placeSide) this.shiftLevels(v - a.price);
      a.price = v;
      this.constrainHandleDrag(0);
    }
  }
  /** Move the stop and target by `dp` (the Long / Short Position tools keep them at a fixed distance from the entry). */
  shiftLevels(dp) {
    for (const i of [1, 2]) {
      const a = this.anchors[i];
      if (a) a.price += dp;
    }
  }
  get stopPrice() {
    return this.anchors[1]?.price ?? 0;
  }
  set stopPrice(v) {
    const a = this.anchors[1];
    if (a && Number.isFinite(v)) {
      a.price = v;
      this.constrainHandleDrag(1);
    }
  }
  get targetPrice() {
    return this.anchors[2]?.price ?? 0;
  }
  set targetPrice(v) {
    const a = this.anchors[2];
    if (a && Number.isFinite(v)) {
      a.price = v;
      this.constrainHandleDrag(2);
    }
  }
  anchorSchema() {
    return {
      min: 2,
      max: 2,
      slots: [
        { role: "entry", free: "both" },
        { role: "stop", free: "both" },
        { role: "target", free: "both" }
      ]
    };
  }
  // Placed click-move-click (the inherited 'click' mode), consistent with the box/Gann/range tools.
  /**
   * Resolve the two placed anchors (entry + target) into the final entry/stop/target box,
   * computing the stop/width in PIXEL space so the box has a consistent visual size at any
   * scale. The second click is the profit direction — a target above the entry yields a long
   * (stop below); below yields a short. A degenerate second click (≈ the entry) falls back to
   * a default-sized long-facing box.
   */
  onPlaced(proj) {
    const e = this.anchors[0];
    if (!e) return;
    const ex = proj.xOf(e.time);
    const ey = proj.yOf(e.price, this.paneId);
    if (ey == null) return;
    const t = this.anchors[1];
    const ty = t ? proj.yOf(t.price, this.paneId) : null;
    let targetPx;
    let endPx;
    if (t && ty != null && Math.abs(ty - ey) >= _PositionTool.MIN_DRAG_PX) {
      targetPx = ty;
      endPx = ex + Math.max(Math.abs(proj.xOf(t.time) - ex), _PositionTool.MIN_WIDTH_PX);
    } else {
      targetPx = ey - _PositionTool.DEFAULT_RISK_PX * _PositionTool.DEFAULT_RR;
      endPx = ex + _PositionTool.DEFAULT_WIDTH_PX;
    }
    if (this.placeSide === "long") targetPx = ey - Math.abs(targetPx - ey);
    else if (this.placeSide === "short") targetPx = ey + Math.abs(targetPx - ey);
    const stopPx = ey - (targetPx - ey) / _PositionTool.DEFAULT_RR;
    const endTime = proj.pxToPoint(endPx, ey, this.paneId).time;
    this.anchors = [
      { time: e.time, price: e.price },
      { time: endTime, price: proj.pxToPoint(ex, stopPx, this.paneId).price },
      { time: endTime, price: proj.pxToPoint(ex, targetPx, this.paneId).price }
    ];
  }
  /**
   * Keep the stop (loss) and target (reward) on OPPOSITE sides of the entry. When a handle
   * drag would put them on the same side — e.g. dragging the stop of a long up past the entry
   * (flipping it to a short) — reflect the *other* side across the entry so the two never
   * collapse onto one direction. R:R (each side's distance from entry) is preserved.
   */
  constrainHandleDrag(index) {
    const entry = this.anchors[0];
    const stop = this.anchors[1];
    const target = this.anchors[2];
    if (!entry || !stop || !target) return;
    if (this.placeSide) {
      const up = this.placeSide === "long" ? 1 : -1;
      const eps = Math.max(Math.abs(entry.price) * 1e-6, 1e-9);
      if ((target.price - entry.price) * up < eps) target.price = entry.price + up * eps;
      if ((entry.price - stop.price) * up < eps) stop.price = entry.price - up * eps;
      return;
    }
    const stopSide = Math.sign(stop.price - entry.price);
    const targetSide = Math.sign(target.price - entry.price);
    if (stopSide === 0 || targetSide === 0 || stopSide !== targetSide) return;
    if (index === 2) stop.price = 2 * entry.price - stop.price;
    else target.price = 2 * entry.price - target.price;
  }
  /** The three levels — entry, stop, target — deriving the stop while only two anchors exist
   *  (the live drag preview, before onPlaced sets the precise box). During preview the second
   *  anchor is the target (profit); after placement anchors are [entry, stop, target]. */
  resolved() {
    const e = this.anchors[0];
    const a1 = this.anchors[1];
    if (!e || !a1) return null;
    if (this.anchors[2]) return [e, a1, this.anchors[2]];
    let tp = a1.price;
    if (this.placeSide === "long" && tp < e.price || this.placeSide === "short" && tp > e.price) tp = 2 * e.price - tp;
    const target = { time: a1.time, price: tp };
    const stop = { time: a1.time, price: e.price - (tp - e.price) / _PositionTool.DEFAULT_RR };
    return [e, stop, target];
  }
  prices() {
    const r = this.resolved();
    return r ? { entry: r[0].price, stop: r[1].price, target: r[2].price } : null;
  }
  /** Risk:reward ratio = |target − entry| / |entry − stop| (0 when risk is degenerate). */
  rr() {
    const p = this.prices();
    if (!p) return 0;
    const risk = Math.abs(p.entry - p.stop);
    return risk < 1e-9 ? 0 : Math.abs(p.target - p.entry) / risk;
  }
  /** Reward % = |target − entry| / entry · 100. */
  rewardPct() {
    const p = this.prices();
    return p && p.entry !== 0 ? Math.abs(p.target - p.entry) / p.entry * 100 : 0;
  }
  /** Risk % of price = |entry − stop| / entry · 100 (distinct from the account riskPercent). */
  riskPct() {
    const p = this.prices();
    return p && p.entry !== 0 ? Math.abs(p.entry - p.stop) / p.entry * 100 : 0;
  }
  /** Dollar amount risked at the stop = accountBalance × riskPercent / 100. */
  dollarLoss() {
    return Math.max(0, this.accountBalance) * (Math.max(0, this.riskPercent) / 100);
  }
  /** Position size in units = dollarLoss / |entry − stop| (0 when risk is degenerate). */
  positionSize() {
    const p = this.prices();
    if (!p) return 0;
    const risk = Math.abs(p.entry - p.stop);
    return risk < 1e-9 ? 0 : this.dollarLoss() / risk;
  }
  // ── painted label lines (each respects its own toggle; the painter checks showText) ──
  /** `DIR · R:R x.xx` — the always-on header when text is shown. */
  headerLabel() {
    return `${this.directionLabel()}  \xB7  R:R ${this.rr().toFixed(2)}`;
  }
  /** `Loss $… · Size …` — the painter hides it when showLossSize is off. */
  lossSizeLabel() {
    return `Loss $${formatMoney(this.dollarLoss())}  \xB7  Size ${formatQty(this.positionSize())}`;
  }
  /** `Target +x.xx%`, with the level price appended when showPrices is on. */
  targetLabel() {
    const p = this.prices();
    const at = this.showPrices && p ? `  @ ${formatPrice(p.target)}` : "";
    return `Target +${this.rewardPct().toFixed(2)}%${at}`;
  }
  /** `Stop −x.xx%`, with the level price appended when showPrices is on. */
  stopLabel() {
    const p = this.prices();
    const at = this.showPrices && p ? `  @ ${formatPrice(p.stop)}` : "";
    return `Stop \u2212${this.riskPct().toFixed(2)}%${at}`;
  }
  // ── TradingView-style boxed labels (the painter draws each in a solid box on its level) ──
  /** `Target: 85,123.40 (3.41%) 2,806.00, Amount: 341.10` — level price (when showPrices is
   *  on), distance from the entry in % and in price, and the profit at the target for the
   *  computed size. Shown just outside the reward zone, on the target line. */
  targetBoxLabel() {
    const p = this.prices();
    if (!p) return "";
    const dist = Math.abs(p.target - p.entry);
    const at = this.showPrices ? `${formatGrouped(p.target)} ` : "";
    return `Target: ${at}(${this.rewardPct().toFixed(2)}%) ${formatGrouped(dist)}, Amount: ${formatGrouped(dist * this.positionSize(), 2)}`;
  }
  /** `Stop: 80,500.00 (2.05%) 1,690.20, Amount: 100.00` — same shape as the target label;
   *  the amount is the loss at the stop. Shown just outside the risk zone, on the stop line. */
  stopBoxLabel() {
    const p = this.prices();
    if (!p) return "";
    const dist = Math.abs(p.entry - p.stop);
    const at = this.showPrices ? `${formatGrouped(p.stop)} ` : "";
    return `Stop: ${at}(${this.riskPct().toFixed(2)}%) ${formatGrouped(dist)}, Amount: ${formatGrouped(dist * this.positionSize(), 2)}`;
  }
  /** The centre box by the entry line: `Long, Qty: 0.0591, Risk: $100` (or `Open PnL: …, Qty: …, Risk: $…` once `trade` filled; showLossSize) over
   *  `Risk/reward ratio: 2.07` (showHeader). Empty when both are off. */
  centerBoxLines(trade) {
    const lines = [];
    const dir = this.direction === "long" ? "Long" : "Short";
    if (this.showLossSize && trade) lines.push(`${trade.status === "open" ? "Open" : "Closed"} PnL: ${formatGrouped(trade.pnl, 2).replace(/^-/, "\u2212")}, Qty: ${formatQty(this.positionSize())}, Risk: $${formatGrouped(this.dollarLoss(), 2)}`);
    else if (this.showLossSize) lines.push(`${dir}, Qty: ${formatQty(this.positionSize())}, Risk: $${formatGrouped(this.dollarLoss(), 2)}`);
    if (this.showHeader) lines.push(`Risk/reward ratio: ${this.rr().toFixed(2)}`);
    return lines;
  }
  // ── the trade over the candles (TradingView's dashed entry→exit line) ──
  /**
   * Play the position over `bars` (oldest first, the chart's candles): it opens on the first bar at or after the
   * entry time whose range touches the entry price, then closes on the first bar that reaches the target or the stop
   * (both in one bar counts as the stop: the conservative read), else it is still open at the close of the last bar
   * inside the box. Null when it never opened (the entry is in the future, or price never came back to it).
   */
  trade(bars) {
    const r = this.resolved();
    if (!r || !this.anchors[2]) return null;
    const p = { entry: r[0].price, stop: r[1].price, target: r[2].price };
    const from = Math.min(r[0].time, r[2].time);
    const to = Math.max(r[0].time, r[1].time, r[2].time);
    const long = p.target >= p.entry;
    let open = null;
    let last = null;
    for (const b of bars) {
      if (b.time < from || b.time > to) continue;
      if (open === null) {
        if (b.low <= p.entry && b.high >= p.entry) open = b.time;
        else continue;
      }
      const hitStop = long ? b.low <= p.stop : b.high >= p.stop;
      const hitTarget = long ? b.high >= p.target : b.low <= p.target;
      if (hitStop) return this.closedAt(open, b.time, p.stop, "stop", p.entry, long);
      if (hitTarget) return this.closedAt(open, b.time, p.target, "target", p.entry, long);
      last = b;
    }
    if (open === null || !last) return null;
    return this.closedAt(open, last.time, last.close, "open", p.entry, long);
  }
  closedAt(openTime, time, price, status, entry, long) {
    const pnl = (long ? price - entry : entry - price) * this.positionSize();
    return { openTime, time, price, status, pnl };
  }
  // ── stop/target input units (the gear panel's Price / Points dropdowns) ──
  /** The stop or target expressed in the given unit: the absolute price, or the distance from
   *  the entry in price points. */
  levelDisplayValue(level2, mode) {
    const p = this.prices();
    if (!p) return 0;
    const price = level2 === "stop" ? p.stop : p.target;
    if (mode === "price") return roundFloat(price);
    return roundFloat(Math.abs(price - p.entry));
  }
  /** The absolute price a typed value in the given unit resolves to. Points measure the
   *  distance from the entry; the level keeps its current side (target defaults to the profit
   *  side, stop to the loss side, when it sits exactly on the entry). */
  levelPriceFromDisplay(level2, mode, value) {
    const p = this.prices();
    if (!p || mode === "price") return value;
    const current = level2 === "stop" ? p.stop : p.target;
    let side = Math.sign(current - p.entry);
    if (side === 0) side = (level2 === "target" ? 1 : -1) * (this.direction === "long" ? 1 : -1);
    return p.entry + side * Math.abs(value);
  }
  box(proj) {
    const pts = this.levelPoints(proj);
    if (pts.length < 3) return null;
    const xs = pts.map((p) => p[0]);
    return { x1: Math.min(...xs), x2: Math.max(...xs), ey: pts[0][1], sy: pts[1][1], ty: pts[2][1] };
  }
  /** Entry, stop and target at their own anchor x/y (the box geometry; handles sit elsewhere). */
  levelPoints(proj) {
    const r = this.resolved();
    if (!r) return [];
    const pts = [];
    for (const a of r) {
      const y = proj.yOf(a.price, this.paneId);
      if (y == null) return [];
      pts.push([proj.xOf(a.time), y]);
    }
    return pts;
  }
  /** Pixel layout for the painter: the box x-range + each level's y. */
  layout(proj) {
    return this.box(proj);
  }
  hitTest(px, py, proj, tol) {
    const b = this.box(proj);
    if (!b) return false;
    const top = Math.min(b.ey, b.sy, b.ty);
    const bot = Math.max(b.ey, b.sy, b.ty);
    return pointInBox(px, py, b.x1, top, b.x2, bot, tol);
  }
  /** TradingView's four handles: [0] the entry (circle, left), [1] the stop and [2] the target on
   *  the box's left edge (they move their level only), [3] the entry's right end (sets the width). */
  handlePoints(proj) {
    const b = this.box(proj);
    if (!b) return [];
    const ex = this.levelPoints(proj)[0][0];
    return [[ex, b.ey], [b.x1, b.sy], [b.x1, b.ty], [b.x2, b.ey]];
  }
  /** TradingView's cursors: move on the entry circle, up/down on the stop and target, left/right on the width. */
  handleCursor(index) {
    if (this.anchors.length < 3) return null;
    return index === 3 ? "ew-resize" : index === 1 || index === 2 ? "ns-resize" : null;
  }
  /** Handle shapes in {@link handlePoints} order, as TradingView draws them. */
  handleShapes() {
    return ["circle", "square", "square", "square"];
  }
  /** Stop / target handles move their price only (TradingView); the right-end handle moves the box's right edge. */
  dragHandlePx(index, x, y, proj) {
    if (this.anchors.length < 3) return false;
    if (index === 0) {
      if (!this.placeSide) return false;
      const sy = proj.yOf(this.anchors[1].price, this.paneId);
      const ty = proj.yOf(this.anchors[2].price, this.paneId);
      const rx = proj.xOf(this.anchors[2].time);
      if (sy != null && ty != null) y = Math.min(Math.max(y, Math.min(sy, ty) + 1), Math.max(sy, ty) - 1);
      x = Math.min(x, rx - 1);
      const pt2 = proj.pxToPoint(x, y, this.paneId);
      if (!Number.isFinite(pt2.price)) return true;
      this.anchors[0] = { time: pt2.time, price: pt2.price };
      return true;
    }
    if (this.placeSide && (index === 1 || index === 2)) {
      const ey = proj.yOf(this.anchors[0].price, this.paneId);
      const above = index === 2 === (this.placeSide === "long");
      if (ey != null) y = above ? Math.min(y, ey - 1) : Math.max(y, ey + 1);
    }
    const pt = proj.pxToPoint(x, y, this.paneId);
    if (index === 3) {
      this.anchors[1].time = pt.time;
      this.anchors[2].time = pt.time;
      return true;
    }
    const a = this.anchors[index];
    if (!a || !Number.isFinite(pt.price)) return false;
    a.price = pt.price;
    this.constrainHandleDrag(index);
    return true;
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const b = this.box(proj);
    if (!b) return null;
    const y = Math.min(b.ey, b.sy, b.ty);
    return { x: b.x1, y, w: b.x2 - b.x1, h: Math.max(b.ey, b.sy, b.ty) - y };
  }
  priceRange() {
    const r = this.resolved();
    if (!r) return null;
    const ps = r.map((a) => a.price);
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }
  schema() {
    return {
      fields: [
        { path: "riskPercent", label: "Risk %", kind: "number", min: 0, max: 100, step: 0.1, group: "behavior" },
        { path: "accountBalance", label: "Account balance", kind: "number", min: 0, max: 1e12, step: 1, group: "behavior" },
        { path: "quantity", label: "Position size", kind: "number", group: "behavior" },
        ...this.placeSide ? [] : [{ path: "direction", label: "Direction", kind: "select", options: DIRECTION_OPTIONS, group: "behavior" }],
        { path: "entryPrice", label: "Entry price", kind: "number", group: "behavior" },
        { path: "stopPrice", label: "Stop price", kind: "number", group: "behavior" },
        { path: "targetPrice", label: "Target price", kind: "number", group: "behavior" },
        { path: "showText", label: "Show text", kind: "boolean", group: "behavior" },
        { path: "alwaysShowStats", label: "Always show stats", kind: "boolean", group: "behavior" },
        { path: "showHeader", label: "Show risk/reward ratio", kind: "boolean", group: "behavior" },
        { path: "showLossSize", label: "Show size & risk", kind: "boolean", group: "behavior" },
        { path: "showTargetLabel", label: "Show target label", kind: "boolean", group: "behavior" },
        { path: "showStopLabel", label: "Show stop label", kind: "boolean", group: "behavior" },
        { path: "showPrices", label: "Show level prices", kind: "boolean", group: "behavior" },
        { path: "profitColor", label: "Profit zone", kind: "color", group: "fill" },
        { path: "lossColor", label: "Loss zone", kind: "color", group: "fill" },
        { path: "showTradeLine", label: "Trade line", kind: "boolean", group: "line" },
        ...LINE_FIELDS.filter((f) => f.path !== "style.lineColor"),
        { path: "text.color", label: "Text color", kind: "color", group: "text" },
        { path: "fontSize", label: "Text size", kind: "number", min: _PositionTool.MIN_FONT_PX, max: _PositionTool.MAX_FONT_PX, step: 1, group: "text" }
      ]
    };
  }
  writeProps() {
    return {
      riskPercent: this.riskPercent,
      accountBalance: this.accountBalance,
      showText: this.showText,
      showHeader: this.showHeader,
      showPrices: this.showPrices,
      alwaysShowStats: this.alwaysShowStats,
      showLossSize: this.showLossSize,
      showTargetLabel: this.showTargetLabel,
      showStopLabel: this.showStopLabel,
      profitColor: this.profitColor,
      lossColor: this.lossColor,
      fontSize: this.fontSize,
      showTradeLine: this.showTradeLine
    };
  }
  readProps(props) {
    if (typeof props.riskPercent === "number" && Number.isFinite(props.riskPercent)) {
      this.riskPercent = props.riskPercent;
    }
    if (typeof props.accountBalance === "number" && Number.isFinite(props.accountBalance)) {
      this.accountBalance = props.accountBalance;
    }
    if (typeof props.showText === "boolean") this.showText = props.showText;
    if (typeof props.showHeader === "boolean") this.showHeader = props.showHeader;
    if (typeof props.showPrices === "boolean") this.showPrices = props.showPrices;
    if (typeof props.alwaysShowStats === "boolean") this.alwaysShowStats = props.alwaysShowStats;
    if (typeof props.showLossSize === "boolean") this.showLossSize = props.showLossSize;
    if (typeof props.showTargetLabel === "boolean") this.showTargetLabel = props.showTargetLabel;
    if (typeof props.showStopLabel === "boolean") this.showStopLabel = props.showStopLabel;
    if (typeof props.profitColor === "string") this.profitColor = props.profitColor;
    if (typeof props.lossColor === "string") this.lossColor = props.lossColor;
    if (typeof props.showTradeLine === "boolean") this.showTradeLine = props.showTradeLine;
    if (typeof props.fontSize === "number" && Number.isFinite(props.fontSize)) {
      this.fontSize = props.fontSize;
    } else if (this.fontPx === void 0 && typeof props.riskPercent === "number") {
      this.fontSize = LEGACY_FONT_PX[this.text?.size ?? "normal"] ?? _PositionTool.DEFAULT_FONT_PX;
    }
  }
};
/** Default reward:risk used to derive the stop from the placed (or default) target. */
_PositionTool.DEFAULT_RR = 2;
/** Below this vertical drag (media px) a placement is treated as a bare click → default box. */
_PositionTool.MIN_DRAG_PX = 6;
_PositionTool.DEFAULT_RISK_PX = 64;
_PositionTool.DEFAULT_WIDTH_PX = 150;
_PositionTool.MIN_WIDTH_PX = 48;
_PositionTool.DEFAULT_RISK_PERCENT = 1;
/** TradingView's default label size for the position tools (its `fontsize`, in px). */
_PositionTool.DEFAULT_FONT_PX = 12;
_PositionTool.MIN_FONT_PX = 6;
_PositionTool.MAX_FONT_PX = 72;
_PositionTool.DEFAULT_ACCOUNT_BALANCE = 1e4;
// TradingView's own long/short position defaults (read from TradingView Desktop, 2026-10-30).
_PositionTool.DEFAULT_PROFIT_COLOR = "#089981";
// palette-exempt: TradingView position profit zone
_PositionTool.DEFAULT_LOSS_COLOR = "#f23645";
var PositionTool = _PositionTool;
var LEGACY_FONT_PX = { tiny: 10, small: 12, normal: 14, large: 18, huge: 28 };
function formatMoney(n) {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}
function formatQty(n) {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4).replace(/\.?0+$/, "");
  return n.toPrecision(4).replace(/\.?0+$/, "");
}
function formatPrice(n) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toPrecision(4).replace(/\.?0+$/, "");
}
function formatGrouped(n, decimals) {
  if (!Number.isFinite(n)) return "0";
  if (decimals === void 0 && Math.abs(n) < 1) return formatPrice(n);
  const d = decimals ?? 2;
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function roundFloat(n) {
  return Math.round(n * 1e8) / 1e8;
}
var LongPositionTool = class extends PositionTool {
  constructor() {
    super(...arguments);
    this.type = "long-position";
    this.placeSide = "long";
  }
};
var ShortPositionTool = class extends PositionTool {
  constructor() {
    super(...arguments);
    this.type = "short-position";
    this.placeSide = "short";
  }
};

// src/core/drawings/types/Magnifier.ts
var MAGNIFIER_TIMEFRAME_OPTIONS = [
  { value: "auto", label: "Auto", ms: 0 },
  { value: "1", label: "1m", ms: 6e4 },
  { value: "5", label: "5m", ms: 3e5 },
  { value: "15", label: "15m", ms: 9e5 },
  { value: "30", label: "30m", ms: 18e5 },
  { value: "60", label: "1h", ms: 36e5 },
  { value: "240", label: "4h", ms: 144e5 },
  { value: "D", label: "1D", ms: 864e5 }
];
function magnifierTimeframeLabel(value) {
  const opt = MAGNIFIER_TIMEFRAME_OPTIONS.find((o) => o.value === value);
  if (opt) return opt.label;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    if (n % 1440 === 0) return `${n / 1440}D`;
    if (n % 60 === 0) return `${n / 60}h`;
    return `${n}m`;
  }
  return value;
}
function defaultMagnifierStyle() {
  return { timeframe: "auto", upColor: "", downColor: "" };
}
var Magnifier = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "magnifier";
    /** Pixel rect of the timeframe chip as painted last frame, caret included — the chip is
     *  an interactive dropdown trigger, so the interaction layer needs the exact rect the
     *  painter measured. Renderer-transient: never serialized, null while unpainted. */
    this.chipRect = null;
    if (!this.magnifier) this.magnifier = defaultMagnifierStyle();
  }
  anchorSchema() {
    return { min: 2, max: 2, slots: [{ role: "c1", free: "both" }, { role: "c2", free: "both" }] };
  }
  placementMode() {
    return "drag";
  }
  /** The pixel rectangle between the two corner anchors (painter + hit-test share it). */
  rect(proj) {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    const ya = proj.yOf(a.price, this.paneId);
    const yb = proj.yOf(b.price, this.paneId);
    if (ya == null || yb == null) return null;
    return { x1: proj.xOf(a.time), y1: ya, x2: proj.xOf(b.time), y2: yb };
  }
  hitTest(px, py, proj, tol) {
    const r = this.rect(proj);
    if (!r) return false;
    if (pointInBox(px, py, r.x1, r.y1, r.x2, r.y2)) return true;
    const edges = [
      [r.x1, r.y1, r.x2, r.y1],
      [r.x2, r.y1, r.x2, r.y2],
      [r.x2, r.y2, r.x1, r.y2],
      [r.x1, r.y2, r.x1, r.y1]
    ];
    return edges.some((e) => distToSegment(px, py, e[0], e[1], e[2], e[3]) <= tol);
  }
  handlePoints(proj) {
    const r = this.rect(proj);
    return r ? [[r.x1, r.y1], [r.x2, r.y2]] : [];
  }
  hitHandle(px, py, proj, tol) {
    return handleAt(px, py, this.handlePoints(proj), tol + 3);
  }
  bounds(proj) {
    const r = this.rect(proj);
    if (!r) return null;
    return { x: Math.min(r.x1, r.x2), y: Math.min(r.y1, r.y2), w: Math.abs(r.x2 - r.x1), h: Math.abs(r.y2 - r.y1) };
  }
  priceRange() {
    const a = this.anchors[0];
    const b = this.anchors[1];
    if (!a || !b) return null;
    return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
  }
  schema() {
    return {
      fields: [
        {
          path: "magnifier.timeframe",
          label: "Timeframe",
          kind: "select",
          options: MAGNIFIER_TIMEFRAME_OPTIONS,
          group: "behavior"
        },
        ...LINE_FIELDS.map((f) => ({ ...f, label: f.label.replace("Line", "Border") })),
        { path: "magnifier.upColor", label: "Up candles", kind: "color", group: "fill" },
        { path: "magnifier.downColor", label: "Down candles", kind: "color", group: "fill" }
      ]
    };
  }
  writeProps() {
    return { ...this.magnifier };
  }
  readProps(props) {
    this.magnifier = { ...defaultMagnifierStyle(), ...props };
  }
};

// src/core/drawings/types/PriceAlert.ts
var defaultPriceAlertState = () => ({
  label: "",
  direction: "Crosses",
  trigger: "Only once",
  message: "Price alert",
  sound: true,
  active: true
});
var ALERT_STUB_PX = 44;
var PriceAlert = class extends Drawing {
  constructor(init) {
    super(init);
    this.type = "pricealert";
    /** Set by the painter each frame: the hover pill and its trash button (null when not shown). */
    this.pillRect = null;
    this.trashRect = null;
    if (!this.alert) this.alert = defaultPriceAlertState();
  }
  anchorSchema() {
    return { min: 1, max: 1, slots: [{ role: "p", free: "y" }] };
  }
  y(proj) {
    const a = this.anchors[0];
    return a ? proj.yOf(a.price, this.paneId) : null;
  }
  hitTest(px, py, proj, tol) {
    const y = this.y(proj);
    if (y == null) return false;
    const r = this.pillRect;
    if (r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return true;
    return px >= proj.width - ALERT_STUB_PX - 12 && Math.abs(py - y) <= Math.max(tol, 16);
  }
  /** No selection handles: the marker's own dot is the grab point and the body drags it. */
  handlePoints(_proj) {
    return [];
  }
  hitHandle() {
    return -1;
  }
  bounds(proj) {
    const y = this.y(proj);
    return y == null ? null : { x: proj.width - ALERT_STUB_PX - 12, y: y - 10, w: ALERT_STUB_PX + 12, h: 20 };
  }
  /** Never widens the autoscale: an alert far from price must not squash the candles. */
  priceRange() {
    return null;
  }
  /** Pinned to the plot edge, so it is never culled by the visible time range. */
  timeExtent() {
    return null;
  }
  /** No settings popup: the host's own dialog edits an alert. */
  schema() {
    return { fields: [] };
  }
  writeProps() {
    return { ...this.alert };
  }
  readProps(props) {
    this.alert = { ...defaultPriceAlertState(), ...props };
  }
};

// src/core/drawings/registry.ts
var REGISTRY2 = /* @__PURE__ */ new Map();
function registerDrawingType(meta) {
  REGISTRY2.set(meta.type, meta);
}
function getDrawingType(type) {
  return REGISTRY2.get(type);
}
function drawingTypes() {
  return [...REGISTRY2.values()];
}
function createDrawing(type, init) {
  const meta = REGISTRY2.get(type);
  if (!meta) return null;
  const style = { ...meta.defaultStyle, ...init.style ?? {} };
  return meta.create({ ...init, style });
}
function resetDrawingSettings(drawing) {
  const fresh = createDrawing(drawing.type, { paneId: drawing.paneId });
  if (!fresh) return;
  drawing.style = { ...fresh.style };
  const keptValue = drawing.text?.value;
  if (fresh.text) {
    drawing.text = { ...fresh.text };
    if (keptValue !== void 0) drawing.text.value = keptValue;
  } else {
    drawing.text = void 0;
  }
  const props = fresh.serialize().props;
  if (props !== void 0) drawing.applyProps(props);
}
function deserializeDrawing(doc) {
  const meta = REGISTRY2.get(doc.type);
  return meta ? meta.create(legacyPattern(legacyFibSpiral(legacyStroke(legacyArrowMarker(legacyEllipse(legacyPitchfork(legacyComment(legacyElliott(doc))))))))) : null;
}
var TV_PATTERN_TYPES = /* @__PURE__ */ new Set(["xabcd", "cypher", "headshoulders", "abcd", "trianglepattern"]);
function legacyPattern(doc) {
  if (!TV_PATTERN_TYPES.has(doc.type) || doc.props?.tv !== void 0) return doc;
  return { ...doc, props: { ...doc.props ?? {}, tv: false } };
}
function legacyFibSpiral(doc) {
  if (doc.type !== "fibspiral" || doc.props?.tv !== void 0) return doc;
  return { ...doc, props: { ...doc.props ?? {}, tv: false } };
}
function legacyElliott(doc) {
  const old = doc.type === "elliottimpulse" ? 5 : doc.type === "elliottcorrection" ? 3 : 0;
  if (!old || doc.props?.origin !== void 0 || (doc.anchors?.length ?? 0) !== old) return doc;
  return { ...doc, props: { ...doc.props ?? {}, origin: false } };
}
function legacyComment(doc) {
  if (doc.type !== "comment" || doc.props?.point !== void 0 || (doc.anchors?.length ?? 0) !== 2) return doc;
  return { ...doc, props: { ...doc.props ?? {}, point: false } };
}
function legacyPitchfork(doc) {
  if (!PITCHFORK_TYPES.has(doc.type) || doc.props?.levels !== void 0) return doc;
  const ink = doc.style?.lineColor ?? DEFAULT_DRAWING_COLOR;
  return { ...doc, props: { ...doc.props ?? {}, levels: [{ ratio: 1, color: ink, enabled: true }], background: false, medianColor: "" } };
}
var PITCHFORK_TYPES = /* @__PURE__ */ new Set(["pitchfork", "schiffpitchfork", "modifiedschiffpitchfork", "insidepitchfork"]);
function legacyArrowMarker(doc) {
  return doc.type === "arrowmarker" && doc.props === void 0 ? { ...doc, props: {} } : doc;
}
var LEGACY_NO_PROPS = /* @__PURE__ */ new Set(["freehand", "highlighter", "box", "path", "text", "callout", "flattopbottom", "disjointchannel", "trendangle", "crossline", "rotatedrect", "circle", "triangle", "polyline", "arc", "curve", "doublecurve", "cycliclines", "timecycles", "sineline", "pricenote", "pricelabel", "signpost", "forecast", "projection", "ghostfeed"]);
function legacyStroke(doc) {
  return LEGACY_NO_PROPS.has(doc.type) && doc.props === void 0 ? { ...doc, props: {} } : doc;
}
function legacyEllipse(doc) {
  if (doc.type !== "ellipse" || doc.props?.axis !== void 0 || (doc.anchors?.length ?? 0) !== 2) return doc;
  return { ...doc, props: { ...doc.props ?? {}, axis: false } };
}
var LINE_ICON = svg24('<path d="M6.6 17.4 17.4 6.6"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="5" r="2.2"/>');
var HLINE_ICON = svg24('<line x1="3" y1="12" x2="21" y2="12"/>');
registerDrawingType({
  type: "trendline",
  group: "lines",
  label: "Trend Line",
  icon: LINE_ICON,
  // TradingView's trend line: 2 px solid, TradingView blue.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new TrendLine(init)
});
registerDrawingType({
  type: "hline",
  group: "lines",
  label: "Horizontal Line",
  icon: HLINE_ICON,
  // TradingView's horizontal line: 2 px solid, TradingView blue, price label on.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new HorizontalLine(init)
});
var RAY_ICON = svg24('<line x1="3" y1="20" x2="21" y2="6"/><circle cx="3" cy="20" r="1.6" fill="currentColor"/>');
var BOX_ICON = svg24('<rect x="4" y="6" width="16" height="12" rx="1"/>');
var TEXT_ICON = svg24('<path d="M5 6h14M12 6v13"/>');
registerDrawingType({
  type: "ray",
  group: "lines",
  label: "Ray",
  icon: RAY_ICON,
  // TradingView's ray: its trend line, 2 px solid TradingView blue, extended right.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new Ray(init)
});
var EXTLINE_ICON = svg24('<path d="M5 19 19 5"/><path d="M5 19 8.5 19M5 19 5 15.5"/><path d="M19 5 15.5 5M19 5 19 8.5"/>');
var VLINE_ICON = svg24('<line x1="12" y1="3" x2="12" y2="21"/>');
var HRAY_ICON = svg24('<line x1="5" y1="12" x2="21" y2="12"/><circle cx="5" cy="12" r="1.6" fill="currentColor"/>');
var CROSSLINE_ICON = svg24('<line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/>');
var INFOLINE_ICON = svg24('<path d="M4 20 20 4"/><rect x="9" y="9" width="9" height="6" rx="1"/>');
var TRENDANGLE_ICON = svg24('<path d="M4 20 20 6"/><path d="M4 20 15 20"/><path d="M11 20a7 7 0 0 0-2-4.9"/>');
registerDrawingType({
  type: "extendedline",
  group: "lines",
  label: "Extended Line",
  icon: EXTLINE_ICON,
  // TradingView's extended line: its trend line, 2 px solid TradingView blue, extended both ways.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new ExtendedLine(init)
});
registerDrawingType({
  type: "vline",
  group: "lines",
  label: "Vertical Line",
  icon: VLINE_ICON,
  // TradingView's vertical line: 2 px solid, TradingView blue, through every pane, time label on.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new VerticalLine(init)
});
registerDrawingType({
  type: "hray",
  group: "lines",
  label: "Horizontal Ray",
  icon: HRAY_ICON,
  // TradingView's horizontal ray: 2 px solid, TradingView blue, price label on.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new HorizontalRay(init)
});
registerDrawingType({
  type: "crossline",
  group: "lines",
  label: "Cross Line",
  icon: CROSSLINE_ICON,
  // TradingView's cross line: 2 px solid TradingView blue, price and time labels on.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new CrossLine(init)
});
registerDrawingType({
  type: "infoline",
  group: "lines",
  label: "Info Line",
  icon: INFOLINE_ICON,
  // TradingView's info line: its trend line, 2 px solid TradingView blue, every stat shown.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new InfoLine(init)
});
registerDrawingType({
  type: "trendangle",
  group: "lines",
  label: "Trend Angle",
  icon: TRENDANGLE_ICON,
  // TradingView's trend angle: 2 px solid TradingView blue.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new TrendAngle(init)
});
registerDrawingType({
  type: "box",
  group: "shapes",
  label: "Rectangle",
  icon: BOX_ICON,
  // TradingView's rectangle: purple 2 px, the purple at 20 % behind.
  defaultStyle: { lineColor: "#9c27b0", lineWidth: 2, lineStyle: "solid", fillColor: "#9c27b033" },
  // palette-exempt: TradingView's rectangle
  create: (init) => new Box(init)
});
registerDrawingType({
  type: "text",
  group: "annotations",
  label: "Text",
  icon: TEXT_ICON,
  coversSeries: true,
  // text over the candles like TradingView's: a candle never paints over the words
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new TextLabel(init)
});
var CALLOUT_ICON = svg24('<path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-5 5v-5H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>');
registerDrawingType({
  type: "callout",
  group: "annotations",
  label: "Callout",
  icon: CALLOUT_ICON,
  coversSeries: true,
  // text over the candles like TradingView's: a candle never paints over the words
  // TradingView's callout: its sky blue 700 border (2 px) and the same at 70 % behind the text.
  defaultStyle: { lineColor: "#0097a7", lineWidth: 2, lineStyle: "solid", fillColor: "#0097a7b3" },
  // palette-exempt: TradingView's sky blue 700
  create: (init) => new Callout(init)
});
var NOTE_ICON = svg24('<path d="M5 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-7l-4 4v-4H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 8.5h8M8 12h5"/>');
var PRICE_NOTE_ICON = svg24('<rect x="10" y="4.5" width="11" height="8" rx="1.5"/><path d="M10 8.5 4 16"/><circle cx="3.5" cy="16.5" r="1.6" fill="currentColor" stroke="none"/>');
var COMMENT_ICON = svg24('<path d="M5 4.5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-7l-4 4v-4H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"/>');
var PRICE_LABEL_ICON = svg24('<path d="M3 12 7 8h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7Z"/><path d="M10.5 12.5h6" stroke-width="1.4"/>');
var SIGNPOST_ICON = svg24('<path d="M12 11.5V21"/><rect x="5" y="4" width="14" height="7" rx="1"/><path d="M9 7.5h6"/>');
registerDrawingType({
  type: "note",
  group: "annotations",
  label: "Note",
  icon: NOTE_ICON,
  coversSeries: true,
  // text over the candles like TradingView's: a candle never paints over the words
  // TradingView's note: the pin (Label) in its blue.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: "solid", fillColor: `${DEFAULT_DRAWING_COLOR}d9` },
  create: (init) => new Note(init)
});
registerDrawingType({
  type: "pricenote",
  group: "annotations",
  label: "Price Note",
  icon: PRICE_NOTE_ICON,
  coversSeries: true,
  // text over the candles like TradingView's: a candle never paints over the words
  // TradingView's: its blue line and label (module 394599).
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: "solid", fillColor: TV_LINE_COLOR },
  create: (init) => new PriceNote(init)
});
registerDrawingType({
  type: "comment",
  group: "annotations",
  label: "Comment",
  icon: COMMENT_ICON,
  coversSeries: true,
  // text over the candles like TradingView's: a candle never paints over the words
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid", fillColor: `${DEFAULT_DRAWING_COLOR}d9` },
  create: (init) => new Comment(init)
});
registerDrawingType({
  type: "pricelabel",
  group: "annotations",
  label: "Price Label",
  icon: PRICE_LABEL_ICON,
  coversSeries: true,
  // text over the candles like TradingView's: a candle never paints over the words
  // TradingView's: its blue line and label (module 616930).
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: "solid", fillColor: TV_LINE_COLOR },
  create: (init) => new PriceLabel(init)
});
registerDrawingType({
  type: "signpost",
  group: "annotations",
  label: "Signpost",
  icon: SIGNPOST_ICON,
  coversSeries: true,
  // text over the candles like TradingView's: a candle never paints over the words
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid", fillColor: `${DEFAULT_DRAWING_COLOR}d9` },
  create: (init) => new Signpost(init)
});
var PARALLEL_ICON = svg24('<line x1="3" y1="16" x2="21" y2="8"/><line x1="3" y1="21" x2="21" y2="13"/>');
var DISJOINT_ICON = svg24('<line x1="3" y1="7" x2="21" y2="10"/><line x1="3" y1="18" x2="21" y2="14"/>');
var PITCHFORK_ICON = svg24('<circle cx="4" cy="12" r="1.6" fill="currentColor"/><line x1="4" y1="12" x2="10" y2="12"/><line x1="10" y1="6" x2="10" y2="18"/><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>');
registerDrawingType({
  type: "parallelchannel",
  group: "channels",
  label: "Parallel Channel",
  icon: PARALLEL_ICON,
  // TradingView's parallel channel: TradingView blue lines, its blue at 20 % behind.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid", fillColor: `${TV_LINE_COLOR}33` },
  create: (init) => new ParallelChannel(init)
});
registerDrawingType({
  type: "disjointchannel",
  group: "channels",
  label: "Disjoint Channel",
  icon: DISJOINT_ICON,
  // TradingView's disjoint channel: its minty green 2 px, the same green at 20 % behind.
  defaultStyle: { lineColor: "#089981", lineWidth: 2, lineStyle: "solid", fillColor: "#08998133" },
  // palette-exempt: TradingView's minty green 500
  create: (init) => new DisjointChannel(init)
});
var FLATTOP_ICON = svg24('<line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="18" x2="21" y2="11"/>');
registerDrawingType({
  type: "flattopbottom",
  group: "channels",
  label: "Flat Top/Bottom",
  icon: FLATTOP_ICON,
  // TradingView's flat top/bottom: its tan orange 2 px, the same orange at 20 % behind.
  defaultStyle: { lineColor: "#FF9800", lineWidth: 2, lineStyle: "solid", fillColor: "#FF980033" },
  // palette-exempt: TradingView's tan orange 500
  create: (init) => new FlatTopBottom(init)
});
var REGRESSION_ICON = svg24('<line x1="3" y1="8" x2="21" y2="4"/><line x1="3" y1="16" x2="21" y2="12"/><line x1="3" y1="12" x2="21" y2="8" stroke-dasharray="3 3"/>');
registerDrawingType({
  type: "regressionchannel",
  group: "channels",
  label: "Linear Regression",
  icon: REGRESSION_ICON,
  defaultStyle: { lineColor: NEUTRAL, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new RegressionChannel(init)
});
registerDrawingType({
  type: "pitchfork",
  group: "pitchforks",
  label: "Pitchfork",
  icon: PITCHFORK_ICON,
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  // TradingView: the toolbar's color is Use one color
  create: (init) => new Pitchfork(init)
});
var SCHIFF_ICON = svg24('<circle cx="4" cy="8" r="1.6" fill="currentColor"/><line x1="4" y1="8" x2="10" y2="12"/><line x1="10" y1="6" x2="10" y2="18"/><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>');
var MODSCHIFF_ICON = svg24('<circle cx="6" cy="9" r="1.6" fill="currentColor"/><line x1="6" y1="9" x2="10" y2="12"/><line x1="10" y1="6" x2="10" y2="18"/><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>');
var INSIDE_ICON = svg24('<line x1="4" y1="12" x2="10" y2="12"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="10" y1="8" x2="21" y2="8"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="16" x2="21" y2="16"/>');
registerDrawingType({
  type: "schiffpitchfork",
  group: "pitchforks",
  label: "Schiff Pitchfork",
  icon: SCHIFF_ICON,
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  // TradingView: the toolbar's color is Use one color
  create: (init) => new SchiffPitchfork(init)
});
registerDrawingType({
  type: "modifiedschiffpitchfork",
  group: "pitchforks",
  label: "Modified Schiff Pitchfork",
  icon: MODSCHIFF_ICON,
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  // TradingView: the toolbar's color is Use one color
  create: (init) => new ModifiedSchiffPitchfork(init)
});
registerDrawingType({
  type: "insidepitchfork",
  group: "pitchforks",
  label: "Inside Pitchfork",
  icon: INSIDE_ICON,
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  // TradingView: the toolbar's color is Use one color
  create: (init) => new InsidePitchfork(init)
});
var PITCHFAN_ICON = svg24('<circle cx="4" cy="12" r="1.6" fill="currentColor"/><line x1="4" y1="12" x2="21" y2="12"/><line x1="4" y1="12" x2="20" y2="5"/><line x1="4" y1="12" x2="20" y2="19"/><line x1="15" y1="7" x2="15" y2="17"/>');
registerDrawingType({
  type: "pitchfan",
  group: "pitchforks",
  label: "Pitchfan",
  icon: PITCHFAN_ICON,
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  // TradingView: the toolbar's color is Use one color
  create: (init) => new Pitchfan(init)
});
var ARROW_ICON = svg24('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>');
var ELLIPSE_ICON = svg24('<ellipse cx="12" cy="12" rx="9" ry="6"/>');
var TRIANGLE_ICON = svg24('<path d="M12 4 20 19 4 19Z"/>');
registerDrawingType({
  type: "arrow",
  group: "shapes",
  label: "Arrow",
  icon: ARROW_ICON,
  // TradingView's arrow: its trend line, 2 px solid TradingView blue, the right end an arrow.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid", arrowRight: true },
  create: (init) => new Arrow(init)
});
registerDrawingType({
  type: "ellipse",
  group: "shapes",
  label: "Ellipse",
  icon: ELLIPSE_ICON,
  // TradingView's ellipse: its ripe red 2 px, the same red at 20 % behind.
  defaultStyle: { lineColor: "#F23645", lineWidth: 2, lineStyle: "solid", fillColor: "#F2364533" },
  // palette-exempt: TradingView's ripe red 500
  create: (init) => new Ellipse(init)
});
registerDrawingType({
  type: "triangle",
  group: "shapes",
  label: "Triangle",
  icon: TRIANGLE_ICON,
  // TradingView's triangle: its minty green 2 px, the same green at 20 % behind.
  defaultStyle: { lineColor: "#089981", lineWidth: 2, lineStyle: "solid", fillColor: "#08998133" },
  // palette-exempt: TradingView's minty green 500
  create: (init) => new Triangle(init)
});
var POLYLINE_ICON = svg24('<polyline points="3 17 9 10 13 14 21 5"/>');
var FREEHAND_ICON = svg24('<path d="M9.5 12 17 4.5a2.12 2.12 0 0 1 3 3L12.5 15"/><path d="M7 14a3 3 0 0 0-3 3c0 1.3-1.2 1.5-1.5 2 .8.9 2 1.5 3.5 1.5a3.5 3.5 0 0 0 3.5-3.5 3 3 0 0 0-2.5-3Z"/>');
var HIGHLIGHTER_ICON = svg24('<path d="M9 11 15 5l4 4-6 6H9Z"/><path d="M9 15l-2 2"/><path d="M4 21h6"/>');
registerDrawingType({
  type: "polyline",
  group: "shapes",
  label: "Polyline",
  icon: POLYLINE_ICON,
  // TradingView's polyline: its sky blue 2 px, the area it encloses filled with the blue at 20 %.
  defaultStyle: { lineColor: "#00bcd4", lineWidth: 2, lineStyle: "solid", fillColor: "#00bcd433" },
  // palette-exempt: TradingView's sky blue 500
  create: (init) => new Polyline(init)
});
registerDrawingType({
  type: "freehand",
  group: "shapes",
  label: "Brush",
  icon: FREEHAND_ICON,
  // TradingView's brush: sky blue 2 px, its fill (off until switched on) the same blue at 20 %.
  defaultStyle: { lineColor: "#00bcd4", lineWidth: 2, lineStyle: "solid", fillColor: "#00bcd433" },
  // palette-exempt: TradingView's sky blue
  create: (init) => new Freehand(init)
});
registerDrawingType({
  type: "highlighter",
  group: "shapes",
  label: "Highlighter",
  icon: HIGHLIGHTER_ICON,
  // TradingView's highlighter: its red at 20 %, 20 px.
  defaultStyle: { lineColor: "#f2364533", lineWidth: 20, lineStyle: "solid" },
  // palette-exempt: TradingView's red
  create: (init) => new Highlighter(init)
});
var CIRCLE_ICON = svg24('<circle cx="12" cy="12" r="8"/>');
var ROTRECT_ICON = svg24('<path d="M5 14 9.5 5 19 10 14.5 19 Z"/>');
var PATH_ICON = svg24('<path d="M4 19 9 11 13 14 17 8 20 4"/><path d="M17.2 5.5 20 4 19.4 7.1"/>');
var ARC_ICON = svg24('<path d="M4 17a8 8 0 0 1 16 0"/><path d="M4 17 20 17"/>');
var CURVE_ICON = svg24('<path d="M4 18Q12 1 20 14"/>');
var ARROW_UP_ICON = svg24('<path d="M12 5 12 19"/><path d="M6 11 12 5 18 11"/>');
var ARROW_DOWN_ICON = svg24('<path d="M12 5 12 19"/><path d="M6 13 12 19 18 13"/>');
registerDrawingType({
  type: "circle",
  group: "shapes",
  label: "Circle",
  icon: CIRCLE_ICON,
  // TradingView's circle: its tan orange 2 px, the same orange at 20 % behind.
  defaultStyle: { lineColor: "#FF9800", lineWidth: 2, lineStyle: "solid", fillColor: "#FF980033" },
  // palette-exempt: TradingView's tan orange 500
  create: (init) => new Circle(init)
});
registerDrawingType({
  type: "rotatedrect",
  group: "shapes",
  label: "Rotated Rectangle",
  icon: ROTRECT_ICON,
  // TradingView's rotated rectangle: its iguana green 2 px, the same green at 20 % behind.
  defaultStyle: { lineColor: "#4caf50", lineWidth: 2, lineStyle: "solid", fillColor: "#4caf5033" },
  // palette-exempt: TradingView's iguana green 500
  create: (init) => new RotatedRect(init)
});
registerDrawingType({
  type: "path",
  group: "shapes",
  label: "Path",
  icon: PATH_ICON,
  // TradingView's path: its blue, 2 px.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new Path(init)
});
registerDrawingType({
  type: "arc",
  group: "shapes",
  label: "Arc",
  icon: ARC_ICON,
  // TradingView's arc: its berry pink 2 px, the same pink at 20 % behind.
  defaultStyle: { lineColor: "#e91e63", lineWidth: 2, lineStyle: "solid", fillColor: "#e91e6333" },
  // palette-exempt: TradingView's berry pink 500
  create: (init) => new Arc(init)
});
registerDrawingType({
  type: "curve",
  group: "shapes",
  label: "Curve",
  icon: CURVE_ICON,
  // TradingView's curve: 2 px TradingView blue, its background (off) the blue at 20 %.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid", fillColor: `${TV_LINE_COLOR}33` },
  create: (init) => new Curve(init)
});
registerDrawingType({
  type: "arrowmarkup",
  group: "shapes",
  label: "Arrow Mark Up",
  icon: ARROW_UP_ICON,
  defaultStyle: { lineColor: BULLISH, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new ArrowMarkUp(init)
});
registerDrawingType({
  type: "arrowmarkdown",
  group: "shapes",
  label: "Arrow Mark Down",
  icon: ARROW_DOWN_ICON,
  // TradingView's arrow mark down: its ripe red 600 (the up mark is its minty green, our BULLISH).
  defaultStyle: { lineColor: "#cc2f3c", lineWidth: 1, lineStyle: "solid" },
  // palette-exempt: TradingView's red 600
  create: (init) => new ArrowMarkDown(init)
});
var FLAG_MARK_ICON = svg24('<path d="M6 21V4"/><path d="M6 5h11l-2.5 3.5L17 12H6" fill="currentColor" stroke="none"/>');
var ICON_STAMP_ICON = svg24(
  '<circle cx="12" cy="12" r="8.5"/><path d="M8.6 14.2a4.4 4.4 0 0 0 6.8 0"/><circle cx="9.2" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14.8" cy="10" r="1" fill="currentColor" stroke="none"/>'
);
registerDrawingType({
  type: "flagmark",
  group: "stamps",
  label: "Flag",
  icon: FLAG_MARK_ICON,
  // TradingView's flag mark: its blue.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FlagMark(init)
});
registerDrawingType({
  type: "iconstamp",
  group: "stamps",
  label: "Icon",
  icon: ICON_STAMP_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new IconStamp(init)
});
registerDrawingType({
  type: "emoji",
  group: "stamps",
  label: "Emoji",
  icon: ICON_STAMP_ICON,
  coversSeries: true,
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new EmojiDrawing(init)
});
registerDrawingType({
  type: "icon",
  group: "stamps",
  label: "Icon",
  icon: ICON_STAMP_ICON,
  coversSeries: true,
  // TradingView's icon: its blue.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new IconDrawing(init)
});
var FIB_RETRACE_ICON = svg24(
  '<path d="M3 5h13.8M3 10h18M3 14h18M7.2 19H21"/><circle cx="19" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/>'
);
var FIB_EXTEND_ICON = svg24('<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="3" y1="15" x2="14" y2="15"/><line x1="3" y1="20" x2="14" y2="20"/>');
registerDrawingType({
  type: "fibretracement",
  group: "fibonacci",
  label: "Fib Retracement",
  icon: FIB_RETRACE_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FibRetracement(init)
});
registerDrawingType({
  type: "fibextension",
  group: "fibonacci",
  label: "Fib Extension",
  icon: FIB_EXTEND_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FibExtension(init)
});
var FIB_TREND_ICON = svg24('<path d="M3 20 10 9l4 5"/><path d="M14 14h7M14 9h7M14 4h7"/>');
registerDrawingType({
  type: "fibextensiontrend",
  group: "fibonacci",
  label: "Trend-Based Fib Extension",
  icon: FIB_TREND_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FibExtensionTrend(init)
});
var FIB_FAN_ICON = svg24('<path d="M4 20 20 5M4 20 21 11M4 20 21 17M4 20 20 20"/>');
var FIB_TZ_ICON = svg24('<path d="M3 5v14M6 5v14M11 5v14M19 5v14"/>');
registerDrawingType({
  type: "fibfan",
  group: "fibonacci",
  label: "Fib Fan",
  icon: FIB_FAN_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FibFan(init)
});
registerDrawingType({
  type: "fibtimezones",
  group: "fibonacci",
  label: "Fib Time Zones",
  icon: FIB_TZ_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "dashed" },
  create: (init) => new FibTimeZones(init)
});
var FIB_CHANNEL_ICON = svg24('<path d="M3 18 18 9M5 21 20 12M6 13 21 4"/>');
var FIB_SPEEDFAN_ICON = svg24('<path d="M4 4 20 20M4 4 20 12M4 4 12 20M4 4 20 4M4 4 4 20"/>');
var FIB_TRENDTIME_ICON = svg24('<path d="M3 19 9 8M9 8 12 5v14M14 5v14M18 5v14M21 5v14"/>');
registerDrawingType({
  type: "fibchannel",
  group: "fibonacci",
  label: "Fib Channel",
  icon: FIB_CHANNEL_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FibChannel(init)
});
registerDrawingType({
  type: "fibspeedfan",
  group: "fibonacci",
  label: "Fib Speed Resistance Fan",
  icon: FIB_SPEEDFAN_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FibSpeedFan(init)
});
registerDrawingType({
  type: "trendfibtime",
  group: "fibonacci",
  label: "Trend-Based Fib Time",
  icon: FIB_TRENDTIME_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "dashed" },
  create: (init) => new TrendFibTime(init)
});
var FIB_CIRCLES_ICON = svg24('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="10"/>');
var FIB_ARCS_ICON = svg24('<path d="M8 20a4 4 0 0 1 8 0"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/><circle cx="12" cy="20" r="1.4" fill="currentColor" stroke="none"/>');
var FIB_WEDGE_ICON = svg24('<path d="M4 20 20 16M4 20 14 4"/><path d="M11.8 18.1A8 8 0 0 0 8.2 13.2"/><path d="M16.6 16.9A13 13 0 0 0 10.9 9"/>');
var FIB_SPIRAL_ICON = svg24('<path d="M13 12a2 2 0 1 1-2-2 4 4 0 0 1 4 4 6 6 0 0 1-9 5.2 9 9 0 0 1 .5-15"/>');
registerDrawingType({
  type: "fibcircles",
  group: "fibonacci",
  label: "Fib Circles",
  icon: FIB_CIRCLES_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FibCircles(init)
});
registerDrawingType({
  type: "fibarcs",
  group: "fibonacci",
  label: "Fib Speed Resistance Arcs",
  icon: FIB_ARCS_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FibArcs(init)
});
registerDrawingType({
  type: "fibwedge",
  group: "fibonacci",
  label: "Fib Wedge",
  icon: FIB_WEDGE_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FibWedge(init)
});
registerDrawingType({
  type: "fibspiral",
  group: "fibonacci",
  label: "Fib Spiral",
  icon: FIB_SPIRAL_ICON,
  defaultStyle: { lineColor: "#00bcd4", lineWidth: 2, lineStyle: "solid" },
  // palette-exempt: TradingView's sky blue 500 (module 337648)
  create: (init) => new FibSpiral(init)
});
var GANN_FAN_ICON = svg24('<path d="M4 20 20 20M4 20 20 13M4 20 20 6M4 20 15 4M4 20 9 4M4 20 4 4"/>');
var GANN_BOX_ICON = svg24('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 4v16M4 4 20 20" opacity="0.6"/>');
registerDrawingType({
  type: "gannfan",
  group: "fibonacci",
  label: "Gann Fan",
  icon: GANN_FAN_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new GannFan(init)
});
registerDrawingType({
  type: "gannbox",
  group: "fibonacci",
  label: "Gann Box",
  icon: GANN_BOX_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new GannBox(init)
});
var GANN_SQUARE_ICON = svg24('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 20 20 4M4 20 20 12M4 20 12 4" opacity="0.7"/><path d="M4 20a16 16 0 0 1 16-16" opacity="0.5"/>');
registerDrawingType({
  type: "gannsquare",
  group: "fibonacci",
  label: "Gann Square",
  icon: GANN_SQUARE_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new GannSquare(init)
});
var GANN_SQUARE_FIXED_ICON = svg24('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 4v16" opacity="0.7"/><path d="M4 12a8 8 0 0 1 8-8M4 20a16 16 0 0 1 16-16" opacity="0.5"/>');
registerDrawingType({
  type: "gannsquarefixed",
  group: "fibonacci",
  label: "Gann Square Fixed",
  icon: GANN_SQUARE_FIXED_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new GannSquareFixed(init)
});
var DEDEKIND_ICON = svg24(
  '<path d="M2 20h20"/><path d="M4 20a8 8 0 0 1 16 0" opacity="0.9"/><path d="M6 20a4 4 0 0 1 8 0" opacity="0.75"/><path d="M10 20a2 2 0 0 1 4 0" opacity="0.6"/><path d="M8 20v-6M12 20v-9M16 20v-6" opacity="0.45"/>'
);
registerDrawingType({
  type: "dedekind",
  group: "geometry",
  label: "Dedekind Tessellation",
  icon: DEDEKIND_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new DedekindTessellation(init)
});
var SONIC_ICON = svg24(
  '<circle cx="16" cy="12" r="5" opacity="0.55"/><circle cx="13" cy="12" r="3.5" opacity="0.75"/><circle cx="10.5" cy="12" r="2"/><path d="M8 4v16"/>'
);
var SUPERSONIC_ICON = svg24(
  '<circle cx="17" cy="12" r="4.5" opacity="0.45"/><circle cx="13" cy="12" r="3" opacity="0.7"/><circle cx="10" cy="12" r="1.6"/><path d="M6 12 16 5M6 12 16 19"/>'
);
registerDrawingType({
  type: "sonic",
  group: "geometry",
  label: "Sonic",
  icon: SONIC_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new Sonic(init)
});
registerDrawingType({
  type: "supersonic",
  group: "geometry",
  label: "Supersonic",
  icon: SUPERSONIC_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new Supersonic(init)
});
var GOLDEN_SONIC_ICON = svg24(
  '<circle cx="16" cy="12" r="5" opacity="0.4"/><circle cx="13" cy="12" r="3.2" opacity="0.65"/><circle cx="10.8" cy="12" r="1.8"/><path d="M8 4v16"/><path d="M15 8.5h2M12.5 10h2" opacity="0.5"/>'
);
var GOLDEN_SUPERSONIC_ICON = svg24(
  '<circle cx="17" cy="12" r="4.5" opacity="0.4"/><circle cx="12.5" cy="12" r="2.8" opacity="0.65"/><circle cx="9.8" cy="12" r="1.4"/><path d="M6 12 16 5M6 12 16 19"/>'
);
registerDrawingType({
  type: "goldensonic",
  group: "geometry",
  label: "Golden Sonic",
  icon: GOLDEN_SONIC_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new GoldenSonic(init)
});
registerDrawingType({
  type: "goldensupersonic",
  group: "geometry",
  label: "Golden Supersonic",
  icon: GOLDEN_SUPERSONIC_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new GoldenSupersonic(init)
});
var XABCD_ICON = svg24(
  '<path d="M4 19 7 6l5 7.5L17 5l3 14M4 19l8-5.5 8 5.5"/><circle cx="4" cy="19" r="1.7"/><circle cx="7" cy="6" r="1.7"/><circle cx="12" cy="13.5" r="1.7"/><circle cx="17" cy="5" r="1.7"/><circle cx="20" cy="19" r="1.7"/>'
);
var ABCD_ICON = svg24('<path d="M4 17 9 7 14 15 20 5"/>');
var ELLIOTT_IMPULSE_ICON = svg24('<path d="M3 19 8 9 12 13 17 5 21 9"/>');
var ELLIOTT_CORRECTION_ICON = svg24('<path d="M4 7 11 16 20 9"/>');
var HEAD_SHOULDERS_ICON = svg24('<path d="M3 18 6 12 9 16 12 5 15 16 18 12 21 18"/>');
registerDrawingType({
  type: "xabcd",
  group: "patterns",
  label: "XABCD Pattern",
  icon: XABCD_ICON,
  coversSeries: true,
  // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
  defaultStyle: { lineColor: "#2962ff", lineWidth: 2, lineStyle: "solid", fillColor: "#2962ff26" },
  // palette-exempt: TradingView's tv-blue-500, background at 85 % transparency
  create: (init) => new XABCD(init)
});
registerDrawingType({
  type: "abcd",
  group: "patterns",
  label: "ABCD Pattern",
  icon: ABCD_ICON,
  coversSeries: true,
  // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
  defaultStyle: { lineColor: "#089981", lineWidth: 2, lineStyle: "solid" },
  // palette-exempt: TradingView's minty-green-500
  create: (init) => new ABCDPattern(init)
});
registerDrawingType({
  type: "elliottimpulse",
  group: "patterns",
  label: "Elliott Impulse Wave (1-5)",
  icon: ELLIOTT_IMPULSE_ICON,
  coversSeries: true,
  // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
  defaultStyle: { lineColor: "#3d85c6", lineWidth: 2, lineStyle: "solid" },
  // palette-exempt: TradingView's Elliott wave colour
  create: (init) => new ElliottImpulse(init)
});
registerDrawingType({
  type: "elliottcorrection",
  group: "patterns",
  label: "Elliott Correction Wave (ABC)",
  icon: ELLIOTT_CORRECTION_ICON,
  coversSeries: true,
  // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
  defaultStyle: { lineColor: "#3d85c6", lineWidth: 2, lineStyle: "solid" },
  // palette-exempt: TradingView's Elliott wave colour
  create: (init) => new ElliottCorrection(init)
});
registerDrawingType({
  type: "headshoulders",
  group: "patterns",
  label: "Head & Shoulders",
  icon: HEAD_SHOULDERS_ICON,
  coversSeries: true,
  // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
  defaultStyle: { lineColor: "#089981", lineWidth: 2, lineStyle: "solid", fillColor: "#08998126" },
  // palette-exempt: TradingView's minty-green-500, background at 85 % transparency
  create: (init) => new HeadShoulders(init)
});
var HARMONIC_ICON = svg24('<path d="M3 17 7 6 12 14 17 5 21 16"/><path d="M3 17 21 16" opacity="0.45"/>');
var harmonic = { group: "patterns", icon: HARMONIC_ICON, coversSeries: true, defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" } };
registerDrawingType({ type: "gartley", label: "Gartley", ...harmonic, create: (init) => new Gartley(init) });
registerDrawingType({ type: "bat", label: "Bat", ...harmonic, create: (init) => new Bat(init) });
registerDrawingType({ type: "butterfly", label: "Butterfly", ...harmonic, create: (init) => new Butterfly(init) });
registerDrawingType({ type: "crab", label: "Crab", ...harmonic, create: (init) => new Crab(init) });
registerDrawingType({ type: "shark", label: "Shark", ...harmonic, create: (init) => new Shark(init) });
registerDrawingType({
  type: "cypher",
  label: "Cypher",
  ...harmonic,
  defaultStyle: { lineColor: "#2962ff", lineWidth: 2, lineStyle: "solid", fillColor: "#2962ff26" },
  // palette-exempt: TradingView's tv-blue-500
  create: (init) => new Cypher(init)
});
var MEASURE_ICON = svg24('<rect x="4" y="6" width="16" height="12" rx="1"/><path d="M4 18 20 6" opacity="0.5"/>');
registerDrawingType({
  type: "datepricerange",
  group: "measure",
  label: "Date & Price Range",
  icon: MEASURE_ICON,
  // TradingView's date & price range: 2 px blue arrows, its blue at 15 % behind.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid", fillColor: `${TV_LINE_COLOR}26` },
  create: (init) => new DatePriceRange(init)
});
var POSITION_ENTRY_COLOR = "#808080";
var POSITION_ICON = svg24(
  '<circle cx="5" cy="6" r="2.2"/><path d="M7.2 6H21"/><circle cx="5" cy="18" r="2.2"/><path d="M7.2 18H21"/><path d="M11 9.5v5h4.5"/>'
);
var SHORT_POSITION_ICON = svg24(
  '<circle cx="5" cy="6" r="2.2"/><path d="M7.2 6H21"/><circle cx="5" cy="18" r="2.2"/><path d="M7.2 18H21"/><path d="M15 10.2c-.5-.5-1.3-.8-2.1-.8-1.2 0-2 .6-2 1.4 0 1.9 4.3 1.1 4.3 3.1 0 .8-.9 1.5-2.1 1.5-.9 0-1.8-.4-2.3-1"/>'
);
registerDrawingType({
  type: "long-position",
  group: "measure",
  label: "Long Position",
  icon: POSITION_ICON,
  // Starts over the candles like TradingView: its zones are translucent, and its stats labels
  // must never be painted over by a candle (a misread target/stop is a trading loss).
  coversSeries: true,
  defaultStyle: { lineColor: POSITION_ENTRY_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new LongPositionTool(init)
});
registerDrawingType({
  type: "short-position",
  group: "measure",
  label: "Short Position",
  icon: SHORT_POSITION_ICON,
  coversSeries: true,
  defaultStyle: { lineColor: POSITION_ENTRY_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new ShortPositionTool(init)
});
registerDrawingType({
  type: "position",
  group: "measure",
  label: "Long/Short Position",
  icon: POSITION_ICON,
  coversSeries: true,
  defaultStyle: { lineColor: POSITION_ENTRY_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new PositionTool(init)
});
var MAGNIFIER_ICON = svg24(
  '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.3 15.3 5.2 5.2"/><path d="M8 12.5v-3M10.5 13.5v-5.5M13 12v-2"/>'
);
registerDrawingType({
  type: "magnifier",
  group: "measure",
  label: "Magnifier",
  icon: MAGNIFIER_ICON,
  // An empty border color means the THEME's contrast ink (white on dark, black on
  // light), resolved at paint time so it follows theme switches; a user pick wins.
  defaultStyle: { lineColor: "", lineWidth: 1, lineStyle: "solid" },
  coversSeries: true,
  // the inset's backdrop must sit over the base candles it replaces
  placementHint: "Drag an area on the chart to view it at a lower timeframe",
  create: (init) => new Magnifier(init)
});
var VWAP_ICON = svg24('<line x1="5" y1="3" x2="5" y2="21"/><path d="M5 16c4 0 5-9 8-9s3 5 8 3"/>');
registerDrawingType({
  type: "anchoredvwap",
  group: "measure",
  label: "Anchored VWAP",
  icon: VWAP_ICON,
  defaultStyle: { lineColor: INFO, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new AnchoredVwap(init)
});
var FRVP_ICON = svg24('<path d="M4 4v16"/><path d="M4 8h10"/><path d="M4 12h14"/><path d="M4 16h8"/><path d="M4 20h12"/>');
registerDrawingType({
  type: "fixedrangevp",
  group: "measure",
  label: "Fixed Range Volume Profile",
  icon: FRVP_ICON,
  defaultStyle: { lineColor: BULLISH, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FixedRangeVolumeProfile(init)
});
registerDrawingType({
  type: "anchoredvp",
  group: "measure",
  label: "Anchored Volume Profile",
  icon: FRVP_ICON,
  defaultStyle: { lineColor: BULLISH, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new AnchoredVolumeProfile(init)
});
var FRTPO_ICON = svg24(
  '<path d="M4 4v16"/><path d="M7 7h2M11 7h2"/><path d="M7 11h2M11 11h2M15 11h2"/><path d="M7 15h2M11 15h2"/><path d="M7 19h2"/>'
);
registerDrawingType({
  type: "pricealert",
  group: "measure",
  label: "Price Alert",
  icon: svg24('<path d="M12 4a5 5 0 0 0-5 5v3l-1.5 3h13L17 12V9a5 5 0 0 0-5-5Z"/><path d="M10 18a2 2 0 0 0 4 0"/>'),
  defaultStyle: { lineColor: "", lineWidth: 1, lineStyle: "dashed" },
  coversSeries: true,
  // paint over the candles and the price axis strip, never under them
  create: (init) => new PriceAlert(init)
});
registerDrawingType({
  type: "fixedrangetpo",
  group: "measure",
  label: "Fixed Range TPO Profile",
  icon: FRTPO_ICON,
  defaultStyle: { lineColor: ACCENT, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new FixedRangeTpoProfile(init)
});
var CYCLIC_ICON = svg24('<path d="M5 4v16M10 4v16M15 4v16M20 4v16"/>');
var TIME_CYCLES_ICON = svg24('<path d="M2 18a5 5 0 0 1 10 0a5 5 0 0 1 10 0"/><path d="M2 18h20"/>');
var SINE_ICON = svg24('<path d="M2 12c2.5-7 5-7 7.5 0s5 7 7.5 0 3.5-5 5-5"/>');
var ARROW_MARKER_ICON = svg24('<path d="M4 19 15 9.5l-1.5-2L20 5l-2.5 6.5-2-1.5L5 20Z"/>');
var DATE_RANGE_ICON = svg24('<path d="M5 4v16M19 4v16M7 12h10M9 10l-2 2 2 2M15 10l2 2-2 2"/>');
var PRICE_RANGE_ICON = svg24('<path d="M4 5h16M4 19h16M12 7v10M10 9l2-2 2 2M10 15l2 2 2-2"/>');
var TRIANGLE_PATTERN_ICON = svg24('<path d="M3 6 21 11M3 19 21 13"/><path d="M5 18 9 7.5 13 15.5 17 10"/>');
var ELLIOTT_TRIANGLE_ICON = svg24('<path d="M3 20 7 5l3 12 3-9 3 6 3-3 2 2"/>');
var ELLIOTT_COMBO_ICON = svg24('<path d="M3 19 8 8l4 8 4-11 5 10"/>');
var SOLID = { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" };
registerDrawingType({ type: "cycliclines", group: "measure", label: "Cyclic Lines", icon: CYCLIC_ICON, defaultStyle: { lineColor: "#80ccdb", lineWidth: 2, lineStyle: "solid" }, create: (init) => new CyclicLines(init) });
registerDrawingType({ type: "timecycles", group: "measure", label: "Time Cycles", icon: TIME_CYCLES_ICON, defaultStyle: { lineColor: "#159980", lineWidth: 2, lineStyle: "solid", fillColor: "#6aa84f80" }, create: (init) => new TimeCycles(init) });
registerDrawingType({ type: "sineline", group: "measure", label: "Sine Line", icon: SINE_ICON, defaultStyle: { lineColor: "#159980", lineWidth: 2, lineStyle: "solid" }, create: (init) => new SineLine(init) });
registerDrawingType({ type: "daterange", group: "measure", label: "Date Range", icon: DATE_RANGE_ICON, defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid", fillColor: `${TV_LINE_COLOR}26` }, create: (init) => new DateRange(init) });
registerDrawingType({ type: "pricerange", group: "measure", label: "Price Range", icon: PRICE_RANGE_ICON, defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: "solid", fillColor: `${TV_LINE_COLOR}26` }, create: (init) => new PriceRange(init) });
registerDrawingType({
  type: "arrowmarker",
  group: "shapes",
  label: "Arrow Marker",
  icon: ARROW_MARKER_ICON,
  coversSeries: true,
  // a marker pointing at a candle reads over it, like TradingView's
  // TradingView's arrow marker: one color, its blue 600 (the outline and the fill).
  defaultStyle: { lineColor: "#1e53e5", lineWidth: 2, lineStyle: "solid" },
  // palette-exempt: TradingView's blue 600
  create: (init) => new ArrowMarker(init)
});
var lettered = { group: "patterns", coversSeries: true, defaultStyle: SOLID };
var THREE_DRIVES_ICON = svg24('<path d="M3 19 6 13 8 15 12 8 14 11 18 4 21 12"/>');
registerDrawingType({
  type: "threedrives",
  label: "Three Drives Pattern",
  icon: THREE_DRIVES_ICON,
  ...lettered,
  defaultStyle: { lineColor: "#673ab7", lineWidth: 2, lineStyle: "solid" },
  // palette-exempt: TradingView's deep-blue-500
  create: (init) => new ThreeDrives(init)
});
registerDrawingType({
  type: "trianglepattern",
  label: "Triangle Pattern",
  icon: TRIANGLE_PATTERN_ICON,
  ...lettered,
  defaultStyle: { lineColor: "#673ab7", lineWidth: 2, lineStyle: "solid", fillColor: "#673ab726" },
  // palette-exempt: TradingView's deep-blue-500, background at 85 % transparency
  create: (init) => new TrianglePattern(init)
});
registerDrawingType({
  type: "elliotttriangle",
  label: "Elliott Triangle Wave (ABCDE)",
  icon: ELLIOTT_TRIANGLE_ICON,
  ...lettered,
  defaultStyle: { lineColor: "#FF9800", lineWidth: 2, lineStyle: "solid" },
  // palette-exempt: TradingView's Elliott triangle orange
  create: (init) => new ElliottTriangle(init)
});
registerDrawingType({
  type: "elliottdoublecombo",
  label: "Elliott Double Combo Wave (WXY)",
  icon: ELLIOTT_COMBO_ICON,
  ...lettered,
  defaultStyle: { lineColor: "#6aa84f", lineWidth: 2, lineStyle: "solid" },
  // palette-exempt: TradingView's Elliott combo green
  create: (init) => new ElliottDoubleCombo(init)
});
registerDrawingType({
  type: "elliotttriplecombo",
  label: "Elliott Triple Combo Wave (WXYXZ)",
  icon: ELLIOTT_COMBO_ICON,
  ...lettered,
  defaultStyle: { lineColor: "#6aa84f", lineWidth: 2, lineStyle: "solid" },
  // palette-exempt: TradingView's Elliott combo green
  create: (init) => new ElliottTripleCombo(init)
});
var PROJECTION_ICON = svg24('<path d="M4 20 18 6a10 10 0 0 1 2 10Z"/>');
var FORECAST_ICON = svg24('<path d="M3 18c6 0 12-2 17-12"/><circle cx="3" cy="18" r="1.6"/><circle cx="20" cy="6" r="1.6"/>');
registerDrawingType({
  type: "projection",
  group: "measure",
  label: "Projection",
  icon: PROJECTION_ICON,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid", fillColor: `${DEFAULT_DRAWING_COLOR}33` },
  create: (init) => new Projection(init)
});
registerDrawingType({
  type: "forecast",
  group: "measure",
  label: "Forecast",
  icon: FORECAST_ICON,
  coversSeries: true,
  // its plates over the candles like TradingView's
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: "solid" },
  create: (init) => new Forecast(init)
});
var BARS_PATTERN_ICON = svg24('<path d="M6 4v16M5 8h2v6H5zM12 6v12M11 9h2v5h-2zM18 3v14M17 6h2v7h-2z"/>');
registerDrawingType({
  type: "barspattern",
  group: "measure",
  label: "Bars Pattern",
  icon: BARS_PATTERN_ICON,
  coversSeries: true,
  // the copy reads over the candles it is compared with
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new BarsPattern(init)
});
var GHOST_FEED_ICON = svg24('<path d="M5 7v10M4 10h2v4H4zM10 5v10M9 7h2v5H9zM15 9v10M14 11h2v5h-2zM20 4v10M19 6h2v5h-2z" stroke-dasharray="2 1.5"/>');
registerDrawingType({
  type: "ghostfeed",
  group: "measure",
  label: "Ghost Feed",
  icon: GHOST_FEED_ICON,
  coversSeries: true,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "dashed" },
  create: (init) => new GhostFeed(init)
});
var ANCHORED_TEXT_ICON = svg24('<path d="M7 7h10M12 7v11"/><path d="M3 3h4M3 3v4M21 3h-4M21 3v4M3 21h4M3 21v-4M21 21h-4M21 21v-4"/>');
var ANCHORED_NOTE_ICON = svg24('<path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11Z"/><circle cx="12" cy="10" r="2"/><path d="M3 3h3M3 3v3M21 3h-3M21 3v3"/>');
registerDrawingType({
  type: "anchoredtext",
  group: "annotations",
  label: "Anchored Text",
  icon: ANCHORED_TEXT_ICON,
  coversSeries: true,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new AnchoredText(init)
});
registerDrawingType({
  type: "anchorednote",
  group: "annotations",
  label: "Anchored Note",
  icon: ANCHORED_NOTE_ICON,
  coversSeries: true,
  // TradingView's anchored note: the pin (Label) in its blue, like the note.
  defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new AnchoredNote(init)
});
var TABLE_ICON = svg24('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 10h18M3 14.5h18M9 5v14M15 5v14"/>');
registerDrawingType({
  type: "table",
  group: "annotations",
  label: "Table",
  icon: TABLE_ICON,
  coversSeries: true,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new TableDrawing(init)
});
var IMAGE_ICON = svg24('<rect x="3" y="5" width="18" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 3 3 3-4 5 6"/>');
registerDrawingType({
  type: "image",
  group: "annotations",
  label: "Image",
  icon: IMAGE_ICON,
  coversSeries: true,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new ImageDrawing(init)
});
var XPOST_ICON = svg24('<path d="M4 4l16 16M20 4 4 20" stroke-width="1.6"/>');
registerDrawingType({
  type: "xpost",
  group: "annotations",
  label: "Post",
  icon: XPOST_ICON,
  coversSeries: true,
  defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: "solid" },
  create: (init) => new XPostDrawing(init)
});
var DOUBLE_CURVE_ICON = svg24('<path d="M3 19C1 8 9 3 12 12s11 4 9-7"/>');
registerDrawingType({ type: "doublecurve", group: "shapes", label: "Double Curve", icon: DOUBLE_CURVE_ICON, defaultStyle: { lineColor: "#673ab7", lineWidth: 2, lineStyle: "solid", fillColor: "#673ab733" }, create: (init) => new DoubleCurve(init) });

// src/data/timeframe.ts
var NAMED_TF_MS = { D: 864e5, W: 6048e5, M: 2592e6 };
function timeframeToMs(timeframe) {
  const tf = timeframe.trim();
  if (NAMED_TF_MS[tf]) return NAMED_TF_MS[tf];
  const m = /^(\d+)\s*(s|m|h|d|w)?$/i.exec(tf);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = (m[2] ?? "m").toLowerCase();
    const mult = unit === "s" ? 1e3 : unit === "m" ? 6e4 : unit === "h" ? 36e5 : unit === "d" ? 864e5 : 6048e5;
    return n * mult;
  }
  return 36e5;
}

// src/chart-types/registry.ts
function normalizeSettingsRow(r) {
  switch (r.kind) {
    case "row":
      return { label: r.label, toggle: r.toggle, controls: r.controls, when: r.when };
    case "toggle": {
      const controls = [];
      if (r.number) controls.push({ kind: "number", ...r.number });
      for (const c of r.colors ?? []) controls.push({ kind: "color", ...c });
      if (r.width) controls.push({ kind: "width", ...r.width });
      return { label: r.label, toggle: { key: r.key, defval: r.defval }, controls, when: r.when };
    }
    case "number":
      return { label: r.label, controls: [{ kind: "number", key: r.key, label: r.label, defval: r.defval, min: r.min, max: r.max, step: r.step }], when: r.when };
    case "color":
      return { label: r.label, controls: [{ kind: "color", key: r.key, label: r.label, defval: r.defval }], when: r.when };
    case "select":
      return { label: r.label, controls: [{ kind: "select", key: r.key, label: r.label, options: r.options, defval: r.defval }], when: r.when };
    case "range":
      return {
        label: r.label,
        controls: [
          { kind: "number", key: r.minKey, label: `${r.label} \u2014 min`, defval: r.defval, min: r.min, max: r.max, step: r.step, placeholder: r.placeholder },
          { kind: "hint", text: "\u2013" },
          { kind: "number", key: r.maxKey, label: `${r.label} \u2014 max`, defval: r.defval, min: r.min, max: r.max, step: r.step, placeholder: r.placeholder }
        ],
        when: r.when
      };
  }
}
function settingsRowValueKeys(r) {
  if (r.kind === "heading" || r.kind === "header") return [];
  const n = normalizeSettingsRow(r);
  const keys = [];
  if (n.toggle) keys.push({ key: n.toggle.key, type: "boolean", defval: n.toggle.defval });
  for (const c of n.controls) {
    if (c.kind === "hint") continue;
    if (c.kind === "color" || c.kind === "select") keys.push({ key: c.key, type: "string", defval: c.defval });
    else keys.push({ key: c.key, type: "number", defval: c.defval });
  }
  return keys;
}
function settingsRowVisible(when, bag) {
  if (!when) return true;
  const conds = Array.isArray(when) ? when : [when];
  return conds.every((c) => c.anyOf ? c.anyOf.some((x) => x === bag[c.key]) : bag[c.key] === c.equals);
}
var registry = /* @__PURE__ */ new Map();
function registerChartType(def) {
  registry.set(def.id, def);
}
function unregisterChartType(id) {
  registry.delete(id);
}
function chartType(id) {
  return typeof id === "string" ? registry.get(id) : void 0;
}
function chartTypes() {
  return [...registry.values()];
}
function replacesSeries(id) {
  const def = chartType(id);
  return !!(def?.replacesSeries && def.dataEngine);
}
function tickerModifierIds() {
  return [...registry.values()].filter((d) => d.tickerModifier ?? d.barTransform != null).map((d) => d.id);
}

// src/core/renderer-defaults.ts
var defaults = /* @__PURE__ */ new Map();
function registerRendererDefaults(values) {
  const applied = Object.entries(values);
  for (const [key, value] of applied) defaults.set(key, value);
  return () => {
    for (const [key, value] of applied) if (defaults.get(key) === value) defaults.delete(key);
  };
}
function unregisterRendererDefaults(...keys) {
  if (keys.length === 0) defaults.clear();
  else for (const key of keys) defaults.delete(key);
}
function rendererDefaults() {
  return Object.fromEntries(defaults);
}

// src/renderers/shared/theme-tokens.ts
function applyChromeTokens(el, theme) {
  const write = (tokens) => {
    for (const key in tokens) el.style.setProperty(key, tokens[key]);
  };
  write(STATIC_TOKENS);
  write(themeTokens(theme));
}

// src/renderers/shared/chrome-tooltip.ts
var TIP_Z = "2147483000";
function attachChromeTooltip(anchor, opts) {
  let timer = null;
  let tip = null;
  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    tip?.remove();
    tip = null;
  };
  const show = () => {
    const text = opts.text();
    if (!text) return;
    const doc = anchor.ownerDocument;
    tip = doc.createElement("div");
    tip.textContent = vt(text);
    tip.style.cssText = `position:fixed;z-index:${TIP_Z};pointer-events:none;background:var(--vela-bg);border:1px solid var(--vela-border);color:var(--vela-fg);border-radius:var(--vela-radius-md);padding:4px 9px;box-shadow:var(--vela-shadow);font:var(--vela-font-size-md) var(--vela-font);` + (opts.wrap ? "max-width:min(260px,calc(100vw - 16px));" : "white-space:nowrap;");
    applyChromeTokens(tip, opts.theme());
    (doc.fullscreenElement ?? doc.body).appendChild(tip);
    const a = anchor.getBoundingClientRect();
    const vw = doc.documentElement.clientWidth;
    const vh = doc.documentElement.clientHeight;
    const w = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left;
    let top;
    if (opts.placement === "right") {
      left = a.right + 8;
      top = a.top + (a.height - th) / 2;
    } else {
      left = a.left;
      const below = a.bottom + 6;
      const above = a.top - th - 6;
      top = opts.placement === "above" ? above : below + th > vh - 4 && above >= 4 ? above : below;
    }
    tip.style.left = `${Math.max(4, Math.min(left, vw - w - 4))}px`;
    tip.style.top = `${Math.max(4, Math.min(top, vh - th - 4))}px`;
  };
  const arm = (e) => {
    if (e.pointerType !== "mouse" || pinned) return;
    clear();
    timer = window.setTimeout(show, opts.delayMs ?? 700);
  };
  let touchDown = false;
  let wasOpen = false;
  let pinned = false;
  let docListening = false;
  const offDoc = () => {
    if (!docListening) return;
    docListening = false;
    anchor.ownerDocument.removeEventListener("pointerdown", onDocDown, true);
  };
  const onDocDown = (e) => {
    if (e.target instanceof Node && anchor.contains(e.target)) return;
    offDoc();
    pinned = false;
    clear();
  };
  const down = (e) => {
    touchDown = e.pointerType !== "mouse";
    wasOpen = tip !== null;
    if (!opts.tapToOpen) clear();
  };
  const tap = (e) => {
    if (!opts.tapToOpen) return;
    e.preventDefault();
    e.stopPropagation();
    offDoc();
    if (wasOpen && (touchDown || pinned)) {
      pinned = false;
      clear();
      return;
    }
    if (!tip) {
      clear();
      show();
    }
    if (tip) {
      pinned = true;
      anchor.ownerDocument.addEventListener("pointerdown", onDocDown, true);
      docListening = true;
    }
  };
  const leave = () => {
    if (!pinned) clear();
  };
  anchor.addEventListener("pointerenter", arm);
  anchor.addEventListener("pointerleave", leave);
  anchor.addEventListener("pointerdown", down);
  anchor.addEventListener("click", tap);
  return () => {
    anchor.removeEventListener("pointerenter", arm);
    anchor.removeEventListener("pointerleave", leave);
    anchor.removeEventListener("pointerdown", down);
    anchor.removeEventListener("click", tap);
    offDoc();
    clear();
  };
}
function chromeHint(text, opts) {
  const px = opts.size ?? 16;
  const el = document.createElement("span");
  el.className = "vela-hint";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", vt(text));
  el.innerHTML = iconAt("info", px);
  el.style.cssText = `flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:${px}px;height:${px}px;border-radius:50%;cursor:help;user-select:none;background:var(--vela-hover);color:var(--vela-fg-muted);transition:background var(--vela-dur-fast) ease,color var(--vela-dur-fast) ease;`;
  const hover = (on) => {
    el.style.background = on ? "var(--vela-active)" : "var(--vela-hover)";
    el.style.color = on ? "var(--vela-fg-bright)" : "var(--vela-fg-muted)";
  };
  el.addEventListener("pointerenter", () => hover(true));
  el.addEventListener("pointerleave", () => hover(false));
  const dispose = attachChromeTooltip(el, { host: opts.host, theme: opts.theme, text: () => text, wrap: true, delayMs: 250, tapToOpen: true });
  return { el, dispose };
}

// src/core/model/inputs.ts
function inputVisible(when, values) {
  if (!when) return true;
  const conds = Array.isArray(when) ? when : [when];
  return conds.every((c) => c.anyOf ? c.anyOf.some((x) => x === values[c.key]) : values[c.key] === c.equals);
}
var inputMenuResolver = null;
function registerInputMenu(resolver) {
  inputMenuResolver = resolver;
}
function inputMenuFor(indicatorId, input, chartEl) {
  try {
    return inputMenuResolver?.(indicatorId, input, chartEl) ?? null;
  } catch {
    return null;
  }
}
function inputDeltas(schema, values) {
  const out = {};
  for (const s of schema) {
    const v = values[s.key];
    if (v !== void 0 && JSON.stringify(v) !== JSON.stringify(s.defval)) out[s.key] = v;
  }
  return Object.keys(out).length > 0 ? out : void 0;
}

// src/core/timezones.ts
var TIMEZONES = [
  { value: "Etc/UTC", label: "UTC" },
  { value: "Etc/GMT+12", label: "International Date Line West" },
  { value: "Pacific/Pago_Pago", label: "Pago Pago" },
  { value: "Pacific/Honolulu", label: "Honolulu" },
  { value: "Pacific/Marquesas", label: "Marquesas Islands" },
  { value: "America/Anchorage", label: "Anchorage" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
  { value: "America/Phoenix", label: "Phoenix" },
  { value: "America/Denver", label: "Denver" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Bogota", label: "Bogot\xE1" },
  { value: "America/Caracas", label: "Caracas" },
  { value: "America/Santiago", label: "Santiago" },
  { value: "America/St_Johns", label: "St. John's" },
  { value: "America/Sao_Paulo", label: "S\xE3o Paulo" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { value: "America/Noronha", label: "Fernando de Noronha" },
  { value: "Atlantic/Azores", label: "Azores" },
  { value: "Atlantic/Reykjavik", label: "Reykjavik" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Athens", label: "Athens" },
  { value: "Africa/Cairo", label: "Cairo" },
  { value: "Africa/Johannesburg", label: "Johannesburg" },
  { value: "Europe/Moscow", label: "Moscow" },
  { value: "Europe/Istanbul", label: "Istanbul" },
  { value: "Asia/Tehran", label: "Tehran" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kabul", label: "Kabul" },
  { value: "Asia/Karachi", label: "Karachi" },
  { value: "Asia/Kolkata", label: "Mumbai" },
  { value: "Asia/Kathmandu", label: "Kathmandu" },
  { value: "Asia/Dhaka", label: "Dhaka" },
  { value: "Asia/Yangon", label: "Yangon" },
  { value: "Asia/Bangkok", label: "Bangkok" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Australia/Eucla", label: "Eucla" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Seoul", label: "Seoul" },
  { value: "Australia/Adelaide", label: "Adelaide" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Australia/Lord_Howe", label: "Lord Howe Island" },
  { value: "Pacific/Noumea", label: "Noum\xE9a" },
  { value: "Pacific/Auckland", label: "Auckland" },
  { value: "Pacific/Chatham", label: "Chatham Islands" },
  { value: "Pacific/Apia", label: "Apia" },
  { value: "Pacific/Kiritimati", label: "Kiritimati" }
];
var EXCHANGE_TIMEZONE = "exchange";
function isExchangeTimezone(zone) {
  return zone === EXCHANGE_TIMEZONE;
}
function resolveTimezone(zone, exchangeZone) {
  if (!isExchangeTimezone(zone)) return zone;
  return exchangeZone && exchangeZone !== "" ? exchangeZone : "Etc/UTC";
}
function normalizeTimezone(zone) {
  return zone === "UTC" || zone === "Etc/UTC" || zone === "Etc/GMT" ? "Etc/UTC" : zone;
}
function timezoneMenuRows(current) {
  const active = normalizeTimezone(current);
  const [utc, ...zones] = TIMEZONES.map((t) => ({ value: t.value, label: tzMenuLabel(t.value, t.label), checked: t.value === active }));
  return [utc, { value: EXCHANGE_TIMEZONE, label: "Exchange", checked: isExchangeTimezone(current) }, ...zones];
}
function tzOffset(zone, date = /* @__PURE__ */ new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(date);
    const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    const m = raw.match(/GMT(?:(\+|-)(\d{1,2})(?::(\d{2}))?)?/);
    if (!m || !m[1]) return "UTC";
    const sign = m[1] === "-" ? "-" : "+";
    const hrs = m[2] ?? "0";
    const mins = m[3] ?? "";
    return mins ? `UTC${sign}${hrs}:${mins}` : `UTC${sign}${hrs}`;
  } catch {
    return "UTC";
  }
}
function tzMenuLabel(zone, location) {
  if (normalizeTimezone(zone) === "Etc/UTC") return location;
  return `(${tzOffset(zone)}) ${location}`;
}
function tzButtonLabel(zone) {
  if (normalizeTimezone(zone) === "Etc/UTC") return "UTC";
  return tzOffset(zone);
}

// src/renderers/native/layers.ts
function foldBaseModulation(acc, next) {
  if (next == null) return acc;
  if (acc == null) return { ...next };
  return {
    candleBodyScale: minOpt(acc.candleBodyScale, next.candleBodyScale),
    candleBodyAlpha: minOpt(acc.candleBodyAlpha, next.candleBodyAlpha),
    gridAlpha: minOpt(acc.gridAlpha, next.gridAlpha)
  };
}
function minOpt(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}
var registry2 = /* @__PURE__ */ new Map();
function registerRendererLayer(def) {
  registry2.set(def.id, def);
}
function unregisterRendererLayer(id) {
  registry2.delete(id);
}
function rendererLayers() {
  return [...registry2.values()];
}

// src/core/plot-right-inset.ts
var providers = /* @__PURE__ */ new Set();
function registerPlotRightInset(fn) {
  providers.add(fn);
  return () => {
    providers.delete(fn);
  };
}
function plotRightInset(canvas) {
  let v = 0;
  for (const fn of providers) {
    try {
      const n = fn(canvas);
      if (Number.isFinite(n) && n > v) v = n;
    } catch {
    }
  }
  return v;
}

// src/core/native-indicators/volume/VolumeIndicator.ts
var DEFAULT_UP = BULLISH;
var DEFAULT_DOWN = BEARISH;
var DEFAULT_HEIGHT_PCT = 20;
function num2(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function str2(v, fallback) {
  return typeof v === "string" && v !== "" ? v : fallback;
}
function volumeLayerData(inputs) {
  return {
    upColor: str2(inputs.upColor, DEFAULT_UP),
    downColor: str2(inputs.downColor, DEFAULT_DOWN),
    heightFrac: Math.min(0.5, Math.max(0.05, num2(inputs.heightPct, DEFAULT_HEIGHT_PCT) / 100))
  };
}
var VolumeIndicator = class {
  constructor() {
    /** Null until start() — pre-start setInputs/resume must record without pushing. */
    this.ctx = null;
    this.inputs = {};
  }
  start(ctx, inputs) {
    this.ctx = ctx;
    this.inputs = inputs;
    ctx.emit({});
    ctx.pushData(volumeLayerData(inputs));
  }
  /** The layer reads the live bar array directly — nothing to recompute here. */
  onBars() {
  }
  /** Visible-range normalization happens per frame in the layer. */
  onViewport() {
  }
  setInputs(inputs) {
    this.inputs = inputs;
    this.ctx?.pushData(volumeLayerData(inputs));
  }
  /** Hiding is a renderer-layer flag (set via `setIndicatorVisible`); no resources to free. */
  suspend() {
  }
  resume() {
    this.ctx?.pushData(volumeLayerData(this.inputs));
  }
  stop() {
  }
};
var volumeDescriptor = {
  type: "volume",
  title: "Volume",
  paneHint: "price",
  overlay: true,
  inputsSchema: () => [
    { key: "upColor", title: "Up color", type: "color", defval: DEFAULT_UP },
    { key: "downColor", title: "Down color", type: "color", defval: DEFAULT_DOWN },
    { key: "heightPct", title: "Height %", type: "int", defval: DEFAULT_HEIGHT_PCT, min: 5, max: 50, step: 1, tooltip: "Pane height the tallest visible bar occupies" }
  ],
  defaultInputs: () => ({ upColor: DEFAULT_UP, downColor: DEFAULT_DOWN, heightPct: DEFAULT_HEIGHT_PCT }),
  create: () => new VolumeIndicator()
};
function registerVolume() {
  if (!getNativeIndicator(volumeDescriptor.type)) registerNativeIndicator(volumeDescriptor);
}

// src/core/model/identity.ts
function stableSeriesId(parts) {
  const normTitle = parts.title.trim().toLowerCase().replace(/\s+/g, "-");
  return `${parts.instanceId}:${parts.kind}:${normTitle}#${parts.ordinal}`;
}

// src/core/native-indicators/classics/math.ts
var SOURCES = ["Close", "Open", "High", "Low", "HL2", "HLC3", "OHLC4", "HLCC4"];
function sourceValues(bars, source2) {
  const out = new Array(bars.length);
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    switch (source2) {
      case "Open":
        out[i] = b.open;
        break;
      case "High":
        out[i] = b.high;
        break;
      case "Low":
        out[i] = b.low;
        break;
      case "HL2":
        out[i] = (b.high + b.low) / 2;
        break;
      case "HLC3":
        out[i] = (b.high + b.low + b.close) / 3;
        break;
      case "OHLC4":
        out[i] = (b.open + b.high + b.low + b.close) / 4;
        break;
      case "HLCC4":
        out[i] = (b.high + b.low + b.close + b.close) / 4;
        break;
      default:
        out[i] = b.close;
    }
  }
  return out;
}
function volumes(bars) {
  return bars.map((b) => b.volume != null && Number.isFinite(b.volume) ? b.volume : Number.NaN);
}
function highs(bars) {
  return bars.map((b) => b.high);
}
function lows(bars) {
  return bars.map((b) => b.low);
}
function closes(bars) {
  return bars.map((b) => b.close);
}
function opens(bars) {
  return bars.map((b) => b.open);
}
function zip(a, b, f) {
  const out = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    out[i] = Number.isFinite(x) && Number.isFinite(y) ? f(x, y) : Number.NaN;
  }
  return out;
}
function map(a, f) {
  const out = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    out[i] = Number.isFinite(x) ? f(x) : Number.NaN;
  }
  return out;
}
function sub(a, b) {
  return zip(a, b, (x, y) => x - y);
}
function windowed(v, len, fold) {
  const out = new Array(v.length).fill(Number.NaN);
  if (len <= 0) return out;
  let run = 0;
  for (let i = 0; i < v.length; i++) {
    run = Number.isFinite(v[i]) ? run + 1 : 0;
    if (run >= len) out[i] = fold(v, i - len + 1, i);
  }
  return out;
}
function sum(v, len) {
  return windowed(v, len, (w, from, to) => {
    let s = 0;
    for (let k = from; k <= to; k++) s += w[k];
    return s;
  });
}
function sma(v, len) {
  return windowed(v, len, (w, from, to) => {
    let s = 0;
    for (let k = from; k <= to; k++) s += w[k];
    return s / len;
  });
}
function wma(v, len) {
  const norm = len * (len + 1) / 2;
  return windowed(v, len, (w, from, to) => {
    let s = 0;
    for (let k = from; k <= to; k++) s += w[k] * (k - from + 1);
    return s / norm;
  });
}
function vwma(src, vol, len) {
  const pv = zip(src, vol, (p, q) => p * q);
  return zip(sum(pv, len), sum(vol, len), (a, b) => b > 0 ? a / b : Number.NaN);
}
function stdev(v, len) {
  return windowed(v, len, (w, from, to) => {
    let s = 0;
    for (let k = from; k <= to; k++) s += w[k];
    const mean = s / len;
    let sq = 0;
    for (let k = from; k <= to; k++) {
      const d = w[k] - mean;
      sq += d * d;
    }
    return Math.sqrt(sq / len);
  });
}
function meanDev(v, len) {
  return windowed(v, len, (w, from, to) => {
    let s = 0;
    for (let k = from; k <= to; k++) s += w[k];
    const mean = s / len;
    let dev = 0;
    for (let k = from; k <= to; k++) dev += Math.abs(w[k] - mean);
    return dev / len;
  });
}
function highest(v, len) {
  return windowed(v, len, (w, from, to) => {
    let m = -Infinity;
    for (let k = from; k <= to; k++) if (w[k] > m) m = w[k];
    return m;
  });
}
function lowest(v, len) {
  return windowed(v, len, (w, from, to) => {
    let m = Infinity;
    for (let k = from; k <= to; k++) if (w[k] < m) m = w[k];
    return m;
  });
}
function barsSinceHighest(v, len) {
  return windowed(v, len, (w, from, to) => {
    let m = -Infinity;
    let at = to;
    for (let k = from; k <= to; k++) {
      if (w[k] >= m) {
        m = w[k];
        at = k;
      }
    }
    return to - at;
  });
}
function barsSinceLowest(v, len) {
  return windowed(v, len, (w, from, to) => {
    let m = Infinity;
    let at = to;
    for (let k = from; k <= to; k++) {
      if (w[k] <= m) {
        m = w[k];
        at = k;
      }
    }
    return to - at;
  });
}
function recursive(v, len, alpha) {
  const out = new Array(v.length).fill(Number.NaN);
  let run = 0;
  let prev = Number.NaN;
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (!Number.isFinite(x)) {
      run = 0;
      prev = Number.NaN;
      continue;
    }
    run += 1;
    if (Number.isFinite(prev)) {
      prev = alpha * x + (1 - alpha) * prev;
      out[i] = prev;
    } else if (run >= len) {
      let s = 0;
      for (let k = i - len + 1; k <= i; k++) s += v[k];
      prev = s / len;
      out[i] = prev;
    }
  }
  return out;
}
function ema(v, len) {
  return recursive(v, len, 2 / (len + 1));
}
function rma(v, len) {
  return recursive(v, len, 1 / len);
}
function change(v, n = 1) {
  const out = new Array(v.length).fill(Number.NaN);
  for (let i = n; i < v.length; i++) {
    const a = v[i];
    const b = v[i - n];
    if (Number.isFinite(a) && Number.isFinite(b)) out[i] = a - b;
  }
  return out;
}
function roc(v, len) {
  const out = new Array(v.length).fill(Number.NaN);
  for (let i = len; i < v.length; i++) {
    const a = v[i];
    const b = v[i - len];
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) out[i] = 100 * (a - b) / b;
  }
  return out;
}
function shift(v, n) {
  const out = new Array(v.length).fill(Number.NaN);
  for (let i = 0; i < v.length; i++) {
    const j = i - n;
    if (j >= 0 && j < v.length) out[i] = v[j];
  }
  return out;
}
function trueRange(bars) {
  const out = new Array(bars.length).fill(Number.NaN);
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (i === 0) {
      out[i] = b.high - b.low;
      continue;
    }
    const pc = bars[i - 1].close;
    out[i] = Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
  }
  return out;
}
function atr(bars, len) {
  return rma(trueRange(bars), len);
}
function rsi(v, len) {
  const d = change(v);
  const up = map(d, (x) => Math.max(x, 0));
  const dn = map(d, (x) => Math.max(-x, 0));
  return zip(rma(up, len), rma(dn, len), (u, w) => w === 0 ? 100 : 100 - 100 / (1 + u / w));
}
function stoch(v, hi, lo, len) {
  const hh = highest(hi, len);
  const ll = lowest(lo, len);
  const out = new Array(v.length).fill(Number.NaN);
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    const h = hh[i];
    const l = ll[i];
    if (!Number.isFinite(x) || !Number.isFinite(h) || !Number.isFinite(l)) continue;
    out[i] = h === l ? 50 : 100 * (x - l) / (h - l);
  }
  return out;
}
function linreg(v, len, offset = 0) {
  const sx = (len - 1) * len / 2;
  const sxx = (len - 1) * len * (2 * len - 1) / 6;
  const denom = len * sxx - sx * sx;
  return windowed(v, len, (w, from, to) => {
    let sy = 0;
    let sxy = 0;
    for (let k = from; k <= to; k++) {
      const x = k - from;
      sy += w[k];
      sxy += x * w[k];
    }
    const slope = denom === 0 ? 0 : (len * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / len;
    return intercept + slope * (len - 1 - offset);
  });
}
function hma(v, len) {
  const n = Math.max(2, Math.trunc(len));
  const raw = sub(map(wma(v, Math.max(1, Math.trunc(n / 2))), (x) => 2 * x), wma(v, n));
  return wma(raw, Math.max(1, Math.round(Math.sqrt(n))));
}
function alma(v, len, offset, sigma) {
  const m = offset * (len - 1);
  const s = len / Math.max(sigma, 1e-9);
  const weights = new Array(len);
  let norm = 0;
  for (let i = 0; i < len; i++) {
    const d = i - m;
    const w = Math.exp(-(d * d) / (2 * s * s));
    weights[i] = w;
    norm += w;
  }
  return windowed(v, len, (win, from, to) => {
    let acc = 0;
    for (let k = from; k <= to; k++) acc += win[k] * weights[k - from];
    return norm === 0 ? Number.NaN : acc / norm;
  });
}
function dema(v, len) {
  const e1 = ema(v, len);
  return sub(map(e1, (x) => 2 * x), ema(e1, len));
}
function tema(v, len) {
  const e1 = ema(v, len);
  const e2 = ema(e1, len);
  const e3 = ema(e2, len);
  return zip(zip(map(e1, (x) => 3 * x), map(e2, (x) => 3 * x), (a, b) => a - b), e3, (a, b) => a + b);
}
function kama(v, len, fastAlpha = 2 / 3, slowAlpha = 2 / 31) {
  const direction = map(change(v, len), Math.abs);
  const volatility = sum(map(change(v), Math.abs), len);
  const out = new Array(v.length).fill(Number.NaN);
  let prev = Number.NaN;
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (!Number.isFinite(x)) continue;
    const d = direction[i];
    const w = volatility[i];
    if (!Number.isFinite(d) || !Number.isFinite(w)) {
      prev = Number.isFinite(prev) ? prev : x;
      out[i] = prev;
      continue;
    }
    const er = w === 0 ? 0 : d / w;
    const sc = (er * (fastAlpha - slowAlpha) + slowAlpha) ** 2;
    prev = Number.isFinite(prev) ? prev + sc * (x - prev) : x;
    out[i] = prev;
  }
  return out;
}
function mcginley(v, len) {
  const out = new Array(v.length).fill(Number.NaN);
  let prev = Number.NaN;
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (!Number.isFinite(x)) continue;
    if (!Number.isFinite(prev)) {
      prev = x;
    } else {
      const ratio = prev === 0 ? 0 : x / prev;
      const denom = len * ratio ** 4;
      prev += denom === 0 ? 0 : (x - prev) / denom;
    }
    out[i] = prev;
  }
  return out;
}
function hamming(v, len, a0 = 0.54, a1 = 0.46) {
  if (len <= 1) return v.map((x) => Number.isFinite(x) ? x : Number.NaN);
  const weights = new Array(len);
  let norm = 0;
  for (let i = 0; i < len; i++) {
    const w = a0 - a1 * Math.cos(2 * Math.PI * i / (len - 1));
    weights[i] = w;
    norm += w;
  }
  return windowed(v, len, (win, from, to) => {
    let acc = 0;
    for (let k = from; k <= to; k++) acc += win[k] * weights[to - k];
    return norm === 0 ? Number.NaN : acc / norm;
  });
}
function cmo(v, len) {
  const d = change(v);
  const up = sum(map(d, (x) => Math.max(x, 0)), len);
  const dn = sum(map(d, (x) => Math.max(-x, 0)), len);
  return zip(up, dn, (u, w) => u + w === 0 ? 0 : 100 * (u - w) / (u + w));
}
function swma(v) {
  const out = new Array(v.length).fill(Number.NaN);
  for (let i = 3; i < v.length; i++) {
    const a = v[i - 3];
    const b = v[i - 2];
    const c = v[i - 1];
    const d = v[i];
    if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(d)) {
      out[i] = (a + 2 * b + 2 * c + d) / 6;
    }
  }
  return out;
}
function percentRank(v, len) {
  const out = new Array(v.length).fill(Number.NaN);
  for (let i = len; i < v.length; i++) {
    const x = v[i];
    if (!Number.isFinite(x)) continue;
    let below = 0;
    let count = 0;
    for (let k = i - len; k < i; k++) {
      const y = v[k];
      if (!Number.isFinite(y)) {
        count = -1;
        break;
      }
      count += 1;
      if (y <= x) below += 1;
    }
    if (count === len) out[i] = 100 * below / len;
  }
  return out;
}
function cumSum(v) {
  const out = new Array(v.length).fill(Number.NaN);
  let acc = 0;
  let seen = false;
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (Number.isFinite(x)) {
      acc += x;
      seen = true;
    }
    if (seen) out[i] = acc;
  }
  return out;
}

// src/core/native-indicators/classics/define.ts
var MARKER_STYLE = {
  triangleup: "triangleup",
  triangledown: "triangledown",
  arrowUp: "arrowup",
  arrowDown: "arrowdown",
  circle: "circle",
  square: "square",
  diamond: "diamond",
  cross: "cross",
  xcross: "xcross",
  flag: "flag"
};
function num3(inputs, key, fallback) {
  const v = inputs[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function str3(inputs, key, fallback) {
  const v = inputs[key];
  return typeof v === "string" && v !== "" ? v : fallback;
}
function bool(inputs, key, fallback) {
  const v = inputs[key];
  return typeof v === "boolean" ? v : fallback;
}
function toPoints(bars, values, colors) {
  const n = bars.length;
  const len = Math.max(n, Math.min(values.length, n + 5e3));
  const step = n > 1 ? bars[n - 1].time - bars[n - 2].time : 6e4;
  const pts = new Array(len);
  for (let i = 0; i < len; i++) {
    const v = values[i];
    const time = i < n ? bars[i].time : bars[n - 1].time + (i - n + 1) * step;
    const p = { time, value: v != null && Number.isFinite(v) ? v : null };
    const c = colors?.[i];
    if (c != null) p.color = c;
    pts[i] = p;
  }
  return pts;
}
var ClassicIndicator = class {
  constructor(spec) {
    this.spec = spec;
    /** Null until start() — a pre-start setInputs must record without computing. */
    this.ctx = null;
    this.inputs = {};
  }
  start(ctx, inputs) {
    this.ctx = ctx;
    this.inputs = inputs;
    this.recompute();
  }
  onBars() {
    this.recompute();
  }
  onViewport() {
  }
  setInputs(inputs) {
    this.inputs = inputs;
    if (!this.ctx) return;
    this.recompute();
  }
  /** Nothing to free — the compute reads the live bar accessor on demand. */
  suspend() {
  }
  resume() {
    this.recompute();
  }
  stop() {
  }
  recompute() {
    if (!this.ctx) return;
    const bars = this.ctx.bars();
    const out = this.spec.compute(bars, this.inputs, this.ctx.periodBars?.() ?? null);
    const instanceId = this.spec.type;
    const series = [];
    const idsByKey = /* @__PURE__ */ new Map();
    out.plots.forEach((plot, ordinal) => {
      const kind = plot.kind ?? "line";
      const id = stableSeriesId({ instanceId, kind, title: plot.title, ordinal });
      idsByKey.set(plot.key, id);
      series.push({
        id,
        title: plot.title,
        paneId: "",
        // stamped by the orchestrator
        kind,
        points: toPoints(bars, plot.values, plot.colors),
        style: {
          color: plot.color,
          width: plot.width ?? 1,
          lineStyle: plot.lineStyle ?? "solid",
          ...plot.base != null ? { base: plot.base } : {}
        },
        ...plot.overlay ? { overlay: true } : {},
        ...plot.palette ? { palette: [...plot.palette] } : {},
        ...plot.styleOff ? { styleOff: true } : {},
        ...plot.display ? { display: plot.display } : {}
      });
    });
    if (out.markers && out.markers.length > 0) {
      series.push({
        id: stableSeriesId({ instanceId, kind: "markers", title: "markers", ordinal: 0 }),
        title: this.spec.shortTitle ?? this.spec.title,
        paneId: "",
        kind: "markers",
        markers: out.markers
      });
    }
    const fills = (out.bands ?? []).flatMap((band, ordinal) => {
      const from = idsByKey.get(band.from);
      const to = idsByKey.get(band.to);
      if (!from || !to) return [];
      return [
        {
          id: stableSeriesId({ instanceId, kind: "fill", title: band.key, ordinal }),
          paneId: "",
          fromSeriesId: from,
          toSeriesId: to,
          color: band.color,
          ...band.title ? { title: band.title } : {},
          ...band.colors ? { colors: [...band.colors] } : {},
          ...band.palette ? { palette: [...band.palette] } : {},
          ...band.gradient ? { gradient: [...band.gradient] } : {}
        }
      ];
    });
    const priceLines = (out.levels ?? []).map((level2, ordinal) => ({
      id: stableSeriesId({ instanceId, kind: "hline", title: level2.key, ordinal }),
      paneId: "",
      price: level2.price,
      ...level2.color != null ? { color: level2.color } : {},
      lineStyle: level2.lineStyle ?? "dashed",
      width: level2.width ?? 1,
      ...level2.title != null ? { title: level2.title } : {}
    }));
    const polylines = (out.polylines ?? []).map((poly, ordinal) => {
      const { key, ...rest } = poly;
      return {
        id: stableSeriesId({ instanceId, kind: "polyline", title: key, ordinal }),
        paneId: "",
        ...rest
      };
    });
    const labels = (out.markers ?? []).map((m, ordinal) => ({
      id: stableSeriesId({ instanceId, kind: "label", title: "marker", ordinal }),
      paneId: "",
      xloc: "bar_time",
      x: m.time,
      y: Number.NaN,
      yloc: m.position === "aboveBar" ? "abovebar" : m.position === "belowBar" ? "belowbar" : "price",
      style: MARKER_STYLE[m.shape] ?? "circle",
      color: m.color,
      size: m.size ?? "tiny",
      textAlign: "center",
      fontFamily: "default",
      ...m.text ? { text: m.text, textColor: m.color } : {}
    }));
    const statusInputs = this.spec.tv ? statusText(this.spec, this.inputs) : "";
    this.ctx.emit({ series, fills, priceLines, polylines, ...labels.length ? { labels } : {}, ...statusInputs ? { statusInputs } : {} });
    this.ctx.setStatus("idle");
  }
};
function statusText(spec, inputs) {
  const keys = spec.tv?.statusKeys;
  const parts = [];
  for (const inp of spec.inputs) {
    if (keys ? !keys.includes(inp.key) : inp.type === "bool" || inp.type === "color" || inp.tab === "Style") continue;
    const v = inputs[inp.key] ?? inp.defval;
    if (v === void 0 || v === null || v === "") continue;
    const isSource = inp.type === "source" || (inp.options?.includes("HLC3") ?? false);
    parts.push(isSource ? String(v).toLowerCase() : String(v));
  }
  return parts.join(" ");
}
function classicDescriptor(spec) {
  return {
    type: spec.type,
    title: spec.title,
    ...spec.shortTitle != null ? { shortTitle: spec.shortTitle } : {},
    paneHint: spec.overlay ? "price" : "new",
    overlay: spec.overlay,
    // Studies stack (a 20 and a 200 moving average side by side) — unlike the layer-backed natives.
    multiInstance: true,
    ...spec.tv ? { styleTab: true } : {},
    inputsSchema: () => spec.inputs,
    defaultInputs: () => Object.fromEntries(spec.inputs.map((i) => [i.key, i.defval])),
    create: () => new ClassicIndicator(spec)
  };
}

// src/core/native-indicators/classics/shared.ts
var SETTINGS = "Settings";
var STYLE = "Style";
function lengthInput(defval, key = "length", title = "Length", max = 5e3, tooltip) {
  return { key, title, type: "int", defval, min: 1, max, step: 1, group: SETTINGS, ...tooltip != null ? { tooltip } : {} };
}
function intInput(key, title, defval, min = 1, max = 5e3, tooltip) {
  return { key, title, type: "int", defval, min, max, step: 1, group: SETTINGS, ...tooltip != null ? { tooltip } : {} };
}
function floatInput(key, title, defval, min = 0, max = 1e3, step = 0.1, tooltip) {
  return { key, title, type: "float", defval, min, max, step, group: SETTINGS, ...tooltip != null ? { tooltip } : {} };
}
function boolInput(key, title, defval, group = SETTINGS, tooltip) {
  return { key, title, type: "bool", defval, group, ...tooltip != null ? { tooltip } : {} };
}
function optionInput(key, title, defval, options, tooltip) {
  return { key, title, type: "string", defval, options, group: SETTINGS, ...tooltip != null ? { tooltip } : {} };
}
function sourceInput(defval = "Close", key = "source", title = "Source", tooltip) {
  return { key, title, type: "string", defval, options: SOURCES, group: SETTINGS, ...tooltip != null ? { tooltip } : {} };
}
function colorInput(defval = INFO, title = "Color", key = "color", tooltip) {
  return { key, title, type: "color", defval, group: STYLE, ...tooltip != null ? { tooltip } : {} };
}
function widthInput(defval = 2, key = "lineWidth", title = "Line Width") {
  return { key, title, type: "int", defval, min: 1, max: 5, step: 1, group: STYLE, tooltip: "Width of the plotted line, in pixels." };
}
function transp(hex, transparency) {
  return withAlpha(hex, (100 - transparency) / 100);
}
function withAlpha(hex, alpha = 0.08) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, "0");
  return `#${m[1]}${a}`;
}
function channelStyleInputs(basisTitle = "Basis") {
  return [
    colorInput(BULLISH, "Bullish", "bullColor", "Color of the lower band and of the basis while price holds above it."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the upper band and of the basis while price sits below it."),
    colorInput(NEUTRAL, basisTitle, "basisColor", "Color of the basis line while price sits exactly on it.")
  ];
}
function directionalChannel(bars, basis, upper, lower, ink, key) {
  const basisColors = basis.map((b, i) => {
    if (!Number.isFinite(b)) return null;
    const c = bars[i].close;
    return c > b ? ink.bull : c < b ? ink.bear : ink.neutral;
  });
  const wash = upper.map((u, i) => {
    const l = lower[i];
    if (!Number.isFinite(u) || !Number.isFinite(l)) return null;
    return { topValue: u, bottomValue: l, topColor: transp(ink.bear, 90), bottomColor: transp(ink.bull, 90) };
  });
  return {
    plots: [
      { key: "basis", title: "Basis", values: [...basis], color: ink.neutral, colors: basisColors },
      { key: "upper", title: "Upper", values: [...upper], color: transp(ink.bear, 30) },
      { key: "lower", title: "Lower", values: [...lower], color: transp(ink.bull, 30) }
    ],
    bands: [{ key, from: "upper", to: "lower", color: transp(NEUTRAL, 90), gradient: wash }]
  };
}
function anchorPlot(key, title, length, level2) {
  return {
    key,
    title,
    values: new Array(length).fill(level2),
    color: transp(NEUTRAL, 100),
    display: { pane: false, legend: false, dataWindow: false }
  };
}
function thresholdZones(length, levels, ink, transparency = 92) {
  return {
    plots: [
      anchorPlot("obAnchor", "Overbought Anchor", length, levels.overbought),
      anchorPlot("osAnchor", "Oversold Anchor", length, levels.oversold),
      anchorPlot("topAnchor", "Top Anchor", length, levels.top),
      anchorPlot("bottomAnchor", "Bottom Anchor", length, levels.bottom)
    ],
    bands: [
      { key: "obZone", from: "obAnchor", to: "topAnchor", color: transp(ink.overbought, transparency) },
      { key: "osZone", from: "osAnchor", to: "bottomAnchor", color: transp(ink.oversold, transparency) }
    ]
  };
}
function rampColors(values, levels, ink) {
  return values.map((x) => {
    if (!Number.isFinite(x)) return null;
    return x <= levels.mid ? gradient(x, levels.low, levels.mid, ink.low, ink.mid) : gradient(x, levels.mid, levels.high, ink.mid, ink.high);
  });
}
function baselineGradient(values, baseline, inkOf, valueTransparency = 50, baseTransparency = 100) {
  return values.map((x, i) => {
    if (!Number.isFinite(x)) return null;
    const ink = inkOf(x, i);
    const above = x > baseline;
    return {
      topValue: Math.max(x, baseline),
      bottomValue: Math.min(x, baseline),
      topColor: transp(ink, above ? valueTransparency : baseTransparency),
      bottomColor: transp(ink, above ? baseTransparency : valueTransparency)
    };
  });
}
function momentumColumnColors(values, ink) {
  return values.map((x, i) => {
    if (!Number.isFinite(x)) return null;
    const prev = i > 0 && Number.isFinite(values[i - 1]) ? values[i - 1] : x;
    const rising = x > prev;
    if (x >= 0) return rising ? ink.growAbove : ink.fallAbove;
    return rising ? ink.growBelow : ink.fallBelow;
  });
}
function boundedOscillator(opts) {
  const mid = (opts.overbought + opts.oversold) / 2;
  const ramp = rampColors(opts.values, { low: opts.oversold, mid, high: opts.overbought }, opts.ink);
  const zones = thresholdZones(
    opts.values.length,
    { overbought: opts.overbought, oversold: opts.oversold, top: opts.scale.top, bottom: opts.scale.bottom },
    { overbought: opts.ink.high, oversold: opts.ink.low },
    opts.zoneTransparency
  );
  const plots = [{ key: opts.key, title: opts.title, values: opts.values, color: opts.ink.mid, width: opts.width ?? 1, colors: ramp }, ...zones.plots];
  const bands = [...zones.bands];
  if (opts.bandFill != null) bands.push({ key: "band", from: "obAnchor", to: "osAnchor", color: opts.bandFill });
  if (opts.midpointWash) {
    plots.push(anchorPlot("midAnchor", "Midpoint Anchor", opts.values.length, mid));
    bands.push({ key: "wash", from: opts.key, to: "midAnchor", color: transp(NEUTRAL, 100), gradient: baselineGradient(opts.values, mid, (_x, i) => ramp[i] ?? opts.ink.mid) });
  }
  const levels = [
    { key: "overbought", price: opts.overbought, color: opts.levelInk, lineStyle: "dashed", title: opts.levelTitles?.overbought ?? "Overbought" },
    { key: "oversold", price: opts.oversold, color: opts.levelInk, lineStyle: "dashed", title: opts.levelTitles?.oversold ?? "Oversold" }
  ];
  if (opts.midline != null) levels.splice(1, 0, { key: "midline", price: opts.midline, color: opts.levelInk, lineStyle: "dotted", title: "Midline" });
  return { plots, bands, levels };
}
function centeredOscillator(opts) {
  const baseline = opts.baseline ?? 0;
  const inkOf = (x) => x > baseline ? opts.ink.bull : x < baseline ? opts.ink.bear : opts.ink.neutral;
  const plots = [
    { key: opts.key, title: opts.title, values: opts.values, color: opts.ink.neutral, width: opts.width ?? 1, colors: opts.values.map((x) => Number.isFinite(x) ? inkOf(x) : null) },
    ...opts.extraPlots ?? []
  ];
  const bands = [];
  if (opts.fill !== false) {
    plots.push(anchorPlot("baseline", "Baseline Anchor", opts.values.length, baseline));
    bands.push({ key: "wash", from: opts.key, to: "baseline", color: transp(NEUTRAL, 100), gradient: baselineGradient(opts.values, baseline, inkOf, opts.valueTransparency) });
  }
  return {
    plots,
    bands,
    levels: [{ key: "zero", price: baseline, color: opts.zeroInk, lineStyle: opts.zeroLineStyle ?? "dashed", title: opts.zeroTitle ?? "Zero Line" }, ...opts.extraLevels ?? []]
  };
}
function channels(hex) {
  const m = /^#([0-9a-f]{6})/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function gradient(value, low, high, from, to) {
  const a = channels(from);
  const b = channels(to);
  if (!a || !b || !Number.isFinite(value)) return from;
  const span = high - low;
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (value - low) / span));
  const mix = (i) => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, "0");
  return `#${mix(0)}${mix(1)}${mix(2)}`;
}
var SMOOTHING_TYPES = ["None", "SMA", "SMA + Bollinger Bands", "EMA", "SMMA (RMA)", "WMA", "VWMA"];
function smoothingInputs(of) {
  return [
    optionInput("smoothingType", "Smoothing Type", "None", SMOOTHING_TYPES, `A moving average of ${of} as a signal line; SMA + Bollinger Bands also draws the bands around it.`),
    lengthInput(14, "smoothingLength", "Smoothing Length", 5e3, "Number of bars used for the smoothing average."),
    floatInput("bbMult", "BB StdDev", 2, 1e-3, 50, 0.5, "Standard deviations from the smoothing SMA to the Bollinger Bands."),
    colorInput(WARNING, "Smoothing MA", "smoothingColor", "Color of the smoothing average."),
    colorInput(NEUTRAL, "Bollinger Bands", "bbColor", "Color of the Bollinger Bands.")
  ];
}
function smoothingPlots(values, bars, inputs, of, type = str3(inputs, "smoothingType", "None"), len = num3(inputs, "smoothingLength", 14)) {
  if (type === "None") return [];
  const n = Math.max(1, Math.trunc(len));
  const ma = type === "EMA" ? ema(values, n) : type === "SMMA (RMA)" || type === "RMA (SMMA)" ? rma(values, n) : type === "WMA" ? wma(values, n) : type === "VWMA" ? vwma([...values], volumes(bars), n) : sma(values, n);
  const plots = [{ key: "smoothing", title: `${of}-based MA`, values: ma, color: str3(inputs, "smoothingColor", WARNING) }];
  if (type === "SMA + Bollinger Bands") {
    const dev = stdev(values, n);
    const k = num3(inputs, "bbMult", 2);
    const color = str3(inputs, "bbColor", NEUTRAL);
    plots.push(
      { key: "bbUpper", title: "Upper Bollinger Band", values: ma.map((m, i) => m + k * dev[i]), color },
      { key: "bbLower", title: "Lower Bollinger Band", values: ma.map((m, i) => m - k * dev[i]), color }
    );
  }
  return plots;
}

// src/renderers/native/vpvr/profile.ts
function buildVpvrProfile(bars, i0, i1, rowCount, valueAreaFrac, rowSize, tick) {
  const from = Math.max(0, i0);
  const to = Math.min(bars.length - 1, i1);
  if (from > to) return null;
  let min = Infinity;
  let max = -Infinity;
  for (let i = from; i <= to; i += 1) {
    const b = bars[i];
    if (!(b.volume != null && b.volume > 0)) continue;
    if (b.low < min) min = b.low;
    if (b.high > max) max = b.high;
  }
  if (!Number.isFinite(min)) return null;
  const grid = vpvrGrid(min, max, rowCount, rowSize, tick);
  min = grid.min;
  const { n, rowH } = grid;
  const rows = Array.from({ length: n }, (_, k) => ({ price: min + k * rowH, up: 0, down: 0 }));
  for (let i = from; i <= to; i += 1) addBar(rows, bars[i], min, rowH);
  let total = 0;
  let maxTotal = 0;
  let poc = 0;
  for (let k = 0; k < n; k += 1) {
    const t = rows[k].up + rows[k].down;
    total += t;
    if (t > maxTotal) {
      maxTotal = t;
      poc = k;
    }
  }
  if (maxTotal <= 0) return null;
  const [vaFrom, vaTo] = growValueArea3((k) => rows[k].up + rows[k].down, n, poc, total, valueAreaFrac);
  return { rows, rowH, min, maxTotal, poc, vaFrom, vaTo };
}
var VPVR_MAX_ROWS = 2e3;
function vpvrGrid(min, max, rowCount, rowSize, tick) {
  if (rowSize != null && rowSize > 0 && Number.isFinite(rowSize)) {
    let rowH2 = rowSize;
    let lo = Math.floor(min / rowH2) * rowH2;
    let n2 = Math.max(1, Math.floor((max - lo) / rowH2) + 1);
    if (n2 > VPVR_MAX_ROWS) {
      rowH2 *= Math.ceil(n2 / VPVR_MAX_ROWS);
      lo = Math.floor(min / rowH2) * rowH2;
      n2 = Math.max(1, Math.floor((max - lo) / rowH2) + 1);
    }
    return { min: lo, rowH: rowH2, n: n2 };
  }
  if (!(max > min)) return { min, rowH: 1, n: 1 };
  const n = Math.min(VPVR_MAX_ROWS, Math.max(1, Math.round(rowCount)));
  let rowH = (max - min) / n;
  if (tick != null && tick > 0 && Number.isFinite(tick)) rowH = Math.ceil(rowH / tick - 1e-9) * tick;
  return { min, rowH, n };
}
function addBar(rows, b, min, rowH) {
  const v = b.volume;
  if (!(v != null && v > 0)) return;
  const n = rows.length;
  const side = b.close > b.open ? "up" : "down";
  const span = b.high - b.low;
  if (span <= 0) {
    rows[clampIndex3(Math.floor((b.low - min) / rowH), n)][side] += v;
    return;
  }
  const kFirst = clampIndex3(Math.floor((b.low - min) / rowH), n);
  const kLast = clampIndex3(Math.floor((b.high - min) / rowH - 1e-9), n);
  for (let k = kFirst; k <= kLast; k += 1) {
    const rowBot = min + k * rowH;
    const overlap = Math.min(b.high, rowBot + rowH) - Math.max(b.low, rowBot);
    if (overlap > 0) rows[k][side] += v * overlap / span;
  }
}
function growValueArea3(totalOf, n, poc, total, valueAreaFrac) {
  const target = total * Math.min(1, Math.max(0, valueAreaFrac));
  let vaFrom = poc;
  let vaTo = poc;
  let acc = totalOf(poc);
  while (acc < target && (vaFrom > 0 || vaTo < n - 1)) {
    const below = vaFrom > 0 ? totalOf(vaFrom - 1) : -1;
    const above = vaTo < n - 1 ? totalOf(vaTo + 1) : -1;
    if (acc + Math.max(above, below) > target) break;
    if (above >= below) {
      vaTo += 1;
      acc += above;
    } else {
      vaFrom -= 1;
      acc += below;
    }
  }
  return [vaFrom, vaTo];
}
function vpvrLevels(p) {
  return {
    poc: p.min + (p.poc + 0.5) * p.rowH,
    vah: p.min + (p.vaTo + 1) * p.rowH,
    val: p.min + p.vaFrom * p.rowH
  };
}
function buildVpvrDevelopingAt(src, profile, valueAreaFrac, ends) {
  const from = 0;
  const to = src.length - 1;
  const bars = src;
  const { rowH, min } = profile;
  const n = profile.rows.length;
  const rows = Array.from({ length: n }, (_, k) => ({ price: min + k * rowH, up: 0, down: 0 }));
  const totalOf = (k) => rows[k].up + rows[k].down;
  const out = [];
  let total = 0;
  let poc = -1;
  let pocTotal = 0;
  const levelsNow = () => {
    if (poc < 0) return null;
    const [vaFrom, vaTo] = growValueArea3(totalOf, n, poc, total, valueAreaFrac);
    return { poc: min + (poc + 0.5) * rowH, vah: min + (vaTo + 1) * rowH, val: min + vaFrom * rowH };
  };
  let e = 0;
  for (let i = from; i <= to; i += 1) {
    const b = bars[i];
    while (ends && e < ends.length && b.time >= ends[e]) {
      out.push(levelsNow());
      e += 1;
    }
    addBar(rows, b, min, rowH);
    const v = b.volume;
    if (v != null && v > 0) {
      total += v;
      const k0 = clampIndex3(Math.floor((b.low - min) / rowH), n);
      const k1 = clampIndex3(Math.floor((b.high - min) / rowH - 1e-9), n);
      for (let k = Math.min(k0, k1); k <= Math.max(k0, k1); k += 1) {
        const t = totalOf(k);
        if (t > pocTotal) {
          pocTotal = t;
          poc = k;
        }
      }
    }
    if (!ends) out.push(levelsNow());
  }
  if (ends) while (out.length < ends.length) out.push(levelsNow());
  return out;
}
function clampIndex3(k, n) {
  return k < 0 ? 0 : k >= n ? n - 1 : k;
}

// src/core/native-indicators/vpvr/VpvrIndicator.ts
var TV_BLUE3 = "#2962ff";
var TV_YELLOW = "#fbc02d";
var TV_RED2 = "#f44336";
var VALUES_GRAY = "#787b86";
var DEFAULT_ROWS = 24;
var DEFAULT_LINE_ROWS = 120;
var DEFAULT_WIDTH_PCT = 30;
var DEFAULT_VALUE_AREA_PCT = 70;
var DEFAULT_UP2 = transp(TV_BLUE3, 75);
var DEFAULT_DOWN2 = transp(TV_YELLOW, 75);
var DEFAULT_VA_UP = transp(TV_BLUE3, 30);
var DEFAULT_VA_DOWN = transp(TV_YELLOW, 30);
var ROWS_LAYOUTS = ["Number Of Rows", "Ticks Per Row"];
var VOLUME_MODES = ["Up/Down", "Total", "Delta"];
var PLACEMENTS = ["Right", "Left"];
var LOOKS = ["Bars", "Line"];
var LINE_UP = "#2f8cff";
var LINE_DOWN = "#8a8f98";
var WIDTHS = ["1", "2", "3", "4"];
var STYLE2 = "Style";
var LINE_TAB = "Line";
function num4(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function str4(v, fallback) {
  return typeof v === "string" && v !== "" ? v : fallback;
}
function bool2(v, fallback) {
  return typeof v === "boolean" ? v : fallback;
}
function rowSizeOf(inputs, tick) {
  if (inputs.rowsLayout !== "Ticks Per Row" || !(tick != null && tick > 0)) return void 0;
  return Math.max(1, Math.round(num4(inputs.rows, DEFAULT_ROWS))) * tick;
}
function vpvrLayerData(inputs, tick) {
  const mode = inputs.volume === "Total" ? "total" : inputs.volume === "Delta" ? "delta" : "updown";
  const lineRows = inputs.look === "Line" ? Math.round(Math.min(2e3, Math.max(0, num4(inputs.lineRows, DEFAULT_LINE_ROWS)))) : 0;
  const rowSize = lineRows > 0 ? void 0 : rowSizeOf(inputs, tick);
  return {
    rows: lineRows > 0 ? lineRows : Math.round(Math.min(1e6, Math.max(1, num4(inputs.rows, DEFAULT_ROWS)))),
    ...rowSize != null ? { rowSize } : {},
    volumeMode: mode,
    widthFrac: Math.min(1, Math.max(0.01, num4(inputs.widthPct, DEFAULT_WIDTH_PCT) / 100)),
    placement: inputs.placement === "Left" ? "left" : "right",
    upColor: str4(inputs.upColor, DEFAULT_UP2),
    downColor: str4(inputs.downColor, DEFAULT_DOWN2),
    vaUpColor: str4(inputs.vaUpColor, DEFAULT_VA_UP),
    vaDownColor: str4(inputs.vaDownColor, DEFAULT_VA_DOWN),
    look: inputs.look === "Line" ? "line" : "bars",
    lineUpColor: str4(inputs.lineUpColor, LINE_UP),
    lineDownColor: str4(inputs.lineDownColor, LINE_DOWN),
    lineWidth: Math.min(4, Math.max(1, num4(inputs.lineWidth, 1))),
    lineFill: bool2(inputs.lineFill, false),
    showProfile: bool2(inputs.showProfile, true),
    showValues: bool2(inputs.showValues, false),
    valuesColor: str4(inputs.valuesColor, VALUES_GRAY),
    // TradingView draws the POC as a line (emitted by the indicator), not as an outlined row.
    showPoc: false,
    valueAreaFrac: Math.min(1, Math.max(0, num4(inputs.valueAreaPct, DEFAULT_VALUE_AREA_PCT) / 100))
  };
}
function barAtOrBefore(bars, t) {
  let lo = 0;
  let hi = bars.length - 1;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    if (bars[mid].time <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
function inferTick(bars) {
  let decimals = -1;
  const n = Math.min(bars.length, 3e3);
  for (let i = bars.length - n; i < bars.length; i += 1) {
    const b = bars[i];
    for (const x of [b.open, b.high, b.low, b.close]) {
      if (!Number.isFinite(x)) continue;
      let d = 0;
      while (d < 10 && Math.abs(x * 10 ** d - Math.round(x * 10 ** d)) > 1e-6 * Math.max(1, Math.abs(x) * 10 ** d * 1e-9)) d += 1;
      if (d > decimals) decimals = d;
    }
  }
  return decimals < 0 ? void 0 : 10 ** -decimals;
}
var LINE_ROWS = {
  vah: { show: "showVah", color: "vahColor", width: "vahWidth" },
  val: { show: "showVal", color: "valColor", width: "valWidth" },
  poc: { show: "showPoc", color: "pocColor", width: "pocWidth" },
  devPoc: { show: "showDevPoc", color: "devPocColor", width: "devPocWidth" },
  devVa: { show: "showDevVa", color: "devVaColor", width: "devVaWidth" }
};
function lineRow(row, title, show, color, width) {
  return [
    { key: row.show, title, type: "bool", defval: show, inline: row.show, tab: STYLE2 },
    { key: row.color, title: "", type: "color", defval: color, inline: row.show, tab: STYLE2 },
    { key: row.width, title: "", type: "int", defval: width, options: WIDTHS, inline: row.show, tab: STYLE2 }
  ];
}
var VPVR_INTRABAR_LADDER = ["1", "5", "15", "30", "60", "240", "D"];
var MAX_INTRABARS = 5e3;
function vpvrIntrabarTimeframe(spanMs) {
  for (const tf of VPVR_INTRABAR_LADDER) if (spanMs / timeframeToMs(tf) < MAX_INTRABARS) return tf;
  return VPVR_INTRABAR_LADDER[VPVR_INTRABAR_LADDER.length - 1];
}
var LIVE_REFRESH_MS = 1e3;
var VpvrIndicator = class {
  constructor() {
    /** Null until start() — pre-start setInputs/resume must record without pushing. */
    this.ctx = null;
    this.inputs = {};
    this.range = null;
    this.timer = null;
    this.suspended = false;
    this.intrabars = null;
    /** Bumped per request: an answer for a window the user has scrolled away from is dropped. */
    this.request = 0;
    this.loadingKey = "";
  }
  start(ctx, inputs) {
    this.ctx = ctx;
    this.inputs = inputs;
    ctx.emit({});
    this.recompute();
    void ctx.data.symbolInfo(ctx.symbol).then((info) => {
      const t = info?.mintick;
      if (this.ctx !== ctx || !(typeof t === "number" && t > 0)) return;
      this.tick = t;
      this.recompute();
    }).catch(() => void 0);
  }
  /** Live ticks move the forming bar: refresh, at most every {@link LIVE_REFRESH_MS}. */
  onBars() {
    if (this.timer != null || this.suspended || !this.ctx) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.refreshTail();
      this.recompute();
    }, LIVE_REFRESH_MS);
  }
  /** The window moved: rebuild for it (TradingView also recomputes after a scroll). */
  onViewport(range) {
    this.range = range;
    this.recompute();
  }
  setInputs(inputs) {
    this.inputs = inputs;
    if (!this.ctx) return;
    this.recompute();
  }
  /** Hiding is a renderer-layer flag (set via `setIndicatorVisible`); only the live timer stops. */
  suspend() {
    this.suspended = true;
    this.clearTimer();
  }
  resume() {
    this.suspended = false;
    if (!this.ctx) return;
    this.recompute();
  }
  stop() {
    this.clearTimer();
    this.request += 1;
    this.ctx = null;
  }
  clearTimer() {
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = null;
  }
  /** The symbol's tick, else the one its prices show. */
  tickOf(bars) {
    return this.tick ?? inferTick(bars);
  }
  layerData(bars) {
    const ticks = this.inputs.rowsLayout === "Ticks Per Row";
    return vpvrLayerData(this.inputs, ticks ? this.tickOf(bars) : void 0);
  }
  /** The window as chart bars: the first bar opening at or after its left edge through the last opening in it. */
  window(bars) {
    const range = this.range;
    if (!range || bars.length === 0) return null;
    let i0 = barAtOrBefore(bars, range.from);
    if (bars[i0].time < range.from && i0 < bars.length - 1) i0 += 1;
    const i1 = Math.max(i0, barAtOrBefore(bars, range.to));
    let chartMs = NaN;
    try {
      chartMs = timeframeToMs(this.ctx?.timeframe ?? "");
    } catch {
      chartMs = NaN;
    }
    const step = Number.isFinite(chartMs) && chartMs > 0 ? chartMs : i1 > i0 ? (bars[i1].time - bars[i0].time) / (i1 - i0) : 6e4;
    const end = i1 + 1 < bars.length ? bars[i1 + 1].time : bars[i1].time + step;
    return { i0, i1, from: bars[i0].time, end, chartMs: step };
  }
  /** Load the finer candles for `[from, end)`; recompute when they land (if the window still wants them). */
  load(tf, from, end) {
    const ctx = this.ctx;
    if (!ctx?.loadBars) return;
    const key = `${tf}:${from}:${end}`;
    if (key === this.loadingKey) return;
    this.loadingKey = key;
    const req = ++this.request;
    ctx.setStatus("loading");
    ctx.loadBars(tf, { from, to: end - 1 }).then((bars) => {
      if (req !== this.request || this.ctx !== ctx) return;
      this.loadingKey = "";
      this.intrabars = { tf, from, to: end, bars };
      ctx.setStatus("idle");
      this.recompute();
    }).catch(() => {
      if (req !== this.request || this.ctx !== ctx) return;
      this.loadingKey = "";
      this.intrabars = { tf, from, to: end, bars: [] };
      ctx.setStatus("idle");
      this.recompute();
    });
  }
  /** Live: re-read the newest finer candles when the window reaches the forming bar. */
  refreshTail() {
    const ctx = this.ctx;
    const ib = this.intrabars;
    if (!ctx?.loadBars || !ib || ib.bars.length === 0) return;
    const bars = ctx.bars();
    const w = this.window(bars);
    if (!w || w.i1 < bars.length - 1) return;
    const step = timeframeToMs(ib.tf);
    const from = ib.bars[ib.bars.length - 1].time;
    const end = Math.max(w.end, from + step);
    ctx.loadBars(ib.tf, { from, to: end - 1 }).then((fresh) => {
      if (this.intrabars !== ib || this.ctx !== ctx || fresh.length === 0) return;
      const keep = ib.bars.filter((b) => b.time < fresh[0].time);
      this.intrabars = { ...ib, to: Math.max(ib.to, end), bars: keep.concat(fresh) };
      this.recompute();
    }).catch(() => void 0);
  }
  /** Build the rows and the lines for the current window, from the finer candles when the host gives them. */
  recompute() {
    const ctx = this.ctx;
    if (!ctx || this.suspended) return;
    const bars = ctx.bars();
    const w = this.window(bars);
    const data = this.layerData(bars);
    if (!w) {
      ctx.pushData(data);
      ctx.emit({ series: [], priceLines: [] });
      return;
    }
    let src = bars.slice(w.i0, w.i1 + 1);
    if (ctx.loadBars) {
      const tf = vpvrIntrabarTimeframe(w.end - w.from);
      if (timeframeToMs(tf) < w.chartMs) {
        const ib = this.intrabars;
        if (!ib || ib.tf !== tf || ib.from > w.from || ib.to < w.end) {
          this.load(tf, w.from, w.end);
          if (ib && ib.tf === tf && ib.bars.length > 0) src = ib.bars.filter((b) => b.time >= w.from && b.time < w.end);
          else return;
        } else if (ib.bars.length > 0) {
          src = ib.bars.filter((b) => b.time >= w.from && b.time < w.end);
        }
      }
    }
    const roundTick = data.rowSize == null ? this.tickOf(src) : void 0;
    const profile = src.length > 0 ? buildVpvrProfile(src, 0, src.length - 1, data.rows, data.valueAreaFrac, data.rowSize, roundTick) : null;
    ctx.pushData(profile ? { ...data, profile } : data);
    if (!profile) {
      ctx.emit({ series: [], priceLines: [] });
      return;
    }
    ctx.emit(this.lines(bars, w.i0, w.i1, src, profile, data.valueAreaFrac));
  }
  /** POC / VAH / VAL (full-width lines with a value-only series for the price-scale label and the status line),
   *  and the developing POC / VA read at each chart bar of the window. */
  lines(bars, i0, i1, src, profile, vaFrac) {
    const inputs = this.inputs;
    const series = [];
    const priceLines = [];
    const labels = bool2(inputs.labelsOnScale, true);
    const values = bool2(inputs.valuesInStatusLine, true);
    const style = (row, color, width) => ({
      color: str4(inputs[row.color], color),
      width: Math.min(4, Math.max(1, Math.round(num4(Number(inputs[row.width]), width)))),
      // the width dropdown may hand back '2'
      lineStyle: "solid"
    });
    const id = (title, ordinal) => stableSeriesId({ instanceId: "vpvr", kind: "line", title, ordinal });
    const over = (value) => bars.map((b, i) => ({ time: b.time, value: i >= i0 && i <= i1 ? value(i) : null }));
    const lv = vpvrLevels(profile);
    const levels = [
      [LINE_ROWS.poc, "POC", lv.poc, true, TV_RED2],
      [LINE_ROWS.vah, "VAH", lv.vah, false, TV_BLUE3],
      [LINE_ROWS.val, "VAL", lv.val, false, TV_BLUE3]
    ];
    levels.forEach(([row, title, price, on, color], ordinal) => {
      if (!bool2(inputs[row.show], on)) return;
      const st = style(row, color, 2);
      priceLines.push({ id: stableSeriesId({ instanceId: "vpvr", kind: "hline", title, ordinal }), paneId: "", price, ...st });
      series.push({
        id: id(title, ordinal),
        title,
        paneId: "",
        kind: "line",
        points: over(() => price),
        style: st,
        display: { pane: false, priceScale: labels, legend: values, dataWindow: true },
        axisTag: labels
      });
    });
    const devPoc = bool2(inputs[LINE_ROWS.devPoc.show], false);
    const devVa = bool2(inputs[LINE_ROWS.devVa.show], false);
    if (devPoc || devVa) {
      const ends = [];
      for (let i = i0; i <= i1; i += 1) ends.push(i + 1 < bars.length ? bars[i + 1].time : Infinity);
      const dev = buildVpvrDevelopingAt(src, profile, vaFrac, ends);
      const line = (title, ordinal, row, color, pick) => {
        series.push({
          id: id(title, ordinal),
          title,
          paneId: "",
          kind: "step",
          points: over((i) => {
            const l = dev[i - i0];
            return l ? pick(l) : null;
          }),
          style: style(row, color, 1),
          display: { pane: true, priceScale: labels, legend: values, dataWindow: true },
          axisTag: labels
        });
      };
      if (devPoc) line("Developing POC", 3, LINE_ROWS.devPoc, TV_RED2, (l) => l.poc);
      if (devVa) {
        line("Developing VA High", 4, LINE_ROWS.devVa, TV_BLUE3, (l) => l.vah);
        line("Developing VA Low", 5, LINE_ROWS.devVa, TV_BLUE3, (l) => l.val);
      }
    }
    return { series, priceLines };
  }
};
function vpvrInputsSchema() {
  return [
    { key: "rowsLayout", title: "Rows Layout", type: "string", defval: ROWS_LAYOUTS[0], options: ROWS_LAYOUTS },
    { key: "rows", title: "Row Size", type: "int", defval: DEFAULT_ROWS, min: 1, max: 1e6, step: 1 },
    { key: "volume", title: "Volume", type: "string", defval: VOLUME_MODES[0], options: VOLUME_MODES },
    { key: "valueAreaPct", title: "Value Area Volume", type: "int", defval: DEFAULT_VALUE_AREA_PCT, min: 0, max: 100, step: 1 },
    { key: "showProfile", title: "Volume profile", type: "bool", defval: true, tab: STYLE2 },
    { key: "showValues", title: "Values", type: "bool", defval: false, inline: "values", tab: STYLE2 },
    { key: "valuesColor", title: "", type: "color", defval: VALUES_GRAY, inline: "values", tab: STYLE2 },
    { key: "widthPct", title: "Width (% of the box)", type: "int", defval: DEFAULT_WIDTH_PCT, min: 1, max: 100, step: 1, tab: STYLE2 },
    { key: "placement", title: "Placement", type: "string", defval: PLACEMENTS[0], options: PLACEMENTS, tab: STYLE2 },
    { key: "upColor", title: "Up Volume", type: "color", defval: DEFAULT_UP2, tab: STYLE2 },
    { key: "downColor", title: "Down Volume", type: "color", defval: DEFAULT_DOWN2, tab: STYLE2 },
    { key: "vaUpColor", title: "Value Area Up", type: "color", defval: DEFAULT_VA_UP, tab: STYLE2 },
    { key: "vaDownColor", title: "Value Area Down", type: "color", defval: DEFAULT_VA_DOWN, tab: STYLE2 },
    ...lineRow(LINE_ROWS.vah, "VAH", false, TV_BLUE3, 2),
    ...lineRow(LINE_ROWS.val, "VAL", false, TV_BLUE3, 2),
    ...lineRow(LINE_ROWS.poc, "POC", true, TV_RED2, 2),
    ...lineRow(LINE_ROWS.devPoc, "Developing POC", false, TV_RED2, 1),
    ...lineRow(LINE_ROWS.devVa, "Developing VA", false, TV_BLUE3, 1),
    { key: "labelsOnScale", title: "Labels on price scale", type: "bool", defval: true, tab: STYLE2 },
    { key: "valuesInStatusLine", title: "Values in status line", type: "bool", defval: true, tab: STYLE2 },
    { key: "look", title: "Look", type: "string", defval: LOOKS[0], options: LOOKS, tab: LINE_TAB },
    { key: "lineUpColor", title: "Line: buying won", type: "color", defval: LINE_UP, tab: LINE_TAB, when: { key: "look", equals: "Line" } },
    { key: "lineDownColor", title: "Line: selling won", type: "color", defval: LINE_DOWN, tab: LINE_TAB, when: { key: "look", equals: "Line" } },
    { key: "lineRows", title: "Line rows (0 = Row Size)", type: "int", defval: DEFAULT_LINE_ROWS, min: 0, max: 2e3, step: 10, tab: LINE_TAB, when: { key: "look", equals: "Line" } },
    { key: "lineWidth", title: "Line width", type: "int", defval: 1, options: WIDTHS, tab: LINE_TAB, when: { key: "look", equals: "Line" } },
    { key: "lineFill", title: "Fill under the line", type: "bool", defval: false, tab: LINE_TAB, when: { key: "look", equals: "Line" } }
  ];
}
var vpvrDescriptor = {
  type: "vpvr",
  title: "Visible Range Volume Profile",
  shortTitle: "VRVP",
  paneHint: "price",
  overlay: true,
  reactsToViewport: true,
  inputsSchema: vpvrInputsSchema,
  defaultInputs: () => Object.fromEntries(vpvrInputsSchema().map((s) => [s.key, s.defval])),
  create: () => new VpvrIndicator()
};
function registerVpvr() {
  if (!getNativeIndicator(vpvrDescriptor.type)) registerNativeIndicator(vpvrDescriptor);
}

// src/core/native-indicators/classics/averages.ts
var MA_TYPES = ["SMA", "EMA", "WMA", "RMA (SMMA)", "HMA", "ALMA", "VWMA", "DEMA", "TEMA", "KAMA", "LSMA", "McGinley", "Hamming"];
var ENVELOPE_MA_TYPES = ["SMA", "EMA", "WMA", "RMA (SMMA)", "HMA", "VWMA"];
function movingAverageOf(kind, src, bars, len, opts = {}) {
  switch (kind) {
    case "EMA":
      return ema(src, len);
    case "WMA":
      return wma(src, len);
    case "RMA":
    case "RMA (SMMA)":
      return rma(src, len);
    case "HMA":
      return hma(src, len);
    case "ALMA":
      return alma(src, len, opts.almaOffset ?? 0.85, opts.almaSigma ?? 6);
    case "VWMA":
      return vwma(src, volumes(bars), len);
    case "DEMA":
      return dema(src, len);
    case "TEMA":
      return tema(src, len);
    case "KAMA":
      return kama(src, len);
    case "LSMA":
      return linreg(src, len, opts.lsmaOffset ?? 0);
    case "McGinley":
      return mcginley(src, len);
    case "Hamming":
      return hamming(src, len);
    default:
      return sma(src, len);
  }
}
function slopeColors(values, bull, bear, flat) {
  return values.map((x, i) => {
    if (!Number.isFinite(x)) return null;
    const prev = i > 0 ? values[i - 1] : Number.NaN;
    if (!Number.isFinite(prev)) return flat;
    return x > prev ? bull : x < prev ? bear : flat;
  });
}
function directionInputs() {
  return [
    boolInput("trendColor", "Slope Trend Coloring", true, STYLE, "Colors the line by its slope \u2014 bullish while it rises, bearish while it falls. Disable to draw it in the neutral color."),
    colorInput(BULLISH, "Bullish", "bullColor"),
    colorInput(BEARISH, "Bearish", "bearColor"),
    colorInput(NEUTRAL, "Neutral", "neutralColor"),
    widthInput()
  ];
}
function slopeColoredPlot(key, title, values, inputs) {
  const neutral = str3(inputs, "neutralColor", NEUTRAL);
  const colored = bool(inputs, "trendColor", true);
  return {
    key,
    title,
    values,
    color: neutral,
    width: num3(inputs, "lineWidth", 2),
    ...colored ? { colors: slopeColors(values, str3(inputs, "bullColor", BULLISH), str3(inputs, "bearColor", BEARISH), neutral) } : {}
  };
}
var offsetInput = { key: "offset", title: "Offset", type: "int", defval: 0, min: -500, max: 500, step: 1, group: SETTINGS, tooltip: "Bars the plotted line is displaced by. Positive values push it to the right." };
function fixedAverage(type, title, shortTitle, smooth) {
  return {
    type,
    title,
    shortTitle,
    overlay: true,
    inputs: [lengthInput(20, "length", "Length", 5e3, `Number of bars used in the ${shortTitle} calculation.`), sourceInput("Close", "source", "Source", `Price series the ${shortTitle} is calculated on.`), offsetInput, colorInput(), ...smoothingInputs(`the ${shortTitle}`)],
    compute: (bars, inputs) => {
      const len = num3(inputs, "length", 20);
      let values = smooth(sourceValues(bars, str3(inputs, "source", "Close")), len);
      const offset = Math.trunc(num3(inputs, "offset", 0));
      if (offset !== 0) values = shift(values, offset);
      return { plots: [{ key: shortTitle.toLowerCase(), title: shortTitle, values, color: str3(inputs, "color", INFO), width: 2 }, ...smoothingPlots(values, bars, inputs, shortTitle)] };
    }
  };
}
var simpleMa = fixedAverage("sma", "Simple Moving Average", "SMA", sma);
var exponentialMa = fixedAverage("ema", "Exponential Moving Average", "EMA", ema);
var movingAverage = {
  type: "moving-average",
  title: "Moving Average",
  shortTitle: "MA",
  overlay: true,
  inputs: [
    optionInput("maType", "MA 1 Type", "SMA", MA_TYPES, "Moving average calculation used for MA 1."),
    lengthInput(20, "length", "MA 1 Length", 5e3, "Number of bars used in the MA 1 calculation."),
    sourceInput("Close", "source", "MA 1 Source", "Price series MA 1 is calculated on."),
    boolInput("showMa2", "Show MA 2", false, SETTINGS, "Displays the optional second moving average."),
    optionInput("ma2Type", "MA 2 Type", "SMA", MA_TYPES, "Moving average calculation used for MA 2."),
    lengthInput(50, "ma2Length", "MA 2 Length", 5e3, "Number of bars used in the MA 2 calculation."),
    sourceInput("Close", "ma2Source", "MA 2 Source", "Price series MA 2 is calculated on."),
    floatInput("almaOffset", "ALMA Offset", 0.85, 0, 1, 0.05, "ALMA type only. Values near 1 make the average more responsive, values near 0 make it smoother."),
    floatInput("almaSigma", "ALMA Sigma", 6, 0.1, 100, 0.5, "ALMA type only. Larger values widen the Gaussian window for a smoother average."),
    intInput("lsmaOffset", "LSMA Offset", 0, 0, 500, "LSMA type only. Bar offset applied to the linear regression value."),
    offsetInput,
    colorInput(INFO, "MA 1", "color", "MA 1 line color."),
    colorInput(WARNING, "MA 2", "ma2Color", "MA 2 line color.")
  ],
  compute: (bars, inputs) => {
    const opts = {
      almaOffset: num3(inputs, "almaOffset", 0.85),
      almaSigma: num3(inputs, "almaSigma", 6),
      lsmaOffset: Math.trunc(num3(inputs, "lsmaOffset", 0))
    };
    const offset = Math.trunc(num3(inputs, "offset", 0));
    const displace = (v) => offset === 0 ? v : shift(v, offset);
    const kind = str3(inputs, "maType", "SMA");
    const ma1 = displace(movingAverageOf(kind, sourceValues(bars, str3(inputs, "source", "Close")), bars, num3(inputs, "length", 20), opts));
    const plots = [{ key: "ma", title: kind, values: ma1, color: str3(inputs, "color", INFO), width: 2 }];
    if (bool(inputs, "showMa2", false)) {
      const kind2 = str3(inputs, "ma2Type", "SMA");
      const ma2 = displace(movingAverageOf(kind2, sourceValues(bars, str3(inputs, "ma2Source", "Close")), bars, num3(inputs, "ma2Length", 50), opts));
      plots.push({ key: "ma2", title: `${kind2} 2`, values: ma2, color: str3(inputs, "ma2Color", WARNING), width: 2 });
    }
    return { plots };
  }
};
var smoothedMa = {
  type: "rma",
  title: "Smoothed Moving Average",
  shortTitle: "RMA",
  overlay: true,
  inputs: [
    sourceInput("Close", "source", "Source", "Price series the average smooths. Wilder computed his 1978 indicators on the close, but the recursion accepts any source."),
    lengthInput(14, "length", "RMA Length", 5e3, "Number of bars N in Wilder's smoothing: the line keeps (N \u2212 1)/N of its previous value and blends in 1/N of the new price. That alpha is smaller than an EMA's, so an N-period RMA responds like a (2N \u2212 1)-period EMA."),
    ...directionInputs()
  ],
  compute: (bars, inputs) => ({
    plots: [slopeColoredPlot("rma", "RMA", rma(sourceValues(bars, str3(inputs, "source", "Close")), num3(inputs, "length", 14)), inputs)]
  })
};
var zlema = {
  type: "zlema",
  title: "Zero-Lag Exponential Moving Average",
  shortTitle: "ZLEMA",
  overlay: true,
  inputs: [
    sourceInput("Close", "source", "Source", "Price series the average de-lags and then smooths."),
    lengthInput(21, "length", "ZLEMA Length", 5e3, "EMA length N. It sets both the smoothing (alpha = 2 / (N + 1)) and the correction: an EMA of length N lags by about (N \u2212 1)/2 bars, and the de-lagging step is sized to cancel exactly that."),
    ...directionInputs()
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 21);
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const lag = Math.round((len - 1) / 2);
    const delagged = zip(src, shift(src, lag), (a, b) => 2 * a - b);
    return { plots: [slopeColoredPlot("zlema", "ZLEMA", ema(delagged, len), inputs)] };
  }
};
var MOMENTUM_SCALER = "Momentum (|CMO|)";
var VOLATILITY_SCALER = "Volatility (StDev Ratio)";
var REGIME = "Trend Regime";
var vidya = {
  type: "vidya",
  title: "Variable Index Dynamic Average",
  shortTitle: "VIDYA",
  overlay: true,
  inputs: [
    sourceInput("Close", "source", "Source", "Price series the average smooths. VIDYA is classically computed on the close."),
    lengthInput(12, "length", "VIDYA Length", 5e3, "EMA-equivalent length N of the base smoothing constant, alpha = 2 / (N + 1). The adaptive scaler rescales this base speed bar by bar."),
    optionInput("scaler", "Adaptive Scaler", MOMENTUM_SCALER, [MOMENTUM_SCALER, VOLATILITY_SCALER], "Bar-by-bar measure that rescales the smoothing constant. Momentum divides the absolute Chande Momentum Oscillator by 100; Volatility is Chande's original short-term over reference standard deviation."),
    intInput("scalerLength", "Scaler Lookback", 9, 1, 5e3, "Lookback of the adaptive scaler \u2014 the CMO period in momentum mode, or the short-term standard deviation window in volatility mode."),
    intInput("refLength", "Reference StDev Length", 30, 2, 5e3, "Volatility mode only \u2014 window of the reference standard deviation the short-term reading is divided by."),
    { ...floatInput("flatThreshold", "Flat Threshold", 0.05, 0, 10, 0.01, "One-bar change of VIDYA, as a fraction of ATR, below which the line reads as flat."), group: REGIME },
    { ...intInput("atrLength", "ATR Normalization Length", 14, 1, 5e3, "ATR window used to normalize VIDYA's one-bar slope, so the flat threshold behaves consistently across symbols and timeframes."), group: REGIME },
    boolInput("trendColor", "Trend Regime Coloring", true, STYLE, "Colors VIDYA by its regime read \u2014 bullish while sloping up beyond the flat threshold, bearish while sloping down, flat inside congestion."),
    boolInput("adaptiveGradient", "Adaptive Gradient", true, STYLE, "Blends the trend color toward the flat color according to the adaptive scaler, so the line pales as momentum dies."),
    colorInput(BULLISH, "Bullish", "bullColor"),
    colorInput(BEARISH, "Bearish", "bearColor"),
    colorInput(NEUTRAL, "Flat", "flatColor"),
    colorInput(NEUTRAL, "Neutral", "neutralColor"),
    widthInput()
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 12);
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const scalerLen = num3(inputs, "scalerLength", 9);
    const momentum = map(cmo(src, scalerLen), (x) => Math.abs(x) / 100);
    const shortDev = stdev(src, scalerLen);
    const refDev = stdev(src, num3(inputs, "refLength", 30));
    const volatility = zip(shortDev, refDev, (s, r) => r > 0 ? s / r : 0);
    const scale = str3(inputs, "scaler", MOMENTUM_SCALER) === VOLATILITY_SCALER ? volatility : momentum;
    const alphaBase = 2 / (len + 1);
    const out = new Array(src.length).fill(Number.NaN);
    let prev = Number.NaN;
    for (let i = 0; i < src.length; i++) {
      const x = src[i];
      if (!Number.isFinite(x)) continue;
      const k = scale[i];
      if (!Number.isFinite(prev) || !Number.isFinite(k)) prev = x;
      else {
        const alpha = Math.min(alphaBase * k, 1);
        prev = alpha * x + (1 - alpha) * prev;
      }
      out[i] = prev;
    }
    const neutral = str3(inputs, "neutralColor", NEUTRAL);
    if (!bool(inputs, "trendColor", true)) {
      return { plots: [{ key: "vidya", title: "VIDYA", values: out, color: neutral, width: num3(inputs, "lineWidth", 2) }] };
    }
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const flat = str3(inputs, "flatColor", NEUTRAL);
    const threshold = num3(inputs, "flatThreshold", 0.05);
    const range = atr(bars, num3(inputs, "atrLength", 14));
    const fade = bool(inputs, "adaptiveGradient", true);
    const colors = out.map((x, i) => {
      if (!Number.isFinite(x)) return null;
      const r = range[i];
      const slope = i > 0 && Number.isFinite(out[i - 1]) ? x - out[i - 1] : 0;
      const normalized = Number.isFinite(r) && r !== 0 ? slope / r : 0;
      const ink = normalized > threshold ? bull : normalized < -threshold ? bear : null;
      if (ink == null) return flat;
      return fade ? gradient(Math.min(scale[i] ?? 0, 1), 0, 1, flat, ink) : ink;
    });
    return { plots: [{ key: "vidya", title: "VIDYA", values: out, color: flat, width: num3(inputs, "lineWidth", 2), colors }] };
  }
};
var maEnvelope = {
  type: "ma-envelope",
  title: "Moving Average Envelope",
  shortTitle: "MA Env",
  overlay: true,
  inputs: [
    optionInput("maType", "MA Type", "SMA", ENVELOPE_MA_TYPES, "Moving average type used as the envelope basis."),
    { ...lengthInput(20, "length", "Length", 5e3, "Number of bars in the basis moving average."), min: 2 },
    sourceInput("Close", "source", "Source", "Price series the basis moving average is calculated on."),
    floatInput("percent", "Percent", 2.5, 0, 50, 0.1, "Envelope offset as a percentage of the basis. Upper = basis \xD7 (1 + percent / 100), lower = basis \xD7 (1 \u2212 percent / 100)."),
    ...channelStyleInputs()
  ],
  compute: (bars, inputs) => {
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const basis = movingAverageOf(str3(inputs, "maType", "SMA"), src, bars, num3(inputs, "length", 20));
    const k = num3(inputs, "percent", 2.5) / 100;
    const ink = { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "basisColor", NEUTRAL) };
    return directionalChannel(bars, basis, map(basis, (x) => x * (1 + k)), map(basis, (x) => x * (1 - k)), ink, "envelope");
  }
};
var LINREG_CURVE = "Curve";
var LINREG_SLOPE = "Slope";
var linearRegression = {
  type: "linear-regression",
  title: "Linear Regression Curve",
  shortTitle: "LinReg",
  // Slope lives in its own pane; Curve force-overlays itself onto the price candles.
  overlay: false,
  inputs: [
    optionInput("mode", "Mode", LINREG_CURVE, [LINREG_CURVE, LINREG_SLOPE], "Curve plots the regression value on the price chart; Slope plots the per-bar slope of the fit in the pane."),
    { ...lengthInput(100, "length", "Length", 5e3, "Number of bars used to fit the linear regression."), min: 2 },
    sourceInput("Close", "source", "Source", "Price series the regression is fitted to."),
    colorInput(BULLISH, "Rising", "bullColor", "Color of the regression curve and slope line while the fit slopes upward."),
    colorInput(BEARISH, "Falling", "bearColor", "Color of the regression curve and slope line while the fit slopes downward."),
    colorInput(NEUTRAL, "Regression Line", "lineColor", "Color of the regression curve and slope line while the fit is flat.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 100);
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const curve = linreg(src, len, 0);
    const slope = zip(curve, linreg(src, len, 1), (a, b) => a - b);
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const flat = str3(inputs, "lineColor", NEUTRAL);
    const colors = slope.map((s) => Number.isFinite(s) ? s > 0 ? bull : s < 0 ? bear : flat : null);
    if (str3(inputs, "mode", LINREG_CURVE) === LINREG_SLOPE) {
      return {
        plots: [{ key: "slope", title: "Slope", values: slope, color: flat, width: 2, colors }],
        levels: [{ key: "zero", price: 0, color: transp(NEUTRAL, 50), lineStyle: "dashed" }]
      };
    }
    return { plots: [{ key: "curve", title: "Curve", values: curve, color: flat, width: 2, colors, overlay: true }] };
  }
};
var averageSpecs = [simpleMa, exponentialMa, movingAverage, smoothedMa, zlema, vidya, maEnvelope, linearRegression];

// src/core/native-indicators/classics/bands.ts
var JAW_COLOR = "#ab47bc";
var TEETH_COLOR = WARNING;
var LIPS_COLOR = "#ffd700";
function bollinger(bars, inputs) {
  const len = num3(inputs, "length", 20);
  const mult = num3(inputs, "mult", 2);
  const src = sourceValues(bars, str3(inputs, "source", "Close"));
  const basis = sma(src, len);
  const dev = map(stdev(src, len), (x) => x * mult);
  return { src, basis, upper: zip(basis, dev, (b, d) => b + d), lower: zip(basis, dev, (b, d) => b - d) };
}
function bollingerInputs(multMin, multStep) {
  return [
    { ...lengthInput(20, "length", "Length", 5e3, "Number of bars used for the Bollinger Bands basis (a simple moving average) and for the standard deviation."), min: 2 },
    sourceInput("Close", "source", "Source", "Price series the bands are computed from."),
    floatInput("mult", "Multiplier", 2, multMin, 50, multStep, "Standard deviation multiplier for the upper and lower bands.")
  ];
}
var bollingerBands = {
  type: "bollinger-bands",
  title: "Bollinger Bands",
  shortTitle: "BB",
  overlay: true,
  inputs: [
    lengthInput(20, "length", "Length", 5e3, "Number of bars used to calculate the basis SMA and the standard deviation."),
    sourceInput("Close", "source", "Source", "Price series the bands are calculated on."),
    floatInput("mult", "Multiplier", 2, 0, 50, 0.1, "Number of standard deviations added above and below the basis to form the bands."),
    colorInput(WARNING, "Basis", "basisColor", "Color of the basis (middle band) moving average."),
    colorInput(INFO, "Bands", "color", "Color of the upper and lower bands."),
    colorInput(transp(INFO, 92), "Fill", "fillColor", "Fill color of the area between the upper and lower bands.")
  ],
  compute: (bars, inputs) => {
    const { basis, upper, lower } = bollinger(bars, inputs);
    const ink = str3(inputs, "color", INFO);
    return {
      plots: [
        { key: "basis", title: "Basis", values: basis, color: str3(inputs, "basisColor", WARNING) },
        { key: "upper", title: "Upper", values: upper, color: ink },
        { key: "lower", title: "Lower", values: lower, color: ink }
      ],
      bands: [{ key: "bb", from: "upper", to: "lower", color: str3(inputs, "fillColor", transp(INFO, 92)) }]
    };
  }
};
var PERCENT_B_MID = 0.5;
var THRESHOLDS = "Thresholds";
var percentB = {
  type: "percent-b",
  title: "Bollinger Bands %B",
  shortTitle: "%B",
  overlay: false,
  inputs: [
    ...bollingerInputs(1e-3, 0.25),
    { ...floatInput("overbought", "Overbought", 1, -10, 10, 0.05, "Level treated as overbought. 1 is the upper band itself, so readings above the default mean price sits outside the bands."), group: THRESHOLDS },
    { ...floatInput("oversold", "Oversold", 0, -10, 10, 0.05, "Level treated as oversold. 0 is the lower band itself, so readings below the default mean price sits outside the bands."), group: THRESHOLDS },
    colorInput(BULLISH, "Bullish", "bullColor", "Color of %B above the 0.5 midline, where price trades in the upper half of the bands."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of %B below the 0.5 midline, where price trades in the lower half of the bands."),
    boolInput("gradientFill", "Gradient Fill", true, STYLE, "Vertical gradient between %B and the 0.5 midline, fully transparent at the midline and more opaque at the oscillator value."),
    colorInput(NEUTRAL, "Levels Color", "levelsColor", "Color of the dashed overbought/oversold levels and of the dotted midline.")
  ],
  compute: (bars, inputs) => {
    const { src, upper, lower } = bollinger(bars, inputs);
    const values = src.map((x, i) => {
      const u = upper[i];
      const l = lower[i];
      return Number.isFinite(u) && Number.isFinite(l) && u !== l ? (x - l) / (u - l) : Number.NaN;
    });
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const levels = str3(inputs, "levelsColor", NEUTRAL);
    const colors = values.map((x) => Number.isFinite(x) ? x > PERCENT_B_MID ? bull : bear : null);
    const plots = [
      { key: "pb", title: "%B", values, color: bear, colors },
      { key: "mid", title: "Midline", values: values.map((x) => Number.isFinite(x) ? PERCENT_B_MID : Number.NaN), color: levels, display: { pane: false, legend: false, dataWindow: false } }
    ];
    const bands = bool(inputs, "gradientFill", true) ? [
      {
        key: "pbFill",
        from: "pb",
        to: "mid",
        color: transp(NEUTRAL, 100),
        // Opaque at the oscillator, invisible where it meets the midline.
        gradient: values.map((x) => {
          if (!Number.isFinite(x)) return null;
          const up = x > PERCENT_B_MID;
          const ink = up ? bull : bear;
          return {
            topValue: Math.max(x, PERCENT_B_MID),
            bottomValue: Math.min(x, PERCENT_B_MID),
            topColor: up ? transp(ink, 50) : transp(ink, 100),
            bottomColor: up ? transp(ink, 100) : transp(ink, 50)
          };
        })
      }
    ] : [];
    return {
      plots,
      bands,
      levels: [
        { key: "overbought", price: num3(inputs, "overbought", 1), color: levels, lineStyle: "dashed", title: "Overbought" },
        { key: "oversold", price: num3(inputs, "oversold", 0), color: levels, lineStyle: "dashed", title: "Oversold" },
        { key: "midline", price: PERCENT_B_MID, color: transp(levels, 50), lineStyle: "dotted", title: "Midline" }
      ]
    };
  }
};
var SQUEEZE_BULGE = "Squeeze & Bulge";
var bandwidth = {
  type: "bandwidth",
  title: "Bollinger Bands Width",
  shortTitle: "BandWidth",
  overlay: false,
  inputs: [
    ...bollingerInputs(1e-3, 0.25),
    { ...intInput("lookback", "Reference Lookback", 125, 2, 5e3, "Window used to locate the lowest (Squeeze) and highest (Bulge) BandWidth references."), group: SQUEEZE_BULGE },
    boolInput("showSqueeze", "Show Squeeze Level", true, SQUEEZE_BULGE, "Plots the lowest BandWidth of the reference lookback \u2014 unusually compressed volatility, a condition rather than a directional signal."),
    boolInput("showBulge", "Show Bulge Level", true, SQUEEZE_BULGE, "Plots the highest BandWidth of the reference lookback \u2014 extreme width that is unlikely to be sustained."),
    colorInput(NEUTRAL, "BandWidth", "color", "Color of the BandWidth line. At its Squeeze reference the line takes the Squeeze color, at its Bulge reference the Bulge color."),
    boolInput("gradientFill", "Gradient Fill", true, STYLE, "Fills the area between zero and BandWidth with a vertical gradient, fully transparent at zero."),
    colorInput(WARNING, "Squeeze Level", "squeezeColor", "Color of the lowest-BandWidth reference line."),
    colorInput(BEARISH, "Bulge Level", "bulgeColor", "Color of the highest-BandWidth reference line.")
  ],
  compute: (bars, inputs) => {
    const { basis, upper, lower } = bollinger(bars, inputs);
    const values = basis.map((b, i) => {
      const u = upper[i];
      const l = lower[i];
      return Number.isFinite(b) && b !== 0 && Number.isFinite(u) && Number.isFinite(l) ? (u - l) / b : Number.NaN;
    });
    const lookback = num3(inputs, "lookback", 125);
    const squeezeLevel = lowest(values, lookback);
    const bulgeLevel = highest(values, lookback);
    const base = str3(inputs, "color", NEUTRAL);
    const squeezeInk = str3(inputs, "squeezeColor", WARNING);
    const bulgeInk = str3(inputs, "bulgeColor", BEARISH);
    const colors = values.map((x, i) => {
      if (!Number.isFinite(x)) return null;
      if (x <= squeezeLevel[i]) return squeezeInk;
      if (x >= bulgeLevel[i]) return bulgeInk;
      return base;
    });
    const plots = [
      { key: "bbw", title: "BandWidth", values, color: base, colors },
      { key: "zero", title: "Zero Line", values: values.map((x) => Number.isFinite(x) ? 0 : Number.NaN), color: transp(NEUTRAL, 90) }
    ];
    if (bool(inputs, "showSqueeze", true)) plots.push({ key: "squeeze", title: "Squeeze Level", values: squeezeLevel, color: squeezeInk });
    if (bool(inputs, "showBulge", true)) plots.push({ key: "bulge", title: "Bulge Level", values: bulgeLevel, color: bulgeInk });
    const bands = bool(inputs, "gradientFill", true) ? [
      {
        key: "bbwFill",
        from: "bbw",
        to: "zero",
        color: transp(NEUTRAL, 100),
        gradient: values.map((x, i) => {
          if (!Number.isFinite(x)) return null;
          const ink = colors[i] ?? base;
          return { topValue: x, bottomValue: 0, topColor: transp(ink, 50), bottomColor: transp(ink, 100) };
        })
      }
    ] : [];
    return { plots, bands };
  }
};
var keltner = {
  type: "keltner-channels",
  title: "Keltner Channels",
  shortTitle: "KC",
  overlay: true,
  inputs: [
    lengthInput(20, "length", "EMA Length", 5e3, "Number of bars used to compute the exponential moving average basis line."),
    intInput("atrLength", "ATR Length", 10, 1, 5e3, "Number of bars used to compute the Average True Range (Wilder smoothing)."),
    floatInput("mult", "Multiplier", 2, 0, 50, 0.1, "ATR multiple used to offset the upper and lower bands from the basis line."),
    sourceInput("Close", "source", "Source", "Price series used to compute the basis line."),
    ...channelStyleInputs("Basis Color")
  ],
  compute: (bars, inputs) => {
    const basis = ema(sourceValues(bars, str3(inputs, "source", "Close")), num3(inputs, "length", 20));
    const range = map(atr(bars, num3(inputs, "atrLength", 10)), (x) => x * num3(inputs, "mult", 2));
    const ink = { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "basisColor", NEUTRAL) };
    return directionalChannel(bars, basis, zip(basis, range, (b, r) => b + r), zip(basis, range, (b, r) => b - r), ink, "kc");
  }
};
var donchian = {
  type: "donchian-channels",
  title: "Donchian Channels",
  shortTitle: "DC",
  overlay: true,
  inputs: [
    lengthInput(20, "length", "Length", 5e3, "Lookback length. The upper and lower channels are the highest high and lowest low over this many bars."),
    colorInput(BEARISH, "Upper", "upperColor", "Color of the upper channel line."),
    colorInput(NEUTRAL, "Middle", "middleColor", "Color of the channel midline."),
    colorInput(BULLISH, "Lower", "lowerColor", "Color of the lower channel line."),
    colorInput(transp(NEUTRAL, 92), "Fill", "fillColor", "Color of the channel interior fill.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 20);
    const upper = highest(highs(bars), len);
    const lower = lowest(lows(bars), len);
    return {
      plots: [
        { key: "upper", title: "Upper", values: upper, color: str3(inputs, "upperColor", BEARISH) },
        { key: "middle", title: "Middle", kind: "circles", values: zip(upper, lower, (u, l) => (u + l) / 2), color: str3(inputs, "middleColor", NEUTRAL) },
        { key: "lower", title: "Lower", values: lower, color: str3(inputs, "lowerColor", BULLISH) }
      ],
      bands: [{ key: "dc", from: "upper", to: "lower", color: str3(inputs, "fillColor", transp(NEUTRAL, 92)) }]
    };
  }
};
var chandelier = {
  type: "chandelier-exit",
  title: "Chandelier Exit",
  shortTitle: "CE",
  overlay: true,
  inputs: [
    lengthInput(22, "length", "Length", 5e3, "Lookback used for both the highest high / lowest low extremes and the ATR."),
    floatInput("mult", "ATR Multiplier", 3, 0, 50, 0.1, "Multiple of ATR subtracted from the highest high (long stop) and added to the lowest low (short stop)."),
    boolInput("ratchet", "Ratchet Stops", false, void 0, "Prevents the long stop from falling and the short stop from rising, resetting once close crosses through the stop."),
    colorInput(BULLISH, "Long Stop", "longColor", "Color of the long trailing stop line."),
    colorInput(BEARISH, "Short Stop", "shortColor", "Color of the short trailing stop line.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 22);
    const range = map(atr(bars, len), (x) => x * num3(inputs, "mult", 3));
    const basicLong = zip(highest(highs(bars), len), range, (h, r) => h - r);
    const basicShort = zip(lowest(lows(bars), len), range, (l, r) => l + r);
    let long = basicLong;
    let short = basicShort;
    if (bool(inputs, "ratchet", false)) {
      long = new Array(bars.length).fill(Number.NaN);
      short = new Array(bars.length).fill(Number.NaN);
      for (let i = 0; i < bars.length; i++) {
        const bl = basicLong[i];
        const bs = basicShort[i];
        const prevClose = i > 0 ? bars[i - 1].close : bars[i].close;
        const prevLong = i > 0 && Number.isFinite(long[i - 1]) ? long[i - 1] : bl;
        const prevShort = i > 0 && Number.isFinite(short[i - 1]) ? short[i - 1] : bs;
        long[i] = Number.isFinite(bl) ? prevClose > prevLong ? Math.max(bl, prevLong) : bl : Number.NaN;
        short[i] = Number.isFinite(bs) ? prevClose < prevShort ? Math.min(bs, prevShort) : bs : Number.NaN;
      }
    }
    return {
      plots: [
        { key: "long", title: "Long Stop", values: long, color: str3(inputs, "longColor", BULLISH) },
        { key: "short", title: "Short Stop", values: short, color: str3(inputs, "shortColor", BEARISH) }
      ]
    };
  }
};
var chandeKroll = {
  type: "chande-kroll-stop",
  title: "Chande Kroll Stop",
  shortTitle: "CKS",
  overlay: true,
  inputs: [
    intInput("p", "ATR Length (P)", 10, 1, 5e3, "Lookback used for both the ATR and the highest high / lowest low price extremes."),
    floatInput("x", "ATR Multiplier (X)", 1, 0, 50, 0.1, "Multiplier applied to the ATR to offset the preliminary stops from the price extremes."),
    intInput("q", "Stop Length (Q)", 9, 1, 5e3, "Lookback over which the preliminary stops are extended into the final stop levels."),
    colorInput(BEARISH, "Stop Short", "shortColor", "Color of the protective stop line for short positions."),
    colorInput(BULLISH, "Stop Long", "longColor", "Color of the protective stop line for long positions.")
  ],
  compute: (bars, inputs) => {
    const p = num3(inputs, "p", 10);
    const q = num3(inputs, "q", 9);
    const range = map(atr(bars, p), (v) => v * num3(inputs, "x", 1));
    const firstHigh = zip(highest(highs(bars), p), range, (h, r) => h - r);
    const firstLow = zip(lowest(lows(bars), p), range, (l, r) => l + r);
    return {
      plots: [
        { key: "stopShort", title: "Stop Short", values: highest(firstHigh, q), color: str3(inputs, "shortColor", BEARISH) },
        { key: "stopLong", title: "Stop Long", values: lowest(firstLow, q), color: str3(inputs, "longColor", BULLISH) }
      ]
    };
  }
};
var supertrend = {
  type: "supertrend",
  title: "SuperTrend",
  shortTitle: "SuperTrend",
  overlay: true,
  inputs: [
    intInput("atrLength", "ATR Length", 10, 1, 5e3, "Number of bars used to compute the Wilder ATR."),
    floatInput("mult", "Factor", 3, 0, 50, 0.1, "ATR multiplier setting how far the trailing stop sits from the bar midpoint."),
    colorInput(BULLISH, "Uptrend Color", "upColor", "Line color while the trend is up."),
    colorInput(BEARISH, "Downtrend Color", "downColor", "Line color while the trend is down.")
  ],
  compute: (bars, inputs) => {
    const mult = num3(inputs, "mult", 3);
    const range = atr(bars, num3(inputs, "atrLength", 10));
    const n = bars.length;
    const up = new Array(n).fill(Number.NaN);
    const down = new Array(n).fill(Number.NaN);
    let finalUpper = Number.NaN;
    let finalLower = Number.NaN;
    let trend = -1;
    for (let i = 0; i < n; i++) {
      const r = range[i];
      if (!Number.isFinite(r)) continue;
      const b = bars[i];
      const mid = (b.high + b.low) / 2;
      const basicUpper = mid + mult * r;
      const basicLower = mid - mult * r;
      const prevUpper = Number.isFinite(finalUpper) ? finalUpper : basicUpper;
      const prevLower = Number.isFinite(finalLower) ? finalLower : basicLower;
      const prevClose = i > 0 ? bars[i - 1].close : b.close;
      finalUpper = prevClose <= prevUpper ? Math.min(basicUpper, prevUpper) : basicUpper;
      finalLower = prevClose >= prevLower ? Math.max(basicLower, prevLower) : basicLower;
      trend = b.close > finalUpper ? 1 : b.close < finalLower ? -1 : trend;
      if (trend === 1) up[i] = finalLower;
      else down[i] = finalUpper;
    }
    return {
      plots: [
        { key: "up", title: "Uptrend", values: up, color: str3(inputs, "upColor", BULLISH) },
        { key: "down", title: "Downtrend", values: down, color: str3(inputs, "downColor", BEARISH) }
      ]
    };
  }
};
var alligator = {
  type: "williams-alligator",
  title: "Williams Alligator",
  shortTitle: "Alligator",
  overlay: true,
  inputs: [
    intInput("jawLength", "Jaw Length", 13, 1, 5e3, "Smoothing length of the Jaw SMMA of median price (hl2), 13 in the classic setup."),
    intInput("teethLength", "Teeth Length", 8, 1, 5e3, "Smoothing length of the Teeth SMMA of median price (hl2), 8 in the classic setup."),
    intInput("lipsLength", "Lips Length", 5, 1, 5e3, "Smoothing length of the Lips SMMA of median price (hl2), 5 in the classic setup."),
    intInput("jawOffset", "Jaw Offset", 8, 0, 100, "Number of bars the Jaw plot is shifted into the future, 8 in the classic setup."),
    intInput("teethOffset", "Teeth Offset", 5, 0, 100, "Number of bars the Teeth plot is shifted into the future, 5 in the classic setup."),
    intInput("lipsOffset", "Lips Offset", 3, 0, 100, "Number of bars the Lips plot is shifted into the future, 3 in the classic setup."),
    colorInput(JAW_COLOR, "Jaw", "jawColor", "Color of the Jaw line."),
    colorInput(TEETH_COLOR, "Teeth", "teethColor", "Color of the Teeth line."),
    colorInput(LIPS_COLOR, "Lips", "lipsColor", "Color of the Lips line.")
  ],
  compute: (bars, inputs) => {
    const hl2 = sourceValues(bars, "HL2");
    const jaw = shift(rma(hl2, num3(inputs, "jawLength", 13)), num3(inputs, "jawOffset", 8));
    const teeth = shift(rma(hl2, num3(inputs, "teethLength", 8)), num3(inputs, "teethOffset", 5));
    const lips = shift(rma(hl2, num3(inputs, "lipsLength", 5)), num3(inputs, "lipsOffset", 3));
    return {
      plots: [
        { key: "jaw", title: "Jaw", values: jaw, color: str3(inputs, "jawColor", JAW_COLOR) },
        { key: "teeth", title: "Teeth", values: teeth, color: str3(inputs, "teethColor", TEETH_COLOR) },
        { key: "lips", title: "Lips", values: lips, color: str3(inputs, "lipsColor", LIPS_COLOR) }
      ]
    };
  }
};
var GATOR_LINES = "Alligator Lines";
var SMMA_TYPE = "SMMA (Wilder)";
var gator = {
  type: "gator-oscillator",
  title: "Gator Oscillator",
  shortTitle: "Gator Oscillator",
  overlay: false,
  inputs: [
    { ...sourceInput("HL2", "source", "Source", "Price series fed to the three Alligator averages. Bill Williams' original recipe uses the median price (high + low) / 2."), group: GATOR_LINES },
    { ...optionInput("maType", "Smoothing", SMMA_TYPE, [SMMA_TYPE, "SMA", "EMA"], "Moving average applied to the source for the jaw, teeth and lips. The original uses the smoothed (Wilder-style) moving average."), group: GATOR_LINES },
    { ...intInput("jawLength", "Jaw Length", 13, 1, 500, "Averaging length of the jaw line."), group: GATOR_LINES },
    { ...intInput("jawOffset", "Jaw Offset", 8, 0, 100, "Bars the jaw is displaced forward, 8 in the original recipe. The upper histogram measures the absolute spread between the displaced jaw and teeth."), group: GATOR_LINES },
    { ...intInput("teethLength", "Teeth Length", 8, 1, 500, "Averaging length of the teeth line."), group: GATOR_LINES },
    { ...intInput("teethOffset", "Teeth Offset", 5, 0, 100, "Bars the teeth are displaced forward, 5 in the original recipe. The teeth line enters both spreads."), group: GATOR_LINES },
    { ...intInput("lipsLength", "Lips Length", 5, 1, 500, "Averaging length of the lips line."), group: GATOR_LINES },
    { ...intInput("lipsOffset", "Lips Offset", 3, 0, 100, "Bars the lips are displaced forward, 3 in the original recipe. The lower histogram measures the negative absolute spread between the displaced teeth and lips."), group: GATOR_LINES },
    colorInput(BULLISH, "Expanding", "growColor", "Column color while a spread grew against its own previous bar \u2014 the averages are spreading apart."),
    colorInput(BEARISH, "Contracting", "shrinkColor", "Column color while a spread shrank \u2014 the averages are converging. Color encodes expansion, not trade direction."),
    colorInput(NEUTRAL, "Zero Line", "zeroColor", "Color of the zero line separating the two histograms.")
  ],
  compute: (bars, inputs) => {
    const src = sourceValues(bars, str3(inputs, "source", "HL2"));
    const kind = str3(inputs, "maType", SMMA_TYPE);
    const smooth = (len) => kind === "SMA" ? sma(src, len) : kind === "EMA" ? ema(src, len) : rma(src, len);
    const jaw = shift(smooth(num3(inputs, "jawLength", 13)), num3(inputs, "jawOffset", 8));
    const teeth = shift(smooth(num3(inputs, "teethLength", 8)), num3(inputs, "teethOffset", 5));
    const lips = shift(smooth(num3(inputs, "lipsLength", 5)), num3(inputs, "lipsOffset", 3));
    const upper = map(sub(jaw, teeth), Math.abs);
    const lower = map(sub(teeth, lips), Math.abs);
    const grow = str3(inputs, "growColor", BULLISH);
    const shrink = str3(inputs, "shrinkColor", BEARISH);
    const expansionColors2 = (v) => {
      let growing = false;
      return v.map((x, i) => {
        if (!Number.isFinite(x)) return null;
        const prev = i > 0 ? v[i - 1] : Number.NaN;
        if (Number.isFinite(prev)) growing = x > prev ? true : x < prev ? false : growing;
        return growing ? grow : shrink;
      });
    };
    return {
      plots: [
        { key: "upper", title: "Upper Histogram (Jaw - Teeth)", values: upper, kind: "columns", color: grow, colors: expansionColors2(upper), base: 0 },
        { key: "lower", title: "Lower Histogram (Teeth - Lips)", values: map(lower, (x) => -x), kind: "columns", color: shrink, colors: expansionColors2(lower), base: 0 }
      ],
      levels: [{ key: "zero", price: 0, color: str3(inputs, "zeroColor", NEUTRAL), lineStyle: "solid", title: "Zero Line" }]
    };
  }
};
var bandSpecs = [bollingerBands, percentB, bandwidth, keltner, donchian, chandelier, chandeKroll, supertrend, alligator, gator];

// src/core/native-indicators/classics/oscillators.ts
function thresholdInputs(obDefault, osDefault, min = 0, max = 100, obTitle = "Overbought Level", osTitle = "Oversold Level") {
  return [
    floatInput("overbought", obTitle, obDefault, min, max, 1, "Level above which the oscillator is considered overbought."),
    floatInput("oversold", osTitle, osDefault, min, max, 1, "Level below which the oscillator is considered oversold.")
  ];
}
var rsiSpec = {
  type: "rsi",
  title: "Relative Strength Index",
  shortTitle: "RSI",
  overlay: false,
  inputs: [
    lengthInput(14, "length", "Length", 5e3, "Number of bars used in the Wilder smoothing of average gains and losses."),
    sourceInput("Close", "source", "Source", "Price series the RSI is calculated on."),
    ...thresholdInputs(70, 30, 0, 100, "Overbought", "Oversold"),
    colorInput(NEUTRAL, "RSI", "color", "Color of the RSI line at the midline. Toward either threshold it blends into that threshold\u2019s color."),
    colorInput(BULLISH, "Oversold", "oversoldColor", "Color of the line and zone shading at and below the oversold level."),
    colorInput(BEARISH, "Overbought", "overboughtColor", "Color of the line and zone shading at and above the overbought level."),
    colorInput(NEUTRAL, "Levels", "levelsColor", "Color of the overbought, midline and oversold levels."),
    colorInput(transp(NEUTRAL, 90), "Band Fill", "fillColor", "Color of the fill between the overbought and oversold levels.")
  ],
  compute: (bars, inputs) => boundedOscillator({
    key: "rsi",
    title: "RSI",
    values: rsi(sourceValues(bars, str3(inputs, "source", "Close")), num3(inputs, "length", 14)),
    scale: { top: 100, bottom: 0 },
    overbought: num3(inputs, "overbought", 70),
    oversold: num3(inputs, "oversold", 30),
    ink: { low: str3(inputs, "oversoldColor", BULLISH), mid: str3(inputs, "color", NEUTRAL), high: str3(inputs, "overboughtColor", BEARISH) },
    levelInk: str3(inputs, "levelsColor", NEUTRAL),
    width: 2,
    midline: 50,
    bandFill: str3(inputs, "fillColor", transp(NEUTRAL, 90))
  })
};
function stochasticOutput(k, d, inputs) {
  const overbought = num3(inputs, "overbought", 80);
  const oversold = num3(inputs, "oversold", 20);
  return {
    plots: [
      { key: "k", title: "%K", values: k, color: str3(inputs, "kColor", INFO) },
      { key: "d", title: "%D", values: d, color: str3(inputs, "dColor", WARNING) },
      anchorPlot("obAnchor", "Overbought Anchor", k.length, overbought),
      anchorPlot("osAnchor", "Oversold Anchor", k.length, oversold)
    ],
    bands: [{ key: "band", from: "obAnchor", to: "osAnchor", color: str3(inputs, "fillColor", transp(INFO, 90)) }],
    levels: [
      { key: "overbought", price: overbought, color: NEUTRAL, lineStyle: "dashed", title: "Overbought" },
      { key: "oversold", price: oversold, color: NEUTRAL, lineStyle: "dashed", title: "Oversold" }
    ]
  };
}
var stochastic = {
  type: "stochastic",
  title: "Stochastic",
  shortTitle: "Stoch",
  overlay: false,
  inputs: [
    lengthInput(14, "kLength", "%K Length", 5e3, "Number of bars used for the highest high / lowest low range of the raw %K."),
    lengthInput(3, "kSmoothing", "%K Smoothing", 500, "Simple moving average length applied to the raw %K. 1 gives the fast stochastic, 3 the classic slow stochastic."),
    lengthInput(3, "dLength", "%D Smoothing", 500, "Simple moving average length of the %D signal line, applied to the smoothed %K."),
    ...thresholdInputs(80, 20),
    colorInput(INFO, "%K", "kColor", "Color of the %K line."),
    colorInput(WARNING, "%D", "dColor", "Color of the %D signal line."),
    colorInput(transp(INFO, 90), "Band Fill", "fillColor", "Fill color of the area between the overbought and oversold levels.")
  ],
  compute: (bars, inputs) => {
    const k = sma(stoch(closes(bars), highs(bars), lows(bars), num3(inputs, "kLength", 14)), num3(inputs, "kSmoothing", 3));
    return stochasticOutput(k, sma(k, num3(inputs, "dLength", 3)), inputs);
  }
};
var stochasticRsi = {
  type: "stochastic-rsi",
  title: "Stochastic RSI",
  shortTitle: "Stoch RSI",
  overlay: false,
  inputs: [
    sourceInput("Close", "source", "RSI Source", "Price series the RSI is computed on."),
    lengthInput(14, "rsiLength", "RSI Length", 5e3, "Lookback length of the Wilder RSI."),
    lengthInput(14, "stochLength", "Stochastic Length", 5e3, "Lookback over which the highest and lowest RSI values are taken."),
    lengthInput(3, "kSmoothing", "%K Smoothing", 500, "Simple moving average length applied to the stochastic of RSI to form %K."),
    lengthInput(3, "dLength", "%D Smoothing", 500, "Simple moving average length applied to %K to form the %D signal line."),
    ...thresholdInputs(80, 20),
    colorInput(INFO, "%K Color", "kColor", "Color of the %K line."),
    colorInput(WARNING, "%D Color", "dColor", "Color of the %D signal line."),
    colorInput(transp(INFO, 90), "Zone Fill", "fillColor", "Fill color of the area between the overbought and oversold levels.")
  ],
  compute: (bars, inputs) => {
    const r = rsi(sourceValues(bars, str3(inputs, "source", "Close")), num3(inputs, "rsiLength", 14));
    const k = sma(stoch(r, r, r, num3(inputs, "stochLength", 14)), num3(inputs, "kSmoothing", 3));
    return stochasticOutput(k, sma(k, num3(inputs, "dLength", 3)), inputs);
  }
};
var macd = {
  type: "macd",
  title: "MACD",
  overlay: false,
  inputs: [
    lengthInput(12, "fastLength", "Fast Length", 5e3, "Length of the fast EMA."),
    lengthInput(26, "slowLength", "Slow Length", 5e3, "Length of the slow EMA."),
    lengthInput(9, "signalLength", "Signal Smoothing", 500, "Length of the EMA applied to the MACD line to obtain the signal line."),
    sourceInput("Close", "source", "Source", "Price series used to compute the fast and slow EMAs."),
    colorInput(INFO, "MACD Line", "color", "Color of the MACD line."),
    colorInput(WARNING, "Signal Line", "signalColor", "Color of the signal line."),
    colorInput(BULLISH, "Grow Above", "growAboveColor", "Histogram color when above zero and rising."),
    colorInput(transp(BULLISH, 50), "Fall Above", "fallAboveColor", "Histogram color when above zero and falling."),
    colorInput(transp(BEARISH, 50), "Grow Below", "growBelowColor", "Histogram color when below zero and rising."),
    colorInput(BEARISH, "Fall Below", "fallBelowColor", "Histogram color when below zero and falling.")
  ],
  compute: (bars, inputs) => {
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const line = sub(ema(src, num3(inputs, "fastLength", 12)), ema(src, num3(inputs, "slowLength", 26)));
    const signal = ema(line, num3(inputs, "signalLength", 9));
    const hist = sub(line, signal);
    const colors = momentumColumnColors(hist, {
      growAbove: str3(inputs, "growAboveColor", BULLISH),
      fallAbove: str3(inputs, "fallAboveColor", transp(BULLISH, 50)),
      growBelow: str3(inputs, "growBelowColor", transp(BEARISH, 50)),
      fallBelow: str3(inputs, "fallBelowColor", BEARISH)
    });
    return {
      plots: [
        { key: "hist", title: "Histogram", values: hist, kind: "columns", color: BULLISH, colors, base: 0 },
        { key: "macd", title: "MACD", values: line, color: str3(inputs, "color", INFO) },
        { key: "signal", title: "Signal", values: signal, color: str3(inputs, "signalColor", WARNING) }
      ],
      levels: [{ key: "zero", price: 0, color: NEUTRAL, lineStyle: "dashed", title: "Zero Line" }]
    };
  }
};
var ppo = {
  type: "ppo",
  title: "Percentage Price Oscillator",
  shortTitle: "PPO",
  overlay: false,
  inputs: [
    sourceInput("Close", "source", "Source", "Price series fed into the fast and slow averages."),
    lengthInput(12, "fastLength", "Fast Length", 5e3, "Length of the fast moving average."),
    lengthInput(26, "slowLength", "Slow Length", 5e3, "Length of the slow moving average. The spread is divided by it and scaled to a percentage of price."),
    optionInput("maType", "Average Type", "EMA", ["EMA", "SMA"], "Moving average type used for the fast and slow averages."),
    lengthInput(9, "signalLength", "Signal Smoothing", 500, "Length of the signal line that smooths the PPO line."),
    optionInput("signalType", "Signal Type", "EMA", ["EMA", "SMA"], "Moving average type used for the signal line."),
    colorInput(BULLISH, "Bullish", "bullColor", "Color of the PPO line, gradient fill and histogram above the zero line."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the PPO line, gradient fill and histogram below the zero line."),
    colorInput(WARNING, "Signal Line", "signalColor", "Color of the signal line."),
    boolInput("showHistogram", "Show Histogram", true, STYLE, "Displays the histogram (PPO minus signal line) as columns. Bright columns mark a spread still widening, faded ones a spread narrowing back."),
    boolInput("gradientFill", "Gradient Fill", true, STYLE, "Fills the area between the zero line and the PPO line with a vertical gradient.")
  ],
  compute: (bars, inputs) => {
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const average = (kind2, v, len) => kind2 === "SMA" ? sma(v, len) : ema(v, len);
    const kind = str3(inputs, "maType", "EMA");
    const fast = average(kind, src, num3(inputs, "fastLength", 12));
    const slow = average(kind, src, num3(inputs, "slowLength", 26));
    const line = zip(fast, slow, (f, s) => s === 0 ? Number.NaN : (f - s) / s * 100);
    const signal = average(str3(inputs, "signalType", "EMA"), line, num3(inputs, "signalLength", 9));
    const hist = sub(line, signal);
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const out = centeredOscillator({
      key: "ppo",
      title: "PPO Line",
      values: line,
      ink: { bull, bear, neutral: bear },
      zeroInk: transp(NEUTRAL, 90),
      fill: bool(inputs, "gradientFill", true),
      extraPlots: [{ key: "signal", title: "Signal Line", values: signal, color: str3(inputs, "signalColor", WARNING) }]
    });
    if (bool(inputs, "showHistogram", true)) {
      const colors = hist.map((x, i) => {
        if (!Number.isFinite(x)) return null;
        const prev = i > 0 && Number.isFinite(hist[i - 1]) ? hist[i - 1] : x;
        const ink = x >= 0 ? bull : bear;
        const expanding = x >= 0 ? x > prev : x < prev;
        return transp(ink, expanding ? 40 : 70);
      });
      out.plots.unshift({ key: "hist", title: "Histogram", values: hist, kind: "columns", color: bull, colors, base: 0 });
    }
    return out;
  }
};
var awesome = {
  type: "awesome-oscillator",
  title: "Awesome Oscillator",
  shortTitle: "AO",
  overlay: false,
  inputs: [
    colorInput(BULLISH, "Rising", "risingColor", "Histogram color when the oscillator is higher than on the previous bar."),
    colorInput(BEARISH, "Falling", "fallingColor", "Histogram color when the oscillator is lower than or equal to the previous bar."),
    colorInput(NEUTRAL, "Zero Line", "zeroColor", "Color of the zero reference line.")
  ],
  compute: (bars, inputs) => {
    const hl2 = sourceValues(bars, "HL2");
    const ao = sub(sma(hl2, 5), sma(hl2, 34));
    const rising = str3(inputs, "risingColor", BULLISH);
    const falling = str3(inputs, "fallingColor", BEARISH);
    const colors = ao.map((x, i) => {
      if (!Number.isFinite(x)) return null;
      const prev = i > 0 ? ao[i - 1] : Number.NaN;
      return Number.isFinite(prev) && x > prev ? rising : falling;
    });
    return {
      plots: [{ key: "ao", title: "AO", values: ao, kind: "columns", color: rising, colors, base: 0 }],
      levels: [{ key: "zero", price: 0, color: str3(inputs, "zeroColor", NEUTRAL), lineStyle: "dashed", title: "Zero Line" }]
    };
  }
};
var CCI_SCALING = 0.015;
var cci = {
  type: "commodity-channel-index",
  title: "Commodity Channel Index",
  shortTitle: "CCI",
  overlay: false,
  inputs: [
    lengthInput(20, "length", "Length", 5e3, "Number of bars used for the moving average and the mean absolute deviation of the source."),
    sourceInput("HLC3", "source", "Source", "Price series measured by the CCI; the typical price hlc3 is the classic choice."),
    floatInput("upper", "Upper Level", 100, -1e3, 1e3, 10, "Overbought reference level, +100 classically."),
    floatInput("lower", "Lower Level", -100, -1e3, 1e3, 10, "Oversold reference level, \u2212100 classically."),
    colorInput(NEUTRAL, "CCI Line", "color", "Color of the CCI line."),
    colorInput(BULLISH, "Bullish", "bullColor", "Line and fill color while the CCI reads above zero."),
    colorInput(BEARISH, "Bearish", "bearColor", "Line and fill color while the CCI reads below zero."),
    colorInput(NEUTRAL, "Levels", "levelsColor", "Color of the upper, lower and zero reference lines.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 20);
    const src = sourceValues(bars, str3(inputs, "source", "HLC3"));
    const basis = sma(src, len);
    const dev = meanDev(src, len);
    const values = src.map((x, i) => {
      const b = basis[i];
      const d = dev[i];
      if (!Number.isFinite(b) || !Number.isFinite(d)) return Number.NaN;
      return d === 0 ? 0 : (x - b) / (CCI_SCALING * d);
    });
    const levelInk = str3(inputs, "levelsColor", NEUTRAL);
    return centeredOscillator({
      key: "cci",
      title: "CCI",
      values,
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: levelInk,
      zeroLineStyle: "dotted",
      extraLevels: [
        { key: "upper", price: num3(inputs, "upper", 100), color: levelInk, lineStyle: "dashed", title: "Upper Level" },
        { key: "lower", price: num3(inputs, "lower", -100), color: levelInk, lineStyle: "dashed", title: "Lower Level" }
      ]
    });
  }
};
var williamsR = {
  type: "williams-percent-r",
  title: "Williams %R",
  shortTitle: "%R",
  overlay: false,
  inputs: [
    lengthInput(14, "length", "Length", 5e3, "Lookback length of the highest high / lowest low range. 14 is the classic setting."),
    sourceInput("Close", "source", "Source", "Series located within the lookback range. Close is the classic choice."),
    ...thresholdInputs(-20, -80, -100, 0),
    colorInput(NEUTRAL, "%R Line", "color", "Color of the %R line between the thresholds. Toward either level it blends into that level\u2019s color."),
    colorInput(BEARISH, "Overbought", "overboughtColor", "Color of the line and zone shading at and above the overbought level."),
    colorInput(BULLISH, "Oversold", "oversoldColor", "Color of the line and zone shading at and below the oversold level.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 14);
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const hh = highest(highs(bars), len);
    const ll = lowest(lows(bars), len);
    const values = src.map((x, i) => {
      const h = hh[i];
      const l = ll[i];
      return Number.isFinite(h) && Number.isFinite(l) && h > l ? -100 * (h - x) / (h - l) : Number.NaN;
    });
    return boundedOscillator({
      key: "wr",
      title: "%R",
      values,
      scale: { top: 0, bottom: -100 },
      overbought: num3(inputs, "overbought", -20),
      oversold: num3(inputs, "oversold", -80),
      ink: { low: str3(inputs, "oversoldColor", BULLISH), mid: str3(inputs, "color", NEUTRAL), high: str3(inputs, "overboughtColor", BEARISH) },
      levelInk: NEUTRAL
    });
  }
};
var cmoSpec = {
  type: "chande-momentum-oscillator",
  title: "Chande Momentum Oscillator",
  shortTitle: "CMO",
  overlay: false,
  inputs: [
    lengthInput(9, "length", "Length", 5e3, "Number of bars over which up moves and down moves are summed."),
    sourceInput("Close", "source", "Source", "Price series used to measure bar-to-bar changes."),
    floatInput("overbought", "Overbought Level", 50, 0, 100, 1, "Level above which the oscillator is considered overbought."),
    floatInput("oversold", "Oversold Level", -50, -100, 0, 1, "Level below which the oscillator is considered oversold."),
    colorInput(NEUTRAL, "CMO Line", "color", "Color of the CMO line."),
    colorInput(BULLISH, "Bullish", "bullColor", "Line and fill color while momentum is positive, and shading of the oversold zone."),
    colorInput(BEARISH, "Bearish", "bearColor", "Line and fill color while momentum is negative, and shading of the overbought zone."),
    colorInput(NEUTRAL, "Levels", "levelsColor", "Color of the overbought, oversold, and zero lines.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 9);
    const d = change(sourceValues(bars, str3(inputs, "source", "Close")));
    const up = sum(map(d, (x) => Math.max(x, 0)), len);
    const down = sum(map(d, (x) => Math.max(-x, 0)), len);
    const values = zip(up, down, (u, w) => u + w === 0 ? 0 : 100 * (u - w) / (u + w));
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const levelInk = str3(inputs, "levelsColor", NEUTRAL);
    const overbought = num3(inputs, "overbought", 50);
    const oversold = num3(inputs, "oversold", -50);
    const out = centeredOscillator({
      key: "cmo",
      title: "CMO",
      values,
      ink: { bull, bear, neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: levelInk,
      zeroLineStyle: "dotted",
      extraLevels: [
        { key: "overbought", price: overbought, color: levelInk, lineStyle: "dashed", title: "Overbought" },
        { key: "oversold", price: oversold, color: levelInk, lineStyle: "dashed", title: "Oversold" }
      ]
    });
    const zones = thresholdZones(values.length, { overbought, oversold, top: 100, bottom: -100 }, { overbought: bear, oversold: bull });
    out.plots.push(...zones.plots);
    out.bands = [...out.bands ?? [], ...zones.bands];
    return out;
  }
};
var connorsRsi = {
  type: "connors-rsi",
  title: "Connors RSI",
  shortTitle: "CRSI",
  overlay: false,
  inputs: [
    lengthInput(3, "rsiLength", "RSI Length", 5e3, "Length of the Wilder RSI applied to the closing price."),
    lengthInput(2, "streakLength", "Streak RSI Length", 5e3, "Length of the Wilder RSI applied to the up/down close streak."),
    lengthInput(100, "rankLength", "Percent Rank Length", 5e3, "Lookback of the percent rank applied to the 1-bar rate of change of the closing price."),
    ...thresholdInputs(90, 10),
    colorInput(NEUTRAL, "CRSI Line", "color", "Color of the Connors RSI line."),
    colorInput(BULLISH, "Oversold", "oversoldColor", "Line, fill and zone color toward and below the oversold level."),
    colorInput(BEARISH, "Overbought", "overboughtColor", "Line, fill and zone color toward and above the overbought level."),
    colorInput(NEUTRAL, "Levels", "levelsColor", "Color of the overbought and oversold levels.")
  ],
  compute: (bars, inputs) => {
    const c = closes(bars);
    const streak = new Array(c.length).fill(0);
    for (let i = 1; i < c.length; i++) {
      const d = c[i] - c[i - 1];
      streak[i] = d > 0 ? Math.max(streak[i - 1], 0) + 1 : d < 0 ? Math.min(streak[i - 1], 0) - 1 : 0;
    }
    const a = rsi(c, num3(inputs, "rsiLength", 3));
    const b = rsi(streak, num3(inputs, "streakLength", 2));
    const r = percentRank(roc(c, 1), num3(inputs, "rankLength", 100));
    const values = c.map((_, i) => {
      const x = a[i];
      const y = b[i];
      const z = r[i];
      return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? (x + y + z) / 3 : Number.NaN;
    });
    return boundedOscillator({
      key: "crsi",
      title: "Connors RSI",
      values,
      scale: { top: 100, bottom: 0 },
      overbought: num3(inputs, "overbought", 90),
      oversold: num3(inputs, "oversold", 10),
      ink: { low: str3(inputs, "oversoldColor", BULLISH), mid: str3(inputs, "color", NEUTRAL), high: str3(inputs, "overboughtColor", BEARISH) },
      levelInk: str3(inputs, "levelsColor", NEUTRAL),
      midpointWash: true
    });
  }
};
var fisher = {
  type: "fisher-transform",
  title: "Fisher Transform",
  shortTitle: "Fisher",
  overlay: false,
  inputs: [
    lengthInput(9, "length", "Length", 5e3, "Lookback period used to locate the median price hl2 within its highest-lowest range. Ehlers' original length is 10; 9 is the common platform default."),
    colorInput(NEUTRAL, "Fisher Line", "color", "Color of the Fisher line when it sits exactly on its trigger."),
    colorInput(NEUTRAL, "Trigger Line", "triggerColor", "Color of the trigger line, the Fisher value delayed one bar."),
    colorInput(BULLISH, "Bullish", "bullColor", "Color of the Fisher line and fill while it is above the trigger."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the Fisher line and fill while it is below the trigger.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 9);
    const hl2 = sourceValues(bars, "HL2");
    const hi = highest(hl2, len);
    const lo = lowest(hl2, len);
    const n = bars.length;
    const out = new Array(n).fill(Number.NaN);
    let position = 0;
    let value = 0;
    for (let i = 0; i < n; i++) {
      const h = hi[i];
      const l = lo[i];
      if (!Number.isFinite(h) || !Number.isFinite(l)) continue;
      const raw = h > l ? (hl2[i] - l) / (h - l) - 0.5 : 0;
      position = 0.66 * raw + 0.67 * position;
      position = position > 0.99 ? 0.999 : position < -0.99 ? -0.999 : position;
      value = 0.5 * Math.log((1 + position) / (1 - position)) + 0.5 * value;
      out[i] = value;
    }
    const trigger = shift(out, 1);
    const neutral = str3(inputs, "color", NEUTRAL);
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const inkOf = (i) => {
      const f = out[i];
      const t = trigger[i];
      if (!Number.isFinite(t)) return neutral;
      return f > t ? bull : f < t ? bear : neutral;
    };
    return {
      plots: [
        { key: "fisher", title: "Fisher", values: out, color: neutral, width: 2, colors: out.map((x, i) => Number.isFinite(x) ? inkOf(i) : null) },
        { key: "trigger", title: "Trigger", values: trigger, color: str3(inputs, "triggerColor", NEUTRAL) }
      ],
      bands: [{ key: "spread", from: "fisher", to: "trigger", color: transp(neutral, 80), colors: out.map((x, i) => Number.isFinite(x) ? transp(inkOf(i), 80) : null) }],
      levels: [
        { key: "upper", price: 1.5, color: NEUTRAL, lineStyle: "dashed", title: "Upper Level" },
        { key: "lower", price: -1.5, color: NEUTRAL, lineStyle: "dashed", title: "Lower Level" },
        { key: "zero", price: 0, color: NEUTRAL, lineStyle: "dotted", title: "Zero Line" }
      ]
    };
  }
};
var trix = {
  type: "trix",
  title: "TRIX",
  overlay: false,
  inputs: [
    lengthInput(18, "length", "Length", 5e3, "Length of each of the three EMA smoothing passes applied to the close price."),
    lengthInput(9, "signalLength", "Signal Length", 500, "Length of the EMA applied to TRIX to form the signal line."),
    colorInput(NEUTRAL, "TRIX Color", "color", "Color of the TRIX line."),
    colorInput(WARNING, "Signal Color", "signalColor", "Color of the signal line."),
    colorInput(BULLISH, "Bullish", "bullColor", "Color of the TRIX line and its gradient fill while TRIX holds above zero."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the TRIX line and its gradient fill while TRIX holds below zero.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 18);
    const smooth = ema(ema(ema(closes(bars), len), len), len);
    const values = roc(smooth, 1);
    return centeredOscillator({
      key: "trix",
      title: "TRIX",
      values,
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: NEUTRAL,
      extraPlots: [{ key: "signal", title: "Signal", values: ema(values, num3(inputs, "signalLength", 9)), color: str3(inputs, "signalColor", WARNING) }]
    });
  }
};
function tsiRatio(src, long, short) {
  const mom = change(src);
  const numer = ema(ema(mom, long), short);
  const denom = ema(ema(map(mom, Math.abs), long), short);
  return zip(numer, denom, (a, b) => b === 0 ? 0 : a / b);
}
var tsi = {
  type: "true-strength-index",
  title: "True Strength Index",
  shortTitle: "TSI",
  overlay: false,
  inputs: [
    lengthInput(25, "longLength", "Long Length", 5e3, "Length of the first (long) EMA applied to the 1-bar price change."),
    lengthInput(13, "shortLength", "Short Length", 5e3, "Length of the second (short) EMA applied to the long-smoothed price change."),
    lengthInput(13, "signalLength", "Signal Length", 500, "Length of the EMA of TSI used as the signal line."),
    colorInput(NEUTRAL, "TSI", "color", "Color of the TSI line."),
    colorInput(WARNING, "Signal", "signalColor", "Color of the signal line."),
    colorInput(BULLISH, "Bullish", "bullColor", "Color of the TSI line and its gradient fill while TSI holds above zero."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the TSI line and its gradient fill while TSI holds below zero.")
  ],
  compute: (bars, inputs) => {
    const values = map(tsiRatio(closes(bars), num3(inputs, "longLength", 25), num3(inputs, "shortLength", 13)), (x) => 100 * x);
    return centeredOscillator({
      key: "tsi",
      title: "TSI",
      values,
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: NEUTRAL,
      extraPlots: [{ key: "signal", title: "Signal", values: ema(values, num3(inputs, "signalLength", 13)), color: str3(inputs, "signalColor", WARNING) }]
    });
  }
};
var SMI_INDICATOR = "Indicator";
var SMI_OSCILLATOR = "Oscillator";
var smiErgodic = {
  type: "smi-ergodic",
  title: "SMI Ergodic Oscillator",
  shortTitle: "SMIE",
  overlay: false,
  inputs: [
    lengthInput(20, "longLength", "Long Length", 5e3, "Length of the first EMA smoothing applied to the momentum of the closing price."),
    lengthInput(5, "shortLength", "Short Length", 5e3, "Length of the second EMA smoothing applied to the momentum of the closing price."),
    lengthInput(5, "signalLength", "Signal Length", 500, "Length of the EMA of the SMI that forms the signal line."),
    optionInput("display", "Display", SMI_INDICATOR, [SMI_INDICATOR, SMI_OSCILLATOR], "Indicator plots the SMI and its signal line. Oscillator plots the difference between them as a histogram."),
    colorInput(NEUTRAL, "SMI", "color", "Color of the SMI line while it sits exactly on its signal line."),
    colorInput(WARNING, "Signal", "signalColor", "Color of the signal line."),
    colorInput(BULLISH, "Oscillator Grow", "growColor", "Color of the rising oscillator histogram, and of the SMI line while it leads its signal."),
    colorInput(BEARISH, "Oscillator Fall", "fallColor", "Color of the falling oscillator histogram, and of the SMI line while it lags its signal.")
  ],
  compute: (bars, inputs) => {
    const smi = tsiRatio(closes(bars), num3(inputs, "longLength", 20), num3(inputs, "shortLength", 5));
    const signal = ema(smi, num3(inputs, "signalLength", 5));
    const grow = str3(inputs, "growColor", BULLISH);
    const fall = str3(inputs, "fallColor", BEARISH);
    const zero = [{ key: "zero", price: 0, color: transp(NEUTRAL, 50), lineStyle: "dashed", title: "Zero" }];
    if (str3(inputs, "display", SMI_INDICATOR) === SMI_OSCILLATOR) {
      const osc = sub(smi, signal);
      const colors = osc.map((x, i) => {
        if (!Number.isFinite(x)) return null;
        const prev = i > 0 && Number.isFinite(osc[i - 1]) ? osc[i - 1] : x;
        return x > prev ? grow : fall;
      });
      return { plots: [{ key: "osc", title: "Oscillator", values: osc, kind: "columns", color: grow, colors, base: 0 }], levels: zero };
    }
    const neutral = str3(inputs, "color", NEUTRAL);
    const inkOf = (i) => {
      const a = smi[i];
      const b = signal[i];
      if (!Number.isFinite(b)) return neutral;
      return a > b ? grow : a < b ? fall : neutral;
    };
    return {
      plots: [
        { key: "smi", title: "SMI", values: smi, color: neutral, colors: smi.map((x, i) => Number.isFinite(x) ? inkOf(i) : null) },
        { key: "signal", title: "Signal", values: signal, color: str3(inputs, "signalColor", WARNING) }
      ],
      bands: [{ key: "spread", from: "smi", to: "signal", color: transp(neutral, 75), colors: smi.map((x, i) => Number.isFinite(x) ? transp(inkOf(i), 75) : null) }],
      levels: zero
    };
  }
};
var STC_MID = 50;
var TRIGGERS = "Trigger Levels";
var stc = {
  type: "schaff-trend-cycle",
  title: "Schaff Trend Cycle",
  shortTitle: "Schaff Trend Cycle",
  overlay: false,
  inputs: [
    sourceInput("Close", "source", "Source", "Price series used to build the MACD that the trend cycle is measured on."),
    lengthInput(23, "fastLength", "Fast Length", 5e3, "Fast EMA length of the underlying MACD."),
    lengthInput(50, "slowLength", "Slow Length", 5e3, "Slow EMA length of the underlying MACD."),
    { ...lengthInput(10, "cycleLength", "Cycle Length", 5e3, "Window of the two stochastic passes. Each pass measures where its input sits inside the range of its own values over this many bars."), min: 2 },
    floatInput("factor", "Smoothing Factor", 0.5, 0.01, 1, 0.05, "%D style recursive smoothing applied after each stochastic pass. 0.5 is the published default."),
    { ...floatInput("upper", "Upper Trigger", 75, 0, 100, 1, "Upper trigger line. A cross down through it flags an emerging downtrend."), group: TRIGGERS },
    { ...floatInput("lower", "Lower Trigger", 25, 0, 100, 1, "Lower trigger line. A cross up through it flags an emerging uptrend."), group: TRIGGERS },
    colorInput(BULLISH, "Bullish Color", "bullColor", "Color of the trend cycle line and gradient while the cycle holds the upper half of its 0-100 scale."),
    colorInput(BEARISH, "Bearish Color", "bearColor", "Color of the trend cycle line and gradient while the cycle holds the lower half of its 0-100 scale."),
    colorInput(NEUTRAL, "Levels Color", "levelsColor", "Color of the dashed trigger lines and the dotted midline."),
    boolInput("gradientFill", "Gradient Fill", true, STYLE, "Vertical gradient between the midline and the trend cycle, fading out toward the midline.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "cycleLength", 10);
    const factor = num3(inputs, "factor", 0.5);
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const macdLine = sub(ema(src, num3(inputs, "fastLength", 23)), ema(src, num3(inputs, "slowLength", 50)));
    const stochNorm = (v) => {
      const lo = lowest(v, len);
      const hi = highest(v, len);
      const out = new Array(v.length).fill(Number.NaN);
      let pct = Number.NaN;
      for (let i = 0; i < v.length; i++) {
        const x = v[i];
        const l = lo[i];
        const h = hi[i];
        if (!Number.isFinite(x) || !Number.isFinite(l) || !Number.isFinite(h)) continue;
        if (h > l) pct = 100 * (x - l) / (h - l);
        out[i] = pct;
      }
      return out;
    };
    const smoothStep = (v) => {
      const out = new Array(v.length).fill(Number.NaN);
      let smoothed = Number.NaN;
      for (let i = 0; i < v.length; i++) {
        const x = v[i];
        if (!Number.isFinite(x)) continue;
        smoothed = Number.isFinite(smoothed) ? smoothed + factor * (x - smoothed) : x;
        out[i] = smoothed;
      }
      return out;
    };
    const values = smoothStep(stochNorm(smoothStep(stochNorm(macdLine))));
    const levelInk = str3(inputs, "levelsColor", NEUTRAL);
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const plots = [
      { key: "stc", title: "Schaff Trend Cycle", values, color: bear, width: 2, colors: values.map((x) => Number.isFinite(x) ? x > STC_MID ? bull : bear : null) }
    ];
    const bands = [];
    if (bool(inputs, "gradientFill", true)) {
      plots.push(anchorPlot("midAnchor", "Midline Anchor", values.length, STC_MID));
      bands.push({ key: "wash", from: "stc", to: "midAnchor", color: transp(NEUTRAL, 100), gradient: baselineGradient(values, STC_MID, (x) => x > STC_MID ? bull : bear) });
    }
    return {
      plots,
      bands,
      levels: [
        { key: "upper", price: num3(inputs, "upper", 75), color: transp(levelInk, 25), lineStyle: "dashed", title: "Upper Trigger" },
        { key: "lower", price: num3(inputs, "lower", 25), color: transp(levelInk, 25), lineStyle: "dashed", title: "Lower Trigger" },
        { key: "midline", price: STC_MID, color: transp(levelInk, 60), lineStyle: "dotted", title: "Midline" }
      ]
    };
  }
};
var kst = {
  type: "know-sure-thing",
  title: "Know Sure Thing",
  shortTitle: "KST",
  overlay: false,
  inputs: [
    lengthInput(10, "rocLength1", "ROC Length #1", 5e3, "Lookback of the first (shortest) rate of change."),
    lengthInput(15, "rocLength2", "ROC Length #2", 5e3, "Lookback of the second rate of change."),
    lengthInput(20, "rocLength3", "ROC Length #3", 5e3, "Lookback of the third rate of change."),
    lengthInput(30, "rocLength4", "ROC Length #4", 5e3, "Lookback of the fourth (longest) rate of change."),
    lengthInput(10, "smaLength1", "SMA Length #1", 5e3, "Smoothing length applied to the first rate of change (RCMA #1)."),
    lengthInput(10, "smaLength2", "SMA Length #2", 5e3, "Smoothing length applied to the second rate of change (RCMA #2)."),
    lengthInput(10, "smaLength3", "SMA Length #3", 5e3, "Smoothing length applied to the third rate of change (RCMA #3)."),
    lengthInput(15, "smaLength4", "SMA Length #4", 5e3, "Smoothing length applied to the fourth rate of change (RCMA #4)."),
    lengthInput(9, "signalLength", "Signal Length", 500, "Simple moving average length of the signal line."),
    colorInput(BULLISH, "Bullish", "bullColor", "Color of the KST line while above zero."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the KST line while below zero."),
    colorInput(WARNING, "Signal", "signalColor", "Color of the signal line.")
  ],
  compute: (bars, inputs) => {
    const c = closes(bars);
    const rcma = (rocKey, rocDefault, smaKey, smaDefault) => sma(roc(c, num3(inputs, rocKey, rocDefault)), num3(inputs, smaKey, smaDefault));
    const values = [rcma("rocLength1", 10, "smaLength1", 10), rcma("rocLength2", 15, "smaLength2", 10), rcma("rocLength3", 20, "smaLength3", 10), rcma("rocLength4", 30, "smaLength4", 15)].reduce(
      (acc, r, i) => zip(acc, r, (a, b) => a + b * (i + 1)),
      new Array(c.length).fill(0)
    );
    const bull = str3(inputs, "bullColor", BULLISH);
    return centeredOscillator({
      key: "kst",
      title: "KST",
      values,
      ink: { bull, bear: str3(inputs, "bearColor", BEARISH), neutral: bull },
      zeroInk: NEUTRAL,
      valueTransparency: 60,
      extraPlots: [{ key: "signal", title: "Signal", values: sma(values, num3(inputs, "signalLength", 9)), color: str3(inputs, "signalColor", WARNING) }]
    });
  }
};
var coppock = {
  type: "coppock-curve",
  title: "Coppock Curve",
  shortTitle: "Coppock",
  overlay: false,
  inputs: [
    lengthInput(10, "wmaLength", "WMA Length", 5e3, "Length of the weighted moving average applied to the sum of the two rates of change."),
    lengthInput(14, "longRoc", "Long RoC Length", 5e3, "Lookback of the long rate of change, in bars. The original definition uses 14 monthly closes."),
    lengthInput(11, "shortRoc", "Short RoC Length", 5e3, "Lookback of the short rate of change, in bars. The original definition uses 11 monthly closes."),
    sourceInput("Close", "source", "Source", "Price series used for the rate of change calculations."),
    colorInput(NEUTRAL, "Coppock Curve", "color", "Color of the Coppock Curve line."),
    colorInput(BULLISH, "Bullish", "bullColor", "Line and fill color while the curve reads above zero."),
    colorInput(BEARISH, "Bearish", "bearColor", "Line and fill color while the curve reads below zero."),
    colorInput(NEUTRAL, "Zero Line", "zeroColor", "Color of the zero reference line.")
  ],
  compute: (bars, inputs) => {
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const values = wma(zip(roc(src, num3(inputs, "longRoc", 14)), roc(src, num3(inputs, "shortRoc", 11)), (a, b) => a + b), num3(inputs, "wmaLength", 10));
    return centeredOscillator({
      key: "coppock",
      title: "Coppock Curve",
      values,
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: str3(inputs, "zeroColor", NEUTRAL)
    });
  }
};
var dpo = {
  type: "detrended-price-oscillator",
  title: "Detrended Price Oscillator",
  shortTitle: "DPO",
  overlay: false,
  inputs: [
    lengthInput(21, "length", "Length", 5e3, "Lookback of the simple moving average that price is detrended against. The comparison is displaced by Length / 2 + 1 bars."),
    sourceInput("Close", "source", "Source", "Price series used in the detrending calculation."),
    boolInput("centered", "Centered", false, void 0, "Shifts the oscillator back by Length / 2 + 1 bars so it is centered on the prices it detrends. The most recent bars then show no value."),
    colorInput(NEUTRAL, "DPO", "color", "Color of the line when it sits exactly at zero."),
    colorInput(BULLISH, "Above Zero", "bullColor", "Color of the line and fill while the oscillator is above zero."),
    colorInput(BEARISH, "Below Zero", "bearColor", "Color of the line and fill while the oscillator is below zero."),
    colorInput(NEUTRAL, "Zero Line", "zeroColor", "Color of the zero reference line.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 21);
    const barsBack = Math.trunc(len / 2) + 1;
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const basis = sma(src, len);
    const centered = bool(inputs, "centered", false);
    const values = centered ? shift(sub(shift(src, barsBack), basis), -barsBack) : sub(src, shift(basis, barsBack));
    return centeredOscillator({
      key: "dpo",
      title: "DPO",
      values,
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: str3(inputs, "zeroColor", NEUTRAL)
    });
  }
};
var ROC_PERCENT = "ROC %";
var ROC_MOMENTUM = "Momentum";
var rocSpec = {
  type: "rate-of-change",
  title: "Rate of Change",
  shortTitle: "ROC",
  overlay: false,
  inputs: [
    lengthInput(9, "length", "Length", 5e3, "Lookback period; the source is compared with its value this many bars ago."),
    sourceInput("Close", "source", "Source", "Series used as input for the calculation."),
    optionInput("mode", "Mode", ROC_PERCENT, [ROC_PERCENT, ROC_MOMENTUM], "ROC % plots the change as a percentage of the source value from the lookback; Momentum plots the raw difference."),
    colorInput(NEUTRAL, "Line", "color", "Color of the line when the reading sits exactly at zero."),
    colorInput(BULLISH, "Bullish", "bullColor", "Color of the line and fill while the reading is above zero."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the line and fill while the reading is below zero."),
    boolInput("gradientFill", "Gradient Fill", true, STYLE, "Fills the area between the line and zero, following the line color.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 9);
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const values = str3(inputs, "mode", ROC_PERCENT) === ROC_MOMENTUM ? change(src, len) : roc(src, len);
    return centeredOscillator({
      key: "roc",
      title: "ROC",
      values,
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: NEUTRAL,
      fill: bool(inputs, "gradientFill", true)
    });
  }
};
var ultimate = {
  type: "ultimate-oscillator",
  title: "Ultimate Oscillator",
  shortTitle: "UO",
  overlay: false,
  inputs: [
    lengthInput(7, "fastLength", "Fast Length", 5e3, "Bars in the fastest averaging window. Weighted 4 in the final blend, so it dominates the oscillator."),
    lengthInput(14, "middleLength", "Middle Length", 5e3, "Bars in the intermediate averaging window. Weighted 2 in the final blend."),
    lengthInput(28, "slowLength", "Slow Length", 5e3, "Bars in the slowest averaging window. Weighted 1 in the final blend."),
    ...thresholdInputs(70, 30, 0, 100, "Overbought", "Oversold"),
    colorInput(NEUTRAL, "Oscillator", "color", "Color of the line midway between the levels. Toward either level it blends into that level\u2019s color."),
    colorInput(NEUTRAL, "Levels", "levelsColor", "Color of the overbought and oversold levels."),
    colorInput(BULLISH, "Oversold", "oversoldColor", "Color of the line at the oversold level and of the oversold zone shading."),
    colorInput(BEARISH, "Overbought", "overboughtColor", "Color of the line at the overbought level and of the overbought zone shading.")
  ],
  compute: (bars, inputs) => {
    const n = bars.length;
    const bp = new Array(n).fill(Number.NaN);
    const tr = new Array(n).fill(Number.NaN);
    for (let i = 0; i < n; i++) {
      const b = bars[i];
      const pc = i > 0 ? bars[i - 1].close : b.close;
      const trueLow = Math.min(b.low, pc);
      bp[i] = b.close - trueLow;
      tr[i] = Math.max(b.high, pc) - trueLow;
    }
    const avg = (len) => zip(sum(bp, len), sum(tr, len), (a, b) => b === 0 ? Number.NaN : a / b);
    const a7 = avg(num3(inputs, "fastLength", 7));
    const a14 = avg(num3(inputs, "middleLength", 14));
    const a28 = avg(num3(inputs, "slowLength", 28));
    const values = a7.map((x, i) => {
      const y = a14[i];
      const z = a28[i];
      return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? 100 * (4 * x + 2 * y + z) / 7 : Number.NaN;
    });
    return boundedOscillator({
      key: "uo",
      title: "UO",
      values,
      scale: { top: 100, bottom: 0 },
      overbought: num3(inputs, "overbought", 70),
      oversold: num3(inputs, "oversold", 30),
      ink: { low: str3(inputs, "oversoldColor", BULLISH), mid: str3(inputs, "color", NEUTRAL), high: str3(inputs, "overboughtColor", BEARISH) },
      levelInk: str3(inputs, "levelsColor", NEUTRAL),
      zoneTransparency: 91
    });
  }
};
var rvgi = {
  type: "relative-vigor-index",
  title: "Relative Vigor Index",
  shortTitle: "RVGI",
  overlay: false,
  inputs: [
    lengthInput(10, "length", "Length", 5e3, "Number of bars summed for the smoothed numerator (close \u2212 open) and denominator (high \u2212 low)."),
    colorInput(BULLISH, "RVGI", "color", "Color of the RVGI line."),
    colorInput(BEARISH, "Signal", "signalColor", "Color of the signal line.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 10);
    const co = swma(sub(closes(bars), opens(bars)));
    const hl = swma(sub(highs(bars), lows(bars)));
    const line = zip(sum(co, len), sum(hl, len), (a, b) => b === 0 ? 0 : a / b);
    return {
      plots: [
        { key: "rvgi", title: "RVGI", values: line, color: str3(inputs, "color", BULLISH) },
        { key: "signal", title: "Signal", values: swma(line), color: str3(inputs, "signalColor", BEARISH) }
      ],
      levels: [{ key: "zero", price: 0, color: transp(NEUTRAL, 50), lineStyle: "dashed", title: "Zero" }]
    };
  }
};
var RVI_EMA = "EMA";
var RVI_RMA = "Wilder (RMA)";
var relVolatility = {
  type: "relative-volatility-index",
  title: "Relative Volatility Index",
  shortTitle: "RVI",
  overlay: false,
  inputs: [
    lengthInput(10, "stdevLength", "Stdev Length", 5e3, "Number of bars used for the standard deviation of closing prices that serves as each bar's volatility reading."),
    lengthInput(14, "smoothLength", "Smoothing Length", 5e3, "Number of bars used to smooth the up and down volatility streams."),
    optionInput("smoothType", "Smoothing Type", RVI_EMA, [RVI_EMA, RVI_RMA], "Moving average applied to the volatility streams. EMA is Dorsey's classic calculation; Wilder (RMA) matches platforms that use Wilder smoothing."),
    ...thresholdInputs(80, 20),
    colorInput(NEUTRAL, "RVI Line", "color", "Color of the RVI line at the midline. Toward either threshold it blends into that threshold\u2019s color."),
    colorInput(BULLISH, "Up Volatility", "overboughtColor", "Color of the line and zone shading at and above the overbought level."),
    colorInput(BEARISH, "Down Volatility", "oversoldColor", "Color of the line and zone shading at and below the oversold level.")
  ],
  compute: (bars, inputs) => {
    const c = closes(bars);
    const sigma = stdev(c, num3(inputs, "stdevLength", 10));
    const d = change(c);
    const up = zip(sigma, d, (s, x) => x > 0 ? s : 0);
    const down = zip(sigma, d, (s, x) => x < 0 ? s : 0);
    const smoothLen = num3(inputs, "smoothLength", 14);
    const smooth = str3(inputs, "smoothType", RVI_EMA) === RVI_RMA ? rma : ema;
    const values = zip(smooth(up, smoothLen), smooth(down, smoothLen), (u, w) => u + w === 0 ? 0 : 100 * u / (u + w));
    return boundedOscillator({
      key: "rvi",
      title: "RVI",
      values,
      scale: { top: 100, bottom: 0 },
      overbought: num3(inputs, "overbought", 80),
      oversold: num3(inputs, "oversold", 20),
      ink: { low: str3(inputs, "oversoldColor", BEARISH), mid: str3(inputs, "color", NEUTRAL), high: str3(inputs, "overboughtColor", BULLISH) },
      levelInk: NEUTRAL,
      width: 2
    });
  }
};
var bop = {
  type: "balance-of-power",
  title: "Balance of Power",
  shortTitle: "BOP",
  overlay: false,
  inputs: [
    boolInput("smoothing", "Smoothing", false, void 0, "Smooth the raw Balance of Power with a simple moving average instead of plotting the single-bar value."),
    lengthInput(14, "smoothLength", "Length", 5e3, "Simple moving average length applied when smoothing is enabled."),
    colorInput(NEUTRAL, "BOP Color", "color", "Color of the line at exactly zero."),
    colorInput(BULLISH, "Bullish", "bullColor", "Line and fill color while the Balance of Power is above zero \u2014 buyers in control of the bar."),
    colorInput(BEARISH, "Bearish", "bearColor", "Line and fill color while the Balance of Power is below zero \u2014 sellers in control of the bar.")
  ],
  compute: (bars, inputs) => {
    const raw = bars.map((b) => b.high === b.low ? 0 : (b.close - b.open) / (b.high - b.low));
    const values = bool(inputs, "smoothing", false) ? sma(raw, num3(inputs, "smoothLength", 14)) : raw;
    return centeredOscillator({
      key: "bop",
      title: "BOP",
      values,
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: NEUTRAL,
      valueTransparency: 60
    });
  }
};
var elderRay = {
  type: "elder-ray",
  title: "Elder Ray",
  overlay: false,
  inputs: [
    lengthInput(13, "length", "EMA Length", 5e3, "Number of bars in the exponential moving average of closing prices used as the reference level for Bull Power and Bear Power. Alexander Elder's classic setting is 13."),
    colorInput(BULLISH, "Bull Power", "bullColor", "Color of the Bull Power columns."),
    colorInput(BEARISH, "Bear Power", "bearColor", "Color of the Bear Power columns.")
  ],
  compute: (bars, inputs) => {
    const basis = ema(closes(bars), num3(inputs, "length", 13));
    return {
      plots: [
        { key: "bull", title: "Bull Power", values: sub(highs(bars), basis), kind: "columns", color: str3(inputs, "bullColor", BULLISH), base: 0 },
        { key: "bear", title: "Bear Power", values: sub(lows(bars), basis), kind: "columns", color: str3(inputs, "bearColor", BEARISH), base: 0 }
      ],
      levels: [{ key: "zero", price: 0, color: transp(NEUTRAL, 30), lineStyle: "dashed", title: "Zero Line" }]
    };
  }
};
var ttmSqueeze = {
  type: "ttm-squeeze",
  title: "TTM Squeeze",
  overlay: false,
  inputs: [
    { ...lengthInput(20, "length", "Length", 5e3, "Shared lookback for the Bollinger Bands, the Keltner Channels, and the momentum regression. John Carter's original setting is 20."), min: 2 },
    sourceInput("Close", "source", "Source", "Price series used for the shared moving average basis, the standard deviation, and the momentum displacement."),
    floatInput("bbMult", "Bollinger Bands Multiplier", 2, 0.1, 50, 0.1, "Standard deviation multiplier for the Bollinger Bands."),
    floatInput("kcMult", "Keltner Channels Multiplier", 1.5, 0.1, 50, 0.1, "ATR multiplier for the Keltner Channels. A smaller multiplier demands a tighter compression before the squeeze turns on."),
    colorInput(BULLISH, "Momentum Up", "bullColor", "Histogram color while momentum is positive. Bars building away from zero print solid, bars fading back print dimmed."),
    colorInput(BEARISH, "Momentum Down", "bearColor", "Histogram color while momentum is negative. Bars building away from zero print solid, bars fading back print dimmed."),
    colorInput(WARNING, "Squeeze On", "squeezeOnColor", "Zero-line dot color while both Bollinger Bands sit fully inside the Keltner Channels."),
    colorInput(NEUTRAL, "Squeeze Off", "squeezeOffColor", "Zero-line dot color while the Bollinger Bands trade outside the Keltner Channels."),
    boolInput("markFires", "Mark Squeeze Fires", true, STYLE, "Draws a cross on the zero line on the first bar where the bands re-emerge outside the channels, colored by the side of the momentum histogram.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 20);
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const basis = sma(src, len);
    const dev = map(stdev(src, len), (x) => x * num3(inputs, "bbMult", 2));
    const kcRange = map(atr(bars, len), (x) => x * num3(inputs, "kcMult", 1.5));
    const rangeMid = zip(highest(highs(bars), len), lowest(lows(bars), len), (h, l) => (h + l) / 2);
    const anchor = zip(rangeMid, basis, (d, b) => (d + b) / 2);
    const mom = linreg(sub(src, anchor), len, 0);
    const squeezeOn = basis.map((b, i) => {
      const d = dev[i];
      const r = kcRange[i];
      if (!Number.isFinite(b) || !Number.isFinite(d) || !Number.isFinite(r)) return null;
      return d < r;
    });
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const onInk = str3(inputs, "squeezeOnColor", WARNING);
    const offInk = str3(inputs, "squeezeOffColor", NEUTRAL);
    const momColors = mom.map((x, i) => {
      if (!Number.isFinite(x)) return null;
      const prev = i > 0 && Number.isFinite(mom[i - 1]) ? mom[i - 1] : x;
      const rising = x > prev;
      return x >= 0 ? rising ? bull : transp(bull, 60) : rising ? transp(bear, 60) : bear;
    });
    const plots = [
      { key: "mom", title: "Momentum", values: mom, kind: "columns", color: bull, colors: momColors, base: 0 },
      {
        key: "state",
        title: "Squeeze State",
        values: squeezeOn.map((s) => s == null ? Number.NaN : 0),
        kind: "circles",
        color: offInk,
        width: 2,
        colors: squeezeOn.map((s) => s == null ? null : s ? onInk : offInk)
      }
    ];
    if (bool(inputs, "markFires", true)) {
      const fires = squeezeOn.map((s, i) => s === false && squeezeOn[i - 1] === true ? 0 : Number.NaN);
      plots.push({
        key: "fire",
        title: "Squeeze Fire",
        values: fires,
        kind: "cross",
        color: offInk,
        width: 3,
        colors: fires.map((x, i) => Number.isFinite(x) ? Number.isFinite(mom[i]) ? mom[i] >= 0 ? bull : bear : offInk : null)
      });
    }
    return { plots };
  }
};
var oscillatorSpecs = [
  rsiSpec,
  stochastic,
  stochasticRsi,
  macd,
  ppo,
  awesome,
  cci,
  williamsR,
  cmoSpec,
  connorsRsi,
  fisher,
  trix,
  tsi,
  smiErgodic,
  stc,
  kst,
  coppock,
  dpo,
  rocSpec,
  ultimate,
  rvgi,
  relVolatility,
  bop,
  elderRay,
  ttmSqueeze
];

// src/core/native-indicators/classics/trend.ts
var aroon = {
  type: "aroon",
  title: "Aroon",
  overlay: false,
  inputs: [
    lengthInput(14, "length", "Length", 5e3, "Lookback length used to locate the highest high and lowest low."),
    colorInput(BULLISH, "Aroon Up", "upColor", "Color of the Aroon Up line."),
    colorInput(BEARISH, "Aroon Down", "downColor", "Color of the Aroon Down line.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 14);
    const up = map(barsSinceHighest(highs(bars), len), (x) => 100 * (len - x) / len);
    const down = map(barsSinceLowest(lows(bars), len), (x) => 100 * (len - x) / len);
    return {
      plots: [
        { key: "up", title: "Aroon Up", values: up, color: str3(inputs, "upColor", BULLISH) },
        { key: "down", title: "Aroon Down", values: down, color: str3(inputs, "downColor", BEARISH) }
      ]
    };
  }
};
var adx = {
  type: "average-directional-index",
  title: "Average Directional Index",
  shortTitle: "ADX",
  overlay: false,
  inputs: [
    lengthInput(14, "diLength", "DI Length", 5e3, "Wilder RMA smoothing length applied to directional movement and true range when computing +DI and \u2212DI."),
    lengthInput(14, "adxLength", "ADX Smoothing", 5e3, "Wilder RMA smoothing length applied to DX to obtain the ADX line."),
    floatInput("keyLevel", "Key Level", 25, 0, 100, 1, "Trend strength reference level; ADX above it is commonly read as a trending market."),
    colorInput(BULLISH, "+DI Color", "plusDiColor", "Color of the plus directional indicator, and of the ADX line above the key level while +DI leads."),
    colorInput(BEARISH, "-DI Color", "minusDiColor", "Color of the minus directional indicator, and of the ADX line above the key level while \u2212DI leads."),
    colorInput(NEUTRAL, "ADX Color", "adxColor", "Color of the ADX line while it sits below the key level \u2014 no trend strong enough to trade.")
  ],
  compute: (bars, inputs) => {
    const diLen = num3(inputs, "diLength", 14);
    const n = bars.length;
    const plusDm = new Array(n).fill(Number.NaN);
    const minusDm = new Array(n).fill(Number.NaN);
    for (let i = 1; i < n; i++) {
      const up = bars[i].high - bars[i - 1].high;
      const dn = bars[i - 1].low - bars[i].low;
      plusDm[i] = up > dn && up > 0 ? up : 0;
      minusDm[i] = dn > up && dn > 0 ? dn : 0;
    }
    const atrLine = rma(trueRange(bars), diLen);
    const plusDi = zip(rma(plusDm, diLen), atrLine, (d, a) => a === 0 ? 0 : 100 * d / a);
    const minusDi = zip(rma(minusDm, diLen), atrLine, (d, a) => a === 0 ? 0 : 100 * d / a);
    const dx = zip(plusDi, minusDi, (p, m) => p + m === 0 ? 0 : 100 * Math.abs(p - m) / (p + m));
    const adxLine = rma(dx, num3(inputs, "adxLength", 14));
    const plusInk = str3(inputs, "plusDiColor", BULLISH);
    const minusInk = str3(inputs, "minusDiColor", BEARISH);
    const neutralInk = str3(inputs, "adxColor", NEUTRAL);
    const keyLevel = num3(inputs, "keyLevel", 25);
    const adxColors = adxLine.map((x, i) => {
      if (!Number.isFinite(x)) return null;
      if (x <= keyLevel) return neutralInk;
      return (plusDi[i] ?? 0) > (minusDi[i] ?? 0) ? plusInk : minusInk;
    });
    return {
      plots: [
        { key: "plusDi", title: "+DI", values: plusDi, color: transp(plusInk, 30) },
        { key: "minusDi", title: "-DI", values: minusDi, color: transp(minusInk, 30) },
        { key: "adx", title: "ADX", values: adxLine, color: neutralInk, width: 2, colors: adxColors }
      ],
      levels: [{ key: "keyLevel", price: keyLevel, color: NEUTRAL, lineStyle: "dashed", title: "Key Level" }]
    };
  }
};
var vortex = {
  type: "vortex-indicator",
  title: "Vortex Indicator",
  shortTitle: "VI",
  overlay: false,
  inputs: [
    lengthInput(14, "length", "Length", 5e3, "Number of bars used to sum the vortex movements (VM+ and VM\u2212) and the true range."),
    colorInput(BULLISH, "VI+", "plusColor", "Color of the positive vortex line (VI+)."),
    colorInput(BEARISH, "VI-", "minusColor", "Color of the negative vortex line (VI\u2212)."),
    colorInput(NEUTRAL, "Baseline", "baselineColor", "Color of the dotted baseline drawn at 1.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 14);
    const n = bars.length;
    const vmPlus = new Array(n).fill(Number.NaN);
    const vmMinus = new Array(n).fill(Number.NaN);
    for (let i = 1; i < n; i++) {
      vmPlus[i] = Math.abs(bars[i].high - bars[i - 1].low);
      vmMinus[i] = Math.abs(bars[i].low - bars[i - 1].high);
    }
    const trSum = sum(trueRange(bars), len);
    return {
      plots: [
        { key: "viPlus", title: "VI+", values: zip(sum(vmPlus, len), trSum, (v, t) => t === 0 ? Number.NaN : v / t), color: str3(inputs, "plusColor", BULLISH) },
        { key: "viMinus", title: "VI-", values: zip(sum(vmMinus, len), trSum, (v, t) => t === 0 ? Number.NaN : v / t), color: str3(inputs, "minusColor", BEARISH) }
      ],
      levels: [{ key: "baseline", price: 1, color: str3(inputs, "baselineColor", NEUTRAL), lineStyle: "dotted", title: "Baseline" }]
    };
  }
};
var trendSpecs = [aroon, adx, vortex];

// src/core/native-indicators/classics/volatility.ts
function expansionColors(values, calm, expanding) {
  return values.map((x, i) => {
    if (!Number.isFinite(x)) return null;
    const prev = i > 0 && Number.isFinite(values[i - 1]) ? values[i - 1] : x;
    return x > prev ? expanding : calm;
  });
}
function washedToZero(key, title, values, colors, fallback, valueTransparency, width = 1) {
  return {
    plots: [{ key, title, values, color: fallback, width, colors }, anchorPlot("zeroAnchor", "Zero Anchor", values.length, 0)],
    bands: [{ key: "wash", from: key, to: "zeroAnchor", color: transp(NEUTRAL, 100), gradient: baselineGradient(values, 0, (_x, i) => colors[i] ?? fallback, valueTransparency) }]
  };
}
var atrSpec = {
  type: "average-true-range",
  title: "Average True Range",
  shortTitle: "ATR",
  overlay: false,
  inputs: [
    lengthInput(14, "length", "Length", 5e3, "Number of bars used to average the true range."),
    optionInput("smoothing", "Smoothing", "RMA", ["RMA", "SMA", "EMA", "WMA"], "Moving average applied to the true range. RMA is Wilder's original smoothing used by the classic ATR."),
    colorInput(NEUTRAL, "ATR Line", "color", "Color of the ATR line while volatility contracts or holds flat."),
    colorInput(WARNING, "Expanding", "expandColor", "Color of the ATR line while it rises \u2014 volatility expanding bar to bar.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 14);
    const tr = trueRange(bars);
    const kind = str3(inputs, "smoothing", "RMA");
    const values = kind === "SMA" ? sma(tr, len) : kind === "EMA" ? ema(tr, len) : kind === "WMA" ? wma(tr, len) : rma(tr, len);
    const calm = str3(inputs, "color", NEUTRAL);
    return washedToZero("atr", "ATR", values, expansionColors(values, calm, str3(inputs, "expandColor", WARNING)), calm, 75);
  }
};
var historicalVolatility = {
  type: "historical-volatility",
  title: "Historical Volatility",
  shortTitle: "HV",
  overlay: false,
  inputs: [
    { ...lengthInput(10, "length", "Length", 5e3, "Lookback window in bars for the standard deviation of close-to-close log returns."), min: 2 },
    boolInput("annualize", "Annualize", true, void 0, "Scale the per-bar volatility to an annual figure by multiplying by the square root of the periods per year."),
    intInput("periodsPerYear", "Periods Per Year", 252, 1, 1e5, "Number of periods in a year used for annualization: 252 for daily bars, 52 for weekly, 12 for monthly."),
    colorInput(WARNING, "Volatility Line", "color", "Color of the line at its recent highs; it fades toward grey as volatility contracts.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 10);
    const logReturns = sub(map(closes(bars), Math.log), shift(map(closes(bars), Math.log), 1));
    const meanReturn = map(sum(logReturns, len), (s) => s / len);
    const squaredSum = sum(map(logReturns, (r) => r * r), len);
    const factor = bool(inputs, "annualize", true) ? Math.sqrt(num3(inputs, "periodsPerYear", 252)) : 1;
    const values = zip(squaredSum, meanReturn, (sq, m) => Math.sqrt(Math.max(sq - len * m * m, 0) / (len - 1)) * factor * 100);
    const low = lowest(values, 100);
    const high = highest(values, 100);
    const accent = str3(inputs, "color", WARNING);
    const colors = values.map((x, i) => Number.isFinite(x) ? gradient(x, low[i] ?? 0, high[i] ?? 0, NEUTRAL, accent) : null);
    return washedToZero("hv", "Historical Volatility", values, colors, accent, 75, 2);
  }
};
var chaikinVolatility = {
  type: "chaikin-volatility",
  title: "Chaikin Volatility",
  shortTitle: "CHV",
  overlay: false,
  inputs: [
    lengthInput(10, "emaLength", "EMA Length", 5e3, "Length of the exponential moving average applied to the bar high-low range."),
    lengthInput(10, "rocLength", "ROC Length", 5e3, "Number of bars used for the rate of change of the smoothed high-low range."),
    colorInput(NEUTRAL, "CHV Color", "color", "Color of the Chaikin Volatility line."),
    colorInput(WARNING, "Expansion", "expansionColor", "Line and fill color while the reading is above zero \u2014 the smoothed range is wider than it was ROC Length bars ago.")
  ],
  compute: (bars, inputs) => {
    const range = ema(sub(highs(bars), lows(bars)), num3(inputs, "emaLength", 10));
    const prior = shift(range, num3(inputs, "rocLength", 10));
    const values = zip(range, prior, (r, p) => p === 0 ? Number.NaN : 100 * (r - p) / p);
    const calm = str3(inputs, "color", NEUTRAL);
    const expansion = str3(inputs, "expansionColor", WARNING);
    return centeredOscillator({
      key: "chv",
      title: "Chaikin Volatility",
      values,
      // Only expansion is a state worth accenting; contraction stays structural grey.
      ink: { bull: expansion, bear: calm, neutral: calm },
      zeroInk: NEUTRAL
    });
  }
};
var massIndex = {
  type: "mass-index",
  title: "Mass Index",
  shortTitle: "MI",
  overlay: false,
  inputs: [
    lengthInput(25, "length", "Sum Length", 5e3, "Number of bars over which the single/double EMA ratio is summed."),
    lengthInput(9, "emaLength", "EMA Length", 5e3, "Length of the single EMA of the high-low range and of its double smoothing."),
    floatInput("setupLevel", "Setup Level", 27, 0, 1e3, 0.1, "Reversal bulge set-up level; a rise above it arms the pattern."),
    floatInput("triggerLevel", "Trigger Level", 26.5, 0, 1e3, 0.1, "Reversal bulge trigger level; a decline below it after a set-up completes the pattern."),
    colorInput(NEUTRAL, "Mass Index", "color", "Line color while no reversal bulge is armed."),
    colorInput(WARNING, "Armed", "armedColor", "Line color from the rise above the setup level until the decline below the trigger level."),
    colorInput(NEUTRAL, "Levels", "levelsColor", "Reversal bulge levels color.")
  ],
  compute: (bars, inputs) => {
    const emaLen = num3(inputs, "emaLength", 9);
    const single = ema(sub(highs(bars), lows(bars)), emaLen);
    const ratio = zip(single, ema(single, emaLen), (a, b) => b === 0 ? 1 : a / b);
    const values = sum(ratio, num3(inputs, "length", 25));
    const setup = num3(inputs, "setupLevel", 27);
    const trigger = num3(inputs, "triggerLevel", 26.5);
    const calm = str3(inputs, "color", NEUTRAL);
    const armedInk = str3(inputs, "armedColor", WARNING);
    const levelInk = str3(inputs, "levelsColor", NEUTRAL);
    let armed = false;
    const colors = values.map((x) => {
      if (!Number.isFinite(x)) return null;
      armed = x > setup ? true : x < trigger ? false : armed;
      return armed ? armedInk : calm;
    });
    return {
      plots: [
        { key: "mi", title: "Mass Index", values, color: calm, colors },
        anchorPlot("setupAnchor", "Setup Anchor", values.length, setup),
        anchorPlot("triggerAnchor", "Trigger Anchor", values.length, trigger)
      ],
      bands: [{ key: "bulge", from: "setupAnchor", to: "triggerAnchor", color: transp(armedInk, 90) }],
      levels: [
        { key: "setup", price: setup, color: levelInk, lineStyle: "dashed", title: "Setup Level" },
        { key: "trigger", price: trigger, color: levelInk, lineStyle: "dashed", title: "Trigger Level" }
      ]
    };
  }
};
var standardDeviation = {
  type: "standard-deviation",
  title: "Standard Deviation",
  shortTitle: "StdDev",
  overlay: false,
  inputs: [
    lengthInput(20, "length", "Length", 5e3, "Number of bars used to compute the standard deviation."),
    sourceInput("Close", "source", "Source", "Price series the standard deviation is calculated on."),
    colorInput(NEUTRAL, "Standard Deviation", "color", "Line color while volatility contracts or holds flat."),
    colorInput(WARNING, "Expanding", "expandColor", "Line and fill color while volatility expands bar to bar.")
  ],
  compute: (bars, inputs) => {
    const values = stdev(sourceValues(bars, str3(inputs, "source", "Close")), num3(inputs, "length", 20));
    const calm = str3(inputs, "color", NEUTRAL);
    return washedToZero("stdev", "Standard Deviation", values, expansionColors(values, calm, str3(inputs, "expandColor", WARNING)), calm, 80);
  }
};
var ulcerIndex = {
  type: "ulcer-index",
  title: "Ulcer Index",
  overlay: false,
  inputs: [
    { ...lengthInput(14, "length", "Length", 500, "Lookback window. At each bar the percentage drawdown from the window's running maximum is squared; the squares are averaged and the root taken."), min: 2 },
    sourceInput("Close", "source", "Source", "Price series the Ulcer Index is computed on. Close is the standard choice."),
    floatInput("threshold", "Alert Threshold", 5, 0, 1e3, 0.25, "Reference level drawn as a dashed line. The index scales with the instrument's volatility and the window length, so set it relative to its own history."),
    colorInput(NEUTRAL, "Ulcer Index", "color", "Color of the index near zero; it blends toward the stress color as the reading approaches the threshold."),
    colorInput(BEARISH, "Stress", "stressColor", "Color of the index at and beyond the alert threshold."),
    boolInput("gradientFill", "Gradient Fill", true, STYLE, "Vertical gradient between zero and the Ulcer Index, fully transparent at zero."),
    boolInput("showDrawdown", "Drawdown %", false, STYLE, "Plot the current percentage drawdown from the window high as columns below zero \u2014 the raw ingredient the index averages."),
    colorInput(transp(BEARISH, 50), "Drawdown Color", "drawdownColor", "Color of the drawdown columns."),
    colorInput(NEUTRAL, "Threshold", "thresholdColor", "Color of the alert threshold line.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 14);
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const n = src.length;
    const values = new Array(n).fill(Number.NaN);
    const drawdown = new Array(n).fill(Number.NaN);
    for (let i = len - 1; i < n; i++) {
      let runMax = Number.NaN;
      let sumSq = 0;
      let valid = true;
      let last = Number.NaN;
      for (let k = i - len + 1; k <= i; k++) {
        const price = src[k];
        if (!Number.isFinite(price)) {
          valid = false;
          break;
        }
        runMax = Number.isFinite(runMax) ? Math.max(runMax, price) : price;
        if (runMax <= 0) {
          valid = false;
          break;
        }
        last = 100 * (price - runMax) / runMax;
        sumSq += last * last;
      }
      if (!valid) continue;
      values[i] = Math.sqrt(sumSq / len);
      drawdown[i] = last;
    }
    const calm = str3(inputs, "color", NEUTRAL);
    const stress = str3(inputs, "stressColor", BEARISH);
    const threshold = num3(inputs, "threshold", 5);
    const colors = values.map((x) => Number.isFinite(x) ? threshold > 0 ? gradient(x, 0, threshold, calm, stress) : stress : null);
    const plots = [{ key: "ui", title: "Ulcer Index", values, color: calm, colors }];
    const bands = [];
    if (bool(inputs, "gradientFill", true)) {
      plots.push(anchorPlot("zeroAnchor", "Zero Base", n, 0));
      bands.push({ key: "wash", from: "ui", to: "zeroAnchor", color: transp(NEUTRAL, 100), gradient: baselineGradient(values, 0, (_x, i) => colors[i] ?? calm) });
    }
    if (bool(inputs, "showDrawdown", false)) {
      plots.push({ key: "dd", title: "Drawdown %", values: drawdown, kind: "columns", color: str3(inputs, "drawdownColor", transp(BEARISH, 50)), base: 0 });
    }
    return {
      plots,
      bands,
      levels: [
        { key: "zero", price: 0, color: transp(NEUTRAL, 50), lineStyle: "dotted", title: "Zero Level" },
        { key: "threshold", price: threshold, color: str3(inputs, "thresholdColor", NEUTRAL), lineStyle: "dashed", title: "Alert Threshold" }
      ]
    };
  }
};
var choppiness = {
  type: "choppiness-index",
  title: "Choppiness Index",
  shortTitle: "CHOP",
  overlay: false,
  inputs: [
    { ...lengthInput(14, "length", "Length", 5e3, "Number of bars used to sum true ranges and to measure the highest high \u2212 lowest low range."), min: 2 },
    floatInput("upperBand", "Upper Band", 61.8, 0, 100, 0.1, "Readings above this level indicate a choppy, range-bound market."),
    floatInput("lowerBand", "Lower Band", 38.2, 0, 100, 0.1, "Readings below this level indicate a strong trend."),
    colorInput(NEUTRAL, "CHOP Line", "color", "Color of the Choppiness Index line."),
    colorInput(BULLISH, "Trending", "trendingColor", "Line, fill and zone color toward and below the lower band \u2014 a trending market."),
    colorInput(BEARISH, "Choppy", "choppyColor", "Line, fill and zone color toward and above the upper band \u2014 a choppy, range-bound market."),
    colorInput(transp(NEUTRAL, 90), "Band Fill", "fillColor", "Fill color of the zone between the upper and lower bands.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 14);
    const trSum = sum(trueRange(bars), len);
    const span = zip(highest(highs(bars), len), lowest(lows(bars), len), (h, l) => h - l);
    const values = zip(trSum, span, (t, s) => s > 0 && t > 0 ? 100 * Math.log10(t / s) / Math.log10(len) : Number.NaN);
    return boundedOscillator({
      key: "chop",
      title: "CHOP",
      values,
      scale: { top: 100, bottom: 0 },
      overbought: num3(inputs, "upperBand", 61.8),
      oversold: num3(inputs, "lowerBand", 38.2),
      ink: { low: str3(inputs, "trendingColor", BULLISH), mid: str3(inputs, "color", NEUTRAL), high: str3(inputs, "choppyColor", BEARISH) },
      levelInk: NEUTRAL,
      bandFill: str3(inputs, "fillColor", transp(NEUTRAL, 90)),
      midpointWash: true,
      levelTitles: { overbought: "Upper Band", oversold: "Lower Band" }
    });
  }
};
var volatilitySpecs = [atrSpec, historicalVolatility, chaikinVolatility, massIndex, standardDeviation, ulcerIndex, choppiness];

// src/core/native-indicators/classics/volume.ts
function moneyFlowVolume(bars) {
  return bars.map((b) => {
    if (b.volume == null || !Number.isFinite(b.volume)) return Number.NaN;
    if (b.high === b.low) return 0;
    return (2 * b.close - b.high - b.low) / (b.high - b.low) * b.volume;
  });
}
function slopeColors2(values, bull, bear, flat) {
  return values.map((x, i) => {
    if (!Number.isFinite(x)) return null;
    const prev = i > 0 ? values[i - 1] : Number.NaN;
    if (!Number.isFinite(prev)) return flat;
    return x > prev ? bull : x < prev ? bear : flat;
  });
}
function volumeIndex(bars, src, base, when) {
  const out = new Array(bars.length).fill(Number.NaN);
  let index = base;
  for (let i = 0; i < bars.length; i++) {
    const v = bars[i].volume;
    const pv = i > 0 ? bars[i - 1].volume : null;
    const prev = i > 0 ? src[i - 1] : Number.NaN;
    const active = v != null && pv != null && Number.isFinite(v) && Number.isFinite(pv) && when(v, pv);
    if (active && Number.isFinite(prev) && prev !== 0) index *= 1 + (src[i] - prev) / prev;
    out[i] = index;
  }
  return out;
}
function regimeIndex(key, title, values, signal, ink, showSignal, gradientFill, singleColor = false) {
  const inkOf = (i) => {
    const s = signal[i];
    const x = values[i];
    if (singleColor || !Number.isFinite(s)) return ink.neutral;
    return x > s ? ink.bull : x < s ? ink.bear : ink.neutral;
  };
  const plots = [
    {
      key: "signal",
      title: "Signal EMA",
      values: signal,
      color: ink.signal,
      ...showSignal ? {} : { display: { pane: false } }
    },
    { key, title, values, color: ink.neutral, width: 2, colors: values.map((x, i) => Number.isFinite(x) ? inkOf(i) : null) }
  ];
  const bands = gradientFill ? [
    {
      key: "regime",
      from: key,
      to: "signal",
      color: transp(NEUTRAL, 100),
      gradient: values.map((x, i) => {
        const s = signal[i];
        if (!Number.isFinite(x) || !Number.isFinite(s)) return null;
        const above = x > s;
        const c = above ? ink.bull : ink.bear;
        return { topValue: Math.max(x, s), bottomValue: Math.min(x, s), topColor: transp(c, above ? 50 : 100), bottomColor: transp(c, above ? 100 : 50) };
      })
    }
  ] : [];
  return { plots, bands };
}
var obv = {
  type: "on-balance-volume",
  title: "On Balance Volume",
  shortTitle: "OBV",
  overlay: false,
  // TradingView's OBV Smoothing block (Type, Length, BB StdDev). Settings saved before it (a Smoothing MA switch with
  // its own MA type and length) still draw their MA.
  inputs: [colorInput(INFO, "OBV", "color", "Color of the OBV line."), ...smoothingInputs("OBV")],
  compute: (bars, inputs) => {
    const vol = volumes(bars);
    const d = change(closes(bars));
    const values = cumSum(zip(vol, d, (v, x) => x > 0 ? v : x < 0 ? -v : 0));
    const legacy = bool(inputs, "smoothing", false) && str3(inputs, "smoothingType", "None") === "None";
    const type = legacy ? str3(inputs, "maType", "SMA") : str3(inputs, "smoothingType", "None");
    const len = legacy ? num3(inputs, "maLength", 20) : num3(inputs, "smoothingLength", 14);
    const plots = [{ key: "obv", title: "OBV", values, color: str3(inputs, "color", INFO) }, ...smoothingPlots(values, bars, inputs, "OBV", type, len)];
    return { plots };
  }
};
var accDist = {
  type: "accumulation-distribution",
  title: "Accumulation / Distribution",
  shortTitle: "A/D",
  overlay: false,
  inputs: [
    boolInput("slopeColoring", "Slope Coloring", true, STYLE, "Color the line by its slope \u2014 bullish while rising (accumulation), bearish while falling (distribution)."),
    colorInput(NEUTRAL, "A/D Line", "color", "Color of the line when slope coloring is disabled or the line is flat."),
    colorInput(BULLISH, "Rising", "bullColor", "Line color while the A/D Line rises."),
    colorInput(BEARISH, "Falling", "bearColor", "Line color while the A/D Line falls.")
  ],
  compute: (bars, inputs) => {
    const values = cumSum(moneyFlowVolume(bars));
    const flat = str3(inputs, "color", NEUTRAL);
    return {
      plots: [
        {
          key: "ad",
          title: "A/D",
          values,
          color: flat,
          ...bool(inputs, "slopeColoring", true) ? { colors: slopeColors2(values, str3(inputs, "bullColor", BULLISH), str3(inputs, "bearColor", BEARISH), flat) } : {}
        }
      ]
    };
  }
};
var cmf = {
  type: "chaikin-money-flow",
  title: "Chaikin Money Flow",
  shortTitle: "CMF",
  overlay: false,
  inputs: [
    lengthInput(20, "length", "Length", 5e3, "Lookback length over which money flow volume and volume are summed."),
    colorInput(NEUTRAL, "CMF Line", "color", "Color of the Chaikin Money Flow line."),
    colorInput(BULLISH, "Bullish", "bullColor", "Line and fill color while the CMF reads above zero (net money flowing in)."),
    colorInput(BEARISH, "Bearish", "bearColor", "Line and fill color while the CMF reads below zero (net money flowing out)."),
    colorInput(NEUTRAL, "Zero Line", "zeroColor", "Color of the zero reference line.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 20);
    const values = zip(sum(moneyFlowVolume(bars), len), sum(volumes(bars), len), (m, v) => v === 0 ? 0 : m / v);
    return centeredOscillator({
      key: "cmf",
      title: "CMF",
      values,
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: str3(inputs, "zeroColor", NEUTRAL)
    });
  }
};
var chaikinOscillator = {
  type: "chaikin-oscillator",
  title: "Chaikin Oscillator",
  shortTitle: "Chaikin Osc",
  overlay: false,
  inputs: [
    lengthInput(3, "fastLength", "Fast Length", 5e3, "Length of the fast EMA applied to the accumulation/distribution line."),
    lengthInput(10, "slowLength", "Slow Length", 5e3, "Length of the slow EMA applied to the accumulation/distribution line."),
    colorInput(NEUTRAL, "Oscillator", "color", "Color of the Chaikin Oscillator line."),
    colorInput(BULLISH, "Bullish", "bullColor", "Line and fill color while the oscillator reads above zero (accumulation)."),
    colorInput(BEARISH, "Bearish", "bearColor", "Line and fill color while the oscillator reads below zero (distribution).")
  ],
  compute: (bars, inputs) => {
    const ad = cumSum(moneyFlowVolume(bars));
    const values = sub(ema(ad, num3(inputs, "fastLength", 3)), ema(ad, num3(inputs, "slowLength", 10)));
    return centeredOscillator({
      key: "co",
      title: "Chaikin Oscillator",
      values,
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: NEUTRAL
    });
  }
};
var eom = {
  type: "ease-of-movement",
  title: "Ease of Movement",
  shortTitle: "EOM",
  overlay: false,
  inputs: [
    lengthInput(14, "length", "Length", 5e3, "Number of bars in the simple moving average smoothing the 1-bar Ease of Movement values."),
    intInput("divisor", "Divisor", 1e4, 1, 1e9, "Volume scaling constant of the box ratio; larger values scale the oscillator up. 10000 is the conventional default."),
    colorInput(NEUTRAL, "EOM Line", "color", "Color of the line when it sits exactly at zero."),
    colorInput(BULLISH, "Above Zero", "bullColor", "Color of the line and fill while Ease of Movement is positive."),
    colorInput(BEARISH, "Below Zero", "bearColor", "Color of the line and fill while Ease of Movement is negative.")
  ],
  compute: (bars, inputs) => {
    const div = num3(inputs, "divisor", 1e4);
    const move = change(sourceValues(bars, "HL2"));
    const raw = bars.map((b, i) => {
      const m = move[i];
      if (b.volume == null || !Number.isFinite(b.volume) || !Number.isFinite(m)) return Number.NaN;
      return b.volume === 0 ? 0 : div * m * (b.high - b.low) / b.volume;
    });
    return centeredOscillator({
      key: "eom",
      title: "EOM",
      values: sma(raw, num3(inputs, "length", 14)),
      ink: { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "color", NEUTRAL) },
      zeroInk: NEUTRAL
    });
  }
};
var forceIndex = {
  type: "force-index",
  title: "Force Index",
  shortTitle: "FI",
  overlay: false,
  inputs: [
    lengthInput(13, "length", "Length", 5e3, "EMA length applied to the raw 1-bar force index, (close \u2212 close[1]) \xD7 volume. Elder used 13 for the intermediate trend and 2 for short-term timing."),
    colorInput(BULLISH, "Force Index", "color", "Color of the line while above zero (buying pressure)."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the line while below zero (selling pressure).")
  ],
  compute: (bars, inputs) => {
    const raw = zip(change(closes(bars)), volumes(bars), (d, v) => d * v);
    const bull = str3(inputs, "color", BULLISH);
    return centeredOscillator({
      key: "force",
      title: "Force Index",
      values: ema(raw, num3(inputs, "length", 13)),
      // The reference reads an exact zero as buying pressure, so neutral shares the bull ink.
      ink: { bull, bear: str3(inputs, "bearColor", BEARISH), neutral: bull },
      zeroInk: NEUTRAL,
      width: 2,
      valueTransparency: 60
    });
  }
};
var klinger = {
  type: "klinger-oscillator",
  title: "Klinger Oscillator",
  shortTitle: "KVO",
  overlay: false,
  inputs: [
    lengthInput(34, "fastLength", "Fast Length", 5e3, "Length of the fast EMA applied to the volume force."),
    lengthInput(55, "slowLength", "Slow Length", 5e3, "Length of the slow EMA applied to the volume force."),
    lengthInput(13, "signalLength", "Signal Length", 500, "Length of the EMA applied to the oscillator to obtain the signal line."),
    colorInput(BULLISH, "Bullish", "color", "Color of the Klinger oscillator while above zero."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the Klinger oscillator while below zero."),
    colorInput(WARNING, "Signal", "signalColor", "Color of the signal line.")
  ],
  compute: (bars, inputs) => {
    const n = bars.length;
    const force = new Array(n).fill(Number.NaN);
    let trend = 1;
    let prevTrend = 1;
    let cm = 0;
    let prevDm = 0;
    for (let i = 0; i < n; i++) {
      const b = bars[i];
      const hlc = b.high + b.low + b.close;
      const prevHlc = i > 0 ? bars[i - 1].high + bars[i - 1].low + bars[i - 1].close : hlc;
      trend = hlc > prevHlc ? 1 : -1;
      const dm = b.high - b.low;
      cm = i > 0 && trend === prevTrend ? cm + dm : prevDm + dm;
      const v = b.volume;
      force[i] = v == null || !Number.isFinite(v) ? Number.NaN : cm === 0 ? 0 : v * Math.abs(2 * (dm / cm) - 1) * trend * 100;
      prevTrend = trend;
      prevDm = dm;
    }
    const line = sub(ema(force, num3(inputs, "fastLength", 34)), ema(force, num3(inputs, "slowLength", 55)));
    const bull = str3(inputs, "color", BULLISH);
    return centeredOscillator({
      key: "kvo",
      title: "KVO",
      values: line,
      ink: { bull, bear: str3(inputs, "bearColor", BEARISH), neutral: bull },
      zeroInk: transp(NEUTRAL, 50),
      valueTransparency: 60,
      extraPlots: [{ key: "signal", title: "Signal", values: ema(line, num3(inputs, "signalLength", 13)), color: str3(inputs, "signalColor", WARNING) }]
    });
  }
};
var mfi = {
  type: "money-flow-index",
  title: "Money Flow Index",
  shortTitle: "MFI",
  overlay: false,
  inputs: [
    lengthInput(14, "length", "Length", 5e3, "Number of bars used to sum positive and negative money flow."),
    floatInput("overbought", "Overbought Level", 80, 0, 100, 1, "Level above which the MFI is considered overbought."),
    floatInput("oversold", "Oversold Level", 20, 0, 100, 1, "Level below which the MFI is considered oversold."),
    colorInput(NEUTRAL, "MFI", "color", "Color of the MFI line between the levels. Toward either level it blends into that level\u2019s color."),
    colorInput(BEARISH, "Overbought", "overboughtColor", "Color of the line and zone shading at and above the overbought level."),
    colorInput(BULLISH, "Oversold", "oversoldColor", "Color of the line and zone shading at and below the oversold level."),
    colorInput(transp(NEUTRAL, 94), "OB/OS Zone Fill", "fillColor", "Fill color of the area between the overbought and oversold levels.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 14);
    const tp = sourceValues(bars, "HLC3");
    const rawFlow = zip(tp, volumes(bars), (p, v) => p * v);
    const d = change(tp);
    const pos = sum(zip(rawFlow, d, (f, x) => x > 0 ? f : 0), len);
    const neg = sum(zip(rawFlow, d, (f, x) => x < 0 ? f : 0), len);
    const values = zip(pos, neg, (p, w) => p + w > 0 ? 100 * p / (p + w) : Number.NaN);
    return boundedOscillator({
      key: "mfi",
      title: "MFI",
      values,
      scale: { top: 100, bottom: 0 },
      overbought: num3(inputs, "overbought", 80),
      oversold: num3(inputs, "oversold", 20),
      ink: { low: str3(inputs, "oversoldColor", BULLISH), mid: str3(inputs, "color", NEUTRAL), high: str3(inputs, "overboughtColor", BEARISH) },
      levelInk: NEUTRAL,
      zoneTransparency: 91,
      bandFill: str3(inputs, "fillColor", transp(NEUTRAL, 94))
    });
  }
};
function regimeStyleInputs(signalTitle) {
  return [
    colorInput(BULLISH, "Bullish", "bullColor", "Color of the line and gradient fill while it holds above its signal EMA."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the line and gradient fill while it holds below its signal EMA."),
    colorInput(NEUTRAL, "Neutral", "neutralColor", "Color used while the signal EMA is still forming, or the line sits exactly on it."),
    colorInput(NEUTRAL, signalTitle, "signalColor", "Color of the signal EMA overlay."),
    boolInput("gradientFill", "Gradient Fill", true, STYLE, "Fills the gap between the line and its signal EMA with a vertical gradient \u2014 transparent at the average, strongest at the line.")
  ];
}
var NVI_POSITION = "Position vs Average";
var NVI_SINGLE = "Single Color";
var nvi = {
  type: "negative-volume-index",
  title: "Negative Volume Index",
  shortTitle: "Negative Volume Index",
  overlay: false,
  inputs: [
    floatInput("base", "Base Level", 1e3, 0.01, 1e6, 1, "Arbitrary seed of the cumulative line, conventionally 1000. The absolute level carries no information \u2014 the line is read by slope and by position against the signal EMA."),
    boolInput("showSignal", "Signal EMA", true, SETTINGS, "Displays the conventional signal overlay. Hiding it only removes the plotted average; the regime coloring and fill still use it."),
    lengthInput(255, "signalLength", "Signal Length", 5e3, "Length of the signal EMA. The convention is one trading year \u2014 255 sessions on daily charts."),
    optionInput("colorMode", "Line Coloring", NVI_POSITION, [NVI_POSITION, NVI_SINGLE], "'Position vs Average' colors the line by the classic regime read; 'Single Color' draws the whole line in the neutral color."),
    ...regimeStyleInputs("Signal EMA")
  ],
  compute: (bars, inputs) => {
    const values = volumeIndex(bars, closes(bars), num3(inputs, "base", 1e3), (v, pv) => v < pv);
    const signal = ema(values, num3(inputs, "signalLength", 255));
    return regimeIndex(
      "nvi",
      "NVI",
      values,
      signal,
      { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "neutralColor", NEUTRAL), signal: str3(inputs, "signalColor", NEUTRAL) },
      bool(inputs, "showSignal", true),
      bool(inputs, "gradientFill", true),
      str3(inputs, "colorMode", NVI_POSITION) === NVI_SINGLE
    );
  }
};
var pvi = {
  type: "positive-volume-index",
  title: "Positive Volume Index",
  shortTitle: "Positive Volume Index",
  overlay: false,
  inputs: [
    sourceInput("Close", "source", "Source", "Price series whose one-bar percentage change moves PVI on its active sessions."),
    floatInput("base", "Starting Value", 1e3, 1, 1e6, 1, "Seed of the cumulative line. The absolute level carries no information, so the reads are the slope and the position against the signal EMA."),
    boolInput("showSignal", "Signal EMA", true, SETTINGS, "Plots the long EMA of PVI that anchors the classic regime read. Hiding it keeps the regime coloring and fill, which are always measured against it."),
    lengthInput(255, "signalLength", "Signal Length", 5e3, "Length of the signal EMA. The classic reference is a one-year average \u2014 255 trading days on daily charts."),
    ...regimeStyleInputs("Signal Line")
  ],
  compute: (bars, inputs) => {
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const values = volumeIndex(bars, src, num3(inputs, "base", 1e3), (v, pv) => v > pv);
    const signal = ema(values, num3(inputs, "signalLength", 255));
    return regimeIndex(
      "pvi",
      "PVI",
      values,
      signal,
      { bull: str3(inputs, "bullColor", BULLISH), bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "neutralColor", NEUTRAL), signal: str3(inputs, "signalColor", NEUTRAL) },
      bool(inputs, "showSignal", true),
      bool(inputs, "gradientFill", true)
    );
  }
};
var pvt = {
  type: "price-volume-trend",
  title: "Price Volume Trend",
  shortTitle: "PVT",
  overlay: false,
  inputs: [
    boolInput("showSignal", "Signal Line", false, SETTINGS, "Display a moving average of PVT acting as a signal line."),
    optionInput("signalType", "Signal Type", "SMA", ["SMA", "EMA"], "Moving average type used for the signal line."),
    lengthInput(21, "signalLength", "Signal Length", 5e3, "Number of bars used to compute the signal line."),
    colorInput(NEUTRAL, "PVT Color", "color", "Color of the PVT line while it is flat."),
    colorInput(BULLISH, "Rising", "bullColor", "Color of the PVT line while it rises bar to bar."),
    colorInput(BEARISH, "Falling", "bearColor", "Color of the PVT line while it falls bar to bar."),
    colorInput(WARNING, "Signal Color", "signalColor", "Color of the signal line.")
  ],
  compute: (bars, inputs) => {
    const c = closes(bars);
    const raw = bars.map((b, i) => {
      if (i === 0 || b.volume == null || !Number.isFinite(b.volume)) return Number.NaN;
      const pc = c[i - 1];
      return pc === 0 ? 0 : (c[i] - pc) / pc * b.volume;
    });
    const values = cumSum(raw);
    const flat = str3(inputs, "color", NEUTRAL);
    const plots = [
      { key: "pvt", title: "PVT", values, color: flat, width: 2, colors: slopeColors2(values, str3(inputs, "bullColor", BULLISH), str3(inputs, "bearColor", BEARISH), flat) }
    ];
    if (bool(inputs, "showSignal", false)) {
      const len = num3(inputs, "signalLength", 21);
      const signal = str3(inputs, "signalType", "SMA") === "EMA" ? ema(values, len) : sma(values, len);
      plots.push({ key: "signal", title: "Signal", values: signal, color: str3(inputs, "signalColor", WARNING) });
    }
    return { plots };
  }
};
var volumeOscillator = {
  type: "volume-oscillator",
  title: "Volume Oscillator",
  shortTitle: "Vol Osc",
  overlay: false,
  inputs: [
    lengthInput(5, "fastLength", "Fast Length", 5e3, "Length of the fast EMA of volume."),
    lengthInput(10, "slowLength", "Slow Length", 5e3, "Length of the slow EMA of volume."),
    colorInput(BULLISH, "Above Zero", "color", "Color of the line and fill while it holds above zero \u2014 volume expanding."),
    colorInput(BEARISH, "Below Zero", "bearColor", "Color of the line and fill while it holds below zero \u2014 volume contracting.")
  ],
  compute: (bars, inputs) => {
    const vol = volumes(bars);
    const fast = ema(vol, num3(inputs, "fastLength", 5));
    const slow = ema(vol, num3(inputs, "slowLength", 10));
    const values = zip(fast, slow, (f, s) => s === 0 ? 0 : 100 * (f - s) / s);
    const bull = str3(inputs, "color", BULLISH);
    return centeredOscillator({
      key: "vo",
      title: "Volume Oscillator",
      values,
      ink: { bull, bear: str3(inputs, "bearColor", BEARISH), neutral: bull },
      zeroInk: NEUTRAL,
      valueTransparency: 60
    });
  }
};
var OSCILLATOR = "Oscillator";
var pvo = {
  type: "pvo",
  title: "Percentage Volume Oscillator",
  shortTitle: "PVO",
  overlay: false,
  inputs: [
    { ...lengthInput(12, "fastLength", "Fast Length", 5e3, "Period of the fast EMA of volume. The conventional setting is 12."), group: OSCILLATOR },
    { ...lengthInput(26, "slowLength", "Slow Length", 5e3, "Period of the slow EMA of volume. The PVO expresses the fast/slow spread as a percentage of this slow average."), group: OSCILLATOR },
    { ...lengthInput(9, "signalLength", "Signal Length", 500, "Period of the EMA applied to the PVO to form the signal line."), group: OSCILLATOR },
    colorInput(BULLISH, "Expansion Color", "color", "Color of the oscillator and fill while participation expands."),
    colorInput(BEARISH, "Contraction Color", "bearColor", "Color of the oscillator and fill while participation contracts."),
    colorInput(WARNING, "Signal Line", "signalColor", "Color of the signal line."),
    colorInput(transp(NEUTRAL, 50), "Zero Line", "zeroColor", "Color of the zero reference line."),
    boolInput("showSignal", "Show Signal Line", true, STYLE, "Plot the signal line, an EMA of the PVO."),
    boolInput("showHistogram", "Show Histogram", true, STYLE, "Plot the difference between the PVO and its signal line as columns behind the oscillator.")
  ],
  compute: (bars, inputs) => {
    const vol = volumes(bars);
    const fast = ema(vol, num3(inputs, "fastLength", 12));
    const slow = ema(vol, num3(inputs, "slowLength", 26));
    const values = zip(fast, slow, (f, s) => s > 0 ? 100 * (f - s) / s : Number.NaN);
    const signal = ema(values, num3(inputs, "signalLength", 9));
    const expansion = str3(inputs, "color", BULLISH);
    const contraction = str3(inputs, "bearColor", BEARISH);
    const extraPlots = [];
    if (bool(inputs, "showHistogram", true)) {
      const hist = sub(values, signal);
      extraPlots.push({
        key: "hist",
        title: "Histogram",
        values: hist,
        kind: "columns",
        color: transp(expansion, 60),
        colors: hist.map((x) => Number.isFinite(x) ? transp(x > 0 ? expansion : contraction, 60) : null),
        base: 0
      });
    }
    if (bool(inputs, "showSignal", true)) extraPlots.push({ key: "signal", title: "Signal", values: signal, color: str3(inputs, "signalColor", WARNING) });
    return centeredOscillator({
      key: "pvo",
      title: "PVO",
      values,
      ink: { bull: expansion, bear: contraction, neutral: contraction },
      zeroInk: str3(inputs, "zeroColor", transp(NEUTRAL, 50)),
      extraPlots
    });
  }
};
var vfi = {
  type: "volume-flow-indicator",
  title: "Volume Flow Indicator",
  shortTitle: "Volume Flow Indicator",
  overlay: false,
  inputs: [
    { ...lengthInput(130, "length", "Length", 5e3, "Rolling summation window, also used for the average volume that scales the result. The published default of 130 bars targets position-horizon work on daily charts."), min: 2 },
    floatInput("coef", "Cutoff Coefficient", 0.2, 0, 10, 0.05, "Scales the volatility-based minimum change in typical price. Moves smaller than the cutoff count as noise and contribute no volume."),
    floatInput("volCoef", "Volume Cap Multiplier", 2.5, 0.1, 50, 0.1, "Caps each bar's volume contribution at this multiple of the average volume, so a single climactic print stays bounded."),
    { ...lengthInput(30, "volLength", "Volatility Length", 5e3, "Window of the standard deviation of the log change in typical price used to build the adaptive cutoff."), min: 2 },
    boolInput("smooth", "Smooth VFI", true, SETTINGS, "Applies the published light smoothing \u2014 an EMA of the summed line \u2014 before plotting."),
    lengthInput(3, "smoothLength", "Smoothing Length", 500, "Length of the smoothing EMA. The published version uses 3 bars."),
    boolInput("showSignal", "Signal Line", true, SETTINGS, "Plots an EMA of VFI as a signal line."),
    lengthInput(5, "signalLength", "Signal Length", 500, "Length of the signal-line EMA."),
    colorInput(BULLISH, "Bullish", "color", "Color of the VFI line and gradient fill above the zero line \u2014 the net accumulation regime."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the VFI line and gradient fill below the zero line \u2014 the net distribution regime."),
    colorInput(WARNING, "Signal Line", "signalColor", "Color of the signal line."),
    boolInput("gradientFill", "Gradient Fill", true, STYLE, "Fills the area between the zero line and the VFI line with a vertical gradient.")
  ],
  compute: (bars, inputs) => {
    const len = num3(inputs, "length", 130);
    const typical = sourceValues(bars, "HLC3");
    const logChange = sub(map(typical, Math.log), shift(map(typical, Math.log), 1));
    const volatility = stdev(logChange, num3(inputs, "volLength", 30));
    const coef = num3(inputs, "coef", 0.2);
    const volCoef = num3(inputs, "volCoef", 2.5);
    const vol = volumes(bars);
    const avgVolume = shift(sma(vol, len), 1);
    const typicalChange = change(typical);
    const signed2 = bars.map((b, i) => {
      const sd = volatility[i];
      const m = typicalChange[i];
      const v = vol[i];
      if (!Number.isFinite(sd) || !Number.isFinite(m) || !Number.isFinite(v)) return Number.NaN;
      const cutoff = coef * sd * b.close;
      const avg = avgVolume[i];
      const capped = Number.isFinite(avg) ? Math.min(v, avg * volCoef) : v;
      return m > cutoff ? capped : m < -cutoff ? -capped : 0;
    });
    const raw = zip(sum(signed2, len), avgVolume, (f, a) => a > 0 ? f / a : Number.NaN);
    const values = bool(inputs, "smooth", true) ? ema(raw, num3(inputs, "smoothLength", 3)) : raw;
    const bull = str3(inputs, "color", BULLISH);
    const extraPlots = bool(inputs, "showSignal", true) ? [{ key: "signal", title: "Signal Line", values: ema(values, num3(inputs, "signalLength", 5)), color: str3(inputs, "signalColor", WARNING) }] : [];
    return centeredOscillator({
      key: "vfi",
      title: "VFI",
      values,
      ink: { bull, bear: str3(inputs, "bearColor", BEARISH), neutral: str3(inputs, "bearColor", BEARISH) },
      zeroInk: transp(NEUTRAL, 90),
      fill: bool(inputs, "gradientFill", true),
      extraPlots
    });
  }
};
var II_OSCILLATOR = "Normalized Oscillator (II%)";
var II_CUMULATIVE = "Cumulative Line";
var intradayIntensity = {
  type: "intraday-intensity",
  title: "Intraday Intensity",
  shortTitle: "Intraday Intensity",
  overlay: false,
  inputs: [
    optionInput("mode", "Display", II_OSCILLATOR, [II_OSCILLATOR, II_CUMULATIVE], "The two published forms. The cumulative line is open-ended and read by slope against price; the normalized oscillator divides a rolling sum of intensity by the rolling sum of volume and oscillates around zero."),
    lengthInput(21, "length", "Oscillator Length", 5e3, "Window of the rolling sums in the normalized form. The common setting is 21 bars. It has no effect on the cumulative line."),
    colorInput(BULLISH, "Bullish", "color", "Color of positive readings, the rising cumulative line and the fill above zero \u2014 the accumulation side."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of negative readings, the falling cumulative line and the fill below zero \u2014 the distribution side."),
    boolInput("gradientFill", "Gradient Fill", true, STYLE, "Fills the area between the zero line and the oscillator with a vertical gradient. Applies to the normalized oscillator only.")
  ],
  compute: (bars, inputs) => {
    const intensity = moneyFlowVolume(bars);
    const bull = str3(inputs, "color", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    if (str3(inputs, "mode", II_OSCILLATOR) === II_CUMULATIVE) {
      const values2 = cumSum(intensity);
      return { plots: [{ key: "ii", title: "Intraday Intensity", values: values2, color: bull, colors: slopeColors2(values2, bull, bear, bull) }] };
    }
    const len = num3(inputs, "length", 21);
    const values = zip(sum(intensity, len), sum(volumes(bars), len), (m, v) => v > 0 ? 100 * m / v : Number.NaN);
    return centeredOscillator({
      key: "ii",
      title: "Intraday Intensity",
      values,
      ink: { bull, bear, neutral: bear },
      zeroInk: transp(NEUTRAL, 90),
      fill: bool(inputs, "gradientFill", true)
    });
  }
};
var volumeSpecs = [
  obv,
  accDist,
  cmf,
  chaikinOscillator,
  eom,
  forceIndex,
  klinger,
  mfi,
  nvi,
  pvi,
  pvt,
  volumeOscillator,
  pvo,
  vfi,
  intradayIntensity
];

// src/core/native-indicators/classics/overlays.ts
var DAY_MS = 864e5;
function periodKey(anchor, time) {
  if (anchor === "Week") return Math.floor((Math.floor(time / DAY_MS) + 3) / 7);
  if (anchor === "Month" || anchor === "Quarter" || anchor === "Year") {
    const d = new Date(time);
    if (anchor === "Year") return d.getUTCFullYear();
    if (anchor === "Quarter") return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
  }
  return Math.floor(time / DAY_MS);
}
function barInterval(bars) {
  if (bars.length < 2) return 0;
  const gaps = [];
  for (let i = 1; i < bars.length; i++) gaps.push(bars[i].time - bars[i - 1].time);
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] ?? 0;
}
var parabolicSar = {
  type: "parabolic-sar",
  title: "Parabolic SAR",
  shortTitle: "SAR",
  overlay: true,
  inputs: [
    floatInput("start", "Start", 0.02, 0, 1, 0.01, "Initial acceleration factor applied when a new trend begins."),
    floatInput("increment", "Increment", 0.02, 0, 1, 0.01, "Amount added to the acceleration factor each time the trend makes a new extreme point."),
    floatInput("maximum", "Maximum", 0.2, 0.01, 1, 0.01, "Upper cap on the acceleration factor."),
    colorInput(BULLISH, "Bullish", "bullColor", "Color of the SAR crosses while they trail below price \u2014 uptrend, the stop sits under the market."),
    colorInput(BEARISH, "Bearish", "bearColor", "Color of the SAR crosses while they sit above price \u2014 downtrend, the stop sits over the market.")
  ],
  compute: (bars, inputs) => {
    const start = num3(inputs, "start", 0.02);
    const inc = num3(inputs, "increment", 0.02);
    const max = num3(inputs, "maximum", 0.2);
    const n = bars.length;
    const values = new Array(n).fill(Number.NaN);
    if (n >= 2) {
      let long = bars[1].close >= bars[0].close;
      let sar = long ? bars[0].low : bars[0].high;
      let ep = long ? bars[0].high : bars[0].low;
      let af = start;
      for (let i = 1; i < n; i++) {
        const b = bars[i];
        sar += af * (ep - sar);
        if (long) sar = Math.min(sar, bars[i - 1].low, i >= 2 ? bars[i - 2].low : bars[i - 1].low);
        else sar = Math.max(sar, bars[i - 1].high, i >= 2 ? bars[i - 2].high : bars[i - 1].high);
        const reversed = long ? b.low < sar : b.high > sar;
        if (reversed) {
          long = !long;
          sar = ep;
          ep = long ? b.high : b.low;
          af = start;
        } else if (long && b.high > ep) {
          ep = b.high;
          af = Math.min(max, af + inc);
        } else if (!long && b.low < ep) {
          ep = b.low;
          af = Math.min(max, af + inc);
        }
        values[i] = sar;
      }
    }
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const colors = values.map((x, i) => Number.isFinite(x) ? x < bars[i].close ? bull : bear : null);
    return { plots: [{ key: "sar", title: "SAR", values, kind: "cross", color: bull, colors }] };
  }
};
var VWAP_ANCHORS = ["Session", "Week", "Month", "Quarter", "Year"];
var BANDS_STDEV = "Standard Deviation";
var BANDS_PERCENT = "Percentage";
var VWAP_BANDS = [
  { show: "band1", mult: "band1Mult", defMult: 1, defOn: true },
  { show: "band2", mult: "band2Mult", defMult: 2, defOn: false },
  { show: "band3", mult: "band3Mult", defMult: 3, defOn: false }
];
var vwap = {
  type: "vwap",
  title: "Volume Weighted Average Price",
  shortTitle: "VWAP",
  overlay: true,
  inputs: [
    optionInput("anchor", "Anchor Period", "Session", VWAP_ANCHORS, "Period anchoring the average. VWAP and its bands reset on the first bar of each new session, week, month, quarter or year (UTC)."),
    sourceInput("HLC3", "source", "Source", "Price used in the volume weighted average. Typical price (HLC3) is the classic choice."),
    optionInput("bandsMode", "Bands Mode", BANDS_STDEV, [BANDS_STDEV, BANDS_PERCENT], "Bands offset method: multiples of the volume weighted standard deviation of price around VWAP, or a percentage of the VWAP value."),
    ...VWAP_BANDS.flatMap((b, i) => [
      boolInput(b.show, `Band #${i + 1}`, b.defOn, SETTINGS, `Show the ${["first", "second", "third"][i]} band pair.`),
      floatInput(b.mult, `Band #${i + 1} Multiplier`, b.defMult, 0, 50, 0.5, "Multiplier for this band pair, in standard deviations or percent depending on the bands mode.")
    ]),
    boolInput("hideDwm", "Hide VWAP on 1D or Above", true, SETTINGS, "Hide the VWAP and its bands on daily and higher timeframes, where an intraday anchored VWAP is not meaningful."),
    colorInput(BULLISH, "Bullish", "bullColor", "VWAP line color while price closes above it, and the color of the lower (support) bands."),
    colorInput(BEARISH, "Bearish", "bearColor", "VWAP line color while price closes below it, and the color of the upper (resistance) bands."),
    colorInput(NEUTRAL, "Bands", "bandsColor", "Deviation bands fill color."),
    boolInput("fill", "Bands Fill", true, STYLE, "Fill the area between each visible band pair.")
  ],
  compute: (bars, inputs) => {
    const anchor = str3(inputs, "anchor", "Session");
    const src = sourceValues(bars, str3(inputs, "source", "HLC3"));
    const n = bars.length;
    const hidden = bool(inputs, "hideDwm", true) && barInterval(bars) >= DAY_MS;
    const values = new Array(n).fill(Number.NaN);
    const bands = VWAP_BANDS.filter((b) => bool(inputs, b.show, b.defOn)).map((b) => ({
      mult: Math.max(0, num3(inputs, b.mult, b.defMult)),
      up: new Array(n).fill(Number.NaN),
      down: new Array(n).fill(Number.NaN)
    }));
    const percentMode = str3(inputs, "bandsMode", BANDS_STDEV) === BANDS_PERCENT;
    let period = Number.NaN;
    let cumPV = 0;
    let cumPV2 = 0;
    let cumV = 0;
    for (let i = 0; i < n && !hidden; i++) {
      const b = bars[i];
      const key = periodKey(anchor, b.time);
      if (key !== period) {
        period = key;
        cumPV = 0;
        cumPV2 = 0;
        cumV = 0;
      }
      const v = b.volume;
      if (v != null && Number.isFinite(v) && v > 0) {
        const tp = src[i];
        cumPV += tp * v;
        cumPV2 += tp * tp * v;
        cumV += v;
      }
      if (cumV <= 0) continue;
      const mean = cumPV / cumV;
      const offset = percentMode ? mean / 100 : Math.sqrt(Math.max(0, cumPV2 / cumV - mean * mean));
      values[i] = mean;
      for (const band of bands) {
        band.up[i] = mean + band.mult * offset;
        band.down[i] = mean - band.mult * offset;
      }
    }
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const fillColor = transp(str3(inputs, "bandsColor", NEUTRAL), 95);
    const plots = [
      { key: "vwap", title: "VWAP", values, color: bull, colors: values.map((x, i) => Number.isFinite(x) ? bars[i].close >= x ? bull : bear : null) }
    ];
    const fills = [];
    bands.forEach((band, i) => {
      plots.push(
        { key: `up${i}`, title: `Upper Band #${i + 1}`, values: band.up, color: transp(bear, 40) },
        { key: `down${i}`, title: `Lower Band #${i + 1}`, values: band.down, color: transp(bull, 40) }
      );
      if (bool(inputs, "fill", true)) fills.push({ key: `band${i}`, from: `up${i}`, to: `down${i}`, color: fillColor });
    });
    return { plots, bands: fills };
  }
};
var PIVOT_TRADITIONAL = "Traditional";
var PIVOT_FIBONACCI = "Fibonacci";
var PIVOT_CAMARILLA = "Camarilla";
var PIVOT_WOODIE = "Woodie";
var PIVOT_AUTO = "Auto";
var pivotPoints = {
  type: "pivot-points",
  title: "Pivot Points Standard",
  shortTitle: "Pivots",
  overlay: true,
  inputs: [
    optionInput("kind", "Type", PIVOT_TRADITIONAL, [PIVOT_TRADITIONAL, PIVOT_FIBONACCI, PIVOT_CAMARILLA, PIVOT_WOODIE], "Formula used to calculate the levels. Traditional is the classic floor-trader method; Fibonacci projects 38.2/61.8/100% of the prior range around the pivot; Camarilla scales the prior range around the prior close; Woodie gives extra weight to the period open."),
    optionInput("anchor", "Pivots Timeframe", PIVOT_AUTO, [PIVOT_AUTO, "Daily", "Weekly", "Monthly", "Yearly"], "Period the pivots are anchored to. 'Auto' follows the chart's bar spacing: daily pivots up to 15-minute bars, weekly on other intraday bars, monthly on daily bars, yearly above."),
    colorInput(WARNING, "Pivot", "pivotColor", "Color of the central pivot (P) level."),
    colorInput(BEARISH, "Resistances", "resistanceColor", "Color of the resistance (R) levels."),
    colorInput(BULLISH, "Supports", "supportColor", "Color of the support (S) levels.")
  ],
  compute: (bars, inputs, period) => {
    const interval = period ? period.intervalMs : barInterval(bars);
    const requested = str3(inputs, "anchor", PIVOT_AUTO);
    const auto = interval <= 15 * 6e4 ? "Session" : interval < DAY_MS ? "Week" : interval <= DAY_MS ? "Month" : "Year";
    const anchor = requested === "Daily" ? "Session" : requested === "Weekly" ? "Week" : requested === "Monthly" ? "Month" : requested === "Yearly" ? "Year" : auto;
    const kind = str3(inputs, "kind", PIVOT_TRADITIONAL);
    const aggs = /* @__PURE__ */ new Map();
    for (const b of period?.bars ?? bars) {
      const key = periodKey(anchor, b.time);
      const a = aggs.get(key);
      if (!a) aggs.set(key, { open: b.open, high: b.high, low: b.low, close: b.close });
      else {
        a.high = Math.max(a.high, b.high);
        a.low = Math.min(a.low, b.low);
        a.close = b.close;
      }
    }
    const n = bars.length;
    const mk = () => new Array(n).fill(Number.NaN);
    const levels = { p: mk(), r1: mk(), s1: mk(), r2: mk(), s2: mk(), r3: mk(), s3: mk(), r4: mk(), s4: mk() };
    let lastKey = Number.NaN;
    for (let i = 0; i < n; i++) {
      const key = periodKey(anchor, bars[i].time);
      const fresh = key !== lastKey;
      lastKey = key;
      if (fresh) continue;
      const prev = aggs.get(key - 1);
      const curr = aggs.get(key);
      if (!prev || !curr) continue;
      const range = prev.high - prev.low;
      const traditional = (prev.high + prev.low + prev.close) / 3;
      const p = kind === PIVOT_WOODIE ? (prev.high + prev.low + 2 * curr.open) / 4 : traditional;
      levels.p[i] = p;
      if (kind === PIVOT_FIBONACCI) {
        levels.r1[i] = traditional + 0.382 * range;
        levels.s1[i] = traditional - 0.382 * range;
        levels.r2[i] = traditional + 0.618 * range;
        levels.s2[i] = traditional - 0.618 * range;
        levels.r3[i] = traditional + range;
        levels.s3[i] = traditional - range;
      } else if (kind === PIVOT_CAMARILLA) {
        const cam = 1.1 * range;
        levels.r1[i] = prev.close + cam / 12;
        levels.s1[i] = prev.close - cam / 12;
        levels.r2[i] = prev.close + cam / 6;
        levels.s2[i] = prev.close - cam / 6;
        levels.r3[i] = prev.close + cam / 4;
        levels.s3[i] = prev.close - cam / 4;
        levels.r4[i] = prev.close + cam / 2;
        levels.s4[i] = prev.close - cam / 2;
      } else {
        levels.r1[i] = 2 * p - prev.low;
        levels.s1[i] = 2 * p - prev.high;
        levels.r2[i] = p + range;
        levels.s2[i] = p - range;
        if (kind !== PIVOT_WOODIE) {
          levels.r3[i] = prev.high + 2 * (p - prev.low);
          levels.s3[i] = prev.low - 2 * (prev.high - p);
        }
      }
    }
    const resistance = str3(inputs, "resistanceColor", BEARISH);
    const support = str3(inputs, "supportColor", BULLISH);
    const plot = (key, title, color) => ({ key, title, values: levels[key], color });
    const plots = [
      plot("p", "P", str3(inputs, "pivotColor", WARNING)),
      plot("r1", "R1", resistance),
      plot("s1", "S1", support),
      plot("r2", "R2", resistance),
      plot("s2", "S2", support)
    ];
    if (kind !== PIVOT_WOODIE) plots.push(plot("r3", "R3", resistance), plot("s3", "S3", support));
    if (kind === PIVOT_CAMARILLA) plots.push(plot("r4", "R4", resistance), plot("s4", "S4", support));
    return { plots };
  }
};
var fiftyTwoWeek = {
  type: "52-week-high-low",
  title: "52 Week High/Low",
  shortTitle: "52W H/L",
  overlay: true,
  inputs: [
    intInput("weeks", "Weeks", 52, 1, 520, "Length of the rolling window, in weeks."),
    boolInput("showAllTime", "Show All-Time High/Low", false, SETTINGS, "Additionally display the all-time high and low, tracked over the symbol's full loaded history."),
    colorInput(BULLISH, "52 Week High", "highColor", "Color of the 52 week high level."),
    colorInput(BEARISH, "52 Week Low", "lowColor", "Color of the 52 week low level."),
    colorInput(NEUTRAL, "All-Time High/Low", "allTimeColor", "Color of the all-time high and all-time low levels.")
  ],
  compute: (bars, inputs) => {
    const span = num3(inputs, "weeks", 52) * 7 * DAY_MS;
    const n = bars.length;
    const hi = new Array(n).fill(Number.NaN);
    const lo = new Array(n).fill(Number.NaN);
    const ath = new Array(n).fill(Number.NaN);
    const atl = new Array(n).fill(Number.NaN);
    const maxIdx = [];
    const minIdx = [];
    let from = 0;
    let runHigh = -Infinity;
    let runLow = Infinity;
    for (let i = 0; i < n; i++) {
      const b = bars[i];
      while (maxIdx.length > 0 && bars[maxIdx[maxIdx.length - 1]].high <= b.high) maxIdx.pop();
      maxIdx.push(i);
      while (minIdx.length > 0 && bars[minIdx[minIdx.length - 1]].low >= b.low) minIdx.pop();
      minIdx.push(i);
      while (bars[from].time < b.time - span) from += 1;
      while (maxIdx[0] < from) maxIdx.shift();
      while (minIdx[0] < from) minIdx.shift();
      hi[i] = bars[maxIdx[0]].high;
      lo[i] = bars[minIdx[0]].low;
      runHigh = Math.max(runHigh, b.high);
      runLow = Math.min(runLow, b.low);
      ath[i] = runHigh;
      atl[i] = runLow;
    }
    const plots = [
      { key: "high", title: "52 Week High", values: hi, kind: "step", color: str3(inputs, "highColor", BULLISH), width: 2 },
      { key: "low", title: "52 Week Low", values: lo, kind: "step", color: str3(inputs, "lowColor", BEARISH), width: 2 }
    ];
    if (bool(inputs, "showAllTime", false)) {
      const ink = str3(inputs, "allTimeColor", NEUTRAL);
      plots.push({ key: "ath", title: "All-Time High", values: ath, kind: "step", color: ink }, { key: "atl", title: "All-Time Low", values: atl, kind: "step", color: ink });
    }
    return { plots };
  }
};
var zigzag = {
  type: "zigzag",
  title: "ZigZag",
  overlay: true,
  inputs: [
    floatInput("deviation", "Deviation (%)", 5, 0.01, 100, 0.1, "Minimum reversal from the leg extreme, as a percentage of that extreme, required to confirm a new pivot."),
    { ...intInput("depth", "Depth", 10, 2, 500, "Minimum number of bars required between two consecutive pivots.") },
    colorInput(BULLISH, "Up Leg", "bullColor", "Color of rising zigzag segments."),
    colorInput(BEARISH, "Down Leg", "bearColor", "Color of falling zigzag segments."),
    { key: "lineWidth", title: "Width", type: "int", defval: 2, min: 1, max: 10, step: 1, group: STYLE, tooltip: "Width of the zigzag segments." }
  ],
  compute: (bars, inputs) => {
    const dev = num3(inputs, "deviation", 5) / 100;
    const depth = num3(inputs, "depth", 10);
    const pivots = [];
    if (bars.length > 1) {
      let up = bars[1].close >= bars[0].close;
      let ext = up ? { i: 0, price: bars[0].high } : { i: 0, price: bars[0].low };
      for (let i = 1; i < bars.length; i++) {
        const b = bars[i];
        if (up) {
          if (b.high >= ext.price) ext = { i, price: b.high };
          else if (b.low <= ext.price * (1 - dev) && ext.i - (pivots[pivots.length - 1]?.i ?? -depth) >= depth) {
            pivots.push(ext);
            up = false;
            ext = { i, price: b.low };
          }
        } else if (b.low <= ext.price) {
          ext = { i, price: b.low };
        } else if (b.high >= ext.price * (1 + dev) && ext.i - (pivots[pivots.length - 1]?.i ?? -depth) >= depth) {
          pivots.push(ext);
          up = true;
          ext = { i, price: b.high };
        }
      }
      pivots.push(ext);
    }
    const bull = str3(inputs, "bullColor", BULLISH);
    const bear = str3(inputs, "bearColor", BEARISH);
    const width = num3(inputs, "lineWidth", 2);
    const polylines = [];
    for (let k = 1; k < pivots.length; k++) {
      const a = pivots[k - 1];
      const b = pivots[k];
      polylines.push({
        key: `leg${k}`,
        points: [
          { xloc: "bar_time", x: bars[a.i].time, price: a.price },
          { xloc: "bar_time", x: bars[b.i].time, price: b.price }
        ],
        curved: false,
        closed: false,
        lineColor: b.price >= a.price ? bull : bear,
        lineWidth: width,
        lineStyle: "solid",
        arrowLeft: false,
        arrowRight: false
      });
    }
    return { plots: [], polylines };
  }
};
var williamsFractal = {
  type: "williams-fractal",
  title: "Williams Fractal",
  shortTitle: "Fractals",
  overlay: true,
  inputs: [
    intInput("periods", "Periods", 2, 2, 50, "Bars required on each side of the candidate bar. 2 is Bill Williams' classic 5-bar fractal; a fractal is confirmed only once this many later bars have closed."),
    colorInput(BEARISH, "Up Fractal", "upColor", "Color of the up fractal marker (swing high), drawn above the fractal bar."),
    colorInput(BULLISH, "Down Fractal", "downColor", "Color of the down fractal marker (swing low), drawn below the fractal bar.")
  ],
  compute: (bars, inputs) => {
    const p = num3(inputs, "periods", 2);
    const markers = [];
    const up = str3(inputs, "upColor", BEARISH);
    const down = str3(inputs, "downColor", BULLISH);
    const isExtreme = (i, pick, better) => {
      const v = pick(bars[i]);
      for (let k = i - p; k <= i + p; k++) {
        if (k === i) continue;
        if (!better(v, pick(bars[k]))) return false;
      }
      return true;
    };
    for (let i = p; i < bars.length - p; i++) {
      if (isExtreme(i, (b) => b.high, (a, b) => a > b)) markers.push({ time: bars[i].time, position: "aboveBar", shape: "triangleup", color: up });
      if (isExtreme(i, (b) => b.low, (a, b) => a < b)) markers.push({ time: bars[i].time, position: "belowBar", shape: "triangledown", color: down });
    }
    return { plots: [], markers };
  }
};
var overlaySpecs = [parabolicSar, vwap, pivotPoints, fiftyTwoWeek, zigzag, williamsFractal];

// src/core/native-indicators/classics/tv.ts
var BLUE = TV_COLORS.blue;
var ORANGE = TV_COLORS.orange;
var GREY = TV_COLORS.grey;
var GREY_HALF = "rgba(120,123,134,0.5)";
var GREEN = TV_COLORS.green;
var RED = TV_COLORS.red;
var YELLOW = TV_COLORS.yellow;
var SMOOTHING = "Smoothing";
var TV_SMOOTHING = ["None", "SMA", "SMA + Bollinger Bands", "EMA", "SMMA (RMA)", "WMA", "VWMA"];
var TT_BB = "Only applies when 'SMA + Bollinger Bands' is selected. Determines the distance between the SMA and the bands.";
function int(key, title, defval, min = 1, max = 5e3, extra = {}) {
  return { key, title, type: "int", defval, min, max, step: 1, ...extra };
}
function float(key, title, defval, min, max, step, extra = {}) {
  return { key, title, type: "float", defval, min, max, step, ...extra };
}
var TV_SOURCES = ["Open", "High", "Low", "Close", "HL2", "HLC3", "OHLC4", "HLCC4"];
var TV_SOURCE_LABELS = { HL2: "(H + L)/2", HLC3: "(H + L + C)/3", OHLC4: "(O + H + L + C)/4", HLCC4: "(H + L + C + C)/4" };
function source(key = "source", title = "Source", defval = "Close", extra = {}) {
  return { key, title, type: "string", defval, options: TV_SOURCES, optionLabels: TV_SOURCE_LABELS, ...extra };
}
function option(key, title, defval, options, extra = {}) {
  return { key, title, type: "string", defval, options, ...extra };
}
function flag(key, title, defval, extra = {}) {
  return { key, title, type: "bool", defval, ...extra };
}
var offsetInput2 = (group) => int("offset", "Offset", 0, -500, 500, group ? { group } : {});
function maOf(type, src, len, bars) {
  switch (type) {
    case "EMA":
      return ema(src, len);
    case "SMMA (RMA)":
    case "RMA":
      return rma(src, len);
    case "WMA":
      return wma(src, len);
    case "VWMA":
      return vwma([...src], volumes(bars), len);
    default:
      return sma(src, len);
  }
}
function offsetBy(v, offset) {
  const n = v.length;
  const out = new Array(n).fill(Number.NaN);
  for (let i = 0; i < n; i++) {
    const j = i - offset;
    if (j >= 0 && j < n) out[i] = v[j];
  }
  return out;
}
var level = (key, title, price, color) => ({ key, title, price, color, lineStyle: "dashed", width: 1 });
function smoothingInputs2(defType) {
  return [
    option("smoothingType", "Type", defType, TV_SMOOTHING, { group: SMOOTHING }),
    int("smoothingLength", "Length", 14, 1, 5e3, { group: SMOOTHING }),
    float("bbMult", "BB StdDev", 2, 1e-3, 50, 0.5, { group: SMOOTHING, tooltip: TT_BB })
  ];
}
function smoothingOutputs(values, bars, inputs, of, defType) {
  const type = str3(inputs, "smoothingType", defType);
  if (type === "None") return { plots: [], bands: [] };
  const len = Math.max(1, Math.trunc(num3(inputs, "smoothingLength", 14)));
  const ma = maOf(type === "SMA + Bollinger Bands" ? "SMA" : type, values, len, bars);
  const plots = [{ key: "smoothing", title: `${of}-based MA`, values: ma, color: YELLOW }];
  const bands = [];
  if (type === "SMA + Bollinger Bands") {
    const dev = stdev(values, len);
    const k = num3(inputs, "bbMult", 2);
    plots.push(
      { key: "bbUpper", title: "Upper Bollinger Band", values: ma.map((m, i) => m + k * dev[i]), color: GREEN },
      { key: "bbLower", title: "Lower Bollinger Band", values: ma.map((m, i) => m - k * dev[i]), color: GREEN }
    );
    bands.push({ key: "bbFill", title: "Bollinger Bands Background Fill", from: "bbUpper", to: "bbLower", color: "rgba(76,175,80,0.1)" });
  }
  return { plots, bands };
}
function stochTv(v, hi, lo, len) {
  const hh = highest(hi, len);
  const ll = lowest(lo, len);
  return v.map((x, i) => {
    const h = hh[i];
    const l = ll[i];
    return Number.isFinite(x) && Number.isFinite(h) && Number.isFinite(l) && h !== l ? 100 * (x - l) / (h - l) : Number.NaN;
  });
}
function rsiTv(src, len) {
  const n = src.length;
  const up = new Array(n).fill(Number.NaN);
  const dn = new Array(n).fill(Number.NaN);
  for (let i = 1; i < n; i++) {
    const d = src[i] - src[i - 1];
    if (!Number.isFinite(d)) continue;
    up[i] = Math.max(d, 0);
    dn[i] = -Math.min(d, 0);
  }
  const u = rma(up, len);
  const w = rma(dn, len);
  return u.map((a, i) => {
    const b = w[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
    return b === 0 ? 100 : a === 0 ? 0 : 100 - 100 / (1 + a / b);
  });
}
function gradientStops(n, stop) {
  return new Array(n).fill(stop);
}
var RSI_GROUP = "RSI Settings";
var rsi2 = {
  type: "rsi",
  title: "Relative Strength Index",
  shortTitle: "RSI",
  overlay: false,
  tv: { statusKeys: ["length", "source"] },
  inputs: [
    int("length", "RSI Length", 14, 1, 5e3, { group: RSI_GROUP }),
    source("source", "Source", "Close", { group: RSI_GROUP }),
    flag("divergence", "Calculate Divergence", false, { group: RSI_GROUP, tooltip: "Calculating divergences is needed in order for divergence alerts to fire." }),
    ...smoothingInputs2("SMA")
  ],
  compute: (bars, inputs) => {
    const n = bars.length;
    const values = rsiTv(sourceValues(bars, str3(inputs, "source", "Close")), Math.max(1, Math.trunc(num3(inputs, "length", 14))));
    const smoothing = smoothingOutputs(values, bars, inputs, "RSI", "SMA");
    const plots = [
      { key: "rsi", title: "RSI", values, color: TV_COLORS.purple },
      ...smoothing.plots,
      anchorPlot("upperAnchor", "Upper Anchor", n, 70),
      anchorPlot("lowerAnchor", "Lower Anchor", n, 30),
      anchorPlot("midAnchor", "Mid Anchor", n, 50)
    ];
    const bands = [
      { key: "bg", title: "RSI Background Fill", from: "upperAnchor", to: "lowerAnchor", color: "rgba(126,87,194,0.1)" },
      { key: "ob", title: "Overbought Gradient Fill", from: "rsi", to: "midAnchor", color: "rgba(76,175,80,0)", gradient: gradientStops(n, { topValue: 100, bottomValue: 70, topColor: "rgba(76,175,80,1)", bottomColor: "rgba(76,175,80,0)" }) },
      { key: "os", title: "Oversold Gradient Fill", from: "rsi", to: "midAnchor", color: "rgba(242,54,69,0)", gradient: gradientStops(n, { topValue: 30, bottomValue: 0, topColor: "rgba(242,54,69,0)", bottomColor: "rgba(242,54,69,1)" }) },
      ...smoothing.bands
    ];
    const out = {
      plots,
      bands,
      levels: [level("upper", "RSI Upper Band", 70, GREY), level("middle", "RSI Middle Band", 50, GREY_HALF), level("lower", "RSI Lower Band", 30, GREY)]
    };
    if (inputs.divergence === true) addRsiDivergence(out, values, bars);
    return out;
  }
};
function addRsiDivergence(out, r, bars) {
  const L = 5;
  const R = 5;
  const n = bars.length;
  const bull = new Array(n).fill(Number.NaN);
  const bear = new Array(n).fill(Number.NaN);
  const bullColors = new Array(n).fill(null);
  const bearColors = new Array(n).fill(null);
  const isPivot = (c, low) => {
    const v = r[c];
    if (!Number.isFinite(v)) return false;
    for (let k = c - L; k <= c + R; k++) {
      if (k === c) continue;
      const w = r[k];
      if (w === void 0 || !Number.isFinite(w)) return false;
      if (low ? w <= v && (k > c || w < v) : w >= v && (k > c || w > v)) return false;
    }
    return true;
  };
  let lastLow = -1;
  let lastHigh = -1;
  out.markers ?? (out.markers = []);
  for (let i = L + R; i < n; i++) {
    const c = i - R;
    for (const low of [true, false]) {
      if (!isPivot(c, low)) continue;
      const prev = low ? lastLow : lastHigh;
      const since = prev < 0 ? Infinity : c - prev;
      const inRange = since >= 5 && since <= 60;
      const cond = prev >= 0 && inRange && (low ? r[c] > r[prev] && bars[c].low < bars[prev].low : r[c] < r[prev] && bars[c].high > bars[prev].high);
      const line = low ? bull : bear;
      const colors = low ? bullColors : bearColors;
      line[c] = r[c];
      colors[c] = cond ? low ? GREEN : RED : "rgba(255,255,255,0)";
      if (cond) out.markers.push({ time: bars[c].time, position: "inBar", shape: low ? "arrowUp" : "arrowDown", color: low ? GREEN : RED, text: low ? "Bull" : "Bear" });
      if (low) lastLow = c;
      else lastHigh = c;
    }
  }
  const join = (v) => {
    const res = v.slice();
    let prev = -1;
    for (let i = 0; i < n; i++) {
      if (!Number.isFinite(v[i])) continue;
      if (prev >= 0) for (let k = prev + 1; k < i; k++) res[k] = v[prev] + (v[i] - v[prev]) * (k - prev) / (i - prev);
      prev = i;
    }
    return res;
  };
  const spread = (c) => {
    const res = c.slice();
    for (let i = n - 1, cur = null; i >= 0; i--) {
      if (c[i]) cur = c[i];
      else res[i] = cur;
    }
    return res;
  };
  out.plots.push(
    { key: "bullDiv", title: "Regular Bullish", values: join(bull), color: GREEN, width: 2, colors: spread(bullColors) },
    { key: "bearDiv", title: "Regular Bearish", values: join(bear), color: RED, width: 2, colors: spread(bearColors) }
  );
}
function tvAverage(type, title, shortTitle, plotTitle, color, calc, opts = {}) {
  const { offset = true, source: hasSource = true, smoothing = false, min = 1 } = opts;
  return {
    type,
    title,
    shortTitle,
    overlay: true,
    tv: { statusKeys: hasSource ? ["length", "source"] : ["length"] },
    inputs: [int("length", "Length", 9, min), ...hasSource ? [source()] : [], ...offset ? [offsetInput2()] : [], ...smoothing ? smoothingInputs2("None") : []],
    compute: (bars, inputs) => {
      const len = Math.max(min, Math.trunc(num3(inputs, "length", 9)));
      const values = calc(sourceValues(bars, hasSource ? str3(inputs, "source", "Close") : "Close"), len);
      const shown = offset ? offsetBy(values, Math.trunc(num3(inputs, "offset", 0))) : values;
      const plots = [{ key: type, title: plotTitle, values: shown, color }];
      if (!smoothing) return { plots };
      const s = smoothingOutputs(values, bars, inputs, shortTitle, "None");
      return { plots: [...plots, ...s.plots], bands: s.bands };
    }
  };
}
function hullTv(src, len) {
  const half = wma(src, Math.max(1, Math.trunc(len / 2)));
  const full = wma(src, len);
  return wma(half.map((h, i) => 2 * h - full[i]), Math.max(1, Math.floor(Math.sqrt(len))));
}
var emaSpec = tvAverage("ema", "Exponential Moving Average", "EMA", "EMA", BLUE, ema, { smoothing: true });
var smaSpec = tvAverage("sma", "Simple Moving Average", "SMA", "MA", BLUE, sma, { smoothing: true });
var wmaSpec = tvAverage("wma", "Weighted Moving Average", "WMA", "WMA", BLUE, wma);
var hmaSpec = tvAverage("hull-moving-average", "Hull Moving Average", "HMA", "HMA", BLUE, hullTv, { offset: false, min: 2 });
var demaSpec = tvAverage("dema", "Double Exponential Moving Average", "DEMA", "DEMA", TV_COLORS.green600, (s, l) => {
  const e1 = ema(s, l);
  const e2 = ema(e1, l);
  return e1.map((x, i) => 2 * x - e2[i]);
}, { offset: false });
var temaSpec = tvAverage("tema", "Triple Exponential Moving Average", "TEMA", "TEMA", BLUE, (s, l) => {
  const e1 = ema(s, l);
  const e2 = ema(e1, l);
  const e3 = ema(e2, l);
  return e1.map((x, i) => 3 * (x - e2[i]) + e3[i]);
}, { offset: false, source: false });
var macd2 = {
  type: "macd",
  title: "MACD",
  shortTitle: "MACD",
  overlay: false,
  tv: { statusKeys: ["source", "fastLength", "slowLength", "signalLength"] },
  inputs: [
    source(),
    int("fastLength", "Fast length", 12),
    int("slowLength", "Slow length", 26),
    int("signalLength", "Signal length", 9),
    option("oscType", "Oscillator MA type", "EMA", ["EMA", "SMA"]),
    option("signalType", "Signal MA type", "EMA", ["EMA", "SMA"])
  ],
  compute: (bars, inputs) => {
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const osc = str3(inputs, "oscType", "EMA");
    const fast = maOf(osc, src, Math.max(1, Math.trunc(num3(inputs, "fastLength", 12))), bars);
    const slow = maOf(osc, src, Math.max(1, Math.trunc(num3(inputs, "slowLength", 26))), bars);
    const line = fast.map((f, i) => f - slow[i]);
    const signal = maOf(str3(inputs, "signalType", "EMA"), line, Math.max(1, Math.trunc(num3(inputs, "signalLength", 9))), bars);
    const hist = line.map((m, i) => m - signal[i]);
    const palette = [TV_COLORS.teal, TV_COLORS.tealLight, TV_COLORS.redLight, TV_COLORS.redAccent];
    const colors = hist.map((h, i) => {
      if (!Number.isFinite(h)) return null;
      const prev = hist[i - 1];
      const rising = prev !== void 0 && Number.isFinite(prev) && h > prev;
      return palette[h >= 0 ? rising ? 0 : 1 : rising ? 2 : 3];
    });
    return {
      plots: [
        { key: "hist", title: "Histogram", kind: "columns", values: hist, color: TV_COLORS.teal, colors, palette, base: 0 },
        { key: "macd", title: "MACD", values: line, color: BLUE },
        { key: "signal", title: "Signal line", values: signal, color: ORANGE }
      ],
      levels: [{ key: "zero", title: "Zero", price: 0, color: GREY_HALF, lineStyle: "dashed", width: 1 }]
    };
  }
};
var bollinger2 = {
  type: "bollinger-bands",
  title: "Bollinger Bands",
  shortTitle: "BB",
  overlay: true,
  tv: { statusKeys: ["length", "maType", "source", "mult"] },
  inputs: [
    int("length", "Length", 20, 1, 5e3, { tooltip: "The time period to be used in calculating the MA which creates the base for the Upper and Lower Bands." }),
    option("maType", "Basis MA Type", "SMA", ["SMA", "EMA", "SMMA (RMA)", "WMA", "VWMA"], { tooltip: "Determines the type of Moving Average that is applied to the basis plot line." }),
    source("source", "Source", "Close", { tooltip: "Determines what data from each bar will be used in calculations." }),
    float("mult", "StdDev", 2, 1e-3, 50, 0.1, { tooltip: "The number of Standard Deviations away from the MA that the Upper and Lower Bands should be." }),
    int("offset", "Offset", 0, -500, 500, { tooltip: "Changing this number will move the Bollinger Bands either Forwards or Backwards relative to the current market." })
  ],
  compute: (bars, inputs) => {
    const len = Math.max(1, Math.trunc(num3(inputs, "length", 20)));
    const src = sourceValues(bars, str3(inputs, "source", "Close"));
    const basis = maOf(str3(inputs, "maType", "SMA"), src, len, bars);
    const dev = stdev(src, len);
    const k = num3(inputs, "mult", 2);
    const off = Math.trunc(num3(inputs, "offset", 0));
    return {
      plots: [
        { key: "basis", title: "Basis", values: offsetBy(basis, off), color: BLUE },
        { key: "upper", title: "Upper", values: offsetBy(basis.map((b, i) => b + k * dev[i]), off), color: RED },
        { key: "lower", title: "Lower", values: offsetBy(basis.map((b, i) => b - k * dev[i]), off), color: TV_COLORS.tvTeal }
      ],
      bands: [{ key: "bg", title: "Background", from: "upper", to: "lower", color: "rgba(33,150,243,0.05)" }]
    };
  }
};
var HIDDEN = { pane: false, priceScale: false, legend: false, dataWindow: true };
var OFF = { pane: false, priceScale: false, legend: false, dataWindow: false };
var donchianMid = (bars, len) => {
  const hh = highest(highs(bars), len);
  const ll = lowest(lows(bars), len);
  return hh.map((h, i) => (h + ll[i]) / 2);
};
var ichimoku = {
  type: "ichimoku-cloud",
  title: "Ichimoku Cloud",
  shortTitle: "Ichimoku",
  overlay: true,
  tv: { statusKeys: ["conversion", "base", "spanB", "displacement"] },
  inputs: [
    int("conversion", "Conversion Line Length", 9),
    int("base", "Base Line Length", 26),
    int("spanB", "Leading Span B Length", 52),
    int("displacement", "Lagging Span", 26)
  ],
  compute: (bars, inputs) => {
    const conv = donchianMid(bars, Math.max(1, Math.trunc(num3(inputs, "conversion", 9))));
    const base = donchianMid(bars, Math.max(1, Math.trunc(num3(inputs, "base", 26))));
    const lead1 = conv.map((c, i) => (c + base[i]) / 2);
    const lead2 = donchianMid(bars, Math.max(1, Math.trunc(num3(inputs, "spanB", 52))));
    const shift2 = Math.min(5e3, Math.max(1, Math.trunc(num3(inputs, "displacement", 26)) || 1)) - 1;
    const ahead = (v) => [...new Array(shift2).fill(Number.NaN), ...v];
    const a = ahead(lead1);
    const b = ahead(lead2);
    const cloudColors = a.map((x, i) => Number.isFinite(x) && Number.isFinite(b[i]) ? x > b[i] ? "rgba(67,160,71,0.1)" : "rgba(244,67,54,0.1)" : null);
    return {
      plots: [
        { key: "conversion", title: "Conversion Line", values: conv, color: BLUE },
        { key: "base", title: "Base Line", values: base, color: TV_COLORS.red900 },
        { key: "lagging", title: "Lagging Span", values: offsetBy(closes(bars), -shift2), color: TV_COLORS.green600 },
        { key: "spanA", title: "Leading Span A", values: a, color: TV_COLORS.green200 },
        { key: "spanB", title: "Leading Span B", values: b, color: TV_COLORS.red200 },
        // TradingView's two hidden cloud edges (no line on the chart; alerts can watch them).
        { key: "kumoUpper", title: "Kumo Cloud Upper Line", values: a.map((x, i) => Math.max(x, b[i])), color: TV_COLORS.green200, display: HIDDEN, styleOff: true },
        { key: "kumoLower", title: "Kumo Cloud Lower Line", values: a.map((x, i) => Math.min(x, b[i])), color: TV_COLORS.red200, display: HIDDEN, styleOff: true }
      ],
      bands: [{ key: "cloud", title: "Cloud Fill", from: "spanA", to: "spanB", color: "rgba(67,160,71,0.1)", colors: cloudColors, palette: ["rgba(67,160,71,0.1)", "rgba(244,67,54,0.1)"] }]
    };
  }
};
function stochOutput(k, d, kTitle, dTitle) {
  const n = k.length;
  return {
    plots: [
      { key: "k", title: kTitle, values: k, color: BLUE },
      { key: "d", title: dTitle, values: d, color: ORANGE },
      anchorPlot("upperAnchor", "Upper Anchor", n, 80),
      anchorPlot("lowerAnchor", "Lower Anchor", n, 20)
    ],
    bands: [{ key: "bg", title: "Background", from: "upperAnchor", to: "lowerAnchor", color: "rgba(33,150,243,0.1)" }],
    levels: [level("upper", "Upper Band", 80, GREY), level("middle", "Middle Band", 50, GREY_HALF), level("lower", "Lower Band", 20, GREY)]
  };
}
var stochastic2 = {
  type: "stochastic",
  title: "Stochastic",
  shortTitle: "Stoch",
  overlay: false,
  tv: { statusKeys: ["kLength", "kSmoothing", "dLength"] },
  inputs: [int("kLength", "%K Length", 14), int("kSmoothing", "%K Smoothing", 1), int("dLength", "%D Smoothing", 3)],
  compute: (bars, inputs) => {
    const k = sma(stochTv(closes(bars), highs(bars), lows(bars), Math.max(1, Math.trunc(num3(inputs, "kLength", 14)))), Math.max(1, Math.trunc(num3(inputs, "kSmoothing", 1))));
    return stochOutput(k, sma(k, Math.max(1, Math.trunc(num3(inputs, "dLength", 3)))), "%K", "%D");
  }
};
var stochasticRsi2 = {
  type: "stochastic-rsi",
  title: "Stochastic RSI",
  shortTitle: "Stoch RSI",
  overlay: false,
  tv: { statusKeys: ["kSmoothing", "dLength", "rsiLength", "stochLength", "source"] },
  inputs: [int("kSmoothing", "K", 3), int("dLength", "D", 3), int("rsiLength", "RSI Length", 14), int("stochLength", "Stochastic Length", 14), source("source", "RSI Source")],
  compute: (bars, inputs) => {
    const r = rsiTv(sourceValues(bars, str3(inputs, "source", "Close")), Math.max(1, Math.trunc(num3(inputs, "rsiLength", 14))));
    const k = sma(stochTv(r, r, r, Math.max(1, Math.trunc(num3(inputs, "stochLength", 14)))), Math.max(1, Math.trunc(num3(inputs, "kSmoothing", 3))));
    return stochOutput(k, sma(k, Math.max(1, Math.trunc(num3(inputs, "dLength", 3)))), "K", "D");
  }
};
var atrSpec2 = {
  type: "average-true-range",
  title: "Average True Range",
  shortTitle: "ATR",
  overlay: false,
  tv: { statusKeys: ["length", "smoothing"] },
  inputs: [int("length", "Length", 14), option("smoothing", "Smoothing", "RMA", ["RMA", "SMA", "EMA", "WMA"])],
  compute: (bars, inputs) => {
    const values = maOf(str3(inputs, "smoothing", "RMA"), trueRange(bars), Math.max(1, Math.trunc(num3(inputs, "length", 14))), bars);
    return { plots: [{ key: "atr", title: "ATR", values, color: TV_COLORS.red900 }] };
  }
};
function supertrendTv(bars, factor, period) {
  const n = bars.length;
  const atrV = rma(trueRange(bars).map((x, i) => i === 0 ? Number.NaN : x), period);
  const line = new Array(n).fill(Number.NaN);
  const dir = new Array(n).fill(Number.NaN);
  let prevUpper = Number.NaN;
  let prevLower = Number.NaN;
  let prevLine = Number.NaN;
  for (let i = 0; i < n; i++) {
    const b = bars[i];
    const a = atrV[i];
    const mid = (b.high + b.low) / 2;
    let upper = mid + factor * a;
    let lower = mid - factor * a;
    const pl = Number.isFinite(prevLower) ? prevLower : 0;
    const pu = Number.isFinite(prevUpper) ? prevUpper : 0;
    const prevClose = i > 0 ? bars[i - 1].close : Number.NaN;
    lower = lower > pl || prevClose < pl ? lower : pl;
    upper = upper < pu || prevClose > pu ? upper : pu;
    let d;
    if (i === 0 || !Number.isFinite(atrV[i - 1])) d = 1;
    else if (prevLine === prevUpper) d = b.close > upper ? -1 : 1;
    else d = b.close < lower ? 1 : -1;
    const st = d === -1 ? lower : upper;
    if (Number.isFinite(a)) {
      line[i] = st;
      dir[i] = d;
    }
    prevUpper = upper;
    prevLower = lower;
    prevLine = st;
  }
  return { line, dir };
}
var supertrend2 = {
  type: "supertrend",
  title: "Supertrend",
  shortTitle: "Supertrend",
  overlay: true,
  tv: { statusKeys: ["atrLength", "mult"] },
  inputs: [int("atrLength", "ATR Length", 10), float("mult", "Factor", 3, 0.01, 100, 0.01)],
  compute: (bars, inputs) => {
    const { line, dir } = supertrendTv(bars, num3(inputs, "mult", 3), Math.max(1, Math.trunc(num3(inputs, "atrLength", 10))));
    line[0] = Number.NaN;
    const up = line.map((v, i) => dir[i] === -1 ? v : Number.NaN);
    const down = line.map((v, i) => dir[i] === 1 ? v : Number.NaN);
    const middle = bars.map((b, i) => i === 0 ? Number.NaN : (b.open + b.close) / 2);
    return {
      plots: [
        { key: "up", title: "Up Trend", values: up, color: GREEN },
        { key: "down", title: "Down Trend", values: down, color: RED },
        { key: "middle", title: "Body Middle", values: middle, color: "rgba(0,0,0,0)", display: { pane: false, legend: false, dataWindow: false, priceScale: false } }
      ],
      bands: [
        { key: "upBg", title: "Uptrend background", from: "middle", to: "up", color: "rgba(76,175,80,0.1)" },
        { key: "downBg", title: "Downtrend background", from: "middle", to: "down", color: "rgba(242,54,69,0.1)" }
      ]
    };
  }
};
function sarTv(bars, start, inc, max) {
  const n = bars.length;
  const out = new Array(n).fill(Number.NaN);
  let result = Number.NaN;
  let maxMin = Number.NaN;
  let acc = Number.NaN;
  let below = false;
  for (let i = 1; i < n; i++) {
    const b = bars[i];
    let firstTrendBar = false;
    if (i === 1) {
      if (b.close > bars[0].close) {
        below = true;
        maxMin = b.high;
        result = bars[0].low;
      } else {
        below = false;
        maxMin = b.low;
        result = bars[0].high;
      }
      firstTrendBar = true;
      acc = start;
    }
    result = result + acc * (maxMin - result);
    if (below) {
      if (result > b.low) {
        firstTrendBar = true;
        below = false;
        result = Math.max(b.high, maxMin);
        maxMin = b.low;
        acc = start;
      }
    } else if (result < b.high) {
      firstTrendBar = true;
      below = true;
      result = Math.min(b.low, maxMin);
      maxMin = b.high;
      acc = start;
    }
    if (!firstTrendBar) {
      if (below) {
        if (b.high > maxMin) {
          maxMin = b.high;
          acc = Math.min(acc + inc, max);
        }
      } else if (b.low < maxMin) {
        maxMin = b.low;
        acc = Math.min(acc + inc, max);
      }
    }
    if (below) {
      result = Math.min(result, bars[i - 1].low);
      if (i > 1) result = Math.min(result, bars[i - 2].low);
    } else {
      result = Math.max(result, bars[i - 1].high);
      if (i > 1) result = Math.max(result, bars[i - 2].high);
    }
    out[i] = result;
  }
  return out;
}
var parabolicSar2 = {
  type: "parabolic-sar",
  title: "Parabolic SAR",
  shortTitle: "SAR",
  overlay: true,
  tv: { statusKeys: ["start", "increment", "maximum"] },
  inputs: [float("start", "Start", 0.02, 0, 10, 0.01), float("increment", "Increment", 0.02, 0, 10, 0.01), float("maximum", "Max value", 0.2, 0, 10, 0.01)],
  compute: (bars, inputs) => ({
    plots: [{ key: "sar", title: "ParabolicSAR", kind: "cross", values: sarTv(bars, num3(inputs, "start", 0.02), num3(inputs, "increment", 0.02), num3(inputs, "maximum", 0.2)), color: BLUE }]
  })
};
function fixnan(v) {
  let last = Number.NaN;
  return v.map((x) => Number.isFinite(x) ? last = x : last);
}
var adx2 = {
  type: "average-directional-index",
  title: "Average Directional Index",
  shortTitle: "ADX",
  overlay: false,
  tv: { statusKeys: ["adxLength", "diLength"] },
  inputs: [
    int("adxLength", "ADX Smoothing", 14, 1, 5e3, { tooltip: "The time period to be used in calculating the ADX which has a smoothing component." }),
    int("diLength", "DI Length", 14, 1, 5e3, { tooltip: "The time period to be used in calculating the DI (Directional Indicator)." })
  ],
  compute: (bars, inputs) => {
    const n = bars.length;
    const di = Math.max(1, Math.trunc(num3(inputs, "diLength", 14)));
    const plusDM = new Array(n).fill(Number.NaN);
    const minusDM = new Array(n).fill(Number.NaN);
    const tr = new Array(n).fill(Number.NaN);
    for (let i = 1; i < n; i++) {
      const up = bars[i].high - bars[i - 1].high;
      const down = bars[i - 1].low - bars[i].low;
      plusDM[i] = up > down && up > 0 ? up : 0;
      minusDM[i] = down > up && down > 0 ? down : 0;
      const pc = bars[i - 1].close;
      tr[i] = Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - pc), Math.abs(bars[i].low - pc));
    }
    const trs = rma(tr, di);
    const plus = fixnan(rma(plusDM, di).map((x, i) => 100 * x / trs[i]));
    const minus = fixnan(rma(minusDM, di).map((x, i) => 100 * x / trs[i]));
    const ratio = plus.map((p, i) => {
      const s = p + minus[i];
      return Math.abs(p - minus[i]) / (s === 0 ? 1 : s);
    });
    const values = rma(ratio, Math.max(1, Math.trunc(num3(inputs, "adxLength", 14)))).map((x) => 100 * x);
    return { plots: [{ key: "adx", title: "ADX", values, color: RED }] };
  }
};
var VWAP_GROUP = "VWAP Settings";
var BANDS_GROUP = "Bands Settings";
var DAY = 864e5;
var VWAP_BAND_COLORS = [GREEN, TV_COLORS.olive, TV_COLORS.tvTeal];
var VWAP_BAND_FILLS = ["rgba(76,175,80,0.05)", "rgba(128,128,0,0.05)", "rgba(8,153,129,0.05)"];
function vwapNewPeriod(anchor, prev, cur) {
  switch (anchor) {
    case "Session":
    case "Week":
    case "Month":
    case "Quarter":
    case "Year":
      return periodKey(anchor, prev) !== periodKey(anchor, cur);
    case "Decade":
    case "Century": {
      const y = new Date(cur).getUTCFullYear();
      return new Date(prev).getUTCFullYear() !== y && y % (anchor === "Decade" ? 10 : 100) === 0;
    }
    default:
      return false;
  }
}
var vwap2 = {
  type: "vwap",
  title: "Volume Weighted Average Price",
  shortTitle: "VWAP",
  overlay: true,
  tv: { statusKeys: ["anchor"] },
  inputs: [
    flag("hideDwm", "Hide VWAP on 1D or Above", false, { group: VWAP_GROUP }),
    option("anchor", "Anchor Period", "Session", ["Session", "Week", "Month", "Quarter", "Year", "Decade", "Century", "Earnings", "Dividends", "Splits"], { group: VWAP_GROUP }),
    source("source", "Source", "HLC3", { group: VWAP_GROUP }),
    offsetInput2(VWAP_GROUP),
    option("bandsMode", "Bands Calculation Mode", "Standard Deviation", ["Standard Deviation", "Percentage"], {
      group: BANDS_GROUP,
      tooltip: "Determines the units used to calculate the distance of the bands. When 'Percentage' is selected, a multiplier of 1 means 1%."
    }),
    ...[1, 2, 3].flatMap((k) => [
      flag(`band${k}`, "", k === 1, { group: BANDS_GROUP, inline: `band_${k}` }),
      float(`band${k}Mult`, `Bands Multiplier #${k}`, k, 0, 1e3, 0.5, { group: BANDS_GROUP, inline: `band_${k}` })
    ])
  ],
  compute: (bars, inputs) => {
    const n = bars.length;
    const anchor = str3(inputs, "anchor", "Session");
    const src = sourceValues(bars, str3(inputs, "source", "HLC3"));
    const off = Math.trunc(num3(inputs, "offset", 0));
    const hidden = inputs.hideDwm === true && barInterval(bars) >= DAY;
    const pct = str3(inputs, "bandsMode", "Standard Deviation") === "Percentage";
    const mid = new Array(n).fill(Number.NaN);
    const basis = new Array(n).fill(Number.NaN);
    let sPV = 0;
    let sPV2 = 0;
    let sV = 0;
    for (let i = 0; i < n && !hidden; i++) {
      if (i === 0 || vwapNewPeriod(anchor, bars[i - 1].time, bars[i].time)) {
        sPV = 0;
        sPV2 = 0;
        sV = 0;
      }
      const v = bars[i].volume;
      const x = src[i];
      if (v != null && Number.isFinite(v) && Number.isFinite(x)) {
        sPV += x * v;
        sPV2 += x * x * v;
        sV += v;
      }
      if (sV <= 0) continue;
      const m = sPV / sV;
      mid[i] = m;
      basis[i] = pct ? m * 0.01 : Math.sqrt(Math.max(0, sPV2 / sV - m * m));
    }
    const plots = [{ key: "vwap", title: "VWAP", values: offsetBy(mid, off), color: BLUE }];
    const bands = [];
    for (let k = 1; k <= 3; k++) {
      const on = inputs[`band${k}`] !== void 0 ? inputs[`band${k}`] === true : k === 1;
      const mult = Math.max(0, num3(inputs, `band${k}Mult`, k));
      const color = VWAP_BAND_COLORS[k - 1];
      const line = (sign) => on ? offsetBy(mid.map((m, i) => m + sign * basis[i] * mult), off) : new Array(n).fill(Number.NaN);
      const display = on ? {} : { display: OFF, styleOff: true };
      plots.push(
        { key: `up${k - 1}`, title: `Upper Band #${k}`, values: line(1), color, ...display },
        { key: `down${k - 1}`, title: `Lower Band #${k}`, values: line(-1), color, ...display }
      );
      bands.push({ key: `fill${k - 1}`, title: `Bands Fill #${k}`, from: `up${k - 1}`, to: `down${k - 1}`, color: VWAP_BAND_FILLS[k - 1] });
    }
    return { plots, bands };
  }
};
var tvSpecs = [
  vwap2,
  rsi2,
  emaSpec,
  smaSpec,
  wmaSpec,
  hmaSpec,
  demaSpec,
  temaSpec,
  macd2,
  bollinger2,
  ichimoku,
  stochastic2,
  stochasticRsi2,
  atrSpec2,
  supertrend2,
  parabolicSar2,
  adx2
];

// src/core/native-indicators/classics/index.ts
var TV_TYPES = new Set(tvSpecs.map((s) => s.type));
var classicSpecs = [
  ...tvSpecs,
  ...[...averageSpecs, ...bandSpecs, ...oscillatorSpecs, ...trendSpecs, ...volatilitySpecs, ...volumeSpecs, ...overlaySpecs].filter((s) => !TV_TYPES.has(s.type))
];
function registerClassicIndicators() {
  for (const spec of classicSpecs) if (!getNativeIndicator(spec.type)) registerNativeIndicator(classicDescriptor(spec));
}
function classicPlots(type, bars, inputs) {
  const spec = classicSpecs.find((s) => s.type === type);
  if (!spec) return null;
  const out = spec.compute(bars, inputs);
  const seen = (d) => !d || d.pane !== false || d.legend !== false || d.dataWindow === true;
  return {
    plots: out.plots.filter((p) => seen(p.display)).map((p) => ({ key: p.key, title: p.title, values: p.values })),
    levels: (out.levels ?? []).map((l) => ({ key: l.key, title: l.title ?? "", price: l.price })),
    markers: (out.markers ?? []).map((m) => ({ time: m.time, position: m.position, shape: m.shape }))
  };
}
function classicCatalog() {
  return classicSpecs.map((s) => ({
    type: s.type,
    title: s.title,
    shortTitle: s.shortTitle ?? s.title,
    overlay: s.overlay,
    defaults: Object.fromEntries(s.inputs.map((i) => [i.key, i.defval]))
  }));
}

// src/widget/topbar-composition.ts
var TOPBAR_BUILTIN_IDS = ["symbol", "timeframes", "style", "layout", "indicators", "actions", "undo-redo", "alerts", "panels", "screenshot"];
var TOPBAR_DEFAULT_LEFT = ["symbol", "timeframes", "style", "layout", "indicators", "actions", "undo-redo"];
var TOPBAR_DEFAULT_RIGHT = ["actions", "alerts", "panels", "screenshot"];
function resolveTopbarComposition(opt) {
  const seen = /* @__PURE__ */ new Set();
  const take = (list) => {
    const out = [];
    const local = /* @__PURE__ */ new Set();
    for (const id of list) {
      if (!id || local.has(id) || id !== "actions" && seen.has(id)) continue;
      local.add(id);
      seen.add(id);
      out.push(id);
    }
    return out;
  };
  return { left: take(opt?.left ?? TOPBAR_DEFAULT_LEFT), right: take(opt?.right ?? TOPBAR_DEFAULT_RIGHT) };
}
function topbarHas(comp, id) {
  return comp.left.includes(id) || comp.right.includes(id);
}
function pinnedTopbarActionIds(comp) {
  const builtin = new Set(TOPBAR_BUILTIN_IDS);
  return [...comp.left, ...comp.right].filter((id) => !builtin.has(id));
}

// src/widget/contributions.ts
function mobilePlacement(action) {
  return action.mobile ?? (action.align === "left" ? "bar" : "menu");
}
var registry3 = /* @__PURE__ */ new Map();
var attachments = /* @__PURE__ */ new Map();
var panels = /* @__PURE__ */ new Map();
function registerWidgetAttachment(att) {
  attachments.set(att.id, att);
  return () => {
    if (attachments.get(att.id) === att) attachments.delete(att.id);
  };
}
function unregisterWidgetAttachment(id) {
  attachments.delete(id);
}
function widgetAttachments() {
  return [...attachments.values()];
}
var DEFAULT_PANEL_ORDER = 100;
function registerSidePanel(desc) {
  panels.set(desc.id, desc);
  return () => {
    if (panels.get(desc.id) === desc) panels.delete(desc.id);
  };
}
function unregisterSidePanel(id) {
  panels.delete(id);
}
function sidePanels() {
  return [...panels.values()].sort((a, b) => (a.order ?? DEFAULT_PANEL_ORDER) - (b.order ?? DEFAULT_PANEL_ORDER));
}
var OVERRIDABLE_TOPBAR_IDS = ["indicators", "screenshot"];
var overridableSet = new Set(OVERRIDABLE_TOPBAR_IDS);
var builtinTopbarSet = new Set(TOPBAR_BUILTIN_IDS);
function topbarActionOverride(id) {
  if (!overridableSet.has(id)) return void 0;
  return registry3.get(id);
}
function registerWidgetAction(desc) {
  if (builtinTopbarSet.has(desc.id) && !overridableSet.has(desc.id)) {
    console.warn(`[vela] widget action "${desc.id}": this built-in topbar slot is a stateful control and cannot be overridden \u2014 ignored. Overridable slots: ${OVERRIDABLE_TOPBAR_IDS.join(", ")}.`);
    return () => void 0;
  }
  registry3.set(desc.id, desc);
  return () => {
    if (registry3.get(desc.id) === desc) registry3.delete(desc.id);
  };
}
function unregisterWidgetAction(id) {
  registry3.delete(id);
}
function widgetActions(target, ctx) {
  const list = [...registry3.values()].filter((d) => d.target === target);
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return ctx ? list.filter((d) => !d.when || d.when(ctx)) : list;
}
var legendRegistry = /* @__PURE__ */ new Map();
function registerLegendAction(desc) {
  legendRegistry.set(desc.id, desc);
  return () => {
    if (legendRegistry.get(desc.id) === desc) legendRegistry.delete(desc.id);
  };
}
function unregisterLegendAction(id) {
  legendRegistry.delete(id);
}
function legendActions() {
  return [...legendRegistry.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
function legendActionsProviderFor(chart, context) {
  return (indicatorId) => {
    const find = () => chart.indicators().find((h) => h.id === indicatorId);
    const infoOf = (h) => ({ id: h.id, title: h.title, ...h.source !== void 0 ? { source: h.source } : {} });
    const handle = find();
    if (!handle) return [];
    const info = infoOf(handle);
    return legendActions().filter((d) => !d.when || d.when(info)).map((d) => ({ id: d.id, icon: d.icon, tooltip: d.tooltip, run: () => d.run(context(), infoOf(find() ?? handle)) }));
  };
}
var calloutRegistry = /* @__PURE__ */ new Map();
function registerLegendCallout(desc) {
  calloutRegistry.set(desc.id, desc);
  return () => {
    if (calloutRegistry.get(desc.id) === desc) calloutRegistry.delete(desc.id);
  };
}
function unregisterLegendCallout(id) {
  calloutRegistry.delete(id);
}
function legendCallouts() {
  return [...calloutRegistry.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
function legendCalloutsProviderFor(chart, context) {
  return (indicatorId) => {
    const handle = chart.indicators().find((h) => h.id === indicatorId);
    if (!handle) return [];
    const info = { id: handle.id, title: handle.title, ...handle.source !== void 0 ? { source: handle.source } : {} };
    const views = [];
    for (const d of legendCallouts()) {
      const spec = d.callout(info, { chart, handle });
      if (!spec) continue;
      views.push({
        id: d.id,
        icon: spec.icon,
        background: spec.background,
        ...spec.color !== void 0 ? { color: spec.color } : {},
        ...spec.span !== void 0 ? { span: spec.span } : {},
        tooltip: spec.tooltip,
        ...spec.content !== void 0 ? {
          content: {
            ...spec.content.title !== void 0 ? { title: spec.content.title } : {},
            items: spec.content.items.map(
              (item) => item.type === "text" ? item : {
                type: "button",
                label: item.label,
                ...item.primary !== void 0 ? { primary: item.primary } : {},
                ...item.close !== void 0 ? { close: item.close } : {},
                run: () => item.run(context(), info)
              }
            )
          }
        } : {}
      });
    }
    return views;
  };
}
var stateHandlers = /* @__PURE__ */ new Map();
function registerStatePersistence(handler) {
  stateHandlers.set(handler.key, handler);
  return () => {
    if (stateHandlers.get(handler.key) === handler) stateHandlers.delete(handler.key);
  };
}
function unregisterStatePersistence(key) {
  stateHandlers.delete(key);
}
function statePersistenceHandlers(scope) {
  return [...stateHandlers.values()].filter((h) => h.scope === scope);
}
var symbolRankingHook;
function registerSymbolRanking(hook) {
  symbolRankingHook = hook;
  return () => {
    if (symbolRankingHook === hook) symbolRankingHook = void 0;
  };
}
function symbolRanking() {
  return symbolRankingHook;
}
var defaultEngines = /* @__PURE__ */ new Map();
function registerDefaultEngine(language, make) {
  defaultEngines.set(language, make);
  return () => {
    if (defaultEngines.get(language) === make) defaultEngines.delete(language);
  };
}
function unregisterDefaultEngine(language) {
  defaultEngines.delete(language);
}
function resolveEngines(overrides) {
  return { ...Object.fromEntries(defaultEngines), ...overrides };
}
var hostSettingsSections = [];
function registerSettingsSection(desc) {
  hostSettingsSections.push(desc);
  return () => {
    const i = hostSettingsSections.indexOf(desc);
    if (i >= 0) hostSettingsSections.splice(i, 1);
  };
}
function registeredSettingsSections() {
  return hostSettingsSections;
}
var settingsTemplateMenu = null;
function registerSettingsTemplateMenu(desc) {
  settingsTemplateMenu = desc;
  return () => {
    if (settingsTemplateMenu === desc) settingsTemplateMenu = null;
  };
}
function unregisterSettingsTemplateMenu() {
  settingsTemplateMenu = null;
}
function settingsTemplateMenuProviderFor(context) {
  return () => {
    const desc = settingsTemplateMenu;
    if (!desc) return null;
    return {
      items: () => desc.items(context()),
      run: (itemId, anchor) => desc.run(itemId, context(), anchor)
    };
  };
}

// src/widget/context-menu-model.ts
var SETTINGS_SECTION = {
  body: "Canvas",
  "price-axis": "Scales and lines",
  "time-axis": "Scales and lines"
};
function settingsItem(zone, label, icon) {
  return { id: `settings:${SETTINGS_SECTION[zone]}`, label, ...icon ? { icon } : {}, separatorBefore: true };
}
function settingsSectionOf(id) {
  return id.slice("settings:".length) || void 0;
}
var SCALE_CHOICES = [
  ["regular", "Regular"],
  ["percent", "Percent"],
  ["indexed", "Indexed to 100"],
  ["log", "Logarithmic"]
];
function paneScaleAt(panes, y) {
  return panes.find((p) => y >= p.top && y < p.top + p.height) ?? panes[0] ?? null;
}
function scaleChoiceOf(scale) {
  if (scale.log) return "log";
  if (scale.mode === "percent") return "percent";
  if (scale.mode === "indexed") return "indexed";
  return "regular";
}
function mainScale(pane) {
  return pane === null || pane.kind === "price";
}
function scaleWrites(choice, pane) {
  const mode = choice === "percent" ? "percent" : choice === "indexed" ? "indexed" : "price";
  const log = choice === "log";
  if (mainScale(pane)) {
    return [
      ["scaleMode", mode],
      ["logScale", log]
    ];
  }
  return [
    ["scaleMode", { pane: pane.id, mode }],
    ["logScale", { pane: pane.id, value: log }]
  ];
}
function priceOnlyState(pane, flag2) {
  return mainScale(pane) ? flag2 : void 0;
}
function invertWrite(next, pane) {
  return mainScale(pane) ? ["invertScale", next] : ["invertScale", { pane: pane.id, value: next }];
}
function priceAxisItems(s) {
  return [
    { id: "auto", label: "Auto (fits data to screen)", checked: s.auto },
    ...s.priceOnly === void 0 ? [] : [{ id: "price-only", label: "Scale price chart only", checked: s.priceOnly }],
    { id: "invert", label: "Invert scale", checked: s.invert },
    ...SCALE_CHOICES.map(([choice, label], i) => ({
      id: `scale:${choice}`,
      label,
      checked: s.choice === choice,
      separatorBefore: i === 0
    })),
    {
      id: "labels",
      label: "Labels",
      separatorBefore: true,
      submenu: [
        { id: "toggle:axisLabels", label: "Price axis labels", checked: s.axisLabels },
        { id: "toggle:priceLabel", label: "Last price label", checked: s.priceLabel },
        { id: "toggle:countdown", label: "Countdown to bar close", checked: s.countdown }
      ]
    },
    {
      id: "levels",
      label: "Levels",
      submenu: [{ id: "toggle:currentPriceLine", label: "Last Price Line", checked: s.priceLine }]
    },
    settingsItem("price-axis", "More settings\u2026")
  ];
}
function timeAxisItems(timezone) {
  return [
    {
      id: "timezone",
      label: "Time zone",
      submenu: timezoneMenuRows(timezone).map((r) => ({ id: `tz:${r.value}`, label: r.label, checked: r.checked }))
    },
    settingsItem("time-axis", "More settings\u2026")
  ];
}
function bodyItems(s) {
  const hint = (id) => s.hints?.[id] ? { hint: s.hints[id] } : {};
  const count = (n, one) => n > 0 ? `Remove ${n} ${one}${n === 1 ? "" : "s"}` : `Remove ${one}s`;
  return [
    { id: "reset-view", label: "Reset chart view", icon: "reset", ...hint("reset-view") },
    { id: "copy-price", label: s.price ? `Copy price ${s.price}` : "Copy price", icon: "copy", disabled: !s.price, separatorBefore: true },
    { id: "paste", label: "Paste", icon: "paste", disabled: !s.canPaste, ...hint("paste") },
    { id: "lock-cursor", label: "Lock vertical cursor line by time", icon: "cursor-line", checked: Boolean(s.cursorLocked), separatorBefore: true },
    { id: "table-view", label: "Table view", icon: "table", separatorBefore: true },
    ...s.objectTree ? [{ id: "object-tree", label: "Object tree", icon: "objects" }] : [],
    { id: "remove-drawings", label: count(s.drawings, "drawing"), icon: "eraser", disabled: s.drawings === 0, separatorBefore: true },
    { id: "remove-indicators", label: count(s.indicators, "indicator"), icon: "trash", disabled: s.indicators === 0 },
    settingsItem("body", "Settings\u2026", "gear")
  ];
}
var BODY_GROUPS = {
  "reset-view": "view",
  "copy-price": "clipboard",
  paste: "clipboard",
  "lock-cursor": "cursor",
  "table-view": "objects",
  "object-tree": "objects",
  "remove-drawings": "remove",
  "remove-indicators": "remove"
};
var CONTEXT_MENU_BUILTIN_ORDER = {
  body: {
    "reset-view": -30,
    "copy-price": -29,
    paste: -28,
    // -27..-26: the host's alert and order rows (`group: 'trade'`)
    "lock-cursor": -25,
    "table-view": -24,
    "object-tree": -23,
    // -22..-21: the host's object rows, e.g. chart templates (`group: 'objects'`)
    "remove-drawings": -20,
    "remove-indicators": -10,
    settings: 1e3
  },
  "price-axis": {
    auto: -80,
    "price-only": -75,
    invert: -70,
    "scale:regular": -60,
    "scale:percent": -50,
    "scale:indexed": -40,
    "scale:log": -30,
    labels: -20,
    levels: -10,
    settings: 1e3
  },
  "time-axis": { timezone: -10, settings: 1e3 }
};
function composeMenu(zone, builtin, contributed) {
  const ranks = CONTEXT_MENU_BUILTIN_ORDER[zone];
  const named = zone === "body" ? BODY_GROUPS : {};
  const rows = [];
  let run = 0;
  const replaced = new Set(contributed.map((c) => c.replaces).filter((id) => Boolean(id)));
  for (const item of builtin) {
    if (replaced.has(item.id)) {
      if (item.separatorBefore) run += 1;
      continue;
    }
    if (item.separatorBefore) run += 1;
    rows.push({ item, rank: ranks[item.id.startsWith("settings") ? "settings" : item.id] ?? 0, group: named[item.id] ?? `#${run}` });
  }
  for (const { item, order, group } of contributed) rows.push({ item, rank: order ?? 0, group: group ?? "~contributed" });
  rows.sort((a, b) => a.rank - b.rank);
  return rows.map(({ item, group: g }, i) => ({ ...item, separatorBefore: i > 0 && rows[i - 1].group !== g }));
}

// src/widget/side-panel.ts
var STYLE_ID = "vela-widget-sidepanel";
var DEFAULT_PANEL_WIDTH = 280;
var DEFAULT_PANEL_MIN_WIDTH = 200;
var DEFAULT_PANEL_MAX_WIDTH = 640;
var CSS = `
.vela-panel[hidden] { display: none !important; }
.vela-panel {
    position: relative;
    width: var(--vela-panel-w, ${DEFAULT_PANEL_WIDTH}px);
    flex: none;
    border-left: 1px solid var(--vela-border);
    display: flex;
    flex-direction: column;
    color: var(--vela-fg);
    font-size: 13px;
    box-sizing: border-box;
    background: var(--vela-bg);
}
.vela-panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 8px 10px 14px;
    border-bottom: 1px solid var(--vela-border);
    font-size: 14px;
    font-weight: 600;
    color: var(--vela-fg-bright);
}
.vela-panel-title { flex: none; }
.vela-panel-title:empty { display: none; }
/* The contributed slot claims the space between title and close; its children lay out
   inline and the close button stays pinned right. */
.vela-panel-header-slot { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 6px; }
.vela-panel-close {
    all: unset;
    cursor: pointer;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--vela-fg-muted);
    font-size: 16px;
}
.vela-panel-close .vela-icon { width: 16px; height: 16px; }
.vela-panel-close:hover { background: var(--vela-hover); color: var(--vela-fg-bright); }
/* The pin: same footprint as the close button it sits beside; filled + bright once pinned. */
.vela-panel-pin {
    all: unset;
    cursor: pointer;
    width: 26px;
    height: 26px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--vela-fg-muted);
}
.vela-panel-pin .vela-icon { width: 15px; height: 15px; }
.vela-panel-pin:hover { background: var(--vela-hover); color: var(--vela-fg-bright); }
.vela-panel-pin[data-on='1'] { color: var(--vela-fg-bright); }
.vela-panel-max {
    all: unset;
    cursor: pointer;
    width: 26px;
    height: 26px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--vela-fg-muted);
}
.vela-panel-max .vela-icon { width: 15px; height: 15px; }
.vela-panel-max:hover { background: var(--vela-hover); color: var(--vela-fg-bright); }
/* MAXIMIZED: the panel covers the whole dock host \u2014 every chart of the shell \u2014 whatever
   its placement; the width handle and the pin have nothing to do meanwhile. */
.vela-panel[data-maximized] {
    position: absolute;
    inset: 0;
    width: auto;
    max-width: none;
    z-index: 26;
    border-left: none;
}
.vela-panel[data-maximized] .vela-panel-resizer,
.vela-panel[data-maximized] .vela-panel-pin { display: none; }
.vela-panel-body { flex: 1; overflow: auto; padding: 8px; }
.vela-panel-body::-webkit-scrollbar { width: 8px; }
.vela-panel-body::-webkit-scrollbar-thumb { background: var(--vela-scroll); border-radius: 4px; border: 2px solid transparent; background-clip: padding-box; }
/* Straddles the panel's inner border so the whole seam is grabbable; it paints only under the
   pointer \u2014 a permanently visible bar would read as a second border. */
.vela-panel-resizer {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -3px;
    width: 7px;
    cursor: col-resize;
    touch-action: none;
    z-index: 1;
}
.vela-panel-resizer::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 3px;
    width: 1px;
    background: transparent;
}
/* The same hover ink as the workspace grid splitters and the canvas pane separators, so
   every draggable seam in the shell reads as one family. */
.vela-panel-resizer:hover::after,
.vela-panel-resizer[data-dragging]::after { background: var(--vela-separator-hover-line); }
/* An OVERLAY panel floats over the chart's right edge instead of taking a column: the
   chart keeps its width and layout (the dock host is position:relative \u2014 the anchoring the
   mobile rule below relies on too). Same z-order as that mobile overlay, above the chart's
   own DOM overlays; the shadow separates it from the plot it covers. */
.vela-panel[data-overlay] {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    max-width: 100%;
    z-index: 25;
    box-shadow: var(--vela-shadow);
}
/* Mobile: a 280px column would crush a phone-width chart \u2014 the panel overlays the
   chart area instead (its flex parent is position:relative), full-bleed, closed by
   the same header \u2715. Width dragging is a pointer affordance; off on mobile. */
[data-layout='mobile'] .vela-panel {
    position: absolute;
    inset: 0;
    width: auto;
    z-index: 25;
    border-left: none;
}
[data-layout='mobile'] .vela-panel-resizer { display: none; }
[data-layout='mobile'] .vela-panel-max { display: none; }
`;
function clampPanelWidth(px, min = DEFAULT_PANEL_MIN_WIDTH, max = DEFAULT_PANEL_MAX_WIDTH) {
  const lo = Number.isFinite(min) && min > 0 ? min : DEFAULT_PANEL_MIN_WIDTH;
  const hi = Number.isFinite(max) ? Math.max(max, lo) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(px)) return lo;
  return Math.round(Math.min(Math.max(px, lo), hi));
}
var SidePanel = class {
  /** `modifier` is the panel's own class, carrying its content styles (e.g. `vela-ot`). */
  constructor(host, title, modifier, opts = {}) {
    /**
     * Notified whenever the panel opens or closes, by ANY path — a topbar toggle, the header ✕,
     * or another panel taking the dock. The owning shell reflects it on its chrome, so a button's
     * pressed state can never drift from the panel it controls.
     */
    this.onOpenChange = null;
    /** Notified when the USER settles a new width (drag release, or double-click reset) — never on
     *  a programmatic {@link setWidth}, so restoring a persisted width raises no change. */
    this.onWidthChange = null;
    /** Notified when the USER pins or unpins a floating panel (`overlay` is the NEW placement) —
     *  never on a programmatic {@link setOverlay}, for the same reason as widths. */
    this.onPlacementChange = null;
    this.pin = null;
    this.maxButton = null;
    this.maximizedOn = false;
    /** Set while the close is announced, so a listener's own close does not re-enter. */
    this.closing = false;
    /** Open as far as the dock and the host are concerned — a closed panel can still be on
     *  screen while its exit animation runs. */
    this.isOpen = false;
    /** The exit animation of a close; a reopen cancels it. */
    this.exit = null;
    const doc = host.ownerDocument;
    injectStyles(STYLE_ID, CSS, doc);
    this.minWidth = opts.resizable ? opts.minWidth ?? DEFAULT_PANEL_MIN_WIDTH : 1;
    this.maxWidth = opts.resizable ? opts.maxWidth ?? DEFAULT_PANEL_MAX_WIDTH : Number.POSITIVE_INFINITY;
    this.declaredWidth = clampPanelWidth(opts.width ?? DEFAULT_PANEL_WIDTH, this.minWidth, this.maxWidth);
    this.widthPx = this.declaredWidth;
    this.el = doc.createElement("div");
    this.el.className = `vela-panel ${modifier}`;
    this.el.hidden = true;
    this.floatable = opts.overlay === true;
    this.overlayOn = this.floatable;
    if (this.overlayOn) this.el.dataset.overlay = "1";
    this.el.style.setProperty("--vela-panel-w", `${this.widthPx}px`);
    const header = doc.createElement("div");
    header.className = "vela-panel-header";
    this.heading = doc.createElement("span");
    this.heading.className = "vela-panel-title";
    this.heading.textContent = vt(title);
    this.slot = doc.createElement("div");
    this.slot.className = "vela-panel-header-slot";
    const close = doc.createElement("button");
    close.className = "vela-panel-close";
    close.appendChild(iconEl("close", doc));
    close.title = vt("Close");
    close.addEventListener("click", () => this.toggle(false));
    if (this.floatable) {
      this.pin = doc.createElement("button");
      this.pin.className = "vela-panel-pin";
      this.pin.addEventListener("click", () => {
        this.setOverlay(!this.overlayOn);
        this.onPlacementChange?.(this.overlayOn);
      });
      this.refreshPin();
    }
    if (opts.maximizable) {
      this.maxButton = doc.createElement("button");
      this.maxButton.className = "vela-panel-max";
      this.maxButton.addEventListener("click", () => this.setMaximized(!this.maximizedOn));
      this.refreshMaxButton();
    }
    header.append(this.heading, this.slot, ...this.pin ? [this.pin] : [], ...this.maxButton ? [this.maxButton] : [], close);
    this.body = doc.createElement("div");
    this.body.className = "vela-panel-body";
    this.el.append(header, this.body);
    if (opts.resizable) this.mountResizer(doc);
    host.appendChild(this.el);
  }
  get open() {
    return this.isOpen;
  }
  /**
   * Open/close the panel — a bare call flips it. The panel reports closed at once, but a
   * close keeps it on screen, marked `data-closing`, while a host exit animation runs.
   * `instant` skips that, and also cuts short the exit of a panel already closing: a panel
   * handing the dock to another leaves at once.
   */
  toggle(open = !this.isOpen, instant = false) {
    if (open === this.isOpen) {
      if (!open && instant) this.exit?.finish();
      return;
    }
    if (!open && this.closing) return;
    if (!open) {
      this.closing = true;
      announceSurface(this.el, false, "panel");
      this.closing = false;
    }
    this.isOpen = open;
    if (open) {
      if (this.exit) {
        this.exit.cancel();
        this.exit = null;
        this.setMaximized(false);
      }
      this.el.hidden = false;
    } else {
      const hide = () => {
        this.exit = null;
        this.el.hidden = true;
        this.setMaximized(false);
      };
      if (instant) hide();
      else this.exit = holdForExit(this.el, hide);
    }
    this.onOpenChange?.(open);
    if (open && this.isOpen) announceSurface(this.el, true, "panel");
  }
  /** Whether the panel covers every chart right now. */
  get maximized() {
    return this.maximizedOn;
  }
  /** Maximize the panel over the shell's charts, or restore it. A no-op on a panel not
   *  declared `maximizable`. */
  setMaximized(maximized) {
    if (!this.maxButton || maximized === this.maximizedOn) return;
    this.maximizedOn = maximized;
    if (maximized) this.el.dataset.maximized = "1";
    else delete this.el.dataset.maximized;
    this.refreshMaxButton();
  }
  refreshMaxButton() {
    if (!this.maxButton) return;
    const doc = this.maxButton.ownerDocument;
    this.maxButton.replaceChildren(iconEl(this.maximizedOn ? "restore" : "maximize", doc));
    this.maxButton.title = this.maximizedOn ? vt("Restore") : vt("Maximize");
    this.maxButton.setAttribute("aria-label", vt(this.maxButton.title));
    this.maxButton.setAttribute("aria-pressed", this.maximizedOn ? "true" : "false");
  }
  /** The scrolling body, for a panel filled from OUTSIDE the class — a contributed panel's
   *  `mount` receives exactly this element. Subclasses use the protected `body`. */
  get content() {
    return this.body;
  }
  /** The header slot between the title and the close button — a contributed panel's
   *  `mount` receives it (via {@link SidePanelHeader}) to dock compact controls. */
  get headerSlot() {
    return this.slot;
  }
  /** Replace the header title. The topbar toggle keeps the DECLARED title as its
   *  tooltip — this only changes what the open column says about itself. */
  setTitle(title) {
    this.heading.textContent = vt(title);
  }
  /** Current width in px. */
  get width() {
    return this.widthPx;
  }
  /** Resize the panel (clamped). Silent — {@link onWidthChange} reports user drags only. */
  setWidth(px) {
    const next = clampPanelWidth(px, this.minWidth, this.maxWidth);
    if (next === this.widthPx) return;
    this.widthPx = next;
    this.el.style.setProperty("--vela-panel-w", `${next}px`);
  }
  /** Whether the panel floats over the chart right now (false for every docked panel). */
  get overlay() {
    return this.overlayOn;
  }
  /** Float or dock the panel. Only a panel declared `overlay` can float — on any other this is
   *  a no-op. Silent — {@link onPlacementChange} reports the user's pin clicks only. */
  setOverlay(overlay) {
    if (!this.floatable || overlay === this.overlayOn) return;
    this.overlayOn = overlay;
    if (overlay) this.el.dataset.overlay = "1";
    else delete this.el.dataset.overlay;
    this.refreshPin();
  }
  refreshPin() {
    if (!this.pin) return;
    const pinned = !this.overlayOn;
    const doc = this.pin.ownerDocument;
    this.pin.replaceChildren(iconEl(pinned ? "pin-filled" : "pin", doc));
    this.pin.dataset.on = pinned ? "1" : "0";
    this.pin.title = pinned ? vt("Unpin \u2014 float over the chart") : vt("Pin beside the chart");
    this.pin.setAttribute("aria-label", vt(this.pin.title));
    this.pin.setAttribute("aria-pressed", pinned ? "true" : "false");
  }
  destroy() {
    if (this.open) announceSurface(this.el, false, "panel");
    this.exit?.finish();
    this.el.remove();
  }
  /** The drag handle on the panel's inner (left) edge — the panel is docked right, so dragging
   *  AWAY from the edge widens it. Pointer capture keeps the drag alive over the chart canvas. */
  mountResizer(doc) {
    const handle = doc.createElement("div");
    handle.className = "vela-panel-resizer";
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    let startX = 0;
    let startWidth = 0;
    let dragging = false;
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      delete handle.dataset.dragging;
      handle.releasePointerCapture(e.pointerId);
      if (this.widthPx !== startWidth) this.onWidthChange?.(this.widthPx);
    };
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startWidth = this.widthPx;
      handle.dataset.dragging = "1";
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      this.setWidth(startWidth + (startX - e.clientX));
      e.preventDefault();
    });
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    handle.addEventListener("dblclick", () => {
      const before = this.widthPx;
      this.setWidth(this.declaredWidth);
      if (this.widthPx !== before) this.onWidthChange?.(this.widthPx);
    });
    this.el.appendChild(handle);
  }
};

// src/widget/interval-sections.ts
var BUILTIN_INTERVAL_ORDER = { seconds: 10, minutes: 20, hours: 30, days: 40 };
var registry4 = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
function emit() {
  for (const l of [...listeners]) l();
}
function registerIntervalSection(section) {
  registry4.set(section.id, section);
  emit();
  return () => {
    if (registry4.get(section.id) === section) {
      registry4.delete(section.id);
      emit();
    }
  };
}
function unregisterIntervalSection(id) {
  if (registry4.delete(id)) emit();
}
function intervalSections(ctx) {
  const list = [...registry4.values()].sort((a, b) => a.order - b.order);
  return ctx ? list.filter((s) => !s.when || s.when(ctx)) : list;
}
function activeIntervalSection(ctx) {
  for (const section of intervalSections(ctx)) {
    const value = section.current(ctx);
    if (value !== null) return { section, value };
  }
  return null;
}
function sectionFavorite(id, value) {
  return `@${id}:${value}`;
}
function parseSectionFavorite(key) {
  if (!key.startsWith("@")) return null;
  const i = key.lastIndexOf(":");
  if (i < 2) return null;
  const section = registry4.get(key.slice(1, i));
  const value = Number(key.slice(i + 1));
  return section && Number.isFinite(value) && value > 0 ? { section, value } : null;
}
function notifyIntervalSectionsChanged() {
  emit();
}
function onIntervalSectionsChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export { ALERT_STUB_PX, ALONG_LINE_TEXT_TYPES, AnchoredVwap, ArrowMark, ArrowMarker, BUILTIN_INTERVAL_ORDER, BarsPattern, Box, CALLOUT_MARGIN, CALLOUT_RADIUS, CONTEXT_MENU_BUILTIN_ORDER, Callout, CalloutBase, Circle, Comment, CrossLine, DEDEKIND_CURVATURE_OPTIONS, DEFAULT_DRAWING_COLOR, DEFAULT_PANEL_MAX_WIDTH, DEFAULT_PANEL_MIN_WIDTH, DEFAULT_PANEL_ORDER, DEFAULT_PANEL_WIDTH, DIRECTION_OPTIONS, DRAWING_TITLE_MAX, DatePriceRange, DateRange, DedekindTessellation, Drawing, EMOJI_GROUPS, Ellipse, EmojiDrawing, FA_GLYPHS, FibArcs, FibChannel, FibExtensionTrend, FibLevels, FibRatios, FibRetracement, FibSpeedFan, FibSpiral, FibTimeZones, FibVerticalLevels, FibWedge, FixedRangeTpoProfile, FixedRangeVolumeProfile, FlagMark, Forecast, Freehand, GANN_SQUARE_ARCS, GLYPH_OPTIONS, GannBox, GannFan, GannSquare, GannSquareFixed, GhostFeed, GlyphStamp, HIGHLIGHTER_WIDTHS, Highlighter, ICON_GROUPS, IMAGE_MAX_BYTES, IMAGE_MAX_SIDE, IMAGE_TYPES, INTERVAL_UNITS, IconDrawing, ImageDrawing, LINE_STYLE_OPTIONS, MACH_NUMBER_OPTIONS, MACH_WAVE_COUNT_OPTIONS, MAGNIFIER_TIMEFRAME_OPTIONS, MachFigure, Magnifier, MeasureBox, NOTE_PIN, Note, OVERRIDABLE_TOPBAR_IDS, PITCHFORK_STYLES, ParallelChannel, Path, PatternDrawing, Pitchfan, PitchforkBase, PositionTool, PriceAlert, PriceLabel, PriceNote, PriceRange, Projection, REGRESSION_SOURCES, RadialFib, RegressionChannel, RotatedRect, SIGNPOST_R, STAMP_SIZE_OPTIONS, STATS_PARTS, SVG_ICON_FRAME, SegmentDrawing, SidePanel, Signpost, SvgIcon, TEXT_PX_SIZES, TEXT_SIZE_OPTIONS, TIMEZONES, TOPBAR_BUILTIN_IDS, TOPBAR_DEFAULT_LEFT, TOPBAR_DEFAULT_RIGHT, TV_BARS_PATTERN_MODES, TV_BARS_PATTERN_MODE_LABEL, TV_ELLIOTT_DEFAULT_DEGREE, TV_ELLIOTT_DEGREES, TV_FIB_FONT_SIZES, TV_FORECAST, TV_GANN_ANGLES, TV_GHOST, TV_GREY, TV_LINE_COLOR, TV_NOTE_PIN, TV_PATTERN_TEXT, TV_PROJECTION, TV_SIGNPOST, TV_SPEED_FAN_GRID, TV_TABLE, TableDrawing, TextLabel, TrendAngle, TrendFibTime, TrendFigure, TrendLine, TrianglePattern, XPOST_POSITION, XPOST_W, XPostDrawing, activeIntervalSection, anyStats, applyChromeTokens, arrowMarkerStroke, attachChromeTooltip, bodyItems, buildVpvrProfile, chartType, chartTypes, checkImageFile, chromeHint, clampPanelWidth, classicCatalog, classicPlots, compactIntervals, composeMenu, createDrawing, defaultRange, deserializeDrawing, drawingTitle, drawingTypes, extendRay, foldBaseModulation, getDrawingType, getNativeIndicator, inputDeltas, inputMenuFor, inputVisible, intervalSections, invertWrite, isExchangeTimezone, isLineLikeSeries, legendActions, legendActionsProviderFor, legendCallouts, legendCalloutsProviderFor, lineSegmentIntersection, lineStatsRows, magnifierTimeframeLabel, mobilePlacement, nativeIndicatorDescriptors, nativeIndicatorTypes, nativeInstanceCap, nativeInstanceChannel, normalizeSettingsRow, normalizeTimezone, notifyIntervalSectionsChanged, onIntervalSectionsChanged, opaqueColor, paneScaleAt, parseSectionFavorite, pinnedTopbarActionIds, plotRightInset, priceAxisItems, priceOnlyState, rangeInfoLines, readAnchor, registerChartType, registerClassicIndicators, registerDefaultEngine, registerDrawingType, registerInputMenu, registerIntervalSection, registerLegendAction, registerLegendCallout, registerNativeIndicator, registerPlotRightInset, registerRendererDefaults, registerRendererLayer, registerSettingsSection, registerSettingsTemplateMenu, registerSidePanel, registerStatePersistence, registerSymbolRanking, registerVolume, registerVpvr, registerWidgetAction, registerWidgetAttachment, registeredSettingsSections, rendererDefaults, rendererLayers, replacesSeries, resetDrawingSettings, resolveAnchors, resolveEngines, resolveTimezone, resolveTopbarComposition, safeRelayPath, scaleChoiceOf, scaleWrites, sectionFavorite, seriesInScale, seriesShownOn, setNativeInstanceCap, setTableActiveCell, setTableTextMeasure, settingsRowValueKeys, settingsRowVisible, settingsSectionOf, settingsTemplateMenuProviderFor, shownOnBarMs, sidePanels, stableSeriesId, statePersistenceHandlers, statsOf, symbolRanking, tableActiveCell, textPx, tickerModifierIds, timeAxisItems, timeframeToMs, timezoneMenuRows, toXPostCard, topbarActionOverride, topbarHas, tpoLetter, translateInBars, tvElliottLabel, tzButtonLabel, tzMenuLabel, tzOffset, unregisterChartType, unregisterDefaultEngine, unregisterIntervalSection, unregisterLegendAction, unregisterLegendCallout, unregisterNativeIndicator, unregisterRendererDefaults, unregisterRendererLayer, unregisterSettingsTemplateMenu, unregisterSidePanel, unregisterStatePersistence, unregisterWidgetAction, unregisterWidgetAttachment, widgetActions, widgetAttachments, writeAnchor };
