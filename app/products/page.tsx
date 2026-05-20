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

  // Use DB products if they exist, fall back to hardcoded until seeded
  const products = data?.length
    ? data.map(mapProduct)
    : hardcodedProducts;

  return <ProductsContent products={products} categories={categories} />;
}
