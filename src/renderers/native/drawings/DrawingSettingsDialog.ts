import type { VelaTheme } from '../../../core/options';
import type { Drawing, FrtpStyle, FrvpStyle, PositionLevelMode, SerializedDrawing } from '../../../core/drawings';
import {
    DIRECTION_OPTIONS,
    FibLevels,
    FibRetracement,
    GannBox,
    GannFan,
    GannSquare,
    PitchforkBase,
    PITCHFORK_STYLES,
    PriceRange,
    DatePriceRange,
    DateRange,
    MeasureBox,
    Freehand,
    Path,
    Box,
    Highlighter,
    HIGHLIGHTER_WIDTHS,
    ArrowMarker,
    ArrowMark,
    FixedRangeVolumeProfile,
    FixedRangeTpoProfile,
    INTERVAL_UNITS,
    LINE_STYLE_OPTIONS,
    DEFAULT_DRAWING_COLOR,
    TEXT_SIZE_OPTIONS,
    TEXT_PX_SIZES,
    STATS_PARTS,
    textPx,
    MachFigure,
    PositionTool,
    ParallelChannel,
    clonePlain,
    compactIntervals,
    createDrawing,
    defaultRange,
    effectiveFillColor,
    getDrawingType,
    type IntervalRange,
    type IntervalUnit,
    type IntervalVisibility,
} from '../../../core/drawings';
import { BEARISH, BULLISH } from '../../../core/palette';
import { ALONG_LINE_TEXT_TYPES, type SettingsField } from '../../../core/drawings/schema';
import { Menu } from '../../../ui/components/menu';
import { contrastColor } from '../../shared/drawing-geometry';
import { applyChromeTokens } from '../../shared/theme-tokens';
import { Dialog } from '../../../ui/components/dialog';
import { Popover, closeOpenPopovers, eventDismissedPopover, isPopoverOpen, openPopoverTrigger } from '../../../ui/components/popover';
import { ColorField } from '../../../ui/components/color-picker';
import { iconEl } from '../../../ui/icons';
import { fieldGrid, fieldRow, fieldSection, buildFieldControl } from '../../../ui/components/field';
import type { SelectOption } from '../../../ui/components/select';
import type { SettingsActions } from './DrawingSettingsPopup';
import { vt } from '../../../i18n';

/** Which builder fills the dialog: `settings` is the generic tabbed dialog every drawing has; the others are
 *  the older single-purpose names, kept so callers still work (they open the same dialog on the right tab). */
export type DrawingDialogKind = 'settings' | 'position' | 'frvp' | 'frtpo' | 'levels';

/** The dialog's tabs, TradingView's order. Only the tabs a drawing has are shown. */
export type DrawingDialogTab = 'inputs' | 'style' | 'text' | 'coordinates' | 'visibility';
const TAB_LABEL: Record<DrawingDialogTab, string> = {
    inputs: 'Inputs',
    style: 'Style',
    text: 'Text',
    coordinates: 'Coordinates',
    visibility: 'Visibility',
};

const LEVEL_UNITS: readonly SelectOption[] = [
    { value: 'price', label: 'Price' },
    { value: 'points', label: 'Points' },
];
const FRVP_ANCHOR: readonly SelectOption[] = [
    { value: 'right', label: 'Right' },
    { value: 'left', label: 'Left' },
];
const WIDTH_OPTIONS: readonly SelectOption[] = [1, 2, 3, 4].map((w) => ({ value: String(w), label: `${w}px` }));
const SIZE_OPTIONS: readonly SelectOption[] = TEXT_SIZE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
/** TradingView's text-size dropdown: px. */
const PX_SIZE_OPTIONS: readonly SelectOption[] = TEXT_PX_SIZES.map((n) => ({ value: String(n), label: String(n) }));
/** TradingView's dialog titles where they differ from the tool's name in the toolbar. */
const DIALOG_TITLE: Record<string, string> = { arrowmarker: 'Arrow marker', arrowmarkup: 'Arrow mark up', arrowmarkdown: 'Arrow mark down', freehand: 'Brush', highlighter: 'Highlighter', path: 'Path', pricerange: 'Price range', datepricerange: 'Date and price range', daterange: 'Date range', trendline: 'Trendline', hline: 'Horizontal line', vline: 'Vertical line', hray: 'Horizontal ray', infoline: 'Info line', parallelchannel: 'Parallel channel' };
/** TradingView's Text orientation dropdown (vertical line). */
const ORIENTATION_OPTIONS: readonly SelectOption[] = [
    { value: 'horizontal', label: 'Horizontal' },
    { value: 'vertical', label: 'Vertical' },
];
const STATS_PATHS = new Set(['stats.position', 'stats.always', ...STATS_PARTS.map((p) => `stats.${p.key}`)]);
/** TradingView's Extend dropdown label for each left/right combination. */
/** TradingView's summary of ticked choices: the first as written, the rest lower-cased ("Price range, percent change"). */
function joinChoices(labels: readonly string[]): string {
    return labels.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1))).join(', ');
}
/** Schema paths the dialog never shows: the toolbar owns them (lock) or they are per-tool icons. */
const SKIP_PATHS = new Set(['locked', 'visible', 'glyph', 'size']);
/** Drawings whose one anchor only carries a price (or only a time): the Coordinates tab shows that one value. */
// A horizontal ray's start has a time too (TradingView: "#1 (price, bar)").
const PRICE_ONLY = new Set(['hline']);
const TIME_ONLY = new Set(['vline']);

/**
 * The drawing settings dialog (TradingView's layout, 2026-10-17): the tool's name as the title, then tabs —
 * Inputs (sizing / profile tools), Style, Text, Coordinates, Visibility — and a footer with Template, Cancel and
 * Ok. The floating toolbar keeps only the quick controls; everything else lives here. Edits apply live,
 * Cancel restores the open-time snapshot, Ok keeps them. Same shell and field language as the indicator dialog.
 */
export class DrawingSettingsDialog {
    private ui: Dialog | null = null;
    private templateMenu: Menu | null = null;
    private theme: VelaTheme;
    /** The tab to show when the dialog rebuilds itself (template apply / reset). */
    private activeTab: DrawingDialogTab | null = null;

    constructor(private readonly host: HTMLElement, theme: VelaTheme) {
        this.theme = theme;
    }

    setTheme(theme: VelaTheme): void {
        this.theme = theme;
    }

    isOpen(): boolean {
        return this.ui != null;
    }

    contains(node: Node | null): boolean {
        return this.ui?.contains(node) === true;
    }

    /** The tabs `drawing` gets, in order. */
    static tabsFor(drawing: Drawing): DrawingDialogTab[] {
        const tabs: DrawingDialogTab[] = [];
        const custom = drawing instanceof PositionTool || drawing instanceof FixedRangeVolumeProfile || drawing instanceof FixedRangeTpoProfile;
        if (custom) tabs.push('inputs');
        if (drawing.editableLevels() || styleFields(drawing).length > 0) tabs.push('style');
        if (drawing.schema().fields.some((f) => f.path.startsWith('text.'))) tabs.push('text');
        // TradingView's brush, highlighter and path have no Coordinates tab.
        const brush = (drawing instanceof Freehand || drawing instanceof Highlighter || drawing instanceof Path) && drawing.tv;
        if (!(drawing instanceof PositionTool) && !brush && drawing.anchors.length > 0) tabs.push('coordinates');
        tabs.push('visibility');
        return tabs;
    }

