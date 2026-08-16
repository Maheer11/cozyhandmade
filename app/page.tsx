import Link from "next/link";
import Image from "next/image";
import NewsletterForm from "@/components/NewsletterForm";
import ScrollReveal from "@/components/ScrollReveal";
import SocialProofSection, { type Review } from "@/components/SocialProofSection";
import HeroTiles from "@/components/HeroTiles";
import HeroSlider from "@/components/HeroSlider";
import heroTextBg from "@/public/images/newhome1.jpg";
import BelovedPiecesShowcase from "@/components/BelovedPiecesShowcase";
import ShopCollectionCard from "@/components/ShopCollectionCard";
import FeaturedPiecesSection, { type FeaturedPieceCardData } from "@/components/FeaturedPiecesSection";
import { createClient } from "@/lib/supabase/server";
import { mapCustomProduct, type DbCustomProduct } from "@/lib/db-custom-products";
import {
  FEATURED_PIECE_STOCK_SELECT,
  isFeaturedPieceSoldOut,
  type FeaturedPieceStockSource,
} from "@/lib/featured-piece-stock";

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

  // ── Homepage hero — admin-curated across BOTH catalogues ──
  // The hero used to be "the first few Featured Pieces by display_order",
  // capped in the component. It is now whatever the owner ticks
  // `show_on_homepage` on, in /admin/products or /admin/featured-pieces, with
  // no cap at either end — the count is theirs to choose. Two queries because
  // the tables are genuinely separate (own ids, own price/stock columns, own
  // detail routes); they get normalised into one shape below so HeroTiles
  // doesn't have to know there were ever two of them.
  const { data: dbHeroPieces } = await db
    .from("featured_pieces")
    .select(FEATURED_PIECE_CARD_COLUMNS)
    .eq("show_on_homepage", true)
    .order("display_order", { ascending: true });

  const { data: dbHeroProducts } = await db
    .from("products")
    .select("id, name, image, images, price, original_price, stock_quantity, in_stock, is_handmade, created_at")
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
  // detail routes and the hero renders them side by side.
  const heroPieces: FeaturedPieceCardData[] = ((dbHeroPieces ?? []) as DbHeroFeaturedPiece[]).map(
    (p) => ({ ...toCard(p), source: "featured_piece" as const })
  );

  const heroProducts: FeaturedPieceCardData[] = ((dbHeroProducts ?? []) as DbHeroProduct[]).map((p) => ({
    source: "product" as const,
    id: p.id,
    name: p.name,
    product_image: p.image ?? "/images/placeholder.jpg",
    // Products have no dedicated lifestyle shot; their second gallery image is
    // the closest equivalent and drives the same hover reveal. Null when there
    // is only one image, which the card already handles.
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
    // `discount_price`, so the hero strikes through the same number the
    // /products listing does.
    price: p.original_price ?? p.price,
    discount_price: p.original_price ? p.price : null,
  }));

  // Featured Pieces first, then products. The first item overall becomes the
  // desktop spotlight, so this makes a curated Featured Piece the headline
  // whenever one is toggled on — matching what the hero has always led with.
  const heroItems = [...heroPieces, ...heroProducts];

  // If nothing at all is toggled on, the hero would render nothing, so the
  // original single-photo hero is the fallback.
  const hasHeroItems = heroItems.length > 0;
  const heroVisual = hasHeroItems ? <HeroTiles items={heroItems} /> : <HeroSlider />;

  return (
    <>
      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative">
        {/* ── Mobile: slider on top, text below ── */}
        <div className="lg:hidden flex flex-col">
          {/* The rail sizes itself from its cards; only the single-photo
              fallback needs a fixed height to have anything to fill. */}
          <div className={`relative ${hasHeroItems ? "" : "h-[60vh]"}`}>
            {heroVisual}
          </div>

          {/* Text panel — milk background */}
          {/* py-6 not py-10: with products stacked first, every pixel above the
              headline pushes it under the fixed bottom nav. */}
          <div className="relative flex flex-col justify-center px-6 py-6 overflow-hidden bg-cream-dark">
            <div className="relative z-10">
              <p className="text-gold text-[10px] uppercase tracking-[0.28em] font-body font-semibold mb-3">
                ✦ Handcrafted in Ireland
              </p>
              {/* Set in caps rather than the serif italic it used to be: the
                  headline now reads as a statement, with the weight carrying
                  it instead of the flourish. Block spans force the 2-line
                  break structurally rather than leaving it to auto-wrap —
                  1.6rem at 375px keeps "THOUGHTFUL PIECES" on one line, sm
                  bumps it up. Emphasis stays to a single line (the shimmer on
                  line two), never both, so it reads as accent and not decor.
                  Uppercase via CSS, so the accessible name and the document
                  outline keep normal casing. */}
              {/* font-extrabold, not font-800: the numeric font-* utilities
                  used elsewhere in this codebase don't generate under this
                  Tailwind setup and silently resolve to 400. */}
              <h1 className="font-ios font-extrabold text-[1.6rem] sm:text-[2.1rem] uppercase
                             tracking-[0.01em] leading-[1.08] mb-3 text-deep-brown animate-fade-up">
                <span className="block">Handmade, cozy,</span>
                <span className="block text-shimmer animate-shimmer">Thoughtful pieces</span>
              </h1>
              {/* Short gold rule under the headline — the caps setting lost the
                  italic's natural taper, and this gives the block a defined
                  bottom edge before the body copy starts. */}
              <span aria-hidden="true" className="block w-12 h-0.5 bg-gold/70 mb-4" />
              <p className="text-deep-brown/70 text-sm font-medium leading-relaxed mb-7">
                Born from my own journey back to creativity, slowmade pieces
                that bring warmth, beauty and a little more intention to
                everyday life.
              </p>

              <div className="flex flex-col gap-3">
                <ShopCollectionCard />
                {/* Secondary points at Featured Pieces — the story section it used to
                    link to no longer exists */}
                <Link
                  href="/featured-pieces"
                  className="group flex items-center justify-center gap-1.5 h-11
                             text-deep-brown/70 font-medium text-sm
                             hover:text-gold active:text-gold transition-colors duration-200"
                  style={{ touchAction: "manipulation" }}
                >
                  See what&apos;s new
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              </div>

              <p className="text-deep-brown/35 text-[10px] tracking-wide font-body mt-6">
                ✦ Each piece unique &nbsp;·&nbsp; ✦ Gift wrapped &nbsp;·&nbsp; ✦ Ships from Dublin
              </p>
            </div>
          </div>
        </div>

        {/* ── Desktop: asymmetric split — text left (42%) / slider right (58%) ── */}
        {/* 88vh, not 100vh — letting the category grid peek above the fold is
            what tells you the hero is the top of a page rather than a splash
            screen standing on its own. */}
        {/* The text column widens at each step because its left padding grows
            with the viewport (container alignment). At a flat 42fr the content
            box actually got NARROWER as the screen got wider — 426px at 1280
            but 390px at 1920 — which is what forced the headline to wrap. */}
        <div className="hidden lg:grid lg:grid-cols-[42fr_58fr] xl:grid-cols-[48fr_52fr] 2xl:grid-cols-[55fr_45fr] min-h-[88vh]">
          {/* Left — brand story */}
          {/* py-3 matches the p-3 margin the image grid uses around its own
              cards (right column below), so the two panels sit inset from
              the column edges by the same amount — this is what makes the
              frosted card's top/bottom line up with the spotlight photo's.

              Horizontal padding is symmetric (px-12/xl:px-16) rather than the
              site-container-aligned calc this used to have. That calc pinned
              the card's LEFT edge to match "Find your piece" below, but grows
              with viewport width while the right edge stayed fixed — at
              1920px it put 352px of bare photo on the left and 64px on the
              right, which is what read as the card being shoved to one side.
              Centering the card in its own photo panel takes priority over
              matching the page grid below; if that downstream alignment
              matters again later, the two goals need a different approach
              since they can't both hold at every viewport width. */}
          {/* p-3 uniformly — matching the image grid's own p-3 wrapper exactly
              (right column below), on all four sides, not just top/bottom.
              px-8/2xl:px-12 left a visible bare strip of photo at the outer
              viewport edge and a wider gutter before the image grid than the
              image grid uses around its own cards, which read as the two
              halves of the hero following different rules. Dropping to p-3
              is safe for the nowrap-headline fit at 1280px too — smaller
              padding only ever gives the card MORE available width, never
              less, so it can't reintroduce that overflow. */}
          <div
            className="relative flex flex-col justify-center p-3 overflow-hidden"
          >
            {/* Background photo — this was the hero's original single image,
                before the column split into text + Featured Pieces grid. Object-cover
                fills the whole column; the text now sits on a frosted dark
                card instead of the flat milk panel, so the copy needed to
                flip from dark-on-light to light-on-dark below. */}
            <Image
              src={heroTextBg}
              alt=""
              aria-hidden
              fill
              sizes="45vw"
              placeholder="blur"
              className="object-cover"
            />

            {/* Scrim confined to where the copy actually sits, not the whole
                photo — a flat full-panel tint was tried before and pulled for
                dulling the shot; text-shadow alone wasn't enough contrast
                against this photo's bright wall behind the headline. Radial
                gradient centered on the text block, fading to fully
                transparent well before the panel edges, so the rest of the
                photo stays untouched. */}
            <div
              aria-hidden
              className="absolute inset-0 z-1"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 30% 50%, rgba(26,8,16,0.55) 0%, rgba(26,8,16,0.28) 45%, rgba(26,8,16,0) 75%)",
              }}
            />

            {/* h-full instead of my-auto — the card below now stretches to
                match the image grid's height, so this wrapper needs to span
                the full padded box rather than shrink-wrap a centered block. */}
            {/* mx-auto: past ~1750px the symmetric padding leaves more room
                than max-w-2xl uses, so without this the card would hug the
                left padding edge instead of centering in the extra space. */}
            <div className="relative z-10 h-full max-w-2xl mx-auto flex flex-col justify-center">
              {/* No card fill anymore — text sits directly on the photo. A
                  flat-colour scrim is what made the earlier WCAG ratios
                  possible to compute at all (a single background colour to
                  measure against); text-shadow doesn't reduce to one clean
                  number the same way, since "the background" is now whatever
                  patch of photo happens to sit behind each glyph. Two stacked
                  shadows: a tight dark one right at the glyph edge for the
                  photo's lighter patches, a softer wider one for separation
                  from mid-tone areas. Verified by looking at the rendered
                  result against this specific photo's brightest and darkest
                  regions, not by a formal ratio — worth re-checking by eye if
                  this background photo ever changes. */}
              <div
                className="h-full flex flex-col justify-center
                           px-8 py-10 xl:px-10 xl:py-12"
              >
                <p
                  className="text-terracotta text-xs uppercase tracking-[0.28em] font-body font-semibold mb-5"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.65)" }}
                >
                  ✦ Handcrafted in Ireland
                </p>
                {/* Block spans force the 2-line break. nowrap only from xl up:
                    at 1024–1279 (lg, before the grid widens this column to
                    48%) the panel is too narrow for either line at this font
                    size — forcing nowrap there clipped "blankets," and
                    "keepsakes" mid-word against the column edge. Below xl the
                    lines are free to wrap again if they need to; from xl up,
                    where the measured card width comfortably fits both lines
                    on one line each, nowrap keeps the intended 2-line shape.
                    Italic rule: exactly one emphasis word ("keepsakes"),
                    never a whole clause. No entrance cascade here either —
                    see the mobile block above for why. */}
                <h1 className="font-heading text-5xl xl:text-[3.25rem] 2xl:text-6xl font-300 leading-[1.1] mb-6">
                  <span
                    className="block xl:whitespace-nowrap text-cream"
                    style={{ textShadow: "0 2px 6px rgba(0,0,0,0.9), 0 4px 22px rgba(0,0,0,0.65)" }}
                  >
                    Handmade blankets,
                  </span>
                  <span
                    className="block xl:whitespace-nowrap text-terracotta font-500"
                    style={{ textShadow: "0 2px 6px rgba(0,0,0,0.9), 0 4px 22px rgba(0,0,0,0.65)" }}
                  >
                    bags &amp; baby <em className="italic">keepsakes</em>
                  </span>
                </h1>
                <p
                  className="text-cream/80 text-base xl:text-lg font-medium leading-relaxed mb-9"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.65)" }}
                >
                  Helping people create, connect and find comfort, every piece
                  handcrafted in Ireland from premium materials.
                </p>

                <div className="flex gap-4 mb-10">
                  <Link
                    href="/products"
                    className="group inline-flex items-center justify-center px-8 py-4 rounded-none
                               bg-gold text-cream font-semibold text-sm tracking-wide
                               shadow-[0_14px_34px_-14px_rgba(139,32,53,0.8)]
                               hover:bg-gold-dark hover:-translate-y-0.5
                               active:translate-y-0
                               transition-all duration-300"
                  >
                    {/* No icon: the bag glyph duplicated the navbar cart icon
                        directly above it. The arrow on the secondary CTA is now
                        the only icon here, so the two CTAs read distinctly. */}
                    Shop the Collection
                  </Link>
                  {/* Text link, not a second outline button — the hero needs one
                      unambiguous primary action. Points at Featured Pieces since the
                      story section it used to target is gone. */}
                  <Link
                    href="/featured-pieces"
                    className="group inline-flex items-center gap-1.5 px-2 py-4
                               text-cream/75 font-medium text-sm tracking-wide
                               hover:text-terracotta transition-colors duration-300"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.65)" }}
                  >
                    See what&apos;s new
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </Link>
                </div>

                <p
                  className="text-cream/75 text-xs tracking-wide font-body"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.65)" }}
                >
                  ✦ Get Premium Quality &nbsp;·&nbsp; ✦ Each piece unique
                  &nbsp;·&nbsp; ✦ Gift wrap available
                </p>
              </div>
            </div>
          </div>

          {/* Right — image slider */}
          <div className="relative">
            {heroVisual}
          </div>
        </div>

      </section>

      {/* Melts the hero's milk panel into the section below — without it the
          hero ends on a hard horizontal seam and reads as its own screen. */}
      <div className="h-14 lg:h-20 bg-gradient-to-b from-cream-dark to-cream-darker" aria-hidden />

      {/* ══════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════ */}
      <section
        className="border-y border-taupe/15"
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
      <section className="bg-gold overflow-hidden py-3.5">
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
          FEATURED PIECES — admin-managed via /admin/featured-pieces

          Desktop only. On mobile the hero already renders this exact rail,
          with the same card component and the full item list — showing it
          twice meant two identical swipe rows in one scroll. Desktop keeps
          both because there the hero is the bento collage, not a rail.
      ══════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        <FeaturedPiecesSection items={featuredPieceItems} />
      </div>

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

      {/* ══════════════════════════════════════════════
          NEWSLETTER — "Join the Circle"
      ══════════════════════════════════════════════ */}
      <section
        id="newsletter"
        className="relative overflow-hidden py-14 lg:py-24 bg-cream-dark"
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
              <div className="text-center lg:text-left px-6 sm:px-14 lg:px-14 py-10 sm:py-14">
                {/* Wax-seal style mark */}
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 text-gold text-lg mb-5">
                  ✦
                </span>

                <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
                  Join the Circle
                </p>
                <h2 className="font-heading italic text-3xl sm:text-4xl font-400 mb-4 text-deep-brown">
                  Letters from our Studio
                </h2>
                <p className="text-brown/70 text-base leading-relaxed mb-9 font-body max-w-md mx-auto lg:mx-0">
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
