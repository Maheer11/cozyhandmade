import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Plain square, uncropped — iOS applies its own corner mask, so
// apple-touch-icon assets should not pre-round their corners.
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#612328"/>
  <path d="M78 30 C68 16 46 14 32 26 C16 40 16 64 32 76 C44 86 62 86 74 74" stroke="#F7EDE0" stroke-width="9" stroke-linecap="round" fill="none"/>
  <line x1="20" y1="82" x2="84" y2="18" stroke="#F7EDE0" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="84" cy="18" r="4" fill="#F7EDE0"/>
</svg>`;

const dataUri = `data:image/svg+xml;base64,${Buffer.from(ICON_SVG).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUri} width={size.width} height={size.height} alt="" />,
    { ...size }
  );
}
