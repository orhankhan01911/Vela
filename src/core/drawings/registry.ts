import { Drawing, type DrawingTypeKey, type SerializedDrawing } from './Drawing';
import type { DrawingStyle } from './style';
import { DEFAULT_DRAWING_COLOR, TV_LINE_COLOR } from './style';
import { svg24 } from '../icons';
import { ACCENT, BEARISH, BULLISH, INFO, NEUTRAL } from '../palette';
import { TrendLine } from './types/TrendLine';
import { CyclicLines } from './types/CyclicLines';
import { Projection } from './types/Projection';
import { Forecast } from './types/Forecast';
import { BarsPattern } from './types/BarsPattern';
import { GhostFeed } from './types/GhostFeed';
import { AnchoredText, AnchoredNote, TableDrawing } from './types/Anchored';
import { ImageDrawing } from './types/ImageDrawing';
import { XPostDrawing } from './types/XPostDrawing';
import { DoubleCurve } from './types/DoubleCurve';
import { TimeCycles } from './types/TimeCycles';
import { SineLine } from './types/SineLine';
import { ArrowMarker } from './types/ArrowMarker';
import { DateRange } from './types/DateRange';
import { PriceRange } from './types/PriceRange';
import { TrianglePattern } from './types/TrianglePattern';
import { ElliottTriangle, ElliottDoubleCombo, ElliottTripleCombo } from './types/ElliottCombo';
import { HorizontalLine } from './types/HorizontalLine';
import { Ray } from './types/Ray';
import { ExtendedLine } from './types/ExtendedLine';
import { VerticalLine } from './types/VerticalLine';
import { HorizontalRay } from './types/HorizontalRay';
import { CrossLine } from './types/CrossLine';
import { InfoLine } from './types/InfoLine';
import { TrendAngle } from './types/TrendAngle';
import { Box } from './types/Box';
import { TextLabel } from './types/TextLabel';
import { Note } from './types/Note';
import { PriceLabel } from './types/PriceLabel';
import { Callout } from './types/Callout';
import { PriceNote } from './types/PriceNote';
import { Comment } from './types/Comment';
import { Signpost } from './types/Signpost';
import { ParallelChannel } from './types/ParallelChannel';
import { DisjointChannel } from './types/DisjointChannel';
import { FlatTopBottom } from './types/FlatTopBottom';
import { RegressionChannel } from './types/RegressionChannel';
import { AnchoredVwap } from './types/AnchoredVwap';
import { FixedRangeVolumeProfile, AnchoredVolumeProfile } from './types/FixedRangeVolumeProfile';
import { FixedRangeTpoProfile } from './types/FixedRangeTpoProfile';
import { Pitchfork } from './types/Pitchfork';
import { Pitchfan } from './types/Pitchfan';
import { SchiffPitchfork } from './types/SchiffPitchfork';
import { ModifiedSchiffPitchfork } from './types/ModifiedSchiffPitchfork';
import { InsidePitchfork } from './types/InsidePitchfork';
import { Arrow } from './types/Arrow';
import { Ellipse } from './types/Ellipse';
import { Triangle } from './types/Triangle';
import { Polyline } from './types/Polyline';
import { Freehand } from './types/Freehand';
import { Highlighter } from './types/Highlighter';
import { Circle } from './types/Circle';
import { RotatedRect } from './types/RotatedRect';
import { Path } from './types/Path';
import { Arc } from './types/Arc';
import { Curve } from './types/Curve';
import { ArrowMarkUp, ArrowMarkDown } from './types/ArrowMark';
import { FlagMark, IconStamp } from './types/GlyphStamp';
import { EmojiDrawing, IconDrawing } from './types/SvgIcon';
import { FibRetracement } from './types/FibRetracement';
import { FibExtension } from './types/FibExtension';
import { FibExtensionTrend } from './types/FibExtensionTrend';
import { FibFan } from './types/FibFan';
import { FibTimeZones } from './types/FibTimeZones';
import { FibChannel } from './types/FibChannel';
import { FibSpeedFan } from './types/FibSpeedFan';
import { TrendFibTime } from './types/TrendFibTime';
import { FibCircles } from './types/FibCircles';
import { FibArcs } from './types/FibArcs';
import { FibWedge } from './types/FibWedge';
import { FibSpiral } from './types/FibSpiral';
import { GannFan } from './types/GannFan';
import { GannBox } from './types/GannBox';
import { GannSquare } from './types/GannSquare';
import { GannSquareFixed } from './types/GannSquareFixed';
import { DedekindTessellation } from './types/DedekindTessellation';
import { Sonic, Supersonic } from './types/MachFigure';
import { GoldenSonic, GoldenSupersonic } from './types/GoldenMach';
import { XABCD } from './types/XABCD';
import { ABCDPattern } from './types/ABCDPattern';
import { ElliottImpulse } from './types/ElliottImpulse';
import { ElliottCorrection } from './types/ElliottCorrection';
import { HeadShoulders } from './types/HeadShoulders';
import { Gartley } from './types/Gartley';
import { Bat } from './types/Bat';
import { Butterfly } from './types/Butterfly';
import { Crab } from './types/Crab';
import { Shark } from './types/Shark';
import { Cypher } from './types/Cypher';
import { DatePriceRange } from './types/DatePriceRange';
import { LongPositionTool, PositionTool, ShortPositionTool } from './types/PositionTool';
import { Magnifier } from './types/Magnifier';
import { PriceAlert } from './types/PriceAlert';

/** What a drawing type contributes to the toolbar + factory (renderer-neutral). */
export interface DrawingTypeMeta {
    type: DrawingTypeKey;
    /** Toolbar group id (e.g. `'lines'`, `'shapes'`, `'annotations'`). */
    group: string;
    label: string;
    /** Inline SVG markup for the toolbar button — no DOM, renderer paints it. */
    icon: string;
    defaultStyle: DrawingStyle;
    /** The tool's body REPLACES the series pixels inside its area (an opaque inset): a fresh
     *  instance then starts ABOVE the pane's series stack instead of just under the candles —
     *  under them its content would be buried. The user can still reorder it afterwards. */
    coversSeries?: boolean;
    /** One short sentence prompting the placement gesture, shown by the renderer at the
     *  bottom of the chart while the tool is armed and no placement has started yet. */
    placementHint?: string;
    /** Build an instance from a (partial) serialized record. Serves create + deserialize. */
    create(init: Partial<SerializedDrawing> & { paneId: string }): Drawing;
}

const REGISTRY = new Map<string, DrawingTypeMeta>();

/** Register (or replace) a drawing type. Built-ins register at module load; new
 *  types (fibs/patterns) call this — no base/port/facade change. */
export function registerDrawingType(meta: DrawingTypeMeta): void {
    REGISTRY.set(meta.type, meta);
}

export function getDrawingType(type: string): DrawingTypeMeta | undefined {
    return REGISTRY.get(type);
}

export function drawingTypes(): DrawingTypeMeta[] {
    return [...REGISTRY.values()];
}

/** Build a fresh drawing of `type` on `paneId`, seeding the type's default style. */
export function createDrawing(type: DrawingTypeKey, init: Partial<SerializedDrawing> & { paneId: string }): Drawing | null {
    const meta = REGISTRY.get(type);
    if (!meta) return null;
    // Merge any caller style onto the type's default so a partial override keeps the
    // rest (e.g. a box keeps its default fill when only the line color is set), and an
    // absent/undefined style doesn't clobber the default.
    const style = { ...meta.defaultStyle, ...(init.style ?? {}) };
    return meta.create({ ...init, style });
}

