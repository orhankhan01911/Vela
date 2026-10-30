// @vitest-environment jsdom
// The pitchfork, TradingView parity (audit 2026-10-30, factory defaults read from TradingView): a 2 px red median that
// also draws the base line, nine 2 px levels with TradingView's colors (0.5 and 1 on), 20 % band fills, one shape with
// a Style dropdown (Original / Schiff / Modified Schiff / Inside), no Text tab, three round default-cursor handles.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

import { createDrawing, deserializeDrawing, PitchforkBase, type Drawing, type Projector } from '../src/core/drawings';
import { DARK_THEME } from '../src/core/theme';
import { DrawingSettingsPopup, type SettingsActions } from '../src/renderers/native/drawings/DrawingSettingsPopup';

beforeAll(() => {
    Element.prototype.animate ??= (() => ({ cancel() {}, finish() {}, addEventListener() {} })) as unknown as Element['animate'];
});

afterEach(() => {
    document.body.replaceChildren();
});

const settled = () => new Promise<void>((r) => setTimeout(r, 50));

/** A chart stand-in that, like the renderer, rebuilds the drawing after every edit and restores like the controller. */
function chart(initial: Drawing): { actions: SettingsActions; live: () => Drawing } {
    let live = initial;
    const sync = (): void => {
        live = deserializeDrawing(live.serialize())!;
    };
    const actions: SettingsActions = {
        resolve: () => live,
        patch: (p) => {
            live.applySettings(p);
            sync();
        },
        restore: (doc) => {
            if (doc.style) live.style = { ...doc.style };
            if (doc.text !== undefined) live.text = doc.text ? { ...doc.text } : undefined;
            if (doc.props !== undefined) live.applyProps(doc.props);
            if (doc.anchors) live.anchors = doc.anchors.map((p) => ({ ...p }));
            if ('intervals' in doc) live.intervals = doc.intervals ? { ...doc.intervals } : undefined;
            sync();
        },
        setLocked: () => {},
        reorder: () => {},
        duplicate: () => {},
        resetSettings: () => {},
        remove: () => {},
    };
    return { actions, live: () => live };
}

function setup(drawing: Drawing) {
    const host = document.createElement('div');
    document.body.append(host);
    const popup = new DrawingSettingsPopup(host, DARK_THEME);
    const c = chart(drawing);
    popup.open([drawing], null, c.actions);
    const tips = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-dpop [data-tip]')].map((e) => e.dataset.tip!);
    const gear = (): HTMLButtonElement => host.querySelector<HTMLButtonElement>('.vela-dpop [data-tip="Settings"]')!;
    const tabs = (): string[] => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].map((e) => e.textContent!);
    const tab = (name: string): HTMLElement => [...host.querySelectorAll<HTMLElement>('.vela-drawing-dialog [role="tab"]')].find((e) => e.textContent === name)!;
    const body = (key: string): HTMLElement => host.querySelector<HTMLElement>(`.vela-drawing-dialog [data-tab="${key}"]:not([role="tab"])`)!;
    const button = (label: string): HTMLButtonElement => [...host.querySelectorAll<HTMLButtonElement>('.vela-drawing-dialog button')].find((b) => b.textContent === label)!;
    return { host, popup, live: c.live, tips, gear, tabs, tab, body, button };
}




const proj: Projector = {
    xOf: (t) => t,
    yOf: (price, paneId) => (paneId === 'price' ? 1000 - price : null),
    pxToPoint: (x, y) => ({ time: x, price: 1000 - y }),
    paneIdAtY: () => 'price',
    width: 2000,
    height: 1000,
};
const three = [{ time: 100, price: 400 }, { time: 300, price: 700 }, { time: 400, price: 500 }];
const pf = (type = 'pitchfork', props?: Record<string, unknown>): PitchforkBase =>
    createDrawing(type as never, { id: 'p', paneId: 'price', anchors: three, ...(props ? { props } : {}) })! as PitchforkBase;
const RED = '#f23645';

