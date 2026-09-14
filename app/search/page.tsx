import { redirect } from "next/navigation";
import { ListingView } from "@/components/ui/ListingView";
import { cleanSentence } from "@/lib/ai-search-core";
import { interpretSearch } from "@/lib/ai-search";
import { validCompareIds } from "@/lib/compare-core";
import { blockingChip } from "@/lib/listing-core";
import { getProducts, type Product } from "@/lib/data/products";
import { queryProducts } from "@/lib/data/search";
import {
  listingHref,
  listingSearchParams,
  parseListingParams,
  prettyQueryString,
  type RawParams,
} from "@/lib/listing-core";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawParams> }) {
  const query = parseListingParams(await searchParams);
  const label = query.q ?? query.subs[0] ?? query.categories[0];
  return { title: label ? `${label} | amazon.co.uk clone` : "All products | amazon.co.uk clone" };
}

function rawQueryString(params: RawParams): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value ?? ""]) sp.append(key, v);
  }
  return sp.toString();
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;

  // A sentence typed into the header. The model turns it into filters, then we
  // redirect to the ordinary filter URL, so everything after this point - the
  // filtering, the back button, sharing - is identical to clicking filters.
  if (raw.ask !== undefined) {
    const sentence = cleanSentence(Array.isArray(raw.ask) ? raw.ask[0] : raw.ask);
    if (!sentence) redirect("/search");
    const dropdown = Array.isArray(raw.category) ? raw.category[0] : raw.category;
    const { query } = await interpretSearch(sentence, dropdown);
    redirect(listingHref(query));
  }

  const query = parseListingParams(raw);
  const catalogue = await getProducts();
  // Unknown ids dropped, duplicates removed, capped at 3 - then canonicalised
  // below with everything else, so ?compare=a,b,c,d redirects to the first 3.
  query.compare = validCompareIds(query.compare, catalogue);

  // One URL per result set. "category=All", empty inputs, invalid values and
  // key order all redirect to the canonical form, so shared links stay clean
  // and two URLs never mean the same thing.
  const canonical = listingSearchParams(query).toString();
  if (rawQueryString(raw) !== canonical) {
    const pretty = prettyQueryString(listingSearchParams(query));
    redirect(pretty ? `/search?${pretty}` : "/search");
  }

  const { results, counts } = await queryProducts(query);
  // Only computed when there is nothing to show, to name the filter to drop.
  const blocked = results.length === 0 ? blockingChip(catalogue, query) : undefined;
  const compareSelected = query.compare
    .map((id) => catalogue.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
  return (
    <ListingView
      query={query}
      results={results}
      counts={counts}
      compareSelected={compareSelected}
      blocking={
        blocked
          ? { label: blocked.chip.label, href: blocked.chip.href, recovered: blocked.recovered }
          : undefined
      }
    />
  );
}
