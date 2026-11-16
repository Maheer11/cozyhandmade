"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Status = "idle" | "sending" | "done" | "error";

/**
 * "Letters from our Studio" sign-up. Posts to /api/subscribe, the same double
 * opt-in as the "Private access" intro (lib/subscribe/service.ts): one list,
 * and nobody is added until they click the link in the confirmation email.
 * A failure says so and keeps the email in the box to try again.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  if (status === "done") {
    return (
      <p className="type-body font-semibold text-success" role="status">
        Almost there: check your inbox. We sent a link to {email.trim().toLowerCase()} to confirm your place.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter" }),
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
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate={false}>
        <Input
          id="newsletter-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={status === "error" ? error : undefined}
        />
        <Button type="submit" fullWidth disabled={status === "sending"}>
          {status === "sending" ? "Subscribing…" : "Subscribe"}
        </Button>
      </form>
      <p className="type-caption mt-3 text-stone">
        By subscribing you agree to receive emails from Cozi Handmade.
      </p>
    </div>
  );
}
