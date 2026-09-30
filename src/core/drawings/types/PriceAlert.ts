import { Drawing, type AnchorSlot } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { handleAt } from '../hittest';

/** Per-alert state carried in the drawing's `props` (host-owned, painter-read). */
export interface PriceAlertState {
    /** Text shown in the hover pill before the price, e.g. `BTCUSDT Crossing`. */
    label: string;
    /** Host-defined condition value (`Crosses` / `Crosses Above` / `Crosses Below`); opaque here. */
    direction: string;
    /** Host-defined trigger (`Only once` / `Every time`); opaque here. */
    trigger: string;
    message: string;
    sound: boolean;
    /** False once a one-shot alert has fired: the marker greys out. */
    active: boolean;
}

export const defaultPriceAlertState = (): PriceAlertState => ({
    label: '',
    direction: 'Crosses',
    trigger: 'Only once',
    message: 'Price alert',
    sound: true,
    active: true,
});

/** Stub length (px) of the marker's dashed tail, measured left from the plot edge. */
export const ALERT_STUB_PX = 44;

/**
 * A price-alert marker: no full-width line. A short dashed stub + dot at the plot's right edge, a
 * price chip on the axis, and (on hover) a pill with the condition text and a trash button. One
 * vertical-only anchor, so dragging the marker moves the alert's price. The host (an app) owns what
 * the alert DOES; this drawing only holds the price and the state the pill shows.
 */
export class PriceAlert extends Drawing {
    readonly type = 'pricealert' as const;

    alert!: PriceAlertState;

    /** Set by the painter each frame: the hover pill and its trash button (null when not shown). */
    pillRect: { x: number; y: number; w: number; h: number } | null = null;
    trashRect: { x: number; y: number; w: number; h: number } | null = null;

    constructor(init: Partial<import('../Drawing').SerializedDrawing> & { paneId: string }) {
        super(init);
        if (!this.alert) this.alert = defaultPriceAlertState();
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 1, max: 1, slots: [{ role: 'p', free: 'y' }] };
    }

    private y(proj: Projector): number | null {
        const a = this.anchors[0];
        return a ? proj.yOf(a.price, this.paneId) : null;
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const y = this.y(proj);
        if (y == null) return false;
        const r = this.pillRect;
        if (r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return true;
        return px >= proj.width - ALERT_STUB_PX - 12 && Math.abs(py - y) <= tol;
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const y = this.y(proj);
        return y == null ? [] : [[proj.width - 6, y]];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const y = this.y(proj);
        return y == null ? null : { x: proj.width - ALERT_STUB_PX - 12, y: y - 10, w: ALERT_STUB_PX + 12, h: 20 };
    }

    /** Never widens the autoscale: an alert far from price must not squash the candles. */
    priceRange(): { min: number; max: number } | null {
        return null;
    }

    /** Pinned to the plot edge, so it is never culled by the visible time range. */
    override timeExtent(): { min: number; max: number } | null {
        return null;
    }

    /** No settings popup: the host's own dialog edits an alert. */
    schema(): SettingsSchema {
        return { fields: [] };
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...this.alert };
    }

    protected override readProps(props: Record<string, unknown>): void {
        this.alert = { ...defaultPriceAlertState(), ...(props as Partial<PriceAlertState>) };
    }
}
