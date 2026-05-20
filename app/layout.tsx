import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import { CurrencyProvider } from "@/lib/currency/CurrencyContext";
import { AuthProvider } from "@/lib/supabase/auth-context";
import Navbar from "@/components/Navbar";
import AccountStatusBar from "@/components/AccountStatusBar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

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
  title: "Woven with Love — Handcrafted Woolwork & Knits",
  description:
    "Beautifully handcrafted duvets, baby clothing, handbags, purses, scarves and blankets — every stitch made with love by skilled women artisans.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="min-h-screen flex flex-col bg-cream text-deep-brown antialiased">
        <AuthProvider>
        <CurrencyProvider>
        <CartProvider>
          {/* Top bar — always visible */}
          <Navbar />

          {/* Tier status bar — only renders when user is logged in */}
          <AccountStatusBar />

          {/* Page content — extra bottom padding on mobile for bottom nav */}
          <main className="flex-1 pb-nav lg:pb-0">{children}</main>

          {/* Desktop footer — hidden on mobile (bottom nav handles navigation) */}
          <div className="hidden lg:block">
            <Footer />
          </div>

          {/* Mobile / tablet bottom nav — hidden on desktop */}
          <BottomNav />
        </CartProvider>
        </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
