import { vt } from '../../../i18n';
import { EMOJI_GROUPS } from '../../../core/drawings/assets/emojiGroups';
import { FA_GLYPHS, ICON_GROUPS } from '../../../core/drawings/assets/faIcons';
import { emojiUrl } from './emojiArt';

/**
 * TradingView's Icons panel (its drawing toolbar's smiley button, read 2026-10-30, modules 89072 / 410549 / 625472):
 * tabs (Emojis, Icons; TradingView's Stickers are its own art, left out), a strip of category buttons, and one
 * scrolling grid of 38 px cells with a title per category, "Recently used" (18 kept) first. Picking one arms the tool
 * with it. Emoji pictures are filled in as their category scrolls into view (1,720 of them).
 */

export type IconsPick = { kind: 'emoji'; value: string } | { kind: 'icon'; value: number };

const CELL = 38;
const RECENT_KEY = 'vela.icons.recent.v1';
const RECENT_MAX = 18;
const NS = 'http://www.w3.org/2000/svg';

type Recent = { emoji: string[]; icon: number[] };

function readRecent(): Recent {
    try {
        const o = JSON.parse(localStorage.getItem(RECENT_KEY) ?? 'null') as Partial<Recent> | null;
        return {
            emoji: Array.isArray(o?.emoji) ? o.emoji.filter((e): e is string => typeof e === 'string').slice(0, RECENT_MAX) : [],
            icon: Array.isArray(o?.icon) ? o.icon.filter((e): e is number => typeof e === 'number' && !!FA_GLYPHS[e]).slice(0, RECENT_MAX) : [],
        };
    } catch {
        return { emoji: [], icon: [] };
    }
}

/** Remember a pick at the front of its recent list. */
export function rememberPick(p: IconsPick): void {
    const r = readRecent();
    if (p.kind === 'emoji') r.emoji = [p.value, ...r.emoji.filter((e) => e !== p.value)].slice(0, RECENT_MAX);
    else r.icon = [p.value, ...r.icon.filter((e) => e !== p.value)].slice(0, RECENT_MAX);
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(r));
    } catch {
        /* blocked storage: no recents */
    }
}

