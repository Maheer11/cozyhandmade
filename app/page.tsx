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
import MobileProductSearch, { type SearchItem } from "@/components/home/MobileProductSearch";
import HeroMobileCarousel, { type HeroCarouselItem } from "@/components/home/HeroMobileCarousel";
import { getLikeCounts } from "@/lib/likes-server";
import PrivateAccessIntro from "@/components/intro/PrivateAccessIntro";
import PebbleLogo from "@/components/brand/PebbleLogo";
import CategoryTiles from "@/components/home/CategoryTiles";
import InStockRail, { type RailProduct } from "@/components/home/InStockRail";
import { MobileCustomOrderCard } from "@/components/home/MobileExtras";
import Button from "@/components/ui/Button";
import { mapCustomProduct, type DbCustomProduct } from "@/lib/db-custom-products";
import {
  FEATURED_PIECE_STOCK_SELECT,
  featuredPieceMaxQuantity,
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
    sub: "Stitched one at a time",
    // A running stitch — the wave is the thread, the gap is the needle's pass.
    icon: "M3 14c2.5-5 5 5 7.5 0S15 9 17.5 14M19.5 14h1.5",
  },
  {
    label: "Each piece is one of a kind",
    sub: "Creative patterns, never mass-made",
    // Sparkles (Heroicons v2, 24-outline).
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  },
  {
    label: "Premium materials",
    sub: "Chosen for comfort that lasts",
    // Three stacked threads.
    icon: "M4 7c4-3 12-3 16 0M4 12c4-3 12-3 16 0M4 17c4-3 12-3 16 0",
  },
  {
    label: "Gift wrap available",
    sub: "Ready to give",
    // A wrapped box: lid, body, and the ribbon's bow and drop.
    icon: "M3.75 8.25h16.5v3H3.75zM5.25 11.25v8.25h13.5v-8.25M12 8.25v11.25M12 8.25C10.5 5.25 7.5 4.5 7.5 6.375S10.5 8.25 12 8.25zM12 8.25c1.5-3 4.5-3.75 4.5-1.875S13.5 8.25 12 8.25z",
  },
];

/** What a card needs to decide whether "Add to bag" is possible. */
interface DbChoices {
  colors?: string[] | null;
  sizes?: string[] | null;
  variant_price?: Record<string, number> | null;
}

/**
 * True when the customer has a size, colour or tier to pick. Those items can't
 * be added from a card (the cart line would have no selection, and the price
 * and stock depend on it), so their cards link to the page instead.
 */
function hasChoices(row: DbChoices): boolean {
  return (
    (row.colors?.length ?? 0) > 0 ||
    (row.sizes?.length ?? 0) > 0 ||
    Object.keys(row.variant_price ?? {}).length > 0
  );
}

/** A featured_pieces row for a card, plus the linked product's stock. */
type DbHeroFeaturedPiece = FeaturedPieceCardData & FeaturedPieceStockSource & DbChoices;

// Featured Pieces no longer carry their own stock (migration 013): they take
// it from the product they link to, and `sold_out` on the row survives only as
// a manual override on top of that. Both halves have to be resolved before the
// card is rendered, or the storefront advertises pieces it cannot sell.
const FEATURED_PIECE_CARD_COLUMNS =
  `id, name, product_image, lifestyle_image, sold_out, is_handmade, price, discount_price, colors, sizes, variant_price, shipping_weight_grams, ${FEATURED_PIECE_STOCK_SELECT}`;

function toCard(row: DbHeroFeaturedPiece): FeaturedPieceCardData {
  const soldOut = isFeaturedPieceSoldOut(row);
  const maxQuantity = featuredPieceMaxQuantity(row);
  return {
    ...row,
    sold_out: soldOut,
    // Same price rule as the piece's page and checkout: discount_price wins.
    quickAdd:
      !soldOut && maxQuantity > 0 && !hasChoices(row)
        ? {
            id: row.id,
            name: row.name,
            price: row.discount_price ?? row.price,
            image: row.product_image,
            source: "featured_piece",
            maxQuantity,
            shippingWeightGrams: row.shipping_weight_grams ?? null,
          }
        : null,
  };
}

