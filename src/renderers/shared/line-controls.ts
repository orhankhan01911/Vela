import { vt } from '../../i18n';

/** Small caption over a control group in a popover ("Thickness", "Line style"). */
export function caption(text: string): HTMLElement {
    const c = document.createElement('div');
    c.textContent = vt(text);
    c.style.cssText = 'font-size:12px;color:var(--vela-fg-muted);margin-top:2px;';
    return c;
}

/** TradingView's segmented picker in the line popover: equal cells, each a sample of the line; the current one lit. */
export function segmented(cells: Array<{ value: string; sample: { width: number; style: string } }>, value: string, onPick: (v: string) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;border:1px solid var(--vela-border-strong);border-radius:6px;overflow:hidden;';
    const els: HTMLButtonElement[] = [];
    const paint = (v: string): void => {
        els.forEach((el, i) => {
            const on = cells[i]!.value === v;
            el.style.background = on ? 'var(--vela-fg-bright)' : 'transparent';
            el.style.color = on ? 'var(--vela-surface-overlay, #000)' : 'var(--vela-fg)';
            el.setAttribute('aria-pressed', String(on));
        });
    };
    cells.forEach((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.value = c.value;
        b.style.cssText = `flex:1 1 0;height:30px;display:flex;align-items:center;justify-content:center;border:none;${i ? 'border-left:1px solid var(--vela-border-strong);' : ''}cursor:pointer;padding:0;`;
        const line = document.createElement('span');
        line.style.cssText = `display:block;width:26px;height:0;border-top:${c.sample.width}px ${c.sample.style} currentColor;`;
        b.appendChild(line);
        b.addEventListener('click', (e) => {
            e.stopPropagation();
            paint(c.value);
            onPick(c.value);
        });
        els.push(b);
        row.appendChild(b);
    });
    paint(value);
    return row;
}
