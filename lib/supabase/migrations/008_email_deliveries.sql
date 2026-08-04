-- Durable ledger for the customer/admin emails the Stripe webhook sends.
--
-- Two jobs, both of which the webhook route already solves this exact way
-- for refunds (see 007) — this is the same protocol, not a new pattern:
--
-- 1. IDEMPOTENCY. `unique (kind, payment_intent_id)` is the whole mechanism.
--    The route inserts a row BEFORE sending anything; a second attempt for
--    the same email hits the constraint and sends nothing. This matters
--    because a stripe_webhook_events row stuck in 'processing' can be taken
--    over by a later delivery, so an event genuinely can be processed more
--    than once after a crash. Without this table, that takeover would send
--    the customer a second confirmation.
--
-- 2. DISCOVERABILITY. A send that fails must not vanish into console.error.
--    The row is written as 'pending' (an honest "we are attempting this",
--    not a claim of success) and updated to 'sent' or 'failed' after, with
--    the provider's error preserved. A failed email is then a queryable row
--    with a recipient and a reason, which a human or a future retry job can
--    act on.
--
-- Rows are never deleted. They are the only record that a customer was —
-- or was not — told about their own order.
create table if not exists email_deliveries (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('order_confirmation', 'refund_notification', 'admin_new_order')),
  payment_intent_id text not null,
  -- NULL for refund_notification: the out-of-stock path refunds precisely
  -- because no order was created, so there is no order to reference.
  order_id          uuid references orders(id) on delete set null,
  recipient         text not null,
  status            text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message     text,
  attempts          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (kind, payment_intent_id)
);

alter table email_deliveries enable row level security;
-- No anon/authenticated policy — service-role client only, matching
-- refunds/pending_stripe_orders/stripe_webhook_events. Nothing except the
-- webhook route and (later) admin tooling ever touches this table.

-- Ad hoc monitoring query, mirroring 007's stuck_webhook_events view.
--
-- 'failed'  = we reached the provider and it refused, or the request timed
--             out. error_message says which.
-- stale 'pending' = we claimed the send and never finished it — the process
--             died, or the platform killed the invocation mid-request. The
--             15-minute window is deliberately far longer than the 5-second
--             send timeout, so an in-flight send is never reported as stuck.
create or replace view failed_email_deliveries as
  select * from email_deliveries
  where status = 'failed'
     or (status = 'pending' and created_at < now() - interval '15 minutes');
