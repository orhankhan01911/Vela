// @vitest-environment jsdom
// A host's input menu (registerInputMenu) in the indicator settings dialog: the `source` string is picked from the
// host's checklist instead of typed into a text field (user, 2026-10-20: "the sources are writable").
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DARK_THEME } from '../src/core/theme';
import { registerInputMenu, type InputMenu } from '../src/core/model/inputs';
import { IndicatorInputsDialog, type InputsUIChange } from '../src/renderers/shared/IndicatorInputsDialog';

const VENUES = ['BINANCE', 'OKX', 'BYBIT'];
const MENU: InputMenu = {
    items: (v) => {
        const set = new Set(String(v) === 'CHART' ? [] : String(v).split(','));
        return [
            { id: 'CHART', label: 'Follow chart', toggle: true, checked: String(v) === 'CHART' },
            ...VENUES.map((id, i) => ({ id, label: id, toggle: true, checked: set.has(id), separatorBefore: i === 0 })),
        ];
    },
    pick: (v, id) => {
        if (id === 'CHART') return 'CHART';
        const set = new Set(String(v) === 'CHART' ? [] : String(v).split(','));
        if (set.has(id)) set.delete(id);
        else set.add(id);
        return set.size ? [...set].sort().join(',') : 'CHART';
    },
    label: (v) => (String(v) === 'CHART' ? 'Follow chart' : String(v).split(',').length === 1 ? String(v) : `${String(v).split(',').length} exchanges`),
};

function open(changes: InputsUIChange[]): IndicatorInputsDialog {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const dialog = new IndicatorInputsDialog({
        container: host,
        theme: () => DARK_THEME,
        mobile: () => false,
        dialogHost: () => host,
        symbolPicker: () => null,
        onChange: (c) => changes.push(c),
        onBackdropClose: () => {},
    });
    dialog.open({
        id: 'vd-1',
        title: 'Delta Volume',
        inputs: [
            { key: 'source', title: 'Source', type: 'string', defval: 'CHART' },
            { key: 'note', title: 'Note', type: 'string', defval: '' },
        ],
        values: { source: 'CHART', note: '' },
        props: [],
        propValues: {},
    });
    return dialog;
}

describe('input menus in the indicator settings dialog', () => {
    let dialog: IndicatorInputsDialog;
    const changes: InputsUIChange[] = [];

    beforeEach(() => {
        if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
            (globalThis as { CSS?: unknown }).CSS = { ...(globalThis as { CSS?: object }).CSS, escape: (s: string) => s };
        }
        changes.length = 0;
        registerInputMenu((indicatorId, input) => (indicatorId === 'vd-1' && input.key === 'source' ? MENU : null));
        dialog = open(changes);
    });

    afterEach(() => {
        dialog.close();
        registerInputMenu(null);
        document.body.replaceChildren();
    });

    it('the source input is a dropdown reading the menu label, not a text field; other strings stay text fields', () => {
        const triggers = [...document.querySelectorAll<HTMLButtonElement>('.vela-select-trigger')];
        expect(triggers.map((t) => t.textContent)).toEqual(['Follow chart']);
        expect(document.querySelectorAll('input[type="text"], input:not([type])').length).toBe(1); // the Note field
    });

    it('a click opens the host checklist with the current value checked (picking is checked in a real browser)', () => {
        const trigger = document.querySelector<HTMLButtonElement>('.vela-select-trigger')!;
        trigger.click();
        const rows = [...document.querySelectorAll<HTMLElement>('.vela-menu-item')];
        expect(rows.map((li) => li.querySelector('.vela-menu-label')?.textContent)).toEqual(['Follow chart', 'BINANCE', 'OKX', 'BYBIT']);
        expect(rows[0]!.querySelector('.vela-menu-switch')?.className).toContain('on');
        expect(rows[2]!.querySelector('.vela-menu-switch')?.className).not.toContain('on');
    });

    it('a resolver that throws falls back to the usual text field', () => {
        dialog.close();
        document.body.replaceChildren();
        registerInputMenu(() => {
            throw new Error('boom');
        });
        dialog = open(changes);
        expect(document.querySelectorAll('.vela-select-trigger').length).toBe(0);
    });
});
