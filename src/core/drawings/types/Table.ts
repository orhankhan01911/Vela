import { Drawing, type AnchorSlot } from '../Drawing';
import type { DrawingPoint, Projector } from '../geometry';
import type { SettingsSchema } from '../schema';
import { ScreenPin } from './Anchored';

/** TradingView's table (module 932107): cell padding, border, the active cell's outline, a new column's width, the
 *  text size and line height. */
export const TV_TABLE = {
    padding: 8,
    border: 1,
    activeLine: 2,
    columnWidth: 120,
    fontSize: 14,
    lineHeight: 1.3,
    background: '#000000', // palette-exempt: TradingView's cold-gray-900 table background (dark theme)
    borderColor: '#555555', // palette-exempt: TradingView's cold-gray-650 table border (dark theme)
    text: '#DBDBDB', // palette-exempt: TradingView's cold-gray-200 table text (dark theme)
    active: '#2962FF', // palette-exempt: TradingView's tv-blue-500 active cell
} as const;

/** Most rows and columns a table keeps, and the longest cell text. */
const MAX_ROWS = 50;
const MAX_COLS = 20;
const MAX_CELL = 2000;
/** A column edge handle is 4 + its column; a row edge handle 4 + ROW_EDGE + its row. */
const ROW_EDGE = 64;

export type TableAlign = 'left' | 'center' | 'right';
export type TableOp = 'addRow' | 'addColumn' | 'removeRow' | 'removeColumn';

/** Text width in px at a font size: the painter installs the canvas' own measure; until then an estimate. */
let measure: (text: string, px: number) => number = (t, px) => t.length * px * 0.6;
export function setTableTextMeasure(fn: (text: string, px: number) => number): void {
    measure = fn;
}

/** The cell each table has active (typed in, or last typed in) and whether it is being typed in. Kept outside the
 *  drawing: it is not saved, and a sync rebuilds the drawing. */
const ACTIVE = new Map<string, { cell: [number, number]; editing: boolean }>();
export function tableActiveCell(id: string): { cell: [number, number]; editing: boolean } | null {
    return ACTIVE.get(id) ?? null;
}
export function setTableActiveCell(id: string, cell: [number, number] | null, editing = false): void {
    if (cell) ACTIVE.set(id, { cell, editing });
    else ACTIVE.delete(id);
}

/** Lines of `text` wrapped to `width` px (words, then a word too long for a line by characters). */
export function wrapTableText(text: string, width: number, px: number): string[] {
    const out: string[] = [];
    for (const para of text.split('\n')) {
        let line = '';
        for (const word of para.split(/(\s+)/)) {
            if (!word) continue;
            const next = line + word;
            if (measure(next, px) <= width || line === '') {
                if (measure(next, px) <= width) {
                    line = next;
                    continue;
                }
                // a word wider than the line: break it by characters
                let part = line;
                for (const ch of word) {
                    if (part !== '' && measure(part + ch, px) > width) {
                        out.push(part);
                        part = ch.trim() ? ch : '';
                    } else part += ch;
                }
                line = part;
                continue;
            }
            out.push(line.trimEnd());
            line = word.trim() ? word : '';
        }
        out.push(line.trimEnd());
    }
    return out;
}

/** TradingView's fit of sizes to a new total: scaled alike, none under its minimum (module 932107). */
export function fitTotal(vals: readonly number[], mins: readonly number[], total: number, depth = 0): number[] {
    const sumOf = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
    let sum = sumOf(vals);
    let target = Math.max(total, sumOf(mins));
    if (sum === target || sum <= 0) return [...vals];
    if (target < sum) {
        for (let i = 0; i < vals.length; i += 1) {
            if (vals[i] === mins[i]) {
                sum -= vals[i]!;
                target -= vals[i]!;
            }
        }
    }
    const k = sum > 0 ? target / sum : 1;
    const r = vals.map((v, i) => Math.max(mins[i]!, v * k));
    return sumOf(r) > target + 0.01 && depth < 20 ? fitTotal(r, mins, total, depth + 1) : r;
}

/** The table on screen: column and row edges (px) and each cell's wrapped lines. */
export interface TableLayout {
    colX: number[];
    rowY: number[];
    lines: string[][][];
    /** Each row's least height (its tallest text). */
    minRowH: number[];
    minColW: number;
}

/**
 * TradingView's table: a grid of cells you type in, its top left corner on a bar and price (or pinned to the screen),
 * columns 120 px wide when added, rows as tall as their tallest text (or taller when dragged). Corner handles resize
 * it all, a column's right edge or a row's bottom edge resizes that one. A table saved before (rows as lines of text,
 * cells split by "|") is read into cells.
 */
