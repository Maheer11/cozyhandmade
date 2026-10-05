import Link from "next/link";
import Image from "next/image";
import NewsletterForm from "@/components/NewsletterForm";
import ScrollReveal from "@/components/ScrollReveal";
import SocialProofSection, { type Review } from "@/components/SocialProofSection";
import heroImage from "@/public/images/newhome1.jpg";
import BelovedPiecesShowcase from "@/components/BelovedPiecesShowcase";
import HomeFeaturedGrid from "@/components/HomeFeaturedGrid";
import HeroProductCarousel from "@/components/HeroProductCarousel";
import { type FeaturedPieceCardData } from "@/components/FeaturedPiecesSection";
import { createClient } from "@/lib/supabase/server";
import { getStockedCategories } from "@/lib/db-categories";
import MobileShopShortcuts from "@/components/home/MobileShopShortcuts";
import type { SearchItem } from "@/components/home/MobileProductSearch";
import MobileCategoryTiles from "@/components/home/MobileCategoryTiles";
import MobileInStockRail, { type RailProduct } from "@/components/home/MobileInStockRail";
import { MobileTrustStrip, MobileCustomOrderCard } from "@/components/home/MobileExtras";
import { mapCustomProduct, type DbCustomProduct } from "@/lib/db-custom-products";
import {
  FEATURED_PIECE_STOCK_SELECT,
  isFeaturedPieceSoldOut,
  type FeaturedPieceStockSource,
} from "@/lib/featured-piece-stock";

/**
 * The hero's trust row. Icons are drawn inline (24px grid, 1.5 stroke) rather
 * than pulled from an icon package, matching the rest of the codebase.
 */
const trustPoints = [
  {
    label: "Made by hand in Ireland",
    // A running stitch — the wave is the thread, the gap is the needle's pass.
    icon: "M3 14c2.5-5 5 5 7.5 0S15 9 17.5 14M19.5 14h1.5",
  },
  {
    label: "Each piece is one of a kind",
    // Sparkles (Heroicons v2, 24-outline).
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  },
  {
    label: "Gift wrap available",
    // A wrapped box: lid, body, and the ribbon's bow and drop.
    icon: "M3.75 8.25h16.5v3H3.75zM5.25 11.25v8.25h13.5v-8.25M12 8.25v11.25M12 8.25C10.5 5.25 7.5 4.5 7.5 6.375S10.5 8.25 12 8.25zM12 8.25c1.5-3 4.5-3.75 4.5-1.875S13.5 8.25 12 8.25z",
  },
];

/** A featured_pieces row for a card, plus the linked product's stock. */
type DbHeroFeaturedPiece = FeaturedPieceCardData & FeaturedPieceStockSource;

// Featured Pieces no longer carry their own stock (migration 013): they take
// it from the product they link to, and `sold_out` on the row survives only as
// a manual override on top of that. Both halves have to be resolved before the
// card is rendered, or the storefront advertises pieces it cannot sell.
const FEATURED_PIECE_CARD_COLUMNS =
  `id, name, product_image, lifestyle_image, sold_out, is_handmade, price, discount_price, ${FEATURED_PIECE_STOCK_SELECT}`;

function toCard(row: DbHeroFeaturedPiece): FeaturedPieceCardData {
  return { ...row, sold_out: isFeaturedPieceSoldOut(row) };
}

/** The hero photo frame: 5:4 on phones (short enough to leave the shop
 *  shortcuts above it on the first screen), 3:2 on tablets, a clamped height
 *  beside the copy from lg. */
const HERO_FRAME =
  "aspect-[5/4] sm:aspect-[3/2] lg:aspect-auto lg:h-[clamp(30rem,calc(100svh-14rem),40rem)]";

/** The products columns a card needs, before normalisation. */
const PRODUCT_CARD_COLUMNS =
  "id, name, image, images, price, original_price, stock_quantity, in_stock, is_handmade, created_at";

