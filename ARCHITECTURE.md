# Architecture

A reference to check work against. If the code and this file disagree, one of them is a bug.

**Assumed scope** (not yet confirmed): a storefront — browse, search, product detail, cart.
No accounts, no checkout, no payments. Everything below is sized for that and no more.

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

type CartLine = { productId: string; qty: number };   // ids and quantities ONLY
type Cart = { lines: CartLine[] };
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
  page.tsx                    product grid
  search/page.tsx             ?q= &category=
  product/[slug]/page.tsx     product detail
  cart/page.tsx               basket
  orders/page.tsx             placeholder empty state
  info/[topic]/page.tsx       placeholder behind the secondary nav
  api/health/route.ts
components/ui/                presentational, props only
  SiteHeader.tsx  ProductCard.tsx  Stars.tsx
components/product/           client island: gallery + buy box
components/cart/              client island
lib/
  data/products.ts            seed catalogue + async access seam
  data/search.ts              tokenised, punctuation-normalised matching
  basket-core.ts              pure basket rules, no Next imports (testable)
  basket.ts                   cookie read + server-side price resolution
  basket-actions.ts           "use server" mutations
  money.ts                    minor-unit formatting
  images.ts                   derived gallery images
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
`components/cart/` and `components/product/` (gallery swap, colour/size/quantity). Reversing
means rewriting every component's data flow, not just adding a directive.
*Widened once, deliberately:* this originally said the cart was the only island. Thumbnail
swapping and variant pickers are genuinely interactive, so `components/product/` was added
rather than faking interactivity server-side.
*Check:* `grep -rln '^"use client"' app components 2>/dev/null` lists only files under
`components/cart/` or `components/product/`. (Anchored to line start: unanchored it matches
the string inside a comment.)

**3. All data access goes through async functions in `lib/data/`.**
They hold the seed catalogue today and can read a database or API later with no call-site changes —
but only if they are async *now*. Making them sync and awaiting later is a rewrite of every
caller.
*Check:* `grep -rn "getProducts\|getProductBySlug" components 2>/dev/null` stays empty — no
component fetches. Every exported function in `lib/data/` returns a Promise.

**4. Catalog state (query, sort, page, filters) lives in the URL, not React state.**
Search results must be linkable, shareable, and server-renderable. Retrofitting URL state onto
client state means rebuilding navigation and pagination.
*Check:* search/listing components read `searchParams`; no `useState` holds a query, sort or
page value.

## Deliberately deferred

Accounts, checkout, payments, real inventory, i18n, and a database. Adding any of these is
additive against the seams above — none requires reversing a decision on this page.
