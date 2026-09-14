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

/**
 * Edits allowed, by length: none under 4 (short words genuinely should not
 * fuzzy match), one for 4-6, two for 7+.
 */
export function maxEdits(word: string): number {
  if (word.length < 4) return 0;
  return word.length <= 6 ? 1 : 2;
}

/** Prefix matching is only attempted for tokens this long, to limit false hits. */
export const PREFIX_MIN_TOKEN = 4;

export type MatchKind = "whole" | "prefix";

/**
 * Distance from `token` to `word`, trying the whole word first and then the
 * START of a longer word: people type the opening of a word ("headph") or drop
 * a leading character ("peakers"). Prefix hits are reported separately so a
 * whole-word match always outranks them.
 */
export function bestDistance(
  token: string,
  word: string,
  limit: number,
): { distance: number; kind: MatchKind } | undefined {
  const whole = levenshtein(token, word, limit);
  if (whole <= limit) return { distance: whole, kind: "whole" };

  if (token.length < PREFIX_MIN_TOKEN || word.length <= token.length) return undefined;

  // the start of the longer word
  const head = levenshtein(token, word.slice(0, token.length), limit);
  if (head <= limit) return { distance: head, kind: "prefix" };

  // the same, allowing for a dropped leading character
  const shifted = levenshtein(token, word.slice(1, 1 + token.length), limit);
  if (shifted <= limit) return { distance: shifted, kind: "prefix" };

  return undefined;
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

export type TokenCorrection = {
  original: string;
  corrected: string;
  distance: number;
  kind: MatchKind;
};

/**
 * One correction per word - the closest vocabulary word, not every word within
 * the threshold. Ties go to the more common word, then alphabetically, so the
 * result is deterministic. A word already in the vocabulary is left alone.
 */
export function correctToken(token: string, vocab: Vocabulary): TokenCorrection {
  if (vocab.has(token)) return { original: token, corrected: token, distance: 0, kind: "whole" };
  const limit = maxEdits(token);
  if (limit === 0) return { original: token, corrected: token, distance: 0, kind: "whole" };

  let best: TokenCorrection | undefined;
  let bestCount = -1;
  const better = (candidate: TokenCorrection, count: number) => {
    if (!best) return true;
    // whole-word beats prefix; then fewer edits; then the more common word.
    if (candidate.kind !== best.kind) return candidate.kind === "whole";
    if (candidate.distance !== best.distance) return candidate.distance < best.distance;
    if (count !== bestCount) return count > bestCount;
    return candidate.corrected < best.corrected;
  };

  for (const [word, count] of vocab) {
    // Whole-word needs similar lengths; prefix matching deliberately allows a
    // longer word, so the cheap length filter only applies to the whole-word case.
    const lengthGap = Math.abs(word.length - token.length);
    if (lengthGap > limit && (token.length < PREFIX_MIN_TOKEN || word.length <= token.length)) {
      continue;
    }
    const match = bestDistance(token, word, limit);
    if (!match) continue;
    const candidate: TokenCorrection = {
      original: token,
      corrected: word,
      distance: match.distance,
      kind: match.kind,
    };
    if (better(candidate, count)) {
      best = candidate;
      bestCount = count;
    }
  }
  return best ?? { original: token, corrected: token, distance: 0, kind: "whole" };
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
      // A prefix match is a weaker signal than a whole-word one, so it ranks below.
      score += token.distance + (token.kind === "prefix" ? 0.5 : 0);
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
