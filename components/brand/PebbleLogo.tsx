"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LOGO_ART } from "./logo-paths";

/**
 * Animated hero logo — Phase 9, concept 1 "Pebble morph" (owner's pick,
 * 2026-11-15), with the logo scattered faintly behind as a static pattern.
 *
 * The "co / zi." mark sits on a soft pebble. The pebble slowly reshapes
 * between three blob outlines while the colours step through the three brand
 * colourways (milk on orange → rust on milk → brown on milk). 3 cycles of 12s,
 * then it rests on the primary colourway.
 *
 * Rules (docs/DESIGN.md §6b):
 * - visible from the first frame in its static primary colours; the box size
 *   is fixed by the parent, so nothing shifts;
 * - animation starts only after window load, pauses off-screen and when the
 *   tab is hidden; a pause button is offered while it runs (WCAG 2.2.2: it
 *   moves for more than 5 seconds);
 * - prefers-reduced-motion: never starts (static primary logo);
 * - one accessible name "Cozi Handmade"; every drawn layer is aria-hidden.
 *
 * SVG SMIL (<animate>) does the morph: it is the one way to morph a path that
 * works in Safari, Chrome and Firefox alike, and needs no library.
 */

type Surface = "brown" | "cream" | "orange";

const COL = {
  orange: "#A74508",
  rust: "#88290B",
  milk: "#F5F4F0",
  brown: "#4D1808",
};

/* The scattered marks' colour and strength per surface (decorative only). */
const SCATTER: Record<Surface, { color: string; opacity: number }> = {
  brown: { color: COL.milk, opacity: 0.1 },
  orange: { color: COL.milk, opacity: 0.12 },
  cream: { color: COL.brown, opacity: 0.07 },
};

const CYCLE_S = 12;
const CYCLES = 3;

/* ── Pebble shapes: same structure (8 points) so they can morph ─────────── */

