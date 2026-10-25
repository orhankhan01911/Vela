// TradingView's "Content" tools, as its own chart stores them (read from a logged-in TradingView 2026-10-26):
// Image = one top-left point + a size in screen pixels; X post (LineToolTweet) = a time + a height on the pane.
import { describe, it, expect } from 'vitest';
import { buildToolbar, checkImageFile, createDrawing, deserializeDrawing, safeImageUrl, toXPostCard, type ImageDrawing, type Projector, type XPostDrawing } from '../src/core/drawings';
import { xpostColors, xpostDate } from '../src/renderers/native/drawings/DrawingPainter';

function proj(): Projector {
    return {
        xOf: (t) => t,
        yOf: (price, paneId) => (paneId === 'price' ? 400 - price : null),
        pxToPoint: (x, y) => ({ time: x, price: 400 - y }),
        paneIdAtY: () => 'price',
        paneRect: () => ({ top: 0, height: 400 }),
        width: 800,
        height: 400,
    };
}

const POST = {
    id: '2114044093987004720',
    url: 'https://x.com/derivativemonky/status/2114044093987004720',
    t: 1_792_862_363_703,
    text: 'can this simple fib save us on $BTC?',
    name: 'Derivatives Monkey',
    handle: 'derivativemonky',
    avatar: '/news/x/img?u=https%3A%2F%2Fpbs.twimg.com%2Fa_bigger.jpg',
    verified: true,
    media: ['/news/x/img?u=https%3A%2F%2Fpbs.twimg.com%2Fmedia%2Fx.jpg'],
    likes: 35,
    replies: 4,
};

