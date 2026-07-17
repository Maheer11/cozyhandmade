import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewInDetail, { type NewInDetailData } from "@/components/NewInDetail";

export default async function NewInDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Fetched directly from new_in_items by id — no product/category lookup,
  // this collection is fully standalone.
  const { data: item } = await db
    .from("new_in_items")
    .select("*")
    .eq("id", id)
    .single() as { data: NewInDetailData | null };

  if (!item) notFound();

  return <NewInDetail item={item} />;
}
