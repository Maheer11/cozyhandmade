import type { Database } from "./supabase/types";
import type { Product } from "./products";

export type DbProduct = Database["public"]["Tables"]["products"]["Row"];

/**
 * Ids of products the owner has pulled from sale by marking their Featured
 * Piece "sold out" in the admin dashboard. A Featured Piece and its linked
 * product are the same physical item (see lib/featured-piece-stock.ts), so the
 * switch has to hide the product too, or the shop keeps offering it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPulledProductIds(db: any): Promise<Set<string>> {
  const { data } = await db.from("featured_pieces").select("product_id").eq("sold_out", true);
  return new Set(
    ((data ?? []) as { product_id: string | null }[]).flatMap((r) => (r.product_id ? [r.product_id] : [])),
  );
}

/** The product as the shop should show it: unavailable when pulled from sale. */
export function withPulledFromSale(product: Product, pulled: Set<string>): Product {
  if (!pulled.has(product.id)) return product;
  return {
    ...product,
    inStock: false,
    stockQuantity: 0,
    variantStock: Object.fromEntries(Object.keys(product.variantStock).map((k) => [k, 0])),
  };
}

export function mapProduct(p: DbProduct): Product {
  const img = p.image ?? "/images/placeholder.jpg";
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    originalPrice: p.original_price ?? undefined,
    category: p.category,
    image: img,
    images: p.images?.length ? p.images : [img],
    description: p.description ?? "",
    details: p.details ?? [],
    tags: p.tags ?? [],
    inStock: p.in_stock,
    featured: p.featured,
    showOnHomepage: p.show_on_homepage ?? false,
    isHandmade: p.is_handmade,
    stockQuantity: p.stock_quantity,
    colors: p.colors ?? [],
    sizes: p.sizes ?? [],
    variantStock: (p.variant_stock as Record<string, number>) ?? {},
    variantPrice: (p.variant_price as Record<string, number>) ?? {},
    shippingWeightGrams: p.shipping_weight_grams ?? null,
  };
}
