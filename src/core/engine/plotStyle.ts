import type { IndicatorModel } from '../model/indicator';
import type { InputSchema, InputValue } from '../model/inputs';
import type { Background, Fill, PriceLine } from '../model/scene';
import { isLineLikeSeries, seriesShownOn, type SeriesDisplay, type SeriesSpec } from '../model/series';

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

type Kind = 'plot' | 'hline' | 'fill' | 'bg';

interface StyleTarget {
    kind: Kind;
    key: string;
    label: string;
    group: string;
    visible: boolean;
    color?: string;
    width?: number;
}

/** Raw (script-drawn) copies of the parts a style edit removes or rewrites, per model object. */
interface RawParts {
    priceLines: PriceLine[];
    fills: Fill[];
    backgrounds: Background[];
    series: Map<SeriesSpec, { visible?: boolean; display?: SeriesDisplay; color?: string; single?: string; width?: number; pointColors: boolean }>;
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
                pointColors: !!line?.points.some((p) => p.color !== undefined),
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

function keyer(): (base: string) => string {
    const seen = new Map<string, number>();
    return (base) => {
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        return n === 1 ? base : `${base}#${n}`;
    };
}

function targetsOf(model: IndicatorModel): StyleTarget[] {
    const raw = rawOf(model);
    const out: StyleTarget[] = [];
    const key = keyer();
    let plotNo = 0;
    for (const s of model.series) {
        plotNo += 1;
        const r = raw.series.get(s);
        // A plot the script itself keeps off the pane (display.none, a fill anchor) is not a style choice.
        if (!seriesShownOn({ visible: r?.visible, display: r?.display }, 'pane')) continue;
        const label = s.title?.trim() || `Plot ${plotNo}`;
        out.push({
            kind: 'plot',
            key: key(`plot:${label}`),
            label,
            group: 'Plots',
            visible: true,
            color: r?.single,
            width: isLineLikeSeries(s) ? r?.width ?? s.style.width : undefined,
        });
    }
    raw.priceLines.forEach((l, i) => {
        const label = l.title?.trim() || `Level ${i + 1}`;
        out.push({ kind: 'hline', key: key(`hline:${label}`), label, group: 'Levels', visible: true, color: l.color, width: l.width ?? 1 });
    });
    raw.fills.forEach((f, i) => {
        out.push({ kind: 'fill', key: key(`fill:${i + 1}`), label: `Fill ${i + 1}`, group: 'Fills', visible: true, color: f.color });
    });
    if (raw.backgrounds.length > 0) out.push({ kind: 'bg', key: 'bg', label: 'Background', group: 'Fills', visible: true });
    return out;
}

/** The Style-tab schema for a model fresh from the engine (call it BEFORE {@link applyPlotStyle}). */
export function plotStyleSchema(model: IndicatorModel): InputSchema[] {
    const out: InputSchema[] = [];
    for (const t of targetsOf(model)) {
        out.push({ key: `${t.key}.visible`, title: t.label, type: 'bool', defval: t.visible, group: t.group, inline: t.key, tab: STYLE_TAB });
        if (t.color !== undefined) out.push({ key: `${t.key}.color`, title: '', type: 'color', defval: t.color, group: t.group, inline: t.key, tab: STYLE_TAB });
        if (t.width !== undefined) {
            const w = String(Math.min(4, Math.max(1, Math.round(t.width))));
            out.push({ key: `${t.key}.width`, title: '', type: 'int', defval: Number(w), options: WIDTHS, group: t.group, inline: t.key, tab: STYLE_TAB });
        }
    }
    return out;
}

function pick(values: Record<string, InputValue>, key: string): InputValue | undefined {
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : undefined;
}

/**
 * Apply style overrides onto a model in place. Every styled property is set from `override ?? script default`, so
 * calling it again with fewer overrides puts the script's own look back. Unknown keys are ignored.
 */
export function applyPlotStyle(model: IndicatorModel, values: Record<string, InputValue>): void {
    const raw = rawOf(model);
    const targets = targetsOf(model);
    const byKey = new Map(targets.map((t) => [t.key, t]));
    const visibleOf = (t: StyleTarget): boolean => {
        const v = pick(values, `${t.key}.visible`);
        return v === undefined ? t.visible : Boolean(v);
    };
    const colorOf = (t: StyleTarget): string | undefined => {
        const v = pick(values, `${t.key}.color`);
        return typeof v === 'string' && v ? v : t.color;
    };
    const widthOf = (t: StyleTarget): number | undefined => {
        const v = Number(pick(values, `${t.key}.width`));
        return Number.isFinite(v) && v > 0 ? v : t.width;
    };

    // Plots: flip the visibility flags (removing a series would break the fills anchored to it).
    const key = keyer();
    let plotNo = 0;
    for (const s of model.series) {
        plotNo += 1;
        const r = raw.series.get(s);
        if (!seriesShownOn({ visible: r?.visible, display: r?.display }, 'pane')) continue;
        const t = byKey.get(key(`plot:${s.title?.trim() || `Plot ${plotNo}`}`));
        if (!t) continue;
        if (visibleOf(t)) {
            s.visible = r?.visible;
            if (r?.display) s.display = { ...r.display };
            else delete s.display;
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
            const w = widthOf(t);
            if (w !== undefined) s.style.width = w;
        }
    }

    const ofKind = (kind: Kind): StyleTarget[] => targets.filter((t) => t.kind === kind);
    const hl = ofKind('hline');
    model.priceLines = raw.priceLines.flatMap((l, i) => {
        const t = hl[i];
        if (!t) return [{ ...l }];
        if (!visibleOf(t)) return [];
        return [{ ...l, color: colorOf(t) ?? l.color, width: widthOf(t) ?? l.width }];
    });
    const fl = ofKind('fill');
    model.fills = raw.fills.flatMap((f, i) => {
        const t = fl[i];
        if (!t) return [{ ...f }];
        if (!visibleOf(t)) return [];
        return [t.color !== undefined ? { ...f, color: colorOf(t) ?? f.color } : { ...f }];
    });
    const bg = ofKind('bg')[0];
    model.backgrounds = bg && !visibleOf(bg) ? [] : raw.backgrounds.slice();
}
