/**
 * Pure basket logic. Deliberately imports nothing from Next or the filesystem,
 * so the mutation rules can be executed and asserted directly rather than only
 * exercised through a form submission.
 *
 * lib/basket.ts and lib/basket-actions.ts are thin IO shells over this.
 */

export const BASKET_COOKIE = "basket";

/**
 * Bump when the stored shape changes. Anything carrying a different version is
 * discarded rather than migrated, so a stale cookie from an older deploy can
 * never crash a render.
 */
export const BASKET_VERSION = 1;

export const MAX_QTY = 30;

export type BasketLine = {
  productId: string;
  qty: number;
  colour?: string;
  size?: string;
};

export type Basket = { v: number; lines: BasketLine[] };

export const EMPTY_BASKET: Basket = { v: BASKET_VERSION, lines: [] };

/** Identity of a basket line: the same product in a different size is a different line. */
export function lineKey(line: {
  productId: string;
  colour?: string;
  size?: string;
}): string {
  return `${line.productId}|${line.colour ?? ""}|${line.size ?? ""}`;
}

function clampQty(qty: number): number {
  return Math.min(Math.max(Math.trunc(qty), 1), MAX_QTY);
}

/**
 * Defensive parse. Every field is checked; anything unexpected yields an empty
 * basket instead of throwing.
 */
export function parseBasket(raw: string | undefined): Basket {
  if (!raw) return EMPTY_BASKET;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_BASKET;
    const obj = parsed as { v?: unknown; lines?: unknown };
    if (obj.v !== BASKET_VERSION || !Array.isArray(obj.lines)) return EMPTY_BASKET;

    const lines: BasketLine[] = [];
    for (const entry of obj.lines) {
      if (typeof entry !== "object" || entry === null) continue;
      const line = entry as Record<string, unknown>;
      if (typeof line.productId !== "string" || !line.productId) continue;
      const qty = Number(line.qty);
      if (!Number.isInteger(qty) || qty < 1) continue;
      lines.push({
        productId: line.productId,
        qty: Math.min(qty, MAX_QTY),
        colour: typeof line.colour === "string" && line.colour ? line.colour : undefined,
        size: typeof line.size === "string" && line.size ? line.size : undefined,
      });
    }
    return { v: BASKET_VERSION, lines };
  } catch {
    return EMPTY_BASKET;
  }
}

/** Adding an existing line tops up its quantity rather than duplicating it. */
export function applyAdd(basket: Basket, incoming: BasketLine): Basket {
  const key = lineKey(incoming);
  let merged = false;
  const lines = basket.lines.map((line) => {
    if (lineKey(line) !== key) return line;
    merged = true;
    return { ...line, qty: Math.min(line.qty + clampQty(incoming.qty), MAX_QTY) };
  });
  if (!merged) lines.push({ ...incoming, qty: clampQty(incoming.qty) });
  return { v: BASKET_VERSION, lines };
}

/** Quantity 0 (or less) removes the line, matching the "0 (Delete)" option. */
export function applySetQty(basket: Basket, key: string, qty: number): Basket {
  if (!Number.isFinite(qty) || qty < 1) return applyRemove(basket, key);
  return {
    v: BASKET_VERSION,
    lines: basket.lines.map((line) =>
      lineKey(line) === key ? { ...line, qty: clampQty(qty) } : line,
    ),
  };
}

export function applyRemove(basket: Basket, key: string): Basket {
  return {
    v: BASKET_VERSION,
    lines: basket.lines.filter((line) => lineKey(line) !== key),
  };
}
