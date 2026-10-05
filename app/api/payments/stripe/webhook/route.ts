import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { getStripeWebhookSecret } from "@/lib/stripe/env";
import { updateSpendTier } from "@/lib/checkout/updateSpendTier";
import { decideDuplicateDeliveryAction, STUCK_PROCESSING_THRESHOLD_MS } from "@/lib/checkout/webhookDedupe";
import { claimEmailDelivery, sendClaimedEmail, deliverEmail } from "@/lib/checkout/emailDeliveries";
import {
  parseRecipients,
  sendOrderConfirmationEmail,
  sendRefundNotificationEmail,
  sendAdminNewOrderEmail,
  type DeliveryAddress,
  type OrderEmailItem,
} from "@/lib/email";
import { calculateShipping } from "@/lib/checkout/shipping";
import { checkChargeMatchesPending } from "@/lib/checkout/amounts";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerifiedItem } from "@/lib/checkout/repriceItems";

// lib/supabase/types.ts has no Relationships/Functions maps, so the
// generated-typed client resolves every query to `never`. The untyped client
// is used instead, and the one row this route reads is cast to
// PendingStripeOrder below.
type AdminClient = SupabaseClient;

interface PendingStripeOrder {
  payment_intent_id: string;
  user_id: string | null;
  // Written by app/api/checkout/intent from repriceItems().
  items: VerifiedItem[];
  delivery_address: Record<string, string> | null;
  total_amount: number;
  subtotal_amount: number | null;
  shipping_amount: number | null;
  currency: string;
  resolved_at: string | null;
}

// Deletes the stripe_webhook_events row for this event before returning a
// non-200 response, so that Stripe's automatic retry of the SAME event.id
// is allowed to attempt processing again — only an event that reaches a
// successful terminal state stays permanently blocked from reprocessing.
// Only for genuinely retry-worthy failures (transient lookup/RPC errors) —
// OUT_OF_STOCK is handled separately below since it's permanent, not transient.
async function failAndAllowRetry(db: AdminClient, eventId: string, body: Record<string, unknown>, status: number) {
  await db.from("stripe_webhook_events").delete().eq("event_id", eventId);
  return NextResponse.json(body, { status });
}

