// Table view — TradingView's right-click "Table view": the bars on screen as rows (time, OHLC, change,
// volume), newest first, in a dialog. Read once when it opens; reopen for fresh values.
import type { Vela } from '../Vela';
import { Dialog } from '../ui/components/dialog';
import { injectStyles } from '../ui/styles';
import { fmtPrice, priceDecimals } from './format';

const STYLE_ID = 'vela-widget-table-view';
const CSS = `
.vela-tv-wrap { max-height: min(60vh, 520px); overflow: auto; }
.vela-tv-table { border-collapse: collapse; font-size: var(--vela-font-size-sm); font-variant-numeric: tabular-nums; white-space: nowrap; }
.vela-tv-table th {
    position: sticky; top: 0; background: var(--vela-surface-overlay); color: var(--vela-fg-muted);
    font-weight: 500; text-align: right; padding: 4px 10px; border-bottom: 1px solid var(--vela-border-soft);
}
.vela-tv-table td { text-align: right; padding: 3px 10px; border-bottom: 1px solid var(--vela-border-soft); }
.vela-tv-table th:first-child, .vela-tv-table td:first-child { text-align: left; }
.vela-tv-up { color: var(--vela-up); }
.vela-tv-down { color: var(--vela-down); }
.vela-tv-note { color: var(--vela-fg-muted); font-size: var(--vela-font-size-sm); margin-top: var(--vela-space-2); }
`;

/** Most rows shown: a wide screen of 1m bars stays quick to open. */
export const TABLE_VIEW_MAX_ROWS = 1000;

export interface TableViewRow {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    /** Percent change from the previous bar's close; null for the first bar. */
    change: number | null;
    volume?: number;
}

/** The visible bars as rows, newest first (pure, for tests). Without a visible range, the latest bars. */
export function tableViewRows(
    bars: ReadonlyArray<{ time: number; open: number; high: number; low: number; close: number; volume?: number }>,
    range: { from: number; to: number } | null,
    max = TABLE_VIEW_MAX_ROWS,
): TableViewRow[] {
    const rows: TableViewRow[] = [];
    for (let i = bars.length - 1; i >= 0 && rows.length < max; i -= 1) {
        const b = bars[i]!;
        if (range && (b.time > range.to || b.time < range.from)) continue;
        const prev = bars[i - 1];
        rows.push({
            time: b.time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            change: prev && prev.close !== 0 ? ((b.close - prev.close) / prev.close) * 100 : null,
            ...(b.volume != null ? { volume: b.volume } : {}),
        });
    }
    return rows;
}

function fmtVolume(v: number | undefined): string {
    if (v == null || !Number.isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
    return v.toFixed(a >= 100 ? 0 : 2);
}

/** Open the table for `chart`'s bars on screen. The dialog removes itself when closed. */
export function openTableView(chart: Vela, host: HTMLElement): void {
    const doc = host.ownerDocument;
    injectStyles(STYLE_ID, CSS, doc);
    const rows = tableViewRows(chart.bars(), chart.getVisibleRange());
    const tz = String(chart.renderer.get('timezone') ?? 'Etc/UTC');
    let time: Intl.DateTimeFormat;
    try {
        time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
        time = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    }
    const dp = priceDecimals(rows[0]?.close ?? 1, chart.renderer.priceMintick?.());

    const wrap = doc.createElement('div');
    wrap.className = 'vela-tv-wrap';
    const table = doc.createElement('table');
    table.className = 'vela-tv-table';
    const head = table.createTHead().insertRow();
    for (const h of ['Time', 'Open', 'High', 'Low', 'Close', 'Change', 'Volume']) {
        const th = doc.createElement('th');
        th.textContent = h;
        head.appendChild(th);
    }
    const body = table.createTBody();
    for (const r of rows) {
        const tr = body.insertRow();
        const cells = [time.format(r.time), fmtPrice(r.open, dp), fmtPrice(r.high, dp), fmtPrice(r.low, dp), fmtPrice(r.close, dp)];
        for (const text of cells) tr.insertCell().textContent = text;
        const ch = tr.insertCell();
        if (r.change == null) ch.textContent = '—';
        else {
            ch.textContent = `${r.change > 0 ? '+' : r.change < 0 ? '−' : ''}${Math.abs(r.change).toFixed(2)}%`;
            if (r.change !== 0) ch.className = r.change > 0 ? 'vela-tv-up' : 'vela-tv-down';
        }
        tr.insertCell().textContent = fmtVolume(r.volume);
    }
    wrap.appendChild(table);

    const dialog: Dialog = new Dialog({
        title: 'Table view',
        host,
        closeOnInteractOutside: true,
        content: (el) => {
            el.appendChild(wrap);
            const note = doc.createElement('div');
            note.className = 'vela-tv-note';
            note.textContent = rows.length
                ? `${rows.length} bar${rows.length === 1 ? '' : 's'} on screen, newest first.`
                : 'No bars on screen.';
            el.appendChild(note);
        },
        onOpenChange: (open) => {
            if (!open) setTimeout(() => dialog.destroy(), 0);
        },
    });
    dialog.show();
}
