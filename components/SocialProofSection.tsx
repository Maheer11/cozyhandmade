"use client";

import { useState } from "react";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────── */
type ChatMsg = { from: "customer" | "shop"; text: string; time: string };

export type Review = {
  platform: "whatsapp" | "instagram";
  /** Drop screenshot into /public/reviews/ and reference it here to activate the phone-frame card */
  screenshot?: string;
  initial: string;
  customerLabel: string;
  location?: string;
  messages: ChatMsg[];
  date: string;
  rating?: number;
};

/* ─────────────────────────────────────────────────────────
   REVIEWS DATA
   Add as many entries as you like — the section paginates
   automatically in rows of BATCH (default 3).
───────────────────────────────────────────────────────── */
const BATCH = 3;

const reviews: Review[] = [
  /* ── Row 1 ── */
  {
    screenshot: "/reviews/review1.jpeg",
    platform: "whatsapp",
    initial: "S",
    customerLabel: "Sarah M.",
    location: "London",
    date: "2 weeks ago",
    rating: 5,
    messages: [
      { from: "customer", text: "Just received my order! The baby cardigan is absolutely beautiful 😭❤️", time: "14:32" },
      { from: "customer", text: "My daughter wore it home from hospital. It's already a family heirloom.", time: "14:33" },
      { from: "shop",     text: "This means the world to us 🧶 Thank you so much ✨", time: "14:45" },
    ],
  },
  {
    platform: "instagram",
    initial: "A",
    customerLabel: "Amara K.",
    location: "Manchester",
    date: "1 month ago",
    rating: 5,
    messages: [
      { from: "customer", text: "I've never owned a handbag that gets so many compliments. The craftsmanship is extraordinary 🖤", time: "18:05" },
      { from: "customer", text: "Genuinely the best thing I've bought this year!", time: "18:06" },
      { from: "shop",     text: "So glad you love it! Made with so much care 💛", time: "18:20" },
    ],
  },
  {
    platform: "whatsapp",
    initial: "C",
    customerLabel: "Claire B.",
    location: "Edinburgh",
    date: "3 months ago",
    rating: 5,
    messages: [
      { from: "customer", text: "My duvet is a work of art. Three winters in and it just gets softer. Worth every penny 🌿", time: "10:14" },
      { from: "customer", text: "Already ordering one for my sister as a wedding gift!", time: "10:15" },
      { from: "shop",     text: "She will absolutely love it 💛 Thank you Claire!", time: "10:28" },
    ],
  },
  /* ── Row 2 ── */
  {
    platform: "instagram",
    initial: "F",
    customerLabel: "Fatima R.",
    location: "Birmingham",
    date: "3 weeks ago",
    rating: 5,
    messages: [
      { from: "customer", text: "The tote bag arrived and I genuinely cried. It's even more beautiful in person 🤍", time: "11:02" },
      { from: "shop",     text: "We poured so much love into that one 🧶 You deserve it!", time: "11:30" },
    ],
  },
  {
    platform: "whatsapp",
    initial: "Z",
    customerLabel: "Zara T.",
    location: "Leeds",
    date: "2 months ago",
    rating: 5,
    messages: [
      { from: "customer", text: "Ordered a knitted blanket as a baby shower gift — everyone asked where it was from! 😍", time: "16:44" },
      { from: "customer", text: "Already sent your page to all my friends!", time: "16:45" },
      { from: "shop",     text: "That's so kind, thank you Zara! 💛 Hope they love it too", time: "16:55" },
    ],
  },
  {
    platform: "instagram",
    initial: "N",
    customerLabel: "Nadia W.",
    location: "Bristol",
    date: "6 weeks ago",
    rating: 5,
    messages: [
      { from: "customer", text: "The quality is unreal for the price. This is proper artisan work 🙌", time: "09:18" },
      { from: "customer", text: "The packaging alone felt like a luxury unboxing experience!", time: "09:19" },
      { from: "shop",     text: "Thank you so much Nadia! We really care about every detail 🎁✨", time: "09:40" },
    ],
  },
  /* ── Add more rows below — they won't show until the ··· button is pressed ── */
];

