import type { DrawingPoint, FreeAxis, Projector } from './geometry';
import type { DrawingStyle, DrawingText } from './style';
import { defaultStyle, defaultText, TV_LINE_COLOR } from './style';
import { ALONG_LINE_TEXT_TYPES } from './schema';
import type { SettingsSchema } from './schema';
import { compactIntervals, type IntervalVisibility } from './intervals';
import { readAnchor, writeAnchor, type BarAxis } from './futureAnchors';
import type { VelaTheme } from '../options';
import type { InputSchema, InputValue } from '../model/inputs';

/**
 * An indicator-style settings dialog for a drawing ({@link Drawing.inputsDialog}): the renderer opens its indicator
 * inputs dialog (tabs, groups, inline rows, `when` gates, phone sheet) on these inputs, and every edit lands on the
 * drawing as the settings patch `{ '<path>.<key>': value }`.
 */

/** TradingView's factory text per tool (read with "Apply defaults" in TradingView, 2026-10-30): size in px, its blue,
 *  and where it sits. A tool's first text starts from this. */
export const TV_TEXT_DEFAULTS: Readonly<Record<string, Partial<DrawingText>>> = {
    trendline: { color: TV_LINE_COLOR, size: 14, hAlign: 'center', vAlign: 'top' },
    ray: { color: TV_LINE_COLOR, size: 14, hAlign: 'center', vAlign: 'top' },
    infoline: { color: TV_LINE_COLOR, size: 14, hAlign: 'center', vAlign: 'top' },
    hline: { color: TV_LINE_COLOR, size: 12, hAlign: 'center', vAlign: 'center' },
    hray: { color: TV_LINE_COLOR, size: 12, hAlign: 'center', vAlign: 'bottom' },
    parallelchannel: { color: TV_LINE_COLOR, size: 14, hAlign: 'left', vAlign: 'top' },
    vline: { color: TV_LINE_COLOR, size: 14, hAlign: 'center', vAlign: 'center' },
    pricerange: { color: TV_LINE_COLOR, size: 12 },
    datepricerange: { color: TV_LINE_COLOR, size: 12 },
    daterange: { color: TV_LINE_COLOR, size: 12 },
    arrowmarker: { color: '#1e53e5', size: 16, bold: true }, // palette-exempt: TradingView's blue 600
    arrowmarkup: { color: '#089981', size: 14 }, // palette-exempt: TradingView's minty green 500
    arrowmarkdown: { color: '#cc2f3c', size: 14 }, // palette-exempt: TradingView's ripe red 600
};

export interface DrawingInputsDialog {
    title: string;
    inputs: InputSchema[];
    values: Record<string, InputValue>;
    /** Settings path the values live under on the drawing, e.g. `'of'` for `drawing.of.<key>`. */
    path: string;
}

/** An extra button on a drawing's floating toolbar ({@link Drawing.toolbarActions}). */
export interface DrawingToolbarAction {
    id: string;
    /** Tooltip / accessible name. */
    label: string;
    /** Inline SVG markup. */
    icon: string;
    /** Run on press; `anchor` is the button (a menu opens from it). */
    run(anchor: HTMLElement): void;
}

/**
 * The interactive user-drawing types. The lean-core set ships first; new types
 * (fibs/patterns) extend the union + register a class — no base/port change.
 */
