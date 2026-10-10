// @vitest-environment jsdom
// The chart settings dialog: (1) a group heading's own `when` takes its page out of the group list
// LIVE (the Footprint "Left/Right footprint" pages while the secondary footprint is off), and
// (2) the footer's "Template ▾" menu — the host's rows, then "Reset defaults" LAST — which replaces
// the plain "Reset defaults" button only while a host registered one.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { SettingsDialog } from '../src/renderers/native/chrome/SettingsDialog';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import { registerChartType, unregisterChartType } from '../src/chart-types/registry';
import { DARK_THEME } from '../src/core/theme';
import type { SettingsTemplateMenuView } from '../src/core/ports/IChartRenderer';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    unregisterChartType('grouptest');
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 60));

function mountDialog(): { dialog: SettingsDialog } {
    const host = document.createElement('div');
    document.body.append(host);
    return { dialog: new SettingsDialog(host, DARK_THEME) };
}

function groupedType(): void {
    registerChartType({
        id: 'grouptest',
        label: 'Group test',
        icon: 'candles',
        settings: {
            title: 'Group test',
            layout: 'grouped',
            rows: [
                { kind: 'heading', label: 'Main' },
                { kind: 'toggle', key: 'secondOn', label: 'Turn on', defval: true },
                { kind: 'heading', label: 'Left', when: { key: 'secondOn', equals: true } },
                { kind: 'number', key: 'leftWidth', label: 'Width', defval: 40 },
                { kind: 'heading', label: 'Colors' },
                { kind: 'color', key: 'buy', label: 'Buy', defval: '#22c55e' },
            ],
        },
    } as never);
}

const tocLabels = (): string[] => [...document.querySelectorAll('.vela-sd-toc:not(.vela-sd-hide) .vela-sd-toc-btn')].map((b) => b.textContent ?? '');

describe('group heading `when`', () => {
    it('drops the page from the group list while its gate is off, and brings it back live', async () => {
        groupedType();
        const { dialog } = mountDialog();
        const config = new NativeRenderer().getConfig();
        const bag = { grouptest: { secondOn: true } };
        const patches: Array<Record<string, unknown>> = [];
        dialog.open({ ...config, series: { ...config.series, style: 'grouptest' }, chartTypes: bag } as never, (p) => patches.push(p), undefined, undefined, 'Group test');
        await settled();
        expect(tocLabels()).toEqual(['Main', 'Left', 'Colors']);

        // Turn the gate off through its own switch: the page leaves the list in place, no reopen.
        const sw = document.querySelector('.vela-sd-struct [data-sd-rows-host] .vela-switch, .vela-sd-struct [data-sd-rows-host] [role=switch], .vela-sd-struct [data-sd-rows-host] button[role=checkbox]') as HTMLElement | null;
        expect(sw).not.toBeNull();
        sw!.click();
        await settled();
        expect(patches[patches.length - 1]).toMatchObject({ chartTypes: { grouptest: { secondOn: false } } });
        expect(tocLabels()).toEqual(['Main', 'Colors']);

        sw!.click();
        await settled();
        expect(tocLabels()).toEqual(['Main', 'Left', 'Colors']);
        dialog.destroy();
    });
});

describe('footer template menu', () => {
    const footerButtons = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('.vela-dialog-footer .vela-sd-btn')];

    it('without a host menu the footer keeps its plain "Reset defaults" button', async () => {
        const { dialog } = mountDialog();
        let resets = 0;
        dialog.open(new NativeRenderer().getConfig(), () => undefined, undefined, () => { resets += 1; });
        await settled();
        const btns = footerButtons();
        expect(btns.map((b) => b.textContent)).toEqual(['Reset defaults']);
        btns[0]!.click();
        expect(resets).toBe(1);
        dialog.destroy();
    });

    it('with a host menu the footer is one "Template" dropdown: host rows first, "Reset defaults" last', async () => {
        const { dialog } = mountDialog();
        const picked: string[] = [];
        let resets = 0;
        const view: SettingsTemplateMenuView = {
            items: () => [
                { id: 'save', label: 'Save current chart as template…' },
                { id: 'apply:A', label: 'A', separatorBefore: true },
                { id: 'delete', label: 'Delete template', separatorBefore: true, submenu: [{ id: 'del:A', label: 'A' }] },
            ],
            run: (id) => picked.push(id),
        };
        dialog.setTemplateMenu(() => view);
        dialog.open(new NativeRenderer().getConfig(), () => undefined, undefined, () => { resets += 1; });
        await settled();
        const btns = footerButtons();
        expect(btns).toHaveLength(1);
        expect(btns[0]!.textContent).toContain('Template');
        expect(btns[0]!.textContent).not.toContain('Reset defaults');

        // The rows are in the (closed) list already — keyboard and touch openers need no click first.
        const root = document.querySelector('.vela-menu');
        const labels = [...(root?.querySelectorAll(':scope > .vela-menu-item') ?? [])].map((li) => li.querySelector('.vela-menu-label')?.textContent);
        expect(labels).toEqual(['Save current chart as template…', 'A', 'Delete template', 'Reset defaults']);
        expect(picked).toEqual([]);
        expect(resets).toBe(0);
        dialog.destroy();
    });

    it('clearing the host menu returns the plain button on the next open', async () => {
        const { dialog } = mountDialog();
        dialog.setTemplateMenu(() => ({ items: () => [], run: () => undefined }));
        dialog.open(new NativeRenderer().getConfig(), () => undefined);
        await settled();
        expect(footerButtons()[0]!.textContent).toContain('Template');
        dialog.close();
        dialog.setTemplateMenu(null);
        dialog.open(new NativeRenderer().getConfig(), () => undefined);
        await settled();
        expect(footerButtons().map((b) => b.textContent)).toEqual(['Reset defaults']);
        dialog.destroy();
    });
});
