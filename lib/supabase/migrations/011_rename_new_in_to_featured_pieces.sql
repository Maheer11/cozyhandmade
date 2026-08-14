-- "New In" is being renamed to "Featured Pieces" across the whole app —
-- display text, routes, and this table. Renaming the table (rather than
-- creating a new one) preserves every existing row, id, and foreign-key-like
-- reference (order_items snapshots product_name/product_image rather than
-- referencing this table directly, so nothing else needs updating here).
--
-- The `item_type`/`source` string 'new_in' stored in EXISTING orders'
-- order_items/p_items JSONB is deliberately left as-is — this migration does
-- not touch historical order data. checkout_verified_order() (redefined
-- below) and the application code both accept 'new_in' (legacy) alongside
-- 'featured_piece' (new) when comparing that value, so old orders keep
-- reading and processing correctly.
alter table new_in_items rename to featured_pieces;

alter table featured_pieces rename constraint new_in_items_pkey to featured_pieces_pkey;
alter table featured_pieces rename constraint new_in_items_sku_key to featured_pieces_sku_key;

drop policy if exists "New In items are publicly readable" on featured_pieces;
create policy "Featured Pieces are publicly readable"
  on featured_pieces for select using (true);

drop trigger if exists new_in_items_updated_at on featured_pieces;
create trigger featured_pieces_updated_at
  before update on featured_pieces
  for each row execute function update_updated_at();

-- Re-point the stock-decrement RPC at the renamed table, and accept both the
-- legacy 'new_in' item_type value (already-placed orders) and the new
-- 'featured_piece' value (orders placed after this rename) when locking and
-- decrementing non-product stock.
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
  v_product_ids        text[];
  v_featured_piece_ids uuid[];
  v_row                record;
begin
  -- Lock every row involved, in a stable (sorted) order, so two concurrent
  -- checkouts touching overlapping items can never deadlock.
  select array_agg(distinct (elem->>'ref_id') order by (elem->>'ref_id'))
    into v_product_ids
  from jsonb_array_elements(p_items) elem
  where elem->>'item_type' = 'product';

  select array_agg(distinct (elem->>'ref_id')::uuid order by (elem->>'ref_id'))
    into v_featured_piece_ids
  from jsonb_array_elements(p_items) elem
  where elem->>'item_type' in ('featured_piece', 'new_in');

  perform 1 from products where id = any(v_product_ids) for update;
  perform 1 from featured_pieces where id = any(v_featured_piece_ids) for update;

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
      if not exists (select 1 from featured_pieces where id = v_row.ref_id::uuid and stock_quantity >= v_row.qty) then
        raise exception 'OUT_OF_STOCK:%', (select name from featured_pieces where id = v_row.ref_id::uuid);
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
      update featured_pieces set stock_quantity = stock_quantity - v_row.qty where id = v_row.ref_id::uuid;
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

  insert into transactions (order_id, user_id, stripe_session_id, amount, currency, status, payment_channel, paid_at)
  values (v_order_id, p_user_id, p_stripe_reference, coalesce(p_charged_amount, p_total_amount), p_currency, 'success', p_payment_channel, now());

  return v_order_id;
end;
$$;

revoke all on function public.checkout_verified_order from public, anon, authenticated;
grant execute on function public.checkout_verified_order to service_role;
