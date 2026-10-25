// TradingView's "Content" tools: Image (JPG/PNG, at most 2 MB and 2000 x 2000 px) and X post (a post's card on the
// time it was posted; the card moves up or down only).
import { describe, it, expect } from 'vitest';
import { buildToolbar, checkImageFile, createDrawing, deserializeDrawing, safeImageUrl, toXPostCard, type Projector, type XPostDrawing } from '../src/core/drawings';

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
    it('JPG and PNG only, 2 MB at most, 2000 x 2000 px at most', () => {
        expect(checkImageFile({ type: 'image/png', size: 1000 }, { width: 2000, height: 2000 })).toBeNull();
        expect(checkImageFile({ type: 'image/jpeg', size: 2 * 1024 * 1024 })).toBeNull();
        expect(checkImageFile({ type: 'image/gif', size: 10 })).toMatch(/JPG or PNG/);
        expect(checkImageFile({ type: 'image/webp', size: 10 })).toMatch(/JPG or PNG/);
        expect(checkImageFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
        expect(checkImageFile({ type: 'image/png', size: 10 }, { width: 2001, height: 10 })).toMatch(/2000 x 2000/);
    });

    it('a full 2 MB picture still fits in a drawing', () => {
        const b64 = 'A'.repeat(Math.ceil((2 * 1024 * 1024) / 3) * 4);
        expect(safeImageUrl(`data:image/jpeg;base64,${b64}`)).not.toBeNull();
        expect(safeImageUrl(`data:image/jpeg;base64,${b64}AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toBeNull();
    });
});

describe('X post drawing', () => {
    it('sits on the post time, card above the dot, and keeps that time when dragged', () => {
        const d = createDrawing('xpost', { paneId: 'price', anchors: [{ time: 300, price: 100 }], props: { post: POST } }) as XPostDrawing;
        const l = d.layout(proj())!;
        expect(l.dot).toEqual([300, 300]);
        expect(l.card.x + l.card.w / 2).toBe(300);
        expect(l.card.y + l.card.h).toBeLessThan(300);
        expect(d.hitTest(300, l.card.y + 5, proj(), 3)).toBe(true);
        expect(d.hitTest(10, 10, proj(), 3)).toBe(false);
        expect(d.translateBody(50, 20, d.anchors)).toEqual([{ time: 300, price: 120 }]);
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
