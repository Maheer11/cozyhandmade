"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";
import { whatsappLink } from "@/lib/social-links";
import { useCart } from "@/components/CartContext";

/**
 * Pages with their own full-width sticky bars, where the bottom nav steps
 * aside. Exported because FloatingWhatsApp needs the same answer: the chat
 * lives in this bar as a tab wherever the bar shows, and falls back to the
 * floating bubble wherever it doesn't.
 */
export function isBottomNavHidden(pathname: string): boolean {
  return /^\/products\/[^/]+$/.test(pathname) || pathname.startsWith("/checkout");
}

export default function BottomNav() {
  const pathname  = usePathname();
  const { user }  = useAuth();
  const { itemCount, openCart } = useCart();

  if (isBottomNavHidden(pathname)) return null;

  const accountHref  = user ? "/account" : "/auth/login";
  const accountActive = pathname.startsWith("/account") || pathname.startsWith("/auth");

  const tabs: {
    href: string;
    label: string;
    active: boolean;
    /** Opens outside the site (WhatsApp) — a plain <a> in a new tab. */
    external?: boolean;
    /** A button, not a link (the cart opens a drawer, not a page). */
    onClick?: () => void;
    badge?: number;
    icon: (on: boolean) => React.ReactNode;
  }[] = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
      icon: (on: boolean) => (
        <svg className={`w-6 h-6 ${on ? "fill-gold" : "fill-none stroke-taupe-dark"}`}
             viewBox="0 0 24 24" strokeWidth={1.8}>
          {on
            ? <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />}
        </svg>
      ),
    },
    {
      href: "/products",
      label: "Shop",
      active: pathname.startsWith("/products"),
      // A four-square grid — the standard "browse the catalogue" glyph.
      // Replaces a detailed storefront (awning + door + window) whose strokes
      // collapsed into a smudge at 24px in the pill. Deliberately not a bag:
      // that reads as "my cart", and the header's cart icon is right there.
      icon: (on: boolean) => (
        <svg className={`w-6 h-6 ${on ? "stroke-gold" : "stroke-taupe-dark"} fill-none`}
             viewBox="0 0 24 24" strokeWidth={1.8}>
          <rect x="3.25"  y="3.25"  width="7.5" height="7.5" rx="1.75" />
          <rect x="13.25" y="3.25"  width="7.5" height="7.5" rx="1.75" />
          <rect x="3.25"  y="13.25" width="7.5" height="7.5" rx="1.75" />
          <rect x="13.25" y="13.25" width="7.5" height="7.5" rx="1.75" />
        </svg>
      ),
    },
    {
      // The cart, within thumb reach. Opens the same drawer as the header
      // cart icon; the badge shows how many pieces are in it.
      href: "#cart",
      label: "Cart",
      active: false,
      onClick: openCart,
      badge: itemCount,
      icon: () => (
        <svg className="w-6 h-6 stroke-taupe-dark fill-none" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
      ),
    },
    {
      // WhatsApp chat, docked here rather than floating: a floating bubble
      // over a two-column product grid always ends up covering a name or a
      // link as the page scrolls. As a tab it can never sit on content.
      href: whatsappLink("Hi! I'd love to ask about a piece from Cozi Handmade ✦"),
      label: "Chat",
      active: false,
      external: true,
      icon: () => (
        <svg className="w-6 h-6 stroke-taupe-dark fill-none" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
        </svg>
      ),
    },
    {
      href: accountHref,
      label: user ? "Account" : "Sign In",
      active: accountActive,
      icon: (on: boolean) => (
        <svg className={`w-6 h-6 ${on ? "stroke-gold" : "stroke-taupe-dark"} fill-none`}
             viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
  ];

  return (
    /* A full-width bar, not a floating pill. The pill left the strip of page
       it was reserving visible around it — a band of near-white between the
       last content and the bottom of the screen that read as the page being
       unfinished. A solid bar occupies that reserved space instead of hovering
       over it, so there is nothing empty left to see.

       Every tab carries its label now. Labels were previously shown on the
       active tab only, because three icon+label pairs made the *pill* wider
       than a 375px screen; stacked icon-over-label at full width they fit
       comfortably, and evenly spread columns read as a deliberate tab
       bar rather than a row with gaps in it. */
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40
                 bg-cream/95 backdrop-blur-md border-t border-taupe/25
                 shadow-[0_-6px_20px_-12px_rgba(26,8,16,0.35)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <div className="flex items-stretch">
        {tabs.map(({ href, label, active, external, onClick, badge, icon }) => {
          const className = `focus-ring flex-1 flex flex-col items-center justify-center gap-0.5 py-2
                             active:scale-95 transition-all duration-150
                             ${active ? "text-gold" : "text-taupe-dark"}`;
          const content = (
            <>
              <span className="relative">
                {icon(active)}
                {badge !== undefined && badge > 0 && (
                  // key restarts the bump each time the count changes.
                  <span key={badge}
                        className="animate-cart-bump absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center
                                   rounded-full bg-ui-accent px-1 text-[10px] font-bold leading-none text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold tracking-wide whitespace-nowrap">
                {label}
              </span>
            </>
          );
          if (onClick) {
            return (
              <button
                key={label}
                type="button"
                onClick={onClick}
                style={{ touchAction: "manipulation" }}
                className={className}
                aria-label={badge ? `${label}, ${badge} ${badge === 1 ? "item" : "items"}` : label}
              >
                {content}
              </button>
            );
          }
          return external ? (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ touchAction: "manipulation" }}
              className={className}
              aria-label="Chat with us on WhatsApp"
            >
              {content}
            </a>
          ) : (
            <Link
              key={label}
              href={href}
              style={{ touchAction: "manipulation" }}
              className={className}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
