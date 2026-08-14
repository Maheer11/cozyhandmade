export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  reviewCount: number;
  image: string;
  images: string[];
  description: string;
  details: string[];
  tags: string[];
  inStock: boolean;
  /** Sort weight on the /products listing — NOT homepage curation. */
  featured: boolean;
  /** Admin-toggled: this piece appears in the homepage hero (HeroTiles). */
  showOnHomepage: boolean;
  isHandmade: boolean;
  stockQuantity: number;
  colors: string[];
  sizes: string[];
  variantStock: Record<string, number>;
  variantPrice: Record<string, number>;
  // Billable shipping weight — null/undefined means unknown (custom_products
  // has no such column at all; regular products may not have it filled in
  // yet). lib/checkout/shipping.ts's calculateShipping() treats both the
  // same way: fall back to DEFAULT_ITEM_WEIGHT_GRAMS, never to 0.
  shippingWeightGrams?: number | null;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
}

// Categories now live in Supabase, admin-managed at /admin/categories.
// Use lib/db-categories.ts getCategories() to fetch.
// Products now live in Supabase + Cloudinary. Use lib/db-products.ts mapProduct() to fetch.
