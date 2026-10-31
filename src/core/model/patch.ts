import type { Millis } from './time';
import type { OHLCV } from './ohlcv';
import type { CandleBarColor, SeriesPoint, SeriesSpec, MarkerPoint } from './series';
import type { DrawingLine, DrawingBox, DrawingLabel, DrawingPolyline, DrawingLinefill, DrawingTable } from './drawings';
import type { TradeExecution } from './trades';
import type { Fill } from './scene';

export interface DirtyRange {
    from: Millis;
    to: Millis;
}

/** Per-series changed tail in a value patch. */
export type SeriesValueDelta =
    | { seriesId: string; kind: 'points'; points: SeriesPoint[] }
    // `barColors` travel with the bars: a patch that replaced only the bars kept the old per-bar colours on the old
    // indexes, so a recoloured candle series lost its colours once more history loaded (Delta Candles, 2026-10-31).
    | { seriesId: string; kind: 'bars'; bars: OHLCV[]; barColors?: Array<CandleBarColor | null> }
    | { seriesId: string; kind: 'markers'; markers: MarkerPoint[] };

/**
 * Value-only update to existing series — legal as an in-place renderer update
 * (the renderer chooses `update()` vs `setData(tail)` by time comparison).
 */
export interface ValuePatch {
    kind: 'value';
    indicatorId: string;
    dirty: DirtyRange;
    /**
     * The emitting run's anchor (see `IndicatorModel.anchorTime`): a re-run over a
     * DIFFERENT bar window arrives as a value patch, so the anchor must travel with
     * it for index-aligned rendering to re-derive its offset. `null` states the run
     * spanned the WHOLE chart and clears any previous anchor — an omitted key cannot,
     * so a model that once had an anchor would otherwise keep that stale offset.
     */
    anchorTime?: Millis | null;
    series: SeriesValueDelta[];
    /**
     * Full drawing snapshots for this tick. Pine drawing containers are emitted
     * as a small, capped, already-final set each run, so live updates replace
     * the whole set rather than diffing. Absent ≡ unchanged/none.
     */
    lines?: DrawingLine[];
    boxes?: DrawingBox[];
    labels?: DrawingLabel[];
    polylines?: DrawingPolyline[];
    linefills?: DrawingLinefill[];
    tables?: DrawingTable[];
    /** Trade executions follow the same full-snapshot-per-tick pattern as the drawings. */
    trades?: TradeExecution[];
    /**
     * Fills between two series, also a full snapshot: a fill's per-bar `colors` are indexed like the series'
     * points, so a re-run whose points changed length (older bars loaded) must carry its fills too, or the
     * first run's colours land on the wrong bars and the fill disappears.
     */
    fills?: Fill[];
}

/**
 * Structural change — series added/removed/kind-changed, or panes changed.
 * Forces a remount of the affected series (a series' kind is fixed at creation
 * in most backends).
 */
export interface SchemaPatch {
    kind: 'schema';
    indicatorId: string;
    added: SeriesSpec[];
    removed: string[];
    changed: Array<{ seriesId: string; reason: 'kind' | 'pane' }>;
}

export type ScenePatch = ValuePatch | SchemaPatch;