/** The products columns the hero needs, before normalisation. */
interface DbHeroProduct {
  id: string;
  name: string;
  image: string | null;
  images: string[] | null;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  in_stock: boolean;
  is_handmade: boolean;
  created_at: string;
}

/**
 * A products row in the FeaturedPieceCardData shape, tagged with `source`
 * (same naming as cart items — see CartContext / lib/checkout/repriceItems.ts)
 * because product and featured-piece ids live under different detail routes.
 */
function toProductCard(p: DbHeroProduct): FeaturedPieceCardData {
  return {
    source: "product" as const,
    id: p.id,
    name: p.name,
    product_image: p.image ?? "/images/placeholder.jpg",
    // Products have no dedicated lifestyle shot; their second gallery image is
    // the closest equivalent. Null when there is only one image.
    lifestyle_image: p.images?.[1] ?? null,
    // featured_pieces carries an explicit sold_out flag; products derive it
    // from stock. in_stock is a generated column (stock_quantity > 0) — the
    // second check is belt-and-braces for rows read before that ever existed.
    sold_out: !p.in_stock || p.stock_quantity <= 0,
    is_handmade: p.is_handmade,
    // Price shapes are inverted between the two tables. featured_pieces stores
    // `price` = list and `discount_price` = what you pay; products store
    // `price` = what you pay and `original_price` = the struck-through was-
    // price (see ProductCard). Mapping products into the featured_pieces shape
    // means original_price becomes `price` and the real price becomes
    // `discount_price`, so the grid strikes through the same number the
    // /products listing does.
    price: p.original_price ?? p.price,
    discount_price: p.original_price ? p.price : null,
  };
}

/** The products columns the phone "In stock now" row needs. */
interface DbRailProduct {
  id: string;
  name: string;
  image: string | null;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  colors: string[] | null;
  sizes: string[] | null;
  variant_price: Record<string, number> | null;
  shipping_weight_grams: number | null;
}

function toRailProduct(p: DbRailProduct): RailProduct {
  const hasOptions =
    (p.colors?.length ?? 0) > 0 || (p.sizes?.length ?? 0) > 0 || Object.keys(p.variant_price ?? {}).length > 0;
  return {
    id: p.id,
    name: p.name,
    image: p.image ?? "/images/placeholder.jpg",
    price: p.price,
    wasPrice: p.original_price,
    stockQuantity: p.stock_quantity,
    shippingWeightGrams: p.shipping_weight_grams,
    quickAdd: !hasOptions,
  };
}

/** The products columns the phone search needs. */
interface DbSearchProduct {
  id: string;
  name: string;
  image: string | null;
  price: number;
  original_price: number | null;
  category: string;
  tags: string[] | null;
  stock_quantity: number;
}

interface DbReview {
  screenshot: string;
  platform: "whatsapp" | "instagram";
  customer_label: string | null;
  location: string | null;
  review_date: string | null;
}

/* ─── Marquee strip — refined, emoji-free ─────────── */
// Alternates the original ✦ star with a plain ◆ diamond, item by item.
const marqueeItems: { text: string; icon: "star" | "diamond" }[] = [
  { text: "Handcrafted in Ireland",    icon: "star" },
  { text: "Premium Materials",         icon: "diamond" },
  { text: "Cozi Blankets & Handbags",  icon: "star" },
  { text: "Baby Keepsakes",            icon: "diamond" },
  { text: "Creative Patterns",         icon: "star" },
];

/* ─── Testimonials ───────────────────────────────── */
const testimonials = [
  {
    quote:
      "The baby cardigan I ordered arrived beautifully wrapped. My daughter wore it home from hospital. It's already a family heirloom.",
    name: "Sarah M.",
    location: "London",
  },
  {
    quote:
      "I've never owned a handbag that gets so many compliments. The craftsmanship is extraordinary.",
    name: "Amara K.",
    location: "Manchester",
  },
  {
    quote:
      "My duvet is a work of art. I've had it three winters now and it just gets softer. Worth every penny.",
    name: "Claire B.",
    location: "Edinburgh",
  },
];

