-- ============================================================
-- COZY HANDMADE — DATABASE SCHEMA
-- Paste this entire file into: Supabase → SQL Editor → Run
-- ============================================================


-- TABLE 1: profiles
-- Extends Supabase's built-in auth.users table.
-- Created automatically when a customer signs up.
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text,
  avatar_url   text,
  total_spent  numeric default 0,
  coin_balance integer default 0,
  tier         text default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'vip')),
  created_at   timestamptz default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- TABLE 2: products
-- Replaces the hardcoded products.ts file.
-- stock_quantity drives in_stock automatically.
create table if not exists products (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  price          numeric not null,
  original_price numeric,
  category       text not null,
  image          text,
  images         text[] default '{}',
  description    text,
  details        text[] default '{}',
  tags           text[] default '{}',
  stock_quantity integer default 0,
  in_stock       boolean generated always as (stock_quantity > 0) stored,
  featured       boolean default false,
  -- Curated homepage hero (components/HeroTiles.tsx), toggled per-row from
  -- /admin/products. Separate from `featured` above on purpose: that one only
  -- drives sort order on the /products listing, and the owner needs the two
  -- independent. Added in migration 012_show_on_homepage.sql.
  show_on_homepage boolean not null default false,
  is_handmade    boolean not null default true,
  created_at     timestamptz default now()
);

-- Partial index — the homepage only reads the `true` rows, a hand-picked
-- handful, while the catalogue itself grows. See migration 012.
create index if not exists products_show_on_homepage_idx
  on products (show_on_homepage) where show_on_homepage;


-- TABLE 3: orders
-- One row per checkout. Tracks delivery and status.
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles(id) on delete set null,
  status           text default 'pending'
                     check (status in ('pending','paid','processing','shipped','delivered','cancelled')),
  total_amount     numeric not null,
  delivery_address jsonb,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Auto-update updated_at on every change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();


-- TABLE 4: order_items
-- The individual products inside each order.
-- product_name is a snapshot — preserves name even if product is deleted.
create table if not exists order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    text references products(id) on delete set null,
  product_name  text not null,
  product_image text,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric not null,
  subtotal      numeric generated always as (quantity * unit_price) stored
);


-- TABLE 5: transactions
-- Payment records — one per successful/attempted charge.
-- stripe_session_id is the UNIQUE idempotency/reference column — despite the
-- name (a holdover from an earlier Stripe Checkout Session design that was
-- since replaced with PaymentIntent + PaymentElement), it now holds the
-- Stripe PaymentIntent id for card payments, or a client-generated order ref
-- for manual bank transfers. checkout_verified_order()'s p_stripe_reference
-- param writes here. stripe_payment_intent_id is a separate, non-unique
-- column kept in sync with the same value for anyone querying by that name.
create table if not exists transactions (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid references orders(id) on delete set null,
  user_id                  uuid references profiles(id) on delete set null,
  stripe_session_id        text unique,
  stripe_payment_intent_id text,
  amount                   numeric not null,
  currency                 text default 'NGN',
  status                   text default 'pending'
                             check (status in ('pending', 'success', 'failed')),
  payment_channel          text,
  paid_at                  timestamptz,
  created_at               timestamptz default now()
);


-- TABLE 6: pending_stripe_orders
-- Short-lived staging row created when a Stripe PaymentIntent is created
-- (before the customer has actually paid), consumed by
-- app/api/payments/stripe/webhook/route.ts once payment_intent.succeeded
-- fires. Holds the server-verified cart items + delivery address, since the
-- webhook is a server-to-server callback from Stripe with no access to the
-- customer's original request. No anon/authenticated RLS policies — only
-- ever touched by the service-role admin client, same as transactions/orders.
create table if not exists pending_stripe_orders (
  payment_intent_id text primary key,
  user_id            uuid references profiles(id) on delete set null,
  items              jsonb not null,
  delivery_address   jsonb not null,
  total_amount       numeric not null,
  currency           text not null,
  created_at         timestamptz not null default now()
);


