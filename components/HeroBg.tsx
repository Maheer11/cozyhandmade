/* Hero section backgrounds — wine / milk cloud-rainy split.
   Rain drops use native SVG animation so they work without JS. */

const WINE  = "#3E0B15";
const MILK  = "#FBF0E4";

/* ── Mobile (portrait) ─────────────────────────────────────────
   Milk cloud sweeps in from the right with a wavy left edge.
   Wine fills the left / lower area where the text sits. */
export function HeroBgMobile() {
  return (
    <>
      {/* Wine base */}
      <div className="absolute inset-0" style={{ background: WINE }} />

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* ── Milk cloud — organic wavy right-side shape ── */}
        <path
          d="M390,0 L224,0
             Q186,42 226,86  Q266,130 204,178
             Q142,226 208,272 Q274,318 198,368
             Q122,418 204,464 Q286,510 210,560
             Q134,610 216,656 L390,656 Z"
          fill={MILK} opacity="0.95"
        />

        {/* Cloud wisps bleeding over the divider into wine */}
        <ellipse cx="214" cy="96"  rx="66" ry="22" fill={MILK} opacity="0.15"/>
        <ellipse cx="196" cy="232" rx="54" ry="18" fill={MILK} opacity="0.13"/>
        <ellipse cx="204" cy="378" rx="72" ry="24" fill={MILK} opacity="0.11"/>
        <ellipse cx="192" cy="535" rx="60" ry="20" fill={MILK} opacity="0.09"/>

        {/* Wine wisps bleeding into milk */}
        <ellipse cx="272" cy="150" rx="50" ry="16" fill={WINE} opacity="0.07"/>
        <ellipse cx="310" cy="370" rx="55" ry="18" fill={WINE} opacity="0.06"/>
        <ellipse cx="280" cy="560" rx="48" ry="15" fill={WINE} opacity="0.05"/>

        {/* ── Rain on wine side — milk-coloured drops ── */}
        {[
          [28,  55,  2.8, 0.0],
          [68,  185, 3.2, 0.6],
          [105, 42,  2.5, 1.1],
          [148, 160, 3.0, 0.3],
          [52,  325, 2.7, 0.9],
          [178, 85,  3.4, 0.5],
          [82,  430, 2.9, 1.3],
          [124, 270, 3.1, 0.1],
          [162, 465, 2.6, 0.8],
          [38,  555, 3.3, 0.4],
          [92,  620, 2.8, 1.0],
          [145, 700, 3.0, 0.2],
        ].map(([cx, cy, dur, begin]) => (
          <ellipse key={`mw-${cx}-${cy}`} cx={cx} cy={cy} rx={1.4} ry={7} fill={MILK}>
            <animateTransform attributeName="transform" type="translate"
              values={`0,0;-14,${Math.round((dur as number)*95)}`}
              dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" additive="sum"/>
            <animate attributeName="opacity"
              values={`0;0.30;0.30;0`}
              dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite"/>
          </ellipse>
        ))}

        {/* ── Rain on milk side — wine-coloured drops ── */}
        {[
          [254, 52,  3.0, 0.4],
          [294, 178, 2.6, 0.9],
          [340, 38,  3.3, 0.1],
          [374, 258, 2.8, 0.6],
          [268, 348, 3.1, 1.1],
          [320, 130, 2.7, 0.3],
          [360, 462, 3.0, 0.8],
          [246, 518, 2.9, 0.2],
          [306, 600, 3.2, 0.7],
          [372, 680, 2.6, 1.2],
        ].map(([cx, cy, dur, begin]) => (
          <ellipse key={`mm-${cx}-${cy}`} cx={cx} cy={cy} rx={1.4} ry={7} fill={WINE}>
            <animateTransform attributeName="transform" type="translate"
              values={`0,0;-14,${Math.round((dur as number)*95)}`}
              dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" additive="sum"/>
            <animate attributeName="opacity"
              values={`0;0.22;0.22;0`}
              dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite"/>
          </ellipse>
        ))}
      </svg>
    </>
  );
}

