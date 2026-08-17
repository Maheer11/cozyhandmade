-- Tracks whether a New In item has already been duplicated into the
-- Collections catalogue (products table) via the admin "Add to Collections"
-- action, so the admin list can mark it instead of letting the same item
-- be duplicated again by accident. Defaults false — existing items were
-- never duplicated.
alter table new_in_items add column if not exists added_to_collections boolean not null default false;