describe('pitchfork defaults (TradingView)', () => {
    it('levels: TradingView colors, 0.5 and 1 on, every one 2 px solid; median red 2 px; 20 % fills', () => {
        const d = pf();
        expect(d.levels.map((l) => [l.ratio, l.color.toLowerCase(), l.enabled])).toEqual([
            [0.25, '#ffb74d', false],
            [0.382, '#81c784', false],
            [0.5, '#089981', true],
            [0.618, '#089981', false],
            [0.75, '#00bcd4', false],
            [1, '#2962ff', true],
            [1.5, '#9c27b0', false],
            [1.75, '#e91e63', false],
            [2, '#f77c80', false],
        ]);
        expect(d.levels.every((l) => l.lineWidth === 2 && l.lineStyle === 'solid')).toBe(true);
        expect([d.medianColor.toLowerCase(), d.medianWidth, d.medianStyle]).toEqual([RED, 2, 'solid']);
        expect([d.background, d.fillOpacity, d.extendLines]).toEqual([true, 0.2, false]);
    });

    it('the base line (p2-p3) is drawn in the median\'s line', () => {
        const g = pf().geometry(proj)!;
        const base = g.colored!.find((c) => c.seg[0] === 300 && c.seg[2] === 400)!;
        expect([base.color.toLowerCase(), base.lineWidth]).toEqual([RED, 2]);
    });

    it('three round handles with the default cursor', () => {
        const d = pf();
        expect(d.handlePoints(proj).length).toBe(3);
        expect(d.handleShapes().every((s) => s !== 'square')).toBe(true);
        expect([0, 1, 2].map((i) => d.handleCursor(i))).toEqual([null, null, null]);
    });

    it('has no Text settings', () => {
        expect(pf().schema().fields.some((f) => f.path.startsWith('text.'))).toBe(false);
    });
});

describe('pitchfork Style (one shape, four constructions)', () => {
    it('each tool starts on its own style, and the dropdown draws exactly that tool\'s construction', () => {
        const tools = { pitchfork: 'original', schiffpitchfork: 'schiff', modifiedschiffpitchfork: 'modifiedschiff', insidepitchfork: 'inside' } as const;
        for (const [type, style] of Object.entries(tools)) {
            expect(pf(type).currentForkStyle()).toBe(style);
            const switched = pf('pitchfork');
            switched.applySettings({ forkStyle: style });
            expect(switched.geometry(proj), type).toEqual(pf(type).geometry(proj));
        }
    });

    it('the chosen style survives a save', () => {
        const d = pf();
        d.applySettings({ forkStyle: 'inside' });
        const back = deserializeDrawing(d.serialize())! as PitchforkBase;
        expect(back.currentForkStyle()).toBe('inside');
        expect(back.type).toBe('pitchfork');
    });
});

describe('pitchfork toolbar and saved drawings', () => {
    it('the toolbar color is Use one color; its width and dash restyle every line', () => {
        const d = pf();
        d.applySettings({ 'style.lineColor': '#00ff00', 'style.lineWidth': 3, 'style.lineStyle': 'dotted' });
        expect(d.levels.every((l) => l.color === '#00ff00' && l.lineWidth === 3 && l.lineStyle === 'dotted')).toBe(true);
        expect([d.medianColor.toLowerCase(), d.medianWidth, d.medianStyle]).toEqual([RED, 3, 'dotted']);
    });

    it('a pitchfork saved before keeps its line width on the median and base line', () => {
        const old = deserializeDrawing({
            id: 'o', type: 'pitchfork', paneId: 'price', anchors: three, style: { lineColor: '#123456', lineWidth: 1, lineStyle: 'solid' },
            props: { levels: [{ ratio: 1, color: '#123456', enabled: true }], background: false, fillOpacity: 0.2, extendLines: false, medianColor: '' },
        } as never)! as PitchforkBase;
        const g = old.geometry(proj)!;
        expect(g.colored!.every((c) => c.color === '#123456' && c.lineWidth === undefined)).toBe(true);
        expect(old.medianWidth).toBeUndefined();
    });
});

describe('pitchfork dialog', () => {
    it('Style, Coordinates, Visibility; TradingView\'s rows in its order', async () => {
        const s = setup(pf());
        s.gear().click();
        await settled();
        expect(s.tabs()).toEqual(['Style', 'Coordinates', 'Visibility']);
        s.tab('Style').click();
        const st = s.body('style');
        const roles = [...st.querySelectorAll<HTMLElement>('[data-role]')].map((e) => e.dataset.role!).filter((r) => !/-(coeff|line)$/.test(r) || r === 'median-line');
        expect(roles).toEqual(['extend-lines', 'median-line', ...Array.from({ length: 9 }, (_, i) => `level-${i}`), 'one-color', 'background', 'fork-style']);
        expect(st.textContent).not.toContain('Numbers size');
        expect(st.textContent).not.toContain('label');
    });

    it('a level switch turns that level on', async () => {
        const s = setup(pf());
        s.gear().click();
        await settled();
        s.tab('Style').click();
        s.body('style').querySelector<HTMLElement>('[data-role="level-0"] [role="switch"]')!.click();
        expect((s.live() as PitchforkBase).levels[0]!.enabled).toBe(true);
    });

    it('the Style dropdown lists TradingView\'s four styles, showing the tool\'s own', async () => {
        const s = setup(pf('schiffpitchfork'));
        s.gear().click();
        await settled();
        expect(s.body('style').querySelector('[data-role="fork-style"]')!.textContent).toContain('Schiff');
    });
});
