// Menu VIEW — projects MenuItemDescriptor[] into a floating list driven by the Zag menu
// machine (keyboard nav, typeahead, dismiss handled by the machine). An item carrying
// `submenu` becomes a trigger row owning a nested machine + list, registered as this
// machine's child: Zag then drives hover intent, arrow-key traversal and the dismiss
// chain across levels instead of the view faking any of it.
import { runMachine, spreadProps, type HandleOf } from '../../zag';
import { injectStyles } from '../../styles';
import { floatingLayerHost } from '../../tokens';
import { iconEl } from '../../icons';
import { announceSurface } from '../../surface-events';
import { holdForExit, type SurfaceExit } from '../../surface-exit';
import { menuController, type MenuControllerOptions, type MenuItemDescriptor } from './controller';
import { MENU_CSS, MENU_STYLE_ID } from './styles';
import * as zagMenu from '@zag-js/menu';
import { vt } from '../../../i18n';
import { Drawer } from '../drawer/view';

export interface MenuOptions extends MenuControllerOptions {
    /** Element that opens the menu on click (gets the machine's trigger props). */
    trigger?: HTMLElement;
    host?: HTMLElement;
    /** Override the root list's min-width (the stylesheet default suits full-word labels;
     *  compact lists like the timeframe dropdown pass something snug). Submenus keep the
     *  default. */
    minWidth?: string;
    /** Star-toggle reports from items carrying `favorite` (the menu stays open — starring
     *  is a side action on a row, never a selection). */
    onFavorite?: (id: string, on: boolean) => void;
    /** Mark checked items with a leading ✓ instead of the selected-row background wash —
     *  the shape for pointer-anchored action menus (right-click context menus), where a
     *  washed row reads as hover state. A level holding checkable rows reserves the mark
     *  column on all its rows so labels align; an all-action level keeps its natural left
     *  edge. Submenus inherit the mode. Dropdown menus (a trigger button opening a
     *  picker) keep the default wash. */
    checkmarks?: boolean;
    /** Sit each row's icon in a squared badge (a 24px rounded tile with a faint fill and a soft
     *  border) instead of a bare glyph: its glyph brightens on a hovered row, and the tile
     *  inverts on the selected one. A
     *  level where some rows carry an icon reserves the badge column on all its rows so
     *  labels align; a level with no icon keeps its natural left edge. With `checkmarks`,
     *  the mark column leads and the badge follows. Submenus inherit the mode. */
    iconBadges?: boolean;
}

interface SurfaceOptions {
    host: HTMLElement;
    placement: MenuControllerOptions['placement'];
    onSelect: (id: string) => void;
    onOpenChange?: (open: boolean) => void;
    trigger?: HTMLElement;
    /** A submenu's branch row — announced as its opener (it takes trigger-ITEM props, not `trigger`'s). */
    opener?: HTMLElement;
    triggerId?: string;
    id?: string;
    minWidth?: string;
    onFavorite?: (id: string, on: boolean) => void;
    checkmarks?: boolean;
    iconBadges?: boolean;
}

/**
 * One menu level: a Zag machine plus the floating list it projects onto. The root menu is a
 * surface and every branch spawns another, so nesting is depth-agnostic. Private — `Menu`
 * is the public face.
 */
class Surface {
    readonly list: HTMLElement;
    readonly handle: HandleOf<typeof zagMenu.machine>;
    private readonly positioner: HTMLElement;
    private readonly ctrl: ReturnType<typeof menuController>;
    private readonly mid: string;
    private readonly doc: Document;
    private readonly host: HTMLElement;
    private readonly onSelect: (id: string) => void;
    private readonly onFavorite?: (id: string, on: boolean) => void;
    private readonly checkmarks: boolean;
    private readonly iconBadges: boolean;
    private items: readonly MenuItemDescriptor[] = [];
    /** Branch item id → the surface it opens. */
    private readonly subs = new Map<string, Surface>();
    /** Trigger rect captured when this level opened — the list stays put if the
     *  trigger then moves (favorite chips shifting the caret). */
    private pinnedAnchor: { x: number; y: number; width: number; height: number } | null = null;
    /** The open state last announced — see {@link announce}. */
    private shown = false;
    /** The list's exit animation after a close; a reopen cancels it. */
    private exit: SurfaceExit | null = null;
    private readonly opener: HTMLElement | null;

