// Color-picker VIEW — swatch grid + recents + opacity slider, a custom-colour panel, plus the field trigger.
import type { VelaTheme } from '../../../core/options';
import { ACCENT, BEARISH, BULLISH, NEUTRAL, WARNING } from '../../../core/palette';
import { injectStyles } from '../../styles';
import { Popover, closeOpenPopovers, openPopoverTrigger, type PopoverBoundary, type PopoverOptions } from '../popover';
import {
    buildPalette,
    combineColor,
    hexHsv,
    hsvHex,
    parseHexInput,
    splitColor,
    transparencyChecker,
    type ColorFieldShape,
} from './controller';
import { COLOR_CSS, COLOR_STYLE_ID } from './styles';
import { vt } from '../../../i18n';

const PALETTE = buildPalette();
const CHECKER = transparencyChecker(10);
const FIELD_CHECKER = transparencyChecker(8);

/** Session-shared recently-picked colors (most-recent first). */
const recents: string[] = [ACCENT, BULLISH, BEARISH, WARNING, NEUTRAL];

function addRecent(hex6: string): void {
    const i = recents.findIndex((c) => c.toLowerCase() === hex6.toLowerCase());
    if (i >= 0) recents.splice(i, 1);
    recents.unshift(hex6);
    if (recents.length > 10) recents.length = 10;
}

/**
 * When the opacity slider hands its value to `onChange` during a drag: `'live'` on every
 * pointer move (the consumer repaints cheaply, so the chart previews the drag), `'release'`
 * once on pointerup/pointercancel (the consumer recomputes — a script re-runs over its whole
 * history, so a per-move commit would queue seconds of work behind the pointer). The knob,
 * gradient and percentage follow the pointer either way; swatch picks always emit at once.
 */
export type ColorCommit = 'live' | 'release';

export interface ColorPickerOptions {
    commit?: ColorCommit;
}

/**
 * A self-contained color picker: a swatch grid (grays + hue × shade), a
 * recents row with a custom "+" picker, and an opacity slider over a transparency checker.
 * Emits `#RRGGBB` / `#RRGGBBAA` through `onChange`.
 */
