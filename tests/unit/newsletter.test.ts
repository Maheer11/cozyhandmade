// POST /api/newsletter with Resend mocked (fetch) — no real contacts created.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

interface Call { url: string; auth: string; body: { email: string; unsubscribed: boolean; segments?: { id: string }[] } }
let calls: Call[];
let reply: () => Response;

async function loadRoute() {
  vi.resetModules(); // fresh rate limiter per test
  return (await import("@/app/api/newsletter/route")).POST;
}

function post(POST: (r: Request) => Promise<Response>, email: unknown, ip = "203.0.113.7") {
  return POST(new Request("http://localhost/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email }),
  }));
}

describe("POST /api/newsletter", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    calls = [];
    reply = () => new Response('{"object":"contact","id":"c1"}', { status: 200 });
    vi.stubEnv("RESEND_CONTACTS_API_KEY", "re_full");
    vi.stubEnv("RESEND_API_KEY", "re_sending");
    vi.stubEnv("RESEND_NEWSLETTER_SEGMENT_ID", "seg_123");
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, auth: String((init.headers as Record<string, string>).Authorization), body: JSON.parse(String(init.body)) });
      return reply();
    }));
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    errorSpy.mockRestore();
  });

  it("adds the email to Resend Contacts in the newsletter segment, with the contacts key", async () => {
    const POST = await loadRoute();
    const res = await post(POST, "  Sarah@Example.com ");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadySubscribed: false });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/contacts");
    expect(calls[0].auth).toBe("Bearer re_full");
    expect(calls[0].body).toEqual({ email: "sarah@example.com", unsubscribed: false, segments: [{ id: "seg_123" }] });
  });

  it("falls back to RESEND_API_KEY and no segment when those aren't set", async () => {
    vi.stubEnv("RESEND_CONTACTS_API_KEY", "");
    vi.stubEnv("RESEND_NEWSLETTER_SEGMENT_ID", "");
    const POST = await loadRoute();
    await post(POST, "sarah@example.com");
    expect(calls[0].auth).toBe("Bearer re_sending");
    expect(calls[0].body.segments).toBeUndefined();
  });

  it("already on the list counts as subscribed", async () => {
    reply = () => new Response('{"message":"Contact already exists"}', { status: 409 });
    const POST = await loadRoute();
    const res = await post(POST, "sarah@example.com");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, alreadySubscribed: true });
  });

  it("Resend refusing the key (e.g. sending-only) is reported as a failure, not a fake success", async () => {
    reply = () => new Response('{"message":"API key is restricted"}', { status: 401 });
    const POST = await loadRoute();
    const res = await post(POST, "sarah@example.com");
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/couldn't sign you up/i);
  });

  it("no key configured: 503, nothing sent", async () => {
    vi.stubEnv("RESEND_CONTACTS_API_KEY", "");
    vi.stubEnv("RESEND_API_KEY", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const POST = await loadRoute();
    expect((await post(POST, "sarah@example.com")).status).toBe(503);
    expect(calls).toHaveLength(0);
    warn.mockRestore();
  });

  it("rejects an invalid email without calling Resend", async () => {
    const POST = await loadRoute();
    for (const bad of ["", "not-an-email", "a@b", 42, `${"x".repeat(250)}@example.com`]) {
      expect((await post(POST, bad)).status).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it("5 attempts per visitor per 10 minutes, then 429", async () => {
    const POST = await loadRoute();
    for (let i = 0; i < 5; i++) expect((await post(POST, `p${i}@example.com`)).status).toBe(200);
    expect((await post(POST, "p6@example.com")).status).toBe(429);
    expect((await post(POST, "other@example.com", "198.51.100.9")).status).toBe(200);
  });
});
