/**
 * Renderer-agnostic user-drawings model. Nothing here imports from `renderers/`;
 * the renderer depends on this, never the reverse.
 */
export type { DrawingPoint, FreeAxis, Projector, SnapMode, SegmentGeometry } from './geometry';
export { resolveAnchors, translateInBars, readAnchor, writeAnchor, timeBetween, timeAfter, timePlusBars, type BarAxis, type FutureBars } from './futureAnchors';
export type { DrawingStyle, DrawingText } from './style';
export { defaultStyle, defaultText, DEFAULT_DRAWING_COLOR, textPx, TEXT_PX_SIZES, TV_LINE_COLOR } from './style';
export type { FieldKind, SettingsField, SettingsSchema } from './schema';
export { LINE_FIELDS, FILL_FIELDS, LINE_STYLE_OPTIONS, TEXT_FIELDS, TEXT_SIZE_OPTIONS } from './schema';
export { Drawing, setByPath, TV_TEXT_DEFAULTS, drawingTitle, DRAWING_TITLE_MAX } from './Drawing';
export { INTERVAL_UNITS, BAR_KIND_UNITS, barUnit, compactIntervals, defaultRange, shownOnBarMs, type BarKind, type IntervalRange, type IntervalUnit, type IntervalVisibility } from './intervals';
export type { DrawingTypeKey, AnchorSlot, SerializedDrawing, DrawingInputsDialog, DrawingToolbarAction } from './Drawing';
export { toolSettings, rememberToolSettings, clearToolSettings, type ToolSettings } from './toolMemory';
export { effectiveFillColor, VALID_FILL, INVALID_FILL, type EffectiveColorTheme } from './effectiveColor';
export { TrendLine } from './types/TrendLine';
export { HorizontalLine } from './types/HorizontalLine';
export { Ray } from './types/Ray';
export { TwoPointLine } from './types/TwoPointLine';
export { ExtendedLine } from './types/ExtendedLine';
export { VerticalLine } from './types/VerticalLine';
export { HorizontalRay } from './types/HorizontalRay';
export { CrossLine } from './types/CrossLine';
export { InfoLine } from './types/InfoLine';
export { CyclicLines, MAX_CYCLES } from './types/CyclicLines';
export { Projection } from './types/Projection';
export { AnchoredText, AnchoredNote, TableDrawing } from './types/Anchored';
export { ImageDrawing, safeImageUrl, checkImageFile, IMAGE_MAX_BYTES, IMAGE_MAX_SIDE, IMAGE_TYPES } from './types/ImageDrawing';
export { XPostDrawing, XPOST_W, XPOST_POSITION, toXPostCard, safeRelayPath, type XPostCard } from './types/XPostDrawing';
export { DoubleCurve } from './types/DoubleCurve';
export { GhostFeed, type GhostCandle } from './types/GhostFeed';
export { BarsPattern, type PatternBar } from './types/BarsPattern';
export { Forecast, type ForecastStatus } from './types/Forecast';
export { TimeCycles } from './types/TimeCycles';
export { SineLine } from './types/SineLine';
export { ArrowMarker, arrowMarkerStroke } from './types/ArrowMarker';
export { DateRange } from './types/DateRange';
export { PriceRange } from './types/PriceRange';
export { RANGE_PARTS, RANGE_LABEL, rangeInfoLines, formatRangeVolume, type RangeInfo, type RangePart, type RangeFacts } from './types/rangeInfo';
export { TrianglePattern } from './types/TrianglePattern';
export { ElliottTriangle, ElliottDoubleCombo, ElliottTripleCombo } from './types/ElliottCombo';
export { ELLIOTT_DEGREES, DEFAULT_DEGREE } from './types/elliottDegree';
export { statsOf, anyStats, lineStatsRows, formatSpan, ALL_STATS, NO_STATS, LINE_STATS_FIELDS, STATS_PARTS, type LineStats } from './types/lineStats';
export { TrendAngle } from './types/TrendAngle';
export { Box } from './types/Box';
export { PinnedLabel } from './types/PinnedLabel';
export { TextLabel } from './types/TextLabel';
export { Note, NOTE_PIN, TV_NOTE_PIN } from './types/Note';
export { PriceLabel } from './types/PriceLabel';
export { SegmentDrawing } from './types/SegmentDrawing';
export { ParallelChannel } from './types/ParallelChannel';
export { DisjointChannel } from './types/DisjointChannel';
export { FlatTopBottom } from './types/FlatTopBottom';
export { RegressionChannel, computeRegressionFit, type RegressionFit, type RegressionStyle, type RegressionLayout } from './types/RegressionChannel';
export { AnchoredVwap, computeVwap, type VwapPoint, type VwapStyle, type VwapLayout } from './types/AnchoredVwap';
export {
    FixedRangeVolumeProfile,
    AnchoredVolumeProfile,
    buildEstimatedProfile,
    computeFixedRangeProfile,
    type FrvpBar,
    type FrvpRow,
    type FrvpProfile,
    type FrvpStyle,
    type FrvpLayout,
    type FrvpCompute,
    type FrvpDevelopingPoint,
} from './types/FixedRangeVolumeProfile';
export {
    FixedRangeTpoProfile,
    buildTpoProfile,
    tpoLetter,
    type FrtpBar,
    type FrtpRow,
    type FrtpProfile,
    type FrtpStyle,
    type FrtpLayout,
} from './types/FixedRangeTpoProfile';
export { Pitchfork } from './types/Pitchfork';
export { PitchforkVariant } from './types/PitchforkVariant';
export { SchiffPitchfork } from './types/SchiffPitchfork';
export { ModifiedSchiffPitchfork } from './types/ModifiedSchiffPitchfork';
export { InsidePitchfork } from './types/InsidePitchfork';
export { Arrow } from './types/Arrow';
export { Ellipse } from './types/Ellipse';
export { Triangle } from './types/Triangle';
export { PathDrawing, MAX_PATH_POINTS } from './types/PathDrawing';
export { Polyline } from './types/Polyline';
export { Freehand, BrushStroke } from './types/Freehand';
export { Highlighter, HIGHLIGHTER_WIDTHS } from './types/Highlighter';
export { Circle } from './types/Circle';
export { RotatedRect } from './types/RotatedRect';
export { Path } from './types/Path';
export { Arc } from './types/Arc';
export { Curve } from './types/Curve';
export { ArrowMark, ArrowMarkUp, ArrowMarkDown } from './types/ArrowMark';
export { GlyphStamp, FlagMark, IconStamp, GLYPH_OPTIONS, STAMP_SIZE_OPTIONS } from './types/GlyphStamp';
export { FibRatios, type FibLevel, type FibTextSize, type FibEntryLine } from './types/FibRatios';
export { FibLevels, TV_FIB_FONT_SIZES, type FibLevelLine } from './types/FibLevels';
export { FibRetracement, TV_FIB_RETRACEMENT_LEVELS, TV_FIB_TREND_COLOR } from './types/FibRetracement';
export { FibExtension } from './types/FibExtension';
export { FibExtensionTrend } from './types/FibExtensionTrend';
export { FibFan, type FibFanLine } from './types/FibFan';
export { FibTimeZones, type FibZoneLine, TV_FIB_TIME_ZONE_LEVELS } from './types/FibTimeZones';
export { FibChannel } from './types/FibChannel';
export { FibSpeedFan } from './types/FibSpeedFan';
export { TrendFibTime } from './types/TrendFibTime';
export { RadialFib, type RadialGeom } from './types/RadialFib';
export { FibCircles } from './types/FibCircles';
export { FibArcs } from './types/FibArcs';
export { FibWedge } from './types/FibWedge';
export { FibSpiral } from './types/FibSpiral';
export { CalloutBase } from './types/CalloutBase';
export { Callout, CALLOUT_RADIUS, CALLOUT_MARGIN } from './types/Callout';
export { PriceNote } from './types/PriceNote';
export { Comment } from './types/Comment';
export { Signpost, SIGNPOST_R } from './types/Signpost';
export { GannFan } from './types/GannFan';
export { PitchforkBase, PITCHFORK_LEVELS, PITCHFORK_MEDIAN, PITCHFORK_STYLES, type PitchforkFrame, type PitchforkLevel, type PitchforkStyle } from './types/PitchforkBase';
export { GannBox } from './types/GannBox';
export { GannSquare, GANN_SQUARE_ARCS } from './types/GannSquare';
export {
    DedekindTessellation,
    isDedekindCenter,
    dedekindCentersInUnit,
    DEDEKIND_CURVATURE_OPTIONS,
    type DedekindBox,
    type DedekindGeom,
} from './types/DedekindTessellation';
export {
    MachFigure,
    Sonic,
    Supersonic,
    linearMachLevels,
    MACH_WAVE_COUNT_OPTIONS,
    MACH_NUMBER_OPTIONS,
    SHOW_RATIOS_FIELD,
    type MachCircle,
    type MachGeom,
} from './types/MachFigure';
export { GoldenSonic, GoldenSupersonic, GOLDEN_MACH_LEVELS } from './types/GoldenMach';
export { PatternDrawing } from './types/PatternDrawing';
export { XABCD } from './types/XABCD';
export { HarmonicPattern, type RatioBand, type HarmonicRanges } from './types/HarmonicPattern';
export { Gartley } from './types/Gartley';
export { Bat } from './types/Bat';
export { Butterfly } from './types/Butterfly';
export { Crab } from './types/Crab';
export { Shark } from './types/Shark';
export { Cypher } from './types/Cypher';
export { ABCDPattern } from './types/ABCDPattern';
export { ElliottImpulse } from './types/ElliottImpulse';
export { ElliottCorrection } from './types/ElliottCorrection';
export { HeadShoulders } from './types/HeadShoulders';
export { MeasureBox, formatDuration } from './types/MeasureBox';
export { DatePriceRange } from './types/DatePriceRange';
export { PositionTool, LongPositionTool, ShortPositionTool, DIRECTION_OPTIONS, type PositionLevelMode } from './types/PositionTool';
export { PriceAlert, ALERT_STUB_PX, defaultPriceAlertState, type PriceAlertState } from './types/PriceAlert';
export { Magnifier, MAGNIFIER_TIMEFRAME_OPTIONS, magnifierTimeframeLabel, type MagnifierStyle } from './types/Magnifier';
export type { DrawingSeriesBar, DrawingSeriesState, DrawingSeriesGateway } from './series';
export {
    registerDrawingType,
    getDrawingType,
    drawingTypes,
    createDrawing,
    resetDrawingSettings,
    deserializeDrawing,
    type DrawingTypeMeta,
} from './registry';
export { migrate, isValidSerialized, clonePlain, DRAWINGS_DOC_VERSION, type DrawingsDocument } from './document';
export { DrawingStore } from './DrawingStore';
export { DrawingHistory } from './DrawingHistory';
export * from './hittest';
export type { DrawingIntent, DrawingMode, IDrawingsRendererPort } from './port';
export {
    buildToolbar,
    defaultToolbar,
    type ToolDefinition,
    type ToolSection,
    type ToolGroup,
    type ToolbarDefinition,
    type ToolbarGroupConfig,
    type DrawingsOption,
} from './toolbar';
export { DrawingController, type AddInit } from './DrawingController';
export { SvgIcon, EmojiDrawing, IconDrawing, SVG_ICON_SIZE, SVG_ICON_MIN, ROTATE_ZONE_PX, SVG_ICON_FRAME, type HandleDragStart } from './types/SvgIcon';
export { EMOJI_GROUPS } from './assets/emojiGroups';
export { ICON_GROUPS, FA_GLYPHS } from './assets/faIcons';
export { setToolChoice, toolChoice } from './toolChoice';
