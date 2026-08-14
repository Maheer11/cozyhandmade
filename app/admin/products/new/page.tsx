import Link from "next/link";
import { redirect } from "next/navigation";
import AdminProductForm, { type ProductPrefill } from "@/components/AdminProductForm";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/db-categories";
import type { FeaturedPieceItem } from "@/components/AdminFeaturedPieceForm";
import {
  FEATURED_PIECE_STOCK_SELECT,
  linkedProductStock,
  type FeaturedPieceStockSource,
} from "@/lib/featured-piece-stock";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ fromFeaturedPiece?: string }>;
}) {
  const { fromFeaturedPiece } = await searchParams;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const categories = await getCategories(db);

  let prefill: ProductPrefill | undefined;
  let sourceName: string | undefined;

  if (fromFeaturedPiece) {
    // The piece's own stock_quantity is deprecated and unread (migration 013);
    // its stock is whatever the linked product holds, so that is what gets
    // prefilled here.
    const { data: item } = await db
      .from("featured_pieces")
      .select(`*, ${FEATURED_PIECE_STOCK_SELECT}`)
      .eq("id", fromFeaturedPiece)
      .single() as { data: (FeaturedPieceItem & FeaturedPieceStockSource) | null };

    // Already linked to a product? Then there is nothing to create — sending
    // the admin to a prefilled "new product" form here is exactly how a second
    // copy of the same item (with its own separate stock) gets made. Go to the
    // real product instead.
    if (item?.product_id) {
      redirect(`/admin/products/${item.product_id}/edit`);
    }

    if (item) {
      sourceName = item.name;
      prefill = {
        name: item.name,
        price: item.price?.toString(),
        description: item.description ?? "",
        stock_quantity: (linkedProductStock(item) ?? 0).toString(),
        is_handmade: item.is_handmade,
        shipping_weight_grams: item.shipping_weight_grams?.toString() ?? "",
        image: item.product_image,
        images: [item.product_image, item.lifestyle_image].filter((u): u is string => !!u),
        colors: item.colors ?? [],
        sizes: item.sizes ?? [],
        variant_price: item.variant_price ?? {},
      };
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-7">
        <Link href="/admin/products" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {sourceName ? `Adding "${sourceName}" to Collections. Pick a category and review before saving.` : "New item for the catalogue"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <AdminProductForm prefill={prefill} fromFeaturedPieceId={prefill ? fromFeaturedPiece : undefined} categories={categories} />
      </div>
    </div>
  );
}
