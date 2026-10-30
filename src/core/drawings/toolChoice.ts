import type { DrawingTypeKey } from './Drawing';

/**
 * What the next drawing of a tool is made of, chosen outside the drawing (TradingView's Icons panel: the emoji or
 * icon picked there is what the next click places). One choice per tool type, for every chart.
 */
const choices = new Map<DrawingTypeKey, Record<string, unknown>>();

export function setToolChoice(type: DrawingTypeKey, props: Record<string, unknown>): void {
    choices.set(type, { ...props });
}

export function toolChoice(type: DrawingTypeKey): Record<string, unknown> | undefined {
    const c = choices.get(type);
    return c ? { ...c } : undefined;
}
