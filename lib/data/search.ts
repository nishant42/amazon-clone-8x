import { applyListingQuery, facetCounts, type ListingQuery } from "@/lib/listing-core";
import { getProducts } from "./products";

/**
 * Lives beside the catalogue rather than inside products.ts because that file is
 * generated - regenerating the seed data must not clobber the search logic.
 *
 * All matching and filtering rules live in lib/listing-core.ts (pure, tested);
 * this is only the async access seam that pages call.
 */
export async function queryProducts(query: ListingQuery) {
  const all = await getProducts();
  return {
    results: applyListingQuery(all, query),
    counts: facetCounts(all, query),
    total: all.length,
  };
}
