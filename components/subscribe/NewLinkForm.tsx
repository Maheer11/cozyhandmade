"use client";

import { useState } from "react";
import { emailProblem } from "@/lib/intro";
import { MILK_BUTTON } from "./SubscribePanel";

/** "Send a new link" on the expired/used confirm page. Posts to /api/subscribe. */
export default function NewLinkForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = emailProblem(email);
    if (problem) return setError(problem);
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <p className="type-body font-semibold text-milk" role="status">
        Sent. Check your inbox (and spam) for the new link.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6">
      <label htmlFor="new-link-email" className="sr-only">
        Email address
      </label>
      <input
        id="new-link-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "new-link-error" : undefined}
        className="cozi-intro__field"
      />
      {error && (
        <p id="new-link-error" role="alert" className="mt-2 type-small font-semibold text-milk">
          {error}
        </p>
      )}
      <button type="submit" disabled={status === "sending"} className={`${MILK_BUTTON} mt-5 disabled:opacity-80`}>
        {status === "sending" ? "Sending…" : "Send a new link"}
      </button>
      <p className="type-small mt-4 text-milk">By subscribing you agree to receive emails from Cozi Handmade.</p>
    </form>
  );
}
