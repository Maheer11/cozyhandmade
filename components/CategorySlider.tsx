"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/products";

/** How long a card rests before the row advances to the next one. */
const AUTOPLAY_INTERVAL_MS = 3800;
/** Idle time after a visitor interacts before autoplay picks up again. */
const AUTOPLAY_RESUME_MS = 7000;

export default function CategorySlider({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  /** Currently filtered category id, so the matching card can read as chosen. */
  selected?: string;
  /**
   * When given, a card filters in place instead of navigating. The href stays
   * on the anchor so the card is still a real, shareable link.
   */
  onSelect?: (categoryId: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [overflowing, setOverflowing] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Arrows and dots only make sense when the track actually scrolls —
  // with few categories everything fits and the controls just dangle.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const check = () => setOverflowing(track.scrollWidth > track.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

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

  // Refs, not state: these gate the autoplay tick and shouldn't re-render the
  // track every time a pointer crosses it or the section scrolls into view.
  const hovering = useRef(false);
  const resumeAt = useRef(0);
  const inView = useRef(true);

  /** Hand control to the visitor: no autoplay until they've been idle again. */
  const holdAutoplay = useCallback(() => {
    resumeAt.current = Date.now() + AUTOPLAY_RESUME_MS;
  }, []);

  // Mouse drag-to-scroll. Touch already scrolls natively, so this only takes
  // over for `pointerType === "mouse"`; otherwise it would fight the browser's
  // own touch panning. `moved` lets a drag that ends on a card swallow the
  // click instead of navigating.
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (e: ReactPointerEvent) => {
    // Clear first: on a hybrid device a stale `moved` from an earlier mouse
    // drag would otherwise swallow the next tap.
    drag.current.moved = false;
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = { active: true, startX: e.clientX, startLeft: track.scrollLeft, moved: false };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    track.scrollLeft = drag.current.startLeft - dx;
  };

  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    holdAutoplay();
  };

  // ── Autoplay ────────────────────────────────────────────────────────────
  // The row advances on its own so the collections are seen without anyone
  // having to swipe. Anything the visitor does — swiping, dragging, an arrow,
  // a dot, hovering — hands control back to them via holdAutoplay(); it only
  // resumes once they've been idle again.
  useEffect(() => {
    // Nothing to advance through if every card already fits, and a moving
    // carousel is exactly what "reduce motion" is asking us not to do.
    if (!overflowing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      if (hovering.current || drag.current.active) return;
      // Off-screen or a background tab: advancing there only means the visitor
      // scrolls back to a row that silently moved on without them.
      if (!inView.current || document.hidden) return;
      if (Date.now() < resumeAt.current) return;

      // Within a pixel of the end, loop back to the first card.
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
      if (atEnd) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const card = track.children[0] as HTMLElement | undefined;
      const step = card ? card.offsetWidth + 16 : 300;
      track.scrollBy({ left: step, behavior: "smooth" });
    }, AUTOPLAY_INTERVAL_MS);

    const track = trackRef.current;
    const io = track
      ? new IntersectionObserver(([entry]) => { inView.current = entry.isIntersecting; }, { threshold: 0.2 })
      : null;
    if (track && io) io.observe(track);

    return () => {
      window.clearInterval(id);
      io?.disconnect();
    };
  }, [overflowing]);

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
        onPointerDown={(e) => { holdAutoplay(); onPointerDown(e); }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") hovering.current = true; }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") hovering.current = false;
          endDrag();
        }}
        onTouchStart={holdAutoplay}
        onWheel={holdAutoplay}
        onFocus={() => { hovering.current = true; }}
        onBlur={() => { hovering.current = false; }}
        className={`flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-smooth
                   lg:mx-0 lg:px-0 ${dragging ? "cursor-grabbing select-none" : "lg:cursor-grab"}`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          // Mandatory snapping re-snaps every frame while we drive scrollLeft
          // by hand, which makes a mouse drag stutter. Off for the drag only.
          ...(dragging ? { scrollSnapType: "none", scrollBehavior: "auto" } : null),
        }}
      >
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.id}`}
            draggable={false}
            onClick={(e) => {
              if (drag.current.moved) {
                e.preventDefault();
                return;
              }
              if (onSelect) {
                e.preventDefault();
                onSelect(cat.id);
              }
            }}
            aria-current={selected === cat.id ? "true" : undefined}
            className={`group relative rounded-2xl overflow-hidden block shrink-0 snap-center
                       w-[68vw] max-w-[280px] aspect-[4/5]
                       sm:w-[42vw] sm:max-w-[300px]
                       lg:w-[calc((100%-4*1rem)/5)] lg:max-w-none
                       hover:shadow-2xl hover:-translate-y-1
                       transition-all duration-300 ease-out
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold
                       ${selected === cat.id ? "ring-2 ring-gold ring-offset-2 ring-offset-cream-dark" : ""}`}
            style={{ touchAction: "manipulation" }}
          >
            {cat.image ? (
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                draggable={false}
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

      {/* Arrow controls — desktop, only when there's something to scroll to */}
      {overflowing && (
      <>
      <button
        onClick={() => { holdAutoplay(); scrollBy(-1); }}
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
        onClick={() => { holdAutoplay(); scrollBy(1); }}
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
            onClick={() => { holdAutoplay(); scrollToIndex(i); }}
            className={`rounded-full transition-all duration-300 ${
              i === active ? "w-7 h-2 bg-gold" : "w-2 h-2 bg-taupe/30 hover:bg-taupe/50"
            }`}
            aria-label={`Go to category ${i + 1}`}
          />
        ))}
      </div>
      </>
      )}
    </div>
  );
}
