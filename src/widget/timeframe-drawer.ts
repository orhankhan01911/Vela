// Timeframe drawer (mobile) — the bottom-sheet counterpart of the topbar timeframe menu
// PLUS the desktop bottombar's range chips: date ranges first (horizontally scrollable),
// then the timeframe presets. Selection state is re-read on every open, so it always
// mirrors whatever path last changed the timeframe (quick entry, API, a range chip).
import { Drawer } from '../ui/components/drawer';
import { injectStyles } from '../ui/styles';
import type { RangePreset } from './bottombar';
import { timeframeLabel } from './timeframe';
import type { WidgetContext } from './contributions';
import { activeIntervalSection, intervalSections, type IntervalChoice, type IntervalSection } from './interval-sections';

const STYLE_ID = 'vela-widget-tf-drawer';
const CSS = `
.vela-tfd-heading {
    padding: 4px 2px 8px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: var(--vela-fg-bright);
}
.vela-tfd-heading + .vela-tfd-ranges,
.vela-tfd-heading + .vela-tfd-grid { padding-top: 0; }
.vela-tfd-ranges {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    /* Sideways-scrolling strip: keep its touches native scroll (the drawer body is pan-y). */
    touch-action: pan-x;
    padding: 0 2px 14px;
}
.vela-tfd-ranges::-webkit-scrollbar { display: none; }
.vela-tfd-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 6px;
    padding-bottom: 4px;
}
.vela-tfd-chip {
    all: unset;
    min-height: 40px;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    border: 1px solid var(--vela-border);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--vela-fg);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}
.vela-tfd-chip:active { background: var(--vela-hover); }
.vela-tfd-chip[data-active='1'] {
    color: var(--vela-fg-bright);
    border-color: var(--vela-fg-bright);
    background: var(--vela-hover);
}
`;

export interface TimeframeDrawerOptions {
    host: HTMLElement;
    timeframes: readonly string[];
    ranges: readonly RangePreset[];
    /** Read live at open — the current timeframe (highlights its chip). */
    currentTimeframe: () => string;
    /** Read live at open — the active range chip id, or null. */
    activeRange: () => string | null;
    onTimeframe: (tf: string) => void;
    onRange: (preset: RangePreset) => void;
    onOpenChange?: (open: boolean) => void;
    /** Live context of the active chart: plugin interval sections (ticks, ranges…) are listed
     *  under the timeframes. Without it they are not offered. */
    getContext?: () => WidgetContext;
}

export class TimeframeDrawer {
    private readonly drawer: Drawer;
    private readonly rangeChips = new Map<string, HTMLButtonElement>();
    private readonly tfChips = new Map<string, HTMLButtonElement>();
    private readonly sectionsHost: HTMLElement;
    private gen = 0;

    constructor(private readonly opts: TimeframeDrawerOptions) {
        const doc = opts.host.ownerDocument;
        injectStyles(STYLE_ID, CSS, doc);
        this.drawer = new Drawer({ host: opts.host, onOpenChange: opts.onOpenChange });

        const rangeHeading = doc.createElement('div');
        rangeHeading.className = 'vela-tfd-heading';
        rangeHeading.textContent = 'Date Range';

        const ranges = doc.createElement('div');
        ranges.className = 'vela-tfd-ranges';
        for (const preset of opts.ranges) {
            const chip = doc.createElement('button');
            chip.className = 'vela-tfd-chip';
            chip.textContent = preset.id;
            chip.addEventListener('click', () => {
                opts.onRange(preset);
                this.drawer.hide();
            });
            this.rangeChips.set(preset.id, chip);
            ranges.appendChild(chip);
        }

        const tfHeading = doc.createElement('div');
        tfHeading.className = 'vela-tfd-heading';
        tfHeading.textContent = 'Timeframes';

        const grid = doc.createElement('div');
        grid.className = 'vela-tfd-grid';
        for (const tf of opts.timeframes) {
            const chip = doc.createElement('button');
            chip.className = 'vela-tfd-chip';
            chip.textContent = timeframeLabel(tf);
            chip.addEventListener('click', () => {
                // Leaving tick/range… bars for a time interval.
                const ctx = opts.getContext?.();
                const active = ctx ? activeIntervalSection(ctx) : null;
                if (ctx && active) active.section.leave(ctx);
                opts.onTimeframe(tf);
                this.drawer.hide();
            });
            this.tfChips.set(tf, chip);
            grid.appendChild(chip);
        }

        this.sectionsHost = doc.createElement('div');
        this.drawer.body.append(rangeHeading, ranges, tfHeading, grid, this.sectionsHost);
    }

    /** Plugin sections (ticks, ranges…) for the active chart, rebuilt on every open. */
    private renderSections(ctx: WidgetContext | null, active: { section: IntervalSection; value: number } | null): void {
        const gen = ++this.gen;
        const doc = this.sectionsHost.ownerDocument;
        this.sectionsHost.replaceChildren();
        if (!ctx) return;
        for (const s of intervalSections(ctx)) {
            const heading = doc.createElement('div');
            heading.className = 'vela-tfd-heading';
            heading.textContent = s.title;
            const grid = doc.createElement('div');
            grid.className = 'vela-tfd-grid';
            grid.dataset.section = s.id;
            const paint = (choices: readonly IntervalChoice[]): void => {
                grid.replaceChildren();
                const values = [...choices];
                if (active?.section.id === s.id && !values.some((c) => c.value === active.value)) {
                    values.push({ value: active.value, label: s.short(active.value) });
                    values.sort((a, b) => a.value - b.value);
                }
                for (const c of values) {
                    const chip = doc.createElement('button');
                    chip.className = 'vela-tfd-chip';
                    chip.textContent = s.short(c.value);
                    chip.title = c.hint ? `${c.label} (${c.hint})` : c.label;
                    if (active?.section.id === s.id && active.value === c.value) chip.dataset.active = '1';
                    chip.addEventListener('click', () => {
                        if (active && active.section.id !== s.id) active.section.leave(ctx);
                        s.select(ctx, c.value);
                        this.drawer.hide();
                    });
                    grid.appendChild(chip);
                }
                if (!values.length) grid.textContent = 'No suggested sizes for this market.';
            };
            const got = s.choices(ctx);
            if (Array.isArray(got)) paint(got);
            else {
                grid.textContent = 'Sizing for this market…';
                void Promise.resolve(got)
                    .then((c) => {
                        if (gen === this.gen) paint(c);
                    })
                    .catch(() => {
                        if (gen === this.gen) grid.textContent = 'Could not size these bars for this market.';
                    });
            }
            this.sectionsHost.append(heading, grid);
        }
    }

    open(): void {
        const tf = this.opts.currentTimeframe();
        const range = this.opts.activeRange();
        const ctx = this.opts.getContext?.() ?? null;
        const active = ctx ? activeIntervalSection(ctx) : null;
        this.renderSections(ctx, active);
        for (const [id, chip] of this.rangeChips) {
            if (range !== null && id === range) chip.dataset.active = '1';
            else delete chip.dataset.active;
        }
        for (const [id, chip] of this.tfChips) {
            if (range === null && active === null && id === tf) chip.dataset.active = '1';
            else delete chip.dataset.active;
        }
        this.drawer.show();
    }

    close(): void {
        this.drawer.hide();
    }

    destroy(): void {
        this.drawer.destroy();
    }
}
