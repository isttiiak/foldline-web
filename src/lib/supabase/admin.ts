import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Privileged Supabase client using the secret key. Bypasses RLS: use only for
 * server work that must (enrichment, imports, provider_cache). Never import this
 * from client code; `server-only` makes that a build error.
 */
export function createAdminClient() {
  const env = serverEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
