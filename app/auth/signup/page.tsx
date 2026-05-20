"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Stage = "form" | "confirm";

export default function SignupPage() {
  const [stage,     setStage]     = useState<Stage>("form");
  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [password2, setPassword2] = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== password2) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setStage("confirm");
  }

  if (stage === "confirm") {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100">
            <svg className="w-9 h-9 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
            </svg>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-body mb-1">Almost there</p>
          <h1 className="font-heading italic text-3xl font-400 text-deep-brown mb-3">Check your inbox</h1>
          <p className="text-sm text-taupe-dark font-body leading-relaxed max-w-sm mx-auto">
            We sent a confirmation link to <strong className="text-deep-brown">{email}</strong>.
            Click it to activate your account — then sign in.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center mt-7 px-8 h-12 rounded-none
                       text-cream font-semibold text-sm tracking-wide font-body hover:-translate-y-px
                       transition-all duration-200"
            style={{ backgroundColor: "#8B2035" }}
          >
            Go to Sign In
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
            Woven with Love
          </p>
          <h1 className="font-heading italic text-4xl font-400 text-deep-brown leading-tight">
            Create your account
          </h1>
          <p className="text-sm text-taupe-dark mt-2 font-body">
            Track orders, earn rewards, and more
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-cream-darker p-7">

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-body">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5 font-body">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Amaka Okonkwo"
                className="w-full h-12 px-4 rounded-xl border border-taupe/40 bg-white text-deep-brown
                           text-sm placeholder:text-taupe/50 focus:outline-none transition-all duration-200"
                onFocus={(e) => { e.target.style.borderColor = "#C9A96E"; e.target.style.boxShadow = "0 0 0 3px #C9A96E20"; }}
                onBlur={(e)  => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
              />
            </div>

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
                onFocus={(e) => { e.target.style.borderColor = "#C9A96E"; e.target.style.boxShadow = "0 0 0 3px #C9A96E20"; }}
                onBlur={(e)  => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5 font-body">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full h-12 px-4 rounded-xl border border-taupe/40 bg-white text-deep-brown
                           text-sm placeholder:text-taupe/50 focus:outline-none transition-all duration-200"
                onFocus={(e) => { e.target.style.borderColor = "#C9A96E"; e.target.style.boxShadow = "0 0 0 3px #C9A96E20"; }}
                onBlur={(e)  => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
              />
            </div>

            <div>
              <label htmlFor="password2" className="block text-xs font-medium text-brown/80 uppercase tracking-wide mb-1.5 font-body">
                Confirm Password
              </label>
              <input
                id="password2"
                type="password"
                required
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Repeat password"
                className="w-full h-12 px-4 rounded-xl border border-taupe/40 bg-white text-deep-brown
                           text-sm placeholder:text-taupe/50 focus:outline-none transition-all duration-200"
                onFocus={(e) => { e.target.style.borderColor = "#C9A96E"; e.target.style.boxShadow = "0 0 0 3px #C9A96E20"; }}
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
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-taupe/15 text-center">
            <p className="text-xs text-taupe-dark font-body">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-semibold underline underline-offset-2"
                    style={{ color: "#8B2035" }}>
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
