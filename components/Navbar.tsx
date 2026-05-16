"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import CoziLogo from "./CoziLogo";
import CurrencyPicker from "./CurrencyPicker";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Collections" },
  { href: "/#about", label: "About" },
  { href: "/#about", label: "Our Story" },
  { href: "/#newsletter", label: "Journal" },
];

const drawerCategories = [
  { href: "/products?category=duvets", label: "Duvets & Quilts" },
  { href: "/products?category=baby", label: "Baby Clothing" },
  { href: "/products?category=handbags", label: "Handbags & Totes" },
  { href: "/products?category=wallets", label: "Purses & Wallets" },
  { href: "/products?category=scarves", label: "Scarves & Wraps" },
  { href: "/products?category=blankets", label: "Blankets & Throws" },
];

export default function Navbar() {
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /* Shadow navbar on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close menu on route change */
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  /* Lock body scroll when menu open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ── Top Bar ── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300
          ${scrolled
            ? "bg-cream-dark/97 backdrop-blur-md shadow-md border-b border-taupe/20"
            : "bg-cream-dark/90 backdrop-blur-sm border-b border-taupe/10"
          }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">

          {/* ── Mobile: hamburger ── */}
          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden w-11 h-11 -ml-2 flex items-center justify-center
                       text-brown active:bg-cream-dark rounded-xl transition-colors duration-150"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </button>

          {/* ── Logo ── */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0
                       flex items-center group"
          >
            <CoziLogo className="w-36 h-12 transition-opacity duration-200 group-hover:opacity-75" />
          </Link>

          {/* ── Desktop nav links ── */}
          <nav className="hidden lg:flex items-center gap-9">
            {navLinks.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="text-base font-medium text-brown hover:text-gold transition-colors duration-200
                           relative after:absolute after:-bottom-0.5 after:left-0 after:h-px
                           after:w-0 after:bg-gold after:transition-all after:duration-300
                           hover:after:w-full tracking-wide"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Desktop right: Currency + Shop Now + Cart ── */}
          <div className="flex items-center gap-3">
            {/* Currency picker — desktop only */}
            <div className="hidden lg:block">
              <CurrencyPicker />
            </div>
            {/* Shop Now pill — desktop only */}
            <Link
              href="/products"
              className="hidden lg:inline-flex items-center px-6 py-2.5 rounded-none text-sm font-semibold
                         bg-gold text-cream hover:bg-gold-dark hover:-translate-y-px
                         transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-gold/20
                         tracking-wide"
            >
              Shop Now
            </Link>

            {/* Cart icon */}
            <Link
              href="/cart"
              className="relative w-12 h-12 flex items-center justify-center
                         text-brown active:bg-cream-dark lg:hover:text-gold rounded-xl
                         transition-colors duration-150"
              aria-label={`Cart, ${itemCount} items`}
            >
              <svg
                className={`w-7 h-7 ${itemCount > 0 ? "animate-cart-ring" : "animate-cart-nudge"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="animate-badge-pop absolute -top-0.5 -right-0.5 w-5 h-5 bg-gold text-cream
                                 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Backdrop ── */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-50 bg-deep-brown/40 backdrop-blur-sm
                    transition-opacity duration-300
                    ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* ── Slide-from-left drawer ── */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-[82vw] max-w-sm
                    bg-cream-dark flex flex-col shadow-2xl
                    transition-transform duration-300 ease-out
                    ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Left stitched border accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{
            backgroundImage: "repeating-linear-gradient(180deg, #8B2035 0px, #8B2035 8px, transparent 8px, transparent 14px)",
          }}
        />

        {/* Drawer header */}
        <div className="flex items-center justify-between h-16 px-5 pl-6 border-b border-taupe/20">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            <CoziLogo className="w-28 h-10" />
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-xl
                       text-brown active:bg-cream-dark transition-colors duration-150"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer content */}
        <nav className="flex-1 overflow-y-auto py-4 pl-6 pr-4">
          <p className="text-[10px] uppercase tracking-widest text-taupe-dark mb-2 font-body">
            Navigate
          </p>
          {navLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 py-3.5 text-lg font-medium text-brown
                         active:text-gold transition-colors duration-150 border-b border-taupe/10"
            >
              {label}
            </Link>
          ))}

          <p className="text-[10px] uppercase tracking-widest text-taupe-dark mt-7 mb-2 font-body">
            Shop by Category
          </p>
          {drawerCategories.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 py-3 text-base text-brown/80
                         active:text-gold transition-colors duration-150 border-b border-taupe/10"
            >
              <span className="text-taupe text-xs" aria-hidden="true">✦</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* Drawer footer */}
        <div
          className="pl-6 pr-4 py-5 border-t border-taupe/20 space-y-3"
          style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-taupe-dark font-body">Currency</p>
            <CurrencyPicker />
          </div>
          <p className="text-xs text-taupe-dark text-center font-body italic">
            est. 2018 · handcrafted with ♡
          </p>
        </div>
      </div>
    </>
  );
}
