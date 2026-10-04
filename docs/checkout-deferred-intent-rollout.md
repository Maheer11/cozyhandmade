# Checkout fix: deferred intent — what's in it and how to ship it

Branch: `fix/checkout-deferred-intent` (3 commits on top of `main` 7e3b116: the fix, the tests, and this note)

## The bug it fixes

On 4 Oct 2026 an Irish customer paid €85 for €85 of items, so the €7 shipping
was never charged. The checkout created a Stripe PaymentIntent the moment the
payment step opened and kept the card form tied to it. Changing country or
switching Dublin pickup to courier afterwards changed the total on screen, but
not the amount charged. The webhook only compared Stripe's amount with itself,
so the stale charge became an order.

## What's in the branch

**Commit 1 — `aae1f4f` the fix**

| Area | Change |
|---|---|
| Checkout page | Card form loads with no payment behind it (Stripe "deferred intent"). The payment is created only when Pay is pressed. Pay is locked while a request is running. |
| New route `/api/checkout/intent` | Signed-in customers only. Prices items and shipping from the database and the address. Creates or reuses ONE payment per checkout attempt. Refuses if the page showed a different total. |
| Webhook | Creates an order only if Stripe charged exactly the staged total, in EUR. Otherwise: no order, both amounts logged (`CHARGE MISMATCH`). Marks the staged row `resolved_at` instead of deleting it. |
| Currency | Every card payment is charged in EUR. Other currencies are shown as "≈". |
| Sign-in | Guests see "Sign in to check out"; the login page returns them to checkout. |
| Shipping display | Country defaults to Ireland. Irish courier orders say "Shipping within Ireland". Dublin pickup is stored on the order. |
| Database (migration 016) | `orders.subtotal_amount`, `orders.shipping_amount`, `pending_stripe_orders.checkout_attempt_id`, and `checkout_verified_order()` takes `p_shipping_amount`. |
| Removed | `/api/payments/stripe/create-intent` (the old route that created the payment too early). |
| Unit tests | 36 new: UK→IE, back and forth, double tap, decline + retry, duplicate webhook, amount mismatch. |

**Commit 2 — `ed2c226` tests against real test services**

- Playwright test signs in, pays with a test card and checks one payment per paid order. **Passed** on 5 Oct 2026.
- Integration tests refuse to run unless `.env.test` points at the test project.
- Older webhook tests fixed (`livemode`, confirmed payment, timeouts). All 24 pass.
- Playwright output kept out of git (it can contain the test password).

## Status

- [x] Migration 016 applied to **Cozi Test**
- [x] Unit 138 passed · Integration 24 passed · Playwright 1 passed
- [x] Production: Part 1 (the three new columns) applied
- [x] Production: Part 2 (the payment function) applied 5 Oct 2026 — five-value check: function_count 1, all true
- [ ] Merge to `main` and deploy
- [ ] Watch logs for a day

## Production rollout — in this order

### 1. Run Part 2 on production

In VS Code open `lib/supabase/migrations/016_order_shipping_and_checkout_attempts.sql`,
select **line 34 (`begin;`) to line 278 (`commit;`)**, copy, paste into a new
Supabase SQL query on the **production** project, Run, and choose
"Run this query" on the destructive-operations warning.
Expect "Success. No rows returned". If it fails, nothing changes — copy the
`ERROR:` text before clicking anything else.

This is safe before the deploy: the live code's call still matches the new
function because the new parameter has a default.

### 2. The five-value check

New query, same project:

```sql
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'checkout_verified_order')               as function_count,
  exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'checkout_verified_order'
      and pg_get_function_arguments(p.oid) like '%p_shipping_amount%')                   as has_shipping_param,
  exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'orders' and column_name = 'subtotal_amount')                       as orders_subtotal,
  exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'orders' and column_name = 'shipping_amount')                       as orders_shipping,
  exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'pending_stripe_orders' and column_name = 'checkout_attempt_id')    as attempt_column;
```

| Result | Meaning |
|---|---|
| `function_count` = 1, other four **true** | Done. Go to step 3. |
| `has_shipping_param` = false | Part 2 didn't apply. Run it again. |
| `function_count` = 2 | Old function still there. Stop and ask before deploying. |
| A column check false | That part didn't apply. Run Part 2 again (it re-adds columns safely). |

### 3. Merge and deploy

Push the branch, merge into `main` (a pull request is fine), and let it deploy.
Never deploy before step 2 passes: without the migration, paid orders can't be recorded.

### 4. Watch for a day

Search the server logs for:

- `CHARGE MISMATCH` — someone paid an amount that didn't match their staged order. No order was created; refund them in Stripe. Most likely from a customer who had the old checkout open during the deploy.
- `PAID WITH NO STAGED ORDER` — a payment with nothing staged. Refund in Stripe.

## Still open (not blocking)

- Check the 4 Oct order for `pi_3UMkdD2553NjhpAZ14NU4ZHp`: if its address is in Dublin, it started as a free pickup and was switched to courier.
- The five browser scenarios can be done by hand: `docs/checkout-test-plan.md`.
- Visual summary: the "Cozi Checkout Test Map" artifact in Claude.
