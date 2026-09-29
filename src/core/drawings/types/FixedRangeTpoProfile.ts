import { Drawing, type AnchorSlot, type SerializedDrawing } from '../Drawing';
import type { LineStyle } from '../../model/series';
import type { Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { LINE_STYLE_OPTIONS } from '../schema';
import { pointInPolygon, handleAt, distToSegment } from '../hittest';
import { ACCENT, NEUTRAL } from '../../palette';

/** One OHLC bar the fixed-range TPO profile buckets (volume is not used). */
export interface FrtpBar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

/** One profile row: `[price, price + rowH)` and the period indices (ascending) that traded in it. */
export interface FrtpRow {
    /** The row's LOWER price bound. */
    price: number;
    periods: number[];
}

/** The bucketed fixed-range TPO (Market Profile) profile. */
export interface FrtpProfile {
    rows: FrtpRow[];
    rowH: number;
    min: number;
    /** Number of time periods (brackets) the range was split into. */
    periodCount: number;
    /** Largest TPO count in any row. */
    maxCount: number;
    poc: number;
    vaFrom: number;
    vaTo: number;
}

/** Cosmetics + behavior for the fixed-range TPO profile (round-trips through `props`). */
export interface FrtpStyle {
    /** Number of equal-height price rows. */
    rows: number;
    /** Length of one TPO period (one letter) in minutes. */
    periodMin: number;
    /** Value-area coverage as a percent of all TPOs (0–100). */
    valueAreaPct: number;
    /** Profile width as a percent of the anchor time-span (0–100). */
    widthPct: number;
    /** Which side of the range the profile grows from. */
    anchor: 'left' | 'right';
    /** `letters` draws one letter per period (falls back to blocks when too small). */
    display: 'letters' | 'blocks';
    /** TPOs outside the value area. */
    color: string;
    /** TPOs inside the value area. */
    vaColor: string;
    showVah: boolean;
    vahColor: string;
    vahStyle: LineStyle;
    showVal: boolean;
    valColor: string;
    valStyle: LineStyle;
    showPoc: boolean;
    /** `undefined` ⇒ the theme's contrast ink, resolved at paint time. */
    pocColor?: string;
    pocStyle: LineStyle;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** The classic TPO letter for a period index (A–Z, then a–z, then it cycles). */
export function tpoLetter(periodIndex: number): string {
    return LETTERS[((periodIndex % LETTERS.length) + LETTERS.length) % LETTERS.length]!;
}

function defaultFrtpStyle(): FrtpStyle {
    return {
        rows: 30,
        periodMin: 30,
        valueAreaPct: 70,
        widthPct: 35,
        anchor: 'left',
        display: 'letters',
        color: `${NEUTRAL}CC`,
        vaColor: ACCENT,
        showVah: true,
        vahColor: NEUTRAL,
        vahStyle: 'solid',
        showVal: true,
        valColor: NEUTRAL,
        valStyle: 'solid',
        showPoc: true,
        pocColor: undefined,
        pocStyle: 'solid',
    };
}

function clampIndex(k: number, n: number): number {
    return k < 0 ? 0 : k >= n ? n - 1 : k;
}

/**
 * Split `bars` into fixed-length periods (`floor(time / periodMs)` buckets) and return each
 * period's high / low in time order. A bar longer than the period is its own period, so a
 * 1h chart with a 30m period simply gets one letter per bar.
 */
function toPeriods(bars: readonly FrtpBar[], periodMs: number): Array<{ high: number; low: number }> {
    const sorted = [...bars].sort((a, b) => a.time - b.time);
    const out: Array<{ high: number; low: number }> = [];
    let cur = Number.NaN;
    for (const b of sorted) {
        const bucket = Math.floor(b.time / periodMs);
        if (bucket !== cur) {
            out.push({ high: b.high, low: b.low });
            cur = bucket;
        } else {
            const p = out[out.length - 1]!;
            if (b.high > p.high) p.high = b.high;
            if (b.low < p.low) p.low = b.low;
        }
    }
    return out;
}

/**
 * Grow the value area from the POC by repeatedly absorbing the larger adjacent row until the
 * accumulated TPO count covers `valueAreaFrac` of all TPOs.
 */
function growValueArea(counts: readonly number[], poc: number, valueAreaFrac: number): { vaFrom: number; vaTo: number } {
    const n = counts.length;
    let total = 0;
    for (const c of counts) total += c;
    const target = total * Math.min(1, Math.max(0, valueAreaFrac));
    let vaFrom = poc;
    let vaTo = poc;
    let acc = counts[poc]!;
    while (acc < target && (vaFrom > 0 || vaTo < n - 1)) {
        const below = vaFrom > 0 ? counts[vaFrom - 1]! : -1;
        const above = vaTo < n - 1 ? counts[vaTo + 1]! : -1;
        if (above > below) {
            vaTo += 1;
            acc += above;
        } else {
            vaFrom -= 1;
            acc += below;
        }
    }
    return { vaFrom, vaTo };
}

/**
 * Build the fixed-range TPO profile: every period marks each price row its high–low range
 * touches. POC is the row with the most TPOs (ties resolve to the row nearest the middle of
 * the range); the value area grows from it until it holds `valueAreaFrac` of all TPOs.
 * Returns null when there are no bars.
 */
export function buildTpoProfile(
    bars: readonly FrtpBar[],
    rowCount: number,
    periodMs: number,
    valueAreaFrac: number,
): FrtpProfile | null {
    if (bars.length < 1 || !(periodMs > 0)) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const b of bars) {
        if (b.low < min) min = b.low;
        if (b.high > max) max = b.high;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

    const n = max > min ? Math.max(1, Math.round(rowCount)) : 1;
    const rowH = max > min ? (max - min) / n : 1;
    const rows: FrtpRow[] = Array.from({ length: n }, (_, k) => ({ price: min + k * rowH, periods: [] }));

    const periods = toPeriods(bars, periodMs);
    periods.forEach((p, i) => {
        const kLo = clampIndex(Math.floor((p.low - min) / rowH), n);
        // A high exactly on a row boundary belongs to the row below it (that row's top edge),
        // not the one above — otherwise every round-number high would spill an extra TPO up.
        const kHi = Math.max(kLo, clampIndex(Math.ceil((p.high - min) / rowH - 1e-9) - 1, n));
        for (let k = kLo; k <= kHi; k += 1) rows[k]!.periods.push(i);
    });

    const counts = rows.map((r) => r.periods.length);
    let maxCount = 0;
    for (const c of counts) if (c > maxCount) maxCount = c;
    if (maxCount <= 0) return null;

    const mid = (n - 1) / 2;
    let poc = -1;
    for (let k = 0; k < n; k += 1) {
        if (counts[k] !== maxCount) continue;
        if (poc < 0 || Math.abs(k - mid) < Math.abs(poc - mid)) poc = k;
    }
    const { vaFrom, vaTo } = growValueArea(counts, poc, valueAreaFrac);
    return { rows, rowH, min, periodCount: periods.length, maxCount, poc, vaFrom, vaTo };
}

/** Pixel geometry the painter / hit-test consume. */
export interface FrtpLayout {
    /** Left / right pixel edges of the time span. */
    x0: number;
    x1: number;
    /** Pixel edge the profile is anchored to (left or right of the span). */
    anchorX: number;
    /** Pixel width available to the widest row. */
    maxW: number;
    /** Sign: +1 grows right from `anchorX`, −1 grows left. */
    grow: 1 | -1;
    profile: FrtpProfile;
    /** Resolved y for each row's lower bound (length = rows + 1 for the top edge). */
    yEdges: number[];
    vahY: number | null;
    valY: number | null;
    pocY: number | null;
}

/**
 * A **fixed-range TPO profile**: two time anchors bound a range, and the tool splits it into
 * fixed-length periods (default 30 minutes, one letter each) and stacks a letter in every price
 * row each period traded through — the Market Profile shape. POC / VAH / VAL are computed from
 * the TPO counts. Everything recomputes live as an anchor is dragged or new bars arrive, via
 * {@link Projector.barsInRange}, so the periods are the chart's own bars (a chart timeframe
 * longer than the period yields one letter per bar).
 */
export class FixedRangeTpoProfile extends Drawing {
    readonly type = 'fixedrangetpo' as const;

    /** Cosmetics + behavior (seeded from defaults, persisted via props). */
    frtpo!: FrtpStyle;

    private cachedRange: { min: number; max: number } | null = null;

    constructor(init: Partial<SerializedDrawing> & { paneId: string }) {
        super(init);
        if (!this.frtpo) this.frtpo = defaultFrtpStyle();
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        // Two points bound the time range; price is data-driven, so handles move horizontally.
        return { min: 2, max: 2, slots: [{ role: 'start', free: 'x' }, { role: 'end', free: 'x' }] };
    }

    private barsInSpan(proj: Projector): FrtpBar[] | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const from = Math.min(a.time, b.time);
        const to = Math.max(a.time, b.time);
        const raw = proj.barsInRange?.(from, to) ?? null;
        if (!raw || raw.length < 1) return null;
        return raw.map((bar) => ({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close }));
    }

    /** Compute the profile, caching the price span for autoscale. */
    compute(proj: Projector): FrtpProfile | null {
        const bars = this.barsInSpan(proj);
        if (!bars) return null;
        const s = this.frtpo;
        const profile = buildTpoProfile(bars, s.rows, Math.max(1, s.periodMin) * 60_000, s.valueAreaPct / 100);
        if (profile) this.cachedRange = { min: profile.min, max: profile.min + profile.rowH * profile.rows.length };
        return profile;
    }

    /** Resolve the compute to pixel geometry for the painter + hit-test. */
    layout(proj: Projector): FrtpLayout | null {
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        const profile = this.compute(proj);
        if (!profile) return null;
        const x0 = proj.xOf(Math.min(a.time, b.time));
        const x1 = proj.xOf(Math.max(a.time, b.time));
        const spanW = Math.abs(x1 - x0);
        const maxW = Math.max(1, (Math.min(100, Math.max(0, this.frtpo.widthPct)) / 100) * spanW);
        const growRight = this.frtpo.anchor === 'left';
        const anchorX = growRight ? Math.min(x0, x1) : Math.max(x0, x1);

        const yEdges: number[] = [];
        for (let k = 0; k <= profile.rows.length; k += 1) {
            const y = proj.yOf(profile.min + k * profile.rowH, this.paneId);
            if (y == null) return null;
            yEdges.push(y);
        }
        const yAt = (price: number): number | null => proj.yOf(price, this.paneId);
        return {
            x0: Math.min(x0, x1),
            x1: Math.max(x0, x1),
            anchorX,
            maxW,
            grow: growRight ? 1 : -1,
            profile,
            yEdges,
            vahY: yAt(profile.rows[profile.vaTo]!.price + profile.rowH),
            valY: yAt(profile.rows[profile.vaFrom]!.price),
            pocY: yAt(profile.rows[profile.poc]!.price + profile.rowH / 2),
        };
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const L = this.layout(proj);
        if (!L) return false;
        const left = L.grow === 1 ? L.anchorX : L.anchorX - L.maxW;
        const right = L.grow === 1 ? L.anchorX + L.maxW : L.anchorX;
        const yLo = Math.min(L.yEdges[0]!, L.yEdges[L.yEdges.length - 1]!);
        const yHi = Math.max(L.yEdges[0]!, L.yEdges[L.yEdges.length - 1]!);
        if (pointInPolygon(px, py, [[left, yLo], [right, yLo], [right, yHi], [left, yHi]])) return true;
        for (const y of [L.vahY, L.valY, L.pocY]) {
            if (y != null && distToSegment(px, py, L.x0, y, L.x1, y) <= tol) return true;
        }
        return false;
    }

    handlePoints(proj: Projector): Array<[number, number]> {
        const L = this.layout(proj);
        if (L && L.pocY != null) return [[L.x0, L.pocY], [L.x1, L.pocY]];
        const pts: Array<[number, number]> = [];
        for (const a of this.anchors) {
            const y = proj.yOf(a.price, this.paneId);
            if (y == null) return [];
            pts.push([proj.xOf(a.time), y]);
        }
        return pts;
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        return handleAt(px, py, this.handlePoints(proj), tol + 3);
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const L = this.layout(proj);
        if (!L) return null;
        const left = Math.min(L.x0, L.grow === 1 ? L.anchorX : L.anchorX - L.maxW);
        const right = Math.max(L.x1, L.grow === 1 ? L.anchorX + L.maxW : L.anchorX);
        const yLo = Math.min(L.yEdges[0]!, L.yEdges[L.yEdges.length - 1]!);
        const yHi = Math.max(L.yEdges[0]!, L.yEdges[L.yEdges.length - 1]!);
        return { x: left, y: yLo, w: right - left, h: yHi - yLo };
    }

    priceRange(): { min: number; max: number } | null {
        if (this.cachedRange) return this.cachedRange;
        const a = this.anchors[0];
        const b = this.anchors[1];
        if (!a || !b) return null;
        return { min: Math.min(a.price, b.price), max: Math.max(a.price, b.price) };
    }

    schema(): SettingsSchema {
        // All controls live in the gear panel — the schema paths gate that UI branch.
        return {
            fields: [
                { path: 'frtpo.rows', label: 'Rows', kind: 'number', min: 1, max: 500, step: 1, group: 'behavior' },
                { path: 'frtpo.periodMin', label: 'Period (min)', kind: 'number', min: 1, max: 1440, step: 1, group: 'behavior' },
                { path: 'frtpo.valueAreaPct', label: 'Value Area', kind: 'number', min: 0, max: 100, step: 1, group: 'behavior' },
                { path: 'frtpo.widthPct', label: 'Width %', kind: 'number', min: 0, max: 100, step: 1, group: 'behavior' },
                {
                    path: 'frtpo.anchor',
                    label: 'Anchor',
                    kind: 'select',
                    options: [
                        { value: 'right', label: 'Right' },
                        { value: 'left', label: 'Left' },
                    ],
                    group: 'behavior',
                },
                {
                    path: 'frtpo.display',
                    label: 'Display',
                    kind: 'select',
                    options: [
                        { value: 'letters', label: 'Letters' },
                        { value: 'blocks', label: 'Blocks' },
                    ],
                    group: 'behavior',
                },
                { path: 'frtpo.color', label: 'TPO', kind: 'color', group: 'fill' },
                { path: 'frtpo.vaColor', label: 'Value Area', kind: 'color', group: 'fill' },
                { path: 'frtpo.showVah', label: 'VAH', kind: 'boolean', group: 'line' },
                { path: 'frtpo.vahColor', label: 'VAH color', kind: 'color', group: 'line' },
                { path: 'frtpo.vahStyle', label: 'VAH style', kind: 'lineStyle', options: LINE_STYLE_OPTIONS, group: 'line' },
                { path: 'frtpo.showVal', label: 'VAL', kind: 'boolean', group: 'line' },
                { path: 'frtpo.valColor', label: 'VAL color', kind: 'color', group: 'line' },
                { path: 'frtpo.valStyle', label: 'VAL style', kind: 'lineStyle', options: LINE_STYLE_OPTIONS, group: 'line' },
                { path: 'frtpo.showPoc', label: 'POC', kind: 'boolean', group: 'line' },
                { path: 'frtpo.pocColor', label: 'POC color', kind: 'color', group: 'line' },
                { path: 'frtpo.pocStyle', label: 'POC style', kind: 'lineStyle', options: LINE_STYLE_OPTIONS, group: 'line' },
            ],
        };
    }

    protected override writeProps(): Record<string, unknown> {
        return { ...this.frtpo };
    }

    protected override readProps(props: Record<string, unknown>): void {
        this.frtpo = { ...defaultFrtpStyle(), ...(props as Partial<FrtpStyle>) };
    }
}
