import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Stars } from "@/components/ui/Stars";
import { addToBasket } from "@/lib/basket-actions";
import {
  MIN_COMPARE,
  compareViewHref,
  hrefWith,
  packCount,
  validCompareIds,
} from "@/lib/compare-core";
import { getProducts, type Product } from "@/lib/data/products";
import { listingSearchParams, parseListingParams, type RawParams } from "@/lib/listing-core";
import { discountPercent, formatGBP, perUnitMinor } from "@/lib/money";

export const metadata = { title: "Compare products | amazon.co.uk clone" };

function rawQueryString(params: RawParams): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value ?? ""]) sp.append(key, v);
  }
  return sp.toString();
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-[#e7e7e7] align-top">
      <th scope="row" className="w-[130px] bg-[#f7f8f8] px-3 py-3 text-left text-[13px] font-bold text-amazon-text">
        {label}
      </th>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 text-[14px] text-amazon-text">{children}</td>;
}

function Dash({ label }: { label: string }) {
  return (
    <span className="text-[#565959]">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function stockLabel(product: Product) {
  if (product.stock === 0) return <span className="text-amazon-badge">Currently unavailable</span>;
  if (product.stock <= 10) return <span className="text-amazon-badge">Only {product.stock} left in stock</span>;
  return <span className="text-[#007600]">In stock</span>;
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const query = parseListingParams(raw);
  const catalogue = await getProducts();
  query.compare = validCompareIds(query.compare, catalogue);

  // Same canonical rule as /search: unknown ids dropped, capped at 3.
  if (rawQueryString(raw) !== listingSearchParams(query).toString()) {
    redirect(compareViewHref(query));
  }

  const products = query.compare
    .map((id) => catalogue.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
  const backHref = hrefWith(query, query.compare);

  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto max-w-[1200px] px-3 py-4">
        <p className="mb-3 text-[14px]">
          <Link href={backHref} className="text-amazon-link hover:text-[#C7511F] hover:underline">
            ‹ Back to results
          </Link>
        </p>

        <div className="rounded-[4px] bg-white p-4">
          <h1 className="text-[24px] font-bold text-amazon-text">Compare products</h1>

          {products.length < MIN_COMPARE ? (
            <div className="py-10 text-center">
              <p className="text-[16px] font-bold text-amazon-text">Pick at least two products to compare</p>
              <p className="mt-2 text-[14px] text-[#565959]">
                {products.length === 1
                  ? `${products[0].title} is selected. Choose one or two more from the results.`
                  : "Tick Compare on up to three products in the results."}
              </p>
              <Link
                href={backHref}
                className="mt-6 inline-block rounded-[20px] bg-amazon-orange px-6 py-2 text-[14px] font-medium text-amazon-text hover:brightness-95"
              >
                Back to results
              </Link>
            </div>
          ) : (
            // "relative" is load-bearing: the sr-only labels in the cells are
            // absolutely positioned, and without a positioned scroll container they
            // escape its overflow clipping and widen the whole page on mobile.
            <div className="relative mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] table-fixed border-collapse">
                <caption className="sr-only">
                  Side-by-side comparison of {products.map((p) => p.title).join(", ")}
                </caption>
                <thead>
                  <tr>
                    <td className="w-[130px]" />
                    {products.map((product) => (
                      <th key={product.id} scope="col" className="px-3 pb-3 text-left align-top font-normal">
                        <div className="flex justify-end">
                          <Link
                            href={hrefWith(query, query.compare!.filter((id) => id !== product.id), "/search/compare")}
                            aria-label={`Remove ${product.title} from comparison`}
                            className="text-[12px] text-amazon-link hover:text-[#C7511F] hover:underline"
                          >
                            Remove
                          </Link>
                        </div>
                        <Link href={`/product/${product.slug}`} className="relative mt-1 block aspect-square">
                          <Image src={product.image} alt={product.title} fill sizes="(max-width: 640px) 45vw, 300px" className="object-contain" />
                        </Link>
                        <Link
                          href={`/product/${product.slug}`}
                          className="mt-2 line-clamp-2 block text-[14px] leading-snug text-amazon-text hover:text-[#C7511F]"
                        >
                          {product.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-1">
                          <Stars rating={product.rating} />
                          <span className="text-[12px] text-[#565959]">{product.reviewCount.toLocaleString("en-GB")}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label="Brand">
                    {products.map((p) => <Cell key={p.id}>{p.brand}</Cell>)}
                  </Row>

                  <Row label="Price">
                    {products.map((p) => {
                      const off = p.wasPriceMinor ? discountPercent(p.priceMinor, p.wasPriceMinor) : 0;
                      return (
                        <Cell key={p.id}>
                          <span className="text-[18px] font-bold">{formatGBP(p.priceMinor)}</span>
                          {p.wasPriceMinor ? (
                            <span className="block text-[12px] text-[#565959]">
                              RRP: <s>{formatGBP(p.wasPriceMinor)}</s>
                              {off > 0 ? <span className="ml-1 font-bold text-amazon-badge">-{off}%</span> : null}
                            </span>
                          ) : null}
                        </Cell>
                      );
                    })}
                  </Row>

                  <Row label="Price per unit">
                    {products.map((p) => {
                      const count = packCount(p.title);
                      return (
                        <Cell key={p.id}>
                          {count ? (
                            <>
                              {formatGBP(perUnitMinor(p.priceMinor, count))} each
                              <span className="block text-[12px] text-[#565959]">{count}-pack</span>
                            </>
                          ) : (
                            <Dash label="Single item" />
                          )}
                        </Cell>
                      );
                    })}
                  </Row>

                  <Row label="Delivery">
                    {products.map((p) => (
                      <Cell key={p.id}>
                        {p.stock === 0 ? (
                          <Dash label="Not available for delivery" />
                        ) : (
                          <>
                            {p.isPrime ? (
                              <span className="block">
                                <span className="font-bold text-[#00A8E1]">✓prime</span> FREE delivery
                              </span>
                            ) : null}
                            <span className="text-[#565959]">
                              Get it in {p.deliveryDays} {p.deliveryDays === 1 ? "day" : "days"}
                            </span>
                          </>
                        )}
                      </Cell>
                    ))}
                  </Row>

                  <Row label="Stock">
                    {products.map((p) => <Cell key={p.id}>{stockLabel(p)}</Cell>)}
                  </Row>

                  <Row label="Colours">
                    {products.map((p) => (
                      <Cell key={p.id}>{p.colours?.length ? p.colours.join(", ") : <Dash label="No colour options" />}</Cell>
                    ))}
                  </Row>

                  <Row label="Sizes">
                    {products.map((p) => (
                      <Cell key={p.id}>{p.sizes?.length ? p.sizes.join(", ") : <Dash label="No size options" />}</Cell>
                    ))}
                  </Row>

                  <Row label="Buy">
                    {products.map((p) => {
                      const inStock = p.stock > 0;
                      return (
                        <Cell key={p.id}>
                          <form action={addToBasket} className="space-y-2" aria-label={`Add ${p.title} to basket`}>
                            <input type="hidden" name="productId" value={p.id} />
                            {p.colours?.length ? (
                              <label className="block text-[12px] text-[#565959]">
                                Colour
                                <select name="colour" disabled={!inStock} className="mt-0.5 block w-full rounded-[8px] border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1 text-[13px] text-amazon-text">
                                  {p.colours.map((c) => <option key={c}>{c}</option>)}
                                </select>
                              </label>
                            ) : null}
                            {p.sizes?.length ? (
                              <label className="block text-[12px] text-[#565959]">
                                Size
                                <select name="size" disabled={!inStock} className="mt-0.5 block w-full rounded-[8px] border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1 text-[13px] text-amazon-text">
                                  {p.sizes.map((s) => <option key={s}>{s}</option>)}
                                </select>
                              </label>
                            ) : null}
                            {inStock ? (
                              <label className="block text-[12px] text-[#565959]">
                                Quantity
                                <select name="qty" defaultValue="1" className="mt-0.5 block w-full rounded-[8px] border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1 text-[13px] text-amazon-text">
                                  {Array.from({ length: Math.min(p.stock, 10) }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </label>
                            ) : null}
                            <button
                              type="submit"
                              disabled={!inStock}
                              className="w-full rounded-[20px] bg-amazon-orange py-1.5 text-[13px] font-medium text-amazon-text hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[#e7e9ec] disabled:text-[#565959]"
                            >
                              {inStock ? "Add to Basket" : "Unavailable"}
                            </button>
                          </form>
                        </Cell>
                      );
                    })}
                  </Row>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