    open(drawing: Drawing, actions: SettingsActions, kind: DrawingDialogKind = 'settings', keepSnapshot?: SerializedDrawing, tab?: DrawingDialogTab): void {
        const keepTab = keepSnapshot ? this.activeTab : null;
        this.close();
        // `drawing` is the instance the toolbar opened on; every edit since has replaced it.
        const live = actions.resolve() ?? drawing;
        // Cancel restores the state from BEFORE the dialog first opened — a template apply /
        // reset re-opens the dialog (to repaint its fields) but must keep that original.
        const snapshot = keepSnapshot ?? clonePlain(live.serialize());
        const tabs = DrawingSettingsDialog.tabsFor(live);
        const wanted: DrawingDialogTab = tab ?? keepTab ?? (kind === 'levels' ? 'style' : kind === 'settings' ? tabs[0]! : 'inputs');
        const first = tabs.includes(wanted) ? wanted : tabs[0]!;

        const bodies = new Map<DrawingDialogTab, HTMLElement>();
        for (const t of tabs) {
            const grid = fieldGrid({ variant: 'inputs' });
            grid.style.padding = '16px 20px';
            grid.style.overflowY = 'auto';
            grid.style.overflowX = 'hidden';
            grid.style.flex = '1 1 auto';
            grid.style.alignContent = 'start';
            grid.dataset.tab = t;
            if (t === 'inputs') {
                if (live instanceof PositionTool) this.buildPosition(grid, live, actions);
                else if (live instanceof FixedRangeVolumeProfile) this.buildFrvp(grid, live, actions);
                else if (live instanceof FixedRangeTpoProfile) this.buildFrtpo(grid, live, actions);
            } else if (t === 'style') this.buildStyle(grid, live, actions);
            else if (t === 'text') this.buildText(grid, live, actions);
            else if (t === 'coordinates') this.buildCoordinates(grid, live, actions);
            else this.buildVisibility(grid, live, actions);
            bodies.set(t, grid);
        }

        let ui: Dialog;
        ui = new Dialog({
            host: this.host,
            title: DIALOG_TITLE[live.type] ?? getDrawingType(live.type)?.label ?? 'Settings',
            // Non-modal: live-edit dialog — a modal machine locks pointer events on the
            // whole body, killing the chart and the body-portaled popovers.
            modal: false,
            contained: true,
            align: 'center',
            draggable: true,
            flush: true,
            className: 'vela-dialog--form vela-drawing-dialog',
            closeOnEscape: false,
            footer: (foot) => {
                foot.append(
                    this.buildTemplateButton(drawing, actions, kind, snapshot),
                    btn('Cancel', false, () => {
                        actions.restore?.(snapshot);
                        this.close();
                    }),
                    btn('Ok', true, () => this.close()),
                );
            },
            // Only the CURRENT dialog may close itself: a template apply / reset re-opens (destroying the old
            // one), and the old one's async close notification must not take the new one down with it.
            onOpenChange: (open) => { if (!open && this.ui === ui) this.close(); },
        });
        applyChromeTokens(ui.panel, this.theme);

        // Tab strip: the indicator dialog's look (bold labels, underline on the active one).
        const strip = document.createElement('div');
        strip.setAttribute('role', 'tablist');
        strip.style.cssText = 'display:flex;gap:16px;padding:0 20px;border-bottom:1px solid var(--vela-border);flex:0 0 auto;overflow-x:auto;scrollbar-width:none;';
        const tabEls = new Map<DrawingDialogTab, HTMLElement>();
        const activate = (t: DrawingDialogTab): void => {
            this.activeTab = t;
            for (const [k, el] of tabEls) {
                const on = k === t;
                el.style.borderBottomColor = on ? 'var(--vela-fg-bright)' : 'transparent';
                el.style.color = on ? 'inherit' : 'var(--vela-fg-muted)';
                el.setAttribute('aria-selected', String(on));
                bodies.get(k)!.style.display = on ? 'grid' : 'none';
            }
        };
        for (const t of tabs) {
            const el = document.createElement('button');
            el.type = 'button';
            el.setAttribute('role', 'tab');
            el.dataset.tab = t;
            el.className = 'vela-drawing-tab';
            el.textContent = vt(TAB_LABEL[t]);
            el.style.cssText =
                'background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;padding:10px 0 8px;font:inherit;font-weight:600;font-size:13px;line-height:20px;cursor:pointer;white-space:nowrap;color:inherit;';
            el.addEventListener('click', () => activate(t));
            strip.appendChild(el);
            tabEls.set(t, el);
        }
        ui.body.appendChild(strip);
        for (const b of bodies.values()) ui.body.appendChild(b);
        activate(first);

        const onBackdropDown = (e: Event): void => {
            if (e.target !== ui.backdrop && e.target !== ui.positioner) return;
            // An open portaled popover (color picker, select list) is part of the
            // dialog: the first outside click dismisses it, not the dialog itself.
            if (isPopoverOpen() || eventDismissedPopover(e)) {
                closeOpenPopovers();
                return;
            }
            this.close();
        };
        ui.backdrop.addEventListener('pointerdown', onBackdropDown);
        ui.positioner.addEventListener('pointerdown', onBackdropDown);
        ui.panel.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                actions.restore?.(snapshot);
                this.close();
            }
            // Typing in a field must not reach the chart's keyboard shortcuts.
            if ((e.target as HTMLElement | null)?.closest('input, textarea')) e.stopPropagation();
        });
        this.ui = ui;
        ui.show();
    }

    /** Style tab, TradingView's: the Line row (one button for color, opacity, thickness and line style, then the two
     *  line-end buttons), Background, Extend, the tool's switches, then the INFO section (stats) and the tool's own
     *  sections (Fib, levels). */
    private buildStyle(grid: HTMLElement, drawing: Drawing, actions: SettingsActions): void {
        if (drawing instanceof ParallelChannel) {
            this.buildChannelStyle(grid, drawing, actions);
            return;
        }
        if (drawing instanceof PitchforkBase) {
            this.buildPitchforkStyle(grid, drawing, actions);
            return;
        }
        if (drawing instanceof MeasureBox && drawing.tv) {
            this.buildRangeStyle(grid, drawing, actions);
            return;
        }
        if ((drawing instanceof ArrowMarker && drawing.tv) || drawing instanceof ArrowMark) {
            // TradingView's arrow marker and arrow marks: one Color row.
            const row = fieldRow({ label: 'Color', control: [this.colorControl(drawing, 'style.lineColor', actions, drawing.style.lineColor || DEFAULT_DRAWING_COLOR)], fit: true });
            row.dataset.role = 'color';
            grid.appendChild(row);
            return;
        }
        if (drawing instanceof Box && drawing.tv) {
            this.buildRectangleStyle(grid, drawing, actions);
            return;
        }
        if (drawing instanceof Highlighter && drawing.tv) {
            // TradingView's highlighter: Line (a color) and Thickness (its px list).
            const line = fieldRow({ label: 'Line', control: [this.colorControl(drawing, 'style.lineColor', actions, drawing.style.lineColor || DEFAULT_DRAWING_COLOR)], fit: true });
            line.dataset.role = 'line';
            const widths = HIGHLIGHTER_WIDTHS.map((w) => ({ value: String(w), label: `${w}px` }));
            const thick = fieldRow({ label: 'Thickness', control: [this.selectControl('style.lineWidth', widths, String(drawing.style.lineWidth ?? 20), actions, (v) => Number(v))], fit: true });
            thick.dataset.role = 'thickness';
            grid.append(line, thick);
            return;
        }
        const fields = styleFields(drawing);
        const has = (p: string): boolean => fields.some((f) => f.path === p);
        const done = new Set<string>();
        if (has('style.lineColor') || has('style.lineWidth') || has('style.lineStyle')) {
            const controls: HTMLElement[] = [];
            const wf = fields.find((f) => f.path === 'style.lineWidth');
            // Markers (highlighter 4-60 px) take a number; hairline tools the 1-4 px list inside the line button.
            const marker = !!wf && ((wf.min ?? 1) > 1 || (wf.max ?? 4) > 10);
            if (has('style.lineColor') && !marker && (wf || has('style.lineStyle'))) {
                controls.push(this.lineButton(drawing, actions, !!wf, has('style.lineStyle')));
            } else {
                if (has('style.lineColor')) controls.push(this.colorControl(drawing, 'style.lineColor', actions, DEFAULT_DRAWING_COLOR));
                if (wf) {
                    if (marker) controls.push(this.numberControl(drawing, wf, actions));
                    else controls.push(this.selectControl('style.lineWidth', WIDTH_OPTIONS, String(drawing.style.lineWidth ?? 1), actions, (v) => Number(v)));
                }
                if (has('style.lineStyle')) controls.push(this.selectControl('style.lineStyle', LINE_STYLE_OPTIONS, String(drawing.style.lineStyle ?? 'solid'), actions));
            }
            if (has('style.arrowLeft') && has('style.arrowRight')) {
                controls.push(this.lineEndButton(drawing, 'style.arrowLeft', 'left', actions), this.lineEndButton(drawing, 'style.arrowRight', 'right', actions));
                done.add('style.arrowLeft').add('style.arrowRight');
            }
            grid.appendChild(fieldRow({ label: 'Line', control: controls, fit: true }));
            done.add('style.lineColor').add('style.lineWidth').add('style.lineStyle');
        }
        if (has('style.fillColor')) {
            const fill = effectiveFillColor(drawing, this.theme) ?? drawing.style.fillColor ?? DEFAULT_DRAWING_COLOR;
            const control = [this.colorControl(drawing, 'style.fillColor', actions, fill)];
            // TradingView's Background row: a switch beside the color when the tool has one (the brush).
            const on = (drawing as unknown as { fillBackground?: boolean }).fillBackground;
            const row = has('fillBackground')
                ? fieldRow({ label: 'Background', toggle: { id: uid(), checked: on === true, onChange: (v) => actions.patch({ fillBackground: v }) }, control, fit: true })
                : fieldRow({ label: 'Background', control, fit: true });
            row.dataset.role = 'background';
            grid.appendChild(row);
            done.add('style.fillColor').add('fillBackground');
        }
        if (has('extendLeft') && has('extendRight')) {
            grid.appendChild(fieldRow({ label: 'Extend', control: [this.extendDropdown(drawing, actions)], fit: true }));
            done.add('extendLeft').add('extendRight');
        }
        for (const f of fields) {
            if (done.has(f.path) || STATS_PATHS.has(f.path)) continue;
            const row = this.schemaRow(drawing, f, actions);
            if (row) grid.appendChild(row);
        }
        if (fields.some((f) => STATS_PATHS.has(f.path))) this.buildStats(grid, drawing, actions);
        if (drawing.editableLevels()) {
            if (!(drawing instanceof MachFigure)) {
                const sizes = drawing as unknown as { numbersSize?: string; labelsSize?: string };
                grid.appendChild(fieldRow({ label: 'Numbers size', control: [this.selectControl('numbersSize', SIZE_OPTIONS, sizes.numbersSize ?? 'small', actions)], fit: true }));
                grid.appendChild(fieldRow({ label: 'Labels size', control: [this.selectControl('labelsSize', SIZE_OPTIONS, sizes.labelsSize ?? 'normal', actions)], fit: true }));
            }
            this.buildLevels(grid, drawing, actions);
        }
    }

    /** TradingView's range Style tabs. Price range: Line, Background (a switch and its color), Extend (left / right).
     *  Date range: the same, Extend top / bottom. Date & price range:
     *  Line, Border (a switch and its line), Background. Then INFO: Stats (the tool's parts), Label (color and size) and
     *  Label background (a switch and its color). */
    private buildRangeStyle(grid: HTMLElement, mb: MeasureBox, actions: SettingsActions): void {
        grid.appendChild(fieldRow({ label: 'Line', control: [this.lineButton(mb, actions, true, mb instanceof PriceRange)], fit: true }));
        if (mb instanceof DatePriceRange) {
            const border = this.pathLineButton({ color: mb.borderColor, width: mb.borderWidth, style: 'solid' }, { color: 'borderColor', width: 'borderWidth' }, actions);
            const row = fieldRow({ label: 'Border', toggle: { id: uid(), checked: mb.drawBorder, onChange: (v) => actions.patch({ drawBorder: v }) }, control: [border], fit: true });
            row.dataset.role = 'border';
            grid.appendChild(row);
        }
        const bg = fieldRow({
            label: 'Background',
            toggle: { id: uid(), checked: mb.fillBackground, onChange: (v) => actions.patch({ fillBackground: v }) },
            control: [this.colorControl(mb, 'style.fillColor', actions, mb.style.fillColor ?? DEFAULT_DRAWING_COLOR)],
            fit: true,
        });
        bg.dataset.role = 'background';
        grid.appendChild(bg);
        if (mb instanceof PriceRange) grid.appendChild(fieldRow({ label: 'Extend', control: [this.extendDropdown(mb, actions)], fit: true }));
        if (mb instanceof DateRange) {
            // TradingView's: Extend top / Extend bottom ticks.
            const ends = [{ key: 'extendTop', label: 'Extend top' }, { key: 'extendBottom', label: 'Extend bottom' }] as const;
            const cur = (): DateRange => ((actions.resolve() ?? mb) as DateRange);
            const extLabel = (): string => {
                const on = ends.filter((e) => cur()[e.key]).map((e) => vt(e.label));
                return on.length ? joinChoices(on) : "Don't extend";
            };
            const ext = dropdownTrigger(extLabel());
            ext.el.dataset.role = 'extend';
            ext.button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleChecks(ext.button, ends.map((en) => ({ label: en.label, checked: () => cur()[en.key], set: (v: boolean) => actions.patch({ [en.key]: v }) })), () => ext.setLabel(extLabel()));
            });
            grid.appendChild(fieldRow({ label: 'Extend', control: [ext.el], fit: true }));
        }
        grid.appendChild(fieldSection('Info'));
        const now = (): MeasureBox => ((actions.resolve() ?? mb) as MeasureBox);
        const parts = mb.rangeParts();
        const statsLabel = (): string => {
            const on = parts.filter((p) => now().info[p.key] === true).map((p) => vt(p.label));
            return on.length ? joinChoices(on) : 'Hidden';
        };
        const dd = dropdownTrigger(statsLabel());
        dd.el.dataset.role = 'stats';
        dd.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChecks(
                dd.button,
                parts.map((p) => ({ label: p.label, checked: () => now().info[p.key] === true, set: (v: boolean) => actions.patch({ [`info.${p.key}`]: v }) })),
                () => dd.setLabel(statsLabel()),
            );
        });
        grid.appendChild(fieldRow({ label: 'Stats', control: [dd.el], fit: true }));
        const label = fieldRow({
            label: 'Label',
            control: [
                this.colorControl(mb, 'labelColor', actions, mb.labelColor),
                this.selectControl('labelSize', PX_SIZE_OPTIONS, String(mb.labelSize), actions, (v) => Number(v)),
            ],
            fit: true,
        });
        label.dataset.role = 'label';
        grid.appendChild(label);
        const lbg = fieldRow({
            label: 'Label background',
            toggle: { id: uid(), checked: mb.labelBackground, onChange: (v) => actions.patch({ labelBackground: v }) },
            control: [this.colorControl(mb, 'labelBgColor', actions, mb.labelBgColor)],
            fit: true,
        });
        lbg.dataset.role = 'label-background';
        grid.appendChild(lbg);
    }

    /** TradingView's parallel channel Style tab: its seven level rows (a switch, except on the two lines themselves; the
     *  level's value; its line button), then Extend and Background (a switch and its color). */
    private buildChannelStyle(grid: HTMLElement, ch: ParallelChannel, actions: SettingsActions): void {
        ch.levels.forEach((lv, i) => {
            const fixed = lv.coeff === 0 || lv.coeff === 1;
            const coeff = buildFieldControl({
                kind: 'number',
                value: lv.coeff,
                step: 0.25,
                fill: false,
                commit: 'blur',
                onChange: (v) => { if (Number.isFinite(v)) actions.patch({ [`levels.${i}.coeff`]: v }); },
            });
            coeff.el.style.width = '96px';
            coeff.el.style.flex = 'none';
            coeff.el.dataset.role = `level-${i}-coeff`;
            const line = this.levelLineButton(ch, i, actions);
            const row = fixed
                ? fieldRow({ label: '', control: [coeff.el, line], fit: true })
                : fieldRow({ label: '', toggle: { id: uid(), checked: lv.visible, onChange: (v) => actions.patch({ [`levels.${i}.visible`]: v }) }, control: [coeff.el, line], fit: true });
            row.dataset.role = `level-${i}`;
            grid.appendChild(row);
        });
        grid.appendChild(fieldRow({ label: 'Extend', control: [this.extendDropdown(ch, actions)], fit: true }));
        const fill = effectiveFillColor(ch, this.theme) ?? ch.style.fillColor ?? DEFAULT_DRAWING_COLOR;
        grid.appendChild(
            fieldRow({
                label: 'Background',
                toggle: { id: uid(), checked: ch.fillBackground !== false, onChange: (v) => actions.patch({ fillBackground: v }) },
                control: [this.colorControl(ch, 'style.fillColor', actions, fill)],
                fit: true,
            }),
        );
    }

    /** A channel level's line button: its color (the drawing's when unset), thickness and dash. */
    private levelLineButton(ch: ParallelChannel, i: number, actions: SettingsActions): HTMLElement {
        const lv = ch.levels[i]!;
        const el = this.pathLineButton(
            { color: lv.color || ch.style.lineColor || DEFAULT_DRAWING_COLOR, width: lv.lineWidth, style: lv.lineStyle },
            { color: `levels.${i}.color`, width: `levels.${i}.lineWidth`, style: `levels.${i}.lineStyle` },
            actions,
        );
        el.dataset.role = `level-${i}-line`;
        return el;
    }

    /** A line button over three settings paths (color, thickness, dash): a channel level, a pitchfork level or median.
     *  `onSetter` hands back a setter so another control (Use one color) can repaint its swatch. */
    private pathLineButton(
        init: { color: string; width: number; style: string },
        paths: { color: string; width: string; style?: string },
        actions: SettingsActions,
        onSetter?: (set: (color: string) => void) => void,
    ): HTMLElement {
        let color = init.color;
        let w = init.width;
        let ls = init.style;
        const field: ColorField = new ColorField({
            theme: this.theme,
            getVal: () => color,
            onVal: (v) => {
                color = v;
                actions.patch({ [paths.color]: v });
            },
            line: () => ({ width: w, style: ls }),
            popover: { align: 'start' },
            extra: () => {
                const box = document.createElement('div');
                box.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
                box.append(
                    caption('Thickness'),
                    segmented([1, 2, 3, 4].map((n) => ({ value: String(n), sample: { width: n, style: 'solid' } })), String(w), (v) => {
                        w = Number(v);
                        actions.patch({ [paths.width]: w });
                        field.paint();
                    }),
                );
                const stylePath = paths.style;
                if (stylePath) {
                    box.append(
                        caption('Line style'),
                        segmented(LINE_STYLE_OPTIONS.map((o) => ({ value: o.value, sample: { width: 2, style: o.value } })), ls, (v) => {
                            ls = v;
                            actions.patch({ [stylePath]: v });
                            field.paint();
                        }),
                    );
                }
                return box;
            },
        });
        onSetter?.((c) => {
            color = c;
            field.paint();
        });
        return field.el;
    }

    /** TradingView's Line button: the color swatch and a sample of the line; it opens the color grid and opacity with
     *  Thickness (1-4 px) and Line style (solid / dashed / dotted) under them. */
    private lineButton(drawing: Drawing, actions: SettingsActions, width: boolean, style: boolean): HTMLElement {
        let color = drawing.style.lineColor || DEFAULT_DRAWING_COLOR;
        let w = drawing.style.lineWidth ?? 1;
        let ls: string = drawing.style.lineStyle ?? 'solid';
        const field: ColorField = new ColorField({
            theme: this.theme,
            getVal: () => color,
            onVal: (v) => {
                color = v;
                actions.patch({ 'style.lineColor': v });
            },
            line: () => ({ width: w, style: ls }),
            popover: { align: 'start' },
            extra: () => {
                const box = document.createElement('div');
                box.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
                if (width) {
                    box.append(
                        caption('Thickness'),
                        segmented([1, 2, 3, 4].map((n) => ({ value: String(n), sample: { width: n, style: 'solid' } })), String(w), (v) => {
                            w = Number(v);
                            actions.patch({ 'style.lineWidth': w });
                            field.paint();
                        }),
                    );
                }
                if (style) {
                    box.append(
                        caption('Line style'),
                        segmented(LINE_STYLE_OPTIONS.map((o) => ({ value: o.value, sample: { width: 2, style: o.value } })), ls, (v) => {
                            ls = v;
                            actions.patch({ 'style.lineStyle': v });
                            field.paint();
                        }),
                    );
                }
                return box;
            },
        });
        field.el.dataset.role = 'line-button';
        field.el.title = vt('Line');
        return field.el;
    }

    /** TradingView's line-end button (left / right end of a trend line): a plain end or an arrow. */
    private lineEndButton(drawing: Drawing, path: 'style.arrowLeft' | 'style.arrowRight', side: 'left' | 'right', actions: SettingsActions): HTMLElement {
        let arrow = !!(path === 'style.arrowLeft' ? drawing.style.arrowLeft : drawing.style.arrowRight);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'vela-dlg-end';
        b.dataset.role = `line-end-${side}`;
        b.title = vt(side === 'left' ? 'Left end' : 'Right end');
        b.style.cssText = END_BTN_CSS;
        const paint = (): void => { b.innerHTML = endIcon(side, arrow); };
        paint();
        b.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleList(b, [
                { label: 'Normal', icon: endIcon(side, false), checked: !arrow, pick: () => { arrow = false; } },
                { label: 'Arrow', icon: endIcon(side, true), checked: arrow, pick: () => { arrow = true; } },
            ], () => {
                actions.patch({ [path]: arrow });
                paint();
            });
        });
        return b;
    }

    /** TradingView's Extend dropdown: "Extend left line" / "Extend right line" checkboxes; the button names the mix. */
    private extendDropdown(drawing: Drawing, actions: SettingsActions, words: { left: string; right: string } = { left: 'Extend left line', right: 'Extend right line' }): HTMLElement {
        const cur = drawing as unknown as { extendLeft?: boolean; extendRight?: boolean };
        let left = !!cur.extendLeft;
        let right = !!cur.extendRight;
        const label = (l: boolean, r: boolean): string => (l && r ? joinChoices([words.left, words.right]) : l ? words.left : r ? words.right : "Don't extend");
        const dd = dropdownTrigger(label(left, right));
        dd.el.dataset.role = 'extend';
        dd.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChecks(dd.button, [
                { label: words.left, checked: () => left, set: (v) => { left = v; actions.patch({ extendLeft: v }); } },
                { label: words.right, checked: () => right, set: (v) => { right = v; actions.patch({ extendRight: v }); } },
            ], () => dd.setLabel(label(left, right)));
        });
        return dd.el;
    }

    /** TradingView's INFO section: a Stats dropdown of the parts to show (Hidden when none), Stats position and
     *  Always show stats. */
    private buildStats(grid: HTMLElement, drawing: Drawing, actions: SettingsActions): void {
        const now = (): Record<string, unknown> => ({ ...((actions.resolve() ?? drawing) as unknown as { stats?: Record<string, unknown> }).stats });
        const statsLabel = (): string => {
            const st = now();
            const on = STATS_PARTS.filter((p) => st[p.key] === true).map((p) => vt(p.label));
            return on.length ? joinChoices(on) : 'Hidden';
        };
        grid.appendChild(fieldSection('Info'));
        const dd = dropdownTrigger(statsLabel());
        dd.el.dataset.role = 'stats';
        dd.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChecks(
                dd.button,
                STATS_PARTS.map((p) => ({
                    label: p.label,
                    checked: () => now()[p.key] === true,
                    set: (v: boolean) => actions.patch({ [`stats.${p.key}`]: v }),
                })),
                () => dd.setLabel(statsLabel()),
            );
        });
        grid.appendChild(fieldRow({ label: 'Stats', control: [dd.el], fit: true }));
        const pos = drawing.schema().fields.find((f) => f.path === 'stats.position');
        if (pos?.options) grid.appendChild(fieldRow({ label: 'Stats position', control: [this.selectControl('stats.position', pos.options, String(now().position ?? 'right'), actions)], fit: true }));
        grid.appendChild(fieldRow({ label: 'Always show stats', bool: true, toggle: { id: uid(), checked: now().always === true, onChange: (v) => actions.patch({ 'stats.always': v }) } }));
    }

    /** A small list under `trigger` (TradingView's line-end menu): one pick closes it. */
    private toggleList(trigger: HTMLElement, rows: Array<{ label: string; icon: string; checked: boolean; pick: () => void }>, done: () => void): void {
        if (openPopoverTrigger() === trigger) { closeOpenPopovers(); return; }
        const list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-direction:column;min-width:140px;';
        for (const r of rows) {
            const it = document.createElement('button');
            it.type = 'button';
            it.className = 'vela-dlg-list-item';
            it.style.cssText = LIST_ITEM_CSS + (r.checked ? 'background:var(--vela-surface-raised, rgba(255,255,255,0.08));' : '');
            it.innerHTML = `<span style="display:inline-flex;width:28px;">${r.icon}</span>`;
            const t = document.createElement('span');
            t.textContent = vt(r.label);
            it.appendChild(t);
            it.addEventListener('click', (e) => {
                e.stopPropagation();
                r.pick();
                done();
                closeOpenPopovers();
            });
            list.appendChild(it);
        }
        new Popover({ trigger, theme: this.theme, align: 'start', gap: 4, className: 'vela-color-field-pop', content: list }).show();
    }

    /** A checkbox list under `trigger` (TradingView's Extend and Stats dropdowns): stays open while ticking. */
    private toggleChecks(trigger: HTMLElement, rows: Array<{ label: string; checked: () => boolean; set: (v: boolean) => void }>, changed: () => void): void {
        if (openPopoverTrigger() === trigger) { closeOpenPopovers(); return; }
        const list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-direction:column;min-width:200px;padding:2px 0;';
        for (const r of rows) {
            const row = fieldRow({ label: r.label, bool: true, toggle: { id: uid(), checked: r.checked(), onChange: (v) => { r.set(v); changed(); } } });
            row.style.padding = '4px 6px';
            list.appendChild(row);
        }
        new Popover({ trigger, theme: this.theme, align: 'start', gap: 4, className: 'vela-color-field-pop', content: list }).show();
    }

    /** Text tab, TradingView's: color, size (px), Bold and Italic buttons on one row, the text box, then Text alignment
     *  (vertical, horizontal). The position tools keep their px number box. */
    private buildText(grid: HTMLElement, drawing: Drawing, actions: SettingsActions): void {
        const fields = drawing.schema().fields.filter((f) => f.path.startsWith('text.'));
        const has = (p: string): boolean => fields.some((f) => f.path === p);
        const text = drawing.text;
        const px = drawing.schema().fields.find((f) => f.path === 'fontSize' && f.kind === 'number');
        const style: HTMLElement[] = [];
        const tv = drawing.textDefaults();
        const textDefault = tv?.color ?? this.theme.textColor;
        if (has('text.color')) style.push(this.colorControl(drawing, 'text.color', actions, text?.color || textDefault));
        if (has('text.size')) style.push(this.selectControl('text.size', PX_SIZE_OPTIONS, String(textPx(text?.size ?? tv?.size)), actions, (v) => Number(v)));
        if (px) style.push(this.numberControl(drawing, px, actions));
        if (has('text.bold')) style.push(styleToggle('B', 'Bold', 'font-weight:700;', !!text?.bold, (v) => actions.patch({ 'text.bold': v })));
        if (has('text.italic')) style.push(styleToggle('I', 'Italic', 'font-style:italic;font-family:serif;', !!text?.italic, (v) => actions.patch({ 'text.italic': v })));
        if (style.length) {
            const row = document.createElement('div');
            row.className = 'vela-field-span';
            row.dataset.role = 'text-style';
            row.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
            row.append(...style);
            grid.appendChild(row);
        }
        if (has('text.value')) {
            const ta = buildFieldControl({
                kind: 'textarea',
                value: text?.value ?? '',
                rows: 3,
                autoGrow: true,
                maxLines: 8,
                placeholder: 'Add text',
                onChange: (v) => actions.patch({ 'text.value': v }),
            });
            ta.el.classList.add('vela-field-span');
            grid.appendChild(ta.el);
        }
        // TradingView's one "Text alignment" row: vertical position, then horizontal.
        const hf = fields.find((f) => f.path === 'text.hAlign');
        const vf = fields.find((f) => f.path === 'text.vAlign');
        if (hf?.options && vf?.options) {
            const hDef = tv?.hAlign ?? (ALONG_LINE_TEXT_TYPES.has(drawing.type) ? 'center' : 'left');
            grid.appendChild(
                fieldRow({
                    label: 'Text alignment',
                    control: [
                        this.selectControl('text.vAlign', vf.options, text?.vAlign ?? tv?.vAlign ?? 'top', actions),
                        this.selectControl('text.hAlign', hf.options, text?.hAlign ?? hDef, actions),
                    ],
                    fit: true,
                }),
            );
        }
        // TradingView's "Text orientation" (vertical line): a dropdown under the alignment.
        if (drawing.schema().fields.some((f) => f.path === 'textVertical')) {
            const vertical = !!(drawing as unknown as { textVertical?: boolean }).textVertical;
            grid.appendChild(fieldRow({ label: 'Text orientation', control: [this.selectControl('textVertical', ORIENTATION_OPTIONS, vertical ? 'vertical' : 'horizontal', actions, (v) => v === 'vertical')], fit: true }));
        }
        for (const f of fields) {
            if (['text.value', 'text.color', 'text.size', 'text.bold', 'text.italic', 'text.hAlign', 'text.vAlign'].includes(f.path)) continue;
            const row = this.schemaRow(drawing, f, actions);
            if (row) grid.appendChild(row);
        }
    }

    /** Coordinates tab: one row per anchor, price and bar time (local time, as the chart shows it). */
    private buildCoordinates(grid: HTMLElement, drawing: Drawing, actions: SettingsActions): void {
        const priceOnly = PRICE_ONLY.has(drawing.type);
        const timeOnly = TIME_ONLY.has(drawing.type);
        drawing.anchors.forEach((a, i) => {
            if (drawing instanceof ParallelChannel && i === 2) {
                // TradingView's "Price offset": the parallel line's distance from the baseline, in price
                const off = buildFieldControl({
                    kind: 'number',
                    value: roundPrice(drawing.offset()),
                    step: priceStep(a.price),
                    fill: false,
                    commit: 'blur',
                    onChange: (v) => {
                        if (!Number.isFinite(v)) return;
                        const live = (actions.resolve() ?? drawing) as ParallelChannel;
                        const p0 = live.anchors[0];
                        const p1 = live.anchors[1];
                        if (p0 && p1) actions.patch({ 'anchors.2.price': (p0.price + p1.price) / 2 + v });
                    },
                });
                off.el.dataset.role = 'channel-offset';
                off.el.style.width = '120px';
                off.el.style.flex = 'none';
                grid.appendChild(fieldRow({ label: 'Price offset', control: [off.el], fit: true }));
                return;
            }
            const controls: HTMLElement[] = [];
            if (!timeOnly) {
                let cur = a.price;
                const n = buildFieldControl({
                    kind: 'number',
                    value: roundPrice(a.price),
                    step: priceStep(a.price),
                    fill: false,
                    commit: 'blur',
                    title: 'Price',
                    onChange: (v) => {
                        if (!Number.isFinite(v)) { n.setValue?.(cur); return; }
                        cur = v;
                        actions.patch({ [`anchors.${i}.price`]: v });
                    },
                });
                n.el.dataset.role = 'anchor-price';
                n.el.style.width = '120px';
                n.el.style.flex = 'none';
                controls.push(n.el);
            }
            if (!priceOnly) {
                let cur = a.time;
                const t = buildFieldControl({
                    kind: 'text',
                    value: formatLocal(a.time),
                    fill: false,
                    placeholder: 'YYYY-MM-DD HH:MM',
                    onChange: (v) => {
                        const ms = parseLocal(v);
                        if (ms == null) { t.setValue?.(formatLocal(cur)); return; }
                        cur = ms;
                        actions.patch({ [`anchors.${i}.time`]: ms });
                    },
                });
                t.el.dataset.role = 'anchor-time';
                t.el.style.width = '172px'; // the whole `YYYY-MM-DD HH:MM` must show, also at the 16px phone font
                t.el.style.flex = 'none';
                controls.push(t.el);
            }
            // TradingView's "#1 (price)" for a price-only point; the time stays a date (the user's call, 2026-10-30).
            const label = priceOnly ? `#${i + 1} (price)` : timeOnly ? `#${i + 1} (time)` : `#${i + 1}`;
            grid.appendChild(fieldRow({ label, control: controls, fit: true }));
        });
    }

    /** Visibility tab: TradingView's "visibility on intervals" — one row per timeframe unit, a switch and a range. */
    private buildVisibility(grid: HTMLElement, drawing: Drawing, actions: SettingsActions): void {
        const current = (): IntervalVisibility => ({ ...(actions.resolve() ?? drawing).intervals });
        const write = (unit: IntervalUnit, r: IntervalRange): void => {
            const next = compactIntervals({ ...current(), [unit]: r });
            actions.patch({ intervals: next });
        };
        for (const m of INTERVAL_UNITS) {
            const r0 = drawing.intervals?.[m.unit] ?? defaultRange(m.unit);
            let r: IntervalRange = { ...r0 };
            const num = (key: 'from' | 'to'): HTMLElement => {
                const c = buildFieldControl({
                    kind: 'number',
                    value: r[key],
                    min: 1,
                    max: m.max,
                    step: 1,
                    integer: true,
                    clamp: true,
                    compact: true,
                    commit: 'blur',
                    title: key === 'from' ? `${m.label} from` : `${m.label} to`,
                    onChange: (v) => {
                        const n = Math.min(m.max, Math.max(1, Math.round(v)));
                        r = { ...r, [key]: n };
                        if (r.from > r.to) r = key === 'from' ? { ...r, to: n } : { ...r, from: n };
                        write(m.unit, r);
                    },
                });
                c.el.dataset.role = `interval-${m.unit}-${key}`;
                c.el.style.width = '64px';
                c.el.style.flex = 'none';
                return c.el;
            };
            // TradingView's row: from box, a two-knob slider over 1..max, to box; greyed while the row is off.
            const fromEl = num('from');
            const toEl = num('to');
            const sync = (): void => {
                for (const el of [fromEl, toEl]) el.dispatchEvent(new CustomEvent('vela-sync'));
                const fi = fromEl.querySelector('input');
                const ti = toEl.querySelector('input');
                if (fi) fi.value = String(r.from);
                if (ti) ti.value = String(r.to);
            };
            const slider = rangeSlider(1, m.max, () => r, (from, to) => {
                r = { ...r, from, to };
                sync();
                write(m.unit, r);
            });
            slider.dataset.role = `interval-${m.unit}-slider`;
            const dim = (): void => { for (const el of [fromEl, slider, toEl]) el.style.opacity = r.on ? '' : '0.45'; };
            const row = fieldRow({
                label: m.label,
                toggle: { checked: r.on, onChange: (v) => { r = { ...r, on: v }; dim(); write(m.unit, r); } },
                control: [fromEl, slider, toEl],
                fit: true,
            });
            fromEl.addEventListener('change', () => slider.dispatchEvent(new CustomEvent('vela-sync')), true);
            toEl.addEventListener('change', () => slider.dispatchEvent(new CustomEvent('vela-sync')), true);
            dim();
            grid.appendChild(row);
        }
    }

    /** One generic row for a schema field (color, number, select, line style, switch, text). */
    private schemaRow(drawing: Drawing, f: SettingsField, actions: SettingsActions): HTMLElement | null {
        const cur = getByPath(drawing, f.path);
        switch (f.kind) {
            case 'boolean':
                // The label ticks the box too, as TradingView's do.
                return fieldRow({ label: f.label, bool: true, toggle: { id: uid(), checked: !!cur, onChange: (v) => actions.patch({ [f.path]: v }) } });
            case 'color':
                return fieldRow({ label: f.label, control: [this.colorControl(drawing, f.path, actions, typeof cur === 'string' && cur ? cur : DEFAULT_DRAWING_COLOR)], fit: true });
            case 'number':
            case 'opacity':
                return fieldRow({ label: f.label, control: [this.numberControl(drawing, f, actions)], fit: true });
            case 'lineStyle':
                return fieldRow({ label: f.label, control: [this.selectControl(f.path, LINE_STYLE_OPTIONS, String(cur ?? 'solid'), actions)], fit: true });
            case 'select':
                if (!f.options?.length) return null;
                // Number-valued selects (e.g. a count) keep their number type.
                return fieldRow({ label: f.label, control: [this.selectControl(f.path, f.options, String(cur ?? f.options[0]!.value), actions, typeof cur === 'number' ? Number : undefined)], fit: true });
            case 'text':
                return fieldRow({
                    label: f.label,
                    control: [buildFieldControl({ kind: 'text', value: String(cur ?? ''), fill: false, onChange: (v) => actions.patch({ [f.path]: v }) }).el],
                    fit: true,
                });
            default:
                return null;
        }
    }

    private colorControl(drawing: Drawing, path: string, actions: SettingsActions, initial: string): HTMLElement {
        let c = initial;
        return buildFieldControl({
            kind: 'color',
            theme: this.theme,
            get: () => c,
            onChange: (v) => {
                c = v;
                actions.patch({ [path]: v });
            },
        }).el;
    }

    private numberControl(drawing: Drawing, f: SettingsField, actions: SettingsActions): HTMLElement {
        const cur = Number(getByPath(drawing, f.path) ?? f.min ?? 0);
        let last = cur;
        const n = buildFieldControl({
            kind: 'number',
            value: cur,
            min: f.min,
            max: f.max,
            step: f.step,
            fill: false,
            commit: 'blur',
            onChange: (v) => {
                if (!Number.isFinite(v)) { n.setValue?.(last); return; }
                const clamped = Math.min(f.max ?? Infinity, Math.max(f.min ?? -Infinity, v));
                last = clamped;
                actions.patch({ [f.path]: clamped });
            },
        });
        return n.el;
    }

    private selectControl(path: string, options: readonly SelectOption[], value: string, actions: SettingsActions, map?: (v: string) => unknown): HTMLElement {
        const el = buildFieldControl({
            kind: 'select',
            options,
            value,
            fill: false,
            theme: this.theme,
            onChange: (v) => actions.patch({ [path]: map ? map(v) : v }),
        }).el;
        // Long choices ("Below the line") must not be cut off: size the list to its longest label.
        const longest = Math.max(...options.map((o) => o.label.length));
        if (longest > 8) el.style.minWidth = `${Math.min(220, 40 + longest * 8)}px`;
        return el;
    }

    /** Bottom-left "Template ▾": save the current look under a name, re-apply a saved one,
     *  or reset to the tool's factory defaults. Templates are per drawing type, kept in
     *  localStorage, and carry style/text/props only — never anchors, so applying one
     *  restyles a drawing without moving it. */
    private buildTemplateButton(drawing: Drawing, actions: SettingsActions, kind: DrawingDialogKind, snapshot: SerializedDrawing): HTMLElement {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'margin-right:auto;display:flex;align-items:center;gap:8px;min-width:0;';
        const trigger = btn('Template \u25BE', false, () => {});
        trigger.setAttribute('aria-label', vt("Drawing template"));
        const type = drawing.type;
        const live = (): Drawing => actions.resolve() ?? drawing;
        const repaint = (): void => this.open(live(), actions, kind, snapshot);
        const applyLook = (look: TemplateLook): void => {
            const d = live().serialize();
            actions.restore?.({ ...d, style: { ...look.style }, text: look.text ? { ...look.text } : d.text, props: look.props ?? d.props });
            repaint();
        };
        const showSaveRow = (): void => {
            trigger.style.display = 'none';
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = vt("Template name");
            input.maxLength = 40;
            input.style.cssText =
                'min-width:0;width:130px;padding:6px 10px;border-radius:8px;border:1px solid var(--vela-border);background:transparent;color:inherit;font:inherit;';
            const save = btn('Save', true, () => {
                const name = input.value.trim();
                if (!name) { input.focus(); return; }
                const d = live().serialize();
                const all = readTemplates();
                (all[type] ??= {})[name] = clonePlain({ style: d.style, text: d.text, props: d.props });
                writeTemplates(all);
                repaint();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); save.click(); }
                e.stopPropagation(); // typing must not reach chart shortcuts
            });
            wrap.append(input, save);
            input.focus();
        };
        this.templateMenu?.destroy(); // a repaint rebuilds the footer: drop the previous menu's floating list
        const menu = this.templateMenu = new Menu({
            host: this.host,
            trigger,
            placement: 'top-start',
            items: [],
            onSelect: (id) => {
                if (id === 'reset') {
                    const fresh = createDrawing(type, { paneId: live().paneId });
                    if (fresh) actions.restore?.({ ...live().serialize(), ...pick(fresh.serialize()) });
                    repaint();
                } else if (id === 'save') showSaveRow();
                else if (id.startsWith('apply:')) {
                    const look = readTemplates()[type]?.[id.slice(6)];
                    if (look) applyLook(look);
                } else if (id.startsWith('del:')) {
                    const all = readTemplates();
                    if (all[type]) delete all[type][id.slice(4)];
                    writeTemplates(all);
                }
            },
        });
        // Rebuild the list each time it opens so saves/deletes show immediately.
        trigger.addEventListener('click', () => {
            const saved = Object.keys(readTemplates()[type] ?? {}).sort((a, b) => a.localeCompare(b));
            // TradingView's order: Save as…, Apply defaults, then the saved templates.
            menu.setItems([
                { id: 'save', label: 'Save as\u2026' },
                { id: 'reset', label: 'Apply defaults' },
                ...saved.map((n, i) => ({ id: `apply:${n}`, label: n, separatorBefore: i === 0 })),
                ...(saved.length ? [{ id: 'del-root', label: 'Delete template', separatorBefore: true, submenu: saved.map((n) => ({ id: `del:${n}`, label: n })) }] : []),
            ]);
        }, true);
        wrap.appendChild(trigger);
        return wrap;
    }

    close(): void {
        const ui = this.ui;
        this.ui = null;
        this.templateMenu?.destroy();
        this.templateMenu = null;
        ui?.destroy();
    }

    destroy(): void {
        this.close();
    }

    private buildPosition(grid: HTMLElement, drawing: PositionTool, actions: SettingsActions): void {
        const live = (): PositionTool => {
            const d = actions.resolve();
            return d instanceof PositionTool ? d : drawing;
        };
        const refreshers: Array<() => void> = [];
        const refreshAll = (): void => refreshers.forEach((f) => f());
        const fmt = (n: number): number => Math.round(n * 1e8) / 1e8;

        const numberRow = (
            label: string,
            path: 'riskPercent' | 'accountBalance' | 'quantity' | 'entryPrice',
            clamp?: { min: number; max: number; step: number; integer?: boolean },
        ): void => {
            const ctrl = buildFieldControl({
                kind: 'number',
                value: fmt(live()[path]),
                min: clamp?.min,
                max: clamp?.max,
                step: clamp?.step,
                integer: clamp?.integer,
                fill: false,
                commit: 'blur',
                onChange: (n) => {
                    actions.patch({ [path]: n });
                    refreshAll();
                },
            });
            refreshers.push(() => {
                if (document.activeElement !== ctrl.el.querySelector('input')) ctrl.setValue?.(fmt(live()[path]));
            });
            grid.appendChild(fieldRow({ label, control: ctrl.el }));
        };

        const levelRow = (label: string, path: 'stopPrice' | 'targetPrice', level: 'stop' | 'target'): void => {
            let mode: PositionLevelMode = 'price';
            const display = (): number => fmt(live().levelDisplayValue(level, mode));
            const ni = buildFieldControl({
                kind: 'number',
                value: display(),
                fill: false,
                commit: 'blur',
                onChange: (n) => {
                    actions.patch({ [path]: live().levelPriceFromDisplay(level, mode, n) });
                    refreshAll();
                },
            });
            const sel = buildFieldControl({
                kind: 'select',
                options: LEVEL_UNITS,
                value: mode,
                fill: false,
                theme: this.theme,
                onChange: (v) => {
                    mode = v as PositionLevelMode;
                    ni.setValue?.(display());
                },
            });
            refreshers.push(() => {
                if (document.activeElement !== ni.el.querySelector('input')) ni.setValue?.(display());
            });
            grid.appendChild(fieldRow({ label, control: [ni.el, sel.el] }));
        };

        grid.appendChild(fieldSection('Account', { variant: 'inputs', first: true }));
        numberRow('Risk %', 'riskPercent', { min: 0, max: 100, step: 0.1 });
        numberRow('Account balance', 'accountBalance', { min: 0, max: 1e12, step: 1, integer: true });
        numberRow('Position size', 'quantity');

        grid.appendChild(fieldSection('Levels', { variant: 'inputs' }));
        const dir = buildFieldControl({
            kind: 'select',
            options: DIRECTION_OPTIONS,
            value: live().direction,
            fill: false,
            theme: this.theme,
            onChange: (v) => {
                actions.patch({ direction: v });
                refreshAll();
            },
        });
        refreshers.push(() => dir.setValue?.(live().direction));
        grid.appendChild(fieldRow({ label: 'Direction', control: dir.el }));
        numberRow('Entry price', 'entryPrice');
        levelRow('Stop', 'stopPrice', 'stop');
        levelRow('Target', 'targetPrice', 'target');

        grid.appendChild(fieldSection('Display', { variant: 'inputs' }));
        const toggles: Array<[string, 'showText' | 'showHeader' | 'showLossSize' | 'showTargetLabel' | 'showStopLabel' | 'showPrices']> = [
            ['Show text', 'showText'],
            ['Show direction & ratio', 'showHeader'],
            ['Show loss & size', 'showLossSize'],
            ['Show target label', 'showTargetLabel'],
            ['Show stop label', 'showStopLabel'],
            ['Show level prices', 'showPrices'],
        ];
        for (const [label, path] of toggles) {
            grid.appendChild(fieldRow({
                label,
                bool: true,
                toggle: {
                    checked: live()[path],
                    onChange: (v) => {
                        actions.patch({ [path]: v });
                        refreshAll();
                    },
                    get: () => live()[path],
                },
            }));
        }

        const summary = document.createElement('div');
        summary.className = 'vela-field-span';
        summary.style.cssText = 'opacity:0.7;font-size:11px;line-height:1.4;border-top:1px solid var(--vela-border);padding-top:6px;font-variant-numeric:tabular-nums;';
        refreshers.push(() => {
            const d = live();
            summary.textContent = `${d.headerLabel()}  —  ${d.lossSizeLabel()}`;
        });
        grid.appendChild(summary);
        refreshAll();
    }

    private buildFrvp(grid: HTMLElement, drawing: FixedRangeVolumeProfile, actions: SettingsActions): void {
        const styleOf = (): FrvpStyle => {
            const d = actions.resolve();
            return d instanceof FixedRangeVolumeProfile ? d.frvp : drawing.frvp;
        };
        const s = styleOf();

        const numberRow = (label: string, path: keyof FrvpStyle, min: number, max: number, step: number, integer = true): void => {
            grid.appendChild(fieldRow({
                label,
                control: buildFieldControl({
                    kind: 'number',
                    value: s[path] as number,
                    min,
                    max,
                    step,
                    integer,
                    fill: false,
                    commit: 'blur',
                    onChange: (n) => actions.patch({ [`frvp.${path}`]: n }),
                }).el,
            }));
        };
        numberRow('Rows', 'rows', 1, 500, 1);
        numberRow('Value Area', 'valueAreaPct', 0, 100, 1);
        numberRow('Width %', 'widthPct', 0, 100, 1);
        grid.appendChild(fieldRow({
            label: 'Anchor',
            control: buildFieldControl({
                kind: 'select',
                options: FRVP_ANCHOR,
                value: s.anchor,
                fill: false,
                theme: this.theme,
                onChange: (v) => actions.patch({ 'frvp.anchor': v }),
            }).el,
        }));

        const colorRow = (label: string, path: keyof FrvpStyle): void => {
            grid.appendChild(fieldRow({
                label,
                fit: true,
                control: buildFieldControl({
                    kind: 'color',
                    theme: this.theme,
                    get: () => styleOf()[path] as string,
                    onChange: (v) => actions.patch({ [`frvp.${path}`]: v }),
                }).el,
            }));
        };
        colorRow('Up Volume', 'upColor');
        colorRow('Down Volume', 'downColor');
        colorRow('Value Area Up', 'vaUpColor');
        colorRow('Value Area Down', 'vaDownColor');

        const styles = LINE_STYLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
        const levelRow = (label: string, showPath: keyof FrvpStyle, colorPath: keyof FrvpStyle, stylePath: keyof FrvpStyle): void => {
            const row = document.createElement('div');
            row.className = 'vela-field-span';
            row.style.cssText = 'display:flex;align-items:center;gap:8px;';
            const sw = buildFieldControl({
                kind: 'switch',
                checked: Boolean(s[showPath]),
                onChange: (v) => actions.patch({ [`frvp.${showPath}`]: v }),
            });
            const lbl = document.createElement('span');
            lbl.className = 'vela-field-label';
            lbl.style.flex = '1';
            lbl.textContent = vt(label);
            let cur = (s[colorPath] as string | undefined) ?? contrastColor(this.theme.background);
            const col = buildFieldControl({
                kind: 'color',
                theme: this.theme,
                get: () => cur,
                onChange: (v) => {
                    cur = v;
                    actions.patch({ [`frvp.${colorPath}`]: v });
                },
            });
            const style = buildFieldControl({
                kind: 'select',
                options: styles,
                value: s[stylePath] as string,
                fill: false,
                theme: this.theme,
                onChange: (v) => actions.patch({ [`frvp.${stylePath}`]: v }),
            });
            row.append(sw.el, lbl, col.el, style.el);
            grid.appendChild(row);
        };
        levelRow('VAH', 'showVah', 'vahColor', 'vahStyle');
        levelRow('VAL', 'showVal', 'valColor', 'valStyle');
        levelRow('POC', 'showPoc', 'pocColor', 'pocStyle');
        levelRow('Developing POC', 'showDevelopingPoc', 'developingPocColor', 'developingPocStyle');
        levelRow('Developing VA', 'showDevelopingVa', 'developingVaColor', 'developingVaStyle');
    }

    private buildFrtpo(grid: HTMLElement, drawing: FixedRangeTpoProfile, actions: SettingsActions): void {
        const styleOf = (): FrtpStyle => {
            const d = actions.resolve();
            return d instanceof FixedRangeTpoProfile ? d.frtpo : drawing.frtpo;
        };
        const s = styleOf();

        const numberRow = (label: string, path: keyof FrtpStyle, min: number, max: number): void => {
            grid.appendChild(fieldRow({
                label,
                control: buildFieldControl({
                    kind: 'number',
                    value: s[path] as number,
                    min,
                    max,
                    step: 1,
                    integer: true,
                    fill: false,
                    commit: 'blur',
                    onChange: (n) => actions.patch({ [`frtpo.${path}`]: n }),
                }).el,
            }));
        };
        numberRow('Rows', 'rows', 1, 500);
        numberRow('Period (min)', 'periodMin', 1, 1440);
        numberRow('Value Area', 'valueAreaPct', 0, 100);
        numberRow('Width %', 'widthPct', 0, 100);
        const selectRow = (label: string, path: 'anchor' | 'display', options: readonly SelectOption[]): void => {
            grid.appendChild(fieldRow({
                label,
                control: buildFieldControl({
                    kind: 'select',
                    options,
                    value: s[path],
                    fill: false,
                    theme: this.theme,
                    onChange: (v) => actions.patch({ [`frtpo.${path}`]: v }),
                }).el,
            }));
        };
        selectRow('Anchor', 'anchor', FRVP_ANCHOR);
        selectRow('Display', 'display', [
            { value: 'letters', label: 'Letters' },
            { value: 'blocks', label: 'Blocks' },
        ]);

        const colorRow = (label: string, path: 'color' | 'vaColor'): void => {
            grid.appendChild(fieldRow({
                label,
                fit: true,
                control: buildFieldControl({
                    kind: 'color',
                    theme: this.theme,
                    get: () => styleOf()[path],
                    onChange: (v) => actions.patch({ [`frtpo.${path}`]: v }),
                }).el,
            }));
        };
        colorRow('TPO', 'color');
        colorRow('Value Area', 'vaColor');

        const styles = LINE_STYLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
        const levelRow = (label: string, showPath: keyof FrtpStyle, colorPath: keyof FrtpStyle, stylePath: keyof FrtpStyle): void => {
            const row = document.createElement('div');
            row.className = 'vela-field-span';
            row.style.cssText = 'display:flex;align-items:center;gap:8px;';
            const sw = buildFieldControl({
                kind: 'switch',
                checked: Boolean(s[showPath]),
                onChange: (v) => actions.patch({ [`frtpo.${showPath}`]: v }),
            });
            const lbl = document.createElement('span');
            lbl.className = 'vela-field-label';
            lbl.style.flex = '1';
            lbl.textContent = vt(label);
            let cur = (s[colorPath] as string | undefined) ?? contrastColor(this.theme.background);
            const col = buildFieldControl({
                kind: 'color',
                theme: this.theme,
                get: () => cur,
                onChange: (v) => {
                    cur = v;
                    actions.patch({ [`frtpo.${colorPath}`]: v });
                },
            });
            const style = buildFieldControl({
                kind: 'select',
                options: styles,
                value: s[stylePath] as string,
                fill: false,
                theme: this.theme,
                onChange: (v) => actions.patch({ [`frtpo.${stylePath}`]: v }),
            });
            row.append(sw.el, lbl, col.el, style.el);
            grid.appendChild(row);
        };
        levelRow('VAH', 'showVah', 'vahColor', 'vahStyle');
        levelRow('VAL', 'showVal', 'valColor', 'valStyle');
        levelRow('POC', 'showPoc', 'pocColor', 'pocStyle');
    }

    /** TradingView's Fib style settings (2026-10-17): extend, background, trend line, what each level shows and where. */
    private buildFibStyle(grid: HTMLElement, fib: FibLevels, actions: SettingsActions): void {
        const toggle = (label: string, key: string, on: boolean): void => {
            grid.appendChild(fieldRow({ label, bool: true, toggle: { checked: on, onChange: (v) => actions.patch({ [key]: v }) } }));
        };
        const select = (label: string, key: string, value: string, options: SelectOption[]): void => {
            const sel = buildFieldControl({ kind: 'select', options, value, fill: false, theme: this.theme, onChange: (v) => actions.patch({ [key]: v }) });
            grid.appendChild(fieldRow({ label, control: [sel.el] }));
        };
        grid.appendChild(fieldSection('Style', { variant: 'inputs', first: true }));
        toggle('Trend line', 'trendline', fib.trendline);
        toggle('Extend lines left', 'extendLeft', fib.extendLeft);
        toggle('Extend lines right', 'extendRight', fib.extendRight);
        toggle('Background', 'background', fib.background);
        const op = buildFieldControl({
            kind: 'number',
            value: Math.round(fib.fillOpacity * 100),
            min: 0,
            max: 100,
            step: 1,
            fill: false,
            commit: 'blur',
            onChange: (n) => actions.patch({ fillOpacity: Math.min(100, Math.max(0, n)) / 100 }),
        });
        grid.appendChild(fieldRow({ label: 'Background opacity %', control: [op.el] }));
        grid.appendChild(fieldSection('Labels', { variant: 'inputs' }));
        toggle('Levels', 'showLevels', fib.showLevels);
        toggle('Levels as percent', 'levelsAsPercent', fib.levelsAsPercent);
        toggle('Prices', 'showPrices', fib.showPrices);
        select('Labels horizontal', 'labelH', fib.labelH, [
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
        ]);
        select('Labels vertical', 'labelV', fib.labelV, [
            { value: 'top', label: 'Top' },
            { value: 'middle', label: 'Middle' },
            { value: 'bottom', label: 'Bottom' },
        ]);
        grid.appendChild(fieldSection('Levels', { variant: 'inputs' }));
    }

    /** TradingView's Gann settings: fills (fan wedges, square arc rings, box rows / columns) and which labels show. */
    private buildGannStyle(grid: HTMLElement, g: GannFan | GannSquare | GannBox, actions: SettingsActions): void {
        const toggle = (label: string, key: string, on: boolean): void => {
            grid.appendChild(fieldRow({ label, bool: true, toggle: { checked: on, onChange: (v) => actions.patch({ [key]: v }) } }));
        };
        grid.appendChild(fieldSection('Style', { variant: 'inputs', first: true }));
        if (g instanceof GannBox) {
            toggle('Price background', 'fillPrice', g.fillPrice);
            toggle('Time background', 'fillTime', g.fillTime);
        } else toggle(g instanceof GannSquare ? 'Arcs background' : 'Background', 'background', g.background);
        const op = buildFieldControl({
            kind: 'number',
            value: Math.round(g.fillOpacity * 100),
            min: 0,
            max: 100,
            step: 1,
            fill: false,
            commit: 'blur',
            onChange: (n) => actions.patch({ fillOpacity: Math.min(100, Math.max(0, n)) / 100 }),
        });
        grid.appendChild(fieldRow({ label: 'Background opacity %', control: [op.el] }));
        grid.appendChild(fieldSection('Labels', { variant: 'inputs' }));
        if (g instanceof GannBox) {
            toggle('Left labels', 'labelsLeft', g.labelsLeft);
            toggle('Right labels', 'labelsRight', g.labelsRight);
            toggle('Top labels', 'labelsTop', g.labelsTop);
            toggle('Bottom labels', 'labelsBottom', g.labelsBottom);
        } else toggle('Labels', 'showLabels', g.showLabels);
        grid.appendChild(fieldSection('Levels', { variant: 'inputs' }));
    }

    /** TradingView's rectangle Style tab: Extend, Border (its line button), Middle line (a switch and its own line
     *  button) and Background (a switch and its color). */
    private buildRectangleStyle(grid: HTMLElement, bx: Box, actions: SettingsActions): void {
        const extend = fieldRow({ label: 'Extend', control: [this.extendDropdown(bx, actions, { left: 'Extend left', right: 'Extend right' })], fit: true });
        const border = fieldRow({ label: 'Border', control: [this.lineButton(bx, actions, true, true)], fit: true });
        border.dataset.role = 'border';
        const mid = this.pathLineButton(
            { color: bx.middleColor || bx.style.lineColor || DEFAULT_DRAWING_COLOR, width: bx.middleWidth ?? 1, style: bx.middleStyle ?? 'dashed' },
            { color: 'middleColor', width: 'middleWidth', style: 'middleStyle' },
            actions,
        );
        const middle = fieldRow({ label: 'Middle line', toggle: { id: uid(), checked: !!bx.middleLine, onChange: (v) => actions.patch({ middleLine: v }) }, control: [mid], fit: true });
        middle.dataset.role = 'middle-line';
        const fill = this.colorControl(bx, 'style.fillColor', actions, bx.style.fillColor ?? DEFAULT_DRAWING_COLOR);
        const back = fieldRow({ label: 'Background', toggle: { id: uid(), checked: bx.fillBackground === true, onChange: (v) => actions.patch({ fillBackground: v }) }, control: [fill], fit: true });
        back.dataset.role = 'background';
        grid.append(extend, border, middle, back);
    }

    /** TradingView's pitchfork Style tab: Extend lines, the median's line button, the nine level rows (a switch, the
     *  level's value, its line button), Use one color, Background (a switch and its opacity) and the Style dropdown. */
    private buildPitchforkStyle(grid: HTMLElement, pf: PitchforkBase, actions: SettingsActions): void {
        const extend = fieldRow({ label: 'Extend lines', bool: true, toggle: { id: uid(), checked: pf.extendLines, onChange: (v) => actions.patch({ extendLines: v }) } });
        extend.dataset.role = 'extend-lines';
        grid.appendChild(extend);
        const median = this.pathLineButton(
            { color: pf.medianColor || pf.style.lineColor || DEFAULT_DRAWING_COLOR, width: pf.medianWidth ?? pf.style.lineWidth ?? 1, style: pf.medianStyle ?? pf.style.lineStyle ?? 'solid' },
            { color: 'medianColor', width: 'medianWidth', style: 'medianStyle' },
            actions,
        );
        median.dataset.role = 'median-line';
        grid.appendChild(fieldRow({ label: 'Median', control: [median], fit: true }));
        const levelColors: Array<(c: string) => void> = [];
        pf.levels.forEach((lv, i) => {
            const coeff = buildFieldControl({
                kind: 'number',
                value: lv.ratio,
                step: 0.1,
                fill: false,
                commit: 'blur',
                onChange: (v) => { if (Number.isFinite(v)) actions.patch({ [`levels.${i}.ratio`]: v }); },
            });
            coeff.el.style.width = '96px';
            coeff.el.style.flex = 'none';
            coeff.el.dataset.role = `level-${i}-coeff`;
            const line = this.pathLineButton(
                { color: lv.color, width: lv.lineWidth ?? pf.style.lineWidth ?? 1, style: lv.lineStyle ?? pf.style.lineStyle ?? 'solid' },
                { color: `levels.${i}.color`, width: `levels.${i}.lineWidth`, style: `levels.${i}.lineStyle` },
                actions,
                (set) => levelColors.push(set),
            );
            line.dataset.role = `level-${i}-line`;
            const row = fieldRow({ label: '', toggle: { id: uid(), checked: lv.enabled, onChange: (v) => actions.patch({ [`levels.${i}.enabled`]: v }) }, control: [coeff.el, line], fit: true });
            row.dataset.role = `level-${i}`;
            grid.appendChild(row);
        });
        // Use one color: one pick recolors every level (the swatches above follow). Like TradingView's, its swatch is
        // split in two while the levels differ.
        const colors = pf.levels.map((l) => l.color);
        const oneColor: ColorField = new ColorField({
            theme: this.theme,
            getVal: () => colors[0] ?? DEFAULT_DRAWING_COLOR,
            onVal: (v) => {
                colors.fill(v);
                actions.patch(Object.fromEntries(pf.levels.map((_, i) => [`levels.${i}.color`, v])));
                for (const set of levelColors) set(v);
                paintOne();
            },
            popover: { align: 'start' },
        });
        const paintOne = (): void => {
            oneColor.paint();
            const sw = oneColor.el.querySelector<HTMLElement>('.vela-color-field-swatch');
            if (sw && new Set(colors.map((c) => c.toLowerCase())).size > 1) sw.style.background = `linear-gradient(135deg, ${BULLISH} 50%, ${BEARISH} 50%)`;
        };
        paintOne();
        oneColor.el.dataset.role = 'one-color';
        grid.appendChild(fieldRow({ label: 'Use one color', control: [oneColor.el], fit: true }));
        const bg = fieldRow({
            label: 'Background',
            toggle: { id: uid(), checked: pf.background, onChange: (v) => actions.patch({ background: v }) },
            control: [opacitySlider(Math.round(pf.fillOpacity * 100), (n) => actions.patch({ fillOpacity: n / 100 }), [...pf.levels].reverse().find((l) => l.enabled)?.color)],
            fit: true,
        });
        bg.dataset.role = 'background';
        grid.appendChild(bg);
        const style = this.selectControl('forkStyle', PITCHFORK_STYLES, pf.currentForkStyle(), actions);
        style.dataset.role = 'fork-style';
        grid.appendChild(fieldRow({ label: 'Style', control: [style], fit: true }));
    }

    private buildLevels(grid: HTMLElement, drawing: Drawing, actions: SettingsActions): void {
        const levels = drawing.editableLevels();
        if (!levels) return;
        const isMach = drawing instanceof MachFigure;
        if (isMach) {
            const mach = drawing as MachFigure;
            grid.appendChild(fieldRow({
                label: 'Show ratio labels',
                bool: true,
                toggle: {
                    checked: mach.showRatios !== false,
                    onChange: (v) => actions.patch({ showRatios: v }),
                },
            }));
        }
        if (drawing instanceof FibLevels) this.buildFibStyle(grid, drawing, actions);
        if (drawing instanceof GannFan || drawing instanceof GannSquare || drawing instanceof GannBox) this.buildGannStyle(grid, drawing, actions);
        if (drawing instanceof FibRetracement) {
            const fib = drawing;
            grid.appendChild(fieldRow({
                label: 'Reverse',
                bool: true,
                toggle: {
                    checked: fib.reverse,
                    onChange: (v) => actions.patch({ reverse: v }),
                },
            }));
        }
        levels.forEach((lv, i) => {
            const row = document.createElement('div');
            row.className = 'vela-field-span';
            row.style.cssText = 'display:flex;align-items:center;gap:8px;';
            const sw = buildFieldControl({
                kind: 'switch',
                checked: lv.enabled,
                onChange: (v) => actions.patch({ [`levels.${i}.enabled`]: v }),
            });
            let curC = lv.color;
            const col = buildFieldControl({
                kind: 'color',
                theme: this.theme,
                get: () => curC,
                onChange: (v) => {
                    curC = v;
                    actions.patch({ [`levels.${i}.color`]: v });
                },
            });
            let curRatio = lv.ratio;
            const ratio = buildFieldControl({
                kind: 'number',
                value: curRatio,
                min: isMach ? 0 : -100,
                step: 0.01,
                fill: isMach,
                compact: !isMach,
                commit: 'blur',
                onChange: (n) => {
                    // Fib levels may be 0 or negative (TradingView's -0.618, -1); a Mach ratio must be positive.
                    if (!Number.isFinite(n) || (isMach && n <= 0)) {
                        ratio.setValue?.(curRatio);
                        return;
                    }
                    curRatio = n;
                    actions.patch({ [`levels.${i}.ratio`]: n });
                },
            });
            ratio.el.dataset.role = 'level-ratio';
            if (isMach) ratio.el.style.flex = '1';
            row.append(sw.el, col.el, ratio.el);
            if (!isMach) {
                const label = buildFieldControl({
                    kind: 'text',
                    value: lv.label ?? '',
                    fill: true,
                    placeholder: 'label…',
                    onChange: (v) => actions.patch({ [`levels.${i}.label`]: v }),
                });
                label.el.style.flex = '1';
                label.el.style.minWidth = '60px';
                row.appendChild(label.el);
            }
            grid.appendChild(row);
        });
    }
}

