"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { placeOrder, type CheckoutState } from "@/lib/checkout-actions";
import { formatGBP } from "@/lib/money";
import { DELIVERY, type DeliveryOption, type FieldErrors } from "@/lib/orders-core";

export type SummaryLine = {
  key: string;
  title: string;
  image: string;
  qty: number;
  lineTotalMinor: number;
  variant?: string;
};

const initialState: CheckoutState = { submission: 0, errors: {}, values: {} };

function Field({
  name,
  label,
  errors,
  defaultValue,
  hint,
  ...input
}: {
  name: string;
  label: string;
  errors: FieldErrors;
  defaultValue?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const error = errors[name as keyof FieldErrors];
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <label className="block text-[13px] font-bold text-amazon-text">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1 block w-full rounded-[3px] border px-2 py-1.5 text-[14px] font-normal shadow-inner outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/40 ${
          error ? "border-amazon-badge" : "border-[#a6a6a6]"
        }`}
        {...input}
      />
      {error ? (
        <span id={`${name}-error`} className="mt-1 block text-[12px] font-normal text-amazon-badge">
          {error}
        </span>
      ) : hint ? (
        <span id={`${name}-hint`} className="mt-1 block text-[12px] font-normal text-[#565959]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/**
 * Client island. It only collects input and shows a running total. Every
 * validation rule and every price is decided server-side by placeOrder; the
 * total shown here is display only, and is recomputed from the catalogue when
 * the order is actually placed.
 */
export function CheckoutForm({
  lines,
  itemsSubtotalMinor,
  itemCount,
}: {
  lines: SummaryLine[];
  itemsSubtotalMinor: number;
  itemCount: number;
}) {
  const [state, formAction, pending] = useActionState(placeOrder, initialState);

  const submittedDelivery: DeliveryOption =
    state.values.delivery === "express" ? "express" : "standard";
  const [delivery, setDelivery] = useState<DeliveryOption>(submittedDelivery);
  const [seenSubmission, setSeenSubmission] = useState(state.submission);
  if (seenSubmission !== state.submission) {
    setSeenSubmission(state.submission);
    setDelivery(submittedDelivery);
  }

  const deliveryMinor = DELIVERY[delivery].priceMinor;
  const totalMinor = itemsSubtotalMinor + deliveryMinor;
  const v = state.values;
  const errorCount = Object.keys(state.errors).length;

  return (
    <form
      action={formAction}
      noValidate
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      {/* key remounts inputs after each submission so they show the values the
          server echoed back, instead of React's post-action form reset
          clearing them. */}
      <div key={state.submission} className="space-y-4">
        {state.formError || errorCount > 0 ? (
          <div
            role="alert"
            className="rounded-[8px] border border-amazon-badge bg-[#fff5f5] p-4 text-[14px] text-amazon-text"
          >
            <p className="font-bold text-amazon-badge">There was a problem</p>
            <p className="mt-1">
              {state.formError ??
                `Please correct the ${errorCount} highlighted ${
                  errorCount === 1 ? "field" : "fields"
                } below.`}
            </p>
          </div>
        ) : null}

        <section className="rounded-[8px] bg-white p-5">
          <h2 className="text-[18px] font-bold text-amazon-text">1 · Delivery address</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field name="name" label="Full name" autoComplete="name" errors={state.errors} defaultValue={v.name} />
            </div>
            <div className="sm:col-span-2">
              <Field name="line1" label="Address line 1" autoComplete="address-line1" errors={state.errors} defaultValue={v.line1} />
            </div>
            <div className="sm:col-span-2">
              <Field name="line2" label="Address line 2 (optional)" autoComplete="address-line2" errors={state.errors} defaultValue={v.line2} />
            </div>
            <Field name="city" label="Town/City" autoComplete="address-level2" errors={state.errors} defaultValue={v.city} />
            <Field
              name="postcode"
              label="Postcode"
              autoComplete="postal-code"
              autoCapitalize="characters"
              errors={state.errors}
              defaultValue={v.postcode}
              hint="UK postcodes only, e.g. SW1A 1AA"
            />
          </div>
        </section>

        <section className="rounded-[8px] bg-white p-5">
          <h2 className="text-[18px] font-bold text-amazon-text">2 · Delivery option</h2>
          <fieldset className="mt-3 space-y-2" aria-describedby={state.errors.delivery ? "delivery-error" : undefined}>
            <legend className="sr-only">Delivery option</legend>
            {(Object.keys(DELIVERY) as DeliveryOption[]).map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-start gap-3 rounded-[8px] border p-3 ${
                  delivery === option ? "border-[#e77600] bg-[#fcf5ee]" : "border-[#d5d9d9]"
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  value={option}
                  defaultChecked={submittedDelivery === option}
                  onChange={() => setDelivery(option)}
                  className="mt-1"
                />
                <span className="text-[14px] text-amazon-text">
                  <span className="block font-bold">{DELIVERY[option].label}</span>
                  <span className="block text-[#565959]">{DELIVERY[option].blurb}</span>
                </span>
              </label>
            ))}
            {state.errors.delivery ? (
              <p id="delivery-error" className="text-[12px] text-amazon-badge">
                {state.errors.delivery}
              </p>
            ) : null}
          </fieldset>
        </section>

        <section className="rounded-[8px] bg-white p-5">
          <h2 className="text-[18px] font-bold text-amazon-text">3 · Payment</h2>
          <p className="mt-1 text-[12px] text-[#565959]">
            Mock payment. Nothing is charged and card details are never stored — only the last
            four digits are kept on the order. Try 4242 4242 4242 4242.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field name="cardName" label="Name on card" autoComplete="cc-name" errors={state.errors} defaultValue={v.cardName} />
            </div>
            <div className="sm:col-span-2">
              <Field
                name="cardNumber"
                label="Card number"
                autoComplete="cc-number"
                inputMode="numeric"
                errors={state.errors}
                hint="For security, card number and code are cleared if the form has errors."
              />
            </div>
            <Field name="expiry" label="Expiry (MM/YY)" autoComplete="cc-exp" placeholder="MM/YY" errors={state.errors} defaultValue={v.expiry} />
            <Field name="cvv" label="Security code" autoComplete="cc-csc" inputMode="numeric" errors={state.errors} />
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-3 rounded-[8px] bg-white p-5 lg:sticky lg:top-4">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[20px] bg-amazon-orange py-2 text-[14px] font-medium text-amazon-text hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Placing your order…" : "Place your order"}
        </button>

        <h2 className="text-[18px] font-bold text-amazon-text">Order summary</h2>
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={line.key} className="flex gap-2 text-[13px] text-amazon-text">
              <span className="relative h-10 w-10 shrink-0">
                <Image src={line.image} alt="" fill sizes="40px" className="object-contain" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2">{line.title}</span>
                <span className="text-[#565959]">
                  Qty {line.qty}
                  {line.variant ? ` · ${line.variant}` : ""}
                </span>
              </span>
              <span className="shrink-0">{formatGBP(line.lineTotalMinor)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1 border-t border-[#e7e7e7] pt-3 text-[14px] text-amazon-text">
          <div className="flex justify-between">
            <dt>Items ({itemCount}):</dt>
            <dd>{formatGBP(itemsSubtotalMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery:</dt>
            <dd>{deliveryMinor === 0 ? "FREE" : formatGBP(deliveryMinor)}</dd>
          </div>
          <div className="flex justify-between border-t border-[#e7e7e7] pt-2 text-[18px] font-bold text-[#B12704]">
            <dt>Order total:</dt>
            <dd>{formatGBP(totalMinor)}</dd>
          </div>
        </dl>
        <p className="text-[11px] text-[#565959]">
          Prices are re-checked against the catalogue when you place the order.
        </p>
      </aside>
    </form>
  );
}
