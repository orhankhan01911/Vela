import { describe, it, expect, vi } from 'vitest';
import { wheelZoomAnchor, autoWheelZoomAnchor, isHorizontalWheel, wheelPanRightOffset, wheelPanDelta, InputController, type InputControllerDeps } from '../src/renderers/native/core/InputController';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import { CoordinateSystem } from '../src/renderers/native/core/CoordinateSystem';

function coords(): CoordinateSystem {
    const cs = new CoordinateSystem();
    cs.setSize(800, 200, 1);
    cs.setBars([1000, 2000, 3000, 4000, 5000]); // 5 bars, interval 1000
    cs.setViewport({ barSpacing: 100, rightOffset: 1 });
    return cs;
}

describe('wheelZoomAnchor', () => {
    it('cursor mode pins the logical under the pointer at the cursor pixel', () => {
        const cs = coords();
        const a = wheelZoomAnchor(cs, 300, false);
        expect(a.x).toBe(300);
        expect(a.logical).toBe(cs.xToLogical(300));
    });

    it('right-edge mode pins the right edge logical at the right pixel edge', () => {
        const cs = coords();
        const a = wheelZoomAnchor(cs, 300, true);
        expect(a.x).toBe(cs.width); // 800
        expect(a.logical).toBe(cs.rightEdgeLogical); // (n-1)+rightOffset = 5
    });
});

describe('horizontal wheel / trackpad pans through time', () => {
    it('treats a horizontal-dominant gesture as a pan, a vertical-dominant one as a zoom', () => {
        expect(isHorizontalWheel(30, 4)).toBe(true); // sideways two-finger swipe → pan
        expect(isHorizontalWheel(4, 30)).toBe(false); // normal notch → zoom
        expect(isHorizontalWheel(10, 10)).toBe(false); // ties fall through to zoom
        expect(isHorizontalWheel(0, 0)).toBe(false);
    });

    it('scrolling right (deltaX>0) moves forward toward the latest bars (rightOffset up)', () => {
        // barSpacing 10 ⇒ a 50px swipe pans exactly 5 bars (1:1 with the fingers).
        expect(wheelPanRightOffset(0, 50, 10)).toBeCloseTo(5);
        expect(wheelPanRightOffset(3, -20, 10)).toBeCloseTo(1); // scroll left → back into history
    });
});

describe('Shift+wheel scrolls through history instead of zooming', () => {
    it('a plain vertical notch zooms (null); with shift it pans by deltaY', () => {
        expect(wheelPanDelta(0, 120, false)).toBeNull(); // normal notch → zoom
        expect(wheelPanDelta(0, 120, true)).toBe(120); // shift → pan forward
        expect(wheelPanDelta(0, -120, true)).toBe(-120); // shift + scroll up → back into history
    });

    it('a horizontal-dominant gesture pans by deltaX with or without shift', () => {
        // Browsers that remap Shift+wheel into deltaX land here too.
        expect(wheelPanDelta(120, 0, false)).toBe(120);
        expect(wheelPanDelta(120, 0, true)).toBe(120);
        expect(wheelPanDelta(-30, 4, true)).toBe(-30);
    });
});

