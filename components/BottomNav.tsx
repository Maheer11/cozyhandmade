"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";

export default function BottomNav() {
  const pathname  = usePathname();
  const { user }  = useAuth();

  // These pages have their own full-width sticky bars — hide the bottom nav
  const isProductDetail = /^\/products\/[^/]+$/.test(pathname);
  const isCheckout = pathname.startsWith("/checkout");
  if (isProductDetail || isCheckout) return null;

  const accountHref  = user ? "/account" : "/auth/login";
  const accountActive = pathname.startsWith("/account") || pathname.startsWith("/auth");

  const tabs: {
    href: string;
    label: string;
    active: boolean;
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
       comfortably, and three evenly spread columns read as a deliberate tab
       bar rather than a row with gaps in it. */
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40
                 bg-cream/95 backdrop-blur-md border-t border-taupe/25
                 shadow-[0_-6px_20px_-12px_rgba(26,8,16,0.35)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <div className="flex items-stretch">
        {tabs.map(({ href, label, active, icon }) => (
          <Link
            key={label}
            href={href}
            style={{ touchAction: "manipulation" }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2
                       active:scale-95 transition-all duration-150
                       ${active ? "text-gold" : "text-taupe-dark"}`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            {icon(active)}
            <span className="text-[10px] font-semibold tracking-wide whitespace-nowrap">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
