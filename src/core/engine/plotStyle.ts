import type { IndicatorModel } from '../model/indicator';
import type { InputSchema, InputValue } from '../model/inputs';
import type { Background, Fill, PriceLine } from '../model/scene';
import { isLineLikeSeries, seriesShownOn, type LineLikeKind, type LineStyle, type SeriesDisplay, type SeriesSpec } from '../model/series';

/**
 * The settings dialog's "Style" tab for SCRIPT indicators, TradingView-style: one row per plot, level (hline) and fill
 * with a show/hide switch, a colour (when the output has a single one) and a line width (line-like plots and levels).
 *
 * The schema is read from a script run's RAW output, so each entry's `defval` is what the script itself draws and
 * "Reset defaults" goes back to it. {@link applyPlotStyle} then sets EVERY styled property from `override ?? defval`,
 * which makes it idempotent and reversible on the same model object: a style edit re-applies over the current model
 * without re-running the script, and turning an override off restores the script's own look.
 *
 * Keys are built from output titles (`plot:SMA`, `hline:Zero`, `fill:1`), so a saved style survives a re-run and a
 * code update that keeps the titles. Same-titled outputs are told apart by a `#2`, `#3` suffix in order.
 */

export const STYLE_TAB = 'Style';
const WIDTHS = ['1', '2', '3', '4'] as const;

/** TradingView's "Plot type" choices our renderer draws, as the dialog names them (label -> series kind). */
export const PLOT_KINDS: ReadonlyArray<readonly [string, LineLikeKind]> = [
    ['Line', 'line'],
    ['Step line', 'step'],
    ['Histogram', 'histogram'],
    ['Cross', 'cross'],
    ['Area', 'area'],
    ['Columns', 'columns'],
    ['Circles', 'circles'],
];
/** TradingView's Precision list: Default, then 0 to 8 decimals. */
export const PRECISIONS = ['Default', '0', '1', '2', '3', '4', '5', '6', '7', '8'] as const;
/** Group headings of TradingView's Style tab tail. */
export const OUTPUT_GROUP = 'Output values';
export const INPUT_GROUP = 'Input values';
/** Style-tab keys of the output / input value switches (not per plot). */
export const OUT_PRECISION = 'out.precision';
export const OUT_PRICE_LABELS = 'out.priceLabels';
export const OUT_STATUS_VALUES = 'out.statusValues';
export const IN_STATUS_INPUTS = 'in.statusInputs';
export const VISIBILITY_TAB = 'Visibility';

/** TradingView's Visibility tab: one row per timeframe unit, with the from-to range it allows. */
const VIS_UNITS: ReadonlyArray<[key: string, title: string, max: number]> = [
    ['ticks', 'Ticks', 0],
    ['seconds', 'Seconds', 59],
    ['minutes', 'Minutes', 59],
    ['hours', 'Hours', 24],
    ['days', 'Days', 366],
    ['weeks', 'Weeks', 52],
    ['months', 'Months', 12],
    ['ranges', 'Ranges', 0],
];

function visibilitySchema(): InputSchema[] {
    return VIS_UNITS.flatMap(([k, title, max]) => {
        const row = { tab: VISIBILITY_TAB, inline: `vis.${k}` };
        const on: InputSchema = { key: `vis.${k}`, title, type: 'bool', defval: true, ...row };
        if (max === 0) return [on];
        return [on, { key: `vis.${k}.from`, title: '', type: 'int', defval: 1, min: 1, max, step: 1, ...row }, { key: `vis.${k}.to`, title: '', type: 'int', defval: max, min: 1, max, step: 1, ...row }];
    });
}

/** The chart's timeframe as TradingView's unit + count, from the bar spacing. */
function intervalUnit(ms: number): [string, number] {
    const s = ms / 1000;
    if (s < 1) return ['ticks', 0];
    if (s < 60) return ['seconds', Math.round(s)];
    if (s < 3600) return ['minutes', Math.round(s / 60)];
    if (s < 86400) return ['hours', Math.round(s / 3600)];
    if (s < 7 * 86400) return ['days', Math.round(s / 86400)];
    if (s < 28 * 86400) return ['weeks', Math.round(s / (7 * 86400))];
    return ['months', Math.max(1, Math.round(s / (30.4 * 86400)))];
}

