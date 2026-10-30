/**
 * Config payloads the built-in volume native indicators push to the renderer's bespoke
 * layers via `setNativeData` (see the port). Both indicators draw with their OWN local
 * scale (never through the indicator model), so their units can't disturb the price
 * autoscale; the payloads carry only cosmetics/shape — the layers read the chart's bars
 * directly each frame.
 */

/** `setNativeData('volume', …)`: bottom-anchored per-bar volume columns on the price pane. */
export interface VolumeLayerData {
    upColor: string;
    downColor: string;
    /** Pane-height fraction (0..1) the tallest VISIBLE bar occupies (the layer's own scale). */
    heightFrac: number;
}

/** `setNativeData('vpvr', …)`: right-anchored visible-range volume-by-price profile. */
export interface VpvrLayerData {
    /** "Number Of Rows": the row count the visible range is bucketed into. */
    rows: number;
    /** "Ticks Per Row": the price height of one row (ticks times the symbol's tick); absent = `rows` rows. */
    rowSize?: number;
    /** What a row's length shows: up and down volume side by side, the total, or up minus down. */
    volumeMode?: 'updown' | 'total' | 'delta';
    /** Pane-width fraction (0..1) of the largest row (the profile's horizontal scale). */
    widthFrac: number;
    /** The edge the rows grow from. */
    placement?: 'right' | 'left';
    upColor: string;
    downColor: string;
    /** Row colours inside the value area (default: `upColor` / `downColor`). */
    vaUpColor?: string;
    vaDownColor?: string;
    /** Draw the rows at all (TradingView's "Volume profile" switch; the levels are separate). */
    showProfile?: boolean;
    /** Write each row's volume on it, in `valuesColor`. */
    showValues?: boolean;
    valuesColor?: string;
    /** Outline the point-of-control (highest-volume) row (the pre-TradingView look; its POC is a line now). */
    showPoc: boolean;
    /** Volume fraction (0..1) the highlighted value area covers. */
    valueAreaFrac: number;
    /**
     * The rows, already built (from finer candles than the chart's, as TradingView does), for the window they were
     * built over. Absent = the layer builds them from the chart's own bars each frame.
     */
    profile?: VpvrProfileData;
}

/** A built profile: rows ascending by price (`price` = a row's lower bound), the value area as a row span. */
export interface VpvrProfileData {
    rows: Array<{ price: number; up: number; down: number }>;
    rowH: number;
    min: number;
    maxTotal: number;
    poc: number;
    vaFrom: number;
    vaTo: number;
}
