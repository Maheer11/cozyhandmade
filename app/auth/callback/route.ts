import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle callback errors from Supabase
  if (error) {
    const message =
      error === "access_denied"
        ? "Access denied. Link may have expired."
        : errorDescription || "Authentication failed";
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(message)}`
    );
  }

  // token_hash path — preferred, and what /auth/confirm uses.
  //
  // Unlike the PKCE `code` branch below, verifyOtp needs nothing stored in
  // this browser, so it completes even when the confirmation mail is opened
  // somewhere other than where signup happened (the normal case on a phone,
  // where mail apps use their own in-app browser). Handled here as well as on
  // /auth/confirm so that links already sitting in customers' inboxes, and
  // any template still pointing at this route, both land signed in.
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash) {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type as EmailOtpType) ?? "signup",
    });

    if (verifyError) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(
          "This confirmation link is no longer valid. Please sign up again."
        )}`
      );
    }

    const redirectUrl = new URL(next || "/account", origin);
    redirectUrl.searchParams.set("emailVerified", "true");
    return NextResponse.redirect(redirectUrl);
  }

  // Exchange auth code for session (signup verification).
  //
  // PKCE: only succeeds in the SAME browser that called signUp(), because it
  // needs that browser's code_verifier cookie. Kept for desktop, where the
  // customer usually does open the mail in the same browser — but the
  // token_hash branch above is what makes this work on mobile.
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(
          "Email verification failed. Please try signing up again."
        )}`
      );
    }

    // Verify user session exists after exchange
    const { data: { user } } = await supabase.auth.getUser();

    // Redirect to account with email verified message
    const redirectUrl = new URL(next || "/account", origin);
    redirectUrl.searchParams.set("emailVerified", "true");

    return NextResponse.redirect(redirectUrl);
  }

  // No code or error means invalid request
  return NextResponse.redirect(
    `${origin}/auth/login?error=${encodeURIComponent(
      "Invalid verification link. Please request a new one."
    )}`
  );
}