/**
 * Restore a drawing's cosmetics + type extras to the type's factory defaults.
 * Keeps identity / geometry / lock / visibility / z-order, and preserves typed
 * text content (`text.value`) when the type seeds a text block.
 */
export function resetDrawingSettings(drawing: Drawing): void {
    const fresh = createDrawing(drawing.type, { paneId: drawing.paneId });
    if (!fresh) return;
    drawing.style = { ...fresh.style };
    const keptValue = drawing.text?.value;
    if (fresh.text) {
        drawing.text = { ...fresh.text };
        if (keptValue !== undefined) drawing.text.value = keptValue;
    } else {
        // Drop lazily-created text styling (e.g. measure-box label color/size).
        drawing.text = undefined;
    }
    const props = fresh.serialize().props;
    if (props !== undefined) drawing.applyProps(props);
}

/** Rehydrate a {@link Drawing} from a plain record, or null for an unknown type. */
export function deserializeDrawing(doc: SerializedDrawing): Drawing | null {
    const meta = REGISTRY.get(doc.type);
    return meta ? meta.create(legacyPattern(legacyFibSpiral(legacyStroke(legacyArrowMarker(legacyEllipse(legacyPitchfork(legacyComment(legacyElliott(doc))))))))) : null;
}

/** Patterns that became TradingView's look (XABCD, Cypher, head and shoulders, ABCD so far): a record saved before has no `tv` flag (they saved no props):
 *  mark it so it keeps its look. */
const TV_PATTERN_TYPES: ReadonlySet<string> = new Set(['xabcd', 'cypher', 'headshoulders', 'abcd']);
function legacyPattern(doc: SerializedDrawing): SerializedDrawing {
    if (!TV_PATTERN_TYPES.has(doc.type) || doc.props?.tv !== undefined) return doc;
    return { ...doc, props: { ...(doc.props ?? {}), tv: false } };
}

/** The Fib spiral became TradingView's (Fibonacci radii plus a ray). A record saved before has no `tv` flag: mark it so
 *  it keeps its golden spiral. */
function legacyFibSpiral(doc: SerializedDrawing): SerializedDrawing {
    if (doc.type !== 'fibspiral' || doc.props?.tv !== undefined) return doc;
    return { ...doc, props: { ...(doc.props ?? {}), tv: false } };
}

/** Elliott waves gained TradingView's unlabelled origin point (impulse 5 → 6 points, correction 3 → 4). A record
 *  saved before that has the old count and no `origin` flag: mark it so it keeps its old shape and labels. */
function legacyElliott(doc: SerializedDrawing): SerializedDrawing {
    const old = doc.type === 'elliottimpulse' ? 5 : doc.type === 'elliottcorrection' ? 3 : 0;
    if (!old || doc.props?.origin !== undefined || (doc.anchors?.length ?? 0) !== old) return doc;
    return { ...doc, props: { ...(doc.props ?? {}), origin: false } };
}

/** Comments became TradingView's one-point bubble. A record saved before has two points (target + balloon) and no
 *  `point` flag: mark it so it keeps its tail. */
function legacyComment(doc: SerializedDrawing): SerializedDrawing {
    if (doc.type !== 'comment' || doc.props?.point !== undefined || (doc.anchors?.length ?? 0) !== 2) return doc;
    return { ...doc, props: { ...(doc.props ?? {}), point: false } };
}

/** Pitchforks gained TradingView's levels, fills and median color. A record saved before has no `levels`: give it
 *  just the tines (level 1) in its line color, no fill and a median in the line color, so it draws as it did. */
function legacyPitchfork(doc: SerializedDrawing): SerializedDrawing {
    if (!PITCHFORK_TYPES.has(doc.type) || doc.props?.levels !== undefined) return doc;
    const ink = doc.style?.lineColor ?? DEFAULT_DRAWING_COLOR;
    return { ...doc, props: { ...(doc.props ?? {}), levels: [{ ratio: 1, color: ink, enabled: true }], background: false, medianColor: '' } };
}
const PITCHFORK_TYPES: ReadonlySet<string> = new Set(['pitchfork', 'schiffpitchfork', 'modifiedschiffpitchfork', 'insidepitchfork']);

/** Arrow markers became TradingView's (2026-10-30). One saved before has no props: give it an empty bag so it keeps
 *  its border, fill and shape (a fresh marker has no props and starts as TradingView's). */
function legacyArrowMarker(doc: SerializedDrawing): SerializedDrawing {
    return doc.type === 'arrowmarker' && doc.props === undefined ? { ...doc, props: {} } : doc;
}

/** Brush and highlighter strokes, rectangles, paths, texts and callouts became TradingView's (2026-10-30). One saved before with no props:
 *  give it an empty bag so it keeps its look (a fresh stroke has no props and starts as TradingView's). */
function legacyStroke(doc: SerializedDrawing): SerializedDrawing {
    return (doc.type === 'freehand' || doc.type === 'highlighter' || doc.type === 'box' || doc.type === 'path' || doc.type === 'text' || doc.type === 'callout') && doc.props === undefined ? { ...doc, props: {} } : doc;
}

/** Ellipses became TradingView's tilted three-point ellipse. A record saved before has two corners and no `axis`
 *  flag: mark it so it keeps its level box shape. */
function legacyEllipse(doc: SerializedDrawing): SerializedDrawing {
    if (doc.type !== 'ellipse' || doc.props?.axis !== undefined || (doc.anchors?.length ?? 0) !== 2) return doc;
    return { ...doc, props: { ...(doc.props ?? {}), axis: false } };
}

// ── built-in lean-core types ──
// Trend line: the segment ends at two hollow anchor handles (TradingView-style toolbar glyph).
const LINE_ICON = svg24('<path d="M6.6 17.4 17.4 6.6"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="5" r="2.2"/>');
const HLINE_ICON = svg24('<line x1="3" y1="12" x2="21" y2="12"/>');

registerDrawingType({
    type: 'trendline',
    group: 'lines',
    label: 'Trend Line',
    icon: LINE_ICON,
    // TradingView's trend line: 2 px solid, TradingView blue.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new TrendLine(init),
});

registerDrawingType({
    type: 'hline',
    group: 'lines',
    label: 'Horizontal Line',
    icon: HLINE_ICON,
    // TradingView's horizontal line: 2 px solid, TradingView blue, price label on.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new HorizontalLine(init),
});

const RAY_ICON = svg24('<line x1="3" y1="20" x2="21" y2="6"/><circle cx="3" cy="20" r="1.6" fill="currentColor"/>');
const BOX_ICON = svg24('<rect x="4" y="6" width="16" height="12" rx="1"/>');
const TEXT_ICON = svg24('<path d="M5 6h14M12 6v13"/>');

registerDrawingType({
    type: 'ray',
    group: 'lines',
    label: 'Ray',
    icon: RAY_ICON,
    // TradingView's ray: its trend line, 2 px solid TradingView blue, extended right.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new Ray(init),
});

const EXTLINE_ICON =
    svg24('<path d="M5 19 19 5"/><path d="M5 19 8.5 19M5 19 5 15.5"/><path d="M19 5 15.5 5M19 5 19 8.5"/>');
const VLINE_ICON = svg24('<line x1="12" y1="3" x2="12" y2="21"/>');
const HRAY_ICON =
    svg24('<line x1="5" y1="12" x2="21" y2="12"/><circle cx="5" cy="12" r="1.6" fill="currentColor"/>');
