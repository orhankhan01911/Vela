import type { VelaTheme } from '../../../core/options';
import type { Projector } from '../../../core/drawings';
import { rangeInfoLines } from '../../../core/drawings';
import { chevronArms } from './DrawingPainter';

/**
 * Decimals for a price change measured at `ref`: about five significant digits of the price, at least 2. EURUSD
 * (1.12) gets 5 (`0.00089`, not `0.00`), a JPY pair (150.1) 3, BTC (80,000) 2, a small coin (0.0305) 7.
 */
export function measureDecimals(ref: number): number {
    const a = Math.abs(ref);
    if (!(a > 0) || !Number.isFinite(a)) return 2;
    return Math.min(12, Math.max(2, 5 - Math.floor(Math.log10(a))));
}

/** Signed value with digit grouping (e.g. "+2,062.08", "-0.00089"). */
export function signed(n: number, decimals = 2): string {
    const body = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${n >= 0 ? '+' : '-'}${body}`;
}

// TradingView's ruler colours (module 649873): fixed, not the theme's candle colours, so it reads over any candles.
const UP_FILL = 'rgba(41, 98, 255, 0.2)'; // its blue 500 at 20 %
const DOWN_FILL = 'rgba(247, 82, 95, 0.2)'; // its ripe red 400 at 20 %
const UP_LINE = '#1E53E5'; // palette-exempt: TradingView's ruler line (blue 600)
const DOWN_LINE = '#F7525F'; // palette-exempt: TradingView's ruler line (ripe red 400)
const UP_LABEL = '#2962FF'; // palette-exempt: TradingView's ruler label (blue 500)
const DOWN_LABEL = '#F7525F'; // palette-exempt: TradingView's ruler label (ripe red 400)
const LABEL_TEXT = '#FFFFFF'; // palette-exempt: TradingView's ruler label text
const LABEL_FONT = 12;
const LABEL_GAP = 8;
const LABEL_PAD = 9;
const LABEL_RADIUS = 4;
const LABEL_OFFSET = 10;
/** A line gets its arrow once it is this long (px). */
const ARROW_MIN = 50;
const DRAG_SLOP = 3;

type MeasureState = 'idle' | 'measuring' | 'finished';

/**
 * The transient ruler — NOT a persistent drawing. Click to start,
 * move (no button) to size, click again to finish (or press-drag-release in one go);
 * it shows a direction-tinted box + a mid dashed crosshair + a directional arrow + a
 * label (Δprice/%, bars, duration), and is cleared on the next press / pan / zoom.
 *
 * Coordinates are kept in MEDIA PIXELS — the overlay never survives a viewport change
 * (it is cleared on pan/zoom), so it needs no reprojection; data values for the label
 * are read off the live projector at paint time.
 */
export class MeasureOverlay {
    private state: MeasureState = 'idle';
    private start: { x: number; y: number } | null = null;
    private end: { x: number; y: number } | null = null;
    private pressX = 0;
    private pressY = 0;

    isActive(): boolean {
        return this.state !== 'idle';
    }
    isFinished(): boolean {
        return this.state === 'finished';
    }

    /** A press: begin the measurement, or finish it on the second click.
     *  `x,y` are the raw cursor (drag-slop vs click-move-click). `gx,gy` are the
     *  graphic endpoints — magnet-snapped when the magnet is on, else the same as `x,y`. */
    down(x: number, y: number, gx = x, gy = y): void {
        if (this.state === 'measuring') {
            this.end = { x: gx, y: gy };
            this.state = 'finished';
            return;
        }
        this.start = { x: gx, y: gy };
        this.end = { x: gx, y: gy };
        this.pressX = x;
        this.pressY = y;
        this.state = 'measuring';
    }

    /** Size the in-progress ruler. `x,y` are the graphic (magnet-snapped) cursor. */
    move(x: number, y: number): void {
        if (this.state === 'measuring') this.end = { x, y };
    }

    /** A release: finish if the press was actually dragged (press-drag-release), else wait
     *  for the second click (click-move-click). `x,y` are the raw cursor (slop); `gx,gy`
     *  are the graphic end (magnet-snapped when the magnet is on). */
    up(x: number, y: number, gx = x, gy = y): void {
        if (this.state === 'measuring' && Math.hypot(x - this.pressX, y - this.pressY) > DRAG_SLOP) {
            this.end = { x: gx, y: gy };
            this.state = 'finished';
        }
    }

    /** Current graphic endpoints in media pixels, or null when idle. */
    points(): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
        if (!this.start || !this.end) return null;
        return { start: this.start, end: this.end };
    }

    clear(): void {
        this.state = 'idle';
        this.start = null;
        this.end = null;
    }

    /**
     * TradingView's ruler (module 649873, read 2026-10-30): a box from the start to the end at 20 % of its blue (up) or
     * red (down); a 1 px line across and one up and down through its middle, each with an open arrow at the end the
     * ruler was drawn to once it is 50 px long; and a solid label 10 px past the end, flipped inside the pane when it
     * would leave it. Its lines: `12.31 (0.31%) 1,231` (change, percent, change in ticks), `18 bars, 19h`, `Vol 391.14 K`.
     * `tick` is one step of the pane's price scale.
     */
    paint(ctx: CanvasRenderingContext2D, proj: Projector, theme: VelaTheme, tick: (paneId: string, price: number) => number = () => 0.01): void {
        if (!this.start || !this.end) return;
        const { x: x1, y: y1 } = this.start;
        const { x: x2, y: y2 } = this.end;
        const paneId = proj.paneIdAtY(y1) ?? proj.paneIdAtY(y2);
        if (!paneId) return;
        const p1 = proj.pxToPoint(x1, y1, paneId);
        const p2 = proj.pxToPoint(x2, y2, paneId);
        const down = p2.price < p1.price;
        const line = down ? DOWN_LINE : UP_LINE;
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);

        ctx.save();
        ctx.fillStyle = down ? DOWN_FILL : UP_FILL;
        ctx.fillRect(left, top, Math.abs(x2 - x1), Math.abs(y2 - y1));
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.lineCap = 'butt';
        // On the half pixel, so a 1 px line covers one device row instead of smearing over two.
        const cx = Math.round((x1 + x2) / 2) + 0.5;
        const cy = Math.round((y1 + y2) / 2) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x1, cy);
        ctx.lineTo(x2, cy);
        ctx.moveTo(cx, y1);
        ctx.lineTo(cx, y2);
        if (Math.abs(x2 - x1) >= ARROW_MIN) arrow(ctx, [x1, cy], [x2, cy]);
        if (Math.abs(y2 - y1) >= ARROW_MIN) arrow(ctx, [cx, y1], [cx, y2]);
        ctx.stroke();
        ctx.restore();

        const span = proj.barsBetween ? proj.barsBetween(p1.time, p2.time) : 0;
        const bars = p2.time < p1.time ? -span : span;
        const inRange = proj.barsInRange ? proj.barsInRange(Math.min(p1.time, p2.time), Math.max(p1.time, p2.time)) : [];
        // TradingView leaves the volume line out when any bar in the range has no volume.
        const volume = inRange.length > 0 && inRange.every((b) => b.volume != null) ? inRange.reduce((sum, b) => sum + (b.volume ?? 0), 0) : undefined;
        const all = { priceRange: true, percent: true, pips: true, bars: true, dateTime: true, volume: true };
        const lines = rangeInfoLines(all, p1, p2, { tick: tick(paneId, Math.max(Math.abs(p1.price), Math.abs(p2.price))), bars, volume });
        this.paintLabel(ctx, proj, theme, paneId, (x1 + x2) / 2, y1, y2, down ? DOWN_LABEL : UP_LABEL, lines);
    }

    /** The label (TradingView's text renderer: 12 px, 8 px between lines, 9 px padding, radius 4), placed by its
     *  calculateLabelPosition: past the end the ruler was drawn to, else on the other side, else pushed inside. */
    private paintLabel(ctx: CanvasRenderingContext2D, proj: Projector, theme: VelaTheme, paneId: string, midX: number, y1: number, y2: number, color: string, lines: string[]): void {
        if (lines.length === 0) return;
        ctx.save();
        ctx.font = `${LABEL_FONT}px ${theme.fontFamily}`;
        const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width)) + 2 * LABEL_PAD);
        const h = lines.length * LABEL_FONT + (lines.length - 1) * LABEL_GAP + 2 * LABEL_PAD;
        const pane = proj.paneRect?.(paneId) ?? { top: 0, height: proj.height };
        const half = h / 2;
        const reach = LABEL_OFFSET + half;
        const lo = Math.min(y1, y2) - pane.top;
        const hi = Math.max(y1, y2) - pane.top;
        let c: number;
        if (y1 > y2) {
            c = lo - reach;
            const over = half - c;
            if (over > 0) {
                const below = hi + reach;
                c = below + half <= pane.height ? below : c + over;
            }
        } else {
            c = hi + reach;
            const over = c + half - pane.height;
            if (over > 0) {
                const above = lo - reach;
                c = above - half >= 0 ? above : c - over;
            }
        }
        const x = Math.round(midX - w / 2);
        const y = Math.round(pane.top + c - half);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, LABEL_RADIUS);
        ctx.fill();
        ctx.fillStyle = LABEL_TEXT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tx = Math.round(midX);
        lines.forEach((l, i) => ctx.fillText(l, tx, Math.round(y + LABEL_PAD + LABEL_FONT / 2 + i * (LABEL_FONT + LABEL_GAP))));
        ctx.restore();
    }
}

/** An open arrow at `to` (the arms only; the caller strokes). */
function arrow(ctx: CanvasRenderingContext2D, from: [number, number], to: [number, number]): void {
    const arms = chevronArms(from, to, 1);
    if (!arms) return;
    ctx.moveTo(arms[0][0], arms[0][1]);
    ctx.lineTo(to[0], to[1]);
    ctx.lineTo(arms[1][0], arms[1][1]);
}
