import type { Metadata } from "next";

import { AppShell } from "@/features/shell/components/app-shell";
import { requireUser } from "@/lib/auth";

/** The private app is never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  // The proxy already redirects signed-out visitors; this is defence in depth.
  const user = await requireUser();
  return <AppShell email={user.email}>{children}</AppShell>;
}
