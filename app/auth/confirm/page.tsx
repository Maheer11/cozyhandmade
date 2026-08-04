"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Landing page for password-recovery links.
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
 * Requires the Supabase "Reset Password" email template to point here:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 */
function ConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tokenHash = params.get("token_hash");
  const type = params.get("type") ?? "recovery";

  // Supabase appends these when it has already rejected the link itself.
  const linkError = params.get("error_description") ?? params.get("error");

  async function handleContinue() {
    if (!tokenHash) return;
    setBusy(true);
    setError("");

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery",
    });

    if (verifyError) {
      setError(
        verifyError.message.toLowerCase().includes("expired")
          ? "This link has expired. Password reset links are valid for 24 hours."
          : "This link is no longer valid. Please request a new one.",
      );
      setBusy(false);
      return;
    }

    // Session is now active for this user — /reset-password checks for that
    // rather than re-reading the URL, so the token is never presented twice.
    router.push("/reset-password?verified=1");
  }

  const shown = linkError ? "This link is no longer valid. Please request a new one." : error;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] tracking-[0.2em] text-[#8B2035] mb-3">COZI HANDMADE</p>
        <h1 className="font-heading text-3xl text-deep-brown mb-3">Reset your password</h1>

        {shown ? (
          <>
            <p className="text-sm text-taupe-dark mb-6">{shown}</p>
            <Link
              href="/auth/forgot"
              className="inline-flex items-center justify-center w-full h-12 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: "#8B2035" }}
            >
              Request a new link
            </Link>
          </>
        ) : !tokenHash ? (
          <>
            <p className="text-sm text-taupe-dark mb-6">
              This link is incomplete. Please request a new password reset email.
            </p>
            <Link
              href="/auth/forgot"
              className="inline-flex items-center justify-center w-full h-12 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: "#8B2035" }}
            >
              Request a new link
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-taupe-dark mb-6">
              Continue to choose a new password for your account.
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
              {busy ? "Verifying…" : "Continue"}
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
