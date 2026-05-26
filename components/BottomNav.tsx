"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { useAuth } from "@/lib/supabase/auth-context";

export default function BottomNav() {
  const pathname  = usePathname();
  const { itemCount } = useCart();
  const { user }  = useAuth();

  // These pages have their own full-width sticky bars — hide the bottom nav
  const isProductDetail = /^\/products\/[^/]+$/.test(pathname);
  const isCheckout = pathname.startsWith("/checkout");
  const isCart = pathname === "/cart";
  if (isProductDetail || isCheckout || isCart) return null;

  const accountHref  = user ? "/account" : "/auth/login";
  const accountActive = pathname.startsWith("/account") || pathname.startsWith("/auth");

  const tabs = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
      icon: (on: boolean) => (
        <svg className={`w-6 h-6 ${on ? "fill-terracotta" : "fill-none stroke-taupe-dark"}`}
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
      icon: (on: boolean) => (
        <svg className={`w-6 h-6 ${on ? "fill-terracotta" : "fill-none stroke-taupe-dark"}`}
             viewBox="0 0 24 24" strokeWidth={1.8}>
          {on
            ? <path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />}
        </svg>
      ),
    },
    {
      href: "/products?search=",
      label: "Search",
      active: false,
      icon: (on: boolean) => (
        <svg className={`w-6 h-6 ${on ? "stroke-terracotta" : "stroke-taupe-dark"} fill-none`}
             viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      href: "/cart",
      label: "Cart",
      active: pathname === "/cart",
      icon: (on: boolean) => (
        <div className="relative">
          <svg className={`w-6 h-6 ${on ? "stroke-terracotta" : "stroke-taupe-dark"} fill-none`}
               viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-terracotta text-cream
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
        <svg className={`w-6 h-6 ${on ? "stroke-terracotta" : "stroke-taupe-dark"} fill-none`}
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
        {tabs.map(({ href, label, active, icon }) => (
          <Link
            key={label}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-1
                       active:bg-cream-dark transition-colors duration-150
                       ${active ? "text-terracotta" : "text-taupe-dark"}`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            {icon(active)}
            <span className={`text-[10px] font-medium tracking-wide ${active ? "text-terracotta" : "text-taupe-dark"}`}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