function blob(radii: number[], cx = 100, cy = 100): string {
  const n = radii.length;
  const pts = radii.map((r, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  // Closed Catmull-Rom spline as cubic Béziers: smooth, pebble-like.
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
}

const PEBBLE_A = blob([84, 80, 86, 78, 88, 79, 85, 81]);
const PEBBLE_B = blob([88, 74, 82, 88, 76, 86, 78, 84]);
const PEBBLE_C = blob([78, 88, 76, 84, 88, 74, 86, 80]);

/* Hold each colourway, then ease into the next (keyTimes over one cycle). */
const KEY_TIMES = "0;0.27;0.33;0.6;0.66;0.94;1";
const SPLINE = "0.45 0 0.55 1";
const KEY_SPLINES = Array(6).fill(SPLINE).join(";");
const SHAPES = [PEBBLE_A, PEBBLE_A, PEBBLE_B, PEBBLE_B, PEBBLE_C, PEBBLE_C, PEBBLE_A].join(";");
const PEBBLE_FILL = [COL.orange, COL.orange, COL.milk, COL.milk, COL.milk, COL.milk, COL.orange].join(";");
const MARK_FILL = [COL.milk, COL.milk, COL.rust, COL.rust, COL.brown, COL.brown, COL.milk].join(";");

const MARK_IDS = new Set(["c", "o", "i-dot", "z", "i-stem", "period"]);
const MARK_VIEWBOX = "455 81 1103 1703";
const MARK_PATHS = LOGO_ART.stacked.paths.filter((p) => MARK_IDS.has(p.id));
const MONO = LOGO_ART.monogram;

/* One tile of the scattered pattern (240×240), repeated across the area. */
const SCATTER_TILE: { kind: "mark" | "mono"; x: number; y: number; h: number; rot: number }[] = [
  { kind: "mark", x: 18, y: 14, h: 62, rot: -12 },
  { kind: "mono", x: 150, y: 30, h: 34, rot: 14 },
  { kind: "mark", x: 112, y: 118, h: 44, rot: 8 },
  { kind: "mono", x: 30, y: 160, h: 40, rot: -6 },
  { kind: "mono", x: 196, y: 176, h: 26, rot: 22 },
];

export default function PebbleLogo({
  surface,
  className = "",
  pebbleClassName = "h-[min(70%,26rem)]",
  patternScale = 1,
}: {
  surface: Surface;
  /** Sizes the whole area (pattern fills it); set width/height here. */
  className?: string;
  /** Sizes the pebble inside the area (it stays square). */
  pebbleClassName?: string;
  /** Bigger = larger scattered marks. */
  patternScale?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const userPausedRef = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = true;
    let started = false;
    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      if (!started) return;
      if (visible && !document.hidden && !userPausedRef.current) svg.unpauseAnimations();
      else svg.pauseAnimations();
    };

    const start = () => {
      if (started) return;
      started = true;
      svg.querySelectorAll("animate").forEach((a) => (a as SVGAnimationElement).beginElement());
      setRunning(true);
      sync();
      // Hide the pause button once the 3 cycles are over (timeline time,
      // so check again later if it was paused along the way).
      const check = () => {
        if (svg.getCurrentTime() >= CYCLE_S * CYCLES) setRunning(false);
        else doneTimer = setTimeout(check, 1000);
      };
      doneTimer = setTimeout(check, 1000);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(wrap);
    document.addEventListener("visibilitychange", sync);
    // After load: never competes with first render.
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    // Expose for the pause button.
    (wrap as HTMLDivElement & { __sync?: () => void }).__sync = sync;
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("load", start);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, []);

  const togglePause = () => {
    const next = !userPausedRef.current;
    userPausedRef.current = next;
    setUserPaused(next);
    (wrapRef.current as (HTMLDivElement & { __sync?: () => void }) | null)?.__sync?.();
  };

  const scatter = SCATTER[surface];
  const tile = 240 / patternScale;

  return (
    // `relative` only when the caller hasn't positioned it (e.g. absolute
    // inset-0 inside the intro's media block); both at once would clash.
    <div ref={wrapRef} className={`overflow-hidden ${/\b(absolute|fixed)\b/.test(className) ? "" : "relative"} ${className}`}>
      {/* The drawing is one image named "Cozi Handmade"; the pause button
          sits outside it so screen readers can still reach it. */}
      <div role="img" aria-label="Cozi Handmade" className="absolute inset-0">
      {/* Static scattered pattern of faint logos (decorative). */}
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" focusable="false">
        <defs>
          <symbol id={`mk${uid}`} viewBox={MARK_VIEWBOX}>
            {MARK_PATHS.map((p) => (
              <path key={p.id} d={p.d} fillRule="evenodd" transform={p.transform} />
            ))}
          </symbol>
          <symbol id={`mo${uid}`} viewBox={MONO.viewBox}>
            {MONO.paths.map((p) => (
              <path key={p.id} d={p.d} fillRule="evenodd" transform={p.transform} />
            ))}
          </symbol>
          <pattern
            id={`pt${uid}`}
            width={tile}
            height={tile}
            patternUnits="userSpaceOnUse"
            patternTransform={`scale(${tile / 240})`}
          >
            <g fill={scatter.color} opacity={scatter.opacity}>
              {SCATTER_TILE.map((s, i) => {
                const w = s.kind === "mark" ? s.h * 0.648 : s.h * 0.886;
                return (
                  <use
                    key={i}
                    href={`#${s.kind === "mark" ? "mk" : "mo"}${uid}`}
                    x={s.x}
                    y={s.y}
                    width={w}
                    height={s.h}
                    transform={`rotate(${s.rot} ${s.x + w / 2} ${s.y + s.h / 2})`}
                  />
                );
              })}
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#pt${uid})`} />
      </svg>

      {/* The pebble + mark, centred, square. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          ref={svgRef}
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 200 200"
          className={`aspect-square w-auto max-w-[85%] ${pebbleClassName}`}
          style={{ filter: surface === "cream" ? "drop-shadow(0 4px 16px rgba(77,24,8,0.12))" : undefined }}
        >
          <path d={PEBBLE_A} fill={COL.orange}>
            <animate attributeName="d" values={SHAPES} keyTimes={KEY_TIMES} calcMode="spline" keySplines={KEY_SPLINES} dur={`${CYCLE_S}s`} begin="indefinite" repeatCount={CYCLES} fill="freeze" />
            <animate attributeName="fill" values={PEBBLE_FILL} keyTimes={KEY_TIMES} calcMode="spline" keySplines={KEY_SPLINES} dur={`${CYCLE_S}s`} begin="indefinite" repeatCount={CYCLES} fill="freeze" />
          </path>
          {/* The mark: ~58% of the pebble's height, centred. */}
          <svg x="65.5" y="42" width="69" height="106" viewBox={MARK_VIEWBOX} overflow="visible">
            <g fill={COL.milk}>
              <animate attributeName="fill" values={MARK_FILL} keyTimes={KEY_TIMES} calcMode="spline" keySplines={KEY_SPLINES} dur={`${CYCLE_S}s`} begin="indefinite" repeatCount={CYCLES} fill="freeze" />
              {MARK_PATHS.map((p) => (
                <path key={p.id} d={p.d} fillRule="evenodd" transform={p.transform} />
              ))}
            </g>
          </svg>
        </svg>
      </div>
      </div>

      {running && (
        <button
          type="button"
          onClick={togglePause}
          aria-label={userPaused ? "Play logo animation" : "Pause logo animation"}
          className={`focus-ring absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-pill backdrop-blur-sm ${
            surface === "cream" ? "bg-brown/60 text-milk" : "bg-milk/20 text-milk ring-1 ring-milk/40"
          }`}
          style={{ touchAction: "manipulation" }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {userPaused ? <path d="M8 5.5v13l11-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
          </svg>
        </button>
      )}
    </div>
  );
}
