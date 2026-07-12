# Custom Products Setup Guide

## Overview
The "Our Beloved Pieces" feature allows admins to create and manage custom products that display:
1. In a beautiful Apple-style showcase on the home page
2. Alongside regular products in the /products catalog

## Step 1: Create the Database Table

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- Create custom_products table
CREATE TABLE IF NOT EXISTS custom_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  category TEXT NOT NULL,
  rating DECIMAL(3, 2) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  image TEXT,
  images TEXT[] DEFAULT '{}',
  description TEXT,
  details TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  stock_quantity INTEGER DEFAULT 0,
  in_stock BOOLEAN DEFAULT true,
  colors TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT '{}',
  variant_stock JSONB DEFAULT '{}',
  variant_price JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_products_display_order
ON custom_products(display_order ASC);

CREATE INDEX IF NOT EXISTS idx_custom_products_created_at
ON custom_products(created_at DESC);
```

## Step 2: Access Admin Dashboard

Go to:
```
http://localhost:3000/admin/custom-products
```

(Replace localhost:3000 with your production domain)

## Step 3: Add Custom Products

### Fields Explained:

| Field | Required | Description |
|-------|----------|-------------|
| Product Name | ✓ | Name of the product |
| Price | ✓ | Current selling price in £ |
| Original Price | — | Sale price reference (shows "Sale" badge) |
| Category | ✓ | Product category (e.g., "blankets", "handbags") |
| Display Order | — | Numeric order for carousel (0 = first) |
| Description | — | Long-form product description |
| Main Image URL | — | Primary image (shown in showcase) |

### Additional Fields (in database):
- **Images**: Array of image URLs
- **Rating**: Star rating (1-5, default 5)
- **Review Count**: Number of reviews
- **Stock Quantity**: Available units
- **In Stock**: Boolean status
- **Details**: Array of feature bullets
- **Colors/Sizes**: Variant options
- **Variant Stock/Price**: Price per variant

## How It Works

### Admin Dashboard (`/admin/custom-products`)
1. **View all custom products** - sorted by display_order
2. **Add new products** - fill form and create
3. **Edit products** - click "Edit" to modify
4. **Delete products** - click "Delete" (asks for confirmation)
5. **Reorder products** - change display_order value

### Display Locations

#### Home Page (`/`)
- Shows showcase section: **"Our Beloved Pieces"**
- Apple-style display with:
  - Large product image
  - Image carousel (thumbnails)
  - Full description
  - Price & ratings
  - Add to Basket button
  - Browse other pieces with pagination

#### Products Page (`/products`)
- Custom products appear in regular product grid
- Tagged as custom products (visually distinct)
- Same ProductCard component as regular products

## Files Created

```
lib/
  ├── db-custom-products.ts        # Helper functions
  ├── supabase/
  │   └── migrations/
  │       └── 001_create_custom_products.sql

components/
  └── BelovedPiecesShowcase.tsx     # Apple-style showcase

app/
  └── admin/
      └── custom-products/
          └── page.tsx              # Admin dashboard
```

## Features

✅ **Full CRUD** - Create, Read, Update, Delete  
✅ **Ordering** - Control showcase carousel order  
✅ **Multiple Images** - Show product image gallery  
✅ **Ratings & Reviews** - Custom ratings display  
✅ **Inventory** - Track stock quantity  
✅ **Variants** - Support colors, sizes, variant pricing  
✅ **Rich Details** - Feature bullets, tags, descriptions  

## Example Product

```
Name: Heirloom Patchwork Duvet
Price: £189
Original Price: £240 (shows Sale badge)
Category: duvets
Display Order: 1
Description: Hand-stitched from premium cotton patchwork...
Rating: 4.9
Review Count: 87
Images: [url1, url2, url3]
In Stock: true
Stock Quantity: 5
Details: ["100% cotton patchwork", "Natural wool batting", ...]
```

## Troubleshooting

**Q: Products don't appear in showcase**
A: Make sure:
1. Custom products table is created
2. At least one product exists in custom_products table
3. You've refreshed the home page

**Q: Admin page shows "Error loading products"**
A: Check Supabase connection and ensure table exists

**Q: Images not displaying**
A: Verify image URLs are valid HTTPS URLs

**Q: Changes not reflecting**
A: Server caches home page. Restart dev server or wait for ISR revalidation

## Future Enhancements

- [ ] Image upload via Supabase Storage
- [ ] Drag-to-reorder interface
- [ ] Bulk operations
- [ ] Product scheduling (publish/unpublish dates)
- [ ] Analytics on showcase views/clicks
