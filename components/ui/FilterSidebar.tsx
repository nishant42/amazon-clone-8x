import { FilterLink } from "@/components/filters/FilterLink";
import { CATEGORIES } from "@/lib/data/products";
import {
  PRICE_BANDS,
  allowedSubs,
  listingHref,
  minorToPoundsParam,
  rangeKey,
  toggleCategoryHref,
  togglePriceHref,
  toggleSubHref,
  type ListingQuery,
  type facetCounts,
} from "@/lib/listing-core";

type Counts = ReturnType<typeof facetCounts>;

/**
 * Multi-select: ticking two departments is OR (Clothing or Electronics), while
 * departments AND price AND stock narrow together. Every option is a link to a
 * canonical URL, so this works with JavaScript disabled.
 */
export function FilterSidebar({ query: current, counts }: { query: ListingQuery; counts: Counts }) {
  // Choosing a filter by hand means the "you searched ..." line no longer
  // describes the results, so sidebar links drop it. Chips keep it.
  const query: ListingQuery = { ...current, from: undefined };
  const subs = allowedSubs(query.categories);
  const priceActive = query.prices.length > 0;

  return (
    <nav aria-label="Filters" className="space-y-5 text-amazon-text">
      <section>
        <h2 className="text-[14px] font-bold">Department</h2>
        <ul className="mt-1">
          {CATEGORIES.map((c) => (
            <li key={c}>
              <FilterLink
                href={toggleCategoryHref(query, c)}
                checked={query.categories.includes(c)}
                count={counts.category[c] ?? 0}
              >
                {c}
              </FilterLink>
            </li>
          ))}
        </ul>
      </section>

      {query.categories.length ? (
        <section>
          <h2 className="text-[14px] font-bold">
            {query.categories.length === 1 ? query.categories[0] : "Subcategory"}
          </h2>
          <ul className="mt-1">
            {subs.map((s) => (
              <li key={s}>
                <FilterLink href={toggleSubHref(query, s)} checked={query.subs.includes(s)} count={counts.sub[s] ?? 0}>
                  {s}
                </FilterLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-[14px] font-bold">Price</h2>
        <ul className="mt-1">
          {PRICE_BANDS.map((band, i) => (
            <li key={band.label}>
              <FilterLink
                href={togglePriceHref(query, band)}
                checked={query.prices.some((r) => rangeKey(r) === rangeKey(band))}
                count={counts.price[i]}
              >
                {band.label}
              </FilterLink>
            </li>
          ))}
        </ul>
        {/* A custom range replaces any ticked bands - one bespoke range, not a
            band plus a range, which would be ambiguous. */}
        <form action="/search" method="get" className="mt-2 flex items-center gap-1">
          {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
          {query.categories.length ? <input type="hidden" name="category" value={query.categories.join(",")} /> : null}
          {query.subs.length ? <input type="hidden" name="sub" value={query.subs.join(",")} /> : null}
          {query.inStock ? <input type="hidden" name="inStock" value="1" /> : null}
          {query.compare?.length ? <input type="hidden" name="compare" value={query.compare.join(",")} /> : null}
          <label className="sr-only" htmlFor="minPrice">Minimum price in pounds</label>
          <input
            id="minPrice"
            name="minPrice"
            inputMode="decimal"
            placeholder="£ Min"
            defaultValue={priceActive && query.prices[0].minMinor !== undefined ? minorToPoundsParam(query.prices[0].minMinor) : ""}
            className="w-16 rounded-[4px] border border-[#888c8c] px-1.5 py-1 text-[13px]"
          />
          <label className="sr-only" htmlFor="maxPrice">Maximum price in pounds</label>
          <input
            id="maxPrice"
            name="maxPrice"
            inputMode="decimal"
            placeholder="£ Max"
            defaultValue={priceActive && query.prices[0].maxMinor !== undefined ? minorToPoundsParam(query.prices[0].maxMinor) : ""}
            className="w-16 rounded-[4px] border border-[#888c8c] px-1.5 py-1 text-[13px]"
          />
          <button type="submit" className="rounded-[8px] border border-[#d5d9d9] bg-white px-2 py-1 text-[13px] shadow-sm hover:bg-[#f7fafa]">
            Go
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-[14px] font-bold">Availability</h2>
        <ul className="mt-1">
          <li>
            <FilterLink
              href={listingHref(query, { inStock: !query.inStock })}
              checked={query.inStock}
              count={counts.inStock}
            >
              In stock only
            </FilterLink>
          </li>
        </ul>
      </section>
    </nav>
  );
}
