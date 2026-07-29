import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { getStripeWebhookSecret } from "@/lib/stripe/env";
import { updateSpendTier } from "@/lib/checkout/updateSpendTier";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

// Max allowed drift between the staged total (converted to the PaymentIntent's
// currency, in minor units) and what Stripe actually confirmed was charged.
// The two should match exactly (create-intent sets the amount deterministically
// from the same total), so this only exists as a rounding-safety margin.
const AMOUNT_TOLERANCE_MINOR_UNITS = 2;

// lib/supabase/types.ts has no Functions map, so .rpc() calls are untyped
// through the generated Database type — every admin-client route in this
// repo (orders/route.ts, invoice route, admin routes) already casts to
// `any` for the same reason rather than typing each call site by hand.
// Matching that existing convention here rather than introducing a
// one-off inconsistency; adding a proper Functions map is a real
// improvement but a separate, larger change than this task asked for.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// Deletes the stripe_webhook_events row for this event before returning a
// non-200 response, so that Stripe's automatic retry of the SAME event.id
// is allowed to attempt processing again — only an event that reaches a
// successful terminal state stays permanently blocked from reprocessing.
async function failAndAllowRetry(db: AdminClient, eventId: string, body: Record<string, unknown>, status: number) {
  await db.from("stripe_webhook_events").delete().eq("event_id", eventId);
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  // Raw body is required for signature verification — must NOT be
  // JSON-parsed before constructEvent runs, or the signature won't match.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Nothing below this line runs until the signature is verified — no DB
  // read, no logging of payload contents, no side effects on an unverified
  // request.
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // event.livemode can only be trusted now that the signature has verified —
  // it's payload content, not something to branch on beforehand. A single
  // deployment only ever has one Stripe secret/webhook-secret pair
  // configured (test-mode locally and in CI per lib/stripe/env.ts's guard,
  // live-mode only when NODE_ENV=production), so this is a defense-in-depth
  // cross-check against misconfiguration — e.g. a live webhook secret
  // accidentally pointed at a non-production deployment — not a mode router.
  const expectedLivemode = process.env.NODE_ENV === "production";
  if (event.livemode !== expectedLivemode) {
    console.error(
      `Stripe webhook: event.livemode=${event.livemode} does not match this deployment ` +
      `(expected ${expectedLivemode}) — refusing to process event ${event.id}.`
    );
    return NextResponse.json({ error: "Event mode does not match this environment" }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    // Not an event we act on — acknowledge so Stripe doesn't retry. No
    // dedupe-ledger row needed for event types we never process.
    return NextResponse.json({ received: true });
  }

  const db: AdminClient = createAdminClient();

  // Idempotency: insert event.id BEFORE any order-creating work. Stripe
  // guarantees at-least-once delivery, not exactly-once — a duplicate
  // delivery of this exact event.id hits this UNIQUE constraint and is
  // rejected by the database itself, not by a read-then-write check (which
  // would have a race window between two concurrent deliveries).
  const { error: dedupeError } = await db.from("stripe_webhook_events").insert({ event_id: event.id });
  if (dedupeError) {
    if (dedupeError.code === "23505") {
      // Exact-duplicate delivery of an event we already fully processed.
      return NextResponse.json({ received: true, note: "duplicate event, already processed" });
    }
    console.error("Stripe webhook: failed to record event dedupe row", dedupeError);
    return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  // Look up the staged cart/delivery data. A missing row means either this
  // PaymentIntent was already fully processed by an earlier, different
  // event.id for it (rare, but the transactions.stripe_session_id UNIQUE
  // constraint inside checkout_verified_order() is the final backstop
  // against that ever double-creating an order), or it was never staged.
  // Either way there is nothing more to do — acknowledge without creating
  // an order.
  const { data: pending, error: pendingError } = await db
    .from("pending_stripe_orders")
    .select("*")
    .eq("payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (pendingError) {
    console.error("Stripe webhook: failed to look up pending_stripe_orders", pendingError);
    return failAndAllowRetry(db, event.id, { error: "Lookup failed" }, 500);
  }

  if (!pending) {
    return NextResponse.json({ received: true, note: "No staged order for this PaymentIntent" });
  }

  // Confirm Stripe actually captured the full amount our own create-intent
  // route set (deterministically, from the server-verified total at intent
  // creation time). `amount` is Stripe's own record of what we asked to
  // charge — comparing amount_received against it (rather than re-deriving
  // a price from a fresh exchange-rate fetch here) avoids a false-positive
  // mismatch from ordinary FX-rate drift between intent creation and now,
  // while still catching partial captures or any post-creation tampering.
  const amountDiff = Math.abs(paymentIntent.amount_received - paymentIntent.amount);
  if (
    paymentIntent.status !== "succeeded" ||
    paymentIntent.currency.toUpperCase() !== pending.currency ||
    amountDiff > AMOUNT_TOLERANCE_MINOR_UNITS
  ) {
    console.error(
      `Stripe webhook: amount/status mismatch for intent ${paymentIntent.id} — ` +
      `status=${paymentIntent.status}, amount=${paymentIntent.amount}, received=${paymentIntent.amount_received}`
    );
    return failAndAllowRetry(db, event.id, { error: "Charge could not be verified" }, 400);
  }

  const { data: orderId, error: rpcError } = await db.rpc("checkout_verified_order", {
    p_user_id: pending.user_id,
    p_total_amount: pending.total_amount,
    p_delivery_address: pending.delivery_address,
    p_currency: pending.currency,
    p_stripe_reference: paymentIntent.id,
    p_payment_channel: "stripe_card",
    p_items: pending.items,
    p_charged_amount: paymentIntent.amount_received / 100,
  });

  if (rpcError) {
    if (rpcError.message?.startsWith("OUT_OF_STOCK:")) {
      const productName = rpcError.message.split("OUT_OF_STOCK:")[1]?.trim();
      // TODO: trigger a refund via stripe.refunds.create({ payment_intent: paymentIntent.id })
      // here — the charge succeeded but stock ran out before it could be
      // reserved, so the customer needs a refund. Leaving the staging row in
      // place (not deleting it) so this is discoverable/reconcilable.
      console.error(`Stripe webhook: out of stock (${productName}) for intent ${paymentIntent.id} — refund needed`);
      return failAndAllowRetry(db, event.id, { error: `Out of stock: ${productName}` }, 409);
    }
    console.error("Stripe webhook: checkout_verified_order RPC failed", rpcError);
    return failAndAllowRetry(db, event.id, { error: "Order creation failed" }, 500);
  }

  // Order created — the staging row has done its job. Respond fast; there's
  // no queue in this app, but everything from here is one already-fast
  // Postgres update plus the delete above, not a slow external call, so
  // doing it inline keeps the code simple without risking Stripe's response
  // timeout.
  await db.from("pending_stripe_orders").delete().eq("payment_intent_id", paymentIntent.id);

  if (pending.user_id) {
    await updateSpendTier(db, pending.user_id, pending.total_amount);
  }

  return NextResponse.json({ received: true, order_id: orderId });
}
