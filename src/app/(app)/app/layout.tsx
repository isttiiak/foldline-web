import type { Metadata } from "next";

import { getProfile } from "@/features/profile/server/queries";
import { AppShell } from "@/features/shell/components/app-shell";
import { requireUser } from "@/lib/auth";

/** The private app is never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  // The proxy already redirects signed-out visitors; this is defence in depth.
  const user = await requireUser();
  const profile = await getProfile();
  return (
    <AppShell
      user={{
        email: user.email,
        name: profile?.displayName ?? null,
        avatarSrc: profile?.avatarSrc ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
