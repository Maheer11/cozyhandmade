"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "done" | "error";

/**
 * "Letters from our Studio" sign-up. Posts to /api/newsletter, which adds the
 * email to Resend Contacts (lib/newsletter.ts). The thank-you message only
 * shows once the sign-up has actually been saved; a failure says so and
 * keeps the email in the box to try again.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  if (status === "done") {
    return (
      <p className="text-gold font-medium text-sm" role="status">
        You&apos;re subscribed. Welcome to the community! Our next letter will reach {email}.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("done");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <div>
      <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={handleSubmit}>
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="Your email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? "newsletter-error" : undefined}
          className="flex-1 px-5 py-3.5 rounded-xl bg-cream-dark/60 text-deep-brown placeholder:text-taupe-dark/70
                     border border-taupe/25 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20
                     text-sm transition-all duration-200"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="px-7 py-3.5 rounded-xl bg-gold text-cream font-medium text-sm
                     hover:bg-gold-dark hover:scale-[1.02] active:scale-[0.99]
                     disabled:opacity-60 disabled:hover:scale-100
                     transition-all duration-200 focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-gold whitespace-nowrap"
        >
          {status === "sending" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {status === "error" && (
        <p id="newsletter-error" role="alert" className="mt-3 text-xs text-red-700">
          {error}
        </p>
      )}
      <p className="mt-3 text-[11px] text-taupe-dark leading-relaxed">
        By subscribing you agree to receive emails from Cozi Handmade.
      </p>
    </div>
  );
}
