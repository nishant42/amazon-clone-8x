import { CATEGORIES, getProducts, type Category, type Product } from "./products";

/**
 * Lives beside the catalogue rather than inside products.ts because that file is
 * generated - regenerating the seed data must not clobber the search logic.
 *
 * Tokenised AND-match: every whitespace-separated term must appear somewhere in
 * the product's searchable text, so "levis jeans" matches while a naive
 * substring search would not.
 *
 * Both sides are normalised first. Without it "levis" misses "Levi's" and
 * "loreal" misses "L'Oreal" - people do not type the punctuation in a brand.
 */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export async function searchProducts({
  q,
  category,
}: {
  q?: string;
  category?: string;
}): Promise<Product[]> {
  const all = await getProducts();
  const wanted = CATEGORIES.find((c) => c === category) as Category | undefined;
  const tokens = normalise(q ?? "").split(" ").filter(Boolean);

  return all.filter((product) => {
    if (wanted && product.category !== wanted) return false;
    if (tokens.length === 0) return true;
    const haystack = normalise(
      `${product.title} ${product.brand} ${product.category} ${product.subcategory}`,
    );
    return tokens.every((token) => haystack.includes(token));
  });
}
