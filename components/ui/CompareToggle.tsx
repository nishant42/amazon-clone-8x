import Link from "next/link";
import { MAX_COMPARE, compareToggle } from "@/lib/compare-core";
import type { ListingQuery } from "@/lib/listing-core";

/**
 * A link styled as a checkbox: toggling rewrites ?compare= and the server
 * re-renders. No client state, so it works without JavaScript and the back
 * button undoes a selection like any other navigation. scroll={false} keeps
 * the shopper where they were instead of jumping to the top of the results.
 */
function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border text-[11px] ${
        checked ? "border-amazon-link bg-amazon-link text-white" : "border-[#888c8c] bg-white"
      }`}
    >
      {checked ? "✓" : ""}
    </span>
  );
}

export function CompareToggle({ query, id, title }: { query: ListingQuery; id: string; title: string }) {
  const toggle = compareToggle(query, id);

  if (toggle.state === "full") {
    return (
      <span
        aria-disabled="true"
        title={`You can compare up to ${MAX_COMPARE} products`}
        className="flex cursor-not-allowed items-center gap-2 text-[13px] text-[#999]"
      >
        <Box checked={false} />
        Compare (max {MAX_COMPARE})
      </span>
    );
  }

  const selected = toggle.state === "selected";
  return (
    <Link
      href={toggle.href}
      scroll={false}
      aria-label={selected ? `Remove ${title} from comparison` : `Add ${title} to comparison`}
      data-compare-toggle={id}
      className="flex items-center gap-2 text-[13px] text-amazon-text hover:text-[#C7511F]"
    >
      <Box checked={selected} />
      {selected ? "Comparing" : "Compare"}
    </Link>
  );
}
