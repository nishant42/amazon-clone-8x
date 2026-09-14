"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BASKET_COOKIE, resolveBasket } from "@/lib/basket";
import {
  ORDERS_COOKIE,
  addOrder,
  buildOrder,
  makeOrderId,
  orderFitsInCookie,
  parseOrders,
  validateCheckout,
  type CheckoutInput,
  type FieldErrors,
  type OrderLine,
} from "@/lib/orders-core";

export type CheckoutState = {
  /** Increments per submission so the form can remount with returned values. */
  submission: number;
  errors: FieldErrors;
  formError?: string;
  /** Echoed back so a validation error does not wipe what was typed. Card
   *  number and security code are deliberately NOT echoed into the page. */
  values: Partial<CheckoutInput>;
};

function field(formData: FormData, name: keyof CheckoutInput): string {
  return String(formData.get(name) ?? "");
}

export async function placeOrder(
  prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const input: CheckoutInput = {
    name: field(formData, "name"),
    line1: field(formData, "line1"),
    line2: field(formData, "line2"),
    city: field(formData, "city"),
    postcode: field(formData, "postcode"),
    delivery: field(formData, "delivery"),
    cardName: field(formData, "cardName"),
    cardNumber: field(formData, "cardNumber"),
    expiry: field(formData, "expiry"),
    cvv: field(formData, "cvv"),
  };
  const { cardNumber: _n, cvv: _c, ...safeValues } = input;
  void _n;
  void _c;
  const fail = (errors: FieldErrors, formError?: string): CheckoutState => ({
    submission: prev.submission + 1,
    errors,
    formError,
    values: safeValues,
  });

  // 1. Validate everything server-side. The client does no validation that
  //    this depends on.
  const result = validateCheckout(input);
  if (!result.address || !result.delivery || !result.last4) {
    return fail(result.errors);
  }

  // 2. Re-resolve the basket against the catalogue NOW, at the moment of
  //    placing the order. Whatever the summary panel showed earlier is not
  //    trusted.
  const basket = await resolveBasket();
  if (basket.lines.length === 0) {
    return fail({}, "Your basket is empty.");
  }
  const unavailable = basket.lines.filter((l) => l.product.stock === 0);
  if (unavailable.length > 0) {
    return fail(
      {},
      `Remove unavailable items before ordering: ${unavailable
        .map((l) => l.product.title)
        .join(", ")}.`,
    );
  }

  // 3. Snapshot the price paid onto each line. From here on the order never
  //    looks at the catalogue again.
  const lines: OrderLine[] = basket.lines.map(({ line, product }) => ({
    productId: product.id,
    title: product.title,
    image: product.image,
    qty: line.qty,
    unitPriceMinor: product.priceMinor,
    colour: line.colour,
    size: line.size,
  }));

  const order = buildOrder({
    id: makeOrderId(),
    lines,
    address: result.address,
    delivery: result.delivery,
    cardLast4: result.last4,
  });

  if (!orderFitsInCookie(order)) {
    return fail(
      {},
      "This order has too many different items to store in this demo, which keeps orders in a browser cookie. Remove a few lines and try again.",
    );
  }

  const store = await cookies();
  const existing = parseOrders(store.get(ORDERS_COOKIE)?.value);
  store.set(ORDERS_COOKIE, JSON.stringify(addOrder(existing, order)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // 4. Clear the basket only once the order is safely written.
  store.delete(BASKET_COOKIE);
  revalidatePath("/", "layout");

  redirect(`/orders/${order.id}`);
}
