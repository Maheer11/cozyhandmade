"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";

type Stage = "loading" | "form" | "success" | "error";

function ResetPasswordForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    verifySession();
  }, []);

  async function verifySession() {
    const supabase = createClient();

    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      setError(
        "Invalid reset link. Password recovery links are only valid for 24 hours."
      );
      setStage("error");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Session expired. Please request a new password reset link."
      );
      setStage("error");
      return;
    }

    setStage("form");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(
        updateError.message === "Auth session not found"
          ? "Your session has expired. Please request a new password reset link."
          : updateError.message
      );
      setLoading(false);
      return;
    }

    setStage("success");
  }

  async function handleResendEmail() {
    setLoading(true);
    const email = prompt("Enter your email address:");

    if (!email) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const siteUrl = window.location.origin;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${siteUrl}/reset-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    alert(
      "Password reset link sent! Check your email (and spam folder)."
    );
    setLoading(false);
  }

  if (stage === "success") {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100">
            <svg
              className="w-9 h-9 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-body mb-1">
            Success
          </p>
          <h1 className="font-heading italic text-3xl font-400 text-deep-brown mb-3">
            Password updated
          </h1>
          <p className="text-sm text-taupe-dark font-body leading-relaxed max-w-sm mx-auto mb-6">
            Your password has been changed successfully. Sign in with your new
            password.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center px-8 h-12 rounded-none
                       text-cream font-semibold text-sm tracking-wide font-body hover:-translate-y-px
                       transition-all duration-200"
            style={{ backgroundColor: "#8B2035" }}
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-red-100">
            <svg
              className="w-9 h-9 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c.866 1.5 2.926 2.875 5.303 2.875s4.437-1.375 5.303-2.875m0 0a3.75 3.75 0 11-7.5 0m7.5 0a3.75 3.75 0 1-7.5 0"
              />
            </svg>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-red-600 font-body mb-1">
            Invalid Link
          </p>
          <h1 className="font-heading italic text-3xl font-400 text-deep-brown mb-3">
            Link expired
          </h1>
          <p className="text-sm text-taupe-dark font-body leading-relaxed max-w-sm mx-auto mb-6">
            {error}
          </p>
          <button
            onClick={handleResendEmail}
            disabled={loading}
            className="inline-flex items-center justify-center px-8 h-12 rounded-none
                       text-cream font-semibold text-sm tracking-wide font-body hover:-translate-y-px
                       transition-all duration-200 disabled:opacity-50"
            style={{ backgroundColor: "#8B2035" }}
          >
            {loading ? "Sending…" : "Get New Reset Link"}
          </button>
          <Link
            href="/auth/login"
            className="block text-xs font-semibold underline underline-offset-2 mt-6"
            style={{ color: "#8B2035" }}
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin w-12 h-12 border-4 border-taupe/20 border-t-deep-brown rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-taupe-dark font-body">
            Verifying your reset link…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-taupe-dark font-body mb-2">
            Cozi Handmade
          </p>
          <h1 className="font-heading italic text-4xl font-400 text-deep-brown leading-tight">
            Set new password
          </h1>
          <p className="text-sm text-taupe-dark mt-2 font-body">
            Create a secure password to protect your account
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-cream-darker p-7">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <PasswordInput
              id="password"
              label="New Password"
              value={password}
              onChange={setPassword}
              placeholder="Min. 8 characters"
              required
            />

            <PasswordInput
              id="passwordConfirm"
              label="Confirm Password"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
              placeholder="Repeat password"
              required
            />

            <div className="pt-2 text-xs text-taupe-dark font-body">
              <p className="mb-2">Password requirements:</p>
              <ul className="space-y-1 text-taupe-dark/70">
                <li className={password.length >= 8 ? "text-emerald-600" : ""}>
                  ✓ At least 8 characters
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-none text-cream font-semibold text-sm tracking-wide
                         transition-all duration-200 disabled:opacity-50 hover:-translate-y-px
                         hover:shadow-lg font-body mt-6"
              style={{ backgroundColor: "#8B2035" }}
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-taupe/15 text-center">
            <p className="text-xs text-taupe-dark font-body">
              Remember your password?{" "}
              <Link
                href="/auth/login"
                className="font-semibold underline underline-offset-2"
                style={{ color: "#8B2035" }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-taupe-dark font-body mt-6 italic">
          est. 2018 · handcrafted with ♡
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
