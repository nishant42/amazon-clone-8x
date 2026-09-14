import Link from "next/link";
import { DragBasketLayer } from "@/components/cart/DragBasketLayer";
import { CompareBar } from "@/components/ui/CompareBar";
import { CompareToggle } from "@/components/ui/CompareToggle";
import { FilterSidebar } from "@/components/ui/FilterSidebar";
import { MIN_COMPARE } from "@/lib/compare-core";
import { ProductCard } from "@/components/ui/ProductCard";
import type { Product } from "@/lib/data/products";
import { activeChips, type ListingQuery, type facetCounts } from "@/lib/listing-core";

export function ListingView({
  query,
  results,
  counts,
  compareSelected,
  blocking,
  correction,
  basketCount,
}: {
  query: ListingQuery;
  results: Product[];
  counts: ReturnType<typeof facetCounts>;
  /** When nothing matches: the one filter whose removal brings back the most results. */
  blocking?: { label: string; href: string; recovered: number };
  /** Enables drag-to-basket (an enhancement; the Add to Basket button is unaffected). */
  basketCount?: number;
  /** Set when a typo correction produced (or could produce) the results. */
  correction?: {
    original: string;
    corrected: string;
    applied: boolean;
    strictCount: number;
    literalHref: string;
    suggestHref: string;
  };
  /** Pass to enable comparing (on /search). Omitted on home, which is unchanged. */
  compareSelected?: Product[];
}) {
  const barVisible = (compareSelected?.length ?? 0) >= MIN_COMPARE;
  const chips = activeChips(query);

  return (
    <main className={`min-h-screen bg-[#E3E6E6] ${barVisible ? "pb-24" : ""}`}>
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
                {chips.length ? " — understood as:" : ""}
              </p>
            ) : null}

            {correction ? (
              <p className="mb-2 text-[14px] text-amazon-text">
                {correction.applied ? (
                  <>
                    {correction.strictCount === 0 ? "Showing results for " : "Also showing close matches for "}
                    <span className="font-bold italic text-[#C7511F]">{correction.corrected}</span>.{" "}
                    <Link href={correction.literalHref} className="text-amazon-link hover:text-[#C7511F] hover:underline">
                      {correction.strictCount === 0 ? "Search instead for" : "Search only for"} &ldquo;{correction.original}&rdquo;
                    </Link>
                  </>
                ) : (
                  <>
                    Searching for the exact phrase &ldquo;{correction.original}&rdquo;.{" "}
                    <Link href={correction.suggestHref} className="text-amazon-link hover:text-[#C7511F] hover:underline">
                      Did you mean <span className="font-bold italic">{correction.corrected}</span>?
                    </Link>
                  </>
                )}
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
                      scroll={false}
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
            <DragBasketLayer basketCount={basketCount ?? 0} raised={barVisible}>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {results.map((product) => (
                  // display:contents keeps the grid layout identical; the
                  // attribute is what the drag layer looks for.
                  <div key={product.id} className="contents" data-drag-product-id={product.id}>
                    <ProductCard
                      product={product}
                      footer={
                        compareSelected ? (
                          <CompareToggle query={query} id={product.id} title={product.title} />
                        ) : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            </DragBasketLayer>
          ) : (
            <div className="mt-4 rounded-[4px] bg-white px-6 py-12 text-center">
              <h1 className="text-[21px] font-bold text-amazon-text">No products match these filters</h1>
              {blocking ? (
                <>
                  <p className="mx-auto mt-2 max-w-lg text-[14px] text-amazon-text">
                    <span className="font-bold">{blocking.label}</span> is the filter ruling everything
                    out. Without it you get {blocking.recovered}{" "}
                    {blocking.recovered === 1 ? "result" : "results"}.
                  </p>
                  <p className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link
                      href={blocking.href}
                      className="inline-block rounded-[20px] bg-amazon-orange px-6 py-2 text-[14px] font-medium text-amazon-text hover:brightness-95"
                    >
                      Remove {blocking.label}
                    </Link>
                    <Link
                      href="/search"
                      className="inline-block rounded-[20px] border border-[#d5d9d9] px-6 py-2 text-[14px] text-amazon-text hover:border-amazon-link"
                    >
                      Clear all filters
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <p className="mx-auto mt-2 max-w-md text-[14px] text-[#565959]">
                    No single filter is to blame - it is the combination. Drop one of the chips above,
                    or start again.
                  </p>
                  <p className="mt-6">
                    <Link
                      href="/search"
                      className="inline-block rounded-[20px] bg-amazon-orange px-6 py-2 text-[14px] font-medium text-amazon-text hover:brightness-95"
                    >
                      Clear all filters
                    </Link>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {compareSelected ? <CompareBar query={query} selected={compareSelected} /> : null}
    </main>
  );
}
