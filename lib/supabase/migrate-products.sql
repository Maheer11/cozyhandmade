-- ============================================================
-- PRODUCTS MIGRATION
-- 1. Add sizes column
-- 2. Clear stale data
-- 3. Seed all 12 products
-- Run in: Supabase → SQL Editor → Run
-- ============================================================

-- Step 1: Add sizes column (JSONB array of {label, price} objects)
alter table products add column if not exists sizes jsonb default '[]'::jsonb;

-- Step 2: Clear old stale product data
delete from order_items where product_id in (select id from products);
delete from products;

-- Step 3: Insert all 12 products with correct data
insert into products (id, name, price, original_price, category, rating, review_count, image, images, description, details, tags, stock_quantity, featured, sizes) values

('1', 'Square Pattern Blanket', 128000, null, 'Blankets', 4.9, 87,
  '/images/TB1.jpg',
  array['/images/TB1.jpg', '/images/TB2.jpg', '/images/TB3.jpg'],
  'Soft handcrafted throw blanket featuring a modern square pattern design, made for warmth, comfort, and stylish home décor.',
  array['Premium soft wool blend','Square pattern texture','Thick and cozy finish','Lightweight yet warm','Suitable for sofas, beds, and lounges','Machine washable (check label)','Available in multiple colours'],
  array['blanket','square pattern','wool','cozy','home décor'],
  10, true,
  '[{"label":"Medium  45×60 in","price":128000},{"label":"Large    50×75 in","price":145000},{"label":"XL        80×100 in","price":170000}]'::jsonb
),

('2', 'Hand-Knit Baby Cardigan Set', 115000, null, 'baby', 5.0, 143,
  '/images/baby-blanket.jpg',
  array['/images/baby-blanket2.jpg'],
  'A precious set of cardigan, bonnet, and booties knitted from hypoallergenic merino wool. Soft enough for newborn skin, warm enough for every season.',
  array['100% merino wool','Hypoallergenic','Sizes: 0–3m, 3–6m, 6–12m','Hand wash cold','Gift-wrapped by default'],
  array['knit','merino','newborn'],
  10, true, '[]'::jsonb
),

('3', 'Broken Herringbone Pattern Blanket', 128000, null, 'Blankets', 4.8, 62,
  '/images/blanket-room.jpg',
  array['/images/blanket-room.jpg', '/images/hero-grid-2.jpg', '/images/tbk4.jpg'],
  'Beautiful textured blanket inspired by the broken herringbone stitch pattern, offering a unique handcrafted appearance and cozy feel.',
  array['Broken Herringbone stitch texture','Machine washable (check label)','Lightweight and warm','Stylish modern pattern','Perfect for gifting and home comfort','Suitable for sofas, beds, and lounges','Available in colours'],
  array['blanket','herringbone','textured','cozy','home décor'],
  10, true,
  '[{"label":"Medium  45×60 in","price":128000},{"label":"Large    50×75 in","price":145000},{"label":"XL        80×100 in","price":170000}]'::jsonb
),

('4', 'Cozy Cable Blanket', 128000, null, 'Blankets', 4.7, 39,
  '/images/tbck1.jpg',
  array['/images/tbck1.jpg', '/images/tbck2.jpg', '/images/tbck3.jpg'],
  'Classic cable-knit throw blanket designed with a luxurious texture to provide warmth and elegance for everyday comfort.',
  array['Elegant braided texture','Warm and breathable material','Machine washable (check label)','Durable stitched finish','Ideal for home décor and relaxation','Suitable for sofas, beds, and lounges','Available in multiple colours'],
  array['blanket','cable-knit','throw','cozy','home décor'],
  10, false,
  '[{"label":"Medium  45×60 in","price":128000},{"label":"Large    50×75 in","price":145000},{"label":"XL        80×100 in","price":170000}]'::jsonb
),

('5', 'Chunky Knit Baby Blanket', 130000, null, 'blankets', 4.9, 211,
  'https://picsum.photos/seed/babyblanket1/600/600',
  array['https://picsum.photos/seed/babyblanket1/600/600','https://picsum.photos/seed/babyblanket1b/600/600'],
  'Arm-knitted from extra-thick merino roving in a single evening of craft. The loose, airy weave is incredibly soft yet breathable — perfect for prams and cots.',
  array['100% merino roving','Arm-knitted (no needles)','75cm × 90cm','Hand wash, reshape wet','Available in 6 colours'],
  array['blanket','chunky','merino','baby'],
  10, false, '[]'::jsonb
),

