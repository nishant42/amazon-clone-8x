/**
 * Pure listing logic: parse URL params into a query, apply it to products,
 * compute facet counts, and serialise a query back into a canonical URL.
 *
 * The URL is the only source of truth for catalogue state (ARCHITECTURE
 * decision 4). Filters, the back button, shared links and search all go through
 * parseListingParams / listingHref, so there is exactly one encoding.
 *
 * Semantics: OR within a facet, AND across facets. Clothing or Electronics,
 * and under £25, and in stock.
 *
 * No Next imports, so every rule here can be executed directly in tests.
 */
import { CATEGORIES, SUBCATEGORIES, type Category, type Product } from "./data/products";

/** An open-ended price range in pence. At least one side is set. */
export type PriceRange = { minMinor?: number; maxMinor?: number };

export type ListingQuery = {
  q?: string;
  /** OR within the facet. Empty means "any". */
  categories: Category[];
  subs: string[];
  prices: PriceRange[];
  inStock: boolean;
  /** Display only: the sentence a search was interpreted from. Never filters. */
  from?: string;
  /** Product ids picked for comparison. Not a filter: never narrows results. */
  compare?: string[];
  /** exact=1 turns off typo tolerance: search the literal string. */
  exact: boolean;
};

export type RawParams = Record<string, string | string[] | undefined>;

export const EMPTY_QUERY: ListingQuery = {
  categories: [],
  subs: [],
  prices: [],
  inStock: false,
  exact: false,
};

export const PRICE_BANDS: (PriceRange & { label: string })[] = [
  { label: "Under £10", maxMinor: 1000 },
  { label: "£10 to £25", minMinor: 1000, maxMinor: 2500 },
  { label: "£25 to £50", minMinor: 2500, maxMinor: 5000 },
  { label: "£50 to £100", minMinor: 5000, maxMinor: 10000 },
  { label: "£100 & above", minMinor: 10000 },
];

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

/** "a,b" (or repeated params) -> ["a","b"], trimmed, de-duplicated. */
function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const out: string[] = [];
  for (const part of raw.flatMap((v) => v.split(","))) {
    const t = part.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function parseCompareParam(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
}

/**
 * URLSearchParams encodes "," as %2C. Commas are legal in a query string and
 * "?category=Clothing,Electronics" is what people read and share, so links use
 * the literal form. Both decode identically server-side.
 */
export function prettyQueryString(sp: URLSearchParams): string {
  return sp.toString().replace(/%2C/gi, ",");
}

export function poundsToMinor(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  return Math.round(Number(cleaned) * 100);
}

export function minorToPoundsParam(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

export function findCategory(value: string | undefined): Category | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return CATEGORIES.find((c) => c.toLowerCase() === lower);
}

/** Subcategories offered given the selected departments (all of them if none). */
export function allowedSubs(categories: Category[]): string[] {
  const source = categories.length ? categories : CATEGORIES;
  const out: string[] = [];
  for (const c of source) for (const s of SUBCATEGORIES[c]) if (!out.includes(s)) out.push(s);
  return out;
}

export function rangeKey(range: PriceRange): string {
  return `${range.minMinor !== undefined ? minorToPoundsParam(range.minMinor) : ""}-${
    range.maxMinor !== undefined ? minorToPoundsParam(range.maxMinor) : ""
  }`;
}

export function parseRange(value: string): PriceRange | undefined {
  const m = /^(\d+(?:\.\d{1,2})?)?-(\d+(?:\.\d{1,2})?)?$/.exec(value.trim());
  if (!m) return undefined;
  let min = poundsToMinor(m[1]);
  let max = poundsToMinor(m[2]);
  if (min === 0) min = undefined;
  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  return { minMinor: min, maxMinor: max };
}

export function rangeLabel(range: PriceRange): string {
  const money = (m: number) => `£${minorToPoundsParam(m)}`;
  if (range.minMinor !== undefined && range.maxMinor !== undefined)
    return `${money(range.minMinor)} to ${money(range.maxMinor)}`;
  if (range.maxMinor !== undefined) return `Under ${money(range.maxMinor)}`;
  return `${money(range.minMinor!)} & above`;
}

function sortRanges(ranges: PriceRange[]): PriceRange[] {
  return [...ranges].sort(
    (a, b) => (a.minMinor ?? 0) - (b.minMinor ?? 0) || (a.maxMinor ?? Infinity) - (b.maxMinor ?? Infinity),
  );
}

/**
 * Untrusted params in, a valid query out. Unknown departments, subcategories
 * that belong to no selected department, and malformed prices are dropped
 * rather than erroring, so a hand-edited or stale link still renders.
 *
 * Back-compatible: single values ("category=Books") and the older
 * minPrice/maxPrice pair still parse; they canonicalise to the list forms.
 */
export function parseListingParams(params: RawParams): ListingQuery {
  const categories: Category[] = [];
  for (const value of list(params.category)) {
    const c = findCategory(value);
    if (c && !categories.includes(c)) categories.push(c);
  }
  categories.sort((a, b) => CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b));

  const allowed = allowedSubs(categories);
  const subs: string[] = [];
  for (const value of list(params.sub)) {
    const match = allowed.find((s) => s.toLowerCase() === value.toLowerCase());
    if (match && !subs.includes(match)) subs.push(match);
  }
  subs.sort((a, b) => a.localeCompare(b));

  const prices: PriceRange[] = [];
  for (const value of list(params.price)) {
    const range = parseRange(value);
    if (range && !prices.some((r) => rangeKey(r) === rangeKey(range))) prices.push(range);
  }
  if (prices.length === 0) {
    // Legacy custom range, and what the price form submits.
    const legacy = parseRange(`${first(params.minPrice) ?? ""}-${first(params.maxPrice) ?? ""}`);
    if (legacy) prices.push(legacy);
  }

  return {
    q: first(params.q),
    categories,
    subs,
    prices: sortRanges(prices),
    inStock: first(params.inStock) === "1",
    exact: first(params.exact) === "1",
    from: first(params.from),
    compare: parseCompareParam(first(params.compare)),
  };
}

