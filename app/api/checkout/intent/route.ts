import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { RepriceError, type CheckoutItemInput } from "@/lib/checkout/repriceItems";
import { quoteCheckout, type CheckoutQuote, type DeliveryMethod } from "@/lib/checkout/quote";
import {
  CHARGE_CURRENCY,
  STRIPE_CHARGE_CURRENCY,
  MIN_CHARGE_CENTS,
  decideIntentAction,
} from "@/lib/checkout/amounts";

// Called ONCE per press of the Pay button — the only place in the app that
// creates or changes a PaymentIntent. The checkout page collects card details
// with Stripe's deferred flow (no intent exists while the customer is filling
// in the form), then calls this, then confirms with the client secret it
// returns. So the amount is always computed here, from the database, at the
// moment of paying — never earlier, and never from a figure the browser sent.
//
// One checkout attempt = one PaymentIntent. The page generates attempt_id
// once per checkout visit. Pressing Pay again for the same attempt (after a
// decline, after going back and changing the country, after a double tap)
// finds the same intent via pending_stripe_orders.checkout_attempt_id and
// reuses it, updating its amount if the price changed, instead of creating
// another.

interface IntentRequestBody {
  attempt_id: string;
  items: CheckoutItemInput[];
  delivery_address: Record<string, string>;
  delivery_method: DeliveryMethod;
  // The total the Pay button showed, in cents. Not used to compute the
  // charge — if it differs from the server's figure the request is refused
  // and the customer is shown the new total before anything is charged.
  expected_total_cents: number;
}

