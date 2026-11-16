import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 75 is Next's default; 60 is used by the mobile hero carousel
    // (components/home/HeroMobileCarousel) to keep its LCP photo light.
    qualities: [60, 75],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  // "New In" was renamed to "Featured Pieces" — these keep old bookmarked/
  // shared links working permanently rather than 404ing.
  async redirects() {
    return [
      { source: "/new-in", destination: "/featured-pieces", permanent: true },
      { source: "/new-in/:id", destination: "/featured-pieces/:id", permanent: true },
      { source: "/admin/new-in", destination: "/admin/featured-pieces", permanent: true },
      { source: "/admin/new-in/new", destination: "/admin/featured-pieces/new", permanent: true },
      { source: "/admin/new-in/:id/edit", destination: "/admin/featured-pieces/:id/edit", permanent: true },
    ];
  },
};

export default nextConfig;
