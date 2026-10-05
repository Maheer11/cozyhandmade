// POST /api/custom-order-request with the real email template and a mocked
// email provider (fetch) — nothing is actually sent.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

interface ResendBody {
  to: string[];
  subject: string;
  text: string;
  reply_to?: string;
}

let sent: ResendBody[];

async function loadRoute() {
  // Fresh module per test, so each starts with an empty rate limiter.
  vi.resetModules();
  return (await import("@/app/api/custom-order-request/route")).POST;
}

function post(POST: (r: Request) => Promise<Response>, body: Record<string, unknown>, ip = "203.0.113.7") {
  return POST(new Request("http://localhost/api/custom-order-request", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  }));
}

const valid = {
  name: "Sarah",
  contact: "sarah@example.com",
  category: "Baby",
  description: "A cream baby blanket with her initials\nNeeded by December",
  budget: "€80–120",
};

describe("POST /api/custom-order-request", () => {
  beforeEach(() => {
    sent = [];
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "orders@example.com");
    vi.stubEnv("ORDER_NOTIFICATION_EMAILS", "shop@example.com, owner@example.com");
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)) as ResendBody);
      return new Response("{}", { status: 200 });
    }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("emails the shop a copy with every field, replying to the customer's email", async () => {
    const POST = await loadRoute();
    const res = await post(POST, valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, emailed: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["shop@example.com", "owner@example.com"]);
    expect(sent[0].subject).toBe("Custom order request · Sarah");
    expect(sent[0].reply_to).toBe("sarah@example.com");
    for (const part of ["Sarah", "sarah@example.com", "Baby", "€80–120", "  A cream baby blanket with her initials", "  Needed by December"]) {
      expect(sent[0].text).toContain(part);
    }
  });

  it("a phone number as contact: no reply-to, and the email says to contact them on it", async () => {
    const POST = await loadRoute();
    await post(POST, { ...valid, contact: "+353 87 000 0000" });
    expect(sent[0].reply_to).toBeUndefined();
    expect(sent[0].text).toContain("contact them on the number above");
  });

  it("falls back to ADMIN_EMAIL when ORDER_NOTIFICATION_EMAILS is not set", async () => {
    vi.stubEnv("ORDER_NOTIFICATION_EMAILS", undefined as unknown as string);
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    const POST = await loadRoute();
    await post(POST, valid);
    expect(sent[0].to).toEqual(["admin@example.com"]);
  });

  it("no recipients configured: still 200 for the customer, nothing sent", async () => {
    vi.stubEnv("ORDER_NOTIFICATION_EMAILS", "");
    vi.stubEnv("ADMIN_EMAIL", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const POST = await loadRoute();
    const res = await post(POST, valid);
    expect(await res.json()).toEqual({ ok: true, emailed: false });
    expect(sent).toHaveLength(0);
    warn.mockRestore();
  });

  it("rejects a request missing the description", async () => {
    const POST = await loadRoute();
    const res = await post(POST, { ...valid, description: "   " });
    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("rejects an oversized field", async () => {
    const POST = await loadRoute();
    const res = await post(POST, { ...valid, description: "x".repeat(3001) });
    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("allows 5 requests per visitor per 10 minutes, then 429", async () => {
    const POST = await loadRoute();
    for (let i = 0; i < 5; i++) expect((await post(POST, valid)).status).toBe(200);
    expect((await post(POST, valid)).status).toBe(429);
    expect(sent).toHaveLength(5);
    // A different visitor is unaffected.
    expect((await post(POST, valid, "198.51.100.9")).status).toBe(200);
  });
});
