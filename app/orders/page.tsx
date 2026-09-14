import Image from "next/image";
import Link from "next/link";
import { formatUkDate } from "@/lib/dates";
import { formatGBP } from "@/lib/money";
import { readOrders } from "@/lib/orders";

export const metadata = { title: "Your Orders | amazon.co.uk clone" };

export default async function OrdersPage() {
  const orders = await readOrders();

  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto max-w-[1000px] px-3 py-4">
        <h1 className="text-[28px] font-medium text-amazon-text">Your Orders</h1>
        <p className="mt-1 text-[13px] text-[#565959]">
          {orders.length === 0
            ? "No orders yet"
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"} placed in this browser`}
        </p>
        {orders.length > 0 ? (
          <p className="mt-1 text-[12px] text-[#565959]">
            This demo stores orders in a browser cookie, so only your most recent few are kept.
          </p>
        ) : null}

        {orders.length === 0 ? (
          <div className="mt-4 rounded-[8px] bg-white py-12 text-center">
            <p className="text-[18px] font-bold text-amazon-text">You have not placed any orders</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-[#565959]">
              Orders you place appear here, newest first.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-[20px] bg-amazon-orange px-6 py-2 text-[14px] font-medium text-amazon-text hover:brightness-95"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="overflow-hidden rounded-[8px] border border-[#d5d9d9] bg-white">
                <div className="flex flex-wrap gap-x-8 gap-y-2 bg-[#f0f2f2] px-5 py-3 text-[12px] text-[#565959]">
                  <div>
                    <p className="uppercase">Order placed</p>
                    <p className="text-[14px] text-amazon-text">{formatUkDate(order.placedAt)}</p>
                  </div>
                  <div>
                    <p className="uppercase">Total</p>
                    <p className="text-[14px] text-amazon-text">{formatGBP(order.totalMinor)}</p>
                  </div>
                  <div>
                    <p className="uppercase">Dispatch to</p>
                    <p className="text-[14px] text-amazon-text">{order.address.name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="uppercase">Order # {order.id}</p>
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-[14px] text-amazon-link hover:text-[#C7511F] hover:underline"
                    >
                      View order details
                    </Link>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[16px] font-bold text-amazon-text">
                    Arriving {formatUkDate(order.etaISO, true)}
                  </p>
                  <ul className="mt-3 space-y-3">
                    {order.lines.map((line) => (
                      <li
                        key={`${line.productId}|${line.colour ?? ""}|${line.size ?? ""}`}
                        className="flex items-center gap-3 text-[14px] text-amazon-text"
                      >
                        <span className="relative h-14 w-14 shrink-0">
                          <Image src={line.image} alt="" fill sizes="56px" className="object-contain" />
                        </span>
                        <span className="min-w-0 flex-1 line-clamp-2">{line.title}</span>
                        <span className="shrink-0 text-[#565959]">×{line.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
