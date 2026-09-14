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
- **Search** (`/search?q=`) — matches title, brand, category and subcategory. Tokenised
  and punctuation-normalised, so `levis` finds `Levi's`. Empty results get a real state.
- **Basket** (`/cart`) — quantity and remove, subtotal computed server-side from prices
  re-resolved out of the catalogue. Persists in a versioned `httpOnly` cookie that stores
  only ids, quantities and variants — never a price.
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
- **A filter engine.** The data is shaped for it — every filterable field is a flat
  top-level scalar — but sorting and faceting are not built.
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
