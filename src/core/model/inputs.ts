/**
 * Renderer-neutral indicator input schema — Vela's own shape, owned here so no
 * scripting language's own input model leaks into core (each engine maps its
 * declarations onto this at its boundary). Drives the renderer's settings dialog
 * (the gear settings UI).
 */
export type InputType =
    | 'int'
    | 'float'
    | 'bool'
    | 'string'
    | 'source'
    | 'color'
    | 'price'
    | 'time'
    | 'session'
    | 'timeframe'
    | 'symbol'
    | 'text_area';

export type InputValue = number | string | boolean;

/**
 * Host-provided symbol picker for the settings dialog's `input.symbol` control. Called when the
 * user activates the field: the host opens its own symbol-selection UI (e.g. the app's ticker
 * menu) seeded with the `current` symbol, and reports the chosen one back through `onPick`. When
 * no picker is wired, `input.symbol` falls back to a plain text field.
 */
export type SymbolPickerFn = (current: string, onPick: (symbol: string) => void) => void;

/** One visibility condition on another input's current value: `equals` matches a single
 *  value (a toggle, one dropdown choice), `anyOf` matches a set (several choices). */
export interface InputCondition {
    key: string;
    equals?: InputValue;
    anyOf?: readonly InputValue[];
}

/** An input's visibility gate: one condition, or several AND-ed together. */
export type InputWhen = InputCondition | readonly InputCondition[];

/**
 * Evaluate a visibility gate against the dialog's resolved current values (an input's
 * stored value, else its `defval`). No gate ⇒ visible. Mirrors the chart-settings row
 * gate (`settingsRowVisible`) so both dialogs share one condition vocabulary.
 */
export function inputVisible(when: InputWhen | undefined, values: Record<string, InputValue>): boolean {
    if (!when) return true;
    const conds: readonly InputCondition[] = Array.isArray(when) ? when : [when as InputCondition];
    return conds.every((c) => (c.anyOf ? c.anyOf.some((x) => x === values[c.key]) : values[c.key] === c.equals));
}

export interface InputSchema {
    /** Stable key used by `setInput()` — the engine's own variable id, falling back to `title`. */
    key: string;
    /** Display label shown in the settings dialog. */
    title: string;
    type: InputType;
    defval: InputValue;
    min?: number;
    max?: number;
    step?: number;
    /** Choices for a dropdown (`input.string(..., options=[...])`). */
    options?: readonly string[];
    /** Grouping label for the dialog layout. */
    group?: string;
    /** Inline grouping label (controls placed on one row). */
    inline?: string;
    /** Settings-dialog tab hosting this input; unset ⇒ the default "Inputs" tab. */
    tab?: string;
    /** Visibility gate: the input's row shows only while the condition(s) pass against
     *  the dialog's current values — re-evaluated live on every edit. Inputs sharing an
     *  `inline=` row show while ANY member's gate passes. A hidden input keeps its value. */
    when?: InputWhen;
    tooltip?: string;
    /** Numbers only: the settings dialog shows a slider (with the value typed beside it) instead of a bare
     *  number field. `ends` labels the two ends in plain words ("Fewer", "More"); `unit` trails the value ("%"). */
    slider?: { ends?: readonly [string, string]; unit?: string };
}

/** A row of an input's own menu (see {@link InputMenu}); the shape of the UI menu's items. */
export interface InputMenuItem {
    id: string;
    label: string;
    /** Icon id from the icon registry, before the label. */
    icon?: string;
    /** A switch row that keeps the menu open (a checklist). */
    toggle?: boolean;
    checked?: boolean;
    separatorBefore?: boolean;
}

/**
 * A host's own picker for one input: the indicator settings dialog shows a dropdown button reading
 * `label(value)` that opens these rows instead of a free text field (e.g. an exchange checklist for a
 * `source` string the legend's picker also edits). `pick` gives the value after a row is clicked.
 */
export interface InputMenu {
    items(value: InputValue): InputMenuItem[];
    pick(value: InputValue, id: string): InputValue;
    label(value: InputValue): string;
}

/**
 * Decides which inputs get a menu: the indicator's id, the input, and the element of the chart the
 * dialog belongs to (indicator ids are unique per chart only: in a multi-chart layout every chart's
 * first indicator is `native-1`); null = the usual control.
 */
export type InputMenuResolver = (indicatorId: string, input: InputSchema, chartEl?: HTMLElement) => InputMenu | null;

let inputMenuResolver: InputMenuResolver | null = null;

/** Register (or clear, with null) the host's input-menu resolver for every chart's settings dialog. */
export function registerInputMenu(resolver: InputMenuResolver | null): void {
    inputMenuResolver = resolver;
}

/** The menu for one input, or null. A throwing resolver falls back to the usual control. */
export function inputMenuFor(indicatorId: string, input: InputSchema, chartEl?: HTMLElement): InputMenu | null {
    try {
        return inputMenuResolver?.(indicatorId, input, chartEl) ?? null;
    } catch {
        return null;
    }
}

/**
 * The DELTAS of a value bag against its schema's declaration defaults — what state
 * persistence stores (a default that later changes in the script must not stay frozen
 * in every saved document). Structural comparison (arrays/objects by JSON); keys the
 * schema does not declare are ignored. `undefined` = nothing deviates.
 */
export function inputDeltas(schema: readonly InputSchema[], values: Record<string, InputValue>): Record<string, InputValue> | undefined {
    const out: Record<string, InputValue> = {};
    for (const s of schema) {
        const v = values[s.key];
        if (v !== undefined && JSON.stringify(v) !== JSON.stringify(s.defval)) out[s.key] = v;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}
