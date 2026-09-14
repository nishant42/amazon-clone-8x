/**
 * Placeholder home page.
 *
 * Deliberately minimal: this exists to prove the scaffold, the theme tokens and
 * the deployment pipeline work before any real feature is built. It renders each
 * theme token so a visual regression in the Tailwind config is obvious at a glance.
 */

const tokens = [
  { name: "amazon-dark", hex: "#131921", className: "bg-amazon-dark" },
  { name: "amazon-light", hex: "#232F3E", className: "bg-amazon-light" },
  { name: "amazon-orange", hex: "#FEBD69", className: "bg-amazon-orange" },
  { name: "amazon-link", hex: "#007185", className: "bg-amazon-link" },
  { name: "amazon-star", hex: "#FFA41C", className: "bg-amazon-star" },
  { name: "amazon-badge", hex: "#CC0C39", className: "bg-amazon-badge" },
  { name: "amazon-text", hex: "#0F1111", className: "bg-amazon-text" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="bg-amazon-dark px-6 py-4">
        <p className="text-lg font-bold text-white">
          amazon<span className="text-amazon-orange">.clone</span>
        </p>
      </header>

      <div className="bg-amazon-light px-6 py-2">
        <p className="text-sm text-white">All · Today&rsquo;s Deals · Returns &amp; Orders</p>
      </div>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-amazon-text">Scaffold is live.</h1>
        <p className="mt-3 text-amazon-text">
          Next.js 14 (App Router) · TypeScript · Tailwind. No features yet &mdash; this page
          exists to prove the build and deploy pipeline before any product code lands.
        </p>

        <p className="mt-4">
          <a className="text-amazon-link hover:underline" href="/api/health">
            /api/health
          </a>
          <span className="ml-2 rounded bg-amazon-badge px-2 py-0.5 text-xs font-bold text-white">
            health check
          </span>
        </p>

        <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-amazon-text">
          Theme tokens
        </h2>
        <ul className="mt-4 space-y-2">
          {tokens.map((token) => (
            <li key={token.name} className="flex items-center gap-3">
              <span
                className={`${token.className} h-8 w-8 rounded border border-black/10`}
                aria-hidden="true"
              />
              <code className="text-sm text-amazon-text">{token.name}</code>
              <span className="text-sm text-amazon-text/60">{token.hex}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
