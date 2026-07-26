-- DELTA-ONLY migration. It assumes the live database already has the
-- Stripe-shaped schema applied directly (not through this repo's migration
-- files) via: switch_transactions_to_stripe, fix_checkout_function_and_lock_down_v2,
-- and revoke_public_execute_on_checkout_function — i.e. transactions already
-- has stripe_session_id (unique) + stripe_payment_intent_id, and
-- checkout_verified_order() already takes p_stripe_reference, not
-- p_payment_reference. Do NOT run the old (deleted) 004_stripe_migration.sql
-- — it renamed a paystack_reference column that no longer exists.
--
-- This file adds only what's genuinely still missing live: the staging
-- table bridging "PaymentIntent created" and "webhook confirms payment",
-- and a webhook-delivery idempotency ledger keyed on Stripe's event.id.
--
-- Verified against the live project (ztzhsfercfsciyqtqgrn) via Supabase MCP
-- before writing this file — see the accompanying report for exact column/
-- function-signature diffs. Do NOT run this against production directly;
-- apply it on a branch or a copy of the project first.

create table if not exists pending_stripe_orders (
  payment_intent_id text primary key,
  user_id            uuid references profiles(id) on delete set null,
  items              jsonb not null,
  delivery_address   jsonb not null,
  total_amount       numeric not null,
  currency           text not null,
  created_at         timestamptz not null default now()
);

alter table pending_stripe_orders enable row level security;

-- Idempotency ledger for webhook deliveries — see schema.sql's comment on
-- this table for the full insert-first/delete-on-failure protocol the
-- webhook route follows around it.
create table if not exists stripe_webhook_events (
  event_id   text primary key,
  created_at timestamptz not null default now()
);

alter table stripe_webhook_events enable row level security;
