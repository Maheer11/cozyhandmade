import { NextResponse } from "next/server";
import { addNewsletterSubscriber } from "@/lib/newsletter";
import { createRateLimiter } from "@/lib/rate-limit";

// Called by the newsletter form ("Letters from our Studio"). Adds the email
// to Resend Contacts; see lib/newsletter.ts for configuration.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const signupRateLimit = createRateLimiter(5, 10 * 60 * 1000);

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email =
    typeof raw === "object" && raw !== null && "email" in raw && typeof raw.email === "string"
      ? raw.email.trim().toLowerCase()
      : "";
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (signupRateLimit.isLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  const result = await addNewsletterSubscriber(email);
  if (!result.ok) {
    return NextResponse.json(
      { error: "We couldn't sign you up just now. Please try again later." },
      { status: result.reason === "not_configured" ? 503 : 502 },
    );
  }
  return NextResponse.json({ ok: true, alreadySubscribed: result.alreadySubscribed });
}
