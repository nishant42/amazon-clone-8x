import { redirect } from "next/navigation";
import { CheckoutForm, type SummaryLine } from "@/components/checkout/CheckoutForm";
import { resolveBasket } from "@/lib/basket";

export const metadata = { title: "Checkout | amazon.co.uk clone" };

export default async function CheckoutPage() {
  const { lines, subtotalMinor, itemCount } = await resolveBasket();
  if (lines.length === 0) redirect("/cart");

  const summary: SummaryLine[] = lines.map(({ key, line, product, lineTotalMinor }) => ({
    key,
    title: product.title,
    image: product.image,
    qty: line.qty,
    lineTotalMinor,
    variant: [line.colour, line.size].filter(Boolean).join(" · ") || undefined,
  }));

  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto max-w-[1150px] px-3 py-4">
        <h1 className="mb-4 text-[28px] font-medium text-amazon-text">Checkout</h1>
        <CheckoutForm lines={summary} itemsSubtotalMinor={subtotalMinor} itemCount={itemCount} />
      </div>
    </main>
  );
}
