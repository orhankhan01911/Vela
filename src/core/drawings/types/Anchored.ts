import type { DrawingPoint, Projector } from '../geometry';
import { Note } from './Note';
import { TextLabel } from './TextLabel';

/**
 * Screen pinning for TradingView's anchored text and anchored note: the point is kept as a fraction of the pane
 * (`fx`, `fy`), so it stays in place while the chart scrolls and zooms. The data point is re-derived from the fraction
 * on each layout; when the user has moved the drawing (its data point is not the one last derived), the fraction
 * follows the new point instead.
 */
export class ScreenPin {
    fx: number | null = null;
    fy: number | null = null;
    private last: DrawingPoint | null = null;

    resolve(anchors: DrawingPoint[], paneId: string, proj: Projector): void {
        const a = anchors[0];
        if (!a) return;
        const rect = proj.paneRect?.(paneId) ?? { top: 0, height: proj.height };
        // Before any layout (just loaded), a saved fraction wins over the saved data point.
        const moved = this.last ? this.last.time !== a.time || this.last.price !== a.price : this.fx == null;
        if (moved || this.fx == null || this.fy == null) {
            const y = proj.yOf(a.price, paneId);
            if (y == null || proj.width <= 0 || rect.height <= 0) return;
            this.fx = Math.min(1, Math.max(0, proj.xOf(a.time) / proj.width));
            this.fy = Math.min(1, Math.max(0, (y - rect.top) / rect.height));
        } else {
            const p = proj.pxToPoint(this.fx * proj.width, rect.top + this.fy * rect.height, paneId);
            anchors[0] = { time: p.time, price: p.price };
        }
        this.last = { ...anchors[0]! };
    }

    write(): Record<string, unknown> {
        return this.fx == null || this.fy == null ? {} : { fx: this.fx, fy: this.fy };
    }

    read(props: Record<string, unknown>): void {
        if (typeof props.fx === 'number' && Number.isFinite(props.fx)) this.fx = Math.min(1, Math.max(0, props.fx));
        if (typeof props.fy === 'number' && Number.isFinite(props.fy)) this.fy = Math.min(1, Math.max(0, props.fy));
    }
}

/** TradingView's anchored text: a text pinned to a place on the screen, not to a bar and price. */
export class AnchoredText extends TextLabel {
    // Widened so the table (a grid pinned the same way) can reuse it.
    override readonly type: 'anchoredtext' | 'table' = 'anchoredtext';
    // Created lazily: the base constructor runs readProps before subclass fields would initialize.
    private pinState?: ScreenPin;
    protected get pin(): ScreenPin {
        return (this.pinState ??= new ScreenPin());
    }

    override handlePoints(proj: Projector): Array<[number, number]> {
        this.pin.resolve(this.anchors, this.paneId, proj);
        return super.handlePoints(proj);
    }

    protected override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        this.pin.resolve(this.anchors, this.paneId, proj);
        return super.box(proj);
    }

    override timeExtent(): { min: number; max: number } | null {
        return null; // on screen whatever the time range
    }

    /** TradingView marks nothing on the axes for a text pinned to the screen (it has no bar or price). */
    override axisPoints(): DrawingPoint[] {
        return [];
    }

    protected override writeProps(): Record<string, unknown> | undefined {
        return { ...(super.writeProps() ?? {}), ...this.pin.write() };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        this.pin.read(props);
    }
}

/** TradingView's anchored note: a note pin fixed to a place on the screen. */
export class AnchoredNote extends Note {
    override readonly type = 'anchorednote' as const;
    private pinState?: ScreenPin;
    private get pin(): ScreenPin {
        return (this.pinState ??= new ScreenPin());
    }

    override handlePoints(proj: Projector): Array<[number, number]> {
        this.pin.resolve(this.anchors, this.paneId, proj);
        return super.handlePoints(proj);
    }

    protected override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        this.pin.resolve(this.anchors, this.paneId, proj);
        return super.box(proj);
    }

    override timeExtent(): { min: number; max: number } | null {
        return null;
    }

    /** TradingView marks nothing on the axes for a note pinned to the screen. */
    override axisPoints(): DrawingPoint[] {
        return [];
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), ...this.pin.write() };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        this.pin.read(props);
    }
}

/** Approximate px font size for a named text size (the painter measures the glyphs exactly). */
const TABLE_SIZE_PX: Record<string, number> = { tiny: 10, small: 12, normal: 14, large: 18, huge: 24, auto: 14 };

/**
 * TradingView's table: a grid of text pinned to a place on the screen. Its text is the content: each line a row,
 * `|` between cells. Background and border colors are the text tool's.
 */
export class TableDrawing extends AnchoredText {
    protected override tvLook(): boolean {
        return false;
    }

    override readonly type = 'table' as const;

    /** The cells, row by row (short rows padded so every row has as many cells as the widest). */
    cells(): string[][] {
        const rows = (this.text?.value ?? '').split('\n').slice(0, 50).map((r) => r.split('|').slice(0, 20).map((c) => c.trim()));
        const cols = Math.max(1, ...rows.map((r) => r.length));
        return rows.map((r) => [...r, ...Array.from({ length: cols - r.length }, () => '')]);
    }

    protected override box(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const pts = this.handlePoints(proj); // resolves the screen pin
        if (!pts.length) return null;
        const fs = TABLE_SIZE_PX[this.text?.size ?? 'normal'] ?? 14;
        const cells = this.cells();
        const widths = cells[0]!.map((_, c) => Math.max(...cells.map((r) => r[c]!.length)) * fs * 0.6 + 16);
        return { x: pts[0]![0], y: pts[0]![1], w: widths.reduce((a, b) => a + b, 0), h: cells.length * (fs * 1.4 + 8) };
    }
}
