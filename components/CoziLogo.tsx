interface CoziLogoProps {
  className?: string;
  color?: string;
}

export default function CoziLogo({
  className = "",
  color = "#7B3518",
}: CoziLogoProps) {
  return (
    <svg
      viewBox="0 0 248 84"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cozi Handmade"
      role="img"
    >
      <defs>
        {/* Light roughness to simulate brush-stroke texture on edges */}
        <filter id="cozi-brush" x="-4%" y="-10%" width="108%" height="125%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.03 0.05"
            numOctaves="3"
            seed="12"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      {/*
        "Cozi" — Cormorant Garamond 700 italic.
        strokeWidth + paintOrder="stroke fill" widens the strokes
        to match the thick brush-marker look in the image.
      */}
      <text
        x="4"
        y="60"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontSize="68"
        fontStyle="italic"
        fontWeight="700"
        fill={color}
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        paintOrder="stroke fill"
        filter="url(#cozi-brush)"
      >
        Cozi
      </text>

      {/*
        "HANDMADE" — Jost (the body font), clearly readable,
        positioned bottom-right of the Cozi letterforms.
      */}
      <text
        x="126"
        y="80"
        fontFamily="'Jost', system-ui, sans-serif"
        fontSize="18"
        fontWeight="600"
        letterSpacing="3"
        fill={color}
      >
        HANDMADE
      </text>
    </svg>
  );
}
