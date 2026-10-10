// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import {
    effectiveBackground,
    gradientCss,
    isGradientColor,
    mergeConfig,
    resolveGradient,
    type ChartConfig,
} from '../src/renderers/native/core/chartConfig';
import { DARK_THEME, LIGHT_THEME } from '../src/core/theme';
import { styleConfigPatch } from '../src/workspace/sync';

// This jsdom build ships no `CSS` global (the kit's style injector needs `escape`) and no ResizeObserver.
(globalThis as { CSS?: unknown }).CSS ??= { escape: (v: string) => v };
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

function baseConfig(): ChartConfig {
    return new NativeRenderer().getConfig();
}

describe('background gradient — pure model', () => {
    it('top defaults to the solid color, bottom eases it toward the contrast ink', () => {
        const dark = resolveGradient('#151619', { top: null, bottom: null });
        expect(dark.top).toBe('#151619');
        expect(dark.bottom).toBe('#2c2d30'); // 10% toward white
        const light = resolveGradient('#ffffff', { top: null, bottom: null });
        expect(light.top).toBe('#ffffff');
        expect(light.bottom).toBe('#e6e6e6'); // 10% toward black
    });

    it('keeps explicit ends and derives only the one that is null', () => {
        expect(resolveGradient('#151619', { top: '#102030', bottom: '#405060' })).toEqual({ top: '#102030', bottom: '#405060' });
        // a null bottom follows the (explicit) top, not the solid color
        const g = resolveGradient('#151619', { top: '#ffffff', bottom: null });
        expect(g.top).toBe('#ffffff');
        expect(g.bottom).toBe('#e6e6e6');
    });

    it('effectiveBackground is the solid color, or the gradient midpoint', () => {
        expect(effectiveBackground('#151619', { type: 'solid', top: '#ffffff', bottom: '#000000' })).toBe('#151619');
        expect(effectiveBackground('#151619', { type: 'gradient', top: '#000000', bottom: '#ffffff' })).toBe('#808080');
    });

    it('gradientCss is a top-to-bottom linear gradient', () => {
        expect(gradientCss('#111111', '#222222')).toBe('linear-gradient(to bottom, #111111, #222222)');
    });

    it('only lets plain colors into the gradient string', () => {
        for (const ok of ['#fff', '#112233', '#11223344', 'red', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)', 'hsl(10 20% 30%)']) {
            expect(isGradientColor(ok), ok).toBe(true);
        }
        for (const bad of ['red), url(//evil/x', 'url(x)', 'var(--x)', '', 7, null, 'red;color:blue', 'rgb(1,2,3), red']) {
            expect(isGradientColor(bad), String(bad)).toBe(false);
        }
    });
});

describe('background gradient — config document', () => {
    it('merges type and both colors, and drops malformed ones', () => {
        const base = baseConfig();
        const out = mergeConfig(base, { layout: { backgroundType: 'gradient', backgroundTop: '#101010', backgroundBottom: '#303030' } });
        expect(out.layout.backgroundType).toBe('gradient');
        expect(out.layout.backgroundTop).toBe('#101010');
        expect(out.layout.backgroundBottom).toBe('#303030');
        expect(out.layout.background).toBe(base.layout.background); // the solid color is kept

        const bad = mergeConfig(base, { layout: { backgroundType: 'radial', backgroundTop: 'red), url(//x', backgroundBottom: 5 } });
        expect(bad.layout.backgroundType).toBe('solid');
        expect(bad.layout.backgroundTop).toBe(base.layout.backgroundTop);
        expect(bad.layout.backgroundBottom).toBe(base.layout.backgroundBottom);
    });

    it('an older saved config without the keys still loads (Solid)', () => {
        const base = baseConfig();
        const legacy = { layout: { background: '#222222', textColor: '#cccccc', fontFamily: 'sans-serif', fontSize: 11 } };
        const out = mergeConfig(base, legacy);
        expect(out.layout.backgroundType).toBe('solid');
        expect(out.layout.background).toBe('#222222');
    });
});

