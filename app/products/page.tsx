import { createClient } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/db-products";
import { categories, products as hardcodedProducts } from "@/lib/products";
import ProductsContent from "@/components/ProductsContent";

export default async function ProductsPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  // Local products take priority (they have sizes + latest content).
  // DB-only products (added via admin panel) are appended after.
  const localIds = new Set(hardcodedProducts.map((p) => p.id));
  const dbOnlyProducts = (data ?? [])
    .filter((p: { id: string }) => !localIds.has(p.id))
    .map(mapProduct);
  const products = [...hardcodedProducts, ...dbOnlyProducts];

  return <ProductsContent products={products} categories={categories} />;
}