export function buildColorPicker(color: string, theme: VelaTheme, onChange: (v: string) => void, options: ColorPickerOptions = {}): HTMLElement {
    const commit: ColorCommit = options.commit ?? 'live';
    const parsed = splitColor(color);
    let curHex = parsed.hex6;
    let curAlpha = parsed.alpha;

    const root = document.createElement('div');
    root.style.cssText = 'display:flex;flex-direction:column;gap:9px;width:236px;';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(10,1fr);gap:4px;';
    const swatches: HTMLButtonElement[] = [];
    for (const row of PALETTE) {
        for (const c of row) {
            const sw = document.createElement('button');
            sw.type = 'button';
            sw.dataset.c = c;
            sw.style.cssText = `width:100%;aspect-ratio:1;border-radius:4px;border:none;cursor:pointer;background:${c};padding:0;`;
            sw.addEventListener('click', (e) => {
                e.stopPropagation();
                pickHex(c);
            });
            grid.appendChild(sw);
            swatches.push(sw);
        }
    }
    const paintSelection = (): void => {
        for (const sw of swatches) {
            const on = (sw.dataset.c ?? '').toLowerCase() === curHex.toLowerCase();
            sw.style.outline = on ? `2px solid ${theme.textColor}` : 'none';
            sw.style.outlineOffset = '2px';
            sw.style.zIndex = on ? '1' : '';
            sw.style.position = on ? 'relative' : '';
        }
    };

    const recentRow = document.createElement('div');
    recentRow.style.cssText = 'display:flex;align-items:center;gap:5px;flex-wrap:wrap;border-top:1px solid var(--vela-border);padding-top:9px;';
    const recentSwatches = document.createElement('div');
    recentSwatches.style.cssText = 'display:contents;';
    // "+" opens TradingView's custom-colour panel (a hex field, a saturation square and a hue bar), not the browser's
    // own chooser, which opens on RGB numbers.
    const add = document.createElement('button');
    add.type = 'button';
    add.title = vt('Custom color');
    add.setAttribute('aria-label', vt('Custom color'));
    add.dataset.testid = 'color-custom';
    add.style.cssText = `width:17px;height:17px;border-radius:var(--vela-radius-sm);border:1px dashed var(--vela-border-strong);cursor:pointer;display:flex;align-items:center;justify-content:center;color:${theme.textColor};font:14px ${theme.fontFamily};background:transparent;padding:0;`;
    add.textContent = '+';
    recentRow.append(recentSwatches, add);
    const renderRecents = (): void => {
        recentSwatches.replaceChildren();
        for (const c of recents) {
            const sw = document.createElement('button');
            sw.type = 'button';
            sw.style.cssText = `width:17px;height:17px;border-radius:var(--vela-radius-sm);border:1px solid var(--vela-border);cursor:pointer;background:${c};padding:0;`;
            sw.addEventListener('click', (e) => {
                e.stopPropagation();
                pickHex(c);
            });
            recentSwatches.appendChild(sw);
        }
    };

    const opLabel = document.createElement('div');
    opLabel.textContent = vt('Opacity');
    opLabel.style.cssText = `font:11px ${theme.fontFamily};color:var(--vela-fg-muted);`;
    const opRow = document.createElement('div');
    opRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
    const track = document.createElement('div');
    track.style.cssText = 'flex:1;position:relative;height:13px;border-radius:7px;cursor:pointer;';
    const knob = document.createElement('div');
    knob.style.cssText = 'position:absolute;top:50%;width:15px;height:15px;border-radius:50%;background:var(--vela-selected-bg);box-shadow:0 1px 3px rgba(0,0,0,0.55);transform:translate(-50%,-50%);pointer-events:none;';
    track.appendChild(knob);
    const pctBox = document.createElement('input');
    pctBox.type = 'text';
    pctBox.inputMode = 'numeric';
    pctBox.title = vt('Opacity (%)');
    pctBox.style.cssText = `width:46px;box-sizing:border-box;text-align:center;font:var(--vela-font-size-md) ${theme.fontFamily};color:var(--vela-fg);background:transparent;border:1px solid var(--vela-border);border-radius:5px;padding:3px 4px;outline:none;`;
    pctBox.addEventListener('focus', () => {
        pctBox.style.borderColor = 'var(--vela-border-strong)';
        pctBox.select();
    });
    opRow.append(track, pctBox);
    const paintOpacity = (): void => {
        track.style.background = `linear-gradient(to right, ${curHex}00, ${curHex}ff), ${CHECKER}`;
        knob.style.left = `${curAlpha * 100}%`;
        pctBox.value = `${Math.round(curAlpha * 100)}%`;
    };
    // A typed value is one discrete edit, so it commits once under either `commit` policy.
    // Unparseable input snaps back to the current opacity.
    const commitTyped = (): void => {
        pctBox.style.borderColor = 'var(--vela-border)';
        const n = parseFloat(pctBox.value.replace('%', ''));
        if (Number.isFinite(n)) {
            const next = Math.max(0, Math.min(100, n)) / 100;
            if (Math.round(next * 100) !== Math.round(curAlpha * 100)) {
                curAlpha = next;
                paintOpacity();
                emit();
                return;
            }
        }
        paintOpacity();
    };
    pctBox.addEventListener('change', commitTyped);
    pctBox.addEventListener('blur', () => {
        // `change` does not fire when the text is unchanged; still restore the "%" readout.
        pctBox.style.borderColor = 'var(--vela-border)';
        paintOpacity();
    });
    pctBox.addEventListener('keydown', (e) => {
        // Typing must not reach chart/dialog shortcuts; Escape stays with the popover.
        if (e.key === 'Escape') return;
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            commitTyped();
            pctBox.blur();
        }
    });
    // The drag always previews (knob, readout, gradient); whether each move also COMMITS is
    // the `commit` option — see {@link ColorCommit}.
    let dragging = false;
    const onDrag = (clientX: number): void => {
        const r = track.getBoundingClientRect();
        curAlpha = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        paintOpacity();
        if (commit === 'live') emit();
    };
    const endDrag = (): void => {
        if (!dragging) return;
        dragging = false;
        if (commit === 'release') emit();
    };
    track.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        dragging = true;
        track.setPointerCapture(e.pointerId);
        onDrag(e.clientX);
    });
    track.addEventListener('pointermove', (e) => {
        if (dragging) onDrag(e.clientX);
    });
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    function emit(): void {
        onChange(combineColor(curHex, curAlpha));
    }
    function previewHex(hex: string): void {
        curHex = splitColor(hex).hex6;
        paintSelection();
        paintOpacity();
        emit();
    }
    function pickHex(hex: string, custom = false): void {
        previewHex(hex);
        addRecent(curHex);
        if (custom) renderRecents();
    }

    const palette = document.createElement('div');
    palette.style.cssText = 'display:contents;';
    palette.append(grid, recentRow, opLabel, opRow);
    let custom: HTMLElement | null = null;
    const back = (): void => {
        custom?.remove();
        custom = null;
        palette.style.display = 'contents';
    };
    add.addEventListener('click', (e) => {
        e.stopPropagation();
        palette.style.display = 'none';
        custom = buildCustomPanel(curHex, theme, previewHex, (hex) => {
            pickHex(hex, true);
            back();
        });
        root.appendChild(custom);
        custom.querySelector('input')?.focus();
    });

    renderRecents();
    paintSelection();
    paintOpacity();
    root.append(palette);
    return root;
}

