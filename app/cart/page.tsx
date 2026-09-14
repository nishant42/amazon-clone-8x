import Image from "next/image";
import Link from "next/link";
import { QuantitySelect } from "@/components/cart/QuantitySelect";
import { resolveBasket } from "@/lib/basket";
import { removeLine } from "@/lib/basket-actions";
import { formatGBP } from "@/lib/money";

export const metadata = { title: "Shopping Basket | amazon.co.uk clone" };

function EmptyBasket() {
  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto max-w-[1000px] px-3 py-4">
        <div className="rounded-[4px] bg-white p-8 text-center sm:p-12">
          <h1 className="text-[28px] font-bold text-amazon-text">
            Your Amazon Basket is empty
          </h1>
          <p className="mt-2 text-[14px] text-[#565959]">
            Nothing here yet. Items you add will be kept on this device.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-[20px] bg-amazon-orange px-6 py-2 text-[14px] font-medium text-amazon-text hover:brightness-95"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function CartPage() {
  // Prices are re-resolved from the catalogue here on every render. Nothing
  // priced comes out of the cookie.
  const { lines, subtotalMinor, itemCount } = await resolveBasket();

  if (lines.length === 0) return <EmptyBasket />;

  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto grid max-w-[1500px] gap-4 px-3 py-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-[4px] bg-white p-4">
          <h1 className="text-[28px] font-medium text-amazon-text">Shopping Basket</h1>
          <hr className="my-3 border-[#e7e7e7]" />

          <ul>
            {lines.map(({ key, line, product, lineTotalMinor }) => (
              <li
                key={key}
                className="flex gap-4 border-b border-[#e7e7e7] py-4 last:border-b-0"
              >
                <Link
                  href={`/product/${product.slug}`}
                  className="relative h-[120px] w-[120px] shrink-0"
                >
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="120px"
                    className="object-contain"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${product.slug}`}
                    className="text-[18px] leading-snug text-amazon-text hover:text-[#C7511F]"
                  >
                    {product.title}
                  </Link>
                  <p className="mt-1 text-[12px] text-[#565959]">{product.brand}</p>
                  <p
                    className={`mt-1 text-[12px] ${
                      product.stock > 0 ? "text-[#007600]" : "text-amazon-badge"
                    }`}
                  >
                    {product.stock > 0 ? "In stock" : "Currently unavailable"}
                  </p>

                  {line.colour || line.size ? (
                    <p className="mt-1 text-[12px] text-[#565959]">
                      {line.colour ? <>Colour: {line.colour}</> : null}
                      {line.colour && line.size ? " · " : null}
                      {line.size ? <>Size: {line.size}</> : null}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <QuantitySelect
                      itemKey={key}
                      qty={line.qty}
                      max={Math.min(product.stock, 10)}
                    />
                    <form action={removeLine}>
                      <input type="hidden" name="key" value={key} />
                      <button
                        type="submit"
                        className="text-[13px] text-amazon-link hover:text-[#C7511F] hover:underline"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[18px] font-bold text-amazon-text">
                    {formatGBP(lineTotalMinor)}
                  </p>
                  {line.qty > 1 ? (
                    <p className="text-[12px] text-[#565959]">
                      {formatGBP(product.priceMinor)} each
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-right text-[18px] text-amazon-text">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"}):{" "}
            <span className="font-bold">{formatGBP(subtotalMinor)}</span>
          </p>
        </section>

        <aside className="h-fit rounded-[4px] bg-white p-4">
          <p className="text-[18px] text-amazon-text">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"}):{" "}
            <span className="font-bold">{formatGBP(subtotalMinor)}</span>
          </p>
          <Link
            href="/checkout"
            className="mt-3 block w-full rounded-[20px] bg-amazon-orange py-2 text-center text-[14px] font-medium text-amazon-text hover:brightness-95"
          >
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </main>
  );
}