describe('Image limits (TradingView)', () => {
    it('JPG, PNG or WEBP, 2 MB at most, 2000 x 2000 px at most', () => {
        expect(checkImageFile({ type: 'image/png', size: 1000 }, { width: 2000, height: 2000 })).toBeNull();
        expect(checkImageFile({ type: 'image/jpeg', size: 2 * 1024 * 1024 })).toBeNull();
        expect(checkImageFile({ type: 'image/webp', size: 10 })).toBeNull();
        expect(checkImageFile({ type: 'image/gif', size: 10 })).toMatch(/JPG, PNG or WEBP/);
        expect(checkImageFile({ type: 'image/svg+xml', size: 10 })).toMatch(/JPG, PNG or WEBP/);
        expect(checkImageFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toMatch(/2MB/);
        expect(checkImageFile({ type: 'image/png', size: 10 }, { width: 2001, height: 10 })).toMatch(/2000 x 2000/);
    });

    it('a full 2 MB picture still fits in a drawing', () => {
        const b64 = 'A'.repeat(Math.ceil((2 * 1024 * 1024) / 3) * 4);
        expect(safeImageUrl(`data:image/jpeg;base64,${b64}`)).not.toBeNull();
        expect(safeImageUrl(`data:image/jpeg;base64,${b64}AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toBeNull();
    });
});

describe('Image drawing (TradingView: a top-left point and a size in screen pixels)', () => {
    it('keeps its pixel size when the chart zooms, and the corner handle resizes it', () => {
        const d = createDrawing('image', { paneId: 'price', anchors: [{ time: 100, price: 300 }], props: { url: 'data:image/png;base64,AA==', cssWidth: 200, cssHeight: 100 } }) as ImageDrawing;
        expect(d.bounds(proj())).toEqual({ x: 100, y: 100, w: 200, h: 100 });
        const zoomed: Projector = { ...proj(), xOf: (t) => t * 3 };
        expect(d.bounds(zoomed)).toEqual({ x: 300, y: 100, w: 200, h: 100 });
        expect(d.handlePoints(proj())).toEqual([[100, 100], [300, 200]]);
        expect(d.dragHandlePx(1, 500, 400, proj())).toBe(true);
        expect([d.cssWidth, d.cssHeight]).toEqual([400, 300]);
        expect(d.dragHandlePx(0, 500, 400, proj())).toBe(false); // the top-left handle moves it, as an anchor
        expect((deserializeDrawing(JSON.parse(JSON.stringify(d.serialize()))) as ImageDrawing).cssWidth).toBe(400);
    });

    it('a picture saved between two corners keeps that box', () => {
        const d = createDrawing('image', { paneId: 'price', anchors: [{ time: 100, price: 300 }, { time: 200, price: 250 }], props: { url: 'https://example.com/a.png' } }) as ImageDrawing;
        expect(d.sized()).toBe(false);
        expect(d.bounds(proj())).toEqual({ x: 100, y: 100, w: 100, h: 50 });
    });
});

describe('X post drawing', () => {
    // The post's bar: opened at 300, high 300 (y 100), low 200 (y 200) on a 400 px pane.
    const withBar = (): Projector => ({ ...proj(), barAt: (t) => (t >= 300 && t < 360 ? { time: 300, high: 300, low: 200, close: 250, line: false } : null) });
    const at = (time: number, position: number): XPostDrawing =>
        createDrawing('xpost', { paneId: 'price', anchors: [{ time, price: position }], props: { post: { ...POST, t: 330 } } }) as XPostDrawing;

    it("hangs below its handle, half way between the post's bar and the pane's top (TradingView's position 50)", () => {
        const d = at(330, 50);
        const l = d.layout(withBar())!;
        expect(l.dot).toEqual([330, (100 - 3) / 2]); // 3 px clear of the high, as TradingView
        expect(l.card.x + l.card.w / 2).toBe(330);
        expect(d.priceRange()).toBeNull();
        expect(d.hitTest(330, 60, withBar(), 3)).toBe(true);
        expect(d.hitTest(10, 300, withBar(), 3)).toBe(false);
    });

    it('stays with its bar when the price scale moves', () => {
        const d = at(330, 50);
        const lower: Projector = { ...withBar(), yOf: (price) => 500 - price }; // the bar is now 100 px lower
        expect(d.layout(lower)!.dot[1]).toBeCloseTo((200 - 3) / 2);
        expect(at(330, -50).layout(withBar())!.dot[1]).toBeCloseTo(203 + (400 - 203) / 2); // below the low
    });

    it('sits in the middle of the pane when its bar is not loaded', () => {
        expect(at(330, 50).layout(proj())!.dot).toEqual([330, 100]);
    });

    it('points its line at the bar the post was made in: high and low, or the close on a line chart', () => {
        expect(at(900, 50).barPoints(withBar())).toEqual([[300, 100], [300, 200]]);
        const line: Projector = { ...proj(), barAt: () => ({ time: 300, high: 300, low: 200, close: 250, line: true }) };
        expect(at(900, 50).barPoints(line)).toEqual([[300, 150]]);
        expect(at(900, 50).barPoints(proj())).toEqual([]);
    });

    it('moves on the screen: along the time axis, and up or down as a new position against its bar', () => {
        const d = at(330, 50);
        expect(d.translateBodyPx(0, 0, d.anchors, withBar())).toEqual([{ time: 330, price: 50 }]); // a click is not a move
        expect(d.translateBodyPx(40, -25, d.anchors, withBar())).toEqual([{ time: 370, price: 75 }]);
        expect(d.translateBodyPx(0, 100, d.anchors, withBar())![0]!.price).toBeCloseTo(0); // inside the bar: on it
        expect(d.translateBodyPx(0, 250, d.anchors, withBar())![0]!.price).toBeCloseTo(-50); // y 300: half way below
        expect(d.dragHandlePx(0, 500, 25, withBar())).toBe(true);
        expect(d.anchors).toEqual([{ time: 500, price: 75 }]);
    });

    it("dates the card as TradingView does, 24 Oct '26 · 08:35 PM, in the chart's time zone", () => {
        expect(xpostDate(Date.UTC(2026, 9, 24, 20, 35))).toBe("24 Oct '26 · 08:35 PM");
        expect(xpostDate(Date.UTC(2026, 0, 3, 0, 5))).toBe("3 Jan '26 · 12:05 AM");
        expect(xpostDate(Date.UTC(2026, 9, 24, 15, 35), 'Asia/Karachi')).toBe("24 Oct '26 · 08:35 PM");
        expect(xpostDate(Date.UTC(2026, 9, 24, 15, 35), 'Not/AZone')).toBe("24 Oct '26 · 03:35 PM");
    });

    it("is TradingView's black card on a dark chart and its white card on a light one", () => {
        for (const bg of ['#0e0e0e', '#131722', 'rgb(10, 12, 14)', '#000']) expect(xpostColors(bg).back, bg).toBe('#000000');
        for (const bg of ['#ffffff', '#f0f3fa', '#fff']) expect(xpostColors(bg).back, bg).toBe('#FFFFFF');
    });

    it('round-trips through a saved layout', () => {
        const d = createDrawing('xpost', { paneId: 'price', anchors: [{ time: POST.t, price: 1 }], props: { post: POST } })!;
        const back = deserializeDrawing(JSON.parse(JSON.stringify(d.serialize()))) as XPostDrawing;
        expect(back.post).toEqual(POST);
    });

    it('a saved layout cannot smuggle a script link or another site into the card', () => {
        const bad = toXPostCard({ ...POST, url: 'javascript:alert(1)', avatar: 'https://evil.test/a.png', media: ['//evil.test/x.jpg', 'data:image/png;base64,AAA', '/news/x/img?u=ok'] })!;
        expect(bad.url).toBe('https://x.com/derivativemonky/status/2114044093987004720');
        expect(bad.avatar).toBe('');
        expect(bad.media).toEqual(['/news/x/img?u=ok']);
        expect(toXPostCard({ ...POST, id: 'abc' })).toBeNull();
        expect(toXPostCard(null)).toBeNull();
    });

    it("sits with Image under the text tools' Content section", () => {
        const text = buildToolbar(true).definition.groups.find((g) => g.id === 'text')!;
        expect(text.sections!.map((s) => s.label)).toEqual(['Text and notes', 'Content']);
        expect(text.sections![1]!.tools.map((t) => t.type)).toEqual(['image', 'xpost']);
    });
});
