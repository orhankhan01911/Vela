// "Scale price chart only" (TradingView): with the flag on, the price pane's autoscale
// fits the main series alone. An overlay far outside the candles (a VWAP band, an
// order-book pressure ring, a force_overlay study plot) must not widen the window.
import { describe, it, expect } from 'vitest';
import { NativeRenderer } from '../src/renderers/native/NativeRenderer';
import { priceAxisItems, priceOnlyState, composeMenu } from '../src/widget/context-menu-model';
import type { OHLCV } from '../src/core/model/ohlcv';
import type { IndicatorModel } from '../src/core/model/indicator';

const T0 = 1_700_000_000_000;
const STEP = 60_000;
const N = 50;

const mkBars = (): OHLCV[] =>
    Array.from({ length: N }, (_, i) => ({ time: T0 + i * STEP, open: 100, high: 110, low: 90, close: 105, volume: 1 }));

function overlayModel(): IndicatorModel {
    const pts = (v: number) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * STEP, value: v }));
    return {
        id: 'vwap', title: 'VWAP', legend: false, overlay: true, paneHint: 'price', paneId: 'price',
        series: [
            { id: 'vwap:upper', title: 'Upper', paneId: 'price', kind: 'line', points: pts(500), style: { color: '#fff', width: 1, lineStyle: 'solid' } },
            { id: 'vwap:lower', title: 'Lower', paneId: 'price', kind: 'line', points: pts(10), style: { color: '#fff', width: 1, lineStyle: 'solid' } },
        ],
        fills: [], backgrounds: [], priceLines: [{ id: 'pl', price: 900, color: '#fff' } as never], inputs: [], inputValues: {},
    };
}

function studyWithForcedOverlay(): IndicatorModel {
    const pts = (v: number) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * STEP, value: v }));
    return {
        id: 'st', title: 'Study', legend: false, overlay: false, paneHint: 'new', paneId: 'pane-st',
        series: [
            { id: 'st:own', title: 'own', paneId: 'pane-st', kind: 'line', points: pts(1), style: { color: '#fff', width: 1, lineStyle: 'solid' } },
            { id: 'st:forced', title: 'forced', paneId: 'price', kind: 'line', points: pts(2000), overlay: true, style: { color: '#0f0', width: 1, lineStyle: 'solid' } },
        ],
        fills: [], backgrounds: [], priceLines: [], inputs: [], inputValues: {},
    };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- the pane scale lives behind the scene; reading it IS the behavior under test */
function makeRenderer() {
    const r = new NativeRenderer();
    const anyR = r as any;
    anyR.coords.setSize(800, 400, 1);
    if (!anyR.scheduler) anyR.scheduler = { invalidate: () => {} };
    if (!anyR.animator) anyR.animator = { active: false, start: () => {}, stop: () => {} };
    anyR.introPlayed = true;
    r.ensurePane({ id: 'price', kind: 'price', order: 0 } as never);
    r.ensurePane({ id: 'pane-st', kind: 'study', order: 1 } as never);
    r.setBars(mkBars());
    const priceScale = () => {
        anyR.computeScales();
        return anyR.scene.panes.get('price').scaleTarget as { min: number; max: number };
    };
    return { r, anyR, priceScale };
}

