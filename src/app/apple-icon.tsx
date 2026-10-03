import { ImageResponse } from "next/og";

import { MarkImage } from "@/lib/mark-image";

// The home-screen icon: the fold mark on warm charcoal (iOS rounds the corners).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#1d1a16",
      }}
    >
      <MarkImage size={128} />
    </div>,
    size,
  );
}
