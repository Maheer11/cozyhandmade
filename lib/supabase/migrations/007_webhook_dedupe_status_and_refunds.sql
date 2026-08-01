-- Two related fixes to app/api/payments/stripe/webhook/route.ts:
--
-- 1. stripe_webhook_events previously had one row meaning both "seen" and
--    "finished" — a delivery that started slow work, lost a race to a
--    duplicate delivery (which saw the row and returned 200), then itself
--    failed and deleted the row, resulted in Stripe stopping retries on an
--    event that was never actually processed. status distinguishes
--    "processing" (mid-flight, safe to retry-later) from "done" (terminal,
--    safe to short-circuit). updated_at lets a row stuck in "processing"
--    (the delivery that owned it crashed) be detected and taken over by a
--    later delivery instead of blocking forever — safe specifically because
--    every write it might redo (refunds.create, checkout_verified_order) is
--    already idempotent by payment_intent_id / stripe_session_id.
--
-- 2. Out-of-stock after a successful charge previously had a TODO instead of
--    a refund, and the failure path (409, delete dedupe row) told Stripe
--    "retry me" for a permanent failure that will fail identically forever.
--    refunds is the durable, queryable record — one row per
--    payment_intent_id (unique, so a takeover safely upserts rather than
--    duplicating), written as status='pending' BEFORE the Stripe call (an
--    honest "we attempted this" record, not a claim of success) and updated
--    to 'succeeded'/'failed' after. A persistently failing refund now has a
--    reconcilable row, not just an unread console.error.

alter table stripe_webhook_events
  add column if not exists status text not null default 'processing' check (status in ('processing', 'done')),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_intent_id  text not null unique,
  amount             numeric not null,
  currency           text not null,
  reason             text not null,
  product_name       text,
  customer_email     text,
  status             text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  stripe_refund_id   text,
  error_message      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table refunds enable row level security;
-- No anon/authenticated policy — service-role client only, same pattern as
-- pending_stripe_orders/stripe_webhook_events (this table is never read or
-- written by anything except the webhook route and, later, admin tooling).

-- Kept (not deleted) after a refund — see the route's comment on why: it's
-- the only record of everything that was in the cart, not just the one item
-- that triggered OUT_OF_STOCK. NULL means "not resolved via the refund
-- path" (either still genuinely pending, or resolved via a normal created
-- order instead — those rows are deleted as before).
alter table pending_stripe_orders add column if not exists resolved_at timestamptz;

-- Ad hoc monitoring query — any row here means a delivery died mid-flight
-- and hasn't yet been taken over by a later retry. Same 5-minute threshold
-- the route's takeover logic uses.
create or replace view stuck_webhook_events as
  select * from stripe_webhook_events
  where status = 'processing' and updated_at < now() - interval '5 minutes';
