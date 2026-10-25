// TradingView's "Content" tools, as its own chart stores them (read from a logged-in TradingView 2026-10-26):
// Image = one top-left point + a size in screen pixels; X post (LineToolTweet) = a time + a height on the pane.
import { describe, it, expect } from 'vitest';
import { buildToolbar, checkImageFile, createDrawing, deserializeDrawing, safeImageUrl, toXPostCard, type ImageDrawing, type Projector, type XPostDrawing } from '../src/core/drawings';
import { xpostDate } from '../src/renderers/native/drawings/DrawingPainter';

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
    it('hangs below its handle at a time and a height on the pane; a price-scale change never moves it', () => {
        const d = createDrawing('xpost', { paneId: 'price', anchors: [{ time: 300, price: 0.25 }], props: { post: POST } }) as XPostDrawing;
        const l = d.layout(proj())!;
        expect(l.dot).toEqual([300, 100]); // a quarter down a 400 px pane
        expect(l.card.x + l.card.w / 2).toBe(300);
        expect(l.card.y).toBe(100);
        expect(d.priceRange()).toBeNull();
        const squashed: Projector = { ...proj(), yOf: (p) => 400 - p / 10 }; // another price scale, same pane
        expect(d.layout(squashed)!.dot).toEqual([300, 100]);
        expect(d.hitTest(300, 120, proj(), 3)).toBe(true);
        expect(d.hitTest(10, 10, proj(), 3)).toBe(false);
    });

    it('moves on the screen: time along the axis, height as a share of the pane', () => {
        const d = createDrawing('xpost', { paneId: 'price', anchors: [{ time: 300, price: 0.25 }], props: { post: POST } }) as XPostDrawing;
        expect(d.translateBodyPx(40, 100, d.anchors, proj())).toEqual([{ time: 340, price: 0.5 }]);
        expect(d.translateBodyPx(0, 5000, d.anchors, proj())![0]!.price).toBeLessThan(1); // the handle stays on the pane
        expect(d.dragHandlePx(0, 500, 200, proj())).toBe(true);
        expect(d.anchors).toEqual([{ time: 500, price: 0.5 }]);
    });

    it("dates the card as TradingView does, 24 Oct '26 · 08:35 PM", () => {
        expect(xpostDate(Date.UTC(2026, 9, 24, 20, 35))).toBe("24 Oct '26 · 08:35 PM");
        expect(xpostDate(Date.UTC(2026, 0, 3, 0, 5))).toBe("3 Jan '26 · 12:05 AM");
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
