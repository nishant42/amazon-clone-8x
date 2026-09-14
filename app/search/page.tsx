import { redirect } from "next/navigation";
import { ListingView } from "@/components/ui/ListingView";
import { cleanSentence } from "@/lib/ai-search-core";
import { interpretSearch } from "@/lib/ai-search";
import { queryProducts } from "@/lib/data/search";
import {
  listingHref,
  listingSearchParams,
  parseListingParams,
  type RawParams,
} from "@/lib/listing-core";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawParams> }) {
  const query = parseListingParams(await searchParams);
  const label = query.q ?? query.sub ?? query.category;
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

  // One URL per result set. "category=All", empty inputs, invalid values and
  // key order all redirect to the canonical form, so shared links stay clean
  // and two URLs never mean the same thing.
  const canonical = listingSearchParams(query).toString();
  if (rawQueryString(raw) !== canonical) {
    redirect(canonical ? `/search?${canonical}` : "/search");
  }

  const { results, counts } = await queryProducts(query);
  return <ListingView query={query} results={results} counts={counts} />;
}
