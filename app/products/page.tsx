import { createClient } from "@/lib/supabase/server";
import { mapProduct, type DbProduct } from "@/lib/db-products";
import { mapCustomProduct, type DbCustomProduct } from "@/lib/db-custom-products";
import { categories } from "@/lib/products";
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

  return <ProductsContent products={allProducts} categories={categories} reviews={reviews} />;
}
