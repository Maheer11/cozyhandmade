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

  // Always check Supabase first so Cloudinary images take priority.
  // If the product also exists in the hardcoded list, merge: keep local sizes/metadata
  // but use DB images.
  const localProduct = getProduct(id);

  const { data: dbProduct } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  let product;
  const fromDb = !!dbProduct;

  if (dbProduct && localProduct) {
    // Merge: DB images + local metadata (sizes, details, etc.)
    product = {
      ...localProduct,
      image:  dbProduct.image  ?? localProduct.image,
      images: dbProduct.images?.length ? dbProduct.images : localProduct.images,
    };
  } else if (dbProduct) {
    product = mapProduct(dbProduct);
  } else if (localProduct) {
    product = localProduct;
  } else {
    product = null;
  }

  if (!product) notFound();

  // Fetch related — prefer DB for admin-added products, fall back to hardcoded
  let related;
  if (fromDb) {
    const { data: dbRelated } = await db
      .from("products")
      .select("*")
      .eq("category", product.category)
      .neq("id", id)
      .limit(4);
    related = (dbRelated ?? []).map(mapProduct);
  } else {
    related = hardcodedProducts
      .filter((p) => p.category === product!.category && p.id !== id)
      .slice(0, 4);
  }

  return <ProductDetail product={product} related={related} />;
}
