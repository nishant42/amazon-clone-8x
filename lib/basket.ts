import { cookies } from "next/headers";
import { getProducts, type Product } from "@/lib/data/products";
import { BASKET_COOKIE, parseBasket, lineKey, type Basket } from "@/lib/basket-core";

export * from "@/lib/basket-core";

export async function readBasket(): Promise<Basket> {
  const store = await cookies();
  return parseBasket(store.get(BASKET_COOKIE)?.value);
}

export type ResolvedLine = {
  key: string;
  line: Basket["lines"][number];
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
