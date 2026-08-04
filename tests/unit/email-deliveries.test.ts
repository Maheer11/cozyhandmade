import { describe, it, expect, vi } from "vitest";
import {
  claimEmailDelivery,
  completeEmailDelivery,
  sendClaimedEmail,
  deliverEmail,
} from "@/lib/checkout/emailDeliveries";

// These exercise the email_deliveries claim/send protocol with a fake db and
// a fake sender — no network, no Supabase, no Stripe, no live credentials.
// The protocol is what guarantees (a) a duplicate webhook delivery sends no
// second email and (b) an email provider failure can never reach the
// webhook's response, so it must be tested without gating.

type InsertCall = Record<string, unknown>;

function fakeDb(opts: { insertError?: { code?: string } | null; updateError?: unknown } = {}) {
  const inserts: InsertCall[] = [];
  const updates: InsertCall[] = [];
  const db = {
    from() {
      return {
        insert(row: InsertCall) {
          inserts.push(row);
          return Promise.resolve({ error: opts.insertError ?? null });
        },
        update(row: InsertCall) {
          updates.push(row);
          const chain = {
            eq: () => chain,
            then: (resolve: (v: unknown) => unknown) =>
              resolve({ error: opts.updateError ?? null }),
          };
          return chain;
        },
      };
    },
  };
  return { db, inserts, updates };
}

describe("claimEmailDelivery", () => {
  const claim = {
    kind: "order_confirmation" as const,
    paymentIntentId: "pi_123",
    orderId: "order-1",
    recipient: "maja@example.com",
  };

  it("claims a fresh send and writes a pending row", async () => {
    const { db, inserts } = fakeDb();
    await expect(claimEmailDelivery(db, claim)).resolves.toBe("claimed");
    expect(inserts[0]).toMatchObject({
      kind: "order_confirmation",
      payment_intent_id: "pi_123",
      recipient: "maja@example.com",
      status: "pending",
    });
  });

  // The core idempotency guarantee. A stale 'processing' webhook event can
  // be taken over and reprocessed, so this genuinely happens in production.
  it("reports a duplicate when the unique constraint rejects the insert", async () => {
    const { db } = fakeDb({ insertError: { code: "23505" } });
    await expect(claimEmailDelivery(db, claim)).resolves.toBe("duplicate");
  });

  it("refuses to claim with no recipient rather than sending nowhere", async () => {
    const { db, inserts } = fakeDb();
    await expect(claimEmailDelivery(db, { ...claim, recipient: null })).resolves.toBe("no_recipient");
    await expect(claimEmailDelivery(db, { ...claim, recipient: "   " })).resolves.toBe("no_recipient");
    expect(inserts).toHaveLength(0);
  });

  it("reports claim_failed on a non-unique-constraint database error", async () => {
    const { db } = fakeDb({ insertError: { code: "08006" } });
    await expect(claimEmailDelivery(db, claim)).resolves.toBe("claim_failed");
  });
});

describe("sendClaimedEmail", () => {
  const claim = {
    kind: "order_confirmation" as const,
    paymentIntentId: "pi_123",
    recipient: "maja@example.com",
  };

  it("records a successful send", async () => {
    const { db, updates } = fakeDb();
    const outcome = await sendClaimedEmail(db, claim, async () => ({ sent: true }));
    expect(outcome).toBe("sent");
    expect(updates[0]).toMatchObject({ status: "sent", error_message: null });
  });

  it("records a provider-reported failure without throwing", async () => {
    const { db, updates } = fakeDb();
    const outcome = await sendClaimedEmail(db, claim, async () => ({
      sent: false,
      error: "Resend API error 503",
    }));
    expect(outcome).toBe("failed");
    expect(updates[0]).toMatchObject({ status: "failed", error_message: "Resend API error 503" });
  });

  // THE CRITICAL REGRESSION GUARD. The Stripe webhook must return 200 once
  // the order exists, whatever the email provider does. If a sender can
  // throw through this function, that promise breaks and Stripe starts
  // retrying deliveries whose orders were already created.
  it("contains a sender that throws — resolves 'failed' rather than propagating", async () => {
    const { db, updates } = fakeDb();
    const exploding = vi.fn(async () => {
      throw new Error("socket hang up");
    });
    const outcome = await sendClaimedEmail(db, claim, exploding);
    expect(outcome).toBe("failed");
    expect(updates[0]).toMatchObject({ status: "failed", error_message: "socket hang up" });
  });

  it("still resolves when recording the outcome itself fails", async () => {
    const { db } = fakeDb({ updateError: { message: "db gone" } });
    await expect(sendClaimedEmail(db, claim, async () => ({ sent: true }))).resolves.toBe("sent");
  });
});

describe("deliverEmail", () => {
  const claim = {
    kind: "refund_notification" as const,
    paymentIntentId: "pi_456",
    recipient: "maja@example.com",
  };

  it("claims then sends", async () => {
    const { db } = fakeDb();
    await expect(deliverEmail(db, claim, async () => ({ sent: true }))).resolves.toBe("sent");
  });

  it("sends nothing when the claim is a duplicate", async () => {
    const { db } = fakeDb({ insertError: { code: "23505" } });
    const send = vi.fn(async () => ({ sent: true }));
    await expect(deliverEmail(db, claim, send)).resolves.toBe("duplicate");
    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing when there is no recipient", async () => {
    const { db } = fakeDb();
    const send = vi.fn(async () => ({ sent: true }));
    await expect(deliverEmail(db, { ...claim, recipient: undefined }, send)).resolves.toBe("no_recipient");
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send when the ledger row could not be written", async () => {
    const { db } = fakeDb({ insertError: { code: "08006" } });
    const send = vi.fn(async () => ({ sent: true }));
    await expect(deliverEmail(db, claim, send)).resolves.toBe("claim_failed");
    expect(send).not.toHaveBeenCalled();
  });
});

describe("completeEmailDelivery", () => {
  it("swallows a database error rather than throwing into the webhook", async () => {
    const { db } = fakeDb({ updateError: { message: "connection reset" } });
    await expect(
      completeEmailDelivery(db, { kind: "admin_new_order", paymentIntentId: "pi_1" }, { sent: true }),
    ).resolves.toBeUndefined();
  });
});
