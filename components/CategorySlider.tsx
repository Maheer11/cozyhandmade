"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/products";

export default function CategorySlider({ categories }: { categories: Category[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index] as HTMLElement | undefined;
    if (card) {
      track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
    }
  }, []);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[0] as HTMLElement | undefined;
    const step = card ? card.offsetWidth + 16 : 300;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  // Track active dot from native scroll position — no re-render-heavy JS loop
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const cards = Array.from(track.children) as HTMLElement[];
        const center = track.scrollLeft + track.offsetWidth / 2;
        let closest = 0;
        let closestDist = Infinity;
        cards.forEach((card, i) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const dist = Math.abs(cardCenter - center);
          if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        setActive(closest);
        ticking = false;
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-smooth
                   lg:mx-0 lg:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.id}`}
            className="group relative rounded-2xl overflow-hidden block shrink-0 snap-center
                       w-[68vw] max-w-[280px] aspect-[4/5]
                       sm:w-[42vw] sm:max-w-[300px]
                       lg:w-[calc((100%-4*1rem)/5)] lg:max-w-none
                       hover:shadow-2xl hover:-translate-y-1
                       transition-all duration-300 ease-out
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{ touchAction: "manipulation" }}
          >
            {cat.image ? (
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                loading="lazy"
                sizes="(max-width: 640px) 68vw, (max-width: 1024px) 42vw, 20vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            ) : (
              <div className="absolute inset-0 bg-cream-darker" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-deep-brown/80 via-deep-brown/15 to-transparent
                            group-hover:from-deep-brown/70 transition-all duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-cream/70 text-[10px] uppercase tracking-[0.2em] font-body mb-1">
                Collection
              </p>
              <h3 className="font-heading italic text-cream font-400 text-lg leading-tight">
                {cat.name}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {/* Arrow controls — desktop */}
      <button
        onClick={() => scrollBy(-1)}
        className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10
                   w-11 h-11 rounded-full bg-cream/90 backdrop-blur-sm border border-taupe/20
                   text-brown items-center justify-center shadow-lg
                   hover:bg-gold hover:text-cream hover:border-gold
                   transition-all duration-200"
        aria-label="Previous categories"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => scrollBy(1)}
        className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10
                   w-11 h-11 rounded-full bg-cream/90 backdrop-blur-sm border border-taupe/20
                   text-brown items-center justify-center shadow-lg
                   hover:bg-gold hover:text-cream hover:border-gold
                   transition-all duration-200"
        aria-label="Next categories"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-5">
        {categories.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i)}
            className={`rounded-full transition-all duration-300 ${
              i === active ? "w-7 h-2 bg-gold" : "w-2 h-2 bg-taupe/30 hover:bg-taupe/50"
            }`}
            aria-label={`Go to category ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
