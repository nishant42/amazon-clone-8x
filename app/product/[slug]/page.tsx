import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { Stars } from "@/components/ui/Stars";
import { getProductBySlug } from "@/lib/data/products";
import { galleryImages } from "@/lib/images";
import { discountPercent, formatGBP } from "@/lib/money";
import { PriceSparkline } from "@/components/product/PriceSparkline";
import { humaniseDaysAgo, priceVerdict } from "@/lib/price-history";

type Params = { slug: string };

// params is a Promise in Next 15+ - this is the async request API the codemod
// looks for. Awaiting it is mandatory, not stylistic.
export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return { title: `${product.title} | amazon.co.uk clone`, description: product.description };
}

function deliveryLabel(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const off = product.wasPriceMinor
    ? discountPercent(product.priceMinor, product.wasPriceMinor)
    : 0;
  // Read from the recorded history, never from the RRP the badge uses.
  const verdict = priceVerdict(product);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1500px] px-4 py-4">
        <nav className="mb-3 text-[12px] text-[#565959]">
          <Link href="/" className="hover:text-[#C7511F] hover:underline">
            Home
          </Link>
          <span className="mx-1">›</span>
          <span>{product.category}</span>
          <span className="mx-1">›</span>
          <span>{product.subcategory}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,3fr)]">
          <ProductGallery images={galleryImages(product)} alt={product.title} />

          <div className="min-w-0">
            <h1 className="text-[24px] font-medium leading-tight text-amazon-text">
              {product.title}
            </h1>
            <p className="mt-1 text-[14px] text-[#565959]">Brand: {product.brand}</p>

            <div className="mt-2 flex items-center gap-2">
              <Stars rating={product.rating} />
              <span className="text-[14px] text-amazon-text">{product.rating}</span>
              <span className="text-[14px] text-[#565959]">
                {product.reviewCount.toLocaleString("en-GB")} ratings
              </span>
            </div>

            <hr className="my-3 border-[#e7e7e7]" />

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {off > 0 ? (
                <span className="text-[24px] font-medium text-amazon-badge">-{off}%</span>
              ) : null}
              <span className="text-[28px] font-medium text-amazon-text">
                {formatGBP(product.priceMinor)}
              </span>
              {/* The honest line, sitting right next to the discount badge. */}
              {verdict.kind === "at-low" ? (
                <span className="text-[13px] font-bold text-[#007600]">
                  Lowest price in the last 90 days
                </span>
              ) : verdict.kind === "cheaper-recently" ? (
                <span className="text-[13px] font-bold text-amazon-badge">
                  Was {formatGBP(verdict.wasMinor)} {humaniseDaysAgo(verdict.daysAgo)}
                </span>
              ) : null}
            </div>
            {product.wasPriceMinor ? (
              <p className="text-[13px] text-[#565959]">
                RRP: <s>{formatGBP(product.wasPriceMinor)}</s>
              </p>
            ) : null}

            <hr className="my-3 border-[#e7e7e7]" />

            <h2 className="text-[16px] font-bold text-amazon-text">About this item</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-amazon-text">
              {product.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>

            {product.colours?.length || product.sizes?.length ? (
              <dl className="mt-4 text-[14px] text-amazon-text">
                {product.colours?.length ? (
                  <div className="flex gap-2">
                    <dt className="font-bold">Colours:</dt>
                    <dd>{product.colours.join(", ")}</dd>
                  </div>
                ) : null}
                {product.sizes?.length ? (
                  <div className="flex gap-2">
                    <dt className="font-bold">Sizes:</dt>
                    <dd>{product.sizes.join(", ")}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>

          <div className="space-y-4">
            <PurchasePanel
              productId={product.id}
              priceMinor={product.priceMinor}
              stock={product.stock}
              deliveryLabel={deliveryLabel(product.deliveryDays)}
              isPrime={product.isPrime}
              colours={product.colours}
              sizes={product.sizes}
            />
            <PriceSparkline product={product} />
          </div>
        </div>

        <section className="mt-10 max-w-3xl border-t border-[#e7e7e7] pt-6">
          <h2 className="text-[20px] font-bold text-amazon-text">Product description</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-amazon-text">
            {product.description}
          </p>
        </section>
      </div>
    </main>
  );
}
