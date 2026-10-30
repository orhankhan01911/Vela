import type { VpvrProfile } from './profile';
import { CHART_FONT_FAMILY } from '../../../core/theme';

/** Row fill opacity inside / outside the value area when no value-area colours are given (the pre-TradingView
 *  look: one colour pair, dimmed outside the value area). */
export const VPVR_VA_ALPHA = 0.62;
export const VPVR_OUTSIDE_ALPHA = 0.28;
/** Opacity of the point-of-control row outline. */
export const VPVR_POC_ALPHA = 0.9;

/** Geometry the layer hands the painter (pane-resolved price→y + the profile's anchor edge). */
export interface VpvrGeom {
    /** Right pixel edge of the data area (rows hug this, extending left, when placed on the right). */
    rightX: number;
    /** Left pixel edge of the data area (rows grow right from it when placed on the left). */
    leftX?: number;
    /** Pixel width of the largest row (the profile's horizontal scale). */
    maxW: number;
    /** price → pixel y. */
    yOf(price: number): number;
}

export interface VpvrPaintStyle {
    upColor: string;
    downColor: string;
    /** Value-area row colours; absent = `upColor` / `downColor` drawn brighter inside the value area. */
    vaUpColor?: string;
    vaDownColor?: string;
    showPoc: boolean;
    /** Outline color for the POC row (the theme's text color). */
    pocColor: string;
    volumeMode?: 'updown' | 'total' | 'delta';
    placement?: 'right' | 'left';
    showProfile?: boolean;
    showValues?: boolean;
    valuesColor?: string;
    /** Font for the row values (the chart theme's family). */
    fontFamily?: string;
}

/** A volume as the row values show it: 1.25K, 3.4M, 2B. */
export function formatVpvrVolume(v: number): string {
    const a = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    const fmt = (x: number, unit: string): string => `${sign}${x >= 100 ? Math.round(x) : Number(x.toFixed(x >= 10 ? 1 : 2))}${unit}`;
    if (a >= 1e9) return fmt(a / 1e9, 'B');
    if (a >= 1e6) return fmt(a / 1e6, 'M');
    if (a >= 1e3) return fmt(a / 1e3, 'K');
    return fmt(a, '');
}

/**
 * Paint the visible-range volume profile: one horizontal row per price bucket, anchored to the right edge (or the
 * left, TradingView's "Placement"), length proportional to the row's volume relative to the largest row.
 * - "Up/Down": each row splits into an up segment (against the anchored edge) and a down segment beyond it.
 * - "Total": one segment in the up colour.
 * - "Delta": one segment of |up - down|, in the up colour when buying won and the down colour when selling did.
 * Rows inside the value area use the value-area colours. The POC row is outlined when asked (TradingView draws the
 * POC as a line instead, which the indicator emits). Pure: every coordinate comes from `geom`.
 */
export function paintVpvr(
    ctx: CanvasRenderingContext2D,
    profile: VpvrProfile,
    geom: VpvrGeom,
    style: VpvrPaintStyle,
): void {
    const { rows, rowH, maxTotal, poc, vaFrom, vaTo } = profile;
    const { rightX, maxW, yOf } = geom;
    const leftX = geom.leftX ?? 0;
    if (maxTotal <= 0 || maxW <= 0) return;
    const mode = style.volumeMode ?? 'updown';
    const left = style.placement === 'left';
    const vaColors = style.vaUpColor != null && style.vaDownColor != null;
    // Delta rows scale on the largest |delta|, the others on the largest total.
    let maxLen = maxTotal;
    if (mode === 'delta') {
        maxLen = 0;
        for (const r of rows) maxLen = Math.max(maxLen, Math.abs(r.up - r.down));
    }
    // The x of a segment `w` px long that starts `off` px in from the anchored edge.
    const seg = (off: number, w: number): number => (left ? leftX + off : rightX - off - w);

    const valueTexts: Array<{ text: string; y: number; x: number }> = [];
    if (style.showProfile !== false && maxLen > 0) {
        for (let k = 0; k < rows.length; k += 1) {
            const row = rows[k]!;
            const total = row.up + row.down;
            if (total <= 0) continue;
            const yTop = yOf(row.price + rowH);
            const h = Math.max(1, yOf(row.price) - yTop - 1); // 1px inter-row gap
            const inVa = k >= vaFrom && k <= vaTo;
            const up = vaColors && inVa ? style.vaUpColor! : style.upColor;
            const down = vaColors && inVa ? style.vaDownColor! : style.downColor;
            ctx.globalAlpha = vaColors ? 1 : inVa ? VPVR_VA_ALPHA : VPVR_OUTSIDE_ALPHA;
            let w: number;
            if (mode === 'total') {
                w = (total / maxLen) * maxW;
                ctx.fillStyle = up;
                ctx.fillRect(seg(0, w), yTop, w, h);
            } else if (mode === 'delta') {
                const d = row.up - row.down;
                w = (Math.abs(d) / maxLen) * maxW;
                if (w > 0) {
                    ctx.fillStyle = d >= 0 ? up : down;
                    ctx.fillRect(seg(0, w), yTop, w, h);
                }
            } else {
                // TradingView: up volume against the anchored edge, down volume beyond it
                w = (total / maxLen) * maxW;
                const upW = (row.up / total) * w;
                if (upW > 0) {
                    ctx.fillStyle = up;
                    ctx.fillRect(seg(0, upW), yTop, upW, h);
                }
                if (w - upW > 0) {
                    ctx.fillStyle = down;
                    ctx.fillRect(seg(upW, w - upW), yTop, w - upW, h);
                }
            }
            if (style.showValues && h >= 7) {
                const v = mode === 'delta' ? row.up - row.down : total;
                // the text starts where the row ends, reading away from the anchored edge
                valueTexts.push({ text: formatVpvrVolume(v), y: yTop + h / 2, x: left ? leftX + w + 3 : rightX - w - 3 });
            }
        }
    }

    if (valueTexts.length > 0) {
        const rowPx = Math.abs(yOf(rows[0]!.price) - yOf(rows[0]!.price + rowH));
        const size = Math.max(8, Math.min(11, Math.floor(rowPx - 2)));
        ctx.globalAlpha = 1;
        ctx.fillStyle = style.valuesColor ?? style.pocColor;
        ctx.font = `${size}px ${style.fontFamily ?? CHART_FONT_FAMILY}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = left ? 'left' : 'right';
        for (const t of valueTexts) ctx.fillText(t.text, t.x, t.y);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }

    if (style.showPoc) {
        const row = rows[poc]!;
        const yTop = yOf(row.price + rowH);
        const h = Math.max(1, yOf(row.price) - yTop - 1);
        ctx.globalAlpha = VPVR_POC_ALPHA;
        ctx.strokeStyle = style.pocColor;
        ctx.lineWidth = 1;
        ctx.strokeRect((left ? leftX : rightX - maxW) + 0.5, yTop + 0.5, maxW - 1, h);
    }
    ctx.globalAlpha = 1;
}
