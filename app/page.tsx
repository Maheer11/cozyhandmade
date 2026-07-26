import Link from "next/link";
import Image from "next/image";
import NewsletterForm from "@/components/NewsletterForm";
import ScrollReveal from "@/components/ScrollReveal";
import SocialProofSection, { type Review } from "@/components/SocialProofSection";
import HeroSlider from "@/components/HeroSlider";
import BelovedPiecesShowcase from "@/components/BelovedPiecesShowcase";
import OurStorySection from "@/components/OurStorySection";
import NewInSection, { type NewInCardData } from "@/components/NewInSection";
import { createClient } from "@/lib/supabase/server";
import { mapCustomProduct, type DbCustomProduct } from "@/lib/db-custom-products";

interface DbReview {
  screenshot: string;
  platform: "whatsapp" | "instagram";
  customer_label: string | null;
  location: string | null;
  review_date: string | null;
  rating: number | null;
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
      "The baby cardigan I ordered arrived beautifully wrapped — my daughter wore it home from hospital. It's already a family heirloom.",
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

  // New In is a fully standalone collection now — no join, own price/stock.
  const { data: dbNewIn } = await db
    .from("new_in_items")
    .select("id, name, product_image, lifestyle_image, sold_out, is_handmade, price, discount_price")
    .order("display_order", { ascending: true })
    .limit(10);

  // Reviews are admin-managed (/admin/reviews) — no more hardcoded array.
  const { data: dbReviews } = await db
    .from("reviews")
    .select("*")
    .order("display_order", { ascending: true });

  const customProducts = ((dbCustom ?? []) as DbCustomProduct[]).map(mapCustomProduct);
  const newInItems = (dbNewIn ?? []) as NewInCardData[];
  const reviews: Review[] = (dbReviews ?? []).map((r: DbReview) => ({
    screenshot: r.screenshot,
    platform: r.platform,
    customerLabel: r.customer_label ?? undefined,
    location: r.location ?? undefined,
    date: r.review_date ?? undefined,
    rating: r.rating ?? undefined,
  }));
  const marqueeDouble = [...marqueeItems, ...marqueeItems];

