import type { Database } from "./supabase/types";
import type { Category } from "./products";

export type DbCategory = Database["public"]["Tables"]["categories"]["Row"];

interface ProductImageSource {
  category: string;
  image: string | null;
  created_at: string;
}

// image is a manual override on the category row. When it's null, fall back
// to the most recently added product tagged with that category — so a
// category is never stuck with a stale or placeholder image, and a brand
// new category becomes correct the moment the first product is added to it,
// with no admin step required. See migrations/010_categories_table.sql.
export function mapCategoriesWithFallback(
  rows: DbCategory[],
  products: ProductImageSource[]
): Category[] {
  const latestImageByCategory = new Map<string, { image: string; created_at: string }>();
  for (const p of products) {
    if (!p.image) continue;
    const existing = latestImageByCategory.get(p.category);
    if (!existing || p.created_at > existing.created_at) {
      latestImageByCategory.set(p.category, { image: p.image, created_at: p.created_at });
    }
  }

  return rows
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      image: row.image ?? latestImageByCategory.get(row.id)?.image ?? "/images/placeholder.jpg",
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCategories(supabase: any): Promise<Category[]> {
  const [{ data: rows }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase.from("products").select("category, image, created_at"),
  ]);

  return mapCategoriesWithFallback(
    (rows ?? []) as DbCategory[],
    (products ?? []) as ProductImageSource[]
  );
}
