import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/db-products";
import { getProduct, products as hardcodedProducts } from "@/lib/products";
import ProductDetail from "@/components/ProductDetail";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Try DB first, then fall back to hardcoded (for local images during transition)
  const { data: dbProduct } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const product = dbProduct ? mapProduct(dbProduct) : getProduct(id);
  if (!product) notFound();

  // Fetch related from same source
  let related;
  if (dbProduct) {
    const { data: dbRelated } = await db
      .from("products")
      .select("*")
      .eq("category", product.category)
      .neq("id", id)
      .limit(4);
    related = (dbRelated ?? []).map(mapProduct);
  } else {
    related = hardcodedProducts
      .filter((p) => p.category === product.category && p.id !== id)
      .slice(0, 4);
  }

  return <ProductDetail product={product} related={related} />;
}
