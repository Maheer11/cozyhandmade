import { NextResponse } from "next/server";
import { parseLikeRequest } from "@/lib/likes";
import { setLike } from "@/lib/likes-server";
import { createRateLimiter } from "@/lib/rate-limit";

// Hearts on the mobile hero carousel. Body: { source, id, deviceId, liked }.
// One like per device per item is enforced by the table's primary key
// (migration 017); this only validates, rate-limits and returns the total.

const likeRateLimit = createRateLimiter(30, 60 * 1000);

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const like = parseLikeRequest(raw);
  if (!like) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (likeRateLimit.isLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const result = await setLike(like.source, like.id, like.deviceId, like.liked);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === "not_found" ? "Not found" : "Likes are unavailable right now" },
      { status: result.reason === "not_found" ? 404 : 503 },
    );
  }
  return NextResponse.json({ liked: like.liked, count: result.count });
}