export type DrawingTypeKey =
    | 'trendline'
    | 'hline'
    | 'ray'
    | 'extendedline'
    | 'vline'
    | 'hray'
    | 'crossline'
    | 'infoline'
    | 'trendangle'
    | 'box'
    | 'text'
    | 'note'
    | 'pricenote'
    | 'comment'
    | 'pricelabel'
    | 'signpost'
    | 'parallelchannel'
    | 'disjointchannel'
    | 'flattopbottom'
    | 'regressionchannel'
    | 'anchoredvwap'
    | 'fixedrangevp'
    | 'anchoredvp'
    | 'projection'
    | 'forecast'
    | 'barspattern'
    | 'ghostfeed'
    | 'anchoredtext'
    | 'anchorednote'
    | 'table'
    | 'image'
    | 'xpost'
    | 'doublecurve'
    | 'fixedrangetpo'
    | 'pricealert'
    | 'pitchfork'
    | 'pitchfan'
    | 'schiffpitchfork'
    | 'modifiedschiffpitchfork'
    | 'insidepitchfork'
    | 'arrow'
    | 'callout'
    | 'ellipse'
    | 'triangle'
    | 'polyline'
    | 'freehand'
    | 'highlighter'
    | 'emoji'
    | 'icon'
    | 'circle'
    | 'rotatedrect'
    | 'path'
    | 'arc'
    | 'curve'
    | 'arrowmarkup'
    | 'arrowmarkdown'
    | 'flagmark'
    | 'iconstamp'
    | 'fibretracement'
    | 'fibextension'
    | 'fibextensiontrend'
    | 'fibfan'
    | 'fibtimezones'
    | 'fibchannel'
    | 'fibspeedfan'
    | 'trendfibtime'
    | 'fibcircles'
    | 'fibarcs'
    | 'fibwedge'
    | 'fibspiral'
    | 'gannfan'
    | 'gannbox'
    | 'gannsquare'
    | 'gannsquarefixed'
    | 'dedekind'
    | 'sonic'
    | 'supersonic'
    | 'goldensonic'
    | 'goldensupersonic'
    | 'datepricerange'
    | 'daterange'
    | 'pricerange'
    | 'cycliclines'
    | 'timecycles'
    | 'sineline'
    | 'arrowmarker'
    | 'trianglepattern'
    | 'elliotttriangle'
    | 'elliottdoublecombo'
    | 'elliotttriplecombo'
    | 'position'
    | 'long-position'
    | 'short-position'
    | 'magnifier'
    | 'xabcd'
    | 'abcd'
    | 'elliottimpulse'
    | 'elliottcorrection'
    | 'headshoulders'
    | 'gartley'
    | 'bat'
    | 'butterfly'
    | 'crab'
    | 'shark'
    | 'cypher';

/** One anchor's role + which axes its handle may move along. */
export interface AnchorSlot {
    role: string;
    free: FreeAxis;
}

/** The longest name a drawing keeps. */
export const DRAWING_TITLE_MAX = 100;

/** A drawing's name as saved: trimmed text, at most {@link DRAWING_TITLE_MAX} characters; empty or not text = none. */
export function drawingTitle(v: unknown): string | undefined {
    if (typeof v !== 'string') return undefined;
    const t = v.trim().slice(0, DRAWING_TITLE_MAX);
    return t || undefined;
}

/**
 * The plain-JSON shape of one drawing — the ONLY representation that crosses the
 * renderer port and the persistence boundary. A {@link Drawing} (rich behavior)
 * serializes to/from this; the renderer never sees a class instance.
 */
export interface SerializedDrawing {
    id: string;
    type: DrawingTypeKey;
    paneId: string;
    /** time+price anchors — the single source of geometry truth. */
    anchors: DrawingPoint[];
    style: DrawingStyle;
    text?: DrawingText;
    locked: boolean;
    visible: boolean;
    /** Draw-order key. On a renderer with `drawingDepth` it shares ONE space with the pane's
     *  series — the candles and each indicator carry z keys of their own — so a drawing can sit
     *  anywhere in the stack, under the candles or between two indicators included. */
    zIndex: number;
    createdAt: number;
    /** Timeframes the drawing shows on (the settings dialog's Visibility tab); absent = every timeframe. */
    intervals?: IntervalVisibility;
    /** The user's name for the drawing (TradingView's rename, the pencil in the settings dialog); absent = the tool's name. */
    title?: string;
    /** Per-type extras (e.g. box `extend`) — keeps the base closed. */
    props?: Record<string, unknown>;
}

/**
 * The parent of every user drawing. Owns the shared state + settings/serialization
 * (the "everything inherits from a parent object" intent), and declares the
 * geometry behaviors as PURE functions of `(anchors, Projector)` so the whole
 * hierarchy stays renderer-neutral and serializable.
 */
export abstract class Drawing {
    readonly id: string;
    abstract readonly type: DrawingTypeKey;

    paneId: string;
    /** DATA-space anchors (time+price). The only geometry the model stores. */
    anchors: DrawingPoint[];
    style: DrawingStyle;
    text?: DrawingText;
    locked = false;
    visible = true;
    /** Timeframes the drawing shows on; undefined = all. See `intervals.ts`. */
    intervals?: IntervalVisibility;
    /** The user's name for it; undefined = the tool's own name. */
    title?: string;
    zIndex = 0;
    readonly createdAt: number;
    /** The bar axis of the chart showing this drawing (null on a time chart); see `futureAnchors`. Not saved. */
    barAxis: BarAxis | null = null;

