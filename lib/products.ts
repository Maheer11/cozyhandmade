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
  featured: boolean;
  stockQuantity: number;
  colors: string[];
  sizes: string[];
  variantStock: Record<string, number>;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
}

export const categories: Category[] = [
  { id: "Blankets", name: "Throw blankets", description: "Hand-stitched warmth for restful nights", image: "/images/blanket-room2.jpg" },

  { id: "baby", name: "Baby blankets", description: "Gentle knits for the tiniest ones", image: "/images/baby-blankets.jpg" },

  { id: "handbags", name: "Handbags & Totes", description: "Woven by hand, carried with pride", image: "https://picsum.photos/seed/bag-cat/600/400" },

  { id: "wallets", name: "Purses & Wallets", description: "Compact elegance, stitched to last", image: "https://picsum.photos/seed/wallet-cat/600/400" },

  { id: "scarves", name: "Scarves & Wraps", description: "Draped in softness, knitted with love", image: "https://picsum.photos/seed/scarf-cat/600/400" },

  // { id: "baby-blankets", name: "", description: "Cosy layers for every season", image: "/images/baby-blanket.jpg" },
// ];
]

// Products now live in Supabase + Cloudinary. Use lib/db-products.ts mapProduct() to fetch.
