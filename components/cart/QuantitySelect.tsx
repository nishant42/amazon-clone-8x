"use client";

import { useRef } from "react";
import { setLineQty } from "@/lib/basket-actions";

/**
 * Client island: submits the form as soon as the quantity changes, so the
 * server recomputes the subtotal without a separate "update" button. The
 * quantity itself is still applied server-side by the action.
 */
export function QuantitySelect({
  itemKey,
  qty,
  max,
}: {
  itemKey: string;
  qty: number;
  max: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const ceiling = Math.max(max, qty);

  return (
    <form ref={formRef} action={setLineQty} className="inline-block">
      <input type="hidden" name="key" value={itemKey} />
      <label className="sr-only" htmlFor={`qty-${itemKey}`}>
        Quantity
      </label>
      <select
        id={`qty-${itemKey}`}
        name="qty"
        defaultValue={qty}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-[8px] border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1 text-[13px] shadow-sm"
      >
        <option value={0}>0 (Delete)</option>
        {Array.from({ length: ceiling }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="ml-1 text-[12px] text-amazon-link underline">
          Update
        </button>
      </noscript>
    </form>
  );
}
