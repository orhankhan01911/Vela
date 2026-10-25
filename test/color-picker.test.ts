import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { VelaTheme } from '../src/core/options';
import { splitColor, combineColor, buildColorPicker, hsvHex, hexHsv, parseHexInput } from '../src/ui/components/color-picker';

// A minimal element stub (this suite runs in the node env — no jsdom). It models just
// enough of the tree for `buildColorPicker`: parent links so `isConnected` can be
// answered, child mutation, and per-element listeners.
interface FakeEl {
    tag: string;
    type: string;
    value: string;
    textContent: string;
    style: { cssText: string } & Record<string, string>;
    dataset: Record<string, string>;
    children: FakeEl[];
    parentNode: FakeEl | null;
    attached: boolean;
    readonly isConnected: boolean;
    addEventListener: (t: string, fn: (e: unknown) => void) => void;
    dispatchEvent: (e: { type: string; stopPropagation?: () => void }) => boolean;
    appendChild: (c: FakeEl) => FakeEl;
    append: (...cs: FakeEl[]) => void;
    replaceChildren: (...cs: FakeEl[]) => void;
    remove: () => void;
    setAttribute: (k: string, v: string) => void;
    querySelector: (tag: string) => FakeEl | null;
    focus: () => void;
    setPointerCapture: (id: number) => void;
    getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
}

function fakeEl(tag: string): FakeEl {
    const listeners = new Map<string, Array<(e: unknown) => void>>();
    const el: FakeEl = {
        tag,
        type: '',
        value: '',
        textContent: '',
        style: { cssText: '' },
        dataset: {},
        children: [],
        parentNode: null,
        attached: false,
        get isConnected(): boolean {
            let n: FakeEl | null = el;
            while (n.parentNode) n = n.parentNode;
            return n.attached;
        },
        addEventListener: (t, fn) => { const a = listeners.get(t) ?? []; a.push(fn); listeners.set(t, a); },
        dispatchEvent: (e) => { for (const fn of listeners.get(e.type) ?? []) fn(e); return true; },
        appendChild: (c) => { c.parentNode?.children.splice(c.parentNode.children.indexOf(c), 1); c.parentNode = el; el.children.push(c); return c; },
        append: (...cs) => { for (const c of cs) el.appendChild(c); },
        replaceChildren: (...cs) => { for (const c of el.children) c.parentNode = null; el.children = []; el.append(...cs); },
        remove: () => { if (el.parentNode) { el.parentNode.children.splice(el.parentNode.children.indexOf(el), 1); el.parentNode = null; } },
        setAttribute: () => {},
        querySelector: (t) => {
            for (const c of el.children) {
                if (c.tag === t) return c;
                const deep = c.querySelector(t);
                if (deep) return deep;
            }
            return null;
        },
        focus: () => {},
        setPointerCapture: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    };
    return el;
}

describe('color picker custom colour (TradingView: hex field, saturation square, hue bar, Add)', () => {
    const theme = { textColor: '#fff', fontFamily: 'sans-serif' } as unknown as VelaTheme;
    let savedDocument: unknown;

    beforeEach(() => {
        savedDocument = (globalThis as { document?: unknown }).document;
        (globalThis as { document: unknown }).document = { createElement: (tag: string) => fakeEl(tag) };
    });
    afterEach(() => {
        (globalThis as { document?: unknown }).document = savedDocument;
    });

    const byId = (root: FakeEl, id: string): FakeEl | null => {
        if (root.dataset.testid === id) return root;
        for (const c of root.children) {
            const f = byId(c, id);
            if (f) return f;
        }
        return null;
    };
    const ev = (type: string, extra: Record<string, unknown> = {}): { type: string; stopPropagation(): void; preventDefault(): void } & Record<string, unknown> =>
        ({ type, stopPropagation: () => {}, preventDefault: () => {}, ...extra });

    function mount(): { root: FakeEl; palette: FakeEl; picked: string[]; open(): FakeEl } {
        const picked: string[] = [];
        const root = buildColorPicker('#089981', theme, (v) => picked.push(v)) as unknown as FakeEl;
        const palette = root.children[0]!;
        return {
            root,
            palette,
            picked,
            open: () => {
                byId(root, 'color-custom')!.dispatchEvent(ev('click'));
                return byId(root, 'color-custom-panel')!;
            },
        };
    }

    it('"+" opens our own panel on the current colour in hex, not the browser chooser (RGB)', () => {
        const { root, palette, open } = mount();
        expect(byId(root, 'color-custom')!.tag).toBe('button');
        const panel = open();
        expect(palette.style.display).toBe('none');
        expect(byId(panel, 'color-hex')!.value).toBe('#089981');
        expect(byId(panel, 'color-add')!.textContent).toBe('Add');
    });

    it('typing a hex code previews it; Add keeps it in the recents and goes back to the swatches', () => {
        const { root, palette, picked, open } = mount();
        const panel = open();
        const hex = byId(panel, 'color-hex')!;
        hex.value = 'F00';
        hex.dispatchEvent(ev('input'));
        expect(picked[picked.length - 1]).toBe('#ff0000');
        hex.value = '#12';
        hex.dispatchEvent(ev('input')); // half typed: no colour yet
        expect(picked[picked.length - 1]).toBe('#ff0000');
        hex.value = '#ff0000';
        byId(panel, 'color-add')!.dispatchEvent(ev('click'));
        expect(byId(root, 'color-custom-panel')).toBeNull();
        expect(palette.style.display).toBe('contents');
        const recentRow = palette.children[1]!;
        expect(recentRow.children[0]!.children[0]!.style.cssText).toContain('background:#ff0000');
    });

    it('the square sets saturation and brightness, the bar the hue', () => {
        const { picked, open } = mount();
        const panel = open();
        byId(panel, 'color-hue')!.dispatchEvent(ev('pointerdown', { clientX: 5, clientY: 0, pointerId: 1 }));
        byId(panel, 'color-square')!.dispatchEvent(ev('pointerdown', { clientX: 100, clientY: 0, pointerId: 1 }));
        expect(picked[picked.length - 1]).toBe('#ff0000'); // hue 0, full saturation and brightness
        byId(panel, 'color-square')!.dispatchEvent(ev('pointerdown', { clientX: 0, clientY: 100, pointerId: 1 }));
        expect(picked[picked.length - 1]).toBe('#000000');
        expect(byId(panel, 'color-hex')!.value).toBe('#000000');
    });
});