('6', 'Fair Isle Wool Scarf', 85000, null, 'scarves', 4.8, 94,
  'https://picsum.photos/seed/scarf1/600/600',
  array['https://picsum.photos/seed/scarf1/600/600'],
  'Knitted in the traditional Fair Isle technique with a five-colour geometric pattern. Long enough to wrap twice, warm enough for the coldest mornings.',
  array['100% Shetland wool','Traditional Fair Isle pattern','180cm × 22cm','Dry clean recommended','Made in Scotland'],
  array['scarf','fair isle','wool','winter'],
  10, false, '[]'::jsonb
),

('7', 'Crochet Market Bag', 72000, null, 'handbags', 4.6, 55,
  'https://picsum.photos/seed/market1/600/600',
  array['https://picsum.photos/seed/market1/600/600'],
  'Crocheted from natural cotton string in a classic open-weave mesh. Stretches to carry a full grocery shop, then folds to pocket size when empty.',
  array['100% natural cotton','Open-weave crochet','Expands to 40L capacity','Machine washable','Folds flat for storage'],
  array['crochet','market bag','cotton','eco'],
  10, false, '[]'::jsonb
),

('8', 'Hand-Embroidered Coin Wallet', 55000, null, 'wallets', 4.9, 76,
  'https://picsum.photos/seed/wallet1/600/600',
  array['https://picsum.photos/seed/wallet1/600/600'],
  'Hand-stitched with a delicate floral embroidery on soft wool felt. A brass zip closure and cotton lining keep coins and cards safe in style.',
  array['Wool felt with embroidery','Brass zip closure','Cotton lining','10cm × 8cm','Choice of 4 motifs'],
  array['wallet','embroidery','felt','floral'],
  10, false, '[]'::jsonb
),

('9', 'Merino Moses Basket Set', 290000, 360000, 'scarves', 4.8, 34,
  'https://picsum.photos/seed/moses1/600/600',
  array['https://picsum.photos/seed/moses1/600/600','https://picsum.photos/seed/moses1b/600/600'],
  'A complete moses basket dressing set — knitted blanket, fitted sheet, and padded hood — all in 100% merino. The ultimate gift for a new arrival.',
  array['100% merino wool','3-piece set','Fits standard moses baskets','Hand wash cold','Heirloom quality'],
  array['baby','moses basket','merino','gift'],
  10, false, '[]'::jsonb
),

('10', 'Bobble Stitch Throw Blanket', 195000, null, 'blankets', 4.7, 48,
  'https://picsum.photos/seed/throw1/600/600',
  array['https://picsum.photos/seed/throw1/600/600','https://picsum.photos/seed/throw1b/600/600'],
  'The bobble stitch creates a beautiful textured surface that is as tactile as it is cosy. Knitted from a wool-cotton blend in warm neutral tones.',
  array['60% wool, 40% cotton','Bobble stitch texture','130cm × 170cm','Machine wash 30°C','Neutral colourways'],
  array['throw','bobble','blanket','texture'],
  10, false, '[]'::jsonb
),

('11', 'Structured Knit Handbag', 225000, null, 'handbags', 4.9, 28,
  'https://picsum.photos/seed/handbag1/600/600',
  array['https://picsum.photos/seed/handbag1/600/600','https://picsum.photos/seed/handbag1b/600/600'],
  'A structured frame bag knitted in fine merino with a rigid base and clasp closure. Sophisticated enough for evenings out, roomy enough for everyday essentials.',
  array['Fine merino knit','Rigid base and frame','Suede lining','Gold-tone clasp','27cm × 20cm × 10cm'],
  array['handbag','merino','structured','elegant'],
  10, false, '[]'::jsonb
),

('12', 'Hand-Sewn Baby Sleeping Bag', 155000, null, 'scarves', 4.8, 91,
  'https://picsum.photos/seed/sleepbag1/600/600',
  array['https://picsum.photos/seed/sleepbag1/600/600'],
  'A tog-rated sleeping bag hand-sewn from quilted merino panels. The side-zip opening and adjustable shoulder poppers make night feeds simple and stress-free.',
  array['Quilted merino panels','1.0 tog rating','Sizes: 0–6m, 6–18m, 18–36m','Machine washable','Side zip + shoulder poppers'],
  array['baby','sleeping bag','quilted','merino'],
  10, false, '[]'::jsonb
);