/**
 * TradingView's custom colour (the palette's "+"): the colour, its hex code in a field, Add; below, a saturation ×
 * brightness square and a hue bar. Dragging or typing previews the colour at once; Add keeps it (into the recents).
 */
function buildCustomPanel(start: string, theme: VelaTheme, preview: (hex: string) => void, done: (hex: string) => void): HTMLElement {
    let { h, s, v } = hexHsv(start);
    let hex = splitColor(start).hex6;
    const panel = document.createElement('div');
    panel.dataset.testid = 'color-custom-panel';
    panel.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

    const top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;gap:8px;';
    const chip = document.createElement('span');
    chip.style.cssText = 'flex:none;width:28px;height:28px;border-radius:5px;border:1px solid var(--vela-border);';
    const field = document.createElement('input');
    field.type = 'text';
    field.spellcheck = false;
    field.maxLength = 7;
    field.setAttribute('aria-label', vt('Hex color'));
    field.dataset.testid = 'color-hex';
    field.style.cssText = `flex:1;min-width:0;box-sizing:border-box;height:28px;font:var(--vela-font-size-md) ${theme.fontFamily};color:var(--vela-fg);background:transparent;border:1px solid var(--vela-border);border-radius:5px;padding:0 8px;outline:none;`;
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = vt('Add');
    ok.dataset.testid = 'color-add';
    ok.style.cssText = `flex:none;height:28px;padding:0 12px;border-radius:6px;border:none;cursor:pointer;font:600 var(--vela-font-size-md) ${theme.fontFamily};color:var(--vela-selected-fg, var(--vela-bg));background:var(--vela-selected-bg, var(--vela-fg));`;
    top.append(chip, field, ok);

    const body = document.createElement('div');
    body.style.cssText = 'display:flex;gap:10px;height:180px;';
    const square = document.createElement('div');
    square.dataset.testid = 'color-square';
    square.style.cssText = 'flex:1;position:relative;border-radius:4px;cursor:crosshair;touch-action:none;';
    const dot = document.createElement('div');
    dot.style.cssText = 'position:absolute;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;';
    square.appendChild(dot);
    const bar = document.createElement('div');
    bar.dataset.testid = 'color-hue';
    bar.style.cssText = `flex:none;width:18px;position:relative;border-radius:4px;cursor:pointer;touch-action:none;background:linear-gradient(to bottom,${[0, 60, 120, 180, 240, 300, 360].map((hue) => hsvHex(hue % 360, 1, 1)).join(',')});`;
    const tab = document.createElement('div');
    tab.style.cssText = 'position:absolute;left:-3px;right:-3px;height:6px;border-radius:2px;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.5);transform:translateY(-50%);pointer-events:none;';
    bar.appendChild(tab);
    body.append(square, bar);
    panel.append(top, body);

    const paint = (typed = false): void => {
        square.style.background = `linear-gradient(to top,#000,rgba(0,0,0,0)),linear-gradient(to right,#fff,${hsvHex(h, 1, 1)})`;
        dot.style.left = `${s * 100}%`;
        dot.style.top = `${(1 - v) * 100}%`;
        dot.style.background = hex;
        tab.style.top = `${(h / 360) * 100}%`;
        chip.style.background = hex;
        if (!typed) field.value = hex;
        field.style.borderColor = 'var(--vela-border)';
    };
    const fromHsv = (): void => {
        hex = hsvHex(h, s, v);
        paint();
        preview(hex);
    };
    const drag = (el: HTMLElement, at: (x: number, y: number) => void): void => {
        let on = false;
        const move = (e: PointerEvent): void => {
            const r = el.getBoundingClientRect();
            at(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)));
        };
        el.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            on = true;
            el.setPointerCapture(e.pointerId);
            move(e);
        });
        el.addEventListener('pointermove', (e) => on && move(e));
        el.addEventListener('pointerup', () => (on = false));
        el.addEventListener('pointercancel', () => (on = false));
    };
    drag(square, (x, y) => {
        s = x;
        v = 1 - y;
        fromHsv();
    });
    drag(bar, (_x, y) => {
        h = Math.min(359.9, y * 360);
        fromHsv();
    });
    field.addEventListener('input', () => {
        const got = parseHexInput(field.value);
        if (!got) {
            field.style.borderColor = `var(--vela-down, ${BEARISH})`;
            return;
        }
        hex = got;
        ({ h, s, v } = hexHsv(got));
        paint(true);
        preview(hex);
    });
    field.addEventListener('keydown', (e) => {
        // Typing must not reach chart/dialog shortcuts; Escape stays with the popover.
        if (e.key === 'Escape') return;
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            ok.click();
        }
    });
    ok.addEventListener('click', (e) => {
        e.stopPropagation();
        const got = parseHexInput(field.value);
        if (got) done(got);
        else field.style.borderColor = `var(--vela-down, ${BEARISH})`;
    });
    paint();
    return panel;
}