interface TemplateLook {
    style: SerializedDrawing['style'];
    text?: SerializedDrawing['text'];
    props?: Record<string, unknown>;
}
const TEMPLATE_KEY = 'vela.drawingTemplates.v1';
function readTemplates(): Record<string, Record<string, TemplateLook>> {
    try {
        const raw = JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? '{}') as unknown;
        return raw && typeof raw === 'object' ? (raw as Record<string, Record<string, TemplateLook>>) : {};
    } catch {
        return {};
    }
}
function writeTemplates(all: Record<string, Record<string, TemplateLook>>): void {
    try {
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(all));
    } catch {
        /* storage blocked (private mode) — templates simply don't persist */
    }
}
/** Just the look fields of a serialized drawing (never anchors/ids). */
function pick(d: SerializedDrawing): Pick<SerializedDrawing, 'style' | 'text' | 'props'> {
    return { style: d.style, text: d.text, props: d.props };
}

/** A position tool's line switch (its dashed trade line): a Style-tab setting, not an Inputs one. */
function positionLineSwitch(drawing: Drawing, f: SettingsField): boolean {
    return drawing instanceof PositionTool && f.kind === 'boolean' && f.group === 'line';
}

/** The look settings of a drawing's schema (everything but its text, which has its own tab). */
function styleFields(drawing: Drawing): SettingsField[] {
    // Sizing / profile tools edit their numbers on the Inputs tab: their Style tab only takes colors and line styles.
    const custom = drawing instanceof PositionTool || drawing instanceof FixedRangeVolumeProfile || drawing instanceof FixedRangeTpoProfile;
    return drawing.schema().fields.filter(
        (f) =>
            !f.path.startsWith('text.') &&
            f.path !== 'textVertical' &&
            !SKIP_PATHS.has(f.path) &&
            !(f.kind === 'select' && !f.options?.length) &&
            !(custom && (f.group === 'behavior' || (f.kind !== 'color' && f.kind !== 'lineStyle' && !positionLineSwitch(drawing, f)))),
    );
}

