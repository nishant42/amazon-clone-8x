/**
 * Pure listing logic: parse URL params into a query, apply it to products,
 * compute facet counts, and serialise a query back into a canonical URL.
 *
 * The URL is the only source of truth for catalogue state (ARCHITECTURE
 * decision 4). Filters, the back button, shared links and the AI search all go
 * through parseListingParams / listingHref, so there is exactly one encoding.
 *
 * No Next imports, so every rule here can be executed directly in tests.
 */
import { CATEGORIES, SUBCATEGORIES, type Category, type Product } from "./data/products";

export type ListingQuery = {
  q?: string;
  category?: Category;
  sub?: string;
  /** Pence. The URL carries whole or decimal pounds; converted at the boundary. */
  minPriceMinor?: number;
  maxPriceMinor?: number;
  inStock: boolean;
  /** Display only: the sentence an AI search was interpreted from. Never filters. */
  from?: string;
  /** Product ids picked for comparison. Not a filter: never narrows results. */
  compare?: string[];
};

export type RawParams = Record<string, string | string[] | undefined>;

export const EMPTY_QUERY: ListingQuery = { inStock: false };

export const PRICE_BANDS: { label: string; minPriceMinor?: number; maxPriceMinor?: number }[] = [
  { label: "Under £10", maxPriceMinor: 1000 },
  { label: "£10 to £25", minPriceMinor: 1000, maxPriceMinor: 2500 },
  { label: "£25 to £50", minPriceMinor: 2500, maxPriceMinor: 5000 },
  { label: "£50 to £100", minPriceMinor: 5000, maxPriceMinor: 10000 },
  { label: "£100 & above", minPriceMinor: 10000 },
];

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

/** Pounds as typed in a URL or input ("50", "49.99", "£50") -> pence, or undefined. */
export function poundsToMinor(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  return Math.round(Number(cleaned) * 100);
}

/** Pence -> the shortest pounds string for a URL: 5000 -> "50", 4999 -> "49.99". */
export function minorToPoundsParam(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

/** "p003,p010" -> ["p003", "p010"], trimmed and de-duplicated. Catalogue validation is the page's job. */
export function parseCompareParam(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
}

/**
 * URLSearchParams encodes "," as %2C. Commas are legal in a query string, and
 * "?compare=p003,p010" is what people read and share, so links use the literal
 * form. Server-side, both forms decode to the same value.
 */
export function prettyQueryString(sp: URLSearchParams): string {
  return sp.toString().replace(/%2C/gi, ",");
}

export function findCategory(value: string | undefined): Category | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return CATEGORIES.find((c) => c.toLowerCase() === lower);
}

export function findSubcategory(category: Category, value: string | undefined): string | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return SUBCATEGORIES[category].find((s) => s.toLowerCase() === lower);
}

/**
 * Untrusted params in, a valid query out. Unknown categories, subcategories
 * that do not belong to the category, and malformed prices are dropped rather
 * than erroring, so a hand-edited or stale link still renders.
 */
export function parseListingParams(params: RawParams): ListingQuery {
  const category = findCategory(first(params.category));
  const sub = category ? findSubcategory(category, first(params.sub)) : undefined;

  let minPriceMinor = poundsToMinor(first(params.minPrice));
  let maxPriceMinor = poundsToMinor(first(params.maxPrice));
  if (minPriceMinor === 0) minPriceMinor = undefined;
  if (minPriceMinor !== undefined && maxPriceMinor !== undefined && minPriceMinor > maxPriceMinor) {
    [minPriceMinor, maxPriceMinor] = [maxPriceMinor, minPriceMinor];
  }

  return {
    q: first(params.q),
    category,
    sub,
    minPriceMinor,
    maxPriceMinor,
    inStock: first(params.inStock) === "1",
    from: first(params.from),
    compare: parseCompareParam(first(params.compare)),
  };
}

/** Canonical query string: fixed key order, only meaningful values. */
export function listingSearchParams(query: ListingQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.category) sp.set("category", query.category);
  if (query.category && query.sub) sp.set("sub", query.sub);
  if (query.minPriceMinor !== undefined) sp.set("minPrice", minorToPoundsParam(query.minPriceMinor));
  if (query.maxPriceMinor !== undefined) sp.set("maxPrice", minorToPoundsParam(query.maxPriceMinor));
  if (query.inStock) sp.set("inStock", "1");
  if (query.compare?.length) sp.set("compare", query.compare.join(","));
  if (query.from) sp.set("from", query.from);
  return sp;
}

