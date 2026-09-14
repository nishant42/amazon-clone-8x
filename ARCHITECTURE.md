# Architecture

A reference to check work against. If the code and this file disagree, one of them is a bug.

**Scope:** a storefront — browse, search, product detail, basket, checkout and order history.
No accounts, no real payments (the card is mocked), no server-side storage. Everything below is
sized for that and no more.

## Data shape

```ts
type Category = "Clothing" | "Electronics" | "Home & Kitchen" | "Books" | "Beauty" | "Sports";

type Product = {
  id: string;
  slug: string;              // URL identity: /product/levis-511-slim-fit-jeans
  title: string;
  brand: string;
  category: Category;
  subcategory: string;
  priceMinor: number;        // pence. 1499 = £14.99. Never a float.
  wasPriceMinor?: number;    // present ONLY when discounted; always > priceMinor
  currency: "GBP";
  rating: number;            // 3.4–4.8, one decimal
  reviewCount: number;
  image: string;            // primary, used on cards (= images[0])
  images: string[];         // gallery, 1-4, all the same subject
  isPrime: boolean;
  deliveryDays: number;
  stock: number;             // 0 means out of stock
  colours?: string[];        // Clothing only
  sizes?: string[];          // Clothing only
  description: string;
  bullets: string[];
};

type BasketLine = { productId: string; qty: number; colour?: string; size?: string };
type Basket = { v: 1; lines: BasketLine[] };        // ids, quantities, variants ONLY

type OrderLine = { productId: string; title: string; image: string; qty: number;
                   unitPriceMinor: number;           // price PAID, frozen at placement
                   colour?: string; size?: string };
type Order = { id: string; placedAt: string; lines: OrderLine[];
               itemsSubtotalMinor: number; deliveryMinor: number; totalMinor: number;
               address: Address; delivery: "standard" | "express";
               cardLast4: string; etaISO: string };
```

Every field a filter predicates on — `category`, `brand`, `priceMinor`, `rating`,
`deliveryDays`, `isPrime`, `stock` — is a flat top-level scalar. No nested objects to walk,
so the filter engine can build predicates directly off this shape without reshaping it.

The cart deliberately stores no prices, titles or images. Those are re-resolved server-side
on every render, so a stale or tampered cookie can never set a price.

## Folder structure

```
app/
  layout.tsx                  renders SiteHeader
  page.tsx                    unfiltered listing (same view as /search)
  search/page.tsx             filtered listing; redirects to canonical URL
  product/[slug]/page.tsx     product detail
  cart/page.tsx               basket
  checkout/page.tsx           address, delivery, mock payment
  orders/page.tsx             order history
  orders/[id]/page.tsx        order confirmation
  api/health/route.ts
components/ui/                presentational, props only
  SiteHeader.tsx  ProductCard.tsx  Stars.tsx
  ListingView.tsx  FilterSidebar.tsx   filters are links + one GET form, no JS
components/product/           client island: gallery + buy box
components/cart/              client island
components/checkout/          client island: checkout form
lib/
  data/products.ts            seed catalogue + async access seam
  data/search.ts              async seam: queryProducts(query)
  listing-core.ts             pure: parse params, filter, facet counts, canonical URLs
  ai-search-core.ts           pure: prompt, validate model output, text fallback
  ai-search.ts                server-only: the one module that calls the Anthropic API
  basket-core.ts              pure basket rules, no Next imports (testable)
  basket.ts                   cookie read + server-side price resolution
  basket-actions.ts           "use server" mutations
  orders-core.ts              pure checkout rules: postcode, Luhn, totals, snapshot
  orders.ts                   orders cookie read
  checkout-actions.ts         placeOrder server action
  money.ts                    minor-unit formatting
  images.ts                   gallery image accessor
.claude/  .agent-logs/        capture hook + logs (ship with the repo)
```

Rule: components take data as props and never fetch. Only pages and route handlers call
`lib/data/*`. Type-only imports from `lib/data/products` are fine.

## Decisions expensive to reverse