function getByPath(obj: unknown, path: string): unknown {
    let cur: unknown = obj;
    for (const k of path.split('.')) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = (cur as Record<string, unknown>)[k];
    }
    return cur;
}

function priceStep(p: number): number {
    const a = Math.abs(p);
    return a >= 1000 ? 0.1 : a >= 1 ? 0.01 : 0.0001;
}

/** A price at the precision its size needs (2 decimals from 1, 6 below): a dragged anchor carries float noise. */
function roundPrice(p: number): number {
    const k = Math.abs(p) >= 1 ? 100 : 1e6;
    return Math.round(p * k) / k;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/** `YYYY-MM-DD HH:MM` in the viewer's local time. */
export function formatLocal(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parses `YYYY-MM-DD HH:MM[:SS]` (or `YYYY-MM-DD`) as local time; null when it is not a valid date. */
export function parseLocal(s: string): number | null {
    const m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*$/.exec(s);
    if (!m) return null;
    const [y, mo, d, h, mi, se] = [m[1], m[2], m[3], m[4] ?? '0', m[5] ?? '0', m[6] ?? '0'].map(Number) as number[];
    if (mo! < 1 || mo! > 12 || d! < 1 || d! > 31 || h! > 23 || mi! > 59 || se! > 59) return null;
    const ms = new Date(y!, mo! - 1, d!, h!, mi!, se!).getTime();
    return Number.isFinite(ms) ? ms : null;
}

function btn(label: string, primary: boolean, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = vt(label);
    b.className = primary ? 'vela-dialog-btn vela-dialog-btn-primary' : 'vela-dialog-btn';
    b.addEventListener('click', onClick);
    return b;
}

let uidN = 0;
/** A fresh element id (ties a checkbox row's label to its box). */
function uid(): string {
    uidN += 1;
    return `vela-dlg-f${uidN}`;
}

const END_BTN_CSS =
    'width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid var(--vela-border-strong);border-radius:6px;background:transparent;color:inherit;cursor:pointer;flex:none;';
const LIST_ITEM_CSS =
    'display:flex;align-items:center;gap:6px;width:100%;padding:7px 10px;border:none;border-radius:4px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;';

/** A line end as TradingView draws it in its menu: a short line with a ring (plain end) or an arrow at that end. */
function endIcon(side: 'left' | 'right', arrow: boolean): string {
    const flip = side === 'left' ? '' : ' transform="translate(22 0) scale(-1 1)"';
    const end = arrow ? '<path d="M8 7 4 11l4 4" fill="none"/>' : '<circle cx="5.5" cy="11" r="2" fill="none"/>';
    return `<svg width="22" height="22" viewBox="0 0 22 22" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><g${flip}><path d="${arrow ? 'M4 11h15' : 'M7.5 11H19'}"/>${end}</g></svg>`;
}

/** A select-looking button whose list the caller opens (the Extend and Stats dropdowns hold checkboxes). */
function dropdownTrigger(label: string): { el: HTMLElement; button: HTMLButtonElement; setLabel: (s: string) => void } {
    const wrap = document.createElement('div');
    wrap.className = 'vela-select';
    wrap.dataset.size = 'md';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vela-select-trigger';
    const l = document.createElement('span');
    l.className = 'vela-select-label';
    l.textContent = vt(label);
    const chev = document.createElement('span');
    chev.className = 'vela-select-chevron';
    chev.appendChild(iconEl('chevron-down'));
    b.append(l, chev);
    b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.focus({ preventScroll: true });
    });
    wrap.appendChild(b);
    wrap.style.minWidth = '190px';
    return { el: wrap, button: b, setLabel: (t) => { l.textContent = vt(t); } };
}

