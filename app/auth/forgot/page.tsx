"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Stage = "request" | "sent";

export default function ForgotPasswordPage() {
  const [stage, setStage] = useState<Stage>("request");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setStage("sent");
  }

  if (stage === "sent") {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-blue-100">
            <svg
              className="w-9 h-9 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-blue-600 font-body mb-1">
            Check your email
          </p>
          <h1 className="font-heading italic text-3xl font-400 text-deep-brown mb-3">
            Reset link sent
          </h1>
          <p className="text-sm text-taupe-dark font-body leading-relaxed max-w-sm mx-auto mb-6">
            We sent a password reset link to <strong className="text-deep-brown">{email}</strong>.
            Click it to set a new password.
          </p>
          <p className="text-xs text-taupe-dark font-body mb-6">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              onClick={() => {
                setStage("request");
                setEmail("");
              }}
              className="underline underline-offset-2 font-semibold"
              style={{ color: "#8B2035" }}
            >
              try again
            </button>
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center px-8 h-12 rounded-none
                       text-cream font-semibold text-sm tracking-wide font-body hover:-translate-y-px
                       transition-all duration-200"
            style={{ backgroundColor: "#8B2035" }}
          >
            Back to Sign In
          </Link>
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
            Forgot password?
          </h1>
          <p className="text-sm text-taupe-dark mt-2 font-body">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-cream-darker p-7">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5 font-body"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 px-4 rounded-xl border border-taupe/40 bg-white text-deep-brown
                           text-sm placeholder:text-taupe/50 focus:outline-none transition-all duration-200"
                onFocus={(e) => {
                  e.target.style.borderColor = "#8B2035";
                  e.target.style.boxShadow = "0 0 0 3px #8B203520";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "";
                  e.target.style.boxShadow = "";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-none text-cream font-semibold text-sm tracking-wide
                         transition-all duration-200 disabled:opacity-50 hover:-translate-y-px
                         hover:shadow-lg font-body mt-6"
              style={{ backgroundColor: "#8B2035" }}
            >
              {loading ? "Sending…" : "Send Reset Link"}
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
