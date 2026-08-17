import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminFeaturedPieceForm, { type StockProductOption } from "@/components/AdminFeaturedPieceForm";

export default async function NewFeaturedPieceItemPage() {
  // A featured piece takes its stock from a product now, so the form needs the
  // product list to pick from. Loaded here rather than fetched client-side —
  // same server-side cross-catalogue load /admin/products/new already does in
  // the other direction.
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: products } = await db
    .from("products")
    .select("id, name, stock_quantity")
    .order("name", { ascending: true }) as { data: StockProductOption[] | null };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-7">
        <Link href="/admin/featured-pieces" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Featured Piece</h1>
          <p className="text-sm text-gray-500 mt-0.5">New card for the homepage row</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <AdminFeaturedPieceForm products={products ?? []} />
      </div>
    </div>
  );
}
