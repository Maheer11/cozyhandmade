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

-- Create index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_custom_products_display_order
ON custom_products(display_order ASC);

-- Create index on created_at for filtering
CREATE INDEX IF NOT EXISTS idx_custom_products_created_at
ON custom_products(created_at DESC);
