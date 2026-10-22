import type { VelaTheme } from '../../../core/options';
import type { IndicatorModel } from '../../../core/model/indicator';
import { isLineLikeSeries } from '../../../core/model/series';
import type { CoordinateSystem } from '../core/CoordinateSystem';
import type { SceneGraph, PaneNode } from '../core/SceneGraph';
import { paneAxisTicks, formatAxisValue } from './ticks';
import { LEFT_SCALE_COL_W, PANE_SEPARATOR_PX } from './axisLayout';
import { tagTextColor } from './contrast';
import { BEARISH, BULLISH } from '../../../core/palette';

/**
 * The left price scale (TradingView's "new left scale"): an indicator merged into another pane keeps its own values,
 * read on a column left of the plot, one column per merged indicator of the busiest pane (column 0 nearest the data).
 * Each column shows the indicator's ticks, its latest value as a tag in its colour, and the crosshair value while the
 * cursor is over that pane. It is its own canvas in the gap the renderer reserves left of the plot, so the plot's
 * coordinates (pointer, drawings, layers) stay 0-based and nothing inside it moves.
 */
export class LeftScaleColumn {
    readonly el: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D | null;
    private width = 0;
    private height = 0;
    private dpr = 1;

    constructor() {
        this.el = document.createElement('canvas');
        this.el.className = 'vela-left-scale';
        Object.assign(this.el.style, { position: 'absolute', top: '0', left: '0', display: 'none', cursor: 'ns-resize', touchAction: 'none' });
        this.ctx = this.el.getContext('2d');
    }

    /** Place the column (CSS px, wrapper coordinates). A zero width hides it. */
    setBox(left: number, width: number, height: number, dpr: number): void {
        this.el.style.left = `${left}px`;
        if (width <= 0 || height <= 0) {
            this.el.style.display = 'none';
            this.width = 0;
            return;
        }
        const bw = Math.max(1, Math.round(width * dpr));
        const bh = Math.max(1, Math.round(height * dpr));
        if (this.el.width !== bw || this.el.height !== bh) {
            this.el.width = bw;
            this.el.height = bh;
        }
        this.el.style.width = `${bw / dpr}px`;
        this.el.style.height = `${bh / dpr}px`;
        this.el.style.display = '';
        this.width = bw / dpr;
        this.height = bh / dpr;
        this.dpr = dpr;
    }

    get visible(): boolean {
        return this.width > 0;
    }

    /** Which merged indicator a point in the column belongs to (column from the plot edge, then the pane by y). */
    hit(scene: SceneGraph, x: number, y: number): { pane: PaneNode; model: IndicatorModel } | null {
        if (!this.visible) return null;
        const k = Math.floor((this.width - x) / LEFT_SCALE_COL_W);
        for (const pane of scene.orderedPanes()) {
            if (pane.collapsed || y < pane.bounds.top || y > pane.bounds.top + pane.bounds.height) continue;
            const model = scene.ownScaleIndicatorsForPane(pane.id)[k];
            return model ? { pane, model } : null;
        }
        return null;
    }

