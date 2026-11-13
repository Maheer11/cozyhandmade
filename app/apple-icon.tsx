import { ImageResponse } from "next/og";
import { coziIconSvg } from "@/components/brand/icon-svg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Plain square, uncropped — iOS applies its own corner mask, so
// apple-touch-icon assets should not pre-round their corners.
const dataUri = `data:image/svg+xml;base64,${Buffer.from(coziIconSvg(180, 0.62)).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUri} width={size.width} height={size.height} alt="" />,
    { ...size }
  );
}
