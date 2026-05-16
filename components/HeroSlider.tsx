"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

const slides = [
  {
    src: "/images/backgroundpic.jpg",
    alt: "Woven with Love — artisan craftsmanship",
  },
  {
    src: "/images/hero-slide-1.jpg",
    alt: "Hand-knitted chunky blanket collection",
  },
  { src: "/images/hero-slide-2.jpg", alt: "Artisan wool throw — gift-wrapped" },
  { src: "/images/hero-slide-3.jpg", alt: "Premium handmade knit textures" },
  { src: "/images/tbck3.jpg", alt: "Handcrafted baby knits and accessories" },
];

const LAST = slides.length - 1;

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRef   = useRef(0);          // mirrors state — safe to read in callbacks
  const directionRef = useRef<1 | -1>(1);  // 1 = forward, -1 = backward
  const touchStartX  = useRef<number>(0);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      // Read and write refs directly — never mutate inside a setState updater
      const next = Math.max(0, Math.min(LAST, currentRef.current + directionRef.current));
      if (next >= LAST) directionRef.current = -1;
      else if (next <= 0) directionRef.current = 1;
      currentRef.current = next;
      setCurrent(next);
    }, 5000);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startAutoPlay]);

  const go = useCallback(
    (index: number) => {
      if (index >= LAST) directionRef.current = -1;
      else if (index <= 0) directionRef.current = 1;
      currentRef.current = index;
      setCurrent(index);
      startAutoPlay();
    },
    [startAutoPlay]
  );

  const prev = useCallback(() => go((currentRef.current - 1 + slides.length) % slides.length), [go]);
  const next = useCallback(() => go((currentRef.current + 1) % slides.length), [go]);

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-deep-brown group"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 45) diff > 0 ? next() : prev();
      }}
    >
      {/* ── Slides track ── */}
      <div
        className="flex h-full will-change-transform"
        style={{
          transform: `translateX(-${current * 100}%)`,
          transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {slides.map((slide, i) => (
          <div key={slide.src} className="relative min-w-full h-full shrink-0">
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="100vw"
              className="object-cover"
              priority={i === 0}
              loading={i === 0 ? undefined : "lazy"}
            />
          </div>
        ))}
      </div>

      {/* ── Left arrow ── */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20
                   w-11 h-11 rounded-full
                   bg-deep-brown/55 backdrop-blur-sm
                   border border-cream/25 text-cream
                   flex items-center justify-center
                   opacity-80 hover:opacity-100
                   hover:bg-gold hover:border-gold
                   transition-all duration-200 shadow-lg"
        aria-label="Previous image"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ── Right arrow ── */}
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20
                   w-11 h-11 rounded-full
                   bg-deep-brown/55 backdrop-blur-sm
                   border border-cream/25 text-cream
                   flex items-center justify-center
                   opacity-80 hover:opacity-100
                   hover:bg-gold hover:border-gold
                   transition-all duration-200 shadow-lg"
        aria-label="Next image"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ── Slide counter — top right ── */}
      <div className="absolute top-4 right-4 z-20
                      bg-deep-brown/55 backdrop-blur-sm
                      rounded-full px-3 py-1 border border-cream/20">
        <span className="text-cream text-[11px] font-body font-medium tabular-nums">
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>

      {/* ── Dot indicators — bottom centre ── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current ? "w-7 h-2 bg-gold" : "w-2 h-2 bg-cream/50 hover:bg-cream/80"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