export interface ColorFieldOpts {
    shape?: ColorFieldShape;
    theme: VelaTheme;
    getVal: () => string;
    onVal: (v: string) => void;
    id?: string;
    popover?: Pick<PopoverOptions, 'host' | 'position' | 'boundary' | 'zIndex' | 'gap' | 'align'>;
    /** Opacity-drag commit policy of the popover picker (default `'live'`) — see {@link ColorCommit}. */
    commit?: ColorCommit;
    /** TradingView's line button: the trigger shows the swatch and a sample of the line (width + dash). */
    line?: () => { width: number; style: string };
    /** More controls under the picker in the same popover (the line button's Thickness and Line style). */
    extra?: () => HTMLElement | null;
}

/** Closed-state swatch shape. `circle` is the settings-dialog preview (a square chip
 *  inset from a matching field border); `square` is the compact drawing-chrome swatch. */
export function colorField(
    theme: VelaTheme,
    getVal: () => string,
    onVal: (v: string) => void,
    opts?: { shape?: ColorFieldShape; id?: string; popover?: ColorFieldOpts['popover']; commit?: ColorCommit },
): HTMLElement {
    return new ColorField({ theme, getVal, onVal, shape: opts?.shape, id: opts?.id, popover: opts?.popover, commit: opts?.commit }).el;
}

