// Dialog CONTROLLER — Zag dialog machine (focus trap, dismiss, ARIA) + option mapping.
import * as dialog from '@zag-js/dialog';
import { nextUid, normalizeProps } from '../../zag';
import { isPopoverOpen } from '../popover/view';

export interface DialogControllerOptions {
    /** Trap focus + backdrop (default true). Non-modal = floating panel. */
    modal?: boolean;
    closeOnEscape?: boolean;
    closeOnInteractOutside?: boolean;
    /** Element to focus on open (default: the machine's first-tabbable pick). */
    initialFocusEl?: () => HTMLElement | null;
    onOpenChange?: (open: boolean) => void;
}

export type DialogService = dialog.Service;
export type DialogApi = dialog.Api;

export interface DialogController {
    machine: typeof dialog.machine;
    props: Partial<dialog.Props>;
    connect(service: DialogService): DialogApi;
}

export function dialogController(opts: DialogControllerOptions = {}): DialogController {
    return {
        machine: dialog.machine,
        props: {
            id: nextUid('vela-dialog'),
            modal: opts.modal ?? true,
            closeOnEscape: opts.closeOnEscape ?? true,
            // Escape on an open dropdown (a Select's list) closes only the list, not the dialog under it. The dialog's
            // key listener runs before the list's (it was attached first), so it checks for the open list here.
            onEscapeKeyDown: (e: KeyboardEvent) => {
                if (isPopoverOpen()) e.preventDefault();
            },
            closeOnInteractOutside: opts.closeOnInteractOutside ?? false,
            initialFocusEl: opts.initialFocusEl,
            onOpenChange: (d: dialog.OpenChangeDetails) => opts.onOpenChange?.(d.open),
        } satisfies Partial<dialog.Props>,
        connect: (service: DialogService): DialogApi => dialog.connect(service, normalizeProps),
    };
}
