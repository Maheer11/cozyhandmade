"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const urlError     = searchParams.get("error");
  const message      = searchParams.get("message");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(urlError ?? "");
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo mark */}
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-taupe-dark font-body mb-2">
            Woven with Love
          </p>
          <h1 className="font-heading italic text-4xl font-400 text-deep-brown leading-tight">
            Welcome back
          </h1>
          <p className="text-sm text-taupe-dark mt-2 font-body">
            Sign in to view your orders and profile
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-cream-darker p-7">

          {message && (
            <div className="mb-5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-body">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5 font-body">
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
                onFocus={(e) => { e.target.style.borderColor = "#8B2035"; e.target.style.boxShadow = "0 0 0 3px #8B203520"; }}
                onBlur={(e)  => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-brown/80 uppercase tracking-wide font-body">
                  Password
                </label>
                <Link href="/auth/forgot" className="text-xs font-body" style={{ color: "#8B2035" }}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-xl border border-taupe/40 bg-white text-deep-brown
                           text-sm placeholder:text-taupe/50 focus:outline-none transition-all duration-200"
                onFocus={(e) => { e.target.style.borderColor = "#8B2035"; e.target.style.boxShadow = "0 0 0 3px #8B203520"; }}
                onBlur={(e)  => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-none text-cream font-semibold text-sm tracking-wide
                         transition-all duration-200 disabled:opacity-50 hover:-translate-y-px
                         hover:shadow-lg font-body mt-2"
              style={{ backgroundColor: "#8B2035" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-taupe/15 text-center">
            <p className="text-xs text-taupe-dark font-body">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="font-semibold underline underline-offset-2"
                    style={{ color: "#8B2035" }}>
                Create one free
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