const CROSSLINE_ICON =
    svg24('<line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/>');
const INFOLINE_ICON =
    svg24('<path d="M4 20 20 4"/><rect x="9" y="9" width="9" height="6" rx="1"/>');
const TRENDANGLE_ICON =
    svg24('<path d="M4 20 20 6"/><path d="M4 20 15 20"/><path d="M11 20a7 7 0 0 0-2-4.9"/>');

registerDrawingType({
    type: 'extendedline',
    group: 'lines',
    label: 'Extended Line',
    icon: EXTLINE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new ExtendedLine(init),
});

registerDrawingType({
    type: 'vline',
    group: 'lines',
    label: 'Vertical Line',
    icon: VLINE_ICON,
    // TradingView's vertical line: 2 px solid, TradingView blue, through every pane, time label on.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new VerticalLine(init),
});

registerDrawingType({
    type: 'hray',
    group: 'lines',
    label: 'Horizontal Ray',
    icon: HRAY_ICON,
    // TradingView's horizontal ray: 2 px solid, TradingView blue, price label on.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new HorizontalRay(init),
});

registerDrawingType({
    type: 'crossline',
    group: 'lines',
    label: 'Cross Line',
    icon: CROSSLINE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new CrossLine(init),
});

registerDrawingType({
    type: 'infoline',
    group: 'lines',
    label: 'Info Line',
    icon: INFOLINE_ICON,
    // TradingView's info line: its trend line, 2 px solid TradingView blue, every stat shown.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new InfoLine(init),
});

registerDrawingType({
    type: 'trendangle',
    group: 'lines',
    label: 'Trend Angle',
    icon: TRENDANGLE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new TrendAngle(init),
});

registerDrawingType({
    type: 'box',
    group: 'shapes',
    label: 'Rectangle',
    icon: BOX_ICON,
    // TradingView's rectangle: purple 2 px, the purple at 20 % behind.
    defaultStyle: { lineColor: '#9c27b0', lineWidth: 2, lineStyle: 'solid', fillColor: '#9c27b033' }, // palette-exempt: TradingView's rectangle
    create: (init) => new Box(init),
});

registerDrawingType({
    type: 'text',
    group: 'annotations',
    label: 'Text',
    icon: TEXT_ICON,
    coversSeries: true, // text over the candles like TradingView's: a candle never paints over the words
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new TextLabel(init),
});

const CALLOUT_ICON =
    svg24('<path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-5 5v-5H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>');

registerDrawingType({
    type: 'callout',
    group: 'annotations',
    label: 'Callout',
    icon: CALLOUT_ICON,
    coversSeries: true, // text over the candles like TradingView's: a candle never paints over the words
    // TradingView's callout: its sky blue 700 border (2 px) and the same at 70 % behind the text.
    defaultStyle: { lineColor: '#0097a7', lineWidth: 2, lineStyle: 'solid', fillColor: '#0097a7b3' }, // palette-exempt: TradingView's sky blue 700
    create: (init) => new Callout(init),
});

const NOTE_ICON = svg24('<path d="M5 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-7l-4 4v-4H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M8 8.5h8M8 12h5"/>');
const PRICE_NOTE_ICON = svg24('<rect x="10" y="4.5" width="11" height="8" rx="1.5"/><path d="M10 8.5 4 16"/><circle cx="3.5" cy="16.5" r="1.6" fill="currentColor" stroke="none"/>');
const COMMENT_ICON = svg24('<path d="M5 4.5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-7l-4 4v-4H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"/>');
const PRICE_LABEL_ICON = svg24('<path d="M3 12 7 8h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7Z"/><path d="M10.5 12.5h6" stroke-width="1.4"/>');
const SIGNPOST_ICON = svg24('<path d="M12 11.5V21"/><rect x="5" y="4" width="14" height="7" rx="1"/><path d="M9 7.5h6"/>');

registerDrawingType({
    type: 'note',
    group: 'annotations',
    label: 'Note',
    icon: NOTE_ICON,
    coversSeries: true, // text over the candles like TradingView's: a candle never paints over the words
    // TradingView's note: the pin (Label) in its blue.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}d9` },
    create: (init) => new Note(init),
});

registerDrawingType({
    type: 'pricenote',
    group: 'annotations',
    label: 'Price Note',
    icon: PRICE_NOTE_ICON,
    coversSeries: true, // text over the candles like TradingView's: a candle never paints over the words
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}d9` },
    create: (init) => new PriceNote(init),
});

registerDrawingType({
    type: 'comment',
    group: 'annotations',
    label: 'Comment',
    icon: COMMENT_ICON,
    coversSeries: true, // text over the candles like TradingView's: a candle never paints over the words
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}d9` },
    create: (init) => new Comment(init),
});

registerDrawingType({
    type: 'pricelabel',
    group: 'annotations',
    label: 'Price Label',
    icon: PRICE_LABEL_ICON,
    coversSeries: true, // text over the candles like TradingView's: a candle never paints over the words
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}d9` },
    create: (init) => new PriceLabel(init),
});

registerDrawingType({
    type: 'signpost',
    group: 'annotations',
    label: 'Signpost',
    icon: SIGNPOST_ICON,
    coversSeries: true, // text over the candles like TradingView's: a candle never paints over the words
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}d9` },
    create: (init) => new Signpost(init),
});

// ── lines & channels ──
const PARALLEL_ICON =
    svg24('<line x1="3" y1="16" x2="21" y2="8"/><line x1="3" y1="21" x2="21" y2="13"/>');
const DISJOINT_ICON =
    svg24('<line x1="3" y1="7" x2="21" y2="10"/><line x1="3" y1="18" x2="21" y2="14"/>');
const PITCHFORK_ICON =
    svg24('<circle cx="4" cy="12" r="1.6" fill="currentColor"/><line x1="4" y1="12" x2="10" y2="12"/><line x1="10" y1="6" x2="10" y2="18"/><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>');

registerDrawingType({
    type: 'parallelchannel',
    group: 'channels',
    label: 'Parallel Channel',
    icon: PARALLEL_ICON,
    // TradingView's parallel channel: TradingView blue lines, its blue at 20 % behind.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${TV_LINE_COLOR}33` },
    create: (init) => new ParallelChannel(init),
});

registerDrawingType({
    type: 'disjointchannel',
    group: 'channels',
    label: 'Disjoint Channel',
    icon: DISJOINT_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}1a` },
    create: (init) => new DisjointChannel(init),
});

const FLATTOP_ICON =
    svg24('<line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="18" x2="21" y2="11"/>');

registerDrawingType({
    type: 'flattopbottom',
    group: 'channels',
    label: 'Flat Top/Bottom',
    icon: FLATTOP_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}1a` },
    create: (init) => new FlatTopBottom(init),
});

const REGRESSION_ICON =
    svg24('<line x1="3" y1="8" x2="21" y2="4"/><line x1="3" y1="16" x2="21" y2="12"/><line x1="3" y1="12" x2="21" y2="8" stroke-dasharray="3 3"/>');

