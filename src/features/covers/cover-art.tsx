import { useId } from "react";

import type { CoverDesign } from "./designs";

/*
 * The artwork for each designed cover, drawn on a 200 x 300 canvas. Colours are
 * deliberately low in saturation and dark enough for cream text on top; the top
 * of every design is left quiet for the title. No violet.
 */

const SHADE = "rgb(0 0 0 / 0.28)";

function Artwork({ design, uid }: { design: CoverDesign; uid: string }) {
  switch (design) {
    case "dusk":
      return (
        <>
          <rect width="200" height="300" fill="#2f3b45" />
          <circle cx="100" cy="205" r="46" fill="#b97f55" opacity="0.9" />
          <path d="M0 215 Q50 190 100 212 T200 205 V300 H0Z" fill="#243038" />
          <path d="M0 250 Q60 228 120 248 T200 242 V300 H0Z" fill="#1b252c" />
        </>
      );
    case "ridge":
      return (
        <>
          <rect width="200" height="300" fill="#3b3a30" />
          <path
            d="M0 190 L45 150 L85 185 L130 135 L200 190 V300 H0Z"
            fill="#4a4a37"
          />
          <path
            d="M0 225 L55 188 L105 228 L160 180 L200 215 V300 H0Z"
            fill="#5a5a41"
          />
          <path d="M0 262 L70 235 L130 262 L200 240 V300 H0Z" fill="#6b6a4b" />
        </>
      );
    case "ripple":
      return (
        <>
          <rect width="200" height="300" fill="#26434a" />
          <g fill="none" stroke="#3d6a72" strokeWidth="2.5">
            <circle cx="100" cy="215" r="22" />
            <circle cx="100" cy="215" r="46" />
            <circle cx="100" cy="215" r="72" />
            <circle cx="100" cy="215" r="98" />
          </g>
          <circle cx="100" cy="215" r="8" fill="#c9a36a" />
        </>
      );
    case "arch":
      return (
        <>
          <rect width="200" height="300" fill="#4a3830" />
          <path d="M45 300 V215 A55 55 0 0 1 155 215 V300Z" fill="#5d463c" />
          <path d="M70 300 V222 A30 30 0 0 1 130 222 V300Z" fill="#2c211d" />
          <rect x="0" y="282" width="200" height="18" fill={SHADE} />
        </>
      );
    case "grove":
      return (
        <>
          <rect width="200" height="300" fill="#2f4033" />
          <g fill="#3f5a42">
            <rect x="28" y="170" width="9" height="130" />
            <rect x="82" y="150" width="11" height="150" />
            <rect x="140" y="180" width="9" height="120" />
          </g>
          <g fill="#55704f" opacity="0.9">
            <ellipse cx="32" cy="168" rx="26" ry="40" />
            <ellipse cx="88" cy="146" rx="32" ry="50" />
            <ellipse cx="145" cy="176" rx="26" ry="40" />
          </g>
          <rect x="0" y="278" width="200" height="22" fill={SHADE} />
        </>
      );
    case "dunes":
      return (
        <>
          <rect width="200" height="300" fill="#4d3e2c" />
          <circle cx="150" cy="160" r="20" fill="#c8a066" opacity="0.85" />
          <path d="M0 215 Q70 175 140 215 T200 200 V300 H0Z" fill="#6a5238" />
          <path d="M0 255 Q80 220 150 255 T200 245 V300 H0Z" fill="#85673f" />
        </>
      );
    case "stitch":
      return (
        <>
          <rect width="200" height="300" fill="#3f2f2f" />
          <rect
            x="16"
            y="16"
            width="168"
            height="268"
            rx="6"
            fill="none"
            stroke="#a56a5e"
            strokeWidth="2.5"
            strokeDasharray="9 7"
            strokeLinecap="round"
          />
          <path
            d="M40 250 H160"
            stroke="#a56a5e"
            strokeWidth="2.5"
            strokeDasharray="9 7"
            strokeLinecap="round"
          />
        </>
      );
    case "tide":
      return (
        <>
          <rect width="200" height="300" fill="#1f3a44" />
          <path
            d="M0 200 Q25 185 50 200 T100 200 T150 200 T200 200 V300 H0Z"
            fill="#2e5560"
          />
          <path
            d="M0 230 Q25 215 50 230 T100 230 T150 230 T200 230 V300 H0Z"
            fill="#3b6872"
          />
          <path
            d="M0 262 Q25 247 50 262 T100 262 T150 262 T200 262 V300 H0Z"
            fill="#4a7a82"
          />
        </>
      );
    case "lantern":
      return (
        <>
          <defs>
            <radialGradient id={`${uid}-glow`} cx="50%" cy="68%" r="50%">
              <stop offset="0%" stopColor="#d08a45" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#d08a45" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="200" height="300" fill="#2c2a28" />
          <rect width="200" height="300" fill={`url(#${uid}-glow)`} />
          <path d="M100 150 V172" stroke="#8a7357" strokeWidth="3" />
          <rect x="82" y="172" width="36" height="52" rx="8" fill="#c78d4a" />
          <rect
            x="88"
            y="180"
            width="24"
            height="36"
            rx="5"
            fill="#f0c98a"
            opacity="0.85"
          />
          <rect x="86" y="166" width="28" height="8" rx="3" fill="#8a7357" />
        </>
      );
    case "paper":
      return (
        <>
          <rect width="200" height="300" fill="#41382f" />
          <path
            d="M140 0 V50 a10 10 0 0 0 10 10 H200 Z"
            fill="#d9a65c"
            opacity="0.9"
          />
          <g stroke="#6a5a48" strokeWidth="3.5" strokeLinecap="round">
            <path d="M34 200 H166" />
            <path d="M34 224 H166" />
            <path d="M34 248 H120" />
          </g>
        </>
      );
  }
}

/** The artwork of a designed cover, filling its (2:3) container. */
export function CoverArt({
  design,
  className,
}: {
  design: CoverDesign;
  className?: string;
}) {
  const uid = useId();
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 300"
      preserveAspectRatio="xMidYMid slice"
      className={className ?? "absolute inset-0 size-full"}
    >
      <Artwork design={design} uid={uid} />
      {/* A soft dark wash at the top keeps the title readable. */}
      <linearGradient id={`${uid}-wash`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#000" stopOpacity="0.38" />
        <stop offset="45%" stopColor="#000" stopOpacity="0" />
      </linearGradient>
      <rect width="200" height="300" fill={`url(#${uid}-wash)`} />
    </svg>
  );
}
