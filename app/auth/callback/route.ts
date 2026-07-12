import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  // Exchange auth code for session (signup verification)
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
