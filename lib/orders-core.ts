/**
 * Pure checkout and order logic: validation, totals and the order snapshot.
 * Imports nothing from Next, so every rule here can be executed and asserted
 * directly rather than only through a form submission.
 *
 * An order is a SNAPSHOT. It stores the price paid on each line, so a later
 * catalogue change cannot rewrite order history. This is deliberately unlike
 * the basket, which stores only ids and re-resolves prices on every render.
 */

export const ORDERS_COOKIE = "orders";
export const ORDERS_VERSION = 1;

/**
 * Browsers cap a cookie at ~4096 bytes including its name, and the value is
 * URL-encoded on the wire, which inflates JSON by roughly 1.3-1.5x. The limit
 * is therefore measured on the ENCODED value. An earlier draft measured raw
 * JSON, which would have let an order through that the browser then silently
 * refused to store.
 */
export const MAX_ORDERS = 5;
export const MAX_COOKIE_VALUE_BYTES = 3800;

export function encodedSize(value: unknown): number {
  return encodeURIComponent(JSON.stringify(value)).length;
}

export type DeliveryOption = "standard" | "express";

export const DELIVERY: Record<
  DeliveryOption,
  { label: string; priceMinor: number; days: number; blurb: string }
> = {
  standard: {
    label: "Standard Delivery",
    priceMinor: 0,
    days: 4,
    blurb: "FREE · arrives in 3-5 days",
  },
  express: {
    label: "Express Delivery",
    priceMinor: 499,
    days: 1,
    blurb: "£4.99 · next day",
  },
};

export type Address = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
};

export type OrderLine = {
  productId: string;
  title: string;
  image: string;
  qty: number;
  /** The price actually paid per unit, in pence. Never re-resolved. */
  unitPriceMinor: number;
  colour?: string;
  size?: string;
};

export type Order = {
  id: string;
  placedAt: string;
  lines: OrderLine[];
  itemsSubtotalMinor: number;
  deliveryMinor: number;
  totalMinor: number;
  address: Address;
  delivery: DeliveryOption;
  cardLast4: string;
  etaISO: string;
};

export type OrdersCookie = { v: number; orders: Order[] };

export const EMPTY_ORDERS: OrdersCookie = { v: ORDERS_VERSION, orders: [] };

/**
 * Official UK postcode shape, including the GIR 0AA special case. Deliberately
 * strict: "12345" and "SW1A" are rejected, "sw1a 1aa" and "SW1A1AA" accepted.
 */
