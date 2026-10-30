// @vitest-environment jsdom
// TradingView's emoji and icon tools (audit 2026-10-30, read from TradingView's code): Twemoji art and Font Awesome 4
// glyphs, 72 px, upright; a frame with four corner handles (resize) and rotate zones just outside them; the Icons panel
// with Emojis / Icons tabs, categories and recently used.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, EmojiDrawing, IconDrawing, EMOJI_GROUPS, FA_GLYPHS, ICON_GROUPS, TV_LINE_COLOR, type Drawing, type Projector } from '../src/core/drawings';
import { rememberToolSettings, toolSettings } from '../src/core/drawings/toolMemory';
import { setToolChoice, toolChoice } from '../src/core/drawings/toolChoice';
import { buildIconsPanel, glyphSvg } from '../src/renderers/native/drawings/IconsPanel';
import SPRITE from '../src/core/drawings/assets/twemojiSprite';
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
const at = { time: 500, price: 500 }; // centre (500, 500) px
const emoji = (props?: Record<string, unknown>): EmojiDrawing => createDrawing('emoji', { id: 'e', paneId: 'price', anchors: [at], ...(props ? { props } : {}) })! as EmojiDrawing;
const icon = (props?: Record<string, unknown>): IconDrawing => createDrawing('icon', { id: 'i', paneId: 'price', anchors: [at], ...(props ? { props } : {}) })! as IconDrawing;

describe('emoji / icon defaults (TradingView, modules 275496 / 820690)', () => {
    it('emoji: 😀, 72 px, upright; icon: the smile (0xF118) in its blue', () => {
        expect([emoji().emoji, emoji().size, emoji().angle]).toEqual(['😀', 72, Math.PI / 2]);
        const i = icon();
        expect([i.icon, i.size, i.style.lineColor]).toEqual([0xf118, 72, TV_LINE_COLOR]);
    });

    it('a saved layout can only name an emoji / icon the picker has (its art is bundled)', () => {
        expect(emoji({ emoji: '<img src=x>' }).emoji).toBe('😀');
        expect(emoji({ emoji: '🚀' }).emoji).toBe('🚀');
        expect(icon({ icon: 0x41 }).icon).toBe(0xf118);
        expect(emoji({ size: 1e9 }).size).toBe(2000);
        expect(emoji({ size: 3 }).size).toBe(20);
    });

    it('survives a save', () => {
        const d = emoji({ emoji: '🚀', size: 100, angle: 1 });
        const back = deserializeDrawing(d.serialize())! as EmojiDrawing;
        expect([back.emoji, back.size, back.angle]).toEqual(['🚀', 100, 1]);
    });
});

describe('emoji / icon frame and handles (TradingView: corners resize, just outside them rotates)', () => {
    it('frame = size + 2 x 4 px; corners top right, top left, bottom left, bottom right', () => {
        const d = emoji();
        expect(d.frameSide()).toBe(80);
        const h = (80 + 0.75) / 2;
        const k = d.corners(proj).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
        expect(k).toEqual([[500 + h, 500 - h], [500 - h, 500 - h], [500 - h, 500 + h], [500 + h, 500 + h]].map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]));
    });

    it('inside the frame drags it; a corner resizes; 20 px out from a corner rotates', () => {
        const d = emoji();
        const [tr] = d.corners(proj);
        expect(d.hitTest(500, 500, proj, 3)).toBe(true);
        expect(d.hitTest(560, 500, proj, 3)).toBe(false);
        expect(d.hitHandle(tr![0], tr![1], proj, 3)).toBe(0);
        expect(d.hitHandle(tr![0] + 12, tr![1] - 12, proj, 3)).toBe(4);
        expect(d.hitHandle(500, 500, proj, 3)).toBe(-1);
        expect(d.handleCursor(4)).toContain('url(');
        expect(d.handleCursor(3, proj)).toBe('nwse-resize');
        expect(d.handleCursor(0, proj)).toBe('nesw-resize');
    });

    it('a corner drag scales the size by distance from the centre (at least 20); across the centre turns it over', () => {
        const d = emoji();
        const start = { x: 540, y: 540, doc: d.serialize() };
        d.dragHandlePx(3, 560, 560, proj, start);
        expect(d.size).toBeCloseTo(72 * 1.5);
        d.dragHandlePx(3, 501, 501, proj, start);
        expect(d.size).toBe(20);
        d.dragHandlePx(3, 460, 540, proj, start);
        expect(d.angle).toBeCloseTo(Math.PI / 2 + Math.PI);
    });

    it('a rotate drag turns it by the swept angle', () => {
        const d = emoji();
        const start = { x: 600, y: 500, doc: d.serialize() }; // to the right of the centre
        d.dragHandlePx(4, 500, 600, proj, start); // swept to below: a quarter turn
        expect(d.angle).toBeCloseTo(Math.PI / 2 + Math.PI / 2);
    });
});

