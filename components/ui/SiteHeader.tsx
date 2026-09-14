import Link from "next/link";

/**
 * amazon.co.uk header replica. Server Component (carries no client directive)
 * per decision 2 in ARCHITECTURE.md. The search form is a plain GET to /search
 * so it works without any JavaScript.
 *
 * Wordmark is set in text deliberately; no Amazon logo asset is used.
 */

// Each interactive block carries a transparent border that turns white on
// hover. This is the detail that makes the header read as Amazon rather than an
// approximation of it, so it lives in one constant and is applied everywhere.
const hoverBox =
  "rounded-[2px] border border-transparent p-1.5 hover:border-white transition-colors";

// Every entry points at a real page. See app/info/[topic]/page.tsx.
const navLinks: { label: string; href: string }[] = [
  { label: "Today's Deals", href: "/info/todays-deals" },
  { label: "Customer Service", href: "/info/customer-service" },
  { label: "Registry", href: "/info/registry" },
  { label: "Gift Cards", href: "/info/gift-cards" },
  { label: "Sell", href: "/info/sell" },
];

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function CaretIcon() {
  return (
    <svg viewBox="0 0 10 6" className="ml-0.5 h-[6px] w-[10px] self-end pb-[3px] text-[#ccc]" fill="currentColor" aria-hidden="true">
      <path d="M0 0h10L5 6z" />
    </svg>
  );
}

function BasketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
      <path d="M7 18a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 18Zm10 0a2 2 0 1 0 .001 4.001A2 2 0 0 0 17 18ZM6.2 6h15L19 14H8.5L6.2 6Zm-.9-3H2v2h2.1l3 10.5c.1.5.6.9 1.2.9h11v-2H9.1l-.3-1H19c.6 0 1.1-.4 1.2-.9L23 5.3 21.1 4H5.8l-.5-1Z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader({ basketCount = 0 }: { basketCount?: number }) {
  return (
    <header className="w-full text-white">
      {/* ---- top bar ---- */}
      <div className="bg-amazon-dark">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-1 px-2 py-1.5 sm:px-3">
          {/* wordmark */}
          <Link href="/" className={`order-1 shrink-0 ${hoverBox}`} aria-label="amazon.co.uk home">
            <span className="text-[21px] font-bold leading-none tracking-tight">amazon</span>
            <span className="ml-[1px] align-top text-[11px] font-medium leading-none">.co.uk</span>
          </Link>

          {/* delivery location - hidden on mobile */}
          <button type="button" className={`order-2 hidden items-end md:flex ${hoverBox}`}>
            <PinIcon />
            <span className="ml-1 text-left leading-tight">
              <span className="block text-[12px] text-gray-300">Delivering to London</span>
              <span className="block text-[14px] font-bold">Update location</span>
            </span>
          </button>

          {/* search - full width on its own row on mobile, inline from md up */}
          <form
            action="/search"
            role="search"
            className="order-3 mt-1.5 w-full md:order-3 md:mt-0 md:w-auto md:flex-1 md:px-2"
          >
            <div className="flex h-10 overflow-hidden rounded-[4px] focus-within:ring-[3px] focus-within:ring-amazon-orange">
              <label htmlFor="search-category" className="sr-only">
                Search category
              </label>
              <select
                id="search-category"
                name="category"
                defaultValue="All"
                className="h-full cursor-pointer border-r border-gray-400 bg-[#E6E6E6] px-2 text-[12px] text-amazon-text hover:bg-[#d5d9d9] focus:outline-none"
              >
                <option>All</option>
                <option>Clothing</option>
                <option>Electronics</option>
                <option>Home &amp; Kitchen</option>
                <option>Books</option>
                <option>Beauty</option>
                <option>Sports</option>
              </select>
              <label htmlFor="search-input" className="sr-only">
                Search Amazon.co.uk
              </label>
              <input
                id="search-input"
                name="q"
                type="search"
                placeholder="Search Amazon.co.uk"
                className="h-full min-w-0 flex-1 bg-white px-3 text-[15px] text-amazon-text outline-none"
              />
              <button
                type="submit"
                aria-label="Go"
                className="flex h-full items-center bg-amazon-orange px-4 text-amazon-text hover:brightness-95"
              >
                <SearchIcon />
              </button>
            </div>
          </form>

          {/* account / orders / basket */}
          <div className="order-2 ml-auto flex items-center md:order-4 md:ml-0">
            <button type="button" className={`flex items-end ${hoverBox}`}>
              <span className="text-left leading-tight">
                <span className="block text-[12px]">Hello, sign in</span>
                <span className="block text-[14px] font-bold">Account &amp; Lists</span>
              </span>
              <CaretIcon />
            </button>

            <Link href="/orders" className={`hidden text-left leading-tight sm:block ${hoverBox}`}>
              <span className="block text-[12px]">Returns</span>
              <span className="block text-[14px] font-bold">&amp; Orders</span>
            </Link>

            <Link href="/cart" className={`flex items-end ${hoverBox}`}>
              <span className="relative">
                <BasketIcon />
                <span className="absolute -top-1 left-[15px] text-[16px] font-bold text-amazon-orange">
                  {basketCount}
                </span>
              </span>
              <span className="ml-1 hidden text-[14px] font-bold sm:block">Basket</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ---- second bar ---- */}
      <div className="bg-amazon-light">
        <div className="mx-auto flex max-w-[1500px] items-center gap-1 overflow-x-auto whitespace-nowrap px-2 py-1 text-[14px] sm:px-3">
          <Link href="/search" className={`flex items-center gap-1 font-bold ${hoverBox}`}>
            <MenuIcon />
            All
          </Link>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={hoverBox}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
