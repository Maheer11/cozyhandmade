# Checkout test plan — one PaymentIntent per paid order

## Already automated (no database, no Stripe account needed)

Run `npx vitest run tests/unit`. These run the real route handlers against an
in-memory database and a fake Stripe:

| Scenario | Test |
|---|---|
| Change country UK → IE, then pay | `checkout-intent-route.test.ts` — "country UK → IE between Pay presses" |
| Back and forth between steps, then pay | "back and forth GB/IE/pickup several times" |
| Double-tap Pay | "double tap (two requests at once)" |
| Declined card, then retry | "declined card then retry" |
| Same webhook delivered twice | `webhook-order-recording.test.ts` — "the same event delivered twice creates ONE order" |
| Charged amount ≠ staged total | "€85 received for a €92 order: NO order, both amounts logged" |

Every intent-route test ends by asserting one intent per attempt and
`intent.amount === Math.round(pending.total_amount * 100)`.

## Later: against the TEST Supabase project + Stripe test mode

Prerequisites, in order:
1. `.env.test` points at the test Supabase project (`E2E_SUPABASE_TEST_REF`
   must match its URL — Playwright refuses to run otherwise) and uses
   `sk_test_` / `pk_test_` keys.
2. Migration 016 applied to the **test** project.
3. A customer account in the test project; its user id in `.env.test` as
   `TEST_CHECKOUT_USER_ID`.
4. `stripe listen --forward-to localhost:3000/api/payments/stripe/webhook`
   running, its signing secret in `.env.test` as `STRIPE_WEBHOOK_SECRET`.

Then `npx vitest run tests/integration` and the manual steps below
(signed in, test card `4242 4242 4242 4242`, decline card `4000 0000 0000 0002`).

| # | Steps | Expected |
|---|---|---|
| 1 | Shipping step: country United Kingdom → Continue → Back → change to Ireland (Cork) → Continue → Pay | Pay button shows items + €7 (for an item ≤ 1 kg). |
| 2 | Shipping → Payment → Back → Payment → Back → Payment → Pay | Payment succeeds normally. |
| 3 | Payment step: tap Pay twice quickly | Button disables on first tap; one payment. |
| 4 | Pay with the decline card → error shown → enter 4242… → Pay | Second attempt succeeds. |
| 5 | Stripe Dashboard → Developers → Events → the `payment_intent.succeeded` from #1 → Resend | Webhook replies 200 "duplicate event"; still one order. |

After each row, check in Stripe (test mode) → Payments: exactly **one**
PaymentIntent for that checkout, and in the test database:

```sql
select p.payment_intent_id, p.total_amount, p.shipping_amount, p.resolved_at,
       o.total_amount as order_total, o.shipping_amount as order_shipping
  from pending_stripe_orders p
  left join transactions t on t.stripe_session_id = p.payment_intent_id
  left join orders o on o.id = t.order_id
 order by p.created_at desc limit 5;
```

`total_amount × 100` must equal the amount Stripe shows; `resolved_at` is set
for every paid row; the order's `shipping_amount` matches.