    constructor(doc: Document, opts: SurfaceOptions) {
        this.doc = doc;
        this.host = opts.host;
        this.onSelect = opts.onSelect;
        this.onFavorite = opts.onFavorite;
        this.checkmarks = opts.checkmarks === true;
        this.iconBadges = opts.iconBadges === true;

        this.positioner = doc.createElement('div');
        this.positioner.className = 'vela-ui-layer';
        this.list = doc.createElement('ul');
        this.list.className = 'vela-menu';
        if (opts.minWidth) this.list.style.minWidth = opts.minWidth;
        this.positioner.appendChild(this.list);
        this.host.appendChild(this.positioner);

        const trigger = opts.trigger;
        this.opener = trigger ?? opts.opener ?? null;
        this.ctrl = menuController({
            items: [],
            id: opts.id,
            placement: opts.placement,
            onSelect: (id) => this.onSelect(id),
            getAnchorRect: () => this.pinnedAnchor,
            onOpenChange: (open) => {
                if (open && trigger) {
                    const r = trigger.getBoundingClientRect();
                    this.pinnedAnchor = { x: r.x, y: r.y, width: r.width, height: r.height };
                } else {
                    this.pinnedAnchor = null;
                }
                opts.onOpenChange?.(open);
            },
            triggerId: opts.triggerId,
        });
        this.mid = String(this.ctrl.props.id);
        if (opts.triggerId && trigger) trigger.id = opts.triggerId;
        this.handle = runMachine(this.ctrl.machine, this.ctrl.props, (service) => {
            const api = this.ctrl.connect(service);
            // Close announces while the list still shows, open once it does.
            const closing = this.shown && !api.open;
            if (closing) this.announce(false);
            if (api.open && this.exit) {
                this.exit.cancel();
                this.exit = null;
            }
            if (trigger) spreadProps(trigger, api.getTriggerProps(), this.mid);
            spreadProps(this.positioner, api.getPositionerProps(), this.mid);
            spreadProps(this.list, api.getContentProps(), this.mid);
            this.project(api);
            if (closing) this.holdExit();
            if (api.open && !this.shown) this.announce(true);
        });
    }

    /** Keep the just-closed list up through its exit animation. `spreadProps` re-applies
     *  `hidden` only when the machine's value for it changes, so the list stays shown until
     *  the exit ends — or until a reopen, which projects `hidden: false` itself. */
    private holdExit(): void {
        this.list.hidden = false;
        this.exit = holdForExit(this.list, () => {
            this.exit = null;
            if (!this.shown) this.list.hidden = true;
        });
    }

    get api(): zagMenu.Api {
        return this.ctrl.connect(this.handle.service);
    }

    private announce(open: boolean): void {
        this.shown = open;
        announceSurface(this.list, open, 'menu', this.opener);
    }

    setItems(items: readonly MenuItemDescriptor[]): void {
        this.items = items;
        for (const sub of this.subs.values()) sub.destroy();
        this.subs.clear();
        this.build();
        const api = this.api;
        for (const sub of this.subs.values()) {
            api.setChild(sub.handle.service);
            sub.api.setParent(this.handle.service);
        }
        this.handle.flush();
        // Those two are queued sends: a child only learns it IS a submenu on the next
        // microtask, and a branch row's props (hover intent, the trigger-item part) are
        // derived from that. Re-project once the queue has drained.
        if (this.subs.size > 0) queueMicrotask(() => this.handle.flush());
    }

    destroy(): void {
        for (const sub of this.subs.values()) sub.destroy();
        this.subs.clear();
        this.exit?.finish();
        this.handle.stop();
        // Torn down while open: the stopped machine never projects the close.
        if (this.shown) this.announce(false);
        this.positioner.remove();
    }

    private byId(id: string): MenuItemDescriptor | undefined {
        return this.items.find((i) => i.id === id);
    }

    /** Push the machine's item props onto the rendered rows. A branch takes the submenu
     *  trigger props, which carry the child's ids and hover handlers; a leaf takes plain ones. */
    private project(api: zagMenu.Api): void {
        for (const li of this.list.children) {
            const id = (li as HTMLElement).dataset.veiId;
            if (!id) continue;
            const sub = this.subs.get(id);
            if (sub) {
                spreadProps(li as HTMLElement, api.getTriggerItemProps(sub.api), this.mid);
                continue;
            }
            const item = this.byId(id);
            // Switch rows keep the menu OPEN on selection — flip, see, flip again.
            spreadProps(li as HTMLElement, api.getItemProps({ value: id, disabled: item?.disabled, closeOnSelect: item?.toggle ? false : undefined }), this.mid);
        }
    }

