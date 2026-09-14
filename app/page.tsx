import { ListingView } from "@/components/ui/ListingView";
import { queryProducts } from "@/lib/data/search";
import { EMPTY_QUERY } from "@/lib/listing-core";

/** Home is the unfiltered listing. Every filter link leads to /search. */
export default async function Home() {
  const { results, counts } = await queryProducts(EMPTY_QUERY);
  return <ListingView query={EMPTY_QUERY} results={results} counts={counts} />;
}
