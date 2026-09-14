"use client";

import { useState } from "react";
import { addToBasket } from "@/lib/basket-actions";
import { formatGBP } from "@/lib/money";

type Props = {
  productId: string;
  priceMinor: number;
  stock: number;
  deliveryLabel: string;
  isPrime: boolean;
  colours?: string[];
  sizes?: string[];
};

/**
 * Client island: holds the colour/size/quantity selection, then hands it to a
 * server action. The action re-resolves the price server-side, so nothing this
 * component holds can influence what the basket is charged.
 */
export function PurchasePanel({
  productId,
  priceMinor,
  stock,
  deliveryLabel,
  isPrime,
  colours,
  sizes,
}: Props) {
  const [colour, setColour] = useState(colours?.[0] ?? "");
  const [size, setSize] = useState(sizes?.[0] ?? "");
  const [qty, setQty] = useState(1);

  const inStock = stock > 0;
  const maxSelectable = Math.min(stock, 10);

  return (
    <form
      action={addToBasket}
      className="rounded-[8px] border border-[#d5d9d9] bg-white p-4 text-[14px]"
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="colour" value={colour} />
      <input type="hidden" name="size" value={size} />

      <p className="text-[24px] font-medium leading-none text-amazon-text">
        {formatGBP(priceMinor)}
      </p>

      {isPrime ? (
        <p className="mt-1 text-[13px]">
          <span className="font-bold text-[#00A8E1]">✓prime</span>
          <span className="ml-1 text-[#565959]">FREE delivery</span>
        </p>
      ) : null}

      <p className="mt-2 text-[#565959]">
        Delivery <span className="font-bold text-amazon-text">{deliveryLabel}</span>
      </p>

      <p className={`mt-3 text-[18px] ${inStock ? "text-[#007600]" : "text-amazon-badge"}`}>
        {inStock ? "In stock" : "Currently unavailable"}
      </p>
      {inStock && stock <= 10 ? (
        <p className="text-[13px] text-amazon-badge">Only {stock} left in stock.</p>
      ) : null}

      {colours?.length ? (
        <fieldset className="mt-4">
          <legend className="text-[13px] text-[#565959]">
            Colour: <span className="font-bold text-amazon-text">{colour}</span>
          </legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {colours.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColour(option)}
                aria-pressed={option === colour}
                className={`rounded-[4px] border px-2 py-1 text-[13px] ${
                  option === colour
                    ? "border-amazon-link ring-1 ring-amazon-link"
                    : "border-[#d5d9d9] hover:border-amazon-link"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {sizes?.length ? (
        <fieldset className="mt-4">
          <legend className="text-[13px] text-[#565959]">
            Size: <span className="font-bold text-amazon-text">{size}</span>
          </legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {sizes.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSize(option)}
                aria-pressed={option === size}
                className={`min-w-[44px] rounded-[4px] border px-2 py-1 text-[13px] ${
                  option === size
                    ? "border-amazon-link ring-1 ring-amazon-link"
                    : "border-[#d5d9d9] hover:border-amazon-link"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {inStock ? (
        <label className="mt-4 block text-[13px]">
          Quantity:{" "}
          <select
            name="qty"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="rounded-[8px] border border-[#d5d9d9] bg-[#f0f2f2] px-2 py-1"
          >
            {Array.from({ length: maxSelectable }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="qty" value={1} />
      )}

      <button
        type="submit"
        disabled={!inStock}
        className="mt-4 w-full rounded-[20px] bg-amazon-orange py-2 text-[14px] font-medium text-amazon-text hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[#e7e9ec] disabled:text-[#565959]"
      >
        {inStock ? "Add to Basket" : "Unavailable"}
      </button>
    </form>
  );
}
