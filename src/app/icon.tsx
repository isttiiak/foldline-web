import { ImageResponse } from "next/og";

import { MarkImage } from "@/lib/mark-image";

// The browser-tab icon: the fold mark on a transparent square.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <MarkImage size={64} lines={false} />
    </div>,
    size,
  );
}
