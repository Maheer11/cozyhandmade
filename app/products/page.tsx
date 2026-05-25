import { createClient } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/db-products";
import type { DbProduct } from "@/lib/db-products";
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

  const dbRows: DbProduct[] = data ?? [];
  const dbById = new Map(dbRows.map((p) => [p.id, p]));

  // For hardcoded products that also exist in Supabase (same ID), override images
  // with Cloudinary URLs from DB. Keep local metadata (sizes, details, etc).
  const localIds = new Set(hardcodedProducts.map((p) => p.id));
  const mergedLocal = hardcodedProducts.map((local) => {
    const db = dbById.get(local.id);
    if (!db) return local;
    return {
      ...local,
      image:  db.image  ?? local.image,
      images: db.images?.length ? db.images : local.images,
    };
  });

  // Admin-added products not in the hardcoded list
  const dbOnlyProducts = dbRows
    .filter((p) => !localIds.has(p.id))
    .map(mapProduct);

  const products = [...mergedLocal, ...dbOnlyProducts];

  return <ProductsContent products={products} categories={categories} />;
}