/** False when the Visibility tab hides the indicator on a chart whose bars are `intervalMs` apart. */
export function visibleOnInterval(values: Record<string, InputValue> | undefined, intervalMs: number): boolean {
    if (!values || !(intervalMs > 0)) return true;
    const [unit, count] = intervalUnit(intervalMs);
    if (values[`vis.${unit}`] === false) return false;
    if (count === 0) return true;
    const from = Number(values[`vis.${unit}.from`] ?? 1);
    const to = Number(values[`vis.${unit}.to`] ?? Number.POSITIVE_INFINITY);
    return !(Number.isFinite(from) && count < from) && !(Number.isFinite(to) && count > to);
}

type Kind = 'plot' | 'hline' | 'fill' | 'bg';

interface StyleTarget {
    kind: Kind;
    key: string;
    label: string;
    visible: boolean;
    color?: string;
    /** A gradient fill's bottom colour (its top colour is {@link color}). */
    color2?: string;
    width?: number;
    lineStyle?: LineStyle;
    plotKind?: LineLikeKind;
    /** A level's price (TradingView lets the user move it). */
    value?: number;
    /** A per-bar coloured output's colours (TradingView's "Color 0..n"), one swatch each. */
    palette?: string[];
}

/** Raw (script-drawn) copies of the parts a style edit removes or rewrites, per model object. */
interface RawParts {
    priceLines: PriceLine[];
    fills: Fill[];
    backgrounds: Background[];
    series: Map<SeriesSpec, { visible?: boolean; display?: SeriesDisplay; color?: string; single?: string; width?: number; lineStyle?: LineStyle; kind?: LineLikeKind; pointColors: boolean; rawColors?: Array<string | undefined> }>;
}
const RAW = new WeakMap<IndicatorModel, RawParts>();

function rawOf(model: IndicatorModel): RawParts {
    let raw = RAW.get(model);
    if (!raw) {
        raw = {
            priceLines: model.priceLines.map((l) => ({ ...l })),
            fills: model.fills.map((f) => ({ ...f })),
            backgrounds: model.backgrounds.slice(),
            series: new Map(),
        };
        for (const s of model.series) {
            const line = isLineLikeSeries(s) ? s : null;
            raw.series.set(s, {
                visible: s.visible,
                display: s.display ? { ...s.display } : undefined,
                color: line?.style.color,
                single: singleColor(s, line?.style.color),
                width: line?.style.width,
                lineStyle: line?.style.lineStyle,
                kind: line ? (s.kind as LineLikeKind) : undefined,
                pointColors: !!line?.points.some((p) => p.color !== undefined),
                ...(line && s.palette ? { rawColors: line.points.map((p) => p.color) } : {}),
            });
        }
        RAW.set(model, raw);
    }
    return raw;
}

/** The one colour a line-like plot draws with, or undefined when it changes per bar. */
function singleColor(spec: SeriesSpec, base: string | undefined): string | undefined {
    if (!isLineLikeSeries(spec)) return undefined;
    let c: string | undefined;
    for (const p of spec.points) {
        if (p.value === null) continue;
        const pc = p.color ?? base;
        if (pc === undefined) continue;
        if (c === undefined) c = pc;
        else if (pc !== c) return undefined;
    }
    return c ?? base;
}

/** A gradient fill whose stops all share one top and one bottom colour: those two colours (else undefined). */
function gradientPair(f: Fill): [string, string] | undefined {
    if (!f.gradient) return undefined;
    let pair: [string, string] | undefined;
    for (const g of f.gradient) {
        if (!g) continue;
        if (!pair) pair = [g.topColor, g.bottomColor];
        else if (pair[0] !== g.topColor || pair[1] !== g.bottomColor) return undefined;
    }
    return pair;
}

function keyer(): (base: string) => string {
    const seen = new Map<string, number>();
    return (base) => {
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        return n === 1 ? base : `${base}#${n}`;
    };
}

