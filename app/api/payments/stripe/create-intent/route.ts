import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { repriceItems, RepriceError, type CheckoutItemInput } from "@/lib/checkout/repriceItems";
import { calculateShipping, isDublinPickupEligible, type ShippingItemInput } from "@/lib/checkout/shipping";
import { getServerRates } from "@/lib/currency/exchangeRateClient";
import { convertPrice } from "@/lib/currency/pricingUtils";
import type { CurrencyCode } from "@/lib/currency/types";
import { NextResponse } from "next/server";

interface CreateIntentBody {
  items: CheckoutItemInput[];
  delivery_address: Record<string, string>;
  currency: CurrencyCode;
  // What the checkout UI displayed to the customer as the shipping cost
  // (computed client-side by the same calculateShipping() function, from
  // the same weights, before the customer ever saw a "Pay €X" button).
  // This is a CHECKSUM, never an input to the charge — see the comparison
  // below. It exists so a divergence between what the customer agreed to
  // and what the server is about to charge is caught and rejected instead
  // of silently charging a different amount, which is the exact bug this
  // whole feature exists to fix.
  client_shipping_eur: number;
  // Customer's chosen delivery method. "pickup" is only ever honoured if
  // isDublinPickupEligible(delivery_address) independently confirms it
  // below — never taken on the client's word alone, same trust boundary as
  // every other price input in this route.
  delivery_method?: "courier" | "pickup";
}

const STRIPE_DECIMAL_CURRENCIES = new Set(["EUR", "GBP", "USD"]);

// Max allowed drift between the client's displayed shipping figure and the
// server's independently recomputed one — a rounding-safety margin, not a
// tolerance for genuine mismatches (both sides run the identical pure
// calculateShipping() function, so in the normal case they're bit-for-bit
// equal; a real mismatch means the cart/weights/country changed between
// display and submit, and the customer needs an accurate re-quote, not a
// silently-different charge).
const SHIPPING_MISMATCH_TOLERANCE_EUR = 0.01;