function caption(text: string): HTMLElement {
    const c = document.createElement('div');
    c.textContent = vt(text);
    c.style.cssText = 'font-size:12px;color:var(--vela-fg-muted);margin-top:2px;';
    return c;
}

/** TradingView's segmented picker in the line popover: equal cells, each a sample of the line; the current one lit. */
function segmented(cells: Array<{ value: string; sample: { width: number; style: string } }>, value: string, onPick: (v: string) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;border:1px solid var(--vela-border-strong);border-radius:6px;overflow:hidden;';
    const els: HTMLButtonElement[] = [];
    const paint = (v: string): void => {
        els.forEach((el, i) => {
            const on = cells[i]!.value === v;
            el.style.background = on ? 'var(--vela-fg-bright)' : 'transparent';
            el.style.color = on ? 'var(--vela-surface-overlay, #000)' : 'var(--vela-fg)';
            el.setAttribute('aria-pressed', String(on));
        });
    };
    cells.forEach((c, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.value = c.value;
        b.style.cssText = `flex:1 1 0;height:30px;display:flex;align-items:center;justify-content:center;border:none;${i ? 'border-left:1px solid var(--vela-border-strong);' : ''}cursor:pointer;padding:0;`;
        const line = document.createElement('span');
        line.style.cssText = `display:block;width:26px;height:0;border-top:${c.sample.width}px ${c.sample.style} currentColor;`;
        b.appendChild(line);
        b.addEventListener('click', (e) => {
            e.stopPropagation();
            paint(c.value);
            onPick(c.value);
        });
        els.push(b);
        row.appendChild(b);
    });
    paint(value);
    return row;
}