const PLOT_KIND_SET = new Set<string>(PLOT_KINDS.map(([, k]) => k));

function targetsOf(model: IndicatorModel): StyleTarget[] {
    const raw = rawOf(model);
    const out: StyleTarget[] = [];
    const key = keyer();
    let plotNo = 0;
    for (const s of model.series) {
        plotNo += 1;
        const r = raw.series.get(s);
        // A plot the script itself keeps off the pane (display.none, a fill anchor) is not a style choice, unless it
        // is listed unticked (`styleOff`), like TradingView's display.none plots.
        const shown = seriesShownOn({ visible: r?.visible, display: r?.display }, 'pane');
        if (!shown && !s.styleOff) continue;
        const label = s.title?.trim() || `Plot ${plotNo}`;
        const lineLike = isLineLikeSeries(s);
        out.push({
            kind: 'plot',
            key: key(`plot:${label}`),
            label,
            visible: shown,
            ...(s.palette ? { palette: [...s.palette] } : { color: r?.single }),
            width: lineLike ? r?.width ?? s.style.width : undefined,
            lineStyle: lineLike ? r?.lineStyle ?? 'solid' : undefined,
            plotKind: lineLike && r?.kind && PLOT_KIND_SET.has(r.kind) ? r.kind : undefined,
        });
    }
    raw.priceLines.forEach((l, i) => {
        const label = l.title?.trim() || `Level ${i + 1}`;
        out.push({ kind: 'hline', key: key(`hline:${label}`), label, visible: true, color: l.color, width: l.width ?? 1, lineStyle: l.lineStyle ?? 'solid', value: l.price });
    });
    raw.fills.forEach((f, i) => {
        const title = f.title?.trim();
        const pair = gradientPair(f);
        out.push({
            kind: 'fill',
            key: key(title ? `fill:${title}` : `fill:${i + 1}`),
            label: title || `Fill ${i + 1}`,
            visible: true,
            ...(f.palette && f.colors ? { palette: [...f.palette] } : { color: pair ? pair[0] : f.color }),
            ...(pair ? { color2: pair[1] } : {}),
        });
    });
    if (raw.backgrounds.length > 0) out.push({ kind: 'bg', key: 'bg', label: 'Background', visible: true });
    return out;
}

/** The Style-tab schema for a model fresh from the engine (call it BEFORE {@link applyPlotStyle}).
 *  Each output is one `inline` row: `<key>.visible` leads (the row's checkbox and label), then its colour(s), line
 *  width and style (the line button), plot type and a level's value. Output and input value switches follow. */
export function plotStyleSchema(model: IndicatorModel): InputSchema[] {
    const out: InputSchema[] = [];
    for (const t of targetsOf(model)) {
        const row = { inline: t.key, tab: STYLE_TAB };
        out.push({ key: `${t.key}.visible`, title: t.label, type: 'bool', defval: t.visible, ...row });
        if (t.color !== undefined) out.push({ key: `${t.key}.color`, title: '', type: 'color', defval: t.color, ...row });
        if (t.color2 !== undefined) out.push({ key: `${t.key}.color2`, title: '', type: 'color', defval: t.color2, ...row });
        t.palette?.forEach((c, i) => out.push({ key: `${t.key}.color.${i}`, title: '', type: 'color', defval: c, ...row }));
        if (t.width !== undefined) {
            const w = String(Math.min(4, Math.max(1, Math.round(t.width))));
            out.push({ key: `${t.key}.width`, title: '', type: 'int', defval: Number(w), options: WIDTHS, ...row });
        }
        if (t.lineStyle !== undefined) out.push({ key: `${t.key}.lineStyle`, title: '', type: 'string', defval: t.lineStyle, options: ['solid', 'dashed', 'dotted'], ...row });
        if (t.plotKind !== undefined) out.push({ key: `${t.key}.kind`, title: '', type: 'string', defval: t.plotKind, options: PLOT_KINDS.map(([, k]) => k), ...row });
        if (t.value !== undefined) out.push({ key: `${t.key}.value`, title: '', type: 'float', defval: t.value, ...row });
    }
    if (out.length === 0) return out;
    const tail = { tab: STYLE_TAB };
    out.push(
        { key: OUT_PRECISION, title: 'Precision', type: 'string', defval: 'Default', options: PRECISIONS, group: OUTPUT_GROUP, ...tail },
        { key: OUT_PRICE_LABELS, title: 'Labels on price scale', type: 'bool', defval: true, group: OUTPUT_GROUP, ...tail },
        { key: OUT_STATUS_VALUES, title: 'Values in status line', type: 'bool', defval: true, group: OUTPUT_GROUP, ...tail },
        { key: IN_STATUS_INPUTS, title: 'Inputs in status line', type: 'bool', defval: true, group: INPUT_GROUP, ...tail },
        ...visibilitySchema(),
    );
    return out;
}