export async function POST(request: Request) {
  try {
    const body: CreateIntentBody = await request.json();

    if (!STRIPE_DECIMAL_CURRENCIES.has(body.currency)) {
      return NextResponse.json({ error: "Unsupported currency for card payment" }, { status: 400 });
    }
    if (!body.delivery_address) {
      return NextResponse.json({ error: "Missing delivery address" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Recompute the real total server-side — body.items[].unit_price is
    // client input and is never trusted for pricing (same guarantee the old
    // Paystack verify route gave for NGN card payments).
    let verifiedItems, verifiedTotal;
    try {
      ({ verifiedItems, verifiedTotal } = await repriceItems(db, body.items));
    } catch (err) {
      if (err instanceof RepriceError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    // Shipping — computed from the same server-verified weights repriceItems
    // just fetched (never from the client) and the delivery country, via the
    // one shared calculateShipping() function that also drives the
    // checkout UI's display. Ships from Ireland, weight-based, no
    // free-shipping threshold — see lib/checkout/shipping.ts.
    const shippingItems: ShippingItemInput[] = verifiedItems.map((item) => ({
      quantity: item.quantity,
      shippingWeightGrams: item.shipping_weight_grams,
      productName: item.product_name,
    }));
    const shippingQuote = calculateShipping(shippingItems, body.delivery_address.country);
    // Free Dublin pickup — re-derived from the delivery address itself, not
    // trusted from body.delivery_method alone. A request claiming "pickup"
    // for a non-Dublin address silently falls back to the real courier
    // price here, which the mismatch guard below then rejects if the
    // client displayed €0 for it.
    const isPickup = body.delivery_method === "pickup" && isDublinPickupEligible(body.delivery_address as { country: string; city?: string; postcode?: string });
    const shippingEUR = isPickup ? 0 : shippingQuote.priceEUR;

    // The guard against this bug recurring: the client sent the shipping
    // figure it displayed to the customer. Compare it against what the
    // server just independently computed — if they differ by more than a
    // rounding cent, something changed between display and submit (stale
    // quote, tampered request, a bug), and charging anyway would repeat
    // exactly the original failure (customer shown one number, charged
    // another). Reject and make the customer re-quote instead.
    if (
      typeof body.client_shipping_eur !== "number" ||
      !Number.isFinite(body.client_shipping_eur) ||
      Math.abs(body.client_shipping_eur - shippingEUR) > SHIPPING_MISMATCH_TOLERANCE_EUR
    ) {
      console.error(
        `create-intent: shipping mismatch — client displayed €${body.client_shipping_eur}, ` +
        `server computed €${shippingEUR} (zone=${shippingQuote.zone})`
      );
      return NextResponse.json(
        { error: "Shipping cost changed — please review your order and try again." },
        { status: 400 }
      );
    }

    const orderTotalEUR = verifiedTotal + shippingEUR;

    // Convert the recomputed EUR total (items + shipping) to the customer's
    // selected currency — this IS the amount that will actually be charged,
    // not just a display figure, so there's no FX-drift tolerance to reason
    // about later: the webhook only has to confirm Stripe charged exactly
    // this.
    const { rates } = await getServerRates();
    const rate = rates[body.currency] ?? { base: "EUR" as const, currency: body.currency, rate: 1, fetchedAt: Date.now(), source: "fallback" as const };
    const chargeAmount = body.currency === "EUR" ? orderTotalEUR : convertPrice(orderTotalEUR, rate, body.currency);
    const amountMinorUnits = Math.round(chargeAmount * 100);

    if (amountMinorUnits < 50) {
      // Stripe's own minimum charge floor for most currencies.
      return NextResponse.json({ error: "Order total is too low to charge" }, { status: 400 });
    }

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: amountMinorUnits,
      currency: body.currency.toLowerCase(),
      payment_method_types: ["card"],
      metadata: { source: "cozi-handmade-checkout" },
      // Stripe's own receipt, as a backstop independent of our
      // infrastructure: it still reaches the customer if Resend is down, the
      // deploy is broken, or an email_deliveries row is stuck. A duplicate
      // receipt is a far smaller harm than a customer who paid and received
      // nothing in writing. Stripe only sends these automatically in live
      // mode, so they won't appear in test-mode runs. Remove this one line
      // to turn it off.
      ...(body.delivery_address.email ? { receipt_email: body.delivery_address.email } : {}),
    });

    // Stage the server-verified cart + delivery address so the webhook (a
    // server-to-server callback with no access to this request) knows what
    // to actually create once payment_intent.succeeded fires.
    const { error: stageError } = await db
      .from("pending_stripe_orders")
      .insert({
        payment_intent_id: paymentIntent.id,
        user_id: user?.id ?? null,
        items: verifiedItems,
        delivery_address: body.delivery_address,
        total_amount: orderTotalEUR,
        subtotal_amount: verifiedTotal,
        shipping_amount: shippingEUR,
        currency: body.currency,
      });

    if (stageError) {
      // Nothing was charged yet (PaymentIntent isn't confirmed until the
      // client completes it), so it's safe to just fail here.
      await getStripe().paymentIntents.cancel(paymentIntent.id).catch(() => {});
      console.error("create-intent: failed to stage pending_stripe_orders row", stageError);
      return NextResponse.json({ error: "Could not start checkout — please try again" }, { status: 500 });
    }

    // Return the server-verified quote so the UI displays exactly the
    // figure that will be charged — not a value it computed itself and
    // hopes matches.
    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      subtotal_eur: verifiedTotal,
      shipping_eur: shippingEUR,
      total_eur: orderTotalEUR,
      shipping_zone: shippingQuote.zone,
      estimated_days: shippingQuote.estimatedDays,
      customs_applies: shippingQuote.customsApplies,
    });
  } catch (err) {
    console.error("Stripe create-intent route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
