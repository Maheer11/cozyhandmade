import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { normaliseEmail } from "@/lib/intro";
import { realDeps, requestSignup, siteUrlFrom, SubscribeUnavailable, type SignupSource } from "@/lib/subscribe/service";

// Signup for the "Private access" intro and "Letters from our Studio"
// (docs/DESIGN.md §8). Body: { email, source: "intro" | "newsletter", website }.
// `website` is a honeypot: people never fill it in.
// Always answers { ok: true } for a valid address, so it never reveals who is
// already on the list.

const HOUR = 60 * 60 * 1000;
const byIp = createRateLimiter(5, HOUR);
const byEmail = createRateLimiter(5, HOUR);

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const body = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email : "";
  const source: SignupSource = body.source === "intro" ? "intro" : "newsletter";

  // Honeypot filled: same answer as a real signup, nothing saved or sent.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (byIp.isLimited(ip) || byEmail.isLimited(normaliseEmail(email) || "empty")) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a little while." }, { status: 429 });
  }

  let result;
  try {
    result = await requestSignup(email, source, realDeps(siteUrlFrom(request)));
  } catch (err) {
    if (!(err instanceof SubscribeUnavailable)) console.error("Subscribe: signup threw:", err);
    result = { ok: false as const, reason: "unavailable" as const };
  }

  if (!result.ok) {
    return result.reason === "invalid_email"
      ? NextResponse.json({ error: "That doesn't look like an email address. Check it, e.g. name@example.com." }, { status: 400 })
      : NextResponse.json({ error: "We couldn't sign you up just now. Please try again later." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
