import type { Product } from "@/lib/data/products";

/**
 * Gallery images for a product.
 *
 * These are baked into the catalogue rather than derived from the slug. The
 * earlier slug-seeded approach produced unrelated stock photos - a beach on a
 * t-shirt page - and four different subjects across one product's thumbnails.
 * Every image on a product now comes from a single source product, so the
 * thumbnails show the same subject.
 */
export function galleryImages(product: Product): string[] {
  return product.images.length > 0 ? product.images : [product.image];
}
