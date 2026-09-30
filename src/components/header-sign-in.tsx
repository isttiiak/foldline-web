"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LOGIN_PATH } from "@/features/auth/paths";

/** "Sign in" pill for public pages; hidden on the login page itself. */
export function HeaderSignIn({ label }: { label: string }) {
  if (usePathname() === LOGIN_PATH) return null;

  return (
    <Link
      href={LOGIN_PATH}
      className="press rounded-full border border-amber/25 px-4 py-1.5 text-sm font-medium text-amber hover:bg-amber/10 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      {label}
    </Link>
  );
}
