"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { whatsappLink } from "@/lib/social-links";

/**
 * Pages with their own full-width sticky bars, where the bottom nav steps
 * aside. Exported because FloatingWhatsApp needs the same answer: the chat
 * lives in this bar as a tab wherever the bar shows, and falls back to the
 * floating bubble wherever it doesn't.
 */
export function isBottomNavHidden(pathname: string): boolean {
  return /^\/products\/[^/]+$/.test(pathname) || pathname.startsWith("/checkout");
}

// Mobile only: Home, Shop, Bag, Chat. Active = burgundy, idle = stone. Sign in /
// account lives in the menu drawer, search in the header.
const ICON = "h-6 w-6 fill-none";

export default function BottomNav() {
  const pathname = usePathname();
  const { itemCount, openCart } = useCart();

  if (isBottomNavHidden(pathname)) return null;

  const homeActive = pathname === "/";
  const shopActive = pathname.startsWith("/products");
  const bagActive = pathname.startsWith("/cart");

  const tab =
    "focus-ring relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 " +
    "transition-transform duration-150 active:scale-95";
  const tone = (on: boolean) => (on ? "text-burgundy" : "text-stone");
  const label = "font-body text-xs font-semibold leading-4";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-cream lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
      // Hidden while the phone keyboard is open (globals.css, KeyboardAware).
      data-bottom-nav
    >
      <div className="flex items-stretch">
        <Link
          href="/"
          className={`${tab} ${tone(homeActive)}`}
          style={{ touchAction: "manipulation" }}
          aria-current={homeActive ? "page" : undefined}
        >
          <svg className={`${ICON} stroke-current`} viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className={label}>Home</span>
        </Link>

        <Link
          href="/products"
          className={`${tab} ${tone(shopActive)}`}
          style={{ touchAction: "manipulation" }}
          aria-current={shopActive ? "page" : undefined}
        >
          {/* Four squares: the standard "browse the catalogue" glyph. */}
          <svg className={`${ICON} stroke-current`} viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
            <rect x="3.25" y="3.25" width="7.5" height="7.5" rx="1.75" />
            <rect x="13.25" y="3.25" width="7.5" height="7.5" rx="1.75" />
            <rect x="3.25" y="13.25" width="7.5" height="7.5" rx="1.75" />
            <rect x="13.25" y="13.25" width="7.5" height="7.5" rx="1.75" />
          </svg>
          <span className={label}>Shop</span>
        </Link>

        {/* Opens the same slide-in bag the header's bag icon opens. */}
        <button
          type="button"
          onClick={openCart}
          className={`${tab} ${tone(bagActive)}`}
          style={{ touchAction: "manipulation" }}
          aria-label={`Bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
        >
          <span className="relative">
            <svg className={`${ICON} stroke-current`} viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-burgundy px-1 font-body text-xs font-bold leading-none text-white">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </span>
          <span className={label}>Bag</span>
        </button>

        {/* WhatsApp chat, docked here rather than floating: a floating bubble
            over a two-column product grid always ends up covering a name or a
            link as the page scrolls. As a tab it can never sit on content. */}
        <a
          href={whatsappLink("Hi! I'd love to ask about a piece from Cozi Handmade ✦")}
          target="_blank"
          rel="noopener noreferrer"
          className={`${tab} text-stone`}
          style={{ touchAction: "manipulation" }}
          aria-label="Chat with us on WhatsApp"
        >
          <svg className={`${ICON} stroke-current`} viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          <span className={label}>Chat</span>
        </a>
      </div>
    </nav>
  );
}
