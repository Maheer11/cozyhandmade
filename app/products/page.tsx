import { createClient } from "@/lib/supabase/server";
import { mapProduct, type DbProduct } from "@/lib/db-products";
import { mapCustomProduct, type DbCustomProduct } from "@/lib/db-custom-products";
import { categories } from "@/lib/products";
import ProductsContent from "@/components/ProductsContent";

export default async function ProductsPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: customData } = await db
    .from("custom_products")
    .select("*")
    .order("display_order", { ascending: true });

  const regularProducts = ((data ?? []) as DbProduct[]).map(mapProduct);
  const customProducts = ((customData ?? []) as DbCustomProduct[]).map(mapCustomProduct);

  // Merge custom products first, then regular products
  const allProducts = [...customProducts, ...regularProducts];

  return <ProductsContent products={allProducts} categories={categories} />;
}