    private build(): void {
        const doc = this.doc;
        this.list.replaceChildren();
        // Reserve the leading mark column only when THIS level actually holds checkable
        // rows — an all-action list (e.g. the chart-body context menu) keeps its natural
        // left edge instead of carrying an empty gutter.
        // Same for icons: once a row of this level carries one, the others keep an empty
        // icon slot (an empty badge in badge mode) so every label shares one left edge.
        const iconic = this.items.some((i) => !!i.icon);
        const badged = this.iconBadges && iconic;
        // In badge mode the tile itself carries the checked state (it inverts, and an
        // icon-less checked row gets a ✓ tile), so no row pays for a separate mark column.
        const markable = this.checkmarks && !badged
            && this.items.some((i) => !(i.submenu && i.submenu.length > 0) && !i.toggle && i.checked !== undefined);
        if (badged) this.list.dataset.badges = '1';
        else delete this.list.dataset.badges;
        for (const item of this.items) {
            if (item.separatorBefore) {
                const sep = doc.createElement('li');
                sep.className = 'vela-menu-sep';
                sep.setAttribute('role', 'separator');
                this.list.appendChild(sep);
            }
            const branch = item.submenu !== undefined && item.submenu.length > 0;
            const li = doc.createElement('li');
            li.className = 'vela-menu-item';
            li.dataset.veiId = item.id;
            if (item.toggle) {
                // Switch row: the pill carries the state.
                // (Zag owns the item's ARIA props; the pill below is decorative.)
                li.dataset.toggle = '1';
            }
            if (markable) {
                // Mark mode: a leading ✓ slot on every row of this level (empty when
                // unchecked, so labels share a left edge); the row surface stays free
                // for hover.
                const mark = doc.createElement('span');
                mark.className = 'vela-menu-mark';
                if (!branch && !item.toggle && item.checked) {
                    mark.appendChild(iconEl('check', doc));
                    li.dataset.checkmark = '1';
                }
                li.appendChild(mark);
            } else if (badged && this.checkmarks && !branch && !item.toggle && item.checked) {
                li.dataset.checkmark = '1';
            } else if (!branch && !item.toggle && item.checked) {
                // Selection reads from the row surface: a stronger background wash
                // marks the active entry (hover stays the lighter wash).
                li.dataset.checked = '1';
            }
            if (badged) {
                const badge = doc.createElement('span');
                badge.className = 'vela-menu-badge';
                const glyph = item.icon || (li.dataset.checkmark ? 'check' : '');
                if (glyph) badge.appendChild(iconEl(glyph, doc));
                li.appendChild(badge);
            } else if (item.icon) {
                li.appendChild(iconEl(item.icon, doc));
            } else if (iconic) {
                li.appendChild(iconEl('', doc));
            }
            const label = doc.createElement('span');
            label.className = 'vela-menu-label';
            label.textContent = vt(item.label);
            li.appendChild(label);
            if (item.hint) {
                const hint = doc.createElement('span');
                hint.className = 'vela-menu-hint';
                hint.textContent = vt(item.hint);
                li.appendChild(hint);
            }
            if (item.favorite !== undefined && this.onFavorite) {
                const on = item.favorite;
                const star = iconEl(on ? 'star-filled' : 'star', doc);
                star.classList.add('vela-menu-star');
                if (on) star.classList.add('vela-fav');
                star.removeAttribute('aria-hidden'); // iconEl hides decorative icons; this one is a control
                star.setAttribute('role', 'button');
                star.setAttribute('aria-label', vt(on ? 'Remove from favorites' : 'Add to favorites'));
                star.setAttribute('aria-pressed', on ? 'true' : 'false');
                // Swallow the whole pointer sequence: the machine selects rows on click,
                // and a press that starts on the star must never reach the row.
                for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'mouseup'] as const) {
                    star.addEventListener(ev, (e) => e.stopPropagation());
                }
                star.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.onFavorite?.(item.id, !on);
                });
                li.appendChild(star);
            }
            if (item.toggle) {
                const sw = doc.createElement('span');
                sw.className = 'vela-menu-switch' + (item.checked ? ' on' : '');
                sw.setAttribute('aria-hidden', 'true');
                li.appendChild(sw);
            }
            if (branch) {
                li.dataset.branch = '1';
                const arrow = iconEl('chevron-right', doc);
                arrow.classList.add('vela-menu-arrow');
                li.appendChild(arrow);
                const sub = new Surface(doc, {
                    host: this.host,
                    placement: 'right-start',
                    opener: li,
                    onSelect: this.onSelect,
                    onFavorite: this.onFavorite,
                    checkmarks: this.checkmarks,
                    iconBadges: this.iconBadges,
                    id: `${this.mid}--${item.id}`,
                });
                sub.setItems(item.submenu ?? []);
                this.subs.set(item.id, sub);
            }
            this.list.appendChild(li);
        }
    }
}

