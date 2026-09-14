import type { Product } from "@/lib/data/products";
import { formatGBP } from "@/lib/money";
import { priceStats, sparklinePoints } from "@/lib/price-history";

const W = 260;
const H = 56;

/**
 * 90 days of price as an inline SVG polyline. No charting library: it is one
 * polyline, one marker for today, and three numbers. Server-rendered, so it
 * costs the page nothing at runtime.
 */
export function PriceSparkline({ product }: { product: Product }) {
  const stats = priceStats(product);
  if (!stats) return null;

  const { points, last } = sparklinePoints(product.priceHistory, W, H);
  const flat = stats.highMinor === stats.lowMinor;

  return (
    <section className="rounded-[8px] border border-[#d5d9d9] bg-white p-4">
      <h2 className="text-[14px] font-bold text-amazon-text">Price history</h2>
      <p className="text-[12px] text-[#565959]">Last {stats.days} days</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="mt-2 block"
        role="img"
        aria-label={`Price over the last ${stats.days} days. Low ${formatGBP(
          stats.lowMinor,
        )}, high ${formatGBP(stats.highMinor)}, now ${formatGBP(stats.currentMinor)}.`}
      >
        <polyline
          points={points}
          fill="none"
          stroke="#007185"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* today */}
        <circle cx={last.x} cy={last.y} r="3.5" fill="#B12704" />
      </svg>

      <dl className="mt-2 space-y-0.5 text-[13px] text-amazon-text">
        <div className="flex justify-between">
          <dt className="text-[#565959]">Now</dt>
          <dd className="font-bold text-[#B12704]">{formatGBP(stats.currentMinor)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#565959]">90-day low</dt>
          <dd>{formatGBP(stats.lowMinor)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#565959]">90-day high</dt>
          <dd>{formatGBP(stats.highMinor)}</dd>
        </div>
      </dl>

      {flat ? (
        <p className="mt-2 text-[12px] text-[#565959]">This price has not moved in 90 days.</p>
      ) : null}
    </section>
  );
}
