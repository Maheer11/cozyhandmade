-- Paste this into Supabase SQL Editor → New query → Run
-- Run ONCE — products will then be managed via the /admin panel
-- NOTE: in_stock is a generated column (auto = stock_quantity > 0), so it is excluded here

INSERT INTO products (name, price, original_price, category, rating, review_count, image, images, description, details, tags, stock_quantity, featured)
VALUES
(
  'Textured Square Pattern Blanket', 380000, 480000, 'Blankets', 4.9, 87,
  '/images/TB1.jpg',
  ARRAY['/images/TB1.jpg', '/images/TB2.jpg', '/images/TB3.jpg'],
  'Hand-stitched from premium cotton patchwork squares, each duvet takes over 40 hours to complete. Filled with 100% natural wool batting for breathable warmth all year.',
  ARRAY['100% cotton patchwork top', 'Natural wool batting', 'Queen size: 200cm × 200cm', 'Wash at 30°C gentle cycle', 'Each piece uniquely patterned'],
  ARRAY['duvet', 'patchwork', 'wool', 'bedroom'],
  10, true
),
(
  'Hand-Knit Baby Cardigan Set', 115000, NULL, 'baby', 5.0, 143,
  '/images/baby-blanket.jpg',
  ARRAY['/images/baby-blanket.jpg', '/images/baby-blanket2.jpg'],
  'A precious set of cardigan, bonnet, and booties knitted from hypoallergenic merino wool. Soft enough for newborn skin, warm enough for every season.',
  ARRAY['100% merino wool', 'Hypoallergenic', 'Sizes: 0–3m, 3–6m, 6–12m', 'Hand wash cold', 'Gift-wrapped by default'],
  ARRAY['knit', 'merino', 'newborn'],
  15, true
),
(
  'Cozy Herringbone Blanket', 150000, NULL, 'Blankets', 4.8, 62,
  '/images/blanket-room.jpg',
  ARRAY['/images/blanket-room.jpg', '/images/hero-grid-2.jpg', '/images/tbk4.jpg'],
  'A beautiful herringbone-weave throw blanket, hand-loomed from premium wool. The chevron pattern adds a classic touch to any living space.',
  ARRAY['Hand-loomed wool', 'Herringbone pattern', '130cm × 170cm', 'Machine wash 30°C', 'Available in 3 colourways'],
  ARRAY['blanket', 'herringbone', 'throw', 'wool'],
  8, true
),
(
  'Cozy Cable Blanket', 95000, 130000, 'Blankets', 4.7, 39,
  '/images/tbck1.jpg',
  ARRAY['/images/tbck1.jpg', '/images/tbck2.jpg', '/images/tbck3.jpg'],
  'Classic cable-knit blanket crafted from thick merino wool. The raised cable pattern creates an eye-catching texture that is as tactile as it is beautiful.',
  ARRAY['100% merino wool', 'Classic cable-knit pattern', '130cm × 160cm', 'Hand wash or dry clean', 'Available in 4 colours'],
  ARRAY['cable-knit', 'blanket', 'merino', 'cosy'],
  12, false
),
(
  'Chunky Knit Baby Blanket', 130000, NULL, 'baby', 4.9, 211,
  'https://picsum.photos/seed/babyblanket1/600/600',
  ARRAY['https://picsum.photos/seed/babyblanket1/600/600', 'https://picsum.photos/seed/babyblanket1b/600/600'],
  'Arm-knitted from extra-thick merino roving in a single evening of craft. The loose, airy weave is incredibly soft yet breathable — perfect for prams and cots.',
  ARRAY['100% merino roving', 'Arm-knitted', '75cm × 90cm', 'Hand wash, reshape wet', 'Available in 6 colours'],
  ARRAY['blanket', 'chunky', 'merino', 'baby'],
  20, false
),
(
  'Fair Isle Wool Scarf', 85000, NULL, 'scarves', 4.8, 94,
  'https://picsum.photos/seed/scarf1/600/600',
  ARRAY['https://picsum.photos/seed/scarf1/600/600'],
  'Knitted in the traditional Fair Isle technique with a five-colour geometric pattern. Long enough to wrap twice, warm enough for the coldest mornings.',
  ARRAY['100% Shetland wool', 'Traditional Fair Isle pattern', '180cm × 22cm', 'Dry clean recommended'],
  ARRAY['scarf', 'fair isle', 'wool', 'winter'],
  15, false
),
(
  'Crochet Market Bag', 72000, NULL, 'handbags', 4.6, 55,
  'https://picsum.photos/seed/market1/600/600',
  ARRAY['https://picsum.photos/seed/market1/600/600'],
  'Crocheted from natural cotton string in a classic open-weave mesh. Stretches to carry a full grocery shop, then folds to pocket size when empty.',
  ARRAY['100% natural cotton', 'Open-weave crochet', 'Expands to 40L capacity', 'Machine washable', 'Folds flat for storage'],
  ARRAY['crochet', 'market bag', 'cotton', 'eco'],
  25, false
),
(
  'Hand-Embroidered Coin Wallet', 55000, NULL, 'wallets', 4.9, 76,
  'https://picsum.photos/seed/wallet1/600/600',
  ARRAY['https://picsum.photos/seed/wallet1/600/600'],
  'Hand-stitched with delicate floral embroidery on soft wool felt. A brass zip closure and cotton lining keep coins and cards safe in style.',
  ARRAY['Wool felt with embroidery', 'Brass zip closure', 'Cotton lining', '10cm × 8cm', 'Choice of 4 motifs'],
  ARRAY['wallet', 'embroidery', 'felt', 'floral'],
  18, false
),
(
  'Merino Moses Basket Set', 290000, 360000, 'baby', 4.8, 34,
  'https://picsum.photos/seed/moses1/600/600',
  ARRAY['https://picsum.photos/seed/moses1/600/600', 'https://picsum.photos/seed/moses1b/600/600'],
  'A complete moses basket dressing set — knitted blanket, fitted sheet, and padded hood — all in 100% merino. The ultimate gift for a new arrival.',
  ARRAY['100% merino wool', '3-piece set', 'Fits standard moses baskets', 'Hand wash cold', 'Heirloom quality'],
  ARRAY['baby', 'moses basket', 'merino', 'gift'],
  6, false
),
(
  'Bobble Stitch Throw Blanket', 195000, NULL, 'Blankets', 4.7, 48,
  'https://picsum.photos/seed/throw1/600/600',
  ARRAY['https://picsum.photos/seed/throw1/600/600', 'https://picsum.photos/seed/throw1b/600/600'],
  'The bobble stitch creates a beautiful textured surface that is as tactile as it is cosy. Knitted from a wool-cotton blend in warm neutral tones.',
  ARRAY['60% wool, 40% cotton', 'Bobble stitch texture', '130cm × 170cm', 'Machine wash 30°C', 'Neutral colourways'],
  ARRAY['throw', 'bobble', 'blanket', 'texture'],
  10, false
),
(
  'Structured Knit Handbag', 225000, NULL, 'handbags', 4.9, 28,
  'https://picsum.photos/seed/handbag1/600/600',
  ARRAY['https://picsum.photos/seed/handbag1/600/600', 'https://picsum.photos/seed/handbag1b/600/600'],
  'A structured frame bag knitted in fine merino with a rigid base and clasp closure. Sophisticated enough for evenings out, roomy enough for everyday essentials.',
  ARRAY['Fine merino knit', 'Rigid base and frame', 'Suede lining', 'Gold-tone clasp', '27cm × 20cm × 10cm'],
  ARRAY['handbag', 'merino', 'structured', 'elegant'],
  7, false
),
(
  'Hand-Sewn Baby Sleeping Bag', 155000, NULL, 'baby', 4.8, 91,
  'https://picsum.photos/seed/sleepbag1/600/600',
  ARRAY['https://picsum.photos/seed/sleepbag1/600/600'],
  'A tog-rated sleeping bag hand-sewn from quilted merino panels. The side-zip opening and adjustable shoulder poppers make night feeds simple and stress-free.',
  ARRAY['Quilted merino panels', '1.0 tog rating', 'Sizes: 0–6m, 6–18m, 18–36m', 'Machine washable', 'Side zip + shoulder poppers'],
  ARRAY['baby', 'sleeping bag', 'quilted', 'merino'],
  12, false
);
