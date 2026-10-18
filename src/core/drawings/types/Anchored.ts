import type { DrawingPoint, Projector } from '../geometry';
import { Note } from './Note';
import { TextLabel } from './TextLabel';

/**
 * Screen pinning for TradingView's anchored text and anchored note: the point is kept as a fraction of the pane
 * (`fx`, `fy`), so it stays in place while the chart scrolls and zooms. The data point is re-derived from the fraction
 * on each layout; when the user has moved the drawing (its data point is not the one last derived), the fraction
 * follows the new point instead.
 */
class ScreenPin {
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
    override readonly type = 'anchoredtext' as const;
    // Created lazily: the base constructor runs readProps before subclass fields would initialize.
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
        return null; // on screen whatever the time range
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

    protected override writeProps(): Record<string, unknown> {
        return { ...super.writeProps(), ...this.pin.write() };
    }

    protected override readProps(props: Record<string, unknown>): void {
        super.readProps(props);
        this.pin.read(props);
    }
}
