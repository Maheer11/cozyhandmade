/* Decorative craft-tool SVG illustrations used as background watermarks.
   All are outline / line-art so they stay subtle at low opacity. */

interface IconProps {
  className?: string;
  color?: string;
}

export function YarnBall({ className = "", color = "#D49AA8" }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="42" stroke={color} strokeWidth="2" />
      {/* wrap lines */}
      <path d="M14 38 C28 14 72 14 86 38 C95 52 84 70 66 76 C50 82 26 77 14 38 Z"
            stroke={color} strokeWidth="1.5" />
      <path d="M22 26 C40 62 70 74 84 50"
            stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 64 C26 46 50 82 84 76"
            stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 10 C32 30 28 68 35 88"
            stroke={color} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function Scissors({ className = "", color = "#C9A227" }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* handles */}
      <circle cx="22" cy="22" r="14" stroke={color} strokeWidth="2" />
      <circle cx="22" cy="76" r="14" stroke={color} strokeWidth="2" />
      {/* blades */}
      <line x1="33" y1="15" x2="92" y2="90" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="33" y1="83" x2="92" y2="8"  stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* pivot */}
      <circle cx="57" cy="48" r="4" fill={color} />
    </svg>
  );
}

export function SewingNeedle({ className = "", color = "#7B3518" }: IconProps) {
  return (
    <svg viewBox="0 0 32 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* body */}
      <rect x="13" y="22" width="6" height="100" rx="3" fill={color} />
      {/* eye */}
      <ellipse cx="16" cy="24" rx="5" ry="8" stroke={color} strokeWidth="1.8" />
      <ellipse cx="16" cy="24" rx="2.5" ry="4.5" fill="white" opacity="0.5" />
      {/* tip */}
      <path d="M13 122 L16 138 L19 122 Z" fill={color} />
      {/* thread tail */}
      <path d="M16 16 Q28 4 22 10 Q19 7 16 16" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function KnittingNeedles({ className = "", color = "#7A2030" }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* needle 1 */}
      <line x1="12" y1="12" x2="82" y2="90" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="6" fill={color} />
      {/* needle 2 */}
      <line x1="88" y1="12" x2="18" y2="90" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="88" cy="12" r="6" fill={color} />
      {/* yarn loops on needles */}
      <path d="M26 54 Q50 34 74 54" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M22 63 Q50 44 78 63" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function ThreadSpool({ className = "", color = "#4A1020" }: IconProps) {
  return (
    <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* top flange */}
      <ellipse cx="40" cy="18" rx="36" ry="14" stroke={color} strokeWidth="2" />
      {/* bottom flange */}
      <ellipse cx="40" cy="92" rx="36" ry="14" stroke={color} strokeWidth="2" />
      {/* barrel */}
      <line x1="4"  y1="18" x2="4"  y2="92" stroke={color} strokeWidth="2" />
      <line x1="76" y1="18" x2="76" y2="92" stroke={color} strokeWidth="2" />
      {/* thread windings */}
      <path d="M10 40 Q40 30 70 40" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8  52 Q40 42 72 52" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10 64 Q40 74 70 64" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* loose thread tail */}
      <path d="M4 55 Q-10 38 4 20" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function WoolSkein({ className = "", color = "#9B3A50" }: IconProps) {
  return (
    <svg viewBox="0 0 130 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* outer hank */}
      <ellipse cx="65" cy="45" rx="58" ry="36" stroke={color} strokeWidth="2" />
      {/* inner strands */}
      <ellipse cx="65" cy="45" rx="42" ry="25" stroke={color} strokeWidth="1.5" opacity="0.7" />
      <ellipse cx="65" cy="45" rx="26" ry="15" stroke={color} strokeWidth="1.2" opacity="0.5" />
      {/* tie bands */}
      <path d="M55 9 Q65 45 55 81" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M75 9 Q65 45 75 81" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function HandKnitting({ className = "", color = "#C9A227" }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* palm */}
      <path d="M30 75 Q20 78 18 65 L18 38 Q18 32 24 32 Q28 32 28 38 L28 52"
            stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* index finger */}
      <path d="M28 52 L28 28 Q28 22 34 22 Q40 22 40 28 L40 48"
            stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* middle finger */}
      <path d="M40 48 L40 24 Q40 18 46 18 Q52 18 52 24 L52 48"
            stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* ring finger */}
      <path d="M52 48 L52 28 Q52 22 58 22 Q64 22 64 28 L64 50"
            stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* pinky */}
      <path d="M64 50 L64 34 Q64 28 70 28 Q76 28 76 34 L76 60"
            stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* lower palm */}
      <path d="M76 60 Q78 76 70 80 L30 80 Q25 80 22 76"
            stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* yarn loop around index */}
      <path d="M28 42 Q34 38 40 42 Q34 46 28 42 Z"
            stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* yarn tail */}
      <path d="M34 38 Q45 28 56 35 Q62 44 52 48"
            stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
