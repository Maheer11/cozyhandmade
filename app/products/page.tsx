import { createClient } from "@/lib/supabase/server";
import { mapProduct, type DbProduct } from "@/lib/db-products";
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

  const products = ((data ?? []) as DbProduct[]).map(mapProduct);

  return <ProductsContent products={products} categories={categories} />;
}
