-- 018_subscribers.sql
-- Email signups with double opt-in (docs/DESIGN.md §8): the "Private access"
-- intro and the "Letters from our Studio" form both write here.
--
-- Flow: a signup creates/refreshes a `pending` row holding only the HASH of a
-- one-time confirm token (48h). Clicking the emailed link confirms it and adds
-- the address to the Resend segment "cozi newsletter". Resend is the source
-- of truth for marketing unsubscribes; this table mirrors it.
--
-- Access: RLS on with NO policies and no grants to anon/authenticated. Only
-- the server (service role) reads or writes it.
--
-- Columns beyond the brief, and why:
--   confirm_sent_at    — "resend at most once per 10 minutes" needs the time
--                        the last confirmation email went out.
--   resend_contact_id  — the Resend contact this row maps to, once confirmed.
--   updated_at         — housekeeping.
-- Apply in the Supabase SQL editor.

begin;

create table if not exists public.subscribers (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null unique check (email = lower(email) and length(email) <= 254),
  status                 text not null default 'pending'
                           check (status in ('pending', 'confirmed', 'unsubscribed')),
  source                 text not null check (source in ('intro', 'newsletter', 'import')),
  consent_text           text not null,
  consent_at             timestamptz not null,
  confirm_token_hash     text unique,
  confirm_expires_at     timestamptz,
  confirm_sent_at        timestamptz,
  confirmed_at           timestamptz,
  unsubscribe_token_hash text unique,
  unsubscribed_at        timestamptz,
  resend_contact_id      text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscribers_status_idx on public.subscribers (status);

create or replace function public.subscribers_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscribers_touch_updated_at on public.subscribers;
create trigger subscribers_touch_updated_at
  before update on public.subscribers
  for each row execute function public.subscribers_touch_updated_at();

alter table public.subscribers enable row level security;
revoke all on table public.subscribers from public, anon, authenticated;
grant select, insert, update, delete on table public.subscribers to service_role;

commit;

-- ── Check after applying (run in a NEW query) ────────────────────────────
-- Expected: one row; has_table true, rls_on true, public_policies 0.
--
-- select
--   exists (select 1 from information_schema.tables
--     where table_schema = 'public' and table_name = 'subscribers')          as has_table,
--   (select relrowsecurity from pg_class where oid = 'public.subscribers'::regclass) as rls_on,
--   (select count(*) from pg_policies where tablename = 'subscribers')          as public_policies;
--
-- ── Your list at a glance ────────────────────────────────────────────────
-- select status, source, count(*) from public.subscribers group by 1, 2 order by 1, 2;
