import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data/products";
import { discountPercent, formatGBP, splitGBP } from "@/lib/money";
import { Stars } from "./Stars";

export function ProductCard({
  product,
  footer,
}: {
  product: Product;
  /** Optional extra row at the bottom of the card (the compare checkbox on /search). */
  footer?: React.ReactNode;
}) {
  const [whole, pence] = splitGBP(product.priceMinor);
  const off = product.wasPriceMinor
    ? discountPercent(product.priceMinor, product.wasPriceMinor)
    : 0;

  return (
    <article className="flex flex-col rounded-[4px] bg-white p-3">
      <Link href={`/product/${product.slug}`} className="relative mb-3 block aspect-square">
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
          className="object-contain"
        />
      </Link>

      <Link
        href={`/product/${product.slug}`}
        className="line-clamp-2 text-[14px] leading-snug text-amazon-text hover:text-[#C7511F]"
      >
        {product.title}
      </Link>

      <p className="mt-0.5 text-[12px] text-[#565959]">{product.brand}</p>

      <div className="mt-1 flex items-center gap-1">
        <Stars rating={product.rating} />
        <span className="text-[12px] text-[#565959]">
          {product.reviewCount.toLocaleString("en-GB")}
        </span>
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[12px] text-amazon-text">£</span>
        <span className="text-[21px] font-medium leading-none text-amazon-text">{whole}</span>
        <span className="text-[12px] text-amazon-text">{pence}</span>
        {product.wasPriceMinor ? (
          <span className="ml-1 text-[12px] text-[#565959]">
            RRP: <s>{formatGBP(product.wasPriceMinor)}</s>
          </span>
        ) : null}
      </div>

      {off > 0 ? (
        <p className="mt-0.5 w-fit rounded-sm bg-amazon-badge px-1.5 py-0.5 text-[11px] font-bold text-white">
          -{off}%
        </p>
      ) : null}

      {product.isPrime ? (
        <p className="mt-1 text-[12px]">
          <span className="font-bold text-[#00A8E1]">✓prime</span>
          <span className="ml-1 text-[#565959]">FREE delivery</span>
        </p>
      ) : null}

      <p className="mt-auto pt-1 text-[12px] text-[#565959]">
        {product.stock === 0
          ? "Currently unavailable"
          : `Get it in ${product.deliveryDays} ${product.deliveryDays === 1 ? "day" : "days"}`}
      </p>
      {footer ? <div className="mt-2 border-t border-[#e7e7e7] pt-2">{footer}</div> : null}
    </article>
  );
}
