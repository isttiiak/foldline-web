import { ImageResponse } from "next/og";

import messages from "../../messages/en.json";

// The link preview for every page: warm charcoal, the fold mark, the tagline.
export const alt = messages.Metadata.ogAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#f4ece0";
const MUTED = "#b6a996";

export default function OpengraphImage() {
  const { title, tagline, ogBadge, ogFormats } = messages.Metadata;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#1d1a16",
        color: INK,
        padding: 80,
        fontFamily: "serif",
      }}
    >
      {/* Soft glows, like the site's ambient background. */}
      <div
        style={{
          position: "absolute",
          top: -160,
          left: -120,
          width: 560,
          height: 560,
          borderRadius: 9999,
          background: "rgba(247, 185, 85, 0.22)",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -200,
          right: -120,
          width: 600,
          height: 600,
          borderRadius: 9999,
          background: "rgba(232, 87, 122, 0.18)",
          filter: "blur(90px)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* The fold mark: a page with its top-right corner folded down. */}
          <svg width="112" height="112" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="page" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f7b955" />
                <stop offset="55%" stopColor="#f07a5a" />
                <stop offset="100%" stopColor="#e8577a" />
              </linearGradient>
              <linearGradient id="fold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#b5d96b" />
                <stop offset="100%" stopColor="#3cc6a8" />
              </linearGradient>
            </defs>
            <path
              d="M14 6h26l14 14v32a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6Z"
              fill="url(#page)"
            />
            <path d="M40 6v10a4 4 0 0 0 4 4h10Z" fill="url(#fold)" />
            <path
              d="M18 30h24M18 38h24M18 46h14"
              stroke="#2a1708"
              strokeOpacity="0.35"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
          <div style={{ fontSize: 64, fontWeight: 700 }}>{title}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.05,
              backgroundImage:
                "linear-gradient(110deg, #f7b955 0%, #f07a5a 50%, #e8577a 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {tagline}
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              fontSize: 32,
              color: MUTED,
              fontFamily: "sans-serif",
            }}
          >
            <span>{ogBadge}</span>
            <span style={{ color: "#3cc6a8" }}>·</span>
            <span>{ogFormats}</span>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
