// @vitest-environment jsdom
// The table, TradingView parity (audit 2026-10-31, read from TradingView's module 932107, its table actions 167820
// and its live dialog and floating toolbar).
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, TableDrawing, setTableTextMeasure, setTableActiveCell, fitTotal, wrapTableText, rememberToolSettings, toolSettings, clearToolSettings, type Drawing, type Projector } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});
// every character 7 px wide at 14 px (a "0" is 7 px): easy sums
beforeEach(() => setTableTextMeasure((t, px) => (t.length * px) / 2));
afterEach(() => {
    document.body.replaceChildren();
    setTableActiveCell('t', null);
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));
const proj: Projector = {
    xOf: (t) => t,
    yOf: (price, paneId) => (paneId === 'price' ? 1000 - price : null),
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    paneRect: () => ({ top: 0, height: 1000 }),
    width: 2000,
    height: 1000,
};
const table = (props?: Record<string, unknown>): TableDrawing => createDrawing('table', { id: 't', paneId: 'price', anchors: [{ time: 100, price: 900 }], ...(props ? { props } : {}) })! as TableDrawing;

describe('Table defaults and layout (TradingView)', () => {
    it('an empty 3 x 3 grid, 120 px columns, black with grey borders, 14 px light text, left aligned, not pinned', () => {
        const t = table();
        expect(t.cells).toEqual([['', '', ''], ['', '', ''], ['', '', '']]);
        expect(t.columnWidths).toEqual([120, 120, 120]);
        expect([t.style.fillColor, t.style.lineColor, t.textColor, t.fontSize, t.horzAlign, t.anchored]).toEqual(['#000000', '#555555', '#DBDBDB', 14, 'left', false]);
        expect(t.text).toBeUndefined();
    });

    it('rows as tall as one line plus padding (14 + 16 + 2); columns from the top left corner', () => {
        const L = table().layout(proj)!;
        expect(L.colX).toEqual([100, 220, 340, 460]);
        expect(L.rowY).toEqual([100, 132, 164, 196]);
    });

    it('text wraps to the column (less padding and borders) and its row grows: lines 1.3 x the size apart', () => {
        const t = table();
        t.applySettings({ 'cells.1.0': 'aaaaa bbbbb ccccc' }); // 120 - 18 = 102 px holds 14 chars
        expect(wrapTableText('aaaaa bbbbb ccccc', 102, 14)).toEqual(['aaaaa bbbbb', 'ccccc']);
        const L = t.layout(proj)!;
        expect(L.rowY[2]! - L.rowY[1]!).toBe(Math.round(2 * 14 + 14 * 0.3 + 18));
    });

    it('the cell under a point; four corner handles; a column\'s right edge and a row\'s bottom edge', () => {
        const t = table();
        expect(t.cellAt(250, 140, proj)).toEqual([1, 1]);
        expect(t.cellAt(90, 140, proj)).toBeNull();
        expect(t.handlePoints(proj)).toEqual([[100, 100], [100, 196], [460, 100], [460, 196]]);
        expect(t.hitHandle(220, 150, proj, 3)).toBe(4); // column 0's right edge
        expect(t.hitHandle(300, 132, proj, 3)).toBe(4 + 64); // row 0's bottom edge
        expect([t.handleCursor(0), t.handleCursor(2), t.handleCursor(5), t.handleCursor(69)]).toEqual(['nwse-resize', 'nesw-resize', 'col-resize', 'row-resize']);
    });
});

describe('Table resizing', () => {
    it('an edge drag sizes its column (never under a "0" plus padding) or row (never under its text)', () => {
        const t = table();
        t.dragHandlePx(4, 300, 150, proj);
        expect(t.columnWidths).toEqual([200, 120, 120]);
        t.dragHandlePx(4, 101, 150, proj);
        expect(t.columnWidths[0]).toBe(7 + 16 + 2);
        t.dragHandlePx(4 + 64, 300, 110, proj);
        expect(t.layout(proj)!.rowY[1]! - 100).toBe(32);
        t.dragHandlePx(4 + 64, 300, 160, proj);
        expect(t.rowHeights[0]).toBe(60);
    });

    it('the bottom right corner scales every column and row alike, the top left corner keeps the far corner', () => {
        const t = table();
        const doc = t.serialize();
        t.dragHandlePx(3, 100 + 720, 100 + 192, proj, { x: 460, y: 196, doc });
        expect(t.columnWidths).toEqual([240, 240, 240]);
        expect(t.rowHeights).toEqual([64, 64, 64]);
        const u = table();
        u.dragHandlePx(0, 40, 50, proj, { x: 100, y: 100, doc: u.serialize() });
        expect(u.anchors[0]).toEqual({ time: 40, price: 950 });
        const b = u.bounds(proj)!;
        expect([b.x + b.w, b.y + b.h]).toEqual([460, 196]);
    });

    it('fitTotal never takes a size under its minimum', () => {
        const r = fitTotal([100, 20], [10, 20], 60);
        expect(r[1]).toBe(20);
        expect(r[0]! + r[1]!).toBeCloseTo(60, 6);
    });
});

