import { ProductCard } from "@/components/ui/ProductCard";
import { getProducts } from "@/lib/data/products";

export default async function Home() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-[#E3E6E6]">
      <div className="mx-auto max-w-[1500px] px-3 py-4">
        <div className="rounded-[4px] bg-white px-4 py-3">
          <h1 className="text-[21px] font-bold text-amazon-text">Results</h1>
          <p className="text-[14px] text-[#565959]">
            {products.length} products across {new Set(products.map((p) => p.category)).size}{" "}
            categories
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </main>
  );
}