    paint(scene: SceneGraph, coords: CoordinateSystem, theme: VelaTheme, surface: { background: string; textColor: string }): void {
        const ctx = this.ctx;
        if (!ctx || !this.visible) return;
        const W = this.width;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, W, this.height);
        ctx.fillStyle = surface.background;
        ctx.fillRect(0, 0, W, this.height);
        const fs = scene.style.fontSize;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        const ch = scene.crosshair;
        for (const pane of scene.orderedPanes()) {
            if (pane.collapsed) continue;
            const top = pane.bounds.top;
            const bottom = top + pane.bounds.height;
            scene.ownScaleIndicatorsForPane(pane.id).forEach((model, k) => {
                const sc = scene.indicatorScales.get(model.id)?.scale;
                if (!sc) return;
                const right = W - k * LEFT_SCALE_COL_W; // the column's edge nearest the data
                const format = valueFormat(model, sc);
                ctx.font = `${fs}px ${theme.fontFamily}`;
                ctx.fillStyle = surface.textColor;
                for (const t of paneAxisTicks(sc, pane.bounds.height, undefined, scene.priceMintick)) {
                    const y = coords.priceToY(t.price, sc, pane.bounds);
                    if (y < top + 6 || y > bottom - 4) continue;
                    ctx.fillText(format === 'volume' ? formatAxisValue(sc, pane.bounds.height, t.price, undefined, undefined, 'volume') : t.label, right - 6, y);
                }
                ctx.font = `600 ${fs}px ${theme.fontFamily}`;
                // latest-value tags: one per line that asks for a tag (CVD by Exchange: one per venue, pushed apart),
                // else the indicator's latest value. Values only: a name would not fit the column.
                const tags = latestValues(model)
                    .map((t) => ({ ...t, y: coords.priceToY(t.value, sc, pane.bounds) }))
                    .filter((t) => t.y >= top && t.y <= bottom)
                    .sort((a, b) => a.y - b.y);
                for (let i = 0; i < tags.length; i++) tags[i]!.y = Math.max(tags[i]!.y, i ? tags[i - 1]!.y + TAG_H + 1 : top + TAG_H / 2);
                for (let i = tags.length - 1; i >= 0; i--) tags[i]!.y = Math.min(tags[i]!.y, i < tags.length - 1 ? tags[i + 1]!.y - TAG_H - 1 : bottom - TAG_H / 2);
                for (const t of tags) this.tag(ctx, right, t.y, formatAxisValue(sc, pane.bounds.height, t.value, undefined, scene.priceMintick, format), t.color, theme.background);
                if (ch && ch.y >= top && ch.y <= bottom) {
                    const v = coords.yToPrice(ch.y, sc, pane.bounds);
                    const bg = scene.style.crosshair.labelBackground ?? theme.borderColor;
                    this.tag(ctx, right, clampY(ch.y, top, bottom), formatAxisValue(sc, pane.bounds.height, v, undefined, scene.priceMintick, format), bg, theme.background);
                }
            });
            // the pane separators run on through the column, so the panes read as one row each
            if (pane.order > 0) {
                ctx.fillStyle = scene.style.separatorColor ?? theme.borderColor;
                ctx.fillRect(0, Math.round(top) - 1, W, PANE_SEPARATOR_PX);
            }
        }
        ctx.textAlign = 'start';
    }

    private tag(ctx: CanvasRenderingContext2D, right: number, y: number, text: string, color: string, over: string): void {
        if (!text) return;
        const H = TAG_H;
        const w = Math.min(LEFT_SCALE_COL_W - 2, ctx.measureText(text).width + 8);
        ctx.fillStyle = color;
        ctx.fillRect(right - w - 1, Math.round(y - H / 2), w, H);
        ctx.fillStyle = tagTextColor(color, over);
        ctx.fillText(text, right - 5, y);
    }
}

const TAG_H = 15;

/** The tags a merged indicator shows: every shown line that asks for one (`axisTag`), else its latest value. */
export function latestValues(model: IndicatorModel): Array<{ value: number; color: string }> {
    const tagged: Array<{ value: number; color: string }> = [];
    for (const s of model.series) {
        if (!isLineLikeSeries(s) || !s.axisTag || s.visible === false) continue;
        for (let i = s.points.length - 1; i >= 0; i--) {
            const v = s.points[i]?.value;
            if (v != null && Number.isFinite(v)) {
                tagged.push({ value: v, color: s.style.color });
                break;
            }
        }
    }
    if (tagged.length) return tagged;
    const last = latestValue(model);
    return last ? [last] : [];
}

function clampY(y: number, top: number, bottom: number): number {
    return Math.max(top + 8, Math.min(bottom - 8, y));
}

/** Compact labels (1.43K, 327.5M) for a compact indicator or one whose values are too long for the column. */
export function valueFormat(model: IndicatorModel, sc: { min: number; max: number }): 'volume' | undefined {
    if (model.paneAxis === 'compact') return 'volume';
    return Math.max(Math.abs(sc.min), Math.abs(sc.max)) >= 10_000 ? 'volume' : undefined;
}

/** The indicator's latest value and its colour: its first shown line, else its candles' last close. */
export function latestValue(model: IndicatorModel): { value: number; color: string } | null {
    for (const s of model.series) {
        if (s.visible === false || s.overlay === true) continue;
        if (isLineLikeSeries(s)) {
            for (let i = s.points.length - 1; i >= 0; i--) {
                const v = s.points[i]?.value;
                if (v != null && Number.isFinite(v)) return { value: v, color: s.points[i]?.color ?? s.style.color };
            }
        } else if (s.kind === 'candle' || s.kind === 'bar') {
            for (let i = s.bars.length - 1; i >= 0; i--) {
                const b = s.bars[i];
                if (!b || !Number.isFinite(b.close)) continue;
                const up = b.close >= b.open;
                const color = s.barColors?.[i]?.color ?? (up ? s.style?.up : s.style?.down) ?? (up ? BULLISH : BEARISH);
                return { value: b.close, color };
            }
        }
    }
    return null;
}
