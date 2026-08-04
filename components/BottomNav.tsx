"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { useAuth } from "@/lib/supabase/auth-context";

export default function BottomNav() {
  const pathname  = usePathname();
  const { itemCount, openCart } = useCart();
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
    onClick?: () => void;
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
      // Storefront, NOT a shopping bag. This tab previously used the exact
      // same bag path as the Cart tab three positions along, so the bar
      // showed two identical bag icons. A bag universally reads as "my
      // cart", so users skipped this tab as a duplicate rather than
      // recognising it as the way into the shop.
      icon: (on: boolean) => (
        <svg className={`w-6 h-6 ${on ? "stroke-gold" : "stroke-taupe-dark"} fill-none`}
             viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72l1.189-1.19A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" />
        </svg>
      ),
    },
    {
      href: "/products?focusSearch=1",
      label: "Search",
      active: false,
      icon: (on: boolean) => (
        <svg className={`w-6 h-6 ${on ? "stroke-gold" : "stroke-taupe-dark"} fill-none`}
             viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      href: "/cart",
      label: "Cart",
      active: false,
      onClick: openCart,
      icon: (on: boolean) => (
        <div className="relative">
          <svg className={`w-6 h-6 ${on ? "stroke-gold" : "stroke-taupe-dark"} fill-none`}
               viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gold text-cream
                             text-[9px] font-bold rounded-full flex items-center justify-center">
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </div>
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
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40
                 bg-cream/95 backdrop-blur-md border-t border-taupe/25"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch h-14">
        {tabs.map(({ href, label, active, icon, onClick }) => (
          <Link
            key={label}
            href={href}
            onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined}
            style={{ touchAction: "manipulation" }}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-1
                       active:scale-95 transition-transform duration-100
                       ${active ? "text-gold" : "text-taupe-dark"}`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            {active && (
              <span className="absolute top-0.5 w-8 h-1 rounded-full bg-gold" aria-hidden="true" />
            )}
            {icon(active)}
            <span className={`text-[10px] font-medium tracking-wide ${active ? "text-gold" : "text-taupe-dark"}`}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
