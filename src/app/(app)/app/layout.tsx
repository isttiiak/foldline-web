import { AppShell } from "@/features/shell/components/app-shell";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppShell>{children}</AppShell>;
}