function pick(values: Record<string, InputValue>, key: string): InputValue | undefined {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : undefined;
}

/** The precision a Style tab chose (`undefined` = Default). */
export function stylePrecision(values: Record<string, InputValue> | undefined): number | undefined {
    const v = values ? pick(values, OUT_PRECISION) : undefined;
    const n = typeof v === 'string' && v !== 'Default' ? Number(v) : typeof v === 'number' ? v : NaN;
    return Number.isInteger(n) && n >= 0 && n <= 8 ? n : undefined;
}

/** True unless the Style tab turned "Inputs in status line" off. */
export function styleShowsInputs(values: Record<string, InputValue> | undefined): boolean {
    const v = values ? pick(values, IN_STATUS_INPUTS) : undefined;
    return v === undefined ? true : Boolean(v);
}

/**
 * Apply style overrides onto a model in place. Every styled property is set from `override ?? script default`, so
 * calling it again with fewer overrides puts the script's own look back. Unknown keys are ignored.
 */
export function applyPlotStyle(model: IndicatorModel, values: Record<string, InputValue>, intervalMs = 0): void {
    const raw = rawOf(model);
    // Visibility tab: off on this timeframe hides every output (the same as unticking each one).
    if (!visibleOnInterval(values, intervalMs)) {
        const off: Record<string, InputValue> = { ...values };
        for (const t of targetsOf(model)) off[`${t.key}.visible`] = false;
        values = off;
    }
    const targets = targetsOf(model);
    const byKey = new Map(targets.map((t) => [t.key, t]));
    const visibleOf = (t: StyleTarget): boolean => {
        const v = pick(values, `${t.key}.visible`);
        return v === undefined ? t.visible : Boolean(v);
    };
    const colorOf = (t: StyleTarget, which: 'color' | 'color2' = 'color'): string | undefined => {
        const v = pick(values, `${t.key}.${which}`);
        return typeof v === 'string' && v ? v : t[which];
    };
    /** raw palette colour -> the colour the Style tab chose for that slot. */
    const paletteMap = (t: StyleTarget): Map<string, string> | undefined => {
        if (!t.palette) return undefined;
        const m = new Map<string, string>();
        t.palette.forEach((c, i) => {
            const v = pick(values, `${t.key}.color.${i}`);
            m.set(c, typeof v === 'string' && v ? v : c);
        });
        return m;
    };
    const widthOf = (t: StyleTarget): number | undefined => {
        const v = Number(pick(values, `${t.key}.width`));
        return Number.isFinite(v) && v > 0 ? v : t.width;
    };
    const lineStyleOf = (t: StyleTarget): LineStyle | undefined => {
        const v = pick(values, `${t.key}.lineStyle`);
        return v === 'solid' || v === 'dashed' || v === 'dotted' ? v : t.lineStyle;
    };
    const kindOf = (t: StyleTarget): LineLikeKind | undefined => {
        const v = pick(values, `${t.key}.kind`);
        return typeof v === 'string' && PLOT_KIND_SET.has(v) ? (v as LineLikeKind) : t.plotKind;
    };
    const valueOf = (t: StyleTarget): number | undefined => {
        const v = Number(pick(values, `${t.key}.value`));
        return pick(values, `${t.key}.value`) !== undefined && Number.isFinite(v) ? v : t.value;
    };
    const priceLabels = pick(values, OUT_PRICE_LABELS) !== false;
    const statusValues = pick(values, OUT_STATUS_VALUES) !== false;

    // Plots: flip the visibility flags (removing a series would break the fills anchored to it).
    const key = keyer();
    let plotNo = 0;
    for (const s of model.series) {
        plotNo += 1;
        const r = raw.series.get(s);
        if (!seriesShownOn({ visible: r?.visible, display: r?.display }, 'pane') && !s.styleOff) continue;
        const t = byKey.get(key(`plot:${s.title?.trim() || `Plot ${plotNo}`}`));
        if (!t) continue;
        if (visibleOf(t)) {
            // A `styleOff` plot ticked on: drawn everywhere (its raw display is the "off" one).
            s.visible = s.styleOff ? true : r?.visible;
            const d: SeriesDisplay = r?.display && !s.styleOff ? { ...r.display } : {};
            if (!priceLabels) d.priceScale = false;
            if (!statusValues) d.legend = false;
            if (Object.keys(d).length > 0) s.display = d;
            else delete s.display;
        } else if (s.styleOff && !t.visible) {
            // Left at its default (off): keep the script's own display (Ichimoku's Kumo lines stay in the data window).
            s.visible = r?.visible;
            if (r?.display) s.display = { ...r.display };
        } else {
            s.visible = false;
            s.display = { pane: false, priceScale: false, legend: false, dataWindow: false };
        }
        if (isLineLikeSeries(s)) {
            const c = colorOf(t);
            if (t.color !== undefined && c !== undefined) {
                s.style.color = c;
                if (r?.pointColors) for (const p of s.points) if (p.color !== undefined) p.color = c;
            }
            const pm = paletteMap(t);
            if (pm && r?.rawColors) {
                const rc = r.rawColors;
                s.points.forEach((p, j) => {
                    const c0 = rc[j];
                    if (c0 !== undefined) p.color = pm.get(c0) ?? c0;
                });
            }
            const w = widthOf(t);
            if (w !== undefined) s.style.width = w;
            const ls = lineStyleOf(t);
            if (ls !== undefined) s.style.lineStyle = ls;
            const k = kindOf(t);
            if (k !== undefined) (s as { kind: LineLikeKind }).kind = k;
        }
    }

    const ofKind = (kind: Kind): StyleTarget[] => targets.filter((t) => t.kind === kind);
    const hl = ofKind('hline');
    model.priceLines = raw.priceLines.flatMap((l, i) => {
        const t = hl[i];
        if (!t) return [{ ...l }];
        if (!visibleOf(t)) return [];
        return [{ ...l, color: colorOf(t) ?? l.color, width: widthOf(t) ?? l.width, lineStyle: lineStyleOf(t) ?? l.lineStyle, price: valueOf(t) ?? l.price }];
    });
    const fl = ofKind('fill');
    model.fills = raw.fills.flatMap((f, i) => {
        const t = fl[i];
        if (!t) return [{ ...f }];
        if (!visibleOf(t)) return [];
        if (t.color2 !== undefined && f.gradient) {
            const top = colorOf(t) ?? t.color!;
            const bottom = colorOf(t, 'color2') ?? t.color2;
            return [{ ...f, gradient: f.gradient.map((g) => (g ? { ...g, topColor: top, bottomColor: bottom } : g)) }];
        }
        const pm = paletteMap(t);
        if (pm && f.colors) return [{ ...f, colors: f.colors.map((c) => (c == null ? c : pm.get(c) ?? c)) }];
        return [t.color !== undefined ? { ...f, color: colorOf(t) ?? f.color } : { ...f }];
    });
    const bg = ofKind('bg')[0];
    model.backgrounds = bg && !visibleOf(bg) ? [] : raw.backgrounds.slice();
    const prec = stylePrecision(values);
    if (prec !== undefined) model.precision = prec;
    else delete model.precision;
}
