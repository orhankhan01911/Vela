// @vitest-environment jsdom
// The path, TradingView parity (audit 2026-10-30, read from TradingView's code, module 592788): blue 2 px, a plain left
// end and an open arrow on the right, one Line row and Visibility, ended by a click on the last point.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, Path, TV_LINE_COLOR, type Drawing, type DrawingIntent, type Projector } from '../src/core/drawings';
import { DrawingInteraction } from '../src/renderers/native/drawings/DrawingInteraction';
import { chevronArms } from '../src/renderers/native/drawings/DrawingPainter';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});
afterEach(() => {
    document.body.replaceChildren();
});
const settled = () => new Promise<void>((r) => setTimeout(r, 50));

function setup(drawing: Drawing) {
    const host = document.createElement('div');
    document.body.append(host);
    const popup = new DrawingSettingsPopup(host, DARK_THEME);
    let live = drawing;
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            live = deserializeDrawing(live.serialize())!;
        },
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    popup.open([drawing], null, actions);
    const tab = (name: string): HTMLElement => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].find((e) => e.textContent === name)!;
    return {
        live: () => live,
        gear: () => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!,
        tabs: () => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!),
        tab,
        body: (key: string) => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!,
    };
}

const proj: Projector = { xOf: (t) => t, yOf: (p) => 1000 - p, pxToPoint: (x, y) => ({ time: x, price: 1000 - y }), paneIdAtY: () => 'price', width: 2000, height: 1000 };
const pts = [{ time: 100, price: 500 }, { time: 200, price: 600 }, { time: 300, price: 500 }];
const path = (props?: Record<string, unknown>): Path => createDrawing('path', { id: 'p', paneId: 'price', anchors: pts, ...(props ? { props } : {}) })! as Path;

describe('path defaults (TradingView, module 592788)', () => {
    it('blue 2 px solid, plain left end, arrow at the right end', () => {
        const d = path();
        expect(d.style).toMatchObject({ lineColor: TV_LINE_COLOR, lineWidth: 2, lineStyle: 'solid', arrowLeft: false, arrowRight: true });
        expect(d.tv).toBe(true);
    });

    it('one Line row with both ends; no text', () => {
        const paths = path().schema().fields.map((f) => f.path);
        expect(paths).toEqual(['style.lineColor', 'style.lineWidth', 'style.lineStyle', 'style.arrowLeft', 'style.arrowRight']);
    });

    it('is hit across its width; survives a save; a path saved before keeps its look', () => {
        const d = path();
        d.applySettings({ 'style.lineWidth': 10, 'style.arrowLeft': true });
        expect(d.hitTest(150, 1000 - 550 + 5, proj, 3)).toBe(true);
        const back = deserializeDrawing(d.serialize())! as Path;
        expect([back.tv, back.style.arrowLeft, back.style.arrowRight]).toEqual([true, true, true]);
        const old = deserializeDrawing({ id: 'o', type: 'path', paneId: 'price', anchors: pts, style: { lineColor: '#38c0fd', lineWidth: 2, lineStyle: 'solid' } } as never)! as Path;
        expect(old.tv).toBeUndefined();
        expect(old.schema().fields.some((f) => f.path.startsWith('text.'))).toBe(true);
    });
});

describe("TradingView's open arrow end", () => {
    it('two arms 5 x the line width back and out at 45 degrees', () => {
        const [a, b] = chevronArms([0, 0], [100, 0], 2)!;
        expect(a[0]).toBeCloseTo(90);
        expect(b[0]).toBeCloseTo(90);
        expect(Math.abs(a[1])).toBeCloseTo(10);
        expect(a[1]).toBeCloseTo(-b[1]);
        expect(chevronArms([0, 0], [0.5, 0], 2)).toBeNull();
    });
});

describe('path placement (TradingView)', () => {
    const harness = () => {
        const intents: DrawingIntent[] = [];
        const it = new DrawingInteraction({
            projector: () => proj,
            activeTool: () => 'path',
            drawings: () => [],
            hoveredId: () => null,
            selectedIds: () => new Set<string>(),
            emit: (i) => intents.push(i),
            changed: () => {},
            openSettings: () => {},
            snap: (pt) => pt,
            lastStyle: () => undefined,
        });
        return { it, intents };
    };

    it('a click on the last point ends it (no duplicate point)', () => {
        const h = harness();
        h.it.down(100, 500);
        h.it.down(200, 400);
        h.it.down(300, 500);
        expect(h.it.isPlacing()).toBe(true);
        h.it.down(302, 501); // within 5 px of the last point
        expect(h.it.isPlacing()).toBe(false);
        const create = h.intents.find((i) => i.kind === 'create');
        expect(create?.kind === 'create' && create.doc.anchors.length).toBe(3);
        expect(h.it.finishPlacing(true)).toBe(false); // the double-click that follows changes nothing
    });

    it('a click farther away adds a point', () => {
        const h = harness();
        h.it.down(100, 500);
        h.it.down(110, 500);
        expect(h.it.isPlacing()).toBe(true);
    });
});

describe('path dialog (TradingView: Style + Visibility)', () => {
    it('Line with both ends; no Text or Coordinates', async () => {
        const s = setup(path());
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Visibility']);
        expect(document.querySelector('.vela-drawing-dialog')!.textContent).toContain('Path');
        expect(s.body('style').textContent).toContain('Line');
    });
});
