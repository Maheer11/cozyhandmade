import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { repriceItems, RepriceError, type CheckoutItemInput } from "@/lib/checkout/repriceItems";
import { getServerRates } from "@/lib/currency/exchangeRateClient";
import { convertPrice } from "@/lib/currency/pricingUtils";
import type { CurrencyCode } from "@/lib/currency/types";
import { NextResponse } from "next/server";

interface CreateIntentBody {
  items: CheckoutItemInput[];
  delivery_address: Record<string, string>;
  currency: CurrencyCode;
}

const STRIPE_DECIMAL_CURRENCIES = new Set(["EUR", "GBP", "USD"]);

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

    // Convert the recomputed EUR total to the customer's selected currency —
    // this IS the amount that will actually be charged, not just a display
    // figure, so there's no FX-drift tolerance to reason about later: the
    // webhook only has to confirm Stripe charged exactly this.
    const { rates } = await getServerRates();
    const rate = rates[body.currency] ?? { base: "EUR" as const, currency: body.currency, rate: 1, fetchedAt: Date.now(), source: "fallback" as const };
    const chargeAmount = body.currency === "EUR" ? verifiedTotal : convertPrice(verifiedTotal, rate, body.currency);
    const amountMinorUnits = Math.round(chargeAmount * 100);

    if (amountMinorUnits < 50) {
      // Stripe's own minimum charge floor for most currencies.
      return NextResponse.json({ error: "Order total is too low to charge" }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountMinorUnits,
      currency: body.currency.toLowerCase(),
      payment_method_types: ["card"],
      metadata: { source: "cozi-handmade-checkout" },
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
        total_amount: verifiedTotal,
        currency: body.currency,
      });

    if (stageError) {
      // Nothing was charged yet (PaymentIntent isn't confirmed until the
      // client completes it), so it's safe to just fail here.
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
      console.error("create-intent: failed to stage pending_stripe_orders row", stageError);
      return NextResponse.json({ error: "Could not start checkout — please try again" }, { status: 500 });
    }

    return NextResponse.json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe create-intent route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
