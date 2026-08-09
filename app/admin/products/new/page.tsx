import Link from "next/link";
import AdminProductForm, { type ProductPrefill } from "@/components/AdminProductForm";
import { createClient } from "@/lib/supabase/server";
import type { NewInItem } from "@/components/AdminNewInForm";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ fromNewIn?: string }>;
}) {
  const { fromNewIn } = await searchParams;

  let prefill: ProductPrefill | undefined;
  let sourceName: string | undefined;

  if (fromNewIn) {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: item } = await db
      .from("new_in_items")
      .select("*")
      .eq("id", fromNewIn)
      .single() as { data: NewInItem | null };

    if (item) {
      sourceName = item.name;
      prefill = {
        name: item.name,
        price: item.price?.toString(),
        description: item.description ?? "",
        stock_quantity: item.stock_quantity?.toString(),
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
            {sourceName ? `Adding "${sourceName}" to Collections — pick a category and review before saving.` : "New item for the catalogue"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <AdminProductForm prefill={prefill} fromNewInId={prefill ? fromNewIn : undefined} />
      </div>
    </div>
  );
}
