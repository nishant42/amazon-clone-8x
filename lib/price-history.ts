/**
 * Verdicts read from the recorded price history, never from the RRP.
 *
 * The point of this feature: a "-30%" badge is computed against a list price
 * the retailer chose, which is why people check third-party price trackers. The
 * verdict here answers the question those tools answer - is this actually
 * cheap right now? - using only what the product really cost.
 *
 * Pure: no Next imports, so every rule is directly testable.
 */
import type { Product } from "./data/products";

/**
 * How close to the 90-day low still counts as "at the low": 1% of the price,
 * capped at 50p and floored at 10p, so the claim means the same thing on a £5
 * book as on a £300 vacuum.
 */
function atLowTolerance(currentMinor: number): number {
  return Math.min(50, Math.max(10, Math.round(currentMinor * 0.01)));
}

/** A past price must beat today by this much before it is worth mentioning. */
const MEANINGFUL_DROP = 0.97; // 3% cheaper
const MEANINGFUL_DROP_MINOR = 100; // and at least £1

/**
 * A price that never moved cannot be "the lowest in 90 days" in any useful
 * sense. Without this, penny-level jitter made 70 of 120 products claim a low,
 * which is noise dressed as a signal.
 */
function movedMeaningfully(lowMinor: number, highMinor: number, currentMinor: number): boolean {
  return highMinor - lowMinor >= Math.max(MEANINGFUL_DROP_MINOR, currentMinor * (1 - MEANINGFUL_DROP));
}

export type PriceStats = {
  currentMinor: number;
  lowMinor: number;
  highMinor: number;
  days: number;
};

export function priceStats(product: Product): PriceStats | undefined {
  const history = product.priceHistory;
  if (!Array.isArray(history) || history.length === 0) return undefined;
  return {
    currentMinor: product.priceMinor,
    lowMinor: Math.min(...history),
    highMinor: Math.max(...history),
    days: history.length,
  };
}

export type PriceVerdict =
  | { kind: "at-low"; lowMinor: number; highMinor: number }
  | { kind: "cheaper-recently"; wasMinor: number; daysAgo: number }
  | { kind: "steady" };

/**
 * One verdict per product, in priority order:
 *  1. at (or within 1% of) the 90-day low, and only if the price has
 *     actually moved over the window - the genuinely good case
 *  2. meaningfully cheaper at some point since - the misleading-badge case,
 *     reported from the MOST RECENT such day, because "was cheaper 3 days ago"
 *     and "was cheaper 11 weeks ago" are very different claims
 *  3. otherwise steady, and the UI says nothing
 */
export function priceVerdict(product: Product): PriceVerdict {
  const history = product.priceHistory;
  if (!Array.isArray(history) || history.length === 0) return { kind: "steady" };

  const current = product.priceMinor;
  const low = Math.min(...history);
  const high = Math.max(...history);

  if (!movedMeaningfully(low, high, current)) return { kind: "steady" };

  if (current <= low + atLowTolerance(current)) {
    return { kind: "at-low", lowMinor: low, highMinor: high };
  }

  const threshold = Math.min(current * MEANINGFUL_DROP, current - MEANINGFUL_DROP_MINOR);
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] <= threshold) {
      return {
        kind: "cheaper-recently",
        wasMinor: history[i],
        daysAgo: history.length - 1 - i,
      };
    }
  }
  return { kind: "steady" };
}

/** "yesterday", "5 days ago", "3 weeks ago", "2 months ago". */
export function humaniseDaysAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

/**
 * Points for an inline SVG polyline, scaled into the given box. Returned as a
 * string because that is exactly what the `points` attribute wants.
 */
export function sparklinePoints(
  history: number[],
  width: number,
  height: number,
  padding = 2,
): { points: string; last: { x: number; y: number } } {
  const low = Math.min(...history);
  const high = Math.max(...history);
  const span = high - low || 1;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const step = history.length > 1 ? usableW / (history.length - 1) : 0;

  const coords = history.map((value, i) => {
    const x = padding + i * step;
    const y = padding + usableH - ((value - low) / span) * usableH;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });

  return {
    points: coords.map((c) => `${c.x},${c.y}`).join(" "),
    last: coords[coords.length - 1],
  };
}
