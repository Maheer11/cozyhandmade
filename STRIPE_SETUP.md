# Stripe Payment Integration

## Overview

International customers (any currency other than NGN) can pay by card via
Stripe, or by manual bank transfer. Nigerian (NGN) customers are
**bank-transfer only** — Paystack has been removed entirely, and there is no
card option for Nigeria.

**MadeCozi is not a Nigerian business** — the Stripe account is registered in
Ireland (`account_country: IE`), settles in EUR, and customers are primarily
European and North American. Nigeria is not the target market.

The flow is **webhook-driven**, not client-asserted: the browser never tells
the server "payment succeeded" and gets trusted. Instead:

1. The browser asks the server to create a Stripe PaymentIntent
   (`POST /api/payments/stripe/create-intent`). The server re-prices the cart
   from the database itself — it never trusts a client-submitted total — and
   stages the verified cart + delivery address in `pending_stripe_orders`,
   keyed by the PaymentIntent id.
2. The browser collects card details with Stripe's `PaymentElement` (card
   data never touches our servers) and confirms the payment.
3. Stripe calls our webhook (`POST /api/payments/stripe/webhook`) with a
   cryptographically signed `payment_intent.succeeded` event. **Only this
   webhook ever creates an order** — after checking the event hasn't already
   been processed (see Idempotency below), it looks up the staged cart,
   verifies the charged amount, and calls the atomic stock-locking
   `checkout_verified_order()` Postgres function — the security core of this
   whole system — which decrements stock and inserts
   `orders`/`order_items`/`transactions` all in one atomic call.
4. The browser polls `GET /api/payments/stripe/status?payment_intent_id=...`
   after confirming payment, and only shows the confirmation screen once that
   endpoint reports the order actually exists.

This means a client can never fabricate a successful order — the webhook
signature is the only trust anchor.

**There is exactly one webhook handler.** An earlier, separately-deployed
pair of Supabase Edge Functions (`create-checkout-session` + `stripe-webhook`,
a Stripe Checkout Session redirect flow) previously existed alongside this
Next.js route and must be deleted — see the manual steps checklist below.
That edge-function pair never called `checkout_verified_order()` at all
(it wrote directly to `orders`/`transactions`), meaning it never decremented
stock on a real purchase. Grep confirms `checkout_verified_order` now has
exactly one caller in this repo: `app/api/payments/stripe/webhook/route.ts`.

## The live database schema differs from what you might expect

