import type { Unsubscribe } from '../util/types';
import type { DrawingTypeKey, SerializedDrawing } from './Drawing';
import type { SnapMode } from './geometry';
import type { DrawingSeriesGateway } from './series';
import type { ToolbarDefinition } from './toolbar';

/**
 * The renderer-local drawing MODES beyond an armed tool: the transient measure ruler,
 * the eraser, or none. Mutually exclusive with each other and with any armed tool —
 * the renderer owns that exclusion; the core mirrors the outcome (see the `mode`
 * intent) so external UIs (a shared workspace toolbar) can reflect and drive it.
 */
export type DrawingMode = 'measure' | 'eraser' | 'zoom' | null;

/**
 * Renderer→core INTENT. The renderer proposes a change from a user gesture; the
 * core {@link DrawingController} decides, mutates the store (the source of truth),
 * re-syncs, and emits a `drawing:*` event. A single discriminated union (vs one
 * callback per kind) because every arm routes to the same destination.
 */
export type DrawingIntent =
    | { kind: 'arm'; type: DrawingTypeKey | null }
    /** Placement in progress: the ghost's current shape after every anchor click and
     *  cursor move; `null` when placement ends (finalized OR cancelled). No store
     *  mutation — the core only re-emits it (`drawing:draft`) so a multi-chart host
     *  can mirror the ghost live. Optional — a renderer that never emits it simply
     *  syncs at completion. */
    | { kind: 'draft'; doc: SerializedDrawing | null }
    | { kind: 'create'; doc: SerializedDrawing }
    | { kind: 'edit'; doc: SerializedDrawing }
    | { kind: 'convert'; doc: SerializedDrawing } // the same drawing as another type (TradingView's Anchor drawing toggle)
    | { kind: 'edit-many'; docs: SerializedDrawing[] } // atomic multi-drag / multi-nudge (one undo entry)
    | { kind: 'select'; ids: string[]; additive?: boolean } // additive = shift-toggle vs replace
    | { kind: 'delete'; ids: string[] }
    | { kind: 'reorder'; id: string; to: 'front' | 'back' }
    | { kind: 'settings'; id: string }
    | { kind: 'tool-finished'; type: DrawingTypeKey }
    | { kind: 'favorite'; type: DrawingTypeKey; on: boolean } // flyout star toggled
    | { kind: 'alert'; id: string } // the drawing toolbar's Add Alert button
    // The renderer-local magnet / mode state changed (in-chart toolbar click, or a
    // mutual-exclusion side effect — arming a tool exits measure/eraser). The core
    // mirrors the value and re-emits it as a chart event; an equal value is a no-op,
    // which is what keeps the command↔intent loop convergent.
    | { kind: 'snap-mode'; mode: SnapMode }
    /** Stay-in-drawing-mode toggled in-chart — when on, finishing a drawing leaves the
     *  tool armed instead of reverting to the pointer. */
    | { kind: 'stay-mode'; on: boolean }
    | { kind: 'mode'; mode: DrawingMode }
    | { kind: 'undo' }
    | { kind: 'redo' }
    | { kind: 'duplicate'; ids: string[] } // clone in place + select the clones
    /** Commit COPIES carrying the geometry given (the end of a drag-to-duplicate: the
     *  sources never moved, the docs are their serialized twins already translated).
     *  Ids are reassigned; the copies keep their sources' depth and become the selection.
     *  One undo step. */
    | { kind: 'clone'; docs: SerializedDrawing[] }
    | { kind: 'copy'; ids: string[] }
    | { kind: 'paste' };

/**
 * The interactive user-drawings surface a renderer optionally implements. Present
 * iff `capabilities.userDrawings`. Commands flow down; one intent channel flows up.
 * Only plain {@link SerializedDrawing}/{@link ToolbarDefinition} data crosses — no
 * backend types, mirroring the rest of {@link IChartRenderer}.
 */
