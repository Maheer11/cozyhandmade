"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Landing page for emailed auth links — password recovery AND signup
 * confirmation.
 *
 * WHY THIS EXISTS — it is not an extra click for its own sake.
 *
 * Recovery tokens are strictly single-use. The default Supabase link points
 * straight at /auth/v1/verify, which consumes the token on GET. Mail
 * providers (Gmail in particular) fetch links in a message to scan them for
 * malware BEFORE the recipient clicks. That scan spends the token, so the
 * real click arrives second and gets "One-time token not found" — the user
 * sees "link expired" for a link they never used.
 *
 * Verifying on an explicit click defeats that: an automated scanner fetches
 * this page and gets nothing but markup, because verifyOtp only runs when
 * someone presses the button.
 *
 * WHY SIGNUP USES THIS TOO. Signup confirmation used to go to
 * /auth/callback, which calls exchangeCodeForSession() — the PKCE flow.
 * PKCE only completes in the SAME browser that called signUp(), because the
 * code_verifier lives in that browser's cookie jar. On a phone the
 * confirmation link almost always opens in the mail app's in-app browser,
 * which is a different jar, so the exchange failed and the customer was
 * bounced to /auth/login to type their credentials again — having just
 * proved they own the address.
 *
 * verifyOtp() with a token_hash carries no such requirement: it works in any
 * browser, so the customer lands signed in wherever they opened the mail.
 *
 * REQUIRES both Supabase email templates to point here:
 *   Reset Password:
 *     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 *   Confirm signup:
 *     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/account
 */
function ConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tokenHash = params.get("token_hash");
  const type = params.get("type") ?? "recovery";
  const isSignup = type === "signup" || type === "email";
  // Where to land after a successful verify. Only same-origin paths are
  // honoured — `next` arrives from the URL, so accepting an absolute value
  // would turn this page into an open redirect.
  const nextParam = params.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : null;

  // Supabase appends these when it has already rejected the link itself.
  const linkError = params.get("error_description") ?? params.get("error");

  async function handleContinue() {
    if (!tokenHash) return;
    setBusy(true);
    setError("");

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (verifyError) {
      setError(
        verifyError.message.toLowerCase().includes("expired")
          ? isSignup
            ? "This confirmation link has expired. Please sign up again to get a new one."
            : "This link has expired. Password reset links are valid for 24 hours."
          : "This link is no longer valid. Please request a new one.",
      );
      setBusy(false);
      return;
    }

    // verifyOtp has established the session, so the customer is now signed in
    // in THIS browser — whichever one opened the email.
    if (isSignup) {
      // refresh() so server components (navbar, account page) re-render
      // against the new auth cookies instead of the signed-out render that
      // is already in the client router cache.
      router.push(next ?? "/account?emailVerified=true");
      router.refresh();
      return;
    }

    // Session is now active for this user — /reset-password checks for that
    // rather than re-reading the URL, so the token is never presented twice.
    router.push("/reset-password?verified=1");
  }

  const shown = linkError ? "This link is no longer valid. Please request a new one." : error;
  // A dead signup link is recovered by signing up again, not by the
  // forgot-password form.
  const recoveryHref  = isSignup ? "/auth/signup" : "/auth/forgot";
  const recoveryLabel = isSignup ? "Sign up again" : "Request a new link";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] tracking-[0.2em] text-[#8B2035] mb-3">COZI HANDMADE</p>
        <h1 className="font-heading text-3xl text-deep-brown mb-3">
          {isSignup ? "Confirm your email" : "Reset your password"}
        </h1>

        {shown ? (
          <>
            <p className="text-sm text-taupe-dark mb-6">{shown}</p>
            <Link
              href={recoveryHref}
              className="inline-flex items-center justify-center w-full h-12 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: "#8B2035" }}
            >
              {recoveryLabel}
            </Link>
          </>
        ) : !tokenHash ? (
          <>
            <p className="text-sm text-taupe-dark mb-6">
              {isSignup
                ? "This link is incomplete. Please sign up again to get a new confirmation email."
                : "This link is incomplete. Please request a new password reset email."}
            </p>
            <Link
              href={recoveryHref}
              className="inline-flex items-center justify-center w-full h-12 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: "#8B2035" }}
            >
              {recoveryLabel}
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-taupe-dark mb-6">
              {isSignup
                ? "Tap continue to confirm your email and sign in to your account."
                : "Continue to choose a new password for your account."}
            </p>
            <button
              type="button"
              onClick={handleContinue}
              disabled={busy}
              style={{ backgroundColor: "#8B2035", touchAction: "manipulation" }}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm
                         active:scale-[0.98] transition-transform duration-100
                         disabled:opacity-50 disabled:active:scale-100"
            >
              {busy ? "Verifying…" : isSignup ? "Confirm & sign in" : "Continue"}
            </button>
            <p className="text-xs text-taupe-dark mt-4">
              For your security this link can only be used once.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
