-- Admin-manageable categories, replacing the hardcoded array that used to
-- live in lib/products.ts. Creating/editing a category no longer requires a
-- code change — see /admin/categories.
--
-- `image` is a manual override, nullable on purpose. When it's NULL, the app
-- falls back (at read time, in lib/db-categories.ts) to the most recently
-- added product's image in that category. That fallback is what makes a
-- brand new category's card correct with zero admin action the moment the
-- first product is tagged with it, and keeps it correct forever after —
-- no stored image to go stale, unlike the old hardcoded array.
--
-- `id` doubles as the slug stored on products.category (a free-text column,
-- not a foreign key — see 001_create_custom_products.sql's products table).
-- It's assigned once at creation (derived from name) and the admin UI never
-- offers to change it after that, because changing it would silently orphan
-- every product already tagged with the old id.
create table if not exists categories (
  id            text primary key,
  name          text not null,
  description   text not null default '',
  image         text,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table categories enable row level security;

-- Public storefront (products page, custom-order form) reads this
-- unauthenticated, same as products/custom_products/reviews.
create policy "categories are publicly readable" on categories for select using (true);

-- Writes go through /api/admin/categories* using the service-role client
-- (see lib/supabase/admin.ts), same pattern as new_in_items — so no
-- insert/update/delete policy is needed here.

-- Seed with the previous hardcoded list so the storefront looks identical
-- right after this migration runs. The handbags image is the corrected one
-- (an actual tote bag product photo, not the old generic background image).
insert into categories (id, name, description, image, display_order) values
  ('Blankets',  'Throw blankets',    'Hand-stitched warmth for restful nights', '/images/blanket-room2.jpg', 0),
  ('baby',      'Baby blankets',     'Gentle knits for the tiniest ones', '/images/baby-blanket.jpg', 1),
  ('handbags',  'Handbags & Totes',  'Woven by hand, carried with pride', 'https://res.cloudinary.com/dr8tokw2e/image/upload/f_auto,q_auto,w_1600,c_limit/v1784120497/new-in-product/v9qvjiptopdjx2ymp9xp.jpg', 2),
  ('wallets',   'Purses & Wallets',  'Compact elegance, stitched to last', '/images/blanket-room.jpg', 3),
  ('scarves',   'Scarves & Wraps',   'Draped in softness, knitted with love', '/images/blanket-bg.jpg', 4)
on conflict (id) do nothing;