**1. Money is an integer in minor units, never a float.**
Floats produce 19.989999 in totals and rounding disputes at the line-vs-cart level. Reversing
later means migrating fixture data *and* touching every display and arithmetic site at once.
*Check:* no price ever hits `parseFloat`, and formatting happens only in `lib/money.ts`.
`grep -rn "toFixed\|parseFloat" app components lib 2>/dev/null | grep -i price` stays empty.

**2. Server Components by default; client islands are named and contained.**
Pages render on the server and ship no JS for *data*. Interaction islands are confined to
`components/cart/`, `components/product/` (gallery swap, colour/size/quantity) and
`components/checkout/` (form state and live delivery total). Reversing
means rewriting every component's data flow, not just adding a directive.
*Widened once, deliberately:* this originally said the cart was the only island. Thumbnail
swapping and variant pickers are genuinely interactive, so `components/product/` was added
rather than faking interactivity server-side. `components/checkout/` was added for the same
reason: `useActionState` field errors and a delivery total that updates as you choose.
*Check:* `grep -rln '^"use client"' app components 2>/dev/null` lists only files under
`components/cart/`, `components/product/` or `components/checkout/`. (Anchored to line
start: unanchored, it matches the string inside a comment.)

**3. All data access goes through async functions in `lib/data/`.**
They hold the seed catalogue today and can read a database or API later with no call-site changes —
but only if they are async *now*. Making them sync and awaiting later is a rewrite of every
caller.
*Check:* `grep -rn "getProducts\|getProductBySlug" components 2>/dev/null` stays empty — no
component fetches. Every exported function in `lib/data/` returns a Promise.

**4. Catalog state (query, sort, page, filters) lives in the URL, not React state.**
Search results must be linkable, shareable, and server-renderable. Retrofitting URL state onto
client state means rebuilding navigation and pagination.
Filters are `q`, `category`, `sub`, `minPrice`, `maxPrice`, `inStock=1`. There is exactly one
encoding: `parseListingParams` turns untrusted params into a valid query (unknown categories,
a subcategory from another category and malformed prices are dropped), and `listingHref`
serialises it with a fixed key order. `/search` redirects any non-canonical URL to that form,
so two URLs never mean the same result set. Prices travel as whole pounds (`maxPrice=50`) for
readable links and become pence the moment they are parsed (decision 1).
*Check:* `grep -rn "useState" components/ui 2>/dev/null` stays empty — listing, sidebar and
chips hold no state; every filter is a link or a GET form.

**5. An order is a snapshot; the basket is not.**
The basket stores ids and re-resolves prices every render. An order stores the price paid on
each line and never reads the catalogue again, so a later price change cannot rewrite history.
Prices are re-resolved once, server-side, at the moment `placeOrder` runs — not taken from the
summary the customer was looking at. Merging these two models later would mean migrating every
stored order.
*Check:* `grep -n "priceMinor" app/orders` stays empty — order pages read `unitPriceMinor`
from the snapshot, never the catalogue price.

**6. Orders live in a browser cookie, and the bounds are accepted, not accidental.**
*Why a cookie:* this build has no server-side storage, and adding a database or KV store only
to hold demo orders would be infrastructure out of proportion to the scope. The cookie is
`httpOnly`, versioned (`v: 1`) and defensively parsed, like the basket, so a stale or tampered
value yields an empty history instead of a crash.
*What it costs:* browsers cap a cookie at ~4096 bytes, and the value is URL-encoded on the wire.
Against a 3800-byte encoded budget, measured:

| Order size | Encoded | History kept |
|---|---|---|
| 1 line | 843 B | 4 orders |
| 2 lines | 1158 B | 3 orders |
| 3 lines | 1473 B | 2 orders |

