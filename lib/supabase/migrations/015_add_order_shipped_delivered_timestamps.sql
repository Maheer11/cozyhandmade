-- 015 — Order lifecycle timestamps
--
-- "Mark as Shipped" / "Mark as Delivered" are the two manual admin actions in
-- the order lifecycle. app/api/admin/orders/[id]/route.ts stamps these columns
-- on the status transition, and app/account/orders/page.tsx reads them back to
-- show the customer an accurate date.
--
-- Both columns were declared in lib/supabase/schema.sql, but that file was
-- applied to the live project BEFORE those two lines were added to it, so the
-- columns never reached the database. Every "Mark as Shipped" in admin failed
-- with PGRST204: "Could not find the 'shipped_at' column of 'orders' in the
-- schema cache". schema.sql is not re-run against an existing project, so the
-- change has to travel as its own migration.
--
-- Additive and idempotent: nullable columns, IF NOT EXISTS, no backfill. Orders
-- shipped before this migration have no timestamp to recover, so they stay
-- null; the customer-facing page already handles null by falling back to a
-- status line without a date.

alter table orders add column if not exists shipped_at   timestamptz;
alter table orders add column if not exists delivered_at timestamptz;
