"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import CoziLogo from "@/components/CoziLogo";
import PebbleLogo from "@/components/brand/PebbleLogo";
import { introMedia } from "@/config/intro";
import { cloudinaryAuto, emailProblem, joinPrivateAccess, markIntroSeen, normaliseEmail } from "@/lib/intro";

/**
 * "Private access" intro — docs/DESIGN.md §7.
 *
 * An overlay, never a gate: the homepage renders underneath and in the HTML.
 * This markup is always server-rendered but hidden by CSS; the inline script
 * in <head> (lib/intro introPreflightScript, app/layout.tsx) sets
 * html[data-intro="show"] before first paint on a first visit to "/", so the
 * store never flashes first and nothing shifts. Closing (Esc, "Enter the
 * shop", "Skip") or joining records cozi_intro_v{version} in localStorage.
 *
 * Phase 7: the submit is mocked (lib/intro joinPrivateAccess).
 */
export default function PrivateAccessIntro() {
  const titleId = useId();
  const emailId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const close = useCallback(() => {
    markIntroSeen();
    document.documentElement.removeAttribute("data-intro");
    const back = returnFocusRef.current;
    if (back instanceof HTMLElement && back !== document.body) back.focus();
  }, []);

  // Showing or not is decided before paint by the <head> script; CSS does the
  // hiding (display:none also hides it from screen readers). React only reads
  // the flag: focus moves in once on load if it is showing.
  useEffect(() => {
    if (!isIntroOpen()) return;
    returnFocusRef.current = document.activeElement;
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  // Esc closes; Tab stays inside the dialog. Inert once it has closed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isIntroOpen()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      const inside = dialogRef.current.contains(current);
      if (e.shiftKey && (current === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    const problem = emailProblem(email);
    if (problem) {
      setError(problem); // the field keeps its value
      return;
    }
    setError(null);
    setStatus("sending");
    const result = await joinPrivateAccess(normaliseEmail(email), honeypot);
    if (!result.ok) {
      setError(result.error);
      setStatus("idle");
      return;
    }
    markIntroSeen();
    setStatus("done");
    requestAnimationFrame(() => successRef.current?.focus({ preventScroll: true }));
  }

  async function resend() {
    setResent(false);
    await joinPrivateAccess(normaliseEmail(email), "");
    setResent(true);
  }

  const done = status === "done";

  return (
    <div
      ref={dialogRef}
      className="cozi-intro"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      // Hidden by CSS (display:none) unless html[data-intro="show"], which
      // also removes it from the accessibility tree.
    >
      <IntroMedia />

      <div className="cozi-intro__panel">
        <div className="cozi-intro__inner">
          {/* Top row: logo, and "Skip" on phones/tablets */}
          <div className="flex items-start justify-between gap-4">
            {/* "cozi." + HANDMADE in milk. HANDMADE is real 12px text: the
                stacked SVG's own wordmark is only ~2px tall at this size. */}
            <div className="flex flex-col items-center">
              <CoziLogo variant="mark" color="var(--color-milk)" className="h-14 w-auto lg:h-16" />
              <span aria-hidden="true" className="mt-1.5 font-body text-xs font-semibold uppercase tracking-[0.35em] text-milk">
                Handmade
              </span>
            </div>
            <button
              type="button"
              onClick={close}
              className="cozi-intro__link focus-ring -mr-2 inline-flex min-h-11 items-center rounded-pill px-2 font-body text-sm font-semibold text-milk lg:hidden"
            >
              Skip <span aria-hidden="true" className="ml-1">→</span>
            </button>
          </div>

          <div className="cozi-intro__body">
            {!done ? (
              <>
                <p className="type-eyebrow text-milk">Private access</p>
                <h2
                  id={titleId}
                  ref={titleRef}
                  tabIndex={-1}
                  className="cozi-intro__title mt-3 font-heading font-semibold text-milk outline-none"
                >
                  Made by hand.
                  <br />
                  Seen first by you.
                </h2>
                <p className="type-body mt-4 text-milk">
                  New pieces and restocks reach our circle before anyone else.
                </p>

                <form className="mt-7" onSubmit={onSubmit} noValidate>
                  <label htmlFor={emailId} className="sr-only">
                    Email address
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className="cozi-intro__field"
                  />
                  {/* Honeypot: invisible to people, tempting to bots. */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="absolute -left-[9999px] h-px w-px opacity-0"
                  />
                  {error && (
                    <p id={errorId} role="alert" className="mt-2 flex items-start gap-2 type-small font-semibold text-milk">
                      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7.5v5.5M12 16.5h.01" strokeLinecap="round" />
                      </svg>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-small bg-milk px-6 font-body text-sm font-semibold uppercase tracking-[0.14em] text-brown transition-colors duration-150 hover:bg-white disabled:cursor-wait disabled:opacity-80"
                  >
                    {status === "sending" ? "Joining…" : "Join private access"}
                  </button>
                  {/* Privacy policy link to be added when the page exists. */}
                  <p className="type-small mt-4 text-milk">
                    Get new collections and restock news from Cozi. Unsubscribe anytime.
                  </p>
                </form>
              </>
            ) : (
              <div aria-live="polite">
                <span className="flex h-14 w-14 items-center justify-center rounded-pill bg-peach text-brown" aria-hidden="true">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                    <path d="M3.5 7l8.5 6 8.5-6" />
                  </svg>
                </span>
                <p className="type-eyebrow mt-6 text-milk">Almost there</p>
                <h2
                  id={titleId}
                  ref={successRef}
                  tabIndex={-1}
                  className="cozi-intro__title cozi-intro__title--success mt-3 font-heading font-semibold text-milk outline-none"
                >
                  Check your inbox to confirm your place.
                </h2>
                <p className="type-body mt-4 break-words text-milk">
                  We sent a link to <strong className="font-semibold">{normaliseEmail(email)}</strong>.
                </p>
                <p className="type-body mt-2 text-milk">
                  Nothing arrived? Check spam, or{" "}
                  <button
                    type="button"
                    onClick={resend}
                    className="cozi-intro__link focus-ring rounded-small font-semibold underline underline-offset-2"
                  >
                    send it again
                  </button>
                  .
                </p>
                {resent && (
                  <p className="type-small mt-2 font-semibold text-milk" role="status">
                    Sent again.
                  </p>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="focus-ring mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-small bg-milk px-6 font-body text-sm font-semibold uppercase tracking-[0.14em] text-brown transition-colors duration-150 hover:bg-white"
                >
                  Enter the shop
                </button>
              </div>
            )}
          </div>

          {/* Always reachable, every size */}
          <button
            type="button"
            onClick={close}
            className="cozi-intro__link focus-ring mt-6 inline-flex min-h-11 items-center self-start rounded-pill font-body text-sm font-semibold text-milk"
          >
            Enter the shop <span aria-hidden="true" className="ml-1">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** The colour / photo block. Its size comes from CSS, so nothing shifts. */
function IntroMedia() {
  const [failed, setFailed] = useState(false);
  const { mode, colour, image } = introMedia as {
    mode: string;
    colour: string;
    image: { desktop: string; mobile: string; alt: string; focalPoint: string };
  };
  const useImage = mode === "image" && image.desktop !== "" && image.mobile !== "" && !failed;
  return (
    <div className="cozi-intro__media" style={{ backgroundColor: colour }}>
      {/* No photo: the animated pebble logo on the brown block (Phase 9).
          It sits in the visible part above the panel's overlapping corner. */}
      {!useImage && (
        <PebbleLogo
          surface="brown"
          className="absolute inset-x-0 top-0 bottom-7 md:bottom-8 lg:bottom-0"
          pebbleClassName="h-[min(72%,26rem)]"
          patternScale={1}
        />
      )}
      {useImage && (
        <picture>
          {/* Art direction: phones never download the desktop crop. */}
          <source media="(min-width: 768px)" srcSet={cloudinaryAuto(image.desktop)} />
          <img
            src={cloudinaryAuto(image.mobile)}
            alt={image.alt}
            onError={() => setFailed(true)}
            // The photo can fail before React attaches onError (it starts
            // loading from the server HTML), so also check when it attaches.
            ref={(el) => {
              if (el && el.complete && el.naturalWidth === 0) setFailed(true);
            }}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            // color: transparent hides any alt text / broken-image glyph
            // during the moment before the fallback takes over.
            style={{ objectPosition: image.focalPoint, color: "transparent" }}
          />
        </picture>
      )}
    </div>
  );
}

/** Set before paint by the <head> script; removed by close(). */
function isIntroOpen(): boolean {
  return document.documentElement.getAttribute("data-intro") === "show";
}
