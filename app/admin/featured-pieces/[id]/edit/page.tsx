import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminFeaturedPieceForm, {
  type FeaturedPieceItem,
  type StockProductOption,
} from "@/components/AdminFeaturedPieceForm";

export default async function EditFeaturedPieceItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Two independent reads, so they go in parallel: the piece being edited, and
  // the product list the stock-source picker offers.
  const [{ data: item }, { data: products }] = await Promise.all([
    db.from("featured_pieces").select("*").eq("id", id).single() as Promise<{ data: FeaturedPieceItem | null }>,
    db.from("products").select("id, name, stock_quantity").order("name", { ascending: true }) as Promise<{ data: StockProductOption[] | null }>,
  ]);

  if (!item) notFound();

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-7">
        <Link href="/admin/featured-pieces" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Featured Piece</h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{item.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <AdminFeaturedPieceForm item={item} products={products ?? []} />
      </div>
    </div>
  );
}
