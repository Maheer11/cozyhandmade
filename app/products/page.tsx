import { createClient } from "@/lib/supabase/server";
import { mapProduct, type DbProduct } from "@/lib/db-products";
import { mapCustomProduct, type DbCustomProduct } from "@/lib/db-custom-products";
import { mapCategoriesWithFallback, type DbCategory } from "@/lib/db-categories";
import ProductsContent from "@/components/ProductsContent";
import type { Review } from "@/components/SocialProofSection";

interface DbReview {
  screenshot: string;
  platform: "whatsapp" | "instagram";
  customer_label: string | null;
  location: string | null;
  review_date: string | null;
  rating: number | null;
}

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

  const { data: categoryRows } = await db
    .from("categories")
    .select("*") as { data: DbCategory[] | null };

  // Reviews are admin-managed (/admin/reviews) — no more hardcoded array.
  const { data: dbReviews } = await db
    .from("reviews")
    .select("*")
    .order("display_order", { ascending: true });

  const regularProducts = ((data ?? []) as DbProduct[]).map(mapProduct);
  const customProducts = ((customData ?? []) as DbCustomProduct[]).map(mapCustomProduct);
  const reviews: Review[] = (dbReviews ?? []).map((r: DbReview) => ({
    screenshot: r.screenshot,
    platform: r.platform,
    customerLabel: r.customer_label ?? undefined,
    location: r.location ?? undefined,
    date: r.review_date ?? undefined,
    rating: r.rating ?? undefined,
  }));

  // Merge custom products first, then regular products
  const allProducts = [...customProducts, ...regularProducts];

  const resolvedCategories = mapCategoriesWithFallback(
    categoryRows ?? [],
    [...(data ?? []), ...(customData ?? [])]
  );

  // Only show categories that actually have a product in them — the
  // Curated Categories slider should reflect real inventory, not the full
  // admin-managed list. A category reappears on its own the moment a
  // product is added to it, no admin action needed.
  const availableCategories = resolvedCategories.filter((cat) =>
    allProducts.some((p) => p.category === cat.id)
  );

  return <ProductsContent products={allProducts} categories={availableCategories} reviews={reviews} />;
}