/* ── Desktop (landscape) ───────────────────────────────────────
   Wine left column (text), milk right column (image grid).
   Cloud wavy vertical divider at ~50% width. */
export function HeroBgDesktop() {
  return (
    <>
      {/* Wine base — milk shape paints over the right half */}
      <div className="absolute inset-0" style={{ background: WINE }} />

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* ── Milk area — right half with cloud-wavy left edge ── */}
        <path
          d="M1200,0 L578,0
             Q538,52 582,104 Q626,156 566,210
             Q506,264 578,318 Q650,372 562,428
             Q474,484 576,540 Q678,596 568,652
             Q458,708 578,700 L1200,700 Z"
          fill={MILK} opacity="0.96"
        />

        {/* Cloud wisps — wine side of divider */}
        <ellipse cx="548" cy="112" rx="68" ry="24" fill={MILK} opacity="0.14"/>
        <ellipse cx="532" cy="265" rx="60" ry="20" fill={MILK} opacity="0.12"/>
        <ellipse cx="550" cy="420" rx="74" ry="26" fill={MILK} opacity="0.13"/>
        <ellipse cx="528" cy="572" rx="64" ry="22" fill={MILK} opacity="0.10"/>

        {/* Cloud wisps — milk side of divider */}
        <ellipse cx="628" cy="180" rx="62" ry="21" fill={WINE} opacity="0.06"/>
        <ellipse cx="644" cy="360" rx="68" ry="23" fill={WINE} opacity="0.05"/>
        <ellipse cx="620" cy="540" rx="60" ry="20" fill={WINE} opacity="0.06"/>

        {/* ── Rain on wine side — milk drops ── */}
        {[
          [55,  55,  2.8, 0.0],
          [115, 185, 3.2, 0.6],
          [178, 75,  2.5, 1.1],
          [245, 250, 3.0, 0.3],
          [315, 145, 2.7, 0.9],
          [380, 355, 3.4, 0.5],
          [445, 95,  2.9, 1.3],
          [490, 275, 3.1, 0.1],
          [88,  430, 2.6, 0.8],
          [152, 540, 3.3, 0.4],
          [218, 390, 2.8, 1.0],
          [285, 480, 3.0, 0.2],
          [350, 200, 3.2, 0.7],
          [420, 450, 2.7, 1.2],
          [478, 590, 3.0, 0.5],
        ].map(([cx, cy, dur, begin]) => (
          <ellipse key={`dw-${cx}-${cy}`} cx={cx} cy={cy} rx={1.5} ry={8} fill={MILK}>
            <animateTransform attributeName="transform" type="translate"
              values={`0,0;-18,${Math.round((dur as number)*105)}`}
              dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" additive="sum"/>
            <animate attributeName="opacity"
              values={`0;0.28;0.28;0`}
              dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite"/>
          </ellipse>
        ))}

        {/* ── Rain on milk side — wine drops ── */}
        {[
          [650, 70,  3.0, 0.4],
          [725, 210, 2.6, 0.9],
          [808, 105, 3.3, 0.1],
          [882, 320, 2.8, 0.6],
          [958, 195, 3.1, 1.1],
          [1040,385, 2.7, 0.3],
          [1108,95,  3.0, 0.8],
          [685, 460, 2.9, 0.2],
          [762, 565, 3.2, 0.7],
          [845, 425, 2.6, 1.2],
          [920, 555, 3.0, 0.5],
          [1000,280, 2.8, 1.0],
        ].map(([cx, cy, dur, begin]) => (
          <ellipse key={`dm-${cx}-${cy}`} cx={cx} cy={cy} rx={1.5} ry={8} fill={WINE}>
            <animateTransform attributeName="transform" type="translate"
              values={`0,0;-18,${Math.round((dur as number)*105)}`}
              dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" additive="sum"/>
            <animate attributeName="opacity"
              values={`0;0.20;0.20;0`}
              dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite"/>
          </ellipse>
        ))}
      </svg>
    </>
  );
}
