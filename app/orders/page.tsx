import Link from "next/link";

export const metadata = { title: "Your Orders | amazon.co.uk clone" };

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto max-w-[1000px] px-3 py-4">
        <div className="rounded-[4px] bg-white p-6">
          <h1 className="text-[28px] font-medium text-amazon-text">Your Orders</h1>
          <hr className="my-3 border-[#e7e7e7]" />

          <div className="py-10 text-center">
            <p className="text-[18px] font-bold text-amazon-text">No orders yet</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-[#565959]">
              Orders appear here once checkout exists. Checkout and accounts are deliberately
              out of scope for this build, so nothing can be placed yet — this page exists so
              the header link leads somewhere real rather than a 404.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="rounded-[20px] bg-amazon-orange px-6 py-2 text-[14px] font-medium text-amazon-text hover:brightness-95"
              >
                Start shopping
              </Link>
              <Link
                href="/cart"
                className="rounded-[20px] border border-[#d5d9d9] px-6 py-2 text-[14px] text-amazon-text hover:border-amazon-link"
              >
                View basket
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
