-- Admin-controlled "Handmade" badge — previously hardcoded true for every
-- product/new-in card, now a per-item toggle set from the admin dashboard,
-- same pattern as the existing sold_out / in_stock availability toggles.
ALTER TABLE products      ADD COLUMN IF NOT EXISTS is_handmade BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE new_in_items  ADD COLUMN IF NOT EXISTS is_handmade BOOLEAN NOT NULL DEFAULT true;
