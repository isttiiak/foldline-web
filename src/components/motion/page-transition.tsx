/**
 * Soft entrance for a page. Used from `template.tsx`, which re-mounts per
 * navigation, so the CSS animation replays. Pure CSS: the page is visible
 * before JavaScript loads.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 enter flex-col">{children}</div>;
}
