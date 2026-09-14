# amazon-clone-8x

An Amazon storefront clone, built for the 8x assignment.

**Live:** https://amazon-clone-8x.vercel.app · health: [`/api/health`](https://amazon-clone-8x.vercel.app/api/health)
**Stack:** Next.js 16.3.5 (App Router) · React 19.3.0 · TypeScript · Tailwind CSS 3 · deployed on Vercel

> **Status: scaffold only.** No product features exist yet. The deployment pipeline was
> proven first, deliberately, so that every feature after this ships to a URL that is
> already known to work. Verified on the live deployment: `/api/health` returns
> `{"status":"ok"}` and is served dynamically (`x-vercel-cache: MISS`, no prerender), and
> all seven `amazon-*` tokens are present in the deployed CSS.

---

## Scope

_What this build is trying to be, and the boundary around it._

- TBD — define the target surface (storefront, product detail, cart, checkout, …).
- TBD — state what "done" means for this assignment.

**Non-goals** (current): no real payments, no real Amazon data, no account system unless
scope says otherwise.

---

## What I built

_Filled in as features land. Kept factual — nothing listed here unless it runs._

- **Project scaffold.** Next.js 16 App Router, React 19, TypeScript, Tailwind 3, ESLint 9.
- **Theme tokens.** Amazon palette wired into `tailwind.config.ts` as `amazon-*`
  utilities (`amazon-dark`, `amazon-light`, `amazon-orange`, `amazon-link`,
  `amazon-star`, `amazon-badge`, `amazon-text`).
- **Placeholder home page** (`app/page.tsx`) that renders every theme token, so a broken
  Tailwind config is visible immediately rather than at feature time.
- **Health endpoint** (`app/api/health/route.ts`) returning `{ "status": "ok" }`, forced
  dynamic so it reflects the running app rather than a build-time snapshot.
- **Product detail** (`/product/[slug]`) — gallery with thumbnail swap, colour/size
  pickers that drive the basket line, quantity, and an out-of-stock state that disables
  the button rather than hiding it.
- **Search and filters** (`/search`) — department, subcategory, price bands or a custom range,
  and in-stock only. Multi-select is OR within a facet and AND across facets. Counts show what
  each option would return given the other filters, chips above the results remove one filter at
  a time, and when nothing matches the page names the filter to blame and offers to drop it.
  Results update in place (median 84ms, no page reload); state is entirely in the URL, so the
  back button and shared links work, and it still works with JavaScript disabled.
- **Drag to basket** (enhancement) — drag a product card onto the basket target in the corner.
  Pointer Events so it works with mouse and pen, fine-pointer and >= md only, 6px threshold so
  clicks still work, no animation under `prefers-reduced-motion`. The Add to Basket button is
  untouched and remains the primary path; if the drag layer fails it fails invisibly.
- **Typo tolerance** — "bluetoth", "hedphones" and "bluetoz" find products (one edit for 4-6
  letter words, two for 7+, plus matching against the start of a longer word). Fuzzy matching (Levenshtein,
  no dependency) only runs when the exact pass finds almost nothing, and its hits rank below
  exact ones. The page says "Showing results for bluetooth" and links to the literal search
  rather than silently rewriting the query. ~0.8ms per query, no index or cache.
  Text search is tokenised and punctuation-normalised, so `levis` finds `Levi's`.
- **Product imagery** — every non-book product is a white-background catalogue shot; books use
  their real Open Library jackets. Generation asserts that no photograph is reused inside a
  subcategory and none appears on more than two of the 120 cards, then spreads repeats at least
  a screenful apart. Where the source has no matching garment (jeans, hoodies, socks), a plain
  shirt or dress shot stands in rather than a lifestyle photo.
- **Price history** — every product carries 90 days of daily prices in the seed data. The
  product page shows a sparkline (inline SVG `<polyline>`, no charting library) with today
  marked, plus the 90-day low and high. Next to the discount badge sits a verdict computed from
  the real history and never from the RRP: "Lowest price in the last 90 days", or "Was £16.19
  7 weeks ago" — which is what 14 of the discounted products actually deserve. Search cards get
  a one-line version only when the product is genuinely at its low (24 of 120), so the line
  still means something.
