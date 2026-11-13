"use client";

import { useEffect, useRef } from "react";
import { LOGO_ART } from "./logo-paths";

/**
 * Animated stacked "co / zi." + HANDMADE logo (DESIGN.md §5b).
 *
 * A slow colour wave passes letter by letter (c → o → z → i → . → HANDMADE),
 * cycling through the site's own colourways, including the owner's milk-with-
 * outline look. It never moves or resizes anything: only fill and stroke
 * colours change, so there is no layout shift.
 *
 * Non-negotiables, all handled here:
 * - Visible immediately: the SVG is server-rendered in its static colour; the
 *   wave only starts after the page's load event.
 * - prefers-reduced-motion: no animation at all (CSS below) — the static
 *   primary colourway shows.
 * - Pauses off-screen (IntersectionObserver toggles data-playing).
 * - Accessible name "Cozi Handmade" on the svg; the letter paths are
 *   presentational and hidden from assistive tech.
 * - Every logo on the site uses this (owner's decision, 2026-11-13): header,
 *   mobile drawer, footer (brown surface) and the checkout header.
 */

// Wave order: each letter's step in the wave. HANDMADE moves as one.
const WAVE_STEP: Record<string, number> = {
  c: 0, o: 1, z: 2, "i-stem": 3, "i-dot": 3, period: 4,
};
const HANDMADE_STEP = 5;

type Surface = "cream" | "orange" | "brown";

export default function AnimatedCoziLogo({
  surface = "cream",
  variant = "stacked",
  className = "",
}: {
  /** The background it sits on; picks a colour set with enough contrast. */
  surface?: Surface;
  /**
   * stacked    — "co / zi." + HANDMADE
   * mark       — "co / zi." letters only, cropped tight (the site header)
   * horizontal — one-line "cozi."
   */
  variant?: "stacked" | "mark" | "horizontal";
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let observer: IntersectionObserver | undefined;
    const start = () => {
      el.dataset.ready = "true";
      observer = new IntersectionObserver(
        ([entry]) => { el.dataset.playing = entry.isIntersecting ? "true" : "false"; },
        { threshold: 0.1 },
      );
      observer.observe(el);
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      window.removeEventListener("load", start);
      observer?.disconnect();
    };
  }, []);

  // "mark" = the stacked artwork without HANDMADE (unreadable at header size),
  // with the viewBox cropped to the letters' measured bounds plus a little
  // room for the outline stroke.
  const art = variant === "mark"
    ? { viewBox: "455 81 1103 1703", paths: LOGO_ART.stacked.paths.filter((p) => p.id in WAVE_STEP) }
    : LOGO_ART[variant];

  return (
    <svg
      ref={ref}
      viewBox={art.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={`cozi-wave cozi-wave--${surface} ${className}`}
      preserveAspectRatio={variant === "horizontal" ? "xMinYMid meet" : "xMidYMid meet"}
      role="img"
      aria-label="Cozi Handmade"
    >
      <title>Cozi Handmade</title>
      <g aria-hidden="true">
        {art.paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            transform={p.transform}
            fillRule="evenodd"
            // A fixed on-screen width, so the milk-with-outline step stays
            // visible even at header size (a viewBox-unit stroke would vanish).
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            className={`cozi-wave__part${p.id in WAVE_STEP ? "" : " cozi-wave__part--small"}`}
            style={{ ["--step" as string]: WAVE_STEP[p.id] ?? HANDMADE_STEP }}
          />
        ))}
      </g>
    </svg>
  );
}
