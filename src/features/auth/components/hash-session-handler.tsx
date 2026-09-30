"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { parseAuthFragment } from "@/features/auth/fragment";
import { LOGIN_PATH, PROTECTED_PREFIX } from "@/features/auth/paths";

/**
 * Finishes sign-in when Supabase lands the browser on a page with the session in
 * the URL fragment (dashboard invites, implicit-flow links). The fragment never
 * reaches the server, so hand the tokens over once, then clear them from the URL.
 */
export function HashSessionHandler() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const auth = parseAuthFragment(window.location.hash);
    if (!auth) return;
    handled.current = true;

    // Never leave tokens in the address bar or history.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );

    if (auth.kind === "error") {
      router.replace(`${LOGIN_PATH}?error=link`);
      return;
    }

    fetch("/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
      }),
    })
      .then((res) => {
        router.replace(res.ok ? PROTECTED_PREFIX : `${LOGIN_PATH}?error=link`);
        router.refresh();
      })
      .catch(() => router.replace(`${LOGIN_PATH}?error=link`));
  }, [router]);

  return null;
}
