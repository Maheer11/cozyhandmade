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
