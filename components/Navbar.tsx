"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import CoziLogo from "./CoziLogo";
import CurrencyPicker from "./CurrencyPicker";
import { socialLinks, whatsappLink } from "@/lib/social-links";

const navIcons: Record<string, React.ReactNode> = {
  Home: (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  ),
  Collections: (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  ),
  About: (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
  "Our Story": (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  Journal: (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Collections" },
  { href: "/#about", label: "About" },
  { href: "/#about", label: "Our Story" },
  { href: "/#newsletter", label: "Journal" },
];

const drawerCategories = [
  { href: "/products?category=Blankets", label: "Throw Blankets" },
  { href: "/products?category=baby", label: "Baby Blankets" },
  { href: "/products?category=handbags", label: "Handbags & Totes" },
  { href: "/products?category=wallets", label: "Purses & Wallets" },
  { href: "/products?category=scarves", label: "Scarves & Wraps" },
];

export default function Navbar() {
  const { itemCount, openCart } = useCart();
  const { user } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [footerOpen,  setFooterOpen]  = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  /* Close user menu on outside click */
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  /* Shadow navbar on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close menu on route change */
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  /* Footer section starts open every time the drawer opens — users
     collapse it down when they want the nav links to have the room */
  useEffect(() => { if (!menuOpen) setFooterOpen(true); }, [menuOpen]);

  /* Lock body scroll when menu open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* ── Top Bar ──
          The homepage hero's own background is cream-dark (not the white
          "cream" every other page starts with) — match whichever one is
          actually behind the navbar, on scroll too, so there's never a seam. */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300
          ${pathname === "/" ? (scrolled ? "bg-cream-dark/97" : "bg-cream-dark") : (scrolled ? "bg-cream/97" : "bg-cream")}
          ${scrolled
            ? "backdrop-blur-md shadow-md border-b border-taupe/20"
            : "border-b border-transparent"
          }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">

          {/* ── Mobile: hamburger ──
              Wrapped in a flex-1 zone (mirrored by the right-side icon zone
              below) so the logo — a normal flex child between them, not
              absolutely positioned — is centered by the flex layout itself.
              That guarantees it can never overlap the icon cluster on the
              right, unlike absolute-centering over the full header width,
              which doesn't account for how wide that cluster actually is. */}
          <div className="flex-1 flex lg:hidden">
            <button
              onClick={() => setMenuOpen(true)}
              className="w-11 h-11 -ml-2 flex items-center justify-center
                         text-brown active:bg-cream-dark rounded-xl transition-colors duration-150"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            </button>
          </div>

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center group shrink-0">
            <CoziLogo className="w-44 h-14 transition-opacity duration-200 group-hover:opacity-75" />
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

          {/* ── Right: Currency + Shop Now + Cart ──
              flex-1 + justify-end mirrors the hamburger zone above so the
              logo lands centered between two equal-width flex zones — see
              the note above the hamburger for why that matters. Reverts to
              a normal (non-growing) box at lg, matching the old desktop layout. */}
          <div className="flex-1 lg:flex-none flex items-center justify-end gap-3">
            {/* Currency picker — desktop only */}
            <div className="hidden lg:block">
              <CurrencyPicker />
            </div>
            {/* Shop Now — icon only, no background, visible on mobile and desktop */}
            <Link
              href="/products"
              className="inline-flex items-center px-2 py-2.5
                         hover:opacity-75 active:opacity-75 transition-opacity duration-200"
              aria-label="Shop Now"
            >
              {/* iOS-style filled bag glyph (SF Symbols "bag.fill") with an "S" mark */}
              <span className="relative w-9 h-9 shrink-0 inline-flex items-center justify-center">
                <svg className="w-9 h-9 absolute inset-0" viewBox="0 0 24 24" fill="#8B2035" aria-hidden="true">
                  <path d="M7.5 5.25a4.5 4.5 0 119 0V6h1.628a2.25 2.25 0 012.244 2.077l.807 10.5A2.25 2.25 0 0118.933 21H5.067a2.25 2.25 0 01-2.246-2.423l.807-10.5A2.25 2.25 0 015.872 6H7.5v-.75zM9 6h6v-.75a3 3 0 10-6 0V6zm-.75 3.75a.75.75 0 011.5 0 2.25 2.25 0 004.5 0 .75.75 0 011.5 0 3.75 3.75 0 01-7.5 0z" />
                </svg>
                <span className="relative text-white text-xs font-bold mt-1.5">S</span>
              </span>
            </Link>

            {/* User account button */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="w-12 h-12 flex items-center justify-center
                               text-brown active:bg-cream-dark lg:hover:text-gold rounded-xl
                               transition-colors duration-150"
                    aria-label="Account menu"
                  >
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-cream-darker z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-taupe/15">
                        <p className="text-xs font-semibold text-deep-brown truncate">
                          {(user.user_metadata?.full_name as string) ?? "My Account"}
                        </p>
                        <p className="text-[10px] text-taupe-dark truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-sm text-brown hover:bg-cream transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        My Account
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-sm text-brown hover:bg-cream transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        My Orders
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-600
                                   hover:bg-red-50 transition-colors border-t border-taupe/10"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-none
                             border border-brown/30 text-sm font-medium text-brown font-body
                             hover:border-brown/70 transition-colors duration-200"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Cart icon — opens slide-in drawer */}
            <button
              onClick={openCart}
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
            </button>
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
                    transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]
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
            <CoziLogo className="w-36 h-12" />
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-11 h-11 flex items-center justify-center rounded-xl
                       text-brown active:bg-cream-dark active:scale-90 transition-transform duration-100"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer content — only mounted while open, so the stagger animation replays every time */}
        {menuOpen && (
          <nav className="flex-1 overflow-y-auto py-4 pl-6 pr-4">
            {/* Custom order CTA — most prominent action in the drawer */}
            <Link
              href="/custom-order"
              onClick={() => setMenuOpen(false)}
              className="animate-fade-up flex items-center gap-3 mb-5 mr-2 px-4 py-3.5 rounded-2xl
                         text-deep-brown shadow-md shadow-black/10
                         active:scale-[0.98] transition-transform duration-100"
              style={{ backgroundColor: "#F7D9C0" }}
            >
              <span className="w-9 h-9 rounded-full bg-deep-brown/10 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Create a Custom Order</span>
                <span className="block text-[11px] text-deep-brown/70">Tell us exactly what you'd like made</span>
              </span>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <p className="animate-fade-up delay-100 text-[10px] uppercase tracking-widest text-taupe-dark mb-2 font-body">
              Navigate
            </p>
            {navLinks.map(({ href, label }, i) => (
              <Link
                key={label}
                href={href}
                className="animate-fade-up flex items-center gap-3.5 py-3.5 text-lg font-medium text-brown
                           active:text-gold active:bg-cream-dark/60 transition-colors duration-150 border-b border-taupe/10"
                style={{ animationDelay: `${100 + i * 40}ms` }}
              >
                <span className="text-gold shrink-0">{navIcons[label]}</span>
                {label}
              </Link>
            ))}

            <p className="animate-fade-up text-[10px] uppercase tracking-widest text-taupe-dark mt-7 mb-2 font-body"
               style={{ animationDelay: `${100 + navLinks.length * 40}ms` }}>
              Shop by Category
            </p>
            {drawerCategories.map(({ href, label }, i) => (
              <Link
                key={href}
                href={href}
                className="animate-fade-up flex items-center gap-3 py-3 text-base text-brown/80
                           active:text-gold active:bg-cream-dark/60 transition-colors duration-150 border-b border-taupe/10"
                style={{ animationDelay: `${140 + (navLinks.length + i) * 40}ms` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* Drawer footer — collapsed to a slim handle by default so it never
            crowds the nav links; tapping slides the full section open. */}
        <div
          className="border-t border-taupe/20"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
        >
          <button
            onClick={() => setFooterOpen((o) => !o)}
            aria-expanded={footerOpen}
            className="w-full flex items-center justify-between pl-6 pr-4 py-3.5
                       active:bg-cream-dark/60 transition-colors duration-150"
          >
            <span className="text-[11px] uppercase tracking-widest text-taupe-dark font-body font-semibold">
              More
            </span>
            <span
              className="w-6 h-6 flex items-center justify-center border border-taupe/40 text-gold
                         shrink-0 transition-transform duration-300"
              style={{ transform: footerOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              aria-hidden="true"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </span>
          </button>

          <div
            className="grid transition-all duration-300 ease-in-out"
            style={{ gridTemplateRows: footerOpen ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="pl-6 pr-4 pb-2 pt-1 space-y-4">

          {user ? (
            <div className="space-y-1">
              <Link href="/account" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 py-2.5 text-sm font-medium text-brown active:text-gold">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                My Account
              </Link>
              <Link href="/account/orders" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 py-2.5 text-sm font-medium text-brown active:text-gold">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                </svg>
                My Orders
              </Link>
              <button onClick={() => { setMenuOpen(false); handleSignOut(); }}
                className="flex items-center gap-2 py-2.5 text-sm font-medium text-red-600 w-full">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sign Out
              </button>
            </div>
          ) : (
            /* Member card — returning customers sign in, new ones create an
               account, presented as an explicit choice instead of one generic button */
            <div className="rounded-2xl bg-white/70 border border-taupe/15 p-4 space-y-3">
              <div className="text-center">
                <p className="text-sm font-semibold text-deep-brown font-body">Join the Cozi family</p>
                <p className="text-[11px] text-taupe-dark font-body mt-0.5">
                  Faster checkout · order tracking · exclusive drops
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Link href="/auth/login" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center h-10 rounded-none text-cream text-[13px]
                             font-semibold tracking-wide font-body
                             active:scale-[0.97] transition-transform duration-100"
                  style={{ backgroundColor: "#8B2035" }}>
                  Sign In
                </Link>
                <Link href="/auth/signup" onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center h-10 rounded-none text-[13px]
                             font-semibold tracking-wide font-body border border-brown/30 text-brown
                             active:scale-[0.97] active:border-brown/70 transition-all duration-100"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}

          {/* Social handles — real links, same as the footer */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
               className="w-10 h-10 rounded-full flex items-center justify-center bg-brown/8 text-brown
                          active:bg-gold active:text-cream active:scale-90 transition-transform duration-100">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
               className="w-10 h-10 rounded-full flex items-center justify-center bg-brown/8 text-brown
                          active:bg-gold active:text-cream active:scale-90 transition-transform duration-100">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.06L2 22l5.06-1.36C8.5 21.5 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </a>
            <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
               className="w-10 h-10 rounded-full flex items-center justify-center bg-brown/8 text-brown
                          active:bg-gold active:text-cream active:scale-90 transition-transform duration-100">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </a>
            <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
               className="w-10 h-10 rounded-full flex items-center justify-center bg-brown/8 text-brown
                          active:bg-gold active:text-cream active:scale-90 transition-transform duration-100">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>

          {/* Developer contact — same info as the footer's web app enquiries block,
              but stacked one-per-row so nothing wraps awkwardly in the narrow drawer */}
          <div className="rounded-2xl bg-brown/5 border border-taupe/15 px-4 py-3.5">
            <p className="text-xs uppercase tracking-[0.18em] font-body font-semibold text-taupe-dark text-center mb-1.5">
              Web App &amp; Website Enquiries
            </p>
            <div className="flex flex-col divide-y divide-taupe/10">
              <a
                href="https://buildwithmaheer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 py-2 text-sm font-body text-brown/85 active:text-gold transition-colors duration-150"
              >
                <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                buildwithmaheer.com
              </a>
              <a
                href="mailto:mahhir09@gmail.com"
                className="flex items-center gap-2.5 py-2 text-sm font-body text-brown/85 active:text-gold transition-colors duration-150"
              >
                <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                mahhir09@gmail.com
              </a>
              <a
                href="tel:08037646510"
                className="flex items-center gap-2.5 py-2 text-sm font-body text-brown/85 active:text-gold transition-colors duration-150"
              >
                <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                0803 764 6510
              </a>
            </div>
          </div>

          {/* Currency — bottom of the panel so its drop-up menu opens over
              the content above it instead of being clipped */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-taupe-dark font-body">Currency</p>
            <CurrencyPicker dropUp />
          </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
