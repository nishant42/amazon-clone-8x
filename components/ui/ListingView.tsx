import Link from "next/link";
import { FilterSidebar } from "@/components/ui/FilterSidebar";
import { ProductCard } from "@/components/ui/ProductCard";
import type { Product } from "@/lib/data/products";
import { activeChips, type ListingQuery, type facetCounts } from "@/lib/listing-core";

export function ListingView({
  query,
  results,
  counts,
}: {
  query: ListingQuery;
  results: Product[];
  counts: ReturnType<typeof facetCounts>;
}) {
  const chips = activeChips(query);

  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto grid max-w-[1500px] gap-4 px-3 py-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-[4px] bg-white p-4 lg:block">
          <FilterSidebar query={query} counts={counts} />
        </aside>

        <div className="min-w-0">
          <details className="mb-3 rounded-[4px] bg-white lg:hidden">
            <summary className="cursor-pointer px-4 py-3 text-[14px] font-bold text-amazon-text">
              Filters{chips.length ? ` (${chips.length})` : ""}
            </summary>
            <div className="border-t border-[#e7e7e7] p-4">
              <FilterSidebar query={query} counts={counts} />
            </div>
          </details>

          <div className="rounded-[4px] bg-white px-4 py-3">
            {query.from ? (
              <p className="mb-2 text-[13px] text-[#565959]">
                You searched{" "}
                <span className="font-bold text-amazon-text">&ldquo;{query.from}&rdquo;</span>
                {chips.length ? " — understood as:" : " — no filters could be taken from it."}
              </p>
            ) : null}

            <p className="text-[14px] text-amazon-text">
              {results.length === 0
                ? "No results"
                : `1-${results.length} of ${results.length} ${results.length === 1 ? "result" : "results"}`}
            </p>

            {chips.length ? (
              <ul className="mt-2 flex flex-wrap items-center gap-2" aria-label="Active filters">
                {chips.map((chip) => (
                  <li key={chip.key}>
                    <Link
                      href={chip.href}
                      aria-label={`Remove filter: ${chip.label}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#007185] bg-[#edfdff] px-3 py-1 text-[13px] text-amazon-text hover:bg-[#d7f5f9]"
                    >
                      {chip.label}
                      <span aria-hidden="true" className="text-[15px] leading-none text-[#565959]">×</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/search" className="text-[13px] text-amazon-link hover:text-[#C7511F] hover:underline">
                    Clear all
                  </Link>
                </li>
              </ul>
            ) : null}
          </div>

          {results.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[4px] bg-white px-6 py-12 text-center">
              <h1 className="text-[21px] font-bold text-amazon-text">No products match these filters</h1>
              <p className="mx-auto mt-2 max-w-md text-[14px] text-[#565959]">
                Remove a filter above, try a wider price range, or check the spelling of your search.
              </p>
              <p className="mt-6">
                <Link
                  href="/search"
                  className="inline-block rounded-[20px] bg-amazon-orange px-6 py-2 text-[14px] font-medium text-amazon-text hover:brightness-95"
                >
                  Clear all filters
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
