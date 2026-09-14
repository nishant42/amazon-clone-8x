import {
  FUZZY_MIN_STRICT,
  buildVocabulary,
  correctQuery,
  fuzzyMatches,
} from "@/lib/fuzzy-core";
import {
  applyListingQuery,
  facetCounts,
  passesWithoutText,
  type ListingQuery,
} from "@/lib/listing-core";
import { getProducts } from "./products";

export type SearchCorrection = {
  /** What the shopper typed. */
  original: string;
  /** The corrected phrase, e.g. "bluetoth speakr" -> "bluetooth speaker". */
  corrected: string;
  /** False when exact=1 was set: we suggest, but do not apply it. */
  applied: boolean;
  /** How many results the strict pass found; 0 means fuzzy produced all of them. */
  strictCount: number;
};

/**
 * Lives beside the catalogue rather than inside products.ts because that file is
 * generated - regenerating the seed data must not clobber the search logic.
 *
 * All matching and filtering rules live in lib/listing-core.ts (pure, tested);
 * this is only the async access seam that pages call.
 */
/**
 * Strict first, always. Typo tolerance only fills in when the strict pass comes
 * back with almost nothing, and its matches are appended after the exact ones
 * so a real match always outranks a corrected one.
 */
export async function queryProducts(query: ListingQuery) {
  const all = await getProducts();
  const strict = applyListingQuery(all, query);

  let results = strict;
  let correction: SearchCorrection | undefined;

  if (query.q && strict.length < FUZZY_MIN_STRICT) {
    const candidate = correctQuery(query.q, buildVocabulary(all));
    if (candidate.changed) {
      const pool = all.filter((p) => passesWithoutText(p, query) && !strict.includes(p));
      const fuzzy = fuzzyMatches(pool, candidate);
      if (fuzzy.length > 0) {
        // exact=1 means "search the literal string": suggest, do not apply.
        if (!query.exact) results = [...strict, ...fuzzy];
        correction = {
          original: query.q,
          corrected: candidate.correctedQuery,
          applied: !query.exact,
          strictCount: strict.length,
        };
      }
    }
  }

  // Counts follow what is on screen, so the sidebar agrees with the results.
  const countsQuery =
    correction?.applied ? { ...query, q: correction.corrected } : query;

  return { results, counts: facetCounts(all, countsQuery), total: all.length, correction };
}
