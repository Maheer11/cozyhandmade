-- Prices are now stored/entered in GBP (the base currency) everywhere, but
-- Paystack (and Nigerian bank transfers) always charge/settle in NGN. Split
-- checkout_verified_order()'s single amount parameter into two: the base
-- GBP total (orders.total_amount — the canonical ledger figure for every
-- order regardless of currency) and the actually-charged amount in the
-- customer's currency (transactions.amount/currency — what they really paid).
drop function if exists public.checkout_verified_order(uuid, numeric, jsonb, text, text, text, jsonb);

create or replace function public.checkout_verified_order(
  p_user_id            uuid,
  p_total_amount       numeric,
  p_delivery_address   jsonb,
  p_currency           text,
  p_paystack_reference text,
  p_payment_channel    text,
  p_items              jsonb,  -- [{item_type, ref_id, product_name, product_image, quantity, unit_price}, ...]
  p_charged_amount     numeric default null
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
  -- total_amount is always the base GBP figure, regardless of what currency
  -- the customer actually paid in, so admin revenue reporting stays in one
  -- consistent unit across every order.
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
  -- transactions.amount/currency record what was ACTUALLY charged (e.g. NGN
  -- via Paystack) — falls back to p_total_amount when no charged amount is
  -- given (e.g. same-currency GBP orders, where the two are identical).
  insert into transactions (order_id, user_id, paystack_reference, amount, currency, status, payment_channel, paid_at)
  values (v_order_id, p_user_id, p_paystack_reference, coalesce(p_charged_amount, p_total_amount), p_currency, 'success', p_payment_channel, now());

  return v_order_id;
end;
$$;
