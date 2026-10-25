import type { VelaTheme } from '../../../core/options';
import type { Projector } from '../../../core/drawings';
import { formatDuration } from '../../../core/drawings';

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

// TradingView's ruler colours (blue up, red down). Fixed, not the theme's candle colors: it must stay readable
// over candles of any user-chosen color.
const UP = '#2962ff';
const DOWN = '#f23645';
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

    paint(ctx: CanvasRenderingContext2D, proj: Projector, theme: VelaTheme): void {
        if (!this.start || !this.end) return;
        const { x: x1, y: y1 } = this.start;
        const { x: x2, y: y2 } = this.end;
        const paneId = proj.paneIdAtY(y1) ?? proj.paneIdAtY(y2);
        if (!paneId) return;
        const p1 = proj.pxToPoint(x1, y1, paneId);
        const p2 = proj.pxToPoint(x2, y2, paneId);
        const priceDiff = p2.price - p1.price;
        const pct = p1.price !== 0 ? (priceDiff / p1.price) * 100 : 0;
        const bars = proj.barsBetween ? Math.round(proj.barsBetween(p1.time, p2.time)) : null;
        const up = priceDiff >= 0;
        const color = up ? UP : DOWN;
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bot = Math.max(y1, y2);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = color;
        ctx.fillRect(left, top, right - left, bot - top);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        // solid center lines on the half pixel, so a 1 px line covers one device row instead of smearing over two
        const cx = Math.round(midX) + 0.5;
        const cy = Math.round(midY) + 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, y1);
        ctx.lineTo(cx, y2);
        ctx.moveTo(x1, cy);
        ctx.lineTo(x2, cy);
        ctx.stroke();
        // a filled arrow at the destination edge, pointing the way price moved
        const ay = up ? top : bot;
        const dir = up ? 1 : -1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(midX, ay);
        ctx.lineTo(midX - 5, ay + dir * 7);
        ctx.lineTo(midX + 5, ay + dir * 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        const dec = measureDecimals(p1.price);
        this.paintLabel(ctx, proj, theme, midX, top, bot, up, color, [
            `${signed(priceDiff, dec)} (${signed(pct)}%)`,
            bars != null ? `${bars} bars, ${formatDuration(p2.time - p1.time)}` : formatDuration(p2.time - p1.time),
        ]);
    }

    /**
     * TradingView's label: a solid box in the ruler's colour with white text, past the end the price moved to (above
     * the box going up, below it going down), flipped to the other side when it would leave the pane. Whole-pixel
     * positions so the text stays sharp.
     */
    private paintLabel(
        ctx: CanvasRenderingContext2D,
        proj: Projector,
        theme: VelaTheme,
        midX: number,
        boxTop: number,
        boxBot: number,
        up: boolean,
        color: string,
        lines: string[],
    ): void {
        ctx.save();
        ctx.font = `500 13px ${theme.fontFamily}`;
        const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20);
        const lh = 18;
        const h = lines.length * lh + 8;
        const above = Math.round(boxTop - h - 8);
        const below = Math.round(boxBot + 8);
        let y = up ? above : below;
        if (y < 0) y = below;
        else if (y + h > proj.height) y = above;
        const x = Math.round(midX - w / 2);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tx = Math.round(midX);
        lines.forEach((line, i) => ctx.fillText(line, tx, Math.round(y + 4 + lh / 2 + i * lh)));
        ctx.restore();
    }
}
