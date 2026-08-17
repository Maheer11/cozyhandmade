interface CoziLogoProps {
  className?: string;
  color?: string;
}

// Hand-built vector wordmark — bold crescent "C" (open stroke arc), a ringed
// "o" (two concentric circles, evenodd), a blocky "z" (two bars + a
// diagonal that shares exact corner points with each bar so the union has
// no seam), and an "i" as a rounded bar with an oversized dot, plus a
// bold letter-spaced "HANDMADE" wordmark underneath. Replaced an imported
// raster logo (kept losing quality across crops/exports) so the mark is
// crisp at any size and, like the original SVG mark, recolorable via
// `color` for use on both light backgrounds (navbar) and dark ones (footer).
//
// Letters are kerned tight on purpose — C/o/z/i read as one connected
// wordmark, not four separate glyphs — and HANDMADE is sized/weighted to
// read clearly at a glance instead of disappearing under the mark.
export default function CoziLogo({
  className = "",
  color = "#612328",
}: CoziLogoProps) {
  return (
    <svg
      viewBox="-10 0 590 330"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cozi Handmade"
      role="img"
    >
      {/* C */}
      <path
        d="M196,68 C166,26 100,20 58,56 C10,98 10,170 58,206 C94,236 148,236 184,200"
        stroke={color}
        strokeWidth="34"
        strokeLinecap="round"
        fill="none"
      />

      {/* o — outer circle minus inner circle */}
      <path
        d="M348,158 A78,78 0 1,0 192,158 A78,78 0 1,0 348,158 Z
           M310,158 A40,40 0 1,0 230,158 A40,40 0 1,0 310,158 Z"
        fill={color}
        fillRule="evenodd"
      />

      {/* z — top bar, bottom bar, diagonal (shares corner points with both
          bars, so it reads as one solid shape with no visible seam) */}
      <rect x="370" y="80" width="130" height="44" fill={color} />
      <rect x="370" y="192" width="130" height="44" fill={color} />
      <polygon points="500,80 370,192 370,236 500,124" fill={color} />

      {/* i */}
      <rect x="518" y="80" width="34" height="156" rx="17" fill={color} />
      <circle cx="535" cy="32" r="30" fill={color} />

      <text
        x="272"
        y="306"
        fontFamily="var(--font-inter), Arial, sans-serif"
        fontWeight="700"
        fontSize="48"
        letterSpacing="7"
        fill={color}
        textAnchor="middle"
      >
        HANDMADE
      </text>
    </svg>
  );
}
