import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatUkDate } from "@/lib/dates";
import { formatGBP } from "@/lib/money";
import { DELIVERY, getOrder } from "@/lib/orders";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Order ${id} | amazon.co.uk clone` };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const option = DELIVERY[order.delivery];

  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto max-w-[1000px] space-y-4 px-3 py-4">
        <section className="rounded-[8px] border-l-4 border-[#067D62] bg-white p-5">
          <p className="text-[18px] font-bold text-[#067D62]">✓ Order placed, thank you!</p>
          <p className="mt-1 text-[14px] text-amazon-text">
            Confirmation will be sent to your email. Order number{" "}
            <span className="font-bold">{order.id}</span>
          </p>
          <p className="mt-3 text-[16px] text-amazon-text">
            Arriving <span className="font-bold">{formatUkDate(order.etaISO, true)}</span>
            <span className="text-[#565959]"> · {option.label}</span>
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-[8px] bg-white p-5">
            <h1 className="text-[18px] font-bold text-amazon-text">Items in this order</h1>
            <ul className="mt-3 divide-y divide-[#e7e7e7]">
              {order.lines.map((line) => (
                <li
                  key={`${line.productId}|${line.colour ?? ""}|${line.size ?? ""}`}
                  className="flex gap-3 py-3"
                >
                  <span className="relative h-16 w-16 shrink-0">
                    <Image src={line.image} alt="" fill sizes="64px" className="object-contain" />
                  </span>
                  <div className="min-w-0 flex-1 text-[14px] text-amazon-text">
                    <p className="line-clamp-2">{line.title}</p>
                    <p className="text-[12px] text-[#565959]">
                      Qty {line.qty}
                      {line.colour ? ` · ${line.colour}` : ""}
                      {line.size ? ` · ${line.size}` : ""}
                    </p>
                    <p className="text-[12px] text-[#565959]">
                      {formatGBP(line.unitPriceMinor)} each, as paid
                    </p>
                  </div>
                  <p className="shrink-0 text-[14px] font-bold text-amazon-text">
                    {formatGBP(line.unitPriceMinor * line.qty)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <aside className="h-fit space-y-4 rounded-[8px] bg-white p-5 text-[14px] text-amazon-text">
            <div>
              <h2 className="font-bold">Delivery address</h2>
              <address className="mt-1 not-italic leading-snug">
                {order.address.name}
                <br />
                {order.address.line1}
                {order.address.line2 ? (
                  <>
                    <br />
                    {order.address.line2}
                  </>
                ) : null}
                <br />
                {order.address.city}
                <br />
                {order.address.postcode}
                {order.address.phone ? (
                  <>
                    <br />
                    {order.address.phone}
                  </>
                ) : null}
              </address>
            </div>

            <div>
              <h2 className="font-bold">Payment</h2>
              <p className="mt-1">Card ending in {order.cardLast4}</p>
            </div>

            <dl className="space-y-1 border-t border-[#e7e7e7] pt-3">
              <div className="flex justify-between">
                <dt>Items:</dt>
                <dd>{formatGBP(order.itemsSubtotalMinor)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Delivery:</dt>
                <dd>{order.deliveryMinor === 0 ? "FREE" : formatGBP(order.deliveryMinor)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#e7e7e7] pt-2 font-bold">
                <dt>Order total:</dt>
                <dd>{formatGBP(order.totalMinor)}</dd>
              </div>
            </dl>
            <p className="text-[12px] text-[#565959]">
              Placed {formatUkDate(order.placedAt)}
            </p>
          </aside>
        </div>

        <p className="flex flex-wrap gap-4 text-[14px]">
          <Link href="/" className="text-amazon-link hover:text-[#C7511F] hover:underline">
            Continue shopping
          </Link>
          <Link href="/orders" className="text-amazon-link hover:text-[#C7511F] hover:underline">
            View all orders
          </Link>
        </p>
      </div>
    </main>
  );
}
