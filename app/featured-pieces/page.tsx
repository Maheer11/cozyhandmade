import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FeaturedPieceCard, type FeaturedPieceCardData } from "@/components/FeaturedPiecesSection";
import {
  FEATURED_PIECE_STOCK_SELECT,
  isFeaturedPieceSoldOut,
  type FeaturedPieceStockSource,
} from "@/lib/featured-piece-stock";

const PAGE_SIZE = 24;

export default async function FeaturedPiecesGridPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // The embedded products(stock_quantity) is what makes `sold_out` on the card
  // truthful: stock lives on the linked product now (migration 013), and the
  // row's own sold_out is only the manual override half of the answer. Embedded
  // in this one query rather than looked up per card — a 24-card page would
  // otherwise be 25 round trips.
  const { data: rows, count } = await db
    .from("featured_pieces")
    .select(
      `id, name, product_image, lifestyle_image, sold_out, is_handmade, price, discount_price, ${FEATURED_PIECE_STOCK_SELECT}`,
      { count: "exact" }
    )
    .order("display_order", { ascending: true })
    .range(from, to) as { data: (FeaturedPieceCardData & FeaturedPieceStockSource)[] | null; count: number | null };

  const items: FeaturedPieceCardData[] = (rows ?? []).map((row) => ({
    ...row,
    sold_out: isFeaturedPieceSoldOut(row),
  }));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="text-center mb-10 lg:mb-14">
          <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
            ✦ Just Landed
          </p>
          <h1 className="font-heading italic text-3xl sm:text-4xl lg:text-5xl font-400 text-deep-brown">
            Featured Pieces
          </h1>
        </div>

        {!items || items.length === 0 ? (
          <p className="text-center text-taupe-dark py-20">Nothing here yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {items.map((item) => (
              <FeaturedPieceCard key={item.id} item={item} variant="grid" />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <Link
              href={`/featured-pieces?page=${page - 1}`}
              aria-disabled={page <= 1}
              className={`px-5 py-2.5 rounded-full text-sm font-medium border border-taupe/30
                         ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-cream-dark transition-colors"}`}
            >
              ← Previous
            </Link>
            <span className="text-sm text-taupe-dark">Page {page} of {totalPages}</span>
            <Link
              href={`/featured-pieces?page=${page + 1}`}
              aria-disabled={page >= totalPages}
              className={`px-5 py-2.5 rounded-full text-sm font-medium border border-taupe/30
                         ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-cream-dark transition-colors"}`}
            >
              Next →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