- **Basket** (`/cart`) — quantity and remove, subtotal computed server-side from prices
  re-resolved out of the catalogue. Persists in a versioned `httpOnly` cookie that stores
  only ids, quantities and variants — never a price.
- **Compare** (`/search`, `/search/compare`) — tick up to three results to get a bar with a
  Compare button; the comparison view shows image, title, brand, price, price per unit for
  multipacks, delivery, stock and variants side by side, with Add to Basket per column. The
  selection lives in `?compare=id1,id2`, so it is server-rendered, shareable and works with the
  back button and with JavaScript disabled.
- **Natural-language search** (header box) — "cheap running shoes under £50" is sent to
  `claude-opus-5`, which returns only `{category, maxPrice, keywords, inStockOnly}`. That is
  validated against the real catalogue and mapped onto the same URL filters as the sidebar;
  the filtering itself stays server-side. What it understood appears above the results as
  removable chips. A 3-second timeout or any API failure silently falls back to plain text
  search. Needs `ANTHROPIC_API_KEY` (see `.env.example`); without it, search is plain text.
- **Checkout** (`/checkout`) — address with server-side UK postcode validation, standard or
  express delivery (express adds £4.99), mock card with a Luhn check. Totals are re-resolved from
  the catalogue at the moment the order is placed.
- **Orders** (`/orders`, `/orders/[id]`) — a confirmation with order number, items at the price
  paid, address and estimated arrival. An order is a snapshot of prices paid, so catalogue
  changes cannot rewrite it.
  Every internal link on the site returns 200; links to pages that did not exist were deleted rather than stubbed.
- **Agent capture.** Every prompt and final response is logged automatically to
  `.agent-logs/` via Claude Code hooks — see [CAPTURE-TEST.md](CAPTURE-TEST.md).

---

## What I deliberately left out

_Things that are absent on purpose, not by oversight. Reasons matter more than the list._

- **Real payments and accounts.** Checkout is real end to end, but the card is mocked (Luhn
  checked, never stored beyond the last four digits) and there is no sign-in.
- **A server-side order store.** Orders live in a browser cookie. That keeps the build free of
  infrastructure but caps history at the most recent few orders.
- **Sorting and pagination.** Filtering is built; results are not yet sortable or paged (the
  catalogue is 120 products).
- **Persistence beyond a cookie.** Deliberate: the basket survives refresh on one device
  and nothing more.

---

## Trade-offs

_Decisions with a real cost, and why the cost was worth paying._

- **Scaffolded into a temp directory, then merged in.** `create-next-app` refuses to run
  in a non-empty directory and ships its own `.gitignore`. Running it in place would have
  risked `.claude/`, `.agent-logs/` and `CAPTURE-TEST.md`. Cost: a manual `.gitignore`
  merge. Benefit: the capture log could not be clobbered, and that was verified by
  checksumming those paths before and after the merge.
- **Next.js 16, upgraded from 14 before any feature was written.** The scaffold was
  created on Next 14.2.35, which is the newest 14.x but still carries 5 advisories, one of
  them critical: unauthenticated RCE in the Image Optimization API via AVIF files. This is a
  storefront, so image optimization is squarely on the critical path — the advisory would
  have sat under every product image in the build.

  Those fixes exist only in later majors. Next 15.5.25 clears the critical RCE but still
  audits at 1 moderate (`next`) plus 1 high (`postcss`), and npm reports `fixAvailable:
  next@16.3.5` for both — so 15 was a partial fix, not a fix. Next 16.3.5 audits completely
  clean.

  Cost: two majors of breaking changes absorbed at once, and React 19. Paid deliberately
  while the surface area was a placeholder page and one route handler — the cheapest moment
  it will ever be. Verified after upgrade: `npm audit` reports 0 vulnerabilities, `npm run
  lint` and `npm run build` pass, and `/api/health` still returns `{"status":"ok"}`.
- TBD — add trade-offs as they are made.

---

## With more time

_The honest backlog._

- TBD — what would be built next, in priority order.
- TBD — what would be hardened (tests, error states, accessibility, performance).

---

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
curl localhost:3000/api/health   # {"status":"ok"}
```

```bash
npm run build        # production build
npm run lint         # eslint
```
