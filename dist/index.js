export { registerBuiltinIndicators } from './chunk-VDGTUFVU.js';
export { BarStore, CachingDataFeed, DARK_THEME, DataControl, DrawingStore, DrawingToolbar, DrawingsControl, LIGHT_THEME, MarksControl, MultiProviderFeed, NativeRenderer, RendererControl, ReplayControl, SecondClock, TypedEventBus, Vela, buildToolbar, clearToolSettings, defaultToolbar, resolveTheme, sharedBarStore, toolSettings } from './chunk-RXJWCJ53.js';
export { BUILTIN_INTERVAL_ORDER, CONTEXT_MENU_BUILTIN_ORDER, DEFAULT_PANEL_MAX_WIDTH, DEFAULT_PANEL_MIN_WIDTH, DEFAULT_PANEL_WIDTH, Drawing, IMAGE_MAX_BYTES, IMAGE_MAX_SIDE, IMAGE_TYPES, OVERRIDABLE_TOPBAR_IDS, XPOST_POSITION, XPOST_W, activeIntervalSection, attachChromeTooltip, chartType, chartTypes, checkImageFile, chromeHint, clampPanelWidth, classicCatalog, classicPlots, createDrawing, deserializeDrawing, drawingTypes, getDrawingType, getNativeIndicator, inputDeltas, inputVisible, intervalSections, legendActions, legendCallouts, nativeIndicatorDescriptors, nativeIndicatorTypes, nativeInstanceCap, normalizeSettingsRow, notifyIntervalSectionsChanged, plotRightInset, registerChartType, registerDefaultEngine, registerDrawingType, registerInputMenu, registerIntervalSection, registerLegendAction, registerLegendCallout, registerNativeIndicator, registerPlotRightInset, registerRendererDefaults, registerRendererLayer, registerSettingsSection, registerSettingsTemplateMenu, registerSidePanel, registerStatePersistence, registerSymbolRanking, registerWidgetAction, registerWidgetAttachment, rendererDefaults, rendererLayers, replacesSeries, resolveEngines, seriesInScale, seriesShownOn, setNativeInstanceCap, settingsRowValueKeys, sidePanels, stableSeriesId, statePersistenceHandlers, symbolRanking, tickerModifierIds, timeframeToMs, toXPostCard, topbarActionOverride, unregisterChartType, unregisterDefaultEngine, unregisterIntervalSection, unregisterLegendAction, unregisterLegendCallout, unregisterNativeIndicator, unregisterRendererDefaults, unregisterRendererLayer, unregisterSettingsTemplateMenu, unregisterSidePanel, unregisterStatePersistence, unregisterWidgetAction, unregisterWidgetAttachment, widgetActions, widgetAttachments } from './chunk-6656AIP6.js';
import './chunk-BAWXEOUI.js';
export { ACCENT, ACCENT_BRIGHT, BEARISH, BULLISH, CATEGORICAL, CHIP_PLATE, CROSSHAIR, HIGHLIGHT, INFO, INVALID, MARKER, NEUTRAL, SERIES_LINE, SESSION_OFF, SESSION_POST, SESSION_PRE, SLATE, SLATE_DEEP, TRADE_EXIT, TRADE_LONG, TRADE_SHORT, TV_COLORS, VALID, WARNING, XPOST_DARK, XPOST_LIGHT, categoricalColor, iconMarkup, registerIcon } from './chunk-4YAXFTQI.js';

// src/core/replayTicks.ts
function lowerTimeframeTicks(chart, timeframe) {
  return async (bar, { end, signal }) => {
    const { symbol, session } = chart.market;
    const resolved = symbol ? chart.data.resolve(symbol) : null;
    const provider = resolved ? chart.data.providerInstance(resolved.provider) : void 0;
    if (!resolved || !provider) return [];
    const bars = await provider.getBars(resolved.ticker, timeframe, { from: bar.time, to: end - 1, ...session ? { session } : {} });
    if (signal.aborted) return [];
    return barsToTicks(bars.filter((b) => b.time >= bar.time && b.time < end));
  };
}
function barsToTicks(bars) {
  return bars.map((b) => ({
    price: b.close,
    open: b.open,
    high: b.high,
    low: b.low,
    ...b.volume === void 0 ? {} : { volume: b.volume }
  }));
}

export { barsToTicks, lowerTimeframeTicks };
