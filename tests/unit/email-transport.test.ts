import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// lib/email.ts's whole contract is "never throws" — the Stripe webhook calls
// it inline after the order is committed and must return 200 regardless.
// These tests stub global fetch, so they need no network and no credentials.

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_FROM_EMAIL = "Cozihandmade <orders@example.test>";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

async function importEmail() {
  return import("@/lib/email");
}

// vi.fn() infers an empty tuple for its call args, so reading calls[i][1]
// needs the real fetch shape asserting once here rather than at every site.
function bodyOf(spy: ReturnType<typeof vi.fn>, index = 0): Record<string, unknown> {
  const calls = spy.mock.calls as unknown as Array<[string, { body: string }]>;
  return JSON.parse(calls[index][1].body);
}

describe("sendEmail", () => {
  it("reports a result rather than throwing when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }));
    const { sendEmail } = await importEmail();
    await expect(
      sendEmail({ to: "a@b.test", subject: "s", text: "t" }),
    ).resolves.toEqual({ sent: false, error: "Network error sending email" });
  });

  it("distinguishes a timeout from an ordinary network fault", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      const err = new Error("The operation was aborted due to timeout");
      err.name = "TimeoutError";
      throw err;
    }));
    const { sendEmail } = await importEmail();
    await expect(
      sendEmail({ to: "a@b.test", subject: "s", text: "t" }),
    ).resolves.toEqual({ sent: false, error: "Email send timed out" });
  });

  it("reports a non-2xx from the provider without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => "service unavailable",
    })));
    const { sendEmail } = await importEmail();
    await expect(
      sendEmail({ to: "a@b.test", subject: "s", text: "t" }),
    ).resolves.toEqual({ sent: false, error: "Resend API error 503" });
  });

  it("skips cleanly when the provider is not configured at all", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { sendEmail } = await importEmail();
    await expect(
      sendEmail({ to: "a@b.test", subject: "s", text: "t" }),
    ).resolves.toEqual({ sent: false, error: "Email service not configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sets a reply-to only when one is given", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendEmail } = await importEmail();

    await sendEmail({ to: "a@b.test", subject: "s", text: "t", replyTo: "reply@b.test" });
    expect(bodyOf(fetchSpy, 0).reply_to).toBe("reply@b.test");

    await sendEmail({ to: "a@b.test", subject: "s", text: "t" });
    expect(bodyOf(fetchSpy, 1)).not.toHaveProperty("reply_to");
  });
});

