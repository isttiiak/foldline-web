import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers,
 * acting as the signed-in user. Create a new one per request.
 */
export async function createClient() {
  // Read cookies first: it marks the route dynamic, so builds never prerender
  // (and never need Supabase env for) per-user pages.
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore: src/proxy.ts refreshes the session.
          }
        },
      },
    },
  );
}