describe('emoji / icon dialog and memory', () => {
    it('emoji: Visibility only; icon: Style (one Color row) and Visibility', async () => {
        const s = setup(emoji());
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Visibility']);
        document.body.replaceChildren();
        const t = setup(icon());
        t.gear().click();
        await settled();
        expect(t.tabs()).toEqual(['Style', 'Visibility']);
        expect(t.body('style').textContent).toContain('Color');
    });

    it('tool memory keeps the size, not the turn or the picture; the picked one comes from the panel', () => {
        rememberToolSettings(emoji({ emoji: '🚀', size: 100, angle: 2 }).serialize());
        expect(toolSettings('emoji')?.props).toEqual({ size: 100 });
        setToolChoice('emoji', { emoji: '🔥' });
        expect(toolChoice('emoji')).toEqual({ emoji: '🔥' });
    });
});

describe('the Icons panel (TradingView: Emojis / Icons tabs, categories, recently used)', () => {
    it('every emoji has art and every icon a glyph outline', () => {
        const all = EMOJI_GROUPS.flatMap((g) => g.emojis);
        expect(all.length).toBe(1720);
        expect(all.filter((e) => !SPRITE[e])).toEqual([]);
        const codes = ICON_GROUPS.flatMap((g) => g.icons);
        expect(codes.filter((c) => !FA_GLYPHS[c]?.d)).toEqual([]);
        expect(glyphSvg(0xf118, 24)!.querySelector('path')!.getAttribute('d')!.length).toBeGreaterThan(50);
    });

    it('tabs, category strips, and a pick goes to recently used', () => {
        const picks: unknown[] = [];
        const panel = buildIconsPanel((p) => picks.push(p));
        document.body.append(panel);
        expect([...panel.querySelectorAll('.vela-icons-tab')].map((b) => b.textContent)).toEqual(['Emojis', 'Icons']);
        expect(panel.querySelectorAll('.vela-icons-cat').length).toBe(1 + EMOJI_GROUPS.length);
        // (jsdom's selector engine trips on emoji in attribute selectors: find by dataset.)
        const cellOf = (root: Element, e: string) => [...root.querySelectorAll<HTMLElement>('.vela-icons-cell')].find((c) => c.dataset.emoji === e);
        expect(panel.querySelectorAll('.vela-icons-cell').length).toBe(1720);
        cellOf(panel, '😃')!.click();
        expect(picks).toEqual([{ kind: 'emoji', value: '😃' }]);
        panel.querySelector<HTMLElement>('.vela-icons-tab[data-kind="icon"]')!.click();
        expect(panel.querySelectorAll('.vela-icons-cat').length).toBe(1 + ICON_GROUPS.length);
        panel.querySelector<HTMLElement>('.vela-icons-tab[data-kind="emoji"]')!.click();
        const recent = panel.querySelector('.vela-icons-list .vela-icons-grid');
        expect(cellOf(recent!, '😃')).toBeDefined();
    });
});
