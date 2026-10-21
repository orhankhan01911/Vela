/**
 * Room a host keeps at the right edge of a chart's plot (CSS px), for an overlay of its own that owns that edge
 * (project-options: the Position Payoff profile). Right-anchored built-ins (the visible-range volume profile) draw
 * left of it instead of under it. Providers get the drawing canvas so they can tell which chart asks; the widest
 * answer wins; a throwing provider counts as 0.
 */
export type PlotRightInsetFn = (canvas: HTMLCanvasElement) => number;

const providers = new Set<PlotRightInsetFn>();

/** Add a provider; returns its removal. */
export function registerPlotRightInset(fn: PlotRightInsetFn): () => void {
    providers.add(fn);
    return () => {
        providers.delete(fn);
    };
}

/** CSS px kept free at the right edge of the plot `canvas` belongs to (0 when nothing asks for room). */
export function plotRightInset(canvas: HTMLCanvasElement): number {
    let v = 0;
    for (const fn of providers) {
        try {
            const n = fn(canvas);
            if (Number.isFinite(n) && n > v) v = n;
        } catch {
            // a provider's bug must not stop the chart drawing
        }
    }
    return v;
}