/* ─────────────────────────────────────────────────────────
   HELPER: STAR RATING
───────────────────────────────────────────────────────── */
function Stars({ n = 5 }: { n?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < n ? "text-[#D4A76A]" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   HELPER: WA DOUBLE-TICK
───────────────────────────────────────────────────────── */
function ReadTick() {
  return (
    <svg className="inline w-3.5 h-3.5 text-[#53bdeb] ml-0.5 shrink-0" viewBox="0 0 18 11" fill="currentColor">
      <path d="M17.394.246a.75.75 0 0 0-1.06.04L7.17 9.327 4.73 6.9a.75.75 0 0 0-1.06 1.06l3 3a.75.75 0 0 0 1.09-.04l9.67-10.615a.75.75 0 0 0-.036-1.06z"/>
      <path opacity=".4" d="M13.394.246a.75.75 0 0 0-1.06.04L3.17 9.327.73 6.9A.75.75 0 0 0-.33 7.96l3 3a.75.75 0 0 0 1.09-.04L13.43 1.306a.75.75 0 0 0-.036-1.06z"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   WHATSAPP CARD
───────────────────────────────────────────────────────── */
function WhatsAppCard({ review }: { review: Review }) {
  return (
    <div className="rounded-[22px] overflow-hidden shadow-[0_6px_28px_rgba(0,0,0,0.12)] border border-white/60 flex flex-col bg-white h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ background: "linear-gradient(135deg,#128C7E,#075e54)" }}>
        <svg className="w-4 h-4 text-white/70 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
        <div className="w-8 h-8 rounded-full bg-[#25d366]/80 flex items-center justify-center text-white font-bold text-sm shrink-0 ring-1 ring-white/30">
          {review.initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-2.5 w-20 rounded bg-white/30 blur-[4px]" aria-hidden="true" />
          <p className="text-white/55 text-[10px] mt-0.5">online</p>
        </div>
        <div className="flex gap-3 text-white/70">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
        </div>
      </div>

      {/* Chat body */}
      <div
        className="flex-1 px-3 py-3 space-y-2 text-[13px] overflow-y-auto"
        style={{ background: "#e5ddd5 url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23128C7E' fill-opacity='0.03'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/svg%3E\")", maxHeight: "220px" }}
      >
        <div className="flex justify-center">
          <span className="bg-white/70 text-[#667781] text-[10px] px-2.5 py-0.5 rounded-full font-medium">{review.date}</span>
        </div>
        {review.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === "shop" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.13)] ${
              msg.from === "customer"
                ? "bg-white rounded-[10px] rounded-tl-[3px] text-[#303030]"
                : "bg-[#dcf8c6] rounded-[10px] rounded-tr-[3px] text-[#303030]"
            }`}>
              <p className="leading-snug">{msg.text}</p>
              <div className="flex items-center justify-end gap-0.5 mt-0.5">
                <span className="text-[10px] text-[#667781]">{msg.time}</span>
                {msg.from === "shop" && <ReadTick />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-gray-100">
        <Stars n={review.rating} />
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#25d366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
          </svg>
          <span className="text-[10px] text-[#667781] font-medium">WhatsApp</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   INSTAGRAM DM CARD
───────────────────────────────────────────────────────── */
function InstagramCard({ review }: { review: Review }) {
  return (
    <div className="rounded-[22px] overflow-hidden shadow-[0_6px_28px_rgba(0,0,0,0.12)] border border-white/60 flex flex-col bg-white h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border-b border-gray-100">
        <svg className="w-4 h-4 text-gray-700 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
        <div className="p-[2px] rounded-full shrink-0" style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
          <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-sm font-bold" style={{ color: "#dc2743" }}>
            {review.initial}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-2.5 w-24 rounded bg-gray-200 blur-[4px]" aria-hidden="true" />
          <div className="h-2 w-16 rounded bg-gray-100 blur-[3px] mt-1" aria-hidden="true" />
        </div>
        <svg className="w-5 h-5 text-gray-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
      </div>

      {/* Chat body */}
      <div className="flex-1 px-3 py-3 space-y-1.5 text-[13px] bg-white overflow-y-auto" style={{ maxHeight: "220px" }}>
        <div className="flex justify-center mb-2">
          <span className="text-gray-400 text-[10px] font-medium">{review.date}</span>
        </div>
        {review.messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.from === "shop" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[78%] px-3.5 py-2 leading-snug ${
                msg.from === "customer"
                  ? "bg-[#efefef] text-[#262626] rounded-[20px] rounded-tl-[5px]"
                  : "text-white rounded-[20px] rounded-tr-[5px]"
              }`}
              style={msg.from === "shop" ? { background: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" } : {}}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5 px-1">{msg.time}</span>
          </div>
        ))}
        <div className="flex justify-start pl-1 pt-0.5">
          <span className="text-base">❤️</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-gray-100">
        <Stars n={review.rating} />
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
            <defs>
              <linearGradient id="ig-card" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/>
              </linearGradient>
            </defs>
            <path fill="url(#ig-card)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
          </svg>
          <span className="text-[10px] text-gray-400 font-medium">Instagram DM</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SCREENSHOT / PHONE-FRAME CARD
   Activate by adding screenshot: "/reviews/filename.jpg"
   to a review entry. Blur strip covers the sender username.
───────────────────────────────────────────────────────── */
function ScreenshotCard({ review }: { review: Review }) {
  if (!review.screenshot) return null;
  const isWA = review.platform === "whatsapp";
  return (
    <div className="rounded-[22px] overflow-hidden shadow-[0_6px_28px_rgba(0,0,0,0.12)] border border-black/[0.08] flex flex-col bg-white h-full">
      {/* Screenshot — flush with card, blur strip over username */}
      <div className="relative flex-1 w-full" style={{ minHeight: "240px" }}>
        <div className="absolute top-0 left-0 right-0 h-10 z-10 backdrop-blur-[7px] bg-white/15" />
        <Image
          src={review.screenshot}
          alt={`Customer review via ${review.platform}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
          className="object-cover object-top"
        />
      </div>
      {/* Footer — same as other cards */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-gray-100 shrink-0">
        <div>
          <Stars n={review.rating} />
          <p className="text-[11px] text-gray-400 mt-0.5">{review.date}{review.location ? ` · ${review.location}` : ""}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${isWA ? "bg-[#25d366]/10" : "bg-pink-50"}`}>
          <span className={`text-[10px] font-semibold ${isWA ? "text-[#25d366]" : "text-pink-500"}`}>{isWA ? "WhatsApp" : "Instagram"}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CARD DISPATCHER
───────────────────────────────────────────────────────── */
function ReviewCard({ review }: { review: Review }) {
  if (review.screenshot) return <ScreenshotCard review={review} />;
  if (review.platform === "whatsapp") return <WhatsAppCard review={review} />;
  return <InstagramCard review={review} />;
}

/* ─────────────────────────────────────────────────────────
   MAIN SECTION
───────────────────────────────────────────────────────── */
export default function SocialProofSection() {
  const [visibleRows, setVisibleRows] = useState(1);

  const totalRows  = Math.ceil(reviews.length / BATCH);
  const hasMore    = visibleRows < totalRows;
  const shownCount = Math.min(visibleRows * BATCH, reviews.length);
  const remaining  = reviews.length - shownCount;

  /* Slice reviews into batches, one per visible row */
  const batches = Array.from({ length: visibleRows }, (_, i) =>
    reviews.slice(i * BATCH, (i + 1) * BATCH)
  );

  return (
    <section
      className="relative overflow-hidden py-14 lg:py-28"
      style={{ backgroundColor: "#FBF0E4" }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-[0.07]"
             style={{ background: "radial-gradient(circle,#D4A76A,transparent)" }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-[0.06]"
             style={{ background: "radial-gradient(circle,#8B2035,transparent)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ── */}
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-[#D4A76A] text-[11px] uppercase tracking-[0.3em] font-semibold mb-3">
            ✦ Real Reviews
          </p>
          <h2 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl font-light text-[#3D2B1F] mb-4">
            Words from Our Community
          </h2>
          <p className="text-[#3D2B1F]/55 text-sm max-w-md mx-auto leading-relaxed">
            Unfiltered messages from real customers — shared via WhatsApp &amp; Instagram DMs
          </p>
          {/* Platform pills */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#25d366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
              <span className="text-[11px] font-medium text-gray-600">WhatsApp</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="ig-pill" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/>
                  </linearGradient>
                </defs>
                <path fill="url(#ig-pill)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
              <span className="text-[11px] font-medium text-gray-600">Instagram DM</span>
            </div>
          </div>
        </div>

        {/* ── Review rows — each batch is its own slider row ── */}
        <div className="space-y-6 lg:space-y-8">
          {batches.map((batch, batchIdx) => (
            <div
              key={batchIdx}
              className="animate-fade-up
                         flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory
                         lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {batch.map((review, cardIdx) => (
                <div
                  key={`${batchIdx}-${cardIdx}`}
                  className="shrink-0 w-[78vw] max-w-[320px] snap-center lg:w-auto lg:max-w-none
                             animate-fade-up transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${cardIdx * 90}ms` }}
                >
                  <ReviewCard review={review} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Mobile scroll hint */}
        <p className="lg:hidden text-center text-[11px] mt-3 mb-1" style={{ color: "rgba(61,43,31,0.4)" }}>
          ← swipe to see more →
        </p>

        {/* ── Pagination controls ── */}
        <div className="flex flex-col items-center gap-3 mt-10">

          {hasMore && (
            <button
              onClick={() => setVisibleRows(v => v + 1)}
              className="group flex items-center gap-3 px-8 py-3.5 rounded-full
                         bg-[#3D2B1F] text-[#F5E6D3]
                         hover:bg-[#D4A76A] hover:text-white
                         transition-all duration-300
                         shadow-[0_4px_20px_rgba(61,43,31,0.18)]
                         hover:shadow-[0_6px_28px_rgba(212,167,106,0.30)]
                         hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="text-xl tracking-[0.4em] leading-none group-hover:tracking-[0.5em] transition-all duration-300">
                ···
              </span>
              <span className="text-xs font-medium opacity-70">
                {remaining} more {remaining === 1 ? "review" : "reviews"}
              </span>
            </button>
          )}

          {visibleRows > 1 && (
            <button
              onClick={() => setVisibleRows(1)}
              className="text-[11px] text-[#3D2B1F]/40 hover:text-[#3D2B1F]/70 transition-colors duration-200 tracking-wide"
            >
              ↑ Show less
            </button>
          )}

          {/* Review counter */}
          <p className="text-[11px] text-[#3D2B1F]/35 tracking-wide">
            Showing {shownCount} of {reviews.length} reviews
          </p>
        </div>

        {/* ── Trust note ── */}
        <p className="text-center text-[11px] text-[#3D2B1F]/35 mt-6 tracking-wide">
          ✦ All reviews are real messages shared with customer permission &nbsp;·&nbsp; Usernames blurred for privacy
        </p>

      </div>
    </section>
  );
}
