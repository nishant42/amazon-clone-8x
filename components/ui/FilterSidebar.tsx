import Link from "next/link";
import { CATEGORIES, SUBCATEGORIES } from "@/lib/data/products";
import {
  PRICE_BANDS,
  listingHref,
  minorToPoundsParam,
  type ListingQuery,
  type facetCounts,
} from "@/lib/listing-core";

type Counts = ReturnType<typeof facetCounts>;

/**
 * Server-rendered and JavaScript-free: every filter is a link to a canonical
 * URL, and the custom price range is a plain GET form. The back button and
 * shared links work because there is no filter state anywhere except the URL.
 */
function Option({
  href,
  selected,
  count,
  children,
}: {
  href: string;
  selected: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const empty = count === 0 && !selected;
  return (
    <li>
      <Link
        href={href}
        aria-current={selected ? "true" : undefined}
        className={`block py-0.5 text-[14px] hover:text-[#C7511F] ${
          selected ? "font-bold text-amazon-text" : empty ? "text-[#999]" : "text-amazon-text"
        }`}
      >
        {children}
        {count !== undefined ? <span className="ml-1 font-normal text-[#565959]">({count})</span> : null}
      </Link>
    </li>
  );
}

export function FilterSidebar({ query: current, counts }: { query: ListingQuery; counts: Counts }) {
  // Choosing a filter here is the shopper refining by hand, so the "you
  // searched ..." line from an AI search no longer describes the results.
  // Removing a chip keeps it; changing a sidebar filter drops it.
  const query: ListingQuery = { ...current, from: undefined };
  const priceActive = query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined;

  return (
    <nav aria-label="Filters" className="space-y-5 text-amazon-text">
      <section>
        <h2 className="text-[14px] font-bold">Department</h2>
        <ul className="mt-1">
          {query.category ? (
            <Option href={listingHref(query, { category: undefined })} selected={false}>
              ‹ Any department
            </Option>
          ) : null}
          {CATEGORIES.map((c) => (
            <Option
              key={c}
              href={listingHref(query, { category: c })}
              selected={query.category === c}
              count={counts.category[c] ?? 0}
            >
              {c}
            </Option>
          ))}
        </ul>
      </section>

      {query.category ? (
        <section>
          <h2 className="text-[14px] font-bold">{query.category}</h2>
          <ul className="mt-1">
            {query.sub ? (
              <Option href={listingHref(query, { sub: undefined })} selected={false}>
                ‹ All {query.category}
              </Option>
            ) : null}
            {SUBCATEGORIES[query.category].map((s) => (
              <Option
                key={s}
                href={listingHref(query, { sub: s })}
                selected={query.sub === s}
                count={counts.sub[s] ?? 0}
              >
                {s}
              </Option>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-[14px] font-bold">Price</h2>
        <ul className="mt-1">
          {priceActive ? (
            <Option href={listingHref(query, { minPriceMinor: undefined, maxPriceMinor: undefined })} selected={false}>
              ‹ Any price
            </Option>
          ) : null}
          {PRICE_BANDS.map((band, i) => (
            <Option
              key={band.label}
              href={listingHref(query, { minPriceMinor: band.minPriceMinor, maxPriceMinor: band.maxPriceMinor })}
              selected={query.minPriceMinor === band.minPriceMinor && query.maxPriceMinor === band.maxPriceMinor}
              count={counts.price[i]}
            >
              {band.label}
            </Option>
          ))}
        </ul>
        <form action="/search" method="get" className="mt-2 flex items-center gap-1">
          {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
          {query.category ? <input type="hidden" name="category" value={query.category} /> : null}
          {query.sub ? <input type="hidden" name="sub" value={query.sub} /> : null}
          {query.inStock ? <input type="hidden" name="inStock" value="1" /> : null}
          <label className="sr-only" htmlFor="minPrice">Minimum price in pounds</label>
          <input
            id="minPrice"
            name="minPrice"
            inputMode="decimal"
            placeholder="£ Min"
            defaultValue={query.minPriceMinor !== undefined ? minorToPoundsParam(query.minPriceMinor) : ""}
            className="w-16 rounded-[4px] border border-[#888c8c] px-1.5 py-1 text-[13px]"
          />
          <label className="sr-only" htmlFor="maxPrice">Maximum price in pounds</label>
          <input
            id="maxPrice"
            name="maxPrice"
            inputMode="decimal"
            placeholder="£ Max"
            defaultValue={query.maxPriceMinor !== undefined ? minorToPoundsParam(query.maxPriceMinor) : ""}
            className="w-16 rounded-[4px] border border-[#888c8c] px-1.5 py-1 text-[13px]"
          />
          <button
            type="submit"
            className="rounded-[8px] border border-[#d5d9d9] bg-white px-2 py-1 text-[13px] shadow-sm hover:bg-[#f7fafa]"
          >
            Go
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-[14px] font-bold">Availability</h2>
        <ul className="mt-1">
          <li>
            <Link
              href={listingHref(query, { inStock: !query.inStock })}
              aria-current={query.inStock ? "true" : undefined}
              className="flex items-center gap-2 py-0.5 text-[14px] hover:text-[#C7511F]"
            >
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 items-center justify-center rounded-[3px] border text-[11px] ${
                  query.inStock ? "border-amazon-link bg-amazon-link text-white" : "border-[#888c8c] bg-white"
                }`}
              >
                {query.inStock ? "✓" : ""}
              </span>
              In stock only <span className="text-[#565959]">({counts.inStock})</span>
            </Link>
          </li>
        </ul>
      </section>
    </nav>
  );
}
