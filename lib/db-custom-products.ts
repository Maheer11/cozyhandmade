import type { Database } from "./supabase/types";
import type { Product } from "./products";

export type DbCustomProduct = Database["public"]["Tables"]["custom_products"]["Row"];

export function mapCustomProduct(p: DbCustomProduct): Product {
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
    featured: false,
    // custom_products has no such column — these never appear in the hero.
    showOnHomepage: false,
    isHandmade: true,
    stockQuantity: p.stock_quantity,
    colors: p.colors ?? [],
    sizes: p.sizes ?? [],
    variantStock: (p.variant_stock as Record<string, number>) ?? {},
    variantPrice: (p.variant_price as Record<string, number>) ?? {},
  };
}

export async function getCustomProducts(supabase: any) {
  const { data, error } = await supabase
    .from("custom_products")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching custom products:", error);
    return [];
  }

  return ((data ?? []) as DbCustomProduct[]).map(mapCustomProduct);
}

export async function getCustomProductById(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("custom_products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching custom product:", error);
    return null;
  }

  return mapCustomProduct(data as DbCustomProduct);
}

export async function createCustomProduct(
  supabase: any,
  product: Database["public"]["Tables"]["custom_products"]["Insert"]
) {
  const { data, error } = await supabase
    .from("custom_products")
    .insert([product])
    .select()
    .single();

  if (error) {
    console.error("Error creating custom product:", error);
    return null;
  }

  return mapCustomProduct(data as DbCustomProduct);
}

export async function updateCustomProduct(
  supabase: any,
  id: string,
  updates: Database["public"]["Tables"]["custom_products"]["Update"]
) {
  const { data, error } = await supabase
    .from("custom_products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating custom product:", error);
    return null;
  }

  return mapCustomProduct(data as DbCustomProduct);
}

export async function deleteCustomProduct(supabase: any, id: string) {
  const { error } = await supabase
    .from("custom_products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting custom product:", error);
    return false;
  }

  return true;
}

export async function reorderCustomProducts(
  supabase: any,
  orders: { id: string; display_order: number }[]
) {
  const updates = orders.map(({ id, display_order }) => ({
    id,
    display_order,
    updated_at: new Date().toISOString(),
  }));

  for (const update of updates) {
    await supabase
      .from("custom_products")
      .update(update)
      .eq("id", update.id);
  }

  return true;
}
