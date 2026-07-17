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
  rating         numeric default 0,
  review_count   integer default 0,
  image          text,
  images         text[] default '{}',
  description    text,
  details        text[] default '{}',
  tags           text[] default '{}',
  stock_quantity integer default 0,
  in_stock       boolean generated always as (stock_quantity > 0) stored,
  featured       boolean default false,
  created_at     timestamptz default now()
);


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
-- Payment records from Paystack.
-- paystack_reference is the unique ID Paystack gives each payment.
create table if not exists transactions (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid references orders(id) on delete set null,
  user_id             uuid references profiles(id) on delete set null,
  paystack_reference  text unique,
  amount              numeric not null,
  currency            text default 'NGN',
  status              text default 'pending'
                        check (status in ('pending', 'success', 'failed')),
  payment_channel     text,
  paid_at             timestamptz,
  created_at          timestamptz default now()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Customers can only see their own data. Never anyone else's.
-- ============================================================

alter table profiles     enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table transactions enable row level security;
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
-- NEW IN — standalone curated collection, admin-managed via Cloudinary
-- uploads. NOT linked to products — it has its own price, stock, colors,
-- sizes and description, and its own detail route (/new-in/[id]).
-- ============================================================

create table if not exists new_in_items (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  product_image   text not null,
  lifestyle_image text,
  sold_out        boolean default false,
  display_order   integer default 0,
  created_at      timestamptz default now(),
  price           numeric(10, 2) not null default 0,
  discount_price  numeric(10, 2),
  colors          text[] default '{}',
  sizes           text[] default '{}',
  description     text,
  sku             text unique,
  stock_quantity  integer not null default 0,
  updated_at      timestamptz default now(),
  -- Per-tier pricing, e.g. {"Without Stand": 189.99, "With Stand": 215.00}.
  -- Keys should match entries in `sizes` — same variant_price/size pattern
  -- already used on the `products` table. Falls back to `price`/`discount_price`
  -- when a selected size has no entry (or `sizes` is empty entirely).
  variant_price   jsonb not null default '{}'::jsonb
);

alter table new_in_items enable row level security;

-- Public read (homepage + /new-in), no insert/update/delete policy — only
-- the service-role client used by app/api/admin/new-in/** can write, same
-- pattern as the products table.
create policy "New In items are publicly readable"
  on new_in_items for select using (true);

drop trigger if exists new_in_items_updated_at on new_in_items;
create trigger new_in_items_updated_at
  before update on new_in_items
  for each row execute function update_updated_at();


-- Atomically verifies stock, decrements it, and creates the order +
-- order_items + transaction row in ONE transaction (a single Postgres
-- function call is implicitly atomic — if it raises, everything it did
-- is rolled back, including earlier writes in the same call).
--
-- Called via RPC from app/api/payments/paystack/verify/route.ts using the
-- service-role client, AFTER that route has already recomputed and verified
-- the real total against Paystack's confirmed charge. This function trusts
-- its caller on price (already verified) but re-checks stock itself and
-- locks the relevant rows (SELECT ... FOR UPDATE) so two concurrent
-- checkouts for the same item can never both succeed on the last unit.
--
-- Each element of p_items carries item_type: 'product' items are checked/
-- decremented against products.stock_quantity and get product_id set on
-- their order_items row; 'new_in' items are checked/decremented against
-- new_in_items.stock_quantity instead and always get product_id = NULL
-- (order_items.product_id references products, so a new_in_items id can
-- never go there — product_name/product_image/unit_price are the snapshot).
--
-- Raises 'OUT_OF_STOCK:<name>' if any item can't be fulfilled — the whole
-- call rolls back automatically (nothing is created, nothing decremented).
create or replace function public.checkout_verified_order(
  p_user_id            uuid,
  p_total_amount       numeric,
  p_delivery_address   jsonb,
  p_currency           text,
  p_paystack_reference text,
  p_payment_channel    text,
  p_items              jsonb   -- [{item_type, ref_id, product_name, product_image, quantity, unit_price}, ...]
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_order_id     uuid;
  v_product_ids  text[];
  v_new_in_ids   uuid[];
  v_row          record;
begin
  -- Lock every row involved, in a stable (sorted) order, so two concurrent
  -- checkouts touching overlapping items can never deadlock.
  select array_agg(distinct (elem->>'ref_id') order by (elem->>'ref_id'))
    into v_product_ids
  from jsonb_array_elements(p_items) elem
  where elem->>'item_type' = 'product';

  select array_agg(distinct (elem->>'ref_id')::uuid order by (elem->>'ref_id'))
    into v_new_in_ids
  from jsonb_array_elements(p_items) elem
  where elem->>'item_type' = 'new_in';

  perform 1 from products where id = any(v_product_ids) for update;
  perform 1 from new_in_items where id = any(v_new_in_ids) for update;

  -- Check every item has enough stock BEFORE changing anything.
  for v_row in
    select (elem->>'item_type') as item_type,
           (elem->>'ref_id') as ref_id,
           sum((elem->>'quantity')::int) as qty
    from jsonb_array_elements(p_items) elem
    group by (elem->>'item_type'), (elem->>'ref_id')
  loop
    if v_row.item_type = 'product' then
      if not exists (select 1 from products where id = v_row.ref_id and stock_quantity >= v_row.qty) then
        raise exception 'OUT_OF_STOCK:%', (select name from products where id = v_row.ref_id);
      end if;
    else
      if not exists (select 1 from new_in_items where id = v_row.ref_id::uuid and stock_quantity >= v_row.qty) then
        raise exception 'OUT_OF_STOCK:%', (select name from new_in_items where id = v_row.ref_id::uuid);
      end if;
    end if;
  end loop;

  -- All items available — decrement stock for real.
  for v_row in
    select (elem->>'item_type') as item_type,
           (elem->>'ref_id') as ref_id,
           sum((elem->>'quantity')::int) as qty
    from jsonb_array_elements(p_items) elem
    group by (elem->>'item_type'), (elem->>'ref_id')
  loop
    if v_row.item_type = 'product' then
      update products set stock_quantity = stock_quantity - v_row.qty where id = v_row.ref_id;
    else
      update new_in_items set stock_quantity = stock_quantity - v_row.qty where id = v_row.ref_id::uuid;
    end if;
  end loop;

  -- Create the order — straight to "processing", no manual "paid" wait step.
  insert into orders (user_id, status, total_amount, delivery_address)
  values (p_user_id, 'processing', p_total_amount, p_delivery_address)
  returning id into v_order_id;

  insert into order_items (order_id, product_id, product_name, product_image, quantity, unit_price)
  select v_order_id,
         case when elem->>'item_type' = 'product' then elem->>'ref_id' else null end,
         elem->>'product_name',
         elem->>'product_image',
         (elem->>'quantity')::int,
         (elem->>'unit_price')::numeric
  from jsonb_array_elements(p_items) elem;

  -- transactions.paystack_reference is UNIQUE — a duplicate/retried call with
  -- the same reference raises a unique-violation here, which rolls back the
  -- whole function (order + order_items + stock decrement included). That
  -- gives idempotency against double-submitted verify requests for free.
  insert into transactions (order_id, user_id, paystack_reference, amount, currency, status, payment_channel, paid_at)
  values (v_order_id, p_user_id, p_paystack_reference, p_total_amount, p_currency, 'success', p_payment_channel, now());

  return v_order_id;
end;
$$;