The live Supabase project (`ztzhsfercfsciyqtqgrn`) was already migrated
directly (via dashboard/CLI, not through this repo's migration files) to
Stripe-shaped column/parameter names, via three real applied migrations:
`switch_transactions_to_stripe`, `fix_checkout_function_and_lock_down_v2`,
`revoke_public_execute_on_checkout_function`. Concretely:

- `transactions.stripe_session_id` (UNIQUE) is the idempotency/reference
  column — despite the name (a holdover from the removed Checkout Session
  design), it now holds the Stripe **PaymentIntent** id for card payments.
  `transactions.stripe_payment_intent_id` also exists (non-unique, currently
  unpopulated by this flow) — a legacy column from the same removed design.
- `checkout_verified_order()`'s reference parameter is `p_stripe_reference`,
  not `p_payment_reference`.
- `EXECUTE` on `checkout_verified_order()` is already locked down to
  `service_role`/`postgres` only — confirmed via
  `information_schema.role_routine_grants`, no anon/authenticated grant.
- **`pending_stripe_orders` and `stripe_webhook_events` do not exist live** —
  see the migration step below; the webhook cannot function until they're
  added.

`lib/supabase/schema.sql` now reflects this real live shape (verified via
Supabase MCP `pg_get_functiondef`/`list_tables`, not assumed). An earlier
version of this file and of `lib/supabase/migrations/004_stripe_migration.sql`
described a *different* rename (`paystack_reference` → `payment_reference`)
that was never actually applied to this project — that migration file has
been deleted. Do not resurrect it.

## Setup

### 1. Stripe Dashboard (manual — cannot be done from code)

1. Create/open your Stripe account (Ireland, EUR settlement). Use **test
   mode** for everything below except production.
2. Developers → API keys → copy the **Publishable key** and **Secret key**
   (test mode: `pk_test_...` / `sk_test_...`).
3. Webhook endpoint:
   - **Local dev**: install the [Stripe CLI](https://stripe.com/docs/stripe-cli),
     run `stripe login`, then:
     ```
     stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
     ```
     This prints a `whsec_...` signing secret — copy it.
   - **Production**: Developers → Webhooks → Add endpoint →
     `https://yourdomain.com/api/payments/stripe/webhook`, select the
     `payment_intent.succeeded` event, copy its signing secret.
4. **Delete the old test-mode webhook destination** currently pointed at
   `https://ztzhsfercfsciyqtqgrn.supabase.co/functions/v1/stripe-webhook` —
   it targets the edge function being removed (step 3 below) and will start
   failing/erroring once that function is deleted. Point Stripe at the
   Next.js route instead (local via `stripe listen`, production via the URL
   above).

### 2. Database migration — **run on a branch or a copy first, not production**

Run `lib/supabase/migrations/005_add_pending_orders_and_webhook_dedupe.sql`.
It is a **delta-only** migration — it assumes the Stripe-shaped rename above
is already live (it is) and adds only the two tables that are genuinely
still missing: `pending_stripe_orders` (cart/delivery staging between
PaymentIntent creation and webhook confirmation) and `stripe_webhook_events`
(webhook delivery idempotency ledger, keyed on Stripe's `event.id`).

This migration does **not** touch `transactions.paystack_reference` — that
column doesn't exist on the live project (see above), so there is nothing
for a rename to affect. If you're applying this to a different, older copy
of the database that still has `paystack_reference`, you need the rename
from the old (deleted) `004_stripe_migration.sql` first — check
`lib/supabase/migrations/003_add_charged_amount.sql` for the pre-rename
signature to confirm which state that copy is in before proceeding.

### 3. Edge functions — **delete manually, cannot be done from code**

In the Supabase Dashboard (or via CLI with appropriate credentials), delete:
- `create-checkout-session` (Edge Function)
- `stripe-webhook` (Edge Function)

Both are currently `ACTIVE` on the live project. Confirm no other part of
the frontend still calls `create-checkout-session` before deleting it (grep
this repo for `create-checkout-session` — as of this integration, nothing
in the Next.js app calls it; it was orphaned/parallel to the checkout flow
actually wired into `app/checkout/page.tsx`).

### 4. Env vars

Add to `.env.local` (see `.env.example`):

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`lib/stripe/env.ts` **refuses to start** if `STRIPE_SECRET_KEY` or
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` isn't test-mode-prefixed outside
`NODE_ENV=production` — this is what makes it structurally impossible for a
local dev server, CI run, or test suite to ever hit the live Stripe account.
Live keys only ever get set in the production hosting environment's env vars.

**Test vs. live mode selection**: there is only ever one Stripe
secret/webhook-secret pair configured per deployment (test locally and in
CI, live only when `NODE_ENV=production`) — a single deployment never needs
to serve both modes at once, so the webhook secret is never chosen based on
payload content. As defense-in-depth against a misconfigured deployment
(e.g. a live webhook secret accidentally pointed at a non-production
environment), the webhook route independently cross-checks `event.livemode`
against `NODE_ENV === "production"` **after** signature verification
succeeds (`event.livemode` cannot be trusted before that point) — a mismatch
is rejected with 400. This is a runtime check, not a startup one: Stripe
webhook secrets (`whsec_...`) don't carry a syntactically-detectable
test/live marker the way API keys do (`sk_test_`/`sk_live_`), so there's no
way to catch a wrong-mode webhook secret at process startup — the first real
signal is the first mismatched event delivery.

## Files created/modified

**Created**
- `lib/stripe/env.ts`, `lib/stripe/server.ts`, `lib/stripe/client.ts`
- `lib/checkout/repriceItems.ts`, `lib/checkout/updateSpendTier.ts`
- `app/api/payments/stripe/create-intent/route.ts`
- `app/api/payments/stripe/webhook/route.ts`
- `app/api/payments/stripe/status/route.ts`
- `lib/supabase/migrations/005_add_pending_orders_and_webhook_dedupe.sql`
- `tests/` (see below)

**Modified**
- `app/checkout/page.tsx` — real `StripeCardForm` (Stripe `PaymentElement`)
  replacing the old fake card inputs; Nigerian checkout is bank-transfer only
- `app/cart/page.tsx`, `app/faq/page.tsx` — copy/badges
- `app/api/orders/route.ts` — writes to `stripe_session_id` (matching live
  schema), dropped `paystack_card`/`stripe_card` from the manual-order
  `payment_method` union (Stripe orders never go through this route — only
  the webhook creates them)
- `app/api/orders/[id]/invoice/route.ts` — reads `stripe_session_id`
- `lib/supabase/schema.sql`, `lib/supabase/types.ts` — corrected to match
  the actual live schema (see above), not the previously-assumed one
- `middleware.ts` — excludes the webhook path from the auth-cookie refresh

**Deleted**
- `app/api/payments/paystack/verify/route.ts`
- `lib/supabase/migrations/004_stripe_migration.sql` (described a rename
  that was never applied this way — see above)

**Deleted outside this repo (manual — see checklist above)**
- Supabase Edge Function `stripe-webhook`
- Supabase Edge Function `create-checkout-session`

## Testing the flow

### Automated

`npm test` — 19 pass, 4 skip. The 4 skips (`checkout-stripe-success`,
`checkout-stripe-decline`, `webhook-idempotency`, and the Playwright e2e
spec) require real Stripe test-mode credentials and a real test Supabase
project via `.env.test` (see `.env.test.example`) — they intentionally skip
rather than run against nothing. To make them run:
1. Copy `.env.test.example` → `.env.test`.
2. Fill in real Stripe **test-mode** keys.
3. Fill in a **test** Supabase project's URL/anon/service-role keys — apply
   `lib/supabase/schema.sql` (which now includes `pending_stripe_orders` and
   `stripe_webhook_events`) to that test project first. **Do not point this
   at the production/shared project** (`ztzhsfercfsciyqtqgrn`) — these tests
   insert and delete real rows.

The Playwright e2e spec (`tests/e2e/checkout-stripe.spec.ts`) has selectors
updated against Stripe's currently-documented `PaymentElement` DOM
conventions but **has not been run in headed mode against real credentials**
— there was no display server or real Stripe test key available to verify
it end-to-end. Run `npx playwright test --headed --debug` against a real dev
server before trusting it; fix any selector drift you find.

### Manual local walkthrough

1. `stripe listen --forward-to localhost:3000/api/payments/stripe/webhook`
   (keep running in a separate terminal)
2. `npm run dev`
3. Add an item to the cart, switch to a non-NGN currency, go through
   checkout, pick the "Card / Stripe" tab.
4. Use a [Stripe test card](https://docs.stripe.com/testing#cards):
   - `4242 4242 4242 4242` — succeeds
   - `4000 0000 0000 0002` — declined
   - `4000 0025 0000 3155` — requires 3D Secure authentication
   - Any future expiry, any CVC, any postal code.
5. On success, the browser polls until the webhook has created the order,
   then shows the confirmation screen. Check Supabase: `orders` has a new row
   with `status: 'processing'`, `transactions.payment_channel: 'stripe_card'`,
   and stock was decremented.
6. Confirm the invoice PDF (`/api/orders/[id]/invoice`) renders with the
   Stripe payment reference.

### Production

1. Set `STRIPE_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to your
   **live** keys and `STRIPE_WEBHOOK_SECRET` to the production webhook
   endpoint's signing secret, in your hosting platform's env vars only.
2. Confirm the production webhook endpoint is registered and receiving
   events (Stripe Dashboard → Webhooks → your endpoint → recent deliveries).
3. Place one real low-value purchase and refund it manually from the
   Dashboard to confirm the live path end-to-end.

## Security invariants (verified in code + tests)

- **Client-submitted prices/totals are never trusted.** `create-intent`
  re-fetches real prices from `products`/`new_in_items` (`repriceItems()`)
  and sets the PaymentIntent's amount from that — a tampered client total
  simply gets ignored. Covered by `tests/integration/checkout-stripe-tampered-price.test.ts`.
- **Signature verified before anything else.** No database read, no
  logging of payload contents, no side effects until
  `stripe.webhooks.constructEvent()` succeeds. Covered by
  `tests/integration/webhook-signature.test.ts` (unsigned request, forged
  signature, and — when live test credentials are configured — asserts zero
  database rows written from the forged request).
- **`event.livemode` cross-check** after signature verification. Covered by
  a dedicated test in `webhook-signature.test.ts`.
- **Idempotency on `event.id`**: `stripe_webhook_events.event_id` is a
  Postgres UNIQUE primary key, inserted *before* any order-creating work —
  a duplicate delivery hits the constraint and is rejected by the database,
  not by a read-then-write check. If processing then fails for a
  retry-worthy reason, the row is deleted before responding non-200 so a
  genuine Stripe retry of the same `event.id` can attempt again; only a
  *successfully processed* event stays permanently blocked. Covered by
  `tests/integration/webhook-idempotency.test.ts` (needs live credentials).
- **Fast response, no queue**: this app has no background job
  infrastructure. The work done after signature/idempotency checks (one
  RPC call plus a couple of small updates) is fast enough to complete
  inline without risking Stripe's response timeout — considered adding a
  queue and decided against it as unjustified complexity for this volume.
- **No secrets in code.** `STRIPE_WEBHOOK_SECRET`/`STRIPE_SECRET_KEY` come
  from environment only, checked via `lib/stripe/env.ts`.
- **PCI scope**: card numbers never reach our servers — Stripe's
  `PaymentElement` collects them inside Stripe-hosted iframes.

## Known follow-ups (not required, flagged for later)

- `lib/currency/schema.sql`'s `currency_config` table (with
  `paystack_support`/`stripe_support`/`payment_gateway` columns) and
  `lib/currency/constants.ts`'s `paystackSupported`/`stripeSupported` flags
  and `lib/currency/userProfile.ts`'s `PaymentGateway` type are dead code —
  nothing in the app reads them; the real routing is the single
  `currency === "NGN"` check in `app/checkout/page.tsx`. Safe to delete in a
  future cleanup pass.
- `transactions.stripe_payment_intent_id` is currently never populated by
  this flow (only `stripe_session_id` is, via `checkout_verified_order()`,
  which this integration must not rewrite). Cosmetic — not required.
- No refund automation exists — an out-of-stock race at webhook time (item
  sold out between PaymentIntent creation and webhook delivery) is logged
  with a TODO for a manual `stripe.refunds.create(...)` call.
- Stripe Tax is not enabled — Irish/EU VAT obligations need an accountant's
  input first, out of scope here.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Webhook returns 400 "Invalid signature" | `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint that sent it (test vs. live, or wrong `stripe listen` session) |
| Webhook returns 400 "Event mode does not match this environment" | A live-mode event hit a non-production deployment or vice versa — check which webhook secret/endpoint is configured where |
| Webhook works via `stripe trigger` but not real payments | Check the endpoint URL registered in the Dashboard matches your deployed domain exactly, and that the old edge-function destination URL has been removed |
| Confirmation screen never appears after a successful test payment | Check the webhook is actually reachable (dev: is `stripe listen` running?); check server logs for `pending_stripe_orders` lookup errors |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` changes don't take effect | Restart `next dev` — `NEXT_PUBLIC_*` vars are inlined at build/start time |
| "Refusing to use a non-test-mode Stripe secret key outside production" at startup | You put a `sk_live_`/`pk_live_` key in `.env.local` — use test keys locally |