describe('Table rows and columns (TradingView: after the active cell, or at the end)', () => {
    it('adds a row below and a column to the right of the active cell; removes its row and column', () => {
        const t = table();
        t.applySettings({ 'cells.0.0': 'a', 'cells.1.1': 'b' });
        expect(t.tableOp('addRow', [0, 0])).toEqual([0, 0]);
        expect(t.cells.map((r) => r[0])).toEqual(['a', '', '', '']);
        t.tableOp('addColumn', [1, 0]);
        expect(t.cells[2]).toEqual(['', '', 'b', '']);
        expect(t.columnWidths).toEqual([120, 120, 120, 120]);
        t.tableOp('removeColumn', [0, 1]);
        t.tableOp('removeRow', [1, 0]);
        expect(t.cells).toEqual([['a', '', ''], ['', 'b', ''], ['', '', '']]);
    });

    it('with no active cell it adds at the end and removes nothing; the last row and column stay', () => {
        const t = table();
        t.tableOp('addRow', null);
        expect(t.rows()).toBe(4);
        t.tableOp('removeRow', null);
        expect(t.rows()).toBe(4);
        const one = table({ cells: [['x']], columnWidths: [120], rowHeights: [0] });
        one.tableOp('removeRow', [0, 0]);
        one.tableOp('removeColumn', [0, 0]);
        expect(one.cells).toEqual([['x']]);
    });
});

describe('Table saving', () => {
    it('keeps cells, sizes, look and its pin', () => {
        const t = table();
        t.applySettings({ 'cells.2.1': 'hi', textColor: '#ff0000', fontSize: 18, horzAlign: 'center', anchored: true });
        t.dragHandlePx(5, 400, 150, proj);
        t.handlePoints(proj);
        const back = deserializeDrawing(t.serialize())! as TableDrawing;
        expect([back.cells[2]![1], back.textColor, back.fontSize, back.horzAlign, back.anchored, back.columnWidths[1]]).toEqual(['hi', '#ff0000', 18, 'center', true, 180]);
        expect(back.serialize().props).toMatchObject({ fx: 0.05, fy: 0.1 });
    });

    it('remembers its look for the next table, never its cells, sizes or pin', () => {
        clearToolSettings();
        const t = table();
        t.applySettings({ 'cells.0.0': 'secret', textColor: '#00ff00', anchored: true });
        rememberToolSettings(t.serialize());
        const kept = toolSettings('table')!.props!;
        expect(kept.textColor).toBe('#00ff00');
        expect(['cells', 'columnWidths', 'rowHeights', 'anchored', 'fx', 'fy'].some((k) => k in kept)).toBe(false);
        clearToolSettings();
    });
});

function setup(drawing: TableDrawing, ops: string[] = []) {
    let live: Drawing = drawing;
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            live = deserializeDrawing(live.serialize())!;
        },
        restore: () => {},
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
        toggleAnchor: () => ops.push('pin'),
        tableOp: (op) => ops.push(op),
    };
    const host = document.createElement('div');
    document.body.append(host);
    new DrawingSettingsPopup(host, DARK_THEME).open([drawing], null, actions);
    const tips = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-dpop [data-tip]')].map((e) => e.dataset.tip!);
    return { host, tips, live: () => live };
}

describe('Table toolbar, more menu and dialog', () => {
    it('bar: templates, Insert column, Insert row, border, background and text colours, settings, lock, pin', () => {
        const ops: string[] = [];
        const s = setup(table(), ops);
        const t = s.tips();
        const order = ['Insert column', 'Insert row', 'Line color', 'Fill', 'Text color', 'Settings', 'Lock', 'Anchor drawing'];
        expect(order.map((k) => t.indexOf(k))).toEqual([...order.map((k) => t.indexOf(k))].sort((a, b) => a - b));
        expect(order.every((k) => t.includes(k))).toBe(true);
        expect(t).not.toContain('Line width');
        s.host.querySelector<HTMLElement>('.vela-dpop [data-tip="Insert row"]')!.click();
        s.host.querySelector<HTMLElement>('.vela-dpop [data-tip="Insert column"]')!.click();
        expect(ops).toEqual(['addRow', 'addColumn']);
    });

    it('more menu: add a column / row; remove row and column only while a cell is active', async () => {
        const menu = async (): Promise<string[]> => {
            const s = setup(table());
            s.host.querySelector<HTMLElement>('.vela-dpop [data-tip="More"]')!.click();
            await settled();
            const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"], .vela-menu-item, button')].map((e) => e.textContent?.trim() ?? '');
            document.body.replaceChildren();
            return items;
        };
        const idle = await menu();
        expect(idle).toContain('Add column to right');
        expect(idle).toContain('Add row below');
        expect(idle).not.toContain('Remove row');
        setTableActiveCell('t', [1, 1]);
        const active = await menu();
        expect(active).toContain('Remove row');
        expect(active).toContain('Remove column');
    });

    it('dialog "Table": Style (Background, Border, Text, Text alignment) and Visibility', async () => {
        const s = setup(table());
        s.host.querySelector<HTMLElement>('.vela-dpop [data-tip="Settings"]')!.click();
        await settled();
        const tabs = [...s.host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent);
        expect(tabs).toEqual(['Style', 'Visibility']);
        const style = s.host.querySelector<HTMLElement>('.vela-drawing-dialog [data-tab="style"]:not([role="tab"])')!;
        expect([...style.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role)).toEqual(['background', 'border', 'text', 'align']);
        expect(s.host.querySelector('.vela-drawing-dialog')!.textContent).toContain('Table');
    });
});
