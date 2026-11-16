// Helpers for the "Private access" intro (components/intro/PrivateAccessIntro).
// Browser-safe: no server imports.

import { INTRO_STORAGE_KEY } from "@/config/intro";

/** One rule for every signup form and the server (lib/subscribe/service.ts). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** A fix-it message for the field, or null when the address looks right. */
export function emailProblem(raw: string): string | null {
  const email = normaliseEmail(raw);
  if (!email) return "Enter your email address to join.";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return "That doesn't look like an email address. Check it, e.g. name@example.com.";
  }
  return null;
}

/**
 * Cloudinary delivery URL with automatic format and quality (f_auto,q_auto),
 * inserted right after /upload/. Non-Cloudinary or already-transformed URLs
 * are returned unchanged.
 */
export function cloudinaryAuto(url: string): string {
  if (!url.includes("/image/upload/") || /\/upload\/[^/]*(f_auto|q_auto)/.test(url)) return url;
  return url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
}

/** Records that this visitor has seen (closed or joined) the intro. */
export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_STORAGE_KEY, "1");
  } catch {
    /* storage blocked: it may show again next visit, which is harmless */
  }
}

/** The script in <head> (app/layout.tsx) inlines this check before paint. */
export function introPreflightScript(): string {
  // Kept tiny and dependency-free: it runs before any app code. Shows the
  // intro only on "/" with no #fragment (a deep link to a section is not a
  // first look at the homepage) and only when this version hasn't been seen.
  return `(function(){try{if(location.pathname!=="/"||location.hash)return;if(localStorage.getItem(${JSON.stringify(
    INTRO_STORAGE_KEY,
  )}))return;document.documentElement.setAttribute("data-intro","show")}catch(e){}})();`;
}

export type JoinResult = { ok: true } | { ok: false; error: string };

/**
 * Double opt-in signup via /api/subscribe (lib/subscribe/service.ts). The
 * server answers { ok: true } for any valid address, already-subscribed ones
 * included, so the intro never reveals who is on the list.
 */
export async function joinPrivateAccess(email: string, honeypot: string): Promise<JoinResult> {
  const problem = emailProblem(email);
  if (problem) return { ok: false, error: problem };
  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "intro", website: honeypot }),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? "We couldn't sign you up just now. Please try again." };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}