/** The URL for `query` with `patch` applied. Changing category clears subcategory. */
export function listingHref(query: ListingQuery, patch: Partial<ListingQuery> = {}): string {
  const next: ListingQuery = { ...query, ...patch };
  if ("category" in patch && patch.category !== query.category && !("sub" in patch)) {
    next.sub = undefined;
  }
  const qs = prettyQueryString(listingSearchParams(next));
  return qs ? `/search?${qs}` : "/search";
}

/** Punctuation-insensitive text: "Levi's" and "levis" compare equal. */
export function normaliseText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchableText(product: Product): string {
  return normaliseText(
    `${product.title} ${product.brand} ${product.category} ${product.subcategory}`,
  );
}

export function matchesText(product: Product, q: string | undefined): boolean {
  const tokens = normaliseText(q ?? "").split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = searchableText(product);
  return tokens.every((token) => haystack.includes(token));
}

type Facet = "text" | "category" | "sub" | "price" | "stock";

function passes(product: Product, query: ListingQuery, skip?: Facet): boolean {
  if (skip !== "text" && !matchesText(product, query.q)) return false;
  if (skip !== "category" && query.category && product.category !== query.category) return false;
  if (skip !== "sub" && query.sub && product.subcategory !== query.sub) return false;
  if (skip !== "price") {
    if (query.minPriceMinor !== undefined && product.priceMinor < query.minPriceMinor) return false;
    if (query.maxPriceMinor !== undefined && product.priceMinor > query.maxPriceMinor) return false;
  }
  if (skip !== "stock" && query.inStock && product.stock === 0) return false;
  return true;
}

export function applyListingQuery(products: Product[], query: ListingQuery): Product[] {
  return products.filter((p) => passes(p, query));
}

/**
 * Counts for each option given every OTHER active filter, so a count shows how
 * many results you would get by choosing that option - not how many exist in
 * total.
 */
export function facetCounts(products: Product[], query: ListingQuery) {
  const count = <K extends string>(skip: Facet, key: (p: Product) => K | undefined) => {
    const out: Record<string, number> = {};
    for (const p of products) {
      if (!passes(p, query, skip)) continue;
      const k = key(p);
      if (k) out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  };
  return {
    category: count("category", (p) => p.category),
    sub: count("sub", (p) => (query.category && p.category === query.category ? p.subcategory : undefined)),
    price: PRICE_BANDS.map((band) =>
      products.filter(
        (p) =>
          passes(p, query, "price") &&
          (band.minPriceMinor === undefined || p.priceMinor >= band.minPriceMinor) &&
          (band.maxPriceMinor === undefined || p.priceMinor <= band.maxPriceMinor),
      ).length,
    ),
    inStock: products.filter((p) => passes(p, query, "stock") && p.stock > 0).length,
  };
}

export type Chip = { key: string; label: string; href: string };

/** One removable chip per active filter; each href is the current URL minus that filter. */
export function activeChips(query: ListingQuery): Chip[] {
  const chips: Chip[] = [];
  if (query.q) chips.push({ key: "q", label: `“${query.q}”`, href: listingHref(query, { q: undefined }) });
  if (query.category)
    chips.push({ key: "category", label: query.category, href: listingHref(query, { category: undefined, sub: undefined }) });
  if (query.sub) chips.push({ key: "sub", label: query.sub, href: listingHref(query, { sub: undefined }) });
  if (query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined) {
    const lo = query.minPriceMinor, hi = query.maxPriceMinor;
    const fmt = (m: number) => `£${minorToPoundsParam(m)}`;
    const label = lo !== undefined && hi !== undefined ? `${fmt(lo)} to ${fmt(hi)}` : hi !== undefined ? `Under ${fmt(hi)}` : `${fmt(lo!)} & above`;
    chips.push({ key: "price", label, href: listingHref(query, { minPriceMinor: undefined, maxPriceMinor: undefined }) });
  }
  if (query.inStock) chips.push({ key: "inStock", label: "In stock", href: listingHref(query, { inStock: false }) });
  return chips;
}

export function hasFilters(query: ListingQuery): boolean {
  return activeChips(query).length > 0;
}