describe('background gradient — NativeRenderer', () => {
    it('defaults to Solid with concrete, derived gradient ends', () => {
        const cfg = new NativeRenderer().getConfig();
        expect(cfg.layout.backgroundType).toBe('solid');
        expect(cfg.layout.backgroundTop).toBe(cfg.layout.background);
        expect(cfg.layout.backgroundBottom).not.toBe(cfg.layout.backgroundTop);
    });

    it('applies Gradient and round-trips through getConfig/applyConfig', () => {
        const r = new NativeRenderer();
        r.applyConfig({ layout: { backgroundType: 'gradient', backgroundTop: '#112233', backgroundBottom: '#445566' } });
        const cfg = r.getConfig();
        expect(cfg.layout.backgroundType).toBe('gradient');
        expect(cfg.layout.backgroundTop).toBe('#112233');
        expect(cfg.layout.backgroundBottom).toBe('#445566');
        expect(cfg.layout.background).toBe('#151619'); // the Solid color is untouched

        const r2 = new NativeRenderer();
        r2.applyConfig(JSON.parse(JSON.stringify(cfg)));
        expect(r2.getConfig().layout).toEqual(cfg.layout);
    });

    it('switching back to Solid restores the solid color and loses nothing', () => {
        const r = new NativeRenderer();
        r.applyConfig({ layout: { background: '#1a1b1e', backgroundType: 'gradient', backgroundTop: '#112233', backgroundBottom: '#445566' } });
        r.applyConfig({ layout: { backgroundType: 'solid' } });
        const cfg = r.getConfig();
        expect(cfg.layout.backgroundType).toBe('solid');
        expect(cfg.layout.background).toBe('#1a1b1e');
        expect(cfg.layout.backgroundTop).toBe('#112233'); // still there for the next switch
        expect(cfg.layout.backgroundBottom).toBe('#445566');
    });

    it('a derived gradient end follows the solid color until it is set explicitly', () => {
        const r = new NativeRenderer();
        r.applyConfig({ layout: { backgroundType: 'gradient' } });
        const before = r.getConfig().layout;
        r.applyConfig({ layout: { background: '#202428' } });
        const after = r.getConfig().layout;
        expect(before.backgroundTop).toBe('#151619');
        expect(after.backgroundTop).toBe('#202428'); // null top ⇒ the solid color
        expect(after.backgroundBottom).not.toBe(before.backgroundBottom);
        // an explicit top pins it
        r.applyConfig({ layout: { backgroundTop: '#303030' } });
        r.applyConfig({ layout: { background: '#101010' } });
        expect(r.getConfig().layout.backgroundTop).toBe('#303030');
    });

    it('re-bases the derived inks on the gradient midpoint, not the unused solid color', () => {
        const r = new NativeRenderer();
        // a dark theme with a LIGHT gradient: the dark theme's pale text would vanish
        r.applyConfig({ layout: { backgroundType: 'gradient', backgroundTop: '#ffffff', backgroundBottom: '#e8e8e8' } });
        expect(r.getConfig().layout.textColor).toBe(LIGHT_THEME.textColor);
        // back to a dark gradient → the dark inks return
        r.applyConfig({ layout: { backgroundTop: '#000000', backgroundBottom: '#202020' } });
        expect(r.getConfig().layout.textColor).toBe(DARK_THEME.textColor);
    });

    it('an app theme swap keeps the Solid/Gradient choice and re-derives its colors', () => {
        const r = new NativeRenderer();
        r.mount(document.createElement('div'), DARK_THEME);
        r.applyConfig({ layout: { backgroundType: 'gradient' } });
        r.setTheme(LIGHT_THEME);
        const cfg = r.getConfig().layout;
        expect(cfg.backgroundType).toBe('gradient');
        expect(cfg.background).toBe(LIGHT_THEME.background);
        expect(cfg.backgroundTop).toBe(LIGHT_THEME.background);
    });
});

describe('background gradient — style link', () => {
    it('travels with the layout block, so a style-linked cell follows a Gradient edit', () => {
        const origin = new NativeRenderer();
        const follower = new NativeRenderer();
        origin.applyConfig({ layout: { backgroundType: 'gradient', backgroundTop: '#112233', backgroundBottom: '#445566' } });
        const patch = styleConfigPatch(origin.getConfig(), follower.getConfig());
        expect(patch?.layout).toMatchObject({ backgroundType: 'gradient', backgroundTop: '#112233', backgroundBottom: '#445566' });
        follower.applyConfig(patch);
        expect(follower.getConfig().layout).toEqual(origin.getConfig().layout);
    });
});
