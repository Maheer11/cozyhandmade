"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <p className="text-gold font-medium text-sm">
        Welcome to the community! We&apos;ll be in touch soon.
      </p>
    );
  }

  return (
    <form
      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        placeholder="Your email address"
        required
        className="flex-1 px-5 py-3.5 rounded-full bg-brown-light/40 text-cream placeholder:text-taupe/60
                   border border-taupe/30 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30
                   text-sm transition-all duration-200"
      />
      <button
        type="submit"
        className="px-7 py-3.5 rounded-full bg-terracotta text-cream font-medium text-sm
                   hover:bg-gold hover:scale-[1.02] active:scale-[0.99]
                   transition-all duration-200 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-gold whitespace-nowrap"
      >
        Subscribe
      </button>
    </form>
  );
}
