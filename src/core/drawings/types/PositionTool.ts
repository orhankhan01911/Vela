import { Drawing, type AnchorSlot, type SerializedDrawing } from '../Drawing';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_FIELDS } from '../schema';
import { pointInBox, handleAt } from '../hittest';

/** Where the position stands on the candles: still open at the last close, or closed at its target / stop. */
export interface PositionTrade {
    /** Time of the bar the entry filled on. */
    openTime: number;
    /** Time of the closing bar (the last bar inside the box while still open). */
    time: number;
    /** Exit price: the target or stop when hit, else the last close. */
    price: number;
    status: 'open' | 'target' | 'stop';
    /** Profit (+) or loss (−) at `price` for the computed position size. */
    pnl: number;
}

/** How the gear panel's stop/target inputs interpret their value. */
export type PositionLevelMode = 'price' | 'points';

/** Choices for the direction select (long ↔ short mirrors the levels across the entry). */
export const DIRECTION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'long', label: 'Long' },
    { value: 'short', label: 'Short' },
];

/**
 * A long/short position tool. Two clicks place the entry (anchor[0]) + target (anchor[1]);
 * onPlaced derives the stop (anchor[1] after finalize) and keeps the target as anchor[2]. The
 * second click is the *profit* direction — dragging higher from the entry paints the green
 * reward zone above (a long); dragging lower paints it below (a short). The shaded reward
 * (entry↔target) and risk (entry↔stop) zones carry a computed risk:reward, target/stop
 * percentages, and — from the account balance + risk % settings — a dollar loss and position
 * size. Zone colors, the label text (visibility, size, color, level prices), and the three
 * price levels are all editable through settings.
 */
export class PositionTool extends Drawing {
    readonly type: 'position' | 'long-position' | 'short-position' = 'position';
    /** The side this tool always places (the Long / Short Position tools); null = from the drag (Long/Short). */
    protected readonly placeSide: 'long' | 'short' | null = null;

    /** Default reward:risk used to derive the stop from the placed (or default) target. */
    protected static readonly DEFAULT_RR = 2;
    /** Below this vertical drag (media px) a placement is treated as a bare click → default box. */
    private static readonly MIN_DRAG_PX = 6;
    private static readonly DEFAULT_RISK_PX = 64;
    private static readonly DEFAULT_WIDTH_PX = 150;
    private static readonly MIN_WIDTH_PX = 48;
    private static readonly DEFAULT_RISK_PERCENT = 1;
    /** TradingView's default label size for the position tools (its `fontsize`, in px). */
    static readonly DEFAULT_FONT_PX = 12;
    static readonly MIN_FONT_PX = 6;
    static readonly MAX_FONT_PX = 72;
    private static readonly DEFAULT_ACCOUNT_BALANCE = 10_000;
    // TradingView's own long/short position defaults (read from TradingView Desktop, 2026-10-30).
    private static readonly DEFAULT_PROFIT_COLOR = '#089981'; // palette-exempt: TradingView position profit zone
    private static readonly DEFAULT_LOSS_COLOR = '#f23645'; // palette-exempt: TradingView position stop zone

