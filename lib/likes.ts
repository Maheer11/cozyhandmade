// Likes on the mobile hero carousel: the parts shared by the browser and the
// server. Server-only code (database access) lives in lib/likes-server.ts.
// Storage: public.product_likes (lib/supabase/migrations/017_product_likes.sql).

export type LikeSource = "product" | "featured_piece";

export const LIKE_SOURCES: readonly LikeSource[] = ["product", "featured_piece"];

/** One key per item, e.g. "product:6f1c…". Used for counts and liked state. */
export function likeKey(source: LikeSource, id: string): string {
  return `${source}:${id}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isLikeSource(value: unknown): value is LikeSource {
  return typeof value === "string" && (LIKE_SOURCES as readonly string[]).includes(value);
}

/** The body POST /api/likes accepts, validated. null when anything is off. */
export function parseLikeRequest(
  raw: unknown,
): { source: LikeSource; id: string; deviceId: string; liked: boolean } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isLikeSource(r.source) || !isUuid(r.id) || !isUuid(r.deviceId) || typeof r.liked !== "boolean") {
    return null;
  }
  return { source: r.source, id: r.id.toLowerCase(), deviceId: r.deviceId.toLowerCase(), liked: r.liked };
}