/** Canonical query string: fixed key order, sorted values, only meaningful ones. */
export function listingSearchParams(query: ListingQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.categories.length) sp.set("category", query.categories.join(","));
  if (query.subs.length) sp.set("sub", query.subs.join(","));
  if (query.prices.length) sp.set("price", sortRanges(query.prices).map(rangeKey).join(","));
  if (query.inStock) sp.set("inStock", "1");
  if (query.exact) sp.set("exact", "1");
  if (query.compare?.length) sp.set("compare", query.compare.join(","));
  if (query.from) sp.set("from", query.from);
  return sp;
}

export function listingHref(query: ListingQuery, patch: Partial<ListingQuery> = {}): string {
  const next: ListingQuery = { ...query, ...patch };
  // Dropping a department drops any subcategory that only belonged to it.
  if (patch.categories) {
    const allowed = allowedSubs(next.categories);
    next.subs = next.subs.filter((s) => allowed.includes(s));
  }
  const qs = prettyQueryString(listingSearchParams(next));
  return qs ? `/search?${qs}` : "/search";
}

/** Toggle one value inside a facet: the OR list grows or shrinks by one. */
export function toggleCategoryHref(query: ListingQuery, category: Category): string {
  const on = query.categories.includes(category);
  return listingHref(query, {
    categories: on ? query.categories.filter((c) => c !== category) : [...query.categories, category],
  });
}

export function toggleSubHref(query: ListingQuery, sub: string): string {
  const on = query.subs.includes(sub);
  return listingHref(query, { subs: on ? query.subs.filter((s) => s !== sub) : [...query.subs, sub] });
}

export function togglePriceHref(query: ListingQuery, range: PriceRange): string {
  const key = rangeKey(range);
  const on = query.prices.some((r) => rangeKey(r) === key);
  return listingHref(query, {
    prices: on ? query.prices.filter((r) => rangeKey(r) !== key) : [...query.prices, range],
  });
}

