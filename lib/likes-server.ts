// Server only: imports the service-role client. Never import from a
// "use client" file (the browser side is lib/likes.ts).
import { createAdminClient } from "@/lib/supabase/admin";
import { likeKey, type LikeSource } from "@/lib/likes";

// Server side of the hero carousel likes. The table is service-role only (see
// migration 017), so every read and write goes through here. Like
// lib/email.ts, nothing here throws: before the migration is applied (or if
// the database is unreachable) counts are simply empty and writes report
// "unavailable", so the homepage always renders.

// product_likes / product_like_counts are newer than lib/supabase/types.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

function client(): AnyClient | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** Like totals keyed by likeKey(). Missing items have no likes yet. */
export async function getLikeCounts(
  items: { source: LikeSource; id: string }[],
): Promise<Record<string, number>> {
  const db = client();
  if (!db || items.length === 0) return {};
  try {
    const { data, error } = await db.rpc("product_like_counts", {
      p_item_ids: [...new Set(items.map((i) => i.id))],
    });
    if (error || !Array.isArray(data)) return {};
    const counts: Record<string, number> = {};
    for (const row of data as { item_source: LikeSource; item_id: string; likes: number }[]) {
      counts[likeKey(row.item_source, row.item_id)] = Number(row.likes) || 0;
    }
    return counts;
  } catch {
    return {};
  }
}

/** True when the item exists in its own table (no liking made-up ids). */
async function itemExists(db: AnyClient, source: LikeSource, id: string): Promise<boolean> {
  const table = source === "product" ? "products" : "featured_pieces";
  const { data, error } = await db.from(table).select("id").eq("id", id).maybeSingle();
  return !error && !!data;
}

export type SetLikeResult =
  | { ok: true; count: number }
  | { ok: false; reason: "unavailable" | "not_found" };

/**
 * Likes (or un-likes) one item for one device and returns the new total.
 * Liking twice, or un-liking something never liked, is harmless.
 */
export async function setLike(
  source: LikeSource,
  id: string,
  deviceId: string,
  liked: boolean,
): Promise<SetLikeResult> {
  const db = client();
  if (!db) return { ok: false, reason: "unavailable" };
  try {
    if (!(await itemExists(db, source, id))) return { ok: false, reason: "not_found" };

    const write = liked
      ? await db
          .from("product_likes")
          .upsert(
            { item_source: source, item_id: id, device_id: deviceId },
            { onConflict: "item_source,item_id,device_id", ignoreDuplicates: true },
          )
      : await db
          .from("product_likes")
          .delete()
          .match({ item_source: source, item_id: id, device_id: deviceId });
    if (write.error) return { ok: false, reason: "unavailable" };

    const counts = await getLikeCounts([{ source, id }]);
    return { ok: true, count: counts[likeKey(source, id)] ?? 0 };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
