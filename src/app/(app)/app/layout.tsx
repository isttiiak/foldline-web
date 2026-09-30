import { AppShell } from "@/features/shell/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  // The proxy already redirects signed-out visitors; this is defence in depth.
  const user = await requireUser();
  return <AppShell email={user.email}>{children}</AppShell>;
}
