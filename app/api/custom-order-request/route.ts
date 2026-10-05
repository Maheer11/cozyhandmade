import { NextResponse } from "next/server";
import { parseRecipients, sendCustomOrderRequestEmail } from "@/lib/email";
import { createRateLimiter } from "@/lib/rate-limit";

// Called by the /custom-order form as it opens WhatsApp, so the shop gets an
// email copy of every request, including ones the customer never actually
// sends from WhatsApp. Public and unauthenticated (guests can ask for custom
// pieces), so it only ever emails the shop's own configured address, caps
// every field, and limits how often one visitor can send.

const LIMITS = { name: 100, contact: 200, category: 100, description: 3000, budget: 100 } as const;

// Filling the owner's inbox is the realistic abuse here, so one visitor can
// send at most 5 requests per 10 minutes (best-effort; see lib/rate-limit).
const customOrderRateLimit = createRateLimiter(5, 10 * 60 * 1000);

function field(body: Record<string, unknown>, key: keyof typeof LIMITS): string | null {
  const value = body[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > LIMITS[key] ? null : trimmed;
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  const name = field(body, "name");
  const contact = field(body, "contact");
  const category = field(body, "category");
  const description = field(body, "description");
  const budget = field(body, "budget");
  if (name === null || contact === null || category === null || description === null || budget === null) {
    return NextResponse.json({ error: "One of the fields is too long" }, { status: 400 });
  }
  if (!name || !contact || !description) {
    return NextResponse.json({ error: "Name, contact and description are required" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (customOrderRateLimit.isLimited(ip)) {
    return NextResponse.json({ error: "Too many requests, please try again later" }, { status: 429 });
  }

  // Same recipients as the new-order alert (see the Stripe webhook).
  const result = await sendCustomOrderRequestEmail({
    to: parseRecipients(process.env.ORDER_NOTIFICATION_EMAILS ?? process.env.ADMIN_EMAIL),
    name,
    contact,
    category: category || "Not specified",
    description,
    budget: budget || undefined,
    receivedAt: new Date(),
  });

  // The customer is already on their way to WhatsApp; a failed email is
  // logged (inside sendEmail) rather than shown to them.
  return NextResponse.json({ ok: true, emailed: result.sent });
}
