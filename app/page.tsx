import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import NewsletterForm from "@/components/NewsletterForm";
import ScrollReveal from "@/components/ScrollReveal";
import HeroSlider from "@/components/HeroSlider";
import { getFeaturedProducts, categories } from "@/lib/products";
import {
  YarnBall,
  Scissors,
  SewingNeedle,
  KnittingNeedles,
  ThreadSpool,
  WoolSkein,
  HandKnitting,
} from "@/components/CraftIcons";

/* ─── Marquee strip — refined, emoji-free ─────────── */
const marqueeItems = [
  "✦ Hand Knitted",
  "✦ Needle & Thread",
  "✦ 100% Natural Wool",
  "✦ Gift Wrapped",
  "✦ Women Artisans",
  "✦ Made to Order",
  "✦ Heirloom Quality",
  "✦ No Two Alike",
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
  { title: "Free UK Shipping", subtitle: "On orders over £80" },
  { title: "100% Natural Wool", subtitle: "Merino & Shetland fleece" },
  { title: "Gift Wrapped", subtitle: "Ready to give on arrival" },
  { title: "Women Artisans", subtitle: "40+ skilled craftswomen" },
];

export default function HomePage() {
  const featured = getFeaturedProducts();
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
            {/* Bottom dissolve into milk text panel */}
            <div className="absolute bottom-0 left-0 w-full h-28 z-10 pointer-events-none
                            bg-gradient-to-t from-cream-dark via-cream-dark/50 to-transparent" />
          </div>

          {/* Text panel — milk background */}
          <div className="relative flex flex-col justify-center px-6 py-10 overflow-hidden bg-cream-dark">

            <div className="relative z-10">
              <p className="text-gold text-[10px] uppercase tracking-[0.28em] font-body font-semibold mb-3 animate-fade-up">
                ✦ Handcrafted by women artisans
              </p>
              <h1 className="font-heading italic text-5xl font-300 leading-[1.1] mb-4 animate-fade-up delay-100">
                <span className="text-deep-brown">Hand</span><span className="text-gold">crafted</span><span className="text-taupe"> with</span>
                <br />
                <span className="font-500 not-italic text-gold">
                  needle &amp; thread
                </span>
              </h1>
              <p className="text-deep-brown/70 text-sm font-medium leading-relaxed mb-7 animate-fade-up delay-200">
                Every piece woven with love — duvets, baby clothes, handbags and
                more, stitched one at a time by women artisans.
              </p>

              <div className="flex flex-col gap-3 animate-fade-up delay-300">
                <Link
                  href="/products"
                  className="flex items-center justify-center h-13 px-8 rounded-full
                             bg-gold text-cream font-semibold text-sm tracking-wide
                             hover:bg-gold-dark active:bg-gold-dark active:scale-[0.98]
                             transition-all duration-200 shadow-lg shadow-gold/25"
                  style={{ touchAction: "manipulation" }}
                >
                  Browse the Collection →
                </Link>
                <Link
                  href="/#about"
                  className="flex items-center justify-center h-13 rounded-full
                             border-2 border-deep-brown/30 text-deep-brown font-medium text-sm
                             hover:border-gold hover:text-gold
                             active:text-gold transition-all duration-200"
                  style={{ touchAction: "manipulation" }}
                >
                  Our Story
                </Link>
              </div>

              <p className="text-deep-brown/35 text-[10px] tracking-wide font-body mt-6 animate-fade-up delay-400">
                ✦ Free UK Shipping over £80 &nbsp;·&nbsp; ✦ Gift wrapped
              </p>
            </div>
          </div>
        </div>

        {/* ── Desktop: asymmetric split — text left (42%) / slider right (58%) ── */}
        <div className="hidden lg:grid lg:grid-cols-[42fr_58fr] min-h-screen">

          {/* Left — brand story */}
          <div className="relative flex flex-col justify-center px-12 xl:px-16 py-20 overflow-hidden bg-cream-dark">

            {/* Watermark decorations */}
            <WoolSkein
              className="absolute -top-6 -left-6 w-52 h-52 opacity-[0.07] animate-spin-slow"
              color="#D4A76A"
            />
            <YarnBall
              className="absolute bottom-10 -right-8 w-40 h-40 opacity-[0.05]"
              color="#D4A76A"
            />

            <div className="relative z-10 max-w-lg">
              <p className="text-gold text-xs uppercase tracking-[0.28em] font-body font-semibold mb-5 animate-fade-up">
                ✦ Handcrafted by women artisans
              </p>
              <h1 className="font-heading italic text-6xl xl:text-7xl font-300 leading-[1.07] mb-6 animate-fade-up delay-100">
                <span className="text-deep-brown">Hand</span><span className="text-gold">crafted</span><span className="text-taupe"> with</span>
                <br />
                <em className="font-500 not-italic text-gold">
                  needle &amp; thread
                </em>
              </h1>
              <p className="text-deep-brown/75 text-base xl:text-lg font-medium leading-relaxed mb-9 animate-fade-up delay-200">
                Every piece woven with love — duvets, baby clothes, handbags
                and more, stitched one at a time by skilled women artisans.
              </p>

              <div className="flex gap-4 mb-10 animate-fade-up delay-300">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full
                             bg-gold text-cream font-semibold text-sm tracking-wide
                             hover:bg-gold-dark hover:-translate-y-0.5
                             hover:shadow-2xl hover:shadow-gold/30
                             active:translate-y-0
                             transition-all duration-300 shadow-lg shadow-gold/20"
                >
                  Browse the Collection →
                </Link>
                <Link
                  href="/#about"
                  className="inline-flex items-center justify-center px-7 py-4 rounded-full
                             border-2 border-deep-brown/30 text-deep-brown font-medium text-sm tracking-wide
                             hover:border-gold hover:text-gold hover:-translate-y-0.5
                             transition-all duration-300"
                >
                  Our Story
                </Link>
              </div>

              <p className="text-deep-brown/40 text-xs tracking-wide font-body animate-fade-up delay-400">
                ✦ Free UK Shipping over £80 &nbsp;·&nbsp; ✦ Each piece unique
                &nbsp;·&nbsp; ✦ Gift wrap available
              </p>
            </div>
          </div>

          {/* Right — image slider */}
          <div className="relative">
            <HeroSlider />
            {/* Wide dissolve — image bleeds into milk panel */}
            <div className="absolute top-0 left-0 h-full w-72 xl:w-96 z-10 pointer-events-none
                            bg-gradient-to-r from-cream-dark via-cream-dark/60 to-transparent" />
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
          <div className="shrink-0 ml-2 w-12 h-12 rounded-full
                          border-2 border-gold bg-cream-dark
                          flex items-center justify-center overflow-hidden">
            <span className="font-heading italic text-gold font-semibold text-lg select-none">A</span>
          </div>

          {/* Quote + attribution */}
          <div>
            <p className="font-heading italic text-sm text-deep-brown leading-snug">
              &ldquo;Every stitch is a promise kept to the woman who will wear it.&rdquo;
            </p>
            <p className="text-[10px] text-gold font-semibold font-body tracking-[0.15em] uppercase mt-2">
              — Amira, Founder
            </p>
          </div>
        </Link>

        {/* Floating artisan badge — bridges the two panels (desktop only) */}
        <div
          className="hidden lg:flex flex-col items-center
                     absolute left-[46%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-30
                     bg-gold rounded-xl px-8 py-7 shadow-2xl shadow-gold/40
                     pointer-events-none select-none"
        >
          <span className="text-cream/60 text-base mb-2 leading-none">✦</span>
          <p className="font-heading italic text-5xl font-400 text-cream text-center leading-none">40+</p>
          <div className="w-8 h-px bg-cream/30 my-3" />
          <p className="text-[12px] text-cream/90 font-body tracking-[0.18em] uppercase text-center whitespace-nowrap">
            Women Artisans
          </p>
          <p className="text-[10px] text-cream/55 font-body mt-1.5 text-center whitespace-nowrap">
            Crafting since 2017
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
              <div key={title} className="flex items-center gap-3 lg:justify-center lg:px-6">
                <span className="text-gold font-heading text-lg shrink-0" aria-hidden="true">
                  ✦
                </span>
                <div>
                  <p className="text-xs font-semibold text-deep-brown font-body tracking-wide">
                    {title}
                  </p>
                  <p className="text-[11px] text-taupe-dark mt-0.5 font-body">{subtitle}</p>
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
                className="text-cream text-sm font-body font-semibold tracking-widest px-4"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURED PRODUCTS — "Our Beloved Pieces"
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-14 lg:py-28 bg-white">
        {/* Subtle corner watermarks */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <YarnBall
            color="#8B2035"
            className="absolute -top-16 -left-16 w-64 h-64 opacity-[0.07]"
          />
          <WoolSkein
            color="#D49AA8"
            className="absolute -bottom-8 -right-8 w-56 h-40 opacity-[0.07]"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-12 lg:mb-16">
            <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
              ✦ Curated with care
            </p>
            <h2 className="font-heading italic text-3xl sm:text-4xl lg:text-5xl font-400 text-deep-brown mb-4">
              Our Beloved Pieces
            </h2>
            {/* Hand-stitch SVG underline decoration */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <svg width="120" height="12" viewBox="0 0 120 12" fill="none" aria-hidden="true">
                <path
                  d="M2 6 Q10 2 18 6 Q26 10 34 6 Q42 2 50 6 Q58 10 66 6 Q74 2 82 6 Q90 10 98 6 Q106 2 114 6 Q118 8 120 6"
                  stroke="#D49AA8" strokeWidth="1.5" strokeLinecap="round" fill="none"
                />
              </svg>
              <span className="text-taupe text-sm" aria-hidden="true">✦</span>
              <svg width="120" height="12" viewBox="0 0 120 12" fill="none" aria-hidden="true">
                <path
                  d="M2 6 Q10 10 18 6 Q26 2 34 6 Q42 10 50 6 Q58 2 66 6 Q74 10 82 6 Q90 2 98 6 Q106 10 114 6 Q118 4 120 6"
                  stroke="#D49AA8" strokeWidth="1.5" strokeLinecap="round" fill="none"
                />
              </svg>
            </div>
            <div className="flex justify-end max-w-7xl mx-auto px-4">
              <Link
                href="/products"
                className="text-sm font-semibold text-gold hover:text-gold-dark
                           transition-colors duration-200 flex items-center gap-1.5"
              >
                View all pieces
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-7">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ABOUT — "Stitched with Soul"
      ══════════════════════════════════════════════ */}
      <section
        id="about"
        className="relative overflow-hidden py-14 lg:py-28"
        style={{ backgroundColor: "#FBF0E4" }}
      >
        {/* Corner watermarks */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <HandKnitting
            color="#8B2035"
            className="absolute -bottom-10 -left-10 w-64 h-64 opacity-[0.08]"
          />
          <KnittingNeedles
            color="#D49AA8"
            className="absolute top-10 -right-10 w-52 h-52 opacity-[0.08]"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-20 lg:items-center gap-10">

            {/* Image */}
            <ScrollReveal>
              <div className="relative">
                <div className="rounded-2xl lg:rounded-3xl overflow-hidden aspect-4/3 lg:aspect-[4/5] relative shadow-2xl">
                  <Image
                    src="https://picsum.photos/seed/artisan-weave/800/1000"
                    alt="Women artisan hand-knitting a wool piece"
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-brown/35 to-transparent" />
                </div>
                {/* Floating stat card */}
                <div
                  className="absolute -bottom-5 right-4 lg:-bottom-7 lg:-right-7
                              bg-cream rounded-2xl p-5 shadow-2xl border border-taupe/20"
                >
                  <p className="font-heading italic text-4xl font-400 text-deep-brown">7+</p>
                  <p className="text-xs text-taupe-dark mt-1 font-body tracking-wide">Years of craft</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Text */}
            <ScrollReveal className="pt-8 lg:pt-0">
              <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
                ✦ Our story
              </p>
              <h2 className="font-heading italic text-3xl sm:text-4xl lg:text-5xl font-400 text-deep-brown mb-5 leading-tight">
                Stitched with Soul
              </h2>
              <p className="text-deep-brown/80 leading-relaxed mb-5 text-sm sm:text-base font-medium">
                Woven with Love was born from a simple belief: that the things
                we hold close should carry the warmth of the hands that made
                them. Every duvet, every baby cardigan, every tote bag is
                hand-knitted or needle-and-thread crafted by skilled women
                artisans — women who pour patience, tradition, and love into
                every single stitch.
              </p>

              {/* Pull-quote */}
              <blockquote className="border-l-4 border-gold pl-5 py-1 mb-6">
                <p className="font-heading italic text-xl sm:text-2xl font-400 text-deep-brown leading-snug">
                  &ldquo;No two pieces are alike — just like the women who make
                  them.&rdquo;
                </p>
              </blockquote>

              <p className="text-deep-brown/70 leading-relaxed mb-7 text-sm sm:text-base font-medium">
                We source only natural fibres — merino wool, Shetland fleece,
                Corriedale — and every item ships gift-wrapped, ready to become
                an heirloom.
              </p>

              <div className="grid grid-cols-2 gap-5 mb-8">
                {[
                  { value: "40+", label: "Artisan Women" },
                  { value: "100%", label: "Natural Wool" },
                  { value: "12", label: "Unique Collections" },
                  { value: "4k+", label: "Happy Customers" },
                ].map(({ value, label }) => (
                  <div key={label} className="border-l-2 border-gold pl-4">
                    <p className="font-heading italic text-2xl font-500 text-deep-brown">
                      {value}
                    </p>
                    <p className="text-[11px] text-taupe-dark mt-0.5 font-body tracking-wide">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                href="/products"
                className="inline-flex items-center justify-center h-14 px-9 rounded-full
                           bg-gold text-cream font-semibold text-sm tracking-wide
                           hover:bg-gold-dark hover:-translate-y-0.5
                           hover:shadow-xl hover:shadow-gold/20
                           active:translate-y-0
                           transition-all duration-300 shadow-lg shadow-gold/15
                           sm:h-auto sm:py-4"
                style={{ touchAction: "manipulation" }}
              >
                Explore the Collection
              </Link>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CATEGORIES — "Find Your Perfect Piece"
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-14 lg:py-28 bg-white">
        {/* Corner watermarks */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <ThreadSpool
            color="#8B2035"
            className="absolute -top-8 -right-8 w-48 h-56 opacity-[0.08]"
          />
          <Scissors
            color="#D49AA8"
            className="absolute bottom-8 -left-6 w-36 h-36 opacity-[0.07] rotate-6"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-10 lg:mb-14 text-center">
            <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
              ✦ Browse
            </p>
            <h2 className="font-heading italic text-3xl sm:text-4xl lg:text-5xl font-400 text-deep-brown">
              Find Your Perfect Piece
            </h2>
          </ScrollReveal>

          {/* Horizontal scroll on mobile, 3×2 grid on desktop */}
          <ScrollReveal>
            <div
              className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory
                          lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0"
            >
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="group relative rounded-2xl overflow-hidden shrink-0 block
                             w-48 h-36 sm:w-56 sm:h-44 snap-start
                             lg:w-auto lg:h-auto lg:aspect-4/3
                             hover:shadow-2xl hover:-translate-y-1
                             transition-all duration-300 ease-out
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  style={{ touchAction: "manipulation" }}
                >
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 192px, (max-width: 1024px) 224px, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-brown/80 via-deep-brown/20 to-transparent
                                  group-hover:from-deep-brown/70 transition-all duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-5">
                    <h3 className="font-heading italic text-cream font-400 text-sm lg:text-xl leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-cream/70 text-[10px] lg:text-xs mt-0.5 hidden lg:block font-body">
                      {cat.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TESTIMONIALS — "Words from Our Community"
      ══════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden py-14 lg:py-28"
        style={{ backgroundColor: "#FBF0E4" }}
      >
        {/* Corner watermarks */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <HandKnitting
            color="#8B2035"
            className="absolute -top-10 -left-10 w-56 h-56 opacity-[0.08]"
          />
          <WoolSkein
            color="#D49AA8"
            className="absolute -bottom-8 -right-8 w-64 h-44 opacity-[0.07]"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-12 lg:mb-16">
            <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
              ✦ Reviews
            </p>
            <h2 className="font-heading italic text-3xl sm:text-4xl lg:text-5xl font-400 text-deep-brown">
              Words from Our Community
            </h2>
          </ScrollReveal>

          <ScrollReveal>
            <div
              className="flex gap-5 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory
                          lg:grid lg:grid-cols-3 lg:gap-7 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0"
            >
              {testimonials.map(({ quote, name, location }) => (
                <div
                  key={name}
                  className="shrink-0 w-[82vw] sm:w-[60vw] snap-start
                             lg:w-auto bg-cream rounded-2xl p-7 lg:p-9
                             shadow-md border border-taupe/15
                             flex flex-col justify-between
                             hover:shadow-xl hover:-translate-y-0.5
                             transition-all duration-300"
                >
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-5" aria-label="5 out of 5 stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="font-heading italic text-lg sm:text-xl font-400 text-deep-brown leading-snug mb-6 flex-1">
                    &ldquo;{quote}&rdquo;
                  </blockquote>

                  {/* Customer */}
                  <div className="flex items-center gap-3 pt-5 border-t border-taupe/20">
                    <div className="w-9 h-9 rounded-full bg-gold-light flex items-center justify-center shrink-0">
                      <span className="text-gold-dark text-sm font-heading font-semibold">
                        {name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-deep-brown font-body">{name}</p>
                      <p className="text-[11px] text-taupe-dark font-body">{location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          NEWSLETTER — "Join the Circle"
      ══════════════════════════════════════════════ */}
      <section
        id="newsletter"
        className="relative overflow-hidden py-14 lg:py-28 bg-deep-brown"
      >
        {/* Corner watermarks */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <ThreadSpool
            color="white"
            className="absolute -top-10 -left-10 w-52 h-60 opacity-[0.06]"
          />
          <KnittingNeedles
            color="white"
            className="absolute -bottom-12 -right-12 w-60 h-60 opacity-[0.06]"
          />
          <YarnBall
            color="white"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.03]"
          />
        </div>

        <ScrollReveal className="max-w-xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
            ✦ Join the Circle
          </p>
          <h2 className="font-heading italic text-3xl sm:text-4xl font-400 text-cream mb-4">
            Letters from our Studio
          </h2>
          <p className="text-taupe/80 text-base leading-relaxed mb-9 font-body">
            New pieces, knitting stories, and seasonal inspiration — delivered
            gently to your inbox.
          </p>
          <NewsletterForm />
          <p className="text-taupe/45 text-xs mt-5 font-body">
            No spam, ever. Unsubscribe anytime.
          </p>
        </ScrollReveal>
 
 
      </section>
    </>
  );
}