describe("templates", () => {
  it("carries the statutory cancellation notice and business identity", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendOrderConfirmationEmail } = await importEmail();

    await sendOrderConfirmationEmail({
      to: "maja@example.test",
      orderId: "a1b2c3d4-0000-0000-0000-000000000000",
      items: [{ product_name: "Ceramic Vase", quantity: 1, unit_price: 60 }],
      subtotal: 60,
      shipping: 13,
      total: 73,
      currency: "EUR",
      chargedAmount: 73,
      chargedCurrency: "EUR",
      deliveryAddress: { firstName: "Maja", country: "IE" },
      estimatedDays: "within 7 business days",
      placedAt: new Date("2026-08-03T12:00:00Z"),
    });

    const body = bodyOf(fetchSpy, 0);
    const text = body.text as string;
    expect(body.subject).toBe("Order confirmed — #A1B2C3D4");
    expect(text).toContain("Ceramic Vase");
    expect(text).toContain("Company registration number: 790221");

    // The unfinished placeholder must never reach a customer again.
    expect(text).not.toContain("DO NOT SEND AS IS");
    expect(text).not.toContain("PLACEHOLDER");

    // Each of these is a distinct legal requirement, not decoration:
    // the 14-day window, how to exercise it, that the model form exists,
    // who pays return postage, and that outbound delivery is refunded too.
    expect(text).toContain("YOUR RIGHT TO CANCEL");
    expect(text).toContain("within 14 days of receiving it");
    expect(text).toContain("model cancellation form");
    expect(text).toContain("Return postage is");
    expect(text).toContain("including standard delivery");

    // The made-to-specification exemption must stay narrow — claiming it
    // for ordinary colour choices would deny customers a right they have.
    expect(text).toContain("is not a special order");
  });

  // A customer paying in USD sees EUR line items; without this line they'd
  // have no idea what actually left their account.
  it("names the charge currency only when it differs from the pricing currency", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendOrderConfirmationEmail } = await importEmail();

    const base = {
      to: "maja@example.test",
      orderId: "a1b2c3d4-0000-0000-0000-000000000000",
      items: [{ product_name: "Vase", quantity: 1, unit_price: 60 }],
      subtotal: 60,
      shipping: 13,
      total: 73,
      currency: "EUR",
      deliveryAddress: { firstName: "Maja" },
      estimatedDays: "within 7 business days",
      placedAt: new Date("2026-08-03T12:00:00Z"),
    };

    await sendOrderConfirmationEmail({ ...base, chargedAmount: 73, chargedCurrency: "EUR" });
    expect(bodyOf(fetchSpy, 0).text).not.toContain("Charged as");

    await sendOrderConfirmationEmail({ ...base, chargedAmount: 79.4, chargedCurrency: "USD" });
    expect(bodyOf(fetchSpy, 1).text).toContain("Charged as");
  });

  it("does not offer withdrawal rights in the refund email — no order exists", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendRefundNotificationEmail } = await importEmail();

    await sendRefundNotificationEmail({
      to: "maja@example.test",
      productName: "Ceramic Vase",
      amount: 73,
      currency: "EUR",
      deliveryAddress: { firstName: "Maja" },
    });

    const body = bodyOf(fetchSpy, 0);
    expect(body.subject).toContain("Ceramic Vase");
    expect(body.text).toContain("refunded in full");
    expect(body.text).not.toContain("WITHDRAWAL");
  });

  it("keeps the existing order-status email output unchanged", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendOrderStatusEmail } = await importEmail();

    await sendOrderStatusEmail({
      to: "maja@example.test",
      orderId: "a1b2c3d4-0000-0000-0000-000000000000",
      status: "shipped",
      estimatedDeliveryDate: "by 12 August 2026",
    });

    const body = bodyOf(fetchSpy, 0);
    expect(body.subject).toBe("Your order #A1B2C3D4 has shipped!");
    expect(body.text).toBe("Order #A1B2C3D4\nStatus: Shipped\nEstimated delivery: by 12 August 2026");
  });
});

describe("parseRecipients", () => {
  it("splits a comma-separated list and trims whitespace", async () => {
    const { parseRecipients } = await importEmail();
    expect(parseRecipients("a@x.test, b@y.test ,c@z.test")).toEqual([
      "a@x.test", "b@y.test", "c@z.test",
    ]);
  });

  it("treats unset or blank as no recipients rather than one empty one", async () => {
    const { parseRecipients } = await importEmail();
    expect(parseRecipients(undefined)).toEqual([]);
    expect(parseRecipients("")).toEqual([]);
    expect(parseRecipients("  ,  ,")).toEqual([]);
  });

  it("de-duplicates so nobody gets the same alert twice", async () => {
    const { parseRecipients } = await importEmail();
    expect(parseRecipients("a@x.test, a@x.test")).toEqual(["a@x.test"]);
  });

  it("still works for a single address, unchanged from before", async () => {
    const { parseRecipients } = await importEmail();
    expect(parseRecipients("solo@x.test")).toEqual(["solo@x.test"]);
  });
});

describe("admin alert with several recipients", () => {
  it("sends one email addressed to all of them", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendAdminNewOrderEmail } = await importEmail();

    await sendAdminNewOrderEmail({
      to: ["her@example.test", "him@example.test"],
      orderId: "a1b2c3d4-0000-0000-0000-000000000000",
      items: [{ product_name: "Vase", quantity: 1, unit_price: 60 }],
      shipping: 13,
      total: 73,
      currency: "EUR",
      deliveryAddress: { firstName: "Maja", lastName: "Byrne" },
      estimatedDays: "within 7 business days",
      placedAt: new Date("2026-08-03T12:00:00Z"),
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(bodyOf(fetchSpy, 0).to).toEqual(["her@example.test", "him@example.test"]);
  });
});
