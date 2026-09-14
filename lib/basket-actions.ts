"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  BASKET_COOKIE,
  BASKET_VERSION,
  MAX_QTY,
  lineKey,
  parseBasket,
  type Basket,
  type BasketLine,
} from "@/lib/basket";

async function save(basket: Basket) {
  const store = await cookies();
  store.set(BASKET_COOKIE, JSON.stringify(basket), {
    httpOnly: true, // mutations only ever happen through these actions
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  // The header shows a basket count, so the layout has to re-render too.
  revalidatePath("/", "layout");
}

async function current(): Promise<Basket> {
  const store = await cookies();
  return parseBasket(store.get(BASKET_COOKIE)?.value);
}

function readLine(formData: FormData): BasketLine | null {
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return null;
  const qty = Number(formData.get("qty") ?? 1);
  const colour = String(formData.get("colour") ?? "");
  const size = String(formData.get("size") ?? "");
  return {
    productId,
    qty: Number.isInteger(qty) && qty > 0 ? Math.min(qty, MAX_QTY) : 1,
    colour: colour || undefined,
    size: size || undefined,
  };
}

export async function addToBasket(formData: FormData) {
  const incoming = readLine(formData);
  if (!incoming) return;

  const basket = await current();
  const key = lineKey(incoming);
  const existing = basket.lines.find((l) => lineKey(l) === key);

  if (existing) {
    existing.qty = Math.min(existing.qty + incoming.qty, MAX_QTY);
  } else {
    basket.lines.push(incoming);
  }
  await save({ v: BASKET_VERSION, lines: basket.lines });
}

export async function setLineQty(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  if (!key) return;

  const basket = await current();
  const lines =
    Number.isInteger(qty) && qty > 0
      ? basket.lines.map((l) =>
          lineKey(l) === key ? { ...l, qty: Math.min(qty, MAX_QTY) } : l,
        )
      : basket.lines.filter((l) => lineKey(l) !== key); // qty 0 removes the line
  await save({ v: BASKET_VERSION, lines });
}

export async function removeLine(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  if (!key) return;
  const basket = await current();
  await save({
    v: BASKET_VERSION,
    lines: basket.lines.filter((l) => lineKey(l) !== key),
  });
}
