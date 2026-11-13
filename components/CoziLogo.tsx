import { LOGO_ART } from "./brand/logo-paths";

interface CoziLogoProps {
  className?: string;
  /** Any CSS colour. Defaults to brand brown (the brown-on-cream colourway). */
  color?: string;
  /**
   * horizontal — one-line "cozi." for the header/footer (default)
   * stacked    — "co / zi." mark with HANDMADE, for hero and about
   * monogram   — "c." for small square spots
   */
  variant?: "horizontal" | "stacked" | "monogram";
}

// The approved traced artwork (see docs/DESIGN.md §5). Every letter is its own
// path and fills with currentColor, so the three colourways are just a
// `color` change: brown or rust on cream, milk on orange. The SVG is static
// markup: no animation here, and it renders instantly with the page.
export default function CoziLogo({
  className = "",
  color = "var(--color-brown)",
  variant = "horizontal",
}: CoziLogoProps) {
  const art = LOGO_ART[variant];
  return (
    <svg
      viewBox={art.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
      preserveAspectRatio="xMinYMid meet"
      role="img"
      aria-label="Cozi Handmade"
    >
      {art.paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill="currentColor"
          fillRule="evenodd"
          transform={p.transform}
        />
      ))}
    </svg>
  );
}