/* ─── Trust strip ────────────────────────────────── */
const trustItems = [
  { title: "Creative Lifestyle Company", subtitle: "Helping people create, connect & find comfort" },
  { title: "Handmade Products", subtitle: "Each piece stitched by hand, one at a time" },
  { title: "Creative Workshops", subtitle: "Slow down through hands-on making" },
  { title: "Inspire Talents", subtitle: "Helping young people discover theirs" },
];

export default async function HomePage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: dbCustom } = await db
    .from("custom_products")
    .select("*")
    .order("display_order", { ascending: true });

  // Featured Pieces own their price and presentation, but take stock from the
  // product they link to — hence the embedded products(stock_quantity).
  const { data: dbFeaturedPieces } = await db
    .from("featured_pieces")
    .select(FEATURED_PIECE_CARD_COLUMNS)
    .order("display_order", { ascending: true })
    .limit(10);

  // ── Homepage featured grid — admin-curated across BOTH catalogues ──
  // (Still named "hero" here: these are the show_on_homepage picks that used
  // to fill the hero collage and now fill the grid under it.) It is whatever
  // the owner ticks
  // `show_on_homepage` on, in /admin/products or /admin/featured-pieces, with
  // no cap at either end — the count is theirs to choose. Two queries because
  // the tables are genuinely separate (own ids, own price/stock columns, own
  // detail routes); they get normalised into one shape below so
  // HomeFeaturedGrid doesn't have to know there were ever two of them.
  const { data: dbHeroPieces } = await db
    .from("featured_pieces")
    .select(FEATURED_PIECE_CARD_COLUMNS)
    .eq("show_on_homepage", true)
    .order("display_order", { ascending: true });

  const { data: dbHeroProducts } = await db
    .from("products")
    .select(PRODUCT_CARD_COLUMNS)
    // created_at, not name or price: it's the one field guaranteed present and
    // never edited, so the order a product holds in the hero doesn't shift
    // under the owner when they rename or reprice it. Ascending, so newly
    // toggled products join the end of the row rather than displacing whatever
    // is already in the spotlight.
    .eq("show_on_homepage", true)
    .order("created_at", { ascending: true });

  // Reviews are admin-managed (/admin/reviews) — no more hardcoded array.
  const { data: dbReviews } = await db
    .from("reviews")
    .select("*")
    .order("display_order", { ascending: true });

  const customProducts = ((dbCustom ?? []) as DbCustomProduct[]).map(mapCustomProduct);
  const featuredPieceItems = ((dbFeaturedPieces ?? []) as DbHeroFeaturedPiece[]).map(toCard);
  const reviews: Review[] = (dbReviews ?? []).map((r: DbReview) => ({
    screenshot: r.screenshot,
    platform: r.platform,
    customerLabel: r.customer_label ?? undefined,
    location: r.location ?? undefined,
    date: r.review_date ?? undefined,
  }));
  const marqueeDouble = [...marqueeItems, ...marqueeItems];


  // Both tables normalised onto FeaturedPieceCardData + a `source`
  // discriminator (same naming as cart items — see CartContext /
  // lib/checkout/repriceItems.ts), because the two ids live under different
  // detail routes and the grid renders them side by side.
  const heroPieces: FeaturedPieceCardData[] = ((dbHeroPieces ?? []) as DbHeroFeaturedPiece[]).map(
    (p) => ({ ...toCard(p), source: "featured_piece" as const })
  );

  const heroProducts: FeaturedPieceCardData[] = ((dbHeroProducts ?? []) as DbHeroProduct[]).map(toProductCard);

  // The hero photo cycles through every product in the collections that can
  // be bought right now, newest first, the same order /products lists them.
  // Sold-out pieces are left out so the hero never advertises one.
  const { data: dbShowcase } = await db
    .from("products")
    .select(PRODUCT_CARD_COLUMNS)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false });
  const showcaseProducts = ((dbShowcase ?? []) as DbHeroProduct[]).map(toProductCard);

  // Featured Pieces first (by display_order), then products (by created_at).
  const heroItems = [...heroPieces, ...heroProducts];

  // Phone homepage: categories that hold products, and what's buyable today.
  const categories = await getStockedCategories(supabase);
  const { data: dbRail } = await db
    .from("products")
    .select("id, name, image, price, original_price, stock_quantity, colors, sizes, variant_price, shipping_weight_grams")
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .limit(12);
  const railProducts = ((dbRail ?? []) as DbRailProduct[]).map(toRailProduct);

  // Phone search: the whole products catalogue (everything with a product
  // page), in stock first. Small enough to send with the page and filter on
  // the phone as the customer types.
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const { data: dbSearch } = await db
    .from("products")
    .select("id, name, image, price, original_price, category, tags, stock_quantity")
    .order("name", { ascending: true });
  const searchItems: SearchItem[] = ((dbSearch ?? []) as DbSearchProduct[])
    .map((p) => ({
      id: p.id,
      name: p.name,
      image: p.image ?? "/images/placeholder.jpg",
      price: p.price,
      wasPrice: p.original_price,
      category: p.category,
      categoryName: categoryNameById.get(p.category) ?? p.category,
      tags: p.tags ?? [],
      soldOut: p.stock_quantity <= 0,
    }))
    .sort((a, b) => Number(a.soldOut) - Number(b.soldOut));

  // Sold-out pieces keep their place in the owner's order but move behind
  // everything buyable (the sort is stable), so the first row a visitor sees
  // is all things they can add to the cart. If nothing is toggled on for the
  // homepage, fall back to the Featured Pieces list rather than an empty grid.
  // The hero's product stays in the grid too: the owner prefers the full row
  // of picks to one fewer card with a gap at the end.
  const homepageItems = (heroItems.length > 0 ? heroItems : featuredPieceItems)
    .slice()
    .sort((a, b) => Number(a.sold_out) - Number(b.sold_out));

  return (
    <>
      {/* ══════════════════════════════════════════════
          HERO — one message, one photo

          Two columns from lg, stacked (text first) below it. The copy sits on
          the plain cream ground, never on the photo, so contrast is a single
          measurable number rather than "whatever patch of image is behind
          each glyph". One primary action (maroon), and a plain text link that scrolls to the grid.
      ══════════════════════════════════════════════ */}
      <section className="bg-ui-bg">
        {/* grid-cols-1 (minmax(0,1fr)) and min-w-0: without them the phone
            column grows to the full width of the swipeable chip row and pushes
            the search bar, button and photo off the right edge. */}
        <div className="page-container grid grid-cols-1 gap-8 py-8 sm:py-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-12">
          <div className="min-w-0 max-w-xl">
            <p className="mb-4 font-body text-sm font-medium text-ui-accent">
              Handcrafted in Ireland
            </p>
            {/* Phones show no headline (owner's call): the search bar and category
                chips come straight after "Handcrafted in Ireland". The h1 stays
                for screen readers and search engines (sr-only), shown from lg. */}
            <h1 className="sr-only lg:not-sr-only font-heading font-medium text-ui-text text-balance
                           lg:text-[clamp(2.5rem,1.6rem+3.2vw,4.25rem)] lg:leading-[1.05]">
              Handmade blankets, bags &amp; baby keepsakes
            </h1>
            {/* Phones: a search bar and category chips instead of the paragraph. */}
            <MobileShopShortcuts categories={categories} searchItems={searchItems} />
            <p className="hidden lg:block mt-5 max-w-md font-body text-base leading-relaxed text-ui-muted lg:text-lg">
              Helping people create, connect and find comfort, every piece
              handcrafted in Ireland from premium materials.
            </p>
            {/* Stacked on phones on purpose, not left to flex-wrap: whether the
                two fit on one line depended on which font had loaded, so the
                link jumped to a second line when Jost arrived and pushed the
                photo down (CLS 0.09 at 375px). */}
            <div className="mt-4 flex flex-col items-stretch gap-5 lg:mt-8 lg:flex-row lg:items-center lg:gap-8">
              <Link
                href="/products"
                className="cta-sheen focus-ring inline-flex h-12 items-center justify-center rounded-full bg-ui-accent px-7
                           font-body text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(139,32,53,0.8)]
                           transition-[background-color,transform] duration-150 hover:bg-ui-accent-hover active:scale-[0.98]
                           lg:rounded-button lg:shadow-none"
                style={{ touchAction: "manipulation" }}
              >
                Shop the Collection
              </Link>
              <a
                href="#featured-pieces"
                className="hidden lg:inline focus-ring rounded-button font-body text-sm font-medium text-ui-text
                           underline decoration-ui-border decoration-2 underline-offset-[6px]
                           transition-colors duration-150 hover:decoration-ui-accent"
              >
                See featured pieces
              </a>
            </div>
          </div>

          {/* The frame's size comes from CSS alone (aspect ratio, or a clamped
              height from lg), so nothing shifts when the photo or its name card
              arrives. The photo cycles through the collections, always linking
              to the product on screen; if nothing is in stock, the original
              basket photo stands in, unlinked, rather than a link to nowhere. */}
          {showcaseProducts.length > 0 ? (
            <HeroProductCarousel items={showcaseProducts} frameClassName={HERO_FRAME} />
          ) : (
            <div className={`relative overflow-hidden rounded-card bg-ui-surface ${HERO_FRAME}`}>
              <Image
                src={heroImage}
                alt="Three handmade crochet baskets stacked on a table, each with a leather Handmade tag"
                fill
                loading="eager"
                fetchPriority="high"
                placeholder="blur"
                sizes="(min-width: 1280px) 560px, (min-width: 1024px) 44vw, 100vw"
                className="object-cover"
                style={{ objectPosition: "58% 65%" }}
              />
            </div>
          )}
        </div>

        {/* Trust row — three plain statements, same content width as the hero.
            Desktop only; phones get the compact MobileTrustStrip below. */}
        <div className="page-container hidden lg:block">
          <ul className="grid gap-3 border-t border-ui-border py-5 sm:grid-cols-3 sm:gap-6">
            {trustPoints.map(({ label, icon }) => (
              <li key={label} className="flex items-center gap-3 font-body text-sm text-ui-text">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 shrink-0 text-ui-accent"
                >
                  <path d={icon} />
                </svg>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PHONES ONLY — one-tap ways in: categories, what's in stock, and the
          three facts that matter. All lg:hidden, so desktop is unchanged.
      ══════════════════════════════════════════════ */}
      <MobileCategoryTiles categories={categories} />
      <MobileInStockRail products={railProducts} />
      <MobileTrustStrip />

      {/* ══════════════════════════════════════════════
          FEATURED PIECES — the admin's show_on_homepage picks, sold out last
      ══════════════════════════════════════════════ */}
      <HomeFeaturedGrid items={homepageItems} />

      {/* ══════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════ */}
      <section
        className="hidden lg:block border-y border-taupe/15"
        style={{ backgroundColor: "#F2E2CC" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 lg:py-6">
          <div className="grid grid-cols-2 gap-y-5 gap-x-4 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-taupe/20">
            {trustItems.map(({ title, subtitle }) => (
              <div
                key={title}
                className="flex items-center gap-3 lg:justify-center lg:px-6"
              >
                <span
                  className="text-gold font-heading text-lg shrink-0"
                  aria-hidden="true"
                >
                  ✦
                </span>
                <div>
                  <p className="text-xs font-semibold text-deep-brown font-body tracking-wide">
                    {title}
                  </p>
                  <p className="text-[11px] text-taupe-dark mt-0.5 font-body">
                    {subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          MARQUEE STRIP
      ══════════════════════════════════════════════ */}
      <section className="hidden lg:block bg-gold overflow-hidden py-3.5">
        <div className="flex whitespace-nowrap">
          <div className="flex gap-10 animate-marquee shrink-0">
            {marqueeDouble.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 text-cream text-sm font-body font-semibold tracking-widest px-4"
              >
                <span aria-hidden="true">{item.icon === "star" ? "✦" : "◆"}</span>
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          OUR BELOVED PIECES — Apple-style Showcase
      ══════════════════════════════════════════════ */}
      {customProducts.length > 0 && (
        <BelovedPiecesShowcase products={customProducts} />
      )}

      {/* ══════════════════════════════════════════════
          TESTIMONIALS — Social Proof
      ══════════════════════════════════════════════ */}
      <SocialProofSection reviews={reviews} />

      <MobileCustomOrderCard />

      {/* ══════════════════════════════════════════════
          NEWSLETTER — "Join the Circle"
      ══════════════════════════════════════════════ */}
      <section
        id="newsletter"
        className="relative overflow-hidden py-6 lg:py-24 bg-cream-dark"
      >
        <ScrollReveal className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="lg:grid lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:items-center">
            {/* Scattered postcard collage — desktop only. Three photos at
                staggered rotations/sizes instead of one flat static box,
                like photos pinned to a corkboard. */}
            <div className="hidden lg:block relative h-[420px]">
              <div className="absolute left-2 top-2 w-[62%] h-[70%] rotate-[-6deg] rounded-2xl overflow-hidden shadow-[0_16px_32px_-8px_rgba(26,8,16,0.35)] border-4 border-white z-10">
                <Image
                  src="/images/blanket-room2.jpg"
                  alt="A handmade Cozi piece styled in a cozy room"
                  fill
                  sizes="30vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute right-4 top-0 w-[46%] h-[52%] rotate-[5deg] rounded-2xl overflow-hidden shadow-[0_16px_32px_-8px_rgba(26,8,16,0.3)] border-4 border-white z-20">
                <Image
                  src="/images/newhome2.jpg"
                  alt="Cozi handmade detail"
                  fill
                  sizes="20vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute right-10 bottom-2 w-[42%] h-[42%] rotate-[-3deg] rounded-2xl overflow-hidden shadow-[0_16px_32px_-8px_rgba(26,8,16,0.3)] border-4 border-white z-30">
                <Image
                  src="/images/baby-blanket.jpg"
                  alt="A cozy handmade baby blanket"
                  fill
                  sizes="20vw"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Postcard/letter card — the photo collage carries the studio feel
                on its own, so the card stays a clean white panel. */}
            <div className="relative bg-white rounded-3xl shadow-[0_20px_50px_-15px_rgba(26,8,16,0.25)] overflow-hidden lg:flex lg:flex-col lg:justify-center">
              <div className="text-center lg:text-left px-5 lg:px-14 py-7 lg:py-14">
                {/* Wax-seal style mark */}
                <span className="hidden lg:inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 text-gold text-lg mb-5">
                  ✦
                </span>

                <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
                  Join the Circle
                </p>
                <h2 className="font-heading italic text-2xl lg:text-4xl font-400 mb-4 text-deep-brown">
                  Letters from our Studio
                </h2>
                <p className="hidden lg:block text-brown/70 text-base leading-relaxed mb-9 font-body max-w-md mx-auto lg:mx-0">
                  New pieces, knitting stories, and seasonal inspiration,
                  delivered gently to your inbox.
                </p>
                <div className="lg:mx-0 mx-auto max-w-md">
                  <NewsletterForm />
                </div>
                <p className="text-taupe-dark text-xs mt-5 font-body">
                  No spam, ever. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
