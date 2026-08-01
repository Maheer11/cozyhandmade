// Pure decision logic for how the Stripe webhook route should react when it
// finds an existing stripe_webhook_events row for an event.id it just tried
// to insert (a duplicate delivery). Extracted from the route so it's
// unit-testable without a live database or Stripe credentials.
//
// "processing" means mid-flight — a delivery is (or was) actively working
// on this event. "done" means terminal — an order was created, or a refund
// was issued; nothing more will ever happen for this event.id.

export type WebhookEventStatus = "processing" | "done";

export type DuplicateDeliveryAction =
  | "short_circuit_done"   // row is done — acknowledge 200, do nothing more
  | "conflict_retry_later" // row is processing and recent — 409, Stripe retries later
  | "takeover";             // row is processing and stale — the owning delivery likely died; attempt to claim and resume

// A "processing" row older than this can only mean the delivery that owned
// it crashed or was killed mid-flight — no real request takes anywhere
// close to this long. Matches the threshold used by the stuck_webhook_events
// view (lib/supabase/migrations/007_webhook_dedupe_status_and_refunds.sql).
export const STUCK_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000;

export function decideDuplicateDeliveryAction(
  status: WebhookEventStatus,
  updatedAt: Date,
  now: Date,
  staleAfterMs: number = STUCK_PROCESSING_THRESHOLD_MS,
): DuplicateDeliveryAction {
  if (status === "done") return "short_circuit_done";
  const ageMs = now.getTime() - updatedAt.getTime();
  return ageMs >= staleAfterMs ? "takeover" : "conflict_retry_later";
}
