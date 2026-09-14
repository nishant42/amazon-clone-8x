import Link from "next/link";
import { ProductCard } from "@/components/ui/ProductCard";
import { CATEGORIES } from "@/lib/data/products";
import { searchProducts } from "@/lib/data/search";

type SearchParams = { q?: string; category?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q } = await searchParams;
  return { title: q ? `${q} | amazon.co.uk clone` : "Search | amazon.co.uk clone" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, category } = await searchParams;
  const results = await searchProducts({ q, category });

  const query = (q ?? "").trim();
  const activeCategory = CATEGORIES.find((c) => c === category);

  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto max-w-[1500px] px-3 py-4">
        <div className="rounded-[4px] bg-white px-4 py-3">
          {results.length > 0 ? (
            <p className="text-[14px] text-amazon-text">
              1-{results.length} of {results.length}{" "}
              {results.length === 1 ? "result" : "results"}
              {query ? (
                <>
                  {" "}
                  for <span className="font-bold text-[#C7511F]">&ldquo;{query}&rdquo;</span>
                </>
              ) : null}
              {activeCategory ? <> in <span className="font-bold">{activeCategory}</span></> : null}
            </p>
          ) : (
            <p className="text-[14px] text-amazon-text">No results</p>
          )}
        </div>

        {results.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[4px] bg-white px-6 py-12 text-center">
            <h1 className="text-[21px] font-bold text-amazon-text">
              No results for {query ? <>&ldquo;{query}&rdquo;</> : "that search"}
              {activeCategory ? ` in ${activeCategory}` : null}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-[#565959]">
              Try checking your spelling, using fewer or more general words, or searching in
              all departments instead of one.
            </p>

            {activeCategory && query ? (
              <p className="mt-4 text-[14px]">
                <Link
                  href={`/search?q=${encodeURIComponent(query)}`}
                  className="text-amazon-link hover:text-[#C7511F] hover:underline"
                >
                  Search all departments for &ldquo;{query}&rdquo;
                </Link>
              </p>
            ) : null}

            <div className="mt-6">
              <p className="text-[13px] font-bold text-amazon-text">Browse a department</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {CATEGORIES.map((c) => (
                  <Link
                    key={c}
                    href={`/search?category=${encodeURIComponent(c)}`}
                    className="rounded-[4px] border border-[#d5d9d9] px-3 py-1 text-[13px] text-amazon-link hover:border-amazon-link"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </div>

            <p className="mt-6 text-[14px]">
              <Link href="/" className="text-amazon-link hover:text-[#C7511F] hover:underline">
                ← Back to all products
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
