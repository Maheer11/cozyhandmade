"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import BottomSheet from "@/components/BottomSheet";
import type { Product, Category } from "@/lib/products";

const priceRanges = [
  { label: "Under ₦50k",     min: 0,      max: 50_000    },
  { label: "₦50k – ₦150k",  min: 50_000, max: 150_000   },
  { label: "₦150k – ₦300k", min: 150_000, max: 300_000  },
  { label: "Over ₦300k",    min: 300_000, max: Infinity  },
];

const sortOptions = [
  { value: "featured",   label: "Featured" },
  { value: "price-asc",  label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "rating",     label: "Highest Rated" },
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
                    ? "bg-terracotta text-cream border-terracotta"
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

function ProductsContentInner({ products, categories }: { products: Product[]; categories: Category[] }) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "all";

  const [query,            setQuery]           = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedPrice,    setSelectedPrice]    = useState<number | null>(null);
  const [sort,             setSort]             = useState("featured");
  const [filtersOpen,      setFiltersOpen]      = useState(false);

  useEffect(() => {
    setSelectedCategory(searchParams.get("category") ?? "all");
  }, [searchParams]);

  const activeFilterCount =
    (selectedCategory !== "all" ? 1 : 0) + (selectedPrice !== null ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...products];
    if (query.trim()) {
      const q = query.toLowerCase();
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
  }, [query, selectedCategory, selectedPrice, sort, products]);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedPrice(null);
    setQuery("");
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Page header */}
      <div className="bg-cream-dark border-b border-taupe/20 border-t-[3px] border-t-brown-light
                      px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
        <div className="max-w-7xl mx-auto">
          <p className="text-terracotta text-[10px] uppercase tracking-[0.2em] font-medium mb-1">
            Handcrafted goods
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-700 text-deep-brown
                         border-l-[3px] border-l-brown-light/50 pl-3">
            All Products
          </h1>
        </div>
      </div>

      {/* Search + toolbar */}
      <div className="sticky top-14 z-30 bg-cream/95 backdrop-blur-md border-b border-taupe/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe-dark pointer-events-none"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-cream-dark border border-taupe/30 text-sm
                         text-deep-brown placeholder:text-taupe-dark
                         focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                         transition-all duration-200"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe-dark active:text-brown"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltersOpen(true)}
            className={`lg:hidden relative flex items-center gap-1.5 h-10 px-3 rounded-xl border
                        text-sm font-medium transition-colors duration-150 shrink-0
                        ${activeFilterCount > 0
                          ? "bg-terracotta text-cream border-terracotta"
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
              <span className="w-4 h-4 bg-cream text-terracotta text-[9px] font-bold
                               rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 px-2 rounded-xl bg-cream-dark border border-taupe/30 text-sm text-brown
                       focus:outline-none focus:border-gold transition-all duration-200
                       cursor-pointer shrink-0"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {activeFilterCount > 0 && (
          <div className="px-4 sm:px-6 lg:px-8 pb-2 flex gap-2 overflow-x-auto">
            {selectedCategory !== "all" && (
              <button
                onClick={() => setSelectedCategory("all")}
                className="flex items-center gap-1 px-3 py-1 bg-terracotta/10 text-terracotta
                           rounded-full text-xs font-medium whitespace-nowrap"
              >
                {categories.find((c) => c.id === selectedCategory)?.name ?? selectedCategory}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {selectedPrice !== null && (
              <button
                onClick={() => setSelectedPrice(null)}
                className="flex items-center gap-1 px-3 py-1 bg-terracotta/10 text-terracotta
                           rounded-full text-xs font-medium whitespace-nowrap"
              >
                {priceRanges[selectedPrice].label}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button onClick={clearFilters} className="px-3 py-1 text-xs text-taupe-dark whitespace-nowrap">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8">
        <div className="flex gap-8 items-start">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 shrink-0 sticky top-40">
            <div className="bg-white rounded-2xl border border-cream-darker border-l-[3px] border-l-brown-light/40 p-5 shadow-sm">
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
                  className="mt-4 w-full text-center text-xs text-terracotta underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-taupe-dark mb-4">
              <span className="font-medium text-brown">{filtered.length}</span> products
            </p>

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-heading text-2xl text-deep-brown mb-2">Nothing found</p>
                <p className="text-taupe-dark text-sm mb-4">Try a different search or filter.</p>
                <button onClick={clearFilters} className="text-sm text-terracotta underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
            className="w-full h-14 rounded-2xl bg-terracotta text-cream font-semibold text-base active:scale-[0.98]"
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

export default function ProductsContent({ products, categories }: { products: Product[]; categories: Category[] }) {
  return (
    <Suspense>
      <ProductsContentInner products={products} categories={categories} />
    </Suspense>
  );
}