export class ColorField {
    readonly el: HTMLButtonElement;
    private readonly swatch: HTMLElement;
    private readonly getVal: () => string;
    private readonly onVal: (v: string) => void;
    private readonly theme: VelaTheme;
    private readonly popoverOpts: ColorFieldOpts['popover'];
    private readonly commit: ColorCommit | undefined;
    private readonly line: ColorFieldOpts['line'];
    private readonly extra: ColorFieldOpts['extra'];
    private sample: HTMLElement | null = null;

    constructor(opts: ColorFieldOpts) {
        injectStyles(COLOR_STYLE_ID, COLOR_CSS, document);
        this.theme = opts.theme;
        this.getVal = opts.getVal;
        this.onVal = opts.onVal;
        this.popoverOpts = opts.popover;
        this.commit = opts.commit;
        this.line = opts.line;
        this.extra = opts.extra;

        const trigger = document.createElement('button');
        trigger.type = 'button';
        if (opts.id) trigger.id = opts.id;
        trigger.className = opts.shape === 'circle' ? 'vela-color-field vela-color-field-circle' : 'vela-color-field';
        const swatch = document.createElement('span');
        swatch.className = 'vela-color-field-swatch';
        trigger.appendChild(swatch);
        if (opts.line) {
            trigger.classList.add('vela-color-field-line');
            this.sample = document.createElement('span');
            this.sample.className = 'vela-color-field-sample';
            trigger.appendChild(this.sample);
        }
        this.el = trigger;
        this.swatch = swatch;
        this.paint();
        trigger.addEventListener('vela-sync', () => this.paint());
        // Suppress the default mousedown focus: when this press outside-dismisses an open
        // popover, Chrome's focus action can scroll the dialog body under the pointer.
        trigger.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            trigger.focus({ preventScroll: true });
        });
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
    }

    /** Repaint the swatch (and the line sample): after an outside change of the color, width or style. */
    paint(): void {
        const v = this.getVal();
        // Screen readers and agent-desktop read this; a row label (aria-labelledby) wins when there is one.
        this.el.setAttribute('aria-label', `${vt('Color')} ${v}`);
        this.swatch.style.background = `linear-gradient(${v}, ${v}), ${FIELD_CHECKER}`;
        if (this.sample && this.line) {
            const { width, style } = this.line();
            this.sample.style.borderTop = `${Math.max(1, Math.min(4, width))}px ${style === 'dashed' ? 'dashed' : style === 'dotted' ? 'dotted' : 'solid'} ${v}`;
        }
    }

    private toggle(): void {
        if (openPopoverTrigger() === this.el) {
            closeOpenPopovers();
            return;
        }
        const pop = new Popover({
            trigger: this.el,
            theme: this.theme,
            align: this.popoverOpts?.align ?? 'end',
            gap: this.popoverOpts?.gap ?? 6,
            host: this.popoverOpts?.host,
            position: this.popoverOpts?.position,
            boundary: this.popoverOpts?.boundary as PopoverBoundary | undefined,
            zIndex: this.popoverOpts?.zIndex,
            className: 'vela-color-field-pop',
            content: this.content(),
        });
        pop.show();
    }

    private content(): HTMLElement {
        const picker = buildColorPicker(
            this.getVal(),
            this.theme,
            (val) => {
                this.onVal(val);
                this.paint();
            },
            { commit: this.commit },
        );
        const extra = this.extra?.();
        if (!extra) return picker;
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
        wrap.append(picker, extra);
        return wrap;
    }
}

/** Close any open color (or other kit) popover — dialog teardown. */
export function closeColorPopover(): void {
    closeOpenPopovers();
}
