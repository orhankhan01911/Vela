// Callout-bubble VIEW — a small tinted circle with a centered icon; when a panel is
// declared, clicking it deploys a kit Popover of text and action buttons (below the
// bubble, flipping above near the bottom edge). Content is DATA (see the controller's
// descriptors), so contribution seams can route it without ever handing over DOM.
// The bubble is a single element the caller places and decorates (tooltips stay the
// caller's: renderer chrome attaches its bare-chart tips, widget chrome the kit's).
import type { VelaTheme } from '../../../core/options';
import { iconAt } from '../../../core/icons';
import { injectStyles } from '../../styles';
import { Popover, type PopoverBoundary } from '../popover';
import { calloutPanelRows, closesPanel, type CalloutBubbleSpec, type CalloutPanel } from './controller';
import { CALLOUT_CSS, CALLOUT_STYLE_ID } from './styles';
import { vt } from '../../../i18n';

export interface CalloutBubbleOptions extends CalloutBubbleSpec {
    /** Bubble diameter in px (default 16; the icon renders 4px smaller). */
    size?: number;
    /** Where the deployed panel portals (default: the document body). Pass the chart
     *  or widget root so the panel lives inside the host's DOM. */
    host?: HTMLElement;
    /** Live theme, for a panel deployed OUTSIDE a `.vela-ui` token host (renderer
     *  chrome on a bare chart passes its theme getter; widget chrome may omit it). */
    theme?: () => VelaTheme;
    /** Panel clamp — `'viewport'` (default) flips the panel above the bubble when the
     *  bottom screen edge is too close for it to deploy below. */
    boundary?: PopoverBoundary;
}

export class CalloutBubble {
    readonly el: HTMLElement;
    private spec: CalloutBubbleSpec;
    private readonly size: number;
    private readonly host: HTMLElement | undefined;
    private readonly theme: (() => VelaTheme) | undefined;
    private readonly boundary: PopoverBoundary | undefined;
    private pop: Popover | null = null;

    constructor(opts: CalloutBubbleOptions) {
        this.spec = { icon: opts.icon, background: opts.background, label: opts.label };
        if (opts.color !== undefined) this.spec.color = opts.color;
        if (opts.panel !== undefined) this.spec.panel = opts.panel;
        if (opts.span !== undefined) this.spec.span = opts.span;
        this.size = opts.size ?? 16;
        this.host = opts.host;
        this.theme = opts.theme;
        this.boundary = opts.boundary;
        const doc = (opts.host ?? document.body).ownerDocument;
        injectStyles(CALLOUT_STYLE_ID, CALLOUT_CSS, doc);
        this.el = doc.createElement('span');
        this.el.className = 'vela-callout';
        this.el.style.height = `${this.size}px`;
        // A click's job is the panel — never the row/chip underneath (selection,
        // settings dialogs); a dblclick on the bubble must stay the bubble's too.
        this.el.addEventListener('click', (e) => {
            if (!this.spec.panel) return;
            e.stopPropagation();
            this.toggle();
        });
        this.el.addEventListener('dblclick', (e) => {
            if (this.spec.panel) e.stopPropagation();
        });
        this.el.addEventListener('keydown', (e) => {
            if (!this.spec.panel || (e.key !== 'Enter' && e.key !== ' ')) return;
            e.preventDefault();
            this.toggle();
        });
        this.dress();
    }

    /** Re-dress the bubble (a status change: new icon, tint, label, panel). */
    set(spec: Partial<CalloutBubbleSpec>): void {
        this.spec = { ...this.spec, ...spec };
        // The open panel (if any) belongs to the previous state — retire it.
        if ('panel' in spec) this.pop?.hide();
        this.dress();
    }

    /** Whether the deployed panel is currently open. */
    get open(): boolean {
        return this.pop?.open ?? false;
    }

    /** Close the deployed panel, if any. The bubble itself stays. */
    hidePanel(): void {
        this.pop?.hide();
    }

    destroy(): void {
        this.pop?.destroy();
        this.pop = null;
        this.el.remove();
    }

    private dress(): void {
        const clickable = this.spec.panel !== undefined;
        this.el.style.background = this.spec.background;
        this.el.style.color = this.spec.color ?? '';
        // a span > 1 is a pill: one icon square per slot, the round ends kept
        const span = Math.min(6, Math.max(1, Math.round(this.spec.span ?? 1)));
        const ip = this.size - 4;
        this.el.style.width = `${this.size + (span - 1) * ip}px`;
        this.el.style.borderRadius = span > 1 ? `${this.size / 2}px` : '';
        this.el.innerHTML = iconAt(this.spec.icon, ip, ip * span);
        this.el.setAttribute('aria-label', vt(this.spec.label));
        if (clickable) {
            this.el.setAttribute('role', 'button');
            this.el.tabIndex = 0;
        } else {
            this.el.removeAttribute('role');
            this.el.removeAttribute('tabindex');
        }
    }

    private toggle(): void {
        if (this.pop?.open) {
            this.pop.hide();
            return;
        }
        const panel = this.spec.panel;
        if (!panel) return;
        // A fresh popover per deploy: the content projects the CURRENT panel data,
        // and the theme is read at open time (never a stale capture).
        this.pop?.destroy();
        this.pop = new Popover({
            trigger: this.el,
            gap: 6,
            content: (body) => this.buildPanel(body, panel),
            ...(this.host ? { host: this.host } : {}),
            ...(this.theme ? { theme: this.theme() } : {}),
            ...(this.boundary ? { boundary: this.boundary } : {}),
        });
        this.pop.show();
    }

    private buildPanel(body: HTMLElement, panel: CalloutPanel): void {
        const doc = body.ownerDocument;
        const root = doc.createElement('div');
        root.className = 'vela-callout-panel';
        if (panel.title) {
            const title = doc.createElement('div');
            title.className = 'vela-callout-title';
            title.textContent = vt(panel.title);
            root.appendChild(title);
        }
        for (const row of calloutPanelRows(panel.items)) {
            if (row.type === 'text') {
                const text = doc.createElement('div');
                text.className = 'vela-callout-text';
                text.textContent = vt(row.text);
                root.appendChild(text);
                continue;
            }
            const actions = doc.createElement('div');
            actions.className = 'vela-callout-actions';
            for (const item of row.buttons) {
                const btn = doc.createElement('button');
                btn.type = 'button';
                btn.className = 'vela-callout-btn' + (item.primary ? ' vela-callout-btn-primary' : '');
                btn.textContent = vt(item.label);
                btn.addEventListener('click', () => {
                    item.run();
                    if (closesPanel(item)) this.pop?.hide();
                });
                actions.appendChild(btn);
            }
            root.appendChild(actions);
        }
        body.appendChild(root);
    }
}
