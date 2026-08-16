import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { CurrencyProvider } from "@/lib/currency/CurrencyContext";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/server";
import { getStockedCategories } from "@/lib/db-categories";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import CartDrawer from "@/components/CartDrawer";

const cormorant = Cormorant_Garamond({
  variable: "--font-playfair", // keep same CSS var name so @theme still works
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-inter", // keep same CSS var name
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cozi Handmade | Handcrafted Woolwork & Knits",
  description:
    "Beautifully handcrafted duvets, baby clothing, handbags, purses, scarves and blankets, every stitch made with love by skilled women artisans.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  // Stocked-only: the drawer's "Shop by Category" list is navigation, so an
  // entry that filters down to nothing is a dead end for the customer.
  const categories = await getStockedCategories(supabase);

  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="min-h-screen flex flex-col bg-cream text-deep-brown antialiased">
        <AuthProvider>
        <CurrencyProvider>
        <CartProvider>
          {/* Top bar — always visible */}
          <Navbar categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

          {/* Page content — extra bottom padding on mobile for bottom nav */}
          <main className="flex-1 pb-nav lg:pb-0">{children}</main>

          {/* Desktop footer — hidden on mobile (bottom nav handles navigation) */}
          <div className="hidden lg:block">
            <Footer />
          </div>

          {/* Mobile build credit — the footer above is desktop-only, so without
              this the credit exists nowhere on a phone except inside the nav
              drawer. pb-nav keeps it clear of the fixed bottom nav. */}
          {/* pr-20 reserves the bottom-right corner for the floating WhatsApp
              button, which is fixed and would otherwise sit on the credit. */}
          <div className="lg:hidden bg-cream-darker border-t border-taupe/15 pl-4 pr-20 pt-4 pb-nav">
            <a
              href="https://buildwithmaheer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="credit-chip flex items-center justify-center gap-2 rounded-full
                         mx-auto max-w-xs px-4 py-2.5 mb-4
                         text-brown/80 active:text-gold transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5 text-terracotta-dark shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              <span
                className="credit-link credit-idle text-sm font-body tracking-wide"
                style={{ ["--sheen" as string]: "var(--color-terracotta-dark)" }}
              >
                Built by Maheer
              </span>
            </a>
          </div>

          {/* Mobile / tablet bottom nav — hidden on desktop */}
          <BottomNav />

          {/* Floating WhatsApp chat button — every page */}
          <FloatingWhatsApp />

          {/* Slide-in cart drawer — every page */}
          <CartDrawer />
        </CartProvider>
        </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
