import { PageTransition } from "@/components/motion/page-transition";

/** Re-mounts on every navigation between public pages, giving each a soft entrance. */
export default function MarketingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