  return (
    <>
      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative">
        {/* ── Mobile: slider on top, text below ── */}
        <div className="lg:hidden flex flex-col">
          <div className="relative h-[60vh]">
            <HeroSlider />
            {/* Top dissolve — blends into the navbar's cream-dark background */}
            <div
              className="absolute top-0 left-0 w-full h-20 z-10 pointer-events-none
                            bg-gradient-to-b from-cream-dark via-cream-dark/50 to-transparent"
            />
            {/* Bottom dissolve into milk text panel */}
            <div
              className="absolute bottom-0 left-0 w-full h-28 z-10 pointer-events-none
                            bg-gradient-to-t from-cream-dark via-cream-dark/50 to-transparent"
            />
          </div>

          {/* Text panel — milk background */}
          <div className="relative flex flex-col justify-center px-6 py-10 overflow-hidden bg-cream-dark">
            <div className="relative z-10">
              <p className="text-gold text-[10px] uppercase tracking-[0.28em] font-body font-semibold mb-3 animate-fade-up">
                ✦ Handcrafted in Ireland
              </p>
              <h1 className="font-heading italic text-4xl sm:text-5xl font-300 leading-[1.15] mb-4 animate-fade-up delay-100">
                <span className="text-deep-brown">Helping people</span>
                <span className="text-gold"> create, connect</span>
                <br />
                <span className="font-500 not-italic text-gold">
                  &amp; Find Comfort
                </span>
              </h1>
              <p className="text-deep-brown/70 text-sm font-medium leading-relaxed mb-7 animate-fade-up delay-200">
                Every piece is handcrafted in Ireland using premium
                materials, from cozy blankets and handbags to baby keepsakes and
                creative patterns
              </p>

              <div className="flex flex-col gap-3 animate-fade-up delay-300">
                <Link
                  href="/products"
                  className="group flex items-center justify-center gap-2.5 h-13 px-8 rounded-none
                             border-2 border-gold text-gold font-semibold text-sm tracking-wide
                             hover:bg-gold hover:text-cream active:bg-gold active:text-cream active:scale-[0.98]
                             transition-all duration-200"
                  style={{ touchAction: "manipulation" }}
                >
                  {/* Same iOS-style filled bag glyph + "S" mark as the navbar's Shop icon —
                      the bag turns milk (cream-dark) on hover so it still reads against the gold fill */}
                  <span className="relative w-7 h-7 shrink-0 inline-flex items-center justify-center">
                    <svg
                      className="w-7 h-7 absolute inset-0 fill-gold group-hover:fill-cream-dark transition-colors duration-200"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7.5 5.25a4.5 4.5 0 119 0V6h1.628a2.25 2.25 0 012.244 2.077l.807 10.5A2.25 2.25 0 0118.933 21H5.067a2.25 2.25 0 01-2.246-2.423l.807-10.5A2.25 2.25 0 015.872 6H7.5v-.75zM9 6h6v-.75a3 3 0 10-6 0V6zm-.75 3.75a.75.75 0 011.5 0 2.25 2.25 0 004.5 0 .75.75 0 011.5 0 3.75 3.75 0 01-7.5 0z" />
                    </svg>
                    <span className="relative text-white group-hover:text-gold text-[10px] font-bold mt-1 transition-colors duration-200">
                      S
                    </span>
                  </span>
                  Browse the Collection
                </Link>
                <Link
                  href="/#about"
                  className="flex items-center justify-center h-13 rounded-none
                             border-2 border-deep-brown/30 text-deep-brown font-medium text-sm
                             hover:border-gold hover:text-gold
                             active:text-gold transition-all duration-200"
                  style={{ touchAction: "manipulation" }}
                >
                  Our Story
                </Link>
              </div>

              <p className="text-deep-brown/35 text-[10px] tracking-wide font-body mt-6 animate-fade-up delay-400">
                ✦ Each piece unique &nbsp;·&nbsp; ✦ Gift wrapped
              </p>
            </div>
          </div>
        </div>

        {/* ── Desktop: asymmetric split — text left (42%) / slider right (58%) ── */}
        <div className="hidden lg:grid lg:grid-cols-[42fr_58fr] min-h-screen">
          {/* Left — brand story */}
          <div className="relative flex flex-col justify-center px-12 xl:px-16 py-20 overflow-hidden bg-cream-dark">
            <div className="relative z-10 max-w-lg">
              <p className="text-gold text-xs uppercase tracking-[0.28em] font-body font-semibold mb-5 animate-fade-up">
                ✦ Handcrafted in Ireland
              </p>
              <h1 className="font-heading italic text-5xl xl:text-6xl font-300 leading-[1.1] mb-6 animate-fade-up delay-100">
                <span className="text-deep-brown">Helping people</span>
                <span className="text-gold"> create, connect</span>
                <br />
                <em className="font-500 not-italic text-gold">
                  &amp; Find Comfort
                </em>
              </h1>
              <p className="text-deep-brown/75 text-base xl:text-lg font-medium leading-relaxed mb-9 animate-fade-up delay-200">
                Every piece is handcrafted in Ireland using premium materials, from
                cozy blankets and handbags to baby keepsakes and creative patterns
              </p>

              <div className="flex gap-4 mb-10 animate-fade-up delay-300">
                <Link
                  href="/products"
                  className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-none
                             border-2 border-gold text-gold font-semibold text-sm tracking-wide
                             hover:bg-gold hover:text-cream hover:-translate-y-0.5
                             active:translate-y-0
                             transition-all duration-300"
                >
                  {/* Same iOS-style filled bag glyph + "S" mark as the navbar's Shop icon —
                      the bag turns milk (cream-dark) on hover so it still reads against the gold fill */}
                  <span className="relative w-7 h-7 shrink-0 inline-flex items-center justify-center">
                    <svg
                      className="w-7 h-7 absolute inset-0 fill-gold group-hover:fill-cream-dark transition-colors duration-200"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M7.5 5.25a4.5 4.5 0 119 0V6h1.628a2.25 2.25 0 012.244 2.077l.807 10.5A2.25 2.25 0 0118.933 21H5.067a2.25 2.25 0 01-2.246-2.423l.807-10.5A2.25 2.25 0 015.872 6H7.5v-.75zM9 6h6v-.75a3 3 0 10-6 0V6zm-.75 3.75a.75.75 0 011.5 0 2.25 2.25 0 004.5 0 .75.75 0 011.5 0 3.75 3.75 0 01-7.5 0z" />
                    </svg>
                    <span className="relative text-white group-hover:text-gold text-[10px] font-bold mt-1 transition-colors duration-200">
                      S
                    </span>
                  </span>
                  Browse the Collection
                </Link>
                <Link
                  href="/#about"
                  className="inline-flex items-center justify-center px-7 py-4 rounded-none
                             border-2 border-deep-brown/30 text-deep-brown font-medium text-sm tracking-wide
                             hover:border-gold hover:text-gold hover:-translate-y-0.5
                             transition-all duration-300"
                >
                  Our Story
                </Link>
              </div>

              <p className="text-deep-brown/75 text-xs tracking-wide font-body animate-fade-up delay-400">
                ✦ Get Premium Quality &nbsp;·&nbsp; ✦ Each piece unique
                &nbsp;·&nbsp; ✦ Gift wrap available
              </p>
            </div>
          </div>

          {/* Right — image slider */}
          <div className="relative">
            <HeroSlider />
            {/* Wide dissolve — image bleeds into milk panel */}
            <div
              className="absolute top-0 left-0 h-full w-72 xl:w-96 z-10 pointer-events-none
                            bg-gradient-to-r from-cream-dark via-cream-dark/60 to-transparent"
            />
            {/* Top dissolve — blends into the navbar's cream-dark background */}
            <div
              className="absolute top-0 left-0 w-full h-24 z-10 pointer-events-none
                            bg-gradient-to-b from-cream-dark via-cream-dark/50 to-transparent"
            />
          </div>
        </div>

        {/* Owner quote card — bottom-left of hero (desktop only) */}
        <Link
          href="/#about"
          className="hidden lg:flex absolute bottom-8 right-8 z-30
                     items-center gap-4
                     bg-cream rounded-2xl px-5 py-4
                     shadow-xl max-w-[300px] overflow-hidden
                     hover:shadow-2xl hover:-translate-y-0.5
                     transition-all duration-300 group"
        >
          {/* Wine left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold rounded-l-2xl" />

          {/* Profile picture holder */}
          <div
            className="shrink-0 ml-2 w-12 h-12 rounded-full
                          border-2 border-gold bg-cream-dark
                          flex items-center justify-center overflow-hidden"
          >
            <span className="font-heading italic text-gold font-semibold text-lg select-none">
              MM
            </span>
          </div>

          {/* Quote + attribution */}
          <div>
            <p className="font-heading italic text-sm text-deep-brown leading-snug">
              &ldquo;Every stitch is a promise kept to the woman who will wear
              it.&rdquo;
            </p>
            <p className="text-[10px] text-gold font-semibold font-body tracking-[0.15em] uppercase mt-2">
              — Maryam Mahmud, CEO
            </p>
          </div>
        </Link>

        {/* Floating artisan badge — bridges the two panels (desktop only) */}
        <div
          className="hidden lg:flex flex-col items-center
                     absolute left-[54%] top-[35%] -translate-x-1/2 -translate-y-1/2 z-30
                     bg-gold rounded-xl px-8 py-7 shadow-2xl shadow-gold/40
                     pointer-events-none select-none"
        >
          <span className="text-cream/60 text-base mb-2 leading-none">✦</span>
          <p className="font-heading italic text-5xl font-400 text-cream text-center leading-none">
            2 years
          </p>
          <div className="w-8 h-px bg-cream/30 my-3" />
          <p className="text-[12px] text-cream/90 font-body tracking-[0.18em] uppercase text-center whitespace-nowrap">
            INNOVATING AND RESTOCKING
          </p>
          <p className="text-sm text-cream/70 font-body mt-1.5 text-center whitespace-nowrap">
            Crafting since 2024
          </p>
        </div>
      </section>

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
          NEW IN — admin-managed via /admin/new-in
      ══════════════════════════════════════════════ */}
      <NewInSection items={newInItems} />

      {/* ══════════════════════════════════════════════
          OUR BELOVED PIECES — Apple-style Showcase
      ══════════════════════════════════════════════ */}
      {customProducts.length > 0 && (
        <BelovedPiecesShowcase products={customProducts} />
      )}

      {/* ══════════════════════════════════════════════
          ABOUT — "Stitched with Soul"
      ══════════════════════════════════════════════ */}
      <OurStorySection />

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
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] z-40
                               bg-white/95 shadow-md px-4 py-1.5 rounded text-gold font-heading italic text-sm
                               border border-taupe/20"
              >
                handmade with love
              </span>
            </div>

            {/* Postcard/letter card — stitched-dash left edge echoes the mobile
                nav drawer's accent, tying "Letters from our Studio" to an
                actual handwritten-letter feel instead of a generic dark band. */}
            <div className="relative bg-white rounded-3xl shadow-[0_20px_50px_-15px_rgba(26,8,16,0.25)] overflow-hidden lg:flex lg:flex-col lg:justify-center">
              {/* Stitched border accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(180deg, #8B2035 0px, #8B2035 8px, transparent 8px, transparent 14px)",
                }}
              />

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
                  New pieces, knitting stories, and seasonal inspiration —
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
