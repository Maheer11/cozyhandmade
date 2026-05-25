import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapProduct, type DbProduct } from "@/lib/db-products";
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

  const { data: dbProduct } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle() as { data: DbProduct | null };

  if (!dbProduct) notFound();

  const product = mapProduct(dbProduct);

  const { data: dbRelated } = await db
    .from("products")
    .select("*")
    .eq("category", product.category)
    .neq("id", id)
    .limit(4);

  const related = ((dbRelated ?? []) as DbProduct[]).map(mapProduct);

  return <ProductDetail product={product} related={related} />;
}