registerDrawingType({
    type: 'regressionchannel',
    group: 'channels',
    label: 'Linear Regression',
    icon: REGRESSION_ICON,
    defaultStyle: { lineColor: NEUTRAL, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new RegressionChannel(init),
});

registerDrawingType({
    type: 'pitchfork',
    group: 'pitchforks',
    label: 'Pitchfork',
    icon: PITCHFORK_ICON,
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' }, // TradingView: the toolbar's color is Use one color
    create: (init) => new Pitchfork(init),
});

const SCHIFF_ICON =
    svg24('<circle cx="4" cy="8" r="1.6" fill="currentColor"/><line x1="4" y1="8" x2="10" y2="12"/><line x1="10" y1="6" x2="10" y2="18"/><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>');
const MODSCHIFF_ICON =
    svg24('<circle cx="6" cy="9" r="1.6" fill="currentColor"/><line x1="6" y1="9" x2="10" y2="12"/><line x1="10" y1="6" x2="10" y2="18"/><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>');
const INSIDE_ICON =
    svg24('<line x1="4" y1="12" x2="10" y2="12"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="10" y1="8" x2="21" y2="8"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="16" x2="21" y2="16"/>');

registerDrawingType({
    type: 'schiffpitchfork',
    group: 'pitchforks',
    label: 'Schiff Pitchfork',
    icon: SCHIFF_ICON,
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' }, // TradingView: the toolbar's color is Use one color
    create: (init) => new SchiffPitchfork(init),
});

registerDrawingType({
    type: 'modifiedschiffpitchfork',
    group: 'pitchforks',
    label: 'Modified Schiff Pitchfork',
    icon: MODSCHIFF_ICON,
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' }, // TradingView: the toolbar's color is Use one color
    create: (init) => new ModifiedSchiffPitchfork(init),
});

registerDrawingType({
    type: 'insidepitchfork',
    group: 'pitchforks',
    label: 'Inside Pitchfork',
    icon: INSIDE_ICON,
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' }, // TradingView: the toolbar's color is Use one color
    create: (init) => new InsidePitchfork(init),
});

// Pitchfan: rays from a pivot dot, fanning out to a vertical side line (our own glyph).
const PITCHFAN_ICON =
    svg24('<circle cx="4" cy="12" r="1.6" fill="currentColor"/><line x1="4" y1="12" x2="21" y2="12"/><line x1="4" y1="12" x2="20" y2="5"/><line x1="4" y1="12" x2="20" y2="19"/><line x1="15" y1="7" x2="15" y2="17"/>');

registerDrawingType({
    type: 'pitchfan',
    group: 'pitchforks',
    label: 'Pitchfan',
    icon: PITCHFAN_ICON,
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' }, // TradingView: the toolbar's color is Use one color
    create: (init) => new Pitchfan(init),
});

// ── shapes & annotations ──
const ARROW_ICON =
    svg24('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>');
const ELLIPSE_ICON = svg24('<ellipse cx="12" cy="12" rx="9" ry="6"/>');
const TRIANGLE_ICON =
    svg24('<path d="M12 4 20 19 4 19Z"/>');

registerDrawingType({
    type: 'arrow',
    group: 'shapes',
    label: 'Arrow',
    icon: ARROW_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid', arrowRight: true },
    create: (init) => new Arrow(init),
});

registerDrawingType({
    type: 'ellipse',
    group: 'shapes',
    label: 'Ellipse',
    icon: ELLIPSE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}1a` },
    create: (init) => new Ellipse(init),
});

registerDrawingType({
    type: 'triangle',
    group: 'shapes',
    label: 'Triangle',
    icon: TRIANGLE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}1a` },
    create: (init) => new Triangle(init),
});

const POLYLINE_ICON =
    svg24('<polyline points="3 17 9 10 13 14 21 5"/>');
const FREEHAND_ICON =
    svg24('<path d="M9.5 12 17 4.5a2.12 2.12 0 0 1 3 3L12.5 15"/><path d="M7 14a3 3 0 0 0-3 3c0 1.3-1.2 1.5-1.5 2 .8.9 2 1.5 3.5 1.5a3.5 3.5 0 0 0 3.5-3.5 3 3 0 0 0-2.5-3Z"/>');
const HIGHLIGHTER_ICON =
    svg24('<path d="M9 11 15 5l4 4-6 6H9Z"/><path d="M9 15l-2 2"/><path d="M4 21h6"/>');

registerDrawingType({
    type: 'polyline',
    group: 'shapes',
    label: 'Polyline',
    icon: POLYLINE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new Polyline(init),
});

registerDrawingType({
    type: 'freehand',
    group: 'shapes',
    label: 'Brush',
    icon: FREEHAND_ICON,
    // TradingView's brush: sky blue 2 px, its fill (off until switched on) the same blue at 20 %.
    defaultStyle: { lineColor: '#00bcd4', lineWidth: 2, lineStyle: 'solid', fillColor: '#00bcd433' }, // palette-exempt: TradingView's sky blue
    create: (init) => new Freehand(init),
});

registerDrawingType({
    type: 'highlighter',
    group: 'shapes',
    label: 'Highlighter',
    icon: HIGHLIGHTER_ICON,
    // TradingView's highlighter: its red at 20 %, 20 px.
    defaultStyle: { lineColor: '#f2364533', lineWidth: 20, lineStyle: 'solid' }, // palette-exempt: TradingView's red
    create: (init) => new Highlighter(init),
});

const CIRCLE_ICON = svg24('<circle cx="12" cy="12" r="8"/>');
const ROTRECT_ICON = svg24('<path d="M5 14 9.5 5 19 10 14.5 19 Z"/>');
const PATH_ICON =
    svg24('<path d="M4 19 9 11 13 14 17 8 20 4"/><path d="M17.2 5.5 20 4 19.4 7.1"/>');
const ARC_ICON =
    svg24('<path d="M4 17a8 8 0 0 1 16 0"/><path d="M4 17 20 17"/>');
const CURVE_ICON = svg24('<path d="M4 18Q12 1 20 14"/>');
const ARROW_UP_ICON =
    svg24('<path d="M12 5 12 19"/><path d="M6 11 12 5 18 11"/>');
const ARROW_DOWN_ICON =
    svg24('<path d="M12 5 12 19"/><path d="M6 13 12 19 18 13"/>');

registerDrawingType({
    type: 'circle',
    group: 'shapes',
    label: 'Circle',
    icon: CIRCLE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}1a` },
    create: (init) => new Circle(init),
});

registerDrawingType({
    type: 'rotatedrect',
    group: 'shapes',
    label: 'Rotated Rectangle',
    icon: ROTRECT_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}26` },
    create: (init) => new RotatedRect(init),
});

registerDrawingType({
    type: 'path',
    group: 'shapes',
    label: 'Path',
    icon: PATH_ICON,
    // TradingView's path: its blue, 2 px.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new Path(init),
});

