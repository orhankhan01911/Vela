// @vitest-environment jsdom
// A Menu opened on a phone with no visible button to hang from is a bottom sheet, not a dropdown pinned in a corner
// (2026-10-28: the language picker, Add widget and Templates opened from the More sheet as small desktop dropdowns).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Menu } from '../src/ui/components/menu/view';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

let coarse = true;
beforeAll(() => {
    window.matchMedia = ((q: string) => ({ matches: q.includes('coarse') ? coarse : false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
    document.body.replaceChildren();
    coarse = true;
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
});

const phone = (): void => {
    coarse = true;
    Object.defineProperty(window, 'innerWidth', { value: 393, configurable: true });
};

function make(picked: string[]): Menu {
    const host = document.createElement('div');
    document.body.appendChild(host);
    return new Menu({
        host,
        items: [
            { id: 'save', label: 'Save template…' },
            { id: 'auto', label: 'Autosave', toggle: true, checked: false },
            { id: 'open', label: 'Open template', submenu: [{ id: 't1', label: 'Scalping' }, { id: 't2', label: 'Swing', checked: true }] },
            { id: 'del', label: 'Delete template', disabled: true },
        ],
        onSelect: (id) => picked.push(id),
    });
}

const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.vela-msheet-row')];

describe('Menu on a phone without a visible trigger', () => {
    it('opens as a bottom sheet, not a dropdown', () => {
        phone();
        make([]).open();
        expect(document.querySelector('.vela-drawer')).toBeTruthy();
        expect(rows().map((r) => r.textContent)).toEqual(['Save template…', 'Autosave', 'Open template', 'Delete template']);
    });

    it('a row picks and closes; a switch flips and stays; a disabled row does nothing', () => {
        phone();
        const picked: string[] = [];
        make(picked).open();
        rows()[1]!.click();
        expect(picked).toEqual(['auto']);
        expect(rows()[1]!.getAttribute('aria-checked')).toBe('true');
        rows()[3]!.click();
        expect(picked).toEqual(['auto']);
        rows()[0]!.click();
        expect(picked).toEqual(['auto', 'save']);
    });

    it('a submenu opens as a sub-page with a back row', () => {
        phone();
        const picked: string[] = [];
        make(picked).open();
        rows()[2]!.click();
        expect(rows().map((r) => r.textContent)).toEqual(['Open template', 'Scalping', 'Swing✓']);
        rows()[0]!.click(); // back
        expect(rows()).toHaveLength(4);
        rows()[2]!.click();
        rows()[1]!.click();
        expect(picked).toEqual(['t1']);
    });

    it('stays a dropdown on a desktop, and on a phone when its button is on screen', () => {
        coarse = false;
        make([]).open();
        expect(document.querySelector('.vela-drawer')).toBeNull();
        document.body.replaceChildren();
        phone();
        const host = document.createElement('div');
        const btn = document.createElement('button');
        btn.getClientRects = (() => [{ width: 10, height: 10 }]) as unknown as typeof btn.getClientRects;
        document.body.append(host, btn);
        new Menu({ host, trigger: btn, items: [{ id: 'a', label: 'A' }] }).open();
        expect(document.querySelector('.vela-drawer')).toBeNull();
    });

    it('a field of a dialog opens its menu as a sheet on a phone, and a pick re-renders the sheet', () => {
        phone();
        const panel = document.createElement('div');
        panel.className = 'vela-dialog';
        const btn = document.createElement('button');
        btn.getClientRects = (() => [{ width: 10, height: 10 }]) as unknown as typeof btn.getClientRects;
        panel.appendChild(btn);
        document.body.appendChild(panel);
        // an exchange checklist: picking one exchange turns "Follow chart" off
        let picked = new Set(['chart']);
        const items = () => ['chart', 'binance', 'okx'].map((id) => ({ id, label: id, toggle: true, checked: picked.has(id) }));
        const m: Menu = new Menu({
            trigger: btn,
            items: items(),
            onSelect: (id) => {
                picked = id === 'chart' ? new Set(['chart']) : new Set([...picked].filter((x) => x !== 'chart').concat(id));
                m.setItems(items());
            },
        });
        m.open();
        expect(document.querySelector('.vela-drawer')).toBeTruthy();
        rows()[1]!.click();
        expect(rows().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
        rows()[2]!.click();
        expect(rows().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'true']);
    });
});