describe('custom colour math', () => {
    it('hex, HSV and typed codes', () => {
        expect(hsvHex(0, 1, 1)).toBe('#ff0000');
        expect(hsvHex(120, 1, 1)).toBe('#00ff00');
        expect(hsvHex(240, 1, 0.5)).toBe('#000080');
        for (const c of ['#089981', '#f23645', '#2962ff', '#ffffff', '#000000', '#808080']) {
            const { h, s: sat, v } = hexHsv(c);
            expect(hsvHex(h, sat, v)).toBe(c);
        }
        expect(parseHexInput('F00')).toBe('#ff0000');
        expect(parseHexInput(' #2962FF ')).toBe('#2962ff');
        expect(parseHexInput('#12')).toBeNull();
        expect(parseHexInput('red')).toBeNull();
    });
});

describe('color picker opacity slider', () => {
    const theme = { textColor: '#fff', fontFamily: 'sans-serif' } as unknown as VelaTheme;
    let savedDocument: unknown;

    beforeEach(() => {
        savedDocument = (globalThis as { document?: unknown }).document;
        (globalThis as { document: unknown }).document = { createElement: (tag: string) => fakeEl(tag) };
    });
    afterEach(() => {
        (globalThis as { document?: unknown }).document = savedDocument;
    });

    type Track = FakeEl & { captured: number[] };

    function mount(commit?: 'live' | 'release'): { track: Track; pct: FakeEl; emitted: string[] } {
        const emitted: string[] = [];
        const root = buildColorPicker('#089981', theme, (v) => emitted.push(v), commit ? { commit } : {}) as unknown as FakeEl;
        // root → [palette → [grid, recentRow, opacity label, opacity row]]; opacity row → [track, "%" box].
        const opRow = root.children[0]!.children[3]!;
        const track = opRow.children[0]! as Track;
        track.captured = [];
        track.getBoundingClientRect = () => ({ left: 100, top: 0, width: 200, height: 13 });
        track.setPointerCapture = (id) => track.captured.push(id);
        return { track, pct: opRow.children[1]!, emitted };
    }
    const pointer = (type: string, clientX: number): { type: string; clientX: number; pointerId: number; stopPropagation(): void } => ({
        type,
        clientX,
        pointerId: 1,
        stopPropagation: () => {},
    });

    it("defaults to 'live': every move commits, so a cheap consumer previews the drag on the chart", () => {
        const { track, pct, emitted } = mount();
        track.dispatchEvent(pointer('pointerdown', 120)); // 10 %
        track.dispatchEvent(pointer('pointermove', 200)); // 50 %
        track.dispatchEvent(pointer('pointermove', 260)); // 80 %
        expect(pct.value).toBe('80%');
        expect(emitted).toEqual([combineColor('#089981', 0.1), combineColor('#089981', 0.5), combineColor('#089981', 0.8)]);
        // Release adds nothing: the last move already committed the final value.
        track.dispatchEvent(pointer('pointerup', 260));
        expect(emitted).toHaveLength(3);
    });

    it("'release': previews the opacity while dragging and commits ONCE on release", () => {
        const { track, pct, emitted } = mount('release');

        track.dispatchEvent(pointer('pointerdown', 120)); // 10 %
        track.dispatchEvent(pointer('pointermove', 160)); // 30 %
        track.dispatchEvent(pointer('pointermove', 200)); // 50 %
        track.dispatchEvent(pointer('pointermove', 260)); // 80 %
        // The readout follows the pointer; nothing has been committed yet — a commit
        // re-executes the script over its whole history, and a drag fires a move per frame.
        expect(pct.value).toBe('80%');
        expect(emitted).toEqual([]);

        track.dispatchEvent(pointer('pointerup', 260));
        expect(emitted).toEqual([combineColor('#089981', 0.8)]);

        // Moves after release are not a drag.
        track.dispatchEvent(pointer('pointermove', 300));
        expect(pct.value).toBe('80%');
        expect(emitted).toHaveLength(1);
    });

    it('a plain click on the track commits once at the clicked opacity, under either policy', () => {
        for (const commit of ['live', 'release'] as const) {
            const { track, emitted } = mount(commit);
            track.dispatchEvent(pointer('pointerdown', 150)); // 25 %
            track.dispatchEvent(pointer('pointerup', 150));
            expect(emitted).toEqual([combineColor('#089981', 0.25)]);
        }
    });

    it('the percentage readout is a text input that sets the opacity when a value is typed', () => {
        for (const commit of ['live', 'release'] as const) {
            const { pct, emitted } = mount(commit);
            expect(pct.tag).toBe('input');
            expect(pct.value).toBe('100%');
            pct.value = '35';
            pct.dispatchEvent({ type: 'change' });
            expect(emitted).toEqual([combineColor('#089981', 0.35)]);
            expect(pct.value).toBe('35%');
            // "%" suffix accepted; out-of-range values clamp.
            pct.value = '250%';
            pct.dispatchEvent({ type: 'change' });
            expect(emitted).toHaveLength(2);
            expect(emitted[1]).toBe('#089981');
            expect(pct.value).toBe('100%');
        }
    });

    it('typed garbage or an unchanged value restores the readout without committing', () => {
        const { pct, emitted } = mount();
        pct.value = 'abc';
        pct.dispatchEvent({ type: 'change' });
        expect(pct.value).toBe('100%');
        pct.value = '100';
        pct.dispatchEvent({ type: 'change' });
        expect(emitted).toEqual([]);
    });

    it('Enter commits the typed value and keeps the keystroke away from outer shortcuts', () => {
        const { pct, emitted } = mount();
        let stopped = 0;
        let blurred = 0;
        (pct as unknown as { blur(): void }).blur = () => { blurred++; };
        pct.value = '20';
        pct.dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault: () => {}, stopPropagation: () => { stopped++; } } as never);
        expect(emitted).toEqual([combineColor('#089981', 0.2)]);
        expect(stopped).toBe(1);
        expect(blurred).toBe(1);
    });

    it("'release': a cancelled drag still commits where the pointer was", () => {
        const { track, emitted } = mount('release');
        track.dispatchEvent(pointer('pointerdown', 120));
        track.dispatchEvent(pointer('pointermove', 200)); // 50 %
        track.dispatchEvent(pointer('pointercancel', 200));
        expect(emitted).toEqual([combineColor('#089981', 0.5)]);
    });
});

describe('color picker color math', () => {
    it('splitColor parses #RRGGBB, #RRGGBBAA, #RGB and rgba()', () => {
        expect(splitColor('#38c0fd')).toEqual({ hex6: '#38c0fd', alpha: 1 });
        const a = splitColor('#38c0fd80');
        expect(a.hex6).toBe('#38c0fd');
        expect(a.alpha).toBeCloseTo(128 / 255, 3);
        expect(splitColor('#0af')).toEqual({ hex6: '#00aaff', alpha: 1 });
        const r = splitColor('rgba(56, 192, 253, 0.5)');
        expect(r.hex6).toBe('#38c0fd');
        expect(r.alpha).toBeCloseTo(0.5, 3);
    });

    it('combineColor → #RRGGBB when opaque, #RRGGBBAA otherwise', () => {
        expect(combineColor('#38c0fd', 1)).toBe('#38c0fd');
        expect(combineColor('#38c0fd', 0.5)).toBe('#38c0fd80'); // 0.5·255 = 128 = 0x80
        expect(combineColor('#38c0fd', 0.35)).toBe('#38c0fd59'); // 0.35·255 ≈ 89 = 0x59
        expect(combineColor('#38c0fd', 0)).toBe('#38c0fd00');
    });
});