registerDrawingType({
    type: 'arc',
    group: 'shapes',
    label: 'Arc',
    icon: ARC_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}26` },
    create: (init) => new Arc(init),
});

registerDrawingType({
    type: 'curve',
    group: 'shapes',
    label: 'Curve',
    icon: CURVE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new Curve(init),
});

registerDrawingType({
    type: 'arrowmarkup',
    group: 'shapes',
    label: 'Arrow Mark Up',
    icon: ARROW_UP_ICON,
    defaultStyle: { lineColor: BULLISH, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new ArrowMarkUp(init),
});

registerDrawingType({
    type: 'arrowmarkdown',
    group: 'shapes',
    label: 'Arrow Mark Down',
    icon: ARROW_DOWN_ICON,
    // TradingView's arrow mark down: its ripe red 600 (the up mark is its minty green, our BULLISH).
    defaultStyle: { lineColor: '#cc2f3c', lineWidth: 1, lineStyle: 'solid' }, // palette-exempt: TradingView's red 600
    create: (init) => new ArrowMarkDown(init),
});

// ── stamps (single-click glyph markers) ──
const FLAG_MARK_ICON =
    svg24('<path d="M6 21V4"/><path d="M6 5h11l-2.5 3.5L17 12H6" fill="currentColor" stroke="none"/>');
// Smiley: the Icons group's face on the toolbar.
const ICON_STAMP_ICON = svg24(
    '<circle cx="12" cy="12" r="8.5"/><path d="M8.6 14.2a4.4 4.4 0 0 0 6.8 0"/><circle cx="9.2" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14.8" cy="10" r="1" fill="currentColor" stroke="none"/>'
);

registerDrawingType({
    type: 'flagmark',
    group: 'stamps',
    label: 'Flag',
    icon: FLAG_MARK_ICON,
    defaultStyle: { lineColor: ACCENT, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FlagMark(init),
});

registerDrawingType({
    type: 'iconstamp',
    group: 'stamps',
    label: 'Icon',
    icon: ICON_STAMP_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new IconStamp(init),
});

// TradingView's emoji and icon tools (picked in the Icons panel; see types/SvgIcon).
registerDrawingType({
    type: 'emoji',
    group: 'stamps',
    label: 'Emoji',
    icon: ICON_STAMP_ICON,
    coversSeries: true,
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new EmojiDrawing(init),
});

registerDrawingType({
    type: 'icon',
    group: 'stamps',
    label: 'Icon',
    icon: ICON_STAMP_ICON,
    coversSeries: true,
    // TradingView's icon: its blue.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new IconDrawing(init),
});

// ── fibonacci ──
// Four levels; the top level ends at its right anchor handle, the bottom one starts at its left handle.
const FIB_RETRACE_ICON = svg24(
    '<path d="M3 5h13.8M3 10h18M3 14h18M7.2 19H21"/><circle cx="19" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/>'
);

const FIB_EXTEND_ICON =
    svg24('<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="3" y1="15" x2="14" y2="15"/><line x1="3" y1="20" x2="14" y2="20"/>');

registerDrawingType({
    type: 'fibretracement',
    group: 'fibonacci',
    label: 'Fib Retracement',
    icon: FIB_RETRACE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FibRetracement(init),
});

registerDrawingType({
    type: 'fibextension',
    group: 'fibonacci',
    label: 'Fib Extension',
    icon: FIB_EXTEND_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FibExtension(init),
});

const FIB_TREND_ICON =
    svg24('<path d="M3 20 10 9l4 5"/><path d="M14 14h7M14 9h7M14 4h7"/>');

registerDrawingType({
    type: 'fibextensiontrend',
    group: 'fibonacci',
    label: 'Trend-Based Fib Extension',
    icon: FIB_TREND_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FibExtensionTrend(init),
});

const FIB_FAN_ICON =
    svg24('<path d="M4 20 20 5M4 20 21 11M4 20 21 17M4 20 20 20"/>');
const FIB_TZ_ICON =
    svg24('<path d="M3 5v14M6 5v14M11 5v14M19 5v14"/>');

registerDrawingType({
    type: 'fibfan',
    group: 'fibonacci',
    label: 'Fib Fan',
    icon: FIB_FAN_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FibFan(init),
});

registerDrawingType({
    type: 'fibtimezones',
    group: 'fibonacci',
    label: 'Fib Time Zones',
    icon: FIB_TZ_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'dashed' },
    create: (init) => new FibTimeZones(init),
});

const FIB_CHANNEL_ICON =
    svg24('<path d="M3 18 18 9M5 21 20 12M6 13 21 4"/>');
const FIB_SPEEDFAN_ICON =
    svg24('<path d="M4 4 20 20M4 4 20 12M4 4 12 20M4 4 20 4M4 4 4 20"/>');
const FIB_TRENDTIME_ICON =
    svg24('<path d="M3 19 9 8M9 8 12 5v14M14 5v14M18 5v14M21 5v14"/>');

registerDrawingType({
    type: 'fibchannel',
    group: 'fibonacci',
    label: 'Fib Channel',
    icon: FIB_CHANNEL_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FibChannel(init),
});

registerDrawingType({
    type: 'fibspeedfan',
    group: 'fibonacci',
    label: 'Fib Speed Resistance Fan',
    icon: FIB_SPEEDFAN_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FibSpeedFan(init),
});

registerDrawingType({
    type: 'trendfibtime',
    group: 'fibonacci',
    label: 'Trend-Based Fib Time',
    icon: FIB_TRENDTIME_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'dashed' },
    create: (init) => new TrendFibTime(init),
});

const FIB_CIRCLES_ICON =
    svg24('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="10"/>');
const FIB_ARCS_ICON =
    svg24('<path d="M8 20a4 4 0 0 1 8 0"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/><circle cx="12" cy="20" r="1.4" fill="currentColor" stroke="none"/>');
const FIB_WEDGE_ICON =
    svg24('<path d="M4 20 20 16M4 20 14 4"/><path d="M11.8 18.1A8 8 0 0 0 8.2 13.2"/><path d="M16.6 16.9A13 13 0 0 0 10.9 9"/>');
const FIB_SPIRAL_ICON =
    svg24('<path d="M13 12a2 2 0 1 1-2-2 4 4 0 0 1 4 4 6 6 0 0 1-9 5.2 9 9 0 0 1 .5-15"/>');

registerDrawingType({
    type: 'fibcircles',
    group: 'fibonacci',
    label: 'Fib Circles',
    icon: FIB_CIRCLES_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FibCircles(init),
});

registerDrawingType({
    type: 'fibarcs',
    group: 'fibonacci',
    label: 'Fib Speed Resistance Arcs',
    icon: FIB_ARCS_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FibArcs(init),
});

registerDrawingType({
    type: 'fibwedge',
    group: 'fibonacci',
    label: 'Fib Wedge',
    icon: FIB_WEDGE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FibWedge(init),
});

registerDrawingType({
    type: 'fibspiral',
    group: 'fibonacci',
    label: 'Fib Spiral',
    icon: FIB_SPIRAL_ICON,
    defaultStyle: { lineColor: '#00bcd4', lineWidth: 2, lineStyle: 'solid' }, // palette-exempt: TradingView's sky blue 500 (module 337648)
    create: (init) => new FibSpiral(init),
});

// ── gann ──
const GANN_FAN_ICON =
    svg24('<path d="M4 20 20 20M4 20 20 13M4 20 20 6M4 20 15 4M4 20 9 4M4 20 4 4"/>');
const GANN_BOX_ICON =
    svg24('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 4v16M4 4 20 20" opacity="0.6"/>');

registerDrawingType({
    type: 'gannfan',
    group: 'fibonacci',
    label: 'Gann Fan',
    icon: GANN_FAN_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new GannFan(init),
});

registerDrawingType({
    type: 'gannbox',
    group: 'fibonacci',
    label: 'Gann Box',
    icon: GANN_BOX_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new GannBox(init),
});

const GANN_SQUARE_ICON =
    svg24('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 20 20 4M4 20 20 12M4 20 12 4" opacity="0.7"/><path d="M4 20a16 16 0 0 1 16-16" opacity="0.5"/>');

registerDrawingType({
    type: 'gannsquare',
    group: 'fibonacci',
    label: 'Gann Square',
    icon: GANN_SQUARE_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new GannSquare(init),
});

// Gann square fixed: a square grid with arcs from its corner (our own glyph).
const GANN_SQUARE_FIXED_ICON =
    svg24('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 4v16" opacity="0.7"/><path d="M4 12a8 8 0 0 1 8-8M4 20a16 16 0 0 1 16-16" opacity="0.5"/>');

registerDrawingType({
    type: 'gannsquarefixed',
    group: 'fibonacci',
    label: 'Gann Square Fixed',
    icon: GANN_SQUARE_FIXED_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new GannSquareFixed(init),
});

const DEDEKIND_ICON = svg24(
    '<path d="M2 20h20"/><path d="M4 20a8 8 0 0 1 16 0" opacity="0.9"/>' +
        '<path d="M6 20a4 4 0 0 1 8 0" opacity="0.75"/><path d="M10 20a2 2 0 0 1 4 0" opacity="0.6"/>' +
        '<path d="M8 20v-6M12 20v-9M16 20v-6" opacity="0.45"/>',
);

registerDrawingType({
    type: 'dedekind',
    group: 'geometry',
    label: 'Dedekind Tessellation',
    icon: DEDEKIND_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new DedekindTessellation(init),
});

const SONIC_ICON = svg24(
    '<circle cx="16" cy="12" r="5" opacity="0.55"/><circle cx="13" cy="12" r="3.5" opacity="0.75"/><circle cx="10.5" cy="12" r="2"/>' +
        '<path d="M8 4v16"/>',
);

const SUPERSONIC_ICON = svg24(
    '<circle cx="17" cy="12" r="4.5" opacity="0.45"/><circle cx="13" cy="12" r="3" opacity="0.7"/><circle cx="10" cy="12" r="1.6"/>' +
        '<path d="M6 12 16 5M6 12 16 19"/>',
);

registerDrawingType({
    type: 'sonic',
    group: 'geometry',
    label: 'Sonic',
    icon: SONIC_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new Sonic(init),
});

registerDrawingType({
    type: 'supersonic',
    group: 'geometry',
    label: 'Supersonic',
    icon: SUPERSONIC_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new Supersonic(init),
});

const GOLDEN_SONIC_ICON = svg24(
    '<circle cx="16" cy="12" r="5" opacity="0.4"/><circle cx="13" cy="12" r="3.2" opacity="0.65"/><circle cx="10.8" cy="12" r="1.8"/>' +
        '<path d="M8 4v16"/><path d="M15 8.5h2M12.5 10h2" opacity="0.5"/>',
);

const GOLDEN_SUPERSONIC_ICON = svg24(
    '<circle cx="17" cy="12" r="4.5" opacity="0.4"/><circle cx="12.5" cy="12" r="2.8" opacity="0.65"/><circle cx="9.8" cy="12" r="1.4"/>' +
        '<path d="M6 12 16 5M6 12 16 19"/>',
);

registerDrawingType({
    type: 'goldensonic',
    group: 'geometry',
    label: 'Golden Sonic',
    icon: GOLDEN_SONIC_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new GoldenSonic(init),
});

registerDrawingType({
    type: 'goldensupersonic',
    group: 'geometry',
    label: 'Golden Supersonic',
    icon: GOLDEN_SUPERSONIC_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new GoldenSupersonic(init),
});

// ── patterns ──
// X-A-B-C-D legs with the two X-B / B-D bases, each point a hollow handle.
const XABCD_ICON = svg24(
    '<path d="M4 19 7 6l5 7.5L17 5l3 14M4 19l8-5.5 8 5.5"/>' +
        '<circle cx="4" cy="19" r="1.7"/><circle cx="7" cy="6" r="1.7"/><circle cx="12" cy="13.5" r="1.7"/><circle cx="17" cy="5" r="1.7"/><circle cx="20" cy="19" r="1.7"/>'
);
const ABCD_ICON = svg24('<path d="M4 17 9 7 14 15 20 5"/>');
const ELLIOTT_IMPULSE_ICON = svg24('<path d="M3 19 8 9 12 13 17 5 21 9"/>');
const ELLIOTT_CORRECTION_ICON = svg24('<path d="M4 7 11 16 20 9"/>');
const HEAD_SHOULDERS_ICON = svg24('<path d="M3 18 6 12 9 16 12 5 15 16 18 12 21 18"/>');

registerDrawingType({
    type: 'xabcd',
    group: 'patterns',
    label: 'XABCD Pattern',
    icon: XABCD_ICON,
    coversSeries: true, // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
    defaultStyle: { lineColor: '#2962ff', lineWidth: 2, lineStyle: 'solid', fillColor: '#2962ff26' }, // palette-exempt: TradingView's tv-blue-500, background at 85 % transparency
    create: (init) => new XABCD(init),
});

registerDrawingType({
    type: 'abcd',
    group: 'patterns',
    label: 'ABCD Pattern',
    icon: ABCD_ICON,
    coversSeries: true, // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
    defaultStyle: { lineColor: '#089981', lineWidth: 2, lineStyle: 'solid' }, // palette-exempt: TradingView's minty-green-500
    create: (init) => new ABCDPattern(init),
});

registerDrawingType({
    type: 'elliottimpulse',
    group: 'patterns',
    label: 'Elliott Impulse Wave (1-5)',
    icon: ELLIOTT_IMPULSE_ICON,
    coversSeries: true, // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new ElliottImpulse(init),
});

registerDrawingType({
    type: 'elliottcorrection',
    group: 'patterns',
    label: 'Elliott Correction Wave (ABC)',
    icon: ELLIOTT_CORRECTION_ICON,
    coversSeries: true, // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new ElliottCorrection(init),
});

registerDrawingType({
    type: 'headshoulders',
    group: 'patterns',
    label: 'Head & Shoulders',
    icon: HEAD_SHOULDERS_ICON,
    coversSeries: true, // labelled pattern over the candles like TradingView's: a candle never hides a wave or point name
    defaultStyle: { lineColor: '#089981', lineWidth: 2, lineStyle: 'solid', fillColor: '#08998126' }, // palette-exempt: TradingView's minty-green-500, background at 85 % transparency
    create: (init) => new HeadShoulders(init),
});

// Named harmonics (XABCD with validated Fibonacci bands) — share an XABCD-shaped icon; the label names them.
const HARMONIC_ICON = svg24('<path d="M3 17 7 6 12 14 17 5 21 16"/><path d="M3 17 21 16" opacity="0.45"/>');
// Labelled points over the candles like TradingView's (coversSeries).
const harmonic = { group: 'patterns' as const, icon: HARMONIC_ICON, coversSeries: true, defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' as const } };

registerDrawingType({ type: 'gartley', label: 'Gartley', ...harmonic, create: (init) => new Gartley(init) });
registerDrawingType({ type: 'bat', label: 'Bat', ...harmonic, create: (init) => new Bat(init) });
registerDrawingType({ type: 'butterfly', label: 'Butterfly', ...harmonic, create: (init) => new Butterfly(init) });
registerDrawingType({ type: 'crab', label: 'Crab', ...harmonic, create: (init) => new Crab(init) });
registerDrawingType({ type: 'shark', label: 'Shark', ...harmonic, create: (init) => new Shark(init) });
// TradingView's Cypher pattern (a plain pattern there): its blue line and background at 85 % transparency.
registerDrawingType({
    type: 'cypher',
    label: 'Cypher',
    ...harmonic,
    defaultStyle: { lineColor: '#2962ff', lineWidth: 2, lineStyle: 'solid', fillColor: '#2962ff26' }, // palette-exempt: TradingView's tv-blue-500
    create: (init) => new Cypher(init),
});

// ── measurement ──
const MEASURE_ICON =
    svg24('<rect x="4" y="6" width="16" height="12" rx="1"/><path d="M4 18 20 6" opacity="0.5"/>');

registerDrawingType({
    type: 'datepricerange',
    group: 'measure',
    label: 'Date & Price Range',
    icon: MEASURE_ICON,
    // TradingView's date & price range: 2 px blue arrows, its blue at 15 % behind.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${TV_LINE_COLOR}26` },
    create: (init) => new DatePriceRange(init),
});

