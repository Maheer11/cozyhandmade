// Pure amount arithmetic and decisions shared by the checkout page, the
// intent route (app/api/checkout/intent) and the Stripe webhook. No I/O, safe
// to import from client components, and unit-tested in
// tests/unit/checkout-amounts.test.ts.
//
// Every card payment is charged in EUR. Other currencies are display-only
// ("≈ £X") — converting at charge time meant the figure on the Pay button and
// the figure Stripe charged were rounded differently and could disagree.

export const CHARGE_CURRENCY = "EUR" as const;
export const STRIPE_CHARGE_CURRENCY = "eur" as const;

// Stripe's own minimum charge for EUR.
export const MIN_CHARGE_CENTS = 50;

export function toCents(eur: number): number {
  return Math.round(eur * 100);
}

export interface OrderAmounts {
  subtotalEUR: number;
  shippingEUR: number;
  totalEUR: number;
  totalCents: number;
}

/**
 * Subtotal and shipping are each rounded to whole cents BEFORE adding, so the
 * total is always exactly subtotal + shipping as printed, and
 * Math.round(totalEUR * 100) === totalCents with no float drift. The webhook
 * relies on that identity when it compares amount_received to the pending
 * row's total_amount.
 */
export function orderAmounts(subtotalEUR: number, shippingEUR: number): OrderAmounts {
  const subtotalCents = toCents(subtotalEUR);
  const shippingCents = toCents(shippingEUR);
  const totalCents = subtotalCents + shippingCents;
  return {
    subtotalEUR: subtotalCents / 100,
    shippingEUR: shippingCents / 100,
    totalEUR: totalCents / 100,
    totalCents,
  };
}

// ─── Intent route: what to do with this checkout attempt's PaymentIntent ───

export type IntentAction =
  | { kind: "create" }                // no intent yet for this attempt
  | { kind: "reuse" }                 // intent exists, amount already right (e.g. retry after a decline)
  | { kind: "update_amount" }         // intent exists, unpaid, customer changed something that changed the price
  | { kind: "already_paid" }          // this attempt was already paid — never charge it again
  | { kind: "restart" };              // intent can no longer be used (cancelled) — client starts a fresh attempt

// Statuses in which Stripe still allows the amount to be changed and the
// intent to be confirmed again.
const REUSABLE_STATUSES = new Set(["requires_payment_method", "requires_confirmation", "requires_action"]);

export function decideIntentAction(
  existing: { status: string; amount: number } | null,
  totalCents: number,
): IntentAction {
  if (!existing) return { kind: "create" };
  if (existing.status === "succeeded" || existing.status === "processing" || existing.status === "requires_capture") {
    return { kind: "already_paid" };
  }
  if (!REUSABLE_STATUSES.has(existing.status)) return { kind: "restart" };
  return existing.amount === totalCents ? { kind: "reuse" } : { kind: "update_amount" };
}

// ─── Webhook: does what Stripe received match what we staged? ───

export type ChargeCheck =
  | { ok: true }
  | { ok: false; expectedCents: number; receivedCents: number; expectedCurrency: string; receivedCurrency: string };

/**
 * The only thing that decides whether a paid PaymentIntent becomes an order.
 * Compares against the pending row the intent route wrote — NOT against the
 * intent's own `amount`, which always matches itself and so let a stale
 * intent through before.
 */
export function checkChargeMatchesPending(
  paymentIntent: { amount_received: number; currency: string },
  pending: { total_amount: number | string; currency: string },
): ChargeCheck {
  const expectedCents = toCents(Number(pending.total_amount));
  const expectedCurrency = pending.currency.toUpperCase();
  const receivedCurrency = paymentIntent.currency.toUpperCase();
  if (paymentIntent.amount_received === expectedCents && receivedCurrency === expectedCurrency) {
    return { ok: true };
  }
  return {
    ok: false,
    expectedCents,
    receivedCents: paymentIntent.amount_received,
    expectedCurrency,
    receivedCurrency,
  };
}
