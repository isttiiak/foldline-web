import { ImageResponse } from "next/og";

import {
  APP_BACKGROUND,
  APP_ICONS,
  type AppIconName,
} from "@/features/pwa/manifest";
import { MarkImage } from "@/lib/mark-image";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(APP_ICONS).map((name) => ({ name }));
}

/**
 * The installed app's icons: the fold mark on warm charcoal. The maskable one
 * keeps the mark inside the middle 60% so any icon shape crops only background.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { size, maskable } = APP_ICONS[(await params).name as AppIconName];
  const mark = Math.round(size * (maskable ? 0.5 : 0.72));
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: APP_BACKGROUND,
      }}
    >
      <MarkImage size={mark} />
    </div>,
    { width: size, height: size },
  );
}