export class TableDrawing extends Drawing {
    readonly type = 'table' as const;
    declare cells: string[][];
    declare columnWidths: number[];
    /** Each row's height; 0 = as tall as its text. */
    declare rowHeights: number[];
    declare textColor?: string;
    declare fontSize?: number;
    declare horzAlign?: TableAlign;
    /** Pinned to the screen (TradingView's "Anchor drawing"). */
    declare anchored?: boolean;
    private pinState?: ScreenPin;
    private get pin(): ScreenPin {
        return (this.pinState ??= new ScreenPin());
    }

    constructor(init: ConstructorParameters<typeof Drawing>[0]) {
        super(init);
        if (!this.cells) {
            // A table saved before: its text, a row per line and "|" between cells (kept pinned, as it was).
            const old = init.text?.value;
            if (old != null && init.props) {
                const rows = old.split('\n').slice(0, MAX_ROWS).map((r) => r.split('|').slice(0, MAX_COLS).map((c) => c.trim()));
                const cols = Math.max(1, ...rows.map((r) => r.length));
                this.cells = rows.map((r) => [...r, ...Array.from({ length: cols - r.length }, () => '')]);
                this.anchored = true;
                if (init.text?.color) this.textColor = init.text.color;
            } else this.cells = Array.from({ length: 3 }, () => ['', '', '']);
            this.text = undefined;
        }
        const cols = this.cells[0]?.length ?? 1;
        if (!this.columnWidths || this.columnWidths.length !== cols) this.columnWidths = Array.from({ length: cols }, (_, i) => this.columnWidths?.[i] ?? TV_TABLE.columnWidth);
        if (!this.rowHeights || this.rowHeights.length !== this.cells.length) this.rowHeights = this.cells.map((_, i) => this.rowHeights?.[i] ?? 0);
        this.textColor ??= TV_TABLE.text;
        this.fontSize ??= TV_TABLE.fontSize;
        this.horzAlign ??= 'left';
        this.anchored ??= false;
        if (!init.props) this.style = { ...this.style, lineColor: TV_TABLE.borderColor, fillColor: TV_TABLE.background };
    }

    anchorSchema(): { min: number; max: number; slots: AnchorSlot[] } {
        return { min: 1, max: 1, slots: [{ role: 'topLeft', free: 'both' }] };
    }

    rows(): number {
        return this.cells.length;
    }

    cols(): number {
        return this.cells[0]?.length ?? 0;
    }

    /** The narrowest a column may get: one "0" plus its padding and borders. */
    minColumnWidth(): number {
        const px = this.fontSize ?? TV_TABLE.fontSize;
        return measure('0', px) + 2 * TV_TABLE.padding + 2 * TV_TABLE.border;
    }

    private topLeft(proj: Projector): [number, number] | null {
        if (this.anchored) this.pin.resolve(this.anchors, this.paneId, proj);
        const a = this.anchors[0];
        if (!a) return null;
        const y = proj.yOf(a.price, this.paneId);
        return y == null ? null : [Math.round(proj.xOf(a.time)), Math.round(y)];
    }

    /** Where every cell is: TradingView's text area per cell (its width less padding and borders), lines of
     *  size × 1.3 (the last one size tall), padded 8 and bordered 1. */
    layout(proj: Projector): TableLayout | null {
        const tl = this.topLeft(proj);
        if (!tl) return null;
        const px = this.fontSize ?? TV_TABLE.fontSize;
        const pad = TV_TABLE.padding;
        const bw = TV_TABLE.border;
        const minColW = this.minColumnWidth();
        const widths = this.columnWidths.map((w) => Math.max(w, minColW));
        const lines = this.cells.map((row) => row.map((t, c) => wrapTableText(t, Math.max(widths[c]! - 2 * pad - 2 * bw, measure('0', px)), px)));
        const minRowH = lines.map((row) => Math.max(px + 2 * pad + bw, ...row.map((ls) => ls.length * px + (ls.length - 1) * px * (TV_TABLE.lineHeight - 1) + 2 * pad + 2 * bw)));
        const heights = minRowH.map((m, r) => Math.max(m, this.rowHeights[r] ?? 0));
        const colX = [tl[0]];
        for (const w of widths) colX.push(colX[colX.length - 1]! + w);
        const rowY = [tl[1]];
        for (const h of heights) rowY.push(rowY[rowY.length - 1]! + h);
        return { colX: colX.map(Math.round), rowY: rowY.map(Math.round), lines, minRowH, minColW };
    }

