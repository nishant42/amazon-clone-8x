import { cookies } from "next/headers";
import { ORDERS_COOKIE, parseOrders, type Order } from "@/lib/orders-core";

export * from "@/lib/orders-core";

/** Orders are a snapshot stored in this browser, newest first. */
export async function readOrders(): Promise<Order[]> {
  const store = await cookies();
  return parseOrders(store.get(ORDERS_COOKIE)?.value).orders;
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return (await readOrders()).find((o) => o.id === id);
}