describe('wheel over the price axis rescales that scale like a slow drag', () => {
    /** Bare-bones event-target stand-in — enough surface for InputController.attach(). */
    function fakeElement() {
        const listeners = new Map<string, Set<(e: unknown) => void>>();
        return {
            addEventListener(type: string, fn: (e: unknown) => void) {
                (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(fn);
            },
            removeEventListener(type: string, fn: (e: unknown) => void) {
                listeners.get(type)?.delete(fn);
            },
            getBoundingClientRect: () => ({ left: 0, top: 0 }),
            style: { setProperty() {} } as unknown as CSSStyleDeclaration,
            setPointerCapture() {},
            releasePointerCapture() {},
            fire(type: string, e: Record<string, unknown>) {
                for (const fn of [...(listeners.get(type) ?? [])]) fn(e);
            },
        };
    }

    function harness() {
        const deps = {
            getCoords: coords, // 800×200 plot — x>800 is the price-axis strip
            apply: vi.fn(),
            zoomTo: vi.fn(),
            fling: vi.fn(),
            onPointerMove: vi.fn(),
            onClick: vi.fn(),
            beginPriceScale: vi.fn(),
            priceScaleBy: vi.fn(),
            beginPricePan: () => false,
            pricePanBy: vi.fn(),
            resetPriceScale: vi.fn(),
            dataDblClick: vi.fn(),
            paneSeparatorAt: () => false,
            beginPaneResize: vi.fn(),
            paneResizeBy: vi.fn(),
            resetPaneSize: vi.fn(),
            resetView: vi.fn(),
        } satisfies InputControllerDeps;
        const ctl = new InputController(deps);
        const el = fakeElement();
        ctl.attach(el as unknown as HTMLElement);
        const wheel = (clientX: number, clientY: number, deltaY: number, deltaX = 0): void => {
            el.fire('wheel', { clientX, clientY, deltaY, deltaX, shiftKey: false, ctrlKey: false, metaKey: false, preventDefault() {} });
        };
        return { ctl, deps, wheel };
    }

    it('a notch over the axis strip grabs that scale and rescales it as a ~25px drag', () => {
        const h = harness();
        h.wheel(820, 100, 100); // scroll down → expand the span (zoom out), like a downward drag
        expect(h.deps.beginPriceScale).toHaveBeenCalledWith(820, 100);
        expect(h.deps.priceScaleBy).toHaveBeenCalledWith(25); // deltaY 100 × 0.25 px/delta
        expect(h.deps.zoomTo).not.toHaveBeenCalled();
        h.wheel(820, 100, -100); // scroll up → compress (zoom in)
        expect(h.deps.priceScaleBy).toHaveBeenLastCalledWith(-25);
    });

    it('a wheel over the data area still time-zooms and never touches the price scale', () => {
        const h = harness();
        h.wheel(400, 100, 100);
        expect(h.deps.zoomTo).toHaveBeenCalledTimes(1);
        expect(h.deps.beginPriceScale).not.toHaveBeenCalled();
        expect(h.deps.priceScaleBy).not.toHaveBeenCalled();
    });

    it('axisDrag=false turns the axis wheel back into a plain zoom (like axis presses)', () => {
        const h = harness();
        h.ctl.axisDrag = false;
        h.wheel(820, 100, 100);
        expect(h.deps.beginPriceScale).not.toHaveBeenCalled();
        expect(h.deps.zoomTo).toHaveBeenCalledTimes(1);
    });
});

describe('wheel-zoom anchor defaults to auto', () => {
    it("InputController.zoomAnchor is 'auto' by default and rightEdgeZoom reflects only 'right'", () => {
        const ctl = new InputController({} as never);
        expect(ctl.zoomAnchor).toBe('auto');
        expect(ctl.rightEdgeZoom).toBe(false);
        ctl.rightEdgeZoom = true;
        expect(ctl.zoomAnchor).toBe('right');
        ctl.rightEdgeZoom = false;
        expect(ctl.zoomAnchor).toBe('cursor');
    });

    it("NativeRenderer reports zoomAnchor 'auto' by default and accepts right / cursor", () => {
        const r = new NativeRenderer();
        expect(r.readFeature('zoomAnchor')).toBe('auto');
        r.applyFeature('zoomAnchor', 'right');
        expect(r.readFeature('zoomAnchor')).toBe('right');
        r.applyFeature('zoomAnchor', 'cursor');
        expect(r.readFeature('zoomAnchor')).toBe('cursor');
        r.applyFeature('zoomAnchor', 'anything-else');
        expect(r.readFeature('zoomAnchor')).toBe('auto');
    });
});

describe('autoWheelZoomAnchor: toward the cursor, latest bar glued only on the right side of a live chart', () => {
    function cs(rightOffset: number, bars = 200): CoordinateSystem {
        const c = new CoordinateSystem();
        c.setSize(800, 200, 1);
        c.setBars(Array.from({ length: bars }, (_, i) => (i + 1) * 1000));
        c.setViewport({ barSpacing: 10, rightOffset });
        return c;
    }

    it('scrolled back into history (latest bar off screen): pins the bar under the cursor', () => {
        const c = cs(-60);
        const a = autoWheelZoomAnchor(c, 120);
        expect(a.x).toBe(120);
        expect(a.logical).toBeCloseTo(c.xToLogical(120));
    });

    it('latest bar in view and cursor on the right side: pins the right edge', () => {
        const c = cs(3);
        const a = autoWheelZoomAnchor(c, 700);
        expect(a.x).toBe(800);
        expect(a.logical).toBe(c.rightEdgeLogical);
    });

    it('latest bar in view but cursor on the left side: pins the bar under the cursor (the first bars of a fully zoomed-out chart)', () => {
        const c = cs(3, 60); // 60 bars x 10px = 600px of data, all of it in view, first bar at x = 180
        const a = autoWheelZoomAnchor(c, 250);
        expect(a.x).toBe(250);
        expect(a.logical).toBeCloseTo(c.xToLogical(250));
    });

    it('cursor over the empty space left of the first bar: zooms onto the first bar, at the pixel it already sits', () => {
        const c = cs(-190, 200); // the viewport shows bars from before index 0 up to ~index 10
        const x = 30;
        expect(c.xToLogical(x)).toBeLessThan(0);
        const a = autoWheelZoomAnchor(c, x);
        expect(a.logical).toBe(0);
        expect(a.x).toBeCloseTo(c.logicalToX(0));
    });

    it('an empty chart falls back to the right edge', () => {
        const c = new CoordinateSystem();
        c.setSize(800, 200, 1);
        c.setBars([]);
        const a = autoWheelZoomAnchor(c, 100);
        expect(a.x).toBe(800);
    });
});

describe('wheel handler uses the auto anchor and Ctrl still forces the cursor', () => {
    function mk(rightOffset: number) {
        const cs = new CoordinateSystem();
        cs.setSize(800, 200, 1);
        cs.setBars(Array.from({ length: 200 }, (_, i) => (i + 1) * 1000));
        cs.setViewport({ barSpacing: 10, rightOffset });
        const zoomTo = vi.fn();
        const listeners = new Map<string, (e: unknown) => void>();
        const el = {
            addEventListener: (t: string, f: (e: unknown) => void) => listeners.set(t, f),
            removeEventListener: () => {},
            getBoundingClientRect: () => ({ left: 0, top: 0 }),
            style: { setProperty() {} } as unknown as CSSStyleDeclaration,
            setPointerCapture() {},
            releasePointerCapture() {},
        };
        const deps = {
            getCoords: () => cs,
            apply: vi.fn(),
            zoomTo,
            fling: vi.fn(),
            onPointerMove: vi.fn(),
            onClick: vi.fn(),
            beginPriceScale: vi.fn(),
            priceScaleBy: vi.fn(),
            beginPricePan: () => false,
            pricePanBy: vi.fn(),
            resetPriceScale: vi.fn(),
            dataDblClick: vi.fn(),
            paneSeparatorAt: () => false,
            beginPaneResize: vi.fn(),
            paneResizeBy: vi.fn(),
            resetPaneSize: vi.fn(),
            resetView: vi.fn(),
        } satisfies InputControllerDeps;
        const ctl = new InputController(deps);
        ctl.attach(el as unknown as HTMLElement);
        const wheel = (clientX: number, ctrlKey = false) => listeners.get('wheel')!({ clientX, clientY: 100, deltaY: -100, deltaX: 0, shiftKey: false, ctrlKey, metaKey: false, preventDefault() {} });
        return { cs, zoomTo, wheel, ctl };
    }

    it('scrolled back: zoomTo is anchored at the cursor, not the right edge', () => {
        const h = mk(-60);
        h.wheel(120);
        const [, logical, x] = h.zoomTo.mock.calls[0]!;
        expect(x).toBe(120);
        expect(logical).toBeCloseTo(h.cs.xToLogical(120));
    });

    it("mode 'right' keeps the old always-right-edge behaviour", () => {
        const h = mk(-60);
        h.ctl.zoomAnchor = 'right';
        h.wheel(120);
        const [, logical, x] = h.zoomTo.mock.calls[0]!;
        expect(x).toBe(800);
        expect(logical).toBe(h.cs.rightEdgeLogical);
    });

    it('Ctrl at the live edge on the right side still goes to the cursor', () => {
        const h = mk(3);
        h.wheel(700, true);
        const [, , x] = h.zoomTo.mock.calls[0]!;
        expect(x).toBe(700);
    });
});