    // Public so the registry can construct concrete subclasses; `abstract` still
    // prevents `new Drawing()` directly.
    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        this.id = init.id ?? `dw-${(Drawing.seq += 1)}`;
        this.paneId = init.paneId;
        this.anchors = (init.anchors ?? []).map(readAnchor);
        this.style = init.style ? { ...init.style } : defaultStyle();
        this.text = init.text ? { ...init.text } : undefined;
        this.locked = init.locked ?? false;
        this.visible = init.visible ?? true;
        this.intervals = compactIntervals(init.intervals);
        this.title = drawingTitle(init.title);
        this.zIndex = init.zIndex ?? 0;
        this.createdAt = init.createdAt ?? Date.now();
        if (init.props) this.readProps(init.props);
    }

    /** Fallback id counter — used only when no id is supplied (store assigns real ids). */
    private static seq = 0;

    // ── anchor schema: how many points, which axes are free ──
    abstract anchorSchema(): { min: number; max: number; slots: AnchorSlot[] };
    /** True once enough anchors exist to be a real shape. */
    isComplete(): boolean {
        return this.anchors.length >= this.anchorSchema().min;
    }

    /**
     * How the tool is placed: `'click'` (click each anchor; a variable-count tool —
     * `max > min` — keeps adding until a finish gesture), `'drag'` (press at the first
     * corner, drag, release at the second — the press-drag-release idiom for boxes/ranges/positions),
     * or `'freehand'` (press, drag to capture a path, release). Drives the state machine.
     */
    placementMode(): 'click' | 'drag' | 'freehand' {
        return 'click';
    }

    /**
     * Hook run once after interactive placement finishes, before the `create` intent —
     * lets a type finalize its anchors against the live projector (e.g. a position deriving
     * its stop/target/width in pixel space so a bare click drops a default-sized box).
     * Default: no-op.
     */
    onPlaced(_proj: Projector): void {
        /* base keeps its placed anchors as-is */
    }

    /**
     * After a single handle (anchor `index`) is dragged, re-impose any cross-anchor invariant —
     * e.g. a position keeps its stop and target on opposite sides of the entry, flipping the
     * non-dragged side across the entry when a drag would put them on the same side. Default: no-op.
     */
    constrainHandleDrag(_index: number): void {
        /* base anchors move independently */
    }

    /**
     * Apply a whole-body drag — translate the original anchors by (dt, dp) in data space.
     * Default moves every anchor together; a type can pin some (e.g. a callout keeps its
     * pointer tip fixed and moves only the box).
     */
    translateBody(dt: number, dp: number, orig: DrawingPoint[]): DrawingPoint[] {
        return orig.map((o) => ({ time: o.time + dt, price: o.price + dp }));
    }

    /**
     * A handle drag in screen pixels, for a type whose geometry is partly in pixels (an image's size). Return true
     * when handled: the interaction then skips the anchor move. Default: not handled.
     */
    dragHandlePx(_index: number, _x: number, _y: number, _proj: Projector, _start?: { x: number; y: number; doc: SerializedDrawing }): boolean {
        return false;
    }

    /** The CSS cursor over handle `index` (e.g. a resize arrow), or null for the default pointer. */
    /** Each handle's look: TradingView draws most as rings, some (horizontal line) as rounded squares. Empty = rings. */
    handleShapes(): ReadonlyArray<'circle' | 'square'> {
        return [];
    }

    /** The points TradingView marks on the axes while the drawing is selected (a price chip and a time chip each, the
     *  shaded spans between them): its anchors by default; a channel marks its four corners. */
    axisPoints(): DrawingPoint[] {
        return this.anchors;
    }

    handleCursor(_index: number, _proj?: Projector): string | null {
        return null;
    }

    /**
     * A whole-body drag in screen pixels from the press point, for a type whose anchors are not all price/time (a post
     * card's height on the pane). Return the moved anchors, or null to use {@link translateBody}. Default: null.
     */
    translateBodyPx(_dx: number, _dy: number, _orig: DrawingPoint[], _proj: Projector): DrawingPoint[] | null {
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
    paintSelf(_ctx: CanvasRenderingContext2D, _proj: Projector, _theme: VelaTheme): boolean {
        return false;
    }

    /**
     * Settings shown in the renderer's INDICATOR inputs dialog instead of the drawing settings dialog: for a
     * host-registered type whose settings are an indicator's inputs. Null (default) keeps the drawing dialog.
     */
    inputsDialog(): DrawingInputsDialog | null {
        return null;
    }

    /** Extra buttons on the drawing's floating toolbar (e.g. a host's Templates menu). Default none. */
    toolbarActions(): DrawingToolbarAction[] {
        return [];
    }

    /**
     * What the renderer paints while the tool is being placed: `'shape'` (the drawing itself, faded) or
     * `'timespan'` (only a dashed guide at each time anchor, like the built-in fixed-range profiles: a data-driven
     * body must not fetch on every cursor move). Default `'shape'`.
     */
    placementPreview(): 'shape' | 'timespan' {
        return 'shape';
    }

    // ── geometry behaviors: PURE functions of (anchors, projector) ──
    /** Is the pixel (px,py) on this drawing's body, within `tol` px? */
    abstract hitTest(px: number, py: number, proj: Projector, tol: number): boolean;
    /** Index of the grabbed handle, or -1 for the body. */
    abstract hitHandle(px: number, py: number, proj: Projector, tol: number): number;
    /** Pixel positions of the draggable handles (for painting + hit-test). */
    abstract handlePoints(proj: Projector): Array<[number, number]>;
    /** Tight pixel bounds (selection box), or null when unresolvable. */
    abstract bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null;
    /** Visible price span on its pane. Reserved for a future per-drawing autoscale opt-in. */
    abstract priceRange(): { min: number; max: number } | null;

    /**
     * Time span (epoch ms) the drawing occupies, for visible-range culling. Default
     * is the anchor extent; a full-width drawing (e.g. a horizontal line) overrides
     * to `null` meaning "all time" so it never culls.
     */
    timeExtent(): { min: number; max: number } | null {
        if (this.anchors.length === 0) return null;
        let lo = Infinity;
        let hi = -Infinity;
        for (const a of this.anchors) {
            if (a.time < lo) lo = a.time;
            if (a.time > hi) hi = a.time;
        }
        return { min: lo, max: hi };
    }

    // ── settings (data-driven) ──
    abstract schema(): SettingsSchema;

    /**
     * Editable per-level config for a rich "gear" settings panel (Fibonacci levels):
     * each entry's `color` / `enabled` / `label` is mutated via a `levels.<i>.<field>`
     * settings path. Simple drawings return null (no gear).
     */
    editableLevels(): Array<{ ratio: number; color: string; enabled: boolean; label?: string }> | null {
        return null;
    }

    /** A handle that is grabbed but not drawn (TradingView's text shows no point). */
    handleHidden(_index: number): boolean {
        return false;
    }

    /** A variable click tool that ends when the next click lands on its last point (TradingView's path). */
    finishesOnSamePoint(): boolean {
        return false;
    }

    /** TradingView's text for this tool (color, size, alignment), used when text is first added. */
    textDefaults(): Partial<DrawingText> | undefined {
        return TV_TEXT_DEFAULTS[this.type];
    }

    /** Apply a `{ 'dot.path': value }` patch (the popup emits these). */
    applySettings(patch: Record<string, unknown>): void {
        for (const [path, value] of Object.entries(patch)) {
            // A tool's text starts as TradingView's (TV_TEXT_DEFAULTS); other lines' text starts centered along them.
            if (path.startsWith('text.') && !this.text) this.text = { ...defaultText(), ...(ALONG_LINE_TEXT_TYPES.has(this.type) ? { hAlign: 'center' as const } : {}), ...this.textDefaults() };
            setByPath(this as unknown as Record<string, unknown>, path, value);
        }
    }

    /** Points TradingView marks on a selected drawing without letting them be dragged (a brush's two ends). */
    selectionMarkers(_proj: Projector): Array<[number, number]> {
        return [];
    }

    /** Re-read per-type extras (props) onto this instance — used by the store on an edit. */
    applyProps(props: Record<string, unknown>): void {
        this.readProps(props);
    }

    // ── serialization ──
    serialize(): SerializedDrawing {
        return {
            id: this.id,
            type: this.type,
            paneId: this.paneId,
            anchors: this.anchors.map((p) => writeAnchor(p, this.barAxis)),
            style: { ...this.style },
            text: this.text ? { ...this.text } : undefined,
            locked: this.locked,
            visible: this.visible,
            intervals: compactIntervals(this.intervals),
            title: drawingTitle(this.title),
            zIndex: this.zIndex,
            createdAt: this.createdAt,
            props: this.writeProps(),
        };
    }

    /** Per-type extras to serialize into `props` (override in subclasses). */
    protected writeProps(): Record<string, unknown> | undefined {
        return undefined;
    }
    /** Read per-type extras from a `props` bag (override in subclasses). */
    protected readProps(_props: Record<string, unknown>): void {
        /* base has no extras */
    }
}

/**
 * Set `obj[a][b][c] = value` for a dotted `path`, creating plain intermediates.
 * Tolerant by design — an unknown path is a no-op rather than a throw (the popup
 * is schema-driven, but persisted/untrusted patches must never crash the store).
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let cur: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i += 1) {
        const k = keys[i]!;
        let next = cur[k];
        if (next == null || typeof next !== 'object') {
            next = {};
            cur[k] = next;
        }
        cur = next as Record<string, unknown>;
    }
    cur[keys[keys.length - 1]!] = value;
}
