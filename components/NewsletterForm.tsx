"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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
      <p className="type-body font-semibold text-success" role="status">
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
