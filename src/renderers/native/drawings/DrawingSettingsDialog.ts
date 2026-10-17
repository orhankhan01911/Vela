import type { VelaTheme } from '../../../core/options';
import type { Drawing, FrtpStyle, FrvpStyle, PositionLevelMode, SerializedDrawing } from '../../../core/drawings';
import {
    DIRECTION_OPTIONS,
    FibLevels,
    FibRetracement,
    FixedRangeVolumeProfile,
    FixedRangeTpoProfile,
    LINE_STYLE_OPTIONS,
    MachFigure,
    PositionTool,
    clonePlain,
    createDrawing,
} from '../../../core/drawings';
import { Menu } from '../../../ui/components/menu';
import { contrastColor } from '../../shared/drawing-geometry';
import { applyChromeTokens } from '../../shared/theme-tokens';
import { Dialog } from '../../../ui/components/dialog';
import { closeOpenPopovers, eventDismissedPopover, isPopoverOpen } from '../../../ui/components/popover';
import { fieldGrid, fieldRow, fieldSection, buildFieldControl } from '../../../ui/components/field';
import type { SelectOption } from '../../../ui/components/select';
import type { SettingsActions } from './DrawingSettingsPopup';

export type DrawingDialogKind = 'position' | 'frvp' | 'frtpo' | 'levels';

const LEVEL_UNITS: readonly SelectOption[] = [
    { value: 'price', label: 'Price' },
    { value: 'points', label: 'Points' },
];
const FRVP_ANCHOR: readonly SelectOption[] = [
    { value: 'right', label: 'Right' },
    { value: 'left', label: 'Left' },
];

const TITLES: Record<DrawingDialogKind, string> = {
    position: 'Position size',
    frvp: 'Volume profile',
    frtpo: 'TPO profile',
    levels: 'Levels',
};

/**
 * Settings dialog opened from the drawing toolbar's gear. Same shell and field
 * language as the indicator inputs dialog: live edits, Cancel restores the
 * open-time snapshot, Ok keeps them.
 */
export class DrawingSettingsDialog {
    private ui: Dialog | null = null;
    private templateMenu: Menu | null = null;
    private theme: VelaTheme;

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

    open(drawing: Drawing, actions: SettingsActions, kind: DrawingDialogKind, keepSnapshot?: SerializedDrawing): void {
        this.close();
        // `drawing` is the instance the toolbar opened on; every edit since has replaced it.
        const live = actions.resolve() ?? drawing;
        // Cancel restores the state from BEFORE the dialog first opened — a template apply /
        // reset re-opens the dialog (to repaint its fields) but must keep that original.
        const snapshot = keepSnapshot ?? clonePlain(live.serialize());
        const grid = fieldGrid({ variant: 'inputs' });
        grid.style.padding = '16px 20px';
        grid.style.overflowY = 'auto';
        grid.style.overflowX = 'hidden';
        grid.style.flex = '1 1 auto';
        if (kind === 'position' && live instanceof PositionTool) this.buildPosition(grid, live, actions);
        else if (kind === 'frvp' && live instanceof FixedRangeVolumeProfile) this.buildFrvp(grid, live, actions);
        else if (kind === 'frtpo' && live instanceof FixedRangeTpoProfile) this.buildFrtpo(grid, live, actions);
        else if (kind === 'levels') this.buildLevels(grid, live, actions);
        else return;

        let ui: Dialog;
        ui = new Dialog({
            host: this.host,
            title: TITLES[kind],
            // Non-modal: live-edit dialog — a modal machine locks pointer events on the
            // whole body, killing the chart and the body-portaled popovers.
            modal: false,
            contained: true,
            align: 'center',
            draggable: true,
            flush: true,
            className: 'vela-dialog--form',
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
        ui.body.appendChild(grid);
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
        });
        this.ui = ui;
        ui.show();
    }

    /** Bottom-left "Template ▾": save the current look under a name, re-apply a saved one,
     *  or reset to the tool's factory defaults. Templates are per drawing type, kept in
     *  localStorage, and carry style/text/props only — never anchors, so applying one
     *  restyles a drawing without moving it. */
    private buildTemplateButton(drawing: Drawing, actions: SettingsActions, kind: DrawingDialogKind, snapshot: SerializedDrawing): HTMLElement {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'margin-right:auto;display:flex;align-items:center;gap:8px;min-width:0;';
        const trigger = btn('Template \u25BE', false, () => {});
        trigger.setAttribute('aria-label', 'Drawing template');
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
            input.placeholder = 'Template name';
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
            lbl.textContent = label;
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
            lbl.textContent = label;
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

function btn(label: string, primary: boolean, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = primary ? 'vela-dialog-btn vela-dialog-btn-primary' : 'vela-dialog-btn';
    b.addEventListener('click', onClick);
    return b;
}
