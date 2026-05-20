import type { Database } from "./supabase/types";
import type { Product } from "./products";

export type DbProduct = Database["public"]["Tables"]["products"]["Row"];

export function mapProduct(p: DbProduct): Product {
  const img = p.image ?? "/images/placeholder.jpg";
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    originalPrice: p.original_price ?? undefined,
    category: p.category,
    rating: p.rating,
    reviewCount: p.review_count,
    image: img,
    images: p.images?.length ? p.images : [img],
    description: p.description ?? "",
    details: p.details ?? [],
    tags: p.tags ?? [],
    inStock: p.in_stock,
    featured: p.featured,
  };
}
