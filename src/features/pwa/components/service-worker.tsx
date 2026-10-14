"use client";

import { SerwistProvider } from "@serwist/turbopack/react";

/**
 * Registers the service worker (production only: in development every request
 * should reach the dev server). Pages are not reloaded on reconnect, so a form
 * being filled in keeps what was typed; queued progress is sent instead.
 */
export function ServiceWorker({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
    >
      {children}
    </SerwistProvider>
  );
}
