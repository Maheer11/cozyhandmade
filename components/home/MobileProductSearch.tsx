"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/lib/currency/CurrencyContext";
import { whatsappLink } from "@/lib/social-links";

export interface SearchItem {
  id: string;
  name: string;
  image: string;
  price: number;
  wasPrice: number | null;
  /** Category id (as stored) and its display name, both searchable. */
  category: string;
  categoryName: string;
  tags: string[];
  soldOut: boolean;
}

const MAX_RESULTS = 6;
// Space kept clear between the results and the top of the on-screen keyboard.
const KEYBOARD_GAP_PX = 12;
// Never shrink the results below about two rows, even on a tiny screen.
const MIN_PANEL_PX = 140;

/**
 * Phone homepage search: results appear under the bar as the customer types,
 * matching name, tags and category like the shop page's own search
 * (ProductsContent). Enter, or "See all", opens the shop with the same query.
 */
export default function MobileProductSearch({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [query, setQuery] = useState("");
  // Deferred so typing never waits on filtering.
  const deferredQuery = useDeferredValue(query);
  const q = deferredQuery.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return [];
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [items, q]);

  const shopHref = `/products?q=${encodeURIComponent(query.trim())}`;

  // ── Keep results above the on-screen keyboard ──────────────────────────
  // The keyboard covers roughly the bottom half of a phone screen, and this
  // bar sits a third of the way down the page, so results used to land
  // behind it. On focus the page scrolls the bar to the top of the screen,
  // and the results panel is capped to the space between the bar and the
  // keyboard (visualViewport is the part of the page the keyboard leaves
  // visible), scrolling inside itself when there are more results.
  const formRef = useRef<HTMLFormElement>(null);
  const [panelMaxPx, setPanelMaxPx] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);

  const fitPanelToKeyboard = useCallback(() => {
    const form = formRef.current;
    const viewport = window.visualViewport;
    if (!form || !viewport) return;
    let visibleBottom = viewport.offsetTop + viewport.height;
    // On phones where the keyboard shrinks the page (most Android browsers)
    // the fixed bottom tab bar sits just above the keyboard, so stop above it.
    const tabBar = document.querySelector('nav[aria-label="Primary"]');
    const tabBarTop = tabBar?.getBoundingClientRect().top;
    if (tabBarTop !== undefined && tabBarTop > 0 && tabBarTop < visibleBottom) visibleBottom = tabBarTop;
    const space = visibleBottom - form.getBoundingClientRect().bottom - KEYBOARD_GAP_PX - 8;
    setPanelMaxPx(Math.max(MIN_PANEL_PX, Math.floor(space)));
  }, []);

  useEffect(() => {
    if (!focused) return;
    const viewport = window.visualViewport;
    // The keyboard opens over ~300ms and the page scroll below runs alongside
    // it, so measure again whenever the visible area changes.
    viewport?.addEventListener("resize", fitPanelToKeyboard);
    viewport?.addEventListener("scroll", fitPanelToKeyboard);
    window.addEventListener("scroll", fitPanelToKeyboard, { passive: true });
    return () => {
      viewport?.removeEventListener("resize", fitPanelToKeyboard);
      viewport?.removeEventListener("scroll", fitPanelToKeyboard);
      window.removeEventListener("scroll", fitPanelToKeyboard);
    };
  }, [focused, fitPanelToKeyboard]);

  function handleFocus() {
    setFocused(true);
    // Wait for the keyboard to start opening (the browser does its own
    // scroll-into-view first), then bring the bar to the top of the screen.
    window.setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: window.scrollY + form.getBoundingClientRect().top - KEYBOARD_GAP_PX,
        behavior: reduceMotion ? "auto" : "smooth",
      });
      fitPanelToKeyboard();
    }, 250);
  }

  return (
    <div>
      <form
        ref={formRef}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) router.push(shopHref);
        }}
        className="flex h-12 items-center gap-3 rounded-full border border-ui-border bg-ui-surface px-4
                   shadow-[0_6px_18px_-12px_rgba(26,8,16,0.4)] focus-within:border-ui-accent/60"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 text-ui-accent"
             fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        <label htmlFor="home-search" className="sr-only">Search products</label>
        <input
          id="home-search"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
          onFocus={handleFocus}
          onBlur={() => setFocused(false)}
          placeholder="Search blankets, bags, baby gifts…"
          // 16px: iOS zooms the page when focusing any smaller input.
          className="min-w-0 flex-1 bg-transparent font-body text-base text-ui-text placeholder:text-ui-muted
                     focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="focus-ring -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ui-muted
                       active:bg-ui-border/60"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor"
                 strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </form>

      {q && (
        <div aria-live="polite"
             // overscroll-contain: scrolling the list doesn't scroll the page behind it.
             className="mt-2 overflow-y-auto overscroll-contain rounded-2xl border border-ui-border bg-ui-surface
                        shadow-[0_14px_30px_-18px_rgba(26,8,16,0.45)]"
             style={panelMaxPx ? { maxHeight: panelMaxPx } : undefined}>
          {matches.length === 0 ? (
            <div className="px-4 py-4 font-body text-sm text-ui-muted">
              <p>No pieces match &ldquo;{deferredQuery.trim()}&rdquo;.</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Link href="/products" className="focus-ring rounded-button font-medium text-ui-accent">
                  Browse all pieces
                </Link>
                <a href={whatsappLink(`Hi! I'm looking for "${deferredQuery.trim()}". Do you make this?`)}
                   target="_blank" rel="noopener noreferrer"
                   className="focus-ring rounded-button font-medium text-ui-accent">
                  Ask us on WhatsApp
                </a>
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-ui-border">
                {matches.slice(0, MAX_RESULTS).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/products/${item.id}`}
                      className="focus-ring flex items-center gap-3 px-3 py-2.5 transition-colors duration-100
                                 active:bg-ui-bg"
                      style={{ touchAction: "manipulation" }}
                    >
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-dark">
                        <Image src={item.image} alt="" fill sizes="48px"
                               className={`object-cover ${item.soldOut ? "opacity-60" : ""}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-body text-sm font-medium text-ui-text">{item.name}</span>
                        <span className="block truncate font-body text-xs text-ui-muted">{item.categoryName}</span>
                      </span>
                      <span className="shrink-0 text-right font-body text-sm">
                        {item.soldOut ? (
                          <span className="text-xs font-medium text-ui-muted">Sold out</span>
                        ) : (
                          <>
                            <span className="block font-semibold text-ui-text">{formatAmount(item.price)}</span>
                            {item.wasPrice && (
                              <span className="block text-xs text-ui-muted line-through">
                                <span className="sr-only">Was </span>{formatAmount(item.wasPrice)}
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {matches.length > MAX_RESULTS && (
                <Link href={shopHref}
                      className="focus-ring flex h-11 items-center justify-center border-t border-ui-border
                                 font-body text-sm font-semibold text-ui-accent active:bg-ui-bg">
                  See all {matches.length} results →
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
