# Architecture

A reference to check work against. If the code and this file disagree, one of them is a bug.

**Assumed scope** (not yet confirmed): a storefront — browse, search, product detail, cart.
No accounts, no checkout, no payments. Everything below is sized for that and no more.

## Data shape

```ts
type Money = { amountMinor: number; currency: "USD" };  // 1999 = $19.99

type Image = { url: string; alt: string; width: number; height: number };

type Product = {
  id: string;              // stable, never displayed
  slug: string;            // URL identity: /product/echo-dot-5th-gen
  title: string;
  brand: string;
  categoryId: string;
  price: Money;
  listPrice?: Money;       // present only when discounted; drives strike-through
  images: Image[];         // images[0] is the primary; never empty
  rating: { average: number; count: number };  // average 0–5, count 0 means unrated
  inStock: boolean;
  primeEligible: boolean;
  bullets: string[];       // feature list on the product page
};

type Category = { id: string; slug: string; name: string; parentId: string | null };

type CartLine = { productId: string; qty: number };   // ids and quantities ONLY
type Cart = { lines: CartLine[] };
```

The cart deliberately stores no prices, titles or images. Those are re-resolved server-side
on every render, so a stale or tampered cookie can never set a price.

## Folder structure

```
app/
  layout.tsx
  page.tsx                    home
  search/page.tsx             ?q= &sort= &page=
  product/[slug]/page.tsx     product detail
  cart/page.tsx
  api/health/route.ts
components/
  ui/                         presentational only, no data access
  cart/                       the one client island
lib/
  data/products.ts            async repository seam
  data/categories.ts
  money.ts                    minor-unit formatting
  cart.ts                     cookie read/write
fixtures/products.json        stand-in data source
.claude/  .agent-logs/        capture hook + logs (ship with the repo)
```

Rule: `components/` never imports from `fixtures/`. Data enters through `lib/data/` only.

## Decisions expensive to reverse

**1. Money is an integer in minor units, never a float.**
Floats produce 19.989999 in totals and rounding disputes at the line-vs-cart level. Reversing
later means migrating fixture data *and* touching every display and arithmetic site at once.
*Check:* no price ever hits `parseFloat`, and formatting happens only in `lib/money.ts`.
`grep -rn "toFixed\|parseFloat" app components lib 2>/dev/null | grep -i price` stays empty.

**2. Server Components by default; the cart is the only client island.**
Product and search pages render on the server and ship no JS for data. Reversing means
rewriting every component's data flow, not just adding a directive.
*Check:* `grep -rln '"use client"' app components 2>/dev/null` lists only files under `components/cart/`.

**3. All data access goes through async functions in `lib/data/`.**
They read `fixtures/` today and can read a database or API later with no call-site changes —
but only if they are async *now*. Making them sync and awaiting later is a rewrite of every
caller.
*Check:* `grep -rn "fixtures/" app components lib 2>/dev/null | grep -v "^lib/data/"` stays empty,
and every exported function in `lib/data/` returns a Promise.

**4. Catalog state (query, sort, page, filters) lives in the URL, not React state.**
Search results must be linkable, shareable, and server-renderable. Retrofitting URL state onto
client state means rebuilding navigation and pagination.
*Check:* search/listing components read `searchParams`; no `useState` holds a query, sort or
page value.

## Deliberately deferred

Accounts, checkout, payments, real inventory, i18n, and a database. Adding any of these is
additive against the seams above — none requires reversing a decision on this page.