describe('scalePriceOnly — the price pane fits the main series only', () => {
    it('off (default): an overlay band, a price line and a force_overlay plot widen the window', () => {
        const { r, priceScale } = makeRenderer();
        r.mountIndicator(overlayModel());
        r.mountIndicator(studyWithForcedOverlay());
        expect(r.readFeature('scalePriceOnly')).toBe(false);
        const s = priceScale();
        expect(s.max).toBeGreaterThanOrEqual(2000);
        expect(s.min).toBeLessThanOrEqual(10);
    });

    it('on: the window fits the candles (90..110 plus margins), whatever the overlays span', () => {
        const { r, priceScale } = makeRenderer();
        r.mountIndicator(overlayModel());
        r.mountIndicator(studyWithForcedOverlay());
        r.applyFeature('scalePriceOnly', true);
        const s = priceScale();
        expect(s.min).toBeGreaterThan(80);
        expect(s.min).toBeLessThan(90);
        expect(s.max).toBeGreaterThan(110);
        expect(s.max).toBeLessThan(125);
    });

    it('on: hidden candles still own the price pane (the axis does not jump to the overlays)', () => {
        const { r, anyR, priceScale } = makeRenderer();
        r.mountIndicator(overlayModel());
        r.applyFeature('scalePriceOnly', true);
        anyR.scene.candlesHidden = true;
        const s = priceScale();
        expect(s.max).toBeLessThan(125);
        expect(s.min).toBeGreaterThan(80);
    });

    it('does not touch a study pane: its own plots still scale it', () => {
        const { r, anyR } = makeRenderer();
        r.mountIndicator(studyWithForcedOverlay());
        r.applyFeature('scalePriceOnly', true);
        anyR.computeScales();
        const st = [...anyR.scene.panes.values()].find((p: any) => p.kind !== 'price');
        expect(st).toBeTruthy();
        expect(st.scaleTarget.max).toBeLessThan(100); // its own plot is 1; the forced 2000 belongs to price
    });

    it('turning it on resumes autoscale on a price pane frozen by an axis drag', () => {
        const { r, anyR, priceScale } = makeRenderer();
        r.mountIndicator(overlayModel());
        const frozen = { min: 0, max: 1000 };
        anyR.scene.panes.get('price').manualScale = frozen;
        expect(priceScale().max).toBe(1000);
        r.applyFeature('scalePriceOnly', true);
        expect(anyR.scene.panes.get('price').manualScale).toBeNull();
        expect(priceScale().max).toBeLessThan(125);
    });

    it('a real change notifies config watchers (the workspace saves on it); a repeat does not', () => {
        const { r } = makeRenderer();
        let n = 0;
        r.onConfigChanged(() => { n += 1; });
        r.applyFeature('scalePriceOnly', true);
        r.applyFeature('scalePriceOnly', true);
        expect(n).toBe(1);
        r.applyFeature('scalePriceOnly', false);
        expect(n).toBe(2);
    });

    it('rides getConfig/applyConfig, so a saved chart keeps it', () => {
        const { r } = makeRenderer();
        expect((r.getConfig() as any).priceScale.scalePriceOnly).toBe(false);
        r.applyFeature('scalePriceOnly', true);
        const cfg = r.getConfig() as any;
        expect(cfg.priceScale.scalePriceOnly).toBe(true);
        const r2 = new NativeRenderer();
        r2.applyConfig({ priceScale: { scalePriceOnly: true } });
        expect(r2.readFeature('scalePriceOnly')).toBe(true);
        r2.applyConfig({ priceScale: { scalePriceOnly: 'yes' } }); // malformed -> kept
        expect(r2.readFeature('scalePriceOnly')).toBe(true);
    });
});

describe('price-axis menu row', () => {
    const state = { auto: true, invert: false, choice: 'regular' as const, axisLabels: true, priceLabel: true, countdown: true, priceLine: true };

    it('shows on the main price scale, right after Auto, checked from the flag', () => {
        const items = composeMenu('price-axis', priceAxisItems({ ...state, priceOnly: priceOnlyState(null, true) }), []);
        const ids = items.map((i) => i.id);
        expect(ids.indexOf('price-only')).toBe(ids.indexOf('auto') + 1);
        expect(items.find((i) => i.id === 'price-only')?.checked).toBe(true);
        expect(items.find((i) => i.id === 'price-only')?.label).toBe('Scale price chart only');
    });

    it('is hidden for a study pane', () => {
        const study = { id: 'p2', kind: 'study' as const, top: 0, height: 10, mode: 'price', log: false, invert: false };
        const items = priceAxisItems({ ...state, priceOnly: priceOnlyState(study, true) });
        expect(items.some((i) => i.id === 'price-only')).toBe(false);
    });
});
