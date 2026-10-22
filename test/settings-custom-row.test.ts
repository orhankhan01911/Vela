// @vitest-environment jsdom
// A host settings row the host draws itself (`kind: 'custom'`): the chart background tab's picture grid.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { SettingsDialog } from '../src/renderers/native/chrome/SettingsDialog';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import { DARK_THEME } from '../src/core/theme';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});
afterEach(() => document.body.replaceChildren());

describe("host settings row kind 'custom'", () => {
    it('hands the host an empty element in its tab, and a failing row does not break the dialog', async () => {
        const host = document.createElement('div');
        document.body.append(host);
        const dialog = new SettingsDialog(host, DARK_THEME);
        const seen: HTMLElement[] = [];
        dialog.setHostSections([
            {
                title: 'Background',
                id: 'bg',
                placement: 'end',
                rows: [
                    { kind: 'custom', label: 'Pictures', render: (el) => (seen.push(el), el.append(Object.assign(document.createElement('button'), { className: 'pic', textContent: 'Storm' }))) },
                    { kind: 'custom', label: 'Broken', render: () => { throw new Error('boom'); } },
                    { kind: 'toggle', label: 'After', get: () => true, set: () => {} },
                ],
            },
        ]);
        dialog.open(new NativeRenderer().getConfig() as never, () => {});
        await new Promise((r) => setTimeout(r, 60));
        expect(seen).toHaveLength(1);
        expect(seen[0]!.isConnected).toBe(true);
        expect(document.querySelector('.vela-sd-custom .pic')?.textContent).toBe('Storm');
        expect(document.body.textContent).toContain('After');
    });
});
