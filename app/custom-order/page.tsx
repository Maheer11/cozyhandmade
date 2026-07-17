"use client";

import { useState } from "react";
import Link from "next/link";
import { categories } from "@/lib/products";
import { whatsappLink } from "@/lib/social-links";

export default function CustomOrderPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [category, setCategory] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");

  const categoryName = categories.find((c) => c.id === category)?.name ?? category;

  const canSubmit = name.trim() && contact.trim() && description.trim();

  const message = [
    `Hi! I'd like to place a custom order ✦`,
    ``,
    `Name: ${name}`,
    `Contact: ${contact}`,
    `Category: ${categoryName}`,
    budget.trim() ? `Budget: ${budget}` : null,
    ``,
    `What I'd like made:`,
    description,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-cream-dark border-b border-taupe/20 px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-xl mx-auto">
          <p className="text-gold text-[11px] uppercase tracking-[0.28em] font-body font-semibold mb-2">
            ✦ Made just for you
          </p>
          <h1 className="font-heading italic text-3xl sm:text-4xl font-400 text-deep-brown mb-3">
            Create a Custom Order
          </h1>
          <p className="text-deep-brown/70 text-sm sm:text-base leading-relaxed">
            Tell us what you have in mind — colour, size, occasion, anything — and we'll
            reply on WhatsApp to talk it through before you order.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-12">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-deep-brown uppercase tracking-wide mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full h-12 px-4 rounded-xl bg-white border border-taupe/30 text-sm
                         text-deep-brown placeholder:text-taupe-dark
                         focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                         transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-deep-brown uppercase tracking-wide mb-2">
              Email or Phone
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="So we know where to reach you"
              className="w-full h-12 px-4 rounded-xl bg-white border border-taupe/30 text-sm
                         text-deep-brown placeholder:text-taupe-dark
                         focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                         transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-deep-brown uppercase tracking-wide mb-2">
              What kind of piece?
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-white border border-taupe/30 text-sm text-deep-brown
                         focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                         transition-all duration-200 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="other">Something else</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-deep-brown uppercase tracking-wide mb-2">
              Describe what you'd like
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Colours, size, who it's for, when you need it by…"
              className="w-full px-4 py-3 rounded-xl bg-white border border-taupe/30 text-sm
                         text-deep-brown placeholder:text-taupe-dark resize-none
                         focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                         transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-deep-brown uppercase tracking-wide mb-2">
              Budget <span className="font-normal normal-case text-taupe-dark">(optional)</span>
            </label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. €80–120"
              className="w-full h-12 px-4 rounded-xl bg-white border border-taupe/30 text-sm
                         text-deep-brown placeholder:text-taupe-dark
                         focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                         transition-all duration-200"
            />
          </div>

          <a
            href={canSubmit ? whatsappLink(message) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canSubmit}
            onClick={(e) => { if (!canSubmit) e.preventDefault(); }}
            className={`flex items-center justify-center gap-2 w-full h-14 rounded-none
                        font-semibold text-sm tracking-wide transition-all duration-150
                        ${canSubmit
                          ? "bg-gold text-cream active:scale-[0.98] shadow-sm shadow-gold/20"
                          : "bg-taupe/20 text-taupe-dark cursor-not-allowed"
                        }`}
            style={{ touchAction: "manipulation" }}
          >
            <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.06L2 22l5.06-1.36C8.5 21.5 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>
            Send via WhatsApp
          </a>
          <p className="text-xs text-taupe-dark text-center leading-relaxed">
            This opens WhatsApp with your details pre-filled — nothing is sent until you hit send there.
          </p>

          <Link
            href="/products"
            className="flex items-center justify-center gap-1.5 text-sm text-brown/70 active:text-gold
                       transition-colors duration-150 pt-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Browse ready-made pieces instead
          </Link>
        </div>
      </div>
    </div>
  );
}