    /** The cell under a pixel, or null. */
    cellAt(px: number, py: number, proj: Projector): [number, number] | null {
        const L = this.layout(proj);
        if (!L) return null;
        const c = L.colX.findIndex((x, i) => i < L.colX.length - 1 && px >= x && px < L.colX[i + 1]!);
        const r = L.rowY.findIndex((y, i) => i < L.rowY.length - 1 && py >= y && py < L.rowY[i + 1]!);
        return c >= 0 && r >= 0 ? [r, c] : null;
    }

    /** TradingView's four corner handles: top left, bottom left, top right, bottom right. */
    handlePoints(proj: Projector): Array<[number, number]> {
        const L = this.layout(proj);
        if (!L) return [];
        const [l, r] = [L.colX[0]!, L.colX[L.colX.length - 1]!];
        const [t, b] = [L.rowY[0]!, L.rowY[L.rowY.length - 1]!];
        return [[l, t], [l, b], [r, t], [r, b]];
    }

    hitHandle(px: number, py: number, proj: Projector, tol: number): number {
        const L = this.layout(proj);
        if (!L) return -1;
        const corners = this.handlePoints(proj);
        const i = corners.findIndex(([x, y]) => Math.abs(px - x) <= tol + 3 && Math.abs(py - y) <= tol + 3);
        if (i >= 0) return i;
        const [l, r] = [L.colX[0]!, L.colX[L.colX.length - 1]!];
        const [t, b] = [L.rowY[0]!, L.rowY[L.rowY.length - 1]!];
        if (py >= t && py <= b) for (let c = 0; c < this.cols(); c += 1) if (Math.abs(px - L.colX[c + 1]!) <= tol) return 4 + c;
        if (px >= l && px <= r) for (let row = 0; row < this.rows(); row += 1) if (Math.abs(py - L.rowY[row + 1]!) <= tol) return 4 + ROW_EDGE + row;
        return -1;
    }

    override handleCursor(index: number): string | null {
        if (index === 0 || index === 3) return 'nwse-resize';
        if (index === 1 || index === 2) return 'nesw-resize';
        return index >= 4 + ROW_EDGE ? 'row-resize' : index >= 4 ? 'col-resize' : null;
    }

    /** Corners resize the whole table (TradingView keeps the far corner and scales every column and row alike, none
     *  under its least size); an edge resizes its column or row. */
    override dragHandlePx(index: number, x: number, y: number, proj: Projector, start?: { x: number; y: number; doc: { props?: Record<string, unknown> } }): boolean {
        const L = this.layout(proj);
        if (!L) return true;
        const minW = L.minColW;
        if (index >= 4 + ROW_EDGE) {
            const r = index - 4 - ROW_EDGE;
            if (r < this.rows()) this.rowHeights = this.rowHeights.map((h, i) => (i === r ? Math.max(L.minRowH[r]!, y - L.rowY[r]!) : h));
            return true;
        }
        if (index >= 4) {
            const c = index - 4;
            if (c < this.cols()) this.columnWidths = this.columnWidths.map((w, i) => (i === c ? Math.max(minW, x - L.colX[c]!) : w));
            return true;
        }
        // From the sizes at the press, so the drag never compounds.
        const startW = (start?.doc.props?.columnWidths as number[] | undefined) ?? this.columnWidths;
        const startH = (start?.doc.props?.rowHeights as number[] | undefined) ?? this.rowHeights;
        const w0 = startW.map((w) => Math.max(w, minW));
        const h0 = startH.map((h, r) => Math.max(h, L.minRowH[r] ?? 0));
        const left = index <= 1;
        const top = index === 0 || index === 2;
        // the far corner stays where it is now
        const fx = left ? L.colX[L.colX.length - 1]! : L.colX[0]!;
        const fy = top ? L.rowY[L.rowY.length - 1]! : L.rowY[0]!;
        const minTotalW = minW * this.cols();
        const minTotalH = L.minRowH.reduce((a, b) => a + b, 0);
        const nx = left ? Math.min(x, fx - minTotalW) : Math.max(x, fx + minTotalW);
        const ny = top ? Math.min(y, fy - minTotalH) : Math.max(y, fy + minTotalH);
        this.columnWidths = fitTotal(w0, w0.map(() => minW), Math.abs(fx - nx));
        this.rowHeights = fitTotal(h0, L.minRowH, Math.abs(fy - ny));
        if (left || top) {
            const p = proj.pxToPoint(left ? nx : L.colX[0]!, top ? ny : L.rowY[0]!, this.paneId);
            const a = this.anchors[0]!;
            this.anchors = [{ time: left ? p.time : a.time, price: top ? p.price : a.price }];
        }
        return true;
    }

