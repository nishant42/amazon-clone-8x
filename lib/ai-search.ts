import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CATEGORIES, getProducts } from "@/lib/data/products";
import {
  buildSystemPrompt,
  cleanSentence,
  fallbackQuery,
  validateInterpretation,
} from "@/lib/ai-search-core";
import type { ListingQuery } from "@/lib/listing-core";

/**
 * Natural-language search, the IO half. The only module that talks to the
 * Anthropic API; `server-only` makes importing it from a client component a
 * build error, so the API key can never reach the browser.
 */

export const AI_SEARCH_MODEL = "claude-opus-5";
export const AI_SEARCH_TIMEOUT_MS = 3000;

/** Exactly the four fields the model may return. additionalProperties is false. */
const InterpretationSchema = z.object({
  category: z.enum(CATEGORIES).nullable(),
  maxPrice: z.number().nullable(),
  keywords: z.array(z.string()),
  inStockOnly: z.boolean(),
});

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  // maxRetries: 0 matters. The SDK retries timeouts by default (2 retries), so a
  // "3 second" timeout could otherwise take ~9 seconds of wall clock.
  client ??= new Anthropic({ maxRetries: 0, timeout: AI_SEARCH_TIMEOUT_MS });
  return client;
}

let systemPrompt: string | null = null;

export type InterpretedSearch = {
  query: ListingQuery;
  source: "ai" | "fallback";
  reason?: string;
  ms: number;
};

function failureReason(error: unknown): string {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (error instanceof Anthropic.APIUserAbortError) return "timeout";
  if (error instanceof Anthropic.AuthenticationError) return "auth";
  if (error instanceof Anthropic.RateLimitError) return "rate-limited";
  if (error instanceof Anthropic.BadRequestError) return `bad-request: ${error.message}`;
  if (error instanceof Anthropic.APIError) return `api-${error.status}`;
  if (error instanceof Anthropic.APIConnectionError) return "connection";
  return error instanceof Error ? `error: ${error.message}` : "error";
}

/**
 * Sentence in, ListingQuery out. Never throws and never surfaces an error to
 * the page: any failure - no credentials, timeout, API error, refusal,
 * truncation, unparseable output - returns the plain text-search fallback.
 * Failures are logged server-side so a misconfiguration is visible in logs.
 */
export async function interpretSearch(
  rawSentence: string,
  explicitCategory?: string,
): Promise<InterpretedSearch> {
  const started = Date.now();
  const sentence = cleanSentence(rawSentence);
  const products = await getProducts();

  const fallback = (reason: string): InterpretedSearch => {
    const ms = Date.now() - started;
    console.warn(`[ai-search] fallback (${reason}) after ${ms}ms for "${sentence}"`);
    return { query: fallbackQuery(sentence, products, explicitCategory), source: "fallback", reason, ms };
  };

  const anthropic = getClient();
  if (!anthropic) return fallback("no-credentials");

  systemPrompt ??= buildSystemPrompt(products);

  try {
    const response = await anthropic.beta.messages.parse(
      {
        model: AI_SEARCH_MODEL,
        // Adaptive thinking is on by default on Opus 5 and counts toward this
        // cap. Too tight and the JSON truncates, which would silently fall back.
        max_tokens: 2048,
        output_config: {
          effort: "low",
          format: betaZodOutputFormat(InterpretationSchema),
        },
        // Server-side refusal fallback, recommended for claude-opus-5.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: sentence }],
      },
      {
        timeout: AI_SEARCH_TIMEOUT_MS,
        maxRetries: 0,
        signal: AbortSignal.timeout(AI_SEARCH_TIMEOUT_MS),
      },
    );

    if (response.stop_reason === "refusal") return fallback("refusal");
    if (response.stop_reason === "max_tokens") return fallback("max_tokens");
    if (!response.parsed_output) return fallback("unparseable");

    return {
      query: validateInterpretation(response.parsed_output, sentence, products, explicitCategory),
      source: "ai",
      ms: Date.now() - started,
    };
  } catch (error) {
    return fallback(failureReason(error));
  }
}
