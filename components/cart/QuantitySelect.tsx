"use client";

import { useState, useTransition } from "react";
import { setLineQtyValue } from "@/lib/basket-actions";

/**
 * Client island: submits the form as soon as the quantity changes, so the
 * server recomputes the subtotal without a separate "update" button. The
 * quantity itself is still applied server-side by the action.
 *
 * Not wrapped in a <form>: React 19 resets a form after its action resolves,
 * which snapped this select back to its first option ("0 (Delete)") while the
 * subtotal showed the correct new total. A working update looked broken. The
 * action is called from a transition instead, and the value is controlled.
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
  const [value, setValue] = useState(qty);
  const [syncedQty, setSyncedQty] = useState(qty);
  const [pending, startTransition] = useTransition();
  const ceiling = Math.max(max, qty);

  // Re-sync when the server reports a new quantity for this line. Adjusting
  // state during render is React's documented pattern; an effect would trigger
  // a cascading render and the compiler rejects it.
  if (syncedQty !== qty) {
    setSyncedQty(qty);
    setValue(qty);
  }

  return (
    <>
      <label className="sr-only" htmlFor={`qty-${itemKey}`}>
        Quantity
      </label>
      <select
        id={`qty-${itemKey}`}
        name="qty"
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = Number(event.target.value);
          setValue(next);
          startTransition(async () => {
            await setLineQtyValue(itemKey, next);
          });
        }}
        className="rounded-[8px] border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1 text-[13px] shadow-sm disabled:opacity-60"
      >
        <option value={0}>0 (Delete)</option>
        {Array.from({ length: ceiling }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </>
  );
}