    hitTest(px: number, py: number, proj: Projector, tol: number): boolean {
        const b = this.bounds(proj);
        return b != null && px >= b.x - tol && px <= b.x + b.w + tol && py >= b.y - tol && py <= b.y + b.h + tol;
    }

    bounds(proj: Projector): { x: number; y: number; w: number; h: number } | null {
        const L = this.layout(proj);
        if (!L) return null;
        const x = L.colX[0]!;
        const y = L.rowY[0]!;
        return { x, y, w: L.colX[L.colX.length - 1]! - x, h: L.rowY[L.rowY.length - 1]! - y };
    }

    priceRange(): { min: number; max: number } | null {
        const a = this.anchors[0];
        return a && !this.anchored ? { min: a.price, max: a.price } : null;
    }

    override timeExtent(): { min: number; max: number } | null {
        if (this.anchored) return null; // on screen whatever the time range
        const a = this.anchors[0];
        return a ? { min: a.time, max: a.time } : null;
    }

    /** Pinned to the screen it marks nothing on the axes. */
    override axisPoints(): DrawingPoint[] {
        return this.anchored ? [] : this.anchors.slice(0, 1);
    }

    /** TradingView adds a row below the active cell's row (the last row when none) and a column to its right; it
     *  removes the active cell's row or column (never the last one). */
    tableOp(op: TableOp, active: [number, number] | null): [number, number] | null {
        const [r, c] = active ?? [this.rows() - 1, this.cols() - 1];
        if (op === 'addRow' && this.rows() < MAX_ROWS) {
            this.cells.splice(r + 1, 0, Array.from({ length: this.cols() }, () => ''));
            this.rowHeights.splice(r + 1, 0, 0);
        } else if (op === 'addColumn' && this.cols() < MAX_COLS) {
            for (const row of this.cells) row.splice(c + 1, 0, '');
            this.columnWidths.splice(c + 1, 0, TV_TABLE.columnWidth);
        } else if (op === 'removeRow' && active && this.rows() > 1) {
            this.cells.splice(r, 1);
            this.rowHeights.splice(r, 1);
        } else if (op === 'removeColumn' && active && this.cols() > 1) {
            for (const row of this.cells) row.splice(c, 1);
            this.columnWidths.splice(c, 1);
        }
        return active ? [Math.min(r, this.rows() - 1), Math.min(c, this.cols() - 1)] : null;
    }

    schema(): SettingsSchema {
        return { fields: [] };
    }

    protected override writeProps(): Record<string, unknown> {
        return {
            cells: this.cells.map((r) => [...r]),
            columnWidths: [...this.columnWidths],
            rowHeights: [...this.rowHeights],
            textColor: this.textColor,
            fontSize: this.fontSize,
            horzAlign: this.horzAlign,
            anchored: this.anchored === true,
            ...(this.anchored ? this.pin.write() : {}),
        };
    }

    protected override readProps(props: Record<string, unknown>): void {
        if (Array.isArray(props.cells) && props.cells.length > 0) {
            const rows = props.cells.slice(0, MAX_ROWS).map((r) => (Array.isArray(r) ? r.slice(0, MAX_COLS).map((c) => (typeof c === 'string' ? c.slice(0, MAX_CELL) : '')) : []));
            const cols = Math.max(1, ...rows.map((r) => r.length));
            this.cells = rows.map((r) => [...r, ...Array.from({ length: cols - r.length }, () => '')]);
        }
        const nums = (v: unknown): number[] | undefined => (Array.isArray(v) ? v.map((n) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(4000, Math.max(0, n)) : 0)) : undefined);
        this.columnWidths = nums(props.columnWidths) ?? this.columnWidths;
        this.rowHeights = nums(props.rowHeights) ?? this.rowHeights;
        if (typeof props.textColor === 'string') this.textColor = props.textColor;
        if (typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)) this.fontSize = Math.min(72, Math.max(6, props.fontSize));
        if (props.horzAlign === 'left' || props.horzAlign === 'center' || props.horzAlign === 'right') this.horzAlign = props.horzAlign;
        if (typeof props.anchored === 'boolean') this.anchored = props.anchored;
        this.pin.read(props);
    }
}
