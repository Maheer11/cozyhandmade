import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeaturedPieceDetail, { type FeaturedPieceDetailData } from "@/components/FeaturedPieceDetail";
import { FEATURED_PIECE_STOCK_SELECT } from "@/lib/featured-piece-stock";

export default async function FeaturedPieceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Everything but stock is this row's own. Stock comes from the linked
  // product (migration 013), embedded here so the detail page resolves
  // availability and the quantity cap in a single round trip.
  const { data: item } = await db
    .from("featured_pieces")
    .select(`*, ${FEATURED_PIECE_STOCK_SELECT}`)
    .eq("id", id)
    .single() as { data: FeaturedPieceDetailData | null };

  if (!item) notFound();

  return <FeaturedPieceDetail item={item} />;
}
