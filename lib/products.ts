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

export const products: Product[] = [
  {
    id: "1",
    name: "Textured square pattern Blanket",
    price: 380000,
    originalPrice: 480000,
    category: "Blankets",
    rating: 4.9,
    reviewCount: 87,
    image: "/images/TB1.jpg",
    images: ["/images/TB1.jpg",
      "/images/TB2.jpg",
      "/images/TB3.jpg",
    ],
    description:
      "Hand-stitched from premium cotton patchwork squares, each duvet takes over 40 hours to complete. Filled with 100% natural wool batting for breathable warmth all year.",
    details: [
      "100% cotton patchwork top",
      "Natural wool batting",
      "Queen size: 200cm × 200cm",
      "Wash at 30°C gentle cycle",
      "Each piece uniquely patterned",
    ],
    tags: ["duvet", "patchwork", "wool", "bedroom"],
    inStock: true,
    featured: true,
  },
  {
    id: "2",
    name: "Hand-Knit Baby Cardigan Set",
    price: 115000,
    category: "baby",
    rating: 5.0,
    reviewCount: 143,
    image: "/images/baby-blanket.jpg",
    images: ["/images/baby-blanket2.jpg", ],
    description:
      "A precious set of cardigan, bonnet, and booties knitted from hypoallergenic merino wool. Soft enough for newborn skin, warm enough for every season.",
    details: [
      "100% merino wool",
      "Hypoallergenic",
      "Sizes: 0–3m, 3–6m, 6–12m",
      "Hand wash cold",
      "Gift-wrapped by default",
    ],
    tags: [ "knit", "merino", "newborn"],
    inStock: true,
    featured: true,
  },
  {
    id: "3",
    name: "Cozy Herringbone blanket",
    price: 150000,
    category: "Blankets",
    rating: 4.8,
    reviewCount: 62,
    image: "/images/blanket-room.jpg",
    images: [
      "/images/blanket-room.jpg",
      "/images/hero-grid-2.jpg",
      "/images/tbk4.jpg",
    ],
    description:
      "Hand-loomed on a traditional wooden frame, this roomy tote is as sturdy as it is beautiful. Leather-reinforced handles and a cotton lining complete the craftsmanship.",
    details: [
      "Hand-loomed wool body",
      "Genuine leather handles",
      "Cotton lining with zip pocket",
      "38cm × 32cm × 14cm",
      "Spot clean only",
    ],
    tags: ["tote", "woven", "handbag", "wool"],
    inStock: true,
    featured: true,
  },
  {
    id: "4",
    name: " Cozy Cable blankets",
    price: 95000,
    originalPrice: 130000,
    category: "Blankets",
    rating: 4.7,
    reviewCount: 39,
    image: "/images/tbck1.jpg",
    images: ["/images/tbck1.jpg",
      "/images/tbck2.jpg",
      "/images/tbck3.jpg",
    ],
    description:
      "Needle-felted from pure Corriedale wool with a floral motif pressed by hand. A magnetic clasp closes the cotton-lined interior with two card slots.",
    details: [
      "Corriedale wool body",
      "Needle-felted floral design",
      "Magnetic clasp",
      "Cotton lining, 2 card slots",
      "22cm × 13cm",
    ],
    tags: ["clutch", "felted", "purse", "floral"],
    inStock: true,
    featured: false,
  },
  {
    id: "5",
    name: "Chunky Knit Baby Blanket",
    price: 130000,
    category: "blankets",
    rating: 4.9,
    reviewCount: 211,
    image: "https://picsum.photos/seed/babyblanket1/600/600",
    images: [
      "https://picsum.photos/seed/babyblanket1/600/600",
      "https://picsum.photos/seed/babyblanket1b/600/600",
    ],
    description:
      "Arm-knitted from extra-thick merino roving in a single evening of craft. The loose, airy weave is incredibly soft yet breathable — perfect for prams and cots.",
    details: [
      "100% merino roving",
      "Arm-knitted (no needles)",
      "75cm × 90cm",
      "Hand wash, reshape wet",
      "Available in 6 colours",
    ],
    tags: ["blanket", "chunky", "merino", "baby"],
    inStock: true,
    featured: false,
  },
  {
    id: "6",
    name: "Fair Isle Wool Scarf",
    price: 85000,
    category: "scarves",
    rating: 4.8,
    reviewCount: 94,
    image: "https://picsum.photos/seed/scarf1/600/600",
    images: ["https://picsum.photos/seed/scarf1/600/600"],
    description:
      "Knitted in the traditional Fair Isle technique with a five-colour geometric pattern. Long enough to wrap twice, warm enough for the coldest mornings.",
    details: [
      "100% Shetland wool",
      "Traditional Fair Isle pattern",
      "180cm × 22cm",
      "Dry clean recommended",
      "Made in Scotland",
    ],
    tags: ["scarf", "fair isle", "wool", "winter"],
    inStock: true,
    featured: false,
  },
  {
    id: "7",
    name: "Crochet Market Bag",
    price: 72000,
    category: "handbags",
    rating: 4.6,
    reviewCount: 55,
    image: "https://picsum.photos/seed/market1/600/600",
    images: ["https://picsum.photos/seed/market1/600/600"],
    description:
      "Crocheted from natural cotton string in a classic open-weave mesh. Stretches to carry a full grocery shop, then folds to pocket size when empty.",
    details: [
      "100% natural cotton",
      "Open-weave crochet",
      "Expands to 40L capacity",
      "Machine washable",
      "Folds flat for storage",
    ],
    tags: ["crochet", "market bag", "cotton", "eco"],
    inStock: true,
    featured: false,
  },
  {
    id: "8",
    name: "Hand-Embroidered Coin Wallet",
    price: 55000,
    category: "wallets",
    rating: 4.9,
    reviewCount: 76,
    image: "https://picsum.photos/seed/wallet1/600/600",
    images: ["https://picsum.photos/seed/wallet1/600/600"],
    description:
      "Hand-stitched with a delicate floral embroidery on soft wool felt. A brass zip closure and cotton lining keep coins and cards safe in style.",
    details: [
      "Wool felt with embroidery",
      "Brass zip closure",
      "Cotton lining",
      "10cm × 8cm",
      "Choice of 4 motifs",
    ],
    tags: ["wallet", "embroidery", "felt", "floral"],
    inStock: true,
    featured: false,
  },
  {
    id: "9",
    name: "Merino Moses Basket Set",
    price: 290000,
    originalPrice: 360000,
    category: "scarves",
    rating: 4.8,
    reviewCount: 34,
    image: "https://picsum.photos/seed/moses1/600/600",
    images: [
      "https://picsum.photos/seed/moses1/600/600",
      "https://picsum.photos/seed/moses1b/600/600",
    ],
    description:
      "A complete moses basket dressing set — knitted blanket, fitted sheet, and padded hood — all in 100% merino. The ultimate gift for a new arrival.",
    details: [
      "100% merino wool",
      "3-piece set",
      "Fits standard moses baskets",
      "Hand wash cold",
      "Heirloom quality",
    ],
    tags: ["baby", "moses basket", "merino", "gift"],
    inStock: true,
    featured: false,
  },
  {
    id: "10",
    name: "Bobble Stitch Throw Blanket",
    price: 195000,
    category: "blankets",
    rating: 4.7,
    reviewCount: 48,
    image: "https://picsum.photos/seed/throw1/600/600",
    images: [
      "https://picsum.photos/seed/throw1/600/600",
      "https://picsum.photos/seed/throw1b/600/600",
    ],
    description:
      "The bobble stitch creates a beautiful textured surface that is as tactile as it is cosy. Knitted from a wool-cotton blend in warm neutral tones.",
    details: [
      "60% wool, 40% cotton",
      "Bobble stitch texture",
      "130cm × 170cm",
      "Machine wash 30°C",
      "Neutral colourways",
    ],
    tags: ["throw", "bobble", "blanket", "texture"],
    inStock: true,
    featured: false,
  },
  {
    id: "11",
    name: "Structured Knit Handbag",
    price: 225000,
    category: "handbags",
    rating: 4.9,
    reviewCount: 28,
    image: "https://picsum.photos/seed/handbag1/600/600",
    images: [
      "https://picsum.photos/seed/handbag1/600/600",
      "https://picsum.photos/seed/handbag1b/600/600",
    ],
    description:
      "A structured frame bag knitted in fine merino with a rigid base and clasp closure. Sophisticated enough for evenings out, roomy enough for everyday essentials.",
    details: [
      "Fine merino knit",
      "Rigid base and frame",
      "Suede lining",
      "Gold-tone clasp",
      "27cm × 20cm × 10cm",
    ],
    tags: ["handbag", "merino", "structured", "elegant"],
    inStock: true,
    featured: false,
  },
  {
    id: "12",
    name: "Hand-Sewn Baby Sleeping Bag",
    price: 155000,
    category: "scarves",
    rating: 4.8,
    reviewCount: 91,
    image: "https://picsum.photos/seed/sleepbag1/600/600",
    images: ["https://picsum.photos/seed/sleepbag1/600/600"],
    description:
      "A tog-rated sleeping bag hand-sewn from quilted merino panels. The side-zip opening and adjustable shoulder poppers make night feeds simple and stress-free.",
    details: [
      "Quilted merino panels",
      "1.0 tog rating",
      "Sizes: 0–6m, 6–18m, 18–36m",
      "Machine washable",
      "Side zip + shoulder poppers",
    ],
    tags: ["baby", "sleeping bag", "quilted", "merino"],
    inStock: true,
    featured: false,
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}