/** TradingView's B / I buttons on the Text tab: a square that is lit while on. */
function styleToggle(glyph: string, title: string, glyphCss: string, on: boolean, onChange: (v: boolean) => void): HTMLElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = vt(title);
    b.textContent = glyph;
    b.dataset.role = `text-${title.toLowerCase()}`;
    let cur = on;
    const paint = (): void => {
        b.style.background = cur ? 'var(--vela-fg-muted)' : 'transparent';
        b.setAttribute('aria-pressed', String(cur));
    };
    b.style.cssText = `width:32px;height:32px;border:1px solid var(--vela-border-strong);border-radius:6px;color:inherit;font-size:15px;cursor:pointer;padding:0;flex:none;${glyphCss}`;
    paint();
    b.addEventListener('click', () => {
        cur = !cur;
        paint();
        onChange(cur);
    });
    return b;
}

/** TradingView's two-knob range slider (Visibility rows): `from` and `to` over `min..max`. */
function rangeSlider(min: number, max: number, get: () => { from: number; to: number }, onChange: (from: number, to: number) => void): HTMLElement {
    ensureRangeStyles();
    const wrap = document.createElement('div');
    wrap.className = 'vela-range2';
    const fill = document.createElement('div');
    fill.className = 'vela-range2-fill';
    const mk = (): HTMLInputElement => {
        const i = document.createElement('input');
        i.type = 'range';
        i.min = String(min);
        i.max = String(max);
        i.step = '1';
        return i;
    };
    const a = mk();
    const b = mk();
    const paint = (): void => {
        const r = get();
        a.value = String(r.from);
        b.value = String(r.to);
        const span = Math.max(1, max - min);
        fill.style.left = `${((r.from - min) / span) * 100}%`;
        fill.style.right = `${100 - ((r.to - min) / span) * 100}%`;
    };
    a.addEventListener('input', () => {
        const to = Number(b.value);
        const from = Math.min(Number(a.value), to);
        onChange(from, to);
        paint();
    });
    b.addEventListener('input', () => {
        const from = Number(a.value);
        const to = Math.max(Number(b.value), from);
        onChange(from, to);
        paint();
    });
    wrap.addEventListener('vela-sync', paint);
    wrap.append(fill, a, b);
    paint();
    return wrap;
}