/** The phone sheet's rows (a Menu opened on a phone with no visible button to hang from). */
const SHEET_STYLE_ID = 'vela-menu-sheet';
const SHEET_CSS = `
.vela-msheet { padding: 2px 0 6px; }
.vela-msheet-row { all: unset; box-sizing: border-box; width: 100%; display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 6px; border-radius: 8px; cursor: pointer; color: var(--vela-fg-bright); font-size: 15px; -webkit-tap-highlight-color: transparent; }
.vela-msheet-row:active { background: var(--vela-hover); }
.vela-msheet-row[aria-checked='true']:not([data-toggle]) { background: var(--vela-hover-strong); font-weight: 600; }
.vela-msheet-row[aria-disabled='true'] { opacity: 0.4; cursor: default; }
.vela-msheet-row[data-sep] { margin-top: 6px; border-top: 1px solid var(--vela-border); border-radius: 0 0 8px 8px; }
.vela-msheet-row .vela-icon, .vela-msheet-row > svg { flex: none; width: 18px; height: 18px; font-size: 18px; color: var(--vela-fg-muted); }
.vela-msheet-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vela-msheet-hint, .vela-msheet-tick { flex: none; color: var(--vela-fg-muted); font-size: 13px; }
.vela-msheet-back { font-weight: 600; border-bottom: 1px solid var(--vela-border); border-radius: 0; margin-bottom: 4px; }
.vela-msheet-row .vela-menu-switch { flex: none; }
`;

/** A phone (touch screen up to a foldable's width): menus without a visible button open as a bottom sheet. */
export function phoneLike(doc: Document): boolean {
    const win = doc.defaultView;
    if (!win) return false;
    let coarse = false;
    try {
        coarse = win.matchMedia('(pointer: coarse)').matches;
    } catch {
        /* no matchMedia (tests): not a phone */
    }
    return coarse && win.innerWidth < 900;
}

export class Menu {
    private readonly root: Surface;
    private readonly opts: MenuOptions;
    private items: readonly MenuItemDescriptor[];
    private sheet: Drawer | null = null;
    /** Re-render the open sheet's top page (setItems while it is open: a checklist pick flips other rows). */
    private sheetRefresh: (() => void) | null = null;

    constructor(opts: MenuOptions) {
        this.opts = opts;
        this.items = opts.items;
        const anchor = opts.trigger ?? opts.host ?? document.body;
        const doc = anchor.ownerDocument;
        injectStyles(MENU_STYLE_ID, MENU_CSS, doc);
        const host = floatingLayerHost(opts.host ?? anchor, doc.body);
        this.root = new Surface(doc, {
            host,
            placement: opts.placement,
            onSelect: (id) => opts.onSelect?.(id),
            onOpenChange: opts.onOpenChange,
            trigger: opts.trigger,
            triggerId: opts.triggerId,
            id: opts.id,
            minWidth: opts.minWidth,
            onFavorite: opts.onFavorite,
            checkmarks: opts.checkmarks,
            iconBadges: opts.iconBadges,
        });
        this.root.setItems(opts.items);
    }

    get api(): zagMenu.Api {
        return this.root.api;
    }

    open(): void {
        if (this.sheetMode()) this.openSheet();
        else this.api.setOpen(true);
    }

    /** On a phone a menu with no visible button to hang from opened as a small dropdown pinned in a corner, floating
     *  over the chart (the language picker, Add widget and Templates from the More sheet; user report 2026-10-28,
     *  "kind of slop", the third time). There it opens as a bottom sheet like the phone's other menus. */
    private sheetMode(): boolean {
        const anchor = this.opts.trigger ?? this.opts.host ?? document.body;
        const t = this.opts.trigger;
        const triggerShown = !!t && t.isConnected && t.getClientRects().length > 0;
        // A menu from a field of a dialog (an indicator's or a drawing's settings) is a sheet too: as a dropdown the
        // field's checklist was cut to the room under the field and scrolled with nothing showing it (21 exchanges,
        // 3 visible; user report 2026-10-28).
        const inDialog = !!t?.closest?.('.vela-dialog');
        return (!triggerShown || inDialog) && phoneLike(anchor.ownerDocument);
    }