/** A Font Awesome 4 glyph as an inline SVG (font units, y up, 1792 per em). */
export function glyphSvg(code: number, px: number): SVGSVGElement | null {
    const g = FA_GLYPHS[code];
    if (!g) return null;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${g.w} 1792`);
    svg.setAttribute('width', String(px));
    svg.setAttribute('height', String(px));
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('transform', 'matrix(1 0 0 -1 0 1536)');
    path.setAttribute('d', g.d);
    path.setAttribute('fill', 'currentColor');
    svg.append(path);
    return svg;
}

const CSS = `
.vela-icons { display: flex; flex-direction: column; width: ${CELL * 8 + 16}px; max-width: calc(100vw - 24px); height: 378px; max-height: 70vh; }
.vela-icons-tabs { flex: none; display: flex; gap: 4px; padding: 4px 4px 6px; border-bottom: 1px solid var(--vela-border-soft); }
.vela-icons-tab { flex: none; padding: 4px 10px; border: 0; border-radius: var(--vela-radius-sm); background: none; color: var(--vela-fg-muted);
  font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
.vela-icons-tab[aria-selected="true"] { background: var(--vela-hover); color: var(--vela-fg-bright); }
.vela-icons-cats { flex: none; display: flex; gap: 2px; padding: 6px 4px; overflow-x: auto; scrollbar-width: none; }
.vela-icons-cat { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0; border: 0;
  border-radius: var(--vela-radius-sm); background: none; color: var(--vela-fg-muted); cursor: pointer; font-size: 18px; line-height: 1; }
.vela-icons-cat:hover, .vela-icons-cat[aria-current="true"] { background: var(--vela-hover); color: var(--vela-fg-bright); }
.vela-icons-cat img { width: 20px; height: 20px; }
.vela-icons-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 4px 6px; }
.vela-icons-title { position: sticky; top: 0; z-index: 1; height: 30px; display: flex; align-items: center; padding: 0 4px; background: var(--vela-surface);
  color: var(--vela-fg-muted); font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.vela-icons-grid { display: grid; grid-template-columns: repeat(auto-fill, ${CELL}px); }
.vela-icons-cell { display: inline-flex; align-items: center; justify-content: center; width: ${CELL}px; height: ${CELL}px; padding: 0; border: 0;
  border-radius: var(--vela-radius-sm); background: none; color: var(--vela-fg-bright); cursor: pointer; }
.vela-icons-cell:hover, .vela-icons-cell:focus-visible { background: var(--vela-hover); outline: none; }
.vela-icons-cell img { width: 28px; height: 28px; pointer-events: none; }
.vela-icons-empty { padding: 4px 4px 10px; color: var(--vela-fg-muted); font-size: 12px; }
.vela-icons-credit { flex: none; padding: 4px 8px; color: var(--vela-fg-muted); font-size: 10px; }
.vela-icons-credit a { color: inherit; }
`;

function ensureStyles(): void {
    if (document.getElementById('vela-icons-css')) return;
    const st = document.createElement('style');
    st.id = 'vela-icons-css';
    st.textContent = CSS;
    document.head.append(st);
}

interface Section<T> {
    title: string;
    tab: HTMLElement;
    items: readonly T[];
}

/** The panel. `onPick` gets the chosen emoji or icon (the caller arms the tool). */
export function buildIconsPanel(onPick: (p: IconsPick) => void, initial: 'emoji' | 'icon' = 'emoji'): HTMLElement {
    ensureStyles();
    const root = document.createElement('div');
    root.className = 'vela-icons';
    root.dataset.role = 'icons-panel';
    const tabs = document.createElement('div');
    tabs.className = 'vela-icons-tabs';
    tabs.setAttribute('role', 'tablist');
    const cats = document.createElement('div');
    cats.className = 'vela-icons-cats';
    const list = document.createElement('div');
    list.className = 'vela-icons-list';
    const credit = document.createElement('div');
    credit.className = 'vela-icons-credit';
    root.append(tabs, cats, list, credit);

    const pick = (p: IconsPick): void => {
        rememberPick(p);
        onPick(p);
    };

    const show = (kind: 'emoji' | 'icon'): void => {
        for (const b of tabs.children) (b as HTMLElement).setAttribute('aria-selected', String((b as HTMLElement).dataset.kind === kind));
        cats.replaceChildren();
        list.replaceChildren();
        list.scrollTop = 0;
        const recent = readRecent();
        credit.replaceChildren();
        if (kind === 'emoji') {
            // Twemoji (CC-BY 4.0) asks for credit.
            const a = document.createElement('a');
            a.href = 'https://github.com/jdecked/twemoji';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = vt('Emoji art: {name} (CC-BY 4.0)', { name: 'Twemoji' });
            credit.append(a);
            const sections: Section<string>[] = [
                { title: 'Recently used', tab: emojiTab('🕘'), items: recent.emoji },
                ...EMOJI_GROUPS.map((g) => ({ title: g.title, tab: emojiTab(g.tab, g.emojis[0]), items: g.emojis })),
            ];
            render(sections, (e) => emojiCell(e, () => pick({ kind: 'emoji', value: e })));
        } else {
            const sections: Section<number>[] = [
                { title: 'Recently used', tab: iconTab(0xf017), items: recent.icon },
                ...ICON_GROUPS.map((g) => ({ title: g.title, tab: iconTab(g.tab), items: g.icons })),
            ];
            render(sections, (c) => iconCell(c, () => pick({ kind: 'icon', value: c })));
        }
    };

    function render<T>(sections: Section<T>[], cell: (item: T) => HTMLElement): void {
        const titles: HTMLElement[] = [];
        const observer = typeof IntersectionObserver === 'function'
            ? new IntersectionObserver((entries) => {
                  for (const en of entries) {
                      if (!en.isIntersecting) continue;
                      const grid = en.target as HTMLElement & { fill?: () => void };
                      grid.fill?.();
                      observer?.unobserve(grid);
                  }
              }, { root: list, rootMargin: '200px 0px' })
            : null;
        sections.forEach((s, i) => {
            s.tab.className = 'vela-icons-cat';
            s.tab.title = s.title;
            s.tab.setAttribute('aria-label', vt(s.title));
            const title = document.createElement('div');
            title.className = 'vela-icons-title';
            title.textContent = vt(s.title);
            titles.push(title);
            s.tab.addEventListener('click', () => {
                list.scrollTop = title.offsetTop - list.offsetTop;
            });
            cats.append(s.tab);
            list.append(title);
            if (s.items.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'vela-icons-empty';
                empty.textContent = i === 0 ? vt('Nothing picked yet') : '';
                list.append(empty);
                return;
            }
            const grid = document.createElement('div') as HTMLDivElement & { fill?: () => void };
            grid.className = 'vela-icons-grid';
            grid.setAttribute('role', 'listbox');
            grid.setAttribute('aria-label', vt(s.title));
            // Reserve the rows so the scroll height is right before the cells exist.
            grid.style.minHeight = `${Math.ceil(s.items.length / 8) * CELL}px`;
            grid.fill = () => {
                grid.fill = undefined;
                grid.style.minHeight = '';
                grid.append(...s.items.map(cell));
            };
            list.append(grid);
            if (observer && i > 1) observer.observe(grid);
            else grid.fill();
        });
        // The strip marks the category in view.
        list.addEventListener('scroll', () => {
            const y = list.scrollTop + list.offsetTop + 2;
            let at = 0;
            titles.forEach((t, i) => {
                if (t.offsetTop <= y) at = i;
            });
            sections.forEach((s, i) => s.tab.setAttribute('aria-current', String(i === at)));
        }, { passive: true });
        sections[0]?.tab.setAttribute('aria-current', 'true');
    }

    for (const [kind, label] of [['emoji', 'Emojis'], ['icon', 'Icons']] as const) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'vela-icons-tab';
        b.setAttribute('role', 'tab');
        b.dataset.kind = kind;
        b.textContent = vt(label);
        b.addEventListener('click', () => show(kind));
        tabs.append(b);
    }
    show(initial);
    return root;
}

/** A category button showing an emoji (`fallback` when the first has no art, e.g. a form without its variation sign). */
function emojiTab(e: string, fallback?: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    const img = document.createElement('img');
    img.alt = '';
    void emojiUrl(e)
        .then((u) => u ?? (fallback ? emojiUrl(fallback) : null))
        .then((u) => {
            if (u) img.src = u;
        });
    b.append(img);
    return b;
}

function iconTab(code: number): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    const svg = glyphSvg(code, 18);
    if (svg) b.append(svg);
    return b;
}

function emojiCell(e: string, onClick: () => void): HTMLElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vela-icons-cell';
    b.setAttribute('role', 'option');
    b.setAttribute('aria-label', e);
    b.dataset.emoji = e;
    const img = document.createElement('img');
    img.alt = e;
    void emojiUrl(e).then((u) => {
        if (u) img.src = u;
    });
    b.append(img);
    b.addEventListener('click', onClick);
    return b;
}

function iconCell(code: number, onClick: () => void): HTMLElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vela-icons-cell';
    b.setAttribute('role', 'option');
    b.setAttribute('aria-label', vt('Icon {code}', { code: code.toString(16) }));
    b.dataset.icon = String(code);
    const svg = glyphSvg(code, 24);
    if (svg) b.append(svg);
    b.addEventListener('click', onClick);
    return b;
}
