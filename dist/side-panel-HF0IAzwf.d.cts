/** Width (px) a panel takes when it declares none. */
declare const DEFAULT_PANEL_WIDTH = 280;
/** Bounds a RESIZABLE panel takes when it declares none. */
declare const DEFAULT_PANEL_MIN_WIDTH = 200;
declare const DEFAULT_PANEL_MAX_WIDTH = 640;
/** Per-panel width policy. Omitted fields fall back to the module defaults. */
interface SidePanelOptions {
    /** Declared width in px — also where a double-click on the drag handle returns. */
    width?: number;
    /** Let the user drag the panel's inner edge. Fixed width when false/omitted. */
    resizable?: boolean;
    minWidth?: number;
    maxWidth?: number;
    /** Float over the chart's right edge instead of docking beside it — the chart keeps
     *  its width. Docked when false/omitted. A floating panel gets a header pin the user
     *  can dock it with (see {@link SidePanel.onPlacementChange}). */
    overlay?: boolean;
}
/**
 * Clamp a width to its bounds and round to whole pixels — PURE. The drag, a programmatic
 * {@link SidePanel.setWidth}, and the restore of a persisted width all go through it, so a bad
 * stored value (or a `maxWidth` below `minWidth`) can never paint an unusable column.
 */
declare function clampPanelWidth(px: number, min?: number, max?: number): number;
declare class SidePanel {
    readonly el: HTMLElement;
    /**
     * Notified whenever the panel opens or closes, by ANY path — a topbar toggle, the header ✕,
     * or another panel taking the dock. The owning shell reflects it on its chrome, so a button's
     * pressed state can never drift from the panel it controls.
     */
    onOpenChange: ((open: boolean) => void) | null;
    /** Notified when the USER settles a new width (drag release, or double-click reset) — never on
     *  a programmatic {@link setWidth}, so restoring a persisted width raises no change. */
    onWidthChange: ((px: number) => void) | null;
    /** Notified when the USER pins or unpins a floating panel (`overlay` is the NEW placement) —
     *  never on a programmatic {@link setOverlay}, for the same reason as widths. */
    onPlacementChange: ((overlay: boolean) => void) | null;
    protected readonly body: HTMLElement;
    private readonly heading;
    private readonly slot;
    private readonly declaredWidth;
    private readonly minWidth;
    private readonly maxWidth;
    private widthPx;
    /** Declared `overlay` — the panel CAN float; {@link overlay} says whether it does right now. */
    private readonly floatable;
    private overlayOn;
    private readonly pin;
    /** `modifier` is the panel's own class, carrying its content styles (e.g. `vela-ot`). */
    constructor(host: HTMLElement, title: string, modifier: string, opts?: SidePanelOptions);
    get open(): boolean;
    /** Open/close the panel — a bare call flips it. */
    toggle(open?: boolean): void;
    /** The scrolling body, for a panel filled from OUTSIDE the class — a contributed panel's
     *  `mount` receives exactly this element. Subclasses use the protected `body`. */
    get content(): HTMLElement;
    /** The header slot between the title and the close button — a contributed panel's
     *  `mount` receives it (via {@link SidePanelHeader}) to dock compact controls. */
    get headerSlot(): HTMLElement;
    /** Replace the header title. The topbar toggle keeps the DECLARED title as its
     *  tooltip — this only changes what the open column says about itself. */
    setTitle(title: string): void;
    /** Current width in px. */
    get width(): number;
    /** Resize the panel (clamped). Silent — {@link onWidthChange} reports user drags only. */
    setWidth(px: number): void;
    /** Whether the panel floats over the chart right now (false for every docked panel). */
    get overlay(): boolean;
    /** Float or dock the panel. Only a panel declared `overlay` can float — on any other this is
     *  a no-op. Silent — {@link onPlacementChange} reports the user's pin clicks only. */
    setOverlay(overlay: boolean): void;
    private refreshPin;
    destroy(): void;
    /** The drag handle on the panel's inner (left) edge — the panel is docked right, so dragging
     *  AWAY from the edge widens it. Pointer capture keeps the drag alive over the chart canvas. */
    private mountResizer;
}

export { DEFAULT_PANEL_MAX_WIDTH as D, type SidePanelOptions as S, DEFAULT_PANEL_MIN_WIDTH as a, DEFAULT_PANEL_WIDTH as b, clampPanelWidth as c, SidePanel as d };