export function normaliseText(value: string): string {
  return value.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function searchableText(product: Product): string {
  return normaliseText(`${product.title} ${product.brand} ${product.category} ${product.subcategory}`);
}

export function matchesText(product: Product, q: string | undefined): boolean {
  const tokens = normaliseText(q ?? "").split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = searchableText(product);
  return tokens.every((token) => haystack.includes(token));
}

function inRange(product: Product, range: PriceRange): boolean {
  if (range.minMinor !== undefined && product.priceMinor < range.minMinor) return false;
  if (range.maxMinor !== undefined && product.priceMinor > range.maxMinor) return false;
  return true;
}

export type Facet = "text" | "category" | "sub" | "price" | "stock";

/** AND across facets; OR within each one. `skip` omits a facet, for counts. */
function passes(product: Product, query: ListingQuery, skip?: Facet): boolean {
  if (skip !== "text" && !matchesText(product, query.q)) return false;
  if (skip !== "category" && query.categories.length && !query.categories.includes(product.category))
    return false;
  if (skip !== "sub" && query.subs.length && !query.subs.includes(product.subcategory)) return false;
  if (skip !== "price" && query.prices.length && !query.prices.some((r) => inRange(product, r)))
    return false;
  if (skip !== "stock" && query.inStock && product.stock === 0) return false;
  return true;
}

export function applyListingQuery(products: Product[], query: ListingQuery): Product[] {
  return products.filter((p) => passes(p, query));
}

/** Everything except the text match - used to scope the fuzzy fallback to the same facets. */
export function passesWithoutText(product: Product, query: ListingQuery): boolean {
  return passes(product, query, "text");
}

/**
 * Counts for each option given every OTHER facet, so a count is what you would
 * get by ticking that option - not an unfiltered total.
 */
export function facetCounts(products: Product[], query: ListingQuery) {
  const base = (skip: Facet) => products.filter((p) => passes(p, query, skip));
  const byCategory = base("category");
  const bySub = base("sub");
  const byPrice = base("price");

  const category: Record<string, number> = {};
  for (const c of CATEGORIES) category[c] = byCategory.filter((p) => p.category === c).length;

  const sub: Record<string, number> = {};
  for (const s of allowedSubs(query.categories)) sub[s] = bySub.filter((p) => p.subcategory === s).length;

  return {
    category,
    sub,
    price: PRICE_BANDS.map((band) => byPrice.filter((p) => inRange(p, band)).length),
    inStock: base("stock").filter((p) => p.stock > 0).length,
  };
}

export type Chip = { key: string; label: string; facet: Facet; href: string };

/** One removable chip per selected value, so four ticks are four chips. */
export function activeChips(query: ListingQuery): Chip[] {
  const chips: Chip[] = [];
  if (query.q)
    chips.push({ key: "q", facet: "text", label: `“${query.q}”`, href: listingHref(query, { q: undefined }) });
  for (const c of query.categories)
    chips.push({ key: `category:${c}`, facet: "category", label: c, href: toggleCategoryHref(query, c) });
  for (const s of query.subs)
    chips.push({ key: `sub:${s}`, facet: "sub", label: s, href: toggleSubHref(query, s) });
  for (const r of sortRanges(query.prices))
    chips.push({ key: `price:${rangeKey(r)}`, facet: "price", label: rangeLabel(r), href: togglePriceHref(query, r) });
  if (query.inStock)
    chips.push({ key: "inStock", facet: "stock", label: "In stock", href: listingHref(query, { inStock: false }) });
  return chips;
}

export function hasFilters(query: ListingQuery): boolean {
  return activeChips(query).length > 0;
}

/**
 * When nothing matches, find which single filter is responsible: the chip whose
 * removal brings back the most results. Returns undefined when removing any one
 * filter still leaves nothing (the combination is the problem, not one filter).
 */
export function blockingChip(
  products: Product[],
  query: ListingQuery,
): { chip: Chip; recovered: number } | undefined {
  let best: { chip: Chip; recovered: number } | undefined;
  for (const chip of activeChips(query)) {
    const without = parseListingParams(
      Object.fromEntries(new URLSearchParams(chip.href.split("?")[1] ?? "")),
    );
    const recovered = applyListingQuery(products, without).length;
    if (recovered > 0 && (!best || recovered > best.recovered)) best = { chip, recovered };
  }
  return best;
}
