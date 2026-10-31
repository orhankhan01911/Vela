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
    /** Device pixel ratio: row edges snap to whole device pixels, as TradingView's do. */
    dpr?: number;
    /** Width of the box the values' font is sized against (the pane's data width). */
    boxW?: number;
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
    /** "line": one stepped outline along the rows' ends instead of the rows (see {@link paintVpvrLine}). */
    look?: 'bars' | 'line';
    lineUpColor?: string;
    lineDownColor?: string;
    lineWidth?: number;
    lineFill?: boolean;
}

/**
 * The stepped outline of a profile, anchored at `edge` and growing by `sign`: from the edge at the lowest row's bottom,
 * up each row's whole height at its total's length (a step, as Delta Dynamics draws it, user 2026-10-31), back to the
 * edge at the highest row's top. Each point carries whether buying won the row it belongs to (up > down). Pure.
 */
export function vpvrLinePoints(
    profile: Pick<VpvrProfile, 'rows' | 'rowH' | 'maxTotal'>,
    edge: number,
    sign: number,
    barMax: number,
    yOf: (price: number) => number,
): Array<{ x: number; y: number; up: boolean }> {
    const { rows, rowH, maxTotal } = profile;
    if (rows.length === 0 || maxTotal <= 0) return [];
    const pts: Array<{ x: number; y: number; up: boolean }> = [{ x: edge, y: yOf(rows[0]!.price), up: false }];
    for (const row of rows) {
        const x = edge + (sign * barMax * (row.up + row.down)) / maxTotal;
        const up = row.up > row.down;
        pts.push({ x, y: yOf(row.price), up }, { x, y: yOf(row.price + rowH), up });
    }
    const top = rows[rows.length - 1]!;
    pts.push({ x: edge, y: yOf(top.price + rowH), up: false });
    return pts;
}

/** The Line look: the outline, each piece in the colour of the row it runs into; optionally a faint fill under it. */
function paintVpvrLine(
    ctx: CanvasRenderingContext2D,
    pts: ReadonlyArray<{ x: number; y: number; up: boolean }>,
    style: VpvrPaintStyle,
): void {
    if (pts.length < 3) return;
    const up = style.lineUpColor ?? style.upColor;
    const down = style.lineDownColor ?? style.downColor;
    ctx.globalAlpha = 1;
    if (style.lineFill) {
        ctx.beginPath();
        ctx.moveTo(pts[0]!.x, pts[0]!.y);
        for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]!.x, pts[i]!.y);
        ctx.closePath();
        ctx.fillStyle = fadeColor(up, 0.12);
        ctx.fill();
    }
    ctx.lineWidth = style.lineWidth ?? 1;
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);
    // One path per run of the same colour: fewer strokes, no seams where pieces meet.
    let i = 1;
    while (i < pts.length - 1) {
        const color = pts[i]!.up ? up : down;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y);
        while (i < pts.length - 1 && (pts[i]!.up ? up : down) === color) {
            ctx.lineTo(pts[i]!.x, pts[i]!.y);
            i += 1;
        }
        ctx.strokeStyle = color;
        ctx.stroke();
    }
}

