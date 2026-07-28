interface CoziLogoProps {
  className?: string;
  color?: string;
}

// Needle-monogram mark: a stylized "C" swoosh threaded by a diagonal
// needle-and-eye line, paired with the "Cozihandmade" wordmark in
// Cormorant Garamond — the approved final mark from the logo-directions
// design project (Cozihandmade Logo.dc.html).
export default function CoziLogo({
  className = "",
  color = "#612328",
}: CoziLogoProps) {
  return (
    <svg
      viewBox="0 0 480 110"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cozi Handmade"
      role="img"
    >
      <svg x="0" y="5" width="100" height="100" viewBox="0 0 100 100">
        <path
          d="M78 30 C68 16 46 14 32 26 C16 40 16 64 32 76 C44 86 62 86 74 74"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
        <line x1="20" y1="82" x2="84" y2="18" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="84" cy="18" r="4" fill={color} />
      </svg>

      <text
        x="112"
        y="70"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontSize="52"
        fontWeight="700"
        stroke={color}
        strokeWidth="1.25"
        paintOrder="stroke fill"
        fill={color}
      >
        Cozihandmade
      </text>
    </svg>
  );
}
