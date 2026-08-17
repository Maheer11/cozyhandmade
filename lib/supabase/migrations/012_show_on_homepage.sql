-- DEPENDS ON 011_rename_new_in_to_featured_pieces.sql — this migration writes
-- against `featured_pieces`, the table 011 renames `new_in_items` to. Apply
-- 011 first or every statement below referencing featured_pieces will fail.
--
-- Admin-controlled homepage hero. Until now the hero was hardcoded: it pulled
-- the first N featured_pieces by display_order and showed exactly one
-- spotlight + two thumbnails, with the spotlight picked by a name-match hack
-- in components/HeroTiles.tsx. The shop owner now curates it from the admin
-- panel instead — a per-row toggle on BOTH catalogues, with no count cap, so
-- however many rows are flagged is what the hero renders.
--
-- Deliberately a NEW column rather than reusing products.featured: that one
-- drives sort order on /products (components/ProductsContent.tsx) and has to
-- stay independent of homepage curation — the owner needs to be able to
-- feature a product in the shop listing without pushing it into the hero, and
-- vice versa.

alter table products        add column if not exists show_on_homepage boolean not null default false;
alter table featured_pieces add column if not exists show_on_homepage boolean not null default false;

-- Partial indexes: the homepage query only ever asks for the `true` rows, and
-- that set is small by design (a handful of hand-picked items) while the
-- catalogues themselves grow. Indexing only the matching rows keeps the index
-- proportional to what the hero actually reads rather than to table size.
create index if not exists products_show_on_homepage_idx
  on products (show_on_homepage) where show_on_homepage;
create index if not exists featured_pieces_show_on_homepage_idx
  on featured_pieces (show_on_homepage) where show_on_homepage;

-- ONE-TIME BACKFILL — not part of the schema, and not re-run by anything.
-- The column defaults to false, so without this every row would be off the
-- moment this migration lands and the homepage hero would render empty (the
-- page falls back to the single-photo HeroSlider, which is a visible,
-- unexplained change for the owner). Turning on the first few Featured Pieces
-- by display_order reproduces roughly what the hero was already showing, so
-- the deploy looks like a no-op on the storefront and the owner discovers the
-- new control at their own pace. Products are intentionally left all-false:
-- none of them were ever in the hero, so opting any in would be a change, not
-- a preservation. Five, not two, because the hero is no longer capped at
-- spotlight + 2 — the grid handles the extra thumbs.
update featured_pieces
set show_on_homepage = true
where id in (
  select id
  from featured_pieces
  order by display_order asc, created_at asc
  limit 5
);
