-- Removes the star-rating system entirely.
--
-- WHY: none of these columns were ever fed by customers. products.rating and
-- products.review_count were free-text fields in the admin product form — the
-- owner typed "4.9" and "127 reviews" by hand and the storefront rendered them
-- as if they were earned. reviews.rating was the same idea attached to the
-- WhatsApp/Instagram screenshot testimonials. Displaying self-assigned ratings
-- as customer ratings is the problem being removed here, not the UI clutter.
--
-- The application code stopped reading and writing all three columns before
-- this migration: Product no longer carries rating/reviewCount (lib/products.ts),
-- the mappers drop them (lib/db-products.ts, lib/db-custom-products.ts), the
-- star components are deleted (ProductCard, ProductDetail, BelovedPiecesShowcase,
-- SocialProofSection), the "Highest Rated" sort is gone (ProductsContent), and
-- the admin write paths no longer set them (api/admin/products/**,
-- api/admin/reviews/**). So the columns are already inert — this migration only
-- reclaims them.
--
-- IRREVERSIBLE. The numbers currently stored are deleted and cannot be
-- recovered by re-running anything. That is intended: they were placeholder
-- values, not data. If you want them kept as a record, snapshot them first:
--
--   create table rating_backup_2026_08 as
--     select id, rating, review_count from products;
--
-- SAFE TO RE-RUN: every statement is `if exists`.
--
-- ORDER: apply after 013. Nothing later depends on these columns.

-- ── products ─────────────────────────────────────────────────────────────
alter table products drop column if exists rating;
alter table products drop column if exists review_count;

-- ── custom_products ──────────────────────────────────────────────────────
-- Same two columns, same admin-typed origin (001_create_custom_products.sql).
-- Guarded rather than assumed: this table postdates the original schema.
alter table custom_products drop column if exists rating;
alter table custom_products drop column if exists review_count;

-- ── reviews ──────────────────────────────────────────────────────────────
-- The screenshot testimonials themselves stay — they are genuine customer
-- messages and the homepage still renders them. Only the star overlay the
-- owner assigned to each one goes.
alter table reviews drop column if exists rating;
