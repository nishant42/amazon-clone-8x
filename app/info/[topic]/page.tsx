import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * One honest placeholder behind the secondary nav links. They previously
 * pointed at "#", which is not a destination. Rather than invent five features,
 * each link now lands on a real page that names the section and says where it
 * stands.
 */
const TOPICS: Record<string, { title: string; blurb: string }> = {
  "todays-deals": {
    title: "Today's Deals",
    blurb:
      "The catalogue already carries discounts — 47 products have an RRP struck through. A dedicated deals view is not built yet.",
  },
  "customer-service": {
    title: "Customer Service",
    blurb: "Help content and contact routes are out of scope for this build.",
  },
  registry: {
    title: "Registry",
    blurb: "Gift lists need accounts, which are out of scope for this build.",
  },
  "gift-cards": {
    title: "Gift Cards",
    blurb: "Gift cards need payments, which are out of scope for this build.",
  },
  sell: {
    title: "Sell",
    blurb: "Seller tooling is a separate product surface and is not part of this build.",
  },
};

export const TOPIC_SLUGS = Object.keys(TOPICS);

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const entry = TOPICS[topic];
  return { title: entry ? `${entry.title} | amazon.co.uk clone` : "Not found" };
}

export default async function InfoPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const entry = TOPICS[topic];
  if (!entry) notFound();

  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto max-w-[1000px] px-3 py-4">
        <div className="rounded-[4px] bg-white p-6">
          <h1 className="text-[28px] font-medium text-amazon-text">{entry.title}</h1>
          <hr className="my-3 border-[#e7e7e7]" />
          <p className="max-w-2xl text-[14px] text-[#565959]">{entry.blurb}</p>
          <p className="mt-6">
            <Link
              href="/"
              className="text-[14px] text-amazon-link hover:text-[#C7511F] hover:underline"
            >
              ← Back to all products
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