// Marks the dedupe row terminal — a duplicate delivery arriving after this
// point short-circuits 200 instead of retrying. Called on every path that
// reaches a real terminal outcome: order created, refund issued/failed*, or
// "nothing to do" (no staged order). (*a failed refund still allows retry —
// see the OUT_OF_STOCK branch — so this is NOT called there.)
async function markDone(db: AdminClient, eventId: string) {
  await db.from("stripe_webhook_events").update({ status: "done", updated_at: new Date().toISOString() }).eq("event_id", eventId);
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

  const db = createAdminClient() as unknown as AdminClient;

  // Idempotency: insert event.id BEFORE any order-creating work. Stripe
  // guarantees at-least-once delivery, not exactly-once — a duplicate
  // delivery of this exact event.id hits this UNIQUE constraint and is
  // rejected by the database itself, not by a read-then-write check (which
  // would have a race window between two concurrent deliveries).
  const { error: dedupeError } = await db.from("stripe_webhook_events").insert({ event_id: event.id });

  if (dedupeError) {
    if (dedupeError.code === "23505") {
      // A row already exists for this event.id — figure out what that
      // means before deciding how to respond.
      const { data: existing, error: existingError } = await db
        .from("stripe_webhook_events")
        .select("status, updated_at")
        .eq("event_id", event.id)
        .single();

      if (existingError || !existing) {
        // Vanishingly unlikely (the row we just failed to insert because it
        // exists would have to disappear between that failed insert and
        // this select) — treat as transient and let Stripe retry.
        console.error("Stripe webhook: could not read existing dedupe row after conflict", existingError);
        return NextResponse.json({ error: "Could not verify event status" }, { status: 500 });
      }

      const action = decideDuplicateDeliveryAction(existing.status, new Date(existing.updated_at), new Date());

      if (action === "short_circuit_done") {
        return NextResponse.json({ received: true, note: "duplicate event, already processed" });
      }

      if (action === "conflict_retry_later") {
        // Another delivery is genuinely still mid-flight (updated_at is
        // recent) — do NOT delete the row (that would let both proceed
        // concurrently again, reintroducing the exact race this exists to
        // close). Tell Stripe to come back later.
        return NextResponse.json({ error: "Event is still being processed" }, { status: 409 });
      }

      // action === "takeover": the row has been "processing" for longer
      // than any real request takes — the delivery that owned it almost
      // certainly crashed. Attempt to atomically claim it: this UPDATE only
      // matches if the row is STILL "processing" and STILL stale at the
      // moment it runs, so if two duplicate deliveries race to take over
      // the same stale row, only one's UPDATE affects a row (ordinary
      // Postgres row-locking — the second one's WHERE clause re-evaluates
      // against the first one's already-committed updated_at and no longer
      // matches). The loser falls back to 409, same as a fresh conflict.
      const staleThreshold = new Date(Date.now() - STUCK_PROCESSING_THRESHOLD_MS).toISOString();
      const { data: claimed, error: claimError } = await db
        .from("stripe_webhook_events")
        .update({ updated_at: new Date().toISOString() })
        .eq("event_id", event.id)
        .eq("status", "processing")
        .lt("updated_at", staleThreshold)
        .select("event_id");

      if (claimError || !claimed || claimed.length === 0) {
        return NextResponse.json({ error: "Event is still being processed" }, { status: 409 });
      }

      // Claim succeeded — fall through to the normal processing logic below,
      // exactly as if this were a fresh delivery. This is safe because every
      // write it might redo is itself idempotent: checkout_verified_order's
      // transactions.stripe_session_id UNIQUE constraint (handled below) and
      // refunds.payment_intent_id UNIQUE + Stripe's own idempotency key
      // (handled in the OUT_OF_STOCK branch) both make a redo of already-
      // completed work a safe no-op rather than a duplicate side effect.
    } else {
      console.error("Stripe webhook: failed to record event dedupe row", dedupeError);
      return NextResponse.json({ error: "Could not record event" }, { status: 500 });
    }
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  // Look up what the intent route staged for this payment. Rows are kept
  // after an order is created (resolved_at is set instead), so a missing row
  // means this intent was never staged by the checkout: money taken with
  // nothing to fulfil. No order can be built without the staged cart, so log
  // it loudly for a manual refund and acknowledge.
  const { data: pendingData, error: pendingError } = await db
    .from("pending_stripe_orders")
    .select("*")
    .eq("payment_intent_id", paymentIntent.id)
    .maybeSingle();
  const pending = pendingData as PendingStripeOrder | null;

  if (pendingError) {
    console.error("Stripe webhook: failed to look up pending_stripe_orders", pendingError);
    return failAndAllowRetry(db, event.id, { error: "Lookup failed" }, 500);
  }

  if (!pending) {
    console.error(
      `Stripe webhook: PAID WITH NO STAGED ORDER, refund needed — intent ${paymentIntent.id}, ` +
      `received ${paymentIntent.amount_received} ${paymentIntent.currency.toUpperCase()}`
    );
    // Terminal — nothing will ever happen for this event.id from here.
    await markDone(db, event.id);
    return NextResponse.json({ received: true, note: "No staged order for this PaymentIntent" });
  }

  // Already resolved by an earlier, different event for this same intent —
  // the order (or refund) exists. Nothing to do. The UNIQUE
  // transactions.stripe_session_id inside checkout_verified_order() remains
  // the final backstop if two deliveries get past this at the same moment.
  if (pending.resolved_at) {
    await markDone(db, event.id);
    return NextResponse.json({ received: true, note: "already processed" });
  }

  // The charge must be EXACTLY what the intent route staged: same cents,
  // same currency. Compared against the pending row, not against the
  // intent's own `amount` — an intent always agrees with itself, which is
  // how a stale intent was accepted before. A mismatch creates NO order and
  // is NOT retried (retrying can't change what was charged): the event is
  // marked done, the pending row is left unresolved, and the log line below
  // has both amounts so the payment can be refunded by hand.
  const chargeCheck = checkChargeMatchesPending(paymentIntent, pending);
  if (paymentIntent.status !== "succeeded" || !chargeCheck.ok) {
    console.error(
      `Stripe webhook: CHARGE MISMATCH, no order created, refund needed — intent ${paymentIntent.id}, ` +
      `status=${paymentIntent.status}, ` +
      (chargeCheck.ok
        ? "amounts match"
        : `expected ${chargeCheck.expectedCents} ${chargeCheck.expectedCurrency} (pending total_amount=${pending.total_amount}), ` +
          `received ${chargeCheck.receivedCents} ${chargeCheck.receivedCurrency}`)
    );
    await markDone(db, event.id);
    return NextResponse.json({ received: true, note: "Charge did not match the staged order; no order created" });
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
    p_shipping_amount: pending.shipping_amount ?? 0,
  });

  if (rpcError) {
    if (rpcError.message?.startsWith("OUT_OF_STOCK:")) {
      const productName = rpcError.message.split("OUT_OF_STOCK:")[1]?.trim();
      console.error(`Stripe webhook: out of stock (${productName}) for intent ${paymentIntent.id} — issuing refund`);

      // refunds.payment_intent_id is UNIQUE — upsert BEFORE calling Stripe.
      // This is an honest "we are attempting this" record, not a claim of
      // success, so a persistently-failing refund still leaves a durable,
      // queryable row (status='failed', with a reason) instead of only an
      // unread console.error. It also makes a takeover safe: if a prior,
      // crashed attempt already got this to 'succeeded', we see that below
      // and skip calling Stripe again rather than upserting over it.
      const customerEmail = (pending.delivery_address as Record<string, string> | null)?.email ?? null;
      const { data: refundRow, error: upsertError } = await db
        .from("refunds")
        .upsert(
          {
            payment_intent_id: paymentIntent.id,
            amount: pending.total_amount,
            currency: pending.currency,
            reason: "out_of_stock",
            product_name: productName ?? null,
            customer_email: customerEmail,
          },
          { onConflict: "payment_intent_id", ignoreDuplicates: false }
        )
        .select("status, stripe_refund_id")
        .single();

      if (upsertError || !refundRow) {
        console.error("Stripe webhook: failed to record refund attempt", upsertError);
        return failAndAllowRetry(db, event.id, { error: "Could not record refund attempt" }, 500);
      }

      if (refundRow.status !== "succeeded") {
        // Either a fresh attempt, or a prior attempt that failed/never
        // reached Stripe — (re-)attempt the refund. The idempotency key is
        // derived from the PaymentIntent, not event.id or this request, so
        // a retry (whether ours or a takeover) that already reached Stripe
        // gets back the SAME refund object instead of refunding twice.
        try {
          const refund = await getStripe().refunds.create(
            { payment_intent: paymentIntent.id },
            { idempotencyKey: `refund_${paymentIntent.id}` }
          );
          await db
            .from("refunds")
            .update({ status: "succeeded", stripe_refund_id: refund.id, updated_at: new Date().toISOString() })
            .eq("payment_intent_id", paymentIntent.id);
        } catch (refundErr) {
          console.error(`Stripe webhook: refund call failed for intent ${paymentIntent.id}`, refundErr);
          await db
            .from("refunds")
            .update({
              status: "failed",
              error_message: refundErr instanceof Error ? refundErr.message : String(refundErr),
              updated_at: new Date().toISOString(),
            })
            .eq("payment_intent_id", paymentIntent.id);
          // The one case where retry is genuinely correct — the refund
          // itself didn't happen, Stripe/network may succeed next time.
          return failAndAllowRetry(db, event.id, { error: `Out of stock: ${productName} — refund attempt failed, will retry` }, 500);
        }
      }

      // Refund succeeded (just now, or already had on a takeover) — kept,
      // not deleted: the only record of everything that was in the cart,
      // not just the one item that triggered OUT_OF_STOCK.
      await db.from("pending_stripe_orders").update({ resolved_at: new Date().toISOString() }).eq("payment_intent_id", paymentIntent.id);
      await markDone(db, event.id);

      // Tell the customer their money is coming back. Strictly after
      // markDone: the refund has already happened and the event is already
      // terminal, so nothing below can affect either. deliverEmail never
      // throws and never returns non-200 — a dead email provider leaves a
      // 'failed' row in email_deliveries and nothing else.
      await deliverEmail(
        db,
        {
          kind: "refund_notification",
          paymentIntentId: paymentIntent.id,
          recipient: customerEmail,
        },
        () =>
          sendRefundNotificationEmail({
            to: customerEmail!,
            productName: productName ?? null,
            amount: pending.total_amount,
            currency: pending.currency,
            deliveryAddress: (pending.delivery_address ?? {}) as DeliveryAddress,
          }),
      );

      return NextResponse.json({ received: true, refunded: true, reason: `Out of stock: ${productName}` });
    }

    if (rpcError.code === "23505") {
      // checkout_verified_order's only unique constraint is
      // transactions.stripe_session_id (schema.sql) — a 23505 from this
      // specific RPC can only mean this PaymentIntent was already fully
      // processed by an earlier call (a takeover finding the original
      // attempt actually succeeded before it died, or the rare
      // different-event.id case the pending-row-lookup comment above
      // already documents). Not a real failure — finish and acknowledge.
      const { data: existingTx } = await db
        .from("transactions")
        .select("order_id")
        .eq("stripe_session_id", paymentIntent.id)
        .maybeSingle();
      await markDone(db, event.id);
      return NextResponse.json({ received: true, order_id: existingTx?.order_id ?? null, note: "already processed" });
    }

    console.error("Stripe webhook: checkout_verified_order RPC failed", rpcError);
    return failAndAllowRetry(db, event.id, { error: "Order creation failed" }, 500);
  }

  // Order created. Respond fast; there's no queue in this app, but
  // everything from here is already-fast Postgres updates, not a slow
  // external call, so doing it inline keeps the code simple without risking
  // Stripe's response timeout.
  const deliveryAddress = (pending.delivery_address ?? {}) as DeliveryAddress;
  const orderItems = (pending.items ?? []) as OrderEmailItem[];
  // ORDER_NOTIFICATION_EMAILS is a comma-separated list and is deliberately
  // NOT ADMIN_EMAIL. ADMIN_EMAIL is an AUTHENTICATION check — nine routes
  // gate dashboard access on `email === process.env.ADMIN_EMAIL` — so
  // adding a second address there to receive alerts would silently grant
  // that person admin access. Falls back to ADMIN_EMAIL when unset, so
  // behaviour is unchanged until the new variable is configured.
  const adminRecipients = parseRecipients(
    process.env.ORDER_NOTIFICATION_EMAILS ?? process.env.ADMIN_EMAIL,
  );
  const estimatedDays = calculateShipping(
    orderItems.map((i) => ({
      quantity: i.quantity,
      shippingWeightGrams: (i as { shipping_weight_grams?: number | null }).shipping_weight_grams ?? null,
    })),
    deliveryAddress.country,
  ).estimatedDays;
  const placedAt = new Date();

  // Kept, not deleted: the row is the record of what was staged for this
  // payment, and resolved_at is how a later delivery for the same intent
  // knows there's nothing left to do.
  const { error: resolveError } = await db
    .from("pending_stripe_orders")
    .update({ resolved_at: new Date().toISOString() })
    .eq("payment_intent_id", paymentIntent.id);
  if (resolveError) {
    // Not fatal: the order exists, and a redelivery is still stopped by the
    // dedupe ledger and by the transactions.stripe_session_id unique key.
    console.error(`Stripe webhook: order ${orderId} created but resolved_at not set for ${paymentIntent.id}`, resolveError);
  }

  if (pending.user_id) {
    await updateSpendTier(db, pending.user_id, pending.total_amount);
  }

  // ── Email claims: BEFORE markDone, sends AFTER ────────────────────────
  // Claiming first means a crash between here and the send leaves a
  // discoverable 'pending' row in email_deliveries, rather than an event
  // marked terminal with no email and no trace of one being owed. The
  // unique (kind, payment_intent_id) constraint is what stops a taken-over
  // reprocessing of this same event sending a second confirmation.
  const confirmationClaim = {
    kind: "order_confirmation" as const,
    paymentIntentId: paymentIntent.id,
    orderId: orderId as string,
    recipient: deliveryAddress.email,
  };
  const adminClaim = {
    kind: "admin_new_order" as const,
    paymentIntentId: paymentIntent.id,
    orderId: orderId as string,
    recipient: adminRecipients.join(", "),
  };
  const confirmationOutcome = await claimEmailDelivery(db, confirmationClaim);
  const adminOutcome = await claimEmailDelivery(db, adminClaim);

  await markDone(db, event.id);

  // The order is committed and the event is terminal. Nothing below this
  // line can change the response — sendClaimedEmail cannot throw, and its
  // result is recorded in email_deliveries rather than returned to Stripe.
  if (confirmationOutcome === "claimed") {
    await sendClaimedEmail(db, confirmationClaim, () =>
      sendOrderConfirmationEmail({
        to: deliveryAddress.email!,
        orderId: orderId as string,
        items: orderItems,
        subtotal: pending.subtotal_amount ?? pending.total_amount,
        shipping: pending.shipping_amount ?? 0,
        total: pending.total_amount,
        currency: "EUR",
        chargedAmount: paymentIntent.amount_received / 100,
        chargedCurrency: pending.currency,
        deliveryAddress,
        estimatedDays,
        placedAt,
      }),
    );
  }

  if (adminOutcome === "claimed") {
    await sendClaimedEmail(db, adminClaim, () =>
      sendAdminNewOrderEmail({
        to: adminRecipients,
        orderId: orderId as string,
        items: orderItems,
        shipping: pending.shipping_amount ?? 0,
        total: pending.total_amount,
        currency: "EUR",
        deliveryAddress,
        estimatedDays,
        placedAt,
      }),
    );
  }

  return NextResponse.json({ received: true, order_id: orderId });
}
