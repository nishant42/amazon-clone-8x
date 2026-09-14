/**
 * Natural-language search, the pure half. No SDK and no Next imports.
 *
 * The boundary this file enforces: the model ONLY turns a sentence into four
 * candidate filters. It never sees products and never filters anything. Every
 * value it returns is re-validated here against the real catalogue and mapped
 * onto the same ListingQuery / URL params the sidebar filters use; filtering
 * then happens server-side exactly as for a click.
 */
import { CATEGORIES, SUBCATEGORIES, type Category, type Product } from "./data/products";
import { findCategory, normaliseText, searchableText, type ListingQuery } from "./listing-core";

/** What the model is allowed to return - exactly these four fields. */
export type Interpretation = {
  category: string | null;
  maxPrice: number | null;
  keywords: string[];
  inStockOnly: boolean;
};

export const MAX_SENTENCE_LENGTH = 200;

export function cleanSentence(raw: string | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SENTENCE_LENGTH);
}

/**
 * Stable across requests (no dates, ids or the user's text) so it can sit
 * behind a prompt-cache breakpoint. Category and subcategory names come from
 * the catalogue itself, so they cannot drift from what validation accepts.
 */
export function buildSystemPrompt(products: Product[]): string {
  const brands = [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));
  const departments = CATEGORIES.map((c) => `- ${c}: ${SUBCATEGORIES[c].join(", ")}`).join("\n");
  return `You convert a shopper's search sentence for a UK online store into search filters.

Departments and their subcategories:
${departments}

Brands stocked: ${brands.join(", ")}.

Rules:
- category: the single department the shopper clearly means, spelled exactly as listed above, or null if unclear or spanning several. Running shoes and sports equipment are Sports; clothes and underwear are Clothing.
- maxPrice: the upper price limit in pounds as a number ("under £50", "less than 50 quid", "max £20" -> 50, 50, 20), or null. Do not invent a number for vague words like "cheap" or "affordable".
- keywords: the product words and brand names worth matching against product titles, lowercase, e.g. ["running", "shoes"] or ["levis", "jeans"]. Leave out price words, filler and adjectives such as cheap, best, good, nice, under, for, me.
- inStockOnly: true only if the shopper asks for availability, e.g. "in stock", "available now", "ready to ship". Otherwise false.`;
}

/**
 * Keep only keyword tokens that actually occur in the catalogue (within the
 * chosen department when there is one). A token nothing contains - "cheap",
 * "quality" - would otherwise AND the result set down to zero.
 */
export function catalogueTokens(words: string[], products: Product[], category?: Category): string[] {
  const pool = category ? products.filter((p) => p.category === category) : products;
  const haystacks = pool.map(searchableText);
  const out: string[] = [];
  for (const word of words) {
    for (const token of normaliseText(word).split(" ")) {
      if (token.length < 2 || out.includes(token)) continue;
      if (haystacks.some((h) => h.includes(token))) out.push(token);
    }
  }
  return out;
}

/**
 * Untrusted model output -> a valid ListingQuery. Anything that does not match
 * the catalogue is dropped rather than trusted: an invented department is
 * ignored, a non-positive or absurd price is ignored, keywords not found in
 * any product are removed. `category` from the header dropdown, when the
 * shopper chose one explicitly, overrides the model.
 */
export function validateInterpretation(
  raw: Interpretation,
  sentence: string,
  products: Product[],
  explicitCategory?: string,
): ListingQuery {
  const category = findCategory(explicitCategory) ?? findCategory(raw.category ?? undefined);

  const priceOk =
    typeof raw.maxPrice === "number" && Number.isFinite(raw.maxPrice) && raw.maxPrice > 0 && raw.maxPrice < 100000;
  const maxPriceMinor = priceOk ? Math.round((raw.maxPrice as number) * 100) : undefined;

  const words = Array.isArray(raw.keywords) ? raw.keywords.filter((k) => typeof k === "string") : [];
  const tokens = catalogueTokens(words, products, category);

  const query: ListingQuery = {
    q: tokens.length ? tokens.join(" ") : undefined,
    categories: category ? [category] : [],
    subs: [],
    prices: maxPriceMinor !== undefined ? [{ maxMinor: maxPriceMinor }] : [],
    inStock: raw.inStockOnly === true,
    from: sentence,
  };
  // Nothing usable came back (e.g. gibberish): search the sentence as typed so
  // the shopper sees an honest "no results", not the whole catalogue.
  if (!query.q && !query.categories.length && !query.prices.length && !query.inStock) {
    query.q = sentence;
  }
  return query;
}

/**
 * Used when the API is unavailable, slow or returns something unusable. Plain
 * text search over the sentence, minus words the catalogue does not contain so
 * "cheap running shoes under £50" still finds running shoes. If nothing
 * survives, the sentence is searched as typed and the normal empty state shows.
 * No `from`: nothing was "understood", so the page must not claim it was.
 */
/**
 * Words that describe the search rather than the product. Checking a token
 * against the catalogue is not enough on its own: "under" survives because of
 * "Under Armour" and "underwear", and a bare "50" survives inside a title, and
 * because every token must match, either one empties the results.
 */
const FILLER = new Set([
  "a", "an", "the", "for", "me", "my", "i", "im", "some", "any", "with", "and", "or", "in", "of", "to",
  "on", "at", "is", "are", "want", "need", "looking", "show", "find", "buy", "get", "please",
  "cheap", "cheapest", "cheaper", "affordable", "budget", "best", "good", "great", "nice", "top",
  "quality", "new", "under", "over", "below", "above", "less", "more", "than", "max", "maximum",
  "min", "minimum", "up", "around", "about", "only", "stock", "available", "now", "quid", "pounds",
  "pound", "gbp",
]);

/** Remove price expressions like "under £50", "less than 20 quid", "£19.99". */
function stripPrices(sentence: string): string {
  return sentence.replace(/£?\d+(?:\.\d{1,2})?(?:\s*(?:quid|pounds?|gbp))?/gi, " ");
}

export function fallbackQuery(sentence: string, products: Product[], explicitCategory?: string): ListingQuery {
  const category = findCategory(explicitCategory);
  const words = normaliseText(stripPrices(sentence))
    .split(" ")
    .filter((word) => word && !FILLER.has(word));
  const tokens = catalogueTokens(words, products, category);
  return {
    q: tokens.length ? tokens.join(" ") : sentence,
    categories: category ? [category] : [],
    subs: [],
    prices: [],
    inStock: false,
  };
}