/** The hero photo frame: 5:4 on phones (short enough to leave the shop
 *  shortcuts above it on the first screen), 3:2 on tablets, a clamped height
 *  beside the copy from lg. */
const HERO_FRAME =
  "aspect-[6/5] sm:aspect-[3/2] lg:aspect-auto lg:h-[clamp(30rem,calc(100svh-14rem),40rem)]";

/** The products columns a card needs, before normalisation. */
const PRODUCT_CARD_COLUMNS =
  "id, name, image, images, price, original_price, stock_quantity, in_stock, is_handmade, created_at, colors, sizes, variant_price, shipping_weight_grams";

/** The products columns the hero needs, before normalisation. */
interface DbHeroProduct extends DbChoices {
  shipping_weight_grams?: number | null;
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
  const soldOut = !p.in_stock || p.stock_quantity <= 0;
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
    sold_out: soldOut,
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
    // Add to bag only when it is in stock with nothing to choose; the cap is
    // the real stock_quantity from the admin dashboard.
    quickAdd:
      !soldOut && !hasChoices(p)
        ? {
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image ?? "/images/placeholder.jpg",
            source: "product",
            maxQuantity: p.stock_quantity,
            shippingWeightGrams: p.shipping_weight_grams ?? null,
          }
        : null,
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

  // A product whose Featured Piece the owner has marked sold out in the admin
  // dashboard is off sale, whatever its own stock number says, so it must not
  // headline the hero or the "In stock now" row.
  const { data: dbPulled } = await db
    .from("featured_pieces")
    .select("product_id")
    .eq("sold_out", true);
  const pulledProductIds = new Set(
    ((dbPulled ?? []) as { product_id: string | null }[]).flatMap((r) => (r.product_id ? [r.product_id] : [])),
  );