    // Declared with `!` so a field default never clobbers readProps (base constructor runs first).
    /** Percent of account balance risked on the stop (drives dollar loss + position size). */
    riskPercent!: number;
    /** Account balance in dollars (drives dollar loss + position size). */
    accountBalance!: number;
    /** Master toggle for every painted label. */
    showText!: boolean;
    /** TradingView's "Always show stats": off, the labels show only while the tool is hovered or selected. */
    alwaysShowStats!: boolean;
    /** Show the `DIR · R:R` header line above the box. */
    showHeader!: boolean;
    /** Append the level price to the target/stop labels. */
    showPrices!: boolean;
    /** Show the `Loss $ · Size` line above the box. */
    showLossSize!: boolean;
    /** Show the `Target +%` label inside the reward zone. */
    showTargetLabel!: boolean;
    /** Show the `Stop −%` label inside the risk zone. */
    showStopLabel!: boolean;
    /** Fill + line color of the reward zone. */
    profitColor!: string;
    /** Fill + line color of the risk zone. */
    lossColor!: string;
    /** The dashed trade line (entry fill → exit / last close), in the entry line's color. Off by default. */
    showTradeLine!: boolean;
    private fontPx!: number;
    /** Label text size in px (TradingView's position tools take a pixel size, not small/large): whole px,
     *  clamped to MIN_FONT_PX..MAX_FONT_PX; a non-number is ignored. */
    get fontSize(): number {
        return this.fontPx;
    }
    set fontSize(v: number) {
        if (typeof v !== 'number' || !Number.isFinite(v)) return;
        this.fontPx = Math.min(PositionTool.MAX_FONT_PX, Math.max(PositionTool.MIN_FONT_PX, Math.round(v)));
    }

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        if (this.riskPercent === undefined) this.riskPercent = PositionTool.DEFAULT_RISK_PERCENT;
        if (this.accountBalance === undefined) this.accountBalance = PositionTool.DEFAULT_ACCOUNT_BALANCE;
        if (this.showText === undefined) this.showText = true;
        if (this.alwaysShowStats === undefined) this.alwaysShowStats = false;
        if (this.showHeader === undefined) this.showHeader = true;
        if (this.showPrices === undefined) this.showPrices = true;
        if (this.showLossSize === undefined) this.showLossSize = true;
        if (this.showTargetLabel === undefined) this.showTargetLabel = true;
        if (this.showStopLabel === undefined) this.showStopLabel = true;
        if (this.profitColor === undefined) this.profitColor = PositionTool.DEFAULT_PROFIT_COLOR;
        if (this.lossColor === undefined) this.lossColor = PositionTool.DEFAULT_LOSS_COLOR;
        if (this.showTradeLine === undefined) this.showTradeLine = false;
        if (this.fontPx === undefined) this.fontSize = PositionTool.DEFAULT_FONT_PX;
    }

    /** `'LONG'` or `'SHORT'`, computed from geometry so it flips live as the drag crosses the
     *  entry (target above entry → long; below → short). */
    directionLabel(): string {
        const p = this.prices();
        return p && p.target >= p.entry ? 'LONG' : 'SHORT';
    }

    /** Direction as a settings path: reading reflects the geometry; writing the opposite value
     *  mirrors the stop AND the target across the entry, turning the trade around in place
     *  while preserving each side's distance (and therefore the R:R). */
    get direction(): 'long' | 'short' {
        return this.directionLabel() === 'LONG' ? 'long' : 'short';
    }
    set direction(v: 'long' | 'short') {
        const entry = this.anchors[0];
        const stop = this.anchors[1];
        const target = this.anchors[2];
        if (!entry || !stop || !target || this.placeSide) return; // the Long / Short Position tools keep their side
        if ((v === 'long' || v === 'short') && v !== this.direction) {
            stop.price = 2 * entry.price - stop.price;
            target.price = 2 * entry.price - target.price;
        }
    }

    /** Position size as a settings path: reading returns the computed size; writing back-solves
     *  the risk % so that `size × stop distance = balance × risk%` holds for the typed size. */
    get quantity(): number {
        return this.positionSize();
    }
    set quantity(v: number) {
        const p = this.prices();
        if (!p || !Number.isFinite(v) || v < 0) return;
        const dist = Math.abs(p.entry - p.stop);
        if (dist < 1e-9 || this.accountBalance <= 0) return;
        this.riskPercent = ((v * dist) / this.accountBalance) * 100;
    }

    // ── price levels as settings paths (the gear panel patches these directly) ──

    get entryPrice(): number {
        return this.anchors[0]?.price ?? 0;
    }
    set entryPrice(v: number) {
        const a = this.anchors[0];
        if (a && Number.isFinite(v)) {
            if (this.placeSide) this.shiftLevels(v - a.price); // TradingView: stop/target are distances from the entry
            a.price = v;
            this.constrainHandleDrag(0);
        }
    }

    /** Move the stop and target by `dp` (the Long / Short Position tools keep them at a fixed distance from the entry). */
    private shiftLevels(dp: number): void {
        for (const i of [1, 2]) {
            const a = this.anchors[i];
            if (a) a.price += dp;
        }
    }

    get stopPrice(): number {
        return this.anchors[1]?.price ?? 0;
    }
    set stopPrice(v: number) {
        const a = this.anchors[1];
        if (a && Number.isFinite(v)) {
            a.price = v;
            this.constrainHandleDrag(1);
        }
    }

    get targetPrice(): number {
        return this.anchors[2]?.price ?? 0;
    }
    set targetPrice(v: number) {
        const a = this.anchors[2];
        if (a && Number.isFinite(v)) {
            a.price = v;
            this.constrainHandleDrag(2);
        }
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        // Click-move-click: click 1 = entry, click 2 = target (max 2 clicks finalize). onPlaced then
        // derives the stop and rewrites anchors as [entry, stop, target]. The 3 slots give all three
        // handles their free axes after placement.
        return {
            min: 2,
            max: 2,
            slots: [
                { role: 'entry', free: 'both' },
                { role: 'stop', free: 'both' },
                { role: 'target', free: 'both' },
            ],
        };
    }

    // Placed click-move-click (the inherited 'click' mode), consistent with the box/Gann/range tools.

    /**
     * Resolve the two placed anchors (entry + target) into the final entry/stop/target box,
     * computing the stop/width in PIXEL space so the box has a consistent visual size at any
     * scale. The second click is the profit direction — a target above the entry yields a long
     * (stop below); below yields a short. A degenerate second click (≈ the entry) falls back to
     * a default-sized long-facing box.
     */
    override onPlaced(proj: Projector): void {
        const e = this.anchors[0];
        if (!e) return;
        const ex = proj.xOf(e.time);
        const ey = proj.yOf(e.price, this.paneId);
        if (ey == null) return;

        const t = this.anchors[1];
        const ty = t ? proj.yOf(t.price, this.paneId) : null;
        let targetPx: number;
        let endPx: number;
        if (t && ty != null && Math.abs(ty - ey) >= PositionTool.MIN_DRAG_PX) {
            targetPx = ty; // a real drag: the target (profit) is where the user released
            endPx = ex + Math.max(Math.abs(proj.xOf(t.time) - ex), PositionTool.MIN_WIDTH_PX);
        } else {
            // a degenerate second click (≈ the entry): a default long-facing box (target above)
            targetPx = ey - PositionTool.DEFAULT_RISK_PX * PositionTool.DEFAULT_RR;
            endPx = ex + PositionTool.DEFAULT_WIDTH_PX;
        }
        // The Long / Short Position tools keep their side: the drag only sets the size (y grows downward).
        if (this.placeSide === 'long') targetPx = ey - Math.abs(targetPx - ey);
        else if (this.placeSide === 'short') targetPx = ey + Math.abs(targetPx - ey);
        // stop on the opposite side of the entry at 1/R:R of the reward distance
        const stopPx = ey - (targetPx - ey) / PositionTool.DEFAULT_RR;
        const endTime = proj.pxToPoint(endPx, ey, this.paneId).time;
        this.anchors = [
            { time: e.time, price: e.price },
            { time: endTime, price: proj.pxToPoint(ex, stopPx, this.paneId).price },
            { time: endTime, price: proj.pxToPoint(ex, targetPx, this.paneId).price },
        ];
    }

    /**
     * Keep the stop (loss) and target (reward) on OPPOSITE sides of the entry. When a handle
     * drag would put them on the same side — e.g. dragging the stop of a long up past the entry
     * (flipping it to a short) — reflect the *other* side across the entry so the two never
     * collapse onto one direction. R:R (each side's distance from entry) is preserved.
     */
    override constrainHandleDrag(index: number): void {
        const entry = this.anchors[0];
        const stop = this.anchors[1];
        const target = this.anchors[2];
        if (!entry || !stop || !target) return;
        if (this.placeSide) {
            // TradingView's Long / Short Position: a level dragged (or typed) past the entry stops just short of it;
            // the trade never turns around.
            const up = this.placeSide === 'long' ? 1 : -1;
            const eps = Math.max(Math.abs(entry.price) * 1e-6, 1e-9);
            if ((target.price - entry.price) * up < eps) target.price = entry.price + up * eps;
            if ((entry.price - stop.price) * up < eps) stop.price = entry.price - up * eps;
            return;
        }
        const stopSide = Math.sign(stop.price - entry.price);
        const targetSide = Math.sign(target.price - entry.price);
        if (stopSide === 0 || targetSide === 0 || stopSide !== targetSide) return; // already opposed (or on the line)
        // same side → flip whichever side was NOT the one being dragged across the entry
        if (index === 2) stop.price = 2 * entry.price - stop.price; // dragged target → flip the stop
        else target.price = 2 * entry.price - target.price; // dragged stop (or entry) → flip the target
    }

    /** The three levels — entry, stop, target — deriving the stop while only two anchors exist
     *  (the live drag preview, before onPlaced sets the precise box). During preview the second
     *  anchor is the target (profit); after placement anchors are [entry, stop, target]. */
    private resolved(): Array<{ time: number; price: number }> | null {
        const e = this.anchors[0];
        const a1 = this.anchors[1];
        if (!e || !a1) return null;
        if (this.anchors[2]) return [e, a1, this.anchors[2]];
        // live preview: a1 is the target; stop sits opposite at 1/R:R of the reward. The Long / Short
        // Position tools mirror a wrong-way drag here exactly as onPlaced does, so the preview never
        // shows a side the placed tool will not have.
        let tp = a1.price;
        if ((this.placeSide === 'long' && tp < e.price) || (this.placeSide === 'short' && tp > e.price)) tp = 2 * e.price - tp;
        const target = { time: a1.time, price: tp };
        const stop = { time: a1.time, price: e.price - (tp - e.price) / PositionTool.DEFAULT_RR };
        return [e, stop, target];
    }

    private prices(): { entry: number; stop: number; target: number } | null {
        const r = this.resolved();
        return r ? { entry: r[0]!.price, stop: r[1]!.price, target: r[2]!.price } : null;
    }

    /** Risk:reward ratio = |target − entry| / |entry − stop| (0 when risk is degenerate). */
    rr(): number {
        const p = this.prices();
        if (!p) return 0;
        const risk = Math.abs(p.entry - p.stop);
        return risk < 1e-9 ? 0 : Math.abs(p.target - p.entry) / risk;
    }

    /** Reward % = |target − entry| / entry · 100. */
    rewardPct(): number {
        const p = this.prices();
        return p && p.entry !== 0 ? (Math.abs(p.target - p.entry) / p.entry) * 100 : 0;
    }

    /** Risk % of price = |entry − stop| / entry · 100 (distinct from the account riskPercent). */
    riskPct(): number {
        const p = this.prices();
        return p && p.entry !== 0 ? (Math.abs(p.entry - p.stop) / p.entry) * 100 : 0;
    }

    /** Dollar amount risked at the stop = accountBalance × riskPercent / 100. */
    dollarLoss(): number {
        return Math.max(0, this.accountBalance) * (Math.max(0, this.riskPercent) / 100);
    }

    /** Position size in units = dollarLoss / |entry − stop| (0 when risk is degenerate). */
    positionSize(): number {
        const p = this.prices();
        if (!p) return 0;
        const risk = Math.abs(p.entry - p.stop);
        return risk < 1e-9 ? 0 : this.dollarLoss() / risk;
    }

    // ── painted label lines (each respects its own toggle; the painter checks showText) ──

    /** `DIR · R:R x.xx` — the always-on header when text is shown. */
    headerLabel(): string {
        return `${this.directionLabel()}  ·  R:R ${this.rr().toFixed(2)}`;
    }

    /** `Loss $… · Size …` — the painter hides it when showLossSize is off. */
    lossSizeLabel(): string {
        return `Loss $${formatMoney(this.dollarLoss())}  ·  Size ${formatQty(this.positionSize())}`;
    }

    /** `Target +x.xx%`, with the level price appended when showPrices is on. */
    targetLabel(): string {
        const p = this.prices();
        const at = this.showPrices && p ? `  @ ${formatPrice(p.target)}` : '';
        return `Target +${this.rewardPct().toFixed(2)}%${at}`;
    }

    /** `Stop −x.xx%`, with the level price appended when showPrices is on. */
    stopLabel(): string {
        const p = this.prices();
        const at = this.showPrices && p ? `  @ ${formatPrice(p.stop)}` : '';
        return `Stop −${this.riskPct().toFixed(2)}%${at}`;
    }

    // ── TradingView-style boxed labels (the painter draws each in a solid box on its level) ──

    /** `Target: 85,123.40 (3.41%) 2,806.00, Amount: 341.10` — level price (when showPrices is
     *  on), distance from the entry in % and in price, and the profit at the target for the
     *  computed size. Shown just outside the reward zone, on the target line. */
    targetBoxLabel(): string {
        const p = this.prices();
        if (!p) return '';
        const dist = Math.abs(p.target - p.entry);
        const at = this.showPrices ? `${formatGrouped(p.target)} ` : '';
        return `Target: ${at}(${this.rewardPct().toFixed(2)}%) ${formatGrouped(dist)}, Amount: ${formatGrouped(dist * this.positionSize(), 2)}`;
    }

    /** `Stop: 80,500.00 (2.05%) 1,690.20, Amount: 100.00` — same shape as the target label;
     *  the amount is the loss at the stop. Shown just outside the risk zone, on the stop line. */
    stopBoxLabel(): string {
        const p = this.prices();
        if (!p) return '';
        const dist = Math.abs(p.entry - p.stop);
        const at = this.showPrices ? `${formatGrouped(p.stop)} ` : '';
        return `Stop: ${at}(${this.riskPct().toFixed(2)}%) ${formatGrouped(dist)}, Amount: ${formatGrouped(dist * this.positionSize(), 2)}`;
    }

    /** The centre box by the entry line: `Long, Qty: 0.0591, Risk: $100` (or `Open PnL: …, Qty: …, Risk: $…` once `trade` filled; showLossSize) over
     *  `Risk/reward ratio: 2.07` (showHeader). Empty when both are off. */
    centerBoxLines(trade?: PositionTrade | null): string[] {
        const lines: string[] = [];
        const dir = this.direction === 'long' ? 'Long' : 'Short';
        // TradingView: once price fills the entry the first line is the trade's PnL (Open while running, Closed after a hit).
        if (this.showLossSize && trade) lines.push(`${trade.status === 'open' ? 'Open' : 'Closed'} PnL: ${formatGrouped(trade.pnl, 2).replace(/^-/, '\u2212')}, Qty: ${formatQty(this.positionSize())}, Risk: $${formatGrouped(this.dollarLoss(), 2)}`);
        else if (this.showLossSize) lines.push(`${dir}, Qty: ${formatQty(this.positionSize())}, Risk: $${formatGrouped(this.dollarLoss(), 2)}`);
        if (this.showHeader) lines.push(`Risk/reward ratio: ${this.rr().toFixed(2)}`);
        return lines;
    }

    // ── the trade over the candles (TradingView's dashed entry→exit line) ──

    /**
     * Play the position over `bars` (oldest first, the chart's candles): it opens on the first bar at or after the
     * entry time whose range touches the entry price, then closes on the first bar that reaches the target or the stop
     * (both in one bar counts as the stop: the conservative read), else it is still open at the close of the last bar
     * inside the box. Null when it never opened (the entry is in the future, or price never came back to it).
     */
    trade(bars: ReadonlyArray<{ time: number; high: number; low: number; close: number }>): PositionTrade | null {
        const r = this.resolved();
        if (!r || !this.anchors[2]) return null;
        const p = { entry: r[0]!.price, stop: r[1]!.price, target: r[2]!.price };
        const from = Math.min(r[0]!.time, r[2]!.time);
        const to = Math.max(r[0]!.time, r[1]!.time, r[2]!.time);
        const long = p.target >= p.entry;
        let open: number | null = null;
        let last: { time: number; close: number } | null = null;
        for (const b of bars) {
            if (b.time < from || b.time > to) continue;
            if (open === null) {
                if (b.low <= p.entry && b.high >= p.entry) open = b.time;
                else continue;
            }
            const hitStop = long ? b.low <= p.stop : b.high >= p.stop;
            const hitTarget = long ? b.high >= p.target : b.low <= p.target;
            if (hitStop) return this.closedAt(open, b.time, p.stop, 'stop', p.entry, long);
            if (hitTarget) return this.closedAt(open, b.time, p.target, 'target', p.entry, long);
            last = b;
        }
        if (open === null || !last) return null;
        return this.closedAt(open, last.time, last.close, 'open', p.entry, long);
    }

    private closedAt(openTime: number, time: number, price: number, status: PositionTrade['status'], entry: number, long: boolean): PositionTrade {
        const pnl = (long ? price - entry : entry - price) * this.positionSize();
        return { openTime, time, price, status, pnl };
    }

    // ── stop/target input units (the gear panel's Price / Points dropdowns) ──

    /** The stop or target expressed in the given unit: the absolute price, or the distance from
     *  the entry in price points. */
    levelDisplayValue(level: 'stop' | 'target', mode: PositionLevelMode): number {
        const p = this.prices();
        if (!p) return 0;
        const price = level === 'stop' ? p.stop : p.target;
        if (mode === 'price') return roundFloat(price);
        return roundFloat(Math.abs(price - p.entry));
    }

    /** The absolute price a typed value in the given unit resolves to. Points measure the
     *  distance from the entry; the level keeps its current side (target defaults to the profit
     *  side, stop to the loss side, when it sits exactly on the entry). */
    levelPriceFromDisplay(level: 'stop' | 'target', mode: PositionLevelMode, value: number): number {
        const p = this.prices();
        if (!p || mode === 'price') return value;
        const current = level === 'stop' ? p.stop : p.target;
        let side = Math.sign(current - p.entry);
        if (side === 0) side = (level === 'target' ? 1 : -1) * (this.direction === 'long' ? 1 : -1);
        return p.entry + side * Math.abs(value);
    }

    private box(proj: Projector): { x1: number; x2: number; ey: number; sy: number; ty: number } | null {
        const pts = this.levelPoints(proj);
        if (pts.length < 3) return null;
        const xs = pts.map((p) => p[0]);
        return { x1: Math.min(...xs), x2: Math.max(...xs), ey: pts[0]![1], sy: pts[1]![1], ty: pts[2]![1] };
    }

    /** Entry, stop and target at their own anchor x/y (the box geometry; handles sit elsewhere). */
    private levelPoints(proj: Projector): Array<[number, number]> {
        const r = this.resolved();
        if (!r) return [];
        const pts: Array<[number, number]> = [];
        for (const a of r) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            pts.push([proj.xOf(a.time), y]);
        }
        return pts;
    }

    /** Pixel layout for the painter: the box x-range + each level's y. */
    layout(proj: Projector): { x1: number; x2: number; ey: number; sy: number; ty: number } | null {
        return this.box(proj);
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const b = this.box(proj);
        if (!b) return false;
        const top = Math.min(b.ey, b.sy, b.ty);
        const bot = Math.max(b.ey, b.sy, b.ty);
        return pointInBox(px, py, b.x1, top, b.x2, bot, tol);
    }

    /** TradingView's four handles: [0] the entry (circle, left), [1] the stop and [2] the target on
     *  the box's left edge (they move their level only), [3] the entry's right end (sets the width). */
    handlePoints(proj: Projector): Array<[number, number]> {
        const b = this.box(proj);
        if (!b) return [];
        const ex = this.levelPoints(proj)[0]![0];
        return [[ex, b.ey], [b.x1, b.sy], [b.x1, b.ty], [b.x2, b.ey]];
    }

    /** TradingView's cursors: move on the entry circle, up/down on the stop and target, left/right on the width. */
    override handleCursor(index: number): string | null {
        if (this.anchors.length < 3) return null;
        return index === 0 ? 'move' : index === 3 ? 'ew-resize' : index === 1 || index === 2 ? 'ns-resize' : null;
    }

    /** Handle shapes in {@link handlePoints} order, as TradingView draws them. */
    override handleShapes(): ReadonlyArray<'circle' | 'square'> {
        return ['circle', 'square', 'square', 'square'];
    }

    /** Stop / target handles move their price only (TradingView); the right-end handle moves the box's right edge. */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector): boolean {
        if (this.anchors.length < 3) return false;
        if (index === 0) {
            if (!this.placeSide) return false; // the combined tool: the default free move (its levels stay put)
            // TradingView: the entry circle moves in both directions — its price and the box's left edge — while the
            // target, the stop and the right edge stay put. It stays 1 px inside the stop..target band and left of the
            // right edge, so the tool never turns around or folds over.
            const sy = proj.yOf(this.anchors[1]!.price, this.paneId);
            const ty = proj.yOf(this.anchors[2]!.price, this.paneId);
            const rx = proj.xOf(this.anchors[2]!.time);
            if (sy != null && ty != null) y = Math.min(Math.max(y, Math.min(sy, ty) + 1), Math.max(sy, ty) - 1);
            x = Math.min(x, rx - 1);
            const pt = proj.pxToPoint(x, y, this.paneId);
            if (!Number.isFinite(pt.price)) return true;
            this.anchors[0] = { time: pt.time, price: pt.price };
            return true;
        }
        if (this.placeSide && (index === 1 || index === 2)) {
            // keep the level at least 1 px on its own side of the entry (y grows downward)
            const ey = proj.yOf(this.anchors[0]!.price, this.paneId);
            const above = (index === 2) === (this.placeSide === 'long');
            if (ey != null) y = above ? Math.min(y, ey - 1) : Math.max(y, ey + 1);
        }
        const pt = proj.pxToPoint(x, y, this.paneId);
        if (index === 3) {
            this.anchors[1]!.time = pt.time;
            this.anchors[2]!.time = pt.time;
            return true;
        }
        const a = this.anchors[index];
        if (!a || !Number.isFinite(pt.price)) return false;
        a.price = pt.price;
        this.constrainHandleDrag(index);
        return true;
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const b = this.box(proj);
        if (!b) return null;
        const y = Math.min(b.ey, b.sy, b.ty);
        return { x: b.x1, y, w: b.x2 - b.x1, h: Math.max(b.ey, b.sy, b.ty) - y };
    }

    priceRange(): { min: number; max: number } | null {
        const r = this.resolved();
        if (!r) return null;
        const ps = r.map((a) => a.price);
        return { min: Math.min(...ps), max: Math.max(...ps) };
    }

    schema(): SettingsSchema {
        return {
            fields: [
                { path: 'riskPercent', label: 'Risk %', kind: 'number', min: 0, max: 100, step: 0.1, group: 'behavior' },
                { path: 'accountBalance', label: 'Account balance', kind: 'number', min: 0, max: 1e12, step: 1, group: 'behavior' },
                { path: 'quantity', label: 'Position size', kind: 'number', group: 'behavior' },
                ...(this.placeSide ? [] : [{ path: 'direction', label: 'Direction', kind: 'select' as const, options: DIRECTION_OPTIONS, group: 'behavior' as const }]),
                { path: 'entryPrice', label: 'Entry price', kind: 'number', group: 'behavior' },
                { path: 'stopPrice', label: 'Stop price', kind: 'number', group: 'behavior' },
                { path: 'targetPrice', label: 'Target price', kind: 'number', group: 'behavior' },
                { path: 'showText', label: 'Show text', kind: 'boolean', group: 'behavior' },
                { path: 'alwaysShowStats', label: 'Always show stats', kind: 'boolean', group: 'behavior' },
                { path: 'showHeader', label: 'Show risk/reward ratio', kind: 'boolean', group: 'behavior' },
                { path: 'showLossSize', label: 'Show size & risk', kind: 'boolean', group: 'behavior' },
                { path: 'showTargetLabel', label: 'Show target label', kind: 'boolean', group: 'behavior' },
                { path: 'showStopLabel', label: 'Show stop label', kind: 'boolean', group: 'behavior' },
                { path: 'showPrices', label: 'Show level prices', kind: 'boolean', group: 'behavior' },
                { path: 'profitColor', label: 'Profit zone', kind: 'color', group: 'fill' },
                { path: 'lossColor', label: 'Loss zone', kind: 'color', group: 'fill' },
                { path: 'showTradeLine', label: 'Trade line', kind: 'boolean', group: 'line' },
                ...LINE_FIELDS.filter((f) => f.path !== 'style.lineColor'),
                { path: 'text.color', label: 'Text color', kind: 'color', group: 'text' },
                { path: 'fontSize', label: 'Text size', kind: 'number', min: PositionTool.MIN_FONT_PX, max: PositionTool.MAX_FONT_PX, step: 1, group: 'text' },
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> {
        return {
            riskPercent: this.riskPercent,
            accountBalance: this.accountBalance,
            showText: this.showText,
            showHeader: this.showHeader,
            showPrices: this.showPrices,
            alwaysShowStats: this.alwaysShowStats,
            showLossSize: this.showLossSize,
            showTargetLabel: this.showTargetLabel,
            showStopLabel: this.showStopLabel,
            profitColor: this.profitColor,
            lossColor: this.lossColor,
            fontSize: this.fontSize,
            showTradeLine: this.showTradeLine,
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (typeof props.riskPercent === 'number' && Number.isFinite(props.riskPercent)) {
            this.riskPercent = props.riskPercent;
        }
        if (typeof props.accountBalance === 'number' && Number.isFinite(props.accountBalance)) {
            this.accountBalance = props.accountBalance;
        }
        if (typeof props.showText === 'boolean') this.showText = props.showText;
        if (typeof props.showHeader === 'boolean') this.showHeader = props.showHeader;
        if (typeof props.showPrices === 'boolean') this.showPrices = props.showPrices;
        if (typeof props.alwaysShowStats === 'boolean') this.alwaysShowStats = props.alwaysShowStats;
        if (typeof props.showLossSize === 'boolean') this.showLossSize = props.showLossSize;
        if (typeof props.showTargetLabel === 'boolean') this.showTargetLabel = props.showTargetLabel;
        if (typeof props.showStopLabel === 'boolean') this.showStopLabel = props.showStopLabel;
        if (typeof props.profitColor === 'string') this.profitColor = props.profitColor;
        if (typeof props.lossColor === 'string') this.lossColor = props.lossColor;
        if (typeof props.showTradeLine === 'boolean') this.showTradeLine = props.showTradeLine;
        if (typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)) {
            this.fontSize = props.fontSize;
        } else if (this.fontPx === undefined && typeof props.riskPercent === 'number') {
            // a position saved before the px size (a saved doc carries every prop): keep the size it painted at.
            // Props from the API / assistant (no riskPercent) fall through to the 12 px default.
            this.fontSize = LEGACY_FONT_PX[this.text?.size ?? 'normal'] ?? PositionTool.DEFAULT_FONT_PX;
        }
    }
}

/** The px each named text size painted at before the position tools took a px size (namedFontSize). */
const LEGACY_FONT_PX: Record<string, number> = { tiny: 10, small: 12, normal: 14, large: 18, huge: 28 };

/** Compact money string (drops trailing .00; keeps two decimals otherwise). */
function formatMoney(n: number): string {
    if (!Number.isFinite(n)) return '0';
    const rounded = Math.round(n * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** Compact quantity string for the position size readout. */
function formatQty(n: number): string {
    if (!Number.isFinite(n) || n === 0) return '0';
    if (n >= 100) return n.toFixed(2);
    if (n >= 1) return n.toFixed(4).replace(/\.?0+$/, '');
    return n.toPrecision(4).replace(/\.?0+$/, '');
}

/** Compact price string for the level readouts (two decimals ≥1, four significant below). */
function formatPrice(n: number): string {
    if (!Number.isFinite(n)) return '0';
    if (Math.abs(n) >= 1) return n.toFixed(2);
    return n.toPrecision(4).replace(/\.?0+$/, '');
}

/** Price-like number with thousands separators: `decimals` when given, else 2 at ≥1 and four
 *  significant digits below 1 (sub-dollar coins keep their precision). */
function formatGrouped(n: number, decimals?: number): string {
    if (!Number.isFinite(n)) return '0';
    if (decimals === undefined && Math.abs(n) < 1) return formatPrice(n);
    const d = decimals ?? 2;
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Trim binary float noise from a converted value (points arithmetic). */
function roundFloat(n: number): number {
    return Math.round(n * 1e8) / 1e8;
}

/** TradingView's Long Position tool: always a long (target above the entry); the drag only sets the size. */
export class LongPositionTool extends PositionTool {
    override readonly type = 'long-position' as const;
    protected override readonly placeSide = 'long' as const;
}

/** TradingView's Short Position tool: always a short (target below the entry); the drag only sets the size. */
export class ShortPositionTool extends PositionTool {
    override readonly type = 'short-position' as const;
    protected override readonly placeSide = 'short' as const;
}
