import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

function fail(error: z.ZodError): never {
  const keys = error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(
    `Missing or invalid environment variables: ${keys}. Copy .env.example to .env.local and fill them in.`,
  );
}

/**
 * Public Supabase config. Read lazily (not at import time) so builds and tests
 * that never touch Supabase do not need the variables. Next.js inlines
 * NEXT_PUBLIC_* only for direct `process.env.X` access, hence the explicit object.
 */
export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return parsed.success ? parsed.data : fail(parsed.error);
}

/** Server-only config including the secret key. Only `src/lib/supabase/admin.ts` may use it. */
export function serverEnv() {
  const parsed = serverSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return parsed.success ? parsed.data : fail(parsed.error);
}
