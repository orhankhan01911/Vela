/**
 * Renderer-agnostic user-drawings model. Nothing here imports from `renderers/`;
 * the renderer depends on this, never the reverse.
 */
export type { DrawingPoint, FreeAxis, Projector, SnapMode, SegmentGeometry } from './geometry';
export type { DrawingStyle, DrawingText } from './style';
export { defaultStyle, defaultText, DEFAULT_DRAWING_COLOR } from './style';
export type { FieldKind, SettingsField, SettingsSchema } from './schema';
export { LINE_FIELDS, FILL_FIELDS, LINE_STYLE_OPTIONS, TEXT_FIELDS, TEXT_SIZE_OPTIONS } from './schema';
export { Drawing, setByPath } from './Drawing';
export { INTERVAL_UNITS, barUnit, compactIntervals, defaultRange, shownOnBarMs, type IntervalRange, type IntervalUnit, type IntervalVisibility } from './intervals';
export type { DrawingTypeKey, AnchorSlot, SerializedDrawing } from './Drawing';
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
export { AnchoredText, AnchoredNote } from './types/Anchored';
export { GhostFeed, type GhostCandle } from './types/GhostFeed';
export { BarsPattern, type PatternBar } from './types/BarsPattern';
export { Forecast, type ForecastStatus } from './types/Forecast';
export { TimeCycles } from './types/TimeCycles';
export { SineLine } from './types/SineLine';
export { ArrowMarker } from './types/ArrowMarker';
export { DateRange } from './types/DateRange';
export { PriceRange } from './types/PriceRange';
export { TrianglePattern } from './types/TrianglePattern';
export { ElliottTriangle, ElliottDoubleCombo, ElliottTripleCombo } from './types/ElliottCombo';
export { ELLIOTT_DEGREES, DEFAULT_DEGREE } from './types/elliottDegree';
export { statsOf, anyStats, lineStatsRows, formatSpan, ALL_STATS, NO_STATS, LINE_STATS_FIELDS, type LineStats } from './types/lineStats';
export { TrendAngle } from './types/TrendAngle';
export { Box } from './types/Box';
export { PinnedLabel } from './types/PinnedLabel';
export { TextLabel } from './types/TextLabel';
export { Note, NOTE_PIN } from './types/Note';
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
export { Highlighter } from './types/Highlighter';
export { Circle } from './types/Circle';
export { RotatedRect } from './types/RotatedRect';
export { Path } from './types/Path';
export { Arc } from './types/Arc';
export { Curve } from './types/Curve';
export { ArrowMark, ArrowMarkUp, ArrowMarkDown } from './types/ArrowMark';
export { GlyphStamp, FlagMark, IconStamp, GLYPH_OPTIONS, STAMP_SIZE_OPTIONS } from './types/GlyphStamp';
export { FibRatios, type FibLevel, type FibTextSize, type FibEntryLine } from './types/FibRatios';
export { FibLevels, type FibLevelLine } from './types/FibLevels';
export { FibRetracement } from './types/FibRetracement';
export { FibExtension } from './types/FibExtension';
export { FibExtensionTrend } from './types/FibExtensionTrend';
export { FibFan, type FibFanLine } from './types/FibFan';
export { FibTimeZones, type FibZoneLine } from './types/FibTimeZones';
export { FibChannel } from './types/FibChannel';
export { FibSpeedFan } from './types/FibSpeedFan';
export { TrendFibTime } from './types/TrendFibTime';
export { RadialFib, type RadialGeom } from './types/RadialFib';
export { FibCircles } from './types/FibCircles';
export { FibArcs } from './types/FibArcs';
export { FibWedge } from './types/FibWedge';
export { FibSpiral } from './types/FibSpiral';
export { CalloutBase } from './types/CalloutBase';
export { Callout } from './types/Callout';
export { PriceNote } from './types/PriceNote';
export { Comment } from './types/Comment';
export { Signpost, SIGNPOST_R } from './types/Signpost';
export { GannFan } from './types/GannFan';
export { PitchforkBase, PITCHFORK_LEVELS, PITCHFORK_MEDIAN, type PitchforkFrame } from './types/PitchforkBase';
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
export { PositionTool, DIRECTION_OPTIONS, type PositionLevelMode } from './types/PositionTool';
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