const UK_POSTCODE =
  /^(GIR ?0AA|[A-PR-UWYZ](?:[0-9]{1,2}|[0-9][A-HJKPSTUW]|[A-HK-Y][0-9](?:[0-9]|[ABEHMNPRV-Y])?) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

export function isValidUkPostcode(value: string): boolean {
  return UK_POSTCODE.test(value.trim());
}

export function normalisePostcode(value: string): string {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`.trim();
}

/** Luhn checksum. Rejects anything non-numeric or implausibly short. */
export function luhnCheck(digits: string): boolean {
  const clean = digits.replace(/[\s-]/g, "");
  if (!/^\d{12,19}$/.test(clean)) return false;
  let sum = 0;
  let double = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let d = clean.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function isValidExpiry(value: string, now = new Date()): boolean {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  // Valid through the last day of the stated month.
  const expiresAfter = new Date(year, month, 1);
  return expiresAfter > now;
}

export type CheckoutInput = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  delivery: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

export type FieldErrors = Partial<Record<keyof CheckoutInput, string>>;

export function validateCheckout(
  input: CheckoutInput,
  now = new Date(),
): { errors: FieldErrors; address?: Address; delivery?: DeliveryOption; last4?: string } {
  const errors: FieldErrors = {};

  if (input.name.trim().length < 2) errors.name = "Enter a full name";
  if (input.line1.trim().length < 3) errors.line1 = "Enter a street address";
  if (input.city.trim().length < 2) errors.city = "Enter a town or city";
  if (!input.postcode.trim()) errors.postcode = "Enter a postcode";
  else if (!isValidUkPostcode(input.postcode))
    errors.postcode = "Enter a valid UK postcode, for example SW1A 1AA";

  const delivery =
    input.delivery === "standard" || input.delivery === "express"
      ? (input.delivery as DeliveryOption)
      : undefined;
  if (!delivery) errors.delivery = "Choose a delivery speed";

  if (input.cardName.trim().length < 2) errors.cardName = "Enter the name on the card";

  const cardDigits = input.cardNumber.replace(/[\s-]/g, "");
  if (!cardDigits) errors.cardNumber = "Enter a card number";
  else if (!/^\d+$/.test(cardDigits)) errors.cardNumber = "Card number must be digits only";
  else if (!luhnCheck(cardDigits)) errors.cardNumber = "That card number is not valid";

  if (!isValidExpiry(input.expiry, now)) errors.expiry = "Enter a valid future expiry as MM/YY";
  if (!/^\d{3,4}$/.test(input.cvv.trim())) errors.cvv = "Enter the 3 or 4 digit security code";

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors: {},
    address: {
      name: input.name.trim(),
      line1: input.line1.trim(),
      line2: input.line2.trim() || undefined,
      city: input.city.trim(),
      postcode: normalisePostcode(input.postcode),
    },
    delivery,
    last4: cardDigits.slice(-4),
  };
}

/** amazon.co.uk-style order number. */
export function makeOrderId(random: () => number = Math.random): string {
  const block = (n: number) =>
    Array.from({ length: n }, () => Math.floor(random() * 10)).join("");
  return `${block(3)}-${block(7)}-${block(7)}`;
}

export function etaFor(delivery: DeliveryOption, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + DELIVERY[delivery].days);
  return date.toISOString();
}

export function buildOrder(args: {
  id: string;
  lines: OrderLine[];
  address: Address;
  delivery: DeliveryOption;
  cardLast4: string;
  now?: Date;
}): Order {
  const now = args.now ?? new Date();
  const itemsSubtotalMinor = args.lines.reduce(
    (sum, l) => sum + l.unitPriceMinor * l.qty,
    0,
  );
  const deliveryMinor = DELIVERY[args.delivery].priceMinor;
  return {
    id: args.id,
    placedAt: now.toISOString(),
    lines: args.lines,
    itemsSubtotalMinor,
    deliveryMinor,
    totalMinor: itemsSubtotalMinor + deliveryMinor,
    address: args.address,
    delivery: args.delivery,
    cardLast4: args.cardLast4,
    etaISO: etaFor(args.delivery, now),
  };
}

/** Defensive parse: a stale or hostile cookie yields no orders, never a throw. */
export function parseOrders(raw: string | undefined): OrdersCookie {
  if (!raw) return EMPTY_ORDERS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_ORDERS;
    const obj = parsed as { v?: unknown; orders?: unknown };
    if (obj.v !== ORDERS_VERSION || !Array.isArray(obj.orders)) return EMPTY_ORDERS;

    const orders: Order[] = [];
    for (const entry of obj.orders) {
      if (typeof entry !== "object" || entry === null) continue;
      const o = entry as Record<string, unknown>;
      if (typeof o.id !== "string" || !Array.isArray(o.lines)) continue;
      if (typeof o.totalMinor !== "number") continue;
      orders.push(entry as Order);
    }
    return { v: ORDERS_VERSION, orders };
  } catch {
    return EMPTY_ORDERS;
  }
}

/** Whether a single order can be stored at all. Checked before charging. */
export function orderFitsInCookie(order: Order): boolean {
  return encodedSize({ v: ORDERS_VERSION, orders: [order] }) <= MAX_COOKIE_VALUE_BYTES;
}

/**
 * Newest first, capped by count and by encoded size. Older orders are dropped
 * to make room; the new order is never dropped (callers check
 * orderFitsInCookie first).
 */
export function addOrder(existing: OrdersCookie, order: Order): OrdersCookie {
  let orders = [order, ...existing.orders].slice(0, MAX_ORDERS);
  while (
    orders.length > 1 &&
    encodedSize({ v: ORDERS_VERSION, orders }) > MAX_COOKIE_VALUE_BYTES
  ) {
    orders = orders.slice(0, -1);
  }
  return { v: ORDERS_VERSION, orders };
}
