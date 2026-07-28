-- Weight-based shipping fix. See lib/checkout/shipping.ts for the pricing
-- logic that consumes these columns. This migration only adds storage —
-- no rates are computed here.
--
-- shipping_weight_grams is deliberately NULLABLE, not `not null default 0`.
-- A default of 0 would silently mean "free shipping" for any product an
-- admin forgot to fill in — the exact class of bug this whole change exists
-- to fix (server silently charging less than it should). Nullable forces
-- app code to handle "unknown weight" explicitly and fall back to a
-- deliberately high default (DEFAULT_ITEM_WEIGHT_GRAMS in shipping.ts),
-- erring toward overcharging rather than undercharging when data is missing.
alter table products      add column if not exists shipping_weight_grams integer;
alter table new_in_items  add column if not exists shipping_weight_grams integer;

-- pending_stripe_orders currently stores one opaque total_amount, which is
-- how the shipping-not-charged bug went unnoticed: nothing recorded what
-- fraction of the charge was shipping vs. items. Splitting it out here so
-- the staged row (and anyone auditing it later) can see both components.
-- total_amount is kept as-is (subtotal_amount + shipping_amount) for the
-- webhook/checkout_verified_order() path, which is unchanged by this
-- migration.
alter table pending_stripe_orders add column if not exists subtotal_amount numeric;
alter table pending_stripe_orders add column if not exists shipping_amount numeric;
