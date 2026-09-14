"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";

/**
 * The only client code in filtering, and it does two small things:
 *
 *  - scroll={false}: a filter click must not jump to the top of the results,
 *    which is what made toggling feel like a page reload. Verified: with it,
 *    scrollY survives a 20 -> 40 result change; without it the page jumps.
 *  - useLinkStatus: a small inline dot on the option you clicked, rather than a
 *    spinner over the page. Current results stay on screen throughout.
 *
 * The href is a plain URL, so filtering still works with JavaScript off and the
 * back button behaves normally (ARCHITECTURE decision 4).
 */
function Pending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden="true"
      className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amazon-link align-middle"
    />
  );
}

export function FilterLink({
  href,
  checked,
  count,
  children,
}: {
  href: string;
  checked: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const empty = count === 0 && !checked;
  return (
    <Link
      href={href}
      scroll={false}
      prefetch
      role="checkbox"
      aria-checked={checked}
      className={`flex items-center gap-2 py-0.5 text-[14px] hover:text-[#C7511F] ${
        checked ? "font-bold text-amazon-text" : empty ? "text-[#999]" : "text-amazon-text"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border text-[11px] ${
          checked ? "border-amazon-link bg-amazon-link text-white" : "border-[#888c8c] bg-white"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0">
        {children}
        {count !== undefined ? <span className="ml-1 font-normal text-[#565959]">({count})</span> : null}
        <Pending />
      </span>
    </Link>
  );
}
