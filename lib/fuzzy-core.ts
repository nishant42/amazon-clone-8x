/**
 * Typo tolerance for search. A fallback, never a replacement: the strict pass
 * runs first and its results always rank above anything found here.
 *
 * No dependency - Levenshtein is a dozen lines, and with ~120 products the
 * vocabulary is a few hundred words, so a query costs single-digit
 * milliseconds. Deliberately no index and no cache at this size.
 */
import type { Product } from "./data/products";
import { normaliseText, searchableText } from "./listing-core";

/** Below this many strict results, fuzzy matches are allowed to fill in. */
export const FUZZY_MIN_STRICT = 3;

/** Short words get one edit, longer ones two; very short words get none. */
export function maxEdits(word: string): number {
  if (word.length < 3) return 0;
  return word.length <= 5 ? 1 : 2;
}

/**
 * Levenshtein distance, bailing out as soon as the best possible result
 * exceeds `max`. Two rows rather than a full matrix: the strings here are
 * single words.
 */
export function levenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowBest = curr[0];
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < rowBest) rowBest = curr[j];
    }
    if (rowBest > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export type Vocabulary = Map<string, number>;

/** Every word in the catalogue's searchable text, with how often it occurs. */
export function buildVocabulary(products: Product[]): Vocabulary {
  const vocab: Vocabulary = new Map();
  for (const product of products) {
    for (const word of searchableText(product).split(" ")) {
      if (word.length < 3) continue;
      vocab.set(word, (vocab.get(word) ?? 0) + 1);
    }
  }
  return vocab;
}

export type TokenCorrection = { original: string; corrected: string; distance: number };

/**
 * One correction per word - the closest vocabulary word, not every word within
 * the threshold. Ties go to the more common word, then alphabetically, so the
 * result is deterministic. A word already in the vocabulary is left alone.
 */
export function correctToken(token: string, vocab: Vocabulary): TokenCorrection {
  if (vocab.has(token)) return { original: token, corrected: token, distance: 0 };
  const limit = maxEdits(token);
  if (limit === 0) return { original: token, corrected: token, distance: 0 };

  let best: TokenCorrection | undefined;
  let bestCount = -1;
  for (const [word, count] of vocab) {
    // A word cannot be within `limit` edits if the lengths differ by more.
    if (Math.abs(word.length - token.length) > limit) continue;
    const distance = levenshtein(token, word, limit);
    if (distance > limit) continue;
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && count > bestCount) ||
      (distance === best.distance && count === bestCount && word < best.corrected)
    ) {
      best = { original: token, corrected: word, distance };
      bestCount = count;
    }
  }
  return best ?? { original: token, corrected: token, distance: 0 };
}

export type Correction = {
  tokens: TokenCorrection[];
  /** The query as corrected, for display: "bluetoth speakr" -> "bluetooth speaker". */
  correctedQuery: string;
  changed: boolean;
};

export function correctQuery(q: string, vocab: Vocabulary): Correction {
  const tokens = normaliseText(q).split(" ").filter(Boolean).map((t) => correctToken(t, vocab));
  return {
    tokens,
    correctedQuery: tokens.map((t) => t.corrected).join(" "),
    changed: tokens.some((t) => t.corrected !== t.original),
  };
}

/**
 * Products matching the corrected words, closest first: fewest edits wins, then
 * better rated, then more reviewed. Ranking by distance is what stops this
 * returning everything inside the threshold in arbitrary order.
 */
export function fuzzyMatches(products: Product[], correction: Correction): Product[] {
  if (!correction.changed) return [];
  const scored: { product: Product; score: number }[] = [];
  for (const product of products) {
    const haystack = searchableText(product);
    let score = 0;
    let ok = true;
    for (const token of correction.tokens) {
      if (haystack.includes(token.original)) continue; // matched as typed
      if (!haystack.includes(token.corrected)) {
        ok = false;
        break;
      }
      score += token.distance;
    }
    if (ok) scored.push({ product, score });
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      b.product.rating - a.product.rating ||
      b.product.reviewCount - a.product.reviewCount,
  );
  return scored.map((s) => s.product);
}
