"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import { itemHref, type FeaturedPieceCardData } from "@/components/FeaturedPiecesSection";

/** How long each product stays up before the next fades in. */
const SLIDE_MS = 5000;

// Media and visibility read through useSyncExternalStore so they are live
// values rather than state copied in an effect.
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

/**
 * The homepage hero photo as a slow showcase of every in-stock product in the
 * collections, each linking to its own page.
 *
 * - One link for the whole photo and its name card; its href and accessible
 *   name follow the product on screen, so a click always opens what you see.
 *   The progress segments and the pause button sit beside the link rather
 *   than inside it, so there is never a control nested in a link.
 * - The flow is driven by the active segment's fill animation: when it
 *   finishes, the next product fades in. Pausing just pauses that animation,
 *   so the bar and the photo can never drift apart.
 * - It pauses on hover, while anything in it has keyboard focus, while the tab
 *   is hidden, and from the pause button. Under reduced motion it doesn't
 *   rotate at all; the segments still switch products by hand.
 * - Only products already shown, plus the next one, have their <img> rendered,
 *   so the page loads the first photo and one ahead rather than all of them.
 *
 * A client component because the price follows the visitor's currency and the
 * rotation is interactive; app/page.tsx supplies the products.
 */
export default function HeroProductCarousel({
  items,
  frameClassName,
}: {
  items: FeaturedPieceCardData[];
  /** Size and aspect ratio of the frame, owned by the hero layout. */
  frameClassName: string;
}) {
  const { formatAmount } = useCurrency();
  const count = items.length;

  const [index, setIndex] = useState(0);
  const [rendered, setRendered] = useState<ReadonlySet<number>>(() => new Set([0]));
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set());
  const [pausedByUser, setPausedByUser] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
  const pageVisible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true
  );

  const next = (index + 1) % count;
  const autoplay = count > 1 && !reducedMotion;
  // The bar only runs once the photo on screen has actually arrived, so a slow
  // image never gets skipped before anyone has seen it.
  const running = autoplay && !pausedByUser && !hovering && !focusInside && pageVisible && loaded.has(index);

  const show = useCallback((i: number) => {
    setIndex(i);
    setRendered((r) => (r.has(i) ? r : new Set(r).add(i)));
  }, []);

  const markLoaded = (i: number) => setLoaded((l) => (l.has(i) ? l : new Set(l).add(i)));

  const onSegmentKey = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const target = (i + step + count) % count;
    show(target);
    segmentRefs.current[target]?.focus();
  };

  const current = items[index];
  const payPrice = current.discount_price ?? current.price;
  const firstPhotoReady = loaded.size > 0;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Products from our collections"
      className={`relative ${frameClassName}`}
      // Mouse only: on touch screens a tap fires an emulated hover with no
      // matching leave, which would leave the slideshow stuck paused.
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHovering(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHovering(false); }}
      onFocus={() => setFocusInside(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusInside(false);
      }}
    >
      <Link
        href={itemHref(current)}
        aria-label={`Shop ${current.name}, ${formatAmount(payPrice)}`}
        className="focus-ring group absolute inset-0 block cursor-pointer overflow-hidden rounded-card bg-ui-surface"
      >
        {items.map((item, i) =>
          rendered.has(i) || (autoplay && i === next) ? (
            <Image
              key={`${item.source}-${item.id}`}
              src={item.product_image}
              alt=""
              fill
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              sizes="(min-width: 1280px) 560px, (min-width: 1024px) 44vw, 100vw"
              onLoad={() => markLoaded(i)}
              onError={() => markLoaded(i)}
              className={`object-cover ease-out group-hover:scale-[1.02] motion-reduce:group-hover:scale-100
                          ${i === index ? "opacity-100" : "opacity-0"}`}
              style={{ transitionProperty: "opacity, scale", transitionDuration: "700ms, 400ms" }}
            />
          ) : null
        )}

        {/* Soft shade behind the progress bar so the white segments read on
            light photos; purely decorative. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent"
        />

        {/* Name card: 12px in on phones, 16px from sm. It enters once when the
            first photo arrives; after that only its text crossfades, keyed to
            the product, so the card itself stays put. */}
        <span
          className={`absolute bottom-3 left-3 max-w-[60%] sm:bottom-4 sm:left-4
                      rounded-card border border-ui-border bg-ui-surface px-2.5 py-2 sm:px-4 sm:py-2.5
                      text-ui-text shadow-[0_6px_20px_-6px_rgba(26,8,16,0.35)]
                      transition-[translate] duration-200 ease-out group-hover:-translate-y-0.5
                      motion-reduce:transition-none motion-reduce:group-hover:translate-y-0
                      motion-reduce:opacity-100
                      ${firstPhotoReady ? "animate-hero-label" : "opacity-0"}`}
        >
          <span key={index} className="block animate-fade-in">
            <span className="font-heading text-[15px] font-medium leading-snug sm:text-lg">{current.name}</span>{" "}
            <span className="whitespace-nowrap font-body text-[13px] font-semibold leading-snug sm:text-sm">
              {formatAmount(payPrice)}
              {current.discount_price && (
                <span className="ml-1.5 font-normal text-ui-muted line-through">{formatAmount(current.price)}</span>
              )}
              <span
                aria-hidden="true"
                className="ml-1.5 inline-block transition-[translate] duration-200 ease-out group-hover:translate-x-1
                           motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              >
                →
              </span>
            </span>
          </span>
        </span>
      </Link>

      {count > 1 && (
        <div className="absolute inset-x-3 top-2 z-10 flex items-center gap-2 sm:inset-x-4 sm:top-3">
          {/* One segment per product: past ones full, the current one filling
              over SLIDE_MS, later ones empty. Roving tabindex, so the whole row
              is one tab stop and the arrow keys move along it. */}
          <div className="flex flex-1 gap-1" role="group" aria-label="Choose a product">
            {items.map((item, i) => (
              <button
                key={`${item.source}-${item.id}`}
                ref={(el) => { segmentRefs.current[i] = el; }}
                type="button"
                tabIndex={i === index ? 0 : -1}
                aria-label={`Show ${item.name}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => show(i)}
                onKeyDown={(e) => onSegmentKey(e, i)}
                className="focus-ring flex h-6 flex-1 cursor-pointer items-center rounded-button"
              >
                <span className="block h-[3px] w-full overflow-hidden rounded-full bg-white/45">
                  {i === index && autoplay && loaded.has(index) ? (
                    <span
                      key={index}
                      className="animate-hero-progress block h-full origin-left rounded-full bg-white"
                      style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: running ? "running" : "paused" }}
                      onAnimationEnd={() => show(next)}
                    />
                  ) : (
                    <span
                      className={`block h-full rounded-full bg-white ${i < index || (i === index && !autoplay) ? "w-full" : "w-0"}`}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>

          {autoplay && (
            <button
              type="button"
              onClick={() => setPausedByUser((p) => !p)}
              aria-label={pausedByUser ? "Play slideshow" : "Pause slideshow"}
              className="focus-ring grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-black/35 text-white
                         transition-colors duration-150 hover:bg-black/50"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
                {pausedByUser ? <path d="M8 5.14v13.72L19 12 8 5.14z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
