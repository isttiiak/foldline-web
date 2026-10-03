/*
 * The fold mark for generated images (favicon, home-screen icon): a page with its
 * top-right corner folded down. Plain SVG so `next/og` can draw it.
 */
export function MarkImage({
  size,
  lines = true,
}: {
  size: number;
  lines?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
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
      {lines && (
        <path
          d="M18 30h24M18 38h24M18 46h14"
          stroke="#2a1708"
          strokeOpacity="0.35"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