// ── positions ──
/** TradingView's position entry line: gray, not the drawing accent. */
const POSITION_ENTRY_COLOR = '#808080'; // palette-exempt: TradingView position entry line
// Shaded target zone above the entry edge, hollow stop zone below it.
// Target and stop levels, each from a left anchor handle, with an "L" (long) between them.
const POSITION_ICON = svg24(
    '<circle cx="5" cy="6" r="2.2"/><path d="M7.2 6H21"/><circle cx="5" cy="18" r="2.2"/><path d="M7.2 18H21"/><path d="M11 9.5v5h4.5"/>'
);

// The same two levels with an "S" (short) between them.
const SHORT_POSITION_ICON = svg24(
    '<circle cx="5" cy="6" r="2.2"/><path d="M7.2 6H21"/><circle cx="5" cy="18" r="2.2"/><path d="M7.2 18H21"/><path d="M15 10.2c-.5-.5-1.3-.8-2.1-.8-1.2 0-2 .6-2 1.4 0 1.9 4.3 1.1 4.3 3.1 0 .8-.9 1.5-2.1 1.5-.9 0-1.8-.4-2.3-1"/>'
);

// The menu has TradingView's two tools, Long Position and Short Position (tester Ibad, 2026-10-19: one combined
// "Long/Short Position" made the side a guess). The combined type stays registered, out of the menu: saved charts,
// the Alt+X hotkey and the Ask assistant still create and load it.
registerDrawingType({
    type: 'long-position',
    group: 'measure',
    label: 'Long Position',
    icon: POSITION_ICON,
    // Starts over the candles like TradingView: its zones are translucent, and its stats labels
    // must never be painted over by a candle (a misread target/stop is a trading loss).
    coversSeries: true,
    defaultStyle: { lineColor: POSITION_ENTRY_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new LongPositionTool(init),
});

registerDrawingType({
    type: 'short-position',
    group: 'measure',
    label: 'Short Position',
    icon: SHORT_POSITION_ICON,
    coversSeries: true,
    defaultStyle: { lineColor: POSITION_ENTRY_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new ShortPositionTool(init),
});

registerDrawingType({
    type: 'position',
    group: 'measure',
    label: 'Long/Short Position',
    icon: POSITION_ICON,
    coversSeries: true,
    defaultStyle: { lineColor: POSITION_ENTRY_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new PositionTool(init),
});

// ── magnifier (lower-timeframe inset) ──
const MAGNIFIER_ICON = svg24(
    '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.3 15.3 5.2 5.2"/><path d="M8 12.5v-3M10.5 13.5v-5.5M13 12v-2"/>',
);

registerDrawingType({
    type: 'magnifier',
    group: 'measure',
    label: 'Magnifier',
    icon: MAGNIFIER_ICON,
    // An empty border color means the THEME's contrast ink (white on dark, black on
    // light), resolved at paint time so it follows theme switches; a user pick wins.
    defaultStyle: { lineColor: '', lineWidth: 1, lineStyle: 'solid' },
    coversSeries: true, // the inset's backdrop must sit over the base candles it replaces
    placementHint: 'Drag an area on the chart to view it at a lower timeframe',
    create: (init) => new Magnifier(init),
});

// ── anchored VWAP ──
const VWAP_ICON =
    svg24('<line x1="5" y1="3" x2="5" y2="21"/><path d="M5 16c4 0 5-9 8-9s3 5 8 3"/>');

registerDrawingType({
    type: 'anchoredvwap',
    group: 'measure',
    label: 'Anchored VWAP',
    icon: VWAP_ICON,
    defaultStyle: { lineColor: INFO, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new AnchoredVwap(init),
});

// ── fixed-range volume profile ──
const FRVP_ICON =
    svg24('<path d="M4 4v16"/><path d="M4 8h10"/><path d="M4 12h14"/><path d="M4 16h8"/><path d="M4 20h12"/>');

registerDrawingType({
    type: 'fixedrangevp',
    group: 'measure',
    label: 'Fixed Range Volume Profile',
    icon: FRVP_ICON,
    defaultStyle: { lineColor: BULLISH, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FixedRangeVolumeProfile(init),
});

registerDrawingType({
    type: 'anchoredvp',
    group: 'measure',
    label: 'Anchored Volume Profile',
    icon: FRVP_ICON,
    defaultStyle: { lineColor: BULLISH, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new AnchoredVolumeProfile(init),
});

// ── fixed-range TPO profile ──
const FRTPO_ICON = svg24(
    '<path d="M4 4v16"/><path d="M7 7h2M11 7h2"/><path d="M7 11h2M11 11h2M15 11h2"/><path d="M7 15h2M11 15h2"/><path d="M7 19h2"/>',
);

// Host-created alert marker (never armed from the toolbar: it is in no TOOLBAR_LAYOUT section).
registerDrawingType({
    type: 'pricealert',
    group: 'measure',
    label: 'Price Alert',
    icon: svg24('<path d="M12 4a5 5 0 0 0-5 5v3l-1.5 3h13L17 12V9a5 5 0 0 0-5-5Z"/><path d="M10 18a2 2 0 0 0 4 0"/>'),
    defaultStyle: { lineColor: '', lineWidth: 1, lineStyle: 'dashed' },
    coversSeries: true, // paint over the candles and the price axis strip, never under them
    create: (init) => new PriceAlert(init),
});

registerDrawingType({
    type: 'fixedrangetpo',
    group: 'measure',
    label: 'Fixed Range TPO Profile',
    icon: FRTPO_ICON,
    defaultStyle: { lineColor: ACCENT, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new FixedRangeTpoProfile(init),
});

// ── TradingView tools added 2026-10-18 (cycles, ranges, arrow marker, triangle pattern, Elliott combos) ──
const CYCLIC_ICON = svg24('<path d="M5 4v16M10 4v16M15 4v16M20 4v16"/>');
const TIME_CYCLES_ICON = svg24('<path d="M2 18a5 5 0 0 1 10 0a5 5 0 0 1 10 0"/><path d="M2 18h20"/>');
const SINE_ICON = svg24('<path d="M2 12c2.5-7 5-7 7.5 0s5 7 7.5 0 3.5-5 5-5"/>');
const ARROW_MARKER_ICON = svg24('<path d="M4 19 15 9.5l-1.5-2L20 5l-2.5 6.5-2-1.5L5 20Z"/>');
const DATE_RANGE_ICON = svg24('<path d="M5 4v16M19 4v16M7 12h10M9 10l-2 2 2 2M15 10l2 2-2 2"/>');
const PRICE_RANGE_ICON = svg24('<path d="M4 5h16M4 19h16M12 7v10M10 9l2-2 2 2M10 15l2 2 2-2"/>');
const TRIANGLE_PATTERN_ICON = svg24('<path d="M3 6 21 11M3 19 21 13"/><path d="M5 18 9 7.5 13 15.5 17 10"/>');
const ELLIOTT_TRIANGLE_ICON = svg24('<path d="M3 20 7 5l3 12 3-9 3 6 3-3 2 2"/>');
const ELLIOTT_COMBO_ICON = svg24('<path d="M3 19 8 8l4 8 4-11 5 10"/>');
const SOLID = { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' as const };

registerDrawingType({ type: 'cycliclines', group: 'measure', label: 'Cyclic Lines', icon: CYCLIC_ICON, defaultStyle: SOLID, create: (init) => new CyclicLines(init) });
registerDrawingType({ type: 'timecycles', group: 'measure', label: 'Time Cycles', icon: TIME_CYCLES_ICON, defaultStyle: SOLID, create: (init) => new TimeCycles(init) });
registerDrawingType({ type: 'sineline', group: 'measure', label: 'Sine Line', icon: SINE_ICON, defaultStyle: SOLID, create: (init) => new SineLine(init) });
// TradingView's date range: 2 px blue lines, its blue at 15 % behind.
registerDrawingType({ type: 'daterange', group: 'measure', label: 'Date Range', icon: DATE_RANGE_ICON, defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${TV_LINE_COLOR}26` }, create: (init) => new DateRange(init) });
// TradingView's price range: 2 px blue lines, its blue at 15 % behind.
registerDrawingType({ type: 'pricerange', group: 'measure', label: 'Price Range', icon: PRICE_RANGE_ICON, defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid', fillColor: `${TV_LINE_COLOR}26` }, create: (init) => new PriceRange(init) });
registerDrawingType({
    type: 'arrowmarker',
    group: 'shapes',
    label: 'Arrow Marker',
    icon: ARROW_MARKER_ICON,
    coversSeries: true, // a marker pointing at a candle reads over it, like TradingView's
    // TradingView's arrow marker: one color, its blue 600 (the outline and the fill).
    defaultStyle: { lineColor: '#1e53e5', lineWidth: 2, lineStyle: 'solid' }, // palette-exempt: TradingView's blue 600
    create: (init) => new ArrowMarker(init),
});
const lettered = { group: 'patterns' as const, coversSeries: true, defaultStyle: SOLID };
registerDrawingType({ type: 'trianglepattern', label: 'Triangle Pattern', icon: TRIANGLE_PATTERN_ICON, ...lettered, create: (init) => new TrianglePattern(init) });
registerDrawingType({ type: 'elliotttriangle', label: 'Elliott Triangle Wave (ABCDE)', icon: ELLIOTT_TRIANGLE_ICON, ...lettered, create: (init) => new ElliottTriangle(init) });
registerDrawingType({ type: 'elliottdoublecombo', label: 'Elliott Double Combo Wave (WXY)', icon: ELLIOTT_COMBO_ICON, ...lettered, create: (init) => new ElliottDoubleCombo(init) });
registerDrawingType({ type: 'elliotttriplecombo', label: 'Elliott Triple Combo Wave (WXYXZ)', icon: ELLIOTT_COMBO_ICON, ...lettered, create: (init) => new ElliottTripleCombo(init) });
const PROJECTION_ICON = svg24('<path d="M4 20 18 6a10 10 0 0 1 2 10Z"/>');
const FORECAST_ICON = svg24('<path d="M3 18c6 0 12-2 17-12"/><circle cx="3" cy="18" r="1.6"/><circle cx="20" cy="6" r="1.6"/>');
registerDrawingType({
    type: 'projection',
    group: 'measure',
    label: 'Projection',
    icon: PROJECTION_ICON,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid', fillColor: `${DEFAULT_DRAWING_COLOR}33` },
    create: (init) => new Projection(init),
});
registerDrawingType({
    type: 'forecast',
    group: 'measure',
    label: 'Forecast',
    icon: FORECAST_ICON,
    coversSeries: true, // its plates over the candles like TradingView's
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid' },
    create: (init) => new Forecast(init),
});
const BARS_PATTERN_ICON = svg24('<path d="M6 4v16M5 8h2v6H5zM12 6v12M11 9h2v5h-2zM18 3v14M17 6h2v7h-2z"/>');
registerDrawingType({
    type: 'barspattern',
    group: 'measure',
    label: 'Bars Pattern',
    icon: BARS_PATTERN_ICON,
    coversSeries: true, // the copy reads over the candles it is compared with
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new BarsPattern(init),
});
const GHOST_FEED_ICON = svg24('<path d="M5 7v10M4 10h2v4H4zM10 5v10M9 7h2v5H9zM15 9v10M14 11h2v5h-2zM20 4v10M19 6h2v5h-2z" stroke-dasharray="2 1.5"/>');
registerDrawingType({
    type: 'ghostfeed',
    group: 'measure',
    label: 'Ghost Feed',
    icon: GHOST_FEED_ICON,
    coversSeries: true,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'dashed' },
    create: (init) => new GhostFeed(init),
});
const ANCHORED_TEXT_ICON = svg24('<path d="M7 7h10M12 7v11"/><path d="M3 3h4M3 3v4M21 3h-4M21 3v4M3 21h4M3 21v-4M21 21h-4M21 21v-4"/>');
const ANCHORED_NOTE_ICON = svg24('<path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11Z"/><circle cx="12" cy="10" r="2"/><path d="M3 3h3M3 3v3M21 3h-3M21 3v3"/>');
registerDrawingType({
    type: 'anchoredtext',
    group: 'annotations',
    label: 'Anchored Text',
    icon: ANCHORED_TEXT_ICON,
    coversSeries: true,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new AnchoredText(init),
});
registerDrawingType({
    type: 'anchorednote',
    group: 'annotations',
    label: 'Anchored Note',
    icon: ANCHORED_NOTE_ICON,
    coversSeries: true,
    // TradingView's anchored note: the pin (Label) in its blue, like the note.
    defaultStyle: { lineColor: TV_LINE_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new AnchoredNote(init),
});
const TABLE_ICON = svg24('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 10h18M3 14.5h18M9 5v14M15 5v14"/>');
registerDrawingType({
    type: 'table',
    group: 'annotations',
    label: 'Table',
    icon: TABLE_ICON,
    coversSeries: true,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new TableDrawing({ text: { value: 'Level | Price\nHigh | \nLow | ', size: 'normal' } as never, ...init }),
});
const IMAGE_ICON = svg24('<rect x="3" y="5" width="18" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 3 3 3-4 5 6"/>');
registerDrawingType({
    type: 'image',
    group: 'annotations',
    label: 'Image',
    icon: IMAGE_ICON,
    coversSeries: true,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new ImageDrawing(init),
});
// The X logo (TradingView's "Post" tool).
const XPOST_ICON = svg24('<path d="M4 4l16 16M20 4 4 20" stroke-width="1.6"/>');
registerDrawingType({
    type: 'xpost',
    group: 'annotations',
    label: 'Post',
    icon: XPOST_ICON,
    coversSeries: true,
    defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 1, lineStyle: 'solid' },
    create: (init) => new XPostDrawing(init),
});
const DOUBLE_CURVE_ICON = svg24('<path d="M3 19C1 8 9 3 12 12s11 4 9-7"/>');
registerDrawingType({ type: 'doublecurve', group: 'shapes', label: 'Double Curve', icon: DOUBLE_CURVE_ICON, defaultStyle: { lineColor: DEFAULT_DRAWING_COLOR, lineWidth: 2, lineStyle: 'solid' }, create: (init) => new DoubleCurve(init) });
