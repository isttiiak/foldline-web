"use client";

import {
  BookPlus,
  Library,
  LogOut,
  Menu,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
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
import { UserAvatar } from "@/features/profile/components/user-avatar";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

type NavKey = "library" | "add" | "profile" | "settings";
type NavItem = { key: NavKey; href: string; icon: LucideIcon };

// Add items here as their routes land (shelves, highlights, import).
const NAV_ITEMS: NavItem[] = [
  { key: "library", href: "/app", icon: Library },
  { key: "add", href: "/app/add", icon: BookPlus },
  { key: "profile", href: "/app/profile", icon: UserRound },
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

export type ShellUser = {
  email: string | null;
  name: string | null;
  avatarSrc: string | null;
};

function AccountFooter({
  user,
  onNavigate,
}: {
  user: ShellUser;
  onNavigate?: () => void;
}) {
  const t = useTranslations("AppNav");

  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/app/profile"
        onClick={onNavigate}
        className="group flex press items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <UserAvatar
          src={user.avatarSrc}
          name={user.name ?? user.email}
          size={36}
          className="ring-2 ring-amber/30 transition-transform duration-300 group-hover:scale-105"
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {user.name ?? t("yourProfile")}
          </span>
          {user.email && (
            <span
              className="truncate text-xs text-muted-foreground"
              title={user.email}
            >
              {user.email}
            </span>
          )}
        </span>
      </Link>
      <form action={signOutAction}>
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
    </div>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: ShellUser;
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
          <AccountFooter user={user} />
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
                <AccountFooter user={user} onNavigate={() => setOpen(false)} />
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
