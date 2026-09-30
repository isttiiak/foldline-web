"use client";

import { Library, LogOut, Menu, Settings, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AmbientGlow } from "@/components/ambient-glow";
import { SkipLink } from "@/components/skip-link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOutAction } from "@/features/auth/server/actions";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

type NavKey = "library" | "settings";
type NavItem = { key: NavKey; href: string; icon: LucideIcon };

// Add items here as their routes land (shelves, highlights, import).
const NAV_ITEMS: NavItem[] = [
  { key: "library", href: "/app", icon: Library },
  { key: "settings", href: "/app/settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

function NavLinks({
  pillId,
  onNavigate,
}: {
  pillId: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("AppNav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={key}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex press items-center gap-3 rounded-xl px-3 py-2.5 font-medium focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={pillId}
                    className="absolute inset-0 -z-10 rounded-xl border border-amber/20 bg-gradient-to-r from-amber/15 via-coral/10 to-transparent"
                    transition={springs.snappy}
                  />
                )}
                <Icon
                  aria-hidden
                  className={cn(
                    "size-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6",
                    active && "text-amber",
                  )}
                />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SignOutButton({ email }: { email?: string | null }) {
  const t = useTranslations("AppNav");

  return (
    <form action={signOutAction} className="flex flex-col gap-2">
      {email && (
        <p
          className="truncate px-3 text-xs text-muted-foreground"
          title={email}
        >
          {t("signedInAs")}{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      )}
      <button
        type="submit"
        className="group flex w-full press items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <LogOut
          aria-hidden
          className="size-5 transition-transform duration-300 group-hover:translate-x-0.5"
        />
        {t("signOut")}
      </button>
    </form>
  );
}

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const t = useTranslations("Common");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative isolate flex min-h-full flex-1">
      <SkipLink />
      <AmbientGlow className="opacity-60" />

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r border-sidebar-border bg-sidebar/70 px-4 py-6 backdrop-blur-md md:flex">
        <Wordmark href="/app" className="px-2" />
        <NavLinks pillId="nav-pill-desktop" />
        <div className="mt-auto">
          <SignOutButton email={email} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-sidebar-border px-4 py-3 md:hidden">
          <Wordmark href="/app" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t("openMenu")}
                />
              }
            >
              <Menu aria-hidden />
            </SheetTrigger>
            <SheetContent
              side="left"
              closeLabel={t("close")}
              className="w-72 bg-sidebar px-4 py-6"
            >
              <SheetTitle className="sr-only">{t("openMenu")}</SheetTitle>
              <Wordmark href="/app" className="mb-6 px-2" />
              <NavLinks
                pillId="nav-pill-mobile"
                onNavigate={() => setOpen(false)}
              />
              <div className="mt-auto">
                <SignOutButton email={email} />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
