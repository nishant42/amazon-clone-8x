import Image from "next/image";
import Link from "next/link";
import { MAX_COMPARE, MIN_COMPARE, compareViewHref, hrefWith } from "@/lib/compare-core";
import type { Product } from "@/lib/data/products";
import type { ListingQuery } from "@/lib/listing-core";

/** Fixed bar shown once enough products are picked. Server-rendered, links only. */
export function CompareBar({ query, selected }: { query: ListingQuery; selected: Product[] }) {
  if (selected.length < MIN_COMPARE) return null;
  const ids = selected.map((p) => p.id);

  return (
    <div
      role="region"
      aria-label="Products selected for comparison"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d5d9d9] bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.12)]"
    >
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-3 py-2 sm:flex-nowrap">
        <p className="shrink-0 text-[14px] font-bold text-amazon-text">
          Compare ({selected.length}/{MAX_COMPARE})
        </p>

        <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {selected.map((product) => (
            <li
              key={product.id}
              className="flex min-w-0 shrink-0 items-center gap-2 rounded-[8px] border border-[#d5d9d9] py-1 pl-1 pr-2 sm:max-w-[260px]"
            >
              <span className="relative h-10 w-10 shrink-0">
                <Image src={product.image} alt="" fill sizes="40px" className="object-contain" />
              </span>
              <span className="hidden min-w-0 truncate text-[13px] text-amazon-text md:block">
                {product.title}
              </span>
              <Link
                href={hrefWith(query, ids.filter((id) => id !== product.id))}
                scroll={false}
                aria-label={`Remove ${product.title} from comparison`}
                className="shrink-0 px-1 text-[16px] leading-none text-[#565959] hover:text-amazon-badge"
              >
                ×
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={hrefWith(query, [])}
            scroll={false}
            className="text-[13px] text-amazon-link hover:text-[#C7511F] hover:underline"
          >
            Clear
          </Link>
          <Link
            href={compareViewHref(query)}
            className="rounded-[20px] bg-amazon-orange px-5 py-2 text-[14px] font-medium text-amazon-text hover:brightness-95"
          >
            Compare
          </Link>
        </div>
      </div>
    </div>
  );
}