-- TABLE 7: stripe_webhook_events
-- Idempotency ledger for Stripe webhook deliveries. Stripe guarantees
-- at-least-once delivery, not exactly-once — the webhook route inserts
-- event.id here BEFORE doing any order-creating work, and a duplicate
-- delivery hits this UNIQUE constraint and is rejected by the database
-- itself (no read-then-write race window). If processing that event then
-- fails for a retry-worthy reason, the row is deleted before responding
-- with a non-200 status, so Stripe's automatic retry of the same event.id
-- is allowed to attempt again — only a *successfully processed* event
-- permanently blocks reprocessing.
create table if not exists stripe_webhook_events (
  event_id   text primary key,
  created_at timestamptz not null default now()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Customers can only see their own data. Never anyone else's.
-- ============================================================

alter table profiles              enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table transactions          enable row level security;
alter table pending_stripe_orders enable row level security;
alter table stripe_webhook_events enable row level security;
alter table products     enable row level security;

-- Profiles: users read/update only their own row
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Products: anyone can read (public catalogue)
create policy "Products are publicly readable"
  on products for select using (true);

-- Orders: users see only their own orders
create policy "Users can view own orders"
  on orders for select using (auth.uid() = user_id);

create policy "Users can insert own orders"
  on orders for insert with check (auth.uid() = user_id);

-- Order items: users see items belonging to their orders
create policy "Users can view own order items"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

-- Transactions: users see only their own transactions
create policy "Users can view own transactions"
  on transactions for select using (auth.uid() = user_id);


-- ============================================================
-- ORDER LIFECYCLE AUTOMATION
-- Payment verification → atomic stock decrement → "processing" status.
-- Safe to re-run: columns/function use IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

-- Timestamps for the two manual admin actions ("Mark as Shipped" /
-- "Mark as Delivered"), used to show the customer accurate dates.
alter table orders add column if not exists shipped_at   timestamptz;
alter table orders add column if not exists delivered_at timestamptz;

-- ============================================================
-- FEATURED PIECES — curated collection, admin-managed via Cloudinary uploads.
-- Owns its own price, colors, sizes, description and detail route
-- (/featured-pieces/[id]), but NOT its stock: since migration
-- 013_featured_pieces_stock_from_product.sql each row links to a product via
-- product_id and inherits that product's stock_quantity, so the same physical
-- item listed in both catalogues can no longer have two counters that drift.
-- Formerly "New In" / new_in_items — renamed in migration
-- 011_rename_new_in_to_featured_pieces.sql.
-- ============================================================

create table if not exists featured_pieces (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  product_image   text not null,
  lifestyle_image text,
  -- Manual availability OVERRIDE, not a stock value: true hides the piece from
  -- sale even when the linked product still has stock. Effective availability
  -- is `sold_out = false AND linked product stock_quantity > 0`.
  sold_out        boolean default false,
  display_order   integer default 0,
  created_at      timestamptz default now(),
  price           numeric(10, 2) not null default 0,
  discount_price  numeric(10, 2),
  colors          text[] default '{}',
  sizes           text[] default '{}',
  description     text,
  sku             text unique,
  -- DEPRECATED (migration 013) — no application code reads or writes this.
  -- Stock lives on the linked product now; the column is retained only so 013
  -- stays reversible, and gets dropped in a later migration.
  stock_quantity  integer not null default 0,
  updated_at      timestamptz default now(),
  -- Per-tier pricing, e.g. {"Without Stand": 189.99, "With Stand": 215.00}.
  -- Keys should match entries in `sizes` — same variant_price/size pattern
  -- already used on the `products` table. Falls back to `price`/`discount_price`
  -- when a selected size has no entry (or `sizes` is empty entirely).
  variant_price   jsonb not null default '{}'::jsonb,
  is_handmade     boolean not null default true,
  -- Curated homepage hero, toggled per-row from /admin/featured-pieces. The
  -- hero used to be the first N rows of this table by display_order; it is now
  -- whatever is flagged here, across BOTH this table and products, with no
  -- count cap. Added in migration 012_show_on_homepage.sql.
  show_on_homepage boolean not null default false,
  -- The product this piece takes its stock from. TEXT, because products.id is
  -- text rather than uuid. ON DELETE RESTRICT so a product cannot be deleted
  -- out from under a featured piece that depends on it for stock — the owner
  -- gets an error at delete time instead of a listing with no stock source.
  -- Required in practice for new rows (enforced by the admin API route);
  -- nullable in the schema only because migration 013 had to add it to
  -- existing rows before backfilling them.
  product_id      text references products(id) on delete restrict
);

-- Partial index — see the equivalent on products, same reasoning.
create index if not exists featured_pieces_show_on_homepage_idx
  on featured_pieces (show_on_homepage) where show_on_homepage;

-- Every storefront read joins through this to resolve stock, and the FK's
-- RESTRICT check scans it on every product delete.
create index if not exists featured_pieces_product_id_idx on featured_pieces (product_id);

comment on column featured_pieces.stock_quantity is
  'DEPRECATED (migration 013) — superseded by product_id → products.stock_quantity; retained temporarily so the change is reversible; drop in a later migration once verified in production. No application code reads or writes this column.';

comment on column featured_pieces.product_id is
  'The product this featured piece takes its stock from. Required for new rows (enforced in app/api/admin/featured-pieces). Checkout checks and decrements THIS product''s stock_quantity. featured_pieces.sold_out remains as a manual override on top of it.';

alter table featured_pieces enable row level security;

-- Public read (homepage + /featured-pieces), no insert/update/delete policy —
-- only the service-role client used by app/api/admin/featured-pieces/** can
-- write, same pattern as the products table.
create policy "Featured Pieces are publicly readable"
  on featured_pieces for select using (true);

drop trigger if exists featured_pieces_updated_at on featured_pieces;
create trigger featured_pieces_updated_at
  before update on featured_pieces
  for each row execute function update_updated_at();


-- Atomically verifies stock, decrements it, and creates the order +
-- order_items + transaction row in ONE transaction (a single Postgres
-- function call is implicitly atomic — if it raises, everything it did
-- is rolled back, including earlier writes in the same call).
--
-- Called via RPC from app/api/payments/stripe/webhook/route.ts using the
-- service-role client, AFTER that route has already recomputed and verified
-- the real total against Stripe's confirmed charge. This function trusts
-- its caller on price (already verified) but re-checks stock itself and
-- locks the relevant rows (SELECT ... FOR UPDATE) so two concurrent
-- checkouts for the same item can never both succeed on the last unit.
--
-- Each element of p_items carries item_type. 'product' items are checked/
-- decremented against their own products.stock_quantity and get product_id
-- set on their order_items row. Non-product items ('featured_piece', or the
-- legacy 'new_in' value still present on orders placed before the rename) are
-- resolved through featured_pieces.product_id and checked/decremented against
-- THAT PRODUCT's stock — featured pieces have had no stock counter of their
-- own since migration 013 — and always get product_id = NULL on order_items
-- (that column references products, so a featured_pieces id can never go
-- there — product_name/product_image/unit_price are the snapshot).
--
-- Raises 'OUT_OF_STOCK:<name>' if any item can't be fulfilled — the whole
-- call rolls back automatically (nothing is created, nothing decremented).
-- The webhook route parses that prefix and refunds the customer.
--
-- Everything about this function other than featured-piece stock handling is
-- unchanged from 011: same signature, security definer, search_path, the same
-- orders/order_items/transactions inserts, the same OUT_OF_STOCK:<name>
-- exception contract (app/api/payments/stripe/webhook/route.ts parses that
-- prefix to decide "permanent failure → refund the customer"), and the same
-- revoke/grant at the end.
--
-- THREE things needed care here:
--
-- (a) LOCK ORDERING. The old version locked products, then featured_pieces.
--     Now a featured piece resolves to a product row, so the set of product
--     rows this call mutates includes products referenced only indirectly via
--     featured_pieces — locking just the directly-ordered product ids would
--     leave those unprotected and reintroduce the exact oversell race the
--     locking exists to prevent. So both id sets are merged into ONE product
--     lock.
--
--     The order is now featured_pieces first, then products. That inverts the
--     old order, which is safe because this function is the only thing that
--     takes both locks (admin writes are single-row updates) — what matters is
--     that every caller agrees, and they all run this one function. It is also
--     required rather than arbitrary: resolving a featured piece to its
--     product_id is itself a read of featured_pieces, and locking those rows
--     before reading product_id means the mapping cannot be repointed out from
--     under us between resolving and locking.
--
--     Both locking statements carry an explicit ORDER BY. `... where id =
--     any(sorted_array) for update` does NOT lock in array order — the array
--     order is invisible to the planner and rows get locked in whatever order
--     the scan emits them, which is what the old sorted array_agg was really
--     doing (nothing). ORDER BY puts a Sort below the LockRows node, so rows
--     really are locked in id order and two overlapping concurrent checkouts
--     cannot deadlock.
--
-- (b) SAME PRODUCT TWICE. If one order contains a product directly AND a
--     featured piece that resolves to that same product, the two quantities
--     are competing for ONE stock number. Grouping by (item_type, ref_id) —
--     what the old version did — would check 2 against stock and 1 against
--     stock separately and happily let both through on a stock of 2, then
--     decrement 3. So the grouping key is the RESOLVED PRODUCT ID: both lines
--     collapse into one group whose summed quantity is checked, and
--     decremented, once.
--
-- (c) MISCONFIGURATION. A featured piece with product_id IS NULL has no stock
--     source. Treating that as "no limit" would sell stock that doesn't exist,
--     so it raises instead — with a distinct prefix, not OUT_OF_STOCK, because
--     it is not a customer-facing stock outcome but a data problem only the
--     owner can fix, and it must be diagnosable as such in the logs.
create or replace function public.checkout_verified_order(
  p_user_id          uuid,
  p_total_amount     numeric,
  p_delivery_address jsonb,
  p_currency         text,
  p_stripe_reference text,
  p_payment_channel  text,
  p_items            jsonb,  -- [{item_type, ref_id, product_name, product_image, quantity, unit_price}, ...]
  p_charged_amount   numeric default null  -- actual amount charged in p_currency; falls back to p_total_amount (EUR) when same-currency
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order_id           uuid;
  v_featured_piece_ids uuid[];
  v_product_ids        text[];
  v_name               text;
  v_row                record;
begin
  -- Guard the discriminator before anything trusts it. 'featured_piece' is the
  -- current value; 'new_in' is the legacy one still stored on orders placed
  -- before the New In → Featured Pieces rename (migration 011) and on carts
  -- persisted in localStorage since then, so both must keep working. Anything
  -- else is a bug in the caller, and silently skipping such a line would mean
  -- shipping an item without ever decrementing stock for it.
  select elem->>'item_type'
    into v_name
  from jsonb_array_elements(p_items) elem
  -- coalesce, not `not in (...)` alone: a NULL item_type would make the NOT IN
  -- evaluate to NULL rather than true, slipping past this guard and then being
  -- dropped silently from the stock grouping below — shipped, never decremented.
  where coalesce(elem->>'item_type', '') not in ('product', 'featured_piece', 'new_in')
  limit 1;
  if v_name is not null then
    raise exception 'UNKNOWN_ITEM_TYPE:%', v_name;
  end if;

  -- ── Lock featured_pieces first (see note (a) above) ──
  select array_agg(distinct (elem->>'ref_id')::uuid)
    into v_featured_piece_ids
  from jsonb_array_elements(p_items) elem
  where elem->>'item_type' in ('featured_piece', 'new_in');

  perform 1
     from featured_pieces
    where id = any(v_featured_piece_ids)
    order by id
      for update;

  -- Misconfiguration: a featured piece that is missing, or linked to nothing,
  -- has no stock source. Fail loudly rather than sell from nowhere.
  select coalesce(fp.name, elem->>'ref_id')
    into v_name
  from jsonb_array_elements(p_items) elem
  -- The uuid cast is guarded by the same CASE used further down: a JOIN's ON
  -- clause is evaluated for EVERY row, product lines included, and
  -- products.id is TEXT that need not be uuid-shaped — an unguarded cast here
  -- would error out on a perfectly ordinary product id.
  left join featured_pieces fp
    on fp.id = case
                 when elem->>'item_type' in ('featured_piece', 'new_in')
                 then (elem->>'ref_id')::uuid
               end
  where elem->>'item_type' in ('featured_piece', 'new_in')
    and (fp.id is null or fp.product_id is null)
  limit 1;
  if v_name is not null then
    raise exception 'UNLINKED_FEATURED_PIECE:%', v_name;
  end if;

  -- Manual override: sold_out = true means unavailable no matter how much
  -- stock the linked product has. Reported as OUT_OF_STOCK with the featured
  -- piece's own name, because to the customer it is exactly that, and the
  -- refund email built from this message names the item they bought.
  select fp.name
    into v_name
  from jsonb_array_elements(p_items) elem
  -- CASE-guarded cast, same reason as the join above.
  join featured_pieces fp
    on fp.id = case
                 when elem->>'item_type' in ('featured_piece', 'new_in')
                 then (elem->>'ref_id')::uuid
               end
  where elem->>'item_type' in ('featured_piece', 'new_in')
    and fp.sold_out
  limit 1;
  if v_name is not null then
    raise exception 'OUT_OF_STOCK:%', v_name;
  end if;

  -- ── One merged, sorted product lock: directly-ordered products PLUS the
  -- products behind the featured pieces (see note (a) above) ──
  select array_agg(distinct t.product_id)
    into v_product_ids
  from (
    select case
             when elem->>'item_type' = 'product' then elem->>'ref_id'
             else fp.product_id
           end as product_id
    from jsonb_array_elements(p_items) elem
    -- The cast to uuid is inside a CASE so it is only evaluated for featured
    -- piece lines: products.id is TEXT and need not be uuid-shaped, and an
    -- unconditional cast would error on a perfectly valid product id.
    left join featured_pieces fp
      on fp.id = case
                   when elem->>'item_type' in ('featured_piece', 'new_in')
                   then (elem->>'ref_id')::uuid
                 end
  ) t
  where t.product_id is not null;

  perform 1
     from products
    where id = any(v_product_ids)
    order by id
      for update;

  -- ── Check every RESOLVED PRODUCT has enough stock BEFORE changing anything,
  -- with direct and via-featured-piece quantities summed together (note (b)) ──
  for v_row in
    with lines as (
      select elem->>'item_type'        as item_type,
             elem->>'ref_id'           as ref_id,
             (elem->>'quantity')::int  as qty,
             fp.product_id             as fp_product_id,
             fp.name                   as fp_name
      from jsonb_array_elements(p_items) elem
      left join featured_pieces fp
        on fp.id = case
                     when elem->>'item_type' in ('featured_piece', 'new_in')
                     then (elem->>'ref_id')::uuid
                   end
    ),
    grouped as (
      -- fp_product_id is non-null for every featured-piece line (guaranteed by
      -- the UNLINKED_FEATURED_PIECE check above) and null for product lines,
      -- where ref_id IS the product id — so this coalesce is the resolution.
      select coalesce(l.fp_product_id, l.ref_id) as product_id,
             sum(l.qty)                          as qty,
             -- Name the customer would recognise: the featured piece's name
             -- when the shortfall involves one, else the product's own name.
             min(l.fp_name)                      as fp_name
      from lines l
      group by 1
    )
    select g.product_id,
           g.qty,
           coalesce(g.fp_name, p.name) as display_name,
           coalesce(p.stock_quantity, 0) as stock_quantity
    from grouped g
    left join products p on p.id = g.product_id
  loop
    if v_row.stock_quantity < v_row.qty then
      raise exception 'OUT_OF_STOCK:%', coalesce(v_row.display_name, v_row.product_id);
    end if;
  end loop;

  -- All items available — decrement stock for real. Set-based and grouped by
  -- the same resolved product id, so a product ordered both directly and via a
  -- featured piece is decremented ONCE, by the summed quantity.
  with lines as (
    select elem->>'item_type'        as item_type,
           elem->>'ref_id'           as ref_id,
           (elem->>'quantity')::int  as qty,
           fp.product_id             as fp_product_id
    from jsonb_array_elements(p_items) elem
    left join featured_pieces fp
      on fp.id = case
                   when elem->>'item_type' in ('featured_piece', 'new_in')
                   then (elem->>'ref_id')::uuid
                 end
  ),
  grouped as (
    select coalesce(l.fp_product_id, l.ref_id) as product_id,
           sum(l.qty)                          as qty
    from lines l
    group by 1
  )
  update products p
     set stock_quantity = p.stock_quantity - g.qty
    from grouped g
   where p.id = g.product_id;

  -- Create the order — straight to "processing", no manual "paid" wait step.
  insert into orders (user_id, status, total_amount, delivery_address)
  values (p_user_id, 'processing', p_total_amount, p_delivery_address)
  returning id into v_order_id;

  -- order_items.product_id references products, and featured pieces still get
  -- NULL there — unchanged. It stays a snapshot table keyed on
  -- product_name/product_image/unit_price, and back-filling it from the new
  -- link would rewrite what historical non-product order lines mean.
  insert into order_items (order_id, product_id, product_name, product_image, quantity, unit_price)
  select v_order_id,
         case when elem->>'item_type' = 'product' then elem->>'ref_id' else null end,
         elem->>'product_name',
         elem->>'product_image',
         (elem->>'quantity')::int,
         (elem->>'unit_price')::numeric
  from jsonb_array_elements(p_items) elem;

  -- transactions.stripe_session_id is UNIQUE — a duplicate/retried call with
  -- the same reference (e.g. a retried Stripe webhook delivery) raises a
  -- unique-violation here, which rolls back the whole function (order +
  -- order_items + stock decrement included). That gives idempotency against
  -- double-submitted/duplicated payment confirmations for free — on top of,
  -- not instead of, the dedicated stripe_webhook_events ledger the webhook
  -- route checks before ever calling this function.
  insert into transactions (order_id, user_id, stripe_session_id, amount, currency, status, payment_channel, paid_at)
  values (v_order_id, p_user_id, p_stripe_reference, coalesce(p_charged_amount, p_total_amount), p_currency, 'success', p_payment_channel, now());

  return v_order_id;
end;
$$;

-- Locked down to service_role/postgres only — no anon/authenticated grant.
-- The webhook route (and it alone) calls this via the service-role client.
revoke all on function public.checkout_verified_order from public, anon, authenticated;
grant execute on function public.checkout_verified_order to service_role;


-- ============================================================
-- REVIEWS — real customer screenshots, admin-managed via Cloudinary
-- uploads (replaces the old hardcoded array in SocialProofSection.tsx)
-- ============================================================

create table if not exists reviews (
  id              uuid primary key default gen_random_uuid(),
  screenshot      text not null,
  platform        text not null check (platform in ('whatsapp','instagram')),
  customer_label  text,
  location        text,
  review_date     text,
  display_order   integer default 0,
  created_at      timestamptz default now()
);

alter table reviews enable row level security;

-- Public read (homepage + products page), no insert/update/delete policy —
-- only the service-role client used by app/api/admin/reviews/** can write,
-- same pattern as products/featured_pieces.
create policy "Reviews are publicly readable"
  on reviews for select using (true);
