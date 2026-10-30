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
    FixedRangeVolumeProfile,
    FixedRangeTpoProfile,
    INTERVAL_UNITS,
    LINE_STYLE_OPTIONS,
    DEFAULT_DRAWING_COLOR,
    TEXT_SIZE_OPTIONS,
    MachFigure,
    PositionTool,
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
import { ALONG_LINE_TEXT_TYPES, type SettingsField } from '../../../core/drawings/schema';
import { Menu } from '../../../ui/components/menu';
import { contrastColor } from '../../shared/drawing-geometry';
import { applyChromeTokens } from '../../shared/theme-tokens';
import { Dialog } from '../../../ui/components/dialog';
import { closeOpenPopovers, eventDismissedPopover, isPopoverOpen } from '../../../ui/components/popover';
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
/** Schema paths the dialog never shows: the toolbar owns them (lock) or they are per-tool icons. */
const SKIP_PATHS = new Set(['locked', 'visible', 'glyph', 'size']);
/** Drawings whose one anchor only carries a price (or only a time): the Coordinates tab shows that one value. */
const PRICE_ONLY = new Set(['hline', 'hray']);
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
        if (!(drawing instanceof PositionTool) && drawing.anchors.length > 0) tabs.push('coordinates');
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
            title: getDrawingType(live.type)?.label ?? 'Settings',
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

    /** Style tab: the tool's line/background row first (TradingView's "Line" row is color + width + style),
     *  then every other look setting from the drawing's schema, then the tool's own sections (Fib, levels). */
    private buildStyle(grid: HTMLElement, drawing: Drawing, actions: SettingsActions): void {
        const fields = styleFields(drawing);
        const has = (p: string): boolean => fields.some((f) => f.path === p);
        const done = new Set<string>();
        if (has('style.lineColor') || has('style.lineWidth') || has('style.lineStyle')) {
            const controls: HTMLElement[] = [];
            if (has('style.lineColor')) controls.push(this.colorControl(drawing, 'style.lineColor', actions, DEFAULT_DRAWING_COLOR));
            const wf = fields.find((f) => f.path === 'style.lineWidth');
            if (wf) {
                // Markers (highlighter 4-60 px) take a number; hairline tools the 1-4 px list.
                if ((wf.min ?? 1) > 1 || (wf.max ?? 4) > 10) controls.push(this.numberControl(drawing, wf, actions));
                else controls.push(this.selectControl('style.lineWidth', WIDTH_OPTIONS, String(drawing.style.lineWidth ?? 1), actions, (v) => Number(v)));
            }
            if (has('style.lineStyle')) controls.push(this.selectControl('style.lineStyle', LINE_STYLE_OPTIONS, String(drawing.style.lineStyle ?? 'solid'), actions));
            grid.appendChild(fieldRow({ label: 'Line', control: controls, fit: true }));
            done.add('style.lineColor').add('style.lineWidth').add('style.lineStyle');
        }
        if (has('style.fillColor')) {
            const fill = effectiveFillColor(drawing, this.theme) ?? drawing.style.fillColor ?? DEFAULT_DRAWING_COLOR;
            grid.appendChild(fieldRow({ label: 'Background', control: [this.colorControl(drawing, 'style.fillColor', actions, fill)], fit: true }));
            done.add('style.fillColor');
        }
        for (const f of fields) {
            if (done.has(f.path)) continue;
            const row = this.schemaRow(drawing, f, actions);
            if (row) grid.appendChild(row);
        }
        if (drawing.editableLevels()) {
            if (!(drawing instanceof MachFigure)) {
                const sizes = drawing as unknown as { numbersSize?: string; labelsSize?: string };
                grid.appendChild(fieldRow({ label: 'Numbers size', control: [this.selectControl('numbersSize', SIZE_OPTIONS, sizes.numbersSize ?? 'small', actions)], fit: true }));
                grid.appendChild(fieldRow({ label: 'Labels size', control: [this.selectControl('labelsSize', SIZE_OPTIONS, sizes.labelsSize ?? 'normal', actions)], fit: true }));
            }
            this.buildLevels(grid, drawing, actions);
        }
    }

    /** Text tab: the text itself, then its color, size, bold/italic and position. */
    private buildText(grid: HTMLElement, drawing: Drawing, actions: SettingsActions): void {
        const fields = drawing.schema().fields.filter((f) => f.path.startsWith('text.'));
        const has = (p: string): boolean => fields.some((f) => f.path === p);
        const text = drawing.text;
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
        const style: HTMLElement[] = [];
        if (has('text.color')) style.push(this.colorControl(drawing, 'text.color', actions, text?.color || this.theme.textColor));
        if (has('text.size')) style.push(this.selectControl('text.size', SIZE_OPTIONS, text?.size ?? 'normal', actions));
        // A px size instead of small/large (the position tools, like TradingView's).
        const px = drawing.schema().fields.find((f) => f.path === 'fontSize' && f.kind === 'number');
        if (px) style.push(this.numberControl(drawing, px, actions));
        if (style.length) grid.appendChild(fieldRow({ label: 'Font', control: style, fit: true }));
        if (has('text.bold')) grid.appendChild(fieldRow({ label: 'Bold', bool: true, toggle: { checked: !!text?.bold, onChange: (v) => actions.patch({ 'text.bold': v }) } }));
        if (has('text.italic')) grid.appendChild(fieldRow({ label: 'Italic', bool: true, toggle: { checked: !!text?.italic, onChange: (v) => actions.patch({ 'text.italic': v }) } }));
        // TradingView's one "Text alignment" row: vertical position, then horizontal.
        const hf = fields.find((f) => f.path === 'text.hAlign');
        const vf = fields.find((f) => f.path === 'text.vAlign');
        if (hf?.options && vf?.options) {
            const hDef = ALONG_LINE_TEXT_TYPES.has(drawing.type) ? 'center' : 'left';
            grid.appendChild(
                fieldRow({
                    label: 'Text alignment',
                    control: [this.selectControl('text.vAlign', vf.options, text?.vAlign ?? 'top', actions), this.selectControl('text.hAlign', hf.options, text?.hAlign ?? hDef, actions)],
                    fit: true,
                }),
            );
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
            const label = drawing.anchors.length === 1 ? (priceOnly ? 'Price' : timeOnly ? 'Time' : 'Point') : `#${i + 1}`;
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
                return c.el;
            };
            const dash = document.createElement('span');
            dash.textContent = '-';
            dash.style.cssText = 'opacity:0.6;padding:0 2px;';
            grid.appendChild(fieldRow({
                label: m.label,
                toggle: { checked: r.on, onChange: (v) => { r = { ...r, on: v }; write(m.unit, r); } },
                control: [num('from'), dash, num('to')],
                fit: true,
            }));
        }
    }

    /** One generic row for a schema field (color, number, select, line style, switch, text). */
    private schemaRow(drawing: Drawing, f: SettingsField, actions: SettingsActions): HTMLElement | null {
        const cur = getByPath(drawing, f.path);
        switch (f.kind) {
            case 'boolean':
                return fieldRow({ label: f.label, bool: true, toggle: { checked: !!cur, onChange: (v) => actions.patch({ [f.path]: v }) } });
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
            menu.setItems([
                { id: 'save', label: 'Save as\u2026' },
                ...saved.map((n, i) => ({ id: `apply:${n}`, label: n, separatorBefore: i === 0 })),
                ...(saved.length ? [{ id: 'del-root', label: 'Delete template', separatorBefore: true, submenu: saved.map((n) => ({ id: `del:${n}`, label: n })) }] : []),
                { id: 'reset', label: 'Reset to defaults', separatorBefore: true },
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

    /** TradingView's pitchfork settings: the median's color, the band fills and extending the lines back. */
    private buildPitchforkStyle(grid: HTMLElement, pf: PitchforkBase, actions: SettingsActions): void {
        grid.appendChild(fieldSection('Style', { variant: 'inputs', first: true }));
        let cur = pf.medianColor || pf.style.lineColor;
        const median = buildFieldControl({
            kind: 'color',
            theme: this.theme,
            get: () => cur,
            onChange: (v) => {
                cur = v;
                actions.patch({ medianColor: v });
            },
        });
        grid.appendChild(fieldRow({ label: 'Median', control: [median.el] }));
        grid.appendChild(fieldRow({ label: 'Extend lines', bool: true, toggle: { checked: pf.extendLines, onChange: (v) => actions.patch({ extendLines: v }) } }));
        grid.appendChild(fieldRow({ label: 'Background', bool: true, toggle: { checked: pf.background, onChange: (v) => actions.patch({ background: v }) } }));
        const op = buildFieldControl({
            kind: 'number',
            value: Math.round(pf.fillOpacity * 100),
            min: 0,
            max: 100,
            step: 1,
            fill: false,
            commit: 'blur',
            onChange: (n) => actions.patch({ fillOpacity: Math.min(100, Math.max(0, n)) / 100 }),
        });
        grid.appendChild(fieldRow({ label: 'Background opacity %', control: [op.el] }));
        grid.appendChild(fieldSection('Levels', { variant: 'inputs' }));
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
        if (drawing instanceof PitchforkBase) this.buildPitchforkStyle(grid, drawing, actions);
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
