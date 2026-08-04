// Claim/complete protocol for the email_deliveries ledger (migration 008).
//
// Deliberately the SAME shape as the refunds handling already in the Stripe
// webhook: write an honest "we are attempting this" row BEFORE the external
// call, then update it with the outcome. That ordering is what makes both
// idempotency and failure-discoverability fall out of one table.
//
// Split into claim + complete (rather than one send-it-all helper) so the
// caller can claim BEFORE marking the webhook event terminal and send AFTER.
// If the process dies in between, the row survives as 'pending' and shows up
// in failed_email_deliveries, instead of the event being marked done with no
// email and no trace.
//
// Nothing here throws. The webhook calls it after the order is already
// committed, and must return 200 regardless.

import type { SendResult } from "@/lib/email";

export type EmailKind = "order_confirmation" | "refund_notification" | "admin_new_order";

// lib/supabase/types.ts has no Functions map and every admin-client route in
// this repo already casts to `any` for the same reason — matching that
// convention rather than introducing a one-off inconsistency.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export interface EmailClaim {
  kind: EmailKind;
  paymentIntentId: string;
  orderId?: string | null;
  recipient: string | null | undefined;
}

export type ClaimOutcome =
  | "claimed"            // we own this send — go ahead
  | "duplicate"          // another delivery already owns/completed it — send nothing
  | "no_recipient"       // nothing to send to
  | "claim_failed";      // couldn't write the ledger row

/**
 * Attempts to claim the right to send one email.
 *
 * Returns "duplicate" when the (kind, payment_intent_id) unique constraint
 * rejects the insert — which is exactly what happens when a stale
 * 'processing' webhook event is taken over and reprocessed. That is the
 * mechanism preventing a second confirmation email, and it lives in the
 * database rather than in a read-then-write check, so two concurrent
 * deliveries cannot both pass it.
 */
export async function claimEmailDelivery(db: AdminClient, claim: EmailClaim): Promise<ClaimOutcome> {
  const recipient = claim.recipient?.trim();
  if (!recipient) {
    console.warn(`Email delivery: no recipient for ${claim.kind} on ${claim.paymentIntentId} — skipping`);
    return "no_recipient";
  }

  const { error } = await db.from("email_deliveries").insert({
    kind: claim.kind,
    payment_intent_id: claim.paymentIntentId,
    order_id: claim.orderId ?? null,
    recipient,
    status: "pending",
  });

  if (!error) return "claimed";

  if (error.code === "23505") return "duplicate";

  // Refusing to send without a ledger row is deliberate, and matches how the
  // refund path refuses to call Stripe without one. Sending anyway would
  // create an email nothing records and a retry could duplicate. An insert
  // failing here almost certainly means the database is unreachable, which
  // is both rare and loudly visible by other means.
  console.error(`Email delivery: could not claim ${claim.kind} for ${claim.paymentIntentId}`, error);
  return "claim_failed";
}

/**
 * Records the outcome of a claimed send. Best-effort by design: if this
 * update fails the row simply stays 'pending' and surfaces in
 * failed_email_deliveries as stuck, which is the correct reading anyway —
 * we genuinely don't know whether it arrived.
 */
export async function completeEmailDelivery(
  db: AdminClient,
  claim: Pick<EmailClaim, "kind" | "paymentIntentId">,
  result: SendResult,
): Promise<void> {
  const { error } = await db
    .from("email_deliveries")
    .update({
      status: result.sent ? "sent" : "failed",
      error_message: result.error ?? null,
      attempts: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("kind", claim.kind)
    .eq("payment_intent_id", claim.paymentIntentId);

  if (error) {
    console.error(`Email delivery: could not record outcome for ${claim.kind} on ${claim.paymentIntentId}`, error);
  }
}

/**
 * Sends an already-claimed email and records the outcome.
 *
 * `send` is injected rather than imported so tests can exercise this —
 * including a sender that throws — with no network call and no live
 * credentials.
 *
 * A sender that throws is caught and recorded as a failed delivery. This is
 * the guarantee the Stripe webhook depends on: this function resolves,
 * always, whatever the email provider does. It is the last place an
 * exception could otherwise escape into the webhook's response path.
 */
export async function sendClaimedEmail(
  db: AdminClient,
  claim: EmailClaim,
  send: () => Promise<SendResult>,
): Promise<"sent" | "failed"> {
  let result: SendResult;
  try {
    result = await send();
  } catch (err) {
    console.error(`Email delivery: sender threw for ${claim.kind} on ${claim.paymentIntentId}`, err);
    result = { sent: false, error: err instanceof Error ? err.message : String(err) };
  }

  await completeEmailDelivery(db, claim, result);
  return result.sent ? "sent" : "failed";
}

/**
 * claim → send → complete in one call, for callers with no reason to
 * separate the two halves.
 *
 * The Stripe webhook's success path deliberately does NOT use this: it
 * claims before marking the event terminal and sends after, so a crash
 * between the two leaves a discoverable 'pending' row.
 */
export async function deliverEmail(
  db: AdminClient,
  claim: EmailClaim,
  send: () => Promise<SendResult>,
): Promise<ClaimOutcome | "sent" | "failed"> {
  const outcome = await claimEmailDelivery(db, claim);
  if (outcome !== "claimed") return outcome;
  return sendClaimedEmail(db, claim, send);
}
