import { cookies } from "next/headers";
import { getProducts, type Product } from "@/lib/data/products";

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

const EMPTY: Basket = { v: BASKET_VERSION, lines: [] };

/** Identity of a basket line: same product in a different size is a different line. */
export function lineKey(line: {
  productId: string;
  colour?: string;
  size?: string;
}): string {
  return `${line.productId}|${line.colour ?? ""}|${line.size ?? ""}`;
}

/**
 * Defensive parse. Every field is checked; anything unexpected yields an empty
 * basket instead of throwing. This is the "keyed so stale data can't crash the
 * page" guarantee, and it is why the parse is exported and unit-testable.
 */
export function parseBasket(raw: string | undefined): Basket {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const obj = parsed as { v?: unknown; lines?: unknown };
    if (obj.v !== BASKET_VERSION || !Array.isArray(obj.lines)) return EMPTY;

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
    return EMPTY;
  }
}

export async function readBasket(): Promise<Basket> {
  const store = await cookies();
  return parseBasket(store.get(BASKET_COOKIE)?.value);
}

export type ResolvedLine = {
  key: string;
  line: BasketLine;
  product: Product;
  lineTotalMinor: number;
};

/**
 * Re-resolves every line against the catalogue. Prices come from the catalogue
 * on every render and never from the cookie, so a tampered cookie cannot set a
 * price. Lines referencing products that no longer exist are dropped silently.
 */
export async function resolveBasket(): Promise<{
  lines: ResolvedLine[];
  subtotalMinor: number;
  itemCount: number;
}> {
  const basket = await readBasket();
  if (basket.lines.length === 0) {
    return { lines: [], subtotalMinor: 0, itemCount: 0 };
  }
  const products = await getProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: ResolvedLine[] = [];
  for (const line of basket.lines) {
    const product = byId.get(line.productId);
    if (!product) continue;
    lines.push({
      key: lineKey(line),
      line,
      product,
      lineTotalMinor: product.priceMinor * line.qty,
    });
  }

  return {
    lines,
    subtotalMinor: lines.reduce((sum, l) => sum + l.lineTotalMinor, 0),
    itemCount: lines.reduce((sum, l) => sum + l.line.qty, 0),
  };
}