/** A one-thumb 0-100 slider (TradingView's background opacity), in the range slider's look. */
function opacitySlider(value: number, onChange: (n: number) => void, color?: string): HTMLElement {
    ensureRangeStyles();
    const wrap = document.createElement('div');
    wrap.className = 'vela-range2';
    // TradingView's track fades from clear to the fill's color.
    // Only a plain color reaches the gradient: a saved level color comes from the layout file (no url() / extra layers).
    if (color && /^[#a-z0-9(),.%\s]+$/i.test(color) && !/url\(/i.test(color) && (typeof CSS === 'undefined' || !CSS.supports || CSS.supports('color', color))) {
        wrap.classList.add('vela-range-fade');
        wrap.style.setProperty('--vela-range-track', `linear-gradient(to right, transparent, ${color})`);
    }
    const fill = document.createElement('div');
    fill.className = 'vela-range2-fill';
    const i = document.createElement('input');
    i.type = 'range';
    i.min = '0';
    i.max = '100';
    i.step = '1';
    i.value = String(value);
    i.setAttribute('aria-label', vt('Opacity'));
    const paint = (): void => {
        fill.style.left = '0';
        fill.style.right = `${100 - Number(i.value)}%`;
    };
    i.addEventListener('input', () => {
        onChange(Number(i.value));
        paint();
    });
    wrap.append(fill, i);
    paint();
    return wrap;
}

let rangeStyled = false;
function ensureRangeStyles(): void {
    if (rangeStyled || typeof document === 'undefined') return;
    rangeStyled = true;
    const st = document.createElement('style');
    st.textContent = `
.vela-range2{position:relative;width:96px;height:20px;flex:none;}
.vela-range2::before{content:'';position:absolute;left:6px;right:6px;top:9px;height:2px;border-radius:1px;background:var(--vela-border-strong);}
.vela-range2.vela-range-fade::before{top:7px;height:6px;border-radius:3px;background:var(--vela-range-track);}
.vela-range2.vela-range-fade .vela-range2-fill{display:none;}
.vela-range2-fill{position:absolute;top:9px;height:2px;background:var(--vela-fg);margin:0 6px;}
.vela-range2 input{position:absolute;left:0;top:0;width:100%;height:20px;margin:0;background:none;pointer-events:none;-webkit-appearance:none;appearance:none;}
.vela-range2 input::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:var(--vela-surface-overlay,#000);border:2px solid var(--vela-fg);cursor:pointer;}
.vela-range2 input::-moz-range-thumb{pointer-events:auto;width:10px;height:10px;border-radius:50%;background:var(--vela-surface-overlay,#000);border:2px solid var(--vela-fg);cursor:pointer;}
.vela-range2 input::-webkit-slider-runnable-track{background:none;}
.vela-range2 input::-moz-range-track{background:none;}`;
    document.head.appendChild(st);
}