export interface IDrawingsRendererPort {
    /** Hand the renderer the inert toolbar definition to RENDER (groups/tools/icons). */
    setToolbar(def: ToolbarDefinition): void;
    /** Show or hide the on-chart drawing toolbar. */
    showToolbar(visible: boolean): void;
    /** Push the authoritative snapshot down; the renderer re-projects + repaints. */
    syncDrawings(docs: readonly SerializedDrawing[]): void;
    /** Arm/disarm a tool (`null` = selection/idle, pan resumes). `lastStyle` is the
     *  tool's last-used style (if any) so the placement preview matches what will be
     *  committed, rather than falling back to the type default. */
    setActiveTool(type: DrawingTypeKey | null, lastStyle?: SerializedDrawing['style']): void;
    /** The armed tool's remembered style changed (a color picked while it is armed): the next placement preview uses
     *  it, without re-arming the tool. */
    setActiveToolStyle?(lastStyle: SerializedDrawing['style'] | undefined): void;
    /** Reflect which drawings are selected (drives handle painting); `[]` = none. */
    setSelection(ids: readonly string[]): void;
    /** Where pasted copies land: TradingView puts them 40 px above their source, so the copy is seen. Optional —
     *  without it a copy lands on its source. */
    shiftForPaste?(docs: readonly SerializedDrawing[]): SerializedDrawing[];
    /** Push the FAVORITE tool set (flyout stars + any favorites-driven UI). Optional —
     *  favorites still work headless without a renderer reflection. */
    setFavorites?(types: readonly DrawingTypeKey[]): void;
    /** Push per-tool shortcut hints — PRE-FORMATTED display strings (e.g. `'Alt+T'`)
     *  shown beside the tools in the toolbar flyouts. The host owns the keymap and the
     *  platform formatting; the renderer only displays. Optional. */
    setToolShortcuts?(map: Readonly<Partial<Record<DrawingTypeKey, string>>>): void;
    /** Set the sticky magnet snap mode (off/weak/strong). Optional — a renderer without
     *  a magnet omits it; the in-chart toolbar reflects the pushed value. */
    setSnapMode?(mode: SnapMode): void;
    /** Set stay-in-drawing-mode (tools remain armed after each placement). Optional —
     *  the in-chart toolbar reflects the pushed value. */
    setStayMode?(on: boolean): void;
    /** Enter/exit a renderer-local mode (measure ruler / eraser; `null` exits). The
     *  renderer keeps owning the mutual exclusion (with armed tools too) and reports
     *  every actual change back through the `mode` intent. Optional. */
    setMode?(mode: DrawingMode): void;
    /** The drawing types whose toolbar shows Add Alert (the host can alert on them); empty = none. Optional. */
    setAlertTypes?(types: readonly string[]): void;
    /** Zoom Out: back to the view before the last Zoom In. False when there is none. Optional. */
    zoomOut?(): boolean;
    /** True while a Zoom In can be gone back from (the toolbar then shows Zoom Out). Optional. */
    canZoomOut?(): boolean;
    /** Hand the renderer the core's series gateway so data-driven drawings can read bars
     *  of a finer timeframe (exposed to them as `Projector.seriesInRange`). Optional — a
     *  renderer without it simply never resolves lower-timeframe series. */
    setSeriesGateway?(gateway: DrawingSeriesGateway): void;
    /** The app object drawings see as `Projector.host` (see `DrawingController.setHost`). Optional. */
    setHost?(host: unknown): void;
    /** Open a drawing's settings popup (selecting it too) — the programmatic twin of a click on it. */
    openSettings(id: string): void;
    /** Display another chart's in-progress placement as a GHOST at reduced opacity
     *  (`null` clears it) — the drawings-sync twin of `setExternalCrosshair`. Never a
     *  store drawing: no selection, no hit-testing, no persistence. Optional — a
     *  renderer without it simply never previews remote placements. */
    setExternalGhost?(doc: SerializedDrawing | null): void;
    /**
     * The pane's SERIES stack in z terms, for renderers whose drawings share one draw-order
     * space with the series (`drawingDepth`): the extremes ("bring to front" beats `front`,
     * "send to back" undercuts `back`) and the candles' own key (`price`, absent on a study
     * pane) — a new drawing starts just under it. Optional — without it drawings order only
     * among themselves, on a layer of their own.
     */
    stackRange?(paneId: string): { front: number; back: number; price?: number };
    /** The plot's box in client (viewport) pixels — where a host drops or pastes content
     *  (an image, a post) onto the chart. Optional — null when the renderer has no plot. */
    plotClientRect?(): { left: number; top: number; width: number; height: number } | null;
    /** The chart point under a client (viewport) position, with the pane it falls in; null
     *  outside the plot. Pairs with {@link plotClientRect} for host-side placement. */
    pointAtClient?(clientX: number, clientY: number): { time: number; price: number; paneId: string } | null;
    /** The one channel up — create/edit/select/delete/settings/tool-finished. */
    onDrawingIntent(cb: (intent: DrawingIntent) => void): Unsubscribe;
}
