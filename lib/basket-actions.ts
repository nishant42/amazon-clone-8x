"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BASKET_COOKIE,
  MAX_QTY,
  applyAdd,
  applyRemove,
  applySetQty,
  parseBasket,
  type Basket,
  type BasketLine,
} from "@/lib/basket-core";

async function load(): Promise<Basket> {
  const store = await cookies();
  return parseBasket(store.get(BASKET_COOKIE)?.value);
}

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
  await save(applyAdd(await load(), incoming));
  // Without this the page looks unchanged after clicking - the only visible
  // effect was a small digit in the header - so the add read as broken even
  // though it had worked. amazon.co.uk goes to the basket too.
  redirect("/cart");
}

export async function setLineQty(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  if (!key) return;
  await save(applySetQty(await load(), key, Number(formData.get("qty") ?? 0)));
}

/**
 * Same mutation, called directly rather than through a form.
 *
 * React 19 resets a form once its action resolves, which snapped the quantity
 * <select> back to its first option ("0 (Delete)") and left the control
 * disagreeing with the subtotal. Calling the action from a transition avoids
 * the form lifecycle entirely.
 */
export async function setLineQtyValue(key: string, qty: number) {
  if (!key) return;
  await save(applySetQty(await load(), key, qty));
}

export async function removeLine(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  if (!key) return;
  await save(applyRemove(await load(), key));
}