interface PendingAttemptRow {
  payment_intent_id: string;
  user_id: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The checkout form's fields. Anything else in the submitted address is dropped.
const ADDRESS_FIELDS = ["firstName", "lastName", "email", "phone", "address", "city", "postcode", "country", "state"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseItem(value: unknown): CheckoutItemInput | null {
  if (!isRecord(value)) return null;
  const { product_id, product_name, product_image, quantity, source, variant } = value;
  if (typeof product_id !== "string" || !product_id) return null;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return null;
  if (source !== undefined && source !== "product" && source !== "featured_piece" && source !== "new_in") return null;
  if (variant !== undefined && typeof variant !== "string") return null;
  return {
    product_id,
    product_name: typeof product_name === "string" ? product_name : "",
    product_image: typeof product_image === "string" ? product_image : null,
    quantity,
    // repriceItems ignores this and looks the real price up; 0 makes that obvious.
    unit_price: 0,
    source,
    variant,
  };
}

function parseBody(raw: unknown): IntentRequestBody | string {
  if (!isRecord(raw)) return "Invalid request";
  const { attempt_id, items, delivery_address, delivery_method, expected_total_cents } = raw;

  if (typeof attempt_id !== "string" || !UUID_PATTERN.test(attempt_id)) return "Invalid checkout attempt";
  if (!Array.isArray(items) || items.length === 0) return "No items in order";
  const parsedItems = items.map(parseItem);
  if (parsedItems.some((item) => item === null)) return "Invalid item in order";
  if (!isRecord(delivery_address)) return "Missing delivery address";
  if (delivery_method !== "courier" && delivery_method !== "pickup") return "Invalid delivery method";
  if (typeof expected_total_cents !== "number" || !Number.isInteger(expected_total_cents)) return "Invalid total";

  const address: Record<string, string> = {};
  for (const field of ADDRESS_FIELDS) {
    const value = delivery_address[field];
    if (typeof value === "string") address[field] = value.trim();
  }
  if (!address.country) return "Missing delivery country";

  return {
    attempt_id,
    items: parsedItems as CheckoutItemInput[],
    delivery_address: address,
    delivery_method,
    expected_total_cents,
  };
}

function publicQuote(quote: CheckoutQuote) {
  return {
    subtotal_eur: quote.subtotalEUR,
    shipping_eur: quote.shippingEUR,
    total_eur: quote.totalEUR,
    total_cents: quote.totalCents,
    delivery_method: quote.deliveryMethod,
  };
}

export async function POST(request: Request) {
  try {
    // Signed-in customers only. The checkout page sends guests to sign in
    // before they ever reach Pay; this is the enforcement.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to pay.", code: "auth_required" }, { status: 401 });
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const body = parseBody(raw);
    if (typeof body === "string") {
      return NextResponse.json({ error: body }, { status: 400 });
    }

    // lib/supabase/types.ts has no Relationships/Functions maps, so the
    // generated-typed client resolves every query to `never`. The untyped
    // client is used here instead, with each result cast to an explicit row
    // type below.
    const db = createAdminClient() as unknown as SupabaseClient;

    let quote: CheckoutQuote;
    try {
      quote = await quoteCheckout(
        db,
        body.items,
        { country: body.delivery_address.country, city: body.delivery_address.city, postcode: body.delivery_address.postcode },
        body.delivery_method,
      );
    } catch (err) {
      if (err instanceof RepriceError) {
        return NextResponse.json({ error: err.message, code: "item_unavailable" }, { status: 400 });
      }
      throw err;
    }

    if (quote.totalCents !== body.expected_total_cents) {
      return NextResponse.json(
        {
          error: "Your total has changed. Please check the new total and press Pay again.",
          code: "price_changed",
          quote: publicQuote(quote),
        },
        { status: 409 },
      );
    }
    if (quote.totalCents < MIN_CHARGE_CENTS) {
      return NextResponse.json({ error: "Order total is too low to charge" }, { status: 400 });
    }

    // What the webhook will turn into an order. delivery_method is kept
    // inside the address so a free Dublin pickup is visible on the order
    // and can't be mistaken for missing shipping.
    const staged = {
      user_id: user.id,
      items: quote.verifiedItems,
      delivery_address: { ...body.delivery_address, delivery_method: quote.deliveryMethod },
      subtotal_amount: quote.subtotalEUR,
      shipping_amount: quote.shippingEUR,
      total_amount: quote.totalEUR,
      currency: CHARGE_CURRENCY,
    };
    const receiptEmail = body.delivery_address.email || undefined;

    const { data: existingData, error: existingError } = await db
      .from("pending_stripe_orders")
      .select("payment_intent_id, user_id")
      .eq("checkout_attempt_id", body.attempt_id)
      .maybeSingle();
    if (existingError) {
      console.error("checkout/intent: failed to look up checkout attempt", existingError);
      return NextResponse.json({ error: "Could not start payment, please try again" }, { status: 500 });
    }
    const existing = existingData as PendingAttemptRow | null;
    if (existing && existing.user_id !== user.id) {
      return NextResponse.json({ error: "Invalid checkout attempt", code: "restart_attempt" }, { status: 403 });
    }

    const stripe = getStripe();
    let intent = existing ? await stripe.paymentIntents.retrieve(existing.payment_intent_id) : null;
    const action = decideIntentAction(intent ? { status: intent.status, amount: intent.amount } : null, quote.totalCents);

    if (action.kind === "already_paid") {
      return NextResponse.json(
        { error: "This checkout has already been paid.", code: "already_paid", payment_intent_id: intent?.id },
        { status: 409 },
      );
    }
    if (action.kind === "restart") {
      return NextResponse.json({ error: "Please press Pay again.", code: "restart_attempt" }, { status: 409 });
    }

    if (action.kind === "create") {
      try {
        // Keyed on the attempt, so two requests racing in for the same
        // attempt (double tap, network retry) get the SAME intent back from
        // Stripe rather than two.
        intent = await stripe.paymentIntents.create(
          {
            amount: quote.totalCents,
            currency: STRIPE_CHARGE_CURRENCY,
            // Must match paymentMethodTypes in the page's <Elements> options.
            payment_method_types: ["card"],
            metadata: { source: "cozi-handmade-checkout", checkout_attempt_id: body.attempt_id, user_id: user.id },
            // Stripe's own receipt, as a backstop independent of our email
            // infrastructure. Stripe only sends these in live mode.
            ...(receiptEmail ? { receipt_email: receiptEmail } : {}),
          },
          { idempotencyKey: `checkout-intent-${body.attempt_id}` },
        );
      } catch (err) {
        // Same attempt key, different amount: an earlier create for this
        // attempt reached Stripe but its pending row was never written. That
        // intent has no row and was never handed to the browser, so it can't
        // be paid; start a fresh attempt.
        if (err instanceof Stripe.errors.StripeIdempotencyError) {
          return NextResponse.json({ error: "Please press Pay again.", code: "restart_attempt" }, { status: 409 });
        }
        throw err;
      }

      const { error: insertError } = await db
        .from("pending_stripe_orders")
        .insert({ ...staged, payment_intent_id: intent.id, checkout_attempt_id: body.attempt_id });
      // 23505: a concurrent request for this attempt staged the same intent a
      // moment earlier. Fall through to the update below so the row holds
      // this request's (identical) figures.
      if (insertError && insertError.code !== "23505") {
        console.error("checkout/intent: failed to stage pending_stripe_orders row", insertError);
        return NextResponse.json({ error: "Could not start payment, please try again" }, { status: 500 });
      }
      if (!insertError) {
        return NextResponse.json({ client_secret: intent.client_secret, payment_intent_id: intent.id, quote: publicQuote(quote) });
      }
    }

    if (!intent) throw new Error("checkout/intent: no PaymentIntent after action " + action.kind);

    if (action.kind === "update_amount") {
      // Stripe first, then the row. If the row update fails afterwards the
      // intent and row disagree, and the webhook refuses to create an order
      // for a mismatch — so a crash here can only ever fail safe.
      intent = await stripe.paymentIntents.update(intent.id, {
        amount: quote.totalCents,
        ...(receiptEmail ? { receipt_email: receiptEmail } : {}),
      });
    }

    // Always refresh the staged row: the address or items can change without
    // the total changing.
    const { error: updateError } = await db
      .from("pending_stripe_orders")
      .update(staged)
      .eq("payment_intent_id", intent.id);
    if (updateError) {
      console.error("checkout/intent: failed to update pending_stripe_orders row", updateError);
      return NextResponse.json({ error: "Could not start payment, please try again" }, { status: 500 });
    }

    return NextResponse.json({ client_secret: intent.client_secret, payment_intent_id: intent.id, quote: publicQuote(quote) });
  } catch (err) {
    console.error("checkout/intent route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
