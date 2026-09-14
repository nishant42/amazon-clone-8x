import type { Product } from "@/lib/data/products";

/**
 * The seed catalogue carries one image per product. The gallery needs several,
 * so extra views are derived from the slug. Deterministic, so the same product
 * always shows the same set. Kept out of lib/data because it derives from the
 * catalogue rather than accessing it.
 */
export function galleryImages(product: Product): string[] {
  return [
    product.image,
    ...[1, 2, 3].map(
      (n) => `https://picsum.photos/seed/${product.slug}-${n}/400/400`,
    ),
  ];
}
