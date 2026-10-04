-- 016 — Store shipping on every order; one PaymentIntent per checkout attempt
--
-- DEPENDS ON 013_featured_pieces_stock_from_product.sql (the current
-- definition of checkout_verified_order, copied below unchanged apart from
-- the new parameter, its guard at the top, and the orders insert) and 005/006/007 (pending_stripe_orders and its
-- subtotal_amount / shipping_amount / resolved_at columns).
--
-- APPLY THIS BEFORE DEPLOYING THE CODE THAT USES IT. The new webhook passes
-- p_shipping_amount and the new intent route reads checkout_attempt_id;
-- neither exists until this runs. The other way round is safe: the old
-- webhook's call (no p_shipping_amount) still matches the new function,
-- because the new parameter has a default.
--
-- WHAT CHANGES
--   1. orders.subtotal_amount / orders.shipping_amount (numeric, default 0).
--      Until now an order only had total_amount, so "items €85, shipping €0"
--      and "items €78, shipping €7" looked identical. Orders placed before
--      this migration get 0 / 0 — the split was never recorded for them.
--   2. pending_stripe_orders.checkout_attempt_id (uuid, unique). The checkout
--      page sends one random id per checkout visit; app/api/checkout/intent
--      uses it to find and reuse that attempt's PaymentIntent instead of
--      creating another. Nullable, so existing rows are unaffected.
--   3. checkout_verified_order() gains p_shipping_amount and writes the two
--      new order columns. Adding a parameter in Postgres creates a SECOND
--      function (an overload) rather than replacing the first, and with two
--      overloads PostgREST can pick the wrong one or refuse the call as
--      ambiguous — so the old 8-argument signature is dropped first, inside
--      the same transaction, and the grants are re-applied to the new one.
--      Legacy item_type 'new_in' handling is unchanged.
--
-- One transaction: if anything below fails, nothing is applied and the old
-- function keeps working.

begin;

-- ── 1. Order amount breakdown ────────────────────────────────────────────
alter table orders add column if not exists subtotal_amount numeric default 0;
alter table orders add column if not exists shipping_amount numeric default 0;

-- ── 2. Checkout attempt → PaymentIntent ──────────────────────────────────
alter table pending_stripe_orders add column if not exists checkout_attempt_id uuid;
create unique index if not exists pending_stripe_orders_checkout_attempt_id_key
  on pending_stripe_orders (checkout_attempt_id);

-- ── 3. checkout_verified_order with p_shipping_amount ────────────────────
drop function if exists public.checkout_verified_order(uuid, numeric, jsonb, text, text, text, jsonb, numeric);

create function public.checkout_verified_order(
  p_user_id          uuid,
  p_total_amount     numeric,
  p_delivery_address jsonb,
  p_currency         text,
  p_stripe_reference text,
  p_payment_channel  text,
  p_items            jsonb,  -- [{item_type, ref_id, product_name, product_image, quantity, unit_price}, ...]
  p_charged_amount   numeric default null, -- actual amount charged in p_currency; falls back to p_total_amount (EUR) when same-currency
  p_shipping_amount  numeric default 0     -- shipping part of p_total_amount (EUR); 0 for free Dublin pickup
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
  -- Shipping is part of the total, so it can never be negative or exceed it.
  -- subtotal_amount below is derived as total - shipping.
  if p_shipping_amount is null or p_shipping_amount < 0 or p_shipping_amount > p_total_amount then
    raise exception 'INVALID_SHIPPING_AMOUNT:% of %', p_shipping_amount, p_total_amount;
  end if;

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
  insert into orders (user_id, status, total_amount, subtotal_amount, shipping_amount, delivery_address)
  values (p_user_id, 'processing', p_total_amount, p_total_amount - p_shipping_amount, p_shipping_amount, p_delivery_address)
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
revoke all on function public.checkout_verified_order(uuid, numeric, jsonb, text, text, text, jsonb, numeric, numeric) from public, anon, authenticated;
grant execute on function public.checkout_verified_order(uuid, numeric, jsonb, text, text, text, jsonb, numeric, numeric) to service_role;

commit;

-- ── Check after applying (run in a NEW query, on the same project) ──────
-- Remove the leading "-- " from the lines below, or copy them from
-- docs/checkout-deferred-intent-rollout.md. Expected: ONE row where
-- function_count = 1 and the other four columns are all true.
-- function_count = 2 means the old function is still there: stop and ask.
--
-- select
--   (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public' and p.proname = 'checkout_verified_order')               as function_count,
--   exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public' and p.proname = 'checkout_verified_order'
--       and pg_get_function_arguments(p.oid) like '%p_shipping_amount%')                   as has_shipping_param,
--   exists (select 1 from information_schema.columns where table_schema = 'public'
--     and table_name = 'orders' and column_name = 'subtotal_amount')                       as orders_subtotal,
--   exists (select 1 from information_schema.columns where table_schema = 'public'
--     and table_name = 'orders' and column_name = 'shipping_amount')                       as orders_shipping,
--   exists (select 1 from information_schema.columns where table_schema = 'public'
--     and table_name = 'pending_stripe_orders' and column_name = 'checkout_attempt_id')    as attempt_column;
