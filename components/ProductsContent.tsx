"use client";

import { useState, useMemo, useEffect, useDeferredValue, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import BottomSheet from "@/components/BottomSheet";
import ScrollReveal from "@/components/ScrollReveal";
import SocialProofSection, { type Review } from "@/components/SocialProofSection";
import CategorySlider from "@/components/CategorySlider";
import type { Product, Category } from "@/lib/products";

const priceRanges = [
  { label: "Under €50",    min: 0,   max: 50       },
  { label: "€50 – €150",   min: 50,  max: 150      },
  { label: "€150 – €300",  min: 150, max: 300      },
  { label: "Over €300",    min: 300, max: Infinity },
];

const sortOptions = [
  { value: "featured",   label: "Featured" },
  { value: "price-asc",  label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "rating",     label: "Highest Rated" },
];

const whyUsFeatures = [
  {
    label: "100% Natural Wool",
    description: "Merino & Shetland fleece, sourced with care and worked entirely by hand.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0zm7.5-7.5v3m0 9v3m7.5-7.5h-3m-9 0h-3" />
      </svg>
    ),
  },
  {
    label: "Handcrafted with Care",
    description: "Every piece is stitched one at a time by a skilled Creative in the world of needle and thread.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    label: "Gift Wrapped, Always",
    description: "Every order arrives ready to give — thoughtfully packaged on delivery.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18.75c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v2.25c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
];

function FilterOption({
  label,
  active,
  onToggle,
  count,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-between w-full px-4 py-3.5
                  rounded-xl text-sm font-medium border transition-colors duration-150
                  active:scale-[0.98]
                  ${active
                    ? "bg-gold text-cream border-gold"
                    : "bg-cream text-brown border-taupe/30 active:bg-cream-dark"
                  }`}
      style={{ touchAction: "manipulation" }}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={`text-xs ${active ? "text-cream/70" : "text-taupe-dark"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function FilterPill({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wide
                  border transition-colors duration-150 whitespace-nowrap
                  ${active
                    ? "bg-gold text-cream border-gold"
                    : "bg-transparent text-brown border-taupe/40 hover:border-gold hover:text-gold"
                  }`}
      style={{ touchAction: "manipulation" }}
    >
      {label}
    </button>
  );
}

function ProductsContentInner({ products, categories, reviews }: { products: Product[]; categories: Category[]; reviews: Review[] }) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "all";
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [query,            setQuery]           = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedPrice,    setSelectedPrice]    = useState<number | null>(null);
  const [sort,             setSort]             = useState("featured");
  const [filtersOpen,      setFiltersOpen]      = useState(false);

  useEffect(() => {
    setSelectedCategory(searchParams.get("category") ?? "all");
  }, [searchParams]);

  // Bottom-nav "Search" tab lands here with ?focusSearch=1 — actually focus the input
  useEffect(() => {
    if (searchParams.get("focusSearch")) {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  const activeFilterCount =
    (selectedCategory !== "all" ? 1 : 0) + (selectedPrice !== null ? 1 : 0);

  // Deferred so fast typing never blocks the pressed-key from rendering immediately
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    let list = [...products];
    if (deferredQuery.trim()) {
      const q = deferredQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (selectedPrice !== null) {
      const r = priceRanges[selectedPrice];
      list = list.filter((p) => p.price >= r.min && p.price < r.max);
    }
    if (sort === "price-asc")  list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating")     list.sort((a, b) => b.rating - a.rating);
    else list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return list;
  }, [deferredQuery, selectedCategory, selectedPrice, sort, products]);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedPrice(null);
    setQuery("");
  };

  return (
    <div className="min-h-screen bg-cream">

      {/* ══════════════════════════════════════════════
          CURATED CATEGORIES
      ══════════════════════════════════════════════ */}
      <section className="bg-cream-dark border-b border-taupe/20 px-4 sm:px-6 lg:px-8 py-6 lg:py-16">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5 lg:mb-12">
            <div>
              <p className="text-gold text-[11px] uppercase tracking-[0.28em] font-body font-semibold mb-2">
                ✦ Handcrafted goods
              </p>
              <h1 className="font-heading italic text-3xl sm:text-4xl lg:text-5xl font-400 text-deep-brown mb-5">
                Curated Categories
              </h1>
              <Link
                href="/products"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-none
                           bg-gold text-cream font-semibold text-xs uppercase tracking-widest
                           hover:bg-gold-dark hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/25
                           transition-all duration-300"
              >
                View All Products
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <p className="font-heading italic text-lg sm:text-xl text-taupe-dark leading-snug lg:text-right lg:max-w-xs">
              From cosy throws to hand-stitched keepsakes — every piece, one place.
            </p>
          </ScrollReveal>

          <ScrollReveal>
            <CategorySlider categories={categories} />
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FILTER & SORT
      ══════════════════════════════════════════════ */}
      <div className="sticky top-20 z-30 bg-cream/95 backdrop-blur-md border-b border-taupe/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">

          <div className="flex items-center gap-3 mb-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe-dark pointer-events-none"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search products…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-cream-dark border border-taupe/30 text-sm
                           text-deep-brown placeholder:text-taupe-dark
                           focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                           transition-all duration-200"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                             text-taupe-dark active:text-brown active:scale-90 transition-transform duration-100"
                  style={{ touchAction: "manipulation" }}
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={() => setFiltersOpen(true)}
              className={`lg:hidden relative flex items-center gap-1.5 h-11 px-3 rounded-xl border
                          text-sm font-medium transition-colors duration-150 shrink-0 active:scale-95
                          ${activeFilterCount > 0
                            ? "bg-gold text-cream border-gold"
                            : "bg-cream-dark text-brown border-taupe/30 active:bg-cream-darker"
                          }`}
              style={{ touchAction: "manipulation" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-cream text-gold text-[9px] font-bold
                                 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Desktop pill row + item count + sort */}
          <div className="hidden lg:flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-[0.2em] text-taupe-dark font-semibold shrink-0">
                Filter
              </span>
              <div className="flex items-center gap-2 overflow-x-auto">
                <FilterPill
                  label="All"
                  active={selectedCategory === "all"}
                  onToggle={() => setSelectedCategory("all")}
                />
                {categories.map((c) => (
                  <FilterPill
                    key={c.id}
                    label={c.name}
                    active={selectedCategory === c.id}
                    onToggle={() => setSelectedCategory(c.id === selectedCategory ? "all" : c.id)}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="text-[11px] uppercase tracking-[0.2em] text-taupe-dark font-semibold">
                {filtered.length} {filtered.length === 1 ? "Item" : "Items"}
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-9 px-2 rounded-xl bg-cream-dark border border-taupe/30 text-sm text-brown
                           focus:outline-none focus:border-gold transition-all duration-200
                           cursor-pointer"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex gap-2.5 overflow-x-auto pt-2 lg:pt-2">
              {selectedCategory !== "all" && (
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="flex items-center gap-1.5 pl-3 pr-2 h-10 bg-gold/10 text-gold
                             rounded-full text-xs font-medium whitespace-nowrap
                             active:scale-95 transition-transform duration-100"
                  style={{ touchAction: "manipulation" }}
                >
                  {categories.find((c) => c.id === selectedCategory)?.name ?? selectedCategory}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {selectedPrice !== null && (
                <button
                  onClick={() => setSelectedPrice(null)}
                  className="flex items-center gap-1.5 pl-3 pr-2 h-10 bg-gold/10 text-gold
                             rounded-full text-xs font-medium whitespace-nowrap
                             active:scale-95 transition-transform duration-100"
                  style={{ touchAction: "manipulation" }}
                >
                  {priceRanges[selectedPrice].label}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                onClick={clearFilters}
                className="px-3 h-10 text-xs text-taupe-dark whitespace-nowrap active:text-brown"
                style={{ touchAction: "manipulation" }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          FEATURED PRODUCTS INTRO + GRID
      ══════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-14">
        <ScrollReveal className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-5 lg:mb-10">
          <div>
            <h2 className="font-heading italic text-2xl sm:text-3xl lg:text-4xl font-400 text-deep-brown mb-3">
              Featured Products
            </h2>
            <p className="text-deep-brown/70 text-sm sm:text-base font-medium leading-relaxed max-w-lg">
              Duvets, baby knits, handbags and more — every piece stitched one at a time,
              selected for warmth, softness and lasting quality.
            </p>
          </div>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold
                       hover:text-gold-dark transition-colors duration-200 shrink-0"
          >
            View all products
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </ScrollReveal>

        <div className="flex gap-8 items-start">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 shrink-0 sticky top-40">
            <div className="bg-white rounded-2xl border border-cream-darker border-l-[3px] border-l-gold/40 p-5 shadow-sm">
              <h3 className="font-heading font-600 text-deep-brown text-base mb-4">Category</h3>
              <div className="space-y-1.5 mb-6">
                <FilterOption
                  label="All Products"
                  active={selectedCategory === "all"}
                  onToggle={() => setSelectedCategory("all")}
                  count={products.length}
                />
                {categories.map((c) => (
                  <FilterOption
                    key={c.id}
                    label={c.name}
                    active={selectedCategory === c.id}
                    onToggle={() => setSelectedCategory(c.id === selectedCategory ? "all" : c.id)}
                    count={products.filter((p) => p.category === c.id).length}
                  />
                ))}
              </div>

              <h3 className="font-heading font-600 text-deep-brown text-base mb-4">Price</h3>
              <div className="space-y-1.5">
                {priceRanges.map((r, i) => (
                  <FilterOption
                    key={r.label}
                    label={r.label}
                    active={selectedPrice === i}
                    onToggle={() => setSelectedPrice(selectedPrice === i ? null : i)}
                  />
                ))}
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 w-full text-center text-xs text-gold underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            <p className="lg:hidden text-xs text-taupe-dark mb-4">
              <span className="font-medium text-brown">{filtered.length}</span> products
            </p>

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-heading text-2xl text-deep-brown mb-2">Nothing found</p>
                <p className="text-taupe-dark text-sm mb-4">Try a different search or filter.</p>
                <button onClick={clearFilters} className="text-sm text-gold underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          WHY US
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-14 lg:py-28" style={{ backgroundColor: "#FBF0E4" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center gap-10">

            {/* Text */}
            <ScrollReveal>
              <p className="text-gold text-[11px] uppercase tracking-[0.3em] font-body font-semibold mb-3">
                04 — Why Cozi Handmade
              </p>
              <h2 className="font-heading italic text-3xl sm:text-4xl lg:text-5xl font-400 text-deep-brown mb-5 leading-tight">
                The Cozi Standard
              </h2>
              <p className="text-deep-brown/75 leading-relaxed mb-8 text-sm sm:text-base font-medium max-w-md">
                Every piece in this collection is made slowly, by hand — chosen for warmth,
                softness, and the kind of quality that lasts winters, not seasons.
              </p>

              <div className="space-y-6">
                {whyUsFeatures.map(({ label, description, icon }) => (
                  <div key={label} className="flex gap-4">
                    <span className="shrink-0 w-11 h-11 rounded-full bg-gold/10 text-gold
                                     flex items-center justify-center">
                      {icon}
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-deep-brown mb-1">
                        {label}
                      </p>
                      <p className="text-sm text-deep-brown/70 leading-relaxed max-w-sm">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Paired images */}
            <ScrollReveal className="grid grid-cols-2 gap-4">
              <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden aspect-[3/4] shadow-2xl">
                <Image
                  src="/images/our-story.jpg"
                  alt="Handmade Cozi Handmade piece styled in a warm, lived-in home"
                  fill
                  loading="lazy"
                  sizes="(max-width: 1024px) 45vw, 22vw"
                  className="object-cover"
                />
              </div>
              <div className="relative mt-8">
                <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden aspect-[3/4] shadow-2xl">
                  <Image
                    src="/images/backgroundpic.jpg"
                    alt="Close-up of hand-knitted chunky wool texture"
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 45vw, 22vw"
                    className="object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 left-3 bg-cream rounded-lg px-3 py-1.5 shadow-lg border border-taupe/20">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-deep-brown font-semibold">
                    Fig. 02 — Texture
                  </p>
                </div>
              </div>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CUSTOMER STORIES
      ══════════════════════════════════════════════ */}
      <SocialProofSection reviews={reviews} />

      {/* Mobile bottom-sheet filters */}
      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter Products">
        <div className="space-y-6 pb-2">
          <div>
            <h3 className="text-xs uppercase tracking-[0.15em] text-taupe-dark font-medium mb-3">Category</h3>
            <div className="grid grid-cols-2 gap-2">
              <FilterOption label="All" active={selectedCategory === "all"} onToggle={() => setSelectedCategory("all")} count={products.length} />
              {categories.map((c) => (
                <FilterOption
                  key={c.id}
                  label={c.name}
                  active={selectedCategory === c.id}
                  onToggle={() => setSelectedCategory(c.id === selectedCategory ? "all" : c.id)}
                  count={products.filter((p) => p.category === c.id).length}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-[0.15em] text-taupe-dark font-medium mb-3">Price Range</h3>
            <div className="grid grid-cols-2 gap-2">
              {priceRanges.map((r, i) => (
                <FilterOption
                  key={r.label}
                  label={r.label}
                  active={selectedPrice === i}
                  onToggle={() => setSelectedPrice(selectedPrice === i ? null : i)}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-[0.15em] text-taupe-dark font-medium mb-3">Sort By</h3>
            <div className="space-y-2">
              {sortOptions.map((o) => (
                <FilterOption key={o.value} label={o.label} active={sort === o.value} onToggle={() => setSort(o.value)} />
              ))}
            </div>
          </div>
          <button
            onClick={() => setFiltersOpen(false)}
            className="w-full h-14 rounded-2xl bg-gold text-cream font-semibold text-base active:scale-[0.98]"
            style={{ touchAction: "manipulation" }}
          >
            Show {filtered.length} Results
          </button>
          {activeFilterCount > 0 && (
            <button onClick={() => { clearFilters(); setFiltersOpen(false); }} className="w-full text-center text-sm text-taupe-dark underline">
              Clear all filters
            </button>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

export default function ProductsContent({ products, categories, reviews }: { products: Product[]; categories: Category[]; reviews: Review[] }) {
  return (
    <Suspense>
      <ProductsContentInner products={products} categories={categories} reviews={reviews} />
    </Suspense>
  );
}