So in practice **the most recent 2–3 orders**, never more than `MAX_ORDERS = 5`, and **one
order can hold at most 10 distinct lines**. Orders are per-browser: clearing cookies or
switching device loses them. Older orders are evicted newest-first to make room; an order too
large to store is refused *before* anything is written or the basket is cleared, with a message
to the customer. `/orders` states the limit on the page.
*Migration path if it ever needs to grow:* storage is touched in exactly two places — the read
in `lib/orders.ts` and the write in `placeOrder` in `lib/checkout-actions.ts`. `orders-core.ts`
(validation, totals, the `Order` snapshot shape) has no storage dependency and does not change.
To move to a server store: give each browser an anonymous customer id in a cookie; swap those
two touchpoints for reads/writes keyed by that id; on first read, import any orders still in
the legacy `orders` cookie through `parseOrders` and then delete it. The size caps
(`MAX_ORDERS`, `MAX_COOKIE_VALUE_BYTES`, `orderFitsInCookie`) exist only because of the cookie
and are removed with it. Nothing on the pages changes, because they already consume `Order`.
*Check:* `grep -rn "ORDERS_COOKIE" lib app 2>/dev/null | grep -v orders-core` lists only
`lib/orders.ts` and `lib/checkout-actions.ts`. If a third file appears, the migration path above
has grown and this entry needs updating.

**7. The model turns a sentence into filters; it never filters.**
The header box sends `ask=<sentence>`. `/search` passes it to `interpretSearch`, which asks
`claude-opus-5` (effort `low`) for exactly `{category, maxPrice, keywords, inStockOnly}` via
structured outputs. That output is untrusted: `validateInterpretation` drops a department not in
`CATEGORIES`, a non-positive or absurd price, and any keyword no product contains, then maps the
rest onto the decision-4 params and redirects there with `from=<sentence>` for display. From that
point filtering, chips, back button and sharing are exactly the click-filter path, and no link
carries `ask`, so refining, going back or opening a shared link never calls the model again.
*Bounds:* 3 s hard timeout with SDK retries off (the SDK retries timeouts by default, which would
turn 3 s into ~9 s). Any failure - no key, timeout, 4xx/5xx, refusal, truncated or non-JSON
output - silently redirects to plain text search with no `from`, so the page never claims to have
understood anything; the reason is logged server-side only. Refusal fallback is enabled
(`fallbacks: "default"`), though a server-side re-run rarely fits inside 3 s. Every header search
costs one Opus 5 call. The first request after a schema change pays a one-time schema-compilation
delay that may exceed 3 s and fall back once.
*Check:* `grep -rln "@anthropic-ai/sdk" app components lib | grep -v "lib/ai-search.ts"` stays
empty - one module owns the API, and it imports `server-only`.

## Caught before shipping

**The order cookie size cap measured the wrong thing.** The first version of `addOrder` capped
history by `JSON.stringify(...).length <= 3500`. But cookie values are URL-encoded when set —
every `"` becomes `%22` and so on — which inflates a real order about 1.52×. An 11-line order is
2681 B as raw JSON, comfortably under the old cap, and 3995 B once encoded, over the budget. The
browser would have silently declined to store it: `placeOrder` would have cleared the basket and
redirected to `/orders/[id]`, and that page would have 404ed, with no error anywhere. Found by
measuring the encoded size in a test before the checkout commit, not by a user.
*Fix:* every size limit goes through `encodedSize()` (`encodeURIComponent(JSON.stringify(v))`),
and `orderFitsInCookie()` is checked before any write.
*Check:* `grep -c "JSON.stringify" lib/orders-core.ts` is `1` — the only call is inside
`encodedSize()`. A second call is a raw-size comparison creeping back in.

**The AI search fallback returned nothing for the demo sentence.** The fallback keeps only words
that appear somewhere in the catalogue, then requires every word to match. For "cheap running
shoes under £50", `under` survived (it occurs in "Under Armour" and "underwear") and `50` survived
inside a product title, so the fallback searched `running shoes under 50` and found zero products -
a silent empty page, the exact failure the fallback exists to prevent. Found by the pure tests
before any browser run.
*Fix:* `fallbackQuery` strips price expressions and a fixed list of search filler words before the
catalogue check; "under armour hoodie" still finds the hoodie via `armour hoodie`.
*Check:* the fallback for "cheap running shoes under £50" is `q=running shoes` with results.

## Deliberately deferred

Accounts, real payments, real inventory, i18n, and a server-side order store (see decision 6
for why and how it would be added). Each is additive against the seams above — none requires
reversing a decision on this page.
