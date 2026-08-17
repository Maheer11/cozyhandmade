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
import MobileFooterCredit from "@/components/MobileFooterCredit";
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

          {/* Page content. No bottom-nav padding here: MobileFooterCredit below
              owns the bottom clearance on mobile. Reserving it in both places
              left a band of dead cream at the end of every page. */}
          <main className="flex-1">{children}</main>

          {/* Desktop footer — hidden on mobile (bottom nav handles navigation) */}
          <div className="hidden lg:block">
            <Footer />
          </div>

          {/* Bottom-of-page clearance and, on the homepage, the build credit.
              See MobileFooterCredit for why it varies by route. */}
          <MobileFooterCredit />

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
