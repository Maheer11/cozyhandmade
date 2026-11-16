"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import { itemHref, type FeaturedPieceCardData } from "@/components/FeaturedPiecesSection";
import { likeKey, type LikeSource } from "@/lib/likes";

export interface HeroCarouselItem {
  card: FeaturedPieceCardData;
  categoryId: string;
  categoryName: string;
}

/**
 * Phone/tablet hero (below lg). Desktop keeps HeroProductCarousel.
 *
 * Modelled on the owner's reference (2026-11-15): category tabs (All, Baby,
 * Handbags…) above a centre-focus carousel — one large card centred, the
 * neighbours peeking in smaller. Each card: price pill top-left, a heart with
 * its like count top-right, name + category on a dark fade at the bottom.
 *
 * Rules (docs/DESIGN.md §5): it NEVER moves on its own (swipe, tap a side
 * card to centre it, or the dots). Likes are one per device and stored in
 * Supabase (app/api/likes, migration 017); the device only remembers its own
 * id and which items it liked.
 */
export default function HeroMobileCarousel({
  items,
  categories,
  initialLikes,
}: {
  items: HeroCarouselItem[];
  /** Tab order. Only categories with at least one item are shown. */
  categories: { id: string; name: string }[];
  initialLikes: Record<string, number>;
}) {
  const { formatAmount } = useCurrency();
  const ref = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [counts, setCounts] = useState<Record<string, number>>(initialLikes);
  const liked = useLikedSet();

  const tabs = useMemo(
    () => categories.filter((c) => items.some((i) => i.categoryId === c.id)),
    [categories, items],
  );
  const shown = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.categoryId === filter)),
    [items, filter],
  );

  // The centred card: the one whose middle is nearest the scroller's middle.
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Subscription to the scroller: state is only set from its callbacks.
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const goTo = (i: number) => {
    const el = ref.current;
    const target = el?.children[i] as HTMLElement | undefined;
    if (!el || !target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const chooseFilter = (id: string) => {
    setFilter(id);
    setActive(0);
    ref.current?.scrollTo({ left: 0 });
  };

  const toggleLike = async (source: LikeSource, id: string) => {
    const key = likeKey(source, id);
    const nowLiked = !liked.has(key);
    // Optimistic: flip the heart and the number straight away, then settle on
    // the server's total (or undo if the server couldn't save it).
    writeLiked(key, nowLiked);
    setCounts((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) + (nowLiked ? 1 : -1)) }));
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, id, deviceId: deviceId(), liked: nowLiked }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { count: number };
      setCounts((c) => ({ ...c, [key]: data.count }));
    } catch {
      writeLiked(key, !nowLiked);
      setCounts((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) + (nowLiked ? -1 : 1)) }));
    }
  };

  const count = shown.length;

  return (
    <div role="region" aria-roledescription="carousel" aria-label="In-stock pieces">
      {/* Owner's wording, styled like the reference's "Made this week, by
          hand": bold milk, then a light peach. 24px counts as large text, so
          peach on orange (4.47:1) passes AA here; it would fail if smaller. */}
      <p className="font-heading text-2xl leading-8 text-milk">
        <span className="font-semibold">Cozi Handmade</span>{" "}
        <span className="font-light text-peach">in Ireland</span>
      </p>

      {/* Category tabs: a sideways-scrolling row, like the reference. */}
      {tabs.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 overflow-x-auto px-4">
          <div className="flex w-max gap-2" role="group" aria-label="Filter by category">
            {[{ id: "all", name: "All" }, ...tabs].map((t) => {
              const on = filter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => chooseFilter(t.id)}
                  aria-pressed={on}
                  className={`focus-ring min-h-11 shrink-0 rounded-pill px-5 font-body text-sm font-semibold transition-colors duration-150 ${
                    on ? "bg-milk text-brown" : "bg-brown/25 text-milk"
                  }`}
                  style={{ touchAction: "manipulation" }}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ul
        ref={ref}
        // Full-bleed (cancels the page's 16px padding) with 14vw of padding
        // each side, so the first and last cards can sit in the centre too.
        className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto px-[14vw] py-2"
      >
        {shown.map(({ card, categoryName }, i) => {
          const source: LikeSource = card.source ?? "featured_piece";
          const key = likeKey(source, card.id);
          const isLiked = liked.has(key);
          const likes = counts[key] ?? 0;
          const payPrice = card.discount_price ?? card.price;
          const isActive = i === active;
          return (
            <li
              key={key}
              className={`relative w-[72vw] max-w-[25rem] shrink-0 snap-center transition-transform duration-300 ease-out motion-reduce:transition-none ${
                isActive ? "scale-100" : "scale-[0.86]"
              }`}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
            >
              <Link
                href={itemHref(card)}
                aria-label={`${card.name}, ${formatAmount(payPrice)}`}
                // A side card first comes to the centre; the centred one opens.
                onClick={(e) => {
                  if (!isActive) {
                    e.preventDefault();
                    goTo(i);
                  }
                }}
                className="focus-ring relative block aspect-[3/4] overflow-hidden rounded-block bg-brown/20 shadow-soft"
              >
                <Image
                  src={card.product_image}
                  alt=""
                  fill
                  // Pixel sizes, not "72vw": with vw, Next assumes a ≥640px
                  // screen and never offers files under ~460px, so phones
                  // downloaded the 640px file (3–5× the bytes). Cards are at
                  // most 310px wide below 640px, 400px above. Quality 60
                  // keeps the LCP photo light (phase 10 measurement).
                  sizes="(min-width: 640px) 400px, 310px"
                  quality={60}
                  // Only the centred first card is urgent; an eager second
                  // card became a second preload competing with it.
                  preload={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="object-cover"
                />
                {/* Dark fade so the milk name reads on any photo. */}
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-brown/90 via-brown/45 to-transparent" />
                <span aria-hidden="true" className="absolute inset-x-4 bottom-4">
                  <span className="block line-clamp-2 font-heading text-xl font-semibold leading-6 text-milk">
                    {card.name}
                  </span>
                  <span className="mt-1 block truncate font-body text-sm text-milk">
                    {categoryName}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="absolute left-3 top-3 rounded-pill bg-white px-3 py-1.5 font-body text-sm font-semibold text-brown shadow-soft"
                >
                  {formatAmount(payPrice)}
                </span>
              </Link>

              {/* Heart: a sibling of the link (a button can't sit inside a link). */}
              <button
                type="button"
                onClick={() => toggleLike(source, card.id)}
                aria-pressed={isLiked}
                aria-label={`${isLiked ? "Unlike" : "Like"} ${card.name}${likes ? `, ${likes} ${likes === 1 ? "like" : "likes"}` : ""}`}
                className="focus-ring absolute right-3 top-3 flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill bg-white/90 px-3 text-brown shadow-soft backdrop-blur-sm transition-transform duration-100 active:scale-90"
                style={{ touchAction: "manipulation" }}
              >
                <svg
                  className={`h-5 w-5 ${isLiked ? "fill-burgundy text-burgundy" : "fill-none text-brown"}`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1z" />
                </svg>
                {likes > 0 && <span className="font-body text-sm font-semibold tabular-nums">{likes}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Position: dots for a short row, "3 / 12" when dots would crowd. */}
      {count > 1 &&
        (count <= 8 ? (
          <div className="mt-1 flex justify-center">
            {shown.map(({ card }, i) => (
              <button
                key={`dot-${card.source}-${card.id}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show piece ${i + 1} of ${count}`}
                aria-current={i === active ? "true" : undefined}
                className="focus-ring flex h-11 w-7 items-center justify-center rounded-pill"
                style={{ touchAction: "manipulation" }}
              >
                <span
                  className={`block h-2 rounded-pill transition-all duration-200 motion-reduce:transition-none ${
                    i === active ? "w-5 bg-milk" : "w-2 bg-milk/50"
                  }`}
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-center font-body text-sm font-semibold text-milk" aria-live="polite">
            {active + 1} / {count}
          </p>
        ))}
    </div>
  );
}

/* ── This device's likes (browser storage, wrapped in try/catch) ─────────── */

const LIKED_KEY = "cozi_liked";
const DEVICE_KEY = "cozi_device_id";
const LIKED_EVENT = "cozi-liked-change";
const EMPTY = "[]";

function readLikedRaw(): string {
  try {
    return localStorage.getItem(LIKED_KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeLiked(key: string, on: boolean) {
  try {
    const set = new Set<string>(JSON.parse(readLikedRaw()));
    if (on) set.add(key);
    else set.delete(key);
    localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
  } catch {
    /* storage blocked: the heart still works for this visit via the server count */
  }
  window.dispatchEvent(new Event(LIKED_EVENT));
}

function subscribeLiked(onChange: () => void) {
  window.addEventListener(LIKED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LIKED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Which items this device has liked. Empty on the server and first paint. */
function useLikedSet(): Set<string> {
  const raw = useSyncExternalStore(subscribeLiked, readLikedRaw, () => EMPTY);
  return useMemo(() => {
    try {
      const arr = JSON.parse(raw);
      return new Set<string>(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set<string>();
    }
  }, [raw]);
}

/** A random id for this browser (not personal data); one like per item per id. */
function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    // No storage: a fresh id each time. The table still blocks double-counting
    // within one id, and the rate limit caps abuse.
    return crypto.randomUUID();
  }
}