/** `color` with its opacity multiplied by `f` (hex #rgb / #rrggbb / #rrggbbaa, rgb() / rgba()); unknown forms as is. */
export function fadeColor(color: string, f: number): string {
    const c = color.trim();
    let r: number, g: number, b: number, a = 1;
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) {
        [r, g, b] = [...m[1]!].map((x) => parseInt(x + x, 16)) as [number, number, number];
    } else if ((m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c))) {
        r = parseInt(m[1]!.slice(0, 2), 16);
        g = parseInt(m[1]!.slice(2, 4), 16);
        b = parseInt(m[1]!.slice(4, 6), 16);
        if (m[2]) a = parseInt(m[2], 16) / 255;
    } else if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c))) {
        [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
        if (m[4] != null) a = Number(m[4]);
    } else {
        return color;
    }
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * f * 1000) / 1000})`;
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
    // Every mode scales on the largest row total (TradingView: a Delta row still spans the row's whole volume).
    const maxLen = maxTotal;
    // TradingView's HHistRenderer (module 379435): edges on whole device pixels; a gap of one CSS pixel between rows
    // only while rows are at least that tall; the longest row is the width less one pixel per segment; a segment
    // under half a pixel is skipped.
    const dpr = geom.dpr && geom.dpr > 0 ? geom.dpr : 1;
    const snap = (v: number): number => Math.round(v * dpr);
    const nSeg = mode === 'updown' ? 2 : mode === 'delta' ? 3 : 1;
    const barMax = Math.max(maxW - nSeg, 0);
    const rowPx = rows.length > 0 ? Math.abs(yOf(rows[0]!.price) - yOf(rows[0]!.price + rowH)) : 0;
    const gapDev = Math.floor(rowPx * dpr) >= dpr ? Math.floor(dpr) : 0;
    const edge = left ? leftX : rightX;
    const sign = left ? 1 : -1;

    if (style.look === 'line') {
        if (style.showProfile !== false) paintVpvrLine(ctx, vpvrLinePoints(profile, edge, sign, Math.max(maxW - 1, 0), yOf), style);
        ctx.globalAlpha = 1;
        return;
    }

    const valueTexts: Array<{ text: string; y: number; h: number }> = [];
    const sums: [number, number] = [0, 0];
    if (style.showProfile !== false && maxLen > 0) {
        for (let k = 0; k < rows.length; k += 1) {
            const row = rows[k]!;
            const total = row.up + row.down;
            if (total <= 0) continue;
            const yTop = yOf(row.price + rowH);
            const yBot = yOf(row.price);
            const top = snap(yTop);
            const hDev = Math.max(snap(yBot) - top - gapDev, 1);
            const inVa = k >= vaFrom && k <= vaTo;
            const up = vaColors && inVa ? style.vaUpColor! : style.upColor;
            const down = vaColors && inVa ? style.vaDownColor! : style.downColor;
            ctx.globalAlpha = vaColors ? 1 : inVa ? VPVR_VA_ALPHA : VPVR_OUTSIDE_ALPHA;
            // Segments out from the anchored edge (TradingView's HHistPaneView, module 217408):
            // - Up/Down: up, then down;
            // - Total: the total in the up colour;
            // - Delta: the winning side's colour (a tie counts as down): the difference at full strength, then the
            //   smaller side twice, at half and a quarter of that strength, so the row still spans its total.
            const upWins = row.up > row.down;
            const lo = Math.min(row.up, row.down);
            const dom = upWins ? up : down;
            const segs: Array<[number, string]> =
                mode === 'total'
                    ? [[total, up]]
                    : mode === 'delta'
                      ? [[Math.abs(row.up - row.down), dom], [lo, fadeColor(dom, 0.5)], [lo, fadeColor(dom, 0.25)]]
                      : [[row.up, up], [row.down, down]];
            let x = edge;
            for (const [v, color] of segs) {
                const x2 = x + sign * ((barMax * v) / maxLen);
                if (Math.abs(x2 - x) < 0.5) continue;
                const a = snap(Math.min(x, x2));
                const w = snap(Math.max(x, x2)) - a;
                x = x2;
                ctx.fillStyle = color;
                ctx.fillRect(a / dpr, top / dpr, w / dpr, hDev / dpr);
            }
            if (style.showValues) {
                // TradingView writes the sub-values in drawing order read from the left ("down × up" on the right),
                // and Delta's difference unsigned (the colour says which side won).
                const vals = mode === 'delta' ? [Math.abs(row.up - row.down)] : mode === 'total' ? [total] : left ? [row.up, row.down] : [row.down, row.up];
                valueTexts.push({ text: vals.map(formatVpvrVolume).join(' × '), y: yTop + 0.7 * (yBot - yTop), h: yBot - yTop });
                if (mode !== 'delta') {
                    sums[0] += vals[0]!;
                    if (vals[1] != null) sums[1] += vals[1];
                }
            }
        }
    }

    // Values: at the anchored edge, 3 px in, one font size for every row (the smallest that fits the longest text and
    // 60 % of a row); hidden below 7.5 px, as TradingView hides them.
    if (valueTexts.length > 0) {
        // Up/Down and Total also get a totals line under the lowest row (TradingView's addToTotalValue).
        if (mode !== 'delta') {
            const totalText = (mode === 'total' ? [sums[0]!] : sums).map(formatVpvrVolume).join(' × ');
            valueTexts.push({ text: totalText, y: yOf(rows[0]!.price) + 0.7 * rowPx, h: rowPx });
        }
        const boxW = geom.boxW ?? maxW;
        let size = Infinity;
        for (const t of valueTexts) size = Math.min(size, Math.round((1.7 * boxW) / t.text.length), Math.round(0.6 * t.h));
        if (size >= 7.5) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = style.valuesColor ?? style.pocColor;
            ctx.font = `${size}px ${style.fontFamily ?? CHART_FONT_FAMILY}`;
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = left ? 'left' : 'right';
            for (const t of valueTexts) ctx.fillText(t.text, edge + 3 * sign, t.y);
            ctx.textAlign = 'start';
        }
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
