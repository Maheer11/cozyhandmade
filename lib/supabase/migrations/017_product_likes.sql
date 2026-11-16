-- 017_product_likes.sql
-- Likes ("hearts") on the mobile homepage hero carousel.
--
-- One like per device per item: the browser keeps a random device id
-- (no personal data) and sends it with each like/unlike. The primary key makes
-- a second like from the same device a no-op, so the count can't be inflated
-- by tapping repeatedly.
--
-- Access: RLS on with NO policies, and no grants to anon/authenticated. Only
-- the server (service role, via app/api/likes and the homepage) reads or writes
-- it, so nobody can list devices or edit counts from the browser.
--
-- Apply in the Supabase SQL editor. Nothing else depends on it: until it is
-- applied the site simply shows no counts and the heart quietly does nothing.

begin;

create table if not exists public.product_likes (
  item_source text        not null check (item_source in ('product', 'featured_piece')),
  item_id     uuid        not null,
  device_id   uuid        not null,
  created_at  timestamptz not null default now(),
  primary key (item_source, item_id, device_id)
);

-- Counting is always "per item", so index the leading pair on its own too.
create index if not exists product_likes_item_idx
  on public.product_likes (item_source, item_id);

alter table public.product_likes enable row level security;
revoke all on table public.product_likes from public, anon, authenticated;
grant select, insert, delete on table public.product_likes to service_role;

-- Like totals for a set of items, in one round trip.
create or replace function public.product_like_counts(p_item_ids uuid[])
returns table (item_source text, item_id uuid, likes bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select l.item_source, l.item_id, count(*)::bigint as likes
  from public.product_likes l
  where l.item_id = any (p_item_ids)
  group by l.item_source, l.item_id;
$$;

revoke all on function public.product_like_counts(uuid[]) from public, anon, authenticated;
grant execute on function public.product_like_counts(uuid[]) to service_role;

commit;

-- ── Check after applying (run in a NEW query) ────────────────────────────
-- Expected: one row, both columns true.
--
-- select
--   exists (select 1 from information_schema.tables
--     where table_schema = 'public' and table_name = 'product_likes')        as has_table,
--   exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public' and p.proname = 'product_like_counts')       as has_function;
--
-- ── Your like numbers, most liked first ──────────────────────────────────
-- (products.id is text, product_likes.item_id is uuid: compare as text.)
-- select l.item_source, coalesce(p.name, f.name) as name, count(*) as likes
-- from public.product_likes l
-- left join public.products p        on l.item_source = 'product'        and p.id::text = l.item_id::text
-- left join public.featured_pieces f on l.item_source = 'featured_piece' and f.id::text = l.item_id::text
-- group by 1, 2 order by likes desc;
