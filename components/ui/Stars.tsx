/**
 * Amazon-style star rating. Renders five outline stars with a filled overlay
 * clipped to the rating width, so half and quarter stars render correctly
 * without needing per-star logic.
 */

function Row({ className }: { className: string }) {
  return (
    <span className={`flex ${className}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className="relative inline-flex shrink-0" role="img" aria-label={`${rating} out of 5 stars`}>
      <Row className="text-[#d5d9d9]" />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <Row className="text-amazon-star" />
      </span>
    </span>
  );
}
