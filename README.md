# amazon-clone-8x

An Amazon storefront clone, built for the 8x assignment.

**Live:** _pending first deploy — filled in below once Vercel is connected_
**Stack:** Next.js 16.3.5 (App Router) · React 19.3.0 · TypeScript · Tailwind CSS 3 · deployed on Vercel

> **Status: scaffold only.** No product features exist yet. The deployment pipeline was
> proven first, deliberately, so that every feature after this ships to a URL that is
> already known to work.

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
- **Agent capture.** Every prompt and final response is logged automatically to
  `.agent-logs/` via Claude Code hooks — see [CAPTURE-TEST.md](CAPTURE-TEST.md).

---

## What I deliberately left out

_Things that are absent on purpose, not by oversight. Reasons matter more than the list._

- **Features, for now.** Deployment was proven before any feature existed, so that a
  broken deploy could never be confused with a broken feature.
- TBD — add each omission with its reason as the build progresses.

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