    private openSheet(): void {
        const anchor = this.opts.host ?? this.opts.trigger ?? document.body;
        const doc = anchor.ownerDocument;
        injectStyles(SHEET_STYLE_ID, SHEET_CSS, doc);
        this.sheet?.destroy();
        const stack: Array<{ title: string; items: readonly MenuItemDescriptor[] }> = [];
        const sheet: Drawer = new Drawer({
            host: this.opts.host ?? doc.body,
            onOpenChange: (open) => {
                this.opts.onOpenChange?.(open);
                if (open) return;
                setTimeout(() => sheet.destroy(), 0);
                if (this.sheet === sheet) {
                    this.sheet = null;
                    this.sheetRefresh = null;
                }
            },
        });
        this.sheet = sheet;
        const render = (items: readonly MenuItemDescriptor[]): void => {
            sheet.body.replaceChildren();
            const list = doc.createElement('div');
            list.className = 'vela-msheet';
            list.setAttribute('role', 'menu');
            const top = stack[stack.length - 1];
            if (top) {
                const back = doc.createElement('button');
                back.type = 'button';
                back.className = 'vela-msheet-row vela-msheet-back';
                back.appendChild(iconEl('chevron-left', doc));
                const t = doc.createElement('span');
                t.className = 'vela-msheet-label';
                t.textContent = vt(top.title);
                back.appendChild(t);
                back.addEventListener('click', () => {
                    stack.pop();
                    render(stack[stack.length - 1]?.items ?? this.items);
                });
                list.appendChild(back);
            }
            for (const item of items) {
                const row = doc.createElement('button');
                row.type = 'button';
                row.className = 'vela-msheet-row';
                row.dataset.id = item.id;
                row.setAttribute('role', item.toggle ? 'menuitemcheckbox' : item.checked !== undefined ? 'menuitemradio' : 'menuitem');
                if (item.checked !== undefined) row.setAttribute('aria-checked', String(!!item.checked));
                if (item.toggle) row.dataset.toggle = '1';
                if (item.separatorBefore) row.dataset.sep = '1';
                if (item.disabled) row.setAttribute('aria-disabled', 'true');
                if (item.icon) row.appendChild(iconEl(item.icon, doc));
                const label = doc.createElement('span');
                label.className = 'vela-msheet-label';
                label.textContent = vt(item.label);
                row.appendChild(label);
                if (item.hint) {
                    const hint = doc.createElement('span');
                    hint.className = 'vela-msheet-hint';
                    hint.textContent = item.hint;
                    row.appendChild(hint);
                }
                if (item.toggle) {
                    const sw = doc.createElement('span');
                    sw.className = 'vela-menu-switch' + (item.checked ? ' on' : '');
                    sw.setAttribute('aria-hidden', 'true');
                    row.appendChild(sw);
                } else if (item.submenu) {
                    row.appendChild(iconEl('chevron-right', doc));
                } else if (item.checked) {
                    const tick = doc.createElement('span');
                    tick.className = 'vela-msheet-tick';
                    tick.textContent = '✓';
                    row.appendChild(tick);
                }
                row.addEventListener('click', () => {
                    if (item.disabled) return;
                    if (item.submenu) {
                        stack.push({ title: item.label, items: item.submenu });
                        render(item.submenu);
                        return;
                    }
                    if (item.toggle) {
                        // A switch keeps the sheet open, like the dropdown keeps itself open.
                        this.opts.onSelect?.(item.id);
                        if (!row.isConnected) return; // the host's setItems already re-rendered the page
                        const on = row.getAttribute('aria-checked') !== 'true';
                        row.setAttribute('aria-checked', String(on));
                        row.querySelector('.vela-menu-switch')?.classList.toggle('on', on);
                        return;
                    }
                    sheet.hide();
                    this.opts.onSelect?.(item.id);
                });
                list.appendChild(row);
            }
            sheet.body.appendChild(list);
        };
        this.sheetRefresh = () => {
            if (stack.length === 0) render(this.items);
        };
        render(this.items);
        sheet.show();
    }

    /** Open anchored to a viewport point (context menus). */
    openAt(clientX: number, clientY: number): void {
        const api = this.api;
        api.setOpen(true);
        // `overlap`: a tall menu opened low on the screen slides up over the pointer instead of running off the
        // bottom (TradingView's right-click menu does the same).
        api.reposition({ getAnchorRect: () => ({ x: clientX, y: clientY, width: 0, height: 0 }), overlap: true });
    }

    close(): void {
        this.sheet?.hide();
        this.api.setOpen(false);
    }

    /** Swap the item descriptors (e.g. checked states) and re-project. */
    setItems(items: readonly MenuItemDescriptor[]): void {
        this.items = items;
        this.root.setItems(items);
        this.sheetRefresh?.();
    }

    destroy(): void {
        this.sheet?.destroy();
        this.sheet = null;
        this.sheetRefresh = null;
        this.root.destroy();
    }
}
