-- DEPENDS ON 011_rename_new_in_to_featured_pieces.sql (renamed new_in_items →
-- featured_pieces and redefined checkout_verified_order against the new name)
-- and 012_show_on_homepage.sql (added featured_pieces.show_on_homepage). Both
-- are already applied — apply this one on top of them.
--
-- WHAT CHANGES: Featured Pieces stop owning stock. Until now featured_pieces
-- carried its own stock_quantity counter, which meant the same physical item
-- listed in both catalogues had two independent counters that drifted apart
-- (both current rows are exact duplicates of a products row, with different
-- numbers on each side). From here, `products` is the single owner of stock:
-- every featured piece links to a product and inherits that product's
-- stock_quantity.
--
-- The manual Available / Out-of-stock toggle (featured_pieces.sold_out) stays,
-- and stays meaningful — it is now an OVERRIDE, not a stock value. The owner
-- can hide a piece early even while the linked product still has stock.
--
--   effective availability = sold_out = false AND linked product stock > 0
--
-- Checkout therefore decrements the LINKED PRODUCT's stock, never a
-- featured-piece counter.

-- ── 1. The link ──────────────────────────────────────────────────────────
-- products.id is TEXT (not uuid, unlike featured_pieces.id), so this FK column
-- is text to match — a uuid column here would fail to create the constraint.
--
-- ON DELETE RESTRICT, deliberately, rather than SET NULL: a featured piece
-- whose product_id went null would not "degrade gracefully", it would become a
-- storefront listing with no stock source at all — unsellable at best, and at
-- worst (before the checks added below) sellable without limit. RESTRICT turns
-- that into a loud, immediate error at the moment the owner tries to delete a
-- product that a featured piece still depends on, which is the point at which
-- they can actually decide what to do (unlink or delete the piece first).
alter table featured_pieces
  add column if not exists product_id text references products(id) on delete restrict;

-- Every public read path now joins featured_pieces → products to resolve
-- stock, and the RESTRICT check above scans this column on every product
-- delete.
create index if not exists featured_pieces_product_id_idx on featured_pieces (product_id);

-- ── 2. Backfill ──────────────────────────────────────────────────────────
-- Both rows currently in featured_pieces ("Bismah Tote Bag", "Ivory Moses
-- Basket") are exact-name duplicates of rows in products — verified against
-- the live database before writing this migration — so an exact name match
-- resolves both of them unambiguously.
--
-- This is a ONE-TIME data fix, not a rule. Name matching is not a supported
-- way to link the two tables: names are editable and non-unique, and nothing
-- keeps them in sync. Every featured piece created from here on gets its
-- product_id set explicitly by the admin form (the product picker is a
-- required field) and validated by the API route.
update featured_pieces fp
   set product_id = p.id
  from products p
 where p.name = fp.name
   and fp.product_id is null;

-- ── 3. stock_quantity is deprecated, NOT dropped ─────────────────────────
-- Nothing in the application reads or writes featured_pieces.stock_quantity
-- after this migration — the admin form's stock input is gone, the API routes
-- refuse the field, and every read path resolves stock through product_id.
--
-- The column itself stays for now on purpose. Dropping it destroys the two
-- existing counters irreversibly, and this repo has no git history to restore
-- from, so a bad backfill (a piece linked to the wrong product, say) would be
-- unrecoverable — the old numbers are the only record of what the owner
-- believed the stock was. Leaving the column costs an unused integer per row
-- and buys a real rollback path: revert the application code and the previous
-- behaviour is intact. Drop it in a later migration once this has run in
-- production long enough to trust the links.
comment on column featured_pieces.stock_quantity is
  'DEPRECATED (migration 013) — superseded by product_id → products.stock_quantity; retained temporarily so the change is reversible; drop in a later migration once verified in production. No application code reads or writes this column.';

comment on column featured_pieces.product_id is
  'The product this featured piece takes its stock from. Required for new rows (enforced in app/api/admin/featured-pieces). Checkout checks and decrements THIS product''s stock_quantity. featured_pieces.sold_out remains as a manual override on top of it.';

-- ── 4. checkout_verified_order — featured pieces now spend product stock ──
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
