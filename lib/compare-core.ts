/**
 * Pure compare logic. Selection lives in the URL as ?compare=id1,id2 on the
 * same query as the filters (ListingQuery.compare), so it is server-rendered,
 * shareable and restored by the back button exactly like a filter.
 *
 * No Next imports, so every rule here can be executed directly in tests.
 */
import type { Product } from "./data/products";
import { listingSearchParams, prettyQueryString, type ListingQuery } from "./listing-core";

export const MAX_COMPARE = 3;
export const MIN_COMPARE = 2;

/**
 * Untrusted ids -> ids that exist in the catalogue, first occurrence wins,
 * capped at MAX_COMPARE. Unknown ids from a stale or hand-edited link are
 * dropped rather than rendered as empty columns.
 */
export function validCompareIds(ids: string[] | undefined, products: Product[]): string[] {
  const known = new Set(products.map((p) => p.id));
  const out: string[] = [];
  for (const id of ids ?? []) {
    if (known.has(id) && !out.includes(id)) out.push(id);
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

export type CompareToggle =
  | { state: "selected"; href: string }
  | { state: "available"; href: string }
  | { state: "full" };

/** The checkbox for one card: a link to the current URL with this id toggled. */
export function compareToggle(query: ListingQuery, id: string, path = "/search"): CompareToggle {
  const current = query.compare ?? [];
  if (current.includes(id)) {
    return { state: "selected", href: hrefWith(query, current.filter((x) => x !== id), path) };
  }
  if (current.length >= MAX_COMPARE) return { state: "full" };
  return { state: "available", href: hrefWith(query, [...current, id], path) };
}

export function hrefWith(query: ListingQuery, compare: string[], path = "/search"): string {
  const qs = prettyQueryString(listingSearchParams({ ...query, compare }));
  return qs ? `${path}?${qs}` : path;
}

/** The comparison view keeps the whole search context, so "back to results" is exact. */
export function compareViewHref(query: ListingQuery): string {
  return hrefWith(query, query.compare ?? [], "/search/compare");
}

/**
 * Units in a multipack, read from the title: "5-Pack", "3 Pack", "Pack of 3",
 * "Set of 4". Requires an explicit number, so "Backpack" is not a pack, and
 * ignores "13-Piece" - one pan set is one product, and a per-piece price for
 * it would mislead.
 */
export function packCount(title: string): number | undefined {
  const match =
    /\b(\d+)[\s-]?pack\b/i.exec(title) ??
    /\bpack\s+of\s+(\d+)\b/i.exec(title) ??
    /\bset\s+of\s+(\d+)\b/i.exec(title);
  if (!match) return undefined;
  const count = Number(match[1]);
  return Number.isInteger(count) && count >= 2 && count <= 100 ? count : undefined;
}