  // The hero photo cycles through every product in the collections that can
  // be bought right now, newest first, the same order /products lists them.
  // Sold-out pieces are left out so the hero never advertises one.
  // `category` feeds the phone carousel's category tabs.
  const { data: dbShowcase } = await db
    .from("products")
    .select(`${PRODUCT_CARD_COLUMNS}, category`)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false });
  const showcaseRows = ((dbShowcase ?? []) as (DbHeroProduct & { category: string })[])
    .filter((p) => !pulledProductIds.has(p.id));
  const showcaseProducts = showcaseRows.map(toProductCard);
  // Like totals for the phone carousel: started now, awaited later, so this
  // extra round trip overlaps the queries below instead of adding to them.
  const heroLikesPromise = getLikeCounts(showcaseRows.map((p) => ({ source: "product" as const, id: p.id })));

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
  const railProducts = ((dbRail ?? []) as DbRailProduct[])
    .filter((p) => !pulledProductIds.has(p.id))
    .map(toRailProduct);

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

  // Phone hero carousel: the in-stock showcase plus each piece's category (for
  // the tabs) and its like total (empty until migration 017 is applied).
  const heroCarouselItems: HeroCarouselItem[] = showcaseRows.map((p, i) => ({
    card: showcaseProducts[i],
    categoryId: p.category,
    categoryName: categoryNameById.get(p.category) ?? p.category,
  }));
  const heroLikes = await heroLikesPromise;

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
      {/* "Private access" intro: homepage only, first visit only, an overlay
          over the store (which still renders below). docs/DESIGN.md §7. */}
      <PrivateAccessIntro />

      {/* ══════════════════════════════════════════════
          HERO — orange brand block with rounded bottom corners (the dark
          trust strip sits above the header, see components/home/TrustBar).

          Phones/tablets (owner's decision, docs/DESIGN.md §5): NO written
          copy. The product search comes first, then the swipeable photo
          carousel, then the buttons. The h1 stays for screen readers and
          search engines (sr-only below lg). From lg it is two columns (eyebrow,
          heading, intro and buttons left, photo right). The copy sits on flat orange,
          never on the photo, so contrast is one measurable number (milk on
          orange 5.5:1). Buttons on orange are milk, never burgundy.
          The photo is the in-stock showcase carousel (products with stock > 0
          in the admin dashboard), with its name-and-price pill over the photo.
      ══════════════════════════════════════════════ */}
      <section className="rounded-b-block bg-orange text-milk">
        <div className="page-container grid grid-cols-1 gap-x-16 gap-y-8 pb-8 pt-8 sm:py-12 lg:grid-cols-2 lg:items-center lg:py-14">
          <div className="min-w-0 lg:max-w-xl lg:col-start-1 lg:row-start-1 lg:self-end">
            {/* Phones/tablets: the product search, no written copy (owner). */}
            <div className="lg:hidden">
              <MobileProductSearch items={searchItems} />
            </div>
            <p className="hidden type-eyebrow text-milk lg:block">Handcrafted in Ireland</p>
            {/* sr-only below lg: still there for screen readers and search engines. */}
            <h1 className="sr-only type-display text-balance text-milk lg:not-sr-only lg:mt-4 lg:block">
              Handmade blankets, bags &amp; baby keepsakes
            </h1>
            <p className="hidden type-body max-w-md text-milk lg:mt-5 lg:block lg:text-lg lg:leading-8">
              Helping people create, connect and find comfort, every piece
              handcrafted in Ireland from premium materials.
            </p>
          </div>

          {/* The frame's size comes from CSS alone (aspect ratio, or a clamped
              height from lg), so nothing shifts when the photo or its name pill
              arrives. The photo cycles through the collections, always linking
              to the product on screen; if nothing is in stock, the original
              basket photo stands in, unlinked, rather than a link to nowhere. */}
          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            {showcaseProducts.length > 0 ? (
              <>
                {/* Phones/tablets: big swipeable photos that never move on
                    their own. Desktop keeps the one-big-photo carousel. */}
                <div className="lg:hidden">
                  {/* "N pieces ready to ship" + category tabs + cards with
                      price and likes (owner's reference). */}
                  <HeroMobileCarousel
                    items={heroCarouselItems}
                    categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                    initialLikes={heroLikes}
                  />
                </div>
                <div className="hidden lg:block">
                  <HeroProductCarousel items={showcaseProducts} frameClassName={HERO_FRAME} />
                </div>
              </>
            ) : (
              <div className={`relative overflow-hidden rounded-block bg-brown/30 ${HERO_FRAME}`}>
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

          <div className="flex flex-col gap-3 sm:flex-row lg:col-start-1 lg:row-start-2 lg:self-start">
            <Button href="/products" variant="onDark" className="sm:min-w-52">
              Shop the Collection
            </Button>
            <Button href="#featured-pieces" variant="onDarkOutline" className="sm:min-w-52">
              See featured pieces
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TRUST STRIP — four statements from lg; phones and tablets get the
          pill row (which adds free Dublin pickup and secure checkout).
      ══════════════════════════════════════════════ */}
      <section aria-label="Why Cozi Handmade" className="hidden lg:block bg-cream">
        <div className="page-container">
          <ul className="grid grid-cols-4 divide-x divide-line border-y border-line">
            {trustPoints.map(({ label, sub, icon }) => (
              <li key={label} className="flex items-center gap-3.5 px-6 py-7 first:pl-0 last:pr-0">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 shrink-0 text-burgundy"
                >
                  <path d={icon} />
                </svg>
                <span className="flex flex-col gap-0.5">
                  <span className="font-body text-[15px] font-semibold text-brown">{label}</span>
                  <span className="font-body text-sm text-stone">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SHOP BY CATEGORY — real categories that hold products (chips on phones, photo tiles from lg) */}
      <CategoryTiles categories={categories} />

      {/* IN STOCK NOW — buyable today, straight from the admin's stock numbers */}
      <InStockRail products={railProducts} />

      {/* ══════════════════════════════════════════════
          FEATURED PIECES — the admin's show_on_homepage picks, sold out last
      ══════════════════════════════════════════════ */}
      <HomeFeaturedGrid items={homepageItems} />

      {/* ══════════════════════════════════════════════
          OUR BELOVED PIECES — Apple-style Showcase
      ══════════════════════════════════════════════ */}
      {customProducts.length > 0 && (
        <BelovedPiecesShowcase products={customProducts} />
      )}

      {/* ══════════════════════════════════════════════
          OUR STORY — the company's four promises, beside a studio photo
      ══════════════════════════════════════════════ */}
      <section aria-labelledby="story-heading" className="bg-cream pt-12 lg:pt-24">
        <div className="page-container">
          <div className="grid grid-cols-1 items-center gap-8 rounded-block bg-peach p-6 sm:p-8 lg:grid-cols-2 lg:gap-16 lg:p-14">
            <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-white/50 lg:aspect-auto lg:h-[30rem]">
              <Image
                src="/images/our-story.jpg"
                alt="Hands at work on a handmade Cozi piece"
                fill
                sizes="(min-width: 1024px) 44vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="type-eyebrow text-burgundy">{trustItems[0].title}</p>
              <h2 id="story-heading" className="type-h1 mt-3 text-balance text-brown">
                {trustItems[0].subtitle}
              </h2>
              <ul className="mt-6 space-y-5">
                {trustItems.slice(1).map(({ title, subtitle }) => (
                  <li key={title}>
                    <h3 className="type-h3 text-brown">{title}</h3>
                    <p className="type-small mt-1 text-brown">{subtitle}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          REVIEWS — real customer screenshots
      ══════════════════════════════════════════════ */}
      <SocialProofSection reviews={reviews} />

      <MobileCustomOrderCard />

      {/* ══════════════════════════════════════════════
          NEWSLETTER — "Join the Circle"
      ══════════════════════════════════════════════ */}
      <section id="newsletter" className="relative overflow-hidden bg-cream py-12 lg:py-24">
        <ScrollReveal className="page-container">
          <div className="lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-10">
            {/* Scattered postcard collage — desktop only. Three photos at
                staggered rotations/sizes, like photos pinned to a corkboard.
                Hovering plays a quick zoom-and-brighten "flash" across the
                three photos in turn (studio-collage in globals.css). */}
            <div className="studio-collage relative hidden h-[420px] lg:block">
              <div className="absolute left-2 top-2 z-10 h-[70%] w-[62%] rotate-[-6deg] overflow-hidden rounded-card border-4 border-white shadow-soft">
                <Image
                  src="/images/blanket-room2.jpg"
                  alt="A handmade Cozi piece styled in a cozy room"
                  fill
                  sizes="30vw"
                  className="studio-collage-photo object-cover"
                  style={{ animationDelay: "0ms" }}
                />
              </div>
              <div className="absolute right-4 top-0 z-20 h-[52%] w-[46%] rotate-[5deg] overflow-hidden rounded-card border-4 border-white shadow-soft">
                <Image
                  src="/images/newhome2.jpg"
                  alt="Cozi handmade detail"
                  fill
                  sizes="20vw"
                  className="studio-collage-photo object-cover"
                  style={{ animationDelay: "120ms" }}
                />
              </div>
              <div className="absolute bottom-2 right-10 z-30 h-[42%] w-[42%] rotate-[-3deg] overflow-hidden rounded-card border-4 border-white shadow-soft">
                <Image
                  src="/images/baby-blanket.jpg"
                  alt="A cozy handmade baby blanket"
                  fill
                  sizes="20vw"
                  className="studio-collage-photo object-cover"
                  style={{ animationDelay: "240ms" }}
                />
              </div>
            </div>

            <div className="max-w-md lg:max-w-lg lg:py-8 lg:pl-6">
              {/* Animated pebble logo (Phase 9) on cream, with the faint
                  scattered-logo pattern behind it. */}
              <PebbleLogo
                surface="cream"
                className="mb-6 h-40 w-full max-w-xs rounded-card lg:h-44"
                pebbleClassName="h-[82%]"
                patternScale={0.7}
              />
              <p className="type-eyebrow text-burgundy">Join the Circle</p>
              <h2 className="type-h2 mt-3 text-brown">Letters from our Studio</h2>
              <p className="type-body mt-3 text-stone">
                New pieces, knitting stories, and seasonal inspiration,
                delivered gently to your inbox.
              </p>
              <div className="mt-6">
                <NewsletterForm />
              </div>
              <p className="type-caption mt-4 text-stone">
                No spam, ever. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ══════════════════════════════════════════════
          MARQUEE STRIP — just above the footer (desktop)
      ══════════════════════════════════════════════ */}
      <section className="hidden lg:block bg-burgundy overflow-hidden py-3.5">
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
    </>
  );
}
